import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const biology=await vite.ssrLoadModule('/app/kakuja-biology.ts');
const {kakujaBiologyPerks:catalog}=await vite.ssrLoadModule('/app/kakuja-biology-perks.ts');
const {blankKakujaState}=await vite.ssrLoadModule('/app/kakuja-data.ts');
const perks=await vite.ssrLoadModule('/app/kakuja-perks.ts');
const {normalizeCharacter,calculateCharacter}=await vite.ssrLoadModule('/app/character.ts');
const {attributeKeys}=await vite.ssrLoadModule('/app/data.ts');
const attributes=Object.fromEntries(attributeKeys.map(key=>[key,15]));
const families=['Ukaku','Koukaku','Rinkaku','Bikaku'];
const state=patch=>({...blankKakujaState(),active:true,complete:true,cannibalPE:100,...patch});
const selected=(...suffixes)=>state({selectedPerks:suffixes.map(suffix=>`kbio-${suffix}`)});
const calculate=(source,level=20,species='ghoul',types=families,attrs=attributes)=>biology.calculateKakujaBiology(source,level,species,types,attrs);
const empty=()=>calculate(state({selectedPerks:[]}));
const all=()=>calculate(state({selectedPerks:catalog.map(perk=>perk.id)}));
const sheet=patch=>normalizeCharacter({rulesVersion:8,grade:20,species:'ghoul',narrativeLimits:true,
  weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,baseAttributes:attributes,
  currentLife:100,currentSanity:50,currentRC:100,kakuja:state({}),...patch},8);

test('36 biological purchases are passive, unique and paid exclusively with PE-K',()=>{
  assert.equal(catalog.length,36);
  assert.equal(new Set(catalog.map(perk=>perk.id)).size,36);
  assert.equal(new Set(perks.kakujaPerks.map(perk=>perk.id)).size,perks.kakujaPerks.length);
  for(const perk of catalog){
    assert.equal(perk.activation,'passive',perk.id);
    assert.equal(perk.currency,'PE-K',perk.id);
    assert.ok(Number.isInteger(perk.cost)&&perk.cost>0,perk.id);
    assert.ok(perks.kakujaPerks.some(item=>item.id===perk.id),perk.id);
  }
  const ids=catalog.map(perk=>perk.id);
  assert.equal(perks.kakujaPerksCost(ids),0);
  assert.equal(perks.kakujaPEKPerksCost([...ids,...ids]),catalog.reduce((sum,perk)=>sum+perk.cost,0));
});

test('eight Level20 biological capstones require a complete form, attribute15 and200–400PE-K',()=>{
  const apex=catalog.filter(perk=>perk.grade===20);
  assert.equal(apex.length,8);
  for(const perk of apex){
    assert.ok(perk.cost>=200&&perk.cost<=400,perk.id);
    assert.equal(perk.requiresComplete,true,perk.id);
    assert.equal(perk.requiresAttribute?.min,15,perk.id);
    assert.ok(attributeKeys.includes(perk.requiresAttribute?.attribute),perk.id);
    for(const key of ['accuracy','block','dodge'])assert.ok((perk.bonuses[key]||0)<=20,`${perk.id}:${key}`);
  }
});

test('retraction, low level, insufficient cannibalPE and non-ghouls suppress all biology',()=>{
  const owned=selected('miofibras','lamelas','juntas');
  assert.ok(calculate(owned).names.length>0);
  for(const source of [{...owned,active:false},{...owned,cannibalPE:24}])assert.deepEqual(calculate(source),empty());
  assert.deepEqual(calculate(owned,5),empty());
  for(const species of ['humano','humano-dominante','quinx'])assert.deepEqual(calculate(owned,20,species),empty());
  for(const species of ['ghoul','ghoul-dominante','ghoul-artificial'])assert.ok(calculate(owned,20,species).names.length>0);
});

test('family, complete-form and attribute requirements also gate fixed Kakuja bonuses',()=>{
  const perk=catalog.find(perk=>perk.id==='kbio-ukaku-fornalha');
  const owned=selected('ukaku-fornalha');
  assert.equal(calculate(owned,20,'ghoul',['Ukaku']).followupPercent,30);
  assert.equal(perks.calculateKakujaPerkBonuses(owned,20,'ghoul',['Ukaku'],attributes).steps,50);
  const invalid=[
    [owned,19,'ghoul',['Ukaku'],attributes],
    [owned,20,'ghoul',['Bikaku'],attributes],
    [{...owned,complete:false},20,'ghoul',['Ukaku'],attributes],
    [{...owned,cannibalPE:59},20,'ghoul',['Ukaku'],attributes],
    [owned,20,'ghoul',['Ukaku'],{...attributes,controle:14}],
    [owned,20,'ghoul',['Ukaku'],{}],
  ];
  for(const args of invalid){
    assert.equal(calculate(...args).names.length,0);
    assert.equal(perks.calculateKakujaPerkBonuses(...args).steps,0);
    assert.ok(perks.kakujaPerkMissing(perk,...args).length>0);
  }
});

test('duplicate purchases and unknown IDs cannot duplicate biology or permission text',()=>{
  const once=calculate(selected('miofibras'));
  const repeated=calculate(state({selectedPerks:['kbio-miofibras','kbio-miofibras','unknown']}));
  assert.deepEqual(repeated,once);
  assert.equal(once.names.length,1);
  assert.equal(once.permissions.length,1);
});

test('same-stat percentage growth caps at75 and applies once to each original subtotal',()=>{
  const bio=all();
  for(const key of ['stepsPercent','rdPercent','durabilityPercent','reservePercent','regenerationPercent'])assert.ok(bio[key]<=75,key);
  assert.equal(bio.stepsPercent,75);
  assert.equal(bio.rdPercent,75);
  assert.equal(bio.durabilityPercent,75);
  const original={steps:101,rd:103,ownDurability:105,reserve:107};
  const copy={...original};
  assert.deepEqual(biology.applyKakujaBiology(original,bio),{steps:176,rd:180,ownDurability:183,reserve:160});
  assert.deepEqual(original,copy,'the calculation must not mutate and later compound the base stats');
  assert.deepEqual(biology.applyKakujaBiology(original,bio),biology.applyKakujaBiology(copy,bio));
});

test('one25percent reinforcement gives125percent rather than multiplying other percentage growth',()=>{
  const bio=calculate(selected('miofibras','segmentos'));
  assert.equal(bio.stepsPercent,65);
  assert.equal(biology.applyKakujaBiology({steps:101,rd:0,ownDurability:0,reserve:0},bio).steps,166);
});

test('penetration uses the strongest source and always preserves at least half of targetRD',()=>{
  const bio=calculate(selected('serrilhas','koukaku-broca','ukaku-fornalha'));
  assert.equal(bio.penetration,30);
  assert.equal(biology.kakujaOutgoing(400,101,bio,20).effectiveRD,71);
  const strongest=biology.kakujaOutgoing(400,101,bio,99);
  assert.equal(strongest.penetration,50);
  assert.equal(strongest.ignoredRD,50);
  assert.equal(strongest.effectiveRD,51);
  assert.equal(strongest.damage,349);
  assert.equal(biology.kakujaOutgoing(10,100,bio,50).damage,0);
});

test('damage over time and general mitigation compete instead of multiplying or adding',()=>{
  const bio=calculate(selected('sangue','involucro','koukaku-fusivel','bikaku-autotomia'));
  const regular=biology.kakujaIncoming(400,0,100,bio,false,30);
  assert.equal(regular.damage,210);
  const periodic=biology.kakujaIncoming(400,0,100,bio,true,30);
  assert.equal(periodic.reduction,75);
  assert.equal(periodic.damage,75);
  assert.equal(periodic.prevented,225);
});

test('critical resistance removes only half the critical addition while preserving base damage',()=>{
  const bio=calculate(selected('malha'));
  const critical=biology.kakujaIncoming(400,100,50,bio);
  assert.equal(critical.criticalPrevented,50);
  assert.equal(critical.raw,450);
  assert.equal(critical.damage,400);
  assert.equal(biology.kakujaIncoming(400,0,50,bio).damage,350);
  assert.equal(biology.kakujaIncoming(400,101,50,bio).criticalPrevented,50);
});

test('passive regeneration percentages use one subtotal and a separate floored life fraction',()=>{
  const bio=all();
  assert.equal(bio.regenerationPercent,75);
  assert.equal(bio.regenerationLifePercent,8);
  assert.equal(biology.kakujaRegeneration(41,503,bio),111);
  assert.equal(biology.kakujaRegeneration(0,503,empty()),0);
});

test('support, vampiric recovery and tissue repair respect missing resources and actual effects',()=>{
  const bio=all();
  const context={regeneration:101,actualHealed:19,actualEnemyDamage:1000,maxLife:503,
    missingLife:7,allyMissingLife:11,missingDurability:6};
  assert.deepEqual(biology.kakujaRecovery(bio,context),{support:11,drain:7,repair:6});
  assert.equal(biology.kakujaRecovery(bio,{...context,missingLife:500}).drain,50,'vampirism caps at10percent of maximum life');
  assert.equal(biology.kakujaRecovery(bio,{...context,actualEnemyDamage:1}).drain,0);
  assert.equal(biology.kakujaRecovery(bio,{...context,actualHealed:0}).repair,0,'overheal does not count as healing');
  assert.deepEqual(biology.kakujaRecovery(bio,{...context,missingLife:0,allyMissingLife:0,missingDurability:0}),{support:0,drain:0,repair:0});
});

test('repair uses only the strongest healing conversion and floors fractional output',()=>{
  const bio=calculate(selected('rinkaku-reposicao','coracao'));
  assert.equal(bio.repairPercent,50);
  const result=biology.kakujaRecovery(bio,{regeneration:0,actualHealed:19,actualEnemyDamage:0,
    maxLife:100,missingLife:100,allyMissingLife:100,missingDurability:100});
  assert.equal(result.repair,9);
});

test('three fronts partition one damage pool and apply each target armor separately',()=>{
  const bio=calculate(selected('polimorfia'));
  const result=biology.kakujaPartition(401,[33,33,34],[20,40,60],bio);
  assert.deepEqual(result.map(target=>target.raw),[132,132,136]);
  assert.deepEqual(result.map(target=>target.damage),[112,92,76]);
  assert.equal(result.reduce((total,target)=>total+target.raw,0),400);
  assert.throws(()=>biology.kakujaPartition(401,[50,50,1],[0,0,0],bio),/100%/);
  assert.throws(()=>biology.kakujaPartition(401,[25,25,25,25],[0,0,0,0],bio));
  assert.throws(()=>biology.kakujaPartition(401,[-1,100],[0,0],bio));
  assert.throws(()=>biology.kakujaPartition(401,[NaN],[0],bio));
  assert.throws(()=>biology.kakujaPartition(401,[50,50],[0,0],empty()));
});

test('critical followup uses postRD damage once and cannot turn a fully blocked hit into damage',()=>{
  const bio=calculate(selected('ukaku-termogenese','ukaku-fornalha'));
  assert.equal(bio.followupPercent,30);
  assert.equal(biology.kakujaOutgoing(400,100,bio).followup,99);
  assert.equal(biology.kakujaOutgoing(10,100,bio).followup,0);
});

test('wound relief floors negative results and preserves zero and positive values',()=>{
  const bio=calculate(selected('nervos'));
  assert.equal(biology.kakujaWoundPenalty(-3,bio),-2);
  assert.equal(biology.kakujaWoundPenalty(-2,bio),-1);
  assert.equal(biology.kakujaWoundPenalty(0,bio),0);
  assert.equal(biology.kakujaWoundPenalty(3,bio),3);
});

test('Kakuja biological offense and armor do not leak into ordinary Kagune or physical damage',()=>{
  const original=sheet(),base=calculateCharacter(original);
  const changed=calculateCharacter({...original,kakuja:state({selectedPerks:catalog.map(perk=>perk.id)})});
  for(const key of ['physicalSteps','physicalDamageModifier','physicalDamage','kaguneSteps','kaguneDamageModifier','kaguneDamage',
    'kaguneTest','physicalHitTest','rd','kaguneDurability','kagunePartRD','maxLife','maxRC','maxSanity']){
    assert.equal(changed[key],base[key],`${key} must remain scoped outside the Kakuja`);
  }
  assert.ok(changed.kakujaBiology.stepsPercent>0);
  assert.ok(changed.regenerationSkill>base.regenerationSkill);
  assert.ok(changed.movement>base.movement);
});

test('RC suppression and disabled Kakuhou deactivate biological support in the whole sheet',()=>{
  const original=sheet({kakuja:selected('coracao','juntas','nervos')});
  const enabled=calculateCharacter(original);
  assert.ok(enabled.kakujaBiology.names.length>0);
  for(const property of ['rcSuppressedUntil','kakuhouUntil']){
    const disabled=calculateCharacter({...original,vats:{...original.vats,[property]:original.vats.turn+2}});
    assert.equal(disabled.kakujaBiology.names.length,0,property);
    assert.equal(disabled.kakujaBiology.movement,0,property);
    assert.equal(disabled.kakujaBiology.regenerationLifePercent,0,property);
  }
});
