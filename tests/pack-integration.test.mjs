import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { accuracyTotal } from './test-helpers.mjs';
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const c = await vite.ssrLoadModule('/app/character.ts');
const q = await vite.ssrLoadModule('/app/quinque.ts');
const { perks } = await vite.ssrLoadModule('/app/data.ts');
const { KakujaPanel } = await vite.ssrLoadModule('/app/KakujaPanel.tsx');
const { blankKakujaState } = await vite.ssrLoadModule('/app/kakuja-data.ts');
const { quinqueCarrierBonuses } = await vite.ssrLoadModule('/app/quinque-carrier.ts');
const own = (...ids) => Object.fromEntries(ids.map(id => [id, { rank: 1 }]));
const fixture = patch => c.normalizeCharacter({ rulesVersion:8, species:'ghoul', grade:20, narrativeLimits:true,
  weaponKind:'kagune', kaguneType:'Koukaku', kaguneActive:true, extraPE:9999,
  baseAttributes:c.blankAttributeMap(15), currentSanity:999, currentLife:9999, currentRC:9999, ...patch },8);

test('conditional successes and Passos update real attacks and count PE once', () => {
  const beforeSheet=fixture({}),before=c.calculateCharacter(beforeSheet);
  const id='n26-pack-perk-001',weight='n26-pack-perk-051';
  const sheet={...beforeSheet,perks:own(id,weight),packConditions:{[id]:{counter:3},[weight]:{active:true}}};
  const after=c.calculateCharacter(sheet);
  assert.equal(accuracyTotal(after.physicalHitTest)-accuracyTotal(before.physicalHitTest),2);
  assert.equal(accuracyTotal(after.kaguneTest)-accuracyTotal(before.kaguneTest),2);
  assert.equal(after.kaguneSteps-before.kaguneSteps,3);
  assert.equal(after.physicalSteps,before.physicalSteps);
  assert.equal(after.peSpent-before.peSpent,10);
  assert.equal(c.calculateCharacter({...sheet,packConditions:{}}).kaguneSteps,before.kaguneSteps);
  assert.deepEqual(sheet.packConditions,{[id]:{counter:3},[weight]:{active:true}},'calculating never consumes a saved event');
});

test('capacity percentages enter HP/RC and resource thresholds use those capacities', () => {
  const original=fixture({}),before=c.calculateCharacter(original);
  const after=c.calculateCharacter({...original,perks:own('n26-pack-perk-129','n26-pack-perk-024')});
  assert.equal(after.maxLife,Math.floor(before.maxLife*1.1));
  assert.equal(after.maxRC,Math.floor(before.maxRC*1.1));
  const low={...original,perks:own('n26-pack-perk-129','n26-pack-perk-028'),currentLife:Math.floor(after.maxLife*.49)};
  assert.equal(c.calculateCharacter(low).rd,before.rd+2);
  assert.equal(c.calculateCharacter({...low,currentLife:after.maxLife}).rd,before.rd);
});

test('Bikaku copied rules pay extra and stay dormant when their other prerequisites fail', () => {
  const id='n26-pack-perk-051',perk=perks.find(p=>p.id===id);
  const original=fixture({kaguneType:'Bikaku'}),before=c.calculateCharacter(original);
  assert.equal(c.perkRequirementMet(perk,original,before.permanentAttributes),true);
  const sheet={...original,perks:own(id),packConditions:{[id]:{active:true}}};
  const after=c.calculateCharacter(sheet);
  assert.equal(after.peSpent-before.peSpent,7);
  assert.equal(after.kaguneSteps-before.kaguneSteps,3);
  const invalid=fixture({...sheet,baseAttributes:{...sheet.baseAttributes,forca:0}});
  assert.equal(c.calculateCharacter(invalid).packEffects.activePerkIds.includes(id),false);
  const over='n26-pack-perk-067';
  assert.equal(c.perkRequirementMet(perks.find(p=>p.id===over),original,before.permanentAttributes),false);
});

test('real-family and tail requirements are enforced at purchase and in projections', () => {
  const sheet=fixture({kaguneType:'Rinkaku'}),d=c.calculateCharacter(sheet);
  const tail=perks.find(p=>p.id==='n26-pack-perk-074');
  assert.equal(c.perkRequirementMet(tail,sheet,d.permanentAttributes),false);
  const extra={...sheet,effects:{'multiplas-caudas':{rank:1}}};
  assert.equal(c.perkRequirementMet(tail,extra,d.permanentAttributes),true);
  const fake=fixture({kaguneType:'Bikaku',perks:own('n26-pack-perk-101'),packConditions:{'n26-pack-perk-101':{active:true}}});
  assert.equal(c.calculateCharacter(fake).packEffects.eligiblePerkIds.length,0);
  const quinx=fixture({species:'quinx',kaguneType:'Ukaku',kaguneSecondType:'Koukaku',perks:own('n26-pack-perk-101'),packConditions:{'n26-pack-perk-101':{active:true}}});
  assert.equal(c.calculateCharacter(quinx).packEffects.eligiblePerkIds.length,0,'uma compra inválida importada não dá Quimera a Quinx');
  const incomplete=perks.find(p=>p.id==='n26-pack-perk-022');
  assert.equal(c.perkRequirementMet(incomplete,sheet,d.permanentAttributes),false,'texto cortado não vira compra sem efeito');
});

test('Control-based blocking replaces Vigor and percentage armor is applied after the total', () => {
  const original=fixture({baseAttributes:{...c.blankAttributeMap(15),vigor:7},damageContext:{kaguneExtraRD:17}});
  const before=c.calculateCharacter(original);
  const ossos='n26-pack-property-012';
  const switched=c.calculateCharacter({...original,perks:own(ossos),packConditions:{[ossos]:{mode:'controle'}}});
  assert.equal(accuracyTotal(switched.blockTest)-accuracyTotal(before.blockTest),(15+Math.floor(15/2))-(7+Math.floor(7/2)));
  const castle='n26-pack-perk-067';
  const armored=fixture({damageContext:{kaguneExtraRD:17}}),base=c.calculateCharacter(armored);
  const enhanced=c.calculateCharacter({...armored,perks:own(castle),packConditions:{[castle]:{active:true}}});
  assert.equal(enhanced.rd,Math.floor(base.rd*1.3));
});

test('carrier extras reach Quinques once while weapon conditions and storage stay independent', () => {
  const original=fixture({}),before=quinqueCarrierBonuses(original),id='n26-pack-perk-001';
  const owner={...original,perks:own(id),packConditions:{[id]:{counter:4}}};
  const inherited=quinqueCarrierBonuses(owner);
  assert.equal(inherited.hit-before.hit,3,'one purchase affecting both attacks counts once');
  const weapon=q.normalizeQuinque({rulesVersion:8,rcType:'Koukaku',grade:20,attributes:c.blankAttributeMap(15),bonusPE:9999});
  assert.equal(accuracyTotal(q.calculateQuinque(weapon,owner).kaguneTest)-accuracyTotal(q.calculateQuinque(weapon,original).kaguneTest),3);
  const conversion='n26-pack-property-086';
  const selected=q.normalizeQuinque({...weapon,perks:own(conversion),packConditions:{[conversion]:{counter:2}}});
  const after=q.calculateQuinque(selected,owner),base=q.calculateQuinque(weapon,owner);
  assert.equal(accuracyTotal(after.kaguneTest)-accuracyTotal(base.kaguneTest),-2);
  assert.equal(after.kaguneSteps-base.kaguneSteps,4);
  assert.deepEqual(weapon.packConditions,{});
  assert.deepEqual(JSON.parse(JSON.stringify(selected)).packConditions,{[conversion]:{counter:2}});
});

test('Kakuja inherits a retracted Kagune event and total multipliers without leaking its own effects back', () => {
  const weight='n26-pack-perk-051',castle='n26-pack-perk-067';
  const sheet=fixture({kaguneActive:false,perks:own(weight,castle),packConditions:{[weight]:{active:true},[castle]:{active:true}},kakuja:{...blankKakujaState(),active:true,cannibalPE:80}});
  const donor=c.calculateCharacter({...sheet,kaguneActive:true}),d=c.calculateCharacter(sheet);
  assert.equal(d.kakujaKaguneSteps,donor.kakujaKaguneSteps);
  assert.equal(d.kakujaPackEffects.rdMultiplier,1.3);
  assert.equal(d.packEffects.damageMultiplier.kagune,1);
  const html=renderToStaticMarkup(React.createElement(KakujaPanel,{
    grade:20,species:'ghoul',vigor:15,kaguneSteps:10,kaguneTest:'1d20+30',kaguneDurability:20,kaguneFamilies:['Koukaku'],
    state:{...blankKakujaState(),active:true,cannibalPE:80},onChange:()=>{},kaguneRD:10,rdMultiplier:1.3,damageMultiplier:1.2,
  }));
  assert.match(html,/<dt>RD da Kakuja<\/dt><dd>15 /,'(10 inherited + 2 form) × 1.3 floored once');
  assert.match(html,/×1.2 após rolar, antes da RD/);
});

test('old and new saves round-trip without losing old perks, images, conditions or current resources', () => {
  const old=fixture({perks:{pugilista:{rank:1}}});
  assert.deepEqual(old.packConditions,{});
  const id='n26-pack-perk-001',edited={...old,perks:{...old.perks,...own(id)},packConditions:{[id]:{counter:3.9}},currentLife:17,currentRC:9};
  const restored=c.normalizeCharacter(JSON.parse(JSON.stringify(edited)),8);
  assert.equal(restored.packConditions[id].counter,3);
  assert.deepEqual(restored.perks,edited.perks);
  assert.equal(restored.currentLife,17);
  assert.equal(restored.currentRC,9);
  assert.equal(c.calculateCharacter(restored).physicalSteps,c.calculateCharacter(old).physicalSteps);
});
