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

// ---------------------------------------------------------------------------
// Reviewer-owned state
// ---------------------------------------------------------------------------

const tender = (over) => Object.assign({
  'Tender/Ref No.': 'ABC000ETT26000001', Title: 'Provision of a licensing system',
  Agency: 'Some Agency', 'Procurement Category': 'IT&Telecommunication ⇒ IT Services & Software Development',
  'Category Group': 'IT&Telecommunication', Source: 'GeBIZ', 'Scope Summary': '',
  'Closing Date/Time': '21/09/2026 16:00:00',
}, over || {});

// A fingerprint changes when, and only when, the facts behind a verdict change.
const base = tender();
assert.equal(context.reviewFingerprint(base), context.reviewFingerprint(tender()));
assert.notEqual(context.reviewFingerprint(base), context.reviewFingerprint(tender({ Title: 'Something else' })));
assert.notEqual(context.reviewFingerprint(base), context.reviewFingerprint(tender({ 'Scope Summary': 'Now with scope text' })));
assert.notEqual(context.reviewFingerprint(base), context.reviewFingerprint(tender({ 'Closing Date/Time': '22/09/2026 16:00:00' })));
// Presentation-only differences must not invalidate a good review.
assert.equal(context.reviewFingerprint(base), context.reviewFingerprint(tender({ Title: '  Provision of a   licensing system ' })));
assert.equal(context.reviewFingerprint(base), context.reviewFingerprint(tender({ Agency: 'SOME AGENCY' })));

// An unreviewed row needs review; a reviewed one does not until its facts move.
assert.equal(context.needsReview(base), true);
const reviewed = tender({ 'TECQ Review': 'Look at', Why: 'Licensing system.', 'Reviewed On': '2026-09-02 12:00' });
reviewed['Review Fingerprint'] = context.reviewFingerprint(reviewed);
assert.equal(context.needsReview(reviewed), false);
reviewed['Closing Date/Time'] = '30/09/2026 16:00:00';
assert.equal(context.needsReview(reviewed), true, 'changed facts must invalidate the stored verdict');
// A junk verdict is not a review.
assert.equal(context.needsReview(tender({ 'TECQ Review': 'probably?' })), true);

// Reviews are carried across a refresh by reference...
const stored = tender({ 'TECQ Review': 'Not relevant', Why: 'Air-conditioning works.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'x' });
let index = context.buildReviewIndex([stored]);
let fresh = [tender({ Title: 'Title rewritten by the source', Agency: 'Different Agency' })];
assert.equal(context.applyReviewIndex(index, fresh), 1);
assert.equal(fresh[0]['TECQ Review'], 'Not relevant');
assert.equal(fresh[0].Why, 'Air-conditioning works.');

// ...and by title + agency, or title + closing date, when there is no reference.
const noRef = tender({ 'Tender/Ref No.': '', Source: 'TenderBoard', 'TECQ Review': 'Possible', Why: 'Listing only.' });
index = context.buildReviewIndex([noRef]);
const byAgency = [tender({ 'Tender/Ref No.': '', Source: 'TenderBoard', 'Closing Date/Time': 'Unknown' })];
assert.equal(context.applyReviewIndex(index, byAgency), 1, 'title + agency must carry a review');
assert.equal(byAgency[0]['TECQ Review'], 'Possible');
const byClosing = [tender({ 'Tender/Ref No.': '', Source: 'TenderBoard', Agency: 'Renamed In Listing' })];
assert.equal(context.applyReviewIndex(index, byClosing), 1, 'title + closing date must carry a review');
// A genuinely different tender must not inherit someone else\'s verdict.
const unrelated = [tender({ 'Tender/Ref No.': '', Title: 'Totally different tender', Agency: 'Elsewhere', 'Closing Date/Time': '01/01/2027' })];
assert.equal(context.applyReviewIndex(index, unrelated), 0);
assert.equal(context.hasReview(unrelated[0]), false);
// An existing review is never overwritten by the index.
const alreadyReviewed = [tender({ 'TECQ Review': 'Look at', Why: 'Mine.' })];
context.applyReviewIndex(context.buildReviewIndex([stored]), alreadyReviewed);
assert.equal(alreadyReviewed[0].Why, 'Mine.');

// preserveReview copies only non-empty reviewer fields.
const target = tender();
context.preserveReview(target, { 'TECQ Review': 'Look at', Why: '', 'Reviewed On': '2026-09-02', 'Review Fingerprint': 'abc' });
assert.equal(target['TECQ Review'], 'Look at');
assert.equal(target.Why, undefined, 'a blank field must not clobber');

// Shortlist: Look at first, then closing date ascending; Not relevant excluded.
const shortlist = context.buildShortlist([
  tender({ Title: 'P late', 'TECQ Review': 'Possible', 'Closing Date/Time': '30/09/2026 16:00:00' }),
  tender({ Title: 'Not this', 'TECQ Review': 'Not relevant', 'Closing Date/Time': '01/09/2026 16:00:00' }),
  tender({ Title: 'L late', 'TECQ Review': 'Look at', 'Closing Date/Time': '25/09/2026 16:00:00' }),
  tender({ Title: 'Unreviewed', 'Closing Date/Time': '02/09/2026 16:00:00' }),
  tender({ Title: 'L early', 'TECQ Review': 'Look at', 'Closing Date/Time': '10/09/2026 16:00:00' }),
  tender({ Title: 'P unknown', 'TECQ Review': 'Possible', 'Closing Date/Time': 'Unknown' }),
]);
assert.deepEqual(shortlist.map(r => r.Title), ['L early', 'L late', 'P late', 'P unknown'],
  'Look at first, then closing date ascending, unknown closing last');

// Verdict normalisation only ever yields one of the three canonical values.
assert.equal(context.normalizeReviewVerdict('look at'), 'Look at');
assert.equal(context.normalizeReviewVerdict('Possible'), 'Possible');
assert.equal(context.normalizeReviewVerdict('NOT RELEVANT'), 'Not relevant');
assert.equal(context.normalizeReviewVerdict('probably relevant'), '');
assert.equal(context.normalizeReviewVerdict(''), '');

// Response parsing: bare array, fenced, and prose-wrapped all work.
const good = '[{"id":1,"verdict":"Look at","why":"Licensing system build."},{"id":2,"verdict":"Not relevant","why":"Catering."}]';
let parsed = context.parseReviewResponse(good, 2);
assert.equal(parsed[1].verdict, 'Look at');
assert.equal(parsed[2].verdict, 'Not relevant');
assert.equal(Object.keys(context.parseReviewResponse('```json\n' + good + '\n```', 2)).length, 2);
assert.equal(Object.keys(context.parseReviewResponse('Here you go:\n' + good, 2)).length, 2);
// Out-of-range ids and unusable verdicts are dropped, never guessed at.
assert.deepEqual(Object.keys(context.parseReviewResponse('[{"id":9,"verdict":"Look at","why":"x"}]', 2)), []);
assert.deepEqual(Object.keys(context.parseReviewResponse('[{"id":1,"verdict":"dunno","why":"x"}]', 2)), []);
assert.throws(() => context.parseReviewResponse('I could not do that', 2), /no JSON array/);

// The prompt must carry the evidence the judgment depends on, and say plainly
// when there is none — that is what separates Possible from Not relevant.
const prompt = context.buildReviewPrompt([tender({ Title: 'Case management portal' }), tender({ Source: 'TenderBoard', 'Scope Summary': '' })]);
assert.ok(prompt.includes('Case management portal'));
assert.ok(prompt.includes('IT&Telecommunication ⇒ IT Services & Software Development'));
assert.ok(prompt.includes('no scope text available'));
assert.ok(context.reviewSystemPrompt().includes('KAIZEN'));
assert.ok(context.reviewSystemPrompt().includes('permit-to-work'));

console.log('Core tests passed');
