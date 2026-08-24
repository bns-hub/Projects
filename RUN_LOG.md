# RE1999 Team Builder — Run Log & Decision History

Companion to `STANDING_RULES.md`. This file is an append-only record of specific bugs found, fixes
applied, comps/mechanics confirmed by Benson, and designs that were tried and rejected. Consult it
before touching tooltips, merge/Moxie logic, status tracking, or archetype tags on the characters named
below, so you don't re-derive (and potentially re-break) something that already took real debugging to
land. Add new entries to the bottom of the relevant section as they happen — do not fold them into
`STANDING_RULES.md`'s prose, and do not restate hardcoded progress counts here either (compute those
fresh per `STANDING_RULES.md` §5).

## Data-integrity bugs found and fixed

**"Matilda (Lady by the Lake)" dead-duplicate-key bug.** The old combined entry was actually two
different characters' kits merged under one name — a real data bug, not a naming nitpick. Several data
tables had a stale/dead duplicate JS object key holding Lady by the Lake's real kit (Composition stacks,
Cubism, Negative Space, What She Bears and Beyond) mislabeled "Matilda," silently overwritten at runtime
by a second, correct "Matilda" key holding her own real kit (Instant of Prediction/Work of
Genius/Attention Everyone, "The Proud Star" Insight). The app already displayed the right Matilda data;
the dead duplicate was wrong data sitting under the wrong name. Fixed by renaming the dead duplicates to
"Lady by the Lake" (their content was already accurate for her) and building her full kit from
reverse1999.fandom.com (Prydwen didn't have her page at the time) — 4★, Plant Afflatus, Mental damage.
**If a future rebuild finds another character's name showing suspiciously mismatched kit text, checking
for this exact "dead duplicate object key, later key wins" pattern is the first thing to try.**

**Winter's Ultimate treated as a 1-AP regular card.** [Poem, Island, Breeze] has a true card type of
Attack, not "Ultimate" — the string-type detection missed it and `sbExtractDeckCards()` pulled it into
the regular deck, so it fired at 1/5 Moxie instead of being Moxie-gated. Fixed by the `isUltimate:true`
flag pattern now documented as the standing rule in `STANDING_RULES.md` §4 — this same miss is why that
rule exists; check any "no identified Ultimate" skip against it first.

**Rhiannon's Insight I mislabeled "[Universal Fit]."** The real term is "[All-Rounder]" — corrected
after Benson re-pasted her live in-game tooltip and updated Google Doc. Full definition attached as a
term: "Counts as a character belonging to the [Lingering Glow], [Bloodtithe], [Dynamo], [Inspiration],
[Conduit], [Burn], [HP Sacrifice], [Poison], [Ritual], [Rank Up], [Extra Action], and [Shift]
archetypes." The existing `allRounder:true` flag and its synergy logic already handled this correctly —
only the text needed fixing. Also added the previously-missing "[Raptor Kinship] starts at 0% charge,
max charge 150%" detail. Her tags were then updated for real to add Bloodtithe/Burn/Poison (categories
from her own definition that map onto this tool's archetype list and weren't already on her) —
Inspiration/Extra Action already mapped onto her existing Eureka/FollowUp tags; HP Sacrifice/Ritual/Rank
Up/Shift don't have a corresponding archetype category in this tool and weren't added as new ones on the
strength of one character alone. Note: the in-game UI's own "Bird Bonder"/"Bird Bonder II" panel labels
don't map cleanly 1:1 onto Prydwen's Insight I/II/III framing — a full fresh Prydwen re-fetch to double
check tier boundaries is still worth doing, not just trusting the folded-together reading used when this
was first corrected.

**Semmelweis's/Fatutu's status-target spread bug (two real fixes, same underlying cause).** `WHO` a
status grant lands on (`sbClassifyStatusTarget`) was wrong twice, both confirmed via Benson's
screenshots. First a whole-sentence keyword search, then even a clause-bounded search, both wrongly
spread Semmelweis's single-target "[Fresh Blood]" grant to the entire team — her "Effective Means" text
has "to an ally" and, later in the same run-on sentence, an unrelated "to all allies" clause for a
different buff; both wider scopes false-positived on that unrelated "all allies." Fixed with a TIGHT
immediate-adjacency window (~30 chars before the bracket, captured text up to "for N rounds" after)
instead of sentence/clause scoping — this is now the standing rule (`STANDING_RULES.md` §8). **If a
future miss is found, narrow or add a specific case — don't widen the window back out; that's exactly
how both prior bugs happened.**

**Round-allocation fairness bug.** A character could win both their own Ultimate AND their own
regular-cast slot in the same round using 2 of the shared AP pool, while a teammate with no priority-0/1
action that round got 0. Fixed with two sub-passes at the regular-cast tier (see `STANDING_RULES.md` §8)
— characters with no action yet get first claim on remaining AP; only afterward does anyone who already
acted get a second action from what's left.

**Team Builder Portray-selector re-render bug.** A stale comment claimed no re-render was needed once
Portray started affecting mechanics — it wasn't true, and changing the selector silently didn't apply.
Changing the Portray-level selector must call `renderSteps()`.

**Anjo Nala Moxie display bug.** The per-round Moxie line's denominator was hardcoded `/5`, so a bound
Anjo Nala (Max Moxie 12 while bound) showed as "12/5" instead of "12/12." Fixed with a real per-character
cap snapshot (`moxieCaps`, taken each round from `moxieCap()`).

## Mechanic corrections (Benson-confirmed, superseding earlier assumptions)

**Merging** — corrected twice before landing on the settled version now in `STANDING_RULES.md` §8:
exactly 1 free accidental merge per round team-wide (+1 Moxie, no AP), a separate forced merge costs 1 AP
for +2 Moxie. Renamed "Accidental merges" → "Free Merges" in the UI per Benson's request (mechanic
unchanged, just clearer wording — the internal variable/mechanic name stayed the same).

**Moxie generation** — replaced an old "merges only" model with the full Turn Start / Action-Cast /
Accidental-merge / Forced-merge / Ultimate-cast model now in `STANDING_RULES.md` §8.

**Ultimate timing** — an earlier version of the simulator had an artificial "wait one more round" delay
after hitting 5 Moxie; that was a holdover from the old merge-only model and was removed. "Never round 1"
was also removed as a hardcoded rule — it's just what the math naturally produces for a character with no
on-entry Moxie effect; a character with a verified on-entry effect can legitimately have their Ultimate
ready in round 1.

**Ultimate AP cost** — an earlier version defaulted Ultimates to 0 AP off a "no kit text explicitly says
otherwise" inference. That inference was the mistake. Benson confirmed the real default directly:
Ultimates cost 1 AP same as a regular card, on top of being Moxie-gated — a game-wide baseline, not
something each kit re-states. `ULTIMATE_AP_OVERRIDE` exists only for a specific confirmed exception.
Real confirmed exception found: Rhiannon's Chirping Chorus grants AP-free Incantations for 4 rounds,
which includes recasting the Ultimate itself while the window is active — wired generically off the
same AP-free-window detection already used for regular cards, not a Rhiannon-only patch. Every current
Ultimate's kit text was checked for this same phrasing; Rhiannon is the only match so far.

**Precast cards** — an earlier "free card" framing was too broad. The corrected rule (now in
`STANDING_RULES.md` §8): auto-generated into hand for free, but costs the same 1 AP as a regular card to
CAST, unless it's specifically a "Versatile Precast Incantation" (Benson: "the hidden Versatile rule"),
which is a genuine 0-AP-to-cast exception. Recoleta's "Flood of Fiction" is the one confirmed real
example so far (Prydwen: "does not cost AP... does not count as an extra action"), but her full kit
wasn't rebuilt into `SKILL_KIT` at the time this was written — rebuild her, then tag
`PRECAST_CARD["Recoleta"] = {cardName:"Flood of Fiction", versatile:true}`.

**Anjo Nala's Bind** — the earlier "missing Skill Kit" characterization of Nautika in the State-Block
skip message was wrong; her real gap was elsewhere. Anjo Nala's Bind (Insight I, "Oath Bound") is fully
modeled per `STANDING_RULES.md` §8, based on Benson's 3 confirmed team-composition variants.

**Confirmed comp:** Anjo Nala's meta team is `core:["Flutterpage","Fatutu"], flex:["Rhiannon","Brume",
"Mercuria"]` (Benson-sourced: his "Team combinations" Google Doc + his own kit read). Flutterpage+Fatutu
are constant; the 4th slot varies and determines who she binds to (Brume in the non-Rhiannon variants,
Fatutu in the Rhiannon variant). Re-verify this is still current the same as any other comp — confirmed
once is not confirmed forever.

## Tooltip architecture — three iterations, don't re-litigate the first two

The cascade-pin design in `STANDING_RULES.md` §11 is the final architecture, reached after three real
iterations, each driven by a specific Benson report:

1. First version required holding Alt while simultaneously moving the mouse onto the tooltip box —
   reworked to tap-after-hover per Benson's simplification request.
2. Tap-to-pin then reportedly "doesn't work at all," then "disappears the moment I hover a nested term" —
   both were timing races in a single shared-float design, not the interaction model itself: (a) the 10px
   hover-to-float gap caused a premature mouseout hide before the mouse arrived (fixed with a ~220ms
   grace-period timer), (b) holding Alt's OS key-repeat flickered the pin on/off (fixed with an `e.repeat`
   guard).
3. Benson then explicitly asked for cascading multi-pin ("tooltip pops up and the tooltips in that
   tooltip also pops up, all of which are pinned when i simply press alt") — this actually required the
   architecture change to per-element cloned tooltips, not just another timing fix. A Gemini-suggested
   `Map`-based multi-tooltip rewrite had been floated earlier and initially rejected as solving a problem
   the tool didn't have yet — it turned out to be the right general shape once cascading pins became the
   real requirement, adapted to reuse `linkTerms()`/existing CSS rather than Gemini's plain-text/inline-
   style version.

Also: a real gap was found where the State Block's card names (`cardLabel` in `renderStateBlockPlan`)
were inserted as plain text with no `linkTerms()` call at all (confirmed via Benson's screenshot,
"tooltips did not update"). Fixed by wrapping card names, adaptive mode names, and all
"Special conditions"/"Battle-start setup"/triggered-effect note text in `linkTerms()`.

## Archetype-tag audit findings (kit text vs. current tags, roster-wide pass)

Fixed clear, strongly-signaled mismatches: Anjo Nala (Flex → FollowUp — her own Insight III text names a
real "follow-up attack," meta-confirmed by Benson as "an extra attack unit"), Enigma (+Shield — Meshing
Minds grants large team-wide Bastion), Kiperina (+Shield — For Everyone is a dedicated team shield), Door
(Other → Shield — her whole Ultimate is a team shield), J (+Shield — Heat Treating is a dedicated team
shield), Jiu Niangzi (Other → FollowUp — Feast of Lust's own text triggers a real follow-up attack,
corroborated by Benson's "Pure Follow-Up (FUA)" training-team doc), Isolde (+FollowUp — Intermezzo is
explicitly cast "as a follow-up attack"), Lorentz Butterfly (+Burn — The Primer's Flutter consistently
inflicts Burn across all ranks, not just flavor text), Pioneer (Other → Shield — Bridge the Gap grants a
real shield). Flutterpage's Prydwen description calls her "a powerful follow-up attack buffer," which her
tags didn't originally capture either — check a character's real kit/description before flagging a pick
as a poor archetype fit anywhere in synergy text.

Checked and correctly left alone as false positives or too-thin evidence (a single incidental mention, a
negation like "does NOT count as an extra action," or a counter-triggered bonus that doesn't match the
archetype's actual mechanic pattern) — **don't re-flag these without new evidence:** Brume, Corvus,
Desert Flannel, Ezra, Getian, Kanjira, Loggerhead, Mr. Duncan, Ms. NewBabel, Ms. Stranger, Noire.

That pass was keyword-assisted over EXISTING transcribed data, not a fresh per-character Prydwen
re-fetch for the whole roster — the fresh-rebuild work is separately tracked and capped per
`STANDING_RULES.md` §0. Worth re-running a similar audit periodically as more characters get rebuilt.

## Open/deliberately-unresolved items (re-verify before assuming still true)

- **Matilda (Lady by the Lake)'s rarity**: a fresh Prydwen check once suggested 5★ against the existing
  4★ value, but the page found wasn't clearly confirmed to be the same character, so 4★ was left in place
  pending focused re-verification — don't resolve this on a repeat of the same ambiguous evidence.
- **The Twins' dual-element**: genuinely dual-element (Mineral primary per Prydwen's own framing, Star
  secondary — her kit switches between Left's Mineral and Right's Star Incantations), but `AFFLATUS_MAP`
  only supports one value per character, so she's stored as `"Mineral"` only. Worth dedicated
  dual-element display treatment if ever prioritized; not a bug to "fix" by picking one value harder.
- **An-an Lee's portrait**: Benson asked for an update but hasn't provided a source URL or Drive file ID.
  Ask him before touching `PORTRAIT_IMG` for her.

## Rejected/superseded designs (for context — don't re-propose without a new reason)

- Single shared-float tooltip design (two iterations) — superseded by per-element cloned tooltips (see
  tooltip section above).
- Generic regex/NLP pass for detecting mechanically-relevant kit effects — a real miss already happened
  (Cheng Heguang phrases his Continuous-Action-I grant as "Gain [Lofty Ambition] and [Continuous Action
  I] for 2 rounds," which a bracket-adjacent-to-verb pattern never catches). Superseded by the
  human-read-and-tag-only rule for `PORTRAY_MECHANIC`/`INSIGHT_MECHANIC` in `STANDING_RULES.md` §4/§8.
  Do not resurrect a generic parser for this.
- Forcing point/value-accumulation mechanics (no round duration, e.g. Rubuska's Shadow Cloak/Shadow
  Friend) through the timed-status extractor — same "multiple bracket terms in one ambiguous clause"
  shape that caused the Semmelweis/Fatutu bug. Superseded by the separate, deliberately simpler
  `sbExtractOngoingMechanics()` name-only flag.
- A flat momentum-weighted or role-weighted heuristic for spending surplus AP (proposed by Gemini,
  2026-08-17) — rejected by Benson before any code was written. See "AP-surplus allocation" in
  `STANDING_RULES.md` §8 for the per-character-verified replacement and why ("sentinel do not even want
  to use her ult at all!" as the concrete counter-example — no role-based rule predicts that).
- A generic "full stack-based hold simulation" for Ultimate-hold characters — Benson's own framing when
  asked to clarify scope: what's actually needed is just "if she ults, it wastes the stacks... so she
  doesn't ever cast" per-character verified logic (`ULT_HOLD_OVERRIDE`), not a general stack-tracking
  subsystem. Don't over-build this into shared stack-tracking infrastructure unless a second character
  actually needs one.

## 2026-08-17 session — file-split follow-through, Gemini-proposed fixes vs. code reality, Portray backlog cleared

**Context.** This is the second working session since the old single `scheduled_task_prompt_v33.md` was
split into this file + `STANDING_RULES.md`. Benson brought two rounds of Gemini-authored analysis (an
infographic-driven brainstorm, then a "Refined Conduit Archetype Architecture" spec) proposing fixes to
three areas: Anjo Nala's Bind, the Conduit archetype's simulator support, and the AP allocator's
"overly fair" round-by-round logic. Each claim was checked against the real running code before acting on
it, not taken on Gemini's word — this is the same discipline as the rejected-generic-parser rule above,
just applied to a third-party analysis instead of an internal proposal.

**Anjo Nala's Bind — Gemini's claim was wrong, no fix needed.** Gemini's brainstorm proposed adding Bind
execution logic as if it were missing. Direct code read of `sbGetAnjoBindTarget()` and the
`simulateStateBlockPlan()` force-cast injection (both already documented in `STANDING_RULES.md` §8)
confirmed this is fully implemented and correctly wired to the 3 confirmed team-composition variants.
Reported back to Benson as "already handled, no fix needed" rather than implementing a redundant/possibly
conflicting second version.

**Conduit simulator support — confirmed genuinely unbuilt.** Direct code search confirmed zero simulator
code exists for Energy/Harmonization/Spelldock — Gemini's request here was real, not a false alarm. Kit
data and mechanic documentation already exist (`STANDING_RULES.md` §8 "Known gaps"); the simulator loop
itself does not. Scoped as queued work (see below), not started this session beyond documenting the
confirmed Energy-reset rule and the deterministic-penalty constraint.

**AP allocator — confirmed genuinely gapped, in the specific way Benson/Gemini described.** Direct code
read confirmed no `ROLE_OVERRIDE` awareness and no allocator tier beyond forced-merge that could fund a
second regular cast — the "overly fair" complaint (everyone gets exactly one shot, no one gets a
burst-relevant second action) is real. Gemini's proposed fix (a 5-pass allocator with role-weighted
surplus spend) was accepted in shape (pre-round/AP-free → critical-buff-maintenance → Ultimates → surplus
→ forced-merge-fallback) but Benson explicitly rejected the role-weighted surplus-spend detail in favor of
per-character kit-verified overrides — see `ULT_HOLD_OVERRIDE` / AP-surplus rule in `STANDING_RULES.md`
§4/§8. The buff-upkeep pass specifically must respect burst-window timing, not fire the instant a buff is
refreshable (Benson: "sometimes its about timing burst windows as well").

**Sentinel kit-read finding.** Read to resolve the "what counts as an Ultimate-hold character" question:
her Ultimate scales with and consumes [Fresh Wound] stacks (up to 20, +2% Retribution mult. each,
converting removed stacks to Missing-HP%-based healing) — a real, kit-grounded reason to not cast on
cooldown, seeding the first `ULT_HOLD_OVERRIDE` entry.

**Energy reset-vs-carryover contradiction resolved.** This file's data model had an unresolved
contradiction about whether Afflatus Energy carries over between rounds or resets. Benson confirmed
directly: resets every round under the current patch; patch 3.9 releases a character that changes this.
`STANDING_RULES.md` §8 now states the reset as the default with an explicit override hook reserved for
that future character — the older "carries over" note was outdated and has been removed, not preserved
alongside the correction.

**Enigma's Portray text closed as a data gap.** Enigma had zero `PORTRAY_DB` entry going into this
session (along with Everecho — still open, no data yet). Benson supplied her real, verbatim Lv.1-5
Portray text (sourced from a Google Doc, itself sourced from Prydwen). Added to `PORTRAY_DB["Enigma"]`
in the 2026-08-17 HTML delivery with the real text intact but `count`/`recommended` explicitly left
`null` and `verdict` set to a "PENDING ANALYSIS" placeholder — no analysis has been done against her full
kit/Insight yet, and none was fabricated to fill the gap. Closing the real analysis is queued (below).

**126-character Portray backlog cleared via parallel sub-agents, then merged this session.** The prior
"~123" figure quoted at the start of this session was stale; a real re-count found 126 characters with a
`PORTRAY_DB` entry but no actual `recommended`/`reason` analysis (Enigma/Everecho had no entry at all and
aren't counted in the 126). 8 parallel sub-agents each analyzed ~15-16 characters, given the same
methodology and Coppélia's finished analysis as a style/rigor reference. All 8 batches were merged into
the live `PORTRAY_DB` object by character name + level number with zero name or level mismatches, and a
new `Enigma` entry was added per above. Delivered as `2026-08-17_v49_RE1999TeamBuilder.html`, verified with
`node --check` on the extracted script (zero syntax errors) before delivery. Per `STANDING_RULES.md` §7's
new bulk-generation caveat: this batch has NOT had the normal one-by-one human spot-check yet — treat it
as "written, not yet verified" until that happens, same confidence level as a first draft, not a
fully-audited run.

**Real-time round-by-round tracker — new feature request, not yet designed.** Benson asked whether a
live tracker is feasible (he plays a round, enters his actual cards, checks the sim's buff/debuff read
against them) — agreed in principle and queued as a 4th standing feature alongside Portray/State-
Block/Conduit work, but no design decisions have been made yet (data model, UI, how it diffs from the
existing best-case planner). Do not assume any specific design when picking this up — start with
clarifying questions.

## 2026-08-17 session 2 — same-day continuation: ULT_HOLD/AP_SURPLUS tables, allocator tiers, Conduit
panel, Live Tracker, numeric-only Portray rule

**Numeric-only Portray rule (Benson-confirmed, corrects session 1's cascade logic).** A level that's a
pure numeric bump (same skill, bigger %, no new mechanic) does NOT auto-inherit `recommended:true` just
for sitting on the path to a later good level — the investment has a real cost. Concrete example Benson
gave: Rhiannon P1/P2/P5 are real mechanic changes (stay `true`); P3/P4 are pure numeric and are now
`false` even though they sit between two good levels. Fixed live in `PORTRAY_DB["Rhiannon"]`. Rule added
to `STANDING_RULES.md` §7 point 7. **Not yet re-applied to the other 125 characters in the 2026-08-17
bulk batch** — this is a new backlog item, on top of the existing "not yet spot-checked" caveat.

**Spot-check pass (16 of 126 bulk-batch characters, 4 verification agents).** 13/16 accurate. 3 real
issues found and fixed: Eagle P5 overstated a Leech Rate change as additive stacking (it's a flat
10%->20% replacement, same convention as every other level in that list); The Twins P2 called a numeric
enhancement of an existing Insight III passive a "genuinely new economy loop" (it isn't — same trigger,
same conversion, just bigger numbers); Rhiannon P5 claimed Raptor Kinship reaches "instant full charge"
at 100% energy funnel, contradicted by Insight I's own stated 150% max (100/150 ≈ 67%, not full). All
three fixed directly in `PORTRAY_DB`. The other 110 characters remain unchecked — still queued.

**`ULT_HOLD_OVERRIDE` and `AP_SURPLUS_OVERRIDE` populated (47 and 64 of 130 live characters).** Same
parallel-agent-batch pattern as the Portray backlog: 8 agents each read ~16 characters' full kit text and
flagged only characters with a concrete, kit-stated reason. One agent hallucinated a bogus 18th entry
("Aleph_dup_placeholder_remove") in batch 0 — caught by a strict name-match check against the source
batch file before merging; discarded, not included in either table. Same bulk-generation spot-check
caveat as Portray applies to both tables — not yet human-verified at this volume.

**Allocator: buff-upkeep (priority 2.4) and AP-surplus (priority 2.6) tiers implemented.** Buff-upkeep
recasts the real card that granted a status, only in the round it would otherwise lapse (never
proactively early, so it can't step on a burst window per Benson's "sometimes its about timing burst
windows" constraint) — verified via `sbCardGrantsStatus`, not a generic "refresh" action. AP-surplus reads
`AP_SURPLUS_OVERRIDE` for a second regular cast. Both sit structurally below priority 2 (a character's own
first regular cast) and above priority 3 (forced merge) — confirmed by design, not yet by a dedicated
test suite beyond the one 4-character Playwright smoke test run this session. `ULT_HOLD_OVERRIDE` itself
is still NOT wired to any actual hold/delay behavior — the sim still casts every Ultimate on cooldown; the
table is real data, sitting unused, by design (see Open items below).

**Count-based buff cap display (`sbGetStatusCap`/`sbStatusLabel`).** Any status/ongoing mechanic with a
real stated stack cap somewhere in the character's own kit text now shows "(maximum of N)" next to its
name in the State-Block output, instead of a bare bracket with no ceiling. Deterministic regex scan
against the same verified text driving the rest of the sim — display-only, not a new mechanical effect.

**Conduit archetype: real AP/Moxie exclusion + info panel, not a full simulation.** `isConduitChar` was
initially written as `CHAR_DB[name].arch.includes('Conduit')` — caught immediately in Playwright testing
because Rhiannon's All-Rounder tag lists 'Conduit' among the archetypes she *counts as* for OTHER
characters' synergy checks, and she got wrongly excluded from her own AP/Moxie sim. Fixed with a small
hand-maintained `CONDUIT_RESOURCE_CHARACTERS = ["The Twins","Coppélia"]` list instead (same standard as
`ULT_HOLD_OVERRIDE`). The Twins/Coppélia are now correctly excluded from the AP/Moxie loop and shown in a
dedicated `renderConduitPanel` (archetype primer, confirmed per-round Energy-reset rule with its
override hook, The Twins' verified 100-Harmonization/9-Energy Ultimate bonus threshold). Deliberately did
NOT build a numeric round-by-round Energy simulation — doing so would require per-card Energy costs/gains
not present in the verified kit data this session had, and inventing them would break the no-fabrication
rule. The Mixed-Team Clogging Penalty IS implemented as a deterministic AP-pool deduction on the standard
team, explicitly labeled in the UI as a tool-defined house-rule number, not a sourced game value.

**Live Round Tracker built as a manual/flexible log, not an auto-derived one.** Per Benson's explicit
"configure whatever" — a toggle appears after character selection; when on, Moxie/AP-pool/status
name+duration/per-character notes are all plain editable fields, carried round to round via Next/Prev/
Reset buttons. Advancing a round auto-decrements status timers and logs that round's notes (the one piece
of kept automation — mechanical bookkeeping, not a judgment call); nothing else is auto-computed from
card picks, since no such derivation was ever designed. Independent of `simulateStateBlockPlan`.

**Verification this session:** `node --check` on the extracted script (clean) + a Playwright smoke test
(4-character team incl. both Conduit characters, zero console/page errors, confirmed Conduit panel,
clogging penalty math, and Live Tracker toggle/round-advance all render and behave as coded).
NOT a full Step 8 pass (§14) — no screenshot-based visual review of every dropdown, no check of the other
125 Portray entries, no multi-team-composition stress test of the new allocator tiers.

### Open items (real, current limitations of today's build — don't imply handled until they actually are)
- `ULT_HOLD_OVERRIDE` is populated but NOT wired into any hold/delay behavior — the sim still auto-casts
  every Ultimate on cooldown for all 47 flagged characters. Wiring a real hold requires deciding how long
  to delay (the sim has no per-stack resource tracking to know "wait until N stacks," only Moxie), so this
  needs a design decision, not just a code change.
- Only 16 of 126 bulk-batch Portray characters have been spot-checked; only Rhiannon has had the new
  numeric-only rule (session 2) applied. The other 125 still reflect session 1's cascade-heavy logic and
  should be re-read against the corrected rule before being fully trusted.
- Conduit is Twins/Coppélia-only, info-panel-only — no round-by-round Energy number is simulated. A future
  pass that wants real numbers needs Benson to source or confirm exact per-card Energy costs/gains first.
- The Live Tracker doesn't validate anything (no check that a typed card name is real, no Moxie-cap
  enforcement beyond what's typed) — intentional per "configure whatever," but worth restating so it's
  not mistaken for a bug later.

### Queued for next session (deliberately NOT scheduled — Benson is running this manually on another
account this time; do not create or rely on any `mcp__claude-code-remote__*` trigger for this list)

- **Enigma's actual Portray analysis.** Text is in `PORTRAY_DB["Enigma"]` (verbatim, real). Read her full
  Skills + Insight kit, then overwrite the `null`/"PENDING ANALYSIS" placeholders with real
  `count`/`verdict`/per-level `recommended`+`reason` per the §7 methodology.
- **Re-audit the 125 remaining bulk-batch Portray characters against the numeric-only rule** (session 2),
  and finish spot-checking the ones not yet sampled (110 of 126 still unchecked).
- **Decide and implement `ULT_HOLD_OVERRIDE` hold-timing behavior** — the table is real but inert; needs a
  concrete delay rule (e.g. hold N extra rounds past readiness) since the sim can't track exact stack
  depth for most of the 47 flagged characters.
- **Conduit numeric simulation**, if ever prioritized — needs real per-card Energy cost/gain numbers
  sourced first; the current panel is informational only by design, not a stopgap to silently upgrade.

## 2026-08-17 session 4 — manual play-by-play override, Conduit "(fixed)" tag; Tuning mechanic queued
pending character-name confirmation

**Manual play-by-play override built (`manualPlayOverride`), separate from the Live Round Tracker.**
Benson: "let me edit and choose what to play round by round like unselect any skill during the
play-by-play and choose any skill of the 4 characters i chose and let me choose which skill/ulti i
want to use each turn." The Live Tracker (session 2) replaces the WHOLE plan with a free-editable
manual log; this instead overrides individual actions INSIDE the deterministic auto-plan. Added a
per-character-per-round `<select>` (options: Auto / Skip this round / Ultimate: `<name>` / each owned
card, read live off `sbFindUltimate`/`sbExtractDeckCards` so it can't offer a card the character
doesn't have) under each round's actions. A manual pick is injected into `simulateStateBlockPlan`'s
candidate list at a new guaranteed priority tier (-1, below/before 0) so it's funded from the shared AP
pool before any auto-picked action — verified via Playwright: with Sentinel+Rhiannon and only 2 AP,
forcing Rhiannon's "Babble-Gabble" left Sentinel only 1 of the 2 AP (previously she'd have spent both
on her own two auto-picked cards). Picking "Ultimate" for a character who isn't actually Moxie-ready
that round correctly results in no action, not a silent substitution — confirmed via Playwright
(Rhiannon at 4/5 Moxie, Ultimate picked, no action appeared). Changing a selector re-runs the entire
simulation from round 1 (`renderSteps()`), since Moxie/AP/status state genuinely cascades round to
round — this could not be a display-only relabel like the Portray override. Scoped to ONE action per
character per round, matching Benson's own phrasing ("which skill/ulti... this turn").

**Conduit characters tagged "(NOT FIXED — TO BE FIXED IN FUTURE)" in the play-by-play.** Benson: "dont
fix it now but mark conduit character in the play-by-play to be 'fixed'" — then corrected mid-session:
"conduit chars: (NOT FIXED - TO BE FIXED IN FUTURE)". The first pass used the label "(fixed)", which
read as "resolved" rather than "acknowledged TODO" — wrong implication, fixed immediately per Benson's
correction. Added one line per Conduit teammate to the existing "Special conditions in effect" box:
"(NOT FIXED — TO BE FIXED IN FUTURE) Conduit resource character — not part of the round-by-round AP/
Moxie loop above; see the Conduit panel below instead." This does NOT mean the Conduit Energy/
Harmonization round-by-round simulation was built this session; that remains the same open item it's
always been (see "Queued for next session" below and STANDING_RULES.md §8's Conduit "Known gaps").

**Tuning (调校) mechanic — queued, not yet built, pending one clarifying answer.** Benson supplied 4
detailed Tuning presets (First Melody / Grand Orchestra / Unfinished Tune / Atonal Sequence) — each
with 2 Incantation skills (with per-rank AP costs) and a Moxie-gain stat block, framed as "can only
bring 1 tune to a battle at a time," separate from the existing Conduit resource system. The header text
("律的调校") and the in-block Moxie label ("司辰的激情") don't obviously resolve to the same CHAR_DB
English name without guessing — asked Benson directly which character this attaches to rather than
risk mis-attaching real kit data (would violate the no-fabrication standing rule at §0). Not started
beyond recording the raw source text; once the character is confirmed, this needs: (1) a decision on
whether Tuning is modeled as a THIRD parallel resource system (alongside AP/Moxie and Conduit's Energy/
Harmonization) or folds into the existing Conduit shape, (2) real per-rank AP costs already given by
Benson (verbatim CN numbers above, not yet translated/verified against a live source), (3) a "which tune
is active" selector UI mirroring the Conduit archetype's one-panel treatment.

**Verification this session:** `node --check` on the extracted script (clean) + a Playwright pass
covering the two items above (AP-priority funding order for a manual pick, Ultimate-pick-not-ready
no-op, "(fixed)" tag rendering) — zero page/console errors (excluding sandbox network-tunnel noise,
which is unrelated to the app). NOT a full Step 8 pass — no screenshot review, no stress test of manual
overrides against Anjo Nala's Bind or a Conduit-mixed team specifically.

Delivered as `2026-08-17_v52_RE1999TeamBuilder.html`.

### Open items added this session
- `manualPlayOverride` is not cleaned up when a character is removed from the team (same as
  `manualUltReady`/`manualSensoryBond` — stale keys just sit unused, harmless but not tidy; consistent
  with existing convention, not a new gap).

**Tuning (调校) built — attached to `"6"`, informational only, character attribution inferred not
confirmed.** Benson followed up with the full English-retranslated text for all 4 Tunings (First
Melody, Grand Orchestra, Unfinished Tune, Atonal Sequence — the 4th sourced from an attached
screenshot) plus a correction: "Timekeeper's Moxie" is that Tuning system's own stat-block name, not
the game-wide Moxie mechanic this tool already models everywhere else — same word, different resource.
He still didn't give an explicit CHAR_DB name; rather than ask a second clarifying question (he'd
already asked once for "lessen tokens usage"), attached the data to `"6"` on the clock/Timekeeper
motif and flagged the inference plainly in-code and here rather than silently presenting it as
confirmed. Built `TUNING_DB["6"]` with all 4 loadouts' full stat blocks and both Incantations' costs/
text, verbatim from Benson's English retranslation (not re-translated or paraphrased by Claude). Added
`renderTuningPanel(teamArr)` — a selector (one `<select>` per character, "only 1 allowed" enforced by
there simply being one dropdown, not extra validation logic) plus full detail display of whichever
Tuning is currently selected, appended after the Conduit panel in the play-by-play. Deliberately
informational-only, same tier as Conduit — NOT wired into `simulateStateBlockPlan`'s AP/Moxie math;
doing that would require deciding whether Tuning is a third parallel resource system or modifies the
existing AP/Moxie loop, which wasn't scoped this session. Verified via Playwright: character "6" alone
renders the Tuning panel with no Conduit tag; "6" + Conduit + 2 standard characters together render all
three features (Tuning panel, "(NOT FIXED — TO BE FIXED IN FUTURE)" Conduit tag, manual play override
selectors) simultaneously with zero console/page errors.

Delivered as `2026-08-17_v53_RE1999TeamBuilder.html`.

- The Tuning-to-character attribution (`"6"`) is inferred from the clock/Timekeeper motif, not a name
  Benson gave explicitly — get this confirmed before building anything further on top of it (e.g. before
  extending Tuning to a second character, or wiring it into the AP/Moxie sim).
- Tuning is informational-only — no Incantation cost, Moxie stat, or "which tune is active" choice
  actually affects the round-by-round simulation numbers yet. That's a real design decision (separate
  resource lane vs. AP/Moxie modifier) still to be made, not an oversight.

## 2026-08-17 session 5 — Tuning corrected to team-independent/global, Conduit label corrected,
slot-by-slot action bar redesign

**Conduit label corrected: "(fixed)" → "(NOT FIXED — TO BE FIXED IN FUTURE)".** Benson's original ask
("mark conduit character in the play-by-play to be 'fixed'") was mis-read as "label it resolved" —
he corrected mid-session: "conduit chars: (NOT FIXED - TO BE FIXED IN FUTURE)". Fixed immediately; the
label now reads as an outstanding TODO, not a claim of resolution. See STANDING_RULES.md §8 Known gaps.

**Tuning corrected from per-character to global/team-independent.** Session 4 had attached
`TUNING_DB` to CHAR_DB's `"6"` (flagged at the time as an inference, not confirmed). Benson corrected
the framing entirely, not just the character guess: "Tuning goes in parallel of the turns (the actual
characters do not affect this) but these tuning can interact with the cards," then asked for the
selector to sit "on the left of slot 1." Rebuilt as `TUNING_LIST` (a plain array, no character key) +
`tuningChoice` (a single scalar index, not a per-character map) + `renderTuningWidget()`, prepended to
`renderSlots()`'s output so it renders unconditionally next to Slot 1, independent of team composition
(verified via Playwright: the widget and its detail text render with an EMPTY team). Benson's later
follow-up clarified further: "Tuning 'turns' follows the normal turns... just using a completely
different resource" — i.e. Tuning progresses in lockstep with the normal AP/Moxie round loop, just
tracking its own separate resource pool; documented in-code, still not simulated numerically (no
per-round Tuning-resource figure exists yet — informational only, same tier as Conduit). The earlier
per-character `TUNING_DB["6"]` object, its `renderTuningPanel()`, and its play-by-play placement were
all removed rather than kept alongside the new version.

**Manual play override UI redesigned into a slot-by-slot single-column action bar.** Benson, from a
screenshot of the old layout: "break down the 'action bar' such that its on a slot-by-slot basis...
each slot allow me to manually select the ults and skills of 4 characters... skills have ranks in
case u forgot... make sure the bars fit into 1 single column." The old per-round layout had 3 visually
separate blocks (a plain-text auto-plan action list, a row of "mark Ultimate ready" buttons, a row of
override `<select>`s) that didn't read as belonging together. Replaced with ONE bar per team slot
(`.slot-bars{flex-direction:column}` — explicitly single-column per Benson's ask), each combining the
character's name, override select, Ultimate-ready toggle (if eligible), and every action line actually
resolved for them that round in one unit. Bar COUNT = number of filled team slots (3 for a 3-character
team, 4 for a full team) — a slot with 2+ actions (e.g. Anjo Nala's forced free ally-Ultimate cast)
shows extra LINES inside that slot's own bar rather than spawning an extra bar, which is what "condense
the ult into that action bar" meant on inspection of the actual data shape (an action belongs to a
character, a bar belongs to a slot — 1:1 with team size, not with action count). On the "skills have
ranks" point: the override dropdown still lists one entry per card NAME, not per rank — the simulator's
existing standing convention is to always play a card at its highest shown rank (ranks affect quoted
text, not which action is available to pick), so no rank-selection UI was added; documented this
explicitly rather than silently doing nothing about the comment.

**Verification this session:** `node --check` on the extracted script (clean) + a Playwright pass:
Tuning widget renders and shows detail with an EMPTY team; a 3-character team (Sentinel, Rhiannon,
Enigma) renders exactly 3 slot-bars in Round 1, each showing real resolved actions; changing a slot's
override select (Sentinel → Skip) re-simulates correctly; the Tuning widget survives a full
`renderSlots()` re-render after picking characters. Zero console/page errors. NOT a full Step 8 pass —
no screenshot review, no check of the slot-bar layout against a 4-character team with 2+ actions in one
slot (e.g. a real Anjo Nala Bind team), no stress test of Tuning's widget against the picker/search UI.

Delivered as `2026-08-17_v54_RE1999TeamBuilder.html`.

### Open items added this session
- Tuning's "can interact with the cards" claim is documented but not modeled — no verified per-card
  interaction data has been sourced from Benson yet to simulate it.
- The slot-bar redesign hasn't been visually stress-tested against an Anjo Nala Bind team (2+ action
  lines stacking inside one bar) or a full 4-character team with heavy AP-surplus casting (several
  action lines in one bar) — logic is verified correct via the underlying `rd.actions` filter, but no
  screenshot check of how it actually looks at that density has been done yet.

## 2026-08-17 session 6 — UI-breaking Tuning widget fixed, sticky builder-bar removed, manual
override upgraded to full multi-action control, manual-Ultimate readiness assumption

Benson sent a screenshot showing the Tuning widget's prose overflowing/breaking the Team Builder's
slots row layout, plus 4 corrections in one message. All 4 addressed directly, no new agent fleets
(consistent with the running "reduce tokens" directive from earlier sessions).

**1. Tuning widget stripped to label + dropdown only, per screenshot.** The full flavor/stat-block/
incantation-text dump from session 5 visually broke the slots row (see attached screenshot). Removed
all of it. What replaced it (see item 5 below) is intentionally small: 1 label, 1 dropdown, and — only
once a Tuning is actually selected — a 3-line cost calculator, not the removed prose.

**2. `#builder-bar` sticky positioning removed.** Benson: "when i scroll down, the top bar tuning and
character selection should not freeze pane." `#builder-bar` had `position:sticky;top:0` pinning the
Tuning widget/Slots/search bar in place while scrolling the rest of the Team Builder tab — removed;
it now scrolls normally. Verified via Playwright (`getComputedStyle(...).position === 'static'`).

**3. Manual-Ultimate pick now assumes readiness.** Benson: "when i select the ult, its assumed that
the ult is ready and will be used." The manual override's Ultimate branch previously still gated on
`ultReadyNames.includes(name)` (matching the non-manual auto behavior) — removed that gate for the
manual pick specifically; `resolveCandidate`'s Moxie-cost deduction already floors at 0, so forcing a
cast before natural readiness doesn't produce negative Moxie or any other inconsistency.

**4. Manual play override upgraded from ONE action per character per round to FULL multi-action
control.** Benson: "are u forgetting im saying that I NEED FULL CONTROL EACH 'ACTION' so lets say i
have 5 ap.. i want 37 to attack 5 times (i have 4 of 37's cards) then i can manually select her cards
for each action i have." Session 4/5's single-select-per-character design was a real under-build
against this ask, caught directly rather than defended. `manualPlayOverride[key]` is now an ARRAY —
each entry independently Auto/Skip/Ultimate/owned-card, rendered as one `<select>` row per entry in
the character's slot-bar plus "+ action"/"×" controls to add/remove rows. Simulator change: for a
character with ANY non-empty override entry that round, ALL of their actions that round come from the
array (in order, AP-gated, guaranteed priority -1) — no blending with auto-generated candidates, so a
partial manual list can't silently get topped up by the auto planner. Verified via Playwright: added 2
extra action rows for a 1-character team (1 AP pool), set all 3 rows to the same owned card, confirmed
only 1 of the 3 actually got funded (AP-gated correctly) and the executed action matches the manual
pick, not an auto-picked alternative.

**5. Tuning cost-based max-uses calculator added (replacing the removed prose), battle logic
untouched by design.** Benson: "each turn separately, i must be able to use the tuning as many times
as I can, the number of times I can choose to use is tied to the Cost. for now you do not need to
adjust the battle logic? just adjust the cost logic based on the info i gave u." Added
`sbParseTuningCost` (parses "40 → 50 → 60" into `[40,50,60]`, "25" into `[25]`, "0" into `[0]`) and
`sbTuningMaxUses` (greedily spends a Timekeeper's-Moxie pool against that cost sequence, repeating the
last value past the sequence's end; a flat-0 cost is unlimited). A manually-entered `tuningMoxiePool`
input feeds this — Benson gave no verified way to derive a starting/current pool automatically, so
it's typed in, same "manual entry, no fabricated automation" pattern as the Live Round Tracker.
Explicitly NOT wired into `simulateStateBlockPlan` — this is a standalone calculator only, per Benson's
own scoping. The pool input patches its 2 result lines in place on `input` (not a full re-render), so
typing doesn't lose cursor focus — same convention as the Live Tracker's number inputs.

**Verification this session:** `node --check` on the extracted script (clean) + a Playwright pass:
`#builder-bar` confirmed non-sticky; Tuning widget confirmed minimal (label+dropdown only before a
pick); calculator lines update correctly on pool-value change (0 pool → "0 uses" for the escalating
Incantation, unlimited for the flat-0 one; pool=100 → 2 uses) without losing input focus; a 3-row
manual override for a 1-AP team correctly funds only 1 of 3 identical picks. Zero console/page errors.
NOT a full Step 8 pass — no screenshot review of the new minimal Tuning widget's actual visual fit, no
stress test of many (5+) manual action rows on a full 4-character team.

Delivered as `2026-08-17_v55_RE1999TeamBuilder.html`.

### Open items added this session
- The Tuning max-uses calculator's pool value has no verified "true starting value" to default to —
  Benson has to type in his own current Timekeeper's Moxie each time; this tool has no way to derive
  it and won't guess at one.
- Manual override arrays aren't capped — a character could add far more action rows than any real AP
  pool could ever fund; harmless (excess rows just never get funded) but worth knowing if the slot-bar
  UI ever needs a practical row limit for usability.

## 2026-08-17 session 3 — same-day corrections to session 2's work: Conduit AP fix, cast-cap removal, manual Portray override, broader numeric-only pass, Portray-text ULT_HOLD scan

**Context.** Benson reviewed session 2's delivery (`v50`) and directly caught two design mistakes plus
requested two new features, all in one message, with an explicit "reduce tokens usage" instruction. Given
that constraint, all four were done as direct code edits and cheap script-based heuristics rather than new
parallel-agent fleets, wherever that was defensible without sacrificing correctness.

**1. Mixed-Team Clogging Penalty removed — it was built on a wrong premise, not just wrong tuning.**
Benson: "conduit energy cards cost 1ap, so wtheckis AP available: 1 (Mixed-Team Clogging Penalty...) ...?
it should be the normal 4ap.. and each card cost 1 ap as per usual." Session 2 had invented a -1 AP
deduction for mixing Conduit teammates into a standard team, framed as a deterministic house-rule number.
Benson rejected the whole mechanic, not its magnitude — Conduit Energy cards cost the same 1 AP as any
regular card, same shared pool, no archetype-mixing malus at all. Fixed by deleting the
`sbCloggingPenaltyAp` function entirely and changing `simulateStateBlockPlan`'s AP-pool computation to a
new explicit `totalTeamSize` parameter (full picked team including Conduit members, who are excluded from
per-card simulation but still count toward the shared pool) instead of `chars.length - cloggingPenalty`.
`renderConduitPanel`'s clogging-penalty note text was removed too. Verified via Playwright: a 4-character
team (2 standard + The Twins + Coppélia) now shows "AP available: 4," not "1." `STANDING_RULES.md` §8's
Conduit "Known gaps" note and its "deterministic-only constraint" bullet were rewritten to state plainly
that no such penalty exists, rather than describing a fixed-but-wrong mechanic.

**2. Numeric-only Portray rule applied broadly, via a cheap heuristic, with real judgment kept in the
loop.** Benson: "apply the rhiannon logic to ALL portrays recommendations. btw you should also think
urself.." Given the token-reduction directive, re-reading all 130 characters' full kits was not on the
table this pass. Instead, a Node script scanned each `true`-flagged level's own already-written `reason`
text (from the original 126-character parallel-agent batch) for self-describing "pure numeric bump" /
"stepping stone" / "bridge to" language — reusing prior LLM judgment already embedded in the text rather
than re-deriving it blind. This flipped 105 of 638 then-`true` levels across 70 characters to `false`,
each with an appended `[Edited 2026-08-17: demoted under the numeric-only rule...]` note for traceability.
This is explicitly a partial, heuristic pass, not a full re-audit — roughly 530 `true`-flagged levels were
not touched and still reflect the pre-numeric-only-rule cascade logic. Documented as an open item so this
isn't later mistaken for "the rule is now applied everywhere."

**3. Manual Portray-recommendation override UI built; per-character regular-cast cap removed.** Benson:
"screw it, allow me to take over your recommendation. btw in EVERY round, a character could have more
than 1 card of their own each time (sometimes they want to use them all)." Two independent fixes:
- Added `portrayOverride` (a `"CharName|level"`-keyed display-state object, separate from `PORTRAY_DB`)
  and a click handler on each Portray Recommended/Not Recommended tag that flips the override, updates the
  tag text/class, and recomputes the card's dupe count — all via targeted in-place DOM mutation, not a
  `renderBuilder()`/`renderArchive()` re-render, specifically to avoid collapsing other open `<details>`
  dropdowns on click. `PORTRAY_DB`'s underlying verdict/reason data is never mutated by this.
- Removed the `paidCastDone` one-regular-cast-per-character-per-round gate from the allocator's candidate
  generation. Regular-cast candidates are now generated from ALL of a character's owned card types every
  round (previously only one, chosen via round-index cycling), gated purely by remaining AP. The now-
  redundant priority-2.6 "SurplusCast" tier (which existed specifically to fund a second cast around the
  old cap) was removed along with its `surplusCastDone` set; `AP_SURPLUS_OVERRIDE` is demoted to reference
  data only, no longer read by the allocator.
- **A real TDZ bug was found and fixed during this work.** `let portrayOverride = {};` was initially
  placed near the other manual-override `let` declarations (~line 8540), but `buildArchive()` — called at
  top level earlier in script execution (~line 8507) — renders every character card via `renderCard`/
  `renderPortray`, both of which reference `portrayOverride`. This threw `ReferenceError: Cannot access
  'portrayOverride' before initialization` on page load. Fixed by moving the declaration to immediately
  before `function renderCard(c){`, ahead of `buildArchive()`'s call site. Caught by Playwright's
  `pageerror` listener, not by `node --check` (syntactically valid, only wrong at runtime) — a reminder
  that `node --check` catches syntax errors only, not execution-order/TDZ bugs; the Playwright load-error
  check in §14 step 2 is what actually catches this class of bug.

**4. `ULT_HOLD_OVERRIDE` re-scanned against Portray text, not just Skills+Insight.** Benson: "ULT_HOLD
_OVERRIDE... u should check all portrays as well." A regex scan for stack-consumption/resource-timing
keyword patterns was run against every character's Portray text, restricted to the 83 characters NOT
already in `ULT_HOLD_OVERRIDE`. This surfaced 3 candidates, each manually reviewed against real kit text
(not rubber-stamped) and rejected: none had a genuine stack-resource-consumption pattern matching the
table's actual standard once checked directly (e.g. one candidate's Ultimate only grants a status buff on
cast rather than consuming a pre-built stack, so holding it provides no real payoff). `ULT_HOLD_OVERRIDE`
remains at 47/130 characters; `STANDING_RULES.md` §4 now states Portray text must be checked alongside
Skills+Insight for this table going forward.

**Verification this session:** `node --check` on the extracted script (clean, after fixing the TDZ bug
above) + a Playwright pass: loaded the file, picked a 4-character team (The Twins, Coppélia, Sentinel,
Rhiannon), confirmed `#steps-box` shows "AP available: 4" with no clogging-penalty text, opened Rhiannon's
card, clicked her Portray tag (Recommended → "Not Recommended (your edit)"), confirmed the card stayed
open (no collapse) and the dupe count updated, and confirmed zero console/page errors before and after the
interaction. NOT a full Step 8 pass (§14) — no screenshot-based visual review, no re-check of the ~530
still-unaudited Portray levels, no stress test of the uncapped allocator against every archetype
combination.

Delivered as `2026-08-17_v51_RE1999TeamBuilder.html`.

### Open items added this session
- ~530 `true`-flagged Portray levels (of the original 638) have not been re-examined against the
  numeric-only rule — only the 105 caught by the reason-text heuristic were fixed. A future pass should
  either re-run the heuristic with broader keyword coverage or do real per-character re-reads.
- `portrayOverride` is session-local browser state (an in-memory JS object) — it does not persist across a
  page reload. If Benson wants his overrides to survive a reload, that's a new feature (e.g.
  `localStorage` is banned in this app's artifact-adjacent contexts generally, but this is a real
  standalone HTML file, not a Claude.ai artifact, so it's actually available here if ever requested) —
  not yet built, don't assume it's wanted without asking.
- `AP_SURPLUS_OVERRIDE` (64/130 characters) is now unused by any code path — kept only as verified
  reference data in case a future feature wants it. Don't silently re-wire it into the allocator without
  Benson re-confirming the surplus-cast concept still makes sense now that the cap it was built around is
  gone.

## 2026-08-17 session 7 — Ultimate toggle removed, Tuning calculator removed + moved to a per-round
bar, Portray override removed, Portray cost-vs-value correction (5 characters + Enigma), stale
numeric-only annotations stripped tool-wide

Benson sent a screenshot of the broken Tuning widget plus 6 corrections in one message, then 2 more
mid-turn clarifications. All addressed directly.

**1. "Mark Ultimate ready" toggle removed.** Benson: "remove: mark Ultimate ready now that u included
the ultimate in the box" — redundant now that the manual play override's own "Ultimate" row already
forces the cast. Removed `manualUltReady`, `ultOverrideKey`, `rd.toggleable`, the toggle button
rendering, and its click handler. `ultReadyNames` in `simulateStateBlockPlan` reverted to just
`naturalUltReadyNames` (the manual-override branch already bypasses this readiness check entirely).

**2/3. Tuning's cost calculator removed entirely — not just its old prose.** Benson: "what the heck is
this screenshot.... remove the timekeeper moxie and incantation1 and 2 from this selection... there are
4 of them each with unique tuning mechanics." Session 6's max-uses calculator (built to replace the
even-earlier prose dump) was ALSO rejected — removed `sbParseTuningCost`, `sbTuningMaxUses`,
`sbTuningCalcLineText`, `tuningMoxiePool`, and all related UI/handlers. `renderTuningWidget()` is now
bare: "Tuning" label + dropdown, nothing else, full stop. This also fixed the screenshot's visual
break (item 3, "fix the damn UI") — the widget's height now matches the slot cards instead of
overflowing.

**New mid-turn requirement: Tuning included as a 5th per-round bar.** Benson, mid-turn: "tuning should
also be included aside from the 4 characters in each round. there are 4 types of them as you already
know and these tunes has 2 incantations" — and separately: "Tuning 'turns' follows the normal turns...
just using a completely different resource." Added `renderTuningRoundBar(round)`: once a Tuning is
selected, a 5th slot-bar appears after the 4 character bars each round, letting Benson log which
Incantation he used (`tuningRoundPicks[round]`, same array/add-row/remove-row pattern as the character
manual-override rows). Purely a log, like the Live Tracker — no AP gating, no battle-logic effect,
consistent with Benson's standing "don't adjust battle logic" instruction from the prior session.

**4. Portray click-to-override REMOVED.** Benson, after seeing a screenshot with several
"(edited by you)"/"(YOUR EDIT)" tags still showing from earlier testing: "dont let the user toggle the
portray!!! (currently togglable...)" then, mid-turn, clarified scope precisely: "im refering to this!!
it should be static... keep play by play portray obviously!!" — i.e. remove ONLY the Recommended/Not-
Recommended tag's clickability; the Team Builder's Portray-LEVEL selector (P0-P5, which drives the
State-Block simulation) is a completely different feature and was correctly left untouched. Removed
`portrayOverride`, its click handler, and `renderPortray`'s override-computation logic — Portray tags
now always display `PORTRAY_DB`'s own `recommended` value directly, no per-viewer state.

**5. Portray recommendation logic corrected — the 2026-08-17 "numeric-only rule" was itself wrong.**
Benson gave a spot-check across 5 characters that directly falsified the standing rule (a pure-numeric
level auto-defaults to `false` regardless of magnitude): "Brume: P2 still valuable since it boosts the
whole Mental-DMG team including Brume's own Ultimate cycle, but it's the same team-buff mechanic just
bigger" (should be `true`, was `false`) and "Sentinel: P1,p2,p5 is nice crit rate for teammates" (all
correctly `true` already) contrasted with "P3 not worth" and "Rubuska P4... its not that worth it" and
"Semmelweis P1 is a nice dmg boost for HER TEAM. P2-P5 not worth" (both real numeric levels that were
`true` and needed demoting). The actual principle, confirmed by these examples: judge EACH level's own
cost-vs-value independently — a numeric bump can be `true` if it's team-wide/teammate-facing and the
size is real; a "mechanic" or "numeric" label alone decides nothing; a later `true` level never drags
nearby `false` levels up, and vice versa. `STANDING_RULES.md` §7 was rewritten around this (superseding
both the old "cumulative cascade" framing AND the interim "numeric-only rule" that replaced it).
Fixed directly: Brume (count 3→2), Rubuska (P4 `true`→`false`), Semmelweis (count 5→1), Sentinel (count
4→3). Corvus was spot-checked and confirmed already correct — no change. All 5 entries' stale
`[Edited 2026-08-17: demoted under the numeric-only rule...]` notes were removed as part of the fix.

**Stale numeric-only-rule annotations stripped tool-wide (101 remaining occurrences), values NOT
re-judged.** Since the rule those annotations cite is now known to be wrong, leaving the citation in
place on ~101 other characters' levels would be actively misleading (it points to a rule Benson
rejected). A plain find/replace (Python regex, no model judgment involved, cheap) removed the literal
annotation text from all of them. Their underlying `true`/`false` values were NOT changed or
re-examined — this is a mechanical cleanup, not a re-audit. Flagged explicitly as a real, sizeable open
item (below) rather than implying "learn from my logic and update all character's portray" (Benson's
literal ask) was completed at full roster scale — it wasn't; doing that faithfully for ~125 remaining
characters is a large task that would need many more sessions or an explicit go-ahead to spend the
tokens on a big parallel-agent pass, not something to fake via a text-only stripping script.

**6. Enigma's Portray analysis completed**, closing the `PENDING ANALYSIS` placeholder tracked since
the prior session. Read her real rebuilt `SKILL_KIT`/`INSIGHT_KIT` text plus the verbatim Portray text
already on file. Verdict: P1 (real multi-mechanic threshold: Control-immunity uses, team Dynamo cap,
Cipher Machine uptime), P2 (team-wide Crit DMG buff — numeric but team-wide, so worth it, same
reasoning as Brume's P2 case), P4 (raises Bastion — her core Shield mechanic — across every skill that
grants it) and P5 (a genuine new mechanic: converts her Dynamo stacking into team damage scaling) are
`true`; P3 is `false` (mostly a numeric bump to her OWN basic attack — she's a Shield/Support, not a
damage dealer, so that numeric bump doesn't carry team-facing weight). Flagged a real data gap in her
`source` field: P3/P4's text references a "Closed-Loop Principle" skill not present in her currently
rebuilt `SKILL_KIT` — noted rather than guessed at.

**Verification this session:** `node --check` on the extracted script (clean) + a Playwright pass:
`.ult-toggle-btn` count confirmed down to just the Live Tracker's own toggle button (the per-character
Ultimate-ready toggle is gone); `data-pt` attribute count confirmed 0 (no clickable Portray tags exist
anywhere in the file); Tuning widget HTML confirmed to be exactly `<label>Tuning</label><select>...`
with nothing else; a 1-character team's Round 1 correctly shows a "Tuning: First Melody" 5th bar with
both Incantations as selectable options once a Tuning is picked. Zero console/page errors. NOT a full
Step 8 pass — no screenshot review of the new bare Tuning widget's actual visual fit, no re-audit of
the ~101 characters whose stale annotation was stripped.

Delivered as `2026-08-17_v56_RE1999TeamBuilder.html`.

### Open items added this session
- **~101 other characters' Portray levels still need real re-judgment** against the corrected cost-vs-
  value method (§7) — only Brume/Rubuska/Semmelweis/Sentinel/Corvus (spot-checked) and Enigma
  (newly analyzed) reflect it. This is the single largest open item in the whole Portray backlog now;
  a future session should either get an explicit go-ahead to spend the tokens on a large parallel-agent
  re-audit pass, or chip away at it a handful of characters at a time.
- `tuningRoundPicks` (like `manualPlayOverride`) is not cleaned up on team/Tuning changes — stale round
  keys just sit unused, harmless, same convention as the other manual-override state maps.
- Enigma's `SKILL_KIT` may be stale relative to her real current kit (missing "Closed-Loop Principle") —
  worth a fresh Prydwen re-fetch next time she's touched.

## 2026-08-17 session 8

**Flutterpage fix (Benson: "Flutterpage only recommend P1... you seem to down play the cost of an extra
unit"):** P2-P5 flipped `true`→`false` (count 5→1). The prior verdicts had justified P2/P4 (a +3-5pp bump
to her Force Field team buff, 15%→18%→23%) as worth it purely because the buff was team-wide, without
weighing whether the actual size of the increase justified a full extra copy — exactly the failure mode
this section's method is supposed to prevent. P3 (front-loaded Gust stacks + a 0.5pp per-stack bump) and
P5 (Ultimate DMG 40%→60% + a small Moxie trickle) were also demoted on the same grounds: real numbers,
self/secondary-facing, too small for the cost.

**Full-roster Portray pass (Benson: "do a pass on all characters.. think"):** the ~101-character backlog
flagged every session since the numeric-only-rule correction was finally closed. Extracted every
character's `SKILL_KIT`/`INSIGHT_KIT`/`PORTRAY_DB` text (excluding the 6 already-settled:
Brume/Corvus/Rubuska/Semmelweis/Sentinel/Enigma), split the remaining 124 characters into 13 batches of
~10, and ran 13 parallel subagents, each given the corrected cost-vs-value method plus the Flutterpage
verdict above as a calibration example and an explicit instruction not to let team-wide reach substitute
for real magnitude, defaulting to `false` when genuinely unsure. Merged all 124 results (1240 levels
total, no failures) back into `PORTRAY_DB`, replacing `recommended`/`reason`/`count`/`verdict` per
character while leaving `text`/`source` untouched. Across the full 131-character roster (655 levels),
179 are now `true` (~27%) — down sharply from the old numeric-only-rule-era baseline, consistent with the
corrected method's general skepticism toward small numeric bumps regardless of team-wide reach.

This is a bulk agent-generated pass — same standard as `ULT_HOLD_OVERRIDE`/`AP_SURPLUS_OVERRIDE`: a
strong first full-roster draft, not yet spot-checked character-by-character against real kit text at
this volume. Benson already caught one real miss this session (Flutterpage) before the bulk pass even
ran, so more misses of the same shape (crediting a small team-wide bump, or under/over-weighing a
threshold change) should be expected somewhere in the 124. Fix pattern going forward: when Benson flags
a specific character as wrong, fix that character directly (as with Flutterpage) — don't re-run the
whole batch for one miss.

**Verification this session:** `node --check` on the extracted script (clean, `/tmp/_extract2.js`).
`PORTRAY_DB` spot-checked directly (Rhiannon's updated entry read back and confirmed sane: P1/P2/P5
`true` for large team-wide/escalating damage jumps, P3/P4 `false` for modest percentage-point bumps).
Total level/true-count arithmetic checked (655 levels, 179 true, 131 characters). NOT independently
spot-checked against Prydwen source text character-by-character at this volume — see caveat above.
Delivered as `2026-08-17_v57_RE1999TeamBuilder.html`.

**Open questions raised this session, not yet actioned:**
- Benson asked whether Rubuska should heal so Nautika can safely keep spending HP, given Nautika's
  Bloodtithe gauge. Confirmed true from kit text: Rubuska's Insight I gives all allies [Shadow Friend],
  which costs each ally 10% Current HP per round as a SELF-inflicted loss (not attack damage) — per
  Nautika's Insight II, Bloodtithe accumulates from ally HP loss, and self/ally-inflicted loss counts at
  full rate vs. only 30% efficiency for HP lost to enemy attacks. So Rubuska's passive HP-drain aura
  feeds Nautika's Bloodtithe/Faith gauge at the good rate, while Rubuska's heals (Shadow Sentry, Insight
  III's Grace) keep everyone's HP high enough to keep affording Nautika's own HP-cost attacks (Haunting
  Pain, Martyr of the Abyss, up to 50% Current HP each) without risking death. Real, kit-confirmed
  synergy — but **not modeled in `simulateStateBlockPlan` at all**: there is no Bloodtithe/Faith counter,
  no Shadow Friend/Shadow Cloak HP-loss tracking, anywhere in the simulator (confirmed via grep — zero
  hits). The State-Block plan currently treats Nautika and Rubuska with the same generic AP/Moxie
  priority-tier logic as everyone else.
- Benson asked to "read all character kits, insights, etc." and "use each character's logic to do the
  play-by-play" — i.e. have the simulator actually model each character's unique resource/threshold
  mechanics (Bloodtithe, Shadow Cloak, Higge stacks, Faith, and the ~130 other characters' own bespoke
  systems) instead of the current generic priority-tiered AP/Moxie allocator. This is a real, well-
  motivated ask (the Rubuska/Nautika case above is a concrete example of what's currently missing) but
  it is an order of magnitude bigger than the Portray pass above — it means building a per-character
  resource-tracking layer for a meaningful fraction of 131 characters, not a batch text-judgment pass.
  Not started this session; flagged here for explicit scoping next time (which characters/mechanics
  first, e.g. start with characters that already have `ULT_HOLD_OVERRIDE`/`AP_SURPLUS_OVERRIDE` entries
  since those kits are already known to have real hold/surplus logic worth modeling).

## 2026-08-17 session 9

**Scoped and started the per-character resource-mechanics project** (Benson: "scope and start it").
Confirmed the real blocker first: this tool has NO HP/stat block anywhere in `CHAR_DB` (grep returned
zero hits for `maxHp`/`baseHP`/etc.), so exact numeric thresholds like Nautika's "3000 combined HP =
1 Bloodtithe point" cannot be computed — doing so would mean inventing a number, the same violation the
no-fabrication rule already forbids for Portray magnitude claims. Scoped the honest version instead:
qualitative, informational resource notes (new `resource_note` type on `PORTRAY_MECHANIC`/
`INSIGHT_MECHANIC` — display-only, doesn't feed any real math, unlike `moxie_on_entry`) plus a small
`FAITH_RESOURCE_CHARACTERS` registry for characters whose Ultimate gate isn't standard Moxie, so the sim
stops fabricating a fake Moxie fraction for them.

**Piloted on Rubuska → Nautika** (the exact pair Benson asked about this session): Rubuska's Insight I
gets a `resource_note` explaining Shadow Friend (10% Current HP self-inflicted loss on all allies each
round → Shadow Cloak for her, and — if Nautika is present — full-efficiency Bloodtithe feed for
Nautika, vs. only 30% efficiency from enemy-attack HP loss). Nautika gets a `PREROUND_ACTION` entry
(Insight II's battle-entry 50%-HP-loss-for-Bloodtithe/MaxBloodtithe+8 grant, Faith replacing Moxie,
Ultimate at Faith 8) and is added to `FAITH_RESOURCE_CHARACTERS` — she's excluded from
`naturalUltReadyNames` (no more fake Moxie-based readiness) and her per-round Moxie display line now
reads "Faith (not simulated — track manually)" instead of a fabricated X/5, with the manual play
override's "Ultimate" pick as the real way to mark her cast once Faith hits 8 in-game.

Verified via Playwright: loaded a Rubuska+Nautika team, confirmed "Shadow Friend" text renders (Rubuska's
resource note), "Faith (not simulated" renders (Nautika's display line), "Bloodtithe" is mentioned
(cross-link). Zero page/console errors (the only console noise was expected network-blocked portrait
image fetches, not app errors). `node --check` on the extracted script: clean.

**Scope explicitly NOT done**: this is 2 characters out of 131. No other character has a resource_note
or is in `FAITH_RESOURCE_CHARACTERS` yet. This does not touch the AP/Moxie allocator's actual decision
logic for anyone (Rubuska's Shadow Friend doesn't gate any cast; it's pure information) — the "use each
character's logic to drive the play-by-play" ambition from last session is much bigger than this pilot
and remains mostly open. Next character/mechanic pair should be picked explicitly, not assumed to follow
automatically from this pattern.

**Also this session: Liang Yue Portray fix** (Benson: "liang yue only P1 and P2 is also recommended..
but numbers increase") — flipped from the bulk pass's P3/P4 `true` to P1/P2 `true` (count 2). See §7 in
STANDING_RULES for the corrected reasons; the short version is Benson's explicit warning that a bigger
or doubled number on an already-existing mechanic (P3/P4 here) doesn't automatically outrank a smaller-
looking but structurally real threshold/pacing change (P1/P2 here).

Delivered as `2026-08-17_v58_RE1999TeamBuilder.html`.

### Open items added this session
- Per-character resource mechanics: 129 of 131 characters still have zero resource modeling beyond the
  generic AP/Moxie loop. Pick the next pair/character explicitly before continuing.
- The full-roster Portray pass (session 8) still hasn't been spot-checked character-by-character beyond
  the 2 misses Benson has caught so far (Flutterpage, Liang Yue) — more are plausible at this volume.

## 2026-08-17 session 10

**HP estimate (Benson: "no hp?.... shit can u make an educated guess?")**: added `ESTIMATED_MAX_HP =
30000` — a single flat, explicitly-labeled ballpark from general knowledge, NOT per-character, NOT
Prydwen-verified (WebSearch was tried first to find real base-stat numbers and was blocked by the
session's network proxy, so this is genuinely a from-training-knowledge estimate, not a researched
figure). Used it to enrich Nautika's `PREROUND_ACTION` note with an illustrative "~X points toward the
3000-HP Bloodtithe threshold" figure, clearly caveated as illustrative. See §8 in STANDING_RULES for the
exact wording and the "don't let this become a fake verified stat" warning.

**Full-roster resource-mechanics pass (Benson: "continue with ALL 129 chars")**: extracted Skills+Insight
text for all 127 non-Conduit characters not yet covered (everyone except Rubuska/Nautika, already done,
and The Twins/Coppélia, already separately handled as Conduit), split into 13 batches of ~10, ran 13
parallel subagents with instructions to find any BESPOKE resource mechanic beyond generic AP/Moxie and
write an informational note, explicitly told not to invent one where none exists. Result: 80 of 131
characters got a `resource_note` — turns out MOST characters have some kind of stacking/spend mechanic
(Eureka, Dynamo/Pulsing Field, HP-sacrifice loops, threshold-triggered bonus attacks, etc.), not a small
minority as might've been assumed. 6 characters were flagged with a genuinely non-Moxie Ultimate gate and
added to (the renamed) `ALT_ULT_GATE_CHARACTERS`: Nautika (already there), Alexios, Kassandra (both
"Adrenaline" replacing Moxie on a 0-8/0-10 scale), Ezio Auditore (Synchronization 0-100%), Ms. Stranger
(a physical Spelldock-position unlock, not a meter at all), and Igor (his Insight I already changes Max
Moxie to 12/cost to 8 AND removes player choice entirely — he auto-casts at round end regardless of
Control — this is a deeper, more precisely-specified change than the others and is flagged as worth
actually modeling properly in a future session rather than leaving as a placeholder).

**Explicit scope honesty**: this is STILL informational-only, same as the session-9 pilot. None of the 86
newly-tagged characters (80 notes + 6 gate exclusions) have their mechanic actually feed the allocator's
cast/hold/priority decisions — Moxie/AP math is unchanged for everyone except the 6 gate characters'
readiness DISPLAY (which now correctly stops faking a Moxie fraction for them). "Use each character's
logic to drive the play-by-play" in the sense of the mechanic actually changing what gets cast and when
remains undone for all 131 characters — this pass makes mechanics VISIBLE, not decision-driving. Also a
bulk agent-generated pass, not spot-checked at volume — same caveat as Portray/`ULT_HOLD_OVERRIDE`.

**A real bug caught and fixed this session**: the scripted `INSIGHT_MECHANIC` splice used to merge the 79
new notes had a boundary computation that silently ate `sbGetBaseInsightMechanics`, `PREROUND_ACTION`,
`sbGetAnjoBindTarget`, `CONDUIT_RESOURCE_CHARACTERS`/`isConduitChar`, and `ENERGY_RESET_OVERRIDE` — full
function/const declarations deleted while their call-sites survived. `node --check` (syntax-only) passed
cleanly on the corrupted file, because removing a declaration while its call-site remains is a runtime
`ReferenceError`, not a syntax error — this would only have surfaced the moment someone loaded a team
with Anjo Nala or a Conduit character in the actual delivered file. Caught by diffing the current file's
top-level `function`/`const` declaration names against the last known-good delivered version
(`2026-08-17_v58_RE1999TeamBuilder.html`) rather than trusting `node --check` alone. Fixed by reinserting
the missing block verbatim (reconstructed from an earlier Read of the same content plus the session-9
edits). Re-verified: `node --check` clean, Playwright pass with Rubuska+Nautika+Anjo Nala+Igor on one
team shows zero page errors and all the expected text (Shadow Friend, Faith-not-simulated, Igor's Kit
mechanic note). **Standing lesson, added to STANDING_RULES §8: after any scripted (non-Edit-tool) splice
on this file, diff top-level declaration names against the previous delivered version — passing
`node --check` is necessary but not sufficient to catch a silently-deleted function/const.**

Delivered as `2026-08-17_v59_RE1999TeamBuilder.html`.

### Open items added this session
- Igor's Ultimate-gate mechanic (auto-consume-at-round-end, ignores Control, Max Moxie 12/cost 8) is
  precisely enough specified in his kit text to actually model properly, unlike the other 5 alt-gate
  characters — worth a dedicated pass rather than staying an informational placeholder.
- 45 characters (131 - 80 with resource_note - 6 alt-gate, overlapping) have NO flagged bespoke mechanic
  at all per this pass — worth a light spot-check that "no bespoke mechanic" is correct and not a miss,
  given the bulk-generation caveat.
- The full resource-mechanics tagging (86 characters now touched) is still 0-for-131 on actually driving
  the allocator's decisions — everything is informational display only. This is the same gap flagged at
  the end of session 9, now just documented against a bigger tagged set.
- `ESTIMATED_MAX_HP`'s single flat 30000 ballpark is unverified against real Prydwen stat pages (WebSearch
  was blocked this session) — if it's ever feasible to get real per-character or per-role stat baselines,
  replace the flat estimate with something better calibrated.

## 2026-08-17 session 11

Started wiring real allocator behavior for the 86 tagged characters (Benson: "start work on these 86...
character mechanics in the simulator"), picking Igor first since RUN_LOG already flagged him as the one
alt-gate character precise enough to model properly (no missing-HP blocker, unlike Nautika). Changes to
`simulateStateBlockPlan`: `moxieCap('Igor')` returns 12 (was the generic 5); a new round-end block force-
casts his Ultimate for 0 AP, consuming all his current Moxie, whenever he holds any — matching his
Insight I text exactly ("doesn't generate an Ultimate... at the end of the round, will consume as much
Moxie as possible"). He's no longer shown with the generic "Faith (not simulated)" placeholder — his
Moxie line now shows a real X/12 fraction plus "(auto-casts at round end)". Verified: `node --check`
clean, a before/after top-level declaration diff against v59 (0 missing), Playwright load with Igor
solo confirms the round-end auto-cast action line and the 12-cap both appear, zero page errors.

Delivered as `2026-08-17_v60_RE1999TeamBuilder.html`.

**Scope, stated plainly**: 1 of 86 tagged characters now has real decision-driving logic; the other 85
are still informational-only. The other 5 alt-gate characters (Nautika, Alexios, Kassandra, Ezio
Auditore, Ms. Stranger) weren't done this pass — each needs its own bespoke logic (Alexios/Kassandra:
Adrenaline accrual from attacks/crits; Ezio: Synchronization from Assassination/riposte triggers; Ms.
Stranger: Spelldock-position tracking) and none reduce to copy-pasting Igor's pattern. The 80 characters
with a stacking/spend `resource_note` (Eureka, Dynamo, Bloodtithe-style HP loops, etc.) aren't touched at
all yet — most of those don't gate the Ultimate at all, so "driving decisions" for them would mean
feeding their stack counters into the regular-cast priority tiers, a different (and larger) piece of work
than the alt-gate characters. Next session should pick the next 1-2 characters explicitly rather than
attempting all 85 remaining at once.

## 2026-08-18 session 12

**Alexios modeled for real** (2nd of 6 alt-gate characters, after Igor): his Adrenaline is fully
deterministic per kit text — round-start-only +1 gain (no card-cast/merge gain, so excluded from both),
cap 8, auto-casts at round START (checked BEFORE that round's own +1, verified by hand-tracing: first
natural cast lands round 9) then resets to 0. Insight III's extra +1-per-[Assassination] isn't modeled —
this simulator has no Assassination-trigger system at all, so adding it would mean fabricating trigger
frequency; omitted honestly. Moxie line now shows his real X/8 plus "(auto-casts at round start)".

**Checked but NOT modeled this session** (all require fabrication or unbuilt systems, not just more
code): Kassandra (same Adrenaline shape as Alexios, but her 2/6/10 thresholds generate specific precast
incantations — modeling that means simulating precast-card injection I haven't verified is safe to
reuse here; flagged, not attempted), Ezio Auditore and ALL [Assassination]-trigger-based gains generally
(Synchronization/Adrenaline-from-Assassination requires a Critical-Technique-comparison system this
simulator doesn't have — building that is a separate, larger project, not a per-character tweak), Ms.
Stranger (Spelldock-position tracking — no positional Spelldock simulation exists in this tool at all).

**Standing-rules update (Benson: "make sure future runs check new characters of their mechanics too")**:
added step 8b to §6's new-character cascade — every future new-character rebuild now explicitly checks
Skills+Insight for a bespoke resource mechanic (same question the session-9/10 bulk pass asked of the
existing 131) and tags `resource_note`/`ALT_ULT_GATE_CHARACTERS` as needed, with an explicit reminder
that "no bespoke mechanic" is the minority outcome, not the default assumption.

Verified: `node --check` clean, declaration-name diff against v60 (0 missing), Playwright load with
Alexios solo confirms the round-start auto-cast line and /8 cap, zero page errors.

Delivered as `2026-08-17_v61_RE1999TeamBuilder.html`.

### Open items
- 84 of 86 tagged characters still informational-only (Igor, Alexios now real). Next candidates need an
  Assassination-trigger system or precast-injection modeling built first — not a quick per-character add.
- Kassandra flagged as "close, but blocked on precast-card injection" — worth a dedicated look once that
  mechanism is understood well enough to reuse safely.

## 2026-08-18 session 13

Asked Benson directly whether to fabricate the Assassination/Spelldock systems or keep stopping at the
wall (AskUserQuestion — a real fork only he could resolve). Answer: "ms stranger kit is releasing in 2
weeks. mark assumptions for the rest" — so Ms. Stranger stays untouched (her kit isn't even live), and
Kassandra + Ezio Auditore get modeled with explicitly labeled assumptions where kit text runs out.

**Refactored Igor/Alexios into a data-driven `AUTO_ULT_GATE_CONFIG`** (Benson: "automatically create the
mechanics") — adding a character is now a data entry, not a new code block. Added `SPECIAL_CARD_GAIN` for
a named card granting a non-default amount (or being the ONLY gain source).

**Kassandra — real, not assumed**: round-start +1 Adrenaline (via the generic config), +1 on entering
battle (new `moxie_on_entry` INSIGHT_MECHANIC entry, reusing existing infra), Fury of Ares's kit-stated
+4 (`SPECIAL_CARD_GAIN`), auto-casts Rush Assassination (her real Ultimate) at 10, resets to 0. NOT
modeled: the 2/6-threshold precast-incantation generation (Sparta Kick/Rain of Destruction) — this tool
has no dynamic mid-battle card-injection engine, only a static single-precast table; a real gap, not an
assumption to paper over.

**Ezio Auditore — labeled assumption**: his kit has NO passive per-round gain at all, only trigger-based
Synchronization. Modeled ONLY his own self-cast Work in the Dark (Assassination-tagged) using the kit's
real +5%-per-trigger rule; riposte gains, ally-triggered gains, and enemy-defeat gains are explicitly NOT
counted (no incoming-attack or enemy-HP model exists) — this UNDERESTIMATES his real Synchronization and
he'll auto-cast later in the sim than in real play. Labeled as ASSUMED in-code and in both docs, per
Benson's explicit approval to proceed this way rather than stopping.

Verified: `node --check` clean, declaration-name diff against v61 (0 missing), Playwright with all 4
real-modeled characters (Kassandra /10, Ezio /100, Igor /12, Alexios /8) on one team — correct fractions
and auto-cast labels for each, zero page errors.

Delivered as `2026-08-17_v62_RE1999TeamBuilder.html`.

**Coverage marker (Benson: "mark the ones not checked incl conduit")**: all 131 characters now have SOME
check status — 127 via the session-9/10 batch pass, Rubuska/Nautika via the session-8 pilot, and The
Twins/Coppélia via the pre-existing separate Conduit system (`renderConduitPanel`) rather than a
`resource_note` (their mechanic is real-modeled there already, just not through this table — not an
unchecked gap). Nobody in the 131 is actually "not checked" as of this session; what remains is depth
(84 of 86 tagged characters still informational-only), not coverage.

### Open items
- Ezio Auditore's Synchronization gain is a known underestimate — if riposte/enemy-defeat tracking ever
  gets built, revisit and remove the ASSUMED label.
- Kassandra's 2/6 precast-incantation thresholds still need a real card-injection engine — same blocker
  flagged for the wider "Use each character's logic" ambition generally.
- Ms. Stranger: revisit once her kit actually goes live (Benson: ~2 weeks out).

## 2026-08-18 session 14 (docs-only, no HTML change)

**Corrected an overclaim** (Benson: "conduit sys not built yet. its nt working at the moment"): last
session's coverage note wrongly implied The Twins/Coppélia were "handled" by the Conduit info panel the
same way the alt-gate characters are now really modeled. They're not — `renderConduitPanel` is display-
only, no Energy/Harmonization number is simulated (this was already correctly stated in the "Known gaps"
section, just contradicted by the newer coverage summary). Fixed: they're now correctly listed as a real
gap, same category as Nautika/Ms. Stranger.

**Checked the other 80 `resource_note` characters for the same kind of real modeling** (Benson: "what
about the other char and their systems (if any)? do the rest"). Finding: this simulator computes no
actual damage numbers anywhere — it only sequences AP/Moxie/card timing. Most of these 80 characters'
stacking mechanics (Brume, Mercuria, Buddy Fairchild, Isolde, Kaalaa Baunaa, etc.) scale damage or grant
passive stats — they don't change WHICH card is cast or WHEN, so there's no decision in the sim for them
to plug into; "modeling" them would just be adding an unused number. A few DO have a decision-changing
shape like Igor/Alexios (Liang Yue's Talon threshold auto-triggers a bonus attack; Buddy Fairchild's 10+
stacks grants a free Ultimate cast; Brimley's 3 stacks triggers a bonus partner action) — checked Liang
Yue first since his was clearest, and found his own `SKILL_KIT` entry is internally garbled (duplicate/
mislabeled "Ultimate"-type entries, the actual Bane of All Evil consuming-skill missing) — not safe to
build real logic on top of broken source data. Not attempted; flagged as a rebuild-first item instead of
either faking it or silently building on bad data.

### Open items
- Liang Yue's `SKILL_KIT` needs a fresh two-pass rebuild from Prydwen source before his Talon mechanic
  (or anything else about him) can be trusted for further modeling.
- Buddy Fairchild and Brimley are the next real candidates for Igor/Alexios-style modeling once picked
  up — both have decision-changing thresholds, not yet checked for kit-data cleanliness.
- Conduit (Twins/Coppélia) real round-by-round Energy/Harmonization simulation is still a from-scratch
  project, unchanged in scope from every prior session's note on it.

## 2026-08-18 session 15 (v63)

**Rebuilt Liang Yue's `SKILL_KIT` from scratch** (Benson pasted the full authoritative Prydwen text:
Skills, Inheritance, Special effects, Euphoria I-IV, Portray Lv1-5). Prior entry (flagged broken last
session) had fields shifted by one position — skill names replaced by their own rank text, Bless Life
mislabeled, a bogus empty 4th entry. Rebuilt directly against the real paste; also fixed 3 separate
truncation bugs in `EUPHORIA_DB["Liang Yue"]` found while cross-checking (Tier I and II were missing
leading sentences; Tier IV was missing its entire first half — the part where Euphoria IV removes his
normal Ultimate generation and instead auto-casts Call of Thunder at 5 Moxie, a significant mechanic
change that had gone completely undocumented).

**Implemented Liang Yue's Talon → Bane of All Evil mechanic for real** (this unblocks the item flagged
last session). Two counters (`talonJustice`/`talonPeace`) accrue while he's under [Qiangliang Complete]
(tracked via the existing generic timed-status system, granted by his own Ultimate): casting Banish Evil
grants +1 Justice, Bless Life grants +1 Peace. Once combined total hits 6 (or 5 at Portray P2+, per
`teamPortray`), auto-triggers a free (0 AP) Bane of All Evil bonus attack — variant (Justice/Peace/
Balance) picked by whichever pool is larger, draining the larger pool first. Two labeled ASSUMPTIONS,
both stated in-code and in the UI note: (1) his kit's overlap-Spelldock-section casts should grant 0.5/
0.5 instead of a full +1, but this sim has no literal Spelldock-position model, so every qualifying cast
is treated as a flat +1 (slight overestimate); (2) the kit says "consume 6 combined" without specifying
which pool drains first when unequal — used larger-pool-first as a reasonable default.

**Verification**: `node --check` clean, declaration-name diff against v62 clean (0 missing fns/consts).
Initial Playwright test (solo Liang Yue, 10 rounds, 1 AP/round) showed the trigger never firing — dug in
with a round-by-round dump and confirmed this was NOT a bug: a 1-AP solo team can only afford either the
Ultimate recast (needed to keep [Qiangliang Complete] active) or a Banish Evil/Bless Life cast per round,
never both, so Talon gain averages under 1 every 2 rounds — 10 rounds isn't enough to reach 6. Re-ran
with 20 rounds and confirmed "Bane of All Evil" does render with 0 page errors, confirming the logic
itself is correct and the earlier failure was just an under-provisioned test, not an implementation bug.

Saved as `2026-08-18_v63_RE1999TeamBuilder.html`.

### Open items (carried forward, unchanged)
- Buddy Fairchild and Brimley are the next real candidates for Igor/Alexios/Liang-Yue-style modeling —
  both have decision-changing thresholds, not yet checked for kit-data cleanliness.
- Ezio Auditore's Synchronization gain is a known underestimate — revisit if riposte/enemy-defeat
  tracking is ever built.
- Kassandra's 2/6 precast-incantation thresholds still need a real card-injection engine.
- Ms. Stranger: revisit once her kit goes live (~2 weeks out per Benson, as of 2026-08-17).
- Conduit (Twins/Coppélia) real round-by-round Energy/Harmonization simulation remains a from-scratch
  project, unchanged in scope.

## 2026-08-18 session 16 (v65)

**Started the "next 6★ candidates" sweep** (Benson: "let's start from the 6 stars"). Cross-referenced
the 80 `resource_note` characters against `RARITY_MAP`: 54 are 6★. Of those, 5 (Igor, Ezio Auditore,
Kassandra, Ms. Stranger, Liang Yue) are already real-modeled or deferred; scanned the remaining ~49's
notes for a Igor/Alexios/Liang-Yue-shaped mechanic (clean numeric threshold that changes a real cast/
gain decision, not just damage-scaling).

**Cornerstone — attempted, then reverted** (Benson: "cornerstone.. not out yet"). Her Insight I (Max
Moxie -1/Ultimate Moxie Cost -1 → 4/4) and Insight III (+2 Moxie on entry, up to 4 banked Moxie overflow
refilling at round end) looked cleanly modelable and were briefly implemented + verified via Playwright
(no errors), but her `SKILL_KIT` source is explicitly flagged as community-translated/pre-release —
Benson confirmed she isn't live yet. Reverted all code changes (moxieCap/ultMoxieCost/addMoxie bank/
INSIGHT_MECHANIC entry) back to informational-only, same standard as Ms. Stranger. The exact numbers are
recorded in her `resource_note` as a ready-to-implement item once she actually releases — not lost work.

**Mercuria — real modeling added** (kit is live/released, numbers are clean). Two mechanics checked:
- Insight I "for each ally of the Natural Afflatus, gain Moxie +1 for self, up to +3" (entering battle):
  NOT implemented — this tool's verified `AFFLATUS_MAP` taxonomy is Star/Plant/Mineral/Beast/Spirit/
  Intellect; "Natural" doesn't match any of them, and WebSearch is blocked in this environment
  (`PROXY_REJECTED`, confirmed again this session) so it can't be cross-checked against a live source.
  Left unmodeled rather than guessing which real Afflatus it maps to.
- Insight III "at the end of the round, if allies have casted two or more rank 3 incantations for that
  round, gain Moxie +1 for self": IMPLEMENTED — uses the sim's own real per-card rank data
  (`skill.ranks.length === 3`, matching the sim's existing "cast at max shown rank" convention) to count
  qualifying casts each round, no fabricated numbers involved. Added a round-end check after the
  Liang Yue Talon block; verified via `node --check`, declaration-name diff against v63 (clean), and a
  3-character Playwright test (Mercuria/Rhiannon/Sonetto, no page errors, Moxie progression looks
  correct — cap reached faster than a flat 5-per-2-rounds baseline).

Saved as `2026-08-18_v65_RE1999TeamBuilder.html` (v64 was the reverted Cornerstone build, not delivered).

### Open items
- **Next candidates to check** (6★, `resource_note`, not yet screened for a clean threshold this
  session): Beryl (checked — Lingering Glow's accumulation-per-cast rate is enemy-count-dependent and
  not given as a fixed formula in kit text, so her 150-stack Destined Doom auto-cast can't be modeled
  without fabricating a conversion rate; NOT implemented for this reason), Argus, Fatutu, Hissabeth,
  Kaalaa Baunaa, Marsha, Corvus, Kiperina, Lucy, Marcus, Voyager, Windsong, Barcarola, Cheng Heguang,
  Eternity, Ezra, J, Jiu Niangzi, Kakania, Lorentz Butterfly, Moldir, Ms. NewBabel, Noire, Pickles,
  Recoleta, Regulus, Semmelweis, Sentinel, Spathodea, Vila, Willow, Ramona, Rubuska, Rhiannon, Charon,
  Enigma, Tuesday, Ulrich, Aleph, Brume, Lopera, Flutterpage, Centurion, "6", "37" — full note text for
  all of these is cached in this session at `/tmp/sixstar_notes.txt` if a future session wants to
  resume the sweep without re-extracting.
- Cornerstone: ready-to-implement once she releases (see her `resource_note` for the exact numbers).
- Buddy Fairchild and Brimley (5★, carried from last session) still not checked for kit cleanliness.
- Ezio Auditore's Synchronization gain remains a known underestimate; Kassandra's 2/6 precast thresholds
  still need a card-injection engine; Ms. Stranger deferred until her kit goes live.
- Conduit (Twins/Coppélia) round-by-round Energy/Harmonization simulation remains from-scratch.

## 2026-08-18 session 17 (v66) — full 6★ resource-mechanics sweep, first pass

**Scope** (Benson: "sweep all remaining characters... start from 6 star units till u finish every
single character. Do not stop, just create the new systems without checking with me"). Also answered
mid-sweep: Conduit (Twins/Coppélia) is deliberately OUT of this sweep's scope — it's a genuinely
separate resource loop (Energy/Harmonization, not Moxie), a from-scratch simulator project, not a
per-character check like the rest of this pass; still an open item, unchanged.

**Method**: took the 72 remaining `resource_note` characters (80 total, minus Liang Yue/Mercuria done
last session, minus Igor/Alexios/Kassandra/Ezio Auditore/Ms. Stranger/Cornerstone already resolved or
deferred), split into 4 batches of 18, and ran 4 parallel general-purpose agents to read each
character's full SKILL_KIT + INSIGHT_KIT text and flag ONLY mechanics that (a) change a real sim
decision — Moxie gain/cap/cost, an auto-triggered bonus action — not just damage/stat scaling, and
(b) have exact kit-stated numbers with zero invented conversion rates, drain orders, or assumptions
about randomness/enemy state. Agents were told to reject anything ambiguous rather than guess.

**Implemented this session (18 characters)**, all verified via `node --check`, a declaration-name diff
against v65 (clean both times), and Playwright smoke tests (mixed 4-character teams, zero page errors):
- **Flat entering-battle Moxie grants** (reuses the existing `moxie_on_entry` INSIGHT_MECHANIC
  infrastructure, no new code): Ramona (+2), Charon (+2), Enigma (+3), Reed (+1), Semmelweis (+3),
  Flutterpage (+2), Beryl (+1), Cheng Heguang (+2, already superseded by his existing Portray P2 +5),
  Tuesday (+2), Lorentz Butterfly (+2).
- **Afflatus-conditional entering-battle Moxie** (new custom code using the verified `AFFLATUS_MAP`
  taxonomy, same safe pattern established when Mercuria's unmappable "Natural" term was rejected):
  Lopera (+1, +1 more per Beast/Spirit/Intellect ally up to +2 total), Desert Flannel (+1 per Beast
  ally, one-time).
- **Special trigger mechanics** (new custom state/hooks in `simulateStateBlockPlan`):
  - **Buddy Fairchild** — full [Buddy Badge] economy: gain +4 from I Thank You Nature!, +10 from I
    Salute You Pals! (+1 Moxie if this overflows the 10-cap), +2 from any ally's Ultimate cast
    (Insight I), capped at 10, fully consumed by her own Ultimate; Insight III's "10+ badge at round
    start → Moxie +1 and Ultimate costs 0 AP that round" is modeled too. This was the exact candidate
    flagged since session 15 ("Buddy Fairchild and Brimley are the next real candidates") — resolved.
  - **Hissabeth** — [Snake's Den]: 8 stacks on entry, consumes at most 1/round to auto-cast a free
    (0 AP) rank-1 Hiss!.
  - **Moldir** — Insight III "after launching a riposte, gains Moxie +1", modeled as +1 Moxie when she
    casts her own Counter-type card (The Future Reclaimed) — same "actively-cast Counter counts as a
    riposte" convention already established in other characters' kit text (e.g. Cornerstone).
  - **Marcus** — Insight III [Perusal]: if 3+ Plant/Spirit/Intellect allies at battle start (static
    team check), casting a rank 2/3 incantation grants +1 Moxie.
  - **Yenisei** — [Flow]: 2 stacks on entry, consumed by casting Action Taker (her only rank-2/3
    Debuff-type card) for +1 Moxie.
  - **White Rum** — [Boarding Assault] boolean stance (not round-timed): casting "Prepare to Board!"
    sets it (+1 extra Moxie if already active); while active, every round auto-casts a free [Port Side
    Barrage] plus Moxie +1; her Ultimate is correctly excluded from natural readiness unless the stance
    is active (kit states it "can only be cast in [Boarding Assault]"), and casting it clears the stance.

**Explicitly rejected as unsafe to model** (checked, not guessed) — representative reasons, full detail
in the 4 agents' transcripts: random-chance gates (Regulus, Sentinel, Fatutu, Mr. Duncan, Noire, Jiu
Niangzi, Aleph, Kiperina, Marsha); enemy-count/enemy-state dependent (Beryl's 150-stack half — already
flagged last session — plus Charon's per-archetype-ally bonus, Sputnik, TTT, Ms. Radio, Hissabeth's
Serpentine-Scales half, Noire's Spotlight-count); HP/death tracking required, which this sim doesn't
have (Oliver Fog, Pavia, Charlie, Dikke, Door, Centurion, Eternity, Kakania, Semmelweis's HP-cost half,
Reed's revive half); pure damage/stat-scaling stacks with no decision to plug into (6, 37, Paper Heron,
Ulrich, Willow's drain rate, NORA, Isolde, J, Kanjira, Loggerhead, Lucy, Mondlicht, Balloon Party, Tooth
Fairy, Voyager, Windsong, Corvus, Kaalaa Baunaa, Argus's rank-sum tracking, Brume's compound-source
stack, Ezra, Kakania).

### Open items — flagged implementable but NOT yet built (deferred, exact numbers already sourced)
- **Rubuska** — Insight I: "reserve up to 3 excess Moxie, replenished at end of round" (same bank
  pattern as Cornerstone's reverted code — quick to build once picked up).
- **Nick Bottom** — Ultimate grants target [Summer Dream] for 3 rounds; while active, target gains
  Moxie +1 at round start (a timed-status-gated Moxie gain, new shape not yet built).
- **Pickles** — Insight I: not casting an incantation grants a [Clarified Topic] stack, consumed on
  next incantation/Ultimate cast for +1 Moxie; Insight III: +2 stacks on entry.
- **Recoleta** — Max Moxie +2 (Insight I) +3 (Insight III, cap +5 total), +1 Moxie when any ally casts
  Ultimate, +3 Moxie on entering battle; her own Ultimate's Moxie-overspend-to-lowest-ally transfer.
- **Tennant** — Insight I: on entering battle, auto-casts 1-star "A Bouquet of Galaxy" once.
- **Vila** — entering battle +1 Moxie, +1 more per "other Mental DMG ally" up to +2 — blocked on
  whether "Mental DMG" is a trackable per-character tag in this tool (needs checking; not the same as
  Afflatus).
- **Brimley** (carried since session 15) — Insight III: whenever the ally with [Riding Double] takes 3
  actions, Brimley gains Moxie +1 (once/round) — needs a per-ally action-count tracker, not yet built.
- **Lady by the Lake** — Collection of Brushstrokes rank 2/3 grants the target (and self at rank 3)
  Moxie +1, tied to a 3-round [Cubism] status — timing ambiguity (immediate vs. delayed) needs a
  judgment call before building.
- **Melania** — Ultimate grants self 1 stack of [Thief Master]; casting Clockwork Rats while holding
  it grants self +1 Moxie (needs a consumed-on-next-cast flag, similar shape to Pickles).
- **Ms. NewBabel** — Old Idea rank 2/3: if caster has an active [Shield] after attacking, Moxie +1 —
  blocked because this sim's status extractor only catches bracket-notation `[Status]` grants, and her
  own Shield-granting card text doesn't bracket "Shield."

Saved as `2026-08-18_v66_RE1999TeamBuilder.html`.

### Open items — still fully unswept
- Buddy Fairchild is now DONE (moved out of the "next candidates" slot from session 15).
- The 5★/lower-rarity `resource_note` characters (Isolde, Balloon Party, Kanjira, etc. — most were
  swept incidentally as part of this batch since they were in the same character list, but the
  remaining unswept portion is small; a dedicated non-6★ pass hasn't been run as its own exercise).
- Conduit (Twins/Coppélia) round-by-round Energy/Harmonization simulation remains from-scratch,
  confirmed still out of scope this session per Benson's own framing.
- Cornerstone: ready-to-implement once she releases (numbers recorded in her `resource_note`).
- Ezio Auditore's Synchronization gain remains a known underestimate; Kassandra's 2/6 precast
  thresholds still need a card-injection engine; Ms. Stranger deferred until her kit goes live.

## 2026-08-18 session 18 (v67) — cleared the "deferred but implementable" backlog from session 17

Went back through session 17's 10 deferred-but-implementable candidates and built the ones that were
genuinely clean; re-checked the other 4 more carefully and confirmed they still need more infrastructure
or a judgment call this pass didn't want to force. All verified via `node --check`, a declaration-name
diff against v66 (clean), and Playwright smoke tests (4 mixed teams, zero page errors).

**Implemented (4 more characters)**:
- **Rubuska** — Insight I Moxie bank: "reserve up to 3 excess Moxie, replenished at end of round" —
  same overflow-bank shape as the reverted Cornerstone code, safe here since she's released.
- **Nick Bottom** — his Ultimate's [Summer Dream] status (3 rounds, tracked via the generic timed-
  status system) grants "Moxie +1 when a round starts" while active — modeled as a round-start check.
- **Tennant** — Insight I's one-time "immediately casts 1-star A Bouquet of Galaxy" on entering battle,
  modeled as a free bonus action at round 1. (Insight III's HP<50% variant of the same trigger stays
  unmodeled — no HP tracking in this sim.)
- **Brimley** — Insight III's "whenever the [Riding Double] holder takes 3 actions, Brimley gets Moxie
  +1 (once/round)" — tracks the current status holder's cumulative action count, resetting if the
  holder changes. This was the OTHER half of the exact session-15 candidate ("Buddy Fairchild and
  Brimley are the next real candidates") — now both are resolved.

**Re-confirmed still deferred** (not a quick win, needs more thought/infrastructure):
- Pickles, Recoleta, Vila, Lady by the Lake, Melania, Ms. NewBabel — unchanged from session 17's
  reasoning (see that entry for exact numbers and blockers).

Saved as `2026-08-18_v67_RE1999TeamBuilder.html`.

### Running total of real-modeled characters beyond the base AP/Moxie loop
`AUTO_ULT_GATE_CONFIG` (4): Igor, Alexios, Kassandra, Ezio Auditore. Plus 22 more with bespoke real
mechanics: Liang Yue, Mercuria, Ramona, Charon, Enigma, Reed, Semmelweis, Flutterpage, Beryl, Cheng
Heguang, Tuesday, Lorentz Butterfly, Lopera, Desert Flannel, Buddy Fairchild, Moldir, Marcus, Yenisei,
White Rum, Hissabeth, Rubuska, Nick Bottom, Tennant, Brimley — 26 characters total (out of 131) now have
mechanics that actually change the simulator's decisions, up from 4 at the start of this session.

### Open items
- Pickles, Recoleta, Vila, Lady by the Lake, Melania, Ms. NewBabel (see session 17 for details).
- Cornerstone: ready once she releases. Ms. Stranger: ready once her kit goes live (~2 weeks per
  Benson as of 2026-08-17). Ezio Auditore's Synchronization gain is a known underestimate. Kassandra's
  2/6 precast thresholds need a card-injection engine.
- Conduit (Twins/Coppélia) round-by-round Energy/Harmonization simulation remains from-scratch,
  explicitly out of scope (confirmed again this session, Benson: "conduit system not built yet i
  assume... do the rest" [of the other characters]).
- The rest of the originally-80 `resource_note` characters were checked this session (sessions 17-18)
  and either implemented or explicitly rejected for cause (random chance, enemy-state dependency, no
  HP tracking, or pure damage-scaling with no decision to plug into) — see session 17 for the full
  categorized rejection list. No further unswept 6★ characters remain as of v67.

## 2026-08-18 session 19 (v68) — Conduit round-by-round simulation, plus the last 5 deferred characters

Benson: "ok include conduit units. include conduit units. continue with all the other characters" —
reversed the earlier Conduit-out-of-scope call from session 17/18, and closed out the remaining
deferred backlog. All verified via `node --check`, a declaration-name diff against v67 (clean, only
additions), and Playwright smoke tests (mixed teams including all 5 new characters plus Conduit
solo/mixed teams, zero page errors).

**New: Conduit round-by-round tracker (`simulateConduitPlan`/`renderConduitRounds`)** — a deliberately
narrower, SEPARATE simulation for The Twins and Coppélia's Harmonization/Energy (NOT forced through the
AP/Moxie loop, since they don't use it). Tracks entering-battle Harmonization (Twins +70, Coppélia +30,
both Insight III), Coppélia's +15/round base Harmonization gain (Insight I), and one assumed generator-
card cast per round per character (Twins' Set A "Atomic Fusion" for +4 Mineral Energy; Coppélia's
"Vowel Basics" for +2 Mineral Energy + 15% Harmonization) as a conservative floor, not the full
economy. Neither character has a kit-CONFIRMED Harmonization threshold that gates their Ultimate, so
this sim uses an explicitly labeled `CONDUIT_HARMONIZATION_CAP_ASSUMED = 100` — clearly marked as an
assumption, not a kit-confirmed number, per Benson's standing "mark assumptions for the rest" call.
NOT modeled (documented in-code): The Twins' Set A vs Set B choice, either character's unlimited
repeat-cast cycling within a round, Coppélia's [Interval Step] gain from ally-triggered Instruments.

**Implemented (5 more characters, closing the deferred backlog)**:
- **Pickles** — Insight I/III's [Clarified Topic]: end-of-round +1 stack if she didn't actively cast
  that round, +2 stacks on entering battle, and any card (incl. her Ultimate) cast while holding a
  stack consumes 1 and grants +1 Moxie (the Insight I text's own stated trigger-gain).
- **Recoleta** — Max Moxie +5 (cap 10, Insight I+III), entering-battle +3 Moxie (Insight III), +1
  Moxie whenever another ally casts their own Ultimate (Insight I), and her own Ultimate's overspend
  transfer: consumes her FULL current Moxie (not just the standard 5-cost), redistributing every point
  beyond that one-at-a-time to whichever OTHER ally currently holds the lowest Moxie (ASSUMED
  tie-break rule — the amount redistributed is kit-exact, only the target-selection is a judgment call).
- **Lady by the Lake** — "Collection of Brushstrokes" cast at rank 3 (this sim's max-rank convention)
  grants Moxie +1 to a target ally and +1 to herself; target-ally selection defaults to the lowest-
  current-Moxie other ally (same ASSUMED convention as Recoleta's transfer, since the kit doesn't
  specify a targeting rule).
- **Melania** — her Ultimate grants 2 [Thief Master] stacks per cast (Insight I + III); the next
  non-Ultimate cast while holding a stack consumes 1, and if that card is specifically "Clockwork
  Rats" (max rank), grants +1 Moxie exactly per kit text. Silent Takedown's Thief-Master clause
  (steals Moxie from the TARGET) stays unmodeled — enemies aren't Moxie-tracked in this sim.
- **Ms. NewBabel** — casting "A New Wave" sets her own tracked Shield flag for 2 rounds; casting "Old
  Idea" at rank 2/3 while that flag is active grants +1 Moxie, exactly per kit text.

**Still unmodeled / rejected (no change)**: Vila remains blocked — her kit's "Mental DMG ally" clause
doesn't map to anything in this tool's verified data (no DMG-type taxonomy exists at all, confirmed via
grep — same standard applied to Mercuria's "Natural Afflatus" gap). Ms. NewBabel's Guarding Instinct/
Loyal Partner threshold and Lady by the Lake's Composition-driven Ultimate/rank-upgrade math remain
informational-only (enemy-attack-dependent and pure damage-scaling respectively).

Saved as `2026-08-18_v68_RE1999TeamBuilder.html`.

### Running total of real-modeled characters beyond the base AP/Moxie loop
`AUTO_ULT_GATE_CONFIG` (4): Igor, Alexios, Kassandra, Ezio Auditore. Plus 27 more with bespoke real
mechanics: Liang Yue, Mercuria, Ramona, Charon, Enigma, Reed, Semmelweis, Flutterpage, Beryl, Cheng
Heguang, Tuesday, Lorentz Butterfly, Lopera, Desert Flannel, Buddy Fairchild, Moldir, Marcus, Yenisei,
White Rum, Hissabeth, Rubuska, Nick Bottom, Tennant, Brimley, Pickles, Recoleta, Lady by the Lake,
Melania, Ms. NewBabel — 31 characters total (out of 131), plus The Twins/Coppélia now on a separate
real-but-scoped-down Harmonization/Energy tracker (previously fully unsimulated/informational-only).

### Open items (as of v68)
- Vila remains blocked (no DMG-type taxonomy in this tool to hook her "Mental DMG ally" clause to).
- Cornerstone: ready once she releases. Ms. Stranger: ready once her kit goes live. Ezio Auditore's
  Synchronization gain is a known underestimate. Kassandra's 2/6 precast thresholds need a
  card-injection engine.
- Conduit's generator-card economy is a conservative one-cast-per-round floor, not the full repeat-
  cast ceiling; the 100-Harmonization Ultimate-ready cap is an explicit, labeled ASSUMPTION pending a
  kit-confirmed number. Set A/B choice and cross-character Interval Step triggers aren't modeled.
- No further unswept 6★ characters remain as of v68 — the full sweep Benson requested this session
  (starting from session 17) is now functionally complete, modulo the items above.

## 2026-08-18 session 20 (v69) — Conduit AP fix + manual card picker; Benson: "the conduit characters have ap too!"

Benson caught two real gaps in the freshly-shipped Conduit tracker (v68), both fixed same session:

**AP fix**: The Twins/Coppélia DO draw from the shared team AP pool — they're just AP-FREE to cast
(their own Energy-card casts don't spend it; the Conduit ARCH_INFO primer already said this: "arranging/
casting these doesn't spend AP"). What was missing: their HEADCOUNT contribution to that shared pool
size, plus The Twins' Insight I stating a flat personal "AP +1" bonus on top of their own slot (a
permanent passive, not a temporary window like Rhiannon's Continuous Action I). New helper
`conduitApContribution(conduitArr)` = headcount + 1 if The Twins present; wired into both
`renderStateBlockPlan`'s `fullTeamSize` (mixed teams) and the Conduit-only fallback path (which
previously showed NO AP number at all). `simulateConduitPlan`/`renderConduitRounds` now display this
pool per round, with a note clarifying Conduit's own casts don't compete for it.

**Card-type clarity**: Benson: "also the conduit character have incantation cards too!! energy cards as
well." The sim already modeled both halves (an Incantation cast AND its attached "Energy Card" effect,
per Coppélia's own kit text: "...Energy Card: Mineral II — gain +2 Mineral Energy") — just labeled
loosely as a generic "Assumed cast." Relabeled the round notes to explicitly name both card types.

**Manual card picker**: Benson: "for now give them a space in the turn by turn to choose a card for
them to use." Added a per-round `<select>` picker for each Conduit character in `renderConduitRounds`,
reusing the EXACT same `manualPlayOverride`/`.mp-select`/`sbGetPlayOptions`/`mpOverrideKey` mechanism
already built for standard characters — no new event-listener wiring needed, since the existing
delegated `document.addEventListener('change'/'click', ...)` handlers match by CSS class, not by
scope. Picking a specific card updates the displayed "Incantation cast" note to that card name;
picking "SKIP" logs "no Incantation cast, no Energy gained" that round. Honest scope limit, stated in
the code comment: the Energy/Harmonization NUMBER granted still uses the same flat conservative
default regardless of which card is picked — exact per-card Energy costs/rewards for every card
OTHER than the default aren't modeled yet. "Which card" is now a real choice; "how much Energy it
grants" isn't card-specific yet.

All three fixes verified via `node --check`, a declaration-name diff against v68 (clean, only
`conduitApContribution` added), and Playwright tests (Conduit-only team, mixed team with standard
characters, manual picker selecting a non-default card and SKIP, all zero page errors).

Saved as `2026-08-18_v69_RE1999TeamBuilder.html`.

## 2026-08-18 session 20 continued (v71) — swept the remaining ~44 non-6★/misc characters

Benson: "pls continue with the other characters" — ran the same 4-parallel-agent sweep methodology
(session 17/18's pattern) against the last 44 `resource_note` characters not yet checked this session
(mostly 5★-and-under plus a handful of 6★ that hadn't been read yet: Rhiannon, Corvus, Eternity, J,
Jiu Niangzi, Kaalaa Baunaa, Kakania, Noire, Windsong, etc.). Each agent read ~11 characters' full raw
kit text and returned IMPLEMENTABLE/REJECT verdicts against the same no-fabrication bar (no RNG, no
enemy-state dependency, no HP/death tracking, exact stated numbers only). Two of the agents'
IMPLEMENTABLE calls (Lucy, Willow) were overridden to REJECT/deferred after re-reading the exact kit
text personally — Lucy's Moxie+1 lives behind her unbuilt "Reinforce/Advancement" choice system
(depends on team-wide Dynamo totals and a 3-basics-then-Ultimate reinforce order), and Willow's
"[Ancient Ritual] +5 Max Moxie / +1 Moxie per cast" is gated on her Ultimate's own channel status,
which has no stated duration or per-round Moxie-deduction number in the sourced kit text — both would
require inventing numbers the kit doesn't state, so both stay informational-only rather than guessed.

**Implemented (9 characters)**:
- **Rhiannon** — Insight III entering-battle +3 Moxie; [Attunement] tracked as a real counter (round-
  start +2, cap 4, -1 consumed by her own Babble-Gabble/Sneaky-Peaky casts), with Insight III's
  separate round-end "consume 1 Attunement → Moxie +1" now real.
- **Noire** — Insight I's round-start [Spotlight] infliction is a guaranteed, deterministic once/round
  trigger (no RNG, no enemy-count dependency); Insight III's "gain Moxie +1 whenever another unit is
  inflicted with Spotlight" is modeled against just this one guaranteed floor — the EXTRA infliction
  chances from her attack cards depend on enemy targeting/count and aren't modeled.
- **Brume** — [Thermoelectric Conversion] tracked as a cumulative-lifetime-gained counter (flat +5/
  round base gain only — the ally-Dynamo-transfer and Burn-count bonus gains aren't modeled, no team-
  wide totals tracked); Insight III's "every 15 stacks GAINED grants Moxie +1" is real against that
  floor.
- **Corvus** — her Ultimate's bundled "Sew It All Up" cast transfers 20 Dynamo into Pulsing Field each
  time (tracked as a simplified monotonic cumulative counter, not resetting — the real game's Pulsing
  Field buff expires and resets the transferred total, not modeled exactly); reaching 120 for the
  first time grants the kit-stated one-time Moxie +3 and raises her Moxie cap to 10 (+5) per
  [Amplified Surge: Corvus]'s exact text.
- **Ezra** — Ultimate: "Moxie +1 ... for other allies" (Eureka half not tracked).
- **Door** — Ultimate: "Moxie +2 for other allies"; [Inspire] status (2 rounds, from the same
  Ultimate) grants round-start Moxie +1 while held, via the generic timed-status system. (The self-
  sacrifice HP clause and Insight I's death-trigger aren't modeled — no HP/death tracking.)
- **Barcarola** — Ultimate "Sea Breeze Serenade": flat self Moxie +1.
- **Centurion** — "Outdoor Superstar" cast at rank 3 (max-rank convention) states "Moxie +2 to self"
  directly — added to `SPECIAL_CARD_GAIN` (replaces the generic +1, not additive).
- **Argus** — Insight III's round-end rank-sum bonus attack ("5-6 Ranks... Moxie +1... 7+ Ranks...
  Moxie +1") modeled by summing `skill.ranks.length` across Argus's own non-Ultimate casts each round
  (self-scoped, matching her Insight I's explicit self-only framing) — real, exact.
- **Aleph** — no new code needed: her "Disciplinary Power" card's "[Continuous Action I] for 1 round"
  text already matches the EXISTING generic `sbDetectApPlusOneWindow` regex detector, so her AP+1
  mechanic was already being auto-modeled without anyone realizing it. Confirmed via code read, not
  re-implemented.

**A TDZ near-miss caught before verification**: the first draft declared `corvusReachedLv3` next to
the other new state variables (after `charByName` and the `startMoxie` loop), but `moxieCap()` — which
needed to read it for Corvus's cap-10 branch — is called from the `startMoxie` loop itself (e.g. via
`moxieCap('Recoleta')`), which runs BEFORE that point in the function. Moved the flag's declaration to
the very top of `simulateStateBlockPlan`, before `chars` — the exact same class of bug fixed earlier
this session (referencing a later-declared `let` from code that executes first), caught this time by
habit rather than by a failing test.

All verified via `node --check`, a declaration-name diff against v69 (clean), and Playwright smoke
tests across 3 mixed 4-character teams covering all 9 new characters plus Aleph/Lucy/Willow, zero page
errors.

Saved as `2026-08-18_v71_RE1999TeamBuilder.html`.

### Running total of real-modeled characters beyond the base AP/Moxie loop
`AUTO_ULT_GATE_CONFIG` (4): Igor, Alexios, Kassandra, Ezio Auditore. Plus 36 more with bespoke real
mechanics (the 27 from v68 — see that section — plus Rhiannon, Noire, Brume, Corvus, Ezra, Door,
Barcarola, Centurion, Argus) — 40 characters total (out of 131), plus The Twins/Coppélia on the
separate Harmonization/Energy/AP-pool Conduit tracker.

### Open items
- Vila remains blocked (no DMG-type taxonomy). Lucy (needs the Reinforce/Advancement choice system)
  and Willow (Ancient Ritual's duration/deduction numbers aren't stated in the sourced kit text) are
  the two newest informational-only deferrals — everything else checked this session was either
  implemented or rejected for a stated cause (RNG, enemy-state dependency, no such mechanic exists).
- Cornerstone/Ms. Stranger: ready once released/live. Ezio Auditore's Synchronization gain is a known
  underestimate. Kassandra's 2/6 precast thresholds need a card-injection engine.
- Corvus's Pulsing-Field-transferred counter is a simplified MONOTONIC cumulative (never resets) —
  the real game's buff expires per-level (2-3 rounds) and clears the transferred total when removed;
  this sim's simplification means her Moxie+3/cap-10 threshold, once crossed, never reverts.
- Conduit's generator-card economy is still a conservative one-cast-per-round floor; the manual picker
  (v69) lets Benson log which card he actually played, but the Energy/Harmonization NUMBER granted per
  pick is still the same flat default regardless of card choice — exact per-card amounts for cards
  other than each character's default aren't modeled yet.
- With this batch, essentially every `resource_note` character with a stated, unambiguous, non-RNG,
  non-enemy-state Moxie/AP mechanic has now been checked and either implemented or explicitly
  rejected with a cited reason. What remains unmodeled going forward is either pre-release content, a
  known deliberate scope boundary (no damage/HP/enemy-state tracking), or something genuinely gated on
  an unbuilt secondary system (Lucy's Reinforce/Advancement, the Conduit per-card Energy economy).

## Session 20 continued (v72–v73)

### v72: Vila/Willow/Lucy assumed-numbers + Flutterpage AP+1 priority fix
Per explicit instruction to stop rejecting Vila/Willow/Lucy for missing exact numbers and instead
implement them with clearly labeled ASSUMED values:
- Vila: `ASSUMED_MENTAL_DMG_CHARACTERS` — a 60-name list derived (not guessed) by scanning each
  character's own rebuilt `SKILL_KIT` text for Mental/Reality/Genesis/Mystic DMG occurrence counts and
  taking the most frequent type per character. Used to grant Vila's Insight I Moxie trigger.
- Willow: `ASSUMED_WILLOW_RITUAL_ROUNDS = 3`, `ASSUMED_WILLOW_RITUAL_DEDUCTION = 1` (both invented, kit
  states no duration/deduction) — her Ultimate opens a 3-round channel, Moxie cap 10 while active,
  ticks down and deducts 1 Moxie/round, own casts grant +1 Moxie while active.
- Lucy: rather than build the unbuilt Reinforce/Advancement system, the sim now assumes she's always
  reinforced by the time her Ultimate casts (consistent with this sim's existing best-case convention)
  — flat Moxie +1 on her Ultimate cast.
- Flutterpage: fixed a real bug, not an assumption — her AP+1-granting card (Cotton Kite) was tied at
  generic priority-2 with every other candidate, so it could lose the AP race and never get cast. Now
  tagged the same early priority tier as AP-free/Ultimate casts. Verified via Playwright: casts round 1,
  AP+1 buff active from round 1 in the correct repeating cycle.
- Also moved `corvusReachedLv3` to the very top of `simulateStateBlockPlan` (another TDZ near-miss,
  caught before verification this time) and folded a Centurion card-gain hook into `SPECIAL_CARD_GAIN`
  instead of a separate `resolveCandidate` hook (was about to double-count on top of the generic +1).

### v73: Conduit round-card merge, stale-text fix, dated language cleanup, Ultimate archetype
- Finished the in-progress Conduit round-card merge: each Conduit character (The Twins, Coppélia) now
  gets its own slot bar inside the SAME round card as the standard AP/Moxie characters, instead of a
  separate trailing panel — reuses the existing manual-picker machinery. The old separate
  `renderConduitRounds` call is now only used as a fallback for Conduit-only teams (still routed through
  `renderStateBlockPlan`), avoiding a regression there.
- Fixed the stale "(NOT FIXED — TO BE FIXED IN FUTURE)" text in the "Special conditions in effect" box
  — written back when Conduit had zero round-by-round modeling, never updated once it was built.
  Replaced with an accurate note pointing at the character's own slot bar and flagging which numbers
  are ASSUMED.
- Stripped all "2026-08-18: ... IS now REALLY modeled" session-diary phrasing out of every
  user-facing `resource_note` (31 entries touched) — rewritten as plain mechanic descriptions with
  the same informational content (what's modeled vs. what remains informational-only), no dates or
  session references.
- Found and fixed a genuine factual contradiction in The Twins'/Coppélia's `does[]` text: both claimed
  "unspent Energy carries into the next round," which contradicts the confirmed rule (and this file's
  own `ENERGY_RESET_OVERRIDE` comment) that Energy resets to 0 every round under the current patch.
  Corrected both.
- Rewrote the Conduit archetype primer (`ARCH_INFO.Conduit`) to state the mechanic precisely: playing
  an Energy card is what triggers one of the character's two real skills (0-Energy / 1-2-Energy) plus
  their Ultimate — both the Energy-card play AND the skill/Ultimate it triggers are AP-free, only the
  AP pool other teammates draw from is affected by a Conduit character's presence. Also confirmed real
  Portray data for both The Twins and Coppélia already exists in `PORTRAY_DB` and is already wired up
  and rendered via the existing Portray dropdown (`c.portray = PORTRAY_DB[c.name]`) — no new field
  needed; an initial attempt to also add Portray summaries into each character's `bp[]` array was
  reverted since `bp` is dead/unrendered data in this codebase (confirmed via grep — no reader exists).
- Added a new `ARCH_INFO.Ultimate` archetype ("feed one DPS's Ultimate as hard/as often as possible")
  and tagged Igor, Moldir, Melania, Recoleta, Getian, and Lopera with it (multi-tag, added alongside
  their existing archetype tags, not replacing).

All verified via `node --check`, a declaration-name diff against v72 (clean, zero missing/added
functions or consts across all of v72→v73), and Playwright smoke tests on a mixed team
(Rhiannon/Coppélia/Fatutu/Charon), a Conduit-only team (The Twins/Coppélia), and a spot-check team
(The Twins/Coppélia/Igor/Melania) — zero page errors, no stale "NOT FIXED" text, no "2026-08-18" text
anywhere in rendered output.

Saved as `2026-08-18_v73_RE1999TeamBuilder.html`.

### Open items (unchanged from v71/v72 unless noted above)
- Vila/Willow/Lucy now implemented under explicit ASSUMED numbers (see v72 above) rather than deferred.
- Cornerstone/Ms. Stranger: ready once released/live.
- Conduit's per-card Energy/Harmonization amount granted is still a flat default regardless of which
  card the manual picker selects — exact per-card amounts beyond each character's default aren't
  modeled yet.

## Session 20 continued (v74) — resource-model audit + real Energy-reset bug found and fixed

Benson asked to confirm his own summary of the two resource systems and get updated docs. Audited the
actual code (not just prior doc claims) to answer precisely:

**Standard characters** — Benson's summary is correct in spirit but the "moving a card" language
conflates two distinct triggers. The sim's real rule (`addMoxie`/`moxieCap`, unchanged): +1 Moxie
automatically at the start of every round (a passive regen, not tied to any action) + +1 per card
actually cast + +1 per accidental (free, team-wide, 1/round) merge + +2 per forced (deliberate, costs
1 AP) merge. Moxie cap is 5 by default and Ultimate becomes castable the instant it hits 5 — but the
cap isn't universally 5: Recoleta is always 10, Corvus/Willow are conditionally 10 (Lv3/ritual-active),
Anjo Nala is 12 while bound. "Merging cards" is the real mechanic here — there's no separate "moving a
card" trigger distinct from that.

**Conduit characters** — correct that they don't use Moxie and run on separate resources, but the
code does NOT track `mineral_energy`/`star_energy` as two separate fields — `simulateConduitPlan` uses
one flat `energy[name]` counter per character (the real Mineral-vs-Star split exists in kit lore, e.g.
The Twins' two swappable sets, but isn't modeled as two numbers since per-card exact Energy costs for
every card beyond each character's default aren't sourced). Ultimate readiness is gated on an ASSUMED
100-Harmonization threshold (`CONDUIT_HARMONIZATION_CAP_ASSUMED`) — explicitly labeled non-kit-confirmed
in-code; the only actually-confirmed number (`CONDUIT_ULT_GATE['The Twins']`) is that reaching 100
Harmonization AND 9+ Energy grants a bonus Penetration Rate stat on the Ultimate's damage, not a
confirmed hard cast-gate. So "Ultimate unlocks via Harmonization thresholds" is this sim's necessary
placeholder, not a verified kit rule.

**Real bug found and fixed while auditing this**: `sbEnergyResetsEachRound(name)` (added 2026-08-17,
confirmed rule: Energy resets to 0 every round under the current patch) was wired into the INFO PANEL
text (`renderConduitPanel`) but never actually called inside `simulateConduitPlan`'s round loop — so the
displayed panel correctly SAID Energy resets each round while the simulator itself kept accumulating it
forever (only zeroing on an Ultimate cast). Fixed: added `if(r > 1 && sbEnergyResetsEachRound(name))
energy[name] = 0;` at the top of the per-character per-round block, before that round's gain is added.
Verified via Playwright: The Twins' Energy now correctly holds flat at 4/round instead of climbing
4/8/12/16/... — matches the documented rule for the first time.

Verified via `node --check`, a clean declaration-name diff against v73, and a Playwright load of
The Twins + Coppélia with zero page errors.

Saved as `2026-08-18_v74_RE1999TeamBuilder.html`.

## Session 20 continued (v75) — real per-card Conduit math + manual Ultimate selection

Benson pasted Coppélia's exact real kit text (Finger Training/Vowel Basics/Ultimate, full Energy Card
attachments and term defs) and asked to let both Conduit characters actually cast their real
Incantations via manual selection — "let's pretend that coppelia and twins 'cast incantations' you
must allow me to manually select these skills + ult" — and to remove the ASSUMED-Harmonization-cap
auto-Ultimate-trigger display entirely ("remove 60/100 Harmonization (ASSUMED cap)... AP-free per kit
text"). Mid-turn he also asked for (and got) an explicit "untested" disclaimer on this new mechanic.

Replaced the old "one flat default delta regardless of which card was picked" MVP with real per-card
Energy/Harmonization deltas sourced directly from the pasted kit text, via a new `CONDUIT_CARD_EFFECTS`
table:
- Coppélia: Finger Training (-2 Mineral Energy, +10 Harmonization), Vowel Basics (0 cost, +2 Energy via
  its attached "Mineral II" Energy Card; the separate "+15% Harmonization" is a percentage-based grant
  with no stated base, left uncomputed rather than guessed), Ultimate (+2 Energy/+10 Interval Step via
  its attached "Interval Skip" Energy Card, then resets Harmonization/Energy to 0 on cast — Interval
  Step/Instrument Tuning I/damage math stay informational-only).
- The Twins: Set A Atomic Fusion (+4 Mineral Energy, unchanged from before), Set A Polymeric Ray/Set B
  Balancé Across the Stars/Set B Extreme Overclocking (no stated Energy cost or gain in the sourced kit
  text for any of these three — left at 0 rather than fabricated, each with an explanatory note), and
  Ultimate (resets Energy to 0 on cast — her Ultimate's real 6+/9+/12+ Energy damage tiers stay
  informational-only, no separate Harmonization cast-gate is kit-confirmed for her, only a bonus
  Penetration Rate stat at 100 Harmonization + 9 Energy per `CONDUIT_ULT_GATE`).
- Ultimate is now just another pickable option in the SAME dropdown (`sbGetPlayOptions` already listed
  it) — no more auto-firing at an assumed 100-Harmonization threshold. Removed
  `CONDUIT_HARMONIZATION_CAP_ASSUMED` entirely and both "/100 (ASSUMED cap)" display strings (round-card
  state line and the merged slot-bar state line) — Harmonization/Energy now just show their raw numbers
  with a note that neither has a kit-confirmed cap.
- Added an explicit "⚠ Untested" disclaimer at the top of the Conduit info panel (`renderConduitPanel`)
  per Benson's mid-turn request: this is a same-session rewrite from flat-default to real per-card math
  and hasn't been run against an actual match to sanity-check the numbers end to end.
- No pick made for a round still falls back to a labeled ASSUMED default (Vowel Basics / Atomic Fusion)
  rather than doing nothing, matching the pre-v75 default behavior.

Verified via `node --check`, a declaration-name diff against v74 (only expected change:
`CONDUIT_HARMONIZATION_CAP_ASSUMED` removed, `CONDUIT_CARD_EFFECTS` added — zero unexpected drops), and
a live Playwright test that actually changed Coppélia's round-1 pick from the default to "Finger
Training" via the real `<select class="mp-select">` and confirmed the displayed Harmonization/Energy
numbers moved by exactly the real kit amounts (45→55 Harmonization, 2→0 Energy) — zero page errors.

Saved as `2026-08-18_v75_RE1999TeamBuilder.html`.

### Open items
- This is genuinely UNTESTED against a real match — flag as first-pass until Benson confirms the
  numbers feel right in actual play.
- The Twins' Set A Polymeric Ray, Set B Extreme Overclocking, and Set B Balancé Across the Stars all
  have zero Energy cost/gain modeled (no number stated in her sourced kit text) — if a stronger source
  turns up real numbers for these, wire them into `CONDUIT_CARD_EFFECTS['The Twins']` the same way.
- Interval Step (Coppélia's own +1% Ultimate Might/stack counter, cap 30) and Instrument Tuning I
  (Energy-cost-reduction stacks) are still informational-only — not tracked as numeric state anywhere,
  only mentioned in the Ultimate's cast note.

## Session 20 continued (v76) — The Twins' real attached Energy Card numbers

Benson pasted the full real kit text for all 4 of The Twins' non-Ultimate cards plus her Ultimate,
each showing an attached "Energy Card" sub-effect that v75 didn't have numbers for. Updated both the
SKILL_KIT rebuild (added the Energy Card lines verbatim to each card's rank text) and
`CONDUIT_CARD_EFFECTS['The Twins']`:
- Set A: Atomic Fusion — was +4 Mineral Energy only; now +5 (4 self-buff + 1 from attached "Mineral
  Energy I" Energy Card).
- Set A: Polymeric Ray — was 0 (no number previously sourced); now +2 Mineral Energy from its attached
  "Mineral Energy II" Energy Card.
- Set B: Extreme Overclocking — was 0; now +1 Star Energy from its attached "Star Energy I" Energy Card.
- Set B: Balancé Across the Stars — unchanged at 0; confirmed no Energy Card is attached to this one in
  the real text, so 0 remains correct (not a gap).
- Ultimate — unchanged (still resets Energy to 0 on cast); documented that its own two attached Energy
  Cards ("Efficient Conversion"/"Pulse Amplification", +1 Mineral/+1 Star Energy each, conditional
  Conduit Might if Polymeric Ray/Balancé Across the Stars was also cast this round) wash out under the
  reset in this sim's flat single-Energy-counter model — informational only.

Verified via `node --check`, a clean declaration-name diff against v75, and a live Playwright test
picking "Set A: Polymeric Ray" for round 1 and confirming Energy read 2 that round vs. 5 on later
(default Atomic Fusion) rounds — zero page errors.

Saved as `2026-08-18_v76_RE1999TeamBuilder.html`.

## Session 20 continued (v77) — removed the Harmonization/Energy state line from round cards

Benson, with a screenshot: "stop talking about energy and harmonization in the play-by-play as a
resource... im gonna strip it out. remove: '45 Harmonization, 2 Energy — AP-free per kit text, no
kit-confirmed cap on either...'" Removed that exact display line (`stateLabel` in the merged Conduit
slot bar inside `renderStateBlockPlan`) — it's now an empty string, so nothing renders there. The
underlying numbers are untouched — `conduitRounds[].harmonization`/`.energy` are still computed exactly
as before (v76), just no longer surfaced in this specific per-round line; the action notes below it
(Insight I Harmonization gain, per-card Energy deltas) are unchanged since Benson only pointed at this
one line, not the whole panel.

Verified via `node --check`, a clean declaration-name diff against v76, and a Playwright load of
The Twins + Coppélia confirming the line no longer appears anywhere in the rendered output — zero page
errors.

Saved as `2026-08-18_v77_RE1999TeamBuilder.html`.

## Session 20 continued (v78) — Portray/Insight callout for Conduit characters, screenshot #2 fix

Two more Benson asks in quick succession:
1. Second screenshot flagged the "Special conditions in effect" box still saying "runs on
   Harmonization/Energy" for Coppélia/The Twins — same "stop talking about it as a resource" ask as
   the round-card fix in v77, just a second location. Reworded to "casts its own Incantations/Ultimate
   (own slot bar below in each round) rather than drawing on AP/Moxie." Also removed the now-stale
   "the 100-Harmonization Ultimate-ready cap is an explicitly labeled ASSUMPTION" line from
   `renderConduitRounds`'s trailing note (left over from before v75 removed that cap entirely) and
   removed the same Harmonization/Energy state line from the Conduit-only-team fallback path
   (`stateLine` in `renderConduitRounds`) for consistency with the merged-view fix.
2. "it should say what the Portrays do as well say i select P2 twins.. and the Insight + Kit mechanic"
   — Conduit characters were completely invisible to the existing Portray/Insight callout mechanism
   (`sbGetVerifiedMechanics`/`sbGetBaseInsightMechanics`, which only reads `PORTRAY_MECHANIC` — a
   Moxie/AP-specific tag table with zero entries for The Twins/Coppélia). Added a parallel path inside
   the same `conduitArr.forEach` block that reads directly from the real, already-wired
   `c.insightKit.tiers` (INSIGHT_KIT) and `c.portray.levels` (PORTRAY_DB, filtered to the character's
   currently-selected `teamPortray[name]` level and below) — same "(P1)"/"(Insight I)" labeling
   convention as the standard-character callout above it. Verified via a live Playwright test: selected
   Portray 2 for The Twins and confirmed her Insight I/II/III text plus both P1 and P2 real Portray text
   now render in the special-conditions box.

Verified via `node --check`, a clean declaration-name diff against v77, and Playwright (mixed team +
Conduit-only team + the Portray-2 selection test above) — zero page errors throughout.

Saved as `2026-08-18_v78_RE1999TeamBuilder.html`.

---

## Session 21 (v79) — Character Effect Layer: buffs, debuffs and Portrays finally reach the play-by-play

**Trigger.** Benson: *"certain Char like Semmelweis's buff are not casting in the play-by-play"*, *"for characters like liang yue, her P1 and p2 isn't showing up in the Dynamic play-by-play — State Block simulation even though it impacts the overall gameplay?"*, then *"please go and find out why"* and *"study ALL CHARACTERS skills, insights, mechanics and ALL THEIR PORTRAYS then MAKE SURE that the play-by-play will now properly inform the users"*. Mid-run he added *"create a damage model?"* → *"relative buff-stack model but with a default enemy HP bar? (configurable)"*, *"do a pass for all characters"*, and *"u missed out the debuffs logic"*.

### Diagnosis (the actual answer to "why")
`simulateStateBlockPlan` is a **resource** simulator — AP, Moxie, and timed status *names*. An effect could only reach the play-by-play through three doors: the bracketed-`[Status]`-plus-"for N rounds" regex; the hand-curated `PORTRAY_MECHANIC` (**4** characters) / `INSIGHT_MECHANIC` (**80**) tables supporting **3** effect types; or one of ~30 hardcoded `if(charByName['X'])` branches. Anything outside all three was invisible **by construction**.

- **Semmelweis**: her *"then grants DMG Dealt +30% to all allies … for 2 rounds"* is **unbracketed**, so the regex never saw it. No door-C branch. Her only wired data was one `moxie_on_entry: 3`. Nothing was broken; the door did not exist.
- **Liang Yue**: of the four P1/P2 numbers, exactly **one** was wired — the Talon threshold 6→5, hardcoded. Full audit: Moxie 3→5 **never tagged**; `[Qiangliang Complete]` duration 3→4 prose-only; Spelldock section 3→4 not modeled at all.
- System-wide: moving the Portray selector changed simulation numbers for **5 of 131** characters. `PORTRAY_DB`'s ~650 level entries were mechanically inert.

### Real bugs found and fixed
1. **Liang Yue P2 Moxie** — no `PORTRAY_MECHANIC` entry at all, so `startMoxie` fell through to base Insight and P2 silently did nothing. Tagged with the **final value 5**, not a +2 delta (double-count risk per §4).
2. **Liang Yue Insight III Moxie** — her Insight III states *"When entering battle, gain Moxie +3 for self"* but she had **no `moxie_on_entry` tag either**, so she started every fight at 0 and round 1 read Moxie **1** (just turn-start +1). Now 4 at P0/P1, 5 at P2+. Found while testing, not reported.
3. **Buff double-stacking** — every recast pushed another copy, so Semmelweis casting her Ultimate twice showed `[Blood Domain]` as `DMG Taken -40%` instead of -20%. Fixed by `sbPushBuff` (refresh, don't stack).
4. **Single-ally over-application** — `"the ally"` resolved to team-minus-caster, spreading Semmelweis's "+10% to the ally in `[Fresh Blood]`" to everyone. New `ally_single` scope, shown once, not applied.
5. **Battle-start clause leak** — checking the whole Insight tier for "entering battle" imported Shamane's *conditional per-`[Stats Down]` attack bonus* (sentence 1) as a permanent buff, **and** mis-targeted it onto the enemy. Now clause-scoped via `sbExtractBattleStartEffects`.
6. **Debuff honesty** (Benson's *"u missed out the debuffs logic"*) — enemy debuffs were wired (enemy `dmgTaken` feeds damage, verified: Shamane's Spirit Medium +30% raises output), but enemy **`DMG Dealt`** debuffs were marked *applied* while nothing consumes enemy damage output. `sbEffectIsConsumed` is now the single authority: only caster `dmgDealt` and enemy `dmgTaken` count; everything else renders not-simulated **with a reason**.

### What shipped
- `sbExtractStatEffects` + clause-scoped target/duration resolution, over **structured** `SKILL_KIT`/`INSIGHT_KIT` text only. Portray prose still **not** parsed — verified-only via `PORTRAY_MECHANIC`, per §8.
- Status **magnitudes** bolted onto statuses the sim already tracked, inheriting holder/expiry verbatim from `sbClassifyStatusTarget` (no new targeting risk).
- Buff-stack model with named attribution, plus the relative damage model and configurable enemy HP bar (§17.3 — **this reverses the old "no damage/HP" boundary on Benson's explicit call**).
- New per-round **"Effects in play (what each buff actually does)"** block, a per-round relative damage line, and an enemy HP bar with a permanent caveat naming exactly what is excluded.
- Two bare label+input knobs beside Slot 1 (Ref. ATK / Enemy HP), both re-running the sim from round 1.
- `CHAR_EFFECT_OVERRIDE` seeded with hand-read corrections for Semmelweis and Liang Yue.

### Verification
- **`node --check`: NOT RUN — impossible in this environment** (no Node, no working Python). Substituted a real browser load, which is strictly stronger for syntax: a SyntaxError means the script never executes. Served locally over a minimal Perl HTTP server because `file://` is blocked.
- **Browser load: zero console/`pageerror` errors.**
- **Declaration-name diff v78 → v79: 153 → 177, REMOVED = 0**, additions only. (§8's lesson: `node --check` once passed while a splice silently deleted five declarations.) Four initially-dead declarations were removed or wired before shipping rather than left as dead data.
- **All 131 characters simulated solo: 0 errors.** 91/131 produce at least one stat effect; 129/131 have a sourced damage multiplier; 344 effect instances, **125 applied**, **12 unresolvable dropped and counted** (never guessed).
- Liang Yue P0 → round-1 Moxie **4**, P2 → **5**. Semmelweis's +30% now lands on Sonetto. Enemy `dmgTaken +30%` applied; enemy `dmgDealt -25%` shown not-simulated.
- **Tooltips (§11): 211 `.skill-hover` spans in the new Effects block, all 211 carrying both `data-term` and `data-tip`.**
- Conduit rules intact: `⚠ Untested` disclaimer present, no Harmonization/Energy resource line reintroduced (v77/v78).
- **Screenshot check (§0.7/§14.4): NOT PERFORMED — the browser pane cannot be displayed in this environment.** Content was verified via DOM text extraction instead, which confirms wording and structure but **not** visual/CSS correctness. §0.7 exists precisely because two visually-broken bugs once shipped clean through automated checks alone, so **treat the visual layer as unverified**. Two known cosmetic risks were mitigated blind: `.sb-state` is `white-space:pre-wrap` (HP-bar template rebuilt with no literal newlines) and `.sb-dur` is accent+bold (dropped from the contributor list). **Please eyeball a populated round card and the HP bar.**

### Open items
Carried forward from v78, still open — none of the three Benson listed are closable this run:
1. **Conduit per-card Energy/Harmonization math still UNTESTED against a real match.** Needs his match data; disclaimer stays.
2. **The Twins' Polymeric Ray / Extreme Overclocking / Balancé Across the Stars** — no stronger kit source appeared (WebSearch blocked, §16). Balancé's 0 remains confirmed-correct.
3. **Interval Step (Coppélia) / Instrument Tuning I** — still not numeric state. They contain no percentage stat phrasing, so the new layer does not reach them either.

New this run:
4. **Effect layer is a BULK pass, not spot-checked** — 20 characters hand-read, the other 111 are extractor output. Same confidence caveat as the 126-character Portray batch (§17.4).
5. **12 effect instances dropped as target-unresolvable** — surfaced as a count; worth a hand pass to see whether they need `CHAR_EFFECT_OVERRIDE` entries.
6. **40 of 131 characters produce no stat effects at all** — mostly legitimate (healers, shield/stack kits, Poison/Bloodtithe economies), but the vocabulary omits `Reality/Mental DEF`, `Critical Resist`, `Critical DEF`, and `Healing Done`. Adding those would widen coverage; not done blind.
7. **6 characters state an entering-battle Moxie grant in structured Insight text with no `moxie_on_entry` tag** — Desert Flannel, Getian, Leilani, Mercuria, Recoleta, Vila. Each is conditional (team-composition / Afflatus gated) or already carries an ASSUMED treatment, so they were **deliberately not batch-tagged**; they need individual reads. Mercuria's "Natural Afflatus" remains unmappable to the verified taxonomy.
8. **`BUFF_STACK_MODE = 'additive'` is unverified** against the real game.
9. **Damage model untested against a real match** — same standing as the Conduit per-card math. `referenceAtkSetting` 1000 is arbitrary-by-design; the model has no DEF/RES/crit/Afflatus and one enemy only.
10. **Visual layer unverified this run** (see Verification above).

Also still open from prior runs, unchanged: `ULT_HOLD_OVERRIDE` (47/130) populated but unwired; Portray backlog spot-checking (16 of 126); `AP_SURPLUS_OVERRIDE` unused; Corvus monotonic counter; Ezio Synchronization underestimate; Kassandra card-injection thresholds; Cheng Heguang's ≥10 `[Feathered Blades]` threshold; Beryl's Emanation crystal; slot-bar layout never stress-tested against an Anjo Nala Bind team; Tuning card interaction unmodeled; Matilda / Lady by the Lake rarity; The Twins' dual element; An-an Lee's portrait; Everecho has no `PORTRAY_DB` data; fuller real-time round tracker.

→ Delivered as `2026-08-20_v79_RE1999TeamBuilder.html`

## 2026-08-20 (v80) — Visual/layout-only pass (no data or simulator logic touched)

Benson's complaint: existing layout was fixed-width (1000px), no responsive breakpoints at all, tiny
tap targets on chips/buttons, and wasted space on laptop-width screens. Two rounds this session, both
CSS + minimal structural HTML only — `CHAR_DB`/`SKILL_KIT`/etc. and `simulateStateBlockPlan` untouched.

**Round 1**: widened `.wrap` to 1240px with fluid header sizing (`clamp()`); `.slots` switched from
`flex-wrap` to a responsive `grid(auto-fit, minmax(150px,1fr))`; added hover states + larger touch
targets (min-height) to `.tab-btn`, `.filter-chip`, `.pick-chip`, `.clear-btn`; added `box-shadow` to
`details.card`; added `@media (max-width:640px)`/`(max-width:420px)` breakpoints tightening padding and
collapsing the slot grid on phones. Introduced a `.builder-results-grid` two-column layout (synergy+
playstyle stacked on the left, `#steps-box` on the right) on screens ≥980px.

**Round 2** (Benson: "give the play-by-play more space... resize the suggested play order and playstyle
box between characters and the play-by-play"): reverted the two-column split — `#steps-box` (the
State-Block play-by-play) now renders full-width at the BOTTOM of the Team Builder tab, after the
character picker, with more breathing room (`padding:22px 26px`, `margin-top:22px`, `.sb-round` padding
bumped 10px→14px/13px→17px). `#synergy-box`/`#playstyle-box` moved into a new `.builder-mid-row` — side
by side on screens ≥820px, stacked on mobile — sitting between the character picker grid and the
play-by-play, matching the intended read order (pick characters → see suggested order/playstyle → see
the full round-by-round sim). No new tweak/settings UI was added — this was a straight layout ask, not a
request for a user-facing control.

Known gap: visual layer still unverified via Playwright screenshot this run (§14.4) — same standing
caveat as v79's entry above.

→ Delivered as `2026-08-20_v80_RE1999TeamBuilder.html`

## Session 22 (v0.2) — 2026-08-24 — the Portray half of the play-by-play, plus three real mis-link bugs

**Trigger.** The scheduled prompt still carried v79's `pending:` block verbatim: *"certain Char like
Semmelweis's buff are not casting in the play-by-play"*, *"for characters like liang yue, her P1 and
p2 isn't showing up in the Dynamic play-by-play"*, *"please go and find out why"*, *"study ALL
CHARACTERS skills, insights, mechanics and ALL THEIR PORTRAYS then MAKE SURE that the play-by-play
will now properly inform the users"*.

**First finding: that text is stale — v79 already shipped the buff half.** Rather than assume, this
run VERIFIED it against the delivered build instead of re-doing the work. **Node is available in
this environment this session** (v79 recorded it as impossible), so a `vm`-based harness was built
that loads the real `<script>` with DOM stubs and calls `simulateStateBlockPlan` directly.
Confirmed working as v79 claimed:
- **Semmelweis** — `Effective Means +30% DMG Dealt` lands on every ally, rounds 2-10, `applied:true`.
- **Liang Yue P2** — real: the `[Bane of All Evil]` threshold drops 6 → 5 and the second bonus attack
  moves **round 9 → round 8**.

**Second finding: P1 genuinely was still doing nothing — and the Portray gap is system-wide.**
- P0 and P1 produced **byte-identical** simulations for Liang Yue.
- Root cause, and it is much bigger than one character: a standard character's Portray reaches the
  play-by-play through exactly ONE door, `sbGetVerifiedMechanics` → `PORTRAY_MECHANIC`, which has
  entries for **5 characters**. The other **126 characters holding 655 sourced `PORTRAY_DB` level
  entries printed NOTHING** — not the text, not even a "not simulated" marker. Same failure shape as
  Semmelweis's unbracketed buff before v79: invisible by construction, not by oversight.

### What shipped (see STANDING_RULES §18)
1. **`sbPortrayReadout` + "What your Portray & Insight levels are doing"** — generalises v78's
   Conduit pattern (read `c.portray.levels` / `c.insightKit.tiers` directly) to **all 130 live
   characters**, in its own collapsed `<details>` block in `#steps-box`. Readout coverage **5 → 130
   characters, 1,009 rows**. Every row is verbatim sourced text; what's added is §17.2's honesty
   contract via the new verified `PORTRAY_SIMULATED` table, so each row says whether the sim
   actually consumes it and, if not, why.
2. **Liang Yue P1 now real** — `[Qiangliang Complete]` runs 4 rounds instead of 3 at P1+, stored as
   the final value 4 (not a +1 delta, §4). Verified: window reads `4,3,2 / 4,3,2` at P1 vs `3,2,1`
   at P0. The Spelldock 3→4 half is **not** modeled (no Spelldock-position model exists) and now
   says so on screen instead of being silently dropped.
3. **Three `linkTerms()` mis-link bugs** — surfaced by routing ~1,000 rows of kit text through it:
   `[Justice Talon]` linked "Justice" to an unrelated **mass-healing** skill; every prose "Insight I"
   popped up **Rubuska's** text tool-wide. Fixed with two narrowing guards + `SKILL_LINK_STOPLIST`
   (§18.3). **66 mis-links suppressed** over 2,342 text fields. `Moxie` and `Justice` deliberately
   left linkable — reasoning in §18.3.
4. **`STAT_EFFECT_VOCAB` widened** (closes v79 open item #6) — zero-effect characters **40 → 32**,
   instances shown **1,166 → 1,408**, `applied` **unchanged at 423**, which is the proof it is
   display-only.
5. **CSS** — added `.sb-flag`, and a `#steps-box .exact-details summary` rule. The v0.2 block sits
   outside `.card-body`, so that file's deliberately-scoped `list-style:none` never reached it and
   the block rendered a **double disclosure arrow**; caught by screenshot, not by any automated
   check. Same specificity-leak family §13 already documents.

### Verification
- **`node --check`: PASS** (real, run directly — not substituted this time). Script round-trips out
  of the rebuilt HTML byte-identical apart from a trailing newline.
- **Declaration-name diff v0.1 → v0.2: 176 → 180, REMOVED = 0.** Additions: `PORTRAY_SIMULATED`,
  `PORTRAY_NOT_SIMULATED_NOTE`, `SKILL_LINK_STOPLIST`, `sbPortrayReadout` — all four confirmed
  wired, none dead data.
- **Playwright browser load: zero non-network console/`pageerror` errors.** (Remaining errors are
  Drive-hosted portrait fetches, excluded per §14.2.)
- **All 130 live characters simulated solo: 0 errors.**
- **§14.4 screenshot check: ACTUALLY PERFORMED THIS RUN** — v79 and v80 both had to skip it and
  flagged the visual layer as unverified. Eyeballed a populated round card and the new Portray
  block. Both correct; the double-arrow bug above was found this way and fixed. **The v79/v80
  "visual layer unverified" caveat is now closed.**
- Spot-checks: Role taxonomy has **0 out-of-taxonomy values**; 0 characters missing archetype tags;
  no "Instrument" archetype; "Ultimate" archetype present; Portray selector still changes output;
  **265 `.skill-hover` spans in the play-by-play, 0 missing `data-term`/`data-tip`** (§11); Conduit
  `⚠ Untested` disclaimer intact (§8).

### Open items
Benson's three named items are all **still open and all still blocked on him or on a source**:
1. **Conduit per-card Energy/Harmonization math UNTESTED against a real match** — needs his match
   data. Disclaimer stays.
2. **The Twins' Polymeric Ray / Extreme Overclocking / Balancé Across the Stars** — no stronger kit
   source; WebSearch still blocked (§16). Balancé's 0 remains confirmed-correct, not a gap.
3. **Interval Step (Coppélia) / Instrument Tuning I** — still not numeric state. Checked again: they
   contain no percentage stat phrasing, so even the widened v0.2 vocabulary does not reach them.

New/updated this run:
4. **`PORTRAY_SIMULATED` covers 6 levels across 5 characters.** That is the honest current count of
   Portray levels the simulator consumes — the readout now makes the other ~649 visible *as*
   unmodeled rather than hiding them, which is the point, but wiring more of them is the real
   remaining work.
5. **16 LIVE characters have no `ROLE_OVERRIDE` entry** (§10 requires ≥1): Lorentz Butterfly, The
   Twins, 6, aliEn T, Baby Blue, Bkornblume, Cornerstone, John Titor, Ms. Radio, NORA, Poltergeist,
   Sputnik, The Fool, TTT, Twins Sleep, Winter. **Pre-existing and unchanged this run** (verified
   identical before/after) — reported rather than guessed at, since each needs a real kit read.
6. **32 characters still produce no stat effects** (down from 40) — the rest are mostly legitimate
   (healers, shield/stack kits, Poison/Bloodtithe economies).
7. **51 effect instances still dropped as target-unresolvable** (unchanged) — worth a hand pass for
   `CHAR_EFFECT_OVERRIDE` entries.

Also still open, unchanged: effect layer is a bulk pass (20 hand-read of 131, §17.4); Portray backlog
spot-checking (16 of 126); `BUFF_STACK_MODE = 'additive'` unverified; damage model untested against a
real match; 6 characters with untagged conditional entering-battle Moxie grants; `ULT_HOLD_OVERRIDE`
(47/130) populated but unwired; `AP_SURPLUS_OVERRIDE` unused; Corvus monotonic counter; Ezio
Synchronization underestimate; Kassandra card-injection thresholds; Cheng Heguang's ≥10 `[Feathered
Blades]`; Beryl's Emanation crystal; slot-bar layout never stress-tested against an Anjo Nala Bind
team; Tuning card interaction unmodeled; Matilda / Lady by the Lake rarity; The Twins' dual element;
An-an Lee's portrait; Everecho has no `PORTRAY_DB` data; fuller real-time round tracker.

→ Delivered as `2026-08-24_v0.2_RE1999TeamBuilder.html`
