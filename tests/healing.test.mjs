import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const healing=await vite.ssrLoadModule('/app/healing.ts');
const {blankVats,normalizeVats,vatsAction,isRCSuppressed}=await vite.ssrLoadModule('/app/vats-engine.ts');
const config={currentLife:10,species:'ghoul',maxLife:200,maxRC:100,rc:100,hunger:0,vigor:15,baseVigor:10,grade:20,regeneration:10,regenLevel:1,superior:0,cells:false,kami:false,hasKagune:true,durability:40,tails:2,powers:healing.healingTechniques.map(t=>t.id),rd:4,movement:2,dodgeTest:'1d20+15',blockTest:'1d20+15'};
const act=(state,patch={},cfg=config,roll=()=>12)=>vatsAction(state,cfg,{type:'healing-technique',healingId:'r26-cura-20',healingTarget:'life',...patch},roll);

test('twelve healing and support purchases include a genuine 12d12 top tier',()=>{
 assert.equal(healing.healingPerks.length,12);
 const top=healing.healingTechniques.find(t=>t.id==='r26-cura-20');
 assert.equal(healing.healingFormula(top),'12d12');
 const r=healing.rollHealing(top,()=>12);
 assert.deepEqual(r.rolls,Array(12).fill(12));assert.equal(r.total,144);
 assert.equal(healing.rollHealing(top,()=>0.5).total,12);
 assert.equal(healing.rollHealing(top,()=>Infinity).total,12);
});
test('general healing rolls once, charges once and only heals general life',()=>{
 const v=blankVats();v.body.armL.damage=50;
 const r=act(v);
 assert.equal(r.currentLife,154);assert.equal(r.currentRC,85);
 assert.equal(r.vats.body.armL.damage,50);assert.equal(r.vats.activeHealTurn,1);
 assert.equal(r.vats.healingResult.total,144);assert.equal(r.vats.healingResult.applied,144);
 assert.equal(v.healingResult,null,'source state remains untouched');
 const repeated=act(r.vats,{}, {...config,currentLife:154,rc:r.currentRC});
 assert.equal(repeated.currentRC,85);assert.equal(repeated.currentLife,undefined);
});
test('healing caps at missing PV and region healing never changes general life',()=>{
 const r=act(blankVats(),{}, {...config,currentLife:195});
 assert.equal(r.currentLife,200);assert.equal(r.vats.healingResult.applied,5);
 const v=blankVats();v.body.armL.damage=17;
 const local=act(v,{healingTarget:'body',region:'armL'});
 assert.equal(local.vats.body.armL.damage,0);assert.equal(local.currentLife,undefined);
 assert.equal(local.vats.healingResult.applied,17);
});
test('invalid species, purchases, levels, full life and destroyed regions do not charge or roll',()=>{
 let rolled=0;const die=()=>{rolled++;return 12;};
 for(const patch of [{species:'humano'},{species:'quinx'},{grade:19},{vigor:14},{powers:[]},{rc:14},{currentLife:200}]){
  const r=act(blankVats(),{}, {...config,...patch},die);
  assert.equal(r.currentRC,patch.rc??100);assert.equal(r.vats.activeHealTurn,0);
 }
 const v=blankVats();v.body.armL.destroyed=true;v.body.armL.damage=200;
 assert.equal(act(v,{healingTarget:'body',region:'armL'},config,die).currentRC,100);
 assert.equal(rolled,0);
});
test('ally healing pays and produces a receipt without changing the user life or injuries',()=>{
 const v=blankVats();v.body.armL.damage=12;
 const r=act(v,{ally:true});
 assert.equal(r.currentLife,undefined);assert.equal(r.currentRC,85);
 assert.equal(r.vats.body.armL.damage,12);assert.equal(r.vats.healingResult.ally,true);
 assert.match(healing.healingSummary(r.vats.healingResult),/12d12/);
 assert.match(healing.healingSummary(r.vats.healingResult),/ficha do aliado/);
});
test('active healing and passive regeneration each retain their own once-per-turn accounting',()=>{
 const v=blankVats();v.body.armL.damage=25;
 const first=act(v);
 const passive=vatsAction(first.vats,{...config,rc:first.currentRC},{type:'passive'});
 assert.equal(passive.vats.body.armL.damage,15);assert.equal(passive.vats.healedTurn,1);
 const next=vatsAction(passive.vats,{...config,rc:passive.currentRC},{type:'turn'});
 assert.equal(act(next.vats,{}, {...config,rc:next.currentRC}).vats.activeHealTurn,2);
});
test('physical support removes only a selected physical condition without healing PV',()=>{
 const v=blankVats();v.body.torso.effects=['Hemorragia','Costelas Quebradas'];v.body.torso.damage=33;
 const r=act(v,{healingId:'r26-sutura-emergencia',healingTarget:'body',region:'torso',effect:'Hemorragia'});
 assert.deepEqual(r.vats.body.torso.effects,['Costelas Quebradas']);assert.equal(r.vats.body.torso.damage,33);assert.equal(r.currentRC,96);
 const invalid=act(v,{healingId:'r26-sutura-emergencia',healingTarget:'body',region:'torso',effect:'Cego'});
 assert.equal(invalid.currentRC,100);
});
test('organic reconstruction restores one destroyed body part at one PV',()=>{
 const v=blankVats();v.body.armL={damage:200,destroyed:true,effects:['Braço Destruído','Hemorragia']};
 const r=act(v,{healingId:'r26-reconstrucao-organica',healingTarget:'body',region:'armL'});
 assert.equal(r.vats.body.armL.destroyed,false);assert.equal(r.vats.body.armL.damage,199);
 assert.deepEqual(r.vats.body.armL.effects,['Hemorragia']);assert.equal(r.currentRC,92);
});
test('organic support repairs lost Kakuhou without manifesting the Kagune or healing general life',()=>{
 const v=blankVats();v.kakuhouUntil=8;
 const r=act(v,{healingId:'r26-reconstrucao-organica',healingTarget:'kakuhou'}, {...config,kaguneActive:false});
 assert.equal(r.vats.kakuhouUntil,0);assert.equal(r.currentRC,92);assert.equal(r.currentLife,undefined);
});
test('organic support repairs one broken Kagune part and forbids separate repair during fusion',()=>{
 const v=blankVats();v.parts=[{damage:40,ready:5,sacrificedUntil:5}];
 const r=act(v,{healingId:'r26-reconstrucao-organica',healingTarget:'part',index:0});
 assert.equal(r.vats.parts[0].ready,0);assert.equal(r.vats.parts[0].sacrificedUntil,0);assert.equal(r.vats.parts[0].damage,39);
 assert.equal(act(v,{healingId:'r26-reconstrucao-organica',healingTarget:'part',index:0},{...config,colossoActive:true}).currentRC,100);
});
test('RC suppression blocks spending while retaining the reserve and can be treated at zero RC',()=>{
 const v=blankVats();
 const suppressed=vatsAction(v,config,{type:'suppress-rc',amount:4});
 assert.equal(isRCSuppressed(suppressed.vats),true);assert.equal(suppressed.currentRC,100);
 const blocked=act(suppressed.vats);assert.equal(blocked.currentRC,100);assert.equal(blocked.vats.healingResult,null);
 const fixed=act(suppressed.vats,{healingId:'r26-desbloqueio-rc',healingTarget:'rc'},{...config,rc:0});
 assert.equal(fixed.currentRC,0);assert.equal(isRCSuppressed(fixed.vats),false);assert.equal(fixed.vats.rcRemedyUsed,true);
 const repeat=act({...fixed.vats,turn:2,rcSuppressedUntil:6},{healingId:'r26-desbloqueio-rc',healingTarget:'rc'});
 assert.equal(isRCSuppressed(repeat.vats),true);assert.equal(repeat.currentRC,100);
 const session=vatsAction(repeat.vats,config,{type:'session'});
 assert.equal(session.vats.rcRemedyUsed,false);
});
test('healing receipts, suppression and turn restrictions survive JSON roundtrip',()=>{
 const result=act(blankVats());
 const normalized=normalizeVats(JSON.parse(JSON.stringify({...result.vats,rcSuppressedUntil:5})));
 assert.equal(normalized.activeHealTurn,1);assert.equal(normalized.rcSuppressedUntil,5);
 assert.deepEqual(normalized.healingResult,result.vats.healingResult);
 assert.equal(normalizeVats().activeHealTurn,0);assert.equal(normalizeVats().healingResult,null);
 assert.equal(normalizeVats({healingResult:{id:'unknown'},rcSuppressedUntil:NaN}).healingResult,null);
});
