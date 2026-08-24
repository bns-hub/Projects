IMPORTANT — token-saving rules for this routine:
1) MUST convert any file to Markdown before reading it (do not read raw file formats directly).
2) Prefer using scripts to read webpages instead of OCR/screenshots.

# GeBIZ + TenderBoard Tender Tracker — Reliable Daily Run

## Overview
We are a System Integrator specializing in IT software solutions. This routine monitors BOTH
GeBIZ and TenderBoard **every single run** and maintains a running master tracker of tender
opportunities that match our business focus:
- **EPU/CMP/10** - Computer Related Hardware, Software, and Services
- **EPU/SER/34** - Service (Consultant)

Two sources, both searched daily:
- **GeBIZ** (gebiz.gov.sg) — Singapore's government e-procurement portal, via its RSS feeds.
  **Primary source. A GeBIZ failure stops the run.**
- **TenderBoard** (tenderboard.biz) — commercial aggregator tracking 40+ Singapore tender sites,
  including non-GeBIZ buyers (statutory boards, healthcare clusters, universities, town councils,
  private buyers). **Searched every run.** It is fetched best-effort — see Step 3b — because it is a
  third-party commercial site we have no account on: if it is genuinely unreachable on a given day the
  run still completes on GeBIZ data and logs the miss, rather than losing that day's GeBIZ coverage.

Awarded tenders are also captured (see Step 3d) — not to bid on, but as market/competitor intel.

This is an **unattended daily scheduled run**. Do this fully without asking clarifying questions.

---

## Critical Context
- **Tracker started:** 07 Aug 2026
- **TenderBoard source + relevance filter + awarded-tender intel added:** 24 Aug 2026
- **GeBIZ RSS feeds:** Only expose items published in the last ~2 days
- **Job:** Pick up NEW tenders since last run and fold into persistent accumulating list (NOT regenerate from scratch)
- **Why:** Regenerating from scratch would silently lose older-but-still-open tenders each time (already caused one missed tender on day 1)

---

## Relevance Filter — What To Capture (applies to BOTH sources)

**Capture** a tender when its primary subject is IT software/system-integration work we could pursue:
software development, system integration, application development/maintenance/support, digital
services and platforms, cloud/hosting, data platforms and analytics, IT professional services and
consultancy, and the hardware/licences procured as part of such a system.

**EXCLUDE** a tender when its PRIMARY subject is any of these — do not add it to the active sheets:
1. **Cybersecurity** (pen-testing, SOC/SIEM services, security audits, security appliances)
2. **Audio-Visual (AV) systems** (projectors, displays, sound systems, AV installation)
3. **Network switches** (and comparable pure network hardware supply/replacement)
4. **Training-related services** (courses, curriculum delivery, trainer provision, e-learning content)
5. **Machines or hardware unrelated to IT system integration** (lab/medical/industrial equipment,
   printers-as-commodity, vending, furniture, plant)

Exclusion is judged on the tender's PRIMARY subject, not on incidental mentions. A software system
that merely has a security module, an AV feed, a switch in its BOM, or a train-the-trainer clause is
still IN SCOPE — do not drop it. When a tender is genuinely half-and-half and you cannot call it,
CAPTURE it and add a one-line note in Coverage & Method under "Borderline calls this run"; a false
positive we can ignore costs far less than a missed opportunity.

Every exclusion must be logged (count + up to 5 example titles with the rule number that excluded
them) in Coverage & Method — never drop items silently.

---

## File Locations
Folder owned by Benson's personal account: **bnsn4ull@gmail.com**

| Folder | ID | Purpose |
|--------|----|----|
| **GeBiz Daily** | `1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g` | Holds the tracker: read the most-recently-created *native Google Sheet* here as the "latest file" (see mimeType note in Step 2), then upload the updated version here too |

There is no separate Archive folder or archiving step anymore — to save tool calls/tokens each run,
read the latest file and update it in place logically (there's no true in-place edit — see below —
but there's also no separate copy-to-archive step). Because delete isn't available, old files
just stay in GeBiz Daily as their own history; that's fine and intentional now.

Confirmed-good seed file (12 Aug 2026, verified correct by Benson):
https://docs.google.com/spreadsheets/d/11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8/edit

---

## Google Drive Connector Constraints
- **Available tools:** `create_file`, `copy_file`, `download_file_content`, `list_recent_files`, `search_files`
  (`copy_file` exists but this workflow no longer uses it — no archiving step, see below)
- **NOT available:** delete, move, in-place sheet updates
- **`search_files` accepts only `query`, `pageSize`, `pageToken`, `excludeContentSnippets`** — there is
  NO `orderBy` parameter. The `query` string supports `createdTime` comparison clauses (e.g.
  `createdTime > '...'`) but not server-side sorting. Any "find the latest file" logic must sort/compare
  the returned results' `createdTime` values itself (see Step 2) — never assume the API returns results
  in creation order.
- **Implication:** "Updating" the tracker means: read the latest file, build the updated data in memory,
  and upload a new file — Drive has no way to edit an existing file's cells directly. Just read, then
  upload the updated info as the new latest file. Don't add any archiving/copying step on top of this.
- **Resolved quirk — dual file objects on upload:** an earlier version of this routine uploaded with
  `disableConversionToGoogleType: true`, which reliably produced TWO Drive files (a raw .xlsx plus a
  separate Drive-auto-converted native Sheet sibling that could take 30-60s to appear, sometimes never).
  VERIFIED 12 Aug 2026: leaving `disableConversionToGoogleType: false` avoids this entirely — the
  direct `create_file` response is already the native Google Sheet, one file, no waiting. See Step 7.
- **No Sheets-API-style in-place editing is available at all in this session** — only Drive's
  file-level tools. A genuinely stable, unchanging spreadsheet link/fileId that gets edited in place
  each day is NOT achievable with what's connected right now; it would need an Apps Script web app or
  a dedicated Google Sheets API connector added later. Until then, "the latest file" always means "the
  most recently created native Sheet in GeBiz Daily," and its link changes daily — this is accepted
  and expected (Benson agreed to this tradeoff on 12 Aug 2026).

---

## Pre-flight Verification (RUN AT START OF EACH EXECUTION)

### Step 1: Test Google Drive Authentication
```
mcp__Google_Drive__list_recent_files does NOT accept a parentId parameter (confirmed by a real error:
"Unknown name 'parentId': Cannot find field") — use mcp__Google_Drive__search_files instead:

Use mcp__Google_Drive__search_files with:
  - query: "parentId = '1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g'"
  - pageSize: 5
  - excludeContentSnippets: true   (this call only checks auth/connectivity — content isn't needed)

Expected: Returns a list (empty or with files), no auth error
If fails: 
  → STOP immediately
  → Send PushNotification to Benson: "GeBIZ Tracker: Google Drive auth failed. Check connector credentials for bnsn4ull@gmail.com."
  → Log failure reason to Coverage & Method sheet
  → Do NOT proceed
```

### Step 2: Test One RSS Feed
```
Fetch https://www.gebiz.gov.sg/rss/IT_Services_%26_Software_Development-CREATE_BO_FEED.xml

Expected: Valid XML, parseable
If fails:
  → Send PushNotification: "GeBIZ Tracker: RSS feeds unreachable (GeBIZ portal may be down)."
  → Log to Coverage & Method sheet with reason
  → Do NOT proceed (don't create empty tracker file)
```

**TenderBoard is searched every run but is deliberately NOT a pre-flight gate.** It must never stop the
run or trigger a "tracker broken" push — see Step 3b for its failure handling.

**If both verification steps pass:** Continue to main execution.

---

## Main Execution (AFTER all verification passes)

### Step 1: Get Current Date/Time
```
Get today's date/time in Asia/Singapore timezone (TZ=Asia/Singapore)

Format for use inside the Coverage & Method sheet: "DD Mon YYYY, H:MM AM/PM SGT"
  e.g., "12 Aug 2026, 2:30 PM SGT"

Also compute a filename-safe timestamp prefix from the SAME SGT moment, format "YYYY-MM-DD_HHMM"
(24-hour clock, zero-padded), e.g. "2026-08-14_1430" for 2:30 PM SGT on 14 Aug 2026.

IMPORTANT — the filename includes this date/time prefix (see Step 6/7): every run's file is
titled "<YYYY-MM-DD_HHMM>_GeBIZ_Open_Tenders" using the prefix computed here (timestamp first,
then the fixed name). Keep this exact fixed name even though TenderBoard rows now live in the same
workbook — Step 2's file-selection filter matches on "GeBIZ_Open_Tenders", so renaming the file would
orphan the entire history. This prefix is purely for human-readable identification of when a file was
produced — file selection on the next run still goes by Drive's createdTime metadata (see Step 2),
not by parsing this prefix.
```

### Step 2: Load Previous State
```
List files in GeBiz Daily folder using mcp__Google_Drive__search_files with:
  - query: "parentId = '1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g'"
  - excludeContentSnippets: true   (only fileId/createdTime/mimeType/title are needed to pick the
    winner; the actual content gets pulled properly via read_file_content below, so don't pay for a
    second, partial copy of the same content here)

Note: search_files has no orderBy/sort parameter — see "Google Drive Connector Constraints" above.
Results are NOT guaranteed to arrive in any particular order, so the "most recent" file must be
determined by comparing every matching result's createdTime value directly, never by assuming
result order or by trusting Drive's modifiedTime (which changes on edits and does not reflect when
a file was actually produced by this routine).

Filter results by title contains "GeBIZ_Open_Tenders"
AND mimeType = 'application/vnd.google-apps.spreadsheet' — i.e. a real native Google Sheet.
Why the mimeType filter still matters: Step 7 now uploads with disableConversionToGoogleType: false,
which produces a single native Sheet directly (see Step 7) — so in normal operation there should be
nothing else to filter out. The filter stays here as a safety net for two cases: (a) old dual-file
leftovers from before 12 Aug 2026 (a handful of raw .xlsx files from when this routine used
disableConversionToGoogleType: true), and (b) the rare fallback case where Step 7's direct response
isn't already a native Sheet. Either way: always treat the native Sheet
(mimeType application/vnd.google-apps.spreadsheet) as canonical, and never read from, link to, or
treat a raw .xlsx as the tracker.

The seed/baseline file for this tracker going forward is:
  https://docs.google.com/spreadsheets/d/11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8/edit
  (fileId: 11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8) — confirmed correct/complete by Benson on
  12 Aug 2026. If search_files can't find anything newer, fall back to this exact fileId rather than
  starting fresh.

If files found (after the mimeType filter):
  → Among all matching results, compare each one's createdTime field (from the file metadata, NOT
    modifiedTime) and take the single file with the latest (maximum) createdTime — this is the
    actual creation timestamp, unaffected by any later edits.
  → Read it with mcp__Google_Drive__read_file_content (NOT download_file_content with
    exportMimeType: text/csv — CSV export only captures one sheet; read_file_content returns all
    sheets as markdown tables in one call, which is what's needed here)
  → Parse all data sheets present: "EPU/CMP/10", "EPU/SER/34", "Closed Tenders", and
    "Awarded (Intel)" if it exists (it won't in files created before 24 Aug 2026 — start it empty)
  → Extract all rows into in-memory lists, including each row's Link (read the cell's
    underlying hyperlink URL, not just its displayed text)

SCHEMA MIGRATION — Source + Scope Summary columns (added 24 Aug 2026):
  → The active sheets now carry a "Source" column and a "Scope Summary" column, and the old
    "GeBIZ Link" column is renamed to plain "Link" (it can now point at either portal). Column ORDER
    is defined in Step 6.
  → When reading a previous file: if a sheet has no "Source" column, set Source = "GeBIZ" for every
    row carried forward from it. Every row in every pre-24-Aug-2026 file is a GeBIZ row by definition,
    so this backfill is safe and unconditional — never leave Source blank on a carried-forward row.
  → If a carried-forward row has no "Scope Summary", leave it blank rather than re-fetching its detail
    page (that would cost a fetch per historical row for no benefit). Populate Scope Summary only for
    rows added from this run onward. Do NOT backfill retroactively.
  → Treat a legacy "GeBIZ Link" header as the "Link" column. Do not drop the column or its hyperlinks.
  → This migration is idempotent: once a file has Source + Scope Summary + Link, later runs read them
    as-is.

Carried-forward rows and hyperlinks:
  → Every row carried forward into the rebuilt workbook (Step 6) must keep its Link as a real
    hyperlink, same as newly-added rows.
  → If an older GeBIZ row's Link cell turns out to be plain text with no real URL (e.g. a leftover
    "Open in GeBIZ" label from before this fix), reconstruct the URL directly — no fetch needed —
    using the pattern:
      https://www.gebiz.gov.sg/ptn/opportunity/opportunityDetails.xhtml?code=<Tender Code>&status=RELEASED&type=<TYPE>
    where <Tender Code> is the row's primary code (the part before " / " if the Ref No. has both a
    code and a secondary reference) and <TYPE> is derived from the code's embedded suffix:
      ETT → TT   |   ETQ → TQ   |   ERF → RF
    VERIFIED 12 Aug 2026: this reconstructed URL (with no OPPORTUNITY_ID or origin param) loads the
    correct tender page every time — confirmed against both TQ and RF codes live, and TT confirmed via
    RSS-sourced links using the same pattern. No need to re-verify this mapping each run.
    Only fall back to fetching opportunityDetails.xhtml (or leaving the plain-text label + a Known
    Gaps note) if a row's code has a suffix outside {ETT, ETQ, ERF} that this mapping doesn't cover.
  → This reconstruction pattern is GeBIZ-only. A TenderBoard row (Source = "TenderBoard") whose Link
    is missing cannot be reconstructed from its ref — leave the cell as plain text and note it under
    Known Gaps.

If NO files found:
  → Start with empty lists for each sheet
  → Note in Coverage & Method: "No prior file found; starting fresh"
```

### Step 3: Fetch Fresh GeBIZ RSS Candidates
```
Fetch these six GeBIZ RSS feeds:
  1. https://www.gebiz.gov.sg/rss/IT_Services_%26_Software_Development-CREATE_BO_FEED.xml
  2. https://www.gebiz.gov.sg/rss/Desktop_Computers-CREATE_BO_FEED.xml
  3. https://www.gebiz.gov.sg/rss/Computer_Accessories-CREATE_BO_FEED.xml
  4. https://www.gebiz.gov.sg/rss/Notebooks-CREATE_BO_FEED.xml
  5. https://www.gebiz.gov.sg/rss/Servers-CREATE_BO_FEED.xml
  6. https://www.gebiz.gov.sg/rss/Professional_Services-CREATE_BO_FEED.xml

Parse each XML feed. For each <item>:
  - Extract: title, link, pubDate, Tender/Ref No. (usually in title)
  - Check: Is this Tender/Ref No. already in ANY sheet? (use the identity/dedup rules in Step 3c —
    a tender already captured from TenderBoard on an earlier run counts as already tracked)
    → If yes: skip (already tracked), but apply the GeBIZ-wins upgrade rule in Step 3c
    → If no: mark as "new candidate", with Source = "GeBIZ"
```

### Step 3b: Search TenderBoard (EVERY RUN — best-effort fetch)
```
PURPOSE: catch relevant tenders that never appear in GeBIZ's RSS at all — statutory boards, healthcare
clusters, universities, town councils and private buyers that publish on their own portals, which
TenderBoard aggregates. This step runs on every scheduled execution; it is not optional or occasional.

FAILURE RULE — the fetch is best-effort, because TenderBoard is a third-party commercial site we hold
no account on. Wrap the entire step in error handling. If the SOURCE is unreachable — network egress
blocked, HTTP 403 / 429 / 5xx, Cloudflare or bot-check interstitial, login wall, the listing turns out
to be JavaScript-only with no server-rendered rows, the page layout changed and nothing parses, or the
step is taking unreasonably long — then:
    → Retry at most twice.
    → Do NOT send a PushNotification about it. A TenderBoard outage is not a tracker failure.
    → Do NOT abort the run, and do NOT skip Steps 4-9.
    → Record the exact reason in Coverage & Method under "TenderBoard: SKIPPED — <reason>" and carry on
      with GeBIZ-only data. Keeping the tracker current on GeBIZ always outranks TenderBoard coverage.
    → If TenderBoard has been skipped on 3 or more consecutive runs, THEN add one line to the run's
      normal Step 9 notification: "TenderBoard unreachable N runs running — may need a look." Do not
      raise a separate alert for it.

FETCH:
  Primary listing page: https://www.tenderboard.biz/singaporetenders
  If that URL 404s or has moved, try in order and use the first that returns server-rendered listings:
    - https://www.tenderboard.biz/vendor/tender-opportunities/
    - pagination URLs discovered from page 1 (e.g. ?page=2)
  Use a script-based fetch (WebFetch or a headless-browser text extraction) per the token-saving rules
  at the top — never screenshot-and-OCR this listing.
  Walk at most 3 pages of results, newest first. Stop early once you reach items whose publish date is
  older than the last successful run date recorded in the previous file's Coverage & Method (or older
  than 7 days if that date can't be determined) — there is no value in paging deeper.

NOTE ON ACCESS (verified 24 Aug 2026): TenderBoard's full alert feed is a paid supplier-portal feature,
and this routine has no TenderBoard account. Only whatever the public notices page renders anonymously
is in scope. If the public page shows teasers without closing dates or without working deep links,
capture what IS there rather than discarding the item — see "Missing fields" below.

FOR EACH listing item, extract as much as the page gives:
  - Tender/Ref No. (TenderBoard often shows the originating buyer's own reference)
  - Full title
  - Buyer/agency name
  - TenderBoard's own category label
  - Short scope description, if the listing exposes one
  - Publish date (SGT)
  - Closing date/time (SGT)
  - Link: the deep link to that specific tender's page. Prefer the link back to the ORIGINAL source
    portal if the listing exposes one; otherwise use the TenderBoard detail-page URL. Never a generic
    /singaporetenders link, and never a placeholder.

CATEGORY ROUTING (TenderBoard has no EPU codes — map by meaning):
  - Anything IT/digital: software development, system integration, application maintenance, IT
    services, cloud/hosting, data platforms, digital transformation, hardware/servers/laptops and
    licences procured as part of a system
      → EPU/CMP/10 sheet, Procurement Category = "TenderBoard: <their label>"
  - Consultancy/advisory/professional services: management or process consultancy, feasibility studies,
    business analysis, PMO, professional services
      → EPU/SER/34 sheet, Procurement Category = "TenderBoard: <their label>"
  - Everything else: REJECT.

THEN apply the "Relevance Filter — What To Capture" section above to every routed item, exactly as it
is applied to GeBIZ items. The five exclusions (cybersecurity, AV, network switches, training,
non-IT machines/hardware) bind both sources equally, and every exclusion gets logged.

Missing fields:
  - Missing closing date → still add the row, put "Unknown" in Closing Date/Time, and note it under
    Known Gaps. A row with an unknown closing date is NEVER auto-moved to Closed by Step 5.
  - Missing publish date → use the date the row was first seen, and suffix it "(first seen)".
  - Missing agency → "Not stated (TenderBoard)".
  - Missing scope description → write a one-line summary inferred from the title, prefixed "(from
    title)". Do not fetch the detail page for every item just to fill this in; fetch a detail page only
    when the title alone leaves the relevance call genuinely undecidable.

Set Source = "TenderBoard" on every row added here, then hand all candidates to Step 3c.
```

### Step 3c: Cross-Source Deduplication
```
TenderBoard aggregates GeBIZ among its 40+ tracked sites, so a large share of TenderBoard items will be
tenders ALREADY captured from GeBIZ RSS. Never let the same tender occupy two rows.

Identity test — two items are the SAME tender if EITHER holds:
  (a) Their tender/ref numbers match after normalising: uppercase, strip all whitespace, hyphens,
      slashes and punctuation; compare the primary code only (the part before " / " if a row carries
      both a primary code and a secondary reference).
  (b) Their ref numbers don't match or one is missing, BUT the normalised title (lowercased,
      whitespace-collapsed, punctuation stripped) matches AND either the agency matches or the
      closing date/time matches.

Resolution — GeBIZ always wins as canonical:
  - Same tender present from both sources this run → keep ONE row with Source = "GeBIZ", and keep the
    GeBIZ opportunityDetails.xhtml link. Drop the TenderBoard duplicate. Count it under "TB duplicates
    suppressed" in Coverage & Method.
  - Tender already in the sheets as Source = "TenderBoard" from an earlier run, and GeBIZ RSS surfaces
    it this run → UPGRADE the existing row in place: set Source = "GeBIZ", replace the Link with the
    GeBIZ URL, and refresh Procurement Category / Scope Summary / Publish / Closing from the GeBIZ page
    (GeBIZ data is authoritative). This is an update, NOT a new row, so it does NOT count toward the
    "new tenders" total in Step 9.
  - Tender already in the sheets as Source = "GeBIZ", and TenderBoard shows it again → skip silently.
  - No match anywhere → genuinely new; add it with its own Source.

Within TenderBoard's own results, dedupe by the same identity test before adding (the aggregator can
list one tender under two categories).
```

### Step 3d: Awarded Tenders (market intel — best-effort)
```
Awarded tenders are captured for intel only: who is winning the work we chase, at what value. They are
never bid candidates and never go in the active EPU sheets — they go in their own "Awarded (Intel)"
sheet (Step 6, Sheet 4).

Sources, in order of preference:
  - GeBIZ: check whether an award-notice RSS feed exists alongside the six CREATE_BO_FEED feeds (the
    RSS index at https://www.gebiz.gov.sg/rss/ or the portal's award-notices listing). Do NOT invent
    or guess a feed URL — use one only if you actually find and successfully parse it. If no award
    feed is discoverable, note "GeBIZ award feed: not available" in Coverage & Method and move on.
  - TenderBoard: if the public listing surfaces awarded/closed-with-award items during the Step 3b
    walk, capture those.

Apply the SAME scope + exclusion filter as active tenders — an awarded cybersecurity or AV job is not
intel we want.

For each awarded item captured: Tender/Ref No., Title, Agency, Source, Awarded To (supplier name),
Award Value, Award Date, Link. Use "Not stated" for any field the listing doesn't expose.

Cap the sheet at the most recent 100 awarded rows (newest award date first); drop the oldest beyond
that and note the trim in Coverage & Method. Dedupe by the Step 3c identity test.

This whole step is best-effort under exactly the same rule as Step 3b: it never blocks the run, never
raises its own notification, and logs whatever it could or couldn't get.
```

### Step 4: Validate and Route New GeBIZ Candidates
```
For each GeBIZ "new candidate" item:
  1. Fetch its opportunityDetails.xhtml page (use the link from RSS)
  2. Extract:
     - Exact Procurement Category (from GeBIZ's official category picker)
     - Agency name
     - Publish date/time (SGT)
     - Closing date/time (SGT)
     - Full tender title
     - A brief scope description (1-2 sentences, plain English: what is actually being procured)
  
  3. Check: Does Procurement Category match EITHER target?
     - IT&Telecommunication (includes: Computer Accessories, Desktop Computers, 
       IT Services & Software Development, Notebooks, Servers, Software & Licences)
       → Route to EPU/CMP/10 sheet
     - Services ⇒ Professional Services
       → Route to EPU/SER/34 sheet
     - Otherwise: REJECT (not relevant)
  
  4. Apply the "Relevance Filter — What To Capture" section: drop anything whose PRIMARY subject is
     cybersecurity, AV, network switches, training, or non-IT machines/hardware. Log every exclusion
     (title + rule number) for Coverage & Method. Borderline → capture and note.
  
  5. For each surviving (routed) tender:
     Add row to the correct sheet with:
       - Tender/Ref No.
       - Title
       - Agency
       - Procurement Category
       - Source: "GeBIZ"
       - Scope Summary: the brief description from step 2 (1-2 sentences, no marketing padding)
       - Publish Date/Time (SGT)
       - Closing Date/Time (SGT)
       - Status: "Open"
       - Link: the exact opportunityDetails.xhtml URL for this tender, captured verbatim from
         the RSS <link> element (including all query params: code, status, type, OPPORTUNITY_ID, origin).
         This is the URL that must be hyperlinked in Step 6 — do not discard it after routing.

TenderBoard candidates are already validated, filtered and routed in Step 3b/3c — do NOT fetch GeBIZ
detail pages for them.
```

### Step 5: Move Closed Tenders
```
For each row currently in EPU/CMP/10 and EPU/SER/34 (both sources):
  - Parse Closing Date/Time
  - If Closing Date/Time is "Unknown" (TenderBoard row with no date): leave it in the active sheet,
    do NOT close it. If it has been sitting with an unknown closing date for more than 60 days,
    note it under Known Gaps as stale rather than moving or deleting it.
  - Compare to current Singapore time
  - If Closing Date/Time has PASSED:
    → Remove row from active sheet
    → Add row to "Closed Tenders" sheet, preserving its Source and Scope Summary, with added column:
      - Move Date: today's date in SGT

Keep "Closed Tenders" sorted by Closing Date (oldest first)
Sort EPU/CMP/10 and EPU/SER/34 by Publish Date (newest first)
```

### Step 6: Build Updated Workbook
```
Create .xlsx file with five sheets:

Sheet 1: "EPU/CMP/10"
  Columns: Tender/Ref No. | Title | Agency | Procurement Category | Source | Scope Summary | Publish Date/Time | Closing Date/Time | Status | Link
  Font: Arial 11pt
  Header row: Bold, light gray background, frozen
  Borders: Thin borders around every cell
  Sorted by: Publish Date (newest first)
  Source column: exactly "GeBIZ" or "TenderBoard" — never blank, never any other spelling. Give the
    two values distinct light fills (GeBIZ = light blue, TenderBoard = light amber) so the split is
    readable at a glance.
  Scope Summary column: wrapped text, column width ~60 chars. 1-2 sentences. Blank is acceptable only
    on rows carried forward from before 24 Aug 2026 (see Step 2 migration note).
  Link column: MUST be a real clickable hyperlink to that row's exact tender URL (the one captured in
    Step 3b or Step 4), not a plain-text label. Set the cell's hyperlink property to the full URL and
    use display text "Open in GeBIZ" for Source = GeBIZ and "Open in TenderBoard" for
    Source = TenderBoard; style the cell as a hyperlink — blue, underlined. (openpyxl: cell.hyperlink
    = url; cell.value = label.) Every row needs its own distinct URL pointing at that specific
    tender's page — never a generic/placeholder link, and never leave the cell as unlinked plain text.
    The sole exception is a TenderBoard row whose listing exposed no deep link (Step 3b) — plain text
    there, plus a Known Gaps note.

Sheet 2: "EPU/SER/34"
  Same structure as EPU/CMP/10, including Source, Scope Summary and the real-hyperlink requirement.

Sheet 3: "Closed Tenders"
  Columns: Tender/Ref No. | Title | Agency | Procurement Category | Source | Scope Summary | Closing Date/Time | Move Date | Link
  Same formatting as above, including the same real-hyperlink requirement for Link.
  Sorted by: Closing Date (oldest first)

Sheet 4: "Awarded (Intel)"
  Columns: Tender/Ref No. | Title | Agency | Source | Awarded To | Award Value | Award Date | Link
  Same formatting conventions. Sorted by Award Date (newest first). Capped at 100 rows (Step 3d).
  If nothing was captured this run and none exists from before, still create the sheet with headers
  and a single row reading "No awarded-tender data captured yet — see Coverage & Method."

Sheet 5: "Coverage & Method"
  Content (as text rows, no table):
  ─────────────────────────────
  Run Date: [today's date/time SGT]
  Auth Status: ✓ PASS (or FAIL + reason)
  GeBIZ RSS Feeds: ✓ PASS (or FAIL + which feed)
  TenderBoard: ✓ OK — [N] items scanned, [N] relevant, [N] duplicates of GeBIZ suppressed
               (or "SKIPPED — <exact reason>" [+ consecutive-skip count], or "PARTIAL — <what was missing>")
  Awarded Intel: ✓ OK — [N] captured  (or "GeBIZ award feed: not available" / "SKIPPED — <reason>")
  
  EPU/CMP/10 Stats:
    - Total rows: [count]  (GeBIZ: [count] | TenderBoard: [count])
    - New added this run: [count]  (GeBIZ: [count] | TenderBoard: [count])
  
  EPU/SER/34 Stats:
    - Total rows: [count]  (GeBIZ: [count] | TenderBoard: [count])
    - New added this run: [count]  (GeBIZ: [count] | TenderBoard: [count])
  
  Closed Tenders Stats:
    - Total rows: [count]
    - Moved to Closed this run: [count]
  
  Excluded This Run: [count]
    [up to 5 example titles, each with the exclusion rule number that caught it, e.g.
     "• Supply of network switches for XYZ — rule 3"]
  
  Borderline Calls This Run:
    [any tender captured despite being half-in-scope, one line each, with the reasoning — or "None"]
  
  Source Upgrades This Run: [count of TenderBoard rows upgraded to GeBIZ per Step 3c]
  
  Previous File: [native-Sheet fileId/link read in Step 2, or "None (first run)"]
  
  Known Gaps / Manual Patches:
    [Carry forward only the most recent 8 entries from the previous file, newest last; if there were
     more than 8, replace the dropped older ones with a single line like "Earlier entries (before
     DD Mon YYYY) omitted — see that date's tracker file in GeBiz Daily for full history." Nothing is
     actually lost since old files are never deleted, this just keeps the log from growing forever and
     re-reading longer every day for no benefit.]
    [Add any new gaps discovered this run]
  
  Known Limitations:
    GeBIZ RSS feeds only expose ~2 days of publish history. 
    A tender published while this routine was paused/failed could be missed. 
    If gap discovered, patch manually and note here.
    TenderBoard is scraped anonymously from its public notices page — its full alert feed is a paid
    supplier-portal feature this routine has no account for. Coverage from that source is therefore
    partial by design, and any run may skip it entirely without that being an error.
  ─────────────────────────────
```

### Step 7: Upload to Google Drive
```
Use mcp__Google_Drive__create_file with:
  - name: "<YYYY-MM-DD_HHMM>_GeBIZ_Open_Tenders"   using the SGT timestamp prefix computed in
    Main Execution Step 1 (e.g. "2026-08-14_1430_GeBIZ_Open_Tenders" — timestamp first, then the
    fixed name). Keep the "GeBIZ_Open_Tenders" part exactly as-is — Step 2 selects the previous file
    by matching that string, so renaming it (e.g. to add "TenderBoard") would orphan the history.
    This prefix is for human-readable identification only — see Step 2, which selects
    "the latest file" by comparing actual createdTime metadata across results, not by parsing this
    prefix.
  - parentId: "1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g"
  - contentMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  - base64Content: [the .xlsx file bytes, base64-encoded]
  - disableConversionToGoogleType: false   (do NOT set this to true — see below)

VERIFIED 12 Aug 2026 (evening run): with disableConversionToGoogleType left false, create_file's
DIRECT response is already the native Google Sheet (mimeType 'application/vnd.google-apps.spreadsheet')
— no separate raw .xlsx sibling, no auto-conversion delay, no polling needed. Take the fileId straight
from this call's response and treat it as canonical immediately.

This replaces an earlier approach (uploading with disableConversionToGoogleType: true, then sleeping
and re-listing the folder waiting for an auto-converted sibling to appear). That pattern reliably
wasted 3+ extra tool calls and re-sent a full duplicate base64 payload every single run for no benefit
— do not do that anymore.

Fallback (should be rare): if the direct response's mimeType is somehow NOT
'application/vnd.google-apps.spreadsheet', re-list GeBiz Daily once and look for a same-titled native
Sheet sibling created shortly after; note in Coverage & Method that the fallback fired.

The resulting fileId is what Step 2 will search for on the next run (filtered by mimeType), what gets
referenced in any Benson-facing link, and what Step 9's notification should point to.

If upload succeeds:
  → Continue to delivery/notification steps using this fileId/link

If upload fails:
  → Send PushNotification: "GeBIZ Tracker: Failed to upload new file to GeBiz Daily. Check quota/permissions."
  → Log failure to Coverage & Method sheet
  → Do NOT delete or otherwise touch the previous file (leave it in place as the latest good version)
  → STOP
```

### Step 8: Deliver to Benson
```
Use SendUserFile to deliver the new .xlsx to Benson's conversation. This is a local-file convenience
copy only, not the canonical tracker (see Step 7) — do NOT describe it as "the tracker" or as
something Benson should bookmark; the native Google Sheet link is the one that matters for ongoing
use.
(SendUserFile requires an active user session; if running unattended, it will be skipped silently —
non-critical, since the real deliverable is already in Google Drive as the native Sheet.)
```

### Step 9: Send Notification (conditional)
```
Count genuinely NEW tenders added in this run (sum of new rows in EPU/CMP/10 + EPU/SER/34, both
sources). Source upgrades (Step 3c), suppressed duplicates, and awarded-intel rows do NOT count as new.

If new_tenders_count >= 1:
  → Send PushNotification with:
     - Title: "🎯 GeBIZ/TB: [N] New Tenders"
     - Body, for each of the first 3 new tenders, one block:
       "• [Title] — [Ref No.] — [Agency] [GeBIZ|TenderBoard]
          [one-line scope summary]
          Closes: [Closing Date/Time SGT]"
       (if more than 3, follow with "+[N] more")
        
       "Current tracker status:
        • EPU/CMP/10: [total count] tenders
        • EPU/SER/34: [total count] tenders
        • Closed: [closed count] tenders
        
        [If any tenders moved to Closed: "Also moved X tenders to Closed."]
        [If any awarded intel captured: "Awarded intel: +X rows."]
        [If TenderBoard was skipped this run: "TenderBoard skipped this run (<short reason>)."]
        [If TenderBoard skipped 3+ consecutive runs: "TenderBoard unreachable N runs running — may need a look."]
        
        Tracker: https://docs.google.com/spreadsheets/d/[native-Sheet fileId from Step 7]/edit"

  Every listed tender carries its source tag in square brackets, so Benson can tell at a glance
  whether it came from GeBIZ or TenderBoard.

If new_tenders_count == 0:
  → Send PushNotification with:
     - Title: "GeBIZ/TB: NO New Tenders"
     - Body: 
       "Current tracker status:
        • EPU/CMP/10: [total count] tenders
        • EPU/SER/34: [total count] tenders
        • Closed: [closed count] tenders
        
        [If any tenders moved to Closed: "Also moved X tenders to Closed."]
        [If TenderBoard was skipped this run: "TenderBoard skipped this run (<short reason>)."]
        [If TenderBoard skipped 3+ consecutive runs: "TenderBoard unreachable N runs running — may need a look."]
  → Log in Coverage & Method: "No new tenders this run"
```

---

## Error Handling & Logging

**Any failure at any step (EXCEPT Steps 3b/3d, which are best-effort — see below):**
1. **DO NOT silently fail** — explicitly log to Coverage & Method sheet
2. **Send PushNotification** to Benson with:
   - Step that failed
   - Specific error reason
   - Suggested remediation if obvious
3. **Partial success:** If steps 1–5 succeed but upload fails at Step 7:
   - DO NOT touch/overwrite the previous tracker file (leave it in place as the latest good version)
   - Notify Benson
   - STOP

**Steps 3b (TenderBoard) and 3d (Awarded intel) are the exceptions:** log the reason to Coverage &
Method, send no notification of their own, and continue the run to completion on GeBIZ data alone.

---

## Known Limitations

1. **GeBIZ RSS feeds only expose ~2 days of publish history**
   - A tender published while this routine was paused/failed/disabled could be missed entirely
   - If you discover a gap: patch it manually and note it in the Coverage & Method sheet

2. **TenderBoard coverage is partial and best-effort**
   - Searched every run, but only the anonymously-visible public notices page is in scope; the full
     multi-site alert feed is a paid supplier-portal feature with no account configured
   - The page is a commercial site that may rate-limit, bot-check, restructure, or move behind a login
     without notice — any of which silently skips the source for that run (logged, and surfaced in the
     notification only after 3 consecutive skips)
   - TenderBoard listings are aggregator summaries, so fields (especially closing time and the deep
     link to the original portal) can be thinner or less exact than GeBIZ's own detail pages. GeBIZ
     data always wins where both exist (Step 3c)

3. **Awarded-tender intel depends on what each portal publishes**
   - GeBIZ award notices may not be exposed via RSS at all; never fabricate a feed URL
   - Award Value and Awarded To are frequently withheld — "Not stated" is a normal outcome

4. **Relevance filtering is a judgement call**
   - The five exclusions are applied on a tender's PRIMARY subject; borderline items are captured
     rather than dropped, and logged as borderline. Review the "Excluded This Run" log occasionally to
     confirm the filter isn't cutting too deep

5. **No delete tool available**
   - Old files (both native Sheets and their raw .xlsx duplicates) stay in GeBiz Daily indefinitely —
     expected, and doubles as version history for the native Sheets; the file with the latest actual
     createdTime is always the live one
   - If Benson wants old versions or the stray raw .xlsx duplicates cleared out, he deletes them from
     GeBiz Daily manually — the routine can't do this itself

6. **No genuinely permanent/stable spreadsheet link with this connector**
   - Each run's canonical file is a new native Sheet with a new fileId/link, now named with a leading
     date/time prefix (e.g. "2026-08-14_1430_GeBIZ_Open_Tenders") purely for human readability;
     Benson accepted this tradeoff on 12 Aug 2026 (a truly static link would need an Apps Script web
     app or a Sheets API connector, not set up yet)
   - Uploading with `disableConversionToGoogleType: false` (see Step 7) produces the native Sheet
     directly as a single file — the earlier dual-file (.xlsx + auto-converted sibling) behavior only
     happened when that flag was set to true, and is no longer how this routine uploads

7. **search_files has no server-side sort/orderBy parameter**
   - "Latest file" must always be determined by comparing createdTime across all returned results in
     memory — never assume result order, and never substitute modifiedTime (which changes on edits
     and does not reflect actual creation/production time)

8. **Unattended run limitations**
   - SendUserFile tool requires active session; may be skipped silently (file is in Drive, so non-critical)
   - If any verification step fails at startup, routine stops with PushNotification to Benson

---

## Quick Reference: What This Does

✅ **Searches GeBIZ every run** via 6 category RSS feeds  
✅ **Searches TenderBoard every run** via its public Singapore notices page, catching non-GeBIZ buyers  
✅ **Validates and routes** to EPU/CMP/10 or EPU/SER/34 (GeBIZ codes, or mapped by meaning for TenderBoard)  
✅ **Applies the SI relevance filter** — excludes cybersecurity, AV, network switches, training, and
non-IT machines/hardware, judged on primary subject, with every exclusion logged  
✅ **Captures a brief scope summary** per tender alongside ref no., agency and closing date  
✅ **Dedupes across sources** so a tender listed on both portals occupies one row, GeBIZ canonical  
✅ **Stamps every row with its Source** (GeBIZ / TenderBoard), backfilling older rows as GeBIZ  
✅ **Captures awarded tenders** in a separate intel sheet (best-effort)  
✅ **Checks for closed tenders** and moves them to Closed Tenders sheet  
✅ **Uploads tracker** to GeBiz Daily as a native Sheet directly, filename prefixed with an SGT
date/time stamp (single file, no polling)  
✅ **Picks up the previous run's data** from whichever matching file has the latest actual
createdTime metadata — never modifiedTime, never assumed API result order  
✅ **Notifies Benson** with title, ref, agency, scope, closing date and source tag per new tender  
✅ **Logs all errors** and stops gracefully (doesn't fail silently)  
✅ **Tracks run stats** in Coverage & Method sheet, split by source  

---

## What This Does NOT Do

❌ **Does not delete old files** from GeBiz Daily (Google Drive connector limitation)  
❌ **Does not move tenders** if a new one supersedes an old one (GeBIZ doesn't support this; treats as new tender)  
❌ **Does not crawl historical tenders** (RSS only ~2 days; if routine was offline, older tenders are missed)  
❌ **Does not log in to TenderBoard** or use any paid supplier-portal feature — public page only  
❌ **Does not let a TenderBoard failure stop the GeBIZ run**  
❌ **Does not capture** cybersecurity, AV, network-switch, training, or non-IT hardware tenders  
