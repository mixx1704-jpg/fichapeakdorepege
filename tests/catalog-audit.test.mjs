import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts');
const rules=await vite.ssrLoadModule('/app/character.ts');
const {kakujaPerks}=await vite.ssrLoadModule('/app/kakuja-perks.ts');
const {kakujaModules}=await vite.ssrLoadModule('/app/kakuja-data.ts');
test('todos os itens dos catálogos mantêm IDs, nomes, descrições e custos válidos',()=>{
 for(const items of [data.perks,data.kaguneEffects,data.evolutions,kakujaPerks,kakujaModules]){
 assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 for(const item of items){assert.ok(item.name,item.id);assert.ok(item.description||item.effect,item.id);for(const n of [item.cost,item.cb].flat().filter(x=>x!==undefined))assert.ok(Number.isFinite(n)&&n>=0,item.id);}
 }
});
test('compras de cada efeito, evolução e perk são calculáveis e cobradas sem NaN',()=>{
 for(const [kind,items] of [['perks',data.perks],['effects',data.kaguneEffects],['selectedEvolutions',data.evolutions]])for(const item of items){
 const s=rules.normalizeCharacter({species:'ghoul',grade:14,weaponKind:'kagune',kaguneType:['Ukaku','Koukaku','Rinkaku','Bikaku'].includes(item.family)?item.family:'Rinkaku',kaguneActive:true,baseAttributes:{forca:8,vigor:8,agilidade:8,precisao:8},[kind]:kind==='selectedEvolutions'?[item.id]:{[item.id]:{rank:1,target:'forca'}}},7);
 const d=rules.calculateCharacter(s);
 for(const key of ['peSpent','maxLife','maxRC','rd','kaguneDurability','kaguneSteps','kaguneDamageModifier'])assert.ok(Number.isFinite(d[key]),`${item.id}: ${key}`);
 assert.ok(d[kind==='perks'?'catalogPerksPE':kind==='effects'?'actualEffectPE':'evolutionPE']>0,item.id);
 }
});
