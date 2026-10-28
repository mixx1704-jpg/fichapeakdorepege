import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
const vite = await createServer({ configFile:false, server:{middlewareMode:true,hmr:false} });
after(()=>vite.close());
const { blankKakujaState, kakujaAccuracyTest, kakujaCaps, kakujaModuleCost } = await vite.ssrLoadModule('/app/kakuja-data.ts');
const { calculateKakujaSteps, calculateKakujaDurability, KakujaPanel } = await vite.ssrLoadModule('/app/KakujaPanel.tsx');
const { calculateKakujaPerkBonuses:bonus, kakujaPerks, kakujaPerksCost, kakujaPEKPerksCost } = await vite.ssrLoadModule('/app/kakuja-perks.ts');
const { normalizeQuinque, calculateQuinque } = await vite.ssrLoadModule('/app/quinque.ts');
const { normalizeCharacter, calculateCharacter, registerEarnedPE, advanceGradeIfReady } = await vite.ssrLoadModule('/app/character.ts');
const sum = command => [...command.matchAll(/[+-]\d+/g)].reduce((total,item)=>total+Number(item[0]),0);
const state = patch => ({...blankKakujaState(),cannibalPE:80,active:true,complete:true,...patch});

test('Kakuja preserves single sanity die and legacy additive hit modifiers',()=>{
  assert.equal(kakujaAccuracyTest('48d8++18>>7',6),'1d20+48+18+6');
  assert.equal(kakujaAccuracyTest('1d30+48+18',6),'1d30+48+18+6');
  assert.equal(kakujaAccuracyTest('1d10+48+18',-3),'1d10+48+18-3');
  assert.ok(kakujaCaps[20].passiveSteps > kakujaCaps[14].passiveSteps);
  for(let level=6;level<=20;level++) assert.ok(kakujaPerks.some(p=>p.currency==='PE-K'&&p.grade===level),`Level ${level}`);
});

test('Kakuja perks apply explicit bonuses and respect race, level, family, form and activation',()=>{
  const saved=state({selectedPerks:['k20-instinto-soberano','k20-ukaku-tempestade','k20-sobrecarga-assassina']});
  assert.equal(bonus(saved,14,'ghoul',['Ukaku']).accuracy,11);
  assert.equal(bonus({...saved,activeTechniques:['k20-sobrecarga-assassina']},14,'ghoul',['Ukaku']).accuracy,19);
  assert.equal(bonus({...saved,activeTechniques:['k20-sobrecarga-assassina']},14,'ghoul',['Ukaku']).extraAttacks,1);
  assert.equal(bonus(saved,14,'ghoul',['Ukaku']).extraAttacks,0);
  assert.equal(bonus(saved,14,'ghoul',['Koukaku']).accuracy,5);
  for(const invalid of [bonus(saved,5,'ghoul',['Ukaku']),bonus(saved,14,'humano',['Ukaku']),bonus({...saved,active:false},14,'ghoul',['Ukaku'])]) assert.equal(invalid.accuracy,0);
  const apex=state({complete:false,selectedPerks:['k20-deus-devorador']});
  assert.equal(bonus(apex,20,'ghoul',['Ukaku']).steps,0);
  assert.equal(bonus({...apex,complete:true},20,'ghoul',['Ukaku']).steps,60);
});

test('endgame Kakuja purchases limit accuracy and defenses to twenty without reducing other effects',()=>{
  const expected = {
    'k20-olhar-do-rei': { accuracy:20, block:15, dodge:15 },
    'k20-bikaku-perfeito': { accuracy:20, steps:30, rd:18, regeneration:12 },
    'k20-deus-devorador': { accuracy:20, steps:60, modifier:40 },
    'k20-soberano-eterno': { block:20, dodge:20, rd:40, regeneration:30, reserve:100 },
  };
  for(const [id, effects] of Object.entries(expected)){
    const perk=kakujaPerks.find(item=>item.id===id);
    assert.ok(perk,id);
    const actual=bonus(state({selectedPerks:[id]}),20,'ghoul',['Bikaku']);
    for(const [key,value] of Object.entries(effects))assert.equal(actual[key],value,`${id}: ${key}`);
    assert.doesNotMatch(perk.effect,/\+(?:22|25|30) acerto|\+25 bloqueio/);
  }
  for(const perk of kakujaPerks.filter(item=>item.currency==='PE-K'&&item.grade>=18)){
    for(const key of ['accuracy','block','dodge'])assert.ok((perk.bonuses[key]||0)<=20,`${perk.id}: ${key}`);
  }
  const stacked=bonus(state({selectedPerks:['k20-olhar-do-rei','k20-bikaku-perfeito','k20-deus-devorador']}),20,'ghoul',['Bikaku']);
  assert.equal(stacked.accuracy,60,'the limit applies to each perk rather than to the character total');
});

test('authorial Kakuja costs use PE-K and only affect manifested Kakuja',()=>{
  const custom={id:'own',name:'Coroa',cost:17,activation:'active',enabled:true,effects:[
    {id:'hit',type:'hit-dice',value:9,scope:'kagune',attribute:'controle'},
    {id:'guard',type:'block-dice',value:7,scope:'kagune',attribute:'vigor'},
    {id:'steps',type:'damage-steps',value:20,scope:'kagune',attribute:'forca'}]};
  const own=state({customSkills:[custom],selectedPerks:['k20-instinto-soberano']});
  assert.equal(bonus(own,14,'ghoul',['Ukaku']).accuracy,14);
  assert.equal(bonus(own,14,'ghoul',['Ukaku']).block,12);
  assert.equal(bonus({...own,customSkills:[{...custom,enabled:false}]},14,'ghoul',['Ukaku']).accuracy,5);
  assert.equal(kakujaPerksCost(own.selectedPerks),0);
  assert.equal(kakujaPEKPerksCost(own.selectedPerks),5);
  const sheet=normalizeCharacter({rulesVersion:8,grade:14,species:'ghoul',kakuja:own},8);
  const base=calculateCharacter({...sheet,kakuja:state({})}),applied=calculateCharacter(sheet);
  assert.equal(applied.peSpent,base.peSpent);
  assert.equal(sum(applied.blockTest)-sum(base.blockTest),0);
  assert.equal(sum(applied.kakujaBlockTest)-sum(base.kakujaBlockTest),12);
  assert.equal(applied.kaguneSteps,base.kaguneSteps);
});

test('Quinque legacy PE and every level survive normalization without repeated migration',()=>{
  const old=normalizeQuinque({grade:14,creationGrade:4,earnedPE:0,progressPE:0});
  assert.equal(calculateQuinque(old).available,222);
  assert.deepEqual(normalizeQuinque(JSON.parse(JSON.stringify(old))),old);
  for(let level=1;level<=20;level++) assert.equal(normalizeQuinque({rulesVersion:8,grade:level}).grade,level);
  let fresh=normalizeQuinque({rulesVersion:8,grade:1,creationGrade:1});
  fresh=advanceGradeIfReady(registerEarnedPE(fresh,5));
  assert.equal(fresh.grade,2);assert.equal(fresh.progressPE,0);
  assert.equal(calculateQuinque(fresh).available,14);
});

test('Quinque keeps d20 and adds all manual hit modifiers exactly once',()=>{
  const q=normalizeQuinque({rulesVersion:8,grade:12,attributes:{vigor:8,controle:11},rcType:'Koukaku'});
  const base=calculateQuinque(q),boosted=calculateQuinque({...q,hitDice:40,hitModifier:18});
  assert.match(boosted.kaguneTest,/^1d20/);
  assert.equal(sum(boosted.kaguneTest)-sum(base.kaguneTest),58);
  assert.equal(sum(calculateQuinque({...q,attributes:{...q.attributes,controle:0}}).kaguneTest),sum(base.kaguneTest));
});

test('Kakuja costs round down, including odd CB and dominant discount, keeping the minimum',()=>{
  assert.equal(kakujaModuleCost({cb:7},false),3);
  assert.equal(kakujaModuleCost({cb:8},true),2);
  assert.equal(kakujaModuleCost({cb:7},false,true),4);
  assert.equal(kakujaModuleCost({cb:4},true),1);
  assert.equal(kakujaModuleCost({cb:1},false),1);
  assert.equal(calculateKakujaSteps(2.8,0.4,0.9),4);
  assert.equal(calculateKakujaDurability(10.9,10.9,true),16);
  assert.equal(calculateKakujaDurability(10.9,10.9,false),21);
  assert.equal(kakujaAccuracyTest('1d20+10',1.9),'1d20+10+1');
  assert.equal(kakujaAccuracyTest('1d20+10',-1.2),'1d20+10-2');
});

test('Quinque final numbers round down while saved fractional adjustments remain intact',()=>{
  const weapon=normalizeQuinque({rulesVersion:8,grade:1,creationGrade:1,bonusPE:4.9,rdOverride:2.9,durabilityOverride:9.9,hitModifier:-0.2});
  const snapshot=JSON.parse(JSON.stringify(weapon));
  const derived=calculateQuinque(weapon);
  assert.equal(derived.available,13);assert.equal(derived.rd,2);assert.equal(derived.durability,9);
  assert.equal(derived.hitModifier,-1);assert.match(derived.kaguneTest,/-1$/);
  assert.deepEqual(weapon,snapshot);
});

test('Kakuja odd-level control difficulty rounds down in the rendered panel',async()=>{
  const { default:React }=await import('react');
  const { renderToStaticMarkup }=await import('react-dom/server');
  const saved=state({complete:false,cannibalPE:80.9,advantageAccuracy:0.9,advantageSteps:0.9});
  const snapshot=JSON.parse(JSON.stringify(saved));
  const html=renderToStaticMarkup(React.createElement(KakujaPanel,{grade:7,species:'ghoul',vigor:3,kaguneSteps:2,kaguneTest:'1d20+10',kaguneDurability:10,kaguneFamilies:['Ukaku'],state:saved,onChange:()=>{}}));
  assert.match(html,/Controle MD 3/);
  assert.doesNotMatch(html,/value="80\.9"/);
  assert.match(html,/1d20\+10\+3/);
  assert.deepEqual(saved,snapshot);
});
