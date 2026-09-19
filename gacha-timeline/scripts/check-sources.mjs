#!/usr/bin/env node
/*
  Weekly source freshness check - no LLM, no external API key.

  Ports the exact "Check all banner info" logic already built into
  index.html (fastHash / compactSourceText / extractBannerAuditLines /
  fetchSourceText with the Jina Reader CORS fallback) so the unattended
  weekly run behaves identically to a manual in-browser check. It can
  only detect that an official source's banner-relevant text changed
  since the last check - it does not (and, without an LLM, safely
  cannot) decide *how* to edit the `games` array itself. See
  gacha-timeline/AUTOMATION.md for the full design rationale.

  Exit behaviour:
    - Writes/updates gacha-timeline/.audit-state.json in place.
    - Prints a summary to stdout.
    - The calling workflow decides whether to open a PR based on
      whether `.audit-state.json` actually changed on disk (plain
      `git diff`), not on anything this script returns.
*/

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HTML_PATH = path.join(REPO_ROOT, "gacha-timeline", "index.html");
const STATE_PATH = path.join(REPO_ROOT, "gacha-timeline", ".audit-state.json");

// Same scanner-horizon constants as index.html.
const SCAN_FUTURE_DAYS = 183;
const SCAN_PAST_DAYS = 90;

// Sources whose sites are known (from the notes already in
// scheduleSources) to block automated fetches, or that are explicitly
// player-run rather than official. Never auto-fetched.
const BLOCKED_HOSTS = ["reddit.com", "x.com", "twitter.com", "youtube.com"];

function singaporeTodayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const TODAY_DATE = new Date(singaporeTodayISO() + "T00:00:00+08:00");

function addDays(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

function scannerWindow() {
  return {
    start: addDays(TODAY_DATE, -SCAN_PAST_DAYS),
    end: addDays(TODAY_DATE, SCAN_FUTURE_DAYS)
  };
}

function monthNameToNumber(name) {
  const map = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, sept: 8, oct: 9,
    october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  return map[String(name).toLowerCase()];
}

function parseExplicitDatesFromLine(line) {
  const found = [];
  const defaultYear = TODAY_DATE.getFullYear();

  const iso = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g;
  for (const m of line.matchAll(iso)) {
    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (!Number.isNaN(dt.getTime())) found.push(dt);
  }

  const mdy = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/gi;
  for (const m of line.matchAll(mdy)) {
    const mo = monthNameToNumber(m[1]);
    const d = Number(m[2]);
    const y = m[3] ? Number(m[3]) : defaultYear;
    const dt = new Date(y, mo, d);
    if (!Number.isNaN(dt.getTime())) found.push(dt);
  }

  return found;
}

function lineFallsInsideScannerHorizon(line) {
  const dates = parseExplicitDatesFromLine(line);
  if (!dates.length) return true;
  const { start, end } = scannerWindow();
  return dates.some((date) => date >= start && date <= end);
}

const BANNER_AUDIT_FIELDS = [
  { key: "title", label: "Name / title", re: /(banner|warp|rescue|summon|recruit|pickup|rate.?up)/i },
  { key: "dates", label: "Start / end", re: /(duration|start|end|from|until|after the version update|maintenance)/i },
  { key: "type", label: "Banner type", re: /(limited|time-limited|anniversary|rerun|selection|selector|standard|collaboration|partner|combatant)/i },
  { key: "featured", label: "Featured lineup", re: /(featured|rate.?up|6-star|6★|5-star|5★|designated group|available characters|lineup)/i },
  { key: "selector", label: "Selector rules", re: /(select|selected|chosen|choice|target|designated)/i },
  { key: "selectionLock", label: "Selection change / lock", re: /(change|changed|lock|locked|cannot|can.?t|after obtaining|once obtained|after summon)/i },
  { key: "pity", label: "Pity", re: /(pity|soft pity|hard pity|guaranteed count|summon count)/i },
  { key: "guarantee", label: "Guarantee / 50-50", re: /(guarantee|guaranteed|50%|50\/50|probability)/i },
  { key: "carryover", label: "Carry-over / reset", re: /(carry over|carry-over|cleared|reset|independently|not shared|shares the same guarantee)/i },
  { key: "cost", label: "Pull cost / discount", re: /(unilog|pass|ticket|anchor|first summon|first 10|x10|×10|discount|free summon|free pull)/i },
  { key: "patch", label: "Patch / version", re: /(version|patch|season|phase|update)/i },
  { key: "availability", label: "Rerun / limited status", re: /(rerun|limited|permanent|long-term|available|exclusive)/i }
];

function compactSourceText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtmlNoise(html) {
  // Raw HTML (as opposed to the Jina Reader's already-clean markdown)
  // carries two kinds of noise that defeat the banner-audit keyword
  // filters below: (1) tag/attribute soup where a substring like
  // "select" inside `id="responsive_tab_select6aae64e..."` false-matches
  // a keyword regex, and (2) some sites embed a fresh random id in that
  // markup on every single request, which would hash-differ on every
  // fetch regardless of real content (confirmed live against Steam's
  // announcements page: the `<select>` tab widget's id changes every
  // request). Stripping tags down to visible text avoids both.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<!--[\s\S]*?-->/g, "\n")
    .replace(/<(br|p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractBannerAuditLines(text) {
  const lines = text
    .split("\n")
    .map((s) => s.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line.length > 8 && line.length < 420)
    .filter(lineFallsInsideScannerHorizon);

  return lines
    .filter((line) => BANNER_AUDIT_FIELDS.some((field) => field.re.test(line)))
    .slice(0, 320);
}

function extractScheduleLines(text) {
  const dateWord = /(20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)/i;
  const scheduleWord = /(banner|warp|version|maintenance|update|rate.?up|rescue|event|phase|summon|limited|anniversary|season|patch|release|featured|6-star|6★|5-star|5★|designated group|select|selected|chosen|change|lock|pity|guarantee|carry over|cleared|unilog|ticket|pass|discount|50\/50|50%|probability|rerun|permanent|long-term)/i;

  return text
    .split("\n")
    .map((s) => s.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => dateWord.test(line) || scheduleWord.test(line))
    .filter((line) => line.length > 12 && line.length < 240)
    .filter(lineFallsInsideScannerHorizon)
    .slice(0, 160);
}

function extractScheduleSnippet(text) {
  return extractScheduleLines(text).slice(0, 4).join(" · ").slice(0, 620);
}

function fastHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

async function fetchWithTimeout(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain,text/html,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; gacha-timeline-check/1.0; +https://github.com/bns-hub/Projects)"
      }
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function hasReadableContent(rawText) {
  // A JS-rendered SPA shell (Nuxt/Next/React bootstrap HTML) can easily
  // be several KB of markup with zero actual page content - a bare
  // length check doesn't catch that. Require real banner-audit-relevant
  // lines specifically: extractScheduleLines' `dateWord` alternation has
  // no word boundaries (e.g. "Oct" matches inside "doctype"), so it is
  // too loose to use as a readability gate on its own - confirmed by
  // testing against the live hsr.hoyoverse.com shell, which otherwise
  // false-passes on the literal string "<!doctype html>".
  const text = compactSourceText(rawText);
  if (text.length <= 250) return false;
  return extractBannerAuditLines(text).length > 0;
}

async function fetchSourceText(source) {
  // 1) Direct official source first.
  // 2) If it blocks the fetch, errors, or turns out to be an empty
  //    client-side-rendered shell with no readable content, fall back
  //    to the Jina Reader public text relay (which renders headlessly)
  //    - same two-step approach the in-page checker uses, extended to
  //    also catch "fetched fine but there's nothing here" SPA shells.
  try {
    const direct = await fetchWithTimeout(source.url, 9000);
    const stripped = direct ? stripHtmlNoise(direct) : "";
    if (stripped && hasReadableContent(stripped)) return { text: stripped, via: "direct" };
  } catch {
    // fall through to relay
  }

  const readerUrl = "https://r.jina.ai/" + source.url;
  const relayed = await fetchWithTimeout(readerUrl, 14000);
  if (!relayed || relayed.length < 250) {
    throw new Error("No readable public response");
  }
  return { text: relayed, via: "reader" };
}

function extractScheduleSources(html) {
  const match = html.match(/const scheduleSources = (\[[\s\S]*?\n\]);/);
  if (!match) throw new Error("Could not find scheduleSources array in index.html");
  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[1]})`)();
}

function isAutoCheckable(source) {
  if (source.unofficial === true) return false;
  try {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith("." + b))) return false;
  } catch {
    return false;
  }
  return true;
}

async function main() {
  const html = readFileSync(HTML_PATH, "utf8");
  const scheduleSources = extractScheduleSources(html);

  const previousState = existsSync(STATE_PATH)
    ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
    : { sources: {} };

  const toCheck = scheduleSources.filter(isAutoCheckable);
  const skipped = scheduleSources.filter((s) => !isAutoCheckable(s));

  console.log(`Checking ${toCheck.length} auto-checkable sources (skipping ${skipped.length} manual-only: ${skipped.map((s) => s.id).join(", ")})`);

  const nextSources = { ...previousState.sources };
  const changedSummaries = [];
  const failedSummaries = [];

  for (const source of toCheck) {
    const previous = previousState.sources[source.id];
    try {
      const fetched = await fetchSourceText(source);
      const text = compactSourceText(fetched.text);
      const scheduleLines = extractScheduleLines(text);
      const bannerAuditLines = extractBannerAuditLines(text);

      const auditText =
        bannerAuditLines.join("\n") ||
        scheduleLines.join("\n") ||
        text.slice(0, 20000);

      const hash = fastHash(auditText);
      const snippet = extractScheduleSnippet(text);
      const changed = Boolean(previous?.hash && previous.hash !== hash);
      const firstBaseline = !previous?.hash;

      nextSources[source.id] = {
        hash,
        checkedAt: new Date().toISOString(),
        changed,
        firstBaseline,
        via: fetched.via,
        snippet,
        auditedLines: bannerAuditLines.length
      };

      if (changed) {
        changedSummaries.push({
          id: source.id,
          game: source.game,
          label: source.label,
          url: source.url,
          snippet
        });
        console.log(`CHANGED  ${source.game.padEnd(8)} ${source.id} (${fetched.via})`);
      } else if (firstBaseline) {
        console.log(`BASELINE ${source.game.padEnd(8)} ${source.id} (${fetched.via})`);
      } else {
        console.log(`no change ${source.game.padEnd(8)} ${source.id} (${fetched.via})`);
      }
    } catch (error) {
      const message = String(error?.message || error);
      nextSources[source.id] = {
        checkedAt: new Date().toISOString(),
        error: message,
        changed: false,
        firstBaseline: !previous?.hash
      };
      failedSummaries.push({ id: source.id, game: source.game, label: source.label, url: source.url, error: message });
      console.log(`FAILED   ${source.game.padEnd(8)} ${source.id}: ${message}`);
    }
  }

  const nextState = {
    lastCheckedAt: new Date().toISOString(),
    sources: nextSources
  };

  writeFileSync(STATE_PATH, JSON.stringify(nextState, null, 2) + "\n");

  // Machine-readable summary for the workflow step that decides
  // whether to open a PR and what to put in its description.
  const summaryPath = path.join(REPO_ROOT, "gacha-timeline", ".last-check-summary.json");
  writeFileSync(
    summaryPath,
    JSON.stringify({ changed: changedSummaries, failed: failedSummaries }, null, 2) + "\n"
  );

  console.log(`\n${changedSummaries.length} source(s) changed, ${failedSummaries.length} failed to fetch.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
