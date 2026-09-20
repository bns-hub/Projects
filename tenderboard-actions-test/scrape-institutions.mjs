import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const sutdUrl = "https://www.sutd.edu.sg/about/partnering-with-sutd/suppliers/opportunities/";
const output = "Institution_Raw_latest.csv";
const statusOutput = "Institution_Raw_status.json";

const csvCell = (value = "") => `"${String(value).replaceAll('"', '""')}"`;
const clean = (value = "") => String(value).replace(/\s+/g, " ").trim();
const sgtStamp = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Singapore",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T") + "+08:00";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(30_000);

try {
  await page.goto(sutdUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const cards = page.locator('a[href*="portal.us.bn.cloud.ariba.com"]:has(h5)');
  await cards.first().waitFor({ timeout: 30_000 });

  const records = await cards.evaluateAll((anchors) => anchors.map((anchor) => {
    const normalise = (value = "") => String(value).replace(/\s+/g, " ").trim();
    const text = normalise(anchor.innerText);
    const field = (label, nextLabels) => {
      const start = text.toLowerCase().indexOf(label.toLowerCase());
      if (start < 0) return "";
      const rest = text.slice(start + label.length).trim();
      const endPositions = nextLabels
        .map((next) => rest.toLowerCase().indexOf(next.toLowerCase()))
        .filter((position) => position >= 0);
      return normalise(endPositions.length ? rest.slice(0, Math.min(...endPositions)) : rest);
    };
    return {
      reference: field("Reference number", []),
      title: normalise(anchor.querySelector("h5")?.textContent || ""),
      scope: normalise(anchor.querySelector(".richText")?.textContent || ""),
      opening: field("Opening date", ["Closing date", "Reference number"]),
      closing: field("Closing date", ["Reference number"]),
      link: anchor.href || "",
    };
  }));

  const unique = Array.from(new Map(records
    .filter((record) => record.title && record.reference && record.closing)
    .map((record) => [record.reference, record])).values());
  if (unique.length === 0) throw new Error("SUTD published no readable current opportunity cards");

  const header = [
    "Tender/Ref No.", "Title", "Agency", "Procurement Category", "Source",
    "Scope Summary", "Publish Date/Time", "Closing Date/Time", "Status", "Link",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const record of unique) {
    lines.push([
      record.reference, record.title,
      "Singapore University of Technology and Design",
      "", "SUTD procurement opportunities", clean(record.scope),
      record.opening, record.closing, "Open", record.link || sutdUrl,
    ].map(csvCell).join(","));
  }
  await writeFile(output, `${lines.join("\n")}\n`, "utf8");

  const knownTitle = "ITT: PROVISION OF IT OUTSOURCE SUPPORT SERVICES FOR SINGAPORE UNIVERSITY OF TECHNOLOGY AND DESIGN (SUTD)";
  const knownTenderPresent = unique.some((record) => record.title === knownTitle);
  const regressionRequired = new Date() <= new Date("2026-10-02T23:59:59+08:00");
  if (regressionRequired && !knownTenderPresent) {
    throw new Error("Known current SUTD IT outsource support tender is missing from the institutional handoff");
  }

  const status = {
    success: true,
    generated_at_sgt: sgtStamp(),
    records: unique.length,
    known_current_tender_present: knownTenderPresent,
    known_current_tender_check_required: regressionRequired,
    source: sutdUrl,
  };
  await writeFile(statusOutput, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...status, output, statusOutput }));
} finally {
  await browser.close();
}
