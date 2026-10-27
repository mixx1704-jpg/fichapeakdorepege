import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = createHash('sha256');
async function include(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) await include(relative);
    else if (entry.name !== 'release.json' && entry.name !== 'system-version.json') {
      hash.update(relative.replaceAll('\\', '/'));
      hash.update((await readFile(path.join(root, relative))).toString('utf8').replaceAll('\r\n','\n'));
    }
  }
}
await include('app');
hash.update((await readFile(path.join(root,'package.json'),'utf8')).replaceAll('\r\n','\n'));
const release = `3.0.0-${hash.digest('hex').slice(0,12)}`;
const payload = JSON.stringify({ release, rulesVersion: 8 }) + '\n';
for (const file of ['app/release.json','public/system-version.json']) {
  if (await readFile(path.join(root,file),'utf8').catch(() => '') !== payload) await writeFile(path.join(root,file), payload);
}
