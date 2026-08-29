# Claude Task 1 — GitHub CSV handoff update

Paste the block below at the very top of the existing Task 1 prompt. It is an override: where the old prompt mentions a local TenderBoard crawl, a Drive `TenderBoard_Raw` CSV, or Benson's PC, this block takes precedence. Leave the rest of Task 1 unchanged.

---

## IMPORTANT OVERRIDE — TenderBoard now comes from GitHub (30 Aug 2026)

This section supersedes every conflicting TenderBoard handoff instruction elsewhere in this prompt, including the Fetching Rule, Key Facts, Step 0, Step 3b, Run Ledger wording, Error Handling, Known Limitations and Does Not Do sections.

Task 2 is a non-AI GitHub Actions crawler. It runs daily at 10:00 AM SGT without Benson's PC and replaces a fixed raw CSV. This Task 1 runs at 11:00 AM SGT and consumes that GitHub CSV. Do not search Google Drive for `TenderBoard_Raw` files and do not require the local crawl task.

TenderBoard CSV (canonical handoff):
`https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_latest.csv`

Task 2 status:
`https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json`

### Replacement for Step 3b — TenderBoard via GitHub CSV

1. Fetch the status JSON first using WebFetch, returning only its run timestamp, success/failure state, row count, pages scanned and error message. Then fetch the canonical CSV using WebFetch. Never fetch `tenderboard.biz` directly from this Task 1.
2. Treat the CSV as raw and unfiltered. Apply Task 1's existing category routing, relevance filter and cross-source dedup rules exactly as written. Do not revisit TenderBoard detail pages.
3. A successful status timestamp from today's 10:00 AM SGT cycle, or otherwise no more than approximately 26 hours old, is current. Record its timestamp and row count in Coverage & Method.
4. If the status or CSV is absent, unreachable or stale, record `NOT RUN — no current GitHub crawl data this cycle` in the TenderBoard column of today's Run Ledger row and in Coverage & Method. Continue with GeBIZ. This is a coverage gap, not a Drive failure. Do not stop the run.
5. If the status says the crawler failed, or the CSV is malformed/unparseable, record `FAILED — <reason>`, notify Benson once, and continue with GeBIZ alone.
6. Keep the existing TenderBoard field fallbacks: missing closing date = `Unknown`; missing publish date = first-seen date plus `(first seen)`; missing agency = `Not stated (TenderBoard)`; missing scope = blank; missing link = plain text plus Known Gaps note.
7. Keep all existing GeBIZ-wins and cross-source dedup behavior. Existing TenderBoard rows may be upgraded when GeBIZ later finds the same tender.

### Consequential wording changes

- Step 0 cadence skip: stop before fetching the GitHub status/CSV.
- Pre-flight: Drive auth is still required for the tracker, but it is no longer required for the TenderBoard handoff.
- Coverage & Method TenderBoard line: use `OK — N scanned, N relevant, N dupes suppressed, GitHub crawl from <timestamp>` or the NOT RUN/FAILED wording above.
- Run Ledger: TenderBoard `OK` means a current, valid GitHub CSV was processed. There is still no TenderBoard backfill beyond what the current CSV contains.
- Known limitation: TenderBoard coverage depends on the 10:00 AM SGT GitHub Actions crawl, not Benson's PC or a local task.
- Task 1 must not upload or copy the raw TenderBoard CSV to Google Drive. Its canonical handoff remains the fixed GitHub URL; Google Drive remains the destination for the consolidated Task 1 tracker and its history.
- Do not notify for an ordinary cadence skip. Do notify for a reported/malformed GitHub crawl, and for five or more consecutive TenderBoard NOT RUN days.

### Token rule for this handoff

Fetch the tiny status JSON first. Fetch the CSV only on a full-run day. Do not reread either file in the same run, do not fetch GitHub repository pages, and do not fetch TenderBoard pages. Parse the one CSV response in memory and reuse it.

---

After saving the edit, keep Task 1 scheduled for 11:00 AM Singapore time.
