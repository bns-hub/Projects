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
