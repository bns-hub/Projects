import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const url = "https://www.tenderboard.biz/singaporetenders";
const output = "TenderBoard_Raw_test.csv";
const maxPages = 10;

const csvCell = (value = "") => `"${String(value).replaceAll('"', '""')}"`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(30_000);

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("text=/Showing\\s+1\\s*-\\s*50\\s+of\\s+\\d+\\s+tenders/i").waitFor({ timeout: 30_000 });

  const records = [];
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
        };
      })
    );

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
  const lines = [header.map(csvCell).join(",")];
  for (const record of records) {
    lines.push([
      "", record.title, record.agency, record.category, "TenderBoard", "",
      record.published, record.closes, "Live", ""
    ].map(csvCell).join(","));
  }

  await writeFile(output, `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ success: true, records: records.length, output }));
} finally {
  await browser.close();
}
