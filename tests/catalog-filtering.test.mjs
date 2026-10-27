import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { accuracyTotal } from './test-helpers.mjs';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts');
const rules=await vite.ssrLoadModule('/app/character.ts');
const filters=await vite.ssrLoadModule('/app/catalog-filters.ts');
const {reworkText}=await vite.ssrLoadModule('/app/rework-rules.ts');
const original=JSON.parse(await readFile(new URL('./fixtures/original-catalog.json',import.meta.url),'utf8'));

test('all 1250 original perks, 49 effects and 71 evolutions retain their saved IDs and prices',()=>{
  assert.equal(original.source,'fichapeakdorepege-main.zip');
  assert.match(original.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual([original.perks.length,original.kaguneEffects.length,original.evolutions.length],[1250,49,71]);
  for(const kind of ['perks','kaguneEffects','evolutions']){
    const current=new Map(data[kind].map(item=>[item.id,item]));
    for(const legacy of original[kind]){
      const item=current.get(legacy.id);
      assert.ok(item,`${kind}: original purchase ${legacy.id} is missing`);
      for(const [key,value]of Object.entries(legacy))assert.deepEqual(item[key],key==='name'?reworkText(value):value,`${legacy.id}: ${key}`);
    }
  }
});

const samples=[
  ['Força','pugilista','Pugilista'],['Vigor','resistente','Resistente'],
  ['Precisão','respiracao-contida','Respiração Contida'],['Agilidade','velocista','Velocista'],
  ['Raciocínio','cem-por-cento','100%'],['Percepção','olho-deus','Olho de Deus'],
  ['Presença','elegante','Elegante'],['Controle','frio-neve','Frio como a Neve'],
];

test('one catalog exposes every attribute, organ, equipment and chimera perk together',()=>{
  const complete=filters.filterPerkCatalog(data.perks);
  assert.equal(complete.length,data.perks.length);
  assert.deepEqual(new Set(complete.map(item=>item.id)),new Set(data.perks.map(item=>item.id)));
  assert.ok(complete.some(item=>item.location==='kakuhou'));
  assert.ok(complete.some(item=>item.requiredWeapon==='quinque'));
  assert.ok(complete.some(item=>item.category==='Kagune Quimera'));
  for(const [category,id,name]of samples){
    const all=filters.filterPerkCatalog(data.perks,{category});
    assert.ok(all.some(item=>item.id===id&&item.name===name),`${category}: original attribute purchase is hidden`);
    assert.ok(all.some(item=>item.id.startsWith('r26-')),`${category}: attribute expansion is missing`);
    assert.equal(all.length,data.perks.filter(item=>item.category===category).length);
  }
});

test('search accepts accents, plain Portuguese, category names and original source IDs',()=>{
  assert.equal(filters.normalizeCatalogSearch('  PRECISÃO  '),'precisao');
  assert.ok(filters.filterPerkCatalog(data.perks,{query:'respiracao contida'}).some(item=>item.id==='respiracao-contida'));
  assert.ok(filters.filterPerkCatalog(data.perks,{query:'celulas ageis'}).some(item=>item.id==='celulas-ageis'));
  assert.ok(filters.filterPerkCatalog(data.perks,{query:'presenca',category:'Presença'}).length>0);
  assert.ok(filters.filterPerkCatalog(data.perks,{query:'P0001'}).some(item=>item.sourceId==='P0001'));
  for(const group of ['Ukaku','Koukaku','Rinkaku','Bikaku','Quimera','Kakuja','Quinque','Quinx / Arata']){
    const items=filters.filterPerkCatalog(data.perks,{category:group});
    assert.ok(items.length>0,group);
    assert.ok(items.every(item=>item.organGroup===group||item.category===group),group);
  }
});

test('owned and eligibility filters only apply when requested and never alter the catalog',()=>{
  const before=data.perks.map(item=>item.id);
  const sheet=rules.normalizeCharacter({grade:1,species:'humano'},8);
  const eligibility=item=>rules.perkRequirementMet(item,sheet,rules.calculateCharacter(sheet).permanentAttributes);
  assert.ok(filters.filterPerkCatalog(data.perks,{query:'Pugilista',isAvailable:eligibility}).some(item=>item.id==='pugilista'));
  assert.equal(filters.filterPerkCatalog(data.perks,{query:'Pugilista',availableOnly:true,isAvailable:eligibility}).length,0);
  assert.deepEqual(filters.filterPerkCatalog(data.perks,{category:'Força',ownedOnly:true,isOwned:item=>item.id==='pugilista'}).map(item=>item.id),['pugilista']);
  assert.deepEqual(data.perks.map(item=>item.id),before);
});

test('catalog sorts by Level and name without prioritizing purchase origin',()=>{
  for(const [category]of samples){
    const items=filters.filterPerkCatalog(data.perks,{category});
    for(let index=1;index<items.length;index++)assert.ok(Math.max(1,items[index-1].minGrade||1)<=Math.max(1,items[index].minGrade||1),category);
    assert.ok(items.slice(0,48).some(item=>!item.id.startsWith('r26-')),`${category}: no old purchase on the first page`);
  }
  const sample=data.perks[0];
  const tied=[{...sample,id:'original-z',name:'Zelo',minGrade:10},{...sample,id:'r26-first',name:'Abrigo',minGrade:10}];
  assert.deepEqual(filters.filterPerkCatalog(tied).map(item=>item.name),['Abrigo','Zelo']);
});

test('legacy passive automation remains additive and retains the original purchase costs',()=>{
  const base=rules.normalizeCharacter({grade:14,species:'humano',baseAttributes:Object.fromEntries(data.attributeKeys.map(key=>[key,10]))},8);
  const ids=['pugilista','resistente','velocista','cem-por-cento','olho-deus','elegante','frio-neve','corpo-pesado','corpo-leve'];
  const acquired={...base,perks:Object.fromEntries(ids.map(id=>[id,{rank:1}]))};
  const before=rules.calculateCharacter(base),after=rules.calculateCharacter(acquired);
  assert.equal(after.physicalSteps-before.physicalSteps,2);
  assert.ok(after.maxLife>before.maxLife);
  assert.equal(after.movement-before.movement,1);
  for(const [key,bonus]of [['raciocinio',2],['percepcao',1],['presenca',2],['controle',2]])assert.equal(accuracyTotal(after.attributeTests[key])-accuracyTotal(before.attributeTests[key]),bonus,key);
  assert.equal(accuracyTotal(after.blockTest)-accuracyTotal(before.blockTest),1);
  assert.equal(accuracyTotal(after.dodgeTest)-accuracyTotal(before.dodgeTest),2);
  const expected=ids.reduce((sum,id)=>sum+rules.perkCostForSheet(data.perks.find(item=>item.id===id),1,acquired),0);
  assert.equal(after.catalogPerksPE-before.catalogPerksPE,expected);
});
