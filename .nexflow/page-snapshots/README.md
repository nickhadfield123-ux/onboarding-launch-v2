# Page-Screenshot Repository

Nightly visual snapshots of every page in the platform. Captures are taken by a headless Chromium browser at 1440x900 and stored as workflow artifacts on each run.

This is Deliverable #4 of the Foundation Agreement Phase 1.

## How it works

1. A GitHub Actions cron job (`.github/workflows/nexflow-nightly-screenshots.yml`) runs every night at 07:30 UTC (00:30 PT).
2. The job installs Playwright and runs `screenshot.py`.
3. `screenshot.py` reads `urls.yaml` and writes a PNG for each URL plus a `manifest.json` into `snapshots/{YYYY-MM-DD}/`.
4. The folder is uploaded as a workflow artifact named `page-snapshots-{YYYY-MM-DD}`. Nothing is committed back to the repo.
5. Artifacts are retained for 30 days by GitHub Actions defaults.

## How to view the captured artifacts

1. Open the Actions tab in GitHub.
2. Click the most recent run of `nexflow-nightly-screenshots`.
3. Scroll to the bottom and download the artifact zip.

## How to add or remove URLs

Edit `urls.yaml`. Each entry needs:

- `name`: human-readable label (used in logs and the manifest)
- `slug`: short identifier used for the PNG filename (kebab-case, no spaces)
- `url`: full URL to capture
- `tag`: one of `marketing`, `app`, `onboarding`, `rizz`, `admin`

Commit the change. The next scheduled run will pick it up. You can also trigger a run on demand from the Actions tab via the `workflow_dispatch` button.

## How to run locally

```bash
pip install -r .nexflow/page-snapshots/requirements-screenshot.txt
playwright install chromium
python .nexflow/page-snapshots/screenshot.py
```

Output lands in `.nexflow/page-snapshots/snapshots/{YYYY-MM-DD}/` next to a `manifest.json` describing each capture (URL, slug, timestamp, status, file size).

The script is idempotent within a single day. Re-running it on the same date overwrites the existing PNGs for that date.

## Files

- `urls.yaml`: the page list (edit this)
- `screenshot.py`: the capture script
- `requirements-screenshot.txt`: Python deps
- `test_screenshot.py`: unit tests for slug generation, YAML parsing, manifest format
- `snapshots/`: output directory (gitignored, not committed)
