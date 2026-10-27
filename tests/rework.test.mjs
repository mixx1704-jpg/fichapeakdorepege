import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const vite = await createServer({ appType:'custom', configFile:false, root:fileURLToPath(new URL('..',import.meta.url)), server:{middlewareMode:true} });
after(() => vite.close());
const rules = await vite.ssrLoadModule('/app/rework-rules.ts');
const sheetRules = await vite.ssrLoadModule('/app/character.ts');
const data = await vite.ssrLoadModule('/app/data.ts');
const vats = await vite.ssrLoadModule('/app/vats-engine.ts');
const quinqueRules = await vite.ssrLoadModule('/app/quinque.ts');
const attributes = (n=0) => Object.fromEntries(data.attributeKeys.map(key=>[key,n]));

test('legacy pools retain every additive hit bonus and remove success thresholds',()=>{
  assert.equal(rules.convertLegacyTest('40d8++5>>7'),'1d20+40+5');
  assert.equal(rules.convertLegacyTest('48d8!8++18>>20'),'1d20+48+18');
  assert.equal(sheetRules.formatTest(48,18),'1d20+48+18');
  assert.equal(sheetRules.formatTest(0,0,true),'1d20+0');
  assert.equal(sheetRules.formatTest(-3,2),'1d20-3+2');
  assert.equal(rules.convertLegacyTest('1d12+5'),'1d12+5');
});

test('all nineteen level transitions include odd levels, high costs and overflow',()=>{
  assert.deepEqual(rules.levelProgression.map(s=>s.requiredPE),[5,5,5,10,10,15,15,20,20,25,25,30,30,80,90,100,120,150,500]);
  let character=sheetRules.normalizeCharacter({grade:1,earnedPE:0,progressPE:0},8);
  character=sheetRules.registerEarnedPE(character,17);
  for(let i=0;i<3;i++)character=sheetRules.advanceGradeIfReady(character);
  assert.equal(character.grade,4);
  assert.equal(character.progressPE,2);
  assert.equal(character.earnedPE,17);
  assert.equal(sheetRules.progressionPEFor(character),17);
  assert.equal(sheetRules.advanceGradeIfReady(character),character);
  const last={grade:19,progressPE:525};
  assert.deepEqual(sheetRules.advanceGradeIfReady(last),{grade:20,progressPE:25});
  const max={grade:20,progressPE:999};
  assert.equal(sheetRules.advanceGradeIfReady(max),max);
});

test('every old grade migrates once without adding or removing a single PE',()=>{
  for(const grade of [2,4,6,8,10,12,14]){
    const oldCumulative=rules.previousCumulativePE(grade);
    const input={id:'legacy-'+grade,grade,earnedPE:oldCumulative+12,progressPE:8,extraPE:23,updatedAt:123,baseAttributes:attributes(2),extraDice:{...attributes(),forca:40},inventory:[{id:'i',name:'Relíquia',quantity:3,notes:'Preservar'}],customPerks:[{id:'a',name:'Autoral',description:'Bônus narrativo',cost:7}],effects:{'aumentar-acerto':{rank:4}},selectedEvolutions:['conveniencia-instintiva'],currentLife:18,currentSanity:6,currentRC:9};
    const migrated=sheetRules.normalizeCharacter(input,7);
    assert.equal(migrated.rulesVersion,8);
    assert.equal(migrated.grade,grade);
    assert.equal(migrated.earnedPE,input.earnedPE);
    assert.equal(migrated.progressPE,input.progressPE);
    assert.equal(migrated.extraPE,input.extraPE);
    assert.equal(sheetRules.progressionPEFor(migrated),Math.max(input.earnedPE,oldCumulative+input.progressPE));
    for(const field of ['inventory','customPerks','effects','selectedEvolutions','extraDice'])assert.deepEqual(migrated[field],input[field]);
    assert.deepEqual(sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(migrated)),8),migrated);
    assert.deepEqual(sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(migrated)),7),migrated);
  }
});

test('legacy migration does not mint PE while the character advances through the new curve',()=>{
  let character=sheetRules.normalizeCharacter({grade:12,progressPE:60,earnedPE:210},7);
  assert.equal(sheetRules.progressionPEFor(character),210);
  character=sheetRules.advanceGradeIfReady(character);
  assert.equal(character.grade,13);assert.equal(character.progressPE,30);
  character=sheetRules.advanceGradeIfReady(character);
  assert.equal(character.grade,14);assert.equal(character.progressPE,0);
  assert.equal(sheetRules.progressionPEFor(character),210);
  character=sheetRules.registerEarnedPE(character,80);
  character=sheetRules.advanceGradeIfReady(character);
  assert.equal(character.grade,15);assert.equal(sheetRules.progressionPEFor(character),290);
});

test('a migrated character overrides an outdated wrapper version for every legacy PE conversion',()=>{
  const first=sheetRules.normalizeCharacter({grade:14,earnedPE:600,progressPE:8},5);
  assert.equal(first.earnedPE,550);
  for(const wrapperVersion of [2,4,5,7,8])assert.deepEqual(sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(first)),wrapperVersion),first);
});

test('unmet and historical purchases survive a normal edit and a JSON round trip',()=>{
  const input={grade:14,perks:{'r26-bonus-desconhecido':{rank:5},'atante-medicina':{rank:1}},effects:{'regeneracao-superior':{rank:5}},selectedEvolutions:['centopeia','ataque-extra','ataque-extra','ataque-extra','evolucao-historica'],baseAttributes:{...attributes(),forca:17},currentLife:-7,currentSanity:99,currentRC:999,narrativeLimits:true};
  const saved=sheetRules.normalizeCharacter(input,7);
  const edited=sheetRules.pruneStructuralDependencies({...saved,name:'Nome revisado',narrativeLimits:false});
  for(const field of ['perks','effects','selectedEvolutions','baseAttributes','currentLife','currentSanity','currentRC'])assert.deepEqual(edited[field],input[field]);
  const reloaded=sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(edited)),8);
  assert.deepEqual(reloaded,edited);
  assert.ok(sheetRules.calculateCharacter(reloaded).issues.length>0);
});

test('legacy Quinque transfer runs once, retaining authored skills and all saved resources',()=>{
  const skill={id:'skill',name:'Acerto autoral',description:'Passivo',cost:6,activation:'passive',enabled:true,effects:[{id:'a',type:'hit-dice',value:18,scope:'kagune',attribute:'forca'}]};
  const migrated=sheetRules.normalizeCharacter({weaponKind:'quinque',kaguneName:'Memória',kaguneType:'Rinkaku',sourceGhoulGrade:10,customSkills:[skill],extraDice:{...attributes(),forca:48},effects:{'aumentar-acerto':{rank:3}},currentLife:21,currentRC:15,currentSanity:7},7);
  assert.equal(migrated.quinques.length,1);
  assert.equal(migrated.weaponKind,'nenhum');
  assert.equal(migrated.quinques[0].name,'Memória');
  assert.deepEqual(migrated.quinques[0].customSkills,[skill]);
  assert.equal(migrated.quinques[0].hitDice,48);
  assert.deepEqual(migrated.customSkills,[]);
  const reloaded=sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(migrated)),8);
  assert.deepEqual(reloaded,migrated);
  assert.equal(reloaded.quinques.length,1);
  assert.equal(reloaded.currentLife,21);assert.equal(reloaded.currentRC,15);assert.equal(reloaded.currentSanity,7);
});

test('independent legacy Quinques retain PE and do not accumulate calculation-only skills',()=>{
  const old={id:'weapon',grade:12,creationGrade:8,earnedPE:164,progressPE:14,bonusPE:-5,attributes:{...attributes(),forca:16}};
  const migrated=quinqueRules.normalizeQuinque(old);
  assert.equal(sheetRules.progressionPEFor(migrated),164);
  assert.equal(migrated.attributes.forca,16);
  assert.deepEqual(quinqueRules.normalizeQuinque(JSON.parse(JSON.stringify(migrated))),migrated);
  const before=JSON.stringify(migrated);
  const first=quinqueRules.calculateQuinque(migrated);
  const second=quinqueRules.calculateQuinque(migrated);
  assert.equal(first.available,second.available);assert.equal(first.kaguneTest,second.kaguneTest);
  assert.equal(JSON.stringify(migrated),before);
});

test('historical Kakuja perk IDs remain saved and do not break active calculations',()=>{
  const sheet=sheetRules.normalizeCharacter({grade:14,species:'ghoul',kakuja:{active:true,cannibalPE:60,selectedPerks:['perk-historica-kakuja']}},7);
  assert.deepEqual(sheet.kakuja.selectedPerks,['perk-historica-kakuja']);
  assert.doesNotThrow(()=>sheetRules.calculateCharacter(sheet));
  assert.deepEqual(sheetRules.normalizeCharacter(JSON.parse(JSON.stringify(sheet)),8).kakuja.selectedPerks,['perk-historica-kakuja']);
});

test('mental stability changes the single die only for the three ghoul species',()=>{
  for(const species of ['ghoul','ghoul-artificial','ghoul-dominante']){
    assert.equal(rules.mentalityDie(species,76,100),30);
    assert.equal(rules.mentalityDie(species,75,100),20);
    assert.equal(rules.mentalityDie(species,45,100),20);
    assert.equal(rules.mentalityDie(species,44,100),10);
  }
  for(const species of ['humano','humano-dominante','quinx']){
    assert.equal(rules.mentalityDie(species,100,100),20);
    assert.equal(rules.mentalityDie(species,0,100),20);
  }
});

test('Control adds once to physical attacks, Kagune attacks, block and dodge',()=>{
  const sheet=sheetRules.normalizeCharacter({grade:8,species:'ghoul',baseAttributes:{...attributes(3),controle:4},currentSanity:12,weaponKind:'kagune',kaguneActive:true},8);
  const derived=sheetRules.calculateCharacter(sheet);
  assert.equal(derived.ghoulCombatBase,4);
  assert.equal(derived.ghoulControlBonus,4);
  assert.equal(derived.ghoulCombatDice,8);
  for(const key of ['physicalHitTest','kaguneTest','blockTest','dodgeTest'])assert.equal(derived[key],'1d20+11+1',key);
  const weapon=sheetRules.calculateCharacter({...sheet,currentSanity:999},{quinque:true});
  assert.equal(weapon.ghoulCombatDice,0);
  for(const key of ['physicalHitTest','kaguneTest','blockTest','dodgeTest'])assert.equal(weapon[key],'1d20+3+1',key);
});

test('hit purchases grant their complete rank as additive accuracy',()=>{
  const sheet=sheetRules.normalizeCharacter({grade:8,species:'humano',baseAttributes:attributes(4),weaponKind:'kagune',kaguneActive:true,effects:{'aumentar-acerto':{rank:5}}},8);
  const derived=sheetRules.calculateCharacter(sheet);
  assert.equal(derived.kaguneTest,'1d20+9+2');
  assert.equal(derived.looseHitAdjustments,0);
});

test('life uses all species factors, Vigor, Strength and the requested multiplier',()=>{
  for(const [species,factor]of Object.entries({humano:1,ghoul:2,'humano-dominante':3,'ghoul-dominante':4,'ghoul-artificial':4,quinx:2}))assert.equal(rules.maximumLife(species,10,4,6),Math.floor((25+12+12+10*factor)*105/100));
  assert.equal(rules.maximumSanity(20,6),36);
  assert.equal(rules.maximumSanity(20,6,4,true),20);
});

test('purchased attributes cap at eleven with an explicit narrative override',()=>{
  const sheet=sheetRules.normalizeCharacter({grade:20,baseAttributes:{...attributes(),forca:12}},8);
  assert.equal(sheetRules.calculateCharacter(sheet).purchasedCap,11);
  assert.ok(sheetRules.calculateCharacter(sheet).issues.some(issue=>issue.includes('limite comprado 11')));
  const narrative=sheetRules.calculateCharacter({...sheet,narrativeLimits:true});
  assert.equal(narrative.purchasedCap,Infinity);
  assert.ok(!narrative.issues.some(issue=>issue.includes('limite comprado')));
});

test('wounds and temporary effects change accuracy without changing die size',()=>{
  assert.equal(vats.adjustTest('1d30+48+18',-3),'1d30+48+18-3');
  assert.equal(vats.adjustTest('1d10+4+2',2),'1d10+4+2+2');
  assert.equal(vats.adjustTest('1d20+0',0),'1d20+0');
});

test('legacy catalog descriptions and new useful purchases use Level and additive accuracy',()=>{
  assert.ok(data.perks.filter(p=>p.id.startsWith('r26-')).length>=100);
  for(const item of [...data.perks,...data.kaguneEffects,...data.evolutions]){
    assert.ok(!/\bGrau\b/.test(item.description),item.id);
    assert.ok(!/\b\d+ dados? de acerto\b/i.test(item.description),item.id);
  }
});
