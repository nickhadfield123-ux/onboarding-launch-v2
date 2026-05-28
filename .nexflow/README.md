# .nexflow/

This directory is NexFlow's recurring-artifact root for the Foundation Agreement (engagement `eng_nick_foundation_q3`).

Everything inside `.nexflow/` is owned by NexFlow and is operational tooling. It does not contain Next.js source code and does not affect the production build.

## Contents

- `page-snapshots/`: nightly headless-Chromium captures of every page in the platform. See `page-snapshots/README.md`.

## Why a dedicated directory

Keeping NexFlow tooling under one prefix makes it easy for Nick (or any reviewer) to see at a glance which files belong to the engagement and which belong to the product. Anything outside `.nexflow/` and outside `.github/workflows/nexflow-*.yml` is product code and is off-limits to NexFlow agents on this engagement.
