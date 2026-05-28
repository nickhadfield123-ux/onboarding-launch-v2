"""Nightly page-screenshot script.

Reads ``urls.yaml`` from the same directory, opens each URL in a headless
Chromium browser at 1440x900, and writes a PNG plus a ``manifest.json``
into ``snapshots/{YYYY-MM-DD}/``.

The script is idempotent within a single day. Re-running it on the same
date overwrites the existing PNGs for that date.

Dependencies: ``playwright==1.50.0`` (see requirements-screenshot.txt).

YAML parser
-----------
This file intentionally does not depend on PyYAML. The ``urls.yaml``
schema is small and stable, so we ship a focused parser that handles:

* ``key: value`` pairs at the top level
* a ``pages:`` list of mappings introduced by ``-``
* 2-space indentation
* ``#`` line comments and inline comments
* blank lines

If the schema ever grows, swap in PyYAML and update the parser.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("nexflow.screenshot")

VIEWPORT_WIDTH = 1440
VIEWPORT_HEIGHT = 900
DEFAULT_TIMEOUT_MS = 30_000

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_URLS_PATH = SCRIPT_DIR / "urls.yaml"
DEFAULT_OUTPUT_ROOT = SCRIPT_DIR / "snapshots"

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class PageSpec:
    """One entry from urls.yaml."""

    name: str
    slug: str
    url: str
    tag: str


@dataclass(frozen=True)
class CaptureResult:
    """Outcome of a single capture attempt."""

    name: str
    slug: str
    url: str
    tag: str
    status: str  # "ok" or "error"
    file: str | None
    bytes: int
    error: str | None
    captured_at: str


# ---------------------------------------------------------------------------
# YAML parsing
# ---------------------------------------------------------------------------


def _strip_comment(line: str) -> str:
    """Drop inline `# comment` from a line."""
    out_chars: list[str] = []
    in_single = False
    in_double = False
    for ch in line:
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single:
            in_double = not in_double
        elif ch == "#" and not in_single and not in_double:
            break
        out_chars.append(ch)
    return "".join(out_chars).rstrip()


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_urls_yaml(text: str) -> dict[str, Any]:
    """Parse the urls.yaml schema.

    Returns a dict with ``base_url`` (optional str) and ``pages`` (list of
    dicts with ``name``, ``slug``, ``url``, ``tag``).
    """
    result: dict[str, Any] = {"base_url": None, "pages": []}
    pages: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    in_pages = False

    for raw_line in text.splitlines():
        line = _strip_comment(raw_line)
        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        stripped = line.strip()

        if indent == 0 and stripped.endswith(":"):
            key = stripped[:-1].strip()
            in_pages = key == "pages"
            if in_pages and current is not None:
                pages.append(current)
                current = None
            continue

        if indent == 0 and ":" in stripped and not in_pages:
            key, _, value = stripped.partition(":")
            result[key.strip()] = _strip_quotes(value)
            continue

        if not in_pages:
            continue

        if stripped.startswith("- "):
            if current is not None:
                pages.append(current)
            current = {}
            rest = stripped[2:].strip()
            if ":" in rest:
                key, _, value = rest.partition(":")
                current[key.strip()] = _strip_quotes(value)
            continue

        if current is not None and ":" in stripped:
            key, _, value = stripped.partition(":")
            current[key.strip()] = _strip_quotes(value)

    if current is not None:
        pages.append(current)

    result["pages"] = pages
    return result


def load_pages(urls_path: Path) -> list[PageSpec]:
    """Read urls.yaml from disk and return validated PageSpec objects."""
    text = urls_path.read_text(encoding="utf-8")
    parsed = parse_urls_yaml(text)
    pages_raw = parsed.get("pages", [])
    if not isinstance(pages_raw, list):
        raise ValueError("urls.yaml: `pages` must be a list")

    specs: list[PageSpec] = []
    for idx, entry in enumerate(pages_raw):
        if not isinstance(entry, dict):
            raise ValueError(f"urls.yaml: page entry {idx} is not a mapping")
        missing = [k for k in ("name", "slug", "url", "tag") if k not in entry]
        if missing:
            raise ValueError(
                f"urls.yaml: page entry {idx} missing fields: {missing}"
            )
        slug = entry["slug"]
        if not SLUG_RE.match(slug):
            raise ValueError(
                f"urls.yaml: slug {slug!r} must be kebab-case "
                "(lowercase letters, digits, hyphens)"
            )
        specs.append(
            PageSpec(
                name=entry["name"],
                slug=slug,
                url=entry["url"],
                tag=entry["tag"],
            )
        )
    return specs


# ---------------------------------------------------------------------------
# Slug helpers
# ---------------------------------------------------------------------------


def slugify(value: str) -> str:
    """Convert a free-form name into a safe kebab-case slug.

    Used only as a fallback when callers want a slug derived from a label.
    The canonical source of slugs is the ``slug`` field in urls.yaml.
    """
    lowered = value.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", lowered)
    cleaned = cleaned.strip("-")
    return cleaned or "page"


# ---------------------------------------------------------------------------
# Capture
# ---------------------------------------------------------------------------


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def capture_pages(
    specs: list[PageSpec],
    output_root: Path,
    date_str: str | None = None,
) -> list[CaptureResult]:
    """Open each page in headless Chromium and write a PNG.

    Importing playwright is deferred so that the module can be unit-tested
    without the heavy runtime dependency installed.
    """
    from playwright.sync_api import sync_playwright

    date_str = date_str or _today_iso()
    day_dir = output_root / date_str
    day_dir.mkdir(parents=True, exist_ok=True)

    results: list[CaptureResult] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT}
        )
        try:
            for spec in specs:
                png_path = day_dir / f"{spec.slug}.png"
                logger.info("capturing %s -> %s", spec.url, png_path.name)
                page = context.new_page()
                try:
                    page.goto(
                        spec.url,
                        wait_until="networkidle",
                        timeout=DEFAULT_TIMEOUT_MS,
                    )
                    page.screenshot(path=str(png_path), full_page=False)
                    size = png_path.stat().st_size
                    results.append(
                        CaptureResult(
                            name=spec.name,
                            slug=spec.slug,
                            url=spec.url,
                            tag=spec.tag,
                            status="ok",
                            file=png_path.name,
                            bytes=size,
                            error=None,
                            captured_at=_now_iso(),
                        )
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("capture failed for %s: %s", spec.url, exc)
                    results.append(
                        CaptureResult(
                            name=spec.name,
                            slug=spec.slug,
                            url=spec.url,
                            tag=spec.tag,
                            status="error",
                            file=None,
                            bytes=0,
                            error=str(exc),
                            captured_at=_now_iso(),
                        )
                    )
                finally:
                    page.close()
        finally:
            context.close()
            browser.close()

    write_manifest(day_dir, results)
    return results


def build_manifest(results: list[CaptureResult], date_str: str) -> dict[str, Any]:
    """Shape the JSON manifest written alongside the PNGs."""
    ok = sum(1 for r in results if r.status == "ok")
    err = sum(1 for r in results if r.status == "error")
    return {
        "schema_version": 1,
        "date": date_str,
        "viewport": {"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
        "summary": {"total": len(results), "ok": ok, "error": err},
        "captures": [
            {
                "name": r.name,
                "slug": r.slug,
                "url": r.url,
                "tag": r.tag,
                "status": r.status,
                "file": r.file,
                "bytes": r.bytes,
                "error": r.error,
                "captured_at": r.captured_at,
            }
            for r in results
        ],
    }


def write_manifest(day_dir: Path, results: list[CaptureResult]) -> Path:
    """Persist manifest.json into ``day_dir`` and return its path."""
    date_str = day_dir.name
    manifest = build_manifest(results, date_str)
    manifest_path = day_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    return manifest_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--urls",
        type=Path,
        default=DEFAULT_URLS_PATH,
        help="Path to urls.yaml (default: ./urls.yaml)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help="Snapshot output root (default: ./snapshots)",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Override date string (YYYY-MM-DD). Defaults to today UTC.",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    specs = load_pages(args.urls)
    logger.info("loaded %d page specs from %s", len(specs), args.urls)
    results = capture_pages(specs, args.output, date_str=args.date)
    ok = sum(1 for r in results if r.status == "ok")
    err = sum(1 for r in results if r.status == "error")
    logger.info("captured %d ok, %d error", ok, err)
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
