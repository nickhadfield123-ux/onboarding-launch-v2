# Architecture map (Foundation Agreement Phase 1, Deliverable #2)

## What this directory is

This directory produces a Visual Platform Architecture Map of `onboarding-launch-v2`. It is **purely additive operational tooling** for the NexFlow engagement. Nothing here changes Next.js source, dependencies, build, or runtime behaviour.

## What the current draft means

The artifact in this branch is a **first-pass draft**. The final, labelled deliverable comes out of session 1.

The final architecture map is produced through collaborative working sessions with Nick (Foundation Agreement Phase 1, Deliverable #1). In those sessions every node is marked as one of:

- `built`: exists today and is in active use.
- `MVP`: exists today as a minimal version and is on the roadmap to harden.
- `vision`: does not exist yet; documented intent.

This draft gives session 1 a labelled diagram to start from.

## Files

| Path | Purpose |
|------|---------|
| `introspect.py` | Walks the repo and emits the inventory (surfaces, modules, externals, stores, edges, unresolved items). |
| `test_introspect.py` | Pytest suite. Sample-repo fixtures plus an end-to-end test against the real repo. |
| `render.sh` | Reproducible pipeline: runs `introspect.py`, then `mmdc` to produce SVG and PDF. |
| `diagram.mmd` | Raw Mermaid source extracted from the inventory. |
| `diagram.svg` | Vector render of the diagram. |
| `diagram.pdf` | Print-ready render. |
| `inventory.json` | Machine-readable inventory dump (for downstream tooling). |
| `../../ARCHITECTURE.md` | Human-readable map at the repo root: Mermaid source inline, legend, evidence, unresolved items. |

## How Nick refines this draft

1. **Read `ARCHITECTURE.md` at the repo root.** Scan the diagram for anything that looks wrong.
2. **Read the "What we couldn't infer" section.** Each item is a question the script could not answer.
3. **Walk the diagram in session 1 with the NexFlow operator.** For every node, agree on `built` / `MVP` / `vision`. For every edge, confirm direction and protocol.
4. **Add what the script missed.** Surfaces that live outside `app/`, services hosted elsewhere, integrations gated behind env vars that are not yet wired.
5. **Remove what the script over-detected.** Pages that are scaffold-only, dependencies that are dead.
6. The session output is captured in a new doc (`docs/ARCHITECTURE-final.md`) that supersedes this draft.

## Running it locally

```bash
# From the repo root:
python3 .nexflow/architecture-map/introspect.py --repo-root .

# Full pipeline (regenerate Markdown + render SVG + PDF):
./.nexflow/architecture-map/render.sh
```

Requirements:

- Python 3.9 or newer.
- Node 18 or newer, with `@mermaid-js/mermaid-cli` available on `PATH` as `mmdc`. Install with `npm i -g @mermaid-js/mermaid-cli`.

## Running the tests

```bash
python3 -m pytest .nexflow/architecture-map/test_introspect.py -v
```

The suite uses tmp-dir sample-repo fixtures for unit tests and runs an end-to-end pass against the real repo to keep the script honest as the codebase evolves.

## Why this lives in `.nexflow/`

`.nexflow/` is reserved for NexFlow engagement artifacts that travel with the repo but are not part of the platform's runtime. Anything in this directory can be deleted without affecting `npm run build`, `npm run dev`, `npm run start`, `rizz-server`, or `rizz-bot`.

## Brand voice constraints

The Markdown and code in this directory follow NexFlow's client-content rules: no em dashes, no triadic lists, no "X not Y" framing. If you regenerate text from this script, keep those rules in `render_architecture_md`.
