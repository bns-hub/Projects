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

Google Drive archive folder:
`1TPg44swiYi14FD3rciZx-WNCsFE8Qyve`

### Replacement for Step 3b — TenderBoard via GitHub CSV

1. Fetch the status JSON first using WebFetch, returning only its run timestamp, success/failure state, row count, pages scanned and error message. Then fetch the canonical CSV using WebFetch. Never fetch `tenderboard.biz` directly from this Task 1.
2. Treat the CSV as raw and unfiltered. Apply Task 1's existing category routing, relevance filter and cross-source dedup rules exactly as written. Do not revisit TenderBoard detail pages.
3. A successful status timestamp from today's 10:00 AM SGT cycle, or otherwise no more than approximately 26 hours old, is current. Record its timestamp and row count in Coverage & Method.
4. If the status or CSV is absent, unreachable or stale, record `NOT RUN — no current GitHub crawl data this cycle` in the TenderBoard column of today's Run Ledger row and in Coverage & Method. Continue with GeBIZ. This is a coverage gap, not a Drive failure. Do not stop the run.
5. If the status says the crawler failed, or the CSV is malformed/unparseable, record `FAILED — <reason>`, notify Benson once, and continue with GeBIZ alone.
6. Keep the existing TenderBoard field fallbacks: missing closing date = `Unknown`; missing publish date = first-seen date plus `(first seen)`; missing agency = `Not stated (TenderBoard)`; missing scope = blank; missing link = plain text plus Known Gaps note.
7. Keep all existing GeBIZ-wins and cross-source dedup behavior. Existing TenderBoard rows may be upgraded when GeBIZ later finds the same tender.

### Daily Google Drive archive

After a current CSV has been fetched and parsed successfully, save an archival copy in the Google Drive folder above using `create_file`:

- Title: `TenderBoard_Raw_<YYYY-MM-DD_HHMM>.csv`, using the GitHub status timestamp in SGT.
- `contentMimeType`: `text/csv`
- `disableConversionToGoogleType`: `true`
- `parentId`: `1TPg44swiYi14FD3rciZx-WNCsFE8Qyve`
- Content: the exact raw CSV fetched from the canonical GitHub URL, without filtering or rewriting.

Before creating it, search that archive folder for the exact title. If it already exists, reuse it and do not create a duplicate. Record the archive fileId/link in Coverage & Method. Archive failure is non-fatal: log it, notify Benson once, and continue building the consolidated tracker. Do not archive a stale, malformed or failed crawl.

### IMPORTANT OVERRIDE — Awarded (Intel) is permanent and uncapped

For this tracker, `all awarded tenders` means every awarded tender captured from the tracked GeBIZ procurement categories that passes the existing IT/system-integrator relevance filter, together with every award already present in the `Awarded (Intel)` sheet.

- Accumulate awards across runs. Never regenerate the Awarded sheet from only the current feed window.
- Preserve every existing Awarded row unless it is a confirmed duplicate of the same award.
- Remove and supersede the old 100-row cap. Never trim older awards because of age or row count.
- Deduplicate by normalized GeBIZ tender/quotation number. If one opportunity has multiple awarded suppliers or award line items, preserve each distinct supplier/line award rather than collapsing them into one row.
- Update an existing award when later data supplies previously missing awarded-to, value or award-date fields; do not add a duplicate row.
- Use only verified official GeBIZ award feeds/listings. Do not invent an award-feed URL. Award collection must run on every full-run day because GeBIZ states that RSS covers only awards from approximately the last two days.
- A feed gap older than the available RSS window is `UNRECOVERABLE — award RSS window ~2 days`; retain all previously captured rows and record the gap in Coverage & Method and the Run Ledger.
- Missing award value or supplier is `Not stated`, not a reason to discard an otherwise relevant award.
- TenderBoard awards remain unavailable unless Task 2 later adds a verified award source; do not infer awards from tenders disappearing from the live list.

### IMPORTANT OVERRIDE — TOPPAN Ecquaria recommendation tag

Add a column named `TECQ Recommendation` immediately before `Link` on `EPU/CMP/10`, `EPU/SER/34`, `Review (Unsure)` and `Closed Tenders`. Use the exact value `Advise to look at` for every open tender that Benson should inspect as a plausible TOPPAN Ecquaria opportunity. Apply the same standard to GeBIZ and TenderBoard.

Tag `Advise to look at` when the primary or material scope plausibly includes one or more of:

- bespoke public-sector application development, modernisation or system integration;
- workflow, case management, registry, licensing, permitting, grants, submissions, approvals or audit trails;
- citizen/business portals, mobile or field-operation applications, digital identity or Singpass-related integration;
- application maintenance/support, legacy modernisation, cloud/GCC migration, DevSecOps or managed application services;
- data platforms, reporting, dashboards, analytics, document/content management or cross-agency information exchange;
- APIs, enterprise integration, microservices, Java/Spring/React solutions, container platforms or government common-service integration;
- AI-enabled applications, agentic delivery, RAG, process automation, low-code/pro-code platforms or related advisory work;
- digital-government consultancy, enterprise architecture, transformation roadmaps, PMO or implementation advisory;
- hardware, licences or hosting purchased as a material part of an otherwise relevant system solution.

Rules:

- Capture bias governs: if the available title/category/scope suggests a plausible TECQ fit, tag it. Do not withhold the tag merely because the domain is new, a partner may be needed, or the tender is cryptic.
- Every row routed into either EPU sheet as relevant must have `Advise to look at`; the column must never be blank on a relevant open row.
- A `Review (Unsure)` row also gets `Advise to look at` when the uncertainty is about missing detail, category or delivery approach but the available information still suggests a plausible digital-system opportunity.
- Do not tag an item whose primary scope is unambiguously one of the existing exclusions: cybersecurity-only, AV, pure network hardware/switches, training/e-learning-only, or unrelated/non-IT machinery and supplies.
- This tag is an attention flag, not a bid/no-bid or pricing decision. Do not claim TECQ can meet an unevidenced domain or product requirement.
- On the first run after this migration, classify all existing open EPU and Review rows from their stored title, category and scope only. Do not spend tokens re-fetching old detail pages solely to populate the tag. Preserve the tag when rows move to `Closed Tenders`.
- Format tagged cells with a light-green fill and wrapped text. Add a Coverage & Method line: `TECQ Recommendation: N open tenders tagged Advise to look at (GeBIZ N | TB N)`.
- `Awarded (Intel)` does not use this column; awards remain competitor intelligence rather than live opportunities.

### Consequential wording changes

- Step 0 cadence skip: stop before fetching the GitHub status/CSV.
- Pre-flight: Drive auth is still required for the tracker, but it is no longer required for the TenderBoard handoff.
- Coverage & Method TenderBoard line: use `OK — N scanned, N relevant, N dupes suppressed, GitHub crawl from <timestamp>` or the NOT RUN/FAILED wording above.
- Run Ledger: TenderBoard `OK` means a current, valid GitHub CSV was processed. There is still no TenderBoard backfill beyond what the current CSV contains.
- Known limitation: TenderBoard coverage depends on the 10:00 AM SGT GitHub Actions crawl, not Benson's PC or a local task.
- Awarded (Intel) is an uncapped historical ledger of all relevant awards actually captured. It cannot recreate awards missed before collection began or during an RSS-window outage.
- The fixed GitHub CSV remains the canonical live handoff. The dated Google Drive copy is archival only and must never be used as Task 1's input or substituted for the GitHub freshness check.
- Do not notify for an ordinary cadence skip. Do notify for a reported/malformed GitHub crawl, and for five or more consecutive TenderBoard NOT RUN days.

### Token rule for this handoff

Fetch the tiny status JSON first. Fetch the CSV only on a full-run day. Do not reread either file in the same run, do not fetch GitHub repository pages, and do not fetch TenderBoard pages. Parse the one CSV response in memory and reuse the same raw content for both processing and the Drive archive upload.

---

After saving the edit, keep Task 1 scheduled for 11:00 AM Singapore time.
