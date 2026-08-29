# TenderBoard daily GitHub Actions crawler

This workflow crawls TenderBoard in GitHub's cloud and publishes the latest raw
CSV to the dedicated `tenderboard-data` branch. The scheduled trigger is 10:00
AM Asia/Singapore. It runs from the repository's default branch and can also be
started manually for verification.

Published files:

- `data/TenderBoard_Raw_latest.csv`
- `data/TenderBoard_Raw_status.json`

The workflow does not write to Google Drive and does not alter the existing
Claude tasks.

Claude Task 1 should consume these files using the migration override in
[`CLAUDE_TASK1_UPDATE.md`](CLAUDE_TASK1_UPDATE.md).

Codex is now the intended Task 1 runner. Its complete self-contained runbook is
[`CODEX_TASK1.md`](CODEX_TASK1.md); the older Claude migration file is retained
only as setup history.
