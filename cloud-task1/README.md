# Cloud Task 1 — one-time Google setup

This Google Apps Script runs Task 1 entirely in Google's cloud. After authorization, Benson's PC does not need to be on.

## One-time setup

1. Open <https://script.google.com/home> and create a **New project** named `GeBIZ Tender Tracker`.
2. Replace the default editor contents with the complete contents of [`dist/Code.gs`](dist/Code.gs).
3. Save. Select `setupCloudTask` in the function menu and click **Run**. Approve access to Google Drive, Google Sheets, external web requests, triggers and email.
4. Select `runTestNow` and click **Run** once. Confirm a new dated tracker appears in Drive folder `1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g` and a dated TenderBoard raw CSV appears in folder `1TPg44swiYi14FD3rciZx-WNCsFE8Qyve`.

`setupCloudTask` installs two daily triggers, at approximately 11:00 AM and 11:00 PM Asia/Singapore. GitHub Task 2 publishes TenderBoard at 10:00 AM SGT.

## Cloud sequence

1. GitHub Actions crawls TenderBoard at 10:00 AM SGT and replaces the fixed CSV/status files.
2. Google Apps Script runs twice a day, fetches GeBIZ and TenderBoard, archives the raw CSV, copies the latest tracker, merges/deduplicates rows, checks captured closed GeBIZ opportunities for award status, and emails the result.
3. Award history is permanent and uncapped.

## Nothing is filtered out

Every item returned by an in-scope GeBIZ RSS feed, by the TenderBoard handoff CSV, and by `MANUAL_TENDERS` is written to `EPU/CMP/10` or `EPU/SER/34`. There is no relevance test and no keyword exclusion list. Routing is the only decision made:

- `EPU/SER/34` when the procurement category or category group matches professional services / consultancy / advisory / PMO.
- `EPU/CMP/10` for everything else.

`verifyTracker` fails the run if the two EPU tabs do not hold every open tender the run was carrying, so a silent drop cannot ship.

### GeBIZ feed coverage

`CONFIG.feeds` covers all IT&Telecommunication sub-categories (IT Services & Software Development, Softwares & Licences, Desktop Computers, Computer Accessories, Notebooks, Servers, Telecommunication, Others) plus Services ⇒ Professional Services. A feed that returns HTTP 404 is reported under "GeBIZ feeds unavailable" in Coverage & Method and does not fail the run.

GeBIZ names the feed files itself, so a category can only be fetched if its exact filename is known — there is no "all categories" feed. Two mechanisms cover the ones not in `CONFIG.feeds`:

- **Index scraping.** Each run scrapes the pages in `CONFIG.feedIndexUrls` (GeBIZ's Business Alerts, RSS FAQ, RSS terms and opportunity listing) for `*-CREATE_BO_FEED.xml` names and adopts every one it finds, unfiltered. An unreachable page is skipped silently. Coverage & Method lists the filenames found — pin any new ones into `CONFIG.feeds` so they no longer depend on scraping.
- **Candidate probing.** `CONFIG.feedCandidates` holds unconfirmed spellings. A name GeBIZ does not publish costs one request and is counted quietly, so the list can grow without risk.

A confirmed feed that breaks is reported as an error; an unconfirmed name that fails is only reported as a count.

## MANUAL_TENDERS backfill

GeBIZ RSS only carries about two days of items, so a tender published before the automation's first run — or during an outage longer than two days — can never be re-fetched. Optional plain-CSV file `MANUAL_TENDERS` in the tracker folder covers that gap.

Columns are the `EPU/CMP/10` header row plus an optional `Bucket` column (`EPU/CMP/10` or `EPU/SER/34`). Only `Title` is required. See [`MANUAL_TENDERS.sample.csv`](MANUAL_TENDERS.sample.csv).

Rows go through the same deduplication as everything else, so a manual row is harmlessly ignored once the real feed or a later tracker already carries that reference. Leave `Link` blank rather than guessing a GeBIZ URL. Once a manual row has been picked up it lives in the tracker permanently, so the CSV can be emptied afterwards.

## Tabs

`EPU/CMP/10`, `EPU/SER/34`, `Closed Tenders`, `Awarded (Intel)`, `Run Ledger`, `Coverage & Method`.

Rows found in a legacy `Review (Unsure)` tab are re-routed into the two EPU tabs on load rather than discarded.

## Tests

- `node test-core.js` — offline unit tests for routing, category-group derivation, dedup, cadence and date handling.
- `node smoke-test.mjs` — online; fetches every configured GeBIZ feed and asserts no item is dropped during routing. Requires outbound access to `www.gebiz.gov.sg`.
- `node build-bundle.mjs` — regenerates `dist/Code.gs` from `Core.gs` + `Code.gs`. Run this after any edit; `dist/Code.gs` is what gets pasted into Apps Script.
