<!-- Live routine: trig_01MxWKEowvnVuPL89FkVVLRQ — "Task scheduler daily data refresh (silent)"
     cron: 0 18 * * 5 (UTC), weekly Friday. Source of truth is the trigger; this is version history. -->

IMPORTANT — token-saving rules for this routine:
1) MUST convert any file to Markdown before reading it (do not read raw file formats directly).
   EXCEPTION — the Task Scheduler HTML file itself: NEVER Markdown-convert it, and never read it
   wholesale into context. Markdown conversion destroys the CSS/JS this tool is made of, and the file
   must be re-uploaded byte-identical apart from two data constants and one timestamp span. Handle it
   per "HOW TO EDIT THE HTML" in step 1.
2) Prefer using scripts to read webpages instead of OCR/screenshots.

WHY these rules exist: everything that enters the context window is re-sent on every subsequent turn
of this run, so a large blob read early is billed again and again. This routine's dominant cost by far
is the tool's own HTML file — it is large, and reading it in and then emitting it back out pays for it
twice. The fix is not to compress it, but to never bring it into context at all: patch it on disk with
a script.

Silent daily refresh of Benson's Task Scheduler tool's embedded calendar snapshot. This is a mechanical background data sync — do NOT send any push notification or message to Benson as part of this routine (a separate Friday-noon/Sunday-evening routine handles pinging him to actually use the tool).

The tool is a generic, unbranded self-contained HTML file — do NOT put any employer/company names anywhere in the file content, filenames, artifact descriptions, or messages (title stays "Task Scheduler", not any company-prefixed name).

Benson checks this file from his phone via Google Drive, so the canonical folder is:
Folder ID: `1_PQ3T7G9i5dMFa6QdBYWRQY5g6uA02Kd` (Google Drive, account bnsn4ull@gmail.com)

Steps:
1. Find the latest task-scheduler file: mcp__Google_Drive__search_files with query `parentId = '1_PQ3T7G9i5dMFa6QdBYWRQY5g6uA02Kd'`, mimeType text/html. Compare createdTime across all results (regardless of title/naming) and take the latest as the template — don't filter by exact title text since the naming convention has changed over time (see step 4). Download it to a local file.

HOW TO EDIT THE HTML (the main token lever in this routine, and the main safety rule): treat the file
as opaque text to be PATCHED, not as a document to be read, understood and retyped. Write a short
script that reads the local file, replaces ONLY the three regions named below by targeted
string/regex substitution, and writes it back out. Never print the whole file, never paste it into a
reply, and never regenerate it from memory — a regenerated file silently loses UI work that took real
debugging to land. If you need to confirm a region's exact shape before substituting, print just that
region (e.g. the ~20 lines around the `KNOWN_RANGE` declaration), never the whole file. Verify the
patch by checking the substitutions landed (count of replacements made, and a diff of byte length),
not by re-reading the document.

Reuse its HTML/CSS/JS structure exactly — do not redesign it. Note: as of 14 Aug 2026 the tool no longer has an always-visible "New task" side panel — tasks are created via a click-a-slot popup modal instead. Preserve whatever the latest template's structure actually is; this refresh routine only ever touches the data constants and the refreshed-timestamp span, never the UI/markup/JS logic. The file has a `KNOWN_RANGE` const `{start, end}` and an `EVENTS_BY_DATE` object keyed by ISO date (weekdays only) → array of `{s,e,t}` (24h HH:MM start/end, title), plus a `PUBLIC_HOLIDAYS_SG` const for Singapore public holidays (keep that data as-is unless you have reason to update it) and a `.refreshed` span near the header showing "Last refreshed: <date>, <time> SGT" — this is the visible date/time indicator Benson relies on to know the file is current, keep it prominent.

   The three patchable regions are exactly: `KNOWN_RANGE`, `EVENTS_BY_DATE`, and the `.refreshed` span. Nothing else in the file is ever modified by this routine.
2. Pull events from mcp__Google_Calendar__list_events on calendar bensonfoo@ecquaria.com. Keep only the four fields the file actually needs — date, start, end, title — and discard the rest of each event object rather than carrying full event payloads around. Maintain a rolling window of roughly 16 weeks ahead of today: extend `KNOWN_RANGE.end` forward each run so it stays about 16 weeks out (don't jump straight to 16 weeks in one run if the file is currently far behind — extend it gradually, a few weeks per run, until it catches up to the 16-week target, to keep each run's data pull reasonably sized). Refresh EVENTS_BY_DATE entries within the current known range in case events changed, and add any newly-in-range weekday dates. To keep the file from growing indefinitely, you may drop EVENTS_BY_DATE entries for weekday dates more than ~1 week in the past (before today), but leave `KNOWN_RANGE.start` alone unless you're deliberately trimming — the grid UI only ever shows the currently-selected week anyway, so old entries just add dead weight.
3. Update the `.refreshed` span text to the current SGT date/time — by the same targeted substitution as step 1, not by rewriting the header. Leave all other markup/styling/logic untouched.
4. Upload the updated file to Google Drive via mcp__Google_Drive__create_file: contentMimeType "text/html", disableConversionToGoogleType: true, parentId `1_PQ3T7G9i5dMFa6QdBYWRQY5g6uA02Kd`. Read the patched file's bytes straight from disk and base64-encode them in the same script — do not reconstruct the file's content in your reply to build this payload. Title format is exactly: `<YY-MM-DD-HHMM>_Task Scheduler` where YY-MM-DD-HHMM is the current SGT date/time, 2-digit year, 24-hour zero-padded time, no colons (e.g. "26-08-14-1400_Task Scheduler" for 2:00pm SGT on 14 Aug 2026). Old/previous files in the folder are fine to leave as-is (no delete tool available); the one with the latest createdTime is always treated as current next run.
5. Update the "tecq-weekly-planner" Cowork artifact too (update_artifact, id "tecq-weekly-planner" — this internal id string is fine to keep as-is, it's not shown to Benson; just make sure the update_summary text itself has no employer names). Skip SendUserFile — this runs unattended and nobody's watching; the artifact + Drive file are the durable copies.
6. No summary message needed — this is silent. If something fails (auth error, calendar unreachable, folder not found, etc.), that's the one case where you should send a PushNotification to Benson flagging it, since a broken tool is worth surfacing even on an otherwise-silent run.
