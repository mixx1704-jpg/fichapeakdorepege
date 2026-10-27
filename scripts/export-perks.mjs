import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({root,configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});
try {
 const {perks:items}=await vite.ssrLoadModule('/app/data.ts');
 const {kakujaPerks}=await vite.ssrLoadModule('/app/kakuja-perks.ts');
 const lines=['# Catálogo de Perks','',`${items.length+kakujaPerks.length} perks: ${items.length} de personagem/equipamento e ${kakujaPerks.length} de Kakuja.`,'','Resultados decimais são arredondados para baixo. As exclusivas de atributo do LEVEL 20 exigem atributo 15+. Cada perk informa seu custo, requisitos e resolução.',''];
 const categories=[...new Set(items.map(item=>item.category))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 for(const category of categories){
  lines.push(`## ${category}`,'');
  for(const item of items.filter(item=>item.category===category).sort((a,b)=>(a.minGrade||1)-(b.minGrade||1)||a.name.localeCompare(b.name,'pt-BR'))){
   lines.push(`### ${item.name}`,'',`LEVEL ${item.minGrade||1} · ${Array.isArray(item.cost)?item.cost.join('/'):item.cost} PE · ${item.requirement||'Sem requisito adicional'}`,'',item.description,'');
  }
 }
 lines.push('## Kakuja','');
 for(const item of [...kakujaPerks].sort((a,b)=>a.grade-b.grade||a.category.localeCompare(b.category,'pt-BR')||a.name.localeCompare(b.name,'pt-BR')))
  lines.push(`### ${item.name}`,'',`LEVEL ${item.grade} · ${item.cost} ${item.currency||'PE'} · ${item.requirement}`,'',item.usage,'',item.effect,'');
 const destination=process.argv[2];if(!destination)throw new Error('Informe o destino do catálogo.');
 await writeFile(path.resolve(destination),lines.join('\n'));
 console.log(`${items.length+kakujaPerks.length} perks exportadas (${items.length} personagem/equipamento, ${kakujaPerks.length} Kakuja).`);
}finally{await vite.close();}
