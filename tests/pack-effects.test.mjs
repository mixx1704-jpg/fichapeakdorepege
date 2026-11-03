import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const engine=await vite.ssrLoadModule('/app/pack-effects.ts');
const {NEW_PACK_DEFINITIONS:definitions}=await vite.ssrLoadModule('/app/new-pack-catalog.ts');
const p=n=>`n26-pack-perk-${String(n).padStart(3,'0')}`;
const q=n=>`n26-pack-property-${String(n).padStart(3,'0')}`;
const attributes=Object.fromEntries(['forca','vigor','precisao','agilidade','raciocinio','percepcao','presenca','controle'].map(a=>[a,15]));
function context(ids=[],conditions={},overrides={}){
 return {perks:Object.fromEntries(ids.map(id=>[id,{rank:1}])),attributes:{...attributes},level:20,species:'ghoul',kaguneTypes:['Ukaku','Koukaku','Rinkaku','Bikaku'],primaryKaguneType:'Ukaku',weaponActive:true,weaponKind:'kagune',hasRC:true,maxLife:500,currentLife:500,maxRC:100,currentRC:100,tailCount:4,baseRD:50,kaguneRD:40,baseBlock:50,baseDodge:50,conditions,...overrides};
}
const calculate=(ids,states={},overrides={})=>engine.calculatePackEffects(context(ids,states,overrides));

test('unowned pack grants neither bonuses, controls, resources nor permissions',()=>{
 const actual=calculate([]);
 assert.deepEqual(actual.bonuses,engine.emptyPackEffects().bonuses);
 assert.equal(actual.damageMultiplier.physical,1);
 assert.deepEqual(actual.controls,[]);assert.deepEqual(actual.receipts,[]);assert.deepEqual(actual.permissions,[]);
});
test('all 280 entries retain source permissions when acquired and eligible',()=>{
 const actual=calculate(definitions.map(d=>d.id));
 assert.equal(actual.eligiblePerkIds.length,280);
 assert.equal(actual.permissions.length,280);
 assert.equal(new Set(actual.permissions.map(p=>p.perkId)).size,280);
 for(const permission of actual.permissions)assert.ok(permission.text.length>0,permission.name);
});
test('state normalization removes foreign keys, nonfinite numbers and malformed objects',()=>{
 const input={[p(1)]:{counter:99.8,active:true,mode:'x'.repeat(100),value:NaN,secondaryCounter:Infinity,evil:5},[q(8)]:{counter:-20},foreign:{active:true},[q(9)]:null};
 const actual=engine.normalizePackConditions(input);
 assert.deepEqual(actual[p(1)],{active:true,counter:99,mode:'x'.repeat(80)});
 assert.deepEqual(actual[q(8)],{counter:0});assert.equal(actual.foreign,undefined);assert.equal(actual[q(9)],undefined);
 assert.deepEqual(engine.normalizePackConditions([]),{});
});
test('per-perk counters and select options clamp hostile saved values',()=>{
 const actual=calculate([p(1),p(156),q(86)],{[p(1)]:{counter:999999},[p(156)]:{mode:'grant-everything'},[q(86)]:{counter:999999}});
 assert.equal(actual.bonuses.physicalHit,0); // +3 Predador, −3 Conversão; invalid mode grants nothing.
 assert.equal(actual.bonuses.physicalSteps,6);
 assert.equal(actual.controls.find(c=>c.perkId===p(1)).max,4);
});
test('eligibility uses requirement attributes rather than its own attribute modifiers',()=>{
 const req={...attributes,forca:3};
 const actual=calculate([p(125),q(80)],{[p(125)]:{active:true},[q(80)]:{mode:'forca'}},{attributes:{...attributes,forca:20},requirementAttributes:req});
 assert.ok(!actual.eligiblePerkIds.includes(p(125)));
 assert.equal(actual.bonuses.attributes.forca,1);
 assert.equal(actual.bonuses.physicalSteps,0);
});
test('NaN attributes and low levels cannot bypass requirements',()=>{
 assert.deepEqual(calculate([p(125)],{}, {attributes:{...attributes,forca:NaN}}).eligiblePerkIds,[]);
 assert.deepEqual(calculate([p(180)],{}, {level:19}).eligiblePerkIds,[]);
});
test('Bikaku can borrow a level-14 family perk but not level-16 or Chimera entries',()=>{
 const actual=calculate([p(48),p(49),p(101)],{[p(48)]:{active:true},[p(49)]:{active:true},[p(101)]:{active:true}},{kaguneTypes:['Bikaku'],primaryKaguneType:'Bikaku'});
 assert.deepEqual(actual.eligiblePerkIds,[p(48)]);
 assert.equal(actual.damageMultiplier.kagune,1.3);
 const noBikaku=calculate([p(48)],{[p(48)]:{active:true}},{kaguneTypes:['Rinkaku'],primaryKaguneType:'Rinkaku'});
 assert.equal(noBikaku.damageMultiplier.kagune,1);
});
test('repeated family strings cannot manufacture a triple Chimera',()=>{
 const actual=calculate([p(119)],{[p(119)]:{active:true}},{kaguneTypes:['Ukaku','Ukaku','Ukaku']});
 assert.deepEqual(actual.eligiblePerkIds,[]);
});
test('biological properties cannot activate for a human or a Quinque',()=>{
 assert.equal(calculate([q(2)],{}, {species:'humano',hasRC:true}).eligiblePerkIds.length,0);
 assert.equal(calculate([q(2)],{}, {quinque:true,weaponKind:'quinque'}).eligiblePerkIds.length,0);
 assert.equal(calculate([q(2)],{}, {hasRC:false}).eligiblePerkIds.length,0);
});
test('putting away the weapon preserves controls but suspends family defense and structural receipts',()=>{
 const ids=[p(52),q(70),q(35),q(2),p(24)],states={[p(52)]:{active:true},[q(70)]:{active:true}};
 const off=calculate(ids,states,{weaponActive:false});
 assert.equal(off.bonuses.rd,0);assert.equal(off.rangeMultiplier,1);
 assert.equal(off.damageMultiplier.kagune,1);assert.equal(off.rcMultiplier,1.1);
 assert.ok(off.controls.some(c=>c.perkId===p(52)));
 assert.ok(off.receipts.find(r=>r.perkId===q(35)).disabled);
 assert.equal(off.receipts.find(r=>r.perkId===q(2)).restoreRC,20);
 assert.notEqual(off.receipts.find(r=>r.perkId===q(2)).disabled,true);
});
test('Predador and Pressão grow only from explicit events and respect their distinct caps',()=>{
 const actual=calculate([p(1),p(2)],{[p(1)]:{counter:4},[p(2)]:{counter:9}});
 assert.equal(actual.bonuses.physicalHit,3);assert.equal(actual.bonuses.kaguneHit,3);
 assert.equal(actual.bonuses.physicalSteps,9);assert.equal(actual.bonuses.kaguneSteps,9);
 assert.equal(calculate([p(1),p(2)]).bonuses.physicalSteps,0);
});
test('Ritmo and postures apply one exclusive choice',()=>{
 const hit=calculate([p(8)],{[p(8)]:{counter:3,mode:'hit'}});
 assert.equal(hit.bonuses.physicalHit,3);assert.equal(hit.bonuses.dodge,0);
 const dodge=calculate([p(8)],{[p(8)]:{counter:3,mode:'dodge'}});
 assert.equal(dodge.bonuses.physicalHit,0);assert.equal(dodge.bonuses.dodge,3);
});
test('low-life automatic conditions use strict percentage boundaries',()=>{
 const ids=[p(28),p(69),p(79),p(132),p(179)];
 assert.equal(calculate(ids,{}, {currentLife:375}).bonuses.kaguneSteps,0);
 assert.equal(calculate(ids,{}, {currentLife:374}).bonuses.kaguneSteps,2);
 assert.equal(calculate(ids,{}, {currentLife:250}).bonuses.rd,0);
 assert.equal(calculate(ids,{}, {currentLife:249}).bonuses.rd,7);
 assert.equal(calculate(ids,{}, {currentLife:150}).regenMultiplier,1);
 assert.equal(calculate(ids,{}, {currentLife:149}).regenMultiplier,1.25);
 assert.equal(calculate(ids,{}, {currentLife:50}).bonuses.block,0);
 assert.equal(calculate(ids,{}, {currentLife:49}).bonuses.block,4);
});
test('Dor and Monstro Ferido scale by complete health-loss bands only',()=>{
 const actual=calculate([p(29),p(81)],{}, {currentLife:125});
 assert.equal(actual.bonuses.physicalSteps,6);
 assert.equal(actual.damageMultiplier.kagune,1.18);
 const minimum=calculate([p(29),p(81)],{}, {currentLife:0});
 assert.equal(minimum.bonuses.physicalSteps,8);assert.equal(minimum.damageMultiplier.kagune,1.24);
});
test('RC above-half condition is automatic, while start-of-turn snapshot remains an explicit flag',()=>{
 assert.equal(calculate([p(151)],{}, {currentRC:50}).bonuses.kaguneHit,0);
 assert.equal(calculate([p(151)],{}, {currentRC:51}).bonuses.kaguneHit,2);
 assert.equal(calculate([p(23)],{}, {currentRC:100}).bonuses.kaguneHit,0);
 assert.equal(calculate([p(23)],{[p(23)]:{active:true}},{currentRC:0}).bonuses.kaguneHit,2);
});
test('tail bonuses reflect real active parts and do not create parts',()=>{
 assert.equal(calculate([p(70)],{}, {tailCount:1}).bonuses.kaguneHit,0);
 assert.equal(calculate([p(70)],{}, {tailCount:2}).bonuses.kaguneHit,1);
 assert.equal(calculate([p(70)],{}, {tailCount:4}).bonuses.kaguneHit,2);
 assert.equal(calculate([p(106)],{}, {tailCount:8}).bonuses.kaguneSteps,6);
 const temporary=calculate([p(82)]);assert.equal(temporary.bonuses.kaguneHit,0);
 assert.equal(temporary.receipts[0].costRC,8);
});
test('fractional body conversion floors and never refunds or spends resources by itself',()=>{
 const input=context([p(166),p(167),q(1)],{[p(166)]:{value:119},[p(167)]:{active:true},[q(1)]:{counter:5,secondaryCounter:11}});
 const before=JSON.stringify(input),actual=engine.calculatePackEffects(input);
 assert.equal(actual.bonuses.physicalSteps,11);
 assert.equal(actual.receipts.find(r=>r.perkId===p(167)).costLife,50);
 assert.equal(actual.receipts.find(r=>r.perkId===q(1)&&r.heal).heal,2);
 assert.equal(actual.receipts.find(r=>r.perkId===q(1)&&r.restoreRC).restoreRC,2);
 assert.equal(JSON.stringify(input),before);
});
test('damage products cap at two while penalties still multiply',()=>{
 const ids=[p(7),p(10),p(12),p(19),p(153),p(154),p(157),p(164),p(167),p(170),p(178),p(180)];
 const states=Object.fromEntries(ids.map(id=>[id,{active:true,mode:'win',value:0}]));
 const actual=calculate(ids,states,{currentLife:50});
 assert.equal(actual.damageMultiplier.physical,2);assert.equal(actual.damageMultiplier.kagune,2);
 const loss=calculate([p(153)],{[p(153)]:{mode:'loss'}});
 assert.equal(loss.damageMultiplier.physical,.9);
});
test('structure bonus stays separate from ordinary damage and rounds only on application',()=>{
 const actual=calculate([p(127),p(154)],{[p(154)]:{active:true}});
 assert.equal(actual.structureDamageMultiplier,1.5);assert.equal(actual.damageMultiplier.physical,1.35);
 assert.equal(engine.applyPackMultiplier(201,1.35),271);
 assert.equal(engine.applyPackMultiplier(201,Math.min(3,actual.structureDamageMultiplier*actual.damageMultiplier.physical)),407);
});
test('RD sacrifice affects Kagune RD independently and never removes body RD twice',()=>{
 const actual=calculate([p(59)],{[p(59)]:{active:true}});
 assert.equal(actual.rdMultiplier,1);assert.equal(actual.kaguneRDMultiplier,.75);
 assert.equal(actual.damageMultiplier.kagune,1.2);assert.equal(actual.damageMultiplier.physical,1);
 const sacrifice=calculate([p(64)],{[p(64)]:{counter:10}},{baseRD:7});
 assert.equal(sacrifice.bonuses.rd,0);assert.equal(sacrifice.rdSacrifice,7);assert.equal(sacrifice.bonuses.kaguneSteps,3);
});
test('RD multipliers multiply and cap without overriding an explicit zero-RD drawback',()=>{
 const ids=[p(31),p(56),p(63),p(67),p(110),p(115),p(124),p(131),p(180)];
 const states=Object.fromEntries(ids.map(id=>[id,{active:true,mode:'rd'}]));
 const actual=calculate(ids,states);assert.equal(actual.rdMultiplier,2);
 const zero=calculate([...ids,p(32)],{...states,[p(32)]:{active:true}});assert.equal(zero.rdMultiplier,0);
});
test('strongest penetration wins while flat guard rupture remains a distinct target adjustment',()=>{
 const actual=calculate([p(16),p(17),p(47),p(135),p(171)],{[p(16)]:{counter:3},[p(17)]:{counter:9},[p(47)]:{active:true},[p(135)]:{active:true},[p(171)]:{counter:3}});
 assert.equal(actual.penetrationPercent,25);assert.equal(actual.targetRDReduction,6);
});
test('life and RC multipliers remain independent of damage and do not fill current resources',()=>{
 const actual=calculate([p(24),p(129),p(174),p(175)]);
 assert.ok(Math.abs(actual.lifeMultiplier-1.265)<1e-12);
 assert.equal(actual.rcMultiplier,1.32);assert.equal(actual.damageMultiplier.physical,1);
 assert.deepEqual(actual.receipts,[]);
});
test('discount sources aggregate and minimum paid RC stays one',()=>{
 const ids=[p(3),p(21),p(27),p(150),p(152),p(180),q(91)];
 const states=Object.fromEntries(ids.map(id=>[id,{active:true,counter:5}]));
 const actual=calculate(ids,states);
 assert.equal(actual.rcDiscount,11);assert.equal(actual.rcCostIncrease,1);
 assert.equal(engine.packRCCost(6,actual),1);assert.equal(engine.packRCCost(0,actual),0);
});
test('regeneration-only discounts do not reduce attacks',()=>{
 const actual=calculate([p(71),p(116)],{[p(71)]:{counter:3},[p(116)]:{active:true}});
 assert.equal(actual.regenRCDiscount,4);assert.equal(actual.rcDiscount,0);
});
test('Metabolismo hunger capacity penalty uses the highest band once',()=>{
 const actual=calculate([q(8)],{}, {hunger:10});
 assert.equal(actual.bonuses.rc,-15);assert.equal(actual.bonuses.physicalSteps,8);
 assert.equal(calculate([q(8)],{}, {hunger:0}).bonuses.rc,0);
});
test('Ossos replaces the block attribute by an explicit permanent choice',()=>{
 assert.equal(calculate([q(12)]).blockAttribute,undefined);
 const actual=calculate([q(12)],{[q(12)]:{mode:'controle'}});
 assert.equal(actual.blockAttribute,'controle');assert.equal(actual.bonuses.block,0);
});
test('symmetry checks actual attributes and does not grant attributes itself',()=>{
 const actual=calculate([q(13)],{}, {attributes:{...attributes,forca:10,agilidade:11,vigor:10,controle:12}});
 assert.equal(actual.bonuses.physicalHit,2);assert.equal(actual.bonuses.block,0);
 assert.deepEqual(actual.bonuses.attributes,engine.emptyPackEffects().bonuses.attributes);
});
test('Compactação and Expansão cannot multiply their benefits together',()=>{
 const both=calculate([q(70),q(71)],{[q(70)]:{active:true},[q(71)]:{active:true}});
 assert.equal(both.rangeMultiplier,.5);assert.equal(both.damageMultiplier.kagune,1.15);
 const expanded=calculate([q(71)],{[q(70)]:{active:true},[q(71)]:{active:true}});
 assert.equal(expanded.rangeMultiplier,1.5);assert.equal(expanded.damageMultiplier.kagune,.85);
});
test('Matriz adds five regeneration only inside the declared active field, with finite creation receipt',()=>{
 const active=calculate([q(33)],{[q(33)]:{active:true}});
 assert.equal(active.bonuses.regen,5);assert.equal(active.receipts[0].costRC,15);
 assert.equal(calculate([q(33)]).bonuses.regen,0);
});
test('one resource receipt never turns into a passive regeneration loop',()=>{
 const actual=calculate([q(1),q(2),q(32),q(42),q(44),q(45),q(63),q(85)],{[q(32)]:{active:true},[q(44)]:{active:true},[q(63)]:{counter:3}});
 assert.equal(actual.bonuses.regen,0);assert.equal(actual.bonuses.rc,0);
 assert.equal(actual.receipts.find(r=>r.perkId===q(42)).restoreRC,4);
 assert.equal(actual.receipts.find(r=>r.perkId===q(42)).costLife,10);
 assert.equal(actual.receipts.find(r=>r.perkId===q(63)).restoreRC,undefined);
});
test('impact and accuracy conversions preserve their explicit costs, including odd step sacrifices',()=>{
 const accuracy=calculate([q(86)],{[q(86)]:{counter:3}});
 assert.equal(accuracy.bonuses.physicalHit,-3);assert.equal(accuracy.bonuses.physicalSteps,6);
 const impact=calculate([q(87)],{[q(87)]:{counter:3}});
 assert.equal(impact.bonuses.physicalHit,1);assert.equal(impact.bonuses.physicalSteps,-3);
});
test('defense conversion respects the chosen direction and available source defense',()=>{
 const actual=calculate([q(88)],{[q(88)]:{counter:4,mode:'dodge'}},{baseBlock:2});
 assert.equal(actual.bonuses.block,-2);assert.equal(actual.bonuses.dodge,2);
});
test('target-specific attribute checks do not increase the underlying attribute or all combat stats',()=>{
 const actual=calculate([q(96),q(97),q(98)],{[q(96)]:{active:true},[q(97)]:{active:true},[q(98)]:{active:true,counter:3}});
 assert.equal(actual.bonuses.attributeChecks.percepcao,3);assert.equal(actual.bonuses.attributeChecks.agilidade,3);
 assert.equal(actual.bonuses.attributes.percepcao,0);assert.equal(actual.bonuses.dodge,0);
});
test('resource extreme grants only the last declared stage and does not detect or retrigger crossings',()=>{
 const actual=calculate([q(90)],{[q(90)]:{mode:'25'}},{currentRC:100});
 assert.equal(actual.bonuses.physicalSteps,2);assert.equal(actual.rcDiscount,0);assert.equal(actual.bonuses.rd,0);
 assert.equal(calculate([q(90)]).bonuses.physicalSteps,0);
});
test('Entropy clamps to five live conditional buffs and temporary overflow never alters the normal maximum',()=>{
 const actual=calculate([q(91),q(93)],{[q(91)]:{counter:999},[q(93)]:{mode:'rc'}});
 assert.equal(actual.damageMultiplier.physical,1.1);assert.equal(actual.rcCostIncrease,1);
 assert.equal(actual.temporaryRCCapMultiplier,1.2);assert.equal(actual.rcMultiplier,1);
 const penalty=calculate([q(93)],{[q(93)]:{mode:'penalty'}});
 assert.equal(penalty.bonuses.physicalHit,-2);assert.equal(penalty.bonuses.block,-2);assert.equal(penalty.bonuses.dodge,-2);
});
test('carrier accuracy unions each source once instead of maxing unrelated totals',()=>{
 const actual=calculate([p(1),p(42),p(125)],{[p(1)]:{counter:4},[p(42)]:{active:true},[p(125)]:{active:true}});
 assert.equal(actual.bonuses.physicalHit,3);assert.equal(actual.bonuses.kaguneHit,6);
 assert.equal(actual.carrierHit,6); // +3 universal once, plus +3 weapon-specific.
 const same=calculate([p(1)],{[p(1)]:{counter:4}});assert.equal(same.carrierHit,3);
});
test('fragmentation, organs and narrative evolution never create free actions, parts or permanent stats',()=>{
 const ids=[q(16),q(27),q(39),q(50),q(51),q(52),q(53),q(54),q(55),q(56),q(57),q(58),q(60),q(77),q(100)];
 const actual=calculate(ids,Object.fromEntries(ids.map(id=>[id,{active:true,counter:999999}])));
 assert.deepEqual(actual.bonuses,engine.emptyPackEffects().bonuses);
 assert.equal(actual.damageMultiplier.physical,1);assert.equal(actual.bonuses.reactions,0);
});
test('truncated Reciclagem text is flagged pending and never invents an RC recovery',()=>{
 const actual=calculate([p(22)],{[p(22)]:{active:true,counter:20}});
 assert.ok(actual.pendingPerkIds.includes(p(22)));assert.equal(actual.receipts.length,0);
});
test('temporary overheal never generates negative pain steps or a negative wounded multiplier',()=>{
 const actual=calculate([p(29),p(81)],{}, {currentLife:600,maxLife:500});
 assert.equal(actual.bonuses.physicalSteps,0);assert.equal(actual.bonuses.kaguneSteps,0);
 assert.equal(actual.damageMultiplier.kagune,1);
});
test('Fragilidade Ofensiva checks complete RD after other pack sources',()=>{
 const high=calculate([p(43),p(20)],{[p(20)]:{counter:5}},{baseRD:0});
 assert.equal(high.bonuses.rd,5);assert.equal(high.damageMultiplier.kagune,1);
 const low=calculate([p(43),p(20)],{[p(20)]:{counter:4}},{baseRD:0});
 assert.equal(low.damageMultiplier.kagune,1.18);
});
test('RD sacrifice uses final available RD once and Fragilidade sees the resulting remainder',()=>{
 const actual=calculate([p(43),p(64),p(20)],{[p(64)]:{counter:10},[p(20)]:{counter:5}},{baseRD:2});
 assert.equal(actual.rdSacrifice,7);assert.equal(actual.bonuses.rd,5);
 assert.equal(actual.bonuses.kaguneSteps,8);assert.equal(actual.damageMultiplier.kagune,1.18); // 5 Monstro + 3 sacrifice.
 const projected=calculate([p(43),p(64)],{[p(64)]:{counter:10}},{baseRD:1,projectedRD:18});
 assert.equal(projected.rdSacrifice,10);assert.equal(projected.bonuses.kaguneSteps,5);
 assert.equal(projected.damageMultiplier.kagune,1);
});
