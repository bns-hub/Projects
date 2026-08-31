// Routing keywords for the EPU/SER/34 (professional services) bucket.
// Everything that does not match routes to EPU/CMP/10. Nothing is ever dropped.
const SER_PATTERN = /(professional services|consultan|consulting|advisory|\badvisor\b|\bpmo\b)/i;

// Categories worth auto-adopting when a GeBIZ RSS feed is discovered that is not
// already in CONFIG.feeds. Keeps the flow from silently missing a new category.
const DISCOVER_PATTERN = /(\bit\b|information technology|software|licence|license|comput|server|notebook|desktop|telecom|digital|\bdata\b|network|professional services|consultan)/i;

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

// Top-level procurement group shown in the "Category Group" column.
// Handles "GeBIZ: X", "TenderBoard: A: B", "A => B" and legacy "A ⇒ B".
function categoryGroup(row) {
  const raw = cleanText(row['Procurement Category'] || row.category)
    .replace(/^(?:GeBIZ|TenderBoard)\s*:\s*/i, '');
  if (!raw) return 'Not Specified';
  return cleanText(raw.split(/\s*(?:⇒|=>|:)\s*/)[0]) || 'Not Specified';
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

// Pull every "<Category>-CREATE_BO_FEED.xml" name out of a GeBIZ RSS index page.
function extractFeedNames(html) {
  const matches = String(html || '').match(/[A-Za-z0-9_%.'()+,&-]+-CREATE_BO_FEED\.xml/g) || [];
  return Array.from(new Set(matches));
}

// A discovered feed is adopted only when its category looks in-scope, so
// index discovery cannot silently pull the whole of GeBIZ into the tracker.
function isDiscoverableFeed(category) {
  return DISCOVER_PATTERN.test(cleanText(category));
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
