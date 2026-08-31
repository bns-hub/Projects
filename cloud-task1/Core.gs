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
