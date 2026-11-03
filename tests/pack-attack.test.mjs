import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {normalizeCombatTools,damageAgainstTarget,attackDamageMultiplier,normalizeDamageMultiplier,prepareCriticalAttack,attackSummary}=await vite.ssrLoadModule('/app/combat-tools.ts');
const {AttackToolsPanel}=await vite.ssrLoadModule('/app/AttackToolsPanel.tsx');
const {calculateScalingBonuses}=await vite.ssrLoadModule('/app/scaling-perks.ts');
const scaling=calculateScalingBonuses({perks:{},attributes:{},weaponActive:true},{});
const context={level:20,attributes:{controle:15,forca:15,precisao:15}};
const render=(patch={})=>renderToStaticMarkup(React.createElement(AttackToolsPanel,{
  value:normalizeCombatTools({damage:101,scope:'physical',poison:{target:{rd:20,name:'Alvo'}}}),onChange:()=>{},name:'Teste',
  physicalTest:'1d20+20',physicalDamage:'1d12+2',physicalSteps:5,physicalFlat:2,
  kaguneTest:'1d20+30',kaguneDamage:'1d16+4',kaguneSteps:7,kaguneFlat:4,
  scaling,poisonConfig:{enabled:false,control:0,level:20},criticalPerks:{},criticalContext:context,...patch,
}));
const text=html=>html.replace(/<[^>]*>/g,'');

test('multiplicador altera o dano rolado uma vez antes de descontar a RD, com frações para baixo',()=>{
  const result=damageAgainstTarget(101.9,21.9,0,0,1.5);
  assert.equal(result.rolledDamage,101);
  assert.equal(result.multiplier,1.5);
  assert.equal(result.rawDamage,151);
  assert.equal(result.remainingRD,21);
  assert.equal(result.damage,130);
  const smaller=damageAgainstTarget(101,20,0,0,.75);
  assert.equal(smaller.rawDamage,75);
  assert.equal(smaller.damage,55);
});

test('multiplicador não multiplica penetração nem combina corrosão em cascata',()=>{
  const result=damageAgainstTarget(101,101,30,80,1.5);
  assert.equal(result.penetrationPercent,50);
  assert.equal(result.ignoredRD,50);
  assert.equal(result.remainingRD,51);
  assert.equal(result.rawDamage,151);
  assert.equal(result.damage,100);
  assert.equal(damageAgainstTarget(101,101,80,30,1.5).damage,result.damage);
});

test('redução fixa de RD entra antes da maior fonte percentual, uma vez e com mínimo zero',()=>{
  const result=damageAgainstTarget(101,101,30,50,1.5,6.9);
  assert.equal(result.originalTargetRD,101);
  assert.equal(result.flatRDReduction,6);
  assert.equal(result.targetRD,95);
  assert.equal(result.ignoredRD,47);
  assert.equal(result.remainingRD,48);
  assert.equal(result.rawDamage,151);
  assert.equal(result.damage,103);
  const exhausted=damageAgainstTarget(101,4,50,50,1,6);
  assert.equal(exhausted.flatRDReduction,4);
  assert.equal(exhausted.targetRD,0);
  assert.equal(exhausted.remainingRD,0);
  assert.equal(exhausted.damage,101);
  assert.equal(damageAgainstTarget(101,101,50,50,undefined,6).damage,53);
});

test('fatores de dano e estruturas compartilham teto total de três, incluindo valores defensivos menores que um',()=>{
  assert.equal(attackDamageMultiplier(1.5,false,2),1.5);
  assert.equal(attackDamageMultiplier(1.5,true,2),3);
  assert.equal(attackDamageMultiplier(2,true,2),3);
  assert.equal(attackDamageMultiplier(.75,true,1.5),1.125);
  assert.equal(damageAgainstTarget(101,20,0,0,99).rawDamage,303);
  for(const invalid of [NaN,Infinity,-Infinity])assert.equal(normalizeDamageMultiplier(invalid),1);
  assert.equal(damageAgainstTarget(0,0,0,0,3).damage,0);
  assert.equal(damageAgainstTarget(101,20,0,0,0).damage,0);
});

test('sem fator novo, a API e o resultado legados continuam iguais',()=>{
  const legacy=damageAgainstTarget(101,20,0,0);
  assert.deepEqual(legacy,{rawDamage:101,targetRD:20,penetrationPercent:0,ignoredRD:0,remainingRD:20,damage:81});
  const explicit=damageAgainstTarget(101,20,0,0,1);
  assert.equal(explicit.damage,legacy.damage);
  assert.equal(explicit.rolledDamage,101);
  assert.equal(explicit.multiplier,1);
  assert.equal(attackDamageMultiplier(),1);
});

test('copiar o resultado inclui o fator, o dano antes da RD e a mitigação completa',()=>{
  for(const [multiplier,expected] of [[1.5,'1,5'],[.75,'0,75']]){
    const result=damageAgainstTarget(101,20,0,0,multiplier);
    const summary=attackSummary({name:'Ataque',target:'Alvo',test:'1d20+20',formula:'1d12+2',result});
    assert.ok(summary.includes(`101 × ${expected} = ${result.rawDamage} antes da RD`));
    assert.ok(summary.includes(`${result.rawDamage} − 20 = ${result.damage}`));
    assert.match(summary,/Dano para rolar: 1d12\+2/);
  }
  const noEffects=attackSummary({name:'Ataque',target:'Alvo',test:'1d20+20',formula:'1d12+2',result:damageAgainstTarget(101,20,0,0,1)});
  assert.match(noEffects,/Resultado do dano: 101\n/);
  assert.doesNotMatch(noEffects,/×/);
  const reduction=attackSummary({name:'Ataque',target:'Alvo',test:'1d20+20',formula:'1d12+2',result:damageAgainstTarget(101,101,50,0,1.5,6)});
  assert.match(reduction,/RD do alvo: 101; redução fixa: −6; RD antes da penetração: 95; penetração: 50%/);
});

test('marcação de estrutura é opcional, persiste no alvo e normaliza fichas antigas sem marcar',()=>{
  assert.equal(normalizeCombatTools().targetStructure,false);
  assert.equal(normalizeCombatTools({targetStructure:'true'}).targetStructure,false);
  const state=normalizeCombatTools({targetStructure:true,damage:101});
  assert.equal(normalizeCombatTools(JSON.parse(JSON.stringify(state))).targetStructure,true);
  assert.equal(normalizeCombatTools({...state,targetStructure:false}).targetStructure,false);
});

test('painel seleciona fator físico/Kagune, exibe cálculo numérico e só oferece estrutura quando aplicável',()=>{
  const physical=render({damageMultipliers:{physical:1.5,kagune:2},structureDamageMultiplier:2});
  assert.match(text(physical),/Dano antes da RD: 101 × 1,5 = 151/);
  assert.match(physical,/Alvo é uma estrutura/);
  assert.match(physical,/Dano para rolar <code>1d12\+2<\/code>/);
  const kagune=render({value:normalizeCombatTools({scope:'kagune',damage:101,poison:{target:{rd:20}}}),damageMultipliers:{physical:1.5,kagune:2}});
  assert.match(text(kagune),/Dano antes da RD: 101 × 2 = 202/);
  assert.doesNotMatch(kagune,/Alvo é uma estrutura/);
  const plain=render();
  assert.doesNotMatch(plain,/Dano antes da RD:/);
});

test('painel soma fator de estrutura apenas com o alvo marcado e limita o produto final',()=>{
  const value=normalizeCombatTools({damage:101,scope:'physical',targetStructure:true,poison:{target:{rd:20}}});
  const markup=render({value,damageMultipliers:{physical:2,kagune:1},structureDamageMultiplier:2});
  assert.match(text(markup),/Dano antes da RD: 101 × 3 = 303/);
  assert.match(markup,/checked=""[^>]*\/>Alvo é uma estrutura/);
  const reduction=render({damageMultipliers:{physical:.75,kagune:1}});
  assert.match(text(reduction),/Dano antes da RD: 101 × 0,75 = 75/);
  const fixedRD=render({targetRDReduction:6,scaling:{...scaling,penetrationPercent:50}});
  assert.match(text(fixedRD),/RD antes da penetração: 20 − 6 = 14/);
  assert.match(text(fixedRD),/máximo\(0, 101 − 7\)/);
});

test('piso crítico é aplicado antes do fator e o resultado da rolagem zero não gera dano',()=>{
  const criticalPerks={'r26-critico-colapso-controlado':{rank:1}};
  const critical=prepareCriticalAttack({steps:5,flat:2,confirmed:true,perks:criticalPerks,context,ordinaryFormula:'1d12+2'});
  assert.equal(critical.minimumRawDamage,60);
  const value=normalizeCombatTools({damage:1,scope:'physical',criticalConfirmed:true,poison:{target:{rd:20}}});
  const markup=render({value,criticalPerks,damageMultipliers:{physical:1.5,kagune:1}});
  assert.match(text(markup),/Dano antes da RD: 60 × 1,5 = 90/);
  assert.match(text(markup),/máximo\(0, 90 − 20\)/);
  const empty=render({value:{...value,damage:0},criticalPerks,damageMultipliers:{physical:1.5,kagune:1}});
  assert.match(text(empty),/Dano antes da RD: 0 × 1,5 = 0/);
});

test('crítico e Colosso mantêm os mesmos dados; o fator entra só no resultado unido',()=>{
  const input={steps:5,flat:2,confirmed:true,perks:{'r26-critico-trauma':{rank:1}},context,parts:3,sharedSteps:2,sharedFlat:1,ordinaryFormula:'3d12+6'};
  const critical=prepareCriticalAttack(input);
  const before=JSON.stringify(critical);
  const result=damageAgainstTarget(203,50,0,0,1.5);
  assert.equal(result.rawDamage,304);
  assert.equal(result.damage,254);
  assert.equal(JSON.stringify(prepareCriticalAttack(input)),before);
  const markup=render({value:normalizeCombatTools({scope:'kagune',damage:203,criticalConfirmed:true,poison:{target:{rd:50}}}),kaguneSteps:5,kaguneFlat:2,kaguneDamage:'3d12+6',criticalPerks:input.perks,fusedParts:3,sharedSteps:2,sharedFlat:1,damageMultipliers:{physical:1,kagune:1.5}});
  assert.ok(markup.includes(`<code>${critical.formula}</code>`));
  assert.match(text(markup),/Dano antes da RD: 203 × 1,5 = 304/);
});
