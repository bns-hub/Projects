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

// Header row plus data rows to objects. Shared by the CSV and Google Sheets
// readers, so a data file behaves the same whichever form it is stored in.
function gridToObjects(grid) {
  if (!grid || !grid.length) return [];
  const headers = grid[0].map(cleanText);
  return grid.slice(1).filter(row => row.some(cell => cleanText(cell))).map(row => {
    const object = {};
    headers.forEach((header, index) => { if (header) object[header] = cleanText(row[index]); });
    return object;
  });
}

function csvToObjects(csvText, parser) {
  return gridToObjects(parser(csvText));
}

// ---------------------------------------------------------------------------
// Reviewer-owned state
//
// The collector owns tender facts. These four columns belong to the reviewer
// and must survive every collector refresh — see preserveReview/applyReviewIndex.
// ---------------------------------------------------------------------------

const REVIEW_FIELDS = ['TECQ Review', 'Why', 'Reviewed On', 'Review Fingerprint'];
const REVIEW_LOOK = 'Look at';
const REVIEW_POSSIBLE = 'Possible';
const REVIEW_NOT = 'Not relevant';
const REVIEW_VALUES = [REVIEW_LOOK, REVIEW_POSSIBLE, REVIEW_NOT];

// Accepts the model's wording loosely, but only ever stores one of the three
// canonical values. Anything unrecognised is treated as unreviewed.
function normalizeReviewVerdict(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return '';
  if (/^look/.test(text)) return REVIEW_LOOK;
  if (/^possible|^maybe|^unsure/.test(text)) return REVIEW_POSSIBLE;
  if (/^not relevant|^not_relevant|^no\b|^irrelevant/.test(text)) return REVIEW_NOT;
  return '';
}

// Stable non-cryptographic hash. Only needs to change when the facts change.
function stableHash(text) {
  let hash = 5381;
  const string = String(text);
  for (let index = 0; index < string.length; index += 1) {
    hash = ((hash * 33) ^ string.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

// The facts a reviewer's judgment actually depends on. If none of these change,
// the row does not need re-reviewing; if any changes, the old verdict is stale.
function reviewFingerprint(row) {
  return stableHash([
    normalizeRef(row['Tender/Ref No.']),
    normalizeTitle(row.Title),
    cleanText(row.Agency).toUpperCase(),
    cleanText(row['Procurement Category']).toUpperCase(),
    cleanText(row['Category Group']).toUpperCase(),
    cleanText(row.Source).toUpperCase(),
    normalizeTitle(row['Scope Summary']),
    cleanText(row['Closing Date/Time']).toUpperCase(),
  ].join('|'));
}

// Keys a review can be carried across on: the normalized reference first, then
// normalized title paired with agency or closing date when no reference exists.
function reviewKeys(row) {
  const keys = [];
  const ref = normalizeRef(row['Tender/Ref No.']);
  if (ref) keys.push(`ref:${ref}`);
  const title = normalizeTitle(row.Title);
  if (title) {
    const agency = cleanText(row.Agency).toUpperCase();
    const closing = cleanText(row['Closing Date/Time']).toUpperCase();
    if (agency) keys.push(`ta:${title}|${agency}`);
    if (closing) keys.push(`tc:${title}|${closing}`);
  }
  return keys;
}

function hasReview(row) {
  return REVIEW_VALUES.indexOf(cleanText(row['TECQ Review'])) >= 0;
}

// Index every stored review so a refreshed or re-created row inherits it.
function buildReviewIndex(rows) {
  const index = {};
  (rows || []).forEach(row => {
    if (!hasReview(row)) return;
    const review = {};
    REVIEW_FIELDS.forEach(field => review[field] = cleanText(row[field]));
    reviewKeys(row).forEach(key => { if (!index[key]) index[key] = review; });
  });
  return index;
}

function applyReviewIndex(index, rows) {
  let restored = 0;
  (rows || []).forEach(row => {
    if (hasReview(row)) return;
    const key = reviewKeys(row).find(candidate => index[candidate]);
    if (!key) return;
    REVIEW_FIELDS.forEach(field => row[field] = index[key][field]);
    restored += 1;
  });
  return restored;
}

// Copy reviewer-owned fields onto a row the collector is about to overwrite.
function preserveReview(target, source) {
  REVIEW_FIELDS.forEach(field => {
    const value = cleanText(source[field]);
    if (value) target[field] = value;
  });
  return target;
}

// A row needs review when it has never been reviewed, or when the facts behind
// the stored verdict have since changed.
function needsReview(row) {
  if (!hasReview(row)) return true;
  return cleanText(row['Review Fingerprint']) !== reviewFingerprint(row);
}

// Reviews produced outside Apps Script arrive as a CSV and fill in blanks only.
// A row that already carries a verdict is left exactly as it is — a judgment
// already recorded, or corrected by hand, is never overwritten by a later run.
// The fingerprint is stamped on the rows it does fill, so they are not requeued.
function applyExternalReviews(index, rows) {
  let applied = 0;
  (rows || []).forEach(row => {
    if (hasReview(row)) return;
    const key = reviewKeys(row).find(candidate => index[candidate]);
    if (!key) return;
    const verdict = normalizeReviewVerdict(index[key]['TECQ Review']);
    if (!verdict) return;
    row['TECQ Review'] = verdict;
    row.Why = cleanText(index[key].Why);
    row['Reviewed On'] = cleanText(index[key]['Reviewed On']);
    row['Review Fingerprint'] = reviewFingerprint(row);
    applied += 1;
  });
  return applied;
}

// The shortlist is a view over the open rows, never a second source of truth.
function buildShortlist(rows) {
  return (rows || [])
    .filter(row => {
      const verdict = cleanText(row['TECQ Review']);
      return verdict === REVIEW_LOOK || verdict === REVIEW_POSSIBLE;
    })
    .sort((a, b) => {
      const rank = row => cleanText(row['TECQ Review']) === REVIEW_LOOK ? 0 : 1;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      const ad = parseFlexibleDate(a['Closing Date/Time']);
      const bd = parseFlexibleDate(b['Closing Date/Time']);
      if (ad && bd && ad.getTime() !== bd.getTime()) return ad - bd;
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return cleanText(a.Title).localeCompare(cleanText(b.Title));
    });
}

// ---------------------------------------------------------------------------
// Semantic review
//
// The verdict is a judgment about what is actually being bought, so it is made
// by a model, not by keyword matching here. These helpers build the request and
// parse the reply; the HTTP call lives in Code.gs.
// ---------------------------------------------------------------------------

const REVIEW_SYSTEM_PROMPT = [
  'You screen Singapore public-sector tender listings for TOPPAN Ecquaria (TECQ), a Singapore',
  'digital-government systems integrator, and decide which ones a sales lead should spend time on.',
  '',
  'TECQ delivers: custom application and portal development, legacy modernisation, system',
  'integration and APIs, workflow / case management / registry / licensing systems, application',
  'maintenance and support (AMS), GCC and cloud migration, data reporting and analytics, document',
  'management, mobile and field apps, Singpass and digital identity integration, AI / GenAI /',
  'agentic / RAG / process automation, and digital-government consultancy or implementation PMO.',
  'Their stack is the KAIZEN low-code platform, Java/Spring, ReactJS, microservices, containers,',
  'on GCC/AWS/Azure. Their record is Singapore government: courts, licensing, registries, customs,',
  'healthcare licensing, environment.',
  '',
  'Known gaps, which should pull a verdict down rather than up: no proven OT/SCADA or industrial',
  'plant integration; no established workplace-safety or permit-to-work delivery record; heavily',
  'domain-specific work may need a partner.',
  '',
  'Assign exactly one verdict per tender:',
  '- "Look at": strong fit for the capabilities listed above.',
  '- "Possible": plausible adjacent ICT work, or the listing has too little detail to judge, or the',
  '  scope is partner-dependent, or it is generic digital/AI consultancy, or it is managed',
  '  infrastructure that may carry application scope.',
  '- "Not relevant": construction or facilities work, industrial machinery, electrical or plant,',
  '  AV and PA systems, catering, cleaning, events, training-only, non-ICT consultancy, parking or',
  '  property leases, or pure hardware supply with no integration or software scope.',
  '',
  'Judge the primary deliverable being purchased. The presence of a word such as "system",',
  '"development", "licence", "platform", "maintenance", "digital" or "automation" is never on its',
  'own sufficient — a race timing system, a card access system and an air-conditioning system are',
  'all "Not relevant". Equally, a thin listing for something plainly ICT is "Possible", not',
  '"Not relevant": absence of detail is uncertainty, not disqualification.',
  '',
  'TenderBoard listings often carry only a title, agency and category. When the evidence is that',
  'thin, use "Possible" rather than guessing.',
  '',
  'For "why", give one sentence naming the concrete evidence you used — the deliverable, the',
  'category, or the specific missing information. Never restate the verdict as its own reason.',
  '',
  'Reply with a JSON array and nothing else. One object per tender, in the order given, each with',
  'exactly the keys "id" (the integer given), "verdict" (one of Look at, Possible, Not relevant),',
  'and "why" (one sentence, at most 200 characters).',
].join('\n');

// Accessor so the prompt can be asserted on from tests without duplicating it.
function reviewSystemPrompt() {
  return REVIEW_SYSTEM_PROMPT;
}

function buildReviewPrompt(rows) {
  const lines = ['Review these tenders:', ''];
  rows.forEach((row, index) => {
    lines.push(`[${index + 1}]`);
    lines.push(`Title: ${cleanText(row.Title) || '(none)'}`);
    lines.push(`Agency: ${cleanText(row.Agency) || '(not stated)'}`);
    lines.push(`Procurement Category: ${cleanText(row['Procurement Category']) || '(not stated)'}`);
    lines.push(`Category Group: ${cleanText(row['Category Group']) || '(not stated)'}`);
    lines.push(`Source: ${cleanText(row.Source) || '(unknown)'}`);
    lines.push(`Reference: ${cleanText(row['Tender/Ref No.']) || '(none)'}`);
    lines.push(`Closing: ${cleanText(row['Closing Date/Time']) || 'Unknown'}`);
    const scope = cleanText(row['Scope Summary']);
    lines.push(`Scope: ${scope ? scope.slice(0, 1200) : '(no scope text available — listing data only)'}`);
    lines.push('');
  });
  return lines.join('\n');
}

// The model is asked for a bare JSON array; tolerate it being wrapped in prose
// or a fenced block, but never invent a verdict that was not returned.
function parseReviewResponse(text, expectedCount) {
  const raw = String(text == null ? '' : text);
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('no JSON array in model response');
  const parsed = JSON.parse(body.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('model response was not an array');
  const results = {};
  parsed.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    const id = Number(entry.id);
    if (!(id >= 1 && id <= expectedCount)) return;
    const verdict = normalizeReviewVerdict(entry.verdict);
    if (!verdict) return;
    results[id] = { verdict, why: cleanText(entry.why).slice(0, 300) };
  });
  return results;
}
