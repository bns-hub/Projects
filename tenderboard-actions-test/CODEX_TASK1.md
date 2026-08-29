# Codex Task 1 — Daily GeBIZ + TenderBoard tracker

Run unattended at 11:00 AM Asia/Singapore. Task 2 runs in GitHub at 10:00 AM SGT and publishes the TenderBoard handoff. Use the connected Google Drive tools and web access. Never ask clarifying questions during a scheduled run.

## Objective

Maintain an accumulating tender tracker for TOPPAN Ecquaria, a Singapore digital-government system integrator. Capture relevant open tenders from GeBIZ and TenderBoard, retain all captured relevant awards as competitor intelligence, flag opportunities Benson should inspect, archive each valid TenderBoard raw CSV, and publish a verified seven-tab Google Sheet without destroying prior history.

## Fixed resources

- Tracker folder: `1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g` (`GeBiz Daily`).
- TenderBoard archive folder: `1TPg44swiYi14FD3rciZx-WNCsFE8Qyve`.
- Seed tracker: `11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8`.
- Format reference: `1B9jPpCQ4z-gKQSZIetfviUsCFzBGi9mLnxwKGy5yk2g`.
- TenderBoard CSV: `https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_latest.csv`.
- TenderBoard status: `https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json`.
- Tracker filename: `<YYYY-MM-DD_HHMM>_GeBIZ_Open_Tenders`, using SGT.
- Tracker history begins 07 Aug 2026.

## Cadence gate — always first

In the tracker folder, find plain-text `RUN_CADENCE`; create it with `daily` if absent. Read the first nonblank, non-comment line:

- `daily`: run every day.
- `days:mon,tue,...`: run on listed SGT weekdays.
- `interval:N`: run when the newest tracker filename date is at least N days old.
- `paused`: stop.
- Invalid: treat as daily and log it.

On a non-run day, stop before any web fetch, CSV fetch, upload or notification. Mark skipped dates on the next full run. If cadence exceeds two days, record that GeBIZ RSS has an approximately two-day window and cadence-gap items are unrecoverable.

## Pre-flight

1. Confirm Drive access to the tracker folder. Drive failure stops the run and leaves the prior tracker untouched.
2. Confirm one GeBIZ RSS feed is reachable and parseable. A later source-specific failure does not block processing of the other source.
3. Use current SGT throughout.

## Load accumulated state

Find native Sheets in the tracker folder whose title contains `GeBIZ_Open_Tenders`; select maximum `createdTime`, never `modifiedTime`. Fall back to the seed. Read all tabs once and reuse the result. Preserve all existing rows and migrate legacy rows safely:

- Missing Source becomes `GeBIZ`.
- Missing Scope Summary remains blank; do not backfill old rows by web fetch.
- Legacy `GeBIZ Link` means `Link`.
- Reconstruct missing GeBIZ URLs from reference and type when possible; never invent TenderBoard links.
- Preserve all captured Awarded rows permanently.

## Source A — GeBIZ

Fetch each official RSS feed once, requesting only reference, title, link and publication date:

1. `https://www.gebiz.gov.sg/rss/IT_Services_%26_Software_Development-CREATE_BO_FEED.xml`
2. `https://www.gebiz.gov.sg/rss/Desktop_Computers-CREATE_BO_FEED.xml`
3. `https://www.gebiz.gov.sg/rss/Computer_Accessories-CREATE_BO_FEED.xml`
4. `https://www.gebiz.gov.sg/rss/Notebooks-CREATE_BO_FEED.xml`
5. `https://www.gebiz.gov.sg/rss/Servers-CREATE_BO_FEED.xml`
6. `https://www.gebiz.gov.sg/rss/Professional_Services-CREATE_BO_FEED.xml`

Deduplicate before detail fetch. For each new candidate, fetch its official detail page once and extract only exact procurement category, agency, full title, publication/closing timestamps and a one- or two-sentence scope. Route IT/telecommunication to `EPU/CMP/10`, professional consulting to `EPU/SER/34`, and unclear plausible items to `Review (Unsure)`.

For awards, use only verified official GeBIZ award feeds/listings; never guess a URL. Fetch awards on every full-run day because GeBIZ states award RSS covers approximately two days and refreshes daily. Retain all relevant captured awards forever; there is no row cap. Record unavailable or failed award coverage accurately.

## Source B — TenderBoard GitHub handoff

Fetch status first, returning only success, `generated_at_sgt`, record count, pages scanned and error. A successful file no more than approximately 26 hours old is current. Only then fetch the CSV once and retain its exact raw contents in memory.

- Treat CSV rows as raw/unfiltered and apply the same relevance and dedup rules.
- Never fetch TenderBoard pages or detail pages from Task 1.
- Missing closing = `Unknown`; missing publication = first-seen date plus `(first seen)`; missing agency = `Not stated (TenderBoard)`; missing scope = blank; missing link stays blank with a gap note.
- Missing, unreachable or stale handoff: `NOT RUN — no current GitHub crawl data this cycle`; continue with GeBIZ.
- Failed status or malformed CSV: `FAILED — <reason>`; continue with GeBIZ and notify once.

After a valid current CSV is parsed, archive the exact unchanged CSV in Drive folder `1TPg44swiYi14FD3rciZx-WNCsFE8Qyve` as `TenderBoard_Raw_<YYYY-MM-DD_HHMM>.csv`, based on its SGT status timestamp, `text/csv`, conversion disabled. Search for the exact title first and do not duplicate it. Archive failure is nonfatal but must be logged and notified.

## Relevance and TOPPAN Ecquaria attention rule

Capture software/system development, integration, modernisation, workflow/case/registry/licensing systems, portals, mobile/field apps, cloud/GCC migration, AMS, data/reporting/analytics, document management, cross-agency exchange, APIs/microservices, digital identity/Singpass integration, AI/agentic/process automation, enterprise architecture, digital-government consultancy/PMO, and hardware/licences/hosting forming a material part of such a system.

Exclude only when the primary subject is unambiguously: cybersecurity-only; AV; switches/pure networking hardware; training/e-learning-only; or unrelated/non-IT machinery, supplies, printers, furniture or plant. Incidental mentions do not disqualify a system tender. When in doubt, capture and route to Review.

Add `TECQ Recommendation` immediately before `Link` on both EPU tabs, Review and Closed. Every relevant open EPU row must contain exactly `Advise to look at`. Apply it to Review rows when a plausible TECQ fit remains despite missing detail. Domain gaps or likely partner needs do not suppress the tag. It is an attention flag, not a bid/no-bid claim. On the first migrated run, classify stored open rows using existing fields only; do not refetch old details. Preserve the tag when closing a row. Use light-green fill.

Log every exclusion with title and exclusion number, capped at 25 plus remaining count.

## Deduplication

Same tender when normalized primary reference matches, or when normalized title matches and agency or closing date also matches. Normalize uppercase and remove whitespace/punctuation. GeBIZ wins over TenderBoard. Upgrade an existing TenderBoard row in place if GeBIZ later finds it; do not count as new. Deduplicate within each source.

For awards, key by normalized GeBIZ tender/quotation number plus supplier/line item when multiple awards exist. Update missing fields later without duplicating. Missing supplier/value becomes `Not stated` and is not discarded.

## Closing and sorting

Move passed known closing timestamps from EPU/Review to Closed, preserving Source, Scope and TECQ Recommendation and adding Move Date. Append `(was: Review)` when applicable. Never auto-close `Unknown`; flag it after 60 days. Sort open and Review by Publish descending; Closed by Closing ascending; awards by Award Date descending.

## Run Ledger

Maintain one SGT calendar row per day since 07 Aug 2026:
`Date | GeBIZ | TenderBoard | New (GeBIZ) | New (TB) | Notes`.

Use `OK`, `FAILED — reason`, `NOT RUN`, `SKIPPED (cadence)`, `BACKFILLED (DD Mon)`, or `UNRECOVERABLE — reason`. Missing historical rows are `NOT RUN`. GeBIZ gaps within the RSS window may be backfilled; older gaps are unrecoverable. TenderBoard has no backfill beyond the current GitHub snapshot. Today's real status row is written at the end.

## Workbook

Create one `.xlsx` with seven tabs, Arial 11, gray bold frozen headers, thin borders, wrapped scope, real hyperlinks and source colors (GeBIZ light blue, TenderBoard light amber):

1. `EPU/CMP/10`: Ref | Title | Agency | Procurement Category | Source | Scope Summary | Publish Date/Time | Closing Date/Time | Status | TECQ Recommendation | Link.
2. `EPU/SER/34`: same.
3. `Closed Tenders`: same minus Status/Publish, plus Move Date; retain TECQ Recommendation.
4. `Review (Unsure)`: open schema plus Why Unsure.
5. `Awarded (Intel)`: Ref | Title | Agency | Source | Awarded To | Award Value | Award Date | Link. Permanent and uncapped.
6. `Run Ledger`.
7. `Coverage & Method`.

Coverage & Method must concisely include SGT run time, auth, cadence, each source status/counts, EPU totals/new counts by source, Closed/Review counts, exclusions, borderline calls, source upgrades, ledger summary, archive result, upload size/verification, previous file, eight newest gaps/manual patches, and `TECQ Recommendation: N open tenders tagged Advise to look at (GeBIZ N | TB N)`.

## Upload and verification

Build in memory and measure base64 before upload. Use native Sheet conversion with the exact tracker filename in the tracker folder.

- At or below 24,000 base64 characters: upload once, read back, confirm all seven tab names and row counts. Trash a bad upload and retry once.
- Above 24,000 characters: do not attempt the unsafe single-file upload. Save seven clearly prefixed per-tab CSV stopgaps, record the measured ceiling failure, and report that a local merge is required. Never call stopgaps the final tracker.
- On upload failure, leave the previous tracker untouched and report the failure.

Do not routinely delete prior tracker files; they are history.

## Final report

Report new tender count and the first three new items with title, reference, agency, source, short scope and closing time; totals by EPU tab; moved-to-Closed, Review, Awarded, gaps, TenderBoard handoff/archive status; count tagged `Advise to look at`; and the verified tracker link. If no new tenders, report `NO New Tenders` with the same status summary. Cadence skips are silent.
