import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {normalizeCombatTools,damageAgainstTarget,attackSummary}=await vite.ssrLoadModule('/app/combat-tools.ts');
const {normalizeCharacter,calculateCharacter}=await vite.ssrLoadModule('/app/character.ts');
const {normalizeQuinque,calculateQuinque}=await vite.ssrLoadModule('/app/quinque.ts');
const {emptyPoisonState,updatePoison,poisonPreview,poisonSummary,poisonPerkIds:ids}=await vite.ssrLoadModule('/app/poison.ts');
const config={enabled:true,control:9,level:20,perks:Object.values(ids)};

function poisoned(kind='corrosive',name='Alvo A'){
  let state=updatePoison(emptyPoisonState(),{type:'target',patch:{name,maxLife:399,rd:37,vigor:4,control:3}},config);
  state=updatePoison(state,{type:'kind',kind},config);
  for(let count=0;count<4;count++)state=updatePoison(state,{type:'dose',resisted:false},config);
  return state;
}
const tools=(kind='corrosive',name='Alvo A')=>normalizeCombatTools({damage:62,scope:'kagune',poison:poisoned(kind,name)});

test('old character and weapon saves gain independent empty combat calculators',()=>{
  const character=normalizeCharacter({species:'ghoul',grade:5,quinques:[{id:'a'},{id:'b'}]},8);
  assert.deepEqual(character.combatTools,normalizeCombatTools());
  assert.deepEqual(character.quinques[0].combatTools,normalizeCombatTools());
  assert.notEqual(character.combatTools,character.quinques[0].combatTools);
  assert.notEqual(character.quinques[0].combatTools.poison,character.quinques[1].combatTools.poison);
});

test('damage inputs floor decimals and reject invalid or negative quantities',()=>{
  assert.equal(normalizeCombatTools({damage:19.99}).damage,19);
  for(const damage of [NaN,Infinity,-Infinity,-1.5,undefined])assert.equal(normalizeCombatTools({damage}).damage,0);
  assert.equal(normalizeCombatTools({damage:0}).damage,0);
  assert.equal(normalizeCombatTools({damage:9e15}).damage,1_000_000_000);
  assert.equal(normalizeCombatTools({scope:'unknown'}).scope,'kagune');
  assert.equal(normalizeCombatTools({scope:'physical'}).scope,'physical');
});

test('zero attack damage remains zero against any RD and does not mutate its target',()=>{
  const source=tools();
  const result=damageAgainstTarget(0,source.poison.target.rd,40,20);
  assert.equal(result.damage,0);
  assert.equal(result.remainingRD,23);
  assert.equal(source.poison.target.rd,37);
  assert.equal(source.poison.stacks,4);
});

test('partial penetration subtracts original RD once and preserves at least half armor',()=>{
  const result=damageAgainstTarget(120,100,40,20);
  assert.deepEqual(result,{rawDamage:120,targetRD:100,penetrationPercent:40,ignoredRD:40,remainingRD:60,damage:60});
  const capped=damageAgainstTarget(120,100,99,99);
  assert.equal(capped.penetrationPercent,50);
  assert.equal(capped.remainingRD,50);
  assert.equal(capped.damage,70);
});

test('larger corrosion wins instead of adding or cascading with weapon penetration',()=>{
  const result=damageAgainstTarget(62,37,10,20);
  assert.equal(result.penetrationPercent,20);
  assert.equal(result.ignoredRD,7);
  assert.equal(result.remainingRD,30);
  assert.equal(result.damage,32);
  assert.equal(damageAgainstTarget(62,37,20,10).damage,result.damage);
});

test('fractional damage, RD and percentages floor before the final result',()=>{
  const result=damageAgainstTarget(50.9,21.9,19.9,0);
  assert.deepEqual(result,{rawDamage:50,targetRD:21,penetrationPercent:19,ignoredRD:3,remainingRD:18,damage:32});
  assert.equal(damageAgainstTarget(-1.1,20,-5,-5).damage,0);
  assert.equal(damageAgainstTarget(40,-1.1,0,0).damage,40);
});

test('one invalid penetration source cannot erase the other valid source',()=>{
  assert.equal(damageAgainstTarget(100,100,NaN,20).penetrationPercent,20);
  assert.equal(damageAgainstTarget(100,100,20,NaN).penetrationPercent,20);
  assert.equal(damageAgainstTarget(100,100,NaN,NaN).penetrationPercent,0);
  const invalid=damageAgainstTarget(NaN,NaN,NaN,NaN);
  assert.equal(invalid.damage,0);
  assert.ok(Object.values(invalid).every(Number.isFinite));
});

test('expired corrosion cannot lower RD in a later copied attack',()=>{
  let state=poisoned();
  assert.equal(poisonPreview(state,config).rdReductionPercent,20);
  for(let count=0;count<5;count++)state=updatePoison(state,{type:'turn'},config);
  const preview=poisonPreview(state,config);
  const result=damageAgainstTarget(62,state.target.rd,0,preview.rdReductionPercent);
  assert.equal(preview.rdReductionPercent,0);
  assert.equal(result.ignoredRD,0);
  assert.equal(result.damage,25);
  assert.match(poisonSummary(state,config),/Nenhum efeito ativo/);
});

test('toxic half-RD mitigation is not an armor debuff for ordinary attacks',()=>{
  const state=poisoned('toxic');
  const preview=poisonPreview(state,config);
  assert.equal(preview.mitigation,18);
  assert.equal(preview.rdReductionPercent,0);
  assert.equal(preview.damage,45);
  const attack=damageAgainstTarget(62,state.target.rd,0,preview.rdReductionPercent);
  assert.equal(attack.ignoredRD,0);
  assert.equal(attack.damage,25);
});

test('changing poison type ends corrosion before an attack recalculates',()=>{
  const state=updatePoison(poisoned(),{type:'kind',kind:'toxic'},config);
  const result=damageAgainstTarget(62,37,0,poisonPreview(state,config).rdReductionPercent);
  assert.equal(result.remainingRD,37);
  assert.equal(result.damage,25);
});

test('copied attack exposes the actual roll, penetration, remaining armor and final damage',()=>{
  const result=damageAgainstTarget(62,37,10,20);
  const summary=attackSummary({name:'Quinque A',target:'Tanque',test:'1d20+18+5',formula:'4d6+9',result});
  assert.match(summary,/Quinque A → Tanque/);
  assert.match(summary,/Acerto: 1d20\+18\+5/);
  assert.match(summary,/Dano para rolar: 4d6\+9/);
  assert.match(summary,/Resultado do dano: 62/);
  assert.match(summary,/penetração: 20%/);
  assert.match(summary,/RD restante: 30/);
  assert.match(summary,/Dano final: .*32/);
  assert.doesNotMatch(summary,/NaN|Infinity/);
});

test('empty attack names still produce a usable copy summary with a zero result',()=>{
  const summary=attackSummary({name:'',target:'',test:'1d20+0+0',formula:'1d6',result:damageAgainstTarget(0,0,0,0)});
  assert.match(summary,/Ataque → Alvo/);
  assert.match(summary,/Dano final: .*0/);
});

test('character JSON roundtrip preserves target, poison profile, pending duration and attack input',()=>{
  const original=normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,combatTools:tools('toxic','Alvo pessoal')},8);
  original.combatTools.poison=updatePoison(original.combatTools.poison,{type:'turn'},config);
  const restored=normalizeCharacter(JSON.parse(JSON.stringify(original)),8);
  assert.deepEqual(restored.combatTools,original.combatTools);
  assert.equal(restored.combatTools.damage,62);
  assert.equal(restored.combatTools.poison.remaining,4);
  assert.equal(restored.combatTools.poison.profile.potencyPercent,4);
  assert.equal(restored.combatTools.poison.totalDamage,45);
});

test('Quinque JSON roundtrip preserves its own calculator without a character owner',()=>{
  const original=normalizeQuinque({id:'weapon',name:'Arma A',combatTools:tools('corrosive','Alvo da arma')});
  const restored=normalizeQuinque(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored.combatTools,original.combatTools);
  assert.equal(restored.combatTools.poison.target.name,'Alvo da arma');
  assert.equal(poisonPreview(restored.combatTools.poison,config).rdReductionPercent,20);
});

test('owner and two weapons never share a combat target, roll or poison duration',()=>{
  const shared=tools();
  const original=normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,combatTools:shared,quinques:[{id:'a',combatTools:shared},{id:'b',combatTools:shared}]},8);
  const changed=normalizeCharacter({...original,quinques:original.quinques.map(q=>q.id==='a'?{...q,combatTools:{...q.combatTools,damage:99,poison:updatePoison(q.combatTools.poison,{type:'target',patch:{name:'Outro inimigo',rd:500}},config)}}:q)},8);
  assert.equal(changed.quinques[0].combatTools.damage,99);
  assert.equal(changed.quinques[0].combatTools.poison.target.rd,500);
  assert.equal(changed.quinques[1].combatTools.poison.target.rd,37);
  assert.equal(changed.combatTools.poison.target.rd,37);
  assert.equal(original.quinques[0].combatTools.damage,62);
  changed.quinques[0].combatTools.poison.remaining=1;
  assert.equal(changed.quinques[1].combatTools.poison.remaining,5);
  assert.equal(changed.combatTools.poison.remaining,5);
});

test('combat calculator bookkeeping never changes the character combat bonuses or resources',()=>{
  const source=normalizeCharacter({rulesVersion:8,species:'ghoul',grade:10,weaponKind:'kagune',kaguneActive:true,kaguneType:'Bikaku',currentRC:12,currentLife:33,baseAttributes:{forca:5,vigor:6,controle:4}},8);
  const before=calculateCharacter(source);
  const changed=normalizeCharacter({...source,combatTools:tools('neurotoxic','Inimigo')},8);
  const after=calculateCharacter(changed);
  for(const key of ['maxLife','maxSanity','maxRC','physicalHitTest','physicalDamage','kaguneTest','kaguneDamage','blockTest','dodgeTest','peSpent'])assert.deepEqual(after[key],before[key],key);
  assert.equal(changed.currentRC,source.currentRC);
  assert.equal(changed.currentLife,source.currentLife);
});

test('a Quinque buys poison independently and cannot borrow the owner or another weapon perk',()=>{
  const owner=normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,kaguneActive:true,weaponKind:'kagune',perks:{[ids.inoculation]:{rank:1}},quinques:[{id:'a',grade:20,perks:{[ids.inoculation]:{rank:1}}},{id:'b',grade:20}]},8);
  assert.equal(calculateCharacter(owner).poisonConfig.enabled,true);
  assert.equal(calculateQuinque(owner.quinques[0]).poisonConfig.enabled,true);
  assert.equal(calculateQuinque(owner.quinques[1]).poisonConfig.enabled,false);
  const noPersonalPurchase=normalizeCharacter({...owner,perks:{}},8);
  assert.equal(calculateCharacter(noPersonalPurchase).poisonConfig.enabled,false);
  assert.equal(calculateQuinque(noPersonalPurchase.quinques[0]).poisonConfig.enabled,true);
});
