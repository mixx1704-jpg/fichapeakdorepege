import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
import {accuracyTotal} from './test-helpers.mjs';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const character=await vite.ssrLoadModule('/app/character.ts');
const quinque=await vite.ssrLoadModule('/app/quinque.ts');
const tools=await vite.ssrLoadModule('/app/combat-tools.ts');
const attrs={forca:8,vigor:8,precisao:8,agilidade:8,raciocinio:8,percepcao:8,presenca:8,controle:8};
const owned=(...ids)=>Object.fromEntries(ids.map(id=>[`r26-${id}`,{rank:1}]));

test('Quinque percentages include positive and negative manual accuracy modifiers exactly once',()=>{
 for(const hitModifier of [9,-9,0]){
  const weapon=quinque.normalizeQuinque({rulesVersion:8,grade:20,rcType:'Koukaku',attributes:attrs,hitDice:4,hitModifier});
  const base=quinque.calculateQuinque(weapon);
  const scaled=quinque.calculateQuinque({...weapon,perks:owned('escala-acuracia-progressiva','escala-pico-predatorio')});
  const subtotal=accuracyTotal(base.kaguneTest);
  assert.equal(accuracyTotal(scaled.kaguneTest),subtotal+Math.floor(subtotal*25/100));
  assert.equal(scaled.scaling.totals.kaguneHit,accuracyTotal(scaled.kaguneTest));
 }
});
test('stale manifestation cannot enable poison without an equipped Kagune',()=>{
 const s=character.normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,weaponKind:'nenhum',kaguneActive:true,baseAttributes:attrs,perks:owned('veneno-inoculacao','veneno-corrosivo')},8);
 assert.equal(character.calculateCharacter(s).poisonConfig.enabled,false);
 assert.equal(character.calculateCharacter({...s,weaponKind:'kagune'}).poisonConfig.enabled,true);
});
test('RC suppression blocks biological attacks and poison without deleting the saved reserve or purchases',()=>{
 const s=character.normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,weaponKind:'kagune',kaguneActive:true,colossoActive:true,currentRC:10,baseAttributes:attrs,effects:{'multiplas-caudas':{rank:2}},perks:owned('colosso-carne','veneno-inoculacao','escala-reservatorio-rc','escala-coracao-rc')},8);
 const before=character.calculateCharacter(s);
 s.vats.rcSuppressedUntil=s.vats.turn+2;
 const during=character.calculateCharacter(s);
 assert.equal(during.rcSuppressed,true);
 assert.equal(during.poisonConfig.enabled,false);
 assert.equal(during.colosso.active,false);
 assert.equal(during.maxRC,before.maxRC,'reservoir bonuses persist while RC is unavailable');
 assert.equal(s.currentRC,10);
 assert.equal(s.kaguneActive,true,'calculation never rewrites the saved sheet');
 assert.deepEqual(character.normalizeCharacter(JSON.parse(JSON.stringify(s)),8).perks,s.perks);
});
test('a fused critical combines the dice of each part and adds fixed critical bonuses only once',()=>{
 const r=tools.prepareCriticalAttack({steps:5,flat:2,confirmed:true,perks:owned('critico-trauma'),context:{level:20,attributes:attrs},parts:3,ordinaryFormula:'3d12+3d4+6'});
 assert.equal(r.formula,'3d16+26'); // Three seven-step critical parts, one level-20 flat bonus.
 assert.equal(r.bonusSteps,2);assert.equal(r.flatBonus,20);
 assert.equal(tools.prepareCriticalAttack({steps:5,flat:2,confirmed:false,parts:3,ordinaryFormula:'3d12+3d4+6'}).formula,'3d12+3d4+6');
});
test('critical range purchases use the same cumulative budget on a Quinque and refund every rank',()=>{
 const q=quinque.normalizeQuinque({rulesVersion:8,grade:20,creationGrade:20,attributes:attrs});
 const base=quinque.calculateQuinque(q);
 for(const [rank,cost] of [[1,30],[2,70],[3,120],[4,180]]){
  const d=quinque.calculateQuinque({...q,perks:{'r26-critico-faixa':{rank}}});
  assert.equal(d.spent-base.spent,cost);assert.equal(d.remaining,base.remaining-cost);
 }
 assert.equal(quinque.calculateQuinque({...q,perks:{}}).remaining,base.remaining);
});
test('critical confirmations survive export and cannot leak into another weapon',()=>{
 const q=quinque.normalizeQuinque({rulesVersion:8,combatTools:{criticalConfirmed:true}});
 assert.equal(quinque.normalizeQuinque(JSON.parse(JSON.stringify(q))).combatTools.criticalConfirmed,true);
 assert.equal(quinque.normalizeQuinque().combatTools.criticalConfirmed,false);
 assert.equal(tools.normalizeCombatTools({criticalConfirmed:'yes'}).criticalConfirmed,false);
});
