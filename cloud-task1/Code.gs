// ===========================================================================
// runNow — the manual button. Click Run with this selected and it does
// everything the schedule does: capture GeBIZ + TenderBoard + MANUAL_TENDERS,
// update "GeBIZ Tender Tracker — Current" in place, then review the open
// tenders and rebuild the shortlist.
//
// It is deliberately the first function in the file, because the Apps Script
// editor preselects the first function in its run picker — so the default
// selection is the one worth running, not a helper that silently does nothing.
// ===========================================================================
function runNow() {
  const started = new Date();
  const lines = ['MANUAL RUN — capture then review', ''];

  lines.push('[1/2] Capture');
  let collection;
  try {
    collection = runDailyTracker(true);
  } catch (error) {
    lines.push(`  FAILED — ${briefError(error)}`);
    lines.push('', 'Stopped: nothing was reviewed, because there is nothing new to review.');
    console.log(lines.join('\n'));
    throw error;
  }
  lines.push(collection.split('\n').map(line => `  ${line}`).join('\n'));

  // A capture that was gated by RUN_CADENCE has not refreshed anything, but the
  // reviewer still runs — there may be rows outstanding from an earlier day.
  // With no API key, review is handled outside Apps Script; say so and stop.
  lines.push('', '[2/2] Review');
  if (!PropertiesService.getScriptProperties().getProperty(CONFIG.anthropicKeyProperty)) {
    lines.push('  Skipped — review runs outside Apps Script (no API key configured here).');
  } else {
    let review;
    try {
      review = runWeeklyReview(true);
    } catch (error) {
      review = `FAILED — ${briefError(error)}`;
    }
    lines.push(`  ${review}`);
  }

  const seconds = Math.round((new Date() - started) / 1000);
  lines.push('', `Done in ${seconds}s. Open the TECQ Shortlist tab.`);
  const summary = lines.join('\n');
  console.log(summary);
  return summary;
}

// Capture only — no review. Useful when checking a feed or a backfill change.
function runTestNow() {
  return runDailyTracker(true);
}

// Diagnostic. Run this by hand when GeBIZ feed names need to be found.
// It fetches the pages that might link to the RSS feeds and writes everything
// it can see about them to GEBIZ_FEED_INDEX.txt in the tracker folder, so the
// real filenames can be read off and pinned into CONFIG.feeds. Fetches only;
// it never touches the tracker.
function discoverFeedNames() {
  const report = [`GeBIZ feed index probe — ${Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm')} SGT`, ''];
  const found = {};

  CONFIG.feedIndexProbeUrls.forEach(url => {
    report.push(`--- ${url}`);
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      const code = response.getResponseCode();
      const body = response.getContentText();
      report.push(`HTTP ${code}, ${body.length} chars, ${response.getHeaders()['Content-Type'] || 'no content-type'}`);
      if (code !== 200) { report.push(''); return; }

      extractFeedNames(body).forEach(name => { found[name] = true; report.push(`FEED FILE: ${name}`); });

      // Any link that mentions rss/feed/xml, so a differently-named scheme shows up too.
      const links = body.match(/(?:href|src|action)\s*=\s*["']([^"']*(?:rss|feed|\.xml)[^"']*)["']/gi) || [];
      Array.from(new Set(links)).slice(0, 60).forEach(link => report.push(`LINK: ${cleanText(link)}`));

      // Category labels, to compare against the feed filenames.
      const options = body.match(/<option[^>]*>([^<]{3,60})<\/option>/gi) || [];
      Array.from(new Set(options)).slice(0, 80).forEach(option => report.push(`OPTION: ${cleanText(option.replace(/<[^>]+>/g, ''))}`));

      if (!links.length && !options.length) report.push('(no rss/feed/xml links and no option labels in the HTML — page is probably script-rendered)');
    } catch (error) {
      report.push(`FETCH FAILED: ${briefError(error)}`);
    }
    report.push('');
  });

  const names = Object.keys(found);
  report.push(`TOTAL DISTINCT FEED FILENAMES FOUND: ${names.length}`);
  names.forEach(name => report.push(name));

  const folder = DriveApp.getFolderById(CONFIG.trackerFolderId);
  const existing = folder.getFilesByName('GEBIZ_FEED_INDEX.txt');
  const text = report.join('\n');
  if (existing.hasNext()) existing.next().setContent(text);
  else folder.createFile('GEBIZ_FEED_INDEX.txt', text, MimeType.PLAIN_TEXT);
  return `Wrote GEBIZ_FEED_INDEX.txt — ${names.length} feed filename(s) found across ${CONFIG.feedIndexProbeUrls.length} pages.`;
}

const CONFIG = Object.freeze({
  trackerFolderId: '1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g',
  archiveFolderId: '1TPg44swiYi14FD3rciZx-WNCsFE8Qyve',
  seedId: '11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8',
  tbCsv: 'https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_latest.csv',
  tbStatus: 'https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json',
  notifyEmail: 'bnsn4ull@gmail.com',
  timezone: 'Asia/Singapore',
  ledgerStart: '2026-08-07',
  // GeBIZ RSS keeps roughly two days of items. Running twice a day means a
  // single failed run can no longer drop a whole day of tenders on the floor.
  runHours: [11, 23],
  manualFile: 'MANUAL_TENDERS',
  // Verdicts produced by the scheduled review that runs outside Apps Script.
  // A plain CSV, because a Claude session can create a Drive file but cannot
  // write cells inside an existing spreadsheet — Apps Script does that part.
  reviewFile: 'TECQ_REVIEWS.csv',
  reviewFileAliases: ['TECQ_REVIEWS.csv', 'TECQ_REVIEWS'],
  manualFileAliases: ['MANUAL_TENDERS', 'MANUAL_TENDERS.csv'],
  // One permanent tracker, updated in place. Its Drive id is remembered in a
  // script property so a rename can never fork it into two files.
  trackerName: 'GeBIZ Tender Tracker — Current',
  trackerIdProperty: 'trackerFileId',
  historyFolderName: 'History',
  // Reviewer: Wednesday and Friday at about noon SGT, after the 11:00 collection.
  reviewHour: 12,
  reviewDays: ['WEDNESDAY', 'FRIDAY'],
  snapshotDay: 'FRIDAY',
  // Claude reads the tender facts and returns a verdict. The key is human-owned
  // and lives in Script Properties; it is never stored in this file.
  anthropicKeyProperty: 'ANTHROPIC_API_KEY',
  anthropicUrl: 'https://api.anthropic.com/v1/messages',
  anthropicVersion: '2023-06-01',
  anthropicBeta: 'server-side-fallback-2026-07-01',
  reviewModel: 'claude-opus-5',
  reviewBatchSize: 12,
  reviewMaxTokens: 16000,
  reviewDetailFetches: 25,
  // GeBIZ publishes one RSS feed per procurement category and names the files
  // itself, so a category can only be fetched if its exact filename is known.
  // Rather than guess, scrape the pages that link to those feeds and adopt
  // whatever they list. These are GeBIZ's real RSS/alerts pages. A page that
  // is unreachable or lists nothing is skipped silently; the named feeds below
  // always run regardless.
  // Wider list, used only by the discoverFeedNames diagnostic.
  feedIndexProbeUrls: [
    'https://www.gebiz.gov.sg/business-alerts.html',
    'https://www.gebiz.gov.sg/scripts/rss/faq.html',
    'https://www.gebiz.gov.sg/rss-terms-of-use.html',
    'https://www.gebiz.gov.sg/rss/',
    'https://www.gebiz.gov.sg/',
    'https://www.gebiz.gov.sg/faq.html',
    'https://www.gebiz.gov.sg/announcements.html',
    'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=opportunities',
    'https://www.gebiz.gov.sg/ptn/opportunity/opportunityListing.xhtml',
    'https://www.gebiz.gov.sg/sitemap.xml',
    'https://www.gebiz.gov.sg/robots.txt',
  ],
  feedIndexUrls: [
    'https://www.gebiz.gov.sg/business-alerts.html',
    'https://www.gebiz.gov.sg/scripts/rss/faq.html',
    'https://www.gebiz.gov.sg/rss-terms-of-use.html',
    'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=opportunities',
    'https://www.gebiz.gov.sg/',
    'https://www.gebiz.gov.sg/rss/',
  ],
  // Confirmed live on 31 Aug 2026: each of these returned a parseable feed.
  feeds: [
    ['IT Services & Software Development', 'EPU/CMP/10', 'IT_Services_%26_Software_Development-CREATE_BO_FEED.xml'],
    ['Softwares & Licences', 'EPU/CMP/10', 'Softwares_%26_Licences-CREATE_BO_FEED.xml'],
    ['Desktop Computers', 'EPU/CMP/10', 'Desktop_Computers-CREATE_BO_FEED.xml'],
    ['Computer Accessories', 'EPU/CMP/10', 'Computer_Accessories-CREATE_BO_FEED.xml'],
    ['Notebooks', 'EPU/CMP/10', 'Notebooks-CREATE_BO_FEED.xml'],
    ['Servers', 'EPU/CMP/10', 'Servers-CREATE_BO_FEED.xml'],
    ['Professional Services', 'EPU/SER/34', 'Professional_Services-CREATE_BO_FEED.xml'],
  ],
  // GeBIZ publishes one feed per sub-category and names the files itself, so
  // the only categories we can fetch are the ones we can name. These are
  // unconfirmed spellings for categories known to exist in the GeBIZ taxonomy
  // but whose feed filename is unknown — "Telecommunication" and
  // "Others" under IT&Telecommunication both returned an HTML error page.
  // A candidate that is not a real feed costs one request and is skipped
  // silently, so guessing here is cheap and cannot break a run.
  feedCandidates: [
    'Telecommunications-CREATE_BO_FEED.xml',
    'Telecommunication_Services-CREATE_BO_FEED.xml',
    'Telecommunication_Equipment-CREATE_BO_FEED.xml',
    'IT%26Telecommunication-CREATE_BO_FEED.xml',
    'IT%26Telecommunication_Others-CREATE_BO_FEED.xml',
    'IT_Others-CREATE_BO_FEED.xml',
    'Others_%28IT%26Telecommunication%29-CREATE_BO_FEED.xml',
    'Computer_Software-CREATE_BO_FEED.xml',
    'Computer_Hardware-CREATE_BO_FEED.xml',
    'Cloud_Services-CREATE_BO_FEED.xml',
    'Data_Services-CREATE_BO_FEED.xml',
    'Consultancy_Services-CREATE_BO_FEED.xml',
    'Management_Consultancy-CREATE_BO_FEED.xml',
  ],
});

const OPEN_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Scope Summary','Publish Date/Time','Closing Date/Time','Status','TECQ Review','Why','Reviewed On','Review Fingerprint','Link'];
const SHORTLIST_HEADERS = ['TECQ Review','Closing Date/Time','Title','Agency','Procurement Category','Category Group','Source','Why','Tender/Ref No.','EPU Tab','Link'];
const CLOSED_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Scope Summary','Closing Date/Time','Move Date','TECQ Review','Why','Link'];
const AWARD_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Awarded To','Award Value','Award Date','Link'];
const LEDGER_HEADERS = ['Date','GeBIZ','TenderBoard','New (GeBIZ)','New (TB)','Notes'];
const TAB_NAMES = ['TECQ Shortlist','EPU/CMP/10','EPU/SER/34','Closed Tenders','Awarded (Intel)','Run Ledger','Coverage & Method'];


// ---------------------------------------------------------------------------
// Weekly reviewer — Wednesday and Friday, headless
//
// This is genuine semantic review: the tender facts are sent to Claude and the
// verdict comes back from the model. There is deliberately no keyword fallback,
// because a keyword rule dressed up as a review is worse than no review — it
// looks authoritative and is not. With no API key the reviewer records that it
// did not run and changes nothing.
// ---------------------------------------------------------------------------

function runReviewNow() {
  return runWeeklyReview(true);
}

function runWeeklyReview(forceRun) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Skipped: another run is active.';
  const properties = PropertiesService.getScriptProperties();
  const run = { reviewed: 0, failures: [], batches: 0, details: 0, skipped: 0 };
  try {
    const now = new Date();
    const apiKey = properties.getProperty(CONFIG.anthropicKeyProperty);
    if (!apiKey) {
      const message = `NOT RUN — ${CONFIG.anthropicKeyProperty} is not set in Script Properties`;
      properties.setProperty('lastReviewStatus', message);
      MailApp.sendEmail(CONFIG.notifyEmail, 'GeBIZ review NOT RUN — API key missing', [
        message,
        '',
        'The Wednesday/Friday reviewer needs an Anthropic API key to make a real judgment.',
        'Apps Script editor > Project Settings > Script Properties > Add script property:',
        `  Property: ${CONFIG.anthropicKeyProperty}`,
        '  Value:    your key from https://console.anthropic.com/settings/keys',
        '',
        'Nothing in the tracker was changed.',
      ].join('\n'));
      return message;
    }

    const trackerFolder = DriveApp.getFolderById(CONFIG.trackerFolderId);
    const tracker = resolveTracker(trackerFolder);
    const ss = SpreadsheetApp.openById(tracker.file.getId());

    const buckets = ['EPU/CMP/10', 'EPU/SER/34'];
    const rowsByTab = {};
    let pending = [];
    buckets.forEach(name => {
      rowsByTab[name] = readObjects(ss, name);
      rowsByTab[name].forEach(row => { row._bucket = name; });
      pending = pending.concat(rowsByTab[name].filter(needsReview));
    });
    if (!pending.length) {
      const message = `OK — nothing to review at ${Utilities.formatDate(now, CONFIG.timezone, 'dd MMM yyyy, h:mm a')} SGT`;
      properties.setProperty('lastReviewAt', now.toISOString());
      properties.setProperty('lastReviewStatus', message);
      return message;
    }

    enrichScopes(pending, run);

    for (let offset = 0; offset < pending.length; offset += CONFIG.reviewBatchSize) {
      const batch = pending.slice(offset, offset + CONFIG.reviewBatchSize);
      run.batches += 1;
      let verdicts;
      try {
        verdicts = reviewBatch(batch, apiKey);
      } catch (error) {
        run.failures.push(`batch ${run.batches}: ${briefError(error)}`);
        continue;
      }
      const stamp = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm');
      batch.forEach((row, index) => {
        const verdict = verdicts[index + 1];
        if (!verdict) { run.skipped += 1; return; }
        row['TECQ Review'] = verdict.verdict;
        row.Why = verdict.why;
        row['Reviewed On'] = stamp;
        row['Review Fingerprint'] = reviewFingerprint(row);
        run.reviewed += 1;
      });
    }

    buckets.forEach(name => {
      writeTable(ss, name, OPEN_HEADERS, rowsByTab[name].sort(sortPublishDesc));
    });
    const shortlist = buildShortlist(rowsByTab['EPU/CMP/10'].concat(rowsByTab['EPU/SER/34']))
      .map(row => Object.assign({}, row, { 'EPU Tab': row._bucket }));
    writeTable(ss, 'TECQ Shortlist', SHORTLIST_HEADERS, shortlist,
      'Nothing shortlisted. Rows appear here once the Wednesday/Friday review marks them Look at or Possible.');
    SpreadsheetApp.flush();

    const status = `${run.failures.length ? 'PARTIAL' : 'OK'} — ${run.reviewed} reviewed, ${run.skipped} returned no verdict, ${run.batches} batch(es), ${run.details} detail page(s) fetched${run.failures.length ? '; ' + run.failures.join('; ') : ''}`;
    properties.setProperty('lastReviewAt', now.toISOString());
    properties.setProperty('lastReviewStatus', status);

    let snapshot = '';
    if (isSnapshotDay(now) || forceRun === 'snapshot') snapshot = writeSnapshot(trackerFolder, tracker.file, now);

    MailApp.sendEmail(CONFIG.notifyEmail,
      `GeBIZ review: ${shortlist.filter(r => r['TECQ Review'] === REVIEW_LOOK).length} to look at`, [
        status,
        `Shortlist: ${shortlist.length} open (${shortlist.filter(r => r['TECQ Review'] === REVIEW_LOOK).length} ${REVIEW_LOOK}, ${shortlist.filter(r => r['TECQ Review'] === REVIEW_POSSIBLE).length} ${REVIEW_POSSIBLE})`,
        snapshot ? `Snapshot: ${snapshot}` : 'Snapshot: not a snapshot day',
        `Tracker: ${tracker.file.getUrl()}`,
        '',
      ].concat(shortlist.filter(r => r['TECQ Review'] === REVIEW_LOOK).slice(0, 10)
        .map(r => `• ${r.Title} — ${r.Agency} [closes ${r['Closing Date/Time']}]\n  ${r.Why}`)).join('\n'));
    return status;
  } catch (error) {
    const message = `Weekly review failed: ${error && error.stack ? error.stack : error}`;
    properties.setProperty('lastReviewStatus', `FAILED — ${briefError(error)}`);
    try { MailApp.sendEmail(CONFIG.notifyEmail, 'GeBIZ review FAILED', message); } catch (_) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// Give the model real scope text where GeBIZ publishes one. TenderBoard rows
// have no detail page we are allowed to fetch, so they stay listing-only.
function enrichScopes(rows, run) {
  const targets = rows.filter(row => cleanText(row.Source) === 'GeBIZ' && cleanText(row.Link)
    && !cleanText(row['Scope Summary'])).slice(0, CONFIG.reviewDetailFetches);
  if (!targets.length) return;
  const responses = UrlFetchApp.fetchAll(targets.map(row => ({ url: row.Link, muteHttpExceptions: true })));
  responses.forEach((response, index) => {
    if (response.getResponseCode() !== 200) return;
    const scope = extractScope(response.getContentText());
    if (!scope) return;
    targets[index]['Scope Summary'] = scope;
    run.details += 1;
  });
}

// Strip a GeBIZ detail page down to readable text for the model to judge.
function extractScope(html) {
  const body = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return cleanText(body).slice(0, 1500);
}

function reviewBatch(rows, apiKey) {
  const payload = {
    model: CONFIG.reviewModel,
    max_tokens: CONFIG.reviewMaxTokens,
    system: REVIEW_SYSTEM_PROMPT,
    fallbacks: 'default',
    messages: [{ role: 'user', content: buildReviewPrompt(rows) }],
  };
  const response = UrlFetchApp.fetch(CONFIG.anthropicUrl, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': CONFIG.anthropicVersion,
      'anthropic-beta': CONFIG.anthropicBeta,
    },
    payload: JSON.stringify(payload),
  });
  const code = response.getResponseCode();
  if (code !== 200) throw new Error(`Anthropic HTTP ${code}: ${cleanText(response.getContentText()).slice(0, 200)}`);
  const body = JSON.parse(response.getContentText());
  // A policy decline arrives as HTTP 200 — check before reading the content.
  if (body.stop_reason === 'refusal') throw new Error('model declined this batch');
  const text = (body.content || []).filter(block => block.type === 'text').map(block => block.text).join('');
  return parseReviewResponse(text, rows.length);
}

function isSnapshotDay(now) {
  const day = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][
    Number(Utilities.formatDate(now, CONFIG.timezone, 'u')) % 7];
  return day === CONFIG.snapshotDay;
}

// One dated copy a week, kept forever. History is never pruned here.
function writeSnapshot(trackerFolder, trackerFile, now) {
  const name = `${Utilities.formatDate(now, CONFIG.timezone, 'yyyy-MM-dd')}_GeBIZ_Tender_Tracker`;
  const history = historyFolder(trackerFolder);
  const existing = history.getFilesByName(name);
  if (existing.hasNext()) {
    const url = existing.next().getUrl();
    PropertiesService.getScriptProperties().setProperty('lastSnapshot', `${name} (already existed)`);
    return url;
  }
  const copy = trackerFile.makeCopy(name, history);
  PropertiesService.getScriptProperties().setProperty('lastSnapshot', `${name} (${Utilities.formatDate(now, CONFIG.timezone, 'dd MMM yyyy')})`);
  return copy.getUrl();
}

// Accessors so tests can reference the schemas without duplicating them.
function openHeaders() { return OPEN_HEADERS; }
function shortlistHeaders() { return SHORTLIST_HEADERS; }
function closedHeaders() { return CLOSED_HEADERS; }
function tabNames() { return TAB_NAMES; }
function reviewFields() { return REVIEW_FIELDS; }

function setupCloudTask() {
  const handled = ['runDailyTracker', 'runWeeklyReview'];
  ScriptApp.getProjectTriggers()
    .filter(t => handled.indexOf(t.getHandlerFunction()) >= 0)
    .forEach(t => ScriptApp.deleteTrigger(t));
  CONFIG.runHours.forEach(hour => {
    ScriptApp.newTrigger('runDailyTracker').timeBased().atHour(hour).nearMinute(0).everyDays(1).inTimezone(CONFIG.timezone).create();
  });
  // The in-script reviewer needs an API key. Without one it can only report
  // that it did not run, so installing its triggers would just email that twice
  // a week forever. Review is then handled outside Apps Script instead.
  const hasKey = !!PropertiesService.getScriptProperties().getProperty(CONFIG.anthropicKeyProperty);
  if (hasKey) {
    CONFIG.reviewDays.forEach(day => {
      ScriptApp.newTrigger('runWeeklyReview').timeBased()
        .onWeekDay(ScriptApp.WeekDay[day]).atHour(CONFIG.reviewHour).inTimezone(CONFIG.timezone).create();
    });
  }
  return [
    `Collection: daily at approximately ${CONFIG.runHours.join(':00 and ')}:00 SGT.`,
    hasKey
      ? `Review: in-script, ${CONFIG.reviewDays.join(' and ')} at approximately ${CONFIG.reviewHour}:00 SGT.`
      : `Review: no ${CONFIG.anthropicKeyProperty} set, so no review triggers were installed — review runs outside Apps Script.`,
    `Everything runs in Google's cloud; this PC does not need to be on.`,
  ].join(' ');
}

function runDailyTracker(forceRun) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Skipped: another run is active.';
  const run = {
    errors: [], notes: [], newGebiz: 0, newTb: 0, newManual: 0, manualPatched: 0, moved: 0, upgrades: 0,
    reviewsRestored: 0, reviewsApplied: 0, reviewFileStatus: '', trackerUrl: '',
    tbArchive: '', tbStatus: '', gebizStatus: 'OK', manualStatus: 'No MANUAL_TENDERS file.',
    feedCounts: [], feedsUnavailable: [], feedsFailed: [], feedsDiscovered: [],
  };
  try {
    const now = new Date();
    const trackerFolder = DriveApp.getFolderById(CONFIG.trackerFolderId);
    const archiveFolder = DriveApp.getFolderById(CONFIG.archiveFolderId);
    const cadence = readCadence(trackerFolder, now, findLatestCollectionTime());
    if (!forceRun && !cadence.run) return `Skipped by cadence: ${cadence.directive}`;

    const tracker = resolveTracker(trackerFolder);
    run.trackerUrl = tracker.file.getUrl();
    if (tracker.created) run.notes.push(`Created permanent tracker from ${tracker.seededFrom}`);
    const output = SpreadsheetApp.openById(tracker.file.getId());
    const state = loadState(output);
    migrateRows(state);
    // Reviewer-owned values are indexed before any merging, then re-applied, so
    // a row the collector rebuilds or re-creates keeps the verdict it had.
    const reviewIndex = buildReviewIndex(state.active.concat(state.closed));
    const gebiz = fetchGebiz(run);
    const tb = fetchTenderBoard(run, archiveFolder, now);
    const manual = fetchManual(run, trackerFolder);
    mergeCandidates(state, gebiz.concat(tb).concat(manual), run);
    moveClosed(state, now, run);
    captureAwards(state, run);
    updateLedger(state, now, run);

    run.reviewsRestored = applyReviewIndex(reviewIndex, state.active.concat(state.closed));
    // Verdicts from the external reviewer are applied last, so a newer judgment
    // wins over whatever the row was carrying.
    run.reviewsApplied = applyExternalReviews(fetchExternalReviews(run, trackerFolder), state.active);
    PropertiesService.getScriptProperties().setProperty('lastCollectionAt', now.toISOString());
    writeTracker(output, state, run, cadence);
    SpreadsheetApp.flush();
    verifyTracker(output, state);

    const summary = buildSummary(tracker.file, state, run);
    const newTotal = run.newGebiz + run.newTb + run.newManual;
    MailApp.sendEmail(CONFIG.notifyEmail, `GeBIZ/TB: ${newTotal ? newTotal + ' New Tenders' : 'NO New Tenders'}`, summary);
    return summary;
  } catch (error) {
    const message = `Cloud Task 1 failed: ${error && error.stack ? error.stack : error}`;
    try { MailApp.sendEmail(CONFIG.notifyEmail, 'GeBIZ/TB tracker FAILED', message); } catch (_) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// The one permanent tracker. Resolution order: remembered id, then a file of
// that name in the folder, then seeded from the newest legacy dated copy, then
// from the seed workbook. The id is written back so later runs never search.
function resolveTracker(folder) {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(CONFIG.trackerIdProperty);
  if (storedId) {
    try {
      const file = DriveApp.getFileById(storedId);
      if (!file.isTrashed()) return { file: file, created: false };
    } catch (_) {
      // Remembered id no longer resolves; fall through and re-establish it.
    }
  }
  const named = folder.getFilesByName(CONFIG.trackerName);
  if (named.hasNext()) {
    const file = named.next();
    properties.setProperty(CONFIG.trackerIdProperty, file.getId());
    return { file: file, created: false };
  }
  const seedFrom = findLatestTracker(folder) || DriveApp.getFileById(CONFIG.seedId);
  const file = seedFrom.makeCopy(CONFIG.trackerName, folder);
  properties.setProperty(CONFIG.trackerIdProperty, file.getId());
  return { file: file, created: true, seededFrom: seedFrom.getName() };
}

function historyFolder(folder) {
  const existing = folder.getFoldersByName(CONFIG.historyFolderName);
  return existing.hasNext() ? existing.next() : folder.createFolder(CONFIG.historyFolderName);
}

function findLatestTracker(folder) {
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  let latest = null;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName() === CONFIG.trackerName) continue;
    if (!file.getName().includes('GeBIZ_Open_Tenders')) continue;
    if (!latest || file.getDateCreated() > latest.getDateCreated()) latest = file;
  }
  return latest;
}

function readCadence(folder, now, latestDate) {
  const files = folder.getFilesByName('RUN_CADENCE');
  let file;
  if (files.hasNext()) file = files.next();
  else file = folder.createFile('RUN_CADENCE', 'daily', MimeType.PLAIN_TEXT);
  return parseCadence(file.getBlob().getDataAsString(), now, latestDate);
}

// Configured feeds, plus any feed name found on a GeBIZ RSS index page that
// looks like an IT/telecom/professional-services category we do not have yet.
function resolveFeeds(run) {
  const feeds = [];
  const known = {};
  const add = (filename, bucket, confirmed, discovered) => {
    const key = String(filename).toLowerCase();
    if (known[key]) return;
    known[key] = true;
    const category = feedCategoryName(filename);
    feeds.push({ category, bucket: bucket || (SER_PATTERN.test(category) ? 'EPU/SER/34' : 'EPU/CMP/10'), filename, confirmed });
    if (discovered) run.feedsDiscovered.push(filename);
  };

  CONFIG.feeds.forEach(([, bucket, filename]) => add(filename, bucket, true));
  CONFIG.feedCandidates.forEach(filename => add(filename, null, false));

  // Anything the index page lists is taken as-is. Every feed GeBIZ publishes
  // is in scope; routing decides which tab it lands in, nothing is screened out.
  CONFIG.feedIndexUrls.forEach(url => {
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) return;
      extractFeedNames(response.getContentText()).forEach(filename => add(filename, null, false, true));
    } catch (_) {
      // An unreachable index page is never fatal; the named feeds still run.
    }
  });
  return feeds;
}

// Fetch every in-scope GeBIZ feed and keep every item it returns.
// No relevance test, no exclusion list: nothing is dropped between the feed
// and the EPU tabs.
function fetchGebiz(run) {
  const candidates = [];
  resolveFeeds(run).forEach(feed => {
    try {
      const response = UrlFetchApp.fetch(`https://www.gebiz.gov.sg/rss/${feed.filename}`, { muteHttpExceptions: true });
      const code = response.getResponseCode();
      if (code === 404) { run.feedsUnavailable.push(feed.category); return; }
      if (code !== 200) throw new Error(`HTTP ${code}`);
      const body = response.getContentText();
      // Not a feed: GeBIZ does not publish this category. Report it, don't fail.
      if (!looksLikeFeed(body)) { run.feedsUnavailable.push(feed.category); return; }
      const doc = XmlService.parse(body);
      const channel = doc.getRootElement().getChild('channel');
      const items = channel ? channel.getChildren('item') : [];
      items.forEach(item => {
        const link = cleanText(item.getChildText('link'));
        const title = cleanText(item.getChildText('title'));
        if (!title) return;
        const details = parseGebizDescription(item.getChildText('description'));
        const refMatch = link.match(/[?&]code=([^&]+)/i);
        const row = {
          'Tender/Ref No.': refMatch ? decodeURIComponent(refMatch[1]) : '', Title: title,
          Agency: details.agency, 'Procurement Category': feed.category, Source: 'GeBIZ',
          'Scope Summary': '', 'Publish Date/Time': details.publish, 'Closing Date/Time': details.closing || 'Unknown',
          Status: 'Open', Link: link,
        };
        row['Procurement Category'] = normalizeCategory(row);
        row['Category Group'] = categoryGroup(row);
        row._bucket = routeBucket(row, feed.bucket);
        candidates.push(row);
      });
      run.feedCounts.push(`${feed.category} ${items.length}`);
    } catch (error) {
      if (!feed.confirmed) { run.feedsUnavailable.push(feed.category); return; }
      run.feedsFailed.push(`${feed.category}: ${briefError(error)}`);
    }
  });
  if (run.feedsFailed.length) {
    run.gebizStatus = `PARTIAL FAILURE — ${run.feedsFailed.join('; ')}`;
    run.errors.push(run.gebizStatus);
  } else if (!candidates.length) {
    run.gebizStatus = 'FAILED — no items returned by any feed';
    run.errors.push(run.gebizStatus);
  } else {
    run.gebizStatus = `OK — ${candidates.length} items from ${run.feedCounts.length} feeds`;
  }
  return candidates;
}

// Same rule as GeBIZ: every row in the handoff CSV is kept and routed.
function fetchTenderBoard(run, archiveFolder, now) {
  try {
    const statusResponse = UrlFetchApp.fetch(CONFIG.tbStatus, { muteHttpExceptions: true });
    if (statusResponse.getResponseCode() !== 200) throw new Error(`status HTTP ${statusResponse.getResponseCode()}`);
    const status = JSON.parse(statusResponse.getContentText());
    if (!status.success) throw new Error(status.error || 'crawler reported failure');
    const generated = new Date(status.generated_at_sgt);
    if (now - generated > 26 * 3600000) { run.tbStatus = 'NOT RUN — stale GitHub crawl'; return []; }
    const csvResponse = UrlFetchApp.fetch(CONFIG.tbCsv, { muteHttpExceptions: true });
    if (csvResponse.getResponseCode() !== 200) throw new Error(`CSV HTTP ${csvResponse.getResponseCode()}`);
    const csv = csvResponse.getContentText();
    const archiveName = `TenderBoard_Raw_${Utilities.formatDate(generated, CONFIG.timezone, 'yyyy-MM-dd_HHmm')}.csv`;
    const existing = archiveFolder.getFilesByName(archiveName);
    const archive = existing.hasNext() ? existing.next() : archiveFolder.createFile(Utilities.newBlob(csv, 'text/csv', archiveName));
    run.tbArchive = archive.getUrl();
    run.tbStatus = `OK — ${status.records} scanned from ${status.generated_at_sgt}`;
    return csvToObjects(csv, text => Utilities.parseCsv(text)).map(source => {
      const row = Object.assign({}, source, { Source: 'TenderBoard', Status: source.Status || 'Open' });
      if (!row.Title) return null;
      row['Procurement Category'] = normalizeCategory(row);
      row['Category Group'] = categoryGroup(row);
      row._bucket = routeBucket(row, 'EPU/CMP/10');
      if (!row['Closing Date/Time']) row['Closing Date/Time'] = 'Unknown';
      else row['Closing Date/Time'] = expandDayMonth(row['Closing Date/Time'], generated, 'closing');
      if (!row['Publish Date/Time']) row['Publish Date/Time'] = `${Utilities.formatDate(generated, CONFIG.timezone, 'dd MMM yyyy')} (first seen)`;
      else row['Publish Date/Time'] = expandDayMonth(row['Publish Date/Time'], generated, 'publish');
      if (!row.Agency) row.Agency = 'Not stated (TenderBoard)';
      return row;
    }).filter(Boolean);
  } catch (error) {
    run.tbStatus = `FAILED — ${error}`;
    run.errors.push(run.tbStatus);
    return [];
  }
}

// Optional CSV in the tracker folder for tenders the feeds cannot reach —
// GeBIZ RSS only carries about two days, so anything older than the last run
// is otherwise unrecoverable. Rows are deduplicated like any other candidate,
// so a manual row is harmless once the real feed catches up with it.
function fetchManual(run, folder) {
  const file = findByAnyName(folder, CONFIG.manualFileAliases);
  if (!file) return [];
  try {
    const rows = readTabularRows(file).map(source => {
      const row = Object.assign({}, source);
      if (!row.Title) return null;
      const bucketHint = cleanText(row.Bucket);
      delete row.Bucket;
      // Only the columns actually filled in are treated as authoritative, so a
      // default applied below can never overwrite better data on an existing row.
      row._fields = Object.keys(source).filter(key => key !== 'Bucket' && cleanText(source[key]));
      row.Source = row.Source || 'GeBIZ';
      row.Status = row.Status || 'Open';
      row.Agency = row.Agency || 'Not stated (manual)';
      row['Procurement Category'] = normalizeCategory(row);
      row['Category Group'] = categoryGroup(row);
      row['Closing Date/Time'] = row['Closing Date/Time'] || 'Unknown';
      row['Publish Date/Time'] = row['Publish Date/Time'] || 'Unknown';
      row._bucket = routeBucket(row, bucketHint || 'EPU/CMP/10');
      row._manual = true;
      return row;
    }).filter(Boolean);
    run.manualStatus = `OK — ${rows.length} row(s) read from ${CONFIG.manualFile}`;
    return rows;
  } catch (error) {
    run.manualStatus = `FAILED — ${error}`;
    run.errors.push(`${CONFIG.manualFile}: ${error}`);
    return [];
  }
}

// A data file in Drive can be a plain CSV or a Google Sheet: Drive converts on
// upload unless told not to, and opening a CSV in Sheets converts it as well.
// getBlob() on a Google Sheet returns a PDF export rather than the data, so the
// two cases have to be read differently or the rows come back as garbage.
function readTabularRows(file) {
  if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
    const sheet = SpreadsheetApp.openById(file.getId()).getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return [];
    return gridToObjects(sheet.getDataRange().getDisplayValues());
  }
  return csvToObjects(file.getBlob().getDataAsString(), text => Utilities.parseCsv(text));
}

// Read verdicts left in the folder by the external reviewer. Columns:
// Tender/Ref No., Title, Agency, Closing Date/Time, TECQ Review, Why, Reviewed On.
// Only Title and TECQ Review are strictly required; the rest improve matching.
function findByAnyName(folder, names) {
  for (let index = 0; index < names.length; index += 1) {
    const files = folder.getFilesByName(names[index]);
    if (files.hasNext()) return files.next();
  }
  return null;
}

function fetchExternalReviews(run, folder) {
  const file = findByAnyName(folder, CONFIG.reviewFileAliases);
  if (!file) { run.reviewFileStatus = `No ${CONFIG.reviewFile} in the folder.`; return {}; }
  try {
    const rows = readTabularRows(file)
      .filter(row => cleanText(row.Title) && normalizeReviewVerdict(row['TECQ Review']));
    run.reviewFileStatus = `OK — ${rows.length} verdict(s) read from ${CONFIG.reviewFile}`;
    return buildReviewIndex(rows.map(row => Object.assign({}, row, {
      'TECQ Review': normalizeReviewVerdict(row['TECQ Review']),
    })));
  } catch (error) {
    run.reviewFileStatus = `FAILED — ${briefError(error)}`;
    run.errors.push(`${CONFIG.reviewFile}: ${briefError(error)}`);
    return {};
  }
}

function loadState(ss) {
  return {
    active: readObjects(ss, 'EPU/CMP/10').map(r => (r._bucket = 'EPU/CMP/10', r))
      .concat(readObjects(ss, 'EPU/SER/34').map(r => (r._bucket = 'EPU/SER/34', r)))
      // Legacy tab from the previous schema: its rows are re-routed into the
      // two EPU tabs rather than discarded.
      .concat(readObjects(ss, 'Review (Unsure)').map(r => (r._bucket = '', r))),
    closed: readObjects(ss, 'Closed Tenders'),
    awards: readObjects(ss, 'Awarded (Intel)'),
    ledger: readObjects(ss, 'Run Ledger'),
  };
}

function migrateRows(state) {
  const restate = row => {
    row['Procurement Category'] = normalizeCategory(row);
    row['Category Group'] = categoryGroup(row);
    // Legacy schema: the old collector wrote a blanket "Advise to look at" tag
    // into TECQ Recommendation. Carry it over as a Possible — it was applied by
    // a keyword rule, not a judgment, so it must not arrive as a Look at.
    if (!hasReview(row) && /advise to look at/i.test(cleanText(row['TECQ Recommendation']))) {
      row['TECQ Review'] = REVIEW_POSSIBLE;
      row.Why = 'Migrated from the legacy TECQ Recommendation tag; not yet reviewed on its merits.';
      row['Reviewed On'] = '';
      row['Review Fingerprint'] = '';
    }
    delete row['TECQ Recommendation'];
    delete row['Why Unsure'];
  };
  state.active.forEach(row => { restate(row); row._bucket = routeBucket(row, row._bucket); });
  state.closed.forEach(restate);
  state.awards.forEach(restate);
}

function readObjects(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(h => h === 'GeBIZ Link' ? 'Link' : cleanText(h));
  const linkIndex = headers.indexOf('Link');
  const rich = linkIndex >= 0 ? sheet.getRange(2, linkIndex + 1, values.length - 1, 1).getRichTextValues() : [];
  return values.slice(1).map((row, rowIndex) => {
    const object = {};
    headers.forEach((header, index) => { if (header) object[header] = cleanText(row[index]); });
    if (!object.Source && object.Title) object.Source = 'GeBIZ';
    if (linkIndex >= 0 && rich[rowIndex] && rich[rowIndex][0]) object.Link = rich[rowIndex][0].getLinkUrl() || object.Link;
    return object;
  }).filter(r => r.Title || r.Date);
}

function mergeCandidates(state, candidates, run) {
  candidates.forEach(candidate => {
    let match = state.active.find(row => sameTender(row, candidate));
    if (!match) match = state.closed.find(row => sameTender(row, candidate));
    if (match) {
      // MANUAL_TENDERS doubles as the correction mechanism: edit a row there and
      // the fields you filled in overwrite the tracked row on the next run.
      if (candidate._manual && state.active.indexOf(match) >= 0) {
        let patched = false;
        (candidate._fields || []).forEach(field => {
          if (cleanText(match[field]) === cleanText(candidate[field])) return;
          match[field] = candidate[field];
          patched = true;
        });
        if (patched) {
          match['Procurement Category'] = normalizeCategory(match);
          match['Category Group'] = categoryGroup(match);
          match._bucket = routeBucket(match, candidate._bucket);
          run.manualPatched += 1;
        }
        return;
      }
      if (match.Source === 'TenderBoard' && candidate.Source === 'GeBIZ' && state.active.indexOf(match) >= 0) {
        // A GeBIZ upgrade replaces the collector's facts, never the review.
        const review = {};
        REVIEW_FIELDS.forEach(field => review[field] = match[field]);
        Object.assign(match, candidate);
        preserveReview(match, review);
        run.upgrades += 1;
      }
      return;
    }
    state.active.push(candidate);
    candidate._new = true;
    if (candidate._manual) run.newManual += 1;
    else if (candidate.Source === 'GeBIZ') run.newGebiz += 1;
    else run.newTb += 1;
  });
}

function moveClosed(state, now, run) {
  const stillOpen = [];
  state.active.forEach(row => {
    const closing = parseFlexibleDate(row['Closing Date/Time']);
    if (closing && closing < now) {
      const closed = Object.assign({}, row, { 'Move Date': Utilities.formatDate(now, CONFIG.timezone, 'dd MMM yyyy') });
      delete closed.Status; delete closed['Publish Date/Time']; delete closed._bucket;
      delete closed['Review Fingerprint'];
      delete closed._new; delete closed._manual;
      state.closed.push(closed); run.moved += 1;
    } else stillOpen.push(row);
  });
  state.active = stillOpen;
}

function captureAwards(state, run) {
  const awardedRefs = {};
  state.awards.forEach(r => awardedRefs[normalizeRef(r['Tender/Ref No.'])] = true);
  const properties = PropertiesService.getScriptProperties();
  const pending = state.closed.filter(row => row.Source === 'GeBIZ' && row.Link && !awardedRefs[normalizeRef(row['Tender/Ref No.'])] && properties.getProperty(`award:${normalizeRef(row['Tender/Ref No.'])}`) !== 'NO_AWARD');
  for (let offset = 0; offset < pending.length; offset += 50) {
    const batch = pending.slice(offset, offset + 50);
    const responses = UrlFetchApp.fetchAll(batch.map(row => ({ url: row.Link, muteHttpExceptions: true })));
    responses.forEach((response, index) => {
      if (response.getResponseCode() !== 200) return;
      const html = response.getContentText();
      const row = batch[index];
      const ref = normalizeRef(row['Tender/Ref No.']);
      if (/>(?:\s|&nbsp;)*NO AWARD(?:\s|&nbsp;)*</i.test(html)) { properties.setProperty(`award:${ref}`, 'NO_AWARD'); return; }
      if (!/>(?:\s|&nbsp;)*AWARDED(?:\s|&nbsp;)*</i.test(html)) return;
      state.awards.push({
        'Tender/Ref No.': row['Tender/Ref No.'], Title: row.Title, Agency: row.Agency,
        'Procurement Category': normalizeCategory(row), 'Category Group': categoryGroup(row), Source: 'GeBIZ',
        'Awarded To': extractLabelValue(html, 'Awarded To') || 'Not stated',
        'Award Value': extractLabelValue(html, 'Award Value') || 'Not stated',
        'Award Date': extractLabelValue(html, 'Award Date') || 'Not stated', Link: row.Link,
      });
      properties.setProperty(`award:${ref}`, 'AWARDED');
    });
  }
}

function extractLabelValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<span>${escaped}<\\/span>[\\s\\S]{0,500}?formOutputText_VALUE-DIV[^>]*>([^<]+)`, 'i'));
  return match ? cleanText(match[1].replace(/&amp;/g, '&')) : '';
}

function updateLedger(state, now, run) {
  const today = Utilities.formatDate(now, CONFIG.timezone, 'yyyy-MM-dd');
  const map = {};
  const order = [];
  const put = (key, value) => { if (!(key in map)) order.push(key); map[key] = value; };
  state.ledger.forEach(row => put(cleanText(row.Date), row));
  for (let date = new Date(`${CONFIG.ledgerStart}T00:00:00+08:00`); date <= now; date = new Date(date.getTime() + 86400000)) {
    const key = Utilities.formatDate(date, CONFIG.timezone, 'yyyy-MM-dd');
    if (!(key in map)) put(key, { Date: key, GeBIZ: 'NOT RUN', TenderBoard: 'NOT RUN', 'New (GeBIZ)': 0, 'New (TB)': 0, Notes: 'No prior ledger row.' });
  }
  const notes = [run.errors.join(' | ') || 'Completed.'];
  if (run.newManual) notes.push(`Manual backfill: ${run.newManual}`);
  put(today, { Date: today, GeBIZ: run.gebizStatus, TenderBoard: run.tbStatus, 'New (GeBIZ)': run.newGebiz, 'New (TB)': run.newTb, Notes: notes.join(' | ') });
  state.ledger = order.map(key => map[key]).sort((a, b) => cleanText(b.Date).localeCompare(cleanText(a.Date)));
}

function writeTracker(ss, state, run, cadence) {
  const cmp = state.active.filter(r => r._bucket === 'EPU/CMP/10').sort(sortPublishDesc);
  const ser = state.active.filter(r => r._bucket === 'EPU/SER/34').sort(sortPublishDesc);
  state.closed.sort((a, b) => cleanText(a['Closing Date/Time']).localeCompare(cleanText(b['Closing Date/Time'])));
  state.awards.sort((a, b) => cleanText(b['Award Date']).localeCompare(cleanText(a['Award Date'])));
  const shortlist = buildShortlist(cmp.concat(ser)).map(row => Object.assign({}, row, { 'EPU Tab': row._bucket }));
  run.shortlistCount = shortlist.length;
  writeTable(ss, 'TECQ Shortlist', SHORTLIST_HEADERS, shortlist,
    'Nothing shortlisted. Rows appear here once the Wednesday/Friday review marks them Look at or Possible.');
  writeTable(ss, 'EPU/CMP/10', OPEN_HEADERS, cmp);
  writeTable(ss, 'EPU/SER/34', OPEN_HEADERS, ser);
  writeTable(ss, 'Closed Tenders', CLOSED_HEADERS, state.closed);
  writeTable(ss, 'Awarded (Intel)', AWARD_HEADERS, state.awards, 'No awarded-tender data captured yet — see Coverage & Method.');
  writeTable(ss, 'Run Ledger', LEDGER_HEADERS, state.ledger);
  const coverage = [
    `Run Date: ${Utilities.formatDate(new Date(), CONFIG.timezone, 'dd MMM yyyy, h:mm a')} SGT | Auth Status: PASS | Cadence: ${cadence.directive}`,
    `GeBIZ RSS: ${run.gebizStatus}`,
    `GeBIZ feeds scanned (${run.feedCounts.length}): ${run.feedCounts.join('; ') || 'none'}`,
    `GeBIZ names probed that are not published as feeds: ${run.feedsUnavailable.length} (${run.feedsUnavailable.slice(0, 12).join('; ') || 'none'})`,
    `GeBIZ feeds discovered from index (${run.feedsDiscovered.length}): ${run.feedsDiscovered.join(' ') || 'none'}`,
    `TenderBoard: ${run.tbStatus}`,
    `TenderBoard Archive: ${run.tbArchive || 'NOT CREATED'}`,
    `Manual backfill (${CONFIG.manualFile}): ${run.manualStatus} | new this run ${run.newManual} | existing rows corrected ${run.manualPatched}`,
    `EPU/CMP/10: total ${cmp.length}, new GeBIZ ${run.newGebiz}, new TB ${run.newTb}, new manual ${run.newManual}`,
    `EPU/SER/34: total ${ser.length}`,
    `Category Groups (filter on this column): ${summariseGroups(cmp.concat(ser))}`,
    `Closed Tenders: total ${state.closed.length}, moved this run ${run.moved}`,
    `Awarded (Intel): total ${state.awards.length}, permanent and uncapped`,
    `Excluded This Run: 0 — relevance and exclusion filtering are disabled; every item returned by an in-scope GeBIZ feed, the TenderBoard handoff and ${CONFIG.manualFile} is kept in EPU/CMP/10 or EPU/SER/34`,
    `Source Upgrades This Run: ${run.upgrades}`,
    `Notes: ${run.notes.join(' | ') || 'none'}`,
    `Tracker (permanent): ${ss.getUrl()}`,
    `Last collection: ${scriptProperty('lastCollectionAt') || 'never'} | Last review: ${scriptProperty('lastReviewAt') || 'never'}`,
    `Review: ${scriptProperty('lastReviewStatus') || 'handled outside Apps Script'}`,
    `External verdicts (${CONFIG.reviewFile}): ${run.reviewFileStatus} | applied to ${run.reviewsApplied} row(s) this run`,
    `Reviewed: ${countReviews(cmp.concat(ser))} of ${cmp.length + ser.length} open rows | awaiting review ${cmp.concat(ser).filter(needsReview).length} | reviews carried across this refresh ${run.reviewsRestored}`,
    `TECQ Shortlist: ${run.shortlistCount} open row(s) marked ${REVIEW_LOOK} or ${REVIEW_POSSIBLE}`,
    `Friday snapshot: ${scriptProperty('lastSnapshot') || 'none yet'}`,
    `Update: permanent sheet updated in place; verified ${TAB_NAMES.length} tabs and row counts`,
    `Errors: ${run.errors.join(' | ') || 'None'}`,
  ];
  writeTable(ss, 'Coverage & Method', ['Coverage & Method'], coverage.map(text => ({ 'Coverage & Method': text })));
  const allowed = {};
  TAB_NAMES.forEach(name => allowed[name] = true);
  ss.getSheets().forEach(sheet => { if (!allowed[sheet.getName()]) ss.deleteSheet(sheet); });
}

// Counts per Category Group, largest first, for the Coverage tab.
function summariseGroups(rows) {
  const counts = {};
  rows.forEach(row => {
    const group = cleanText(row['Category Group']) || 'Not Specified';
    counts[group] = (counts[group] || 0) + 1;
  });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])
    .map(group => `${group} ${counts[group]}`).join('; ') || 'none';
}

function scriptProperty(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}

function countReviews(rows) {
  return rows.filter(hasReview).length;
}

// Latest collection time, for the cadence gate now that dated copies are gone.
function findLatestCollectionTime() {
  const stamp = scriptProperty('lastCollectionAt');
  if (!stamp) return null;
  const parsed = new Date(stamp);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function sortPublishDesc(a, b) {
  const ad = parseFlexibleDate(a['Publish Date/Time']);
  const bd = parseFlexibleDate(b['Publish Date/Time']);
  if (ad && bd && ad.getTime() !== bd.getTime()) return bd - ad;
  if (ad && !bd) return -1;
  if (!ad && bd) return 1;
  return cleanText(b['Publish Date/Time']).localeCompare(cleanText(a['Publish Date/Time']));
}

function writeTable(ss, name, headers, rows, emptyMessage) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clear();
  const data = [headers].concat(rows.length ? rows.map(row => headers.map(header => cleanText(row[header]))) : emptyMessage ? [[emptyMessage].concat(Array(headers.length - 1).fill(''))] : []);
  sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  sheet.setFrozenRows(1);
  sheet.getDataRange().setFontFamily('Arial').setFontSize(11).setWrap(true).setBorder(true,true,true,true,true,true);
  sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#d9d9d9');
  const sourceCol = headers.indexOf('Source') + 1;
  const reviewCol = headers.indexOf('TECQ Review') + 1;
  const linkCol = headers.indexOf('Link') + 1;
  rows.forEach((row, index) => {
    const sheetRow = index + 2;
    if (sourceCol) sheet.getRange(sheetRow, sourceCol).setBackground(row.Source === 'TenderBoard' ? '#fff2cc' : '#ddebf7');
    if (reviewCol) {
      const verdict = cleanText(row['TECQ Review']);
      if (verdict === REVIEW_LOOK) sheet.getRange(sheetRow, reviewCol).setBackground('#c6efce').setFontWeight('bold');
      else if (verdict === REVIEW_POSSIBLE) sheet.getRange(sheetRow, reviewCol).setBackground('#ffeb9c');
      else if (verdict === REVIEW_NOT) sheet.getRange(sheetRow, reviewCol).setBackground('#f2f2f2').setFontColor('#808080');
    }
    if (linkCol && row.Link) {
      const label = row.Source === 'TenderBoard' ? 'Open in TenderBoard' : 'Open in GeBIZ';
      sheet.getRange(sheetRow, linkCol).setFormula(`=HYPERLINK("${String(row.Link).replace(/"/g, '""')}","${label}")`);
    }
  });
  sheet.autoResizeColumns(1, headers.length);
  const scopeCol = headers.indexOf('Scope Summary') + 1;
  if (scopeCol) sheet.setColumnWidth(scopeCol, 420);
  const whyCol = headers.indexOf('Why') + 1;
  if (whyCol) sheet.setColumnWidth(whyCol, 380);
  const fingerprintCol = headers.indexOf('Review Fingerprint') + 1;
  if (fingerprintCol) sheet.hideColumns(fingerprintCol);
}

function verifyTracker(ss, state) {
  const actual = ss.getSheets().map(s => s.getName());
  TAB_NAMES.forEach(name => { if (actual.indexOf(name) < 0) throw new Error(`Verification failed: missing ${name}`); });
  if (ss.getSheetByName('Closed Tenders').getLastRow() !== state.closed.length + 1) throw new Error('Verification failed: Closed row count mismatch');
  if (ss.getSheetByName('Awarded (Intel)').getLastRow() !== Math.max(2, state.awards.length + 1)) throw new Error('Verification failed: Awarded row count mismatch');
  const open = ss.getSheetByName('EPU/CMP/10').getLastRow() - 1 + ss.getSheetByName('EPU/SER/34').getLastRow() - 1;
  if (open !== state.active.length) throw new Error(`Verification failed: ${state.active.length} open tenders held but ${open} written — a tender would have been dropped`);
  const held = state.active.filter(hasReview).length;
  const written = readObjects(ss, 'EPU/CMP/10').concat(readObjects(ss, 'EPU/SER/34')).filter(hasReview).length;
  if (written !== held) throw new Error(`Verification failed: ${held} reviewed rows held but ${written} written — a review would have been lost`);
}

function buildSummary(file, state, run) {
  const newRows = state.active.filter(r => r._new).slice(0,3);
  const newTotal = run.newGebiz + run.newTb + run.newManual;
  return [
    `${newTotal ? newTotal + ' new tenders' : 'NO New Tenders'}`,
    `GeBIZ new: ${run.newGebiz} | TenderBoard new: ${run.newTb} | Manual backfill new: ${run.newManual}`,
    `Open totals: EPU/CMP/10 ${state.active.filter(r => r._bucket === 'EPU/CMP/10').length} | EPU/SER/34 ${state.active.filter(r => r._bucket === 'EPU/SER/34').length}`,
    `Moved closed: ${run.moved} | Awarded retained: ${state.awards.length}`,
    `Shortlist: ${run.shortlistCount} | reviews carried across: ${run.reviewsRestored} | external verdicts applied: ${run.reviewsApplied}`,
    `GeBIZ: ${run.gebizStatus}`,
    `GeBIZ feeds unavailable: ${run.feedsUnavailable.join('; ') || 'none'}`,
    `TenderBoard archive: ${run.tbArchive || 'not created'}`,
    `Tracker: ${file.getUrl()}`,
    run.errors.length ? `Errors: ${run.errors.join(' | ')}` : 'Errors: None',
  ].concat(newRows.map(r => `• ${r.Title} — ${r['Tender/Ref No.']} — ${r.Agency} [${r.Source}]`)).join('\n');
}
