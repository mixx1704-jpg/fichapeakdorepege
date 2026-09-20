import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = path.join(root, 'dist-portable');
let html = await readFile(path.join(build, 'portable.html'), 'utf8');
for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]) {
  const script = await readFile(path.join(build, match[1]), 'utf8');
  html = html.replace(match[0], () => `<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(path.join(build, match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
if (/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\//.test(html)) {
  throw new Error('The standalone HTML still references external build assets.');
}
await mkdir(path.join(root, 'outputs'), { recursive: true });
await writeFile(path.join(root, 'outputs', 'Ficha-Tokyo-Ghoul.html'), html);
console.log('outputs/Ficha-Tokyo-Ghoul.html');
