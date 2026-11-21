import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const data=await vite.ssrLoadModule('/app/data.ts'),rules=await vite.ssrLoadModule('/app/character.ts');
const {crystallizationComparison}=await vite.ssrLoadModule('/app/crystallization.ts');
const {vatsAction,normalizeVats}=await vite.ssrLoadModule('/app/vats-engine.ts');
const {tailAttackBudget}=await vite.ssrLoadModule('/app/tail-management.ts');
const sheet=(patch={})=>rules.normalizeCharacter({id:'saved-legacy-test',species:'ghoul',grade:14,weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,currentRC:100,baseAttributes:{forca:8,vigor:8,precisao:8,agilidade:8,raciocinio:6,percepcao:6,presenca:6,controle:6},...patch},8);
const entry=(group,id)=>data[group].find(p=>p.id===id);
function parameters(group,id,patch,fn){const p=entry(group,id),old=p.mechanics;p.mechanics=patch===null?undefined:{...old,...patch};try{return fn(p);}finally{p.mechanics=old;}}
function temporary(group,p,fn){data[group].push(p);try{return fn();}finally{data[group].pop();}}
const effect={id:'tails',type:'tails',value:2,scope:'kagune',attribute:'forca',operation:'add'};
const custom={activation:'active',rcCost:5,effects:[effect]};
const config=(s,d)=>({maxLife:d.maxLife,maxRC:d.maxRC,rc:s.currentRC,hunger:s.hunger,vigor:d.activeAttributes.vigor,baseVigor:s.baseAttributes.vigor,grade:s.grade,regeneration:d.regeneration,regenLevel:0,superior:0,cells:false,kami:false,hasKagune:true,kaguneActive:s.kaguneActive,durability:d.kaguneDurability,tails:d.maximumTails,naturalTails:d.naturalTails,powers:s.selectedEvolutions,rd:d.rd,movement:d.movement,dodgeTest:d.dodgeTest,blockTest:d.blockTest,paidTailStart:d.paidTailStart,tailAttackRC:d.tailAttackRC});

test('crystallization tables and enhancement change both the damage and its independent preview',()=>parameters('kaguneEffects','cristalizacao',{stepsByRank:[5,8,12]},()=>parameters('kaguneEffects','cristalizacao-potencializada',{modifierPerRank:4},()=>{
 const s=sheet({kaguneType:'Ukaku',effects:{cristalizacao:{rank:2},'cristalizacao-potencializada':{rank:2}}}),before=JSON.stringify(s),preview=crystallizationComparison(s);
 assert.equal(preview.steps,8);assert.equal(preview.modifier,8);assert.equal(preview.active,false);
 assert.equal(rules.calculateCharacter(s).kaguneDamage,preview.normal.kaguneDamage);
 const active={...s,damageContext:{...s.damageContext,active:{'kagune:cristalizacao':true}}};
 assert.equal(rules.calculateCharacter(active).kaguneDamage,preview.crystallized.kaguneDamage);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(rules.normalizeCharacter(JSON.parse(before),8).effects,s.effects);
})));

test('older JSON files without mechanics keep crystallization levels 2/3/4 and existing level-based purchase caps',()=>parameters('kaguneEffects','cristalizacao',null,()=>{
 for(let rank=1;rank<=3;rank++)assert.equal(crystallizationComparison(sheet({kaguneType:'Ukaku',effects:{cristalizacao:{rank}}})).steps,rank+1);
 assert.equal(rules.effectMaximum(entry('kaguneEffects','aumentar-passos'),sheet({grade:12})),7);
}));

test('Rinkaku tail quantity, damage penalty and paid-tail boundary follow their original rule parameters',()=>parameters('kaguneEffects','multiplas-caudas',{tailsPerRank:2,stepsPenaltyPerTail:3},()=>parameters('evolutions','multiplas-caudas-plus',{tailsPerRank:3,tailAttackRC:5},()=>{
 const s=sheet({effects:{'multiplas-caudas':{rank:2}},selectedEvolutions:['multiplas-caudas-plus','multiplas-caudas-plus']}),d=rules.calculateCharacter(s);
 assert.equal(d.naturalTails,11);assert.equal(d.activeTailCount,11);assert.equal(d.paidTailStart,5);assert.equal(d.tailStepPenalty,3);
 assert.equal(tailAttackBudget(d.tails.attacks,d.paidTailStart,d.tailAttackRC).total,30);
 assert.equal(d.kagunePartAttackSteps,Math.max(0,d.kaguneSteps-3));
})));

test('a new active Kagune effect grants ranked tails without creating a second PE purchase',()=>temporary('kaguneEffects',{id:'autoral-test-tails',name:'Caudas de teste',family:'Rinkaku',cost:4,maxRank:3,type:'Ativo',description:'Teste',automation:{custom:{...custom,effects:[{...effect,valuesByRank:[1,3,5]}]}}},()=>{
 const s=sheet({effects:{'autoral-test-tails':{rank:2}}}),off=rules.calculateCharacter(s);
 const on={...s,damageContext:{...s.damageContext,active:{'tracking:autoral-test-tails':true}}},d=rules.calculateCharacter(on);
 assert.equal(off.naturalTails,1);assert.equal(d.naturalTails,4);assert.equal(d.activeTailCount,4);assert.equal(d.customSkillsPE,0);
 assert.equal(d.peSpent,off.peSpent);assert.equal(d.actualEffectPE,8);
 assert.equal(rules.calculateCharacter({...on,kaguneActive:false}).naturalTails,1);
 assert.equal(rules.calculateCharacter(rules.normalizeCharacter(JSON.parse(JSON.stringify(on)),8)).naturalTails,4);
}));

test('new evolution and perk tails apply alongside existing purchases and respect requirements',()=>temporary('evolutions',{id:'autoral-test-evolution',name:'Caudas evoluídas',family:'Rinkaku',cost:3,grade:10,maxRank:2,description:'Teste',automation:{custom:{...custom,activation:'passive'}}},()=>temporary('perks',{id:'autoral-test-perk',name:'Caudas adicionais',category:'Genérica',cost:3,minGrade:1,maxRank:1,supplement:true,description:'Teste',automation:{custom:{...custom,activation:'passive'}}},()=>{
 const s=sheet({perks:{'autoral-test-perk':{rank:1}},selectedEvolutions:['autoral-test-evolution','autoral-test-evolution']}),d=rules.calculateCharacter(s);
 assert.equal(d.naturalTails,7);assert.equal(d.customSkillsPE,0);
 assert.equal(rules.calculateCharacter({...s,grade:8}).naturalTails,3);
 assert.equal(rules.calculateCharacter({...s,kaguneActive:false,perks:{}}).naturalTails,1);
})));

test('authored skills support tail addition, multiplication, expiration and saved part names',()=>{
 const s=sheet({kaguneType:'Ukaku',customSkills:[{id:'skill',name:'Caudas',description:'',cost:4,activation:'active',enabled:true,expiresTurn:3,effects:[{...effect,operation:'multiply',value:3}]}]});
 s.vats.parts=[{damage:0,ready:0,sacrificedUntil:0,name:'Cauda guardada',notes:'nota salva'}];
 const d=rules.calculateCharacter(s);assert.equal(d.naturalTails,3);assert.equal(d.rinkakuTailCount,3);assert.ok(d.rinkakuTailDamage);assert.equal(d.activeTailCount,3);
 assert.equal(rules.calculateCharacter({...s,vats:{...s.vats,turn:3}}).naturalTails,1);
 assert.equal(rules.normalizeCharacter(JSON.parse(JSON.stringify(s)),8).vats.parts[0].name,'Cauda guardada');
 const many=rules.calculateCharacter({...s,customSkills:[{...s.customSkills[0],effects:[{...effect,value:100}]}],vats:{...s.vats,manualTails:20}});assert.equal(many.maximumTails,50);
});

test('evolution activation costs, duration and momentum limits share catalog values',()=>parameters('evolutions','mil-pernas',{rcCost:5,durationTurns:4,extraTails:3},()=>parameters('evolutions','tentaculos-incessantes',{maximumStacks:4},()=>{
 const s=sheet({selectedEvolutions:['mil-pernas','tentaculos-incessantes'],currentRC:10}),d=rules.calculateCharacter(s);
 const active=vatsAction(s.vats,config(s,d),{type:'mil-pernas'});
 assert.equal(active.currentRC,5);assert.equal(active.vats.milPernasUntil,5);
 assert.equal(rules.calculateCharacter({...s,vats:active.vats}).maximumTails,4);
 assert.equal(normalizeVats({...s.vats,tentacleMomentum:4}).tentacleMomentum,4);
})));

test('visual boolean parameters and a zero tail attack cost are honored',()=>{
 const s=sheet({effects:{'multiplas-caudas':{rank:2}},selectedEvolutions:['trama-sustentacao','multiplas-caudas-plus']});
 const normal=rules.calculateCharacter(s);
 parameters('evolutions','trama-sustentacao',{removeTailPenalty:false},()=>assert.equal(rules.calculateCharacter(s).kagunePartDurability,normal.kagunePartDurability-2));
 parameters('evolutions','multiplas-caudas-plus',{tailAttackRC:0},()=>{
  const d=rules.calculateCharacter(s);assert.equal(d.tailAttackRC,0);assert.equal(tailAttackBudget(d.tails.attacks,d.paidTailStart,d.tailAttackRC).total,0);
 });
});

test('tail prerequisites also count active tails granted by authored skills and catalog perks',()=>{
 const p=entry('perks','n26-pack-perk-074'),s=sheet(),attributes=rules.permanentAttributesForSheet(s).permanentAttributes;
 assert.equal(rules.perkRequirementMet(p,s,attributes),false);
 const granted={...s,customSkills:[{id:'extra-tails',name:'Caudas',description:'',cost:3,activation:'active',enabled:true,effects:[effect]}]};
 assert.equal(rules.perkRequirementMet(p,granted,attributes),true);
 assert.equal(rules.perkRequirementMet(p,{...granted,customSkills:[{...granted.customSkills[0],enabled:false}]},attributes),false);
 temporary('perks',{id:'autoral-grant-tails',name:'Caudas',category:'Genérica',cost:3,minGrade:1,maxRank:1,supplement:true,description:'Teste',automation:{custom:{...custom,activation:'passive'}}},()=>{
  assert.equal(rules.perkRequirementMet(p,{...s,perks:{'autoral-grant-tails':{rank:1}}},attributes),true);
 });
});
