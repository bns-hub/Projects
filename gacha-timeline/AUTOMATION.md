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
  the `BANNER_AUDIT_FIELDS` keyword taxonomy). Same logic, running on
  a schedule instead of waiting for someone to click the button.
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

## Fetch strategy: three tiers, cheapest first

For each auto-checkable source, `check-sources.mjs` tries, in order:

1. **A source-specific override** (`CUSTOM_FETCHERS`) - calls a site's
   own public JSON API directly when one's been found, e.g. `re-news`.
   Fastest and most precise, but has to be discovered per-site, so it
   only exists where someone's actually gone and found the API.
2. **A plain HTTP fetch** of the official URL - works for ordinary
   server-rendered pages (most Steam pages, `czn-news`,
   `re-official`, the CZN probability mirrors, etc).
3. **A real headless-Chromium render** (via Playwright) - the
   fallback for pages whose content only exists after client-side JS
   runs. This replaced an earlier Jina Reader (public third-party
   relay) fallback, which repeatedly proved unable to reliably render
   these specific sites - confirmed live, not assumed: it returned an
   empty site shell for `hsr-news` even with an extended render
   timeout and an explicit wait-for-selector hint. A real browser
   fixes this at the root instead of chasing it site by site.
   Confirmed live: this is what actually surfaced the real
   **HSR Version 4.6 "Dance With the Beast Before Moonrise" Special
   Program** announcement from HoYoLAB the first time this ran with
   it - see the "Known limitations" section below for what's still
   weak even with a real browser.

The browser is launched **lazily and once per run** (only if some
source actually needs it), and each source gets its own page rather
than its own browser, to keep the run fast. A couple of sources need
extra help beyond "load the page and read it" - see `RENDER_HINTS` in
the script (currently just `hsr-hoyolab`, which needs a few
scroll-and-wait cycles to trigger its infinite-scroll loader).

**This is a real trade-off, not a free upgrade:** the script went from
zero dependencies to one (`playwright`, MIT-licensed, no paid service
or new secret involved), and the CI job now installs a ~200MB Chromium
binary (cached across runs via `actions/cache`, keyed on
`package-lock.json`, so only the first run after a version bump pays
the download) and spends several more seconds per source that needs a
real render. Still comfortably inside the job's timeout (raised to 20
minutes as a safety margin), but it is a heavier job than the original
~10-second, dependency-free script.

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

- **`hsr-official`, `hsr-news`, `hsr-hoyolab`, and `hsr-hoyolab-official`
  are all JS-rendered and needed the headless-render fallback to work
  at all** (confirmed: a plain fetch of any of them returns a
  near-empty bootstrap shell - same content hash regardless of real
  page content). All four now fall back to a real headless-Chromium
  render and get real content - confirmed live, with a stable hash
  across back-to-back runs. `hsr-hoyolab` specifically needed the
  extra `RENDER_HINTS` scroll-and-wait treatment for its
  infinite-scroll feed; without it, it still came back mostly empty
  even with a real browser attached.
- **`hsr-news`'s real content is a news-listing page, not full article
  bodies.** `hsr-news` (`hsr.hoyoverse.com/en-us/news?type=news_all`)
  now reliably captures the titles/blurbs of the current news list
  (confirmed: it correctly reflects e.g. "Version 4.5 ... Update
  Details" as the current top article). It does not click into each
  article, so a hash change here means "the news list changed" (a new
  post appeared, or an old one dropped off) - reviewing the linked
  page directly (or asking Claude Code to) is still the way to get the
  actual patch/banner details out of a "changed" result.
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
