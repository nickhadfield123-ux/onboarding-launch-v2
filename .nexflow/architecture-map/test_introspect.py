"""Tests for the architecture-map introspector.

Strategy: build a synthetic mini-repo in a tmp dir for each scenario,
run introspect(), and assert on the produced Inventory + rendered Mermaid.
We also run the script against the real repo (the parent of this file's
grandparent) to keep an end-to-end smoke test in the suite.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest


THIS = Path(__file__).resolve()
SCRIPT = THIS.parent / "introspect.py"
REPO_ROOT = THIS.parent.parent.parent  # .nexflow/architecture-map/ -> repo root

# Make the script importable as a module without packaging.
sys.path.insert(0, str(THIS.parent))
import introspect  # type: ignore  # noqa: E402


# ─── Fixture builder ──────────────────────────────────────────────────────────


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


@pytest.fixture
def sample_repo(tmp_path: Path) -> Path:
    """A minimal repo that exercises every discovery path."""
    write(tmp_path / "package.json", json.dumps({
        "name": "sample",
        "dependencies": {
            "next": "16.0.0",
            "@supabase/supabase-js": "^2.0.0",
            "@daily-co/daily-react": "^0.25.0",
            "groq-sdk": "^0.3.0",
            "resend": "^4.0.0",
        },
    }))
    # Pages
    write(tmp_path / "app" / "page.tsx", "export default function Home(){return null}")
    write(tmp_path / "app" / "v2" / "room" / "[id]" / "page.tsx",
          "import { createClient } from '@supabase/supabase-js'\n"
          "// uses NEXT_PUBLIC_RIZZ_SERVER_URL for SSE\n"
          "export default function Page(){return null}")
    # API routes
    write(tmp_path / "app" / "api" / "ai" / "chat" / "route.ts",
          "import Groq from 'groq-sdk'\nexport async function POST(){}")
    write(tmp_path / "app" / "api" / "rizz-bot" / "start" / "route.ts",
          "import { spawn } from 'child_process'\n"
          "// spawn the rizz-bot python process\n"
          "export async function POST(){}")
    write(tmp_path / "app" / "api" / "auth" / "send-magic-link" / "route.ts",
          "import { Resend } from 'resend'\nexport async function POST(){}")
    # rizz-server
    write(tmp_path / "rizz-server" / "package.json", json.dumps({
        "name": "rizz-server",
        "dependencies": {
            "@supabase/supabase-js": "^2.0.0",
            "@mistralai/mistralai": "latest",
            "groq-sdk": "latest",
        },
    }))
    write(tmp_path / "rizz-server" / "src" / "index.ts",
          "import express from 'express'\nimport { createClient } from '@supabase/supabase-js'\n"
          "// uses GroqLLMService and mistralai\n")
    # rizz-bot
    write(tmp_path / "rizz-bot" / "requirements.txt",
          "pipecat-ai[daily,openai,silero]\ngroq\nmistralai\nsupabase\n")
    write(tmp_path / "rizz-bot" / "bot.py",
          "from pipecat.transports.daily.transport import DailyTransport\n"
          "from mistralai import Mistral\n"
          "import os; os.environ['GROQ_API_KEY']\n")
    # src + public
    write(tmp_path / "src" / "lib" / "supabase.ts",
          "import { createClient } from '@supabase/supabase-js'")
    (tmp_path / "public").mkdir()
    # render.yaml referencing envs
    write(tmp_path / "render.yaml",
          "services:\n  - envVars:\n    - key: SUPABASE_URL\n    - key: DAILY_API_KEY\n    - key: GROQ_API_KEY\n    - key: MISTRAL_API_KEY\n")
    return tmp_path


# ─── Surface discovery ────────────────────────────────────────────────────────


def test_discover_pages_finds_root_and_nested(sample_repo: Path) -> None:
    pages = introspect.discover_next_pages(sample_repo)
    labels = [p.label for p in pages]
    assert "Page /" in labels
    assert any("/v2/room/[id]" in label for label in labels)


def test_discover_api_routes_finds_all(sample_repo: Path) -> None:
    routes = introspect.discover_next_api_routes(sample_repo)
    labels = [r.label for r in routes]
    assert any("/api/ai/chat" in label for label in labels)
    assert any("/api/rizz-bot/start" in label for label in labels)
    assert any("/api/auth/send-magic-link" in label for label in labels)


def test_discover_services_distinguishes_bot_from_server(sample_repo: Path) -> None:
    services = introspect.discover_standalone_services(sample_repo)
    ids = {s.id for s in services}
    assert "svc_rizz_bot" in ids
    assert "svc_rizz_server" in ids
    # Make sure each has a distinct label and notes.
    by_id = {s.id: s for s in services}
    assert "Python" in by_id["svc_rizz_bot"].label
    assert "Node" in by_id["svc_rizz_server"].label


def test_modules_include_app_and_lib(sample_repo: Path) -> None:
    modules = introspect.discover_modules(sample_repo)
    paths = {m.path for m in modules}
    assert "app" in paths
    assert "src/lib" in paths


# ─── Externals + stores ───────────────────────────────────────────────────────


def test_externals_detected_from_deps_and_env(sample_repo: Path) -> None:
    externals = introspect.discover_externals(sample_repo)
    labels = {e.label for e in externals}
    assert "Supabase" in labels
    assert "Daily.co" in labels
    assert "Groq" in labels
    assert "Mistral" in labels
    assert "Resend (email)" in labels
    assert "Pipecat (audio pipeline)" in labels


def test_data_store_supabase_detected(sample_repo: Path) -> None:
    stores = introspect.discover_data_stores(sample_repo)
    ids = {s.id for s in stores}
    assert "store_supabase" in ids
    supa = next(s for s in stores if s.id == "store_supabase")
    assert len(supa.evidence) >= 1


def test_data_store_postgres_when_no_supabase(tmp_path: Path) -> None:
    write(tmp_path / "src" / "db.ts", "const url='postgresql://user:pass@host/db'")
    stores = introspect.discover_data_stores(tmp_path)
    ids = {s.id for s in stores}
    assert "store_postgres" in ids


# ─── Edge inference ───────────────────────────────────────────────────────────


def test_edges_link_api_to_externals_and_stores(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    edges = {(e.src, e.dst) for e in inv.edges}

    chat_api = next(s for s in inv.surfaces if s.kind == "api" and "ai/chat" in s.label)
    bot_start = next(s for s in inv.surfaces if s.kind == "api" and "rizz-bot/start" in s.label)
    magic = next(s for s in inv.surfaces if s.kind == "api" and "send-magic-link" in s.label)

    assert (chat_api.id, "ext_groq") in edges
    assert (bot_start.id, "svc_rizz_bot") in edges
    assert (magic.id, "ext_resend_email") in edges


def test_edges_link_room_page_to_supabase_and_server(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    room_page = next(s for s in inv.surfaces if s.kind == "page" and "/v2/room/[id]" in s.label)
    edges = {(e.src, e.dst) for e in inv.edges}
    assert (room_page.id, "store_supabase") in edges
    assert (room_page.id, "svc_rizz_server") in edges


def test_service_edges_to_externals(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    edges = {(e.src, e.dst) for e in inv.edges}
    assert ("svc_rizz_bot", "ext_pipecat_audio_pipeline") in edges
    assert ("svc_rizz_server", "ext_groq") in edges


# ─── Unresolved + rendering ───────────────────────────────────────────────────


def test_unresolved_flags_missing_auth_page(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    # We did not create an app/auth UI page; introspect should flag it.
    flat = " ".join(inv.unresolved).lower()
    assert "magic-link" in flat or "auth" in flat


def test_mermaid_is_valid_graph_syntax(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    mermaid = introspect.render_mermaid(inv)
    # First non-blank line is the graph declaration.
    first = next(line for line in mermaid.splitlines() if line.strip())
    assert first.startswith("graph LR")
    # No unbalanced subgraph blocks.
    subgraphs = mermaid.count("subgraph")
    ends = len(re.findall(r"^\s*end\s*$", mermaid, flags=re.MULTILINE))
    assert subgraphs == ends, f"Mermaid has {subgraphs} subgraph blocks vs {ends} ends"
    # Every edge token references nodes that exist.
    # Declarations look like `id[...]`, `id([...])`, `id[(...)]`, `id[/.../]`, `id[[...]]`
    declared_ids = set(re.findall(r"^\s{2,}([a-z][a-z0-9_]+)[\[\(]", mermaid, flags=re.MULTILINE))
    for line in mermaid.splitlines():
        m = re.match(r"^\s*([a-z][a-z0-9_]+)\s+-->", line)
        if m:
            assert m.group(1) in declared_ids, f"Edge from undeclared node: {m.group(1)}"


def test_render_architecture_md_has_required_sections(sample_repo: Path) -> None:
    inv = introspect.introspect(sample_repo)
    md = introspect.render_architecture_md(inv)
    assert "STATE: DRAFT" in md
    assert "```mermaid" in md
    assert "What we couldn't infer" in md
    assert "Legend" in md


def test_cli_writes_output(sample_repo: Path, tmp_path: Path) -> None:
    out = tmp_path / "out" / "ARCHITECTURE.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(sample_repo), "--out", str(out)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert out.exists()
    body = out.read_text(encoding="utf-8")
    assert "graph LR" in body
    assert len(body) > 500


def test_page_links_to_fetched_api_route(tmp_path: Path) -> None:
    write(tmp_path / "package.json", json.dumps({"name": "x", "dependencies": {"next": "16"}}))
    write(tmp_path / "app" / "page.tsx",
          "async function load(){ await fetch('/api/ai/chat') }")
    write(tmp_path / "app" / "api" / "ai" / "chat" / "route.ts",
          "export async function POST(){}")
    inv = introspect.introspect(tmp_path)
    page = next(s for s in inv.surfaces if s.kind == "page")
    api = next(s for s in inv.surfaces if s.kind == "api")
    edges = {(e.src, e.dst, e.label) for e in inv.edges}
    assert (page.id, api.id, "fetch") in edges


def test_skip_dirs_excludes_nexflow(tmp_path: Path) -> None:
    write(tmp_path / "package.json", json.dumps({"name": "x"}))
    write(tmp_path / ".nexflow" / "noise.ts", "const url='redis://noise'")
    inv = introspect.introspect(tmp_path)
    assert not any(s.id == "store_redis" for s in inv.stores), \
        "evidence inside .nexflow/ must not influence detection"


# ─── End-to-end against the real repo ─────────────────────────────────────────


def test_end_to_end_real_repo_produces_nonempty_inventory() -> None:
    inv = introspect.introspect(REPO_ROOT)
    assert inv.node_count > 0
    assert any(s.kind == "service" for s in inv.surfaces), "expected rizz-bot/rizz-server"
    assert any(s.label == "Supabase (Postgres + Auth)" for s in inv.stores)
    assert any(e.label == "Supabase" for e in inv.externals)
    mermaid = introspect.render_mermaid(inv)
    assert mermaid.splitlines()[0].startswith("graph LR")
