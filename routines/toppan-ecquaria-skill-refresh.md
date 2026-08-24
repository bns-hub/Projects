<!-- Live routine: trig_012jJb8enaWjwPn45joy2eXW — "Toppan Ecquaria skill"
     cron: 0 18 * * 2 (UTC), weekly Tuesday. Source of truth is the trigger; this is version history. -->

IMPORTANT — token-saving rules for this routine:
1) MUST convert any file to Markdown before reading it (do not read raw file formats directly).
2) Prefer using scripts to read webpages instead of OCR/screenshots.

WHY, and where they do and don't apply here: everything entering the context window is re-sent on
every subsequent turn, so a large read early is billed repeatedly. This routine's one big read is the
source Google Doc — and it is expensive FOR A GOOD REASON: the task is a full reconciliation, so when
the doc has actually changed you must read all of it. Do NOT try to save tokens by skimming or
sampling it; a confidently wrong diff is far worse than an expensive correct one. The legitimate
saving is not reading it at all on the weeks it hasn't changed — see the modifiedTime gate in step 2.

Automatically refresh the "toppan-ecquaria" account skill. Do this fully, without asking any clarifying question and without waiting for a reply — just do the pull and deliver the result.

1. Read the current baseline at /root/.claude/skills/toppan-ecquaria/SKILL.md (7 sections: Identity, Platform/tech stack, Certifications, Named systems and clients, People, Capability gaps, Unreliable/disputed figures, with an [H]/[M]/[L] confidence-tagging convention — preserve this structure).
2. Fetch the live "User References (Benson) v1" Google Doc via the Google Drive connector, file id `1ioPNCozZ024Mlg4jqOrquc7CUrv8CKiFmno6IuFfA2A`.

   FIRST call get_file_metadata ON ITS OWN and compare the doc's `modifiedTime` against the
   "doc last modified" value recorded at the bottom of the current SKILL.md (see steps 4/5). If they
   match, the doc has not been touched since the last reconciliation: SKIP the full read entirely,
   update the "last checked" timestamp, and report that nothing changed. This is the single biggest
   saving available in this routine — the full read is the expensive part, and most weeks the doc is
   untouched.

   SAFETY VALVE — force a full read regardless of modifiedTime if any of these hold: (a) SKILL.md
   carries no recorded "doc last modified" value, (b) the recorded value is missing or unparseable,
   or (c) four or more consecutive runs have already been skipped by this gate. This stops drift
   accumulating silently behind a stale timestamp.

   OTHERWISE (modifiedTime differs, or the safety valve fired), read the doc in full with
   read_file_content; if its output is too large for one read, it will save to a file — read that file
   in full, in sequential chunks, and DO NOT sample. Do not economise on this step: see the note at
   the top about why a partial read is worse than an expensive one.

   This doc is the canonical source; where it disagrees with the baseline, the doc wins.
3. Compare against the baseline: find anything new or changed — new reference entries, changed contract values/dates/status tags, resolved or newly-surfaced ambiguities, corrected mislabels, new named contacts, changed caution tiers. Do NOT resolve a disputed/ambiguous item (e.g. InterPRO's delivery status, ICMS's case-volume contradiction, HALP's missing source doc, bizSAFE certification) unless the doc text actually settles it — leave genuinely unresolved things flagged as disputed.
4. If nothing of substance changed since the last reconciliation, still update the "last checked" timestamps — and record the doc's current `modifiedTime` as the "doc last modified" value at the bottom of SKILL.md, so step 2's gate works on the next run — but skip producing a changelog of empty changes. Just note in your final message that nothing changed today, and say whether the run was gated (skipped the read) or did a full read and found no substantive change.
5. If something did change: rewrite SKILL.md preserving structure and tagging conventions — including the "doc last modified" line, set to the doc's current `modifiedTime` — package it as `toppan-ecquaria.skill` (a zip containing `toppan-ecquaria/SKILL.md`), and deliver it via SendUserFile along with a short changelog file, with a concise summary of what changed in your message. Note that Benson still needs to open/accept the file for the update to actually take effect, since this session can't save account skills directly.
