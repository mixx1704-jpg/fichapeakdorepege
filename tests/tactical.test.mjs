import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {TACTICAL_PERK_DEFINITIONS,tacticalTechniques,tacticalCapstones,emptyTacticalState,normalizeTacticalState,resolveTactical,tacticalAvailability,tacticalOwnedTechniques,tacticalSummary,tacticalId:id}=await vite.ssrLoadModule('/app/tactical.ts');
const attributes={forca:15,vigor:15,precisao:15,agilidade:15,raciocinio:15,percepcao:15,presenca:15,controle:15};
const context={level:20,species:'ghoul',attributes,ownedPerks:Object.fromEntries(tacticalTechniques.map(item=>[item.id,{rank:1}])),currentRC:50,maxLife:100,currentLife:80,hitBonus:100,control:15,weaponKind:'kagune',weaponActive:true,die:20};
const technique=suffix=>tacticalTechniques.find(item=>item.id===id(suffix));
const patch=(state,inputs,c=context)=>resolveTactical(state,{type:'inputs',patch:inputs},c).state;
const start=inputs=>patch(emptyTacticalState(),inputs);
const use=(suffix,state=emptyTacticalState(),c=context)=>resolveTactical(state,{type:'use',id:id(suffix)},c);
const cap=(key,state,c=context)=>resolveTactical(state,{type:'use',id:tacticalCapstones.find(item=>item.attribute===key).id},c);

test('24 new tactical purchases and 15 existing attribute unlocks remain distinct',()=>{
 assert.equal(TACTICAL_PERK_DEFINITIONS.length,24);assert.equal(tacticalCapstones.length,15);assert.equal(tacticalTechniques.length,39);
 assert.equal(new Set(tacticalTechniques.map(item=>item.id)).size,39);
 for(const item of tacticalCapstones){assert.equal(item.existing,true);assert.equal(item.pe,0);assert.equal(item.level,20);assert.equal(item.min,15);assert.ok(!TACTICAL_PERK_DEFINITIONS.some(perk=>perk.id===item.id));}
 for(const perk of TACTICAL_PERK_DEFINITIONS.filter(item=>item.minGrade===20))assert.ok(perk.cost>=200&&perk.cost<=400);
});
test('old sheets get an empty tracker and corrupt decimal imports are sanitized',()=>{
 assert.deepEqual(normalizeTacticalState(null),emptyTacticalState());
 const state=normalizeTacticalState({turn:-1,session:Infinity,inputs:{incomingDamage:5.9,doses:99,spentHit:88,rollModifier:-2.1,healingPool:NaN},usedTurn:{unknown:3},usedSession:['unknown'],log:[null,9,'ok']});
 assert.equal(state.turn,1);assert.equal(state.session,1);assert.equal(state.inputs.incomingDamage,5);assert.equal(state.inputs.doses,4);assert.equal(state.inputs.spentHit,20);assert.equal(state.inputs.rollModifier,-3);assert.equal(state.inputs.healingPool,0);assert.deepEqual(state.usedTurn,{});assert.deepEqual(state.usedSession,[]);assert.deepEqual(state.log,['ok']);
});
test('ownership, level, attribute and RC requirements are checked before consuming anything',()=>{
 const state=start({incomingDamage:100});
 assert.match(use('guarda-interposta',state,{...context,ownedPerks:{}}).error,/adquirida/);
 assert.match(use('bastiao-vivo',state,{...context,level:19}).error,/LEVEL/);
 assert.match(use('bastiao-vivo',state,{...context,attributes:{...attributes,vigor:14}}).error,/vigor/);
 assert.match(use('ultimo-pulso',state,{...context,currentRC:5}).error,/RC insuficiente/);
 assert.deepEqual(state.usedTurn,{});assert.equal(state.log.length,0);
});
test('interception floors damage actually received and never hurts the ally twice',()=>{
 const result=use('guarda-interposta',start({incomingDamage:5,target:'Aliado'}));
 assert.equal(result.lifeDelta,-2);assert.match(result.receipt.text,/Aliado protegido: 0 dano/);assert.match(result.receipt.text,/Dano impedido 3/);assert.equal(result.state.inputs.incomingDamage,0);
 const improved=use('baluarte-aliado',start({incomingDamage:5}));assert.equal(improved.lifeDelta,-1);
});
test('one reaction and one action can be used, but no second tactical reaction in the turn',()=>{
 const first=use('guarda-interposta',start({incomingDamage:8}));
 const next=patch(first.state,{incomingDamage:10});
 assert.match(use('reserva-dor',next).error,/Reação tática já usada/);
 assert.ok(!use('postura-ancora',next).error);
 const nextTurn=resolveTactical(next,{type:'turn'},context).state;assert.ok(!use('reserva-dor',nextTurn).error);
});
test('retaliation stores post-RD damage without applying it twice and releases only once',()=>{
 const stored=use('reserva-dor',start({incomingDamage:300}));assert.equal(stored.lifeDelta,0);assert.equal(stored.state.retaliation.amount,50);
 const released=resolveTactical(stored.state,{type:'release-retaliation'},context);assert.ok(!released.error);assert.equal(released.state.retaliation,null);assert.match(released.receipt.text,/50 de dano fixo a UM ataque/);
 assert.match(resolveTactical(released.state,{type:'release-retaliation'},context).error,/Sem dano reservado/);
});
test('absolute retaliation caps storage at max life and penetration at fifty percent',()=>{
 const result=use('retaliacao-absoluta',start({incomingDamage:999}));assert.equal(result.state.retaliation.amount,100);assert.equal(result.state.retaliation.penetrationPercent,50);assert.equal(result.lifeDelta,0);
});
test('retaliation and trap expire after the next turn, with no reserve duplication',()=>{
 const result=use('reserva-dor',start({incomingDamage:50}));
 assert.ok(resolveTactical(result.state,{type:'sync-turn',turn:2},context).state.retaliation);
 assert.equal(resolveTactical(result.state,{type:'sync-turn',turn:3},context).state.retaliation,null);
 assert.match(use('reserva-dor',patch(resolveTactical(result.state,{type:'turn'},context).state,{incomingDamage:100})).error,/reserva atual/);
});
test('stance reduces the final damage down and preserves movement restriction after its last charge',()=>{
 const active=use('postura-ancora').state;
 const impact=resolveTactical(patch(active,{incomingDamage:5}),{type:'resolve-stance'},context);
 assert.equal(impact.lifeDelta,-2);assert.equal(impact.state.stance.charges,0);assert.equal(impact.state.inputs.incomingDamage,0);
 assert.match(resolveTactical(patch(impact.state,{incomingDamage:5}),{type:'resolve-stance'},context).error,/esgotada/);
 assert.equal(resolveTactical(impact.state,{type:'turn'},context).state.stance,null);
});
test('endgame stance has exactly two separately confirmed impacts and one session use',()=>{
 let state=use('bastiao-vivo').state;
 let result=resolveTactical(patch(state,{incomingDamage:5}),{type:'resolve-stance'},context);assert.equal(result.lifeDelta,-1);assert.equal(result.state.stance.charges,1);
 result=resolveTactical(patch(result.state,{incomingDamage:5}),{type:'resolve-stance'},context);assert.equal(result.lifeDelta,-1);assert.equal(result.state.stance.charges,0);
 const combat=resolveTactical(result.state,{type:'combat'},context).state;assert.match(use('bastiao-vivo',combat).error,/sessão/);
});
test('split healing preserves a single rolled pool and consumes the local pool',()=>{
 const result=use('partilha-vital',start({healingPool:11,allocation:7,target:'A',target2:'B'}));
 assert.match(result.receipt.text,/A recebe 7; B recebe 4. Total 11/);assert.equal(result.lifeDelta,0);assert.equal(result.state.inputs.healingPool,0);
 const next=resolveTactical(result.state,{type:'turn'},context).state;assert.match(use('partilha-vital',next).error,/total de PV/);
});
test('life transfer cannot kill the donor or create more healing than the donor loses',()=>{
 const result=use('transfusao-campo',start({healingPool:999,target:'Aliado'}));assert.equal(result.lifeDelta,-79);assert.match(result.receipt.text,/recebe 79 PV/);assert.match(result.receipt.text,/permanece com 1/);
});
test('toxin detonation consumes only its explicit local doses and respects target armor',()=>{
 const state=start({doses:4,poisonPerDose:10,targetRD:15});const original=JSON.stringify(state);
 const result=use('detonacao-toxica',state);assert.equal(result.rcCost,3);assert.match(result.receipt.text,/dano final 25/);assert.equal(result.state.inputs.doses,0);assert.equal(JSON.stringify(state),original);
 assert.match(result.receipt.text,/Encerre manualmente/);
});
test('endgame detonation never ignores more than half of original armor',()=>{
 const result=use('sentenca-ruina',start({doses:4,poisonPerDose:10,targetRD:37}));assert.equal(result.rcCost,8);assert.match(result.receipt.text,/80 bruto/);assert.match(result.receipt.text,/penetração 50%; dano final 61/);assert.equal(result.state.inputs.doses,0);
});
test('binding requires an attack confirmation and preserves actions and defenses',()=>{
 const state=start({roll:10,targetVigor:4,targetControl:4,target:'Inimigo'});
 assert.match(use('laco-constritor',state).error,/Confirme/);
 const result=use('laco-constritor',patch(state,{confirmed:true}));assert.equal(result.state.binding.until,3);assert.equal(result.state.binding.dc,30);assert.match(result.receipt.text,/Ações e defesas permanecem/);
 const free=resolveTactical(result.state,{type:'release-bind'},context);assert.equal(free.state.binding,null);
 const resisted=use('laco-constritor',start({confirmed:true,roll:20,targetVigor:5,targetControl:5}));assert.equal(resisted.state.binding,null);
});
test('ricochet divides one raw damage total before each target applies its own RD',()=>{
 const result=use('ricochete-duplo',start({damage:11,targetRD:1,target2RD:2,confirmed:true,target:'A',target2:'B'}));
 assert.match(result.receipt.text,/5 \+ 6 = 11/);assert.match(result.receipt.text,/A: 4 após RD 1; B: 4 após RD 2/);assert.equal(result.state.inputs.damage,0);
});
test('last stand costs RC, leaves exactly one life and cannot resurrect or repeat within a session',()=>{
 const result=use('ultimo-pulso',start({incomingDamage:80}));assert.equal(result.lifeDelta,-79);assert.equal(result.rcCost,6);
 const combat=resolveTactical(result.state,{type:'combat'},context).state;assert.match(use('ultimo-pulso',patch(combat,{incomingDamage:80})).error,/sessão/);
 const newSession=resolveTactical(combat,{type:'session'},context).state;assert.ok(!use('ultimo-pulso',patch(newSession,{incomingDamage:80})).error);
 assert.match(use('ultimo-pulso',start({incomingDamage:80}),{...context,currentLife:0}).error,/Vida positiva/);
});
test('reflection does not reapply the incoming damage to the user',()=>{
 const result=use('refluxo-dor',start({incomingDamage:21,targetRD:4}));assert.equal(result.lifeDelta,0);assert.match(result.receipt.text,/refluxo 10 bruto − RD 4 = 6/);
});
test('drain healing is limited by damage, max life percentage and missing life',()=>{
 const result=use('drenagem-ferida',start({damage:100,confirmed:true}));assert.equal(result.lifeDelta,20);assert.equal(result.state.inputs.damage,0);
 const nearFull=use('drenagem-ferida',start({damage:100,confirmed:true}),{...context,currentLife:99});assert.equal(nearFull.lifeDelta,1);
});
test('capture limits damage without turning a miss into a guaranteed capture',()=>{
 const result=use('captura-viva',start({damage:100,targetRD:10,targetCurrentLife:5,confirmed:true}));assert.match(result.receipt.text,/Dano final 4; alvo fica com 1 PV/);assert.match(result.receipt.text,/exige resolução na mesa/);
});
test('forced movement converts all damage and can be resisted without disabling turns',()=>{
 const result=use('arranco-impacto',start({damage:999,targetVigor:1,targetControl:0,roll:1,confirmed:true}));assert.match(result.receipt.text,/sem dano ao PV: 10 espaços/);
 const resisted=use('arranco-impacto',start({damage:999,targetVigor:20,targetControl:20,roll:20,confirmed:true}));assert.match(resisted.receipt.text,/sem dano ao PV: 0 espaços/);
});
test('trap preparation and one-shot triggering use an action and a reaction separately',()=>{
 const prepared=use('campo-espinhos',start({damage:21}));assert.equal(prepared.state.trap.damage,10);assert.equal(prepared.rcCost,4);
 assert.match(resolveTactical(prepared.state,{type:'trigger-trap'},context).error,/Confirme/);
 const fired=resolveTactical(patch(prepared.state,{confirmed:true,targetRD:4}),{type:'trigger-trap'},context);assert.match(fired.receipt.text,/10 bruto − RD 4 = 6/);assert.equal(fired.state.trap,null);assert.equal(fired.state.usedTurn.reaction,1);
 assert.match(resolveTactical(fired.state,{type:'trigger-trap'},context).error,/Sem armadilha/);
});
test('accuracy trade sacrifices no more than twenty owned bonus hits and caps penetration at forty',()=>{
 const result=use('acerto-cirurgico',start({damage:100,targetRD:100,spentHit:999}));assert.match(result.receipt.text,/−20 acertos bônus e 40%/);assert.match(result.receipt.text,/ = 40/);
 const small=use('acerto-cirurgico',start({damage:100,targetRD:100,spentHit:20}),{...context,hitBonus:3});assert.match(small.receipt.text,/−3 acertos bônus e 6%/);
});
test('fuel discounts one later technique and never raises current RC',()=>{
 const made=use('carne-combustivel');assert.equal(made.lifeDelta,-10);assert.equal(made.rcCost,0);assert.equal(made.state.credit.amount,2);assert.equal(context.currentRC,50);
 const next=resolveTactical(made.state,{type:'turn'},context).state;
 const used=use('laco-constritor',patch(next,{confirmed:true,roll:1}),{...context,currentRC:0});assert.equal(used.rcCost,0);assert.equal(used.state.credit,null);
});
test('blood payment preserves one life and creates one finite retaliation reserve',()=>{
 const result=use('sangue-por-sangue');assert.equal(result.lifeDelta,-20);assert.equal(result.state.retaliation.amount,40);assert.equal(result.rcCost,3);
 assert.match(use('sangue-por-sangue',emptyTacticalState(),{...context,currentLife:20}).error,/pelo menos 1/);
});
test('damage redistribution keeps total damage unchanged and requires willing allies',()=>{
 const result=use('rede-distribuicao',start({incomingDamage:11,confirmed:true}));assert.equal(result.lifeDelta,-3);assert.match(result.receipt.text,/recebe 3; Aliado 1 recebe 3; Aliado 2 recebe 5. Total 11/);
});
test('Atlas wave affects only the second target, without repeating the main attack',()=>{
 const result=cap('forca',start({damage:21,target2RD:4,confirmed:true}));assert.match(result.receipt.text,/10 bruto − RD 4 = 6/);assert.match(result.receipt.text,/nem repete o dano principal/);
});
test('Zero Desvio rerolls only half the lower damage dice and retains a higher old result',()=>{
 const result=cap('precisao',start({damageDice:'2, 4, 7, 10',rerollDice:'8, 9'}));assert.match(result.receipt.text,/total dos dados 34/);
 const lower=cap('precisao',start({damageDice:'2, 4, 7, 10',rerollDice:'1, 1'}));assert.match(lower.receipt.text,/ganho 0; total dos dados 23/);
 assert.match(cap('precisao',start({damageDice:'2,101,4',rerollDice:'5'})).error,/1 a 100/);
});

test('Zero Desvio accepts expanded damage dice and rerolls only the floored lower half',()=>{
 const result=cap('precisao',start({damageDice:'14, 20, 100, 2, 7',rerollDice:'6, 99, 100'}));
 assert.ok(!result.error);assert.match(result.receipt.text,/originais somam 143; refaça 2 resultados/);
 assert.match(result.receipt.text,/Novos dados \[6, 99\]; ganho 96; total dos dados 239/);
 const lower=cap('precisao',start({damageDice:'14, 20, 100, 2, 7',rerollDice:'1, 1'}));
 assert.ok(!lower.error);assert.match(lower.receipt.text,/ganho 0; total dos dados 143/);
});

test('Zero Desvio rejects zero, oversized and fractional originals or rerolls without consuming an action',()=>{
 for(const invalid of ['0','101','1.5'])for(const key of ['damageDice','rerollDice']){
  const inputs={damageDice:'14, 20, 100',rerollDice:'75',[key]:key==='damageDice'?`14, ${invalid}, 100`:invalid};
  const original=start(inputs),result=cap('precisao',original);
  assert.match(result.error,/resultados inteiros de 1 a 100/);
  assert.deepEqual(result.state,original);assert.deepEqual(result.state.usedTurn,{});
 }
});
test('Laplace stores and consumes a natural across turns, never granting a critical or changing dice',()=>{
 const saved=cap('raciocinio',start({roll:30}),{...context,die:30});assert.equal(saved.state.storedNatural,30);assert.equal(saved.state.storedDie,30);
 const next=resolveTactical(saved.state,{type:'turn'},context).state;
 assert.match(cap('raciocinio',patch(next,{roll:10}),{...context,die:20}).error,/guardado é de d30/);
 const used=cap('raciocinio',patch(next,{roll:10,rollModifier:5}),{...context,die:30});assert.equal(used.state.storedNatural,null);assert.match(used.receipt.text,/Total 35. Não pode gerar crítico/);
});
test('rerolls validate d10/d20/d30 naturals and keep one best result',()=>{
 const result=cap('percepcao',start({roll:5,reroll:10,rollModifier:4}),{...context,die:10});assert.match(result.receipt.text,/d10 5 e 10; mantenha 10 \+ modificador 4 = 14/);
 assert.match(cap('percepcao',start({roll:5,reroll:20}),{...context,die:10}).error,/entre 1 e 10/);
 const ally=cap('presenca',start({roll:2,reroll:19,rollModifier:8,target:'Aliado'}));assert.equal(ally.lifeDelta,0);assert.match(ally.receipt.text,/Aliado: naturais de d20/);
});
test('control capstone works at zero RC while suppressed, without generating reserve',()=>{
 const result=cap('controle',emptyTacticalState(),{...context,currentRC:0,isRCSuppressed:true});assert.equal(result.clearRCSuppression,true);assert.equal(result.rcCost,0);assert.equal(result.lifeDelta,0);assert.match(result.receipt.text,/reserva atual permanece a mesma/);
 assert.match(cap('controle',emptyTacticalState(),context).error,/Não há supressão/);
});
test('combat resets temporary reserves, but only a new session resets session uses',()=>{
 const used=use('ultimo-pulso',start({incomingDamage:100})).state;
 const combat=resolveTactical(used,{type:'combat'},context).state;assert.equal(combat.turn,1);assert.deepEqual(combat.usedTurn,{});assert.equal(combat.usedSession.length,1);
 const session=resolveTactical(combat,{type:'session'},context).state;assert.deepEqual(session.usedSession,[]);assert.equal(session.session,2);
});
test('turn synchronization cannot rewind time or clear session cooldowns',()=>{
 const used=use('ultimo-pulso',start({incomingDamage:100})).state;
 const forward=resolveTactical(used,{type:'sync-turn',turn:5},context).state;
 const rewind=resolveTactical(forward,{type:'sync-turn',turn:1},context).state;assert.equal(rewind.turn,5);assert.deepEqual(rewind.usedSession,used.usedSession);
});
test('Quinques expose nine weapon maneuvers without borrowing carrier life or inventing RC',()=>{
 const q={...context,species:'quinque',weaponKind:'quinque',weaponOnly:true,currentRC:0,currentLife:0,maxLife:0};
 assert.deepEqual(tacticalOwnedTechniques(q).map(item=>item.effect).sort(),['ricochet','move','capture','push','precision','counter','maximum','disassemble','mark'].sort());
 assert.match(use('guarda-interposta',start({incomingDamage:50}),q).error,/incompatível/);
 assert.match(use('detonacao-toxica',start({doses:3,poisonPerDose:5}),q).error,/incompatível/);
 const allowed=use('ricochete-duplo',start({damage:10,confirmed:true}),q);assert.ok(!allowed.error);assert.equal(allowed.lifeDelta,0);assert.equal(allowed.rcCost,0);
});
test('RC suppression or inactive Kagune blocks organic tactics without charging resources',()=>{
 const state=start({doses:3,poisonPerDose:5});
 const blocked=use('detonacao-toxica',state,{...context,isRCSuppressed:true});assert.match(blocked.error,/suprimido/);assert.equal(blocked.rcCost,0);assert.deepEqual(blocked.state,state);
 assert.match(use('detonacao-toxica',state,{...context,weaponActive:false}).error,/ativa/);
});
test('save reload preserves prepared effects and log while independent trackers do not mutate each other',()=>{
 const old=emptyTacticalState(),a=use('reserva-dor',start({incomingDamage:50})).state,b=normalizeTacticalState(a);
 assert.deepEqual(normalizeTacticalState(JSON.parse(JSON.stringify(a))),a);
 b.inputs.target='Outro';b.retaliation.amount=7;assert.equal(a.inputs.target,'');assert.equal(a.retaliation.amount,25);assert.equal(old.retaliation,null);
 assert.match(tacticalSummary(a.latest),/Nenhuma ficha de outro alvo foi alterada/);
});
test('history is bounded to fifty events without permitting an extra action in the same turn',()=>{
 let state=emptyTacticalState();for(let count=0;count<60;count++){state=use('recuo-coberto',state).state;state=resolveTactical(state,{type:'turn'},context).state;}
 assert.equal(state.log.length,50);assert.equal(state.turn,61);
});
