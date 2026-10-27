import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { accuracyTotal } from "./test-helpers.mjs";

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const character = await vite.ssrLoadModule("/app/character.ts");
const quinque = await vite.ssrLoadModule("/app/quinque.ts");
const { reworkPerks, calculateReworkBonuses } = await vite.ssrLoadModule("/app/rework-perks.ts");
const { damageStepRows } = await vite.ssrLoadModule("/app/damage-step-perks.ts");
const { healingPerks } = await vite.ssrLoadModule("/app/healing.ts");
const { criticalPerks } = await vite.ssrLoadModule("/app/critical.ts");
const { TACTICAL_PERK_DEFINITIONS } = await vite.ssrLoadModule("/app/tactical.ts");
const attributes = { forca: 8, vigor: 8, precisao: 8, agilidade: 8, raciocinio: 8, percepcao: 8, presenca: 8, controle: 8 };
const owned = (...ids) => Object.fromEntries(ids.map(id => [id.startsWith("r26-") ? id : `r26-${id}`, { rank: 1 }]));
const sheet = (patch = {}) => character.normalizeCharacter({ rulesVersion: 8, species: "ghoul", grade: 16, weaponKind: "kagune", kaguneType: "Rinkaku", kaguneActive: true, extraPE: 9999, narrativeLimits: true, baseAttributes: attributes, ...patch }, 8);

test("24 actual damage purchases and all 12 healing purchases join the complete existing catalog", () => {
  assert.equal(damageStepRows.length, 24);
  const entries = reworkPerks.filter(perk => perk.id.startsWith("r26-passos-"));
  assert.equal(entries.length, 24);
  assert.equal(entries.filter(perk => perk.minGrade === 20 && perk.min === 15).length, 8);
  assert.deepEqual([...new Set(entries.filter(perk => perk.minGrade === 20).map(perk => perk.cost))].sort((a, b) => a - b), [150, 300, 320, 340, 360, 380, 400]);
  for (const family of ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"]) assert.equal(entries.filter(perk => perk.organGroup === family).length, 3);
  assert.equal(healingPerks.length, 12);
  for (const perk of healingPerks) assert.ok(reworkPerks.some(entry => entry.id === perk.id));
  assert.equal(criticalPerks.length, 10);
  for (const perk of criticalPerks) assert.ok(reworkPerks.some(entry => entry.id === perk.id));
  assert.equal(reworkPerks.length, 376 - 1 + 24 + 1 + healingPerks.length + damageStepRows.length + criticalPerks.length + TACTICAL_PERK_DEFINITIONS.length);
  assert.equal(new Set(reworkPerks.map(perk => perk.id)).size, reworkPerks.length);
});

test("ordinary-level damage purchase adds real physical and Kagune steps, charges once and removes cleanly", () => {
  const original = sheet({ grade: 4 });
  const base = character.calculateCharacter(original);
  const improved = character.calculateCharacter({ ...original, perks: owned("passos-carga-impactante") });
  assert.equal(improved.physicalSteps - base.physicalSteps, 4);
  assert.equal(improved.kaguneSteps - base.kaguneSteps, 4);
  assert.notEqual(improved.kaguneDamage, base.kaguneDamage);
  assert.equal(improved.peSpent - base.peSpent, 8);
  assert.equal(character.calculateCharacter({ ...original, grade: 3, perks: owned("passos-carga-impactante") }).physicalSteps, character.calculateCharacter({ ...original, grade: 3 }).physicalSteps);
  assert.deepEqual(character.calculateCharacter(original).physicalDamage, base.physicalDamage);
});

test("eight costly capstones require level20 and attribute15 and apply substantial final damage steps", () => {
  const expected = { forca:[80,0],vigor:[0,0],precisao:[0,80],agilidade:[50,0],raciocinio:[40,40],percepcao:[0,50],presenca:[30,30],controle:[80,80] };
  for (const [attribute, steps] of Object.entries(expected)) {
    const perk = reworkPerks.find(entry => entry.id.startsWith(`r26-passos-${attribute}-`));
    const original = sheet({ grade: 20, baseAttributes: { ...attributes, [attribute]: 15 } });
    const before = character.calculateCharacter(original);
    const purchase = { [perk.id]: { rank: 1 } };
    const applied = character.calculateCharacter({ ...original, perks: purchase });
    assert.equal(applied.physicalSteps - before.physicalSteps, steps[0], attribute);
    assert.equal(applied.kaguneSteps - before.kaguneSteps, steps[1], attribute);
    assert.equal(applied.peSpent - before.peSpent, perk.cost, attribute);
    assert.equal(character.perkRequirementMet(perk, original, before.permanentAttributes), true);
    for (const invalid of [{ ...original, grade: 19 }, { ...original, baseAttributes: { ...original.baseAttributes, [attribute]: 14 } }]) {
      const invalidBase = character.calculateCharacter(invalid);
      assert.equal(character.perkRequirementMet(perk, invalid, invalidBase.permanentAttributes), false);
      assert.equal(character.calculateCharacter({ ...invalid, perks: purchase }).kaguneSteps, invalidBase.kaguneSteps);
    }
  }
});

test("Control-driven family upgrades reject wrong families, insufficient Control and retracted weapons", () => {
  const original = sheet({ kaguneType: "Ukaku", perks: owned("passos-ukaku-arsenal-tempestade") });
  const applied = character.calculateCharacter(original);
  const base = character.calculateCharacter({ ...original, perks: {} });
  assert.equal(applied.kaguneSteps - base.kaguneSteps, 35);
  assert.equal(accuracyTotal(applied.kaguneTest) - accuracyTotal(base.kaguneTest), 15);
  assert.equal(applied.distance - base.distance, 5);
  for (const patch of [{ kaguneType: "Rinkaku" }, { baseAttributes: { ...attributes, controle: 7 } }, { kaguneActive: false }]) {
    const invalid = { ...original, ...patch };
    assert.equal(character.calculateCharacter(invalid).kaguneSteps, character.calculateCharacter({ ...invalid, perks: {} }).kaguneSteps);
  }
  const bonus = calculateReworkBonuses({ perks: { "r26-passos-ukaku-arsenal-tempestade": { rank: 99 } }, attributes, level: 16, weaponActive: true, species: "ghoul", kaguneTypes: ["Ukaku"] });
  assert.equal(bonus.kaguneSteps, 35, "one purchase cannot be multiplied by forged rank");
});

test("family damage upgrades belong to one Quinque and use its own Control and PE", () => {
  const weapon = quinque.normalizeQuinque({ rulesVersion: 8, grade: 16, creationGrade: 10, rcType: "Rinkaku", attributes });
  const before = quinque.calculateQuinque(weapon);
  const improved = quinque.calculateQuinque({ ...weapon, perks: owned("passos-rinkaku-hidra-dilacerante") });
  assert.equal(improved.kaguneSteps - before.kaguneSteps, 40);
  assert.equal(improved.kaguneDamageModifier - before.kaguneDamageModifier, 25);
  assert.equal(accuracyTotal(improved.kaguneTest) - accuracyTotal(before.kaguneTest), 10);
  assert.equal(improved.spent - before.spent, 50);
  assert.equal(quinque.calculateQuinque(weapon).kaguneDamage, before.kaguneDamage);
  const invalid = quinque.calculateQuinque({ ...weapon, rcType: "Ukaku", perks: owned("passos-rinkaku-hidra-dilacerante") });
  assert.ok(invalid.invalidPerks.includes("r26-passos-rinkaku-hidra-dilacerante"));
  assert.equal(invalid.kaguneSteps, quinque.calculateQuinque({ ...weapon, rcType: "Ukaku" }).kaguneSteps);
});
