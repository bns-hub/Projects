# Weekly freshness check - how it works

Workflow: `.github/workflows/gacha-timeline-check.yml`
Script: `gacha-timeline/scripts/check-sources.mjs`

## Mechanism - and why it changed from an LLM-based checker

The first version of this automation used an LLM agent
(`anthropics/claude-code-action`) to read each official source and edit
`games` directly. That needed an `ANTHROPIC_API_KEY` (or a Claude
subscription's OAuth token) added as a repo secret. The owner asked for
a solution that runs with **no external API key at all**, so this is a
deliberately more conservative design:

- `check-sources.mjs` ports the exact change-detection algorithm
  already built into `index.html`'s own "⟳ Check all banner info"
  button (`fastHash`, `compactSourceText`, `extractBannerAuditLines`,
  the `BANNER_AUDIT_FIELDS` keyword taxonomy, and the direct-fetch +
  Jina Reader relay fallback for sites that block or don't render for
  a plain fetch). Same logic, running headless on a schedule instead
  of waiting for someone to click the button.
- It can reliably answer "did this official source's banner-relevant
  text change since last time?" without any reasoning model, because
  that's a hash comparison, not a comprehension task.
- It **cannot** reliably answer "so what exactly should `games` say
  now?" without a reasoning model - turning "the pity-rule paragraph
  changed" into a correct edit needs real reading comprehension. Per
  the original brief's own constraint ("must not hardcode or fake
  banner data to fill gaps"), this script does not attempt that step.
  It only ever touches `gacha-timeline/.audit-state.json`.

So the loop is:

1. **Automatic, weekly, free:** fetch each non-manual source, compare
   against the last snapshot, and open a **draft PR** if (and only if)
   something changed. The PR touches only `.audit-state.json` and
   describes what changed and where.
2. **Manual, on demand, still free (uses the owner's own Claude Code
   access, not a metered API key):** open that PR and ask Claude Code
   to read it and reconcile `games` in `index.html` accordingly, the
   same way this automation itself was built. This step is a
   conversation, not a scheduled job.

This trades "fully hands-off" for "zero ongoing cost and zero new
credential" - the explicit tradeoff the owner asked for.

## Required secrets

None. The workflow only uses the GitHub Actions-provided `GITHUB_TOKEN`
(granted `contents: write` + `pull-requests: write` by the workflow's
own `permissions:` block) to push its branch and open the PR - the same
pattern `tenderboard-actions-test`'s crawlers already use.

One repo setting *was* required and has been enabled (see the session
notes / PR for the exact change): **Settings -> Actions -> General ->
Workflow permissions -> "Allow GitHub Actions to create and approve
pull requests."** Without it, `gh pr create` inside the workflow fails
even with a correctly-scoped `GITHUB_TOKEN` - confirmed against
GitHub's own docs, which describe this setting as gating PR *creation*,
not just approval.

## What it will and won't do

- Only fetches the sources in `scheduleSources` that are NOT Reddit, X/
  Twitter, or YouTube, and not flagged `unofficial:true`.
- Never edits `scheduleSources`, styling, or the `games` array itself -
  only `.audit-state.json` (its own change-tracking snapshot) and, via
  the build script, the PR body.
- Never pushes to `main` directly and never merges or marks its own PR
  ready for review - draft PR only, same as the standing rule for all
  code changes in this repo.
- Never fabricates a banner-data value. A source that fails to fetch is
  recorded as failed and surfaced in the PR/log, not guessed at.

## Known limitations (found by actually running this against the real
sources, not assumed)

- **Some official pages are JS-rendered SPAs** (confirmed: HSR's
  official site and HoYoLAB return an near-empty bootstrap shell to a
  plain fetch - same content hash regardless of real page content).
  The script detects this (no banner-audit-relevant text survives tag
  stripping) and falls back to the Jina Reader public relay, which
  renders headlessly. HoYoLAB's community feed (`hsr-hoyolab`) still
  comes back mostly empty even through the relay - it's an
  infinite-scroll feed that doesn't finish loading in time. Its
  snapshot is saved anyway so a genuine future change can still be
  seen, but don't expect it to reliably catch everything.
- **`hsr-news` still has weak automated coverage.**
  `hsr-news` (`hsr.hoyoverse.com/en-us/news?type=news_all`) is a
  client-rendered Nuxt app with no embedded data in its initial HTML
  (confirmed: the raw response is a fixed shell regardless of what's
  posted) and no discoverable public JSON API behind it (checked its
  network traffic directly - the article list is fetched via a call
  this session couldn't identify). The Jina Reader relay only gets the
  shell too, not the rendered list. It's kept in `scheduleSources` as
  a manual link and its snapshot can still catch the rare case where
  the shell itself changes, but don't rely on it to catch a real news
  article by itself.
- **`re-news` was fixed with a source-specific override, not scraping.**
  `re-news` (`re1999.bluepoch.com/en/home/detail.html#news`) used to
  have the same weak coverage as `hsr-news` for a structural reason:
  the `#news` part is a URL *hash fragment*, which browsers never send
  to the server, so both a direct fetch and the reader relay just got
  Bluepoch's default `detail.html` page content, indistinguishable
  from `re-official`. Fixed by calling the public JSON API that page's
  own front-end uses internally
  (`POST re1999.bluepoch.com/activity/official/websites/information/query`,
  `gameId: 60001`, no auth) directly from `check-sources.mjs` - see
  the `CUSTOM_FETCHERS` map. Confirmed live: it now returns the real,
  current news list (article titles, dates, and full body text,
  e.g. the Ver. 3.8 banner-replacement announcement) and the hash is
  stable across back-to-back runs. `czn-news` (`czn.gg/news/`) never
  needed this - it's a plain server-rendered page and got a full, real
  article listing on its first check.
- **Raw HTML pages can carry noise unrelated to content**, e.g. a
  random per-request DOM element id (confirmed live on Steam's
  announcements page: a `<select>` widget's id changed on every single
  fetch). The script strips HTML tags/attributes down to visible text
  before hashing specifically to avoid this; if a *new* site introduces
  a different kind of per-request noise, expect an occasional
  false-positive "changed" PR until that's noticed and filtered too.
- A "changed" PR means "this source's text changed since last check" -
  it does not mean "a banner date changed." Cosmetic rewrites, added
  unrelated announcements, or a genuinely new banner all trigger it.
  Reviewing the PR's snippet/link before editing `games` is still
  necessary either way.
