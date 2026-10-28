import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const critical=await vite.ssrLoadModule('/app/critical.ts');
const character=await vite.ssrLoadModule('/app/character.ts');
const damage=await vite.ssrLoadModule('/app/damage-dice.ts');
const {criticalRange,resolveCritical,criticalAttack,criticalBonuses,criticalPerks,criticalRangeCost,CRITICAL_RANGE_ID}=critical;
const ids=Object.fromEntries(criticalPerks.map(perk=>[perk.id.replace('r26-critico-',''),perk.id]));
const perks=(...names)=>Object.fromEntries(names.map(name=>[ids[name]??name,{rank:1}]));
const context={level:20,attributes:{forca:15,vigor:15,precisao:15,agilidade:15,raciocinio:15,percepcao:15,presenca:15,controle:15}};

test('critical range has exactly five percent additional d20 outcomes per rank',()=>{
  for(let rank=0;rank<=4;rank++){
    const selected={[CRITICAL_RANGE_ID]:{rank}};
    const range=criticalRange(selected,20);
    const outcomes=Array.from({length:20},(_,index)=>index+1).filter(natural=>resolveCritical(natural,20,selected).isCritical);
    assert.equal(range.minimum,20-rank);
    assert.equal(range.chancePercent,5*(rank+1));
    assert.deepEqual(outcomes,Array.from({length:rank+1},(_,index)=>20-rank+index));
  }
});

test('four purchases cost 30, 40, 50, 60 PE with cumulative totals 30, 70, 120, 180',()=>{
  const definition=criticalPerks.find(perk=>perk.id===CRITICAL_RANGE_ID);
  assert.deepEqual(definition.cost,[30,40,50,60]);
  assert.equal(definition.costMode,'sum');
  assert.equal(definition.maxRank,4);
  for(const [rank,cost] of [[0,0],[1,30],[2,70],[3,120],[4,180]]){
    const selected={[CRITICAL_RANGE_ID]:{rank}};
    assert.equal(criticalRangeCost(selected),cost);
    assert.equal(character.rankCost(definition.cost,rank,definition.costMode),cost);
  }
});

test('corrupt rank cannot extend critical range below sixteen or buy a fifth benefit',()=>{
  assert.equal(criticalRange({[CRITICAL_RANGE_ID]:{rank:999}}).minimum,16);
  assert.equal(criticalRangeCost({[CRITICAL_RANGE_ID]:{rank:999}}),180);
  for(const rank of [NaN,Infinity,-1])assert.equal(criticalRange({[CRITICAL_RANGE_ID]:{rank}}).minimum,20);
  assert.equal(criticalRange({[CRITICAL_RANGE_ID]:{rank:2.9}}).minimum,18);
});

test('d10 and d30 keep only their natural maximum even with four d20 range purchases',()=>{
  const selected={[CRITICAL_RANGE_ID]:{rank:4}};
  for(const die of [10,30]){
    const outcomes=Array.from({length:die},(_,index)=>index+1).filter(natural=>resolveCritical(natural,die,selected).isCritical);
    assert.deepEqual(outcomes,[die]);
    assert.equal(criticalRange(selected,die).minimum,die);
    assert.equal(criticalRange(selected,die).outcomes,1);
  }
});

test('modifiers do not turn a low natural die into a critical or suppress a natural maximum',()=>{
  assert.equal(resolveCritical(1,20,{}, {...context,modifier:999}).isCritical,false);
  assert.equal(resolveCritical(19,20,{}, {...context,modifier:999}).isCritical,false);
  assert.equal(resolveCritical(20,20,{}, {...context,modifier:-999}).isCritical,true);
});

test('invalid and fractional natural results do not count as critical rolls',()=>{
  for(const natural of [0,21,Infinity,NaN,19.9,-20])assert.equal(resolveCritical(natural,20).isCritical,false);
  assert.equal(resolveCritical(1,20).natural,1); // No automatic fumble rule is invented.
});

test('base critical adds fifty percent of whole damage steps and leaves fixed damage intact',()=>{
  const result=criticalAttack({steps:5.9,flat:12.9,rd:37,confirmed:true});
  assert.equal(result.baseSteps,5);
  assert.equal(result.bonusSteps,2);
  assert.equal(result.steps,7);
  assert.equal(result.flat,12);
  assert.equal(result.penetrationPercent,0);
  assert.equal(result.remainingRD,37);
  assert.equal(result.formula,'1d16+12'); // Five base steps plus floor(50%) = seven steps.
});

test('critical confirmation is explicit and does not modify an ordinary attack',()=>{
  const selected=perks('aniquilacao','incisao-absoluta','trauma');
  const result=criticalAttack({steps:11,flat:7,rd:100,confirmed:false,natural:20,perks:selected,context});
  assert.equal(result.critical,false);
  assert.equal(result.steps,11);
  assert.equal(result.flat,7);
  assert.equal(result.penetrationPercent,0);
  assert.equal(result.formula,damage.formatDamage(11,7));
});

test('when a natural die is supplied, manual confirmation cannot bypass its critical range',()=>{
  assert.equal(criticalAttack({steps:10,flat:0,confirmed:true,natural:19}).critical,false);
  assert.equal(criticalAttack({steps:10,flat:0,confirmed:true,natural:19,perks:{[CRITICAL_RANGE_ID]:{rank:1}}}).critical,true);
  assert.equal(criticalAttack({steps:10,flat:0,confirmed:true,natural:29,die:30,perks:{[CRITICAL_RANGE_ID]:{rank:4}}}).critical,false);
  assert.equal(criticalAttack({steps:10,flat:0,confirmed:true,natural:30,die:30}).critical,true);
});

test('critical damage percentages take the largest source without cascading',()=>{
  const selected=perks('impacto-ampliado','impacto-profundo','aniquilacao','colapso-controlado');
  const result=criticalAttack({steps:11,flat:0,confirmed:true,perks:selected,context});
  assert.equal(result.stepsPercent,200);
  assert.equal(result.bonusSteps,22);
  assert.equal(result.steps,33);
  assert.equal(result.flatBonus,20); // Explosive Força adds flat damage; Controle now guarantees a floor.
});

test('all capstones require level twenty and the corresponding attribute fifteen',()=>{
  for(const [id,key] of [['aniquilacao','forca'],['incisao-absoluta','precisao'],['colapso-controlado','controle']]){
    const selected=perks(id);
    const tooEarly=criticalBonuses(selected,{...context,level:19});
    const tooWeak=criticalBonuses(selected,{...context,attributes:{...context.attributes,[key]:14}});
    const active=criticalBonuses(selected,context);
    assert.equal(tooEarly.activePerks.length,0,id);
    assert.equal(tooWeak.activePerks.length,0,id);
    assert.deepEqual(active.activePerks,[ids[id]],id);
    const definition=criticalPerks.find(perk=>perk.id===ids[id]);
    assert.equal(definition.minGrade,20);
    assert.equal(definition.min,15);
    assert.ok(definition.cost>=200&&definition.cost<=400);
  }
});

test('level-gated intermediate critical perks remain dormant without deleting purchases',()=>{
  const selected=perks('impacto-ampliado','impacto-profundo','trauma');
  assert.equal(criticalBonuses(selected,{...context,level:3}).stepsPercent,50);
  assert.equal(criticalBonuses(selected,{...context,level:4}).stepsPercent,100);
  assert.equal(criticalBonuses(selected,{...context,level:14}).stepsPercent,150);
  assert.equal(Object.keys(selected).length,3);
});

test('critical fixed bonuses use original steps and level once',()=>{
  const selected=perks('trauma','massa-impacto');
  const result=criticalAttack({steps:11,flat:3,confirmed:true,perks:selected,context});
  assert.equal(result.bonusSteps,5);
  assert.equal(result.flatBonus,25); // Level20 + floor(original11/2), not floor(critical16/2).
  assert.equal(result.flat,28);
  assert.equal(result.steps,16);
});

test('critical penetration ignores at most half the original target armor once',()=>{
  const selected=perks('ruptura-certeira','ponto-fraco','incisao-absoluta');
  const result=criticalAttack({steps:10,flat:0,rd:37,confirmed:true,perks:selected,context});
  assert.equal(result.penetrationPercent,50);
  assert.equal(result.ignoredRD,18);
  assert.equal(result.remainingRD,19);
  assert.equal(result.flatBonus,30);
});

test('buying and removing range or damage perks updates immediately without changing base attributes',()=>{
  const purchased={[CRITICAL_RANGE_ID]:{rank:2},...perks('impacto-ampliado')};
  assert.equal(criticalRange(purchased).minimum,18);
  assert.equal(criticalBonuses(purchased,context).stepsPercent,100);
  const removed={...purchased};delete removed[ids['impacto-ampliado']];delete removed[CRITICAL_RANGE_ID];
  assert.equal(criticalRange(removed).minimum,20);
  assert.equal(criticalBonuses(removed,context).stepsPercent,50);
  assert.equal(context.attributes.forca,15);
});

test('critical formula and character formula share the same step ladder',()=>{
  for(const steps of [-1.1,0,1,2,3,4,5,6,7,8,9,10,14,19,25,101]){
    for(const flat of [-1.1,0,2.9]){
      assert.equal(critical.criticalDamageFormula(steps,flat),damage.formatDamage(steps,flat));
      assert.equal(character.formatDamage(steps,flat),damage.formatDamage(steps,flat));
    }
  }
  assert.equal(damage.formatDamage(5,0),'1d12');
  assert.equal(damage.formatDamage(9,0),'1d20');
});

test('corrupt damage inputs fall back to a bounded d4 formula without NaN',()=>{
  const result=criticalAttack({steps:NaN,flat:Infinity,rd:-1.5,confirmed:true});
  assert.equal(result.steps,0);
  assert.equal(result.flat,0);
  assert.equal(result.remainingRD,0);
  assert.equal(result.formula,'1d4');
  assert.ok(Object.values(result).filter(value=>typeof value==='number').every(Number.isFinite));
});

test('critical metadata remains a compact set of ten useful equipment-compatible perks',()=>{
  assert.equal(criticalPerks.length,10);
  assert.equal(new Set(criticalPerks.map(perk=>perk.id)).size,10);
  for(const perk of criticalPerks)assert.equal(perk.equipmentCompatible,true,perk.id);
  assert.equal(criticalPerks.filter(perk=>perk.minGrade===20).length,3);
});
