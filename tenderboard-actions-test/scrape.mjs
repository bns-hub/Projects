import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const url = "https://www.tenderboard.biz/singaporetenders";
const output = "TenderBoard_Raw_latest.csv";
const statusOutput = "TenderBoard_Raw_status.json";
const maxPages = 10;

const csvCell = (value = "") => `"${String(value).replaceAll('"', '""')}"`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(30_000);

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const totalLabel = page.locator("text=/Showing\\s+1\\s*-\\s*\\d+\\s+of\\s+\\d+\\s+tenders/i").first();
  await totalLabel.waitFor({ timeout: 30_000 });
  const totalMatch = (await totalLabel.textContent() || "").match(/of\s+(\d+)\s+tenders/i);
  const publicTotal = totalMatch ? Number(totalMatch[1]) : null;

  const records = [];
  let pagesScanned = 0;
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    await page.locator('a[class*="OpenDeals-viewLink"]').first().waitFor();

    const pageRecords = await page.locator('a[class*="OpenDeals-viewLink"]').evaluateAll((anchors) =>
      anchors.map((anchor) => {
        const row = anchor.closest(".mdl-grid.content-text");
        const cells = row ? Array.from(row.children) : [];
        const main = cells[0];
        const industryNode = main
          ? Array.from(main.querySelectorAll("div")).find((node) =>
              (node.textContent || "").trim().startsWith("Industry:")
            )
          : null;
        const mainChildren = main ? Array.from(main.children) : [];
        const agencyNode = mainChildren.length > 1 ? mainChildren[mainChildren.length - 1] : null;
        const dates = cells.length > 1
          ? (cells[1].innerText || "").split("-").map((part) => part.trim())
          : [];

        return {
          title: (anchor.textContent || "").trim(),
          category: (industryNode?.textContent || "").replace(/^Industry:\s*/i, "").trim(),
          agency: (agencyNode?.textContent || "").trim(),
          published: dates[0] || "",
          closes: dates.slice(1).join("-").trim(),
          link: (anchor.href && anchor.href.indexOf("javascript:") !== 0) ? anchor.href : "",
        };
      })
    );

    pagesScanned = pageNumber;
    records.push(...pageRecords);

    const nextPage = page.locator("a", { hasText: new RegExp(`^${pageNumber + 1}$`) }).first();
    if (pageNumber === maxPages || (await nextPage.count()) === 0) break;
    await nextPage.click();
    await page.locator(`text=/Showing\\s+${pageNumber * 50 + 1}\\s*-/i`).waitFor();
  }

  if (records.length === 0) throw new Error("TenderBoard rendered no tender rows");

  const header = [
    "Tender/Ref No.", "Title", "Agency", "Procurement Category", "Source",
    "Scope Summary", "Publish Date/Time", "Closing Date/Time", "Status", "Link"
  ];
  const uniqueRecords = Array.from(new Map(records.map((record) => [
    [record.title, record.agency, record.published, record.closes].join("|"),
    record,
  ])).values());

  // The page announces its live public total. A lower exported count means a
  // page was skipped or the page structure changed, so fail instead of
  // silently publishing an incomplete handoff.
  if (publicTotal !== null && uniqueRecords.length !== publicTotal) {
    throw new Error(
      `TenderBoard announced ${publicTotal} public live tenders but ${uniqueRecords.length} were exported`
    );
  }

  const lines = [header.map(csvCell).join(",")];
  for (const record of uniqueRecords) {
    lines.push([
      "", record.title, record.agency, record.category, "TenderBoard", "",
      record.published, record.closes, "Live", record.link || url
    ].map(csvCell).join(","));
  }

  await writeFile(output, `${lines.join("\n")}\n`, "utf8");
  const generatedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Singapore",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(" ", "T") + "+08:00";
  const status = {
    success: true,
    generated_at_sgt: generatedAt,
    records: uniqueRecords.length,
    public_total: publicTotal,
    pages_scanned: pagesScanned,
    coverage_check_passed: publicTotal === null ? null : uniqueRecords.length === publicTotal,
    source: url,
  };
  await writeFile(statusOutput, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...status, output, statusOutput }));
} finally {
  await browser.close();
}
