#!/usr/bin/env node
// Renders gacha-timeline/.last-check-summary.json into a PR body.
// Kept as its own script (rather than inline in the workflow YAML) so
// it can be run and checked locally instead of trusting shell-escaped
// JS embedded in a `run:` block.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const summaryPath = path.join(__dirname, "..", ".last-check-summary.json");
const { changed, failed } = JSON.parse(readFileSync(summaryPath, "utf8"));

let body = "## Weekly freshness check - sources with content changes\n\n";
body +=
  "This PR does **not** edit `games` in index.html - it only updates the recorded snapshot " +
  "(`gacha-timeline/.audit-state.json`) so future checks compare against today's content. " +
  "Deciding *how* to reflect this into the banner data needs a human read (or ask Claude Code " +
  "to read this PR and reconcile `games` accordingly).\n\n";

body += "### Changed sources\n\n";
for (const c of changed) {
  body += `**${c.game} - ${c.label}** (${c.id})\n`;
  body += `${c.url}\n\n`;
  body += `> ${c.snippet || "(no schedule-relevant snippet extracted)"}\n\n`;
}

if (failed.length) {
  body += "### Sources that could not be checked this run\n\n";
  for (const f of failed) {
    body += `- **${f.game} - ${f.label}** (${f.id}): ${f.error}\n`;
  }
  body += "\n";
}

body += "---\nAutomated weekly check - see gacha-timeline/AUTOMATION.md.\n";

process.stdout.write(body);
