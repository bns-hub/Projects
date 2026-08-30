const TECQ_TAG = 'Advise to look at';

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

function classifyTender(row) {
  const title = cleanText(row.Title || row.title);
  const category = cleanText(row['Procurement Category'] || row.category);
  const scope = cleanText(row['Scope Summary'] || row.scope);
  const titleScope = `${title} ${scope}`.toLowerCase();
  const text = `${titleScope} ${category}`.toLowerCase();

  const systemSignals = /(software|application|app\b|system|platform|portal|digital|cloud|hosting|data|analytics|dashboard|workflow|case management|registry|licen[cs]|permit|integration|api\b|microservice|moderni[sz]|maintenance|support services|managed application|document management|content management|singpass|digital identity|artificial intelligence|\bai\b|agentic|automation|low.code|enterprise architecture|consultancy|consulting|pmo|roadmap|transformation|development|implementation)/i;
  const explicitSystem = systemSignals.test(titleScope);
  const strongBuildSignal = /(develop|implement|integrat|moderni[sz]|application|portal|workflow|case management|registry|licen[cs]ing system)/i.test(titleScope);

  const exclusions = [
    { number: 1, re: /(penetration test|vulnerability assessment|soc service|siem|ddos|cyber ?security|threat intelligence|security operations)/i },
    { number: 2, re: /(audio visual|audiovisual|av system|video wall|public address system)/i },
    { number: 3, re: /(network switch|router|wireless access point|structured cabling|internet service|5g service|network hardware)/i },
    { number: 4, re: /(training course|workshop|learning camp|e.learning content|trainer|coaching service)/i },
    { number: 5, re: /(medical equipment|laboratory equipment|industrial machine|printer|photocopier|furniture|vehicle|plant equipment|disposal of equipment)/i },
    { number: 6, re: /(catering|cleaning service|uniform|construction work|renovation work|landscaping|security guard|event management|travel service|legal service|audit service|recruitment service)/i },
  ];

  for (const exclusion of exclusions) {
    if (exclusion.re.test(title) && !strongBuildSignal) {
      return { relevant: false, review: false, exclusion: exclusion.number, recommendation: '' };
    }
  }

  const softwareCategory = /(it services|software development|software)/i.test(category);
  const professionalCategory = /professional services/i.test(category);
  const hardwareCategory = /(desktop|notebook|server|computer accessories|hardware)/i.test(category);
  if (explicitSystem || (softwareCategory && !hardwareCategory)) {
    return { relevant: true, review: false, exclusion: 0, recommendation: TECQ_TAG };
  }
  if (softwareCategory || professionalCategory || hardwareCategory || !category) {
    return { relevant: true, review: true, exclusion: 0, recommendation: TECQ_TAG };
  }
  return { relevant: false, review: false, exclusion: 0, recommendation: '' };
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

const CONFIG = Object.freeze({
  trackerFolderId: '1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g',
  archiveFolderId: '1TPg44swiYi14FD3rciZx-WNCsFE8Qyve',
  seedId: '11SjaVYtuZRbD0DQOe3a_UKn8r7jLqPDuKe4hQnVA8S8',
  tbCsv: 'https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_latest.csv',
  tbStatus: 'https://raw.githubusercontent.com/bns-hub/Projects/tenderboard-data/data/TenderBoard_Raw_status.json',
  notifyEmail: 'bnsn4ull@gmail.com',
  timezone: 'Asia/Singapore',
  ledgerStart: '2026-08-07',
  feeds: [
    ['IT Services & Software Development', 'EPU/CMP/10', 'IT_Services_%26_Software_Development-CREATE_BO_FEED.xml'],
    ['Desktop Computers', 'EPU/CMP/10', 'Desktop_Computers-CREATE_BO_FEED.xml'],
    ['Computer Accessories', 'EPU/CMP/10', 'Computer_Accessories-CREATE_BO_FEED.xml'],
    ['Notebooks', 'EPU/CMP/10', 'Notebooks-CREATE_BO_FEED.xml'],
    ['Servers', 'EPU/CMP/10', 'Servers-CREATE_BO_FEED.xml'],
    ['Professional Services', 'EPU/SER/34', 'Professional_Services-CREATE_BO_FEED.xml'],
  ],
});

const OPEN_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Source','Scope Summary','Publish Date/Time','Closing Date/Time','Status','TECQ Recommendation','Link'];
const CLOSED_HEADERS = ['Tender/Ref No.','Title','Agency','Procurement Category','Source','Scope Summary','Closing Date/Time','Move Date','TECQ Recommendation','Link'];
const REVIEW_HEADERS = OPEN_HEADERS.slice(0, -1).concat(['Why Unsure','Link']);
const AWARD_HEADERS = ['Tender/Ref No.','Title','Agency','Source','Awarded To','Award Value','Award Date','Link'];
const LEDGER_HEADERS = ['Date','GeBIZ','TenderBoard','New (GeBIZ)','New (TB)','Notes'];

function setupCloudTask() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'runDailyTracker').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('runDailyTracker').timeBased().atHour(11).nearMinute(0).everyDays(1).inTimezone(CONFIG.timezone).create();
  return 'Daily cloud trigger installed for approximately 11:00 AM SGT.';
}

function runTestNow() {
  return runDailyTracker(true);
}

function runDailyTracker(forceRun) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Skipped: another run is active.';
  const run = { errors: [], exclusions: [], newGebiz: 0, newTb: 0, moved: 0, upgrades: 0, tbArchive: '', tbStatus: '', gebizStatus: 'OK' };
  try {
    const now = new Date();
    const trackerFolder = DriveApp.getFolderById(CONFIG.trackerFolderId);
    const archiveFolder = DriveApp.getFolderById(CONFIG.archiveFolderId);
    const latest = findLatestTracker(trackerFolder);
    const cadence = readCadence(trackerFolder, now, latest && latest.getDateCreated());
    if (!forceRun && !cadence.run) return `Skipped by cadence: ${cadence.directive}`;

    const state = loadState(latest ? SpreadsheetApp.openById(latest.getId()) : SpreadsheetApp.openById(CONFIG.seedId));
    tagExistingRows(state);
    const gebiz = fetchGebiz(run);
    const tb = fetchTenderBoard(run, archiveFolder, now);
    mergeCandidates(state, gebiz.concat(tb), run);
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
    MailApp.sendEmail(CONFIG.notifyEmail, `GeBIZ/TB: ${run.newGebiz + run.newTb ? run.newGebiz + run.newTb + ' New Tenders' : 'NO New Tenders'}`, summary);
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

function fetchGebiz(run) {
  const candidates = [];
  CONFIG.feeds.forEach(([category, bucket, filename]) => {
    try {
      const response = UrlFetchApp.fetch(`https://www.gebiz.gov.sg/rss/${filename}`, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) throw new Error(`HTTP ${response.getResponseCode()}`);
      const doc = XmlService.parse(response.getContentText());
      const channel = doc.getRootElement().getChild('channel');
      (channel ? channel.getChildren('item') : []).forEach(item => {
        const link = cleanText(item.getChildText('link'));
        const title = cleanText(item.getChildText('title'));
        const details = parseGebizDescription(item.getChildText('description'));
        const refMatch = link.match(/[?&]code=([^&]+)/i);
        const row = {
          'Tender/Ref No.': refMatch ? decodeURIComponent(refMatch[1]) : '', Title: title,
          Agency: details.agency, 'Procurement Category': `GeBIZ: ${category}`, Source: 'GeBIZ',
          'Scope Summary': '', 'Publish Date/Time': details.publish, 'Closing Date/Time': details.closing || 'Unknown',
          Status: 'Open', 'TECQ Recommendation': '', Link: link, _bucket: bucket,
        };
        const decision = classifyTender(row);
        if (!decision.relevant) {
          if (decision.exclusion) run.exclusions.push(`${title} (rule ${decision.exclusion})`);
          return;
        }
        row['TECQ Recommendation'] = decision.recommendation;
        if (decision.review) { row._bucket = 'Review (Unsure)'; row['Why Unsure'] = 'Insufficient detail in feed; plausible TECQ fit.'; }
        candidates.push(row);
      });
    } catch (error) {
      run.gebizStatus = `PARTIAL FAILURE — ${filename}: ${error}`;
      run.errors.push(run.gebizStatus);
    }
  });
  return candidates;
}

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
      const row = Object.assign({}, source, { Source: 'TenderBoard', Status: source.Status || 'Open', _bucket: /consult|advis|pmo|professional/i.test(source['Procurement Category']) ? 'EPU/SER/34' : 'EPU/CMP/10' });
      const decision = classifyTender(row);
      if (!decision.relevant) {
        if (decision.exclusion) run.exclusions.push(`${row.Title} (rule ${decision.exclusion})`);
        return null;
      }
      row['TECQ Recommendation'] = decision.recommendation;
      if (decision.review) { row._bucket = 'Review (Unsure)'; row['Why Unsure'] = 'TenderBoard listing is incomplete; plausible TECQ fit.'; }
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

function loadState(ss) {
  return {
    active: readObjects(ss, 'EPU/CMP/10').map(r => (r._bucket = 'EPU/CMP/10', r))
      .concat(readObjects(ss, 'EPU/SER/34').map(r => (r._bucket = 'EPU/SER/34', r)))
      .concat(readObjects(ss, 'Review (Unsure)').map(r => (r._bucket = 'Review (Unsure)', r))),
    closed: readObjects(ss, 'Closed Tenders'),
    awards: readObjects(ss, 'Awarded (Intel)'),
    ledger: readObjects(ss, 'Run Ledger'),
  };
}

function tagExistingRows(state) {
  state.active.forEach(row => {
    if (row._bucket === 'EPU/CMP/10' || row._bucket === 'EPU/SER/34') row['TECQ Recommendation'] = TECQ_TAG;
    else if (classifyTender(row).relevant) row['TECQ Recommendation'] = TECQ_TAG;
  });
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
      if (match.Source === 'TenderBoard' && candidate.Source === 'GeBIZ' && state.active.includes(match)) {
        Object.assign(match, candidate); run.upgrades += 1;
      }
      return;
    }
    state.active.push(candidate);
    candidate._new = true;
    if (candidate.Source === 'GeBIZ') run.newGebiz += 1; else run.newTb += 1;
  });
}

function moveClosed(state, now, run) {
  const stillOpen = [];
  state.active.forEach(row => {
    const closing = parseFlexibleDate(row['Closing Date/Time']);
    if (closing && closing < now) {
      const closed = Object.assign({}, row, { 'Move Date': Utilities.formatDate(now, CONFIG.timezone, 'dd MMM yyyy') });
      delete closed.Status; delete closed['Publish Date/Time']; delete closed._bucket;
      if (row._bucket === 'Review (Unsure)') closed.Title = `${closed.Title} (was: Review)`;
      state.closed.push(closed); run.moved += 1;
    } else stillOpen.push(row);
  });
  state.active = stillOpen;
}

function captureAwards(state, run) {
  const awardedRefs = new Set(state.awards.map(r => normalizeRef(r['Tender/Ref No.'])));
  const properties = PropertiesService.getScriptProperties();
  const pending = state.closed.filter(row => row.Source === 'GeBIZ' && row.Link && !awardedRefs.has(normalizeRef(row['Tender/Ref No.'])) && properties.getProperty(`award:${normalizeRef(row['Tender/Ref No.'])}`) !== 'NO_AWARD');
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
        'Tender/Ref No.': row['Tender/Ref No.'], Title: row.Title, Agency: row.Agency, Source: 'GeBIZ',
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
  const map = new Map(state.ledger.map(row => [cleanText(row.Date), row]));
  for (let date = new Date(`${CONFIG.ledgerStart}T00:00:00+08:00`); date <= now; date = new Date(date.getTime() + 86400000)) {
    const key = Utilities.formatDate(date, CONFIG.timezone, 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, { Date: key, GeBIZ: 'NOT RUN', TenderBoard: 'NOT RUN', 'New (GeBIZ)': 0, 'New (TB)': 0, Notes: 'No prior ledger row.' });
  }
  map.set(today, { Date: today, GeBIZ: run.gebizStatus, TenderBoard: run.tbStatus, 'New (GeBIZ)': run.newGebiz, 'New (TB)': run.newTb, Notes: run.errors.join(' | ') || 'Completed.' });
  state.ledger = Array.from(map.values()).sort((a, b) => cleanText(b.Date).localeCompare(cleanText(a.Date)));
}

function writeTracker(ss, state, run, cadence, previousFile) {
  const cmp = state.active.filter(r => r._bucket === 'EPU/CMP/10').sort(sortPublishDesc);
  const ser = state.active.filter(r => r._bucket === 'EPU/SER/34').sort(sortPublishDesc);
  const review = state.active.filter(r => r._bucket === 'Review (Unsure)').sort(sortPublishDesc);
  state.closed.sort((a, b) => cleanText(a['Closing Date/Time']).localeCompare(cleanText(b['Closing Date/Time'])));
  state.awards.sort((a, b) => cleanText(b['Award Date']).localeCompare(cleanText(a['Award Date'])));
  writeTable(ss, 'EPU/CMP/10', OPEN_HEADERS, cmp);
  writeTable(ss, 'EPU/SER/34', OPEN_HEADERS, ser);
  writeTable(ss, 'Closed Tenders', CLOSED_HEADERS, state.closed);
  writeTable(ss, 'Review (Unsure)', REVIEW_HEADERS, review, 'Nothing uncertain this run.');
  writeTable(ss, 'Awarded (Intel)', AWARD_HEADERS, state.awards, 'No awarded-tender data captured yet — see Coverage & Method.');
  writeTable(ss, 'Run Ledger', LEDGER_HEADERS, state.ledger);
  const tagged = state.active.filter(r => r['TECQ Recommendation'] === TECQ_TAG);
  const coverage = [
    `Run Date: ${Utilities.formatDate(new Date(), CONFIG.timezone, 'dd MMM yyyy, h:mm a')} SGT | Auth Status: PASS | Cadence: ${cadence.directive}`,
    `GeBIZ RSS: ${run.gebizStatus}`,
    `TenderBoard: ${run.tbStatus}`,
    `TenderBoard Archive: ${run.tbArchive || 'NOT CREATED'}`,
    `EPU/CMP/10: total ${cmp.length}, new GeBIZ ${run.newGebiz}, new TB ${run.newTb}`,
    `EPU/SER/34: total ${ser.length}`,
    `Closed Tenders: total ${state.closed.length}, moved this run ${run.moved}`,
    `Review (Unsure): total ${review.length}`,
    `Awarded (Intel): total ${state.awards.length}, permanent and uncapped`,
    `TECQ Recommendation: ${tagged.length} open tenders tagged ${TECQ_TAG} (GeBIZ ${tagged.filter(r => r.Source === 'GeBIZ').length} | TB ${tagged.filter(r => r.Source === 'TenderBoard').length})`,
    `Excluded This Run: ${run.exclusions.length} ${run.exclusions.slice(0,25).join('; ')}`,
    `Source Upgrades This Run: ${run.upgrades}`,
    `Previous File: ${previousFile.getUrl()}`,
    `Upload: native Google Sheets copy/update; verified 7 tabs and row counts; no base64 ceiling`,
    `Errors: ${run.errors.join(' | ') || 'None'}`,
  ];
  writeTable(ss, 'Coverage & Method', ['Coverage & Method'], coverage.map(text => ({ 'Coverage & Method': text })));
  const allowed = new Set(['EPU/CMP/10','EPU/SER/34','Closed Tenders','Review (Unsure)','Awarded (Intel)','Run Ledger','Coverage & Method']);
  ss.getSheets().forEach(sheet => { if (!allowed.has(sheet.getName())) ss.deleteSheet(sheet); });
}

function sortPublishDesc(a, b) { return cleanText(b['Publish Date/Time']).localeCompare(cleanText(a['Publish Date/Time'])); }

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
  const recCol = headers.indexOf('TECQ Recommendation') + 1;
  const linkCol = headers.indexOf('Link') + 1;
  rows.forEach((row, index) => {
    const sheetRow = index + 2;
    if (sourceCol) sheet.getRange(sheetRow, sourceCol).setBackground(row.Source === 'TenderBoard' ? '#fff2cc' : '#ddebf7');
    if (recCol && row['TECQ Recommendation'] === TECQ_TAG) sheet.getRange(sheetRow, recCol).setBackground('#e2f0d9');
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
  const expected = ['EPU/CMP/10','EPU/SER/34','Closed Tenders','Review (Unsure)','Awarded (Intel)','Run Ledger','Coverage & Method'];
  const actual = ss.getSheets().map(s => s.getName());
  expected.forEach(name => { if (!actual.includes(name)) throw new Error(`Verification failed: missing ${name}`); });
  if (ss.getSheetByName('Closed Tenders').getLastRow() !== state.closed.length + 1) throw new Error('Verification failed: Closed row count mismatch');
  if (ss.getSheetByName('Awarded (Intel)').getLastRow() !== Math.max(2, state.awards.length + 1)) throw new Error('Verification failed: Awarded row count mismatch');
}

function buildSummary(file, state, run) {
  const newRows = state.active.filter(r => r._new).slice(0,3);
  return [
    `${run.newGebiz + run.newTb ? run.newGebiz + run.newTb + ' new tenders' : 'NO New Tenders'}`,
    `GeBIZ new: ${run.newGebiz} | TenderBoard new: ${run.newTb}`,
    `Moved closed: ${run.moved} | Awarded retained: ${state.awards.length}`,
    `Advise to look at: ${state.active.filter(r => r['TECQ Recommendation'] === TECQ_TAG).length}`,
    `TenderBoard archive: ${run.tbArchive || 'not created'}`,
    `Tracker: ${file.getUrl()}`,
    run.errors.length ? `Errors: ${run.errors.join(' | ')}` : 'Errors: None',
  ].concat(newRows.map(r => `• ${r.Title} — ${r['Tender/Ref No.']} — ${r.Agency} [${r.Source}]`)).join('\n');
}
