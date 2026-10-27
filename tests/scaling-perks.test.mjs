import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
after(() => server.close());
const rules = await server.ssrLoadModule("/app/scaling-perks.ts");
const { reworkPerks } = await server.ssrLoadModule("/app/rework-perks.ts");
const attributes = { forca: 11, vigor: 11, precisao: 11, agilidade: 11, raciocinio: 11, percepcao: 11, presenca: 11, controle: 11 };
const owned = (...ids) => Object.fromEntries(ids.map(id => [id.startsWith("r26-") ? id : `r26-${id}`, { rank: 1 }]));
const context = (perks = {}, extra = {}) => ({ perks, attributes, weaponActive: true, weaponKind: "kagune", level: 20, species: "ghoul", kaguneTypes: ["Rinkaku"], hasRC: true, ...extra });

test("24 new scaling, penetration and poison purchases plus Colosso retain the complete catalog", () => {
  assert.equal(rules.scalingPerks.length, 24);
  assert.equal(rules.scalingPerks.filter(perk => perk.id.startsWith("r26-escala-")).length, 12);
  assert.equal(rules.scalingPerks.filter(perk => perk.id.startsWith("r26-penetracao-")).length, 6);
  assert.equal(rules.poisonPerks.length, 6);
  assert.ok(reworkPerks.length >= 437);
  for (const perk of [...rules.scalingPerks, rules.colossusPerk]) {
    assert.equal(perk.sourceId, "REWORK 2026");
    assert.equal(reworkPerks.find(entry => entry.id === perk.id)?.name, perk.name);
    assert.equal(perk.maxRank, 1);
  }
  assert.equal(rules.colossusPerk.cost, 15);
  assert.equal(rules.colossusPerk.requiredWeapon, "kagune");
  assert.equal(rules.colossusPerk.equipmentCompatible, false);
});

test("percentages add on a single original subtotal and every resulting bonus floors", () => {
  const perks = owned("escala-massa-vital", "escala-corpo-expansivo", "escala-armadura-organica", "escala-muralha-crescente", "escala-acuracia-progressiva", "escala-pico-predatorio");
  const base = Object.freeze({ life: 109, rd: 31, physicalHit: 47, kaguneHit: 53, physicalSteps: 27, kaguneSteps: 39 });
  const result = rules.calculateScalingBonuses(context(perks), base);
  assert.equal(result.percentages.life, 40);
  assert.equal(result.bonuses.life, 43); // floor(109 * .40), not two individually floored grants.
  assert.equal(result.totals.life, 152); // no 15% then another 25% of the enlarged life.
  assert.equal(result.percentages.rd, 45);
  assert.equal(result.bonuses.rd, 13);
  assert.equal(result.bonuses.physicalHit, 11);
  assert.equal(result.bonuses.kaguneHit, 13);
  assert.equal(base.life, 109);
});

test("rank tampering cannot multiply percentages and explicit ceiling is enforced", () => {
  const result = rules.calculateScalingBonuses(context({ "r26-escala-massa-vital": { rank: 99 } }), { life: 101 });
  assert.equal(result.percentages.life, 15);
  assert.equal(result.bonuses.life, 15);
  assert.equal(rules.scalingIncrease("rd", 101, { rd: 999 }), 75);
  assert.equal(rules.scalingIncrease("rd", 9.9, { rd: 50 }), 4);
  assert.equal(rules.scalingIncrease("life", -10, { life: 40 }), 0);
  assert.equal(rules.scalingIncrease("life", Infinity, { life: 40 }), 0);
});

test("dormant weapons preserve RC capacity while poison and level requirements stay gated", () => {
  const perks = owned("escala-coracao-rc", "escala-reservatorio-rc", "escala-pico-predatorio", "veneno-inoculacao", "veneno-corrosivo");
  const low = rules.calculateScalingBonuses(context(perks, { level: 3 }), { rc: 19, physicalSteps: 40 });
  assert.equal(low.bonuses.rc, 3);
  assert.equal(low.bonuses.physicalSteps, 0);
  const inactive = rules.calculateScalingBonuses(context(perks, { weaponActive: false }), { rc: 19 });
  assert.equal(inactive.bonuses.rc, 9);
  assert.equal(rules.isScalingPerkActive("r26-veneno-inoculacao", context(perks, { weaponActive: false })), false);
  assert.equal(rules.isScalingPerkActive("r26-veneno-corrosivo", context(perks, { level: 11 })), false);
  assert.equal(rules.isScalingPerkActive("r26-veneno-corrosivo", context(perks)), true);
  assert.equal(rules.isScalingPerkActive("r26-veneno-inoculacao", context(perks, { hasRC: false })), false);
  assert.equal(rules.isScalingPerkActive("r26-veneno-inoculacao", context(perks, { weaponKind: "nenhum" })), false);
  assert.equal(rules.isScalingPerkActive("r26-veneno-corrosivo", context(owned("veneno-corrosivo"))), false);
  assert.equal(rules.isScalingPerkActive("r26-veneno-corrosivo", context(perks, { level: 0 })), false);
  assert.ok(rules.poisonPerks.filter(perk => perk.id !== "r26-veneno-inoculacao").every(perk => perk.requiredPerk === "r26-veneno-inoculacao"));
});

test("Quinque own purchases remain independent and cannot inherit body or sanity multipliers", () => {
  const wielderPerks = owned("escala-massa-vital", "escala-mente-profunda", "escala-muralha-crescente", "escala-acuracia-progressiva", "escala-reservatorio-rc");
  const base = { life: 100, sanity: 50, rd: 31, kaguneHit: 57, rc: 19 };
  const own = rules.calculateScalingBonuses(context(wielderPerks, { quinque: true, weaponKind: "quinque", species: "humano" }), base);
  assert.equal(own.bonuses.life, 0);
  assert.equal(own.bonuses.sanity, 0);
  assert.equal(own.bonuses.rd, 9);
  assert.equal(own.bonuses.kaguneHit, 5);
  assert.equal(own.bonuses.rc, 3);
  assert.equal(rules.calculateScalingBonuses(context({}, { quinque: true, weaponKind: "quinque" }), base).bonuses.kaguneHit, 0);
  assert.equal(rules.isScalingPerkActive("r26-colosso-carne", context(owned("colosso-carne"), { quinque: true, weaponKind: "quinque" })), false);
});

test("penetration uses only the strongest source, never removes more than half target armor", () => {
  const perks = owned(...rules.scalingPerks.filter(perk => perk.id.startsWith("r26-penetracao-")).map(perk => perk.id));
  assert.equal(rules.calculatePenetration(context(perks)), 50);
  assert.equal(rules.calculatePenetration(context(perks, { level: 7 })), 20);
  assert.equal(rules.calculatePenetration(context(perks, { level: 1 })), 0);
  const hit = rules.applyPartialPenetration(100, 51, 50);
  assert.deepEqual(hit, { rawDamage: 100, targetRD: 51, penetrationPercent: 50, ignoredRD: 25, remainingRD: 26, damage: 74 });
  assert.equal(rules.applyPartialPenetration(100, 51, 500).remainingRD, 26);
  assert.equal(rules.applyPartialPenetration(20, 100, 50).damage, 0, "sufficient RD still absorbs the entire attack");
  assert.equal(rules.applyPartialPenetration(30.9, 31.9, 35).damage, 9);
});
