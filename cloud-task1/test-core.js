const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/Core.gs', 'utf8'), context);

assert.equal(context.normalizeRef('ABC-123 / secondary'), 'ABC123');
assert.equal(context.normalizeTitle('Case-management portal!'), 'CASEMANAGEMENTPORTAL');

const description = context.parseGebizDescription('ITT: X | Published Date: 28/08/2026 | Closing Date: 22/09/2026 16:00:00 | Calling Entity: Central Provident Fund Board |');
assert.equal(description.agency, 'Central Provident Fund Board');
assert.equal(description.closing, '22/09/2026 16:00:00');

const fit = context.classifyTender({ Title: 'Development and maintenance of digital licensing portal', 'Procurement Category': 'IT Services & Software Development' });
assert.equal(fit.relevant, true);
assert.equal(fit.recommendation, 'Advise to look at');

const cyber = context.classifyTender({ Title: 'Provision of DDoS protection service', 'Procurement Category': 'IT Services & Software Development' });
assert.equal(cyber.relevant, false);
assert.equal(cyber.exclusion, 1);

const catering = context.classifyTender({ Title: 'Provision of catering services', 'Procurement Category': 'Professional Services' });
assert.equal(catering.relevant, false);
assert.equal(catering.exclusion, 6);

assert.equal(context.sameTender(
  { 'Tender/Ref No.': 'ABC-123', Title: 'A', Agency: 'X' },
  { 'Tender/Ref No.': 'ABC123', Title: 'Different', Agency: 'Y' }
), true);

assert.equal(context.parseCadence('days:tue,thu', new Date('2026-09-01T10:00:00+08:00'), null).run, true);
assert.equal(context.parseCadence('paused', new Date(), null).run, false);
assert.equal(context.expandDayMonth('03 Sep', new Date('2026-08-30T10:00:00+08:00'), 'closing'), '03 Sep 2026');
assert.equal(context.expandDayMonth('30 Dec', new Date('2026-01-02T10:00:00+08:00'), 'publish'), '30 Dec 2025');
assert.equal(context.csvToObjects('A,B\n1,2\n', text => text.trim().split(/\n/).map(line => line.split(','))).length, 1);

console.log('Core tests passed');
