import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const destination=process.argv[2];
if(!destination)throw new Error('Informe o destino do arquivo JSON.');
const catalog=await readFile(new URL('../app/perks.json',import.meta.url),'utf8');
await writeFile(path.resolve(destination),catalog);
console.log('Catálogo completo exportado em JSON.');
