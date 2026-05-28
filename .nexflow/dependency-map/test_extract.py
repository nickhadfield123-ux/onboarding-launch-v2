"""Tests for the dependency and integration map extractor.

Run with: pytest .nexflow/dependency-map/

Each test uses tmp_path-based fixtures so the suite is fully isolated from the
real repo it lives inside.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import extract  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_repo(tmp_path: Path) -> Path:
    """Build a synthetic repo that exercises every detection path."""
    root = tmp_path / "fake-repo"
    root.mkdir()

    # Node manifest at root.
    (root / "package.json").write_text(
        json.dumps(
            {
                "name": "fake-app",
                "version": "0.1.0",
                "dependencies": {
                    "@supabase/supabase-js": "^2.39.3",
                    "stripe": "^14.0.0",
                    "@daily-co/daily-react": "^0.25.1",
                    "groq-sdk": "^0.3.3",
                    "resend": "^4.0.0",
                    "@anthropic-ai/sdk": "^0.20.0",
                },
                "devDependencies": {
                    "typescript": "^5.0.0",
                },
            },
            indent=2,
        )
    )

    # Python manifest in a sub-dir.
    sub = root / "py-svc"
    sub.mkdir()
    (sub / "requirements.txt").write_text(
        "pipecat-ai[daily,openai,silero]\n"
        "groq>=0.3\n"
        "mistralai\n"
        "supabase\n"
        "# comment line\n"
        "openai==1.0.0\n"
    )

    # Source file with env vars and SDK imports.
    src = root / "app" / "api"
    src.mkdir(parents=True)
    (src / "route.ts").write_text(
        "import { createClient } from '@supabase/supabase-js'\n"
        "import Stripe from 'stripe'\n"
        "import { Resend } from 'resend'\n"
        "\n"
        "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)\n"
        "const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)\n"
        "const resend = new Resend(process.env.RESEND_API_KEY)\n"
        "const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET\n"
        "fetch('https://api.daily.co/v1/rooms')\n"
        "const dailyKey = process.env.DAILY_API_KEY\n"
    )

    # Python source file.
    pyfile = sub / "bot.py"
    pyfile.write_text(
        "import os\n"
        "from groq import Groq\n"
        "import mistralai\n"
        "\n"
        "GROQ_KEY = os.getenv('GROQ_API_KEY', '')\n"
        "MISTRAL_KEY = os.environ.get('MISTRAL_API_KEY', '')\n"
        "ANTH = os.environ['ANTHROPIC_API_KEY']\n"
        "print('https://api.openai.com/v1/chat/completions')\n"
    )

    # Files inside skip dirs that must not be picked up.
    nm = root / "node_modules" / "ignored"
    nm.mkdir(parents=True)
    (nm / "trash.ts").write_text("process.env.SHOULD_NOT_APPEAR = '1'\n")
    (root / "node_modules" / "package.json").write_text(json.dumps({"name": "ignored", "dependencies": {"left-pad": "1.0.0"}}))

    return root


@pytest.fixture
def empty_repo(tmp_path: Path) -> Path:
    root = tmp_path / "empty"
    root.mkdir()
    return root


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------


def test_catalogue_has_at_least_37_services() -> None:
    assert len(extract.SERVICE_CATALOGUE) >= 37


def test_catalogue_entries_are_well_formed() -> None:
    required_keys = {"name", "category", "packages", "env_vars", "url_hosts", "invocation", "risk_tier"}
    for service_id, spec in extract.SERVICE_CATALOGUE.items():
        assert isinstance(service_id, str) and service_id, "empty id"
        missing = required_keys - spec.keys()
        assert not missing, f"{service_id} missing keys {missing}"
        assert isinstance(spec["packages"], list)
        assert isinstance(spec["env_vars"], list)
        assert isinstance(spec["url_hosts"], list)
        assert spec["risk_tier"] in {"critical", "high", "medium", "low"}


def test_catalogue_covers_known_services() -> None:
    for must in ["supabase", "stripe", "twilio", "daily", "anthropic", "openai", "groq", "mistral", "resend", "vercel", "sentry", "posthog", "auth0", "clerk", "aws_s3"]:
        assert must in extract.SERVICE_CATALOGUE, f"missing {must}"


# ---------------------------------------------------------------------------
# Manifest readers
# ---------------------------------------------------------------------------


def test_read_package_json(fake_repo: Path) -> None:
    manifest = extract.read_package_json(fake_repo / "package.json")
    assert manifest.ecosystem == "node"
    assert "@supabase/supabase-js" in manifest.dependencies
    assert "stripe" in manifest.dependencies
    assert "typescript" in manifest.dependencies  # devDeps included


def test_read_requirements_txt(fake_repo: Path) -> None:
    manifest = extract.read_requirements_txt(fake_repo / "py-svc" / "requirements.txt")
    assert manifest.ecosystem == "python"
    assert "pipecat-ai" in manifest.dependencies
    assert "groq" in manifest.dependencies
    assert "mistralai" in manifest.dependencies
    assert "supabase" in manifest.dependencies
    assert "openai" in manifest.dependencies
    assert manifest.dependencies["openai"] == "==1.0.0"


def test_read_requirements_txt_handles_missing_file(tmp_path: Path) -> None:
    manifest = extract.read_requirements_txt(tmp_path / "missing.txt")
    assert manifest.dependencies == {}


def test_read_package_json_handles_broken_json(tmp_path: Path) -> None:
    bad = tmp_path / "package.json"
    bad.write_text("{not json}")
    manifest = extract.read_package_json(bad)
    assert manifest.dependencies == {}


# ---------------------------------------------------------------------------
# Walking
# ---------------------------------------------------------------------------


def test_collect_manifests_finds_all(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    paths = {Path(m.path).name for m in manifests}
    assert "package.json" in paths
    assert "requirements.txt" in paths
    # node_modules manifest must be skipped.
    assert len([m for m in manifests if "node_modules" in m.path]) == 0


def test_collect_env_refs_captures_js_and_py(fake_repo: Path) -> None:
    env_refs = extract.collect_env_refs(fake_repo)
    assert "STRIPE_SECRET_KEY" in env_refs
    assert "STRIPE_WEBHOOK_SECRET" in env_refs
    assert "NEXT_PUBLIC_SUPABASE_URL" in env_refs
    assert "GROQ_API_KEY" in env_refs
    assert "MISTRAL_API_KEY" in env_refs
    assert "ANTHROPIC_API_KEY" in env_refs


def test_collect_env_refs_skips_node_modules(fake_repo: Path) -> None:
    env_refs = extract.collect_env_refs(fake_repo)
    assert "SHOULD_NOT_APPEAR" not in env_refs


def test_collect_url_refs_finds_hosts(fake_repo: Path) -> None:
    url_refs = extract.collect_url_refs(fake_repo)
    hosts = set(url_refs.keys())
    assert any("daily.co" in h for h in hosts)
    assert any("openai.com" in h for h in hosts)


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------


def test_detect_services_finds_expected_set(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    ids = {s.service_id for s in services}
    expected = {"supabase", "stripe", "daily", "groq", "mistral", "resend", "anthropic", "pipecat", "openai"}
    assert expected.issubset(ids), f"missing: {expected - ids}"


def test_detect_services_assigns_top_refs(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    stripe = next(s for s in services if s.service_id == "stripe")
    assert len(stripe.refs) >= 1
    assert stripe.refs[0].file.endswith("route.ts")
    assert stripe.risk_tier == "critical"


def test_detect_services_handles_extras_in_requirement(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    pipecat = next((s for s in services if s.service_id == "pipecat"), None)
    assert pipecat is not None, "pipecat-ai[daily,openai,silero] should match pipecat-ai"
    assert "pipecat-ai" in pipecat.packages


def test_detect_services_top_refs_capped_at_three(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    for svc in services:
        d = svc.to_dict()
        assert len(d["top_refs"]) <= 3


def test_detect_services_invocation_present(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    for svc in services:
        assert svc.invocation in {"sdk", "rest", "webhook", "platform"}


# ---------------------------------------------------------------------------
# Match helpers
# ---------------------------------------------------------------------------


def test_match_package_exact() -> None:
    assert extract._match_package("stripe", "stripe")


def test_match_package_case_insensitive() -> None:
    assert extract._match_package("Stripe", "stripe")


def test_match_package_extras() -> None:
    assert extract._match_package("pipecat-ai[daily,openai]", "pipecat-ai")


def test_match_package_negative() -> None:
    assert not extract._match_package("supabase", "stripe")


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


def test_build_json_shape(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    report = extract.build_json(manifests, env_refs, services)
    assert report["schema_version"] == "1.0"
    assert report["generated_by"] == "nexflow.dependency-map"
    assert "manifests" in report
    assert "env_vars" in report
    assert "services" in report
    assert report["summary"]["service_count"] == len(services)


def test_render_markdown_brand_voice(fake_repo: Path) -> None:
    """Brand voice rules. No em dash. No 'X not Y'. No copilot framing."""
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    md = extract.render_markdown(extract.build_json(manifests, env_refs, services))
    assert "—" not in md, "em dash found in markdown"
    lowered = md.lower()
    assert "copilot" not in lowered
    assert "ai features" not in lowered
    assert "engineering leader" not in lowered


def test_render_markdown_contains_sections(fake_repo: Path) -> None:
    manifests = extract.collect_manifests(fake_repo)
    env_refs = extract.collect_env_refs(fake_repo)
    url_refs = extract.collect_url_refs(fake_repo)
    services = extract.detect_services(manifests, env_refs, url_refs, fake_repo)
    md = extract.render_markdown(extract.build_json(manifests, env_refs, services))
    assert "# Integration Map" in md
    assert "## Summary" in md
    assert "## Services by category" in md
    assert "## Manifests" in md
    assert "## Environment variables" in md


# ---------------------------------------------------------------------------
# End-to-end
# ---------------------------------------------------------------------------


def test_run_writes_files(fake_repo: Path, tmp_path: Path) -> None:
    output_dir = tmp_path / "out"
    markdown_path = tmp_path / "INTEGRATIONS.md"
    report = extract.run(root=fake_repo, output_dir=output_dir, markdown_path=markdown_path)
    assert (output_dir / "INTEGRATIONS.json").exists()
    assert markdown_path.exists()
    assert report["summary"]["service_count"] >= 5


def test_run_against_empty_repo(empty_repo: Path, tmp_path: Path) -> None:
    output_dir = tmp_path / "out"
    markdown_path = tmp_path / "INTEGRATIONS.md"
    report = extract.run(root=empty_repo, output_dir=output_dir, markdown_path=markdown_path)
    assert report["summary"]["service_count"] == 0
    assert report["summary"]["manifest_count"] == 0


def test_run_is_idempotent(fake_repo: Path, tmp_path: Path) -> None:
    output_dir = tmp_path / "out"
    markdown_path = tmp_path / "INTEGRATIONS.md"
    a = extract.run(root=fake_repo, output_dir=output_dir, markdown_path=markdown_path)
    b = extract.run(root=fake_repo, output_dir=output_dir, markdown_path=markdown_path)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def test_cli_main_runs(fake_repo: Path, tmp_path: Path) -> None:
    output_dir = tmp_path / "out"
    markdown_path = tmp_path / "INTEGRATIONS.md"
    rc = extract.main(
        [
            "--root",
            str(fake_repo),
            "--output",
            str(output_dir),
            "--markdown",
            str(markdown_path),
        ]
    )
    assert rc == 0
    assert (output_dir / "INTEGRATIONS.json").exists()
    assert markdown_path.exists()
