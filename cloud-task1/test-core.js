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

// Category Group must be the top-level group for BOTH sources, otherwise
// filtering on it silently drops one of them. GeBIZ names a feed after the
// sub-category alone, so those have to be mapped back up to their group.
const groupOf = category => context.categoryGroup({ 'Procurement Category': category });
assert.equal(groupOf('GeBIZ: IT Services & Software Development'), 'IT&Telecommunication');
assert.equal(groupOf('GeBIZ: Servers'), 'IT&Telecommunication');
assert.equal(groupOf('Softwares & Licences'), 'IT&Telecommunication');
assert.equal(groupOf('GeBIZ: Professional Services'), 'Services');
assert.equal(groupOf('IT&Telecommunication ⇒ IT Services & Software Development'), 'IT&Telecommunication');
assert.equal(groupOf('IT&Telecommunication: Notebooks'), 'IT&Telecommunication');
assert.equal(groupOf('TenderBoard: Event Organising, Food & Beverages: Event Organising'), 'Event Organising, Food & Beverages');
assert.equal(groupOf('Construction: Renovation Supplies & Services'), 'Construction');
assert.equal(groupOf('Not Specified'), 'Not Specified');
assert.equal(groupOf(''), 'Not Specified');

// Both sources end up spelled the same way, so the column sorts and groups.
const categoryOf = category => context.normalizeCategory({ 'Procurement Category': category });
assert.equal(categoryOf('GeBIZ: Servers'), 'IT&Telecommunication ⇒ Servers');
assert.equal(categoryOf('IT&Telecommunication: Notebooks'), 'IT&Telecommunication ⇒ Notebooks');
assert.equal(categoryOf('IT&Telecommunication ⇒ Notebooks'), 'IT&Telecommunication ⇒ Notebooks');
assert.equal(categoryOf('GeBIZ: Professional Services'), 'Services ⇒ Professional Services');
assert.equal(categoryOf('Not Specified'), 'Not Specified');
// An unmapped single word is a group with no sub-category, not a fake pairing.
assert.equal(categoryOf('Construction'), 'Construction');
// Normalising twice must not change the answer.
assert.equal(categoryOf(categoryOf('GeBIZ: Servers')), 'IT&Telecommunication ⇒ Servers');

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
assert.equal(context.routeBucket({ 'Procurement Category': 'GeBIZ: Professional Services' }, 'EPU/CMP/10'), 'EPU/SER/34');
// Facilities-management rows are not professional services.
assert.equal(context.routeBucket({ 'Procurement Category': 'Facilities Management: Management Services' }, 'EPU/CMP/10'), 'EPU/CMP/10');
// A row with no bucket hint at all still lands somewhere.
assert.equal(context.routeBucket({ 'Procurement Category': '' }, ''), 'EPU/CMP/10');

assert.deepEqual(
  context.extractFeedNames('<a href="/rss/Others-CREATE_BO_FEED.xml">x</a> <a href="/rss/Softwares_%26_Licences-CREATE_BO_FEED.xml">y</a>'),
  ['Others-CREATE_BO_FEED.xml', 'Softwares_%26_Licences-CREATE_BO_FEED.xml']
);
assert.equal(context.feedCategoryName('Softwares_%26_Licences-CREATE_BO_FEED.xml'), 'Softwares & Licences');

// GeBIZ answers an unknown feed name with HTTP 200 and an HTML page.
assert.equal(context.looksLikeFeed('<?xml version="1.0"?><rss><channel/></rss>'), true);
assert.equal(context.looksLikeFeed('<rss version="2.0">'), true);
assert.equal(context.looksLikeFeed('<!DOCTYPE html><html><body><img src="x"></body></html>'), false);
// The GeBIZ error page is XHTML: an XML prolog followed by html.
assert.equal(context.looksLikeFeed('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><body><img src="x"></body></html>'), false);
assert.equal(context.looksLikeFeed(''), false);
assert.equal(context.briefError(new Error('x'.repeat(400))).length, 140);

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
