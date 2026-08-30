import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const core = await readFile(new URL('Core.gs', root), 'utf8');
const code = await readFile(new URL('Code.gs', root), 'utf8');
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/Code.gs', root), `${core.trim()}\n\n${code.trim()}\n`, 'utf8');
console.log('Built cloud-task1/dist/Code.gs');
