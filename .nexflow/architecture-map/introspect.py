#!/usr/bin/env python3
"""Repo introspection for the Visual Platform Architecture Map.

STATE: DRAFT. First-pass map produced by static heuristics. The final
artifact comes from collaborative working sessions with Nick where each
node is marked built / MVP / vision. This script gives session 1 a
starting point.

What it does:
    1. Walks the repo and identifies surfaces (Next.js pages, API routes,
       standalone services).
    2. Detects internal modules (top-level dirs with a clear purpose).
    3. Heuristically scans dependencies + source for external integrations
       (Daily, Groq, Mistral, Supabase, Resend, Pipecat).
    4. Identifies data stores via createClient calls, connection strings,
       and ORM imports.
    5. Infers edges by cross-referencing what each surface imports and
       which integrations it touches.
    6. Distinguishes rizz-bot (Python long-running participant) from
       rizz-server (Node SSE + webhook intelligence service).
    7. Emits a Mermaid graph LR diagram and an unresolved-nodes list.

Public API:
    introspect(repo_root: Path) -> Inventory
    render_mermaid(inv: Inventory) -> str
    render_architecture_md(inv: Inventory) -> str

Run as a script from the repo root:
    python3 .nexflow/architecture-map/introspect.py

Optional flags:
    --repo-root PATH     (default: current working dir)
    --out PATH           (default: ARCHITECTURE.md at repo root)
    --json PATH          also write inventory as JSON for the tests
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Iterable


# Heuristic catalogue. Anything we cannot match here lands in the
# unresolved bucket so Nick can correct it in session 1.
EXTERNAL_HEURISTICS: dict[str, dict[str, list[str]]] = {
    "Daily.co": {
        "deps": ["@daily-co/daily-react", "daily-js"],
        "imports": ["@daily-co/daily-react", "daily.co", "DailyTransport"],
        "envs": ["DAILY_API_KEY"],
    },
    "Groq": {
        "deps": ["groq-sdk", "groq"],
        "imports": ["groq-sdk", "groq.com", "GroqLLMService", "GroqTTSService"],
        "envs": ["GROQ_API_KEY"],
    },
    "Mistral": {
        "deps": ["@mistralai/mistralai", "mistralai"],
        "imports": ["mistralai", "@mistralai/mistralai"],
        "envs": ["MISTRAL_API_KEY"],
    },
    "Supabase": {
        "deps": ["@supabase/supabase-js", "supabase"],
        "imports": ["@supabase/supabase-js", "supabase"],
        "envs": ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "NEXT_PUBLIC_SUPABASE_URL"],
    },
    "Resend (email)": {
        "deps": ["resend"],
        "imports": ["resend"],
        "envs": ["RESEND_API_KEY"],
    },
    "Pipecat (audio pipeline)": {
        "deps": ["pipecat-ai"],
        "imports": ["pipecat"],
        "envs": [],
    },
}


# Source extensions we walk for import + connection-string evidence.
TEXT_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".yaml", ".yml", ".env", ".template"}

# Directories we never descend into. `.nexflow` is excluded because this
# script lives there and its own source must not be treated as evidence.
SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "build", "__pycache__", ".venv", "venv", ".nexflow"}


@dataclass
class Surface:
    """A user-facing or programmatic entry point."""

    id: str
    label: str
    kind: str  # "page" | "api" | "service"
    path: str
    notes: str = ""


@dataclass
class Module:
    """A coherent internal module / top-level directory."""

    id: str
    label: str
    path: str
    purpose: str


@dataclass
class External:
    """An external integration the platform talks to."""

    id: str
    label: str
    evidence: list[str] = field(default_factory=list)


@dataclass
class DataStore:
    """A persistent data store."""

    id: str
    label: str
    evidence: list[str] = field(default_factory=list)


@dataclass
class Edge:
    """A directional relationship from src to dst."""

    src: str
    dst: str
    label: str = ""


@dataclass
class Inventory:
    surfaces: list[Surface] = field(default_factory=list)
    modules: list[Module] = field(default_factory=list)
    externals: list[External] = field(default_factory=list)
    stores: list[DataStore] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "surfaces": [asdict(s) for s in self.surfaces],
            "modules": [asdict(m) for m in self.modules],
            "externals": [asdict(e) for e in self.externals],
            "stores": [asdict(d) for d in self.stores],
            "edges": [asdict(e) for e in self.edges],
            "unresolved": list(self.unresolved),
        }

    @property
    def node_count(self) -> int:
        return len(self.surfaces) + len(self.modules) + len(self.externals) + len(self.stores)

    @property
    def edge_count(self) -> int:
        return len(self.edges)


# ─── Slug + path helpers ──────────────────────────────────────────────────────


def slug(value: str) -> str:
    """Mermaid-safe identifier."""
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_")
    if not cleaned:
        return "node"
    if cleaned[0].isdigit():
        cleaned = "n_" + cleaned
    return cleaned.lower()


def walk_text_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        # Skip the artifact we generate so heuristics never loop back on themselves.
        if path.name == "ARCHITECTURE.md" and path.parent == root:
            continue
        if path.suffix.lower() in TEXT_EXTS or path.name.startswith(".env"):
            yield path


def safe_read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


# ─── Surface discovery ────────────────────────────────────────────────────────


def discover_next_pages(repo_root: Path) -> list[Surface]:
    """Find Next.js app-router pages: app/**/page.{tsx,ts,jsx,js}."""
    app_dir = repo_root / "app"
    if not app_dir.exists():
        return []
    pages: list[Surface] = []
    for path in app_dir.rglob("page.*"):
        if path.suffix.lower() not in {".tsx", ".ts", ".jsx", ".js"}:
            continue
        rel = path.relative_to(repo_root)
        # Build the route from the dir path. Strip leading "app/" and trailing "/page.*".
        route_parts = list(path.relative_to(app_dir).parent.parts)
        route = "/" + "/".join(route_parts) if route_parts else "/"
        label = f"Page {route}"
        pages.append(
            Surface(
                id=slug("page_" + route),
                label=label,
                kind="page",
                path=str(rel),
                notes="Next.js app-router page",
            )
        )
    return sorted(pages, key=lambda s: s.path)


def discover_next_api_routes(repo_root: Path) -> list[Surface]:
    """Find Next.js API routes: app/api/**/route.{ts,js}."""
    api_dir = repo_root / "app" / "api"
    if not api_dir.exists():
        return []
    routes: list[Surface] = []
    seen: set[str] = set()
    for path in api_dir.rglob("route.*"):
        if path.suffix.lower() not in {".ts", ".tsx", ".js"}:
            continue
        rel = path.relative_to(repo_root)
        route_parts = list(path.relative_to(api_dir).parent.parts)
        route = "/api/" + "/".join(route_parts) if route_parts else "/api"
        # Some routes have both .ts and .js variants; dedupe on the URL path.
        if route in seen:
            continue
        seen.add(route)
        routes.append(
            Surface(
                id=slug("api_" + route),
                label=f"API {route}",
                kind="api",
                path=str(rel),
                notes="Next.js API route handler",
            )
        )
    return sorted(routes, key=lambda s: s.label)


def discover_standalone_services(repo_root: Path) -> list[Surface]:
    """rizz-bot (Python) + rizz-server (Node), plus any other top-level service.

    Heuristic: top-level dir with one of (requirements.txt, package.json, Dockerfile)
    that is not the Next.js root.
    """
    services: list[Surface] = []

    bot_dir = repo_root / "rizz-bot"
    if bot_dir.exists():
        notes = []
        if (bot_dir / "bot.py").exists():
            notes.append("Python entry: bot.py")
        if (bot_dir / "Dockerfile").exists():
            notes.append("Dockerfile present")
        if (bot_dir / "railway.json").exists():
            notes.append("Railway deploy target")
        services.append(
            Surface(
                id="svc_rizz_bot",
                label="rizz-bot (Python)",
                kind="service",
                path="rizz-bot/",
                notes="; ".join(notes) or "Standalone Python service",
            )
        )

    server_dir = repo_root / "rizz-server"
    if server_dir.exists():
        notes = []
        if (server_dir / "package.json").exists():
            notes.append("Node entry: src/index.ts")
        if (server_dir / "Dockerfile").exists():
            notes.append("Dockerfile present")
        services.append(
            Surface(
                id="svc_rizz_server",
                label="rizz-server (Node)",
                kind="service",
                path="rizz-server/",
                notes="; ".join(notes) or "Standalone Node service",
            )
        )

    # Catch any other top-level service we didn't hard-code.
    known = {"rizz-bot", "rizz-server", "app", "src", "public", "node_modules", ".git"}
    for child in sorted(repo_root.iterdir()):
        if not child.is_dir() or child.name in known or child.name.startswith("."):
            continue
        has_manifest = any(
            (child / m).exists() for m in ("package.json", "requirements.txt", "Dockerfile", "pyproject.toml")
        )
        if has_manifest:
            services.append(
                Surface(
                    id=slug("svc_" + child.name),
                    label=f"{child.name} (service)",
                    kind="service",
                    path=child.name + "/",
                    notes="Top-level service inferred from manifest",
                )
            )
    return services


# ─── Module discovery ─────────────────────────────────────────────────────────


MODULE_PURPOSES = {
    "app": "Next.js app-router root (pages, API routes, layouts)",
    "src/components": "React components (UI + feature)",
    "src/lib": "Library code (rizz prompts, supabase client, helpers)",
    "src/hooks": "React hooks",
    "src/types": "TypeScript types (incl. database types)",
    "public": "Static assets",
}


def discover_modules(repo_root: Path) -> list[Module]:
    modules: list[Module] = []
    for rel_path, purpose in MODULE_PURPOSES.items():
        path = repo_root / rel_path
        if path.exists():
            modules.append(
                Module(
                    id=slug("mod_" + rel_path),
                    label=rel_path,
                    path=rel_path,
                    purpose=purpose,
                )
            )
    return modules


# ─── External + data-store discovery ──────────────────────────────────────────


def _collect_deps(repo_root: Path) -> dict[str, set[str]]:
    """Return {context: set_of_deps}.

    Context is "root", "rizz-server", "rizz-bot" so we can attribute
    evidence to the right surface later.
    """
    out: dict[str, set[str]] = {}

    def _from_package_json(path: Path) -> set[str]:
        try:
            data = json.loads(safe_read(path))
        except json.JSONDecodeError:
            return set()
        deps: set[str] = set()
        deps.update((data.get("dependencies") or {}).keys())
        deps.update((data.get("devDependencies") or {}).keys())
        return deps

    root_pkg = repo_root / "package.json"
    if root_pkg.exists():
        out["root"] = _from_package_json(root_pkg)

    server_pkg = repo_root / "rizz-server" / "package.json"
    if server_pkg.exists():
        out["rizz-server"] = _from_package_json(server_pkg)

    bot_req = repo_root / "rizz-bot" / "requirements.txt"
    if bot_req.exists():
        lines = [line.strip() for line in safe_read(bot_req).splitlines() if line.strip() and not line.startswith("#")]
        # Strip versions + extras.
        deps = {re.split(r"[\[<>=! ]", line, maxsplit=1)[0].lower() for line in lines}
        out["rizz-bot"] = deps

    return out


def discover_externals(repo_root: Path) -> list[External]:
    deps_by_ctx = _collect_deps(repo_root)
    externals: list[External] = []
    for label, rules in EXTERNAL_HEURISTICS.items():
        evidence: list[str] = []
        for ctx, deps in deps_by_ctx.items():
            for needle in rules["deps"]:
                if needle.lower() in deps:
                    evidence.append(f"{ctx}: dep `{needle}`")
                    break
        # Env-var evidence (rendered render.yaml, .env.template, etc).
        for env_name in rules["envs"]:
            for path in (
                repo_root / "render.yaml",
                repo_root / "rizz-server" / ".env.template",
                repo_root / ".env.local.example",
                repo_root / "rizz-bot" / "bot.py",
            ):
                if path.exists() and env_name in safe_read(path):
                    evidence.append(f"env `{env_name}` referenced in {path.relative_to(repo_root)}")
                    break
        if evidence:
            externals.append(External(id=slug("ext_" + label), label=label, evidence=evidence))
    return externals


def discover_data_stores(repo_root: Path) -> list[DataStore]:
    """Look for Supabase clients, Postgres/Redis URLs, Prisma schemas."""
    stores: list[DataStore] = []
    supabase_evidence: list[str] = []
    has_postgres = False
    has_redis = False
    has_prisma = (repo_root / "prisma" / "schema.prisma").exists() or (
        repo_root / "rizz-server" / "prisma" / "schema.prisma"
    ).exists()

    for path in walk_text_files(repo_root):
        content = safe_read(path)
        if not content:
            continue
        if "@supabase/supabase-js" in content or re.search(r"createClient\s*\(", content):
            if "@supabase/supabase-js" in content or "supabase" in content.lower():
                supabase_evidence.append(str(path.relative_to(repo_root)))
        if re.search(r"postgres(ql)?://", content):
            has_postgres = True
        if re.search(r"redis://|REDIS_URL", content):
            has_redis = True

    if supabase_evidence:
        stores.append(
            DataStore(
                id="store_supabase",
                label="Supabase (Postgres + Auth)",
                evidence=sorted(set(supabase_evidence))[:5],
            )
        )
    if has_postgres and not supabase_evidence:
        stores.append(DataStore(id="store_postgres", label="Postgres (direct)", evidence=["postgres:// URL detected"]))
    if has_redis:
        stores.append(DataStore(id="store_redis", label="Redis", evidence=["redis:// or REDIS_URL detected"]))
    if has_prisma:
        stores.append(DataStore(id="store_prisma", label="Prisma ORM", evidence=["prisma/schema.prisma"]))

    return stores


# ─── Edge inference ───────────────────────────────────────────────────────────


def _file_mentions(path: Path) -> str:
    return safe_read(path).lower()


def infer_edges(repo_root: Path, inv: Inventory) -> list[Edge]:
    """Cross-reference each surface's source against externals + stores +
    sibling services, and add an edge whenever evidence appears.
    """
    edges: list[Edge] = []

    ext_by_id = {e.id: e for e in inv.externals}
    store_by_id = {s.id: s for s in inv.stores}

    def add_edge(src_id: str, dst_id: str, label: str = "") -> None:
        if any(e.src == src_id and e.dst == dst_id for e in edges):
            return
        edges.append(Edge(src=src_id, dst=dst_id, label=label))

    # API + page edges: scan their source file for needles.
    surface_paths: list[tuple[Surface, Path]] = []
    for s in inv.surfaces:
        if s.kind in {"page", "api"}:
            full = repo_root / s.path
            if full.exists():
                surface_paths.append((s, full))

    # Index API routes by their public URL so pages that fetch("/api/...") can be linked.
    api_by_url: dict[str, Surface] = {}
    for s in inv.surfaces:
        if s.kind != "api":
            continue
        # label is "API /api/foo/bar"; extract the URL component
        m = re.match(r"API\s+(/api/\S+)", s.label)
        if m:
            api_by_url[m.group(1).lower().rstrip("/")] = s

    for s, full in surface_paths:
        content = _file_mentions(full)
        # Externals
        for ext_id, ext in ext_by_id.items():
            for needle in EXTERNAL_HEURISTICS.get(ext.label, {}).get("imports", []):
                if needle.lower() in content:
                    add_edge(s.id, ext_id, "")
                    break
        # Stores
        if "@supabase/supabase-js" in content or "getsupabaseclient" in content or "createclient(" in content:
            if "store_supabase" in store_by_id:
                add_edge(s.id, "store_supabase", "read/write")
        # rizz-server (the Next.js side talks to it via NEXT_PUBLIC_RIZZ_SERVER_URL)
        if "rizz_server_url" in content or "rizz-server" in content or "next_public_rizz_server_url" in content:
            if any(sv.id == "svc_rizz_server" for sv in inv.surfaces):
                add_edge(s.id, "svc_rizz_server", "SSE / REST")
        # rizz-bot is spawned as a child process from the start route
        if "rizz-bot" in content and "spawn" in content:
            if any(sv.id == "svc_rizz_bot" for sv in inv.surfaces):
                add_edge(s.id, "svc_rizz_bot", "spawn child process")
        # Pages: scan for fetch("/api/...") references and link to the matching API route.
        if s.kind == "page":
            for url in re.findall(r"/api/[a-zA-Z0-9_\-/\[\]]+", content):
                key = url.lower().rstrip("/")
                if key in api_by_url:
                    add_edge(s.id, api_by_url[key].id, "fetch")

    # Service-level edges (rizz-server, rizz-bot)
    for svc in inv.surfaces:
        if svc.kind != "service":
            continue
        svc_root = repo_root / svc.path
        if not svc_root.exists():
            continue
        merged = ""
        for p in walk_text_files(svc_root):
            merged += _file_mentions(p)
        for ext_id, ext in ext_by_id.items():
            for needle in EXTERNAL_HEURISTICS.get(ext.label, {}).get("imports", []):
                if needle.lower() in merged:
                    add_edge(svc.id, ext_id, "")
                    break
        if "@supabase/supabase-js" in merged or "supabase" in merged:
            if "store_supabase" in store_by_id:
                add_edge(svc.id, "store_supabase", "read/write")

    return edges


def find_unresolved(repo_root: Path, inv: Inventory) -> list[str]:
    """Things the script can see but cannot confidently classify."""
    unresolved: list[str] = []

    # 1. Top-level dirs we did not bucket.
    bucketed = {"app", "src", "public", "node_modules", ".git", "rizz-bot", "rizz-server", ".nexflow"}
    for child in sorted(repo_root.iterdir()):
        if child.is_dir() and child.name not in bucketed and not child.name.startswith("."):
            unresolved.append(
                f"Top-level dir `{child.name}/` was not classified. Is it a surface, a module, or vendored?"
            )

    # 2. Pages with no outgoing edges (could be live pages or orphaned scaffolding).
    src_ids_with_edges = {e.src for e in inv.edges}
    for s in inv.surfaces:
        if s.kind == "page" and s.id not in src_ids_with_edges:
            unresolved.append(
                f"Page `{s.label}` ({s.path}) has no externals or stores referenced inline. "
                "It may route everything through child components, or it may be scaffold from create-next-app. Confirm with Nick."
            )

    # 3. Fork point: is rizz-bot one service or many?
    has_bot = any(s.id == "svc_rizz_bot" for s in inv.surfaces)
    has_server = any(s.id == "svc_rizz_server" for s in inv.surfaces)
    if has_bot and has_server:
        unresolved.append(
            "Fork point: rizz-bot and rizz-server both exist. Confirm whether they are one logical component or two with distinct ownership."
        )

    # 4. Missing surfaces the script would expect for an onboarding launch.
    expected_signals = {
        "magic-link auth flow surface (UI page)": ["app/auth", "app/login", "app/sign-in"],
        "invite acceptance flow surface (UI page)": ["app/invite", "app/join"],
        "post-call summary surface (UI page)": ["app/summary", "app/call/summary"],
    }
    for label, candidates in expected_signals.items():
        if not any((repo_root / c).exists() for c in candidates):
            unresolved.append(
                f"Could not find a {label}. Is it missing, lives under a different path, or handled inline in the room page?"
            )

    return unresolved


# ─── Rendering ────────────────────────────────────────────────────────────────


MERMAID_HEADER = "graph LR"


def render_mermaid(inv: Inventory) -> str:
    lines: list[str] = [MERMAID_HEADER]

    # Subgraph: External integrations
    if inv.externals:
        lines.append("  subgraph External[\"External integrations\"]")
        for e in inv.externals:
            lines.append(f"    {e.id}([{_quote(e.label)}])")
        lines.append("  end")

    # Subgraph: Data stores
    if inv.stores:
        lines.append("  subgraph Stores[\"Data stores\"]")
        for s in inv.stores:
            lines.append(f"    {s.id}[({_quote(s.label)})]")
        lines.append("  end")

    # Subgraph: Pages
    pages = [s for s in inv.surfaces if s.kind == "page"]
    if pages:
        lines.append("  subgraph Pages[\"Next.js pages\"]")
        for s in pages:
            lines.append(f"    {s.id}[{_quote(s.label)}]")
        lines.append("  end")

    # Subgraph: API routes
    apis = [s for s in inv.surfaces if s.kind == "api"]
    if apis:
        lines.append("  subgraph APIs[\"Next.js API routes\"]")
        for s in apis:
            lines.append(f"    {s.id}[/{_quote(s.label)}/]")
        lines.append("  end")

    # Subgraph: Services
    services = [s for s in inv.surfaces if s.kind == "service"]
    if services:
        lines.append("  subgraph Services[\"Standalone services\"]")
        for s in services:
            lines.append(f"    {s.id}[[{_quote(s.label)}]]")
        lines.append("  end")

    # Edges
    for e in inv.edges:
        if e.label:
            lines.append(f"  {e.src} -->|{_escape_pipe(e.label)}| {e.dst}")
        else:
            lines.append(f"  {e.src} --> {e.dst}")

    return "\n".join(lines) + "\n"


def _quote(label: str) -> str:
    """Wrap a node label in quotes so Mermaid treats special chars literally.

    Mermaid lets `[" ... "]`, `([" ... "])`, `[/" ... "/]`, etc. carry arbitrary
    text including parens, brackets, slashes, and pipes.
    """
    sanitized = label.replace("\"", "'")
    return f"\"{sanitized}\""


def _escape_pipe(label: str) -> str:
    return label.replace("|", "/")


# ─── Top-level orchestration ──────────────────────────────────────────────────


def introspect(repo_root: Path) -> Inventory:
    inv = Inventory()
    inv.surfaces.extend(discover_standalone_services(repo_root))
    inv.surfaces.extend(discover_next_pages(repo_root))
    inv.surfaces.extend(discover_next_api_routes(repo_root))
    inv.modules = discover_modules(repo_root)
    inv.externals = discover_externals(repo_root)
    inv.stores = discover_data_stores(repo_root)
    inv.edges = infer_edges(repo_root, inv)
    inv.unresolved = find_unresolved(repo_root, inv)
    return inv


def render_architecture_md(inv: Inventory) -> str:
    mermaid = render_mermaid(inv)
    parts: list[str] = []
    parts.append("# Architecture map")
    parts.append("")
    parts.append("**STATE: DRAFT. First pass for session 1.**")
    parts.append("")
    parts.append(
        "This map was produced by static introspection of the repository. "
        "It is the starting point for collaborative review. The final, labelled "
        "deliverable is produced together with Nick during the working sessions "
        "that make up Foundation Agreement Phase 1 Deliverable #1. Each node "
        "will be marked built / MVP / vision in those sessions."
    )
    parts.append("")
    parts.append("## Diagram")
    parts.append("")
    parts.append("```mermaid")
    parts.append(mermaid.rstrip())
    parts.append("```")
    parts.append("")
    parts.append("## Legend")
    parts.append("")
    parts.append("- Rounded shapes are external integrations.")
    parts.append("- Cylinder shapes are data stores.")
    parts.append("- Rectangles are Next.js pages.")
    parts.append("- Trapezoid shapes are Next.js API routes.")
    parts.append("- Double-bordered shapes are standalone services.")
    parts.append("")
    parts.append(f"**Counts:** {inv.node_count} nodes, {inv.edge_count} edges.")
    parts.append("")

    if inv.modules:
        parts.append("## Internal modules")
        parts.append("")
        for m in inv.modules:
            parts.append(f"- `{m.path}`: {m.purpose}")
        parts.append("")

    if inv.externals:
        parts.append("## External integrations (with evidence)")
        parts.append("")
        for e in inv.externals:
            parts.append(f"- **{e.label}**")
            for ev in e.evidence:
                parts.append(f"  - {ev}")
        parts.append("")

    if inv.stores:
        parts.append("## Data stores (with evidence)")
        parts.append("")
        for s in inv.stores:
            parts.append(f"- **{s.label}**")
            for ev in s.evidence:
                parts.append(f"  - `{ev}`")
        parts.append("")

    parts.append("## What we couldn't infer")
    parts.append("")
    parts.append("These are fork points and gaps that the script could not classify with confidence. Nick will clarify in session 1.")
    parts.append("")
    if inv.unresolved:
        for u in inv.unresolved:
            parts.append(f"- {u}")
    else:
        parts.append("- (nothing flagged)")
    parts.append("")
    parts.append("## How to refine this draft")
    parts.append("")
    parts.append("See `.nexflow/architecture-map/README.md` for the session-1 workflow that turns this draft into the final, labelled architecture map.")
    parts.append("")
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the architecture map draft.")
    parser.add_argument("--repo-root", default=".", help="Repository root (default: cwd)")
    parser.add_argument("--out", default="ARCHITECTURE.md", help="Output Markdown path")
    parser.add_argument("--json", default=None, help="Optional path to dump inventory JSON")
    parser.add_argument("--mermaid", default=None, help="Optional path to dump raw Mermaid")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    inv = introspect(repo_root)
    md = render_architecture_md(inv)
    out_path = (repo_root / args.out).resolve()
    out_path.write_text(md, encoding="utf-8")
    print(f"Wrote {out_path}  ({inv.node_count} nodes, {inv.edge_count} edges)")

    if args.mermaid:
        mermaid_path = Path(args.mermaid).resolve()
        mermaid_path.write_text(render_mermaid(inv), encoding="utf-8")
        print(f"Wrote {mermaid_path}")
    if args.json:
        json_path = Path(args.json).resolve()
        json_path.write_text(json.dumps(inv.to_dict(), indent=2), encoding="utf-8")
        print(f"Wrote {json_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
