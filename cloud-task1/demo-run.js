// Walks the whole sequence — collect, review, shortlist, refresh — through the
// real bundle in the fake Apps Script environment, printing the sheet at each
// step. The Anthropic call is stubbed with a recorded-shape response so the run
// is deterministic and costs nothing; every other line of code is the real one.
const { createEnvironment } = require('./fake-apps-script.js');

const rule = label => console.log(`\n${'='.repeat(72)}\n${label}\n${'='.repeat(72)}`);
const show = (env, ss, tab, cols) => {
  const rows = env.readObjects(ss, tab);
  console.log(`\n[${tab}] ${rows.length} row(s)`);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] || '').slice(0, 34).length)));
  console.log('  ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | '));
  console.log('  ' + widths.map(w => '-'.repeat(w)).join('-+-'));
  rows.forEach(r => console.log('  ' + cols.map((c, i) => String(r[c] || '').slice(0, 34).padEnd(widths[i])).join(' | ')));
  return rows;
};

// A response in the exact shape the Messages API returns.
const claudeReply = verdicts => ({
  code: 200,
  body: JSON.stringify({
    id: 'msg_demo', type: 'message', role: 'assistant', model: 'claude-opus-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(verdicts) }],
    usage: { input_tokens: 1200, output_tokens: 180 },
  }),
});

let anthropicCalls = 0;
const env = createEnvironment({
  properties: { ANTHROPIC_API_KEY: 'sk-ant-demo-not-a-real-key', trackerFileId: 'demo-tracker' },
  fetch: (url, params) => {
    if (url.indexOf('api.anthropic.com') >= 0) {
      anthropicCalls += 1;
      const payload = JSON.parse(params.payload);
      console.log(`\n  -> POST ${url}`);
      console.log(`     model=${payload.model} max_tokens=${payload.max_tokens} fallbacks=${JSON.stringify(payload.fallbacks)}`);
      console.log(`     headers: anthropic-version=${params.headers['anthropic-version']}, anthropic-beta=${params.headers['anthropic-beta']}`);
      console.log(`     system prompt: ${payload.system.length} chars; user message: ${payload.messages[0].content.length} chars`);
      return claudeReply([
        { id: 1, verdict: 'Look at', why: 'Buys a licensing case-management system — core KAIZEN workflow/registry work.' },
        { id: 2, verdict: 'Not relevant', why: 'Primary deliverable is chilled-water plant replacement, not software.' },
        { id: 3, verdict: 'Possible', why: 'TenderBoard listing gives only a title and category; ICT-adjacent but unevidenced.' },
      ]);
    }
    return { code: 404, body: '' };
  },
});

const ss = env.SpreadsheetApp.openById('demo-tracker');
const row = over => Object.assign({
  Agency: 'Some Agency', 'Category Group': 'IT&Telecommunication', Source: 'GeBIZ',
  'Publish Date/Time': '28/08/2026', Status: 'Open', Link: '',
}, over);

rule('STEP 1 — collection has written open tenders, none reviewed yet');
env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), [
  row({ 'Tender/Ref No.': 'AAA000ETT26000001', Title: 'Provision of a licensing and case management system',
        'Procurement Category': 'IT&Telecommunication ⇒ IT Services & Software Development', 'Closing Date/Time': '30/09/2026 16:00:00' }),
  row({ 'Tender/Ref No.': 'BBB000ETT26000002', Title: 'Replacement of chilled water plant and cooling towers',
        'Procurement Category': 'Facilities Management ⇒ Building, M&E Maintenance', 'Category Group': 'Facilities Management',
        'Closing Date/Time': '15/09/2026 16:00:00' }),
  row({ 'Tender/Ref No.': '', Title: 'Board meeting management software', Source: 'TenderBoard', Agency: 'A Club',
        'Procurement Category': 'IT&Telecommunication ⇒ Softwares & Licences', 'Closing Date/Time': '20/09/2026 16:00:00' }),
]);
env.writeTable(ss, 'EPU/SER/34', env.openHeaders(), []);
show(env, ss, 'EPU/CMP/10', ['Title', 'TECQ Review', 'Why']);

rule('STEP 2 — the Wednesday/Friday reviewer runs headlessly');
console.log(env.runWeeklyReview(true));
show(env, ss, 'EPU/CMP/10', ['Title', 'TECQ Review', 'Why']);

rule('STEP 3 — filter TECQ Review on the EPU tabs for the shortlist view');
console.log('(TECQ Shortlist tab removed — filter TECQ Review = Look at / Possible on EPU/CMP/10 and EPU/SER/34 instead)');

rule('STEP 4 — a second collector refresh rebuilds every row from source');
const before = env.readObjects(ss, 'EPU/CMP/10');
const state = { active: before.map(r => Object.assign({}, r, { _bucket: 'EPU/CMP/10' })), closed: [], awards: [], ledger: [] };
env.migrateRows(state);
const index = env.buildReviewIndex(state.active);
// The collector re-derives the facts and carries no reviewer fields at all.
const rebuilt = before.map(r => {
  const fresh = Object.assign({}, r, { _bucket: 'EPU/CMP/10' });
  env.reviewFields().forEach(field => delete fresh[field]);
  return fresh;
});
console.log(`\n  collector handed back ${rebuilt.length} rows carrying ${rebuilt.filter(env.hasReview).length} reviews`);
const restored = env.applyReviewIndex(index, rebuilt);
console.log(`  applyReviewIndex re-attached ${restored} review(s)`);
env.writeTable(ss, 'EPU/CMP/10', env.openHeaders(), rebuilt);
show(env, ss, 'EPU/CMP/10', ['Title', 'TECQ Review', 'Why']);

rule('STEP 5 — the reviewer runs again and finds nothing to re-judge');
console.log(env.runWeeklyReview(true));
console.log(`\nAnthropic API calls made across both review runs: ${anthropicCalls}`);
console.log('(the second run made none — every fingerprint still matched)');
