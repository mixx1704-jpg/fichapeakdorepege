import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {emptyTacticalState,normalizeTacticalState,tacticalTechniques,tacticalRCCost,tacticalAvailability,tacticalPreview,resolveTactical,tacticalSummary,tacticalId:id}=await vite.ssrLoadModule('/app/tactical.ts');
const technique=suffix=>tacticalTechniques.find(t=>t.id===id(suffix));
const context={level:20,species:'ghoul',attributes:{forca:15,vigor:15,precisao:15,agilidade:15,raciocinio:15,percepcao:15,presenca:15,controle:15},ownedPerks:Object.fromEntries(tacticalTechniques.map(t=>[t.id,{rank:1}])),currentRC:50,maxLife:100,currentLife:80,control:15,weaponKind:'kagune',weaponActive:true};
const state=patch=>normalizeTacticalState({...emptyTacticalState(),...patch});

test('Ponto Final aplica multiplicador ao máximo uma vez antes da RD; derivados já recebem bruto confirmado',()=>{
  const maximum=tacticalTechniques.find(t=>t.effect==='maximum');
  const s=state({inputs:{targetRD:10,damage:200}});
  const c={...context,damageFormula:'1d100+15',damageMultiplier:1.2};
  assert.equal(tacticalPreview(maximum,s,c).amount,138);
  assert.match(tacticalPreview(maximum,s,c).description,/dano 128/);
  const flurry=tacticalTechniques.find(t=>t.effect==='flurry');
  assert.equal(tacticalPreview(flurry,s,c).amount,140,'um derivado não multiplica novamente o bruto confirmado');
});

test('custos táticos sem modificadores preservam os valores anteriores e técnicas gratuitas',()=>{
  for(const t of tacticalTechniques)assert.equal(tacticalRCCost(t.rc,emptyTacticalState()),t.rc,t.id);
  assert.equal(tacticalRCCost(0,emptyTacticalState(),{rcDiscount:2,rcCostIncrease:9,rcCostMultiplier:3}),0);
});

test('descontos, acréscimos e multiplicador são aplicados uma vez e arredondam o custo final',()=>{
  assert.equal(tacticalRCCost(8,emptyTacticalState(),{rcDiscount:2,rcCostIncrease:1,rcCostMultiplier:.75}),5);
  assert.equal(tacticalRCCost(8,emptyTacticalState(),{rcDiscount:2.9,rcCostIncrease:1.9,rcCostMultiplier:.75}),5);
  assert.equal(tacticalRCCost(3,emptyTacticalState(),{rcDiscount:3}),1);
  assert.equal(tacticalRCCost(8,emptyTacticalState(),{rcCostMultiplier:0}),1);
  for(const invalid of [NaN,Infinity,-Infinity])assert.equal(tacticalRCCost(8,emptyTacticalState(),{rcDiscount:invalid,rcCostIncrease:invalid,rcCostMultiplier:invalid}),8);
});

test('disponibilidade, prévia, resolução e recibo usam o mesmo custo modificado',()=>{
  const t=technique('detonacao-toxica');
  const s=state({inputs:{doses:2,poisonPerDose:10,targetRD:0}});
  const c={...context,currentRC:1,rcDiscount:2};
  assert.equal(tacticalAvailability(t,s,c),'');
  assert.equal(tacticalPreview(t,s,c).rcCost,1);
  const result=resolveTactical(s,{type:'use',id:t.id},c);
  assert.ok(!result.error);
  assert.equal(result.rcCost,1);
  assert.equal(result.receipt.rcCost,1);
  assert.match(tacticalSummary(result.receipt),/\n1 RC\n/);
  assert.equal(c.currentRC,1,'a resolução devolve o gasto sem alterar o contexto compartilhado');
});

test('acréscimo de custo bloqueia antes de consumir condições, doses ou o turno',()=>{
  const t=technique('detonacao-toxica');
  const s=state({inputs:{doses:2,poisonPerDose:10}});
  const before=JSON.stringify(s);
  const c={...context,currentRC:3,rcCostIncrease:1};
  assert.match(tacticalAvailability(t,s,c),/4 necessários/);
  const result=resolveTactical(s,{type:'use',id:t.id},c);
  assert.match(result.error,/4 necessários/);
  assert.equal(result.rcCost,0);
  assert.equal(result.state.inputs.doses,2);
  assert.deepEqual(result.state.usedTurn,{});
  assert.equal(JSON.stringify(s),before);
});

test('crédito de Carne como Combustível paga o custo ajustado e é consumido uma vez',()=>{
  const t=technique('laco-constritor');
  const s=state({credit:{amount:2,expires:3},inputs:{confirmed:true,roll:1}});
  const c={...context,currentRC:0,rcDiscount:1,rcCostMultiplier:.75};
  assert.equal(tacticalRCCost(t.rc,s,c),0);
  const result=resolveTactical(s,{type:'use',id:t.id},c);
  assert.ok(!result.error);
  assert.equal(result.rcCost,0);
  assert.equal(result.state.credit,null);
  assert.equal(s.credit.amount,2);
  assert.equal(tacticalRCCost(6,state({credit:{amount:2,expires:3}}),{rcDiscount:1,rcCostMultiplier:.75}),1);
});

test('desconto não contorna supressão de RC, requisitos ou uso por sessão',()=>{
  const t=technique('ultimo-pulso');
  const s=state({inputs:{incomingDamage:80}});
  const c={...context,rcDiscount:99,currentRC:1};
  assert.match(tacticalAvailability(t,s,{...c,isRCSuppressed:true}),/suprimido/);
  assert.match(tacticalAvailability(t,s,{...c,species:'humano',weaponKind:'nenhum'}),/Exige/);
  const used=resolveTactical(s,{type:'use',id:t.id},c);
  assert.ok(!used.error);
  assert.equal(used.rcCost,1);
  const reset=resolveTactical(used.state,{type:'combat'},c).state;
  assert.match(tacticalAvailability(t,reset,c),/sessão/);
});
