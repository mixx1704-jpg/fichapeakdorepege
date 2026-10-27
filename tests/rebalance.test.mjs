import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const r=await vite.ssrLoadModule('/app/character.ts'),q=await vite.ssrLoadModule('/app/quinque.ts'),data=await vite.ssrLoadModule('/app/data.ts');
const t=await vite.ssrLoadModule('/app/tactical.ts'),migration=await vite.ssrLoadModule('/app/perk-migrations.ts');
const combat=await vite.ssrLoadModule('/app/combat-tools.ts'),dice=await vite.ssrLoadModule('/app/damage-dice.ts');
const k=await vite.ssrLoadModule('/app/kakuja-apex.ts'),kd=await vite.ssrLoadModule('/app/kakuja-data.ts');
const colossoModule=await vite.ssrLoadModule('/app/colosso.ts');
const {kakujaReworkPerks}=await vite.ssrLoadModule('/app/kakuja-rework.ts');
const {COMMAND_PERK:command,RETIRED_MIND_PERK:retired}=migration;
const attrs=Object.fromEntries(data.attributeKeys.map(key=>[key,15]));
const own=(...ids)=>Object.fromEntries(ids.map(id=>[id,{rank:1}]));
const sheet=patch=>r.normalizeCharacter({rulesVersion:8,grade:20,species:'ghoul',narrativeLimits:true,weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,baseAttributes:attrs,currentLife:100,currentRC:100,...patch},8);
const context=extra=>({level:20,species:'ghoul',attributes:attrs,ownedPerks:own(...t.tacticalTechniques.map(x=>x.id)),currentRC:100,currentLife:100,maxLife:100,weaponKind:'kagune',weaponActive:true,control:15,die:20,damageFormula:'2d12+10',...extra});
const state=inputs=>t.normalizeTacticalState({inputs});
const use=(suffix,inputs,c=context())=>t.resolveTactical(state(inputs),{type:'use',id:`r26-passos-${suffix}`},c);

test('the retired duplicate disappears from the shop and every other Level20 purchase costs200–400',()=>{
 assert.ok(!data.perks.some(p=>p.id===retired));assert.equal(data.perks.find(p=>p.id===command).cost,150);
 for(const p of data.perks.filter(p=>p.id.startsWith('r26-')&&p.minGrade===20&&p.id!==command))assert.ok(p.cost>=200&&p.cost<=400,`${p.id}: ${p.cost}`);
 for(const p of kakujaReworkPerks.filter(p=>p.grade===20)){assert.equal(p.currency,'PE-K');assert.ok(p.cost>=200&&p.cost<=400);}
});
test('one or both historical purchases migrate into a single command without changing earnedPE',()=>{
 for(const purchases of [own(retired),own(retired,command)]){const s=sheet({perks:purchases,earnedPE:500,progressPE:30});assert.deepEqual(s.perks,own(command));assert.equal(s.earnedPE,500);assert.equal(s.progressPE,30);assert.equal(r.calculateCharacter(s).catalogPerksPE,150);assert.deepEqual(r.normalizeCharacter(s,8).perks,s.perks);}
 const weapon=q.normalizeQuinque({perks:own(retired,command)});assert.deepEqual(weapon.perks,own(command));
});
test('the command merge preserves an already used session cooldown and turn marker',()=>{
 const s=t.normalizeTacticalState({usedSession:[retired,command],usedTurn:{[retired]:4,[command]:2}});
 assert.deepEqual(s.usedSession,[command]);assert.equal(s.usedTurn[command],4);assert.ok(!s.usedTurn[retired]);
});
test('Command adds50 weaponRD exactly once and loses it when retracted or suppressed',()=>{
 const original=sheet(),before=r.calculateCharacter(original),after=r.calculateCharacter({...original,perks:own(command)});
 assert.equal(after.kagunePartRD-before.kagunePartRD,50);assert.equal(after.rd-before.rd,50);
 for(const s of [{...original,kaguneActive:false},{...original,weaponKind:'nenhum',kaguneActive:true},{...original,vats:{...original.vats,rcSuppressedUntil:5}},{...original,vats:{...original.vats,kakuhouUntil:5}}]){
  const a=r.calculateCharacter(s),b=r.calculateCharacter({...s,perks:own(command)});assert.equal(b.rd-a.rd,0);
 }
});
test('an independent Quinque receives its own50RD without a carrier bonus',()=>{
 const weapon=q.normalizeQuinque({grade:20,rulesVersion:8,attributes:attrs,perks:{}}),before=q.calculateQuinque(weapon),after=q.calculateQuinque({...weapon,perks:own(command)});
 assert.equal(after.rd-before.rd,50);assert.equal(after.perkPE-before.perkPE,150);
});
test('Lenda do Dragão adds15physical steps only to its enabled direct strike',()=>{
 const s=sheet({grade:14,perks:own('lenda-dragao')}),before=r.calculateCharacter(s);
 const active=r.calculateCharacter({...s,damageContext:{...s.damageContext,active:{'physical:lenda-dragao':true}}});
 assert.equal(active.physicalSteps-before.physicalSteps,15);assert.equal(active.kaguneSteps,before.kaguneSteps);
 assert.match(data.perks.find(p=>p.id==='lenda-dragao').description,/\+15 Passos/);
});

test('Skadoosh is a40step physical finisher with its historical PE cost intact',()=>{
 const s=sheet({perks:own('skadoosh')}),before=r.calculateCharacter(s),after=r.calculateCharacter({...s,damageContext:{...s.damageContext,active:{'physical:skadoosh':true}}});
 assert.equal(after.physicalSteps-before.physicalSteps,40);assert.equal(after.kaguneSteps,before.kaguneSteps);assert.equal(data.perks.find(p=>p.id==='skadoosh').cost,15);
});
test('linked endgame percentages accumulate on one original subtotal and stay within75percent',()=>{
 const s=sheet({perks:own('r26-exp-geral-coroa-da-devastacao','r26-escala-potencia-continua','r26-escala-pico-predatorio')});
 const d=r.calculateCharacter(s);assert.equal(d.scaling.percentages.kaguneSteps,75);
 assert.equal(d.scaling.bonuses.kaguneSteps,Math.floor((d.scaling.totals.kaguneSteps-d.scaling.bonuses.kaguneSteps)*.75));
});
test('Colapso Controlado guarantees a scaled floor once on the entire fused attack',()=>{
 const input={steps:20,flat:10,rd:50,confirmed:true,perks:own('r26-critico-colapso-controlado'),context:{level:20,attributes:attrs},die:20,parts:5,ordinaryFormula:'20d12+50'};
 const c=combat.prepareCriticalAttack(input),stats=dice.damageStatistics(c.formula);
 assert.equal(c.stepsPercent,50);assert.equal(c.flatBonus,0);
 assert.equal(c.minimumRawDamage,Math.max(60,Math.floor(stats.diceMaximum*.75)+stats.flat));
 assert.equal(combat.prepareCriticalAttack({...input,confirmed:false}).minimumRawDamage,0);
 assert.equal(combat.prepareCriticalAttack({...input,context:{level:19,attributes:attrs}}).minimumRawDamage,0);
});
test('seven extra capstone techniques have distinct effects and existing purchase IDs',()=>{
 const extra=t.tacticalCapstones.filter(x=>x.id.startsWith('r26-passos-')&&x.id!==command);
 assert.equal(extra.length,7);assert.equal(new Set(extra.map(x=>x.effect)).size,7);
 for(const x of extra){assert.ok(data.perks.some(p=>p.id===x.id));assert.equal(x.pe,0);assert.equal(x.min,15);}
});
test('Cerco Vivo consumes a finite shield before life and cannot be prepared twice per session',()=>{
 const prepared=use('vigor-cerco-vivo',{},context());assert.ok(!prepared.error);assert.equal(prepared.state.aegis.remaining,40);assert.equal(prepared.lifeDelta,0);
 const informed=t.resolveTactical(prepared.state,{type:'inputs',patch:{incomingDamage:65}},context());
 const impact=t.resolveTactical(informed.state,{type:'resolve-aegis'},context());assert.equal(impact.lifeDelta,-25);assert.equal(impact.state.aegis,null);
 assert.ok(t.resolveTactical(impact.state,{type:'resolve-aegis'},context()).error);
 const next=t.resolveTactical(impact.state,{type:'turn'},context());assert.ok(t.resolveTactical(next.state,{type:'use',id:'r26-passos-vigor-cerco-vivo'},context()).error);
});
test('Ponto Final maximizes only the current ordinary weapon expression once per session',()=>{
 const result=use('precisao-ponto-final',{targetRD:10,confirmed:true});assert.ok(!result.error);assert.match(result.receipt.text,/máximo bruto 34; após RD 10, dano 24/);
 const next=t.resolveTactical(result.state,{type:'turn'},context());assert.ok(t.resolveTactical(next.state,{type:'use',id:'r26-passos-precisao-ponto-final'},context()).error);
});
test('the light sequence caps at140percent and consumes both tactical action slots',()=>{
 const result=use('agilidade-impacto-luz',{damage:200,targetRD:30,confirmed:true});assert.ok(!result.error);assert.match(result.receipt.text,/140 bruto por golpe/);assert.match(result.receipt.text,/280 bruto total/);
 assert.equal(result.state.usedTurn.action,1);assert.equal(result.state.usedTurn.reaction,1);assert.equal(result.state.inputs.damage,0);
});
test('Demolição divides one damage pool between body and weapon with independent armor',()=>{
 const result=use('raciocinio-demolicao-exata',{damage:200,targetRD:30,target2RD:10,confirmed:true});assert.ok(!result.error);assert.match(result.receipt.text,/Corpo: 70/);assert.match(result.receipt.text,/arma: 90/);
});
test('Presa Terminal consumes two openings and uses the strongest penetration without stacking',()=>{
 let s=use('percepcao-presa-terminal',{target:'Alvo',confirmed:true}).state;
 for(let turn=0;turn<2;turn++){
  s=t.resolveTactical(s,{type:'inputs',patch:{damage:200,targetRD:100,confirmed:true}},context()).state;
  const result=t.resolveTactical(s,{type:'use-mark'},context({penetrationPercent:50}));assert.ok(!result.error);assert.match(result.receipt.text,/penetração 50%.*= 150/);s=result.state;
 }
 assert.equal(s.mark,null);assert.ok(t.resolveTactical(s,{type:'use-mark'},context()).error);
});
test('Quebra-Mundo produces one75percent wave and never reapplies the principal strike',()=>{
 const result=use('forca-quebra-mundo',{damage:200,target2RD:40,targetVigor:5,targetControl:5,roll:1,confirmed:true});assert.ok(!result.error);assert.match(result.receipt.text,/150 bruto − RD 40 = 110/);assert.equal(result.state.inputs.damage,0);
});
test('Peso de um Império swaps real naturals rather than granting a free reroll',()=>{
 const result=use('presenca-peso-imperio',{roll:19,reroll:4,confirmed:true});assert.ok(!result.error);assert.match(result.receipt.text,/aliado usa 19, você usa 4/);assert.equal(result.state.usedTurn.reaction,1);
 assert.ok(use('presenca-peso-imperio',{roll:19,reroll:4,confirmed:true},context({die:10})).error);
});
test('Kakuja apex actions charge the independent reserve once and consume confirmed input',()=>{
 const original={...kd.blankKakujaState(),active:true,complete:true,cannibalPE:100,currentReserve:50,selectedPerks:['k20-deus-devorador','k20-soberano-eterno'],apex:{damage:200,spend:10,confirmed:true,receipt:''}},c={level:20,species:'ghoul'};
 const attack=k.resolveKakujaApex(original,{type:'attack'},c);assert.ok(!attack.error);assert.equal(attack.state.currentReserve,40);assert.match(attack.state.apex.receipt,/200 bruto \+ 25% \(50\) = 250/);
 const repeated=k.resolveKakujaApex(attack.state,{type:'attack'},c);assert.ok(repeated.error);assert.equal(repeated.state.currentReserve,40);
 const defense=k.resolveKakujaApex({...original,apex:{...original.apex,damage:401}},{type:'absorb'},c);assert.match(defense.state.apex.receipt,/100 absorvidos.*restam 301/);
 assert.ok(k.resolveKakujaApex(original,{type:'attack'},{...c,suppressed:true}).error);assert.ok(k.resolveKakujaApex({...original,currentReserve:0},{type:'attack'},c).error);
});

test('fusion counts shared new perk bonuses once while retaining the independent damage of every part',()=>{
 const s=sheet({effects:{'multiplas-caudas':{rank:2}},perks:own('r26-colosso-carne','r26-golpe-denso'),colossoActive:true});
 const d=r.calculateCharacter(s);assert.equal(d.colosso.partCount,3);assert.equal(d.fusionSharedSteps,3);
 const full=r.formatDamage(d.kaguneSteps-2,d.kaguneDamageModifier),other=r.formatDamage(d.kaguneSteps-2-3,d.kaguneDamageModifier-d.fusionSharedFlat);
 const {sumPartDamage}=colossoModule;
 assert.equal(d.kaguneDamage,sumPartDamage([full,other,other]));
 assert.equal(d.colosso.damage,d.kaguneDamage);
 assert.ok(dice.damageStatistics(d.kaguneDamage).maximum<dice.damageStatistics(sumPartDamage([full,full,full])).maximum);
 const c=combat.prepareCriticalAttack({steps:d.kaguneSteps-2,flat:d.kaguneDamageModifier,confirmed:true,parts:3,sharedSteps:d.fusionSharedSteps,sharedFlat:d.fusionSharedFlat,ordinaryFormula:d.kaguneDamage,perks:s.perks,context:{level:20,attributes:attrs}});
 const cUnshared=combat.prepareCriticalAttack({steps:d.kaguneSteps-2,flat:d.kaguneDamageModifier,confirmed:true,parts:3,ordinaryFormula:d.kaguneDamage,perks:s.perks,context:{level:20,attributes:attrs}});
 assert.ok(dice.damageStatistics(c.formula).maximum<dice.damageStatistics(cUnshared.formula).maximum);
});
