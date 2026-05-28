"""Unit tests for the page-screenshot script.

These tests cover the pure-Python pieces: YAML parsing, slug helpers, and
manifest shaping. The Playwright-driven capture path is not exercised here
because it needs a real browser.

Run with::

    python -m pytest .nexflow/page-snapshots/
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

import screenshot as ss


# ---------------------------------------------------------------------------
# parse_urls_yaml
# ---------------------------------------------------------------------------


def test_parse_urls_yaml_basic():
    text = """
base_url: https://example.com

pages:
  - name: Landing
    slug: landing
    url: https://example.com/
    tag: marketing
"""
    parsed = ss.parse_urls_yaml(text)
    assert parsed["base_url"] == "https://example.com"
    assert len(parsed["pages"]) == 1
    assert parsed["pages"][0] == {
        "name": "Landing",
        "slug": "landing",
        "url": "https://example.com/",
        "tag": "marketing",
    }


def test_parse_urls_yaml_multiple_pages():
    text = """
pages:
  - name: One
    slug: one
    url: https://example.com/one
    tag: app
  - name: Two
    slug: two
    url: https://example.com/two
    tag: admin
  - name: Three
    slug: three
    url: https://example.com/three
    tag: rizz
"""
    parsed = ss.parse_urls_yaml(text)
    assert len(parsed["pages"]) == 3
    slugs = [p["slug"] for p in parsed["pages"]]
    assert slugs == ["one", "two", "three"]


def test_parse_urls_yaml_strips_full_line_comments():
    text = """
# this is a comment
base_url: https://example.com
# another comment
pages:
  # interior comment
  - name: Only
    slug: only
    url: https://example.com/only
    tag: marketing
"""
    parsed = ss.parse_urls_yaml(text)
    assert parsed["base_url"] == "https://example.com"
    assert len(parsed["pages"]) == 1


def test_parse_urls_yaml_strips_inline_comments():
    text = """
base_url: https://example.com  # production
pages:
  - name: Page  # short label
    slug: page
    url: https://example.com/p
    tag: app
"""
    parsed = ss.parse_urls_yaml(text)
    assert parsed["base_url"] == "https://example.com"
    assert parsed["pages"][0]["name"] == "Page"


def test_parse_urls_yaml_handles_blank_lines():
    text = """

base_url: https://example.com


pages:

  - name: A
    slug: a
    url: https://example.com/a
    tag: marketing

"""
    parsed = ss.parse_urls_yaml(text)
    assert len(parsed["pages"]) == 1


def test_parse_urls_yaml_does_not_strip_inside_quoted_value():
    text = """
pages:
  - name: "Hash # in name"
    slug: hash-name
    url: https://example.com/h
    tag: app
"""
    parsed = ss.parse_urls_yaml(text)
    assert parsed["pages"][0]["name"] == "Hash # in name"


# ---------------------------------------------------------------------------
# load_pages
# ---------------------------------------------------------------------------


def _write_yaml(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "urls.yaml"
    path.write_text(text, encoding="utf-8")
    return path


def test_load_pages_returns_page_spec_objects(tmp_path: Path):
    path = _write_yaml(
        tmp_path,
        """
pages:
  - name: Landing
    slug: landing
    url: https://example.com/
    tag: marketing
""",
    )
    specs = ss.load_pages(path)
    assert len(specs) == 1
    spec = specs[0]
    assert isinstance(spec, ss.PageSpec)
    assert spec.slug == "landing"
    assert spec.tag == "marketing"


def test_load_pages_rejects_missing_fields(tmp_path: Path):
    path = _write_yaml(
        tmp_path,
        """
pages:
  - name: Broken
    slug: broken
    url: https://example.com/
""",
    )
    with pytest.raises(ValueError, match="missing fields"):
        ss.load_pages(path)


def test_load_pages_rejects_bad_slug(tmp_path: Path):
    path = _write_yaml(
        tmp_path,
        """
pages:
  - name: Bad Slug
    slug: Bad_Slug
    url: https://example.com/
    tag: app
""",
    )
    with pytest.raises(ValueError, match="kebab-case"):
        ss.load_pages(path)


def test_load_pages_inferred_from_real_repo_yaml():
    """The committed urls.yaml must parse cleanly."""
    here = Path(__file__).resolve().parent
    specs = ss.load_pages(here / "urls.yaml")
    assert len(specs) >= 3
    slugs = {s.slug for s in specs}
    assert len(slugs) == len(specs), "slugs must be unique"
    for spec in specs:
        assert spec.tag in {"marketing", "app", "onboarding", "rizz", "admin"}


# ---------------------------------------------------------------------------
# slugify
# ---------------------------------------------------------------------------


def test_slugify_lowercases_and_replaces_spaces():
    assert ss.slugify("Hello World") == "hello-world"


def test_slugify_collapses_special_chars():
    assert ss.slugify("Page  //  Name!?") == "page-name"


def test_slugify_empty_falls_back():
    assert ss.slugify("   ") == "page"


# ---------------------------------------------------------------------------
# Manifest shape
# ---------------------------------------------------------------------------


def _result(
    slug: str = "landing",
    status: str = "ok",
    error: str | None = None,
) -> ss.CaptureResult:
    return ss.CaptureResult(
        name="Landing",
        slug=slug,
        url="https://example.com/",
        tag="marketing",
        status=status,
        file=f"{slug}.png" if status == "ok" else None,
        bytes=12345 if status == "ok" else 0,
        error=error,
        captured_at="2026-05-23T07:30:00Z",
    )


def test_build_manifest_has_required_top_level_keys():
    manifest = ss.build_manifest([_result()], "2026-05-23")
    assert manifest["schema_version"] == 1
    assert manifest["date"] == "2026-05-23"
    assert manifest["viewport"] == {"width": 1440, "height": 900}
    assert "summary" in manifest
    assert "captures" in manifest


def test_build_manifest_summary_counts_ok_and_errors():
    results = [
        _result(slug="a", status="ok"),
        _result(slug="b", status="error", error="boom"),
        _result(slug="c", status="ok"),
    ]
    manifest = ss.build_manifest(results, "2026-05-23")
    assert manifest["summary"] == {"total": 3, "ok": 2, "error": 1}


def test_write_manifest_writes_valid_json(tmp_path: Path):
    day_dir = tmp_path / "2026-05-23"
    day_dir.mkdir()
    path = ss.write_manifest(day_dir, [_result()])
    assert path.name == "manifest.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["date"] == "2026-05-23"
    assert data["captures"][0]["slug"] == "landing"


def test_manifest_capture_entry_preserves_error_field():
    results = [_result(status="error", error="timeout after 30000ms")]
    manifest = ss.build_manifest(results, "2026-05-23")
    cap = manifest["captures"][0]
    assert cap["status"] == "error"
    assert cap["error"] == "timeout after 30000ms"
    assert cap["file"] is None
    assert cap["bytes"] == 0


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------


def test_today_iso_is_utc_date_format():
    today = ss._today_iso()
    parsed = datetime.strptime(today, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    # within a day of "now" in UTC
    now = datetime.now(timezone.utc)
    delta = abs((now - parsed).total_seconds())
    assert delta < 60 * 60 * 48
