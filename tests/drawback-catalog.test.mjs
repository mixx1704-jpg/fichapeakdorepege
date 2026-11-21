import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts');
const {perkCatalog}=await vite.ssrLoadModule('/app/perk-catalog.ts');
const rules=await vite.ssrLoadModule('/app/character.ts');
const base=()=>rules.normalizeCharacter({id:'drawback-save',species:'ghoul',grade:8,baseAttributes:{forca:6,vigor:6,precisao:6,agilidade:6,raciocinio:6,percepcao:6,presenca:6,controle:6}},8);
const entry={id:'autoral-desvantagem-teste',name:'Limitação de teste',credit:[3,5,8],maxRank:3,description:'Uma limitação da mesa.'};
function temporary(p,fn){data.drawbacks.push(p);try{return fn();}finally{data.drawbacks.pop();}}
test('the unified JSON supplies all existing disadvantages and their saved IDs',()=>{
 assert.equal(data.drawbacks,perkCatalog.drawbacks);assert.equal(data.drawbacks.length,19);
 assert.deepEqual(data.drawbacks.find(d=>d.id==='horrendo').credit,[3,4,5]);
 assert.equal(data.drawbacks.find(d=>d.id==='desabilidade').uniqueTargets,true);
});
test('new disadvantage credits use the selected tier and refund on removal',()=>temporary(entry,()=>{
 const s=base(),normal=rules.calculateCharacter(s);
 const picked={...s,drawbacks:{[entry.id]:{rank:2}}};
 const d=rules.calculateCharacter(picked);
 assert.equal(d.drawbackCredit-normal.drawbackCredit,5);assert.equal(d.peAvailable-normal.peAvailable,5);
 assert.equal(d.peSpent,normal.peSpent);assert.equal(rules.calculateCharacter(s).drawbackCredit,normal.drawbackCredit);
 assert.deepEqual(rules.normalizeCharacter(JSON.parse(JSON.stringify(picked)),8).drawbacks,picked.drawbacks);
}));
test('an additional permanent penalty applies once without a second PE cost',()=>temporary({...entry,credit:4,maxRank:1,automation:{custom:{activation:'passive',effects:[{id:'life',type:'max-sanity',scope:'both',attribute:'vigor',operation:'subtract',value:5}]}}},()=>{
 const s=base(),normal=rules.calculateCharacter(s),d=rules.calculateCharacter({...s,drawbacks:{[entry.id]:{rank:1}}});
 assert.equal(d.maxSanity,normal.maxSanity-5);assert.equal(d.drawbackCredit-normal.drawbackCredit,4);assert.equal(d.customSkillsPE,0);
}));
test('conditional disadvantage penalties follow their saved tracking state',()=>temporary({...entry,automation:{custom:{activation:'active',effects:[{id:'life',type:'max-sanity',scope:'both',attribute:'vigor',operation:'subtract',value:5}]}}},()=>{
 const s=base(),owned={...s,drawbacks:{[entry.id]:{rank:1}}},off=rules.calculateCharacter(owned);
 const on={...owned,damageContext:{...owned.damageContext,active:{[`tracking:${entry.id}`]:true}}};
 assert.equal(rules.calculateCharacter(on).maxSanity,off.maxSanity-5);
 assert.equal(rules.calculateCharacter(rules.normalizeCharacter(JSON.parse(JSON.stringify(on)),8)).maxSanity,off.maxSanity-5);
 assert.equal(rules.calculateCharacter(owned).maxSanity,off.maxSanity);
}));
test('additional disadvantage effects respect allowed species and maximum ranks',()=>temporary({...entry,species:['ghoul'],automation:{custom:{activation:'passive',effects:[{id:'life',type:'max-sanity',scope:'both',attribute:'vigor',operation:'subtract',value:2}]}}},()=>{
 const s=base();assert.equal(rules.calculateCharacter({...s,drawbacks:{[entry.id]:{rank:3}}}).maxSanity,rules.calculateCharacter(s).maxSanity-6);
 const h={...s,species:'humano'};assert.equal(rules.calculateCharacter({...h,drawbacks:{[entry.id]:{rank:1}}}).maxSanity,rules.calculateCharacter(h).maxSanity);
}));
test('Corpo de Carne is the existing human surcharge included in the displayed purchase price',()=>{
 const p=data.perks.find(p=>p.id==='terapeuta');
 assert.equal(rules.hasHumanPerkSurcharge(p,'humano'),true);
 assert.equal(rules.perkCostForSheet(p,1,{...base(),species:'humano'}),p.cost+2);
 assert.equal(rules.perkCostForSheet(p,2,{...base(),species:'humano'}),(p.cost+2)*2);
 assert.equal(rules.hasHumanPerkSurcharge({...p,supplement:true},'humano'),false);
 assert.equal(rules.hasHumanPerkSurcharge(p,'ghoul'),false);
});
