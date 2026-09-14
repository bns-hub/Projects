---
name: tender-bid
description: >
  Decide what TOPPAN Ecquaria should bid on and whether it can win. Use for active
  tender bid decisions, bid-position briefs, pricing from benchmark unit rates,
  cost-schedule and sizing-model reviews, evaluation strategy, competitor and
  precedent analysis, and tender outcome research. Automatically use this skill
  for requests about past or historical tender awards or results, including the
  winner, awarded value, previous awards, and equivalent questions.
---

# Tender Bid

## Purpose

Help TOPPAN Ecquaria make evidence-based tender decisions and answer tender award questions accurately.

This skill covers both:

1. Active bid work, including bid or no-bid recommendations, positioning, pricing, benchmark unit rates, cost schedules, sizing models, evaluation strategy, competitor analysis, and win assessment.
2. Past or historical tender results, including winning bidder, awarded value, award date, buyer, tender reference, scope, and company award history.

Keep these two modes separate. A public tender award and an internally recognised sales win are not the same thing.

## Automatic trigger

Use this skill automatically whenever the user asks about a past or historical tender award or result.

Trigger examples include:

- Who won this tender?
- Who was awarded tender Y?
- What did company X win?
- What tenders did X win last year?
- What was the awarded value?
- Who was the winning bidder?
- Past tender award
- Historical award
- Previous tender results
- Tender outcome
- Award history

Treat semantically equivalent wording as a trigger even when the user does not name the skill.

Also use this skill for the existing active-bid work described under Purpose.

## Choose the working mode

### Historical award mode

Use this when the user asks what happened after a tender closed or asks for a company, agency, or period's award history.

### Active bid mode

Use this when the user asks whether TOPPAN Ecquaria should bid, how to price or position a bid, whether a bid is competitive, or whether it is likely to win.

If a request spans both modes, complete the historical benchmark work first, then use it in the active bid assessment.

## Historical award workflow

1. Identify the requested tender, company, agency, and date range from the user's wording. Ask a question only when the ambiguity would materially change the answer.
2. For Singapore government procurement, consult the public GeBIZ and data.gov.sg award dataset described below whenever its coverage is relevant.
3. Check whether the dataset covers the requested date range and whether the requested record appears complete.
4. If the March 2026 dataset is stale or does not cover the requested period, supplement or verify it against current GeBIZ, data.gov.sg, or another authoritative public source.
5. Separate public tender awards from internal sales or customer-account records.
6. Cite every material figure and award claim.
7. State gaps, uncertainty, conflicting values, or missing public records plainly.

## Singapore public award source

Primary Drive references:

- Parent folder: 02b. Work Projects
  - ID: 1qetX-k7VqAqMpPX3ZOqweWLP1KVDeLVi
  - URL: https://drive.google.com/drive/folders/1qetX-k7VqAqMpPX3ZOqweWLP1KVDeLVi
- Subfolder: Government Procurement via GeBIZ
  - ID: 1L-dgV2CZe3U5z4rscwerzIB9O_1u0nKv
  - URL: https://drive.google.com/drive/folders/1L-dgV2CZe3U5z4rscwerzIB9O_1u0nKv
- Google Sheet: GovernmentProcurementviaGeBIZ (Mar 2026)
  - ID: 1obW-UYeB6yoA5Z27xGmRz8eb1kFFV2b-XYuJ2RaHY4k
  - URL: https://docs.google.com/spreadsheets/d/1obW-UYeB6yoA5Z27xGmRz8eb1kFFV2b-XYuJ2RaHY4k/edit

These references were verified on 14 September 2026.

### Access fallback

The Google Drive references may not be visible from a personal Google account. If the connected account cannot access them, do not treat that as evidence that no award exists and do not block the task. Use current public GeBIZ, data.gov.sg, or another authoritative government source instead, and state which source was checked.

### Source meaning

The Google Sheet is a public Singapore government procurement award dataset derived from GeBIZ and data.gov.sg.

It is not TOPPAN Ecquaria's internal sales-win pipeline. Do not describe the sheet as a customer relationship management system, sales pipeline, forecast, order book, or internal list of company wins.

The sheet can support claims about public procurement records within its coverage. It cannot by itself prove that an internal opportunity was booked, recognised, renewed, exercised, or delivered.

### Freshness rule

The title says March 2026. Treat that as a coverage warning, not proof that every record up to March 2026 is present.

For dates after the dataset's coverage, or when a requested record is absent or incomplete:

- check current GeBIZ or data.gov.sg first where available
- use another authoritative public source when necessary
- give the source date
- do not assume that absence from the export means no award occurred
- do not present the March 2026 export as current

## TOPPAN Ecquaria distinction

For questions about what TOPPAN Ecquaria won, classify each item as one of the following.

### Public tender award

Use this label only when there is authoritative public evidence of a procurement award to TOPPAN Ecquaria, including a GeBIZ or data.gov.sg award record or another authoritative agency source.

### Internal sales or customer-account item

Use this label for items such as:

- change requests
- renewals
- contract options
- maintenance exercises
- extensions
- call-offs
- variations
- internal sales recognition
- customer relationship management system opportunities
- forecast or pipeline items

Do not call these new public tender wins unless authoritative public award evidence supports that description.

### Not yet proven

Use this label when the evidence shows an internal item but no matching public award, or when the available public evidence is incomplete.

When presenting a combined TOPPAN Ecquaria win list, group the categories separately. Never total public contract awards together with internal recognised revenue unless the user explicitly asks for both and the answer labels the two measures clearly.

## Active bid workflow

For live or upcoming tenders:

1. Establish the buyer, tender reference, scope, submission deadline, contract term, evaluation method, mandatory requirements, commercial structure, and known competitors.
2. Identify missing facts and material risks.
3. Use relevant historical awards and benchmark unit rates where reliable.
4. Review pricing, cost schedules, effort estimates, assumptions, optional items, and sizing models for internal consistency.
5. Distinguish evidence from assumptions. Label estimates and recommendations.
6. Assess strategic fit, delivery capability, partner needs, commercial exposure, and likely evaluation strengths and weaknesses.
7. Give a clear bid, conditional bid, or no-bid recommendation with reasons.
8. Explain what would change the recommendation.

Preserve any existing approved tender-bid templates, pricing methods, review checks, and output formats when this source is merged with an earlier version. The historical-award rules add to active-bid behaviour and do not replace it.

## Evidence and citation rules

For every award result, provide as many of these as the source supports:

- buying agency
- tender title
- tender reference
- award date
- winning bidder
- awarded value and currency
- contract period or options where published
- source name and direct link
- date checked

Do not invent missing fields. If multiple awardees, line items, options, or framework lots exist, say so and avoid presenting a misleading single total.

Prefer authoritative sources in this order:

1. GeBIZ or data.gov.sg
2. the verified public award dataset when its coverage applies
3. the procuring agency's official publication
4. another authoritative government source
5. company announcements or reliable secondary sources, clearly labelled

Internal Google Drive files and customer relationship management records may explain TOPPAN Ecquaria's internal commercial treatment, but they do not override the public award record.

## Default outputs

For a single past tender, give a concise answer followed by a source-backed table.

For a company or yearly award history, provide:

- public tender awards
- internal sales or customer-account items, only when requested and available
- unresolved or unverified items
- separate totals for unlike measures
- source coverage and freshness note

For active bid work, provide the requested tender-bid output and include the recommendation, evidence, assumptions, key risks, pricing or benchmark findings, and next actions.

