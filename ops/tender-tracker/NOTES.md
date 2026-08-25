# TenderBoard schedule check — 25 Aug 2026

Routine: **GeBIZ + TenderBoard tender check** — `trig_01VbyDU9cjgeLSUzbZzwoV5B`
Schedule: `10 18 * * *` (daily, 02:10 SGT). Last fired 24 Aug 2026 18:11 UTC.

## What the nightly run is actually doing

Read from the tracker's own Coverage & Method sheet
(`2026-08-25_0216_GeBIZ_Open_Tenders`, fileId `1YXzldRdoJB7jaMjKDZVRxG6RhFFgh9HYKUAnUjrxDu0`):

- **GeBIZ: healthy.** 6 RSS feeds checked, 1 new tender (NAC000ERF26000002), 5 moved to Closed.
  Tracker totals: EPU/CMP/10 = 13, EPU/SER/34 = 54, Closed = 17.
- **TenderBoard: 0 rows, every run since it was added (24 Aug).** Logged as
  `SKIPPED — public listing ... rendered as a JS-only page / marketing shell`.
- The run then wrote it off: *"Consider this a standing limitation, not a one-off."*

## Why that conclusion was premature

The run reached `JS_ONLY` after trying **WebFetch alone**. It never tried:

1. embedded JSON already inside the fetched HTML (`__NEXT_DATA__`, `__INITIAL_STATE__`, …),
2. the data endpoint the page's own JS must call (`/api/`, `/_next/data/`, sitemap, feed),
3. a **headless Chromium render** — Chromium is pre-installed in these environments and
   Playwright is pre-pointed at it (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).

Rung 3 or 4 is the standard fix for a JS-rendered listing. Neither was attempted before the
source was declared permanently unusable.

## Constraint recorded

**No email route.** Benson ruled out mailbox-based data paths on 25 Aug 2026. TenderBoard
email alerts and any Gmail read/search/parse are off the table — now stated explicitly in
Step 3b and in "What This Does NOT Do", so future runs stop proposing it.

## Caveat on verification

This interactive session has **no outbound internet at all** — the agent proxy rejects every
host, including example.com and google.com, so `gebiz.gov.sg` and `tenderboard.biz` are both
unreachable from here. The scheduled runs clearly have broader egress (last night's run parsed
GeBIZ RSS fine). So **the ladder below is untested against the live site** — the next scheduled
run is the real test. If TenderBoard is *also* egress-blocked in the scheduled environment, the
new `EGRESS_BLOCKED` class will say so in one line instead of misreporting it as a site problem.

## Still open (Benson's call)

If the ladder still returns nothing, the choice is: fix egress for `tenderboard.biz`, drop the
source, or replace the aggregator with direct feeds from the underlying non-GeBIZ portals
(statutory boards, healthcare clusters, universities, town councils). The routine now
self-surfaces this once TenderBoard has been dormant 10+ runs, rather than silently retrying
forever.
