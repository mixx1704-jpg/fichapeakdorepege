import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const vite = await createServer({ configFile:false, server:{middlewareMode:true,hmr:false} });
after(()=>vite.close());
const progression = await vite.ssrLoadModule('/app/combat-progression.ts');
const { calculateCharacter, normalizeCharacter } = await vite.ssrLoadModule('/app/character.ts');
const { calculateQuinque, normalizeQuinque } = await vite.ssrLoadModule('/app/quinque.ts');
const { calculateKakujaAccuracy, KakujaPanel } = await vite.ssrLoadModule('/app/KakujaPanel.tsx');
const { QuickRoll, Rulebook } = await vite.ssrLoadModule('/app/ReworkUI.tsx');
const { blankKakujaState } = await vite.ssrLoadModule('/app/kakuja-data.ts');
const expected=[20,40,40,80,80,120,120,160,160,200,200,250,250,300,300,350,350,400,400,400];
const base=patch=>normalizeCharacter({species:'ghoul',grade:18,kaguneActive:true,baseAttributes:{forca:4,vigor:4,controle:4},...patch},8);
const check=(formula,sides)=>{assert.equal((formula.match(/\+1d\d+/g)||[]).length,1,formula);assert.ok(formula.endsWith(`+1d${sides}`),formula);assert.ok(progression.parseAccuracyRoll(formula),formula);};

test('every level uses the agreed tier, with exactly one extra die in all seven character tests',()=>{
 for(let grade=1;grade<=20;grade++){
  assert.equal(progression.combatLevelDieSides(grade),expected[grade-1]);
  const sheet=base({grade,kakuja:{...blankKakujaState(),active:true,cannibalPE:200}}),snapshot=JSON.stringify(sheet);
  const d=calculateCharacter(sheet);
  for(const key of ['physicalHitTest','kaguneTest','blockTest','dodgeTest','kakujaKaguneTest','kakujaBlockTest','kakujaDodgeTest'])check(d[key],expected[grade-1]);
  assert.equal(JSON.stringify(sheet),snapshot);
  assert.equal(calculateCharacter(sheet).kaguneTest,d.kaguneTest);
  assert.ok(!Object.values(d.attributeTests).some(f=>f.includes(`+1d${expected[grade-1]}`)));
 }
});

test('physical attacks and defenses cover every species and unavailable dodge stays unavailable',()=>{
 for(const species of ['humano','humano-dominante','ghoul','ghoul-artificial','ghoul-dominante','quinx']){
  const d=calculateCharacter(base({species}));for(const key of ['physicalHitTest','kaguneTest','blockTest','dodgeTest'])check(d[key],400);
 }
 assert.equal(progression.applyCombatLevelDie({dodgeTest:'Indisponível — Postura sem Retorno'},20).dodgeTest,'Indisponível — Postura sem Retorno');
});

test('Quinque has one die from its own level, independent of carrier level and hit multipliers',()=>{
 const carrier=base({grade:20,customSkills:[{id:'factor',name:'Factor',cost:0,activation:'passive',enabled:true,effects:[{id:'multiply',type:'hit-dice',operation:'multiply',value:1.5,scope:'both',attribute:'forca'}]}]});
 for(let grade=1;grade<=20;grade++){
  const q=normalizeQuinque({grade,creationGrade:1,rcType:'Koukaku',attributes:{vigor:4}}),snapshot=JSON.stringify(q);
  for(const owner of [undefined,carrier]){const d=calculateQuinque(q,owner);for(const key of ['kaguneTest','blockTest','dodgeTest'])check(d[key],expected[grade-1]);}
  assert.equal(JSON.stringify(q),snapshot);
 }
 const low=calculateQuinque(normalizeQuinque({grade:2}),carrier);assert.ok(low.kaguneTest.endsWith('+1d40'));
});

test('extra level die is excluded from fixed accuracy and preserved by Kakuja multipliers',()=>{
 assert.equal(progression.fixedAccuracyTotal('1d20+100-5+1d400'),95);
 assert.equal(calculateKakujaAccuracy('1d20+100+1d400',20,1.5),'1d20+100+1d400+20+60');
 assert.equal(progression.fixedAccuracyTotal(calculateKakujaAccuracy('1d20+100+1d400',20,1.5)),180);
});

test('quick roll rolls real d400, preserves main natural for criticals, supports prior formulas and rejects malformed input',()=>{
 let sides=[];let rolled=progression.rollAccuracyTest('1d20+100-5+1d400',die=>{sides.push(die);return die;});
 assert.deepEqual(sides,[20,400]);assert.equal(rolled.die,20);assert.equal(rolled.total,515);assert.equal(rolled.bonusRolls[0].value,400);
 assert.equal(progression.rollAccuracyTest('1d30+5+1d400',()=>1).total,7);
 assert.equal(progression.rollAccuracyTest('1d10+2+10d10',()=>1).total,13);
 for(const bad of ['1d20+1d400garbage','1d20+999d400','1d20-1d400','Indisponível'])assert.equal(progression.parseAccuracyRoll(bad),null);
});

test('rendered quick roll, rulebook and Kakuja display the progressing die',()=>{
 const quick=renderToStaticMarkup(React.createElement(QuickRoll,{tests:[{name:'Ataque Kagune',formula:'1d20+100+1d400'}],onClose:()=>{}}));
 assert.match(quick,/Rolar d20 \+ 1d400/);assert.doesNotMatch(quick,/disabled=""[^>]*>Rolar/);
 const rules=renderToStaticMarkup(React.createElement(Rulebook,{onClose:()=>{}}));assert.match(rules,/1d400/);assert.match(rules,/Quinques usam o próprio nível/);
 const state={...blankKakujaState(),active:true,cannibalPE:200};const panel=renderToStaticMarkup(React.createElement(KakujaPanel,{grade:18,species:'ghoul',vigor:4,kaguneSteps:10,kaguneTest:'1d20+100+1d400',blockTest:'1d20+30+1d400',dodgeTest:'1d20+20+1d400',kaguneDurability:20,kaguneFamilies:['Rinkaku'],state,onChange:()=>{}}));
 assert.ok((panel.match(/1d400/g)||[]).length>=3);
});
