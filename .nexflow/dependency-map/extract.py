"""Dependency and integration map extractor.

Walks the repo, reads every manifest, scans every source file, and produces a
structured inventory.

The inventory covers direct package dependencies declared in Node.js and Python
manifests, distinct environment variable references in source code, and the
set of third-party services detected via SDK imports, env-var patterns, and
URL hostnames in source.

For each detected service the extractor records: category, invocation method,
env vars consumed, top code-site references (file:line), and a coarse risk
tier.

Outputs:

  INTEGRATIONS.json   structured for downstream agents
  INTEGRATIONS.md     human-readable map written at repo root

Safe to re-run. Idempotent against a clean repo.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

LOG = logging.getLogger("nexflow.dependency-map")

# ---------------------------------------------------------------------------
# Service catalogue
# ---------------------------------------------------------------------------
#
# Each entry maps a canonical service ID to detection signals.
#
#   packages   substrings to match against installed package names
#   env_vars   env-var name patterns (exact or substring) that flag the service
#   url_hosts  hostname substrings appearing in source code (e.g. "stripe.com")
#   category   one of: database, auth, payments, voice_video, llm, email,
#              storage, monitoring, analytics, infrastructure, search, sms,
#              ai_speech, ai_image, scheduling, feature_flags, vector_db, other
#   invocation default invocation pattern when detected via package
#   risk_tier  critical | high | medium | low
#
# The catalogue intentionally covers more services than this repo currently
# uses; downstream agents read the same map across many client codebases.

SERVICE_CATALOGUE: dict[str, dict[str, Any]] = {
    "supabase": {
        "name": "Supabase",
        "category": "database",
        "packages": ["@supabase/supabase-js", "supabase", "@supabase/ssr"],
        "env_vars": ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        "url_hosts": ["supabase.co", "supabase.io"],
        "invocation": "sdk",
        "risk_tier": "critical",
    },
    "stripe": {
        "name": "Stripe",
        "category": "payments",
        "packages": ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"],
        "env_vars": ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
        "url_hosts": ["stripe.com", "api.stripe.com"],
        "invocation": "sdk",
        "risk_tier": "critical",
    },
    "twilio": {
        "name": "Twilio",
        "category": "sms",
        "packages": ["twilio"],
        "env_vars": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
        "url_hosts": ["twilio.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "daily": {
        "name": "Daily.co",
        "category": "voice_video",
        "packages": ["@daily-co/daily-js", "@daily-co/daily-react"],
        "env_vars": ["DAILY_API_KEY", "DAILY_DOMAIN", "NEXT_PUBLIC_DAILY_DOMAIN"],
        "url_hosts": ["daily.co"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "anthropic": {
        "name": "Anthropic",
        "category": "llm",
        "packages": ["@anthropic-ai/sdk", "anthropic"],
        "env_vars": ["ANTHROPIC_API_KEY"],
        "url_hosts": ["api.anthropic.com", "anthropic.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "openai": {
        "name": "OpenAI",
        "category": "llm",
        "packages": ["openai"],
        "env_vars": ["OPENAI_API_KEY", "OPENAI_ORG_ID"],
        "url_hosts": ["api.openai.com", "openai.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "groq": {
        "name": "Groq",
        "category": "llm",
        "packages": ["groq-sdk", "groq"],
        "env_vars": ["GROQ_API_KEY"],
        "url_hosts": ["api.groq.com", "groq.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "mistral": {
        "name": "Mistral",
        "category": "llm",
        "packages": ["@mistralai/mistralai", "mistralai"],
        "env_vars": ["MISTRAL_API_KEY"],
        "url_hosts": ["api.mistral.ai", "mistral.ai"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "google_ai": {
        "name": "Google AI",
        "category": "llm",
        "packages": ["@google/generative-ai", "google-generativeai"],
        "env_vars": ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
        "url_hosts": ["generativelanguage.googleapis.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "cohere": {
        "name": "Cohere",
        "category": "llm",
        "packages": ["cohere-ai", "cohere"],
        "env_vars": ["COHERE_API_KEY"],
        "url_hosts": ["api.cohere.ai", "cohere.ai"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "resend": {
        "name": "Resend",
        "category": "email",
        "packages": ["resend"],
        "env_vars": ["RESEND_API_KEY"],
        "url_hosts": ["api.resend.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "sendgrid": {
        "name": "SendGrid",
        "category": "email",
        "packages": ["@sendgrid/mail", "sendgrid"],
        "env_vars": ["SENDGRID_API_KEY"],
        "url_hosts": ["api.sendgrid.com", "sendgrid.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "postmark": {
        "name": "Postmark",
        "category": "email",
        "packages": ["postmark"],
        "env_vars": ["POSTMARK_SERVER_TOKEN", "POSTMARK_API_TOKEN"],
        "url_hosts": ["postmarkapp.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "mailgun": {
        "name": "Mailgun",
        "category": "email",
        "packages": ["mailgun.js", "mailgun"],
        "env_vars": ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"],
        "url_hosts": ["api.mailgun.net"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "vercel": {
        "name": "Vercel",
        "category": "infrastructure",
        "packages": ["@vercel/analytics", "@vercel/edge", "@vercel/kv", "@vercel/blob", "@vercel/postgres"],
        "env_vars": ["VERCEL_URL", "VERCEL_ENV", "VERCEL_GIT_COMMIT_SHA"],
        "url_hosts": ["vercel.com", "vercel.app"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "render": {
        "name": "Render",
        "category": "infrastructure",
        "packages": [],
        "env_vars": ["RENDER", "RENDER_EXTERNAL_URL", "RENDER_GIT_COMMIT"],
        "url_hosts": ["onrender.com", "render.com"],
        "invocation": "platform",
        "risk_tier": "high",
    },
    "railway": {
        "name": "Railway",
        "category": "infrastructure",
        "packages": [],
        "env_vars": ["RAILWAY_PROJECT_ID", "RAILWAY_ENVIRONMENT", "RAILWAY_STATIC_URL"],
        "url_hosts": ["railway.app"],
        "invocation": "platform",
        "risk_tier": "high",
    },
    "sentry": {
        "name": "Sentry",
        "category": "monitoring",
        "packages": ["@sentry/nextjs", "@sentry/node", "@sentry/react", "sentry-sdk"],
        "env_vars": ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN"],
        "url_hosts": ["sentry.io"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "datadog": {
        "name": "Datadog",
        "category": "monitoring",
        "packages": ["dd-trace", "@datadog/browser-rum"],
        "env_vars": ["DD_API_KEY", "DATADOG_API_KEY"],
        "url_hosts": ["datadoghq.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "posthog": {
        "name": "PostHog",
        "category": "analytics",
        "packages": ["posthog-js", "posthog-node"],
        "env_vars": ["POSTHOG_API_KEY", "NEXT_PUBLIC_POSTHOG_KEY", "POSTHOG_PROJECT_API_KEY"],
        "url_hosts": ["posthog.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
    "segment": {
        "name": "Segment",
        "category": "analytics",
        "packages": ["@segment/analytics-node", "@segment/analytics-next"],
        "env_vars": ["SEGMENT_WRITE_KEY"],
        "url_hosts": ["segment.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
    "mixpanel": {
        "name": "Mixpanel",
        "category": "analytics",
        "packages": ["mixpanel", "mixpanel-browser"],
        "env_vars": ["MIXPANEL_TOKEN", "NEXT_PUBLIC_MIXPANEL_TOKEN"],
        "url_hosts": ["mixpanel.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
    "amplitude": {
        "name": "Amplitude",
        "category": "analytics",
        "packages": ["@amplitude/analytics-browser", "@amplitude/analytics-node"],
        "env_vars": ["AMPLITUDE_API_KEY"],
        "url_hosts": ["amplitude.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
    "auth0": {
        "name": "Auth0",
        "category": "auth",
        "packages": ["@auth0/nextjs-auth0", "@auth0/auth0-react", "auth0"],
        "env_vars": ["AUTH0_SECRET", "AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"],
        "url_hosts": ["auth0.com"],
        "invocation": "sdk",
        "risk_tier": "critical",
    },
    "clerk": {
        "name": "Clerk",
        "category": "auth",
        "packages": ["@clerk/nextjs", "@clerk/clerk-sdk-node"],
        "env_vars": ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
        "url_hosts": ["clerk.dev", "clerk.com"],
        "invocation": "sdk",
        "risk_tier": "critical",
    },
    "next_auth": {
        "name": "NextAuth",
        "category": "auth",
        "packages": ["next-auth", "@auth/core"],
        "env_vars": ["NEXTAUTH_URL", "NEXTAUTH_SECRET"],
        "url_hosts": [],
        "invocation": "sdk",
        "risk_tier": "critical",
    },
    "aws_s3": {
        "name": "AWS S3",
        "category": "storage",
        "packages": ["@aws-sdk/client-s3", "boto3"],
        "env_vars": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"],
        "url_hosts": ["amazonaws.com"],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "cloudflare_r2": {
        "name": "Cloudflare R2",
        "category": "storage",
        "packages": ["@cloudflare/r2"],
        "env_vars": ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"],
        "url_hosts": ["r2.cloudflarestorage.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "cloudinary": {
        "name": "Cloudinary",
        "category": "storage",
        "packages": ["cloudinary", "next-cloudinary"],
        "env_vars": ["CLOUDINARY_URL", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
        "url_hosts": ["cloudinary.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "pinecone": {
        "name": "Pinecone",
        "category": "vector_db",
        "packages": ["@pinecone-database/pinecone", "pinecone-client"],
        "env_vars": ["PINECONE_API_KEY", "PINECONE_ENVIRONMENT"],
        "url_hosts": ["pinecone.io"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "weaviate": {
        "name": "Weaviate",
        "category": "vector_db",
        "packages": ["weaviate-ts-client", "weaviate-client"],
        "env_vars": ["WEAVIATE_URL", "WEAVIATE_API_KEY"],
        "url_hosts": ["weaviate.network"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "algolia": {
        "name": "Algolia",
        "category": "search",
        "packages": ["algoliasearch", "@algolia/client-search"],
        "env_vars": ["ALGOLIA_APP_ID", "ALGOLIA_API_KEY", "ALGOLIA_ADMIN_API_KEY"],
        "url_hosts": ["algolia.net", "algolia.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
    "elevenlabs": {
        "name": "ElevenLabs",
        "category": "ai_speech",
        "packages": ["elevenlabs", "@elevenlabs/elevenlabs-js"],
        "env_vars": ["ELEVENLABS_API_KEY", "ELEVEN_API_KEY"],
        "url_hosts": ["api.elevenlabs.io"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "deepgram": {
        "name": "Deepgram",
        "category": "ai_speech",
        "packages": ["@deepgram/sdk"],
        "env_vars": ["DEEPGRAM_API_KEY"],
        "url_hosts": ["api.deepgram.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "assemblyai": {
        "name": "AssemblyAI",
        "category": "ai_speech",
        "packages": ["assemblyai"],
        "env_vars": ["ASSEMBLYAI_API_KEY"],
        "url_hosts": ["api.assemblyai.com"],
        "invocation": "sdk",
        "risk_tier": "medium",
    },
    "pipecat": {
        "name": "Pipecat",
        "category": "voice_video",
        "packages": ["pipecat-ai"],
        "env_vars": [],
        "url_hosts": [],
        "invocation": "sdk",
        "risk_tier": "high",
    },
    "calendly": {
        "name": "Calendly",
        "category": "scheduling",
        "packages": [],
        "env_vars": ["CALENDLY_API_KEY", "CALENDLY_WEBHOOK_SIGNING_KEY"],
        "url_hosts": ["calendly.com"],
        "invocation": "rest",
        "risk_tier": "low",
    },
    "launchdarkly": {
        "name": "LaunchDarkly",
        "category": "feature_flags",
        "packages": ["launchdarkly-node-server-sdk", "launchdarkly-js-client-sdk"],
        "env_vars": ["LAUNCHDARKLY_SDK_KEY"],
        "url_hosts": ["launchdarkly.com"],
        "invocation": "sdk",
        "risk_tier": "low",
    },
}

# Sanity check — exercised by tests to guarantee we stay above the 37-service bar.
SERVICE_COUNT_MIN = 37
assert len(SERVICE_CATALOGUE) >= SERVICE_COUNT_MIN, (
    f"Service catalogue has {len(SERVICE_CATALOGUE)} entries; need >= {SERVICE_COUNT_MIN}"
)

# ---------------------------------------------------------------------------
# Regexes
# ---------------------------------------------------------------------------

ENV_REF_JS = re.compile(r"process\.env\.([A-Z_][A-Z0-9_]*)")
ENV_REF_JS_BRACKET = re.compile(r"process\.env\[['\"]([A-Z_][A-Z0-9_]*)['\"]\]")
ENV_REF_PY_ENVIRON = re.compile(r"os\.environ(?:\.get)?\(['\"]([A-Z_][A-Z0-9_]*)['\"]")
ENV_REF_PY_ENVIRON_BRACKET = re.compile(r"os\.environ\[['\"]([A-Z_][A-Z0-9_]*)['\"]\]")
ENV_REF_PY_GETENV = re.compile(r"os\.getenv\(['\"]([A-Z_][A-Z0-9_]*)['\"]")

URL_HOST = re.compile(r"https?://([a-zA-Z0-9_.-]+)")

# Files we walk for source-level scanning.
SOURCE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"}

# Directories we always skip.
SKIP_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".turbo",
    "coverage",
    ".vercel",
    "out",
}

# Source-relative paths to ignore during code scanning. The extractor itself
# would otherwise self-match on its own catalogue references.
SKIP_SOURCE_PATHS: tuple[str, ...] = (
    ".nexflow/dependency-map/extract.py",
    ".nexflow/dependency-map/test_extract.py",
)


def _is_skipped_source(path: Path, root: Path) -> bool:
    try:
        rel = path.relative_to(root).as_posix()
    except ValueError:
        return False
    return any(rel == skipped or rel.endswith("/" + skipped) for skipped in SKIP_SOURCE_PATHS)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class CodeRef:
    file: str
    line: int

    def to_dict(self) -> dict[str, Any]:
        return {"file": self.file, "line": self.line}


@dataclass
class Manifest:
    path: str
    ecosystem: str  # "node" | "python"
    dependencies: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "ecosystem": self.ecosystem,
            "dependencies": self.dependencies,
        }


@dataclass
class ServiceDetection:
    service_id: str
    name: str
    category: str
    invocation: str
    risk_tier: str
    env_vars: list[str] = field(default_factory=list)
    detected_via: list[str] = field(default_factory=list)
    packages: list[str] = field(default_factory=list)
    refs: list[CodeRef] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "service_id": self.service_id,
            "name": self.name,
            "category": self.category,
            "invocation": self.invocation,
            "risk_tier": self.risk_tier,
            "env_vars": sorted(set(self.env_vars)),
            "detected_via": sorted(set(self.detected_via)),
            "packages": sorted(set(self.packages)),
            "top_refs": [r.to_dict() for r in self.refs[:3]],
            "ref_count": len(self.refs),
        }


# ---------------------------------------------------------------------------
# Manifest readers
# ---------------------------------------------------------------------------


def read_package_json(path: Path) -> Manifest:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        LOG.warning("could not parse %s: %s", path, exc)
        return Manifest(path=str(path), ecosystem="node")
    deps: dict[str, str] = {}
    for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        section = data.get(key)
        if isinstance(section, dict):
            for name, version in section.items():
                if isinstance(name, str) and isinstance(version, str):
                    deps[name] = version
    return Manifest(path=str(path), ecosystem="node", dependencies=deps)


def read_requirements_txt(path: Path) -> Manifest:
    deps: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        LOG.warning("could not read %s: %s", path, exc)
        return Manifest(path=str(path), ecosystem="python")
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        # Strip inline comments.
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        # Split name/version/extras.
        # Examples: "pipecat-ai[daily,openai]", "groq>=0.3", "supabase==2.0".
        match = re.match(r"^([A-Za-z0-9_.\-]+)(\[[^\]]*\])?\s*([<>=!~]=?\s*\S+)?", line)
        if match:
            name = match.group(1).lower()
            version = match.group(3) or ""
            deps[name] = version.strip()
    return Manifest(path=str(path), ecosystem="python", dependencies=deps)


def read_pyproject_toml(path: Path) -> Manifest:
    deps: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        LOG.warning("could not read %s: %s", path, exc)
        return Manifest(path=str(path), ecosystem="python")
    # Very lightweight extractor — full TOML parsing would require tomllib; we
    # match the common patterns used in modern pyproject files.
    for match in re.finditer(r'^\s*"?([A-Za-z0-9_.\-]+)"?\s*=\s*"([^"]+)"', text, re.MULTILINE):
        name = match.group(1).lower()
        if name in {"requires-python", "name", "version", "description", "readme", "license"}:
            continue
        deps[name] = match.group(2)
    return Manifest(path=str(path), ecosystem="python", dependencies=deps)


# ---------------------------------------------------------------------------
# Walking
# ---------------------------------------------------------------------------


def iter_files(root: Path) -> Iterable[Path]:
    """Yield every interesting file under root, skipping vendor/build dirs."""
    for dirpath, dirnames, filenames in os.walk(root):
        # In-place filter so os.walk skips them.
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".git")]
        for fname in filenames:
            yield Path(dirpath) / fname


def collect_manifests(root: Path) -> list[Manifest]:
    manifests: list[Manifest] = []
    for path in iter_files(root):
        name = path.name
        if name == "package.json":
            manifests.append(read_package_json(path))
        elif name == "requirements.txt" or (name.startswith("requirements") and name.endswith(".txt")):
            manifests.append(read_requirements_txt(path))
        elif name == "pyproject.toml":
            manifests.append(read_pyproject_toml(path))
    return manifests


def collect_env_refs(root: Path) -> dict[str, list[CodeRef]]:
    """Map env-var name -> list of CodeRef sites."""
    refs: dict[str, list[CodeRef]] = {}
    for path in iter_files(root):
        if path.suffix not in SOURCE_EXTS:
            continue
        if _is_skipped_source(path, root):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(path.relative_to(root))
        for lineno, line in enumerate(text.splitlines(), start=1):
            for pattern in (ENV_REF_JS, ENV_REF_JS_BRACKET, ENV_REF_PY_ENVIRON, ENV_REF_PY_ENVIRON_BRACKET, ENV_REF_PY_GETENV):
                for match in pattern.finditer(line):
                    name = match.group(1)
                    refs.setdefault(name, []).append(CodeRef(file=rel, line=lineno))
    return refs


def collect_url_refs(root: Path) -> dict[str, list[CodeRef]]:
    """Map hostname -> list of CodeRef sites."""
    refs: dict[str, list[CodeRef]] = {}
    for path in iter_files(root):
        if path.suffix not in SOURCE_EXTS:
            continue
        if _is_skipped_source(path, root):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(path.relative_to(root))
        for lineno, line in enumerate(text.splitlines(), start=1):
            for match in URL_HOST.finditer(line):
                host = match.group(1).lower()
                refs.setdefault(host, []).append(CodeRef(file=rel, line=lineno))
    return refs


def collect_import_refs(root: Path, package_names: Iterable[str]) -> dict[str, list[CodeRef]]:
    """Map package-name -> list of CodeRef sites where it is imported."""
    package_list = sorted(set(package_names), key=len, reverse=True)
    if not package_list:
        return {}
    refs: dict[str, list[CodeRef]] = {}
    for path in iter_files(root):
        if path.suffix not in SOURCE_EXTS:
            continue
        if _is_skipped_source(path, root):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(path.relative_to(root))
        for lineno, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if not (
                "import" in stripped
                or "require(" in stripped
                or "from " in stripped
            ):
                continue
            for pkg in package_list:
                # Match either quoted form ("supabase") or python form (from supabase ...).
                needle_quoted = f'"{pkg}"'
                needle_squote = f"'{pkg}'"
                if (
                    needle_quoted in stripped
                    or needle_squote in stripped
                    or stripped.startswith(f"from {pkg}")
                    or stripped.startswith(f"import {pkg}")
                    or f" {pkg}." in stripped
                ):
                    refs.setdefault(pkg, []).append(CodeRef(file=rel, line=lineno))
                    break
    return refs


# ---------------------------------------------------------------------------
# Service detection
# ---------------------------------------------------------------------------


def _match_package(installed: str, signal: str) -> bool:
    """Loose equality so 'pipecat-ai[daily,openai,silero]' matches 'pipecat-ai'."""
    installed = installed.lower()
    signal = signal.lower()
    if installed == signal:
        return True
    # requirement extras
    if installed.startswith(signal + "["):
        return True
    return False


def detect_services(
    manifests: list[Manifest],
    env_refs: dict[str, list[CodeRef]],
    url_refs: dict[str, list[CodeRef]],
    root: Path,
) -> list[ServiceDetection]:
    """Build a list of services that this repo touches."""
    all_packages: set[str] = set()
    for m in manifests:
        for pkg in m.dependencies.keys():
            all_packages.add(pkg)

    # Pre-compute import sites for every catalogued package.
    catalogued_package_names: list[str] = []
    for spec in SERVICE_CATALOGUE.values():
        catalogued_package_names.extend(spec.get("packages", []))
    import_refs = collect_import_refs(root, catalogued_package_names)

    detections: list[ServiceDetection] = []

    for service_id, spec in SERVICE_CATALOGUE.items():
        detected_via: list[str] = []
        matched_packages: list[str] = []
        matched_env_vars: list[str] = []
        refs: list[CodeRef] = []

        # 1. Package match.
        for installed in all_packages:
            for signal in spec.get("packages", []):
                if _match_package(installed, signal):
                    matched_packages.append(installed)
                    if "package" not in detected_via:
                        detected_via.append("package")

        # 2. Env-var match.
        for env_name in spec.get("env_vars", []):
            if env_name in env_refs:
                matched_env_vars.append(env_name)
                refs.extend(env_refs[env_name])
                if "env_var" not in detected_via:
                    detected_via.append("env_var")

        # 3. Hostname match in source URLs.
        for host_signal in spec.get("url_hosts", []):
            for host, host_refs in url_refs.items():
                if host_signal in host:
                    refs.extend(host_refs)
                    if "url" not in detected_via:
                        detected_via.append("url")

        # 4. Import-site refs (treated as evidence even when there is no env var).
        for pkg in matched_packages:
            if pkg in import_refs:
                refs.extend(import_refs[pkg])

        if not detected_via:
            continue

        # De-duplicate refs while preserving order, and sort top refs by file then line.
        seen: set[tuple[str, int]] = set()
        unique_refs: list[CodeRef] = []
        for ref in refs:
            key = (ref.file, ref.line)
            if key in seen:
                continue
            seen.add(key)
            unique_refs.append(ref)
        unique_refs.sort(key=lambda r: (r.file, r.line))

        detections.append(
            ServiceDetection(
                service_id=service_id,
                name=spec["name"],
                category=spec["category"],
                invocation=spec.get("invocation", "sdk"),
                risk_tier=spec.get("risk_tier", "medium"),
                env_vars=matched_env_vars,
                detected_via=detected_via,
                packages=matched_packages,
                refs=unique_refs,
            )
        )

    detections.sort(key=lambda d: (_risk_order(d.risk_tier), d.category, d.name))
    return detections


_RISK_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _risk_order(tier: str) -> int:
    return _RISK_ORDER.get(tier, 99)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


def build_json(
    manifests: list[Manifest],
    env_refs: dict[str, list[CodeRef]],
    services: list[ServiceDetection],
) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "generated_by": "nexflow.dependency-map",
        "manifests": [m.to_dict() for m in manifests],
        "env_vars": sorted(env_refs.keys()),
        "env_var_refs": {
            name: [r.to_dict() for r in refs[:3]]
            for name, refs in sorted(env_refs.items())
        },
        "services": [s.to_dict() for s in services],
        "summary": {
            "manifest_count": len(manifests),
            "package_count": sum(len(m.dependencies) for m in manifests),
            "env_var_count": len(env_refs),
            "service_count": len(services),
            "services_by_category": _count_by(services, lambda s: s.category),
            "services_by_risk_tier": _count_by(services, lambda s: s.risk_tier),
        },
    }


def _count_by(items: list[ServiceDetection], key) -> dict[str, int]:
    out: dict[str, int] = {}
    for item in items:
        k = key(item)
        out[k] = out.get(k, 0) + 1
    return dict(sorted(out.items()))


CATEGORY_TITLES = {
    "database": "Database",
    "auth": "Authentication",
    "payments": "Payments",
    "voice_video": "Voice and Video",
    "llm": "Large Language Models",
    "email": "Transactional Email",
    "storage": "Object Storage",
    "monitoring": "Monitoring and Error Tracking",
    "analytics": "Product Analytics",
    "infrastructure": "Hosting and Infrastructure",
    "search": "Search",
    "sms": "SMS and Telephony",
    "ai_speech": "Speech and Transcription",
    "ai_image": "Image Generation",
    "scheduling": "Scheduling",
    "feature_flags": "Feature Flags",
    "vector_db": "Vector Databases",
    "other": "Other",
}


def render_markdown(report: dict[str, Any]) -> str:
    """Render the integration map as human-readable Markdown.

    Brand voice rules apply here. No em dashes. No triadic lists in the prose.
    No "X not Y" constructions. No copilot or AI-features framing.
    """
    lines: list[str] = []
    summary = report["summary"]

    lines.append("# Integration Map")
    lines.append("")
    lines.append(
        "This document is an automatically generated inventory of every third-party "
        "service this repository depends on. It is regenerated by the "
        "`nexflow-dependency-map` workflow on every push to `main` and on a weekly "
        "schedule. A draft pull request opens automatically when the map drifts."
    )
    lines.append("")
    lines.append(
        "Signals come from two places. Manifests such as `package.json` and "
        "`requirements.txt` are parsed for direct package dependencies. Source files "
        "are scanned for environment variable references and for hostnames inside HTTP "
        "URLs. A service is included when any one of those signals is present."
    )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Manifests scanned: {summary['manifest_count']}")
    lines.append(f"- Direct packages declared: {summary['package_count']}")
    lines.append(f"- Distinct environment variables referenced: {summary['env_var_count']}")
    lines.append(f"- Third-party services detected: {summary['service_count']}")
    lines.append("")

    if summary["services_by_risk_tier"]:
        lines.append("### Services by risk tier")
        lines.append("")
        for tier, count in sorted(summary["services_by_risk_tier"].items(), key=lambda kv: _risk_order(kv[0])):
            lines.append(f"- {tier}: {count}")
        lines.append("")

    # Group services by category.
    by_cat: dict[str, list[dict[str, Any]]] = {}
    for svc in report["services"]:
        by_cat.setdefault(svc["category"], []).append(svc)

    lines.append("## Services by category")
    lines.append("")
    for category in sorted(by_cat.keys()):
        title = CATEGORY_TITLES.get(category, category.title())
        lines.append(f"### {title}")
        lines.append("")
        for svc in sorted(by_cat[category], key=lambda s: s["name"]):
            lines.append(f"#### {svc['name']}")
            lines.append("")
            lines.append(f"- Risk tier: `{svc['risk_tier']}`")
            lines.append(f"- Invocation: `{svc['invocation']}`")
            if svc["packages"]:
                pkg_list = ", ".join(f"`{p}`" for p in svc["packages"])
                lines.append(f"- Packages: {pkg_list}")
            if svc["env_vars"]:
                env_list = ", ".join(f"`{e}`" for e in svc["env_vars"])
                lines.append(f"- Environment variables: {env_list}")
            if svc["detected_via"]:
                detection_list = ", ".join(svc["detected_via"])
                lines.append(f"- Detected via: {detection_list}")
            if svc["top_refs"]:
                lines.append("- Top code references:")
                for ref in svc["top_refs"]:
                    lines.append(f"  - `{ref['file']}:{ref['line']}`")
            lines.append("")

    lines.append("## Manifests")
    lines.append("")
    for manifest in report["manifests"]:
        lines.append(f"### `{manifest['path']}`")
        lines.append("")
        lines.append(f"- Ecosystem: {manifest['ecosystem']}")
        lines.append(f"- Direct dependencies: {len(manifest['dependencies'])}")
        if manifest["dependencies"]:
            lines.append("")
            lines.append("Declared packages:")
            lines.append("")
            for name, version in sorted(manifest["dependencies"].items()):
                if version:
                    lines.append(f"- `{name}` `{version}`")
                else:
                    lines.append(f"- `{name}`")
        lines.append("")

    lines.append("## Environment variables")
    lines.append("")
    lines.append(
        "Every distinct environment variable found in source code is listed below. "
        "Variables that only appear in CI configuration or in a hosting provider's "
        "dashboard will not appear here; those are flagged in the open questions "
        "section of the integration map pull request."
    )
    lines.append("")
    for name in sorted(report["env_var_refs"].keys()):
        refs = report["env_var_refs"][name]
        if refs:
            first = refs[0]
            lines.append(f"- `{name}` first referenced at `{first['file']}:{first['line']}`")
        else:
            lines.append(f"- `{name}`")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("Generated by the NexFlow dependency map workflow.")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run(root: Path, output_dir: Path, markdown_path: Path) -> dict[str, Any]:
    """Generate the integration map and write JSON + Markdown to disk."""
    LOG.info("scanning repository at %s", root)
    manifests = collect_manifests(root)
    env_refs = collect_env_refs(root)
    url_refs = collect_url_refs(root)
    services = detect_services(manifests, env_refs, url_refs, root)

    report = build_json(manifests, env_refs, services)

    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "INTEGRATIONS.json"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    LOG.info("wrote %s", json_path)

    markdown = render_markdown(report)
    markdown_path.write_text(markdown, encoding="utf-8")
    LOG.info("wrote %s", markdown_path)

    return report


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract dependency and integration map.")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent.parent,
        help="Root of the repository to scan (default: repo root inferred from script location).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Directory to write INTEGRATIONS.json into (default: <script-dir>/output).",
    )
    parser.add_argument(
        "--markdown",
        type=Path,
        default=None,
        help="Path to write INTEGRATIONS.md (default: <root>/INTEGRATIONS.md).",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    root: Path = args.root.resolve()
    output_dir: Path = (args.output or Path(__file__).resolve().parent / "output").resolve()
    markdown_path: Path = (args.markdown or root / "INTEGRATIONS.md").resolve()

    run(root=root, output_dir=output_dir, markdown_path=markdown_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
