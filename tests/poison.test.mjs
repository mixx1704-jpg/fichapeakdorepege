import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';

const vite = await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(() => vite.close());
const poison = await vite.ssrLoadModule('/app/poison.ts');
const {emptyPoisonState,normalizePoisonState,poisonPreview,poisonResistance,poisonRules,poisonSummary,updatePoison,poisonPerkIds:ids} = poison;
const base = {enabled:true,control:9,level:10,perks:[ids.inoculation]};
const full = {...base,perks:Object.values(ids)};
const dose = (state,config=base) => updatePoison(state,{type:'dose',resisted:false},config);
const target = (patch={},config=base) => updatePoison(emptyPoisonState(),{type:'target',patch},config);

test('old sheets receive an inactive poison tracker without invented purchases',()=>{
  const state = normalizePoisonState(undefined);
  assert.deepEqual(state,emptyPoisonState());
  assert.equal(poisonPreview(state,{...base,enabled:false}).canDose,false);
  assert.equal(poisonPreview(state,base).damage,0);
});

test('toxic damage floors after summing all stacks, then subtracts half RD',()=>{
  let state=target({maxLife:19,rd:1});
  state=dose(dose(state));
  const preview=poisonPreview(state,base);
  assert.equal(preview.percent,6);
  assert.equal(preview.rawDamage,1); // floor(19 * 6%), not floor(19 * 3%) * 2.
  assert.equal(preview.mitigation,0);
  assert.equal(preview.damage,1);
});

test('large target life scales toxin and tank RD can still prevent all damage',()=>{
  const weak=dose(target({maxLife:100,rd:0}));
  const large=dose(target({maxLife:1000,rd:0}));
  const tank=dose(target({maxLife:1000,rd:100}));
  assert.equal(poisonPreview(weak,base).damage,3);
  assert.equal(poisonPreview(large,base).damage,30);
  assert.equal(poisonPreview(tank,base).damage,0);
});

test('base stacking stops at three and a new dose refreshes duration',()=>{
  let state=dose(dose(dose(dose(emptyPoisonState()))));
  assert.equal(state.stacks,3);
  state=updatePoison(state,{type:'turn'},base);
  assert.equal(state.remaining,2);
  state=dose(state);
  assert.equal(state.stacks,3);
  assert.equal(state.remaining,3);
});

test('concentrated cumulative poison has four stacks and a 16 percent cap',()=>{
  let state=target({maxLife:999,rd:11});
  for(let count=0;count<20;count++)state=dose(state,full);
  const preview=poisonPreview(state,full);
  assert.equal(state.stacks,4);
  assert.equal(preview.percent,16);
  assert.equal(preview.rawDamage,159);
  assert.equal(preview.damage,154);
});

test('persistent poison lasts five turns and expires after its final tick',()=>{
  let state=dose(emptyPoisonState(),full);
  for(let count=0;count<4;count++)state=updatePoison(state,{type:'turn'},full);
  assert.equal(state.remaining,1);
  assert.equal(state.stacks,1);
  assert.equal(state.totalDamage,16);
  state=updatePoison(state,{type:'turn'},full);
  assert.equal(state.remaining,0);
  assert.equal(state.stacks,0);
  assert.equal(state.profile,null);
  assert.equal(state.totalDamage,20);
  assert.match(state.log.at(-1),/expirou/);
});

test('one turn records precisely one tick and no tick after expiry',()=>{
  let state=dose(emptyPoisonState());
  const oldLogCount=state.log.length;
  state=updatePoison(state,{type:'turn'},base);
  assert.equal(state.turn,2);
  assert.equal(state.totalDamage,3);
  assert.equal(state.log.length,oldLogCount+1);
  state=updatePoison(updatePoison(state,{type:'turn'},base),{type:'turn'},base);
  const logs=state.log.length;
  state=updatePoison(state,{type:'turn'},base);
  assert.equal(state.totalDamage,9);
  assert.equal(state.log.length,logs);
});

test('resistance uses target Vigor plus Control, with equality succeeding',()=>{
  const victim={name:'Alvo',maxLife:100,rd:0,vigor:4,control:5};
  const success=poisonResistance(victim,base,15);
  assert.equal(success.total,24);
  assert.equal(success.dc,24);
  assert.equal(success.resisted,true);
  assert.equal(success.formula,'1d20+9');
  assert.equal(poisonResistance(victim,base,14).resisted,false);
});

test('resistance does not acquire a second Level multiplier',()=>{
  assert.equal(poisonRules({...base,level:1}).resistanceDC,24);
  assert.equal(poisonRules({...base,level:20}).resistanceDC,24);
});

test('a resisted new dose does not remove or extend an existing toxin',()=>{
  let state=dose(target({vigor:10,control:10}));
  state=updatePoison(state,{type:'turn'},base);
  const next=updatePoison(state,{type:'dose',roll:20},base);
  assert.equal(next.stacks,1);
  assert.equal(next.remaining,2);
  assert.equal(next.totalDamage,3);
  assert.match(next.log.at(-1),/Dose resistida/);
});

test('manually confirmed resistance and failed resistance follow the same dose rules',()=>{
  const state=emptyPoisonState();
  assert.equal(updatePoison(state,{type:'dose',resisted:true},base).stacks,0);
  assert.equal(updatePoison(state,{type:'dose',resisted:false},base).stacks,1);
});

test('a die result takes precedence over a conflicting manual resistance flag',()=>{
  const state=target({vigor:20,control:20});
  const next=updatePoison(state,{type:'dose',roll:1,resisted:false},base);
  assert.equal(next.stacks,0);
});

test('locked weapon cannot apply or refresh doses, but injected toxin keeps ticking',()=>{
  let state=dose(emptyPoisonState());
  const unavailable={...base,enabled:false};
  assert.deepEqual(updatePoison(state,{type:'dose'},unavailable),state);
  state=updatePoison(state,{type:'turn'},unavailable);
  assert.equal(state.remaining,2);
  assert.equal(state.totalDamage,3);
});

test('dose snapshots preserve potency after the source changes its configuration',()=>{
  const state=dose(emptyPoisonState(),full);
  const preview=poisonPreview(state,{enabled:false,control:0,level:1,perks:[]});
  assert.equal(preview.potencyPercent,4);
  assert.equal(preview.duration,5);
  assert.equal(preview.maxStacks,4);
  assert.equal(preview.damage,4);
});

test('corrosive toxin is exclusive and rounds the amount of ignored RD down',()=>{
  let state=updatePoison(target({rd:37,maxLife:1000}),{type:'kind',kind:'corrosive'},full);
  for(let count=0;count<8;count++)state=dose(state,full);
  const preview=poisonPreview(state,full);
  assert.equal(preview.rdReductionPercent,20);
  assert.equal(preview.rdIgnored,7);
  assert.equal(preview.effectiveRD,30);
  assert.equal(preview.damage,0);
  assert.equal(preview.accuracyPenalty,0);
  state=updatePoison(state,{type:'turn'},full);
  assert.equal(state.totalDamage,0);
});

test('neurotoxin floors Control, caps at ten, and never removes actions',()=>{
  const config={...full,control:8};
  let state=updatePoison(emptyPoisonState(),{type:'kind',kind:'neurotoxic'},config);
  state=dose(dose(dose(state,config),config),config);
  assert.equal(poisonPreview(state,config).accuracyPenalty,6);
  const enormous={...full,control:999};
  state=dose(state,enormous);
  const preview=poisonPreview(state,enormous);
  assert.equal(preview.accuracyPenalty,10);
  assert.equal(preview.damage,0);
  assert.equal(preview.rdReductionPercent,0);
  assert.match(poisonSummary(state,enormous),/Não remove ações/);
});

test('unbought toxin types cannot be selected or applied',()=>{
  const state=emptyPoisonState();
  assert.deepEqual(updatePoison(state,{type:'kind',kind:'neurotoxic'},base),state);
  const imported=normalizePoisonState({...state,kind:'corrosive'});
  assert.equal(poisonPreview(imported,base).canDose,false);
  assert.deepEqual(updatePoison(imported,{type:'dose'},base),imported);
});

test('legacy authorial compatibility explicitly enables additional types',()=>{
  const config={...base,allowedKinds:['neurotoxic']};
  let state=updatePoison(emptyPoisonState(),{type:'kind',kind:'neurotoxic'},config);
  state=dose(state,config);
  assert.equal(state.stacks,1);
  assert.equal(poisonPreview(state,config).accuracyPenalty,3);
});

test('changing poison type clears stacks and prevents free effect conversion',()=>{
  const state=dose(dose(emptyPoisonState(),full),full);
  const changed=updatePoison(state,{type:'kind',kind:'corrosive'},full);
  assert.equal(changed.kind,'corrosive');
  assert.equal(changed.stacks,0);
  assert.equal(changed.remaining,0);
  assert.equal(changed.profile,null);
  assert.equal(poisonPreview(changed,full).rdIgnored,0);
});

test('JSON save and reload preserves combat time, target, dose strength and ledger',()=>{
  let state=dose(target({name:'Investigador',rd:11,maxLife:237}),full);
  state=updatePoison(state,{type:'turn'},full);
  const restored=normalizePoisonState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored,state);
  assert.equal(poisonSummary(restored,full),poisonSummary(state,full));
});

test('corrupt imports and decimal inputs normalize to bounded nonnegative integers',()=>{
  const state=normalizePoisonState({target:{name:45,maxLife:-5.3,rd:9.9,vigor:NaN,control:Infinity},stacks:99.9,remaining:99,turn:-20,totalDamage:NaN,profile:{potencyPercent:999,maxStacks:999,duration:999,neuroPerStack:999},log:[null,12,'ok'],kind:'invalid'});
  assert.equal(state.target.maxLife,0);
  assert.equal(state.target.rd,9);
  assert.equal(state.target.vigor,0);
  assert.equal(state.target.control,0);
  assert.equal(state.stacks,4);
  assert.equal(state.remaining,5);
  assert.equal(state.turn,1);
  assert.equal(state.kind,'toxic');
  assert.equal(state.profile.potencyPercent,4);
  assert.deepEqual(state.log,['ok']);
  assert.equal(normalizePoisonState({stacks:4,remaining:0}).stacks,0);
  assert.equal(normalizePoisonState({stacks:0,remaining:4}).remaining,0);
});

test('history remains limited to fifty events and old values are not mutated',()=>{
  const old=emptyPoisonState();
  let state=old;
  for(let count=0;count<80;count++)state=dose(state);
  assert.equal(state.log.length,50);
  assert.equal(old.log.length,0);
  assert.equal(old.stacks,0);
  const next=updatePoison(state,{type:'target',patch:{rd:20}},base);
  assert.equal(state.target.rd,0);
  assert.equal(next.target.rd,20);
});

test('copy summary exposes final damage, stacks, duration and resistance in plain numbers',()=>{
  const state=dose(target({name:'Tanque',maxLife:199,rd:9}));
  const summary=poisonSummary(state,base);
  assert.match(summary,/Tanque · Tóxico · 1\/3 acúmulos · 3 turno/);
  assert.match(summary,/3% de 199 PV = 5; − metade da RD \(4\) = 1 dano/);
  assert.match(summary,/1d20\+0 contra CD 24/);
  assert.match(poisonSummary(emptyPoisonState(),base),/Nenhum efeito ativo/);
});

test('clearing poison ends its effect without rewriting prior damage records',()=>{
  let state=updatePoison(dose(emptyPoisonState()),{type:'turn'},base);
  state=updatePoison(state,{type:'clear'},base);
  assert.equal(state.stacks,0);
  assert.equal(state.remaining,0);
  assert.equal(state.totalDamage,3);
  assert.equal(poisonPreview(state,base).damage,0);
});
