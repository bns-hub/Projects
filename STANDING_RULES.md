# RE1999 Team Builder — Standing Operating Rules  
  
**Doc version: v0.3** (2026-08-24) — tracks this rules-doc pair's own revision count, independent of  
the HTML tool file's version number. This pair of docs (`STANDING_RULES.md` + `RUN_LOG.md`) revises on  
its own schedule rather than being re-versioned alongside the tool file. Bump the version (v0.1 → v0.2  
→ ...) any run that makes a REAL rule change here — a new/removed constraint, a corrected methodology, a  
changed source-of-truth priority. Do NOT bump it for a run that only reads this file and follows it  
without editing it. Record what changed and why in `RUN_LOG.md` under a "Doc vX.Y" heading each time it  
bumps, same append-only pattern as everything else there.  
  
**HTML tool version: v0.3 as of 2026-08-24** — the delivered file is now named  
`<date>_v0.3_RE1999TeamBuilder.html`. This RESETS the old per-session build counter that ran v1→v80  
through 2026-08-20 (that counter is retired, not renumbered — every historical "v58"/"v72"/"v79"/"v80"  
mention elsewhere in this file and in `RUN_LOG.md` stays exactly as originally written; don't rewrite  
history to match the new scheme). The 2026-08-20 file's actual content is unchanged by this reset — only  
its filename was relabeled from `v80` to `v0.1`, no code was touched. Going forward, bump this the same  
way as the doc version above: any run that ships a real content change to the HTML file bumps it by one  
minor version (v0.1 → v0.2 → ...); a run that changes nothing in the file doesn't bump it. The tool  
version and the doc version above are two INDEPENDENT counters — they will not stay numerically in sync,  
and that's expected (e.g. a run that only fixes a rules doc without touching the HTML bumps the doc  
version alone).  
  
This file is the stable half of the old single scheduled-task prompt. It changes rarely — only when  
Benson changes a real requirement or a genuinely new permanent rule is confirmed. Everything that is  
"what happened, what we learned, what we tried and rejected" lives in `RUN_LOG.md` instead, and should  
be appended there, never folded into this file's prose.  
  
Companion file `RUN_LOG.md` — read it before touching Step-3B mechanics, tooltips, or merge/Moxie logic;  
it records the specific past bugs and rejected designs so you don't re-derive and re-break them.  
  
## 0. HARD CONSTRAINTS (read this section even if nothing else)  
  
- Never touch the Archived subfolder (Drive ID `1qxbQq_A3aQcQZOSaW1BmCqCiYt3Kd275`) — not as a source, not as a destination.  
- Never upload the full HTML directly to Drive. Deliver only via SendUserFile; Benson saves it himself.  
- Never fabricate a Skill/Portray/Insight number, a game-mechanic number, or a meta rank/score/comp/teammate. Leave it as an open gap in the summary instead.  
- Character-facing work (new builds, Portray recommendations, State-Block mechanic verification — Steps 2+3 combined) is capped at 20 characters per run.  
- During an unattended weekly firing, do not run `update_trigger` on this scheduled task and assume it took effect — it requires Benson's in-app approval, which isn't available mid-run. Tell him what to paste; don't self-certify. (Not a blocker in an interactive session with Benson present — see RUN_LOG's 2026-08-22 entry, where it worked directly.)  
- Only touch `PORTRAIT_IMG[name]` when Benson has said he replaced that image and given a new Drive file ID.  
- Run Step 8 (verification + screenshot check) before every delivery, including "small" changes. Two real visually-broken bugs have shipped clean through automated checks alone.  
- **Reduce token usage as much as possible, every run.** Two concrete rules, both mandatory:  
 1. **Convert a file to Markdown before reading it** — never `Read` the raw `RE1999TeamBuilder.html` (or any other large raw file) directly; extract/convert it (e.g. pull just the `<script>` block, or run it through a markdown/text converter) and read that instead. Applies to any file this task reads, not just the tool file.  
 2. **Prefer scripts over OCR for reading a webpage** — when fetching Prydwen/fandom/meta-source pages, use a script-based fetch (WebFetch, or a headless-browser text/HTML extraction) to pull real page text, not a screenshot-and-OCR pass. Screenshot+OCR is reserved for Step 8's verification/visual-check work, where you're actually verifying a render, not extracting source text. See §12 for the fetch-quality detail this applies to.  
  
## 1. Mission & cadence  
  
Weekly maintenance on `RE1999TeamBuilder.html`, Benson's self-contained Reverse: 1999 team-builder tool.  
Run end-to-end without asking clarifying questions — make the reasonable call and note it in the summary.  
  
Every run does all of the following, in this order (none of it is optional or occasional):  
1. New-character / new-Euphoria detection cascade (§6).  
2. Read each touched character's Insight + Skills + Portray text together, not skimmed — this is what catches mechanics like Anjo Nala's Bind or Beryl's crystal choice.  
3. Portray recommendations — own analysis (§7).  
4. State-Block play-by-play mechanic corrections / new verified tags (§8).  
5. Meta team comps — re-verify existing ones, not just look for new ones (§5).  
6. Archetype tag audit, auto-add when unambiguous (§9).  
7. Role audit against the fixed taxonomy (§10).  
8. Hover-tooltip coverage — check LAST, since new text fields are exactly what slips through un-linked (§11).  
9. Verification + screenshot check before delivering (§13) — never skip.  
  
## 2. Google Drive locations  
  
- Working folder (find current file here, deliver here): `1X5j3R_ZtZAw2V-coNsnApNbDKzAeEE4M`  
- Archived subfolder — never touch: `1qxbQq_A3aQcQZOSaW1BmCqCiYt3Kd275`  
- Portrait images: `1XzIA0qUzjngDDvl69ZWKsGZ5gv8aEDNX`  
- This file, `STANDING_RULES.md`, lives in the working folder — its own Drive file ID isn't self-tracked here (it changes on every re-upload since Drive has no in-place text edit); locate it by title search each run.  
- Companion `RUN_LOG.md` — same working folder, same "locate by title search" caveat.  
- Google Drive downloads fail hard above ~6MB — ask Benson to re-save an oversized reference image smaller.  
  
## 3. Source-of-truth hierarchy  
  
- **Character data (Skills/Portray/Insight/Euphoria/Specialties):** prydwen.gg/re1999/characters/`<slug>`, always, every run — transcribed as close to verbatim as possible, never paraphrased.  
- **Adaptive/branching skill structure specifically:** reverse1999.fandom.com preferred (its Abilities table makes the selector/generated-sub-skill layout explicit). Cross-check against Prydwen when in doubt; never trust either blindly.  
- **Meta team comps:** Bilibili (CN, most current) > YouTube (Global equivalent) > Prydwen (fine, lower priority for meta) > Reddit/Discord/other. Always attempt Bilibili first even though it's frequently unreachable from this sandbox — fall through the list on failure, keep retrying in future runs.  
- Benson's personal Google Doc of team comps is a loose, possibly-stale hint about what he's currently thinking about — never copy a comp from it directly; always research fresh per the priority order above.  
- CN patch runs ahead of Global — never present CN data as Global or vice versa.  
  
## 4. Data model (already built — populate it, don't redesign it)  
  
- `CHAR_DB` — array of character entries (`C({...})`). Each has a free-text `role` display label (NOT the fixed taxonomy — see the distinction in §10), `arch` archetype tags, `priority` tier (drives the round planner, never displayed as "Priority: ..." on the card), `owned`, and optionally `upcoming:true`.  
- `SKILL_KIT[name]` — `{source, rebuiltAt, skills:[{name, type, ranks:[{text, quote}], terms:[{name, def}]}]}`. Every skill, every shown rank, exact text, exact quote per rank, bracketed-term definitions. `rebuiltAt` = the real-world date of that rebuild.  
 - **Adaptive/branching skills** (e.g. Brume's Left-Hand Steering, Nautika's Gates of Horn and Ivory): model as a SELECTOR entry (`type:"Adaptive"`, minimal per-rank text: "Choose 1 out of rank N [ModeA] and [ModeB].") plus each mode as its OWN separate entry immediately after, full ranks/quotes/terms, real type. Never invent an "Initial X / Post-Insight-II Y" framing not present on the source page. Verify per-character from real source text — a resemblance in flavor text is not enough (Ulrich's Scanning Mode/Brown Noise looks similar but is two independent skills, not this pattern).  
 - **Tertiary action-economy systems** (mechanics entirely outside AP/Moxie, e.g. Rhiannon's Raptor Kinship): check each character's Insight/Skill text for this — usually described in Insight I, doesn't announce itself in the Skills tab alone.  
 - **Ultimate card type:** store the TRUE in-game card type in `type` (never overwrite to "Ultimate" just for detection convenience) and set `isUltimate:true` instead. `sbFindUltimate()`/`sbHasUltimate()` check `isUltimate` first, falling back to `type==='Ultimate'`. `sbExtractDeckCards()` must exclude by `isUltimate`, not `type!=='Ultimate'`. If a character is skipped from the State-Block sim with "no identified Ultimate," check this first before assuming the kit needs a rebuild.  
- `INSIGHT_KIT[name]` — `{source, tiers:[{tier, text, terms}]}`. Insight I/II/III plus "Special" bracketed-term effects. No material costs.  
- `PORTRAY_DB[name]` — `{count, verdict, source, levels:[{level, text, recommended, reason}]}`. `text` is the source's real Lv.1-5 Portray text, verbatim — never touch this part. `count`/`verdict`/per-level `recommended`+`reason` are Claude's own analysis (§7, corrected methodology — read §7 before touching any entry) — never hedged/disclaimed to Benson; the "own analysis, not a citation" distinction lives only in the `source` field text, never as an on-card caveat. **Never user-togglable** — the click-to-override feature was removed 2026-08-17 (§7). A genuinely unanalyzed entry uses `count:null`/`recommended:null` and an explicit "PENDING ANALYSIS" `verdict` string — this is the one case where the pending state IS shown, because the alternative is fabricating a verdict with no analysis behind it (Enigma was the seeded example; her real analysis was completed 2026-08-17, see §7 — check `CHAR_DB`/`PORTRAY_DB` fresh each run for any OTHER character still sitting at this placeholder rather than assuming Enigma is the only historical case).  
- `ULT_HOLD_OVERRIDE[name]` — `{reason}` for a specific confirmed case where casting the Ultimate the instant it's ready is actually WRONG per that character's real kit (e.g. Sentinel: her Ultimate scales with and consumes [Fresh Wound] stacks up to 20, so auto-casting on cooldown wastes the stack-based payoff — she often shouldn't cast it at all). New pattern, same family as `PORTRAY_MECHANIC`/`PREROUND_ACTION` — human-read-and-tagged only, never a generic heuristic (see §8's "cast on cooldown by default" rule for how this interacts with the allocator, and RUN_LOG for why generic heuristics keep losing to real kit text on this exact question). Research for this table must check each character's Portray text as well as Skills+Insight (Benson's explicit correction, 2026-08-17) — a stack-consumption or resource-timing case can be stated in a Portray level rather than the base kit.  
- `EUPHORIA_DB[name]` — real content, or the real "doesn't have one yet" message. A character can receive more than one Euphoria over time; having one already is never a reason to stop checking for another.  
- `ROLE_OVERRIDE[name]` — array of tags from the FIXED 5-value Role taxonomy (§10). This, not `CHAR_DB[name].role`, is what Step 5's "every character keeps at least 1 Role" rule is actually checked against — `CHAR_DB.role` is a free-text flavor label for the card display and is not constrained to 5 values.  
- `PORTRAY_MECHANIC[name]` / `INSIGHT_MECHANIC[name]` — verified-only tagged mechanical effects (AP changes, Moxie-on-entry, duration extensions, stack caps that affect a rotation decision). Added only once a human has read the character's FULL kit (Skills AND Insight, not just Portray) and the specific level/tier's text — never from a generic regex/NLP pass (see RUN_LOG for why). Each tagged entry must display the Portray/Insight level it actually came from, not the character's currently-selected level. A Portray-level effect that MODIFIES a base Insight value (rather than adding to it) must record the final resulting value at that investment level, not a delta that could double-count.  
- `RAID_TEAM[name]` — `{core:[...], flex:[...]}`, `metaSource`-tagged. Add only once sourced in a real CN/Global comp; renders via `teamChip()`.  
- `ARCH_INFO[key]` — `{label, primer}` per archetype, extensible (§9) — NOT the same kind of fixed list as Roles.  
- `RARITY_MAP[name]` / `AFFLATUS_MAP[name]` — verified-only rarity (★ count) / element lookup. Unlisted characters render without a rarity badge / elemental color rather than a guess — never estimate either value.  
- `PRECAST_CARD[name]` — `{cardName, versatile:true}`. A precast card is auto-generated into hand for free, then costs the SAME 1 AP as a regular card to cast, UNLESS tagged `versatile:true` (the "Versatile Precast Incantation" sub-type), which is the one real 0-AP-to-cast exception. Still discarded if not cast that round either way.  
- `ULTIMATE_AP_OVERRIDE[name]` — AP cost override for a SPECIFIC character whose Ultimate is a confirmed real 0-AP exception. The game-wide default (no override needed) is 1 AP per Ultimate cast, on top of the Moxie gate — see §8.  
- Conduit membership (`isConduitChar`/`CONDUIT_RESOURCE_CHARACTERS`, currently `["The Twins","Coppélia"]`) is a small hand-maintained list, NOT `CHAR_DB[name].arch.includes('Conduit')` — a real bug caught in testing: Rhiannon's All-Rounder tag lists 'Conduit' among the archetypes she *counts as* for other Conduit characters' synergy checks, but she runs normal AP/Moxie, not Energy/Harmonization. Same "verified table, not a derived tag" pattern as `ULT_HOLD_OVERRIDE`.  
- `PREROUND_ACTION[name]` — `{note}` plain-text description of a real non-card battle-start choice/action NOT modeled in the State-Block math (too open-ended to simulate). Rendered in its own "Battle-start setup" box.  
- `TUNING_LIST` — a pre-battle loadout system, GLOBAL and character-independent (Benson: "Tuning goes in parallel of the turns, the actual characters do not affect this, but these tunings can interact with the cards"): `[{name, flavor, moxieStats:[[label,value],...], moxieNote, incantations:[{cost,text}]}]`. Exactly 1 Tuning can be brought into a battle at a time, enforced by `tuningChoice` being a single scalar (index into `TUNING_LIST`, or `null`), not a per-character map. Top selector renders via `renderTuningWidget()`, placed to the LEFT of Slot 1 in the Team Builder (`renderSlots()`), independent of which/how many characters are picked. "Timekeeper's Moxie" is that Tuning's OWN stat-block label, not the game-wide Moxie mechanic documented elsewhere in this section — same word, different resource. **The top widget is bare — label + dropdown ONLY** (corrected 2026-08-17, twice: first the full flavor/stat-block/incantation-text prose broke the layout, then a cost-calculator replacement was ALSO rejected — Benson: "remove the timekeeper moxie and incantation1 and 2 from this selection"). `sbParseTuningCost`/`sbTuningMaxUses`/`tuningMoxiePool` and the calculator UI were removed entirely, not just hidden.  
- **Per-round Tuning bar** (`renderTuningRoundBar`, in the play-by-play — Benson: "tuning should also be included aside from the 4 characters in each round... these tunes has 2 incantations"): once a Tuning is selected, a 5th bar appears after the 4 character slot-bars each round, letting Benson log which Incantation(s) he used that round (`tuningRoundPicks[round]`, same array + add/remove-row pattern as the character manual-override rows). This is a per-round LOG only, like the Live Tracker — no AP gating, no battle-logic effect; Tuning's own "turn" cadence follows the normal round loop 1:1 (Benson: "Tuning 'turns' follows the normal turns... just using a completely different resource") but nothing here is fed into `simulateStateBlockPlan`.  
- `#builder-bar` (Tuning widget + Slots + search) is NOT `position:sticky` (removed 2026-08-17, Benson: "should not freeze pane" on scroll) — it scrolls normally with the rest of the Team Builder tab. Don't re-add sticky positioning here without asking first.  
- Playstyle — plain-English summary, own dropdown at the END of the card, Rotation as its last item. The function that renders it must stay named `renderKitPlaystyle()` — not `renderPlaystyle` (a different, pre-existing Team-Builder-wide panel).  
- `allRounder:true` (CHAR_DB flag): the character counts as belonging to EVERY archetype for synergy purposes, not just their primary `arch` tag. Check a character's own page for an explicit "All-Rounder"-style tag before flagging them as a poor archetype fit anywhere in synergy/suboptimal-pick text.  
  
## 5. Deriving live state (compute this fresh every run — do not hardcode counts in this file)  
  
Do not maintain "X of 132 rebuilt," "currently: Y," or "confirmed so far: A, B" as prose anywhere in  
this rules file. The moment a number like that is written down here, it starts drifting the next time  
the data changes, and nothing forces it back into sync. The HTML file is the actual source of truth for  
its own state — compute against it directly. Concretely, near the start of each run:  
  
1. Load `CHAR_DB` (132 array entries as of the last full audit — re-count, don't assume) and cross-reference names against `SKILL_KIT`, `INSIGHT_KIT`, `PORTRAY_DB`, `EUPHORIA_DB`, `RARITY_MAP`, `AFFLATUS_MAP`, `ROLE_OVERRIDE` to find: which characters are missing an entry entirely in each table (a real gap to close, not necessarily an `upcoming:true` character — e.g. a live character can still be missing a `RARITY_MAP` entry if it was never confirmed).  
2. Check every `CHAR_DB` entry with `upcoming:true` — that IS the authoritative "still not live" list; never hand-copy last week's name list into a prompt or summary as if it were static. A CN-only character (announced but not released in Global) correctly has `SKILL_KIT`/`INSIGHT_KIT`/`PORTRAY_DB`/`EUPHORIA_DB` entries intentionally REMOVED, not merely unfilled, while `upcoming:true` — don't treat that absence as a rebuild gap to close; add the data back only once confirmed live in Global.  
3. For staleness rotation: read every `SKILL_KIT[name].rebuiltAt`, sort by age, and pick the 3-5 oldest that are 3+ months old. If literally nothing is 3+ months old yet (e.g. right after a bulk rebuild pass), say so plainly rather than picking arbitrary characters just to fill the quota.  
4. For Step 3A's Portray-recommendation backlog: a character "has a written verdict" only if their `PORTRAY_DB[name].levels[].reason` is actually populated AND not a `null`/"PENDING ANALYSIS" placeholder — a `PORTRAY_DB` entry existing at all is not the same thing as having real analysis. Count three things: how many characters have a `PORTRAY_DB` entry at all, of those how many have real (non-placeholder) per-level `reason`/`recommended` analysis, and separately, of the batch written 2026-08-17 via parallel sub-agents, how many have actually been human/spot-checked since (see §7's bulk-generation caveat) — don't report the bulk batch as equivalent-confidence to individually-verified entries until spot-checked.  
5. For the Role audit (§10): a character is only genuinely covered if they have a `ROLE_OVERRIDE` entry using values from the fixed 5-value list — checking `CHAR_DB.role` alone will look "fully covered" when it isn't, because that field is free text and always non-empty.  
6. Report actual computed numbers in the run's summary (per §14) — never a remembered or assumed number from a prior run.  
  
This replaces the old pattern of hand-maintaining "132 of 132," "confirmed so far: Brume, Nautika,"  
etc. as prose that gets edited (and inevitably forgotten) run over run.  
  
## 6. New-character / new-Euphoria detection cascade (every run, mandatory, in order)  
  
1. For every `CHAR_DB` entry with `upcoming:true`, plus anyone Step-3 research surfaces as newly announced/live: attempt a fresh fetch of their real Prydwen page.  
2. If the page still doesn't exist, or is still CN-only/incomplete: do NOT mark done, do NOT silently skip — write "checked `<character>`, still not live in Global as of `<date>`" in the summary, leave `upcoming:true` unchanged. Checking and finding nothing new is a useful, reportable outcome.  
3. The moment a page IS live with a real kit, all of the following happens in the SAME run:  
 1. Full two-pass rebuild (see §12) — `SKILL_KIT`, `INSIGHT_KIT`, `PORTRAY_DB`, `EUPHORIA_DB`, `ROLE_OVERRIDE`.  
 2. Flip `upcoming:false`; delete/rewrite any placeholder pre-release `does`/`tip` text.  
 3. Adaptive-skill and tertiary-action-economy check (§4).  
 4. Archetype audit (§9) — new archetype confirmed or introduced?  
 5. Role audit (§10).  
 6. Hover-tooltip spot-check (§11) via Playwright — don't assume automatic wiring caught new terms.  
 7. Portray recommendation (§7) once real Portray text exists; track separately as open if Skills publish before Portray.  
 8. Any Benson-verified Portray/Insight mechanical effect gets added to `PORTRAY_MECHANIC`/`INSIGHT_MECHANIC`; otherwise leave untagged.  
 8b. **Resource-mechanics check (added 2026-08-18, mandatory for every new character)**: read the new character's Skills+Insight text specifically for a bespoke resource/mechanic beyond generic AP/Moxie (the same question the 13-agent pass in §8 asked of the existing 131 — a named alt-currency, a stacking counter, an HP-sacrifice loop, a threshold-triggered effect). If one exists, add an `INSIGHT_MECHANIC`/`PORTRAY_MECHANIC` entry with `type:'resource_note'` (informational, same standard as step 8). If their ULTIMATE specifically is gated by a non-Moxie resource, add them to `ALT_ULT_GATE_CHARACTERS` (§8) too. Most characters WILL have something here — "no bespoke mechanic" turned out to be the minority case across the existing roster, so don't skip this check by default-assuming a plain Moxie loop. If the new mechanic is precisely enough specified to model for real (no missing-HP or unmodeled-trigger blocker, same bar Igor/Alexios cleared) rather than just an informational note, flag it in RUN_LOG as a candidate for real modeling rather than doing a rushed/fabricated version in the same run.  
 9. Team comps (§5) — add to `RAID_TEAM` only once sourced in a real CN/Global comp.  
 10. No separate action needed for the Team Builder picker — the `upcoming` flag flip handles the "SOON" badge automatically.  
4. New Euphoria on an already-rebuilt character follows the same cascade (skip step 3.2; `EUPHORIA_DB[name]` appends instead) — re-run the Portray recommendation and tooltip spot-check, since new Euphoria can introduce new skill/term names.  
  
## 7. Portray recommendations (Claude's own analysis, every run, mandatory)  
  
**No user-facing override exists.** A click-to-flip Recommended/Not Recommended feature was built  
2026-08-17 and REMOVED the same day — Benson: "dont let the user toggle the portray!!!" Portray tags are  
display-only, always reflecting `PORTRAY_DB`'s own `recommended` value directly. Never re-add a  
toggle/override here without being asked. (The Team Builder's Portray-LEVEL selector — which of P0-P5 a  
character is currently invested at, for State-Block simulation purposes — is a completely different  
feature and stays; only the Recommended/Not-Recommended tag's clickability was removed.)  
  
**Semantics — corrected 2026-08-17, this supersedes the old "cumulative, always cascade" framing  
below.** `recommended:true/false` on a level answers "is THIS level's own marginal gain worth ITS OWN  
Portray cost" — judged independently per level, NOT "is investing up to and including this level worth  
it" cascaded from whichever later level happens to be good. Benson's correction, with his own worked  
examples: **a numeric-only bump can still be `true`** if the thing it scales is big enough or wide  
enough (e.g. Brume P2: a numeric buff to Testing Flame's Truth Tempered, but it buffs the WHOLE  
Mental-DMG team including Brume's own Ultimate cycle — recommended, because of that team-wide reach, not  
despite being "just numbers"). **A level that unlocks something structurally new can still be `false`**  
if the actual gain is too small for its cost (e.g. Sentinel P3: raises Expiation's own damage numbers —  
real numbers, but they don't clear the bar). And a later level being good does NOT drag earlier/later  
"just numeric" levels up to `true` by association — each level stands on its own (e.g. Sentinel: P1, P2,  
P5 raise Dread Bullet's Crit Rate bonus, shared with an adjacent ally — real teammate-facing value, all  
`true` — while P3/P4 raise Sentinel's own Expiation/Infernal Mercy damage and are `false`, even sitting  
between two `true` levels). **The prior 2026-08-17 "numeric-only rule"**, which defaulted every pure-  
numeric level to `false` regardless of actual magnitude/reach, was ALSO wrong in the other direction —  
it caused real misses (see the Brume P1/P2 case above, wrongly demoted under that rule despite being  
worth it) — don't resurrect it either. There is no shortcut classification (mechanic-vs-numeric,  
cumulative-vs-independent); every level gets a real cost-vs-value judgment call.  
  
Method:  
1. Read all 5 levels' real text together, plus the character's full kit (skills, Insight tiers, archetype/role) for context.  
2. For each level, ask directly: does this level's actual effect (whatever its shape — new mechanic, numeric bump, cap raise) clear the bar for its own Portray cost? Team-wide/teammate-facing effects clear that bar more easily than a buff to the character's own secondary numbers; a Support/Shielder/Healer's own attack-damage numbers usually don't matter much even when the % increase looks large.  
3. Same-skill, same-type changes should get the SAME verdict unless there's a real reason (diminishing returns, or one specific instance being team-facing while another isn't) — not a vibes-based split.  
4. Judge levels independently — a `true` verdict on a later level never forces an earlier/interleaved "just numeric" level to `true`, and a `false` verdict on an earlier level never blocks a later level that stands on its own value from being `true`. `recommended:false` levels can be skipped while still taking a later `recommended:true` level (the real game lets you buy Portray levels out of strict order in this sense — the reasons don't need a "necessary step" framing anymore).  
5. Where the kit doesn't give enough information to judge magnitude, say so honestly in the reason rather than asserting an unsupported ranking.  
6. `count` = the actual number of `true` levels (no longer path-cumulative padding).  
  
**Fixed via direct spot-check (2026-08-17, corrects the old numeric-only-rule miscalls) — treat these 5  
characters' verdicts as settled, current, and the reference examples for the corrected method above:**  
Brume (count 3→2: P1/P2 `true`, P3-P5 `false` — P1 raises the Prismatic Power ceiling itself, P2's  
Testing Flame buff is team-wide so its size matters), Corvus (unchanged — Benson confirmed the existing  
P1-P5 verdicts were already right), Rubuska (P4 flipped `true`→`false`: Happy Piper's heal increase  
wasn't big enough for its cost even though it's a "real number on her healing core"), Semmelweis (count  
5→1: only P1's team-wide Blood Domain cap raise clears the bar; P2-P5 all buff her own Truth  
Revealed/Signature Floppy damage, not worth it), Sentinel (count 4→3: P1/P2/P5 raise the teammate-shared  
Dread Bullet Crit Rate bonus — worth it; P3/P4 raise his own Expiation/Infernal Mercy damage — not worth  
it). All 5 entries' stale `[Edited 2026-08-17: demoted under the numeric-only rule...]` annotations were  
removed as part of these fixes.  
  
**Full-roster pass completed 2026-08-17 (later same day).** Benson caught a further miscall (Flutterpage:  
only P1 should be `true`; the prior draft had wrongly kept P2-P4 `true` for touching a team-wide buff  
whose actual bump was only +3-5pp — "you seem to down play the cost of an extra unit"). Flutterpage was  
fixed directly (count 5→1), then a 13-agent batch pass re-judged the remaining 124 characters (655  
levels) against the corrected method, explicitly instructed to never let team-wide reach substitute for  
real magnitude and to default to `false` when genuinely unsure. Result: 179 of 655 levels across all 131  
characters now marked `true` (~27%). Brume/Corvus/Rubuska/Semmelweis/Sentinel/Enigma (already fixed  
earlier the same day) were left untouched by this pass. This is a bulk agent-generated pass (same  
verified-only-vs-bulk-draft distinction as the `ULT_HOLD_OVERRIDE`/`AP_SURPLUS_OVERRIDE` tables in the  
State-Block code, §8) — not yet spot-checked character-by-character against real kit text at this  
volume; treat as a strong first full-roster draft, not gospel. Confirmed miss #2 (after Flutterpage):  
**Liang Yue** — the bulk pass had P3/P4 `true` (doubled Immunite/Guardian's Resolve stacks, Penetration  
hitting 100%) and P1/P2 `false` (modest duration/threshold tweaks). Benson flipped it: P1/P2 `true`  
(count 2), P3-P5 `false` — "but numbers increase" is his explicit warning that a bigger/doubled number  
on an EXISTING mechanic (P3's stack doubling, P4's Penetration cap) doesn't automatically clear the bar  
just because the increase looks larger than P1/P2's; a real threshold/pacing change on a smaller-looking  
number (P1's Spelldock section size, P2's Talon-cost reduction) can outrank it. If Benson  
flags a specific character as wrong, fix that character directly (same pattern as Flutterpage) rather  
than re-running the whole batch.  
  
**Enigma's Portray analysis completed 2026-08-17** (closing the `PENDING ANALYSIS` placeholder tracked  
since the prior session): count 4 (P1, P2, P4, P5 `true`; P3 `false` — P3 is mostly a numeric bump to  
her OWN basic attack, and she's a Shield/Support, not a damage dealer). Note: P3 and P4's source text  
both reference a "Closed-Loop Principle" skill not present in her currently rebuilt `SKILL_KIT` — flagged  
as a data gap in her `source` field rather than guessed at; a future kit rebuild should check whether her  
kit was reworked since the 2026-08-15 `SKILL_KIT` rebuild.  
  
**Bulk-generation caveat (2026-08-17, still applies):** the initial backlog of 126 characters' Portray  
analyses was written in one batch via 8 parallel sub-agents, each given the same methodology and a  
finished reference example, rather than one at a time. None of those 126 got the normal single-character  
double-check before shipping — treat the whole batch as "written, not yet spot-checked" until a human  
(or a dedicated follow-up pass) has actually read a sample against real kit text, on top of the separate  
"not yet re-judged under the corrected cost-vs-value method" gap above. Don't cite "126 Portray analyses  
done" as equivalent in confidence to a normal one-by-one run until both gaps close.  
  
## 8. State-Block play-by-play simulator — confirmed mechanics (treat as ground truth)  
  
Live, running code (`simulateStateBlockPlan`/`renderStateBlockPlan`) — extend it, don't rebuild it.  
Active as soon as at least 1 picked character has real `SKILL_KIT` data with an Ultimate identified;  
doesn't require all 4 slots filled. Guiding objective: deal as much damage as possible over the round  
window — greedy and spend-everything, never resource-hoarding. Any allocator change should be checked  
against this; an unspent AP or unused ready action without a concrete, nameable reason works against it.  
  
- **AP**: base = full picked team size, including Conduit teammates (Energy/Harmonization characters still draw from the same shared pool at the same 1 AP/card cost as everyone else — see Conduit note below; only their specific card choice isn't simulated). Not hardcoded to 4. A verified Continuous-Action-I-style effect adds +1 to the team pool, capped — multiple simultaneous sources do NOT stack. **There is no "Mixed-Team Clogging Penalty."** An earlier session invented a -1 AP deduction for mixing Conduit teammates into a standard team; Benson corrected this directly (2026-08-17) as built on a wrong premise — Conduit Energy cards cost the same 1 AP as any regular card, same pool, no archetype-mixing malus. That penalty function has been removed from the code; if it resurfaces in a future proposal, the answer is no, not "reduce the deduction."  
- **Card cost**: flat 1 AP per card regardless of rank, unless the caster is inside a self-granted AP-free window, in which case 0 AP for that character's own casts — including Ultimate recasts while the window is still active.  
- **Merging**: exactly 1 free ACCIDENTAL (passive board) merge per round, team-wide, +1 Moxie, no AP cost — displayed as "Free Merges." A FORCED (deliberate) merge costs 1 AP for +2 Moxie, modeled as the lowest-priority action (only spends AP left over after every Ultimate/free-window/regular-cast action has had its shot), capped at 1 forced merge per character per round.  
- **Moxie generation**: Turn Start +1 to everyone; any non-Ultimate card cast +1 to that character; accidental merge +1; forced merge +2 (costs 1 AP); Ultimate cast consumes all 5 and resets to 0. A verified "Moxie on entering combat" effect starts a character partway or fully filled. 5 pips is the cap throughout.  
- **Ultimate timing**: castable the instant Moxie hits 5, no artificial delay; can happen mid-round. Cast on cooldown by default once ready — holding it back is only modeled when there's a concrete, nameable synergy reason (the simulator doesn't have enough cross-character modeling to judge this reliably in general). A confirmed hold case gets a `ULTIMATE_AP_OVERRIDE`-style entry in `ULT_HOLD_OVERRIDE[name]` (§4) instead of a generic "sometimes hold ults" heuristic — Sentinel (stack-based Fresh Wound payoff) is the seeded example. Never build a role-based or momentum-based "characters like X usually hold" rule; Benson's explicit correction this session was that this genuinely depends on the individual kit ("read the full kits and insights to understand how to best pilot" — a Sub-DPS/Support/whatever label tells you nothing about whether a given character wants to hold).  
- **No per-character regular-cast cap (corrected 2026-08-17, same day as the AP-surplus tier below was deprecated)**: an earlier session capped each character at one regular (non-Ultimate) cast per round (`paidCastDone`), with a separate priority-2.6 "AP-surplus" tier reading `AP_SURPLUS_OVERRIDE` to fund a verified second cast. Benson corrected this directly: "in EVERY round, a character could have more than 1 card of their own each time (sometimes they want to use them all)." The cap and the dedicated surplus tier are both removed — candidate generation now exposes every one of a character's owned card TYPES as a candidate every round, gated only by `apLeft`, same priority-2 tier as before. `AP_SURPLUS_OVERRIDE` (64/130 characters) still exists as verified reference data (which characters have a kit-stated reason to want extra casts) but is no longer read by the allocator — it's documentation, not a gate.  
- **Buff-upkeep pass (confirmed 2026-08-17, not yet built as of this date)**: a new allocator tier for spending AP to refresh/maintain a critical buff before it lapses, sitting between the mandatory tiers and pure surplus-cast logic. It wins ties against a momentum/extra-cast opportunity, but structurally can NEVER preempt a Ultimate cast (tier 0) or a character's own first regular cast (tier 2) — it only competes for AP that's already surplus to those. Explicit constraint from Benson: this pass must not blindly refresh a buff the instant it's refreshable — "sometimes its about timing burst windows as well," i.e. a buff that's about to lapse right before a burst window should hold for the burst, not upkeep-refresh early and waste the window. Not yet implemented in `simulateStateBlockPlan` — queued (see RUN_LOG "Queued for next session").  
- **Round allocation fairness**: Regular-cast allocation runs in two sub-passes: characters with NO action yet that round get first claim on remaining AP; only after everyone's had a shot does anyone who already acted (e.g. via their Ultimate) get a second (or third, etc.) action from leftover AP. There is no per-character cap on regular casts (see above) — a character can spend as much of the shared pool on their own owned card types as AP allows.  
- **Actions per round are not rigidly 1-per-character**: the round-level allocator spends the shared pool on whatever's actually available and worth taking; free-window casts never compete for budget. 0, 1, or 2+ actions per character per round is expected and correct, not a bug.  
- **Adaptive skills** always name which generated mode is being cast (alternates each time) — never just the selector name alone.  
- **Deck/hand**: each character contributes 2 unique card types, 8 copies each (64-card deck for a 4-character team); hand is flat 8 cards/round, 2 slots per character.  
- **Ultimate AP cost**: 1 AP to cast, same as a regular card, ON TOP OF the Moxie gate — a game-wide baseline, not something each kit re-states. `ULTIMATE_AP_OVERRIDE` exists only for a specific confirmed 0-AP exception (empty until Benson names one).  
- **Precast cards**: auto-generated into hand for free, then cost the SAME 1 AP as a regular card to cast, UNLESS tagged `versatile:true` in `PRECAST_CARD` (§4) — the only real 0-AP-to-cast exception. Check each character's own kit text for the specific "Versatile Precast Incantation" phrasing; don't extend the exception on the strength of one confirmed example (Recoleta's Flood of Fiction) alone.  
- **Pre-round setup actions**: real, non-card battle-start choices get stated via `PREROUND_ACTION` (§4), not silently skipped, even when too open-ended to simulate.  
- **`ESTIMATED_MAX_HP = 30000`**: a single flat, explicitly-labeled ballpark Max HP figure (not per-character, not Prydwen-verified) used only inside informational `resource_note`/`PREROUND_ACTION` text to turn an HP-percentage kit number into an illustrative round figure (currently: Nautika's Bloodtithe entry-loss estimate). Never treat this as a real stat or use it in actual AP/Moxie/damage math.  
- **Anjo Nala's Bind** (Insight I, "Oath Bound") is fully modeled via `sbGetAnjoBindTarget(teamArr)` off real team composition — the 3 confirmed variants are: Rhiannon or Mercuria present → binds Fatutu; Brume present (no Rhiannon/Mercuria) → binds Brume; any other team with Anjo Nala is not a confirmed pairing and is correctly left unmodeled. When resolved: Max Moxie becomes 12, Ultimate costs 8 Moxie, and every Moxie gain the bound ally would earn redirects to her instead; the bound ally is excluded from `ultReadyNames`. Her own Ultimate force-casts the bound ally's real Ultimate for free (0 AP/Moxie) in the same action-loop pass, noting the 50% current-HP cost her kit text states.  
- **The "mark Ultimate ready" toggle was REMOVED 2026-08-17** (Benson: "remove: mark Ultimate ready now that u included the ultimate in the box") — redundant once the manual play override's own "Ultimate" row already forces the cast (see below). `manualUltReady`/`ultOverrideKey`/`rd.toggleable` no longer exist; don't re-add this as a separate control.  
- **Manual play-by-play override** (`manualPlayOverride`, separate from the Live Round Tracker) — **`manualPlayOverride[key]` is an ARRAY of picks per character per round, not a single value** (Benson: "I NEED FULL CONTROL EACH 'ACTION' — lets say i have 5 ap.. i want 37 to attack 5 times... then i can manually select her cards for each action i have"). Each row is independently Auto (`''`) / Skip this round / Ultimate / any of the character's own owned cards, via `sbGetPlayOptions` (`sbFindUltimate`/`sbExtractDeckCards`) so the dropdown only ever offers cards the character actually has — ranks still aren't independently selectable (the sim always plays a card at its highest shown rank). Every non-empty entry resolves at guaranteed priority -1, in array order, funded from the shared AP pool before any auto-picked action — manual and auto are mutually exclusive per character per round (any non-empty entry means ONLY the listed actions happen, no auto top-up). Picking "Ultimate" means it's ASSUMED ready and will be cast regardless of actual Moxie (Benson: "when i select the ult, its assumed that the ult is ready and will be used" — no readiness gate on the manual-Ultimate branch; `resolveCandidate`'s Moxie deduction floors at 0 either way, so this is safe). UI: each character's slot-bar shows one `<select>` per array entry (at least 1, defaulting to Auto), a "+ action" button to add another row, and a "×" per row beyond the first to remove it. Changing any selector re-runs the WHOLE simulation from round 1, since Moxie/AP/status state cascades round to round.  
- **Slot-by-slot action bar** (single column, `.slot-bars{flex-direction:column}`): each round renders one bar PER TEAM SLOT (3 bars for a 3-character team, 4 for a full team — never per individual action), each bar combining that character's name, the manual override `<select>`(s), and every action line actually resolved for them this round (0, 1, or more — e.g. Anjo Nala's forced free cast of her bound ally's Ultimate shows as an extra line inside the ALLY's own bar, not a separate bar). A 5th bar for the selected Tuning (if any) follows the 4 character bars — see the Tuning entry in §4.  
- **Manual Sensory Bond toggle (Rhiannon)**: marks her Raptor Kinship free turn as activated for a round. Per Benson's confirmed simplification, this is architecturally just "one more normal round" — each activation extends the whole simulated sequence by 1 round (`totalRounds = 10 + active manualSensoryBond count`), not a bonus action squeezed into an existing round.  
- **Verified-mechanic tagging** (`PORTRAY_MECHANIC`/`INSIGHT_MECHANIC`): see §4 — human-read-and-tagged only, never a generic regex/NLP pass. This is genuinely ongoing character-by-character work, same as the Portray-recommendation backlog.  
- **Per-character resource mechanics — full-roster informational pass completed 2026-08-17** (Benson: "read all character kits, insights, etc... use each character's logic to do the play-by-play", then "continue with ALL 129 chars"). This is a MUCH bigger project than the existing tagging above — modeling each character's own bespoke resource (Bloodtithe, Shadow Cloak, Higge, Faith, and ~130 other characters' own systems) instead of the generic AP/Moxie loop, and the full version (each mechanic actually driving the allocator's decisions) is NOT what got built — see the honesty note below. Real prerequisite gap: this tool has NO real HP/stat block anywhere in `CHAR_DB` (confirmed via grep), so exact numeric thresholds (e.g. Nautika's "3000 HP combined = 1 Bloodtithe point") genuinely cannot be computed exactly. Benson's answer when told this: "make an educated guess" — so `ESTIMATED_MAX_HP = 30000` (§8) is a single flat, clearly-labeled ballpark from general knowledge (NOT Prydwen-verified, NOT per-character), used only to turn an HP-percentage into an illustrative round figure in `resource_note`/`PREROUND_ACTION` text — never presented as a real stat.  
 - **Mechanism** (the pattern for extending this further): a `resource_note` type entry on `INSIGHT_MECHANIC`/`PORTRAY_MECHANIC` — purely informational, nothing switches on this type except display, unlike `moxie_on_entry` which feeds real Moxie-cap math. For a character whose ULTIMATE gate is a non-Moxie resource, add them to `ALT_ULT_GATE_CHARACTERS` (`usesFaithNotMoxie(name)`, name kept from the Nautika pilot) so the sim stops fabricating a fake Moxie fraction for them and instead shows "Faith (not simulated — track manually)", excludes them from `naturalUltReadyNames`, and points to the manual play override's "Ultimate" pick as the real workaround. **Anjo Nala is deliberately excluded from `ALT_ULT_GATE_CHARACTERS`** even though her gate is also non-standard — she already has real, working Moxie-cap/cost modeling via `sbGetAnjoBindTarget`, so adding her here would regress a real feature into a fake placeholder.  
 - **Coverage**: piloted on Rubuska→Nautika (session 8), extended to all other 127 non-Conduit characters via 13 parallel subagents (session 9-10). All 131 characters have been READ/checked at least once for a bespoke mechanic — but Benson's correction (2026-08-18): "conduit sys not built yet, its not working at the moment" — **The Twins/Coppélia are NOT actually modeled**, only excluded from the AP/Moxie loop and shown an info panel (`renderConduitPanel`) with no real Energy/Harmonization number simulated (see the "Known gaps" Conduit entry below — this was already accurately documented there, the coverage line above had wrongly implied it counted as "handled"). Correct standing: of 131 characters, 2 (Twins/Coppélia) are a real, un-modeled gap same as Nautika/Ms. Stranger, not a different-but-equivalent table. 80 have a `resource_note`. 6 are in `ALT_ULT_GATE_CHARACTERS`; of those, `AUTO_ULT_GATE_CONFIG` now REALLY models 4: Igor (Moxie 0-12, auto-casts round-end), Alexios (Adrenaline 0-8, auto-casts round-start, real per kit text), Kassandra (Adrenaline 0-10, auto-casts round-start, real per kit text except the unmodeled 2/6 precast-injection bonus), Ezio Auditore (Synchronization 0-100, auto-casts round-start, under an explicit LABELED ASSUMPTION — only self-cast Assassination attacks count, underestimates his real rate). Nautika and Ms. Stranger remain informational-only (HP-stat gap; kit not live yet, respectively).  
 - **Liang Yue (2026-08-18, v63) — REAL modeling added outside `AUTO_ULT_GATE_CONFIG`** (he's a normal Moxie character, not an alt-gate one — this is a separate side-mechanic, his Talon→Bane-of-All-Evil loop). His `SKILL_KIT` was rebuilt from scratch this session (prior entry had fields shifted by one position) plus 3 truncation fixes in `EUPHORIA_DB["Liang Yue"]`. Two counters (`talonJustice`/`talonPeace`, function-scoped in `simulateStateBlockPlan`) accrue while under `[Qiangliang Complete]` (from his own Ultimate): Banish Evil +1 Justice, Bless Life +1 Peace. At 6 combined (5 at Portray P2+), auto-triggers a free Bane of All Evil bonus attack, variant chosen by whichever pool is larger, draining the larger pool first. Two labeled ASSUMPTIONS: overlap-Spelldock casts should split 0.5/0.5 but this sim has no Spelldock-position model so every qualifying cast is a flat +1 (slight overestimate); drain order when pools are unequal isn't kit-specified, larger-pool-first was chosen as reasonable. Verified via Playwright at 20 rounds (10-round solo test doesn't have enough AP/rounds for a 1-AP character to reach threshold — confirmed not a bug).  
 - **Why most of the 80 `resource_note` characters can't get the same Igor/Alexios/Kassandra treatment (checked 2026-08-18, Benson: "what about the other char and their systems... do the rest")**: this simulator does NOT compute actual damage numbers anywhere — it only sequences AP/Moxie/card order. Most of the 80 characters' bespoke stacks are DAMAGE-SCALING or passive-buff mechanics with no decision to plug into. As of session 17 (v66, full 6★ sweep via 4 parallel agents reading every remaining character's real kit text), **20 characters now have real-modeled mechanics** beyond the 4 `AUTO_ULT_GATE_CONFIG` entries: Liang Yue, Mercuria (both session 16), Ramona, Charon, Enigma, Reed, Semmelweis, Flutterpage, Beryl, Cheng Heguang, Tuesday, Lorentz Butterfly, Lopera, Desert Flannel, Buddy Fairchild, Moldir, Marcus, Yenisei, White Rum, Hissabeth (session 17) — see RUN_LOG session 17 for the exact mechanic and numbers per character. **Cornerstone's Moxie-cap/bank mechanic was checked, briefly implemented, then reverted** — pre-release kit, Benson confirmed she isn't live yet; numbers recorded in her `resource_note` as ready-to-implement once she releases. **Session 18 (v67) cleared 4 more of those 10**: Rubuska (Moxie bank), Nick Bottom (status-gated round-start Moxie), Tennant (one-time entering-battle bonus cast), Brimley (Riding-Double-holder action-count trigger — the other half of the session-15 "Buddy Fairchild and Brimley" pair, now both resolved). **26 characters total** now have real-modeled mechanics beyond the base AP/Moxie loop (4 `AUTO_ULT_GATE_CONFIG` + 22 bespoke), up from 4 at the start of 2026-08-18. Everything else checked this session was explicitly rejected for cause (random chance, enemy-state dependency, HP/death tracking this sim doesn't have, or pure damage-scaling) — see RUN_LOG session 17 for the categorized list.  
 - **Session 19 (v68) update, 2026-08-18** — Benson reversed the Conduit-out-of-scope call ("ok include conduit units... continue with all the other characters") and the remaining 6-deferred list was cleared down to 1: Pickles, Recoleta, Lady by the Lake, Melania, and Ms. NewBabel are now real-modeled (see RUN_LOG session 19 for exact mechanics) — **31 characters total** beyond the base loop as of v68. Only **Vila remains blocked** (her "Mental DMG ally" clause doesn't map to any DMG-type taxonomy this tool tracks — confirmed via grep that no such structure exists at all, same standard as Mercuria's "Natural Afflatus" gap). Conduit (Twins/Coppélia) now has a real-but-scoped-down separate tracker (`simulateConduitPlan`/`renderConduitRounds`) — see the Conduit "Known gaps" entry below, which is now partially OUT OF DATE (the "aren't runnable through the State-Block simulator" framing is superseded — Conduit runs on its own companion panel, not through the AP/Moxie sim, since it genuinely doesn't use AP/Moxie). Note also: that entry's claim that The Twins' Ultimate requires "BOTH 100 Harmonization AND 9+ Energy banked" reads as a confirmed cast-gate number from earlier research, but the Skills/Insight kit text re-pulled fresh this session (`conduit_raw.txt`) states no explicit Harmonization cast-gate threshold for either character — only flat Insight-granted Harmonization amounts (Twins +70, Coppélia +30 on entering battle; Coppélia +15/round) and the Ultimate's own Energy-based bonus-DMG tiers (6+/9+/12+ Energy — informational/damage-scaling only, not a cast gate). Rather than guess which prior note was right, the new sim's `CONDUIT_HARMONIZATION_CAP_ASSUMED = 100` is explicitly labeled an ASSUMPTION pending a stronger source — a future pass should try to re-verify the "100 Harmonization" figure directly (WebSearch is blocked in this environment) before confirming or removing that label.  
 - **Session 20 (v69) update, 2026-08-18** — Benson caught two real gaps in v68's Conduit tracker same-day: (1) The Twins/Coppélia's headcount (plus The Twins' Insight I flat personal "AP +1") wasn't flowing into the shared AP pool size — fixed via new helper `conduitApContribution(conduitArr)`, wired into `fullTeamSize` and the Conduit-only fallback path, now displayed per round in `renderConduitRounds`. (2) "the conduit character have incantation cards too!! energy cards as well" — the sim already modeled both card types (an Incantation cast AND its attached Energy Card effect), just labeled ambiguously; relabeled for clarity. Also added, per Benson's "for now give them a space in the turn by turn to choose a card": a manual per-round card picker for Conduit characters, reusing the EXISTING `manualPlayOverride`/`.mp-select`/`sbGetPlayOptions` mechanism verbatim (no new event wiring needed — the delegated listeners match by CSS class). Honest scope limit: picking a card changes what's LOGGED, not the Energy/Harmonization NUMBER granted, which still uses the same flat default regardless of pick — per-card exact Energy amounts for cards other than each character's default aren't modeled yet.  
 - **Session 20 continued (v71) update, 2026-08-18** — swept the last ~44 unchecked `resource_note` characters (Benson: "pls continue with the other characters"), same 4-parallel-agent methodology as sessions 17/18. **9 more real-modeled**: Rhiannon (entering-battle +3 Moxie, real [Attunement] counter feeding her Insight III round-end Moxie gain), Noire (round-start guaranteed-Spotlight → Moxie+1, deliberately narrowed to just the one deterministic floor trigger), Brume ([Thermoelectric Conversion] cumulative-gained counter, flat +5/round floor), Corvus (Pulsing-Field-transferred monotonic counter, Moxie+3 + cap-10 on first reaching 120 — a labeled simplification since the real buff/transferred-total actually resets, which this sim doesn't model), Ezra/Door/Barcarola (flat Ultimate-cast Moxie grants), Centurion ("Outdoor Superstar" rank-3 Moxie+2 via `SPECIAL_CARD_GAIN`), Argus (round-end rank-sum threshold bonus). **Aleph needed zero new code** — her kit text already matches the existing generic `sbDetectApPlusOneWindow` AP+1 detector, so she was already covered without anyone realizing it. **Two of the sweep agents' IMPLEMENTABLE calls were overridden to deferred** after personally re-reading the exact kit text: Lucy's Moxie+1 lives behind her unbuilt Reinforce/Advancement choice system (team-wide Dynamo totals + a 3-basics-then-Ultimate order this sim doesn't track), and Willow's Ancient-Ritual Moxie mechanic has no stated duration or per-round deduction number in the sourced text — both would require inventing numbers, so both stay informational-only. **40 characters total** now real-modeled beyond the base loop (4 `AUTO_ULT_GATE_CONFIG` + 36 bespoke), up from 31 at the start of this session. A TDZ near-miss was caught before verification this time (not after a failing test) — `corvusReachedLv3` needed to be declared at the very top of `simulateStateBlockPlan`, before `chars`, since `moxieCap()` (which reads it) is called from the `startMoxie` loop that runs before the function's later declarations — same bug class as the `charByName`/`chars.some(...)` fix earlier this session, now caught by habit.  
 - **Explicit honesty about scope**: this is STILL informational-only for all 80+6 characters, same as the Rubuska/Nautika pilot — none of these `resource_note` entries feed the allocator's actual cast/hold/priority decisions (Moxie/AP math is identical to before for everyone except the 6 alt-gate characters' readiness display). "Use each character's logic to do the play-by-play" in the fullest sense — the mechanic actually changing what the sim decides to cast and when — remains undone for all 131 characters; this pass only makes the mechanics VISIBLE, not decision-driving. It is also a bulk agent-generated pass (13 parallel subagents, same standard as the Portray full-roster pass and `ULT_HOLD_OVERRIDE`/`AP_SURPLUS_OVERRIDE`) — not spot-checked character-by-character against source text at this volume.  
 - **A real near-miss this session**: a scripted `INSIGHT_MECHANIC` splice (used to bulk-merge the 79 new `resource_note` entries) had a boundary bug that silently deleted `sbGetBaseInsightMechanics`, `PREROUND_ACTION`, `sbGetAnjoBindTarget`, `CONDUIT_RESOURCE_CHARACTERS`/`isConduitChar`, and `ENERGY_RESET_OVERRIDE` from the file — `node --check` (syntax-only) did NOT catch this, since deleting whole function/const declarations while leaving their call-sites intact isn't a syntax error, only a runtime `ReferenceError` once actually invoked (e.g. loading a team with Anjo Nala). Caught by comparing the current file's top-level `function`/`const` declaration names against the last known-good version (`2026-08-17_v58_RE1999TeamBuilder.html`) rather than relying on `node --check` alone, and fixed by reinserting the missing block verbatim. **Lesson for future scripted splices on this file: always diff top-level declaration names against the previous delivered version afterward — `node --check` passing is necessary but not sufficient.**  
 - **Session 20 continued (v72–v73) update, 2026-08-18** — Benson explicitly relaxed the no-fabrication default for THREE named characters ("continue making educated assumptions all these numbers... just assume using educated guesses"): Vila (Insight I Mental-DMG-ally Moxie trigger, gated on `ASSUMED_MENTAL_DMG_CHARACTERS` — a 60-name list derived from a frequency count over each character's own rebuilt `SKILL_KIT` text, not pure invention), Willow (Ancient Ritual channel — `ASSUMED_WILLOW_RITUAL_ROUNDS=3`/`ASSUMED_WILLOW_RITUAL_DEDUCTION=1`, both truly invented since the kit states neither), Lucy (assumed always-reinforced by Ultimate-cast time rather than building the unbuilt Reinforce/Advancement system, flat Moxie+1 on Ultimate). All three are clearly labeled ASSUMED in both code comments and `resource_note` text — the relaxation is "don't refuse to implement," not "hide that it's invented." This is a NAMED, per-character exception, not a change to the project's default no-fabrication stance elsewhere. Separately fixed a real bug (not an assumption): Flutterpage's AP+1 card was tied at the same generic priority as everything else and could lose the AP race — now tiered with AP-free/Ultimate casts so it casts round 1 as intended.  
 - **v73**: finished the in-progress Conduit round-card merge (each Conduit character gets its own slot bar inside the same round card as standard characters, not a separate trailing panel); fixed a real stale-UI bug where the "Special conditions in effect" box still called Conduit "(NOT FIXED — TO BE FIXED IN FUTURE)" long after the Conduit sim was actually built (v68) and progressively enhanced — a legitimate user-caught regression between what the code does and what the UI claims it does; stripped "2026-08-18: ... IS now REALLY modeled" session-diary phrasing out of all 31 `resource_note` entries that had it (rewritten as plain mechanic text, same informational content); fixed a genuine factual contradiction in The Twins'/Coppélia's `does[]` text claiming Energy "carries into the next round" when the confirmed rule (and this file's own `ENERGY_RESET_OVERRIDE` comment) is that it resets to 0 every round; rewrote `ARCH_INFO.Conduit`'s primer to state the actual mechanic precisely (playing an Energy card triggers one of 2 real skills + Ultimate, all AP-free, only affecting the shared pool other teammates draw from); added a new `ARCH_INFO.Ultimate` archetype and tagged Igor/Moldir/Melania/Recoleta/Getian/Lopera with it (multi-tag, additive). **Confirmed the `bp:[...]` field on `C({...})` roster entries is DEAD DATA — nothing in the render code ever reads `c.bp`** (grepped for all call sites, found none); an attempted addition of Portray summaries there was reverted once this was discovered. Real Portray data for both The Twins and Coppélia already existed in `PORTRAY_DB` and needed no changes — it's wired automatically via `CHAR_DB.forEach(c => { if(PORTRAY_DB[c.name]) c.portray = PORTRAY_DB[c.name]; })` and rendered through the existing Portray dropdown; don't re-add this data anywhere else.  
- **Status (buff/debuff) tracking**: `sbExtractStatusGrants()` only catches an explicit `[Status] ... for N rounds` pattern in the structured rank text of the card actually cast. A status without a stated duration is correctly left untracked. Target resolution (`sbClassifyStatusTarget`) uses a TIGHT immediate-adjacency window (~30 chars before the bracket, captured text up to "for N rounds" after) — not sentence/clause scoping (see RUN_LOG for why). A single-target grant with no resolvable specific target defaults to the caster.  
- **Ongoing (non-timed) mechanics**: `sbExtractOngoingMechanics()` flags bracket terms adjacent to point/stack/value/accumulate/charge language as a name-only visibility flag (`ongoingMechanics[name]`) — deliberately not a full simulation of underlying value/target math. Don't force these through the timed-status extractor.  
  
### Resource model — the two systems, precisely (audited/confirmed 2026-08-18, v74)  
  
**Standard characters** (everyone not in `CONDUIT_RESOURCE_CHARACTERS`): tracked resource is `moxie`  
(default cap 5, some named exceptions — Recoleta always 10, Corvus/Willow conditionally 10 while a  
specific state is active, Anjo Nala 12 while bound). Gain sources, all real and currently implemented  
in `addMoxie`/the main allocator loop: +1 automatically at the start of every round (passive regen, not  
tied to any action), +1 per card actually cast, +1 per accidental (free, team-wide, 1/round) merge, +2  
per forced (deliberate, costs 1 AP) merge. There is no separate "moving a card" trigger distinct from  
merging — merging IS the card-rearrangement action, both the free automatic kind and the deliberate  
AP-costing kind. Ultimate becomes castable the instant Moxie hits its cap (usually 5), can happen  
mid-round, then auto-casts on cooldown by default.  
  
**Conduit characters** (`CONDUIT_RESOURCE_CHARACTERS`, currently `["The Twins","Coppélia"]`): no Moxie  
at all — tracked resources are `harmonization` and a single flat `energy` counter per character  
(`simulateConduitPlan`). Important: the real kit lore distinguishes Mineral vs. Star Energy (The Twins'  
two swappable sets), but the code does NOT track them as two separate fields — it's one flat `energy`  
number, because per-card exact Energy costs/rewards for cards beyond what's covered in  
`CONDUIT_CARD_EFFECTS` aren't sourced yet. Playing an Energy card is what triggers one of the  
character's two real skills (0-Energy / 1-2-Energy) plus their Ultimate; both the Energy-card play AND  
the skill/Ultimate it triggers are AP-free — only the shared team AP pool other (non-Conduit) teammates  
draw from is affected by a Conduit character's presence (headcount + The Twins' own flat AP+1), not  
their card-casting.  
  
**v75 rewrite — real per-card math + manual Ultimate selection.** The old MVP applied ONE flat default  
delta per round regardless of which card was picked, and auto-cast the Ultimate the instant Harmonization  
crossed an ASSUMED 100 threshold (`CONDUIT_HARMONIZATION_CAP_ASSUMED`, since removed). Benson asked to  
let both characters "cast Incantations" for real via the manual picker and removed the ASSUMED-cap  
display entirely. Now `CONDUIT_CARD_EFFECTS[name][cardKey]` holds the REAL Energy cost/gain and  
Harmonization gain for each card, sourced directly from kit text — Coppélia: Finger Training (-2  
Energy, +10 Harmonization), Vowel Basics (+2 Energy via its attached Energy Card, its separate "+15%  
Harmonization" left uncomputed — no stated base), Ultimate (+2 Energy/+10 Interval Step via its  
attached Energy Card, then resets Harmonization/Energy to 0 on cast). The Twins (numbers confirmed v76  
from Benson-pasted kit text, each card's OWN effect plus its attached Energy Card): Set A Atomic Fusion  
+5 Energy (4 self-buff + 1 from "Mineral Energy I"), Set A Polymeric Ray +2 Energy (from "Mineral  
Energy II"), Set B Extreme Overclocking +1 Energy (from "Star Energy I"), Set B Balancé Across the  
Stars 0 (confirmed no Energy Card attached — a real 0, not a gap), Ultimate resets Energy to 0 on cast  
(her Ultimate's own two attached Energy Cards, "Efficient Conversion"/"Pulse Amplification", wash out  
under that reset in this sim's flat single-Energy-counter model — informational only). Ultimate is now  
just another `sbGetPlayOptions` dropdown choice (value `'ULTIMATE'`) like any standard character, not  
an auto-trigger. No pick made for a round still falls back to a labeled ASSUMED default (Vowel Basics /  
Atomic Fusion) rather than doing nothing. **This whole per-card mechanic is UNTESTED against a real  
match** — an explicit  
"⚠ Untested" disclaimer is shown in `renderConduitPanel`; don't remove it until Benson confirms the  
numbers hold up in actual play. The only kit-confirmed Ultimate-readiness-adjacent number remains  
`CONDUIT_ULT_GATE['The Twins']`: reaching 100 Harmonization AND 9+ Energy grants a bonus Penetration  
Rate stat on the Ultimate's damage — a bonus condition on the attack, not a cast-gate.  
  
**Real bug found and fixed in v74** (still true, unrelated to the v75 rewrite above):  
`sbEnergyResetsEachRound(name)` (the confirmed rule that Energy resets to 0 every round under the  
current patch, with an override hook for patch 3.9's carryover character) was wired into the info-panel  
TEXT (`renderConduitPanel`) but never actually called inside `simulateConduitPlan`'s round loop — so the  
panel correctly SAID Energy resets each round while the simulator itself let it accumulate forever  
(only zeroing on an Ultimate cast). Fixed by resetting `energy[name]` to 0 at the top of each round  
(skipping round 1) when `sbEnergyResetsEachRound` is true. Any future Conduit-resource change should  
check both the display text AND the simulation loop separately — they are NOT automatically kept in  
sync just because one reads correct.  
  
**v77 — stopped surfacing Harmonization/Energy as a resource number in the play-by-play.** Benson:  
"stop talking about energy and harmonization in the play-by-play as a resource... im gonna strip it  
out." Removed the `"45 Harmonization, 2 Energy — AP-free..."`-style state line from BOTH the merged  
round-card slot bar (`renderStateBlockPlan`'s `stateLabel`) and the Conduit-only-team fallback  
(`renderConduitRounds`'s `stateLine`), plus the stale post-v75 "100-Harmonization... ASSUMED" line in  
`renderConduitRounds`'s trailing note and the "runs on Harmonization/Energy" phrasing in the  
"Special conditions" box. The underlying numbers (`crd.harmonization`/`crd.energy`) are UNCHANGED and  
still computed every round — only removed from these specific display strings. Don't re-add  
resource-number framing to new Conduit UI without checking this is still what Benson wants.  
  
**v78 — Portray/Insight callout for Conduit characters.** Benson: "it should say what the Portrays do  
as well say i select P2 twins.. and the Insight + Kit mechanic." The existing "Special conditions in  
effect" callout (`sbGetVerifiedMechanics`/`sbGetBaseInsightMechanics`) only reads `PORTRAY_MECHANIC` — a  
Moxie/AP-specific tag table with ZERO entries for The Twins/Coppélia, so Conduit characters never got a  
Portray/Insight callout at all. Added a parallel path in the same `conduitArr.forEach` block that reads  
directly from `c.insightKit.tiers` (real INSIGHT_KIT text, always shown regardless of Portray level)  
and `c.portray.levels` (real PORTRAY_DB text, filtered to `teamPortray[name]` and below) — same  
"(Insight I)"/"(P1)" labeling convention as the standard-character callout. This is the correct pattern  
for any future Conduit-adjacent callout: don't try to route Conduit characters through  
`sbGetVerifiedMechanics` (it will silently return nothing), read `c.insightKit`/`c.portray` directly.  
  
### Known gaps (real, current limitations — don't imply handled until they actually are)  
- Conduit characters now get their own real round-by-round Energy/Harmonization slot bar merged into  
 the same round card as standard characters (v73), not a separate "not modeled" panel — the OLD  
 "(NOT FIXED — TO BE FIXED IN FUTURE)" tag in the "Special conditions" box was stale as of v68 and has  
 since been removed (v73); don't reintroduce it.  
- Two tracked counters that scale damage — Energy Accumulation (total Energy ever spent) and Conduit  
 Activation (count of skill casts) — remain informational-only (pure damage-scaling, no decision to  
 plug into). The Twins specifically: two full swappable Conduit sets (Mineral/Set A, Star/Set B, two  
 skills each). Coppélia specifically: Skill 2 (Vowel Basics) is her main team utility — team-wide Crit  
 Rate/Crit DMG buff plus passive Conduit Might; her Ultimate grants herself and the ally behind her 3  
 stacks of an energy-reduction buff enabling free Conduit-attack casts, persisting across rounds  
 rather than expiring same-turn — a genuinely persistent (multi-round) stack, unlike the per-round  
 Energy reset above; don't collapse the two into the same reset rule. Pairing Coppélia with The Twins  
 is a CONFIRMED real synergy/power spike (her buffs + improved Energy economy), not just theorized.  
 Rhiannon's own Raptor Kinship charge-up (via Attunement consumption) is a related but separate  
 tertiary-economy system; see §4 and the manual Sensory Bond toggle in §8.  
 - **Energy reset rule (confirmed by Benson, 2026-08-17 — resolves an earlier documentation contradiction):** under the current patch, Afflatus Energy resets every round rather than carrying over — the older "carries over" note that used to live in this file was outdated and is now corrected. This is patch-dependent, not a permanent game rule: Benson's source states patch 3.9 releases a character that changes this behavior. When building the Conduit simulator, implement the reset as the default and leave an explicit override hook (a per-character or per-patch flag, mirroring the `ULTIMATE_AP_OVERRIDE`/`ULT_HOLD_OVERRIDE` pattern) so the 3.9 character can flip it without a redesign — don't hardcode "always resets" into the core loop.  
 - **No penalty mechanic exists for mixing Conduit teammates into a standard team** (corrected 2026-08-17 — see the AP pool note in §8's main list above). An earlier session built a deterministic "Mixed-Team Clogging Penalty" here; Benson rejected the whole premise, not just its determinism, so it was removed rather than kept-but-fixed. If a future proposal wants an archetype-mixing malus, get it re-confirmed from scratch — this isn't "deterministic is fine, adjust the number."  
 - **Status as of 2026-08-17 (second session, later corrected same day — see the third 2026-08-17 RUN_LOG entry):** `ULT_HOLD_OVERRIDE` (47/130 chars) and `AP_SURPLUS_OVERRIDE` (64/130 chars) are populated via a parallel-agent kit-read pass — same bulk-generation spot-check caveat as Portray applies. The allocator has a real buff-upkeep tier (priority 2.4: refreshes a status only in the round it'd otherwise lapse, via `sbCardGrantsStatus` recasting the real card that grants it), structurally below priority 2 so it can never preempt an Ultimate or a character's first regular cast. The dedicated AP-surplus tier (priority 2.6) that used to read `AP_SURPLUS_OVERRIDE` has since been removed as redundant — the per-character regular-cast cap it was built to work around no longer exists (see above), so `AP_SURPLUS_OVERRIDE` is now reference data only. `ULT_HOLD_OVERRIDE` itself is still DATA-ONLY — the sim still auto-casts every Ultimate on cooldown; nothing yet delays a cast based on the table (its 47-character coverage was re-scanned once more against every character's Portray text specifically, not just Skills+Insight — 3 additional candidates were found and manually reviewed, all rejected as not qualifying; see RUN_LOG). The Conduit archetype has a real (Twins/Coppélia) exclusion from the AP/Moxie loop plus a dedicated info panel (`renderConduitPanel`) — NOT a full round-by-round Energy/Harmonization simulation (that still needs real per-card Energy numbers this session didn't have verified inputs for; inventing them would violate the no-fabrication rule), and no AP-pool penalty of any kind for mixing them with a standard team. The Live Round Tracker is built as a manual/flexible per-round log (Moxie/AP/status editable by hand, round-advance auto-decrements status timers) per Benson's explicit "configure whatever" — not auto-derived from card picks. See RUN_LOG's "Queued for next session" for what's still open on each of these.  
- Stack-threshold-triggered AP-free effects (e.g. Cheng Heguang's Feathered Blades ≥10 stacks) aren't modeled — only duration-window effects are.  
- Rhiannon's actual `[Feast Call]` triggered attack isn't simulated as a distinct action (Sensory Bond just extends the round loop); Raptor Kinship's own charge-up isn't tracked (Benson manually marks availability via the toggle).  
- When the AP pool exceeds team size and nobody has a second free/Ultimate action available, leftover AP can fund a forced merge but still can't fund a genuine second regular card cast.  
- Beryl's Emanation crystal choice isn't modeled — round-by-round output is crystal-agnostic even though her real damage/effects depend heavily on the choice.  
- Point/value-accumulation mechanics with no round duration (e.g. Rubuska's Shadow Cloak/Shadow Friend) get the `ongoingMechanics` visibility flag only, not real value/target tracking.  
  
## 9. Archetype audit (auto-add when unambiguous)  
  
Every run: skim `CHAR_DB` for kit/tag mismatches; check for newly-named community archetypes not yet in  
`ARCH_INFO`, and for characters whose real kit touches an archetype their current tags don't reflect.  
When a new archetype is confirmed by an unambiguous source (official patch note, or the same name used  
consistently across 2+ independent community sources), add it yourself: new `ARCH_INFO` entry + primer,  
`archOrder` position, CSS color var, tag the relevant characters. Only report-without-editing when the  
source is genuinely ambiguous.  
  
Known permanent facts — do not regress:  
- No "Instrument" archetype (merged into Conduit; Coppélia/Twins are Conduit-only).  
- "Ultimate" is a real archetype (added v73, Benson: "they belong to the Ultimate Archtype... goal of them is for the DPS to do a lot of damage with ultimates") — multi-tagged (additive, not exclusive) onto Igor, Moldir, Melania, Recoleta, Getian, Lopera.  
- "Bloodtithe" is real (Nautika, Semmelweis, Sentinel, Rubuska, Fatutu).  
- Marsha is Shield + Glow + Burn.  
- Lingering Glow and Bloodtithe are mutually exclusive team mechanics — don't tag or recommend a comp expecting both to stack.  
- Respect the `allRounder` flag (§4) before flagging a character as a poor fit for an archetype-themed team.  
  
## 10. Roles (fixed taxonomy — not yours to change)  
  
DPS / Sub-DPS / Support / Healer / Shielder is Benson's fixed list — never add, remove, or rename  
values. This is enforced via `ROLE_OVERRIDE[name]` (§4), not the free-text `CHAR_DB.role` display label  
— check coverage against `ROLE_OVERRIDE`, since a character can look "covered" by its flavor `role`  
string while having no fixed-taxonomy tag at all. Every character keeps at least 1 Archetype tag and at  
least 1 real Role tag. If real Specialties genuinely don't map cleanly, flag it in the summary rather  
than forcing a fit.  
  
## 11. Hover-popup coverage  
  
`SKILL_LOOKUP` (from `EXACT_SKILLS`+`SKILL_KIT`+`INSIGHT_KIT`, verified sources take priority) +  
`TERM_GLOSSARY`, via `linkTerms()`, applied to every text field OUTSIDE the Skills/Portray/Insight  
dropdowns — Playstyle, tips, Current Meta notes, archetype primers, warn/upcoming notes, Team Builder  
playstyle text, the State Block round plan, and Portray `reason` text. Inside the Skills/Portray/Insight  
dropdowns, text stays plain with `colorizeSkillText()` color tags only, no hover. New entries get picked  
up automatically — spot-check a hover still renders after each batch, and specifically re-verify coverage  
inside the State Block output every run that touches `renderStateBlockPlan` (new fields there are exactly  
what tends to slip through un-linked).  
  
`linkTerms()` stamps both `data-term` (exact matched name, for re-lookup) and `data-tip` (plain fallback)  
on every `.skill-hover` span — keep both in sync if this function is ever touched again, since nested  
tooltip lookups depend on `data-term`.  
  
Cascade-pin tooltip architecture (`wireSkillTooltip()`, called once at the bottom of the script) is  
FINAL — see RUN_LOG for why the two earlier designs were rejected, don't regress to either:  
- Normal hover (pin mode off): one ephemeral floating tooltip (`#skill-tooltip-float`), auto-hides via a ~220ms grace-period timer on mouseout.  
- A single non-repeat Alt keydown (`e.repeat` explicitly ignored) turns on global pin mode: the open tooltip becomes a permanent pinned clone, and every subsequent `.skill-hover` hover — including one nested inside an already-pinned tooltip's own definition text — pins as its own independent clone (tracked in `pinnedEls`, keyed by source element).  
- Alt again, Escape, or a click outside every open tooltip clears pin mode and removes all pinned clones in one action.  
  
## 12. Character rebuild method (two-pass, mandatory)  
  
First pass transcribes every visible section. Second pass explicitly asks whether the page has a named  
expandable/button element (e.g. "Portray details") whose content wasn't already captured, re-fetching by  
name if so. Never conclude a section is "not available" without this second pass.  
  
Fetch-quality rules:  
- **Script-based fetch, not screenshot+OCR** (§0 token-efficiency rule) — pull the source page's real text/HTML via a script (WebFetch or headless-browser text extraction), never a screenshot passed through OCR. OCR costs far more tokens per page and is more error-prone on dense stat tables than parsing real text.  
- Ask for each rank/level/tier SEPARATELY — explicitly say not to combine numbers with slashes or summarize into a range.  
- A vague summary is not real per-level content — leave that section as a tracked gap rather than entering the summary as fact.  
- "Give me the COMPLETE verbatim transcription" can trigger a copyright refusal — ask more narrowly (one section, or "quote the numbers and short quotes so I can check my notes").  
- "Loading content..." means retry (transient), not "unavailable."  
- Markdown-paste artifacts to watch for when re-deriving from a pasted source: duplicated tier labels mid-paragraph, a 5-hash marker regex matching inside a 6-hash sub-heading (require exact-length hash runs, bounded both sides), sub-headings that are a real in-kit label (bracket them, e.g. `[Precognition]`, rather than silently stripping).  
  
A kit rework or patch change to an already-built character invalidates their existing `PORTRAY_DB`  
recommendation and any `PORTRAY_MECHANIC`/State-Block tags referencing them — re-derive, don't assume the  
old read still holds.  
  
## 13. Standing product requirements  
  
- Three filter groups, top to bottom, under the search bar: Element → Archetype → Roles. AND across groups, OR within a group. Element uses `ELEMENT_LIST`/`AFFLATUS_COLOR`/`AFFLATUS_MAP`.  
- Archive tab groups by primary archetype by default; flat deduped list when any filter is active.  
- Card dropdown order: Skills → Portray → Insight → Euphoria → warn/upcoming notes → Playstyle (last, Rotation as its last inner item).  
- All dropdown headers LEFT-aligned. A right-aligned header with the arrow stranded left means a specificity leak from `details.card summary`'s flex/space-between rule into nested `.exact-details summary` — out-specify it, don't reorder CSS.  
- The card's "at a glance" line does NOT show "Priority: ...". The tier still exists internally and drives the round planner, just isn't displayed.  
- Team Builder: each filled slot has a Portray-level selector (capped to that character's real `PORTRAY_DB` level count; honest "not sourced" note if none). State lives in `teamPortray[name]`, cleaned up on removal. Changing the selector must re-run `renderSteps()` — Portray changes must actually affect the State-Block output, not silently no-op.  
- Team Builder picker's "Characters" list is rarity-sorted (`sortByRarityAlpha`, descending, alpha within a tier) with a visual tier divider (`.pick-tier-divider`) inserted wherever the tier actually changes in the CURRENT filtered/searched list — never a divider for a tier with zero units currently showing, and none at all for characters with no confirmed `RARITY_MAP` entry.  
- **Team Builder tab vertical order (v80, layout-only — don't silently re-shuffle this on a future CSS pass):** slots/search → character picker grid → `.builder-mid-row` (`#synergy-box` + `#playstyle-box` side by side ≥820px, stacked below) → `#steps-box` (State-Block play-by-play) full-width at the bottom, with extra padding/margin so it has real breathing room. This was Benson's explicit ask ("give the play-by-play more space... resize the suggested play order and playstyle box between characters and the play-by-play") — pick order → suggested sequence/playstyle → full round-by-round sim.  
  
## 14. Verification (required before delivering)  
  
1. `node --check` on the extracted `<script>` — zero syntax errors.  
2. Playwright load, zero non-network console/page errors.  
3. Spot-check: archetype facts (§9), every character has valid Roles per `ROLE_OVERRIDE` (§10), hover tooltips render outside the three dropdowns (§11), newly-rebuilt/refreshed characters show real content in the correct dropdown order (§13), the 3-way filter still applies AND-across/OR-within correctly, Current Meta CN/Global toggle correctly filtered, Team Builder Portray selector populates/cleans up correctly AND actually changes the State-Block output when changed. Open every card at least once.  
4. Screenshot check, every run touching text or CSS: take an actual Playwright screenshot of a full expanded card and a sample State-Block simulation and look at them.  
  
## 15. Delivery  
  
- Never upload the full HTML directly to Drive. Always SendUserFile; tell Benson to save it himself.  
- Detailed summary, computed fresh per §5 (not copied from a prior run): characters rebuilt this run and why, Portray recommendations written and any reasoning that diverges from a naive read, State-Block/`PORTRAY_MECHANIC` tags added and for whom, any new Euphoria/character/archetype found and what was auto-added, Role-taxonomy-fit findings, actual current progress counts.  
- If nothing meaningful changed, say so plainly and briefly.  
  
## 16. Environment notes  
  
- reddit.com/old.reddit.com unreachable from this sandbox (403) — don't retry repeatedly; Discord/other fallbacks are still fair game.  
- Bilibili is frequently unreachable — always attempt first per §3, fall through when it fails, keep attempting in future runs.  
- Google Drive file downloads fail hard above ~6MB — ask Benson to re-save an oversized reference image smaller.  
- This scheduled task cannot update itself mid-run — `update_trigger` needs Benson's in-app approval when fired unattended; don't assume it took effect without his explicit confirmation. (It can be updated directly in an interactive session with Benson present, as happened 2026-08-22.)  
  
---  
  
## §17 Character Effect Layer (v79, 2026-08-20) — buffs/debuffs in the play-by-play  
  
### §17.0 The standing answer to "why isn't character X's buff casting?"  
`simulateStateBlockPlan` is a **resource** simulator (AP + Moxie + timed status NAMES). Before v79 an effect could only reach the play-by-play through three doors, and anything outside all three was invisible **by construction, not by oversight**:  
  
| Door | Mechanism | Reach |  
|---|---|---|  
| A | `sbExtractStatusGrants` regex | needs a **bracketed** `[Status]` **and** an explicit "for N rounds" |  
| B | `PORTRAY_MECHANIC` (4 chars) / `INSIGHT_MECHANIC` (80 chars) | only `moxie_on_entry`, `ap_plus_one_duration`, `ap_free` |  
| C | inline `if(charByName['X'])` branch | ~30 characters hardcoded |  
  
Semmelweis was the reported case: her *"then grants DMG Dealt +30% to all allies … for 2 rounds"* is **unbracketed**, so door A never saw it, she had no door-C branch, and her only tag was one `moxie_on_entry`. Nothing was broken — the door didn't exist. v79 adds it.  
  
### §17.1 The fourth door  
`sbExtractStatEffects(text)` reads percentage stat effects out of **structured, human-verified `SKILL_KIT` rank text and `INSIGHT_KIT` tier text** — the same trust level and the same "structured text, never freeform Portray prose" rule that `sbExtractStatusGrants` / `sbDetectApFreeWindow` / `sbDetectApPlusOneWindow` already operate under.  
  
- **Portray prose is still NOT parsed.** It stays verified-only via `PORTRAY_MECHANIC`, exactly as §8 requires. Do not change this.  
- Vocabulary lives in `STAT_EFFECT_VOCAB`. **Longest phrase first** — `DMG Taken Reduction` must be consumed before `DMG Taken` can match inside it. `invert:true` flips the sign so "Reduction +20%" becomes `dmgTaken -20%` and "Reduction -25%" becomes `dmgTaken +25%`. **Never a blanket `-abs()`** — that silently mis-signed Liang Yue's `[Guardian's Blessing]`.  
- Targets resolve via `sbResolveStatTarget`, **clause-scoped** (`sbStatClause`), preferring a scope phrase *after* the number. `"to N enemies"` is deliberately **absent** from `STAT_EFFECT_TARGETS`: that phrase names the *attack's* target, not the buff's. A wide window made Avgust's *"Deals 300% Mental DMG to 2 enemies … then grants DMG Dealt +10% to self and allies in front"* resolve to `enemies`. **Narrow or add a specific case; never widen** — same rule as `sbClassifyStatusTarget`.  
- `"an ally"` / `"the ally"` resolves to **`ally_single`**, not `allies_other`. Treating it as team-minus-caster over-applied Semmelweis's "+10% to the ally in the `[Fresh Blood]` status" to everyone at once.  
- **Status magnitudes**: for a status the timed extractor already tracked, the number is read from that status's own `terms` definition (`sbFindTermDef`) and inherits the holder and expiry **verbatim** from `sbClassifyStatusTarget`. This adds numbers without adding any new targeting risk.  
- **Entering-battle Insight grants** use `sbExtractBattleStartEffects`, which requires the "enters battle" phrase to be in the **same clause** as the percentage. Checking the whole tier was a real bug: Shamane's Insight I states a conditional per-stack attack bonus in sentence 1 and "When entering battle…" in sentence 2, so the +8% was imported as a permanent buff *and* mis-targeted onto the enemy.  
- **`sbPushBuff`, never `buffs.push`.** Recasting the same card must **extend** its buff, not add a copy — Semmelweis casting her Ultimate twice was showing `[Blood Domain]` as `DMG Taken -40%`.  
  
### §17.2 The honesty contract (`applied`)  
Every effect carries `applied`. `true` means a real code path consumes the number. `false` means it is **displayed but consumed by nothing**, and the play-by-play **must** render it with its `not simulated` marker *and a reason*. The UI never claims more than the code does.  
  
`sbEffectIsConsumed(stat, target)` is the single authority on what the math actually reads: **caster-side `dmgDealt` and enemy-side `dmgTaken`, and nothing else.** Therefore these are real, shown, and correctly not applied:  
- an **enemy `DMG Dealt` debuff** (Yenisei's "DMG Dealt -25% on the target hit") — no enemy damage output is modeled;  
- an **ally `DMG Taken` reduction** (Semmelweis's `[Blood Domain]` -20%) — defensive, no incoming-damage model;  
- `critRate` / `critDmg` / `penRate` / `incMight` — no crit roll, no penetration/DEF interaction.  
  
Reasons come from `STAT_TARGET_UNMODELED` (scope not modeled) and `STAT_NOT_CONSUMED_NOTE` (stat not consumed). Adding a key to either is enough to make something display-only with an explanation — **never leave a bare unexplained marker**.  
  
Effects whose target cannot be resolved are **dropped and counted** (`effectDropped`), never defaulted to a guess.  
  
`CHAR_EFFECT_OVERRIDE[char]["<source>||<stat>"]` is the hand-read correction table and always **wins** over the extractor (`drop`/`pct`/`target`/`rounds`/`applied`/`note`). Same verified-only standard as `PORTRAY_MECHANIC`.  
  
### §17.3 Damage model — scope boundary REVERSED, deliberately  
**The long-standing "no damage/HP/enemy-state tracking" boundary in §8 is superseded as of v79**, on Benson's explicit instruction ("create a damage model?" → "relative buff-stack model but with a default enemy HP bar? (configurable)"). **A future run must not revert this as an out-of-scope regression.**  
  
What is invented is exactly **two global, user-editable, on-screen-labeled knobs**: `referenceAtkSetting` (default 1000) and `enemyHpSetting` (default 30000). Everything that differs *between characters* — multipliers, buff percentages, targets, durations — is read from sourced kit text or left a visible gap, so §0.3's no-fabricated-per-character-number rule holds.  
  
Still **not** modeled, and stated on screen: per-character ATK, enemy DEF/RES, crit rolls, Afflatus advantage, penetration interaction, HP-conditional scaling. **One** enemy is modeled, so a mass attack hits it once. A skill whose text states no multiplier reads **"no multiplier sourced"** and contributes 0 — never a guessed number.  
  
- `ESTIMATED_MAX_HP` remains **barred from math** (§8). `enemyHpSetting` is its own separate knob that merely starts at the same ballpark.  
- `BUFF_STACK_MODE` (`'additive'`) is a **labeled ASSUMPTION about the real game**, not a verified rule. It is read inside `sbBuffTotal`, so flipping it to `'multiplicative'` changes the math in one place.  
- The widget strip beside Slot 1 stays **bare label + input** — §4 records it being corrected twice for carrying prose and then a calculator.  
- Changing either knob must re-run `renderSteps()` from round 1, same contract as the Portray selector.  
  
### §17.4 Bulk-pass confidence (read before citing coverage)  
The v79 pass covers all 131 characters because the extractor is generic — **it is not 131 hand-reads.** Kit text was read by hand for Semmelweis, Liang Yue, Sonetto, An-an Lee, Lorelei, Mercuria, Pickles, Avgust, Yenisei, Shamane, Medicine Pocket, Tooth Fairy, Regulus, Desert Flannel, Ezra, Barcarola, Moldir, Ms. NewBabel, Fatutu, Rubuska. Everything else is extractor output. Treat this exactly like the 126-character Portray batch: **written, not spot-checked.** Do not cite it as per-character verified confidence. Corrections belong in `CHAR_EFFECT_OVERRIDE`, one character at a time.
---

## §18 Portray & Insight readout (v0.2, 2026-08-24) — the Portray half of §17

### §18.0 The standing answer to "why isn't character X's PORTRAY showing up?"
§17.0 answered this for **buffs**. The same question about **Portrays** has a different answer, and
v0.2 is its fix.

A standard character's Portray reached the play-by-play through exactly ONE door:
`sbGetVerifiedMechanics`, reading `PORTRAY_MECHANIC`. That table covers **5 characters**
(Rhiannon, Flutterpage, Lorentz Butterfly, Cheng Heguang, Liang Yue). So for the other **126
characters holding 655 real, sourced `PORTRAY_DB` level entries**, moving the Team Builder's
Portray selector printed **nothing at all** in the play-by-play — not the level's text, not even a
"not simulated" marker. Invisible by construction, exactly like Semmelweis's unbracketed buff
before v79. Benson reported it as *"liang yue's P1 and P2 isn't showing up"*.

v78 had already solved this for **Conduit** characters by reading `c.portray.levels` /
`c.insightKit.tiers` straight off the real sourced data instead of routing through the tag table.
**v0.2 generalises that exact pattern to every character** via `sbPortrayReadout(c, lvl)`, rendered
as its own collapsible "What your Portray & Insight levels are doing" block in `#steps-box`.

### §18.1 What is and isn't claimed
Nothing here is fabricated: every line is verbatim `PORTRAY_DB` / `INSIGHT_KIT` text already in the
file. What is ADDED is §17.2's honesty contract applied to Portrays — each row says whether the
simulator actually consumes that level.

- **`PORTRAY_SIMULATED[name][level]`** is the single authority, and it is a **verified,
  hand-maintained table** (same standard as `PORTRAY_MECHANIC` / `ULT_HOLD_OVERRIDE` /
  `CHAR_EFFECT_OVERRIDE`), **never a heuristic**. Every entry names a real code path that reads
  `teamPortray`. **If you wire a new Portray level into the simulation, add it here in the same
  change** or the UI will under-claim what the code does.
- Anything without an entry renders with `PORTRAY_NOT_SIMULATED_NOTE`, which states the reason —
  never a bare unexplained marker (same rule as `STAT_TARGET_UNMODELED`).
- Conduit characters are **deliberately excluded** from this block: they already get the readout
  from the v78 path in `specialLines`, and including them would print every tier twice.
- It is its own **collapsed `<details>` block**, not more rows inside "Special conditions in
  effect" — a full team produces 30+ rows, which would bury the handful of genuinely-modeled
  conditions that box exists to highlight. The summary carries the modeled/total counts so the
  value is legible while collapsed.

### §18.2 Liang Yue P1 — half modeled, and the half that isn't is stated
P1 extends `[Qiangliang Complete]` **3 → 4 rounds** and grows the Spelldock enhancement section
**3 → 4 slots**. Only the duration is modelable here, and it is now real: that window is what
`Banish Evil` / `Bless Life` accrue Talons in, so it genuinely changes when `[Bane of All Evil]`
fires. Recorded as the **final value 4, not a +1 delta** (§4's double-count rule), so the
Ultimate's own "extends the duration by 3 rounds" re-grant inherits the P1 length.
The Spelldock half is **NOT** modeled — this tool has no Spelldock-position model at all (the same
gap that makes overlap-section Talon gain a flat +1 instead of 0.5/0.5) — and is surfaced to the
user as an explicit not-simulated sentence rather than silently dropped.

### §18.3 `linkTerms()` mis-link guards — narrow, never widen
Routing ~1000 rows of raw kit text through `linkTerms()` exposed a real pre-existing bug class:
`SKILL_NAME_RE` matches any `SKILL_LOOKUP` name of 4+ chars on a word boundary, so a SHORT skill
name that is a fragment of a LONGER in-kit term hijacked it. Liang Yue's `[Justice Talon]` was
linking the bare word "Justice" to an unrelated character's **mass-healing** skill — hovering a
Talon explained a heal. Three fixes, all **narrowing** (same standing rule as
`sbClassifyStatusTarget` / `sbResolveStatTarget`, §17.1):

1. **Bracket guard** — a match inside a `[...]` group must equal that group's ENTIRE contents to
   link. A bracket names exactly one thing; a partial match inside one is a fragment.
2. **Spelled-out-in-prose guard** — if the match starts a longer term **this same text brackets
   elsewhere**, and the prose continues with the rest of that term, it names the bracketed thing.
   Local evidence only; nothing is inferred from outside the string being linked.
3. **`SKILL_LINK_STOPLIST`** — `Insight I/II/III/IV` are section LABELS, not skill names. They
   leak into `SKILL_LOOKUP` and whichever character lands there first wins the key tool-wide; every
   prose mention of "Insight I" was popping up **Rubuska's** Shadow Friend text. They stay in
   `SKILL_LOOKUP` (an explicit `data-term` re-lookup still resolves) and are removed only from the
   auto-link regex. **Deliberately NOT stop-listed:** `Moxie`, whose lookup entry is a real and
   correct glossary definition, and `Justice`, a genuine skill name owned by two characters
   (A Knight, Dikke) — guards 1 and 2 handle the Talon case more narrowly.

Net effect: **66 mis-links suppressed** across 2,342 text fields; 3,366 → 3,300 links.

### §18.4 `STAT_EFFECT_VOCAB` widening — display only, verified by an unchanged `applied` count
Closes v79 open item #6. Added `Critical Resistance` / `Critical Resist` / `Critical DEF` /
`Reality DEF` / `Mental DEF` / `Healing Done`, each with its own `STAT_NOT_CONSUMED_NOTE`.
Characters producing **zero** stat effects fell **40 → 32**; effect instances shown rose
**1,166 → 1,408**.

**`sbEffectIsConsumed` was NOT touched and remains the single authority** on what the math reads
(caster `dmgDealt`, enemy `dmgTaken`). The proof this is display-only: the **`applied` count is
identical before and after at 423**. Any future vocabulary widening should be checked the same way
— if `applied` moves, the change was not display-only and needs re-justifying against §17.2.

---

## §19 The three long-standing blockers, unblocked (v0.3, 2026-08-24)

Benson: *"unblock them / ok fix it all"*. All three items that had been carried forward unchanged
since v75-v78 are now closed or materially advanced, plus the §10 Role gap.

### §19.0 Network reality in this environment — §16 is now WRONG in one specific way
§16 records "WebSearch is blocked." **That is no longer true.** Corrected standing:

- **WebSearch WORKS.** It is the only channel that reaches the network.
- **WebFetch does NOT** reach any game-data host. `prydwen.gg`, `blog.prydwen.gg`,
  `reverse1999.fandom.com` and `reverse1999-gnomon.pages.dev` all return
  `EGRESS_BLOCKED` from the egress proxy. Direct `curl` gets `403` on CONNECT.

**Consequence for §3's source hierarchy:** verbatim page transcription is currently IMPOSSIBLE.
A WebSearch result is a model-written summary of pages, not the page text §3 and §12 require.
So anything sourced this way is **one confidence notch below** kit text Benson pastes directly, and
must be labeled as such in the `source`/`note` field — never silently mixed in beside a verbatim
figure. **Two independent searches returning the same number** is the minimum bar used here. Retry
WebFetch on those hosts each run; the moment one is reachable, re-verify every number tagged this
way in §19.2.

### §19.1 The one thing genuinely still open, and why
**Conduit per-card math tested against a real match** cannot be closed by research at all — it needs
Benson to play rounds and compare. What v0.3 does instead is remove every *other* reason the numbers
could be wrong: the missing Harmonization values, the missing Energy cost, and the structural bug
below. The `⚠ Untested` disclaimer **stays**, and now names exactly which figures to doubt first.

### §19.2 What was actually missing (all sourced, all labeled)
- **The Twins' per-card Harmonization** — Atomic Fusion **+20**, Polymeric Ray **+10**, Extreme
  Overclocking **+20**, Balancé Across the Stars **+6**. Corroborated across two independent
  searches. **Caveat recorded in code:** the phrasing found was "*now* grant", and in the same
  source family "now deals" marked a **Portray 2** value — so these may be P2 figures, not the P0
  base. Applied flat at every Portray level because no per-level split was sourced.
  This also settles a mislabel: **Balancé Across the Stars is not a no-op card.** Its *Energy* delta
  is a confirmed real 0, but it grants Harmonization.
- **Polymeric Ray costs 3 Mineral Energy** (corroborated twice). Net **-3 +2 = -1** Energy. Before
  this, *no card in the entire Conduit catalog spent Energy except Coppélia's Finger Training.*
- **`[Interval Step]` and `[Instrument Tuning I]` are now real numeric state** — the third blocker.
  Interval Step: +1 per Energy an allied Conduit consumes, cap **30** at P0, each stack +1% Ultimate
  Might. The **stack count is real; the Ultimate Might is not simulated** (no Conduit damage model)
  — the same `applied` honesty split as §17.2. Instrument Tuning I: Coppélia's Ultimate grants **3**
  stacks, each cutting a later Instrument's Energy cost by **1**, **persisting across rounds**.
  This one **feeds the Energy math** — the first Conduit mechanic that changes a number rather than
  narrating one. Stacks are consumed only up to the actual bill, never burned on a larger discount.
  Her kit also gives the ally behind her 3 stacks; that ally is a standard character with no Energy
  pool here, so it is stated in the round note rather than tracked.

### §19.3 The real bug this uncovered — Conduit multi-cast
`simulateConduitPlan` read `overrideArr.find(...)`: **only the FIRST pick each round.** But
`renderConduitRounds`/`renderStateBlockPlan` have rendered a **"+ action"** button for Conduit
characters since v69, and `manualPlayOverride[key]` is an ARRAY for them exactly as for standard
characters — so every 2nd and later pick was accepted by the UI and **silently discarded**.

One cast per round is also wrong on the mechanics: **Conduit casts are AP-FREE**, so nothing rations
them the way the shared AP pool rations a standard character. And it is precisely what kept the
Energy economy inert — Energy **resets every round**, so a card with an Energy cost can only ever be
paid from Energy gained in that **same** round, which one-cast-per-round makes impossible.

Fixed: every pick is cast in array order. "Atomic Fusion (+5) then Polymeric Ray (-3)" now works as
the kit intends, and `[Interval Step]` accrues because Energy is finally being consumed. **Any future
Conduit work should check this pairing** — a per-round resource reset plus a one-action-per-round
loop silently disables every cost in the catalog.

### §19.4 Role taxonomy — §10 is now actually satisfied
**16 LIVE characters had no `ROLE_OVERRIDE` entry at all**, quietly violating §10's "every character
keeps at least 1 real Role tag" for an unknown number of runs. Invisible from the card UI because
`CHAR_DB.role` is free text and always non-empty — exactly the failure mode §5.5 warns about.

All 16 are now tagged, **derived not invented**: each maps that character's own already-sourced
`CHAR_DB.role` label, archetype tags and `SKILL_KIT` skill types onto the fixed 5-value list. Where
the source label used a non-taxonomy word the mapping is stated rather than silently forced —
`Tank → Shielder` (all four cases also carry the Shield archetype), `Debuffer`/`Buffer`/`Disruptor
→ Support`. No character was given `DPS` on a guess; only The Twins, whose own label already reads
"DPS (Conduit)". Current state: **130 `ROLE_OVERRIDE` entries, 0 live characters missing a Role,
0 out-of-taxonomy values.**

Note while there: **Cornerstone is `upcoming:false` in `CHAR_DB` but RUN_LOG records Benson
confirming she is not live yet.** Not changed unilaterally — flagged for him to settle.
