import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
// Code.gs is emitted first so runTestNow is the first function in the
// bundle, which is what the Apps Script editor preselects in its run picker.
const core = await readFile(new URL('Core.gs', root), 'utf8');
const code = await readFile(new URL('Code.gs', root), 'utf8');
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/Code.gs', root), `${code.trim()}\n\n${core.trim()}\n`, 'utf8');
console.log('Built cloud-task1/dist/Code.gs');
