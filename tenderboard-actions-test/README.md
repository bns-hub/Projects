# TenderBoard GitHub Actions test

This workflow crawls TenderBoard in GitHub's cloud and publishes the latest raw
CSV to the dedicated `tenderboard-data` branch. The scheduled trigger is 10:00
AM Asia/Singapore; it becomes active only when the workflow exists on the
repository's default branch.

Published files:

- `data/TenderBoard_Raw_latest.csv`
- `data/TenderBoard_Raw_status.json`

The workflow does not write to Google Drive and does not alter the existing
Claude tasks.
