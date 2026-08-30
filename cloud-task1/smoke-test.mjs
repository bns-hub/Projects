import fs from 'node:fs';
import vm from 'node:vm';

const context = { console, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('Core.gs', import.meta.url), 'utf8'), context);

const feeds = [
  ['IT Services & Software Development', 'IT_Services_%26_Software_Development-CREATE_BO_FEED.xml'],
  ['Desktop Computers', 'Desktop_Computers-CREATE_BO_FEED.xml'],
  ['Computer Accessories', 'Computer_Accessories-CREATE_BO_FEED.xml'],
  ['Notebooks', 'Notebooks-CREATE_BO_FEED.xml'],
  ['Servers', 'Servers-CREATE_BO_FEED.xml'],
  ['Professional Services', 'Professional_Services-CREATE_BO_FEED.xml'],
];

let items = 0;
let relevant = 0;
for (const [category, filename] of feeds) {
  const response = await fetch(`https://www.gebiz.gov.sg/rss/${filename}`);
  if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
  const xml = await response.text();
  const titles = Array.from(xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/gi), match =>
    match[1].replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim()
  );
  items += titles.length;
  relevant += titles.filter(title => context.classifyTender({ Title: title, 'Procurement Category': category }).relevant).length;
  console.log(`${filename}: ${titles.length} item(s)`);
}

const tbStatus = await fetch('https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json').then(response => response.json());
if (!tbStatus.success) throw new Error('TenderBoard status reports failure');
console.log(`GeBIZ total: ${items}; provisionally relevant/review: ${relevant}`);
console.log(`TenderBoard status: ${tbStatus.records} records from ${tbStatus.generated_at_sgt}`);
