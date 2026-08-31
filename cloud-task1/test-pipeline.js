// End-to-end tests against the real bundle running in a fake Apps Script
// environment. These cover what the design hinges on: the collector must never
// erase a reviewer's verdict, across every path a row can take.
const assert = require('assert');
const { createEnvironment } = require('./fake-apps-script.js');

let checks = 0;
const check = (label, fn) => { fn(); checks += 1; console.log(`  ok  ${label}`); };

const openRow = over => Object.assign({
  'Tender/Ref No.': 'ABC000ETT26000001', Title: 'Provision of a licensing system',
  Agency: 'Some Agency', 'Procurement Category': 'IT&Telecommunication ⇒ IT Services & Software Development',
  'Category Group': 'IT&Telecommunication', Source: 'GeBIZ', 'Scope Summary': '',
  'Publish Date/Time': '28/08/2026', 'Closing Date/Time': '21/09/2026 16:00:00',
  Status: 'Open', Link: 'https://www.gebiz.gov.sg/x?code=ABC000ETT26000001',
}, over || {});

console.log('\n1. The sheet round-trip preserves reviewer-owned columns');
{
  const env = createEnvironment();
  const ss = env.SpreadsheetApp.openById('t1');
  const written = [
    openRow({ 'TECQ Review': 'Look at', Why: 'Licensing system build.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'fp1' }),
    openRow({ 'Tender/Ref No.': 'B2', Title: 'Air-conditioning replacement', 'TECQ Review': 'Not relevant', Why: 'Plant works.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'fp2' }),
    openRow({ 'Tender/Ref No.': 'C3', Title: 'Not yet judged' }),
  ];
  env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), written);
  const read = env.readObjects(ss, 'EPU/CMP/10');

  check('every row survives the write/read cycle', () => assert.equal(read.length, 3));
  check('verdict, why and fingerprint all survive', () => {
    assert.equal(read[0]['TECQ Review'], 'Look at');
    assert.equal(read[0].Why, 'Licensing system build.');
    assert.equal(read[0]['Review Fingerprint'], 'fp1');
  });
  check('Not relevant rows are kept, never hidden or dropped', () => {
    assert.equal(read[1]['TECQ Review'], 'Not relevant');
  });
  check('an unreviewed row round-trips as unreviewed', () => assert.equal(env.hasReview(read[2]), false));
}

console.log('\n2. mergeCandidates never lets the collector erase a review');
{
  const env = createEnvironment();
  const run = { newGebiz: 0, newTb: 0, newManual: 0, manualPatched: 0, upgrades: 0 };
  const tbRow = openRow({
    'Tender/Ref No.': '', Source: 'TenderBoard', 'Scope Summary': '',
    'TECQ Review': 'Possible', Why: 'Listing data only.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'fpTB',
    _bucket: 'EPU/CMP/10',
  });
  const state = { active: [tbRow], closed: [], awards: [], ledger: [] };
  // GeBIZ later publishes the same tender with a real reference and link.
  const gebizRow = openRow({ 'Tender/Ref No.': 'NEW000ETT26000009', Source: 'GeBIZ', _bucket: 'EPU/CMP/10' });
  env.mergeCandidates(state, [gebizRow], run);

  check('the GeBIZ row is recognised as the same tender, not added twice', () => {
    assert.equal(state.active.length, 1);
    assert.equal(run.upgrades, 1);
    assert.equal(run.newGebiz, 0);
  });
  check('the upgrade takes the better facts', () => {
    assert.equal(state.active[0]['Tender/Ref No.'], 'NEW000ETT26000009');
    assert.equal(state.active[0].Source, 'GeBIZ');
  });
  check('the upgrade keeps the reviewer verdict', () => {
    assert.equal(state.active[0]['TECQ Review'], 'Possible');
    assert.equal(state.active[0].Why, 'Listing data only.');
  });
}

console.log('\n3. A full collector refresh preserves reviews (the core guarantee)');
{
  const env = createEnvironment();
  const ss = env.SpreadsheetApp.openById('t3');
  const seeded = [
    openRow({ 'TECQ Review': 'Look at', Why: 'Licensing system.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'x' }),
    openRow({ 'Tender/Ref No.': '', Title: 'Supply of office chairs', Source: 'TenderBoard', Agency: 'Some Club',
      'TECQ Review': 'Not relevant', Why: 'Furniture supply.', 'Reviewed On': '2026-09-02 12:00', 'Review Fingerprint': 'y' }),
  ];
  env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), seeded);

  // Simulate exactly what runDailyTracker does around a refresh.
  const state = { active: env.readObjects(ss, 'EPU/CMP/10'), closed: [], awards: [], ledger: [] };
  state.active.forEach(row => { row._bucket = 'EPU/CMP/10'; });
  env.migrateRows(state);
  const index = env.buildReviewIndex(state.active.concat(state.closed));

  // The collector re-derives both rows from source and knows nothing of reviews.
  const rebuilt = [
    openRow({ _bucket: 'EPU/CMP/10' }),
    openRow({ 'Tender/Ref No.': '', Title: 'Supply of office chairs', Source: 'TenderBoard', Agency: 'Some Club', _bucket: 'EPU/CMP/10' }),
  ];
  const fresh = { active: rebuilt, closed: [], awards: [], ledger: [] };
  const restored = env.applyReviewIndex(index, fresh.active.concat(fresh.closed));

  check('both reviews are carried onto the rebuilt rows', () => assert.equal(restored, 2));
  check('the referenced row keeps its verdict', () => assert.equal(fresh.active[0]['TECQ Review'], 'Look at'));
  check('the reference-less row is matched by title + agency', () => {
    assert.equal(fresh.active[1]['TECQ Review'], 'Not relevant');
    assert.equal(fresh.active[1].Why, 'Furniture supply.');
  });
  env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), fresh.active);
  check('and they are still there after the refresh is written out', () => {
    const after = env.readObjects(ss, 'EPU/CMP/10');
    assert.equal(after.filter(env.hasReview).length, 2);
  });
}

console.log('\n4. Changed facts invalidate a verdict; unchanged facts do not');
{
  const env = createEnvironment();
  const row = openRow({ 'TECQ Review': 'Look at', Why: 'Licensing system.', 'Reviewed On': '2026-09-02 12:00' });
  row['Review Fingerprint'] = env.reviewFingerprint(row);

  check('an unchanged reviewed row is not re-reviewed', () => assert.equal(env.needsReview(row), false));
  check('a scope that arrives later forces a re-review', () => {
    const changed = Object.assign({}, row, { 'Scope Summary': 'Full scope text fetched from the GeBIZ detail page.' });
    assert.equal(env.needsReview(changed), true);
  });
  check('a re-tender under a new closing date forces a re-review', () => {
    const changed = Object.assign({}, row, { 'Closing Date/Time': '30/10/2026 16:00:00' });
    assert.equal(env.needsReview(changed), true);
  });
}

console.log('\n5. Closing a tender keeps its review');
{
  const env = createEnvironment();
  const run = { moved: 0 };
  const state = { active: [openRow({
    'Closing Date/Time': '01/08/2026 16:00:00',
    'TECQ Review': 'Look at', Why: 'Licensing system.', 'Reviewed On': '2026-07-01 12:00', 'Review Fingerprint': 'z',
    _bucket: 'EPU/CMP/10',
  })], closed: [] };
  env.moveClosed(state, new Date('2026-08-31T12:00:00Z'), run);

  check('the passed tender moves to Closed', () => {
    assert.equal(run.moved, 1);
    assert.equal(state.active.length, 0);
    assert.equal(state.closed.length, 1);
  });
  check('its verdict and reason move with it', () => {
    assert.equal(state.closed[0]['TECQ Review'], 'Look at');
    assert.equal(state.closed[0].Why, 'Licensing system.');
  });
  check('the fingerprint is dropped, since a closed row is not re-reviewed', () => {
    assert.equal(state.closed[0]['Review Fingerprint'], undefined);
  });
}

console.log('\n6. Legacy rows migrate rather than being discarded');
{
  const env = createEnvironment();
  const state = {
    active: [
      { Title: 'Old flagged row', Agency: 'A', 'Procurement Category': 'GeBIZ: Servers',
        'TECQ Recommendation': 'Advise to look at', Source: 'GeBIZ', _bucket: '' },
      { Title: 'Old review-tab row', Agency: 'B', 'Procurement Category': 'GeBIZ: Professional Services',
        'Why Unsure': 'Insufficient detail in feed.', Source: 'GeBIZ', _bucket: '' },
    ],
    closed: [], awards: [],
  };
  env.migrateRows(state);

  check('a legacy "Advise to look at" tag becomes Possible, not Look at', () => {
    assert.equal(state.active[0]['TECQ Review'], 'Possible');
    assert.ok(/legacy/i.test(state.active[0].Why));
  });
  check('it is queued for a real review rather than trusted', () => {
    assert.equal(env.needsReview(state.active[0]), true);
  });
  check('legacy columns are dropped from the schema', () => {
    assert.equal(state.active[0]['TECQ Recommendation'], undefined);
    assert.equal(state.active[1]['Why Unsure'], undefined);
  });
  check('a row from the old Review tab is routed into an EPU tab', () => {
    assert.equal(state.active[0]._bucket, 'EPU/CMP/10');
    assert.equal(state.active[1]._bucket, 'EPU/SER/34');
  });
}

console.log('\n7. The reviewer stops cleanly when the API key is absent');
{
  const env = createEnvironment({ properties: {} });
  const result = env.runWeeklyReview(true);

  check('it reports NOT RUN and names the missing property', () => {
    assert.ok(/NOT RUN/.test(result), result);
    assert.ok(/ANTHROPIC_API_KEY/.test(result), result);
  });
  check('it emails setup instructions instead of failing silently', () => {
    const mail = env.__state.mails[0];
    assert.ok(/API key missing/.test(mail.subject));
    assert.ok(/Script Properties/.test(mail.body));
  });
  check('it changes nothing in the tracker', () => {
    assert.equal(env.__state.trackerFolder._files.length, 0);
  });
  check('no keyword fallback quietly invented verdicts', () => {
    assert.equal(env.__state.properties.lastReviewAt, undefined);
  });
}

console.log('\n8. runNow captures, and defers review when there is no key');
{
  // Capture reaches the network; stub every source so the chain is deterministic.
  const env = createEnvironment({
    properties: { trackerFileId: 'chain-tracker' },
    fetch: url => {
      if (url.indexOf('TenderBoard_Raw_status.json') >= 0) return { code: 500, body: '' };
      return { code: 404, body: '<!DOCTYPE html><html><body><img src="x"></body></html>' };
    },
  });
  const ss = env.SpreadsheetApp.openById('chain-tracker');
  env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), [openRow({ 'Tender/Ref No.': 'Z1', Title: 'Awaiting judgment' })]);
  env.writeTable(ss, 'EPU/SER/34', env.openHeaders(), []);

  const summary = env.runNow();

  check('it reports both stages', () => {
    assert.ok(/\[1\/2\] Capture/.test(summary), summary);
    assert.ok(/\[2\/2\] Review/.test(summary), summary);
  });
  check('the capture stage ran and updated the permanent tracker', () => {
    assert.ok(/new tenders|NO New Tenders/.test(summary), summary);
    assert.equal(env.__state.properties.lastCollectionAt !== undefined, true);
  });
  check('with no key, review is skipped rather than nagged about', () => {
    assert.ok(/Skipped — review runs outside Apps Script/.test(summary), summary);
    assert.ok(!/NOT RUN/.test(summary), summary);
  });
  check('a failing source does not stop the chain', () => {
    assert.ok(/Done in \d+s/.test(summary), summary);
  });
  check('the shortlist tab exists after a manual run', () => {
    assert.notEqual(ss.getSheetByName('TECQ Shortlist'), null);
  });
}

console.log(`\nAll ${checks} pipeline checks passed`);
