// Online smoke test. Requires outbound access to www.gebiz.gov.sg.
import fs from 'node:fs';
import vm from 'node:vm';

const context = { console, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('Core.gs', import.meta.url), 'utf8'), context);

const feeds = [
  ['IT Services & Software Development', 'EPU/CMP/10', 'IT_Services_%26_Software_Development-CREATE_BO_FEED.xml'],
  ['Softwares & Licences', 'EPU/CMP/10', 'Softwares_%26_Licences-CREATE_BO_FEED.xml'],
  ['Desktop Computers', 'EPU/CMP/10', 'Desktop_Computers-CREATE_BO_FEED.xml'],
  ['Computer Accessories', 'EPU/CMP/10', 'Computer_Accessories-CREATE_BO_FEED.xml'],
  ['Notebooks', 'EPU/CMP/10', 'Notebooks-CREATE_BO_FEED.xml'],
  ['Servers', 'EPU/CMP/10', 'Servers-CREATE_BO_FEED.xml'],
  ['Telecommunication', 'EPU/CMP/10', 'Telecommunication-CREATE_BO_FEED.xml'],
  ['Others', 'EPU/CMP/10', 'Others-CREATE_BO_FEED.xml'],
  ['Professional Services', 'EPU/SER/34', 'Professional_Services-CREATE_BO_FEED.xml'],
];

let items = 0;
const buckets = { 'EPU/CMP/10': 0, 'EPU/SER/34': 0 };
const unavailable = [];
for (const [category, bucket, filename] of feeds) {
  const response = await fetch(`https://www.gebiz.gov.sg/rss/${filename}`);
  if (response.status === 404) { unavailable.push(category); console.log(`${filename}: 404 (category not published as a feed)`); continue; }
  if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
  const xml = await response.text();
  const titles = Array.from(xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/gi), match =>
    match[1].replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim()
  );
  items += titles.length;
  for (const title of titles) {
    buckets[context.routeBucket({ Title: title, 'Procurement Category': `GeBIZ: ${category}` }, bucket)] += 1;
  }
  console.log(`${filename}: ${titles.length} item(s)`);
}

// The whole point of the fix: every item fetched is kept.
if (buckets['EPU/CMP/10'] + buckets['EPU/SER/34'] !== items) throw new Error('a GeBIZ item was dropped during routing');

const tbStatus = await fetch('https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json').then(response => response.json());
if (!tbStatus.success) throw new Error('TenderBoard status reports failure');
console.log(`GeBIZ total: ${items}; EPU/CMP/10 ${buckets['EPU/CMP/10']} | EPU/SER/34 ${buckets['EPU/SER/34']}; feeds unavailable: ${unavailable.join(', ') || 'none'}`);
console.log(`TenderBoard status: ${tbStatus.records} records from ${tbStatus.generated_at_sgt}`);
