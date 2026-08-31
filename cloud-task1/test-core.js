const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/Core.gs', 'utf8'), context);

assert.equal(context.normalizeRef('ABC-123 / secondary'), 'ABC123');
assert.equal(context.normalizeTitle('Case-management portal!'), 'CASEMANAGEMENTPORTAL');

const description = context.parseGebizDescription('ITT: X | Published Date: 28/08/2026 | Closing Date: 22/09/2026 16:00:00 | Calling Entity: Central Provident Fund Board |');
assert.equal(description.agency, 'Central Provident Fund Board');
assert.equal(description.closing, '22/09/2026 16:00:00');

// Category Group derivation across every "Procurement Category" shape in play.
assert.equal(context.categoryGroup({ 'Procurement Category': 'GeBIZ: IT Services & Software Development' }), 'IT Services & Software Development');
assert.equal(context.categoryGroup({ 'Procurement Category': 'IT&Telecommunication ⇒ IT Services & Software Development' }), 'IT&Telecommunication');
assert.equal(context.categoryGroup({ 'Procurement Category': 'IT&Telecommunication: Notebooks' }), 'IT&Telecommunication');
assert.equal(context.categoryGroup({ 'Procurement Category': 'TenderBoard: Event Organising, Food & Beverages: Event Organising' }), 'Event Organising, Food & Beverages');
assert.equal(context.categoryGroup({ 'Procurement Category': '' }), 'Not Specified');

// Nothing is excluded any more: every tender routes to one of the two EPU tabs.
const previouslyExcluded = [
  { Title: 'Provision of DDoS protection service', 'Procurement Category': 'GeBIZ: IT Services & Software Development' },
  { Title: 'ITQ - PG Office and CSO Printer', 'Procurement Category': 'IT&Telecommunication: Computer Accessories' },
  { Title: 'TENDER FOR PROVISION OF MOBILE DATA PLAN AND UNIFIED COMMUNICATIONS AS A SERVICE', 'Procurement Category': 'GeBIZ: Others' },
];
for (const row of previouslyExcluded) {
  assert.equal(context.routeBucket(row, 'EPU/CMP/10'), 'EPU/CMP/10');
}
assert.equal(context.routeBucket({ Title: 'Provision of catering services', 'Procurement Category': 'GeBIZ: Professional Services' }, 'EPU/SER/34'), 'EPU/SER/34');
// A professional-services category wins over the feed's own bucket hint.
assert.equal(context.routeBucket({ 'Procurement Category': 'Services: Professional Services' }, 'EPU/CMP/10'), 'EPU/SER/34');
// Facilities-management rows are not professional services.
assert.equal(context.routeBucket({ 'Procurement Category': 'Facilities Management: Management Services' }, 'EPU/CMP/10'), 'EPU/CMP/10');
// A row with no bucket hint at all still lands somewhere.
assert.equal(context.routeBucket({ 'Procurement Category': '' }, ''), 'EPU/CMP/10');

assert.deepEqual(
  context.extractFeedNames('<a href="/rss/Others-CREATE_BO_FEED.xml">x</a> <a href="/rss/Softwares_%26_Licences-CREATE_BO_FEED.xml">y</a>'),
  ['Others-CREATE_BO_FEED.xml', 'Softwares_%26_Licences-CREATE_BO_FEED.xml']
);
assert.equal(context.feedCategoryName('Softwares_%26_Licences-CREATE_BO_FEED.xml'), 'Softwares & Licences');
assert.equal(context.isDiscoverableFeed('Telecommunication'), true);
assert.equal(context.isDiscoverableFeed('Catering'), false);

assert.equal(context.sameTender(
  { 'Tender/Ref No.': 'ABC-123', Title: 'A', Agency: 'X' },
  { 'Tender/Ref No.': 'ABC123', Title: 'Different', Agency: 'Y' }
), true);

assert.equal(context.parseCadence('days:tue,thu', new Date('2026-09-01T10:00:00+08:00'), null).run, true);
assert.equal(context.parseCadence('paused', new Date(), null).run, false);
assert.equal(context.expandDayMonth('03 Sep', new Date('2026-08-30T10:00:00+08:00'), 'closing'), '03 Sep 2026');
assert.equal(context.expandDayMonth('30 Dec', new Date('2026-01-02T10:00:00+08:00'), 'publish'), '30 Dec 2025');
assert.equal(context.csvToObjects('A,B\n1,2\n', text => text.trim().split(/\n/).map(line => line.split(','))).length, 1);

console.log('Core tests passed');
