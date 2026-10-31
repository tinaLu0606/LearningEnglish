// Syntax-check every app module as an ES module: node scripts/check.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../app/js/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.js')) files.push(p);
  }
})(root);

let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(f) });
  if (r.status !== 0) { bad++; console.log('✗', f.slice(root.length), '\n', r.stderr.toString().split('\n').slice(0, 4).join('\n')); }
}
console.log(bad ? `${bad} file(s) failed` : `${files.length} files OK`);
process.exit(bad ? 1 : 0);
