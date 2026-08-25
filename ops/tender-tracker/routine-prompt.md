IMPORTANT — how fetching works in THIS environment, and the token rule that follows from it.
Read both before writing any code.

1) NETWORK ACCESS. The **WebFetch tool CAN reach the internet. bash/Python scripts CANNOT** — this
   sandbox's egress proxy answers CONNECT 403 for every host (verified 25 Aug 2026 against
   gebiz.gov.sg, tenderboard.biz and example.com alike). So: never write a script that fetches a URL,
   never try to route around the proxy, and never disable TLS verification. EVERY network read in
   this routine goes through WebFetch. Scripts remain the right tool for everything LOCAL — building
   the .xlsx, parsing text you already hold, date arithmetic.
   This supersedes an older rule that told this routine to prefer scripts for fetching. That rule
   predates the egress restriction and, if followed, silently breaks the run.

2) KEEP CONTEXT SMALL. Everything entering the context window is re-sent on every later turn, so a
   raw blob read early is billed again and again. WebFetch takes a `prompt` argument — use it to
   return ONLY the fields you need, so a feed costs ~1k tokens instead of 30k. Never ask WebFetch for
   a page verbatim, never screenshot-and-OCR, and convert any file to Markdown rather than reading
   raw file formats.

The corollary — do not over-apply: don't spend three rounds of prompt-tuning on what one direct read
would answer. Be surgical where the volume actually is: the six RSS feeds, the TenderBoard listing,
and the tender detail pages.

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
still IN SCOPE — do not drop it.

**WHEN IN DOUBT, EXTRACT — leave no stone unturned.** This is the governing rule of the whole routine
and it overrides every "REJECT" instruction below. Drop a tender ONLY when it is unambiguously
irrelevant or unambiguously one of the five exclusions. If you are unsure for ANY reason — the title
is cryptic or an acronym, the category label is odd, the listing is a stub, the scope could plausibly
involve software/systems work, it straddles an exclusion, or you simply cannot tell — then CAPTURE IT:
extract every field you can and put the row in the "Review (Unsure)" sheet (Step 6, Sheet 4) with a
short "Why Unsure" note. Never discard a tender merely because information was thin or you ran out of
certainty. A false positive costs Benson ten seconds of reading; a missed tender costs a bid.

Where a cheap check would resolve the doubt — one fetch of the tender's own detail page — DO that
fetch rather than guessing or dropping. Only fall back to "Review (Unsure)" when the doubt survives
the detail page, or the page is unreachable.

Every exclusion must be logged in Coverage & Method: the count, plus each excluded title with the
rule number that caught it (list them all; if more than 25, list 25 and give the remaining count).
Never drop items silently.

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
- **Resolved quirk — dual file objects on upload:** uploading with `disableConversionToGoogleType:
  true` produced TWO Drive files (raw .xlsx + a slow auto-converted sibling). VERIFIED 12 Aug 2026:
  leaving it `false` returns the native Google Sheet directly — one file, no waiting. See Step 7.
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
    sheets as markdown tables in one call, which is what's needed here). Markdown tables are already
    the cheap representation — do not convert or re-read them further.
  → Read this file EXACTLY ONCE per run and work from that copy in memory. It is the largest single
    thing entering context and it grows every day, so a second read doubles the run's biggest cost for
    nothing. If it ever gets large enough to dominate the run, the fix is trimming what the tracker
    carries (the Known Gaps 8-entry cap and the 100-row awarded cap exist for this reason) — not
    re-reading it in pieces.
  → Parse all data sheets present: "EPU/CMP/10", "EPU/SER/34", "Closed Tenders", plus
    "Review (Unsure)" and "Awarded (Intel)" if they exist (they won't in files created before
    24 Aug 2026 — start those empty), plus "Run Ledger" (won't exist before 25 Aug 2026 — Step 5b
    reconstructs it)
  → Also read two single lines out of "Coverage & Method": the "TenderBoard Access Recipe" line
    (feeds Step 3b — this is what lets the run skip discovery) and the Run Ledger rows (feed Step 5b).
    These are cheap and must not be skipped; losing the recipe costs a full rediscovery every night.
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

FETCH THESE WITH WebFetch — one call per feed — and use each call's `prompt` to return ONLY a compact
list: for every <item>, its Tender/Ref No., title, link and pubDate, one line each. Do NOT ask for the
raw XML: six feeds of mostly-markup is the single largest avoidable token cost in the run. A script
CANNOT fetch these (no script egress — see the top of this prompt); ElementTree/feedparser is only an
option for XML you already hold as text.

For each <item> in that parsed output:
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
no account on. Wrap the entire step in error handling. Before declaring the source unusable you MUST
work through the full FETCH ladder below — a page that "looks empty" is usually a JS-rendered page,
not a dead source, and that distinction was mis-logged on 25 Aug 2026.

CLASSIFY the failure precisely and log the class verbatim in Coverage & Method. Use exactly one of:
    EGRESS_BLOCKED   — the fetch tool or proxy refused the host outright (e.g. "blocked by the network
                       egress proxy", or CONNECT 403 from the agent proxy). This is OUR network policy,
                       not TenderBoard's doing. Do not retry, do not work the other rungs, and say so
                       plainly — the remedy is an egress-allowlist change and nothing else.
    HTTP_<code>      — the host answered 403 / 429 / 5xx (bot-check, rate limit, outage).
    LOGIN_WALL       — the listing redirected to sign-in, or shows a paywall/supplier-portal gate.
    JS_ONLY          — HTML fetched fine but carries no server-rendered tender rows, AND every rung of
                       the FETCH ladder (embedded JSON, JS-bundle inspection, calling the discovered
                       endpoint via WebFetch) also produced nothing.
    PARSE_FAIL       — rows are present but the layout changed and nothing extracts.
Never log a bare "SKIPPED — no rows". The class is what tells us whether this is fixable, and by whom.

    → Retry at most twice (skip retries entirely for EGRESS_BLOCKED and LOGIN_WALL — a retry cannot
      change either).
    → Do NOT send a PushNotification about it. A TenderBoard outage is not a tracker failure.
    → Do NOT abort the run, and do NOT skip Steps 4-9.
    → Record "TenderBoard: SKIPPED — <CLASS> — <one-line detail, including which ladder rungs were
      tried and what each returned>" in Coverage & Method and carry on with GeBIZ-only data. Keeping
      the tracker current on GeBIZ always outranks TenderBoard coverage.
    → If TenderBoard has been skipped on 3 or more consecutive runs, THEN add one line to the run's
      normal Step 9 notification: "TenderBoard unreachable N runs running (<CLASS>) — may need a look."
      Do not raise a separate alert for it.
    → If TenderBoard has been skipped on 10 or more consecutive runs with the SAME class, stop paying
      for the full ladder every night: attempt rung 1 only, log "TenderBoard: DORMANT — <CLASS>
      unchanged for N runs", and add to the Step 9 notification at most once a week: "TenderBoard
      dormant N runs (<CLASS>) — decide: fix egress, drop the source, or replace it with direct portal
      feeds." Resume the full ladder the moment rung 1 returns anything other than the dormant class.

CONSTRAINT — NO EMAIL ROUTE (standing instruction from Benson, 25 Aug 2026): do NOT solve TenderBoard
coverage by registering for TenderBoard email alerts, and do NOT read, search or parse any mailbox
(Gmail or otherwise) as part of this routine. Email is off the table as a data path here. If the ladder
below cannot reach the public listing, the correct outcome is to log the class and carry on — never to
route the source through an inbox.

FETCH — work the rungs in order, and stop at the first that yields tender rows:

  Rung 1 — plain fetch of the listing page.
    Primary: https://www.tenderboard.biz/singaporetenders
    If that URL 404s or has moved, try in order and use the first that returns tender content:
      - https://www.tenderboard.biz/vendor/tender-opportunities/
      - pagination URLs discovered from page 1 (e.g. ?page=2)
    If this returns server-rendered rows, you are done — go straight to extraction.

  Rung 2 — embedded JSON in the HTML you already fetched. A JS-rendered listing very often ships its
    data inside the page anyway. Grep the response for __NEXT_DATA__, __NUXT__,
    window.__INITIAL_STATE__, <script type="application/json">, or any inline array of objects with
    tender-like keys (title / refNo / closingDate / agency). If found, parse that JSON directly — this
    is the cheapest win available and needs no browser.

  Rung 3 — READ THE JS BUNDLE to find the data call. WebFetch can fetch JavaScript as text, and this
    is the one discovery avenue that survives the no-script-egress constraint (a headless browser
    cannot run here — it would need to open its own sockets).
      a. From rung 1's HTML, get the bundle URL. Observed 25 Aug 2026: main.bundle.<hash>.js
      b. WebFetch that bundle with a prompt like: "Find where fetchEntities is defined or called.
         Report the full request URL or path it builds, the HTTP method, and the shape of any request
         body or query parameters. Quote the relevant lines."
      c. Build the absolute endpoint URL from what it reports. Do NOT invent one.

    KNOWN, from Benson's own DevTools capture (25 Aug 2026) — aim with this, but confirm against what
    the bundle actually says:
      - **fetchEntities** (24.3 kB, from main.bundle.<hash>.js) is the tender payload.
      - **fetchOptions** (~16.6 kB) is the filter dropdowns — categories/agencies, NOT tenders.
      - Ignore: gen_204?csp_test= (Google telemetry), envelope/?sentry_key= (Sentry),
        en.json (widget i18n), and small <digits>.json?randomId= payloads.
      - No auth header was present on any of them. The page is public; expect no token.

  Rung 4 — CALL the endpoint with WebFetch.
      - If it is GET-able, WebFetch it directly with a prompt returning one compact line per tender:
        ref no., title, buyer/agency, publish date, closing date/time, detail link. That is the entire
        extraction — no browser, no script.
      - Before giving up, try the obvious GET forms ONCE each: the bare path, and the path with the
        body's fields as query params (e.g. ?page=1&size=20&status=live). Many such endpoints accept
        either verb.
      - Paginate by incrementing the page parameter, stopping when a page returns no rows. Normal runs
        walk at most 3 pages; Step 5b backfill may walk up to 10.
      - If it is genuinely POST-only, WebFetch cannot issue it. Log exactly:
        "TenderBoard: SKIPPED — EGRESS_BLOCKED — fetchEntities is POST-only; WebFetch cannot POST and
        script egress is blocked. Needs script-level egress allowlisted for this environment."
        Then stop spending the full ladder nightly: re-check rung 3 at most once a week.

  CACHE THE RECIPE. Once a rung-4 call works, write it into Coverage & Method on ONE line:
        TenderBoard Access Recipe: {"via":"webfetch","url":"<full GET url with {page}>",
          "fields":"<how each row maps>"}
    On EVERY later run read that line FIRST and go straight to rung 4, skipping rungs 1-3. Re-discover
    only when a call returns 0 rows or errors — that means the site changed.

    NOTE ON THE REPO SCRIPTS: ops/tender-tracker/tb_discover.py and tb_extract.py implement this
    discovery and extraction properly (network-capture discovery, GET+POST replay, pagination, DOM
    fallback) and are tested — but they need script-level egress and therefore CANNOT run in this
    environment today. Leave them dormant. If script egress is ever allowlisted, prefer them over the
    WebFetch path above, because they can POST and can drive a real browser.

  A WARNING ON RUNG 1 FALSE SIGNALS: do not conclude "no rows" from a naive substring or regex count
  over the HTML. A JS-rendered page often contains its row markup inside a <script> template literal,
  so a crude grep reports matches that are not real rows — and conversely a page can carry real data
  in JSON while showing no <tr> at all. Judge rung 1 on whether you can extract actual field VALUES,
  not on whether some pattern appears.

  Only after all four rungs come up empty may this step be logged JS_ONLY.

  Walk at most 3 pages of results, newest first. Stop early once you reach items whose publish date is
  older than the last successful run date recorded in the previous file's Coverage & Method (or older
  than 7 days if that date can't be determined) — there is no value in paging deeper.

NOTE ON ACCESS (verified 24 Aug 2026; corrected 25 Aug 2026 by Benson checking in a browser):
There is NO login wall on the public listing. Benson reached https://www.tenderboard.biz/singaporetenders
directly from a search result ("Live Tenders") and it began loading its rows client-side. So a
LOGIN_WALL classification is almost certainly WRONG unless you actually see a sign-in redirect —
the page is public and JavaScript-rendered, which is a rung 3/4 problem, not an access problem.
TenderBoard's full multi-site ALERT feed remains a paid supplier-portal feature; this routine has no
account and will not open one. Only what the public notices page serves anonymously is in scope. If the
public page shows teasers without closing dates or without working deep links, capture what IS there
rather than discarding the item — see "Missing fields" below.

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
  - Everything else: reject ONLY if clearly unrelated to IT/systems/consultancy work (e.g. catering,
    cleaning, uniforms, construction). Anything you cannot confidently place — vague titles, unfamiliar
    acronyms, mixed-scope packages, missing category labels — goes to the "Review (Unsure)" sheet with
    its details extracted, never to the bin.

THEN apply the "Relevance Filter — What To Capture" section above to every routed item, exactly as it
is applied to GeBIZ items. The five exclusions (cybersecurity, AV, network switches, training,
non-IT machines/hardware) bind both sources equally, and every exclusion gets logged.

Missing fields:
  - Missing closing date → still add the row, put "Unknown" in Closing Date/Time, and note it under
    Known Gaps. A row with an unknown closing date is NEVER auto-moved to Closed by Step 5.
  - Missing publish date → use the date the row was first seen, and suffix it "(first seen)".
  - Missing agency → "Not stated (TenderBoard)".
  - Missing scope description → write a one-line summary inferred from the title, prefixed "(from
    title)". Don't fetch the detail page for every item merely to prettify this field — but DO fetch it
    whenever the title alone leaves the relevance or routing call undecidable, since resolving the
    doubt is worth one fetch. If the doubt survives the fetch (or the page won't load), still capture
    the item into "Review (Unsure)" with whatever was extracted.

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
sheet (Step 6, Sheet 5).

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
Use one WebFetch per candidate detail page, each with a `prompt` that returns just the fields below as
a compact record — never the whole page. (A script cannot fetch these; see the top of this prompt.)
Only pull more of a page when a single candidate's extraction fails and you need to see the markup.

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
     - Otherwise: reject ONLY if the category is plainly unrelated to IT/systems/consultancy work.
       If the tender reads as software/systems/consultancy work despite sitting under an unexpected
       category, or the category is missing/ambiguous, capture it into "Review (Unsure)" instead of
       rejecting it.
  
  4. Apply the "Relevance Filter — What To Capture" section: drop an item only when its PRIMARY
     subject is unambiguously cybersecurity, AV, network switches, training, or non-IT
     machines/hardware. Log every exclusion (title + rule number) for Coverage & Method. Anything
     borderline, mixed-scope or unclear → CAPTURE into "Review (Unsure)" with a "Why Unsure" note,
     never drop.
  
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

Apply the same closing-date check to "Review (Unsure)" rows: when one closes, move it to "Closed
Tenders" with its Source and Scope Summary preserved and "(was: Review)" appended to its Scope
Summary. Unsure rows are never deleted — they either get promoted, or they close out on the record.

If a "Review (Unsure)" row later becomes clearly relevant (e.g. a fuller listing appears on a later
run), move it into the correct EPU sheet and note the promotion in Coverage & Method. It counts as new
in Step 9 only if it was never counted before.

Keep "Closed Tenders" sorted by Closing Date (oldest first)
Sort EPU/CMP/10, EPU/SER/34 and Review (Unsure) by Publish Date (newest first)
```

### Step 5b: Coverage Ledger and Gap Backfill
```
PURPOSE: never lose a day silently. If a run fails, is skipped, or dies before finishing, that day's
tenders would otherwise vanish — and GeBIZ RSS holds only ~2 days, so a missed day is a missed bid.
This step records what each run actually captured, and retries the days that were missed.

THE LEDGER lives in Sheet 6 "Run Ledger" (see Step 6). One row per calendar date (SGT) from the
tracker start date (07 Aug 2026) to today:
  Date (SGT) | GeBIZ | TenderBoard | New (GeBIZ) | New (TB) | Notes

Status values, per source, exactly one of:
  OK                        — fetched and parsed successfully that day
  FAILED — <CLASS/reason>   — attempted and failed (use the Step 3b CLASS for TenderBoard)
  NOT RUN                   — no run happened that day at all
  BACKFILLED (DD Mon)       — was missed, later recovered by this step on the noted date
  UNRECOVERABLE — <why>     — missed and provably beyond recovery; never retried again

DETECTING GAPS (every run, before building the workbook):
  1. Read the previous file's Run Ledger.
  2. Build the full date sequence from 07 Aug 2026 to today (SGT).
  3. Any date with NO row is a silent miss — insert it as "NOT RUN" for both sources. A crashed run
     writes no row at all, so ABSENCE is the signal; never rely on a failed run to log its own death.
  4. OPEN GAPS = every (date, source) whose status is not OK, BACKFILLED or UNRECOVERABLE.

BACKFILLING — the recovery windows differ per source, so do not treat them alike:

  GeBIZ — RSS exposes only ~2 days of publish history.
    - Gap within the last ~2 days → this run's normal Step 3 fetch already covers it; if that day's
      items are now present, mark BACKFILLED (today).
    - Gap older than ~2 days → mark UNRECOVERABLE — "RSS window ~2 days; publish history no longer
      exposed". Mark it ONCE and never retry: a permanently missed day must not cost a fetch nightly.

  TenderBoard — the listing paginates back through publish dates, so older days ARE recoverable.
    - OLDEST_GAP = earliest open TenderBoard gap date.
    - Re-run tb_extract.py with a raised page cap: enough pages to reach publish dates at or before
      OLDEST_GAP, HARD-CAPPED AT 10 pages (normal runs stay at 3). This requires the recipe's
      post_data to carry the {page} token — see Step 3b — or pagination silently does nothing.
    - Route and filter recovered items exactly like live ones (Step 3b/3c rules, same exclusions, same
      dedup). Most will already be tracked — that is fine and counts as nothing new.
    - Mark every gap date the walk covered as BACKFILLED (today) EVEN IF it yielded zero new tenders:
      "we looked and there was nothing" is a resolved day, not an open one.
    - If the walk hits the 10-page cap before reaching OLDEST_GAP, leave the rest open and note
      "backfill truncated at 10 pages" — the next run continues from there rather than restarting.

  Backfill NEVER blocks the run. It is best-effort under exactly the Step 3b failure rule: if the
  source is unreachable this run, leave the gaps open and carry on.

COST GUARD: if open gaps exceed 14 days for a source, backfill only the most recent 14 and mark the
rest UNRECOVERABLE — "gap too large to backfill economically". Note the trim in Coverage & Method.

TODAY'S ROW: write it at the END of the run with the real outcome for both sources plus the new-row
counts. That row is what tomorrow's run reads.
```

### Step 6: Build Updated Workbook
```
Create .xlsx file with seven sheets:

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

Sheet 4: "Review (Unsure)"
  Columns: Tender/Ref No. | Title | Agency | Procurement Category | Source | Scope Summary | Why Unsure | Publish Date/Time | Closing Date/Time | Link
  Same formatting conventions as the active sheets, including the real-hyperlink requirement for Link.
  Sorted by: Publish Date (newest first)
  This is the "leave no stone unturned" sheet: everything captured despite doubt lands here rather than
  being discarded, so Benson can eyeball it in seconds. "Why Unsure" is one short line — e.g. "title is
  an acronym, no scope given", "mixed software + AV package", "category missing on listing".
  Never let this sheet be a dumping ground for items that are clearly irrelevant — clear rejects still
  get rejected and logged. It is for genuine uncertainty only.
  If empty, create the sheet with headers and a single row reading "Nothing uncertain this run."

Sheet 5: "Awarded (Intel)"
  Columns: Tender/Ref No. | Title | Agency | Source | Awarded To | Award Value | Award Date | Link
  Same formatting conventions. Sorted by Award Date (newest first). Capped at 100 rows (Step 3d).
  If nothing was captured this run and none exists from before, still create the sheet with headers
  and a single row reading "No awarded-tender data captured yet — see Coverage & Method."

Sheet 6: "Run Ledger"
  Columns: Date (SGT) | GeBIZ | TenderBoard | New (GeBIZ) | New (TB) | Notes
  Same formatting conventions. Sorted by Date (newest first).
  One row per calendar date from 07 Aug 2026 to today — no date may be absent (Step 5b inserts
  "NOT RUN" rows for dates that were never recorded). Colour the status cells: OK green,
  BACKFILLED blue, FAILED amber, NOT RUN amber, UNRECOVERABLE red, so a gap is visible at a glance.
  When a file created before 25 Aug 2026 has no Run Ledger, build it from scratch: mark every date
  that already has tenders published against it as OK, and every date from 07 Aug 2026 with no
  evidence either way as "NOT RUN — reconstructed, pre-ledger", then let Step 5b judge recoverability.

Sheet 7: "Coverage & Method"
  Content (as text rows, no table):
  ─────────────────────────────
  Run Date: [today's date/time SGT]
  Auth Status: ✓ PASS (or FAIL + reason)
  GeBIZ RSS Feeds: ✓ PASS (or FAIL + which feed)
  TenderBoard: ✓ OK — [N] items scanned, [N] relevant, [N] duplicates of GeBIZ suppressed
               (or "SKIPPED — <CLASS> — <detail: which ladder rungs were tried and what each returned>"
                [+ consecutive-skip count], or "DORMANT — <CLASS> unchanged for N runs",
                or "PARTIAL — <what was missing>"). CLASS is one of EGRESS_BLOCKED / HTTP_<code> /
                LOGIN_WALL / JS_ONLY / PARSE_FAIL — see Step 3b. Never write a bare "SKIPPED — no rows".
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
  
  Review (Unsure) Stats:
    - Total rows: [count]
    - Added this run: [count]
    - Promoted to an EPU sheet this run: [count]
  
  Excluded This Run: [count]
    [EVERY excluded title, one line each, with the exclusion rule number that caught it, e.g.
     "• Supply of network switches for XYZ — rule 3". If more than 25, list 25 and add
     "…+N more excluded". This log is the audit trail proving nothing was dropped carelessly.]
  
  Borderline Calls This Run:
    [any tender captured despite being half-in-scope, one line each, with the reasoning — or "None"]
  
  Source Upgrades This Run: [count of TenderBoard rows upgraded to GeBIZ per Step 3c]
  
  TenderBoard Access Recipe: [the working recipe JSON on ONE line, or "not yet discovered".
    Carry it forward verbatim every run so the next run skips discovery — see Step 3b "CACHE THE RECIPE".]
  
  Coverage Ledger Summary:
    - Days tracked: [count]   OK: [n] | Backfilled this run: [n] | Still open: [n] | Unrecoverable: [n]
    - Open gap dates: [list them, or "none"]
    - [If backfill ran: "Backfilled TenderBoard pages walked: [n] (cap 10)"]
  
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
    Its listing is JavaScript-rendered, so Step 3b works a ladder (fetch → embedded JSON → read the JS
    bundle for the data endpoint → call that endpoint via WebFetch) before logging a verdict. Headless
    browsing is NOT available: scripts have no network egress here. Email alerts are NOT a workaround
    either — no mailbox is read or parsed by this routine (Benson, 25 Aug 2026).
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

This supersedes an earlier approach (upload with the flag true, then poll for an auto-converted
sibling) that wasted 3+ tool calls and a duplicate base64 payload every run. Do not reinstate it.

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
        [If any Review (Unsure) rows added: "Unsure/needs a look: X — see Review (Unsure) sheet."]
        [If any awarded intel captured: "Awarded intel: +X rows."]
        [If any days were backfilled: "Backfilled X missed day(s): <dates> (+Y tenders recovered)."]
        [If any gaps remain open: "X day(s) still unrecovered — see Run Ledger."]
        [If TenderBoard was skipped this run: "TenderBoard skipped this run (<CLASS>)."]
        [If TenderBoard skipped 3+ consecutive runs: "TenderBoard unreachable N runs running (<CLASS>) — may need a look."]
        [If TenderBoard dormant 10+ runs, at most once a week: "TenderBoard dormant N runs (<CLASS>) — decide: fix egress, drop the source, or replace with direct portal feeds."]
        
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
        [If any Review (Unsure) rows added: "Unsure/needs a look: X — see Review (Unsure) sheet."]
        [If any days were backfilled: "Backfilled X missed day(s): <dates> (+Y tenders recovered)."]
        [If any gaps remain open: "X day(s) still unrecovered — see Run Ledger."]
        [If TenderBoard was skipped this run: "TenderBoard skipped this run (<CLASS>)."]
        [If TenderBoard skipped 3+ consecutive runs: "TenderBoard unreachable N runs running (<CLASS>) — may need a look."]
        [If TenderBoard dormant 10+ runs, at most once a week: "TenderBoard dormant N runs (<CLASS>) — decide: fix egress, drop the source, or replace with direct portal feeds."]
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
     without notice — any of which silently skips the source for that run (logged with its failure
     CLASS, and surfaced in the notification only after 3 consecutive skips)
   - ENVIRONMENT EGRESS IS A SEPARATE AND PRIOR QUESTION. Verified 25 Aug 2026: the "Default"
     environment (env_014XrxYBDmXYTFNGRFy9f1xf) has NO general web egress at all — every host,
     including example.com, is refused by the proxy with "CONNECT tunnel failed, response 403", and
     WebFetch returns EGRESS_BLOCKED. Scheduled runs of this routine DO reach gebiz.gov.sg
     successfully, so they execute somewhere with broader egress. If a run ever sees EGRESS_BLOCKED on
     gebiz.gov.sg, that is an environment network-policy problem and NOT something to fix in this
     prompt — say so plainly and stop, per the pre-flight gate
   - The listing is JavaScript-rendered, so a plain fetch alone returns no rows. That is NOT grounds
     to write the source off: the Step 3b ladder must also try embedded JSON, reading the JS bundle
     for the data endpoint, and calling that endpoint via WebFetch. A headless browser is NOT an
     option here — scripts have no network egress (25 Aug 2026)
   - Email alerts are NOT an available workaround: Benson ruled out any mailbox-based data path on
     25 Aug 2026, so a TenderBoard account/alert subscription is off the table regardless of cost
   - TenderBoard listings are aggregator summaries, so fields (especially closing time and the deep
     link to the original portal) can be thinner or less exact than GeBIZ's own detail pages. GeBIZ
     data always wins where both exist (Step 3c)

3. **Awarded-tender intel depends on what each portal publishes**
   - GeBIZ award notices may not be exposed via RSS at all; never fabricate a feed URL
   - Award Value and Awarded To are frequently withheld — "Not stated" is a normal outcome

4. **Relevance filtering is deliberately biased toward capture**
   - The five exclusions are applied on a tender's PRIMARY subject, and only when unambiguous. Every
     uncertain item is extracted into "Review (Unsure)" rather than dropped, so the tracker will
     contain some noise by design — that is the intended trade. Review the "Excluded This Run" log
     occasionally to confirm the filter isn't cutting too deep

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

## What This Does NOT Do

❌ **Does not delete old files** from GeBiz Daily (Google Drive connector limitation)  
❌ **Does not move tenders** if a new one supersedes an old one (GeBIZ doesn't support this; treats as new tender)  
❌ **Does not crawl historical tenders** (RSS only ~2 days; if routine was offline, older tenders are missed)  
❌ **Does not log in to TenderBoard** or use any paid supplier-portal feature — public page only  
❌ **Does not read, search or parse any mailbox** (Gmail or otherwise) — email is not a data path for
this routine, and TenderBoard email alerts are explicitly ruled out  
❌ **Does not let a TenderBoard failure stop the GeBIZ run**  
❌ **Does not capture** tenders whose primary subject is unambiguously cybersecurity, AV, network
switches, training, or non-IT hardware — but anything uncertain is captured, not dropped