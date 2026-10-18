import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {normalizeCharacter:n,calculateCharacter:calc}=await vite.ssrLoadModule('/app/page.tsx');
const {normalizeQuinque:q,calculateQuinque:qc}=await vite.ssrLoadModule('/app/quinque.ts');
const {blankVats,vatsAction,normalizeVats}=await vite.ssrLoadModule('/app/vats-engine.ts');
const dice=x=>parseInt(x,10);
const sheet=(patch={})=>n({species:'ghoul',grade:12,weaponKind:'kagune',kaguneType:'Rinkaku',kaguneActive:true,currentRC:200,baseAttributes:{forca:8,vigor:8,agilidade:8,precisao:8},...patch},7);
const config=s=>{const d=calc(s);return {hasKagune:true,kaguneActive:s.kaguneActive,maxLife:d.maxLife,maxRC:300,rc:200,hunger:0,vigor:8,baseVigor:8,grade:12,regeneration:0,regenLevel:0,superior:0,cells:false,kami:false,durability:d.kaguneDurability,tails:d.maximumTails,naturalTails:d.naturalTails,powers:s.selectedEvolutions,rd:d.rd,movement:1,dodgeTest:d.dodgeTest,blockTest:d.blockTest,paidTailStart:1,tailAttackRC:2};};
test('bônus racial é Grau/2 em quatro testes, nunca em atributos, dano ou quinques',()=>{
 for(const species of ['ghoul','ghoul-artificial','ghoul-dominante','humano','humano-dominante','quinx'])for(const grade of [2,4,6,8,10,12,14]){
 const s=sheet({species,grade}),actual=calc(s),without=calc(s,{quinque:true});
 const bonus=['ghoul','ghoul-artificial','ghoul-dominante'].includes(species)?grade/2:0;
 for(const key of ['kaguneTest','physicalHitTest','blockTest','dodgeTest'])assert.equal(dice(actual[key])-dice(without[key]),bonus,`${species} ${grade} ${key}`);
 assert.deepEqual(actual.attributeTests,without.attributeTests);assert.equal(actual.kaguneDamage,without.kaguneDamage);
 assert.equal(qc(q({grade})).ghoulCombatDice,0);
 }
});
test('caudas recolhidas, reservadas e destruídas ficam fora do dano conjunto',()=>{
 let s=sheet({effects:{'multiplas-caudas':{rank:3}},selectedEvolutions:['oito-caminhos']});
 assert.equal(calc(s).activeTailCount,4);
 for(const action of [{type:'tail-config',index:0,name:'Escudo',role:'guard'},{type:'tail-config',index:1,enabled:false},{type:'break',index:2}])s={...s,...vatsAction(s.vats,config(s),action)};
 const d=calc(s);assert.equal(d.activeTailCount,1);assert.equal(d.rinkakuAllTailsDamage,d.rinkakuTailDamage);assert.equal(d.tails.rd,2);
 assert.equal(vatsAction(s.vats,config(s),{type:'tail-attack',index:1}).currentRC,200);
 assert.equal(n(JSON.parse(JSON.stringify(s)),7).vats.parts[0].name,'Escudo');
 s={...s,...vatsAction(s.vats,config(s),{type:'tail-config',index:3,role:'dodge'})};
 assert.equal(calc(s).tails.rd,0);assert.equal(calc(s).tails.dodge,2);assert.equal(calc(s).activeTailCount,0);assert.equal(calc(s).rinkakuAllTailsDamage,'0');
 assert.equal(calc({...s,kaguneActive:false}).tails.dodge,0);
});
test('Mil Pernas e Mitose cobram RC uma vez, expiram e preservam caudas naturais',()=>{
 let s=sheet({effects:{'multiplas-caudas':{rank:2}},selectedEvolutions:['mil-pernas','mitose-tentacruel']});
 const initial=calc(s);
 const a=vatsAction(s.vats,config(s),{type:'mil-pernas'});assert.equal(a.currentRC,185);s={...s,...a};
 assert.equal(calc(s).maximumTails,5);assert.equal(calc(s).kaguneSteps,initial.kaguneSteps+2);assert.equal(calc(s).kaguneDurability,initial.kaguneDurability-2);
 assert.equal(vatsAction(s.vats,config(s),{type:'mil-pernas'}).currentRC,200);
 const b=vatsAction(s.vats,config(s),{type:'mitosis',amount:3,cost:8});assert.equal(b.currentRC,192);s={...s,...b};assert.equal(calc(s).maximumTails,8);
 s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};assert.equal(calc(s).maximumTails,5);
 s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};assert.equal(calc(s).maximumTails,3);
 assert.equal(vatsAction(blankVats(),{...config(s),rc:1},{type:'mil-pernas'}).vats.milPernasUntil,0);
});
test('Tentáculos Incessantes acumula uma vez por turno e perde sequência sem atacar',()=>{
 let s=sheet({selectedEvolutions:['tentaculos-incessantes']});const base=dice(calc(s).kaguneTest);
 s={...s,...vatsAction(s.vats,config(s),{type:'tentacle-momentum'})};assert.equal(dice(calc(s).kaguneTest),base+1);
 s={...s,...vatsAction(s.vats,config(s),{type:'tentacle-momentum'})};assert.equal(s.vats.tentacleMomentum,1);
 s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};s={...s,...vatsAction(s.vats,config(s),{type:'tentacle-momentum'})};assert.equal(s.vats.tentacleMomentum,2);
 s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};s={...s,...vatsAction(s.vats,config(s),{type:'turn'})};assert.equal(dice(calc(s).kaguneTest),base);
});
test('correções auditadas: Perda de Peso, Arsenal Vivo e dados sacrificados',()=>{
 const base=sheet({kaguneType:'Koukaku',selectedEvolutions:['perda-peso','arsenal-vivo'],perks:{'golpe-preciso':{rank:1}}});
 const d=calc(base),active=calc({...base,damageContext:{...base.damageContext,preciseHitDice:2,active:{'kagune:perda-peso':true,'kagune:arsenal-vivo':true,'kagune:golpe-preciso':true}}});
 assert.equal(dice(active.blockTest)-dice(d.blockTest),4);assert.equal(active.kaguneSteps-d.kaguneSteps,9);assert.equal(active.kaguneDamageModifier,d.kaguneDamageModifier);assert.equal(dice(active.kaguneTest),dice(d.kaguneTest)-2);
 const ukaku=sheet({kaguneType:'Ukaku',selectedEvolutions:['coruka']});assert.equal(calc(ukaku).durabilityMultiplier,.8);
});

test('pagamento conjunto usa apenas ataques disponíveis e respeita RC e descontos',async()=>{
 const {tailLoadout,tailAttackBudget}=await vite.ssrLoadModule('/app/tail-management.ts');
 const v=blankVats();v.parts=Array.from({length:6},()=>({damage:0,ready:0,sacrificedUntil:0}));
 v.parts[2].enabled=false;v.parts[3].role='guard';v.parts[4].ready=2;
 const c={...config(sheet()),tails:6,paidTailStart:1};
 const attacks=tailLoadout(v.parts,6,true,1,0,true).attacks;
 assert.deepEqual(attacks,[0,1,5]);assert.deepEqual(tailAttackBudget(attacks,1,2),{free:1,paid:2,total:4});
 const paid=vatsAction(v,c,{type:'tails-attack'});assert.equal(paid.currentRC,196);assert.equal(paid.vats.rcSpent,4);
 assert.equal(vatsAction(v,{...c,tailAttackRC:1},{type:'tails-attack'}).currentRC,198);
 assert.equal(vatsAction(v,{...c,rc:3},{type:'tails-attack'}).currentRC,3);
 assert.equal(vatsAction(v,{...c,kaguneActive:false},{type:'tails-attack'}).currentRC,200);
 assert.equal(vatsAction(v,{...c,hasKagune:false},{type:'tails-attack'}).currentRC,200);
 v.global.push('Exaurido de RC');assert.equal(vatsAction(v,c,{type:'tails-attack'}).currentRC,200);
});

test('tentáculos manuais persistem, somam dano e cobram custo configurado',()=>{
 let s=sheet();const original=calc(s);
 s={...s,...vatsAction(s.vats,config(s),{type:'manual-tails',amount:3})};
 s={...s,...vatsAction(s.vats,config(s),{type:'manual-tail-cost',amount:4})};
 s={...s,...vatsAction(s.vats,config(s),{type:'tail-config',index:1,name:'Extra A'})};
 assert.equal(calc(s).maximumTails,original.maximumTails+3);assert.equal(calc(s).activeTailCount,4);
 assert.notEqual(calc(s).rinkakuAllTailsDamage,original.rinkakuAllTailsDamage);
 assert.equal(vatsAction(s.vats,config(s),{type:'tails-attack'}).currentRC,188);
 assert.equal(vatsAction(s.vats,config(s),{type:'tail-attack',index:1}).currentRC,196);
 const restored=n(JSON.parse(JSON.stringify(s)),7);assert.equal(restored.vats.manualTails,3);assert.equal(restored.vats.manualTailRC,4);assert.equal(restored.vats.parts[1].name,'Extra A');
 s={...s,...vatsAction(s.vats,config(s),{type:'manual-tail-cost',amount:0})};assert.equal(vatsAction(s.vats,config(s),{type:'tails-attack'}).currentRC,200);
 s={...s,...vatsAction(s.vats,config(s),{type:'manual-tails',amount:0})};assert.equal(calc(s).maximumTails,original.maximumTails);
 assert.equal(normalizeVats({manualTails:100}).manualTails,20);assert.equal(normalizeVats({}).manualTails,0);
});
