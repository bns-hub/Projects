# Weekly freshness check - how it works

Workflow: `.github/workflows/gacha-timeline-check.yml`

## Mechanism

The "read the official sources and decide what actually changed" step
needs real reading comprehension, not regex/diff matching against raw
HTML (source pages change markup constantly, and the meaningful signal -
"did the pity rule text change", "did this banner's date move" - is
semantic, not textual).

This uses the official [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
(`@v1`) GitHub Action: a scheduled job gives a Claude Code agent a fixed
prompt, `Read`/`Edit`/`WebFetch`/`git`/`gh` tool access scoped to this repo,
and lets it fetch each source, compare it against the `games` data in
`index.html`, make the minimal edit if something genuinely changed, and
open a draft PR describing the diff and its source. If nothing changed,
it does nothing - no forced PR.

Why this over a hand-written Node/Python scraper-and-diff script:
- The comparison target is prose (rule text, lineup names, patch
  associations), which benefits from an LLM's reading comprehension over
  brittle string/regex matching against sources whose markup we don't
  control.
- It runs entirely on GitHub's hosted runners on a cron trigger, so it
  doesn't depend on anyone's computer being on.
- It reuses a maintained, documented action rather than a bespoke
  fetch/compare pipeline this repo would have to keep working against
  every source site's markup changes.

## Required secret

`ANTHROPIC_API_KEY` must be added to this repo's Actions secrets
(Settings -> Secrets and variables -> Actions) for the workflow to run.
Nothing else is needed - `github_token` uses the workflow's own
auto-generated `GITHUB_TOKEN` (granted `contents: write` and
`pull-requests: write` by the workflow's `permissions:` block), the same
pattern `tenderboard-actions-test`'s crawlers use to write back to this
repo.

## What it will and won't do

- Only fetches the sources in `scheduleSources` that are NOT Reddit, X/
  Twitter, or YouTube, and not flagged `unofficial:true` - those are
  either player-run or known to block automated fetches (confirmed in
  the source notes already in this file).
- Never edits `scheduleSources`, styling, or anything outside the
  `games` array's data.
- Never pushes to `main` directly and never merges or marks its own PR
  ready for review - it only opens a draft PR, same as the standing rule
  for all code changes in this repo.
- Never fabricates a value it couldn't confirm from a fetched source -
  an unconfirmed entry is left as-is, not guessed at.
