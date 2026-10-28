import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {normalizeCharacter,calculateCharacter}=await vite.ssrLoadModule('/app/character.ts');
const {normalizeQuinque,calculateQuinque}=await vite.ssrLoadModule('/app/quinque.ts');
const {attributeKeys}=await vite.ssrLoadModule('/app/data.ts');
const {penalties}=await vite.ssrLoadModule('/app/vats-engine.ts');
const attributes=Object.fromEntries(attributeKeys.map(key=>[key,15]));
const success=test=>[...test.matchAll(/[+-]\d+/g)].reduce((sum,match)=>sum+Number(match[0]),0);
const effect=(type,value,scope='kagune',attribute='vigor')=>({id:`${type}-${value}`,type,value,scope,attribute});
const custom=(effects,patch={})=>({id:'own',name:'Defesa autoral',description:'',cost:10,activation:'passive',enabled:true,effects,...patch});
const sheet=patch=>normalizeCharacter({rulesVersion:8,species:'ghoul',grade:20,narrativeLimits:true,baseAttributes:attributes,weaponKind:'kagune',kaguneType:'Koukaku',kaguneActive:true,currentSanity:30,kakuja:{active:true,complete:true,cannibalPE:1000},...patch},8);
const deactivate=person=>({...person,kakuja:{...person.kakuja,active:false}});

test('Kakuja defenses inherit complete Kagune tests and add form, perks and authorials once',()=>{
 const person=sheet({perks:{'corpo-pesado':{rank:1},'corpo-leve':{rank:1}},extraDice:{vigor:3,agilidade:4},
  customSkills:[custom([effect('block-dice',2),effect('dodge-dice',3)],{id:'body'})],
  effects:{'bloqueio-ferro':{rank:1},'esquiva-pena':{rank:1}},
  kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['k20-instinto-soberano'],customSkills:[custom([effect('block-dice',7),effect('dodge-dice',11)])]}});
 const before=calculateCharacter(deactivate(person)),after=calculateCharacter(person);
 assert.equal(after.blockTest,before.blockTest);assert.equal(after.dodgeTest,before.dodgeTest);
 assert.equal(success(after.kakujaBlockTest)-success(before.blockTest),6+5+7);
 assert.equal(success(after.kakujaDodgeTest)-success(before.dodgeTest),6+5+11);
 assert.match(after.kakujaBlockTest,/^1d20/);assert.match(after.kakujaDodgeTest,/^1d20/);
});

test('Kagune defensive purchases and authorials flow into Kakuja in the same amount',()=>{
 const person=sheet(),before=calculateCharacter(person);
 const next=calculateCharacter({...person,customSkills:[custom([effect('block-dice',9),effect('dodge-dice',13)])]});
 for(const [ordinary,kakuja,amount] of [['blockTest','kakujaBlockTest',9],['dodgeTest','kakujaDodgeTest',13]]){
  assert.equal(success(next[ordinary])-success(before[ordinary]),amount);
  assert.equal(success(next[kakuja])-success(before[kakuja]),amount);
 }
});

test('defensive percentages scale the complete Kakuja subtotal once without altering the Kagune ledger',()=>{
 const person=sheet({perks:{'r26-escala-defesa-adaptativa':{rank:1}},kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['k20-instinto-soberano'],customSkills:[custom([effect('block-dice',7),effect('dodge-dice',11)])]}});
 const before=calculateCharacter(deactivate(person)),after=calculateCharacter(person);
 for(const [stat,ordinary,kakuja,extra] of [['block','blockTest','kakujaBlockTest',18],['dodge','dodgeTest','kakujaDodgeTest',22]]){
  const subtotal=before.scaling.totals[stat]-before.scaling.bonuses[stat];
  assert.equal(success(after[kakuja]),subtotal+extra+Math.floor((subtotal+extra)*.15));
  assert.equal(after[ordinary],before[ordinary]);
  assert.equal(after.scaling.bonuses[stat],before.scaling.bonuses[stat]);
 }
});

test('inactive, suppressed, destroyed, unavailable and low-level Kakuja add no exclusive defense',()=>{
 const person=sheet({kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['k20-instinto-soberano']}});
 const cases=[deactivate(person),{...person,species:'quinx'},{...person,grade:5},
  {...person,kakuja:{...person.kakuja,cannibalPE:24}},
  {...person,vats:{...person.vats,rcSuppressedUntil:person.vats.turn+1}},
  {...person,vats:{...person.vats,kakuhouUntil:person.vats.turn+1}}];
 for(const invalid of cases){
  const derived=calculateCharacter(invalid);
  assert.equal(derived.kakujaManifested,false);
  assert.equal(derived.kakujaBlockTest,derived.blockTest);
  assert.equal(derived.kakujaDodgeTest,derived.dodgeTest);
  assert.equal(derived.kakujaExtraAttacks,derived.extraAttacks);
 }
});

test('incomplete form uses three successes and complete-only perk respects its requirements',()=>{
 const person=sheet({kakuja:{active:true,complete:true,cannibalPE:40,selectedPerks:['k20-monarca-completo']}});
 const incomplete=calculateCharacter(person),complete=calculateCharacter({...person,kakuja:{...person.kakuja,cannibalPE:60}});
 assert.equal(success(incomplete.kakujaBlockTest)-success(incomplete.blockTest),3);
 assert.equal(success(complete.kakujaBlockTest)-success(complete.blockTest),6+10);
 const low=calculateCharacter({...person,grade:11,kakuja:{...person.kakuja,cannibalPE:60}});
 assert.equal(success(low.kakujaBlockTest)-success(low.blockTest),6);
});

test('Kakuja wound relief affects its own attack and defenses while Kagune keeps original penalties',()=>{
 const person=sheet({kaguneType:'Bikaku',kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['kbio-nervos']},vats:{global:['Sub-Vivo','Caído'],body:{torso:{effects:['Coluna Danificada']}}}});
 const before=calculateCharacter(deactivate(person)),after=calculateCharacter(person),wounds=penalties(person.vats);
 assert.equal(wounds.physical,-2);assert.equal(wounds.agility,-2);assert.equal(wounds.dodge,-5);
 for(const key of ['blockTest','dodgeTest','kaguneTest','physicalHitTest'])assert.equal(after[key],before[key],key);
 assert.equal(success(after.kakujaKaguneTest)-success(before.kaguneTest),2);
 assert.equal(success(after.kakujaBlockTest)-success(before.blockTest),6+15+1);
 assert.equal(success(after.kakujaDodgeTest)-success(before.dodgeTest),6+15+2);
});

test('Kakuja extra attacks and Coruka durability remain exclusive to its form',()=>{
 const person=sheet({kaguneType:'Ukaku',selectedEvolutions:['coruka','ataque-extra'],customSkills:[custom([effect('extra-attacks',2)])],
  kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['k20-sobrecarga-assassina'],activeTechniques:['k20-sobrecarga-assassina'],customSkills:[custom([effect('extra-attacks',3)])]}});
 const before=calculateCharacter(deactivate(person)),after=calculateCharacter(person);
 assert.equal(after.extraAttacks,before.extraAttacks);assert.equal(after.extraAttacks,3);
 assert.equal(after.kakujaExtraAttacks,3+1+3);
 assert.equal(after.kaguneDurability,before.kaguneDurability);
 assert.ok(after.kakujaKaguneDurability>after.kaguneDurability);
 for(const key of ['kaguneTest','physicalHitTest','kaguneSteps','physicalSteps','kaguneDamageModifier','physicalDamageModifier'])assert.equal(after[key],before[key],key);
});

test('manifested Kakuja inherits manifested Kagune even when the separate Kagune toggle is off',()=>{
 const person=sheet({selectedEvolutions:['lamina-telescopica'],perks:{'r26-penetracao-cerco-perfeito':{rank:1}},effects:{'aprimoramentos-corporais':{rank:3,target:'vigor'},'bloqueio-ferro':{rank:1},'esquiva-pena':{rank:1},carapaca:{rank:2}},customSkills:[custom([effect('damage-steps',7),effect('damage-modifier',11)])]});
 const on=calculateCharacter(person),offPerson={...person,kaguneActive:false},off=calculateCharacter(offPerson),dormant=calculateCharacter(deactivate(offPerson));
 for(const key of ['kakujaBlockTest','kakujaDodgeTest','kakujaExtraAttacks','kakujaKaguneTest','kakujaKaguneSteps','kakujaKaguneDamageModifier','kakujaKaguneRD','kakujaKaguneDurability','kakujaKaguneRange','kakujaKagunePenetration','kakujaMovement'])assert.equal(off[key],on[key],key);
 assert.equal(on.kakujaKagunePenetration,50);
 assert.ok(off.kakujaKaguneRange>off.distance);
 assert.deepEqual(off.kakujaAttributes,on.activeAttributes);
 for(const key of ['blockTest','dodgeTest','kaguneTest','kaguneSteps','kaguneDurability'])assert.equal(off[key],dormant[key],key);
 assert.notEqual(off.kakujaAttributes.vigor,off.activeAttributes.vigor);
 for(const weaponKind of ['nenhum','quinque']){
  const equipped=calculateCharacter({...person,weaponKind});
  for(const key of ['kakujaBlockTest','kakujaDodgeTest','kakujaKaguneTest','kakujaKaguneSteps','kakujaKaguneDamageModifier','kakujaKaguneRD','kakujaKaguneDurability','kakujaKaguneRange','kakujaKagunePenetration','kakujaMovement'])assert.equal(equipped[key],on[key],`${weaponKind}: ${key}`);
 }
});

test('Kakuja movement inherits manifested Kagune mastery and applies its biology once',()=>{
 const person=sheet({kaguneType:'Bikaku',selectedEvolutions:['continuidade-predatoria'],kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['kbio-bikaku-leme']}});
 const on=calculateCharacter(person),off=calculateCharacter({...person,kaguneActive:false});
 assert.equal(on.movement,4);
 assert.equal(off.movement,3,'the ordinary body still uses its actual Kagune toggle');
 assert.equal(off.kakujaMovement,on.kakujaMovement);
 assert.equal(off.kakujaMovement,4,'one ordinary step + one Kagune mastery + two Kakuja biological steps');
});

test('Kakuja support uses inherited eligibility with the actual body maximum life',()=>{
 const person=sheet({kaguneActive:false,baseAttributes:{...attributes,vigor:13},effects:{'aprimoramentos-corporais':{rank:2,target:'vigor'}},kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['kbio-coracao']}});
 const body=calculateCharacter(deactivate(person)),applied=calculateCharacter(person),manifested=calculateCharacter({...person,kaguneActive:true});
 assert.ok(applied.activeAttributes.vigor<15);assert.ok(applied.kakujaAttributes.vigor>=15);
 assert.equal(applied.kakujaBonuses.regeneration,30);
 assert.equal(applied.maxLife,body.maxLife);
 assert.equal(applied.regenerationSkill,30+Math.floor(applied.maxLife*.08));
 assert.equal(applied.regeneration,applied.regenerationSkill);
 assert.equal(manifested.regenerationSkill,30+Math.floor(manifested.maxLife*.08));
 assert.ok(manifested.maxLife>applied.maxLife);
});

test('inherited Kakuja armor receives the Kagune percentage without importing body armor',()=>{
 const person=sheet({perks:{'r26-escala-armadura-organica':{rank:1}},effects:{carapaca:{rank:4}}});
 const base=calculateCharacter(person),body=calculateCharacter({...person,customSkills:[custom([effect('rd',100,'physical')])]});
 assert.ok(base.kagunePartRD>0);
 assert.equal(base.kakujaKaguneRD,base.kagunePartRD+Math.floor(base.kagunePartRD*.15));
 assert.equal(body.kakujaKaguneRD,base.kakujaKaguneRD);
 assert.ok(body.rd>base.rd);
});

test('independent Quinque keeps its own defenses and does not receive Kakuja-only bonuses',()=>{
 const person=sheet({kakuja:{active:true,complete:true,cannibalPE:1000,selectedPerks:['k20-instinto-soberano'],customSkills:[custom([effect('block-dice',7),effect('dodge-dice',11)])]}});
 const q=normalizeQuinque({rulesVersion:8,grade:20,rcType:'Koukaku',attributes:{vigor:7,agilidade:5}});
 const before=calculateQuinque(q,deactivate(person)),after=calculateQuinque(q,person),raw=JSON.stringify({person,q});
 assert.equal(after.blockTest,before.blockTest);assert.equal(after.dodgeTest,before.dodgeTest);
 const independent=calculateQuinque(q);
 assert.equal(independent.carrierBonuses.block,0);assert.equal(independent.carrierBonuses.dodge,0);
 calculateCharacter(person);calculateQuinque(q,person);assert.equal(JSON.stringify({person,q}),raw);
});
