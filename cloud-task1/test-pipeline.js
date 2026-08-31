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

console.log('\n9. External verdicts fill blanks only, never overwrite');
{
  const env = createEnvironment();
  const index = env.buildReviewIndex([
    { Title: 'Provision of a licensing system', Agency: 'Some Agency', 'Tender/Ref No.': 'ABC000ETT26000001',
      'TECQ Review': 'Look at', Why: 'Licensing system build.', 'Reviewed On': '2026-09-02 12:05' },
    { Title: 'Already judged by hand', Agency: 'Some Agency', 'Tender/Ref No.': 'HAND-1',
      'TECQ Review': 'Not relevant', Why: 'Reviewer disagrees.', 'Reviewed On': '2026-09-02 12:05' },
  ]);
  const rows = [
    openRow({}),
    openRow({ 'Tender/Ref No.': 'HAND-1', Title: 'Already judged by hand',
      'TECQ Review': 'Look at', Why: 'Benson corrected this by hand.', 'Reviewed On': '2026-09-01 09:00' }),
    openRow({ 'Tender/Ref No.': 'UNSEEN', Title: 'Not in the CSV at all' }),
  ];
  const applied = env.applyExternalReviews(index, rows);

  check('a blank row is filled from the CSV', () => {
    assert.equal(rows[0]['TECQ Review'], 'Look at');
    assert.equal(rows[0].Why, 'Licensing system build.');
  });
  check('a row that already has a verdict is left untouched', () => {
    assert.equal(rows[1]['TECQ Review'], 'Look at');
    assert.equal(rows[1].Why, 'Benson corrected this by hand.');
  });
  check('a row the CSV does not mention stays blank', () => assert.equal(env.hasReview(rows[2]), false));
  check('only the blank row counted as applied', () => assert.equal(applied, 1));
  check('the filled row is fingerprinted, so it is not queued again', () => {
    assert.equal(env.needsReview(rows[0]), false);
  });
}

console.log('\n10. Data files work as CSV or as a Google Sheet');
{
  const header = ['Tender/Ref No.', 'Title', 'Agency', 'Closing Date/Time', 'TECQ Review', 'Why', 'Reviewed On'];
  const data = ['ABC000ETT26000001', 'Provision of a licensing system', 'Some Agency',
    '21/09/2026 16:00:00', 'Look at', 'Licensing system build.', '2026-09-02 12:05'];

  // Drive converts an uploaded CSV to a Google Sheet unless told not to, and
  // getBlob on a Sheet returns a PDF — the case that silently broke the read.
  const asSheet = createEnvironment();
  asSheet.__state.trackerFolder.createSheetFile('TECQ_REVIEWS.csv', [header, data]);
  const runSheet = { reviewFileStatus: '', errors: [] };
  const sheetIndex = asSheet.fetchExternalReviews(runSheet, asSheet.__state.trackerFolder);

  check('a Google Sheet data file is read, not parsed as a PDF', () => {
    assert.ok(/OK — 1 verdict/.test(runSheet.reviewFileStatus), runSheet.reviewFileStatus);
    assert.equal(runSheet.errors.length, 0);
  });
  check('and its verdict applies to a matching row', () => {
    const rows = [openRow({})];
    assert.equal(asSheet.applyExternalReviews(sheetIndex, rows), 1);
    assert.equal(rows[0]['TECQ Review'], 'Look at');
  });

  // The plain-CSV form must keep working too.
  const asCsv = createEnvironment();
  const csv = [header, data].map(line => line.map(c => `"${c}"`).join(',')).join('\n');
  asCsv.__state.trackerFolder.createFile('TECQ_REVIEWS.csv', csv);
  const runCsv = { reviewFileStatus: '', errors: [] };
  const csvIndex = asCsv.fetchExternalReviews(runCsv, asCsv.__state.trackerFolder);
  check('a plain CSV data file still works', () => {
    assert.ok(/OK — 1 verdict/.test(runCsv.reviewFileStatus), runCsv.reviewFileStatus);
    const rows = [openRow({})];
    assert.equal(asCsv.applyExternalReviews(csvIndex, rows), 1);
  });

  // The reviewer drops a dated file each run and never deletes the old one, so
  // it needs no destructive permission. The newest must win.
  const dated = createEnvironment();
  dated.__state.trackerFolder.createSheetFile('TECQ_REVIEWS_2026-09-02.csv',
    [header, ['OLD-1', 'Provision of a licensing system', 'Some Agency', '21/09/2026 16:00:00',
      'Not relevant', 'Stale verdict from the older drop.', '2026-09-02 12:05']]);
  dated.__state.trackerFolder.createSheetFile('TECQ_REVIEWS_2026-09-04.csv', [header, data]);
  const runDated = { reviewFileStatus: '', errors: [] };
  const datedIndex = dated.fetchExternalReviews(runDated, dated.__state.trackerFolder);
  check('the newest dated review file is the one used', () => {
    assert.ok(/TECQ_REVIEWS_2026-09-04/.test(runDated.reviewFileStatus), runDated.reviewFileStatus);
  });
  check('and the superseded drop is ignored, not merged', () => {
    const rows = [openRow({})];
    dated.applyExternalReviews(datedIndex, rows);
    assert.equal(rows[0]['TECQ Review'], 'Look at');
  });

  // MANUAL_TENDERS has the same problem and the same fix.
  const manual = createEnvironment();
  manual.__state.trackerFolder.createSheetFile('MANUAL_TENDERS',
    [['Tender/Ref No.', 'Title', 'Agency', 'Procurement Category', 'Source', 'Closing Date/Time'],
     ['NEA000ETT26000085', 'Mobile data plan tender', 'NEA', 'IT&Telecommunication ⇒ Others', 'GeBIZ', '21/09/2026 16:00:00']]);
  const runManual = { manualStatus: '', errors: [] };
  const manualRows = manual.fetchManual(runManual, manual.__state.trackerFolder);
  check('MANUAL_TENDERS stored as a Google Sheet is read correctly', () => {
    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].Title, 'Mobile data plan tender');
    assert.equal(manualRows[0]['Category Group'], 'IT&Telecommunication');
  });
}

console.log('\n11. Tender tabs carry a filter for sorting');
{
  const env = createEnvironment();
  const ss = env.SpreadsheetApp.openById('filter-test');
  env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), [openRow({}), openRow({ 'Tender/Ref No.': 'B2' })]);

  check('a filter is created over the header row and data', () => {
    const filter = ss.getSheetByName('EPU/CMP/10').getFilter();
    assert.notEqual(filter, null);
    assert.deepEqual(filter.range, [1, 1, 3, env.openHeaders().length]);
  });
  check('rewriting the tab replaces the filter rather than failing', () => {
    env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), [openRow({})]);
    const filter = ss.getSheetByName('EPU/CMP/10').getFilter();
    assert.deepEqual(filter.range, [1, 1, 2, env.openHeaders().length]);
  });
  check('an empty tab is left without a filter, not broken', () => {
    env.writeTable(ss, 'EPU/SER/34', env.openHeaders(), []);
    assert.equal(ss.getSheetByName('EPU/SER/34').getFilter(), null);
  });
}

console.log('\n12. The main folder is kept to the tracker and the archive');
{
  const env = createEnvironment({ properties: { trackerFileId: 'tidy-tracker' } });
  const main = env.__state.trackerFolder;
  const archive = env.__state.archiveFolder;
  env.SpreadsheetApp.openById('tidy-tracker');
  const tracker = env.DriveApp.getFileById('tidy-tracker');
  main._files.push(tracker);
  main.createFile('2026-08-30_1234_GeBIZ_Open_Tenders', 'old');
  main.createFile('TenderBoard_Raw_2026-08-30_1006.csv', 'old');
  main.createFile('TECQ_REVIEWS_2026-09-02.csv', 'superseded');
  main.createFile('TECQ_REVIEWS_2026-09-04.csv', 'newest');
  main.createFile('MANUAL_TENDERS', 'keep me');

  const run = { notes: [] };
  env.tidyMainFolder(main, 'tidy-tracker', run);
  const left = main._files.map(f => f.getName()).sort();
  const archived = archive._files.map(f => f.getName()).sort();

  check('dated trackers and raw CSVs are moved to the archive', () => {
    assert.ok(archived.includes('2026-08-30_1234_GeBIZ_Open_Tenders'), archived.join(','));
    assert.ok(archived.includes('TenderBoard_Raw_2026-08-30_1006.csv'), archived.join(','));
  });
  check('a superseded review drop is archived, the newest is not', () => {
    assert.ok(archived.includes('TECQ_REVIEWS_2026-09-02.csv'), archived.join(','));
    assert.ok(left.includes('TECQ_REVIEWS_2026-09-04.csv'), left.join(','));
  });
  check('the tracker itself is never moved', () => assert.ok(left.includes('tidy-tracker')));
  check('nothing is deleted — every file still exists somewhere', () => {
    assert.equal(left.length + archived.length, 6);
  });
  check('it reports what it archived', () => assert.ok(/Archived 3 file/.test(run.notes.join(' ')), run.notes.join(' ')));
}

console.log('\n13. Working files are found in the archive folder');
{
  const env = createEnvironment();
  const header = ['Tender/Ref No.', 'Title', 'Agency', 'Closing Date/Time', 'TECQ Review', 'Why', 'Reviewed On'];
  // Everything moved out of the main folder, as the user wants it.
  env.__state.archiveFolder.createSheetFile('TECQ_REVIEWS_2026-09-04.csv', [header,
    ['ABC000ETT26000001', 'Provision of a licensing system', 'Some Agency', '21/09/2026 16:00:00',
     'Look at', 'Licensing system build.', '2026-09-04 12:05']]);
  env.__state.archiveFolder.createSheetFile('MANUAL_TENDERS',
    [['Tender/Ref No.', 'Title', 'Agency', 'Procurement Category', 'Source'],
     ['NEA000ETT26000085', 'Mobile data plan tender', 'NEA', 'IT&Telecommunication ⇒ Others', 'GeBIZ']]);
  env.__state.archiveFolder.createFile('RUN_CADENCE', 'paused');

  const run = { reviewFileStatus: '', manualStatus: '', errors: [] };
  check('TECQ_REVIEWS is found in the archive', () => {
    const index = env.fetchExternalReviews(run, env.__state.trackerFolder);
    assert.ok(/OK — 1 verdict/.test(run.reviewFileStatus), run.reviewFileStatus);
    const rows = [openRow({})];
    assert.equal(env.applyExternalReviews(index, rows), 1);
  });
  check('MANUAL_TENDERS is found in the archive', () => {
    assert.equal(env.fetchManual(run, env.__state.trackerFolder).length, 1);
  });
  check('RUN_CADENCE is read from the archive and still gates the run', () => {
    assert.equal(env.readCadence(env.__state.trackerFolder, new Date(), null).run, false);
  });
  check('a missing RUN_CADENCE is created in the archive, not the main folder', () => {
    const fresh = createEnvironment();
    fresh.readCadence(fresh.__state.trackerFolder, new Date(), null);
    assert.equal(fresh.__state.trackerFolder._files.length, 0);
    assert.equal(fresh.__state.archiveFolder._files.map(f => f.getName())[0], 'RUN_CADENCE');
  });
}

console.log('\n14. The tracker name carries its last-updated stamp');
{
  const env = createEnvironment();
  env.SpreadsheetApp.openById('stamp-tracker');
  const file = env.DriveApp.getFileById('stamp-tracker');
  const name = env.stampTrackerName(file, new Date('2026-08-31T12:40:00Z'));
  check('the name shows date and time', () => {
    assert.ok(/^GeBIZ Tender Tracker — Current \(\d{2}\/\d{2}\/\d{2}, .+\)$/.test(name), name);
  });
  check('the file is actually renamed', () => assert.equal(file.getName(), name));
  check('a stamped tracker is still found by prefix, so the id survives a rename', () => {
    env.__state.trackerFolder._files.push(file);
    assert.equal(env.findNewestByPrefix(env.__state.trackerFolder, 'GeBIZ Tender Tracker — Current').getId(), 'stamp-tracker');
  });
}

console.log(`\nAll ${checks} pipeline checks passed`);
