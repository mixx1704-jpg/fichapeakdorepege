import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const vite = await createServer({ configFile:false, server:{ middlewareMode:true, hmr:false } });
after(() => vite.close());
const tactical = await vite.ssrLoadModule('/app/tactical.ts');
const character = await vite.ssrLoadModule('/app/character.ts');
const quinque = await vite.ssrLoadModule('/app/quinque.ts');
const data = await vite.ssrLoadModule('/app/data.ts');
const { applyCharacterTacticalAction:apply } = await vite.ssrLoadModule('/app/tactical-sheet.ts');
const baseline = JSON.parse(await readFile(new URL('./fixtures/original-catalog.json',import.meta.url),'utf8'));
const attributes = n => Object.fromEntries(data.attributeKeys.map(key => [key,n]));
const own = (...ids) => Object.fromEntries(ids.map(id => [id,{rank:1}]));
const id = tactical.tacticalId;
const sheet = patch => character.normalizeCharacter({rulesVersion:8,grade:20,species:'ghoul',narrativeLimits:true,baseAttributes:attributes(15),weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,currentLife:20,currentRC:50,currentSanity:20,...patch},8);
const input = patch => tactical.normalizeTacticalState({inputs:patch});
const context = extra => ({level:20,species:'ghoul',attributes:attributes(15),currentLife:20,maxLife:147,currentRC:50,control:15,weaponKind:'kagune',weaponActive:true,...extra});
const statKeys = ['maxLife','maxRC','maxSanity','rd','physicalHitTest','kaguneTest','blockTest','dodgeTest','physicalSteps','kaguneSteps','physicalDamageModifier','kaguneDamageModifier','movement','initiativeTest'];

test('an active anchor stance locks the actual sheet movement until the next VATS turn even after its charge is spent',()=>{
  const original=sheet({perks:own(id('postura-ancora'))});
  const before=character.calculateCharacter(original);
  assert.ok(before.movement>0);
  const active=apply(original,{type:'use',id:id('postura-ancora')},context());
  assert.equal(character.calculateCharacter(active).movement,0);
  assert.equal(character.calculateCharacter(active).rd,before.rd);
  const informed=apply(active,{type:'inputs',patch:{incomingDamage:10}},context());
  const spent=apply(informed,{type:'resolve-stance'},context());
  assert.equal(spent.tactical.stance.charges,0);
  assert.equal(character.calculateCharacter(spent).movement,0);
  assert.equal(character.calculateCharacter({...spent,vats:{...spent.vats,turn:spent.vats.turn+1}}).movement,before.movement);
});

test('24 tactical purchases join the catalog once and preserve every original purchase and price',()=>{
  assert.equal(tactical.TACTICAL_PERK_DEFINITIONS.length,24);
  for(const definition of tactical.TACTICAL_PERK_DEFINITIONS){
    const matches=data.perks.filter(item=>item.id===definition.id);
    assert.equal(matches.length,1,definition.id);
    assert.equal(matches[0].cost,definition.cost);
    assert.equal(matches[0].minGrade,definition.minGrade);
  }
  const current=new Map(data.perks.map(item=>[item.id,item]));
  assert.equal(baseline.perks.length,1250);
  for(const old of baseline.perks){
    assert.ok(current.has(old.id),old.id);
    assert.deepEqual(current.get(old.id).cost,old.cost,old.id);
  }
});

test('fifteen existing capstones unlock their own techniques only at level twenty and attribute fifteen',()=>{
  const capstones=tactical.tacticalTechniques.filter(item=>item.existing);
  assert.equal(capstones.length,15);
  for(const technique of capstones){
    const purchase=data.perks.find(item=>item.id===technique.id);
    assert.ok(purchase,technique.id);
    assert.equal(technique.pe,0,'a technique attached to an existing purchase has no second PE cost');
    assert.ok(purchase.cost>0);
    assert.equal(purchase.minGrade,20);
    assert.equal(purchase.attribute,technique.attribute);
    assert.equal(purchase.min,15);
    const c=context({ownedPerks:own(technique.id)});
    const state=tactical.emptyTacticalState();
    assert.equal(tactical.tacticalAvailability(technique,state,c),'',technique.id);
    assert.ok(tactical.tacticalAvailability(technique,state,{...c,level:19}),technique.id);
    assert.ok(tactical.tacticalAvailability(technique,state,{...c,attributes:{...c.attributes,[technique.attribute]:14}}),technique.id);
    assert.ok(tactical.tacticalAvailability(technique,state,{...c,ownedPerks:{}}),technique.id);
    assert.ok(!tactical.TACTICAL_PERK_DEFINITIONS.some(item=>item.id===technique.id),'existing IDs must not be duplicated as a new purchase');
  }
});

test('equipping tactical purchases charges PE without silently adding passive numerical buffs',()=>{
  const ids=tactical.TACTICAL_PERK_DEFINITIONS.map(item=>item.id);
  const base=sheet({perks:{}}), acquired={...base,perks:own(...ids)};
  const before=character.calculateCharacter(base),after=character.calculateCharacter(acquired);
  for(const key of statKeys)assert.deepEqual(after[key],before[key],key);
  const expected=tactical.TACTICAL_PERK_DEFINITIONS.reduce((sum,item)=>sum+item.cost,0);
  assert.equal(after.catalogPerksPE-before.catalogPerksPE,expected);
  assert.deepEqual(base.tactical,tactical.emptyTacticalState());
});

test('tactical reserves, session uses and receipts survive character and Quinque JSON round trips',()=>{
  const saved=tactical.normalizeTacticalState({
    turn:3,session:2,inputs:{target:'Alvo teste',damage:91,confirmed:true},
    usedTurn:{action:3,[id('campo-espinhos')]:3},usedSession:[id('ultimo-pulso')],
    retaliation:{amount:27,expires:5,penetrationPercent:50},
    stance:{id:id('bastiao-vivo'),until:4,charges:2,mitigationPercent:75},
    trap:{damage:45,expires:5},credit:{amount:3,expires:5},binding:{target:'Alvo teste',until:5,dc:30},storedNatural:17,
    latest:{id:id('campo-espinhos'),name:'Campo de Espinhos',turn:3,session:2,target:'Alvo teste',text:'Armadilha preparada',rcCost:4,lifeDelta:0},log:['Registro de teste'],
  });
  const original=sheet({tactical:saved});
  const characterReload=character.normalizeCharacter(JSON.parse(JSON.stringify(original)),8);
  assert.deepEqual(characterReload.tactical,saved);
  const weapon=quinque.normalizeQuinque({rulesVersion:8,grade:20,tactical:saved});
  const weaponReload=quinque.normalizeQuinque(JSON.parse(JSON.stringify(weapon)));
  assert.deepEqual(weaponReload.tactical,saved);
  assert.deepEqual(tactical.normalizeTacticalState(JSON.parse(JSON.stringify(saved))),saved);
});

test('characters and independent Quinques never share mutable tactical state',()=>{
  const a=sheet(),b=sheet();
  a.tactical.inputs.target='Somente A';a.tactical.usedSession.push(id('ultimo-pulso'));
  assert.equal(b.tactical.inputs.target,'');assert.deepEqual(b.tactical.usedSession,[]);
  const qa=quinque.normalizeQuinque(),qb=quinque.normalizeQuinque();
  qa.tactical.inputs.target='Somente arma A';qa.tactical.log.push('A');
  assert.equal(qb.tactical.inputs.target,'');assert.deepEqual(qb.tactical.log,[]);
  assert.equal(a.tactical.inputs.target,'Somente A');
});

test('compatible tactical purchases are charged only to their independent Quinque',()=>{
  const definition=tactical.TACTICAL_PERK_DEFINITIONS.find(item=>item.id===id('ricochete-duplo'));
  const base=quinque.normalizeQuinque({rulesVersion:8,grade:20,attributes:attributes(15)});
  assert.equal(quinque.quinqueAllowsPerk(base,definition),true);
  const acquired={...base,perks:own(definition.id),tactical:input({target:'Protegido',incomingDamage:30})};
  const before=quinque.calculateQuinque(base),after=quinque.calculateQuinque(acquired);
  assert.equal(after.perkPE-before.perkPE,definition.cost);
  assert.equal(after.spent-before.spent,definition.cost);
  assert.equal(after.available,before.available);
  assert.equal(before.rd,after.rd);assert.equal(before.kaguneTest,after.kaguneTest);
  assert.deepEqual(base.perks,{});assert.equal(base.tactical.inputs.target,'');
  const unavailable=tactical.TACTICAL_PERK_DEFINITIONS.find(item=>item.id===id('drenagem-ferida'));
  assert.equal(quinque.quinqueAllowsPerk(base,unavailable),false);
});

test('character wrapper applies drain and RC payment once even when an action is submitted twice',()=>{
  const original=sheet({perks:own(id('drenagem-ferida')),tactical:input({damage:80,confirmed:true})});
  original.vats.body.armL.damage=12;
  const snapshot=JSON.parse(JSON.stringify(original));
  const first=apply(original,{type:'use',id:id('drenagem-ferida')},context());
  assert.notStrictEqual(first,original);
  assert.equal(first.currentRC,46);assert.equal(first.currentLife,40);
  assert.equal(first.currentSanity,original.currentSanity);
  assert.equal(first.vats.body.armL.damage,12,'general healing does not duplicate regional healing');
  assert.deepEqual(original,snapshot,'the transaction keeps its input immutable');
  const repeated=apply(first,{type:'use',id:id('drenagem-ferida')},context());
  assert.strictEqual(repeated,first);assert.equal(repeated.currentRC,46);assert.equal(repeated.currentLife,40);
});

test('character wrapper rejects stale resource, level, purchase and attribute contexts',()=>{
  const stale=context({ownedPerks:own(...tactical.tacticalTechniques.map(item=>item.id)),currentRC:999,level:20,attributes:attributes(99)});
  const action={type:'use',id:id('drenagem-ferida')};
  for(const patch of [{currentRC:0},{grade:8},{perks:{}}]){
    const original=sheet({perks:own(action.id),tactical:input({damage:80,confirmed:true}),...patch});
    assert.strictEqual(apply(original,action,stale),original);
  }
  const capstone='r26-exp-forca-atlas-vivo';
  const weak=sheet({baseAttributes:{...attributes(15),forca:14},perks:own(capstone),tactical:input({damage:80,confirmed:true})});
  assert.strictEqual(apply(weak,{type:'use',id:capstone},stale),weak);
});

test('VATS turn is authoritative for character tactical cooldowns',()=>{
  const original=sheet({perks:own(id('drenagem-ferida')),tactical:input({damage:80,confirmed:true})});
  original.vats.turn=5;
  const first=apply(original,{type:'use',id:id('drenagem-ferida')},context());
  assert.equal(first.tactical.turn,5);assert.equal(first.tactical.usedTurn.action,5);
  assert.strictEqual(apply(first,{type:'use',id:id('drenagem-ferida')},context()),first);
  const next={...first,vats:{...first.vats,turn:6}};
  assert.strictEqual(apply(next,{type:'use',id:id('drenagem-ferida')},context()),next,'the previous attack cannot fund another healing resolution');
  const prepared=apply(next,{type:'inputs',patch:{damage:80,confirmed:true}},context());
  const second=apply(prepared,{type:'use',id:id('drenagem-ferida')},context());
  assert.equal(second.tactical.turn,6);assert.equal(second.currentRC,42);assert.equal(second.currentLife,60);
});

test('RC suppression rejects paid techniques and the control capstone clears only suppression once per session',()=>{
  const capstone='r26-passos-controle-comando-catastrofe';
  const original=sheet({currentRC:0,perks:own(capstone,id('drenagem-ferida')),tactical:input({damage:80,confirmed:true})});
  original.vats.rcSuppressedUntil=8;
  const blocked=apply(original,{type:'use',id:id('drenagem-ferida')},context({currentRC:999,isRCSuppressed:false}));
  assert.strictEqual(blocked,original);
  const released=apply(original,{type:'use',id:capstone},context());
  assert.equal(released.vats.rcSuppressedUntil,released.vats.turn);
  assert.equal(released.currentRC,0);assert.equal(released.currentLife,20);assert.equal(released.currentSanity,20);
  assert.equal(released.kaguneActive,original.kaguneActive);
  assert.ok(released.tactical.usedSession.includes(capstone));
  const later={...released,vats:{...released.vats,turn:2,rcSuppressedUntil:8}};
  assert.strictEqual(apply(later,{type:'use',id:capstone},context()),later);
});

test('blood fuel trades whole life for a single-use discount without adding RC or bypassing payment',()=>{
  const original=sheet({currentLife:100,currentRC:0,perks:own(id('carne-combustivel'),id('drenagem-ferida')),tactical:input({damage:80,confirmed:true})});
  const max=character.calculateCharacter(original).maxLife,sacrifice=Math.floor(max*.1),credit=Math.min(6,Math.floor(sacrifice/5));
  const fueled=apply(original,{type:'use',id:id('carne-combustivel')},context());
  assert.equal(fueled.currentLife,100-sacrifice);assert.equal(fueled.currentRC,0);assert.equal(fueled.tactical.credit.amount,credit);
  const next={...fueled,vats:{...fueled.vats,turn:2}};
  assert.strictEqual(apply(next,{type:'use',id:id('drenagem-ferida')},context({currentRC:999})),next);
  const payable=apply({...next,currentRC:Math.max(0,4-credit)},{type:'inputs',patch:{damage:80,confirmed:true}},context());
  const drained=apply(payable,{type:'use',id:id('drenagem-ferida')},context());
  assert.equal(drained.currentRC,0);assert.equal(drained.tactical.credit,null);
  assert.equal(drained.currentLife,payable.currentLife+20);
});
