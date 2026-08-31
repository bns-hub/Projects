// Run this one by hand to do a full fetch/merge/publish cycle now.
// It is deliberately first in the file: the Apps Script editor preselects the
// first function in the picker, and running a helper by accident is a no-op.
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

const OPEN_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Scope Summary','Publish Date/Time','Closing Date/Time','Status','Link'];
const CLOSED_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Scope Summary','Closing Date/Time','Move Date','Link'];
const AWARD_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Category Group','Source','Awarded To','Award Value','Award Date','Link'];
const LEDGER_HEADERS = ['Date','GeBIZ','TenderBoard','New (GeBIZ)','New (TB)','Notes'];
const TAB_NAMES = ['EPU/CMP/10','EPU/SER/34','Closed Tenders','Awarded (Intel)','Run Ledger','Coverage & Method'];

function setupCloudTask() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'runDailyTracker').forEach(t => ScriptApp.deleteTrigger(t));
  CONFIG.runHours.forEach(hour => {
    ScriptApp.newTrigger('runDailyTracker').timeBased().atHour(hour).nearMinute(0).everyDays(1).inTimezone(CONFIG.timezone).create();
  });
  return `Cloud triggers installed for approximately ${CONFIG.runHours.join(':00 and ')}:00 SGT.`;
}

function runDailyTracker(forceRun) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Skipped: another run is active.';
  const run = {
    errors: [], newGebiz: 0, newTb: 0, newManual: 0, manualPatched: 0, moved: 0, upgrades: 0,
    tbArchive: '', tbStatus: '', gebizStatus: 'OK', manualStatus: 'No MANUAL_TENDERS file.',
    feedCounts: [], feedsUnavailable: [], feedsFailed: [], feedsDiscovered: [],
  };
  try {
    const now = new Date();
    const trackerFolder = DriveApp.getFolderById(CONFIG.trackerFolderId);
    const archiveFolder = DriveApp.getFolderById(CONFIG.archiveFolderId);
    const latest = findLatestTracker(trackerFolder);
    const cadence = readCadence(trackerFolder, now, latest && latest.getDateCreated());
    if (!forceRun && !cadence.run) return `Skipped by cadence: ${cadence.directive}`;

    const state = loadState(latest ? SpreadsheetApp.openById(latest.getId()) : SpreadsheetApp.openById(CONFIG.seedId));
    migrateRows(state);
    const gebiz = fetchGebiz(run);
    const tb = fetchTenderBoard(run, archiveFolder, now);
    const manual = fetchManual(run, trackerFolder);
    mergeCandidates(state, gebiz.concat(tb).concat(manual), run);
    moveClosed(state, now, run);
    captureAwards(state, run);
    updateLedger(state, now, run);

    const stamp = Utilities.formatDate(now, CONFIG.timezone, 'yyyy-MM-dd_HHmm');
    const sourceFile = latest || DriveApp.getFileById(CONFIG.seedId);
    const outputFile = sourceFile.makeCopy(`${stamp}_GeBIZ_Open_Tenders`, trackerFolder);
    const output = SpreadsheetApp.openById(outputFile.getId());
    writeTracker(output, state, run, cadence, sourceFile);
    SpreadsheetApp.flush();
    verifyTracker(output, state);

    const summary = buildSummary(outputFile, state, run);
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

function findLatestTracker(folder) {
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  let latest = null;
  while (files.hasNext()) {
    const file = files.next();
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
  const files = folder.getFilesByName(CONFIG.manualFile);
  if (!files.hasNext()) return [];
  try {
    const rows = csvToObjects(files.next().getBlob().getDataAsString(), text => Utilities.parseCsv(text)).map(source => {
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
        Object.assign(match, candidate); run.upgrades += 1;
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

function writeTracker(ss, state, run, cadence, previousFile) {
  const cmp = state.active.filter(r => r._bucket === 'EPU/CMP/10').sort(sortPublishDesc);
  const ser = state.active.filter(r => r._bucket === 'EPU/SER/34').sort(sortPublishDesc);
  state.closed.sort((a, b) => cleanText(a['Closing Date/Time']).localeCompare(cleanText(b['Closing Date/Time'])));
  state.awards.sort((a, b) => cleanText(b['Award Date']).localeCompare(cleanText(a['Award Date'])));
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
    `Previous File: ${previousFile.getUrl()}`,
    `Upload: native Google Sheets copy/update; verified ${TAB_NAMES.length} tabs and row counts; no base64 ceiling`,
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
  const linkCol = headers.indexOf('Link') + 1;
  rows.forEach((row, index) => {
    const sheetRow = index + 2;
    if (sourceCol) sheet.getRange(sheetRow, sourceCol).setBackground(row.Source === 'TenderBoard' ? '#fff2cc' : '#ddebf7');
    if (linkCol && row.Link) {
      const label = row.Source === 'TenderBoard' ? 'Open in TenderBoard' : 'Open in GeBIZ';
      sheet.getRange(sheetRow, linkCol).setFormula(`=HYPERLINK("${String(row.Link).replace(/"/g, '""')}","${label}")`);
    }
  });
  sheet.autoResizeColumns(1, headers.length);
  const scopeCol = headers.indexOf('Scope Summary') + 1;
  if (scopeCol) sheet.setColumnWidth(scopeCol, 420);
}

function verifyTracker(ss, state) {
  const actual = ss.getSheets().map(s => s.getName());
  TAB_NAMES.forEach(name => { if (actual.indexOf(name) < 0) throw new Error(`Verification failed: missing ${name}`); });
  if (ss.getSheetByName('Closed Tenders').getLastRow() !== state.closed.length + 1) throw new Error('Verification failed: Closed row count mismatch');
  if (ss.getSheetByName('Awarded (Intel)').getLastRow() !== Math.max(2, state.awards.length + 1)) throw new Error('Verification failed: Awarded row count mismatch');
  const open = ss.getSheetByName('EPU/CMP/10').getLastRow() - 1 + ss.getSheetByName('EPU/SER/34').getLastRow() - 1;
  if (open !== state.active.length) throw new Error(`Verification failed: ${state.active.length} open tenders held but ${open} written — a tender would have been dropped`);
}

function buildSummary(file, state, run) {
  const newRows = state.active.filter(r => r._new).slice(0,3);
  const newTotal = run.newGebiz + run.newTb + run.newManual;
  return [
    `${newTotal ? newTotal + ' new tenders' : 'NO New Tenders'}`,
    `GeBIZ new: ${run.newGebiz} | TenderBoard new: ${run.newTb} | Manual backfill new: ${run.newManual}`,
    `Open totals: EPU/CMP/10 ${state.active.filter(r => r._bucket === 'EPU/CMP/10').length} | EPU/SER/34 ${state.active.filter(r => r._bucket === 'EPU/SER/34').length}`,
    `Moved closed: ${run.moved} | Awarded retained: ${state.awards.length}`,
    `GeBIZ: ${run.gebizStatus}`,
    `GeBIZ feeds unavailable: ${run.feedsUnavailable.join('; ') || 'none'}`,
    `TenderBoard archive: ${run.tbArchive || 'not created'}`,
    `Tracker: ${file.getUrl()}`,
    run.errors.length ? `Errors: ${run.errors.join(' | ')}` : 'Errors: None',
  ].concat(newRows.map(r => `• ${r.Title} — ${r['Tender/Ref No.']} — ${r.Agency} [${r.Source}]`)).join('\n');
}

// Routing keywords for the EPU/SER/34 (professional services) bucket.
// Everything that does not match routes to EPU/CMP/10. Nothing is ever dropped.
const SER_PATTERN = /(professional services|consultan|consulting|advisory|\badvisor\b|\bpmo\b)/i;

function cleanText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function normalizeRef(value) {
  return cleanText(value).toUpperCase().split(/[|,;\/]/)[0].replace(/[^A-Z0-9]/g, '');
}

function normalizeTitle(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseGebizDescription(description) {
  const text = cleanText(description);
  const take = (label) => {
    const match = text.match(new RegExp(label + '\\s*:\\s*([^|]+)', 'i'));
    return match ? cleanText(match[1]) : '';
  };
  return {
    publish: take('Published Date'),
    closing: take('Closing Date'),
    agency: take('Calling Entity'),
  };
}

// GeBIZ names a feed after the sub-category alone, so a row whose category is
// just "Servers" still has to resolve to the IT&Telecommunication group — this
// is what makes the Category Group column filterable across both sources.
const SUBCATEGORY_GROUPS = {
  'it services & software development': 'IT&Telecommunication',
  'softwares & licences': 'IT&Telecommunication',
  'software & licences': 'IT&Telecommunication',
  'desktop computers': 'IT&Telecommunication',
  'computer accessories': 'IT&Telecommunication',
  'notebooks': 'IT&Telecommunication',
  'servers': 'IT&Telecommunication',
  'telecommunication': 'IT&Telecommunication',
  'professional services': 'Services',
};

// Split any category string into its top-level group and sub-category.
// Accepts "GeBIZ: X", "TenderBoard: A: B", "A: B", "A => B" and legacy "A ⇒ B".
function splitCategory(row) {
  const raw = cleanText(row['Procurement Category'] || row.category)
    .replace(/^(?:GeBIZ|TenderBoard)\s*:\s*/i, '');
  if (!raw) return { group: 'Not Specified', sub: '' };
  const parts = raw.split(/\s*(?:⇒|=>|:)\s*/).map(cleanText).filter(Boolean);
  if (parts.length > 1) return { group: parts[0], sub: parts.slice(1).join(' ⇒ ') };
  const mapped = SUBCATEGORY_GROUPS[parts[0].toLowerCase()];
  return mapped ? { group: mapped, sub: parts[0] } : { group: parts[0], sub: '' };
}

// Top-level procurement group shown in the "Category Group" column. Always the
// group, never the sub-category, whichever source the row came from.
function categoryGroup(row) {
  return splitCategory(row).group || 'Not Specified';
}

// One spelling for the "Procurement Category" column: "Group ⇒ Sub-category".
function normalizeCategory(row) {
  const parts = splitCategory(row);
  if (!parts.sub) return parts.group;
  return `${parts.group} ⇒ ${parts.sub}`;
}

// Every captured tender lands in one of the two EPU tabs. There is no
// relevance filter and no exclusion list: a tender in scope is never dropped.
function routeBucket(row, fallbackBucket) {
  const category = cleanText(row['Procurement Category'] || row.category);
  if (SER_PATTERN.test(category) || SER_PATTERN.test(categoryGroup(row))) return 'EPU/SER/34';
  if (fallbackBucket === 'EPU/SER/34' || fallbackBucket === 'EPU/CMP/10') return fallbackBucket;
  return 'EPU/CMP/10';
}

function sameTender(a, b) {
  const ar = normalizeRef(a['Tender/Ref No.']);
  const br = normalizeRef(b['Tender/Ref No.']);
  if (ar && br && ar === br) return true;
  if (!normalizeTitle(a.Title) || normalizeTitle(a.Title) !== normalizeTitle(b.Title)) return false;
  const agencyMatch = cleanText(a.Agency).toUpperCase() === cleanText(b.Agency).toUpperCase();
  const closeMatch = cleanText(a['Closing Date/Time']) === cleanText(b['Closing Date/Time']);
  return agencyMatch || closeMatch;
}

function parseCadence(text, now, latestTrackerDate) {
  const line = String(text || '').split(/\r?\n/).map(s => s.trim())
    .find(s => s && !s.startsWith('#')) || 'daily';
  const directive = line.toLowerCase();
  if (directive === 'daily') return { run: true, directive };
  if (directive === 'paused') return { run: false, directive };
  if (directive.startsWith('days:')) {
    const days = directive.slice(5).split(',').map(s => s.trim());
    const current = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    return { run: days.includes(current), directive };
  }
  const interval = directive.match(/^interval:(\d+)$/);
  if (interval) {
    const age = latestTrackerDate ? Math.floor((now - latestTrackerDate) / 86400000) : Number.MAX_SAFE_INTEGER;
    return { run: age >= Number(interval[1]), directive };
  }
  return { run: true, directive: `${directive} (invalid; treated as daily)` };
}

function parseFlexibleDate(value) {
  const text = cleanText(value);
  if (!text || /^unknown$/i.test(text)) return null;
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 23), Number(match[5] || 59), Number(match[6] || 0));
  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:[, ]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (match) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    let hour = Number(match[4] || 23);
    if (/pm/i.test(match[6] || '') && hour < 12) hour += 12;
    if (/am/i.test(match[6] || '') && hour === 12) hour = 0;
    return new Date(Number(match[3]), months.indexOf(match[2].toLowerCase()), Number(match[1]), hour, Number(match[5] || 59));
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function expandDayMonth(value, referenceDate, kind) {
  const text = cleanText(value);
  const match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})(.*)$/);
  if (!match || /\b\d{4}\b/.test(text)) return text;
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const month = months.indexOf(match[2].toLowerCase());
  if (month < 0) return text;
  let year = referenceDate.getFullYear();
  let candidate = new Date(year, month, Number(match[1]));
  if (kind === 'publish' && candidate - referenceDate > 2 * 86400000) year -= 1;
  if (kind === 'closing' && referenceDate - candidate > 30 * 86400000) year += 1;
  return `${String(match[1]).padStart(2, '0')} ${match[2]} ${year}${match[3] || ''}`.trim();
}

// GeBIZ answers an unknown feed name with HTTP 200 and its XHTML error page,
// not a 404. That page opens with an XML prolog, so testing the first tag is
// not enough — require an actual feed root element and reject any HTML.
function looksLikeFeed(text) {
  const head = String(text || '').slice(0, 2000);
  if (/<html[\s>]/i.test(head)) return false;
  return /<(?:rss|feed|rdf:RDF)[\s>]/i.test(head);
}

// Keep one failure from filling a ledger cell with a stack trace.
function briefError(error) {
  return cleanText(String(error)).slice(0, 140);
}

// Pull every "<Category>-CREATE_BO_FEED.xml" name out of a GeBIZ RSS index page.
function extractFeedNames(html) {
  const matches = String(html || '').match(/[A-Za-z0-9_%.'()+,&-]+-CREATE_BO_FEED\.xml/g) || [];
  return Array.from(new Set(matches));
}

function feedCategoryName(filename) {
  let name = String(filename || '').replace(/-CREATE_BO_FEED\.xml$/i, '');
  try { name = decodeURIComponent(name); } catch (_) {}
  return cleanText(name.replace(/_/g, ' '));
}

function csvToObjects(csvText, parser) {
  const grid = parser(csvText);
  if (!grid.length) return [];
  const headers = grid[0].map(cleanText);
  return grid.slice(1).filter(row => row.some(cell => cleanText(cell))).map(row => {
    const object = {};
    headers.forEach((header, index) => object[header] = cleanText(row[index]));
    return object;
  });
}
