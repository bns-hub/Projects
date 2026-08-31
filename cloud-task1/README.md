# Cloud Task 1 — one-time Google setup

This Google Apps Script runs Task 1 entirely in Google's cloud. After authorization, Benson's PC does not need to be on.

## What this is

Two cloud jobs against **one permanent spreadsheet**:

- **Collector** (daily, ~11:00 and ~23:00 SGT) — fetches GeBIZ RSS, the TenderBoard handoff and `MANUAL_TENDERS`, and updates the tracker in place. It owns tender facts, closures, awards, the ledger and coverage. It filters nothing.
- **Reviewer** (Wednesday and Friday, ~12:00 SGT) — sends the open tenders to Claude and records a verdict per row. It owns the review columns and nothing else.

The tracker is `GeBIZ Tender Tracker — Current` in the GeBiz Daily folder. Its Drive id is remembered in a script property, so it is never forked into a second file. Dated copies are no longer made after every collection; one snapshot is taken each Friday into a `History` subfolder and never pruned.

## One-time setup

1. Open <https://script.google.com/home> and create a **New project** named `GeBIZ Tender Tracker`.
2. Replace the default editor contents with the complete contents of [`dist/Code.gs`](dist/Code.gs).
3. Save. Select `setupCloudTask` in the function menu and click **Run**. Approve access to Google Drive, Google Sheets, external web requests, triggers and email.
4. **Add the Anthropic API key** — see *Reviewer credentials* below. Without it the reviewer will not run.
5. Select **`runNow`** and click **Run**. It is the first function in the file, so it is what the picker offers by default.

`setupCloudTask` installs four triggers, all in Google's cloud — collection daily at ~11:00 and ~23:00 SGT, review on Wednesday and Friday at ~12:00 SGT. This PC does not need to be on. GitHub Task 2 publishes TenderBoard at 10:00 AM SGT.

## Running it by hand

Select **`runNow`** and click **Run**. One click does everything the schedule does: capture GeBIZ + TenderBoard + `MANUAL_TENDERS`, update `GeBIZ Tender Tracker — Current` in place, review the open tenders, rebuild the shortlist. Takes 30-60 seconds, longer on the first review. The execution log shows both stages.

| Function | Does |
|---|---|
| **`runNow`** | capture, then review. The manual button |
| `runTestNow` | capture only — checking a feed or a backfill change |
| `runReviewNow` | review only — re-judging without re-fetching |
| `setupCloudTask` | (re)install the four triggers |
| `discoverFeedNames` | diagnostic; writes `GEBIZ_FEED_INDEX.txt` |

If capture fails, `runNow` stops and does not review — there would be nothing new to review. If review fails or has no key, capture still stands and the log says so.

## Reviewer credentials — human-owned, never committed

The reviewer makes a real semantic judgment by calling Claude. **There is deliberately no keyword fallback**: a keyword rule presented as a review looks authoritative and is not, so with no key the reviewer records `NOT RUN`, emails these instructions, and changes nothing.

In the Apps Script editor: **Project Settings → Script Properties → Add script property**

| Property | Value |
|---|---|
| `ANTHROPIC_API_KEY` | a key from <https://console.anthropic.com/settings/keys> |

The key lives only in Script Properties. It is not in this repository, the bundle, or the spreadsheet. Cost is roughly a few cents per review run: only rows that are new or whose facts have changed are sent, in batches of 12.

## Who owns which column

| Owner | Columns |
|---|---|
| Collector | everything describing the tender — reference, title, agency, category, source, scope, dates, status, link |
| Reviewer | `TECQ Review`, `Why`, `Reviewed On`, `Review Fingerprint` |

The collector must never erase a reviewer column. Reviews are indexed before each refresh and re-applied afterwards, matched on the normalized reference first, then normalized title paired with agency or closing date. A row rebuilt from scratch, renamed by its source, or upgraded from TenderBoard to GeBIZ keeps its verdict. `verifyTracker` fails the run if the reviewed-row count written does not match the count held.

**Review Fingerprint** is a hash of the facts a verdict depends on. Unchanged rows are never re-reviewed; if a title, category, scope or closing date changes, the fingerprint stops matching and the row is judged again. The column is hidden in the sheet.

## Verdicts

| Verdict | Meaning |
|---|---|
| `Look at` | strong fit — custom apps/portals, modernisation, integration/APIs, workflow/case/registry/licensing, AMS, GCC/cloud migration, data/analytics, document management, mobile/field apps, Singpass/digital identity, AI/agentic/RAG/automation, digital-government consultancy or implementation PMO |
| `Possible` | plausible adjacent ICT work, insufficient detail, partner-dependent scope, generic digital/AI consultancy, or managed infrastructure that may carry application scope |
| `Not relevant` | construction/facilities, industrial machinery/electrical/plant, AV/PA, catering/cleaning/events, training-only, non-ICT consultancy, parking leases, or pure hardware with no integration or software scope |

The judgment is on the primary deliverable purchased. Words like *system*, *development*, *licence*, *platform*, *maintenance* and *automation* are never sufficient alone. TECQ's known gaps — no proven OT/SCADA or industrial plant integration, no workplace-safety or permit-to-work record — pull a verdict down, not up.

**`Not relevant` rows are never deleted or hidden.** They stay on their EPU tab, greyed, with the reason recorded, so a disagreement is visible and correctable.

## TECQ Shortlist

The first tab. Open `Look at` and `Possible` rows only, `Look at` first, then closing date ascending. It is a **view**, rebuilt from the EPU tabs on every collection and every review — never edit it, and never treat it as a second source of truth.

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

### Finding feed names: `discoverFeedNames`

Run by hand from the editor when a category is missing. It fetches every page in `CONFIG.feedIndexProbeUrls` and writes `GEBIZ_FEED_INDEX.txt` into the tracker folder listing, per page, the HTTP status, any `*-CREATE_BO_FEED.xml` filenames, any link mentioning rss/feed/xml, and any `<option>` labels (the category dropdown). Pin whatever it finds into `CONFIG.feeds`. It only fetches; it never writes to a tracker.

As of 31 Aug 2026 the categories `IT&Telecommunication => Telecommunication` and `IT&Telecommunication => Others` are still not being fetched: neither is a working filename, thirteen guessed spellings all failed, and scraping the index pages found no feed links.

## MANUAL_TENDERS backfill

GeBIZ RSS only carries about two days of items, so a tender published before the automation's first run — or during an outage longer than two days — can never be re-fetched. Optional plain-CSV file `MANUAL_TENDERS` in the tracker folder covers that gap.

Columns are the `EPU/CMP/10` header row plus an optional `Bucket` column (`EPU/CMP/10` or `EPU/SER/34`). Only `Title` is required. See [`MANUAL_TENDERS.sample.csv`](MANUAL_TENDERS.sample.csv).

`MANUAL_TENDERS` is also the correction mechanism. If a row already exists in the tracker, the columns you filled in overwrite it on the next run — so a wrong category or a missing title is fixed by editing the CSV, not the sheet. Columns left blank are never used to overwrite anything. Coverage & Method reports how many existing rows were corrected. Leave `Link` blank rather than guessing a GeBIZ URL. Once a manual row has been picked up it lives in the tracker permanently, so the CSV can be emptied afterwards.

## Categorisation

Every tender row on every tab carries two columns, using GeBIZ's and TenderBoard's own taxonomy:

- **`Procurement Category`** — the full path, always spelled `Group ⇒ Sub-category`, e.g. `IT&Telecommunication ⇒ Notebooks`, `Services ⇒ Professional Services`, `Construction ⇒ Renovation Supplies & Services`.
- **`Category Group`** — the top-level group alone, e.g. `IT&Telecommunication`. This is the column to filter on.

The two sources spell categories differently and had to be reconciled. TenderBoard gives `Group: Sub`. GeBIZ names each RSS feed after the *sub-category alone* (`Servers`, `Professional Services`), so `SUBCATEGORY_GROUPS` in `Core.gs` maps those back to their group — without it, filtering `Category Group = IT&Telecommunication` would return TenderBoard rows only and silently miss every GeBIZ one. Add an entry there whenever a new GeBIZ feed category appears.

Both columns are recomputed for every row on every run, so rows stored under an older scheme are corrected in place rather than left inconsistent. Coverage & Method prints the row count per group.

## Tabs

`TECQ Shortlist`, `EPU/CMP/10`, `EPU/SER/34`, `Closed Tenders`, `Awarded (Intel)`, `Run Ledger`, `Coverage & Method`. All tender tabs carry `Procurement Category` and `Category Group`.

Rows found in a legacy `Review (Unsure)` tab are re-routed into the two EPU tabs on load. A legacy `TECQ Recommendation` of "Advise to look at" migrates to **`Possible`**, not `Look at` — it was applied by a keyword rule, not a judgment, so it is queued for a real review rather than trusted.

Rows found in a legacy `Review (Unsure)` tab are re-routed into the two EPU tabs on load rather than discarded.

## Tests

- `node test-core.js` — offline unit tests for routing, category groups, dedup, cadence, dates, fingerprints, review carry-over, shortlist ordering and response parsing.
- `node test-pipeline.js` — end-to-end tests running the real bundle inside `fake-apps-script.js`, a small in-memory stand-in for the Apps Script services. Covers the sheet round-trip, the TenderBoard→GeBIZ upgrade, a full refresh, fingerprint invalidation, closure, legacy migration, and the missing-key path.
- `node demo-run.js` — prints the whole sequence (collect → review → shortlist → refresh → re-review) with the Anthropic call stubbed. Deterministic and free to run.
- `node smoke-test.mjs` — online; fetches every configured GeBIZ feed and asserts no item is dropped during routing. Requires outbound access to `www.gebiz.gov.sg`.
- `node build-bundle.mjs` — regenerates `dist/Code.gs` from `Core.gs` + `Code.gs`. Run this after any edit; `dist/Code.gs` is what gets pasted into Apps Script.
