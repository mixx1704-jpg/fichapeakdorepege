import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts');
const {perkCatalog}=await vite.ssrLoadModule('/app/perk-catalog.ts');
const rules=await vite.ssrLoadModule('/app/character.ts');
const kp=await vite.ssrLoadModule('/app/kakuja-perks.ts');
const tactical=await vite.ssrLoadModule('/app/tactical.ts');
const effect={id:'test-effect',type:'damage-steps',operation:'add',value:3,scope:'both',attribute:'forca'};
const entry={id:'autoral-test',name:'Teste de catálogo',category:'Genérica',cost:5,minGrade:1,maxRank:1,supplement:true,description:'Teste',automation:{custom:{activation:'passive',effects:[effect]}}};
const sheet=(patch={})=>rules.normalizeCharacter({id:'saved-test',species:'ghoul',grade:8,weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,baseAttributes:{forca:6,vigor:6,precisao:6,agilidade:6,raciocinio:6,percepcao:6,presenca:6,controle:6},...patch},8);
function withPerk(p,fn){data.perks.push(p);try{return fn();}finally{data.perks.pop();}}
test('one JSON supplies all runtime catalogs without renaming saved IDs',async()=>{
 assert.equal(data.perks,perkCatalog.perks);assert.equal(kp.kakujaPerks,perkCatalog.kakujaPerks);
 assert.equal(data.kaguneEffects,perkCatalog.kaguneEffects);assert.equal(data.evolutions,perkCatalog.evolutions);
 const raw=JSON.parse(await readFile(new URL('../app/perks.json',import.meta.url),'utf8'));
 for(const key of ['perks','kakujaPerks','kaguneEffects','evolutions'])assert.deepEqual(perkCatalog[key].map(p=>p.id),raw[key].map(p=>p.id));
});
test('techniques attached to existing perks never create a second PE purchase',()=>{
 for(const t of tactical.tacticalCapstones){assert.equal(t.pe,0,t.id);assert.ok(data.perks.some(p=>p.id===t.id));}
});
test('new passive catalog effects apply once and charge only the catalog purchase',()=>withPerk(entry,()=>{
 const s=sheet(),base=rules.calculateCharacter(s),next=rules.calculateCharacter({...s,perks:{[entry.id]:{rank:1}}});
 assert.equal(next.physicalSteps-base.physicalSteps,3);assert.equal(next.kaguneSteps-base.kaguneSteps,3);
 assert.equal(next.peSpent-base.peSpent,5);assert.equal(next.customSkillsPE,0);assert.deepEqual(s.customSkills,[]);
}));
test('new active catalog effects follow the existing saved tracking flag',()=>withPerk({...entry,automation:{custom:{activation:'active',rcCost:2,effects:[effect]}}},()=>{
 const s=sheet({perks:{[entry.id]:{rank:1}}}),off=rules.calculateCharacter(s);
 const on={...s,damageContext:{...s.damageContext,active:{[`tracking:${entry.id}`]:true}}};
 const active=rules.calculateCharacter(on);assert.equal(active.physicalSteps-off.physicalSteps,3);
 assert.equal(active.kaguneSteps-off.kaguneSteps,3);
 assert.equal(rules.calculateCharacter(rules.normalizeCharacter(JSON.parse(JSON.stringify(on)),8)).kaguneSteps,active.kaguneSteps);
 assert.equal(rules.calculateCharacter(s).kaguneSteps,off.kaguneSteps);
}));
test('new effects respect level, species and purchased attribute requirements',()=>withPerk({...entry,minGrade:10,species:['ghoul'],attribute:'forca',min:9},()=>{
 for(const patch of [{grade:9},{grade:10,species:'humano'},{grade:10,baseAttributes:{forca:3}}]){
  const s=sheet(patch),base=rules.calculateCharacter(s);assert.equal(rules.calculateCharacter({...s,perks:{[entry.id]:{rank:1}}}).physicalSteps,base.physicalSteps);
 }
}));
test('a retracted weapon cannot supply a custom weapon bonus',()=>withPerk({...entry,location:'kakuhou'},()=>{
 const s=sheet({kaguneActive:false}),base=rules.calculateCharacter(s);assert.equal(rules.calculateCharacter({...s,perks:{[entry.id]:{rank:1}}}).physicalSteps,base.physicalSteps);
}));
test('saved purchases and unknown IDs survive normalization and JSON export',()=>{
 const s=sheet({perks:{terapeuta:{rank:1},'unknown-preserved':{rank:2}},kakuja:{selectedPerks:['k20-instinto-soberano','unknown-kakuja']}});
 const roundtrip=rules.normalizeCharacter(JSON.parse(JSON.stringify(s)),8);assert.deepEqual(roundtrip.perks,s.perks);assert.deepEqual(roundtrip.kakuja.selectedPerks,s.kakuja.selectedPerks);
});
test('new active Kakuja perks use existing activation and PE-K accounting',()=>{
 const p={id:'autoral-kakuja-test',sourceId:'AUTORAL',name:'Teste Kakuja',cost:7,grade:6,cm:0,category:'Autoral',usage:'Ativa',requirement:'',effect:'Teste',sourcePage:0,requiresModules:[],requiresElements:[],minElements:0,currency:'PE-K',activation:'active',bonuses:{steps:11}};
 kp.kakujaPerks.push(p);try{
  const state={...sheet().kakuja,active:true,cannibalPE:60,selectedPerks:[p.id],activeTechniques:[]};
  assert.equal(kp.calculateKakujaPerkBonuses(state,8,'ghoul').steps,0);
  assert.equal(kp.calculateKakujaPerkBonuses({...state,activeTechniques:[p.id]},8,'ghoul').steps,11);
  assert.equal(kp.kakujaPEKPerksCost([p.id]),7);
 }finally{kp.kakujaPerks.pop();}
});
