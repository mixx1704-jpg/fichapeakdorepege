import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {kaguneEffects}=await vite.ssrLoadModule('/app/data.ts');
const rules=await vite.ssrLoadModule('/app/character.ts');
const armor=kaguneEffects.find(effect=>effect.id==='couraca-superior');
const base=()=>rules.normalizeCharacter({id:'saved-couraca',species:'ghoul',grade:14,weaponKind:'kagune',kaguneType:'Koukaku',kaguneActive:true,baseAttributes:{forca:6,vigor:8,precisao:6,agilidade:6,raciocinio:6,percepcao:6,presenca:6,controle:6}},8);
function withRD(value,fn){const old=armor.rdPerAdditionalRank;try{if(value===undefined)delete armor.rdPerAdditionalRank;else armor.rdPerAdditionalRank=value;return fn();}finally{armor.rdPerAdditionalRank=old;}}
const purchased=(sheet,rank)=>({...sheet,effects:{'couraca-superior':{rank}}});

test('catalog value controls additional armor ranks while rank one still uses Vigor',()=>withRD(45,()=>{
 const s=base(),normal=rules.calculateCharacter(s);
 for(let rank=1;rank<=7;rank++){
  const next=rules.calculateCharacter(purchased(s,rank));
  assert.equal(next.kaguneRDReference-normal.kaguneRDReference,next.activeAttributes.vigor+(rank-1)*45);
 }
}));

test('older catalogs retain the original one RD per additional rank; zero is supported',()=>{
 for(const value of [undefined,1,0,-1,'45',NaN])withRD(value,()=>{
  const s=base(),normal=rules.calculateCharacter(s),next=rules.calculateCharacter(purchased(s,3));
  assert.equal(next.kaguneRDReference-normal.kaguneRDReference,next.activeAttributes.vigor+(value===0?0:2));
 });
});

test('configured armor does not apply while retracted and preserves saved purchases and PE',()=>{
 const s=purchased(base(),3),saved=JSON.stringify(s),old=rules.calculateCharacter(s);
 withRD(45,()=>{
  const loaded=rules.normalizeCharacter(JSON.parse(saved),8),next=rules.calculateCharacter(loaded);
  assert.deepEqual(loaded.effects,s.effects);assert.equal(JSON.stringify(s),saved);
  assert.equal(next.peSpent,old.peSpent);assert.equal(next.peAvailable,old.peAvailable);
  assert.equal(next.kaguneRDReference-old.kaguneRDReference,88);
  const retracted={...loaded,kaguneActive:false};
  assert.equal(rules.calculateCharacter(retracted).kaguneRDReference,rules.calculateCharacter({...retracted,effects:{}}).kaguneRDReference);
  assert.equal(rules.effectMaximum(armor,loaded),7);
 });
});
