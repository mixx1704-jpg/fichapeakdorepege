import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { accuracyTotal } from "./test-helpers.mjs";

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const character = await vite.ssrLoadModule("/app/character.ts");
const quinque = await vite.ssrLoadModule("/app/quinque.ts");
const { perks: catalog } = await vite.ssrLoadModule("/app/data.ts");
const { poisonRules } = await vite.ssrLoadModule("/app/poison.ts");
const attributes = { forca: 8, vigor: 8, precisao: 8, agilidade: 8, raciocinio: 8, percepcao: 8, presenca: 8, controle: 8 };
const owned = (...ids) => Object.fromEntries(ids.map(id => [id.startsWith("r26-") ? id : `r26-${id}`, { rank: 1 }]));
const sheet = (patch = {}) => character.normalizeCharacter({ rulesVersion: 8, species: "ghoul", grade: 18, weaponKind: "kagune", kaguneType: "Koukaku", kaguneActive: true, currentSanity: 999, extraPE: 2500, baseAttributes: attributes, ...patch }, 8);
const plusPercent = (base, percent) => base + Math.floor(base * percent / 100);

test("percent life reaches the displayed maximum and life-based regeneration exactly once", () => {
  const original = sheet({ effects: { "regeneracao-superior": { rank: 3 } } });
  const before = character.calculateCharacter(original);
  const after = character.calculateCharacter({ ...original, perks: owned("escala-massa-vital", "escala-corpo-expansivo") });
  assert.equal(after.maxLife, plusPercent(before.maxLife, 40));
  assert.equal(after.superiorRegeneration, Math.floor(after.maxLife / 2) + original.grade);
  assert.ok(after.regenerationSkill > before.regenerationSkill);
  assert.equal(after.scaling.totals.life, after.maxLife);
  assert.equal(after.scaling.bonuses.life, after.maxLife - before.maxLife);
  assert.equal(after.activeAttributes.vigor, before.activeAttributes.vigor, "percentage never purchases or modifies attributes");
});

test("percentage sanity changes ghoul mentality dice at the recalculated resource threshold", () => {
  const original = sheet({ grade: 12, currentSanity: 25 });
  const before = character.calculateCharacter(original);
  const withPerks = { ...original, perks: owned("escala-mente-profunda", "escala-reserva-mental") };
  const after = character.calculateCharacter(withPerks);
  assert.equal(before.maxSanity, 30);
  assert.equal(before.testDie, 30);
  assert.equal(after.maxSanity, 45);
  assert.equal(after.testDie, 20);
  assert.match(after.kaguneTest, /^1d20\+/);
  assert.equal(character.calculateCharacter({ ...original, currentSanity: 15 }).testDie, 20);
  assert.equal(character.calculateCharacter({ ...withPerks, currentSanity: 15 }).testDie, 10);
  assert.equal(after.scaling.totals.sanity, after.maxSanity);
});

test("scaled acertos, Passos, block, dodge and RC all reach actual formulas and charge PE once", () => {
  const original = sheet({ damageContext: { physicalExtraSteps: 28, kaguneExtraSteps: 31, kaguneExtraRD: 19 }, effects: { "aumentar-dano": { rank: 5 } } });
  const before = character.calculateCharacter(original);
  const purchases = owned("escala-acuracia-progressiva", "escala-potencia-continua", "escala-pico-predatorio", "escala-defesa-adaptativa", "escala-reservatorio-rc", "escala-coracao-rc", "escala-armadura-organica", "escala-muralha-crescente");
  const after = character.calculateCharacter({ ...original, perks: purchases });
  for (const key of ["physicalHitTest", "kaguneTest"]) assert.equal(accuracyTotal(after[key]), plusPercent(accuracyTotal(before[key]), 25), key);
  for (const key of ["blockTest", "dodgeTest"]) assert.equal(accuracyTotal(after[key]), plusPercent(accuracyTotal(before[key]), 15), key);
  for (const key of ["physicalSteps", "kaguneSteps"]) assert.equal(after[key], plusPercent(before[key], 40), key);
  assert.equal(after.maxRC, plusPercent(before.maxRC, 50));
  assert.equal(after.rd, plusPercent(before.rd, 45));
  assert.equal(after.scaling.totals.rd, after.rd);
  assert.equal(after.scaling.totals.kaguneSteps, after.kaguneSteps);
  const cost = Object.keys(purchases).reduce((sum, id) => sum + catalog.find(item => item.id === id).cost, 0);
  assert.equal(after.peSpent - before.peSpent, cost);
  assert.equal(before.peRemaining - after.peRemaining, cost);
});

test("Colosso fuses unscaled weapon RD before the one final percentage armor increase", () => {
  const purchases = { ...owned("colosso-carne"), "pele-dura": { rank: 1 } };
  const original = sheet({ perks: purchases, effects: { "multiplas-caudas": { rank: 4 } }, damageContext: { kaguneExtraRD: 19 }, colossoActive: true });
  const fused = character.calculateCharacter(original);
  const after = character.calculateCharacter({ ...original, perks: { ...purchases, ...owned("escala-armadura-organica", "escala-muralha-crescente") } });
  assert.equal(after.colosso.active, true);
  assert.equal(after.colosso.partCount, 5);
  assert.equal(after.colosso.pairs, 2);
  assert.equal(after.colosso.rd, Math.floor(after.kagunePartRD * 5 / 2));
  assert.equal(after.rd, plusPercent(fused.rd, 45));
  assert.equal(after.scaling.bonuses.rd, Math.floor(fused.rd * 45 / 100));
  assert.equal(after.colosso.rd, fused.colosso.rd, "percentage armor does not enter each part and multiply again");
  assert.equal(after.kaguneDurability, Math.floor(after.kagunePartDurability * 5 / 2));
});

test("retracting the Kagune preserves RC capacity but suppresses poison activation without deleting purchases", () => {
  const perks = owned("escala-reservatorio-rc", "escala-coracao-rc", "veneno-inoculacao", "veneno-concentrado", "veneno-persistente", "veneno-acumulativo", "veneno-corrosivo", "veneno-paralisante");
  const original = sheet({ perks });
  const before = character.calculateCharacter(original);
  assert.equal(before.poisonConfig.enabled, true);
  assert.equal(before.poisonConfig.perks.length, 6);
  assert.deepEqual(poisonRules(before.poisonConfig).allowedKinds, ["toxic", "neurotoxic", "corrosive"]);
  const inactive = character.calculateCharacter({ ...original, kaguneActive: false });
  assert.equal(inactive.poisonConfig.enabled, false);
  assert.equal(inactive.poisonConfig.perks.length, 0);
  assert.equal(inactive.scaling.percentages.rc, 50);
  assert.equal(inactive.maxRC, before.maxRC);
  assert.equal(Object.keys(original.perks).length, 8);
});

test("real character prerequisites reject advanced poison without its purchased base", () => {
  const advanced = catalog.find(item => item.id === "r26-veneno-corrosivo");
  const original = sheet({ perks: owned("veneno-corrosivo") });
  const d = character.calculateCharacter(original);
  assert.equal(character.perkRequirementMet(advanced, original, d.permanentAttributes), false);
  assert.equal(d.poisonConfig.enabled, false);
  assert.deepEqual(d.poisonConfig.perks, []);
  const withBase = { ...original, perks: owned("veneno-inoculacao", "veneno-corrosivo") };
  assert.equal(character.perkRequirementMet(advanced, withBase, d.permanentAttributes), true);
  assert.ok(character.calculateCharacter(withBase).poisonConfig.perks.includes(advanced.id));
  assert.ok(!character.calculateCharacter({ ...withBase, grade: 11 }).poisonConfig.perks.includes(advanced.id));
});

test("Quinque percentages use its own attributes, resource and PE budget and never its owner", () => {
  const weapon = quinque.normalizeQuinque({ rulesVersion: 8, grade: 18, creationGrade: 10, rcType: "Koukaku", attributes, hitDice: 20, damageSteps: 29, rdBonus: 19, effects: { "aumentar-dano": { rank: 5 } } });
  const before = quinque.calculateQuinque(weapon);
  const purchases = owned("escala-acuracia-progressiva", "escala-potencia-continua", "escala-muralha-crescente", "escala-reservatorio-rc");
  const improved = { ...weapon, perks: purchases };
  const after = quinque.calculateQuinque(improved);
  assert.equal(accuracyTotal(after.kaguneTest), plusPercent(accuracyTotal(before.kaguneTest), 10));
  assert.equal(after.kaguneSteps, plusPercent(before.kaguneSteps, 15));
  assert.equal(after.rd, plusPercent(before.rd, 30));
  assert.equal(after.maxRC, plusPercent(before.maxRC, 20));
  assert.equal(after.spent - before.spent, 9 + 11 + 18 + 6);
  const other = quinque.normalizeQuinque({ ...weapon, id: "unmodified-second" });
  const owner = sheet({ quinques: [weapon, other], weaponKind: "nenhum", kaguneActive: false });
  const ownerBefore = character.calculateCharacter(owner);
  const ownerAfter = character.calculateCharacter({ ...owner, quinques: [improved, other] });
  for (const key of ["maxLife", "maxSanity", "rd", "maxRC", "peSpent", "physicalHitTest"]) assert.equal(ownerAfter[key], ownerBefore[key], key);
  assert.equal(quinque.calculateQuinque(other).kaguneTest, before.kaguneTest);
});

test("Quinque checks its own level and poison base before granting scale or advanced effects", () => {
  const weapon = quinque.normalizeQuinque({ rulesVersion: 8, grade: 4, rcType: "Koukaku", attributes, perks: owned("escala-acuracia-progressiva", "veneno-corrosivo", "escala-massa-vital") });
  const after = quinque.calculateQuinque(weapon);
  assert.equal(after.scaling.percentages.kaguneHit, 0);
  assert.ok(after.invalidPerks.includes("r26-escala-acuracia-progressiva"));
  assert.ok(after.invalidPerks.includes("r26-veneno-corrosivo"));
  assert.ok(after.invalidPerks.includes("r26-escala-massa-vital"));
  assert.equal(after.poisonConfig.enabled, false);
  const valid = quinque.calculateQuinque({ ...weapon, grade: 12, perks: owned("veneno-inoculacao", "veneno-corrosivo", "escala-acuracia-progressiva") });
  assert.equal(valid.poisonConfig.enabled, true);
  assert.ok(valid.poisonConfig.perks.includes("r26-veneno-corrosivo"));
  assert.equal(valid.scaling.percentages.kaguneHit, 10);
});
