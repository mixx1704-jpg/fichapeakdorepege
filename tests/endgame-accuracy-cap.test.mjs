import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { accuracyTotal } from "./test-helpers.mjs";

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { reworkPerks, calculateReworkBonuses } = await vite.ssrLoadModule("/app/rework-perks.ts");
const character = await vite.ssrLoadModule("/app/character.ts");
const attributes = { forca: 30, vigor: 30, precisao: 30, agilidade: 30, raciocinio: 30, percepcao: 30, presenca: 30, controle: 30 };
const accuracyKeys = ["physicalHit", "kaguneHit", "block", "dodge", "initiative"];
const context = (perk, extra = {}) => ({ perks: { [perk.id]: { rank: 1 } }, attributes, weaponActive: true, level: 20, species: "ghoul", kaguneTypes: ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"], ...extra });

test("every Level20 r26 purchase grants at most20 per accuracy channel even with attribute30", () => {
  const endgame = reworkPerks.filter(perk => perk.id.startsWith("r26-") && perk.minGrade === 20);
  assert.ok(endgame.length >= 29);
  for (const perk of endgame) {
    const bonus = calculateReworkBonuses(context(perk));
    for (const key of accuracyKeys) assert.ok(bonus[key] <= 20, `${perk.name}: ${key} was ${bonus[key]}`);
    for (const [attribute, amount] of Object.entries(bonus.attributeChecks)) assert.ok(amount <= 20, `${perk.name}: test ${attribute} was ${amount}`);
    for (const match of perk.description.matchAll(/\+(\d+) (?:acertos|Iniciativa)\b/g)) assert.ok(Number(match[1]) <= 20, `${perk.name}: description still advertises +${match[1]}`);
  }
});

test("fifteen distinct attribute capstones keep Level20, attribute15 and their PE prices", () => {
  const caps = reworkPerks.filter(perk => perk.minGrade === 20 && perk.attribute && (perk.id.startsWith(`r26-exp-${perk.attribute}-`) || perk.id.startsWith(`r26-passos-${perk.attribute}-`)));
  assert.equal(caps.length, 15);
  for (const perk of caps) {
    assert.equal(perk.min, 15, perk.name);
    assert.equal(perk.cost, perk.id.startsWith("r26-exp-") ? ({forca:300,vigor:400,precisao:320,agilidade:280,raciocinio:300,percepcao:320,presenca:300})[perk.attribute] : ({forca:380,vigor:340,precisao:400,agilidade:300,raciocinio:360,percepcao:320,presenca:300,controle:150})[perk.attribute]);
    const valid = calculateReworkBonuses(context(perk, { attributes: { ...attributes, [perk.attribute]: 15 } }));
    const invalidLevel = calculateReworkBonuses(context(perk, { level: 19 }));
    const invalidAttribute = calculateReworkBonuses(context(perk, { attributes: { ...attributes, [perk.attribute]: 14 } }));
    assert.ok(Object.values(valid).some(value=>typeof value==="number"&&value>0),perk.name);
    assert.equal(invalidLevel.physicalSteps, 0, perk.name);
    assert.equal(invalidAttribute.kaguneSteps, 0, perk.name);
  }
});

test("Level19 fixed accuracy purchases also stay within20 without touching damage or armor", () => {
  const expected = {
    "r26-exp-vigor-muralha-invencivel": { block: 20, rd: 25, life: 100 },
    "r26-exp-precisao-sentenca-perfeita": { physicalHit: 20, kaguneHit: 20, physicalSteps: 30 },
    "r26-exp-agilidade-velocidade-sem-fim": { physicalHit: 20, kaguneHit: 20, dodge: 20, physicalSteps: 30 },
    "r26-exp-raciocinio-estrategia-total": { physicalHit: 20, kaguneHit: 20, physicalSteps: 30, rd: 15 },
    "r26-exp-percepcao-olho-do-abismo": { physicalHit: 20, kaguneHit: 20, physicalDamage: 20 },
    "r26-exp-presenca-vontade-de-imperio": { physicalHit: 20, kaguneHit: 20, physicalSteps: 30, sanity: 40 },
    "r26-exp-controle-alma-inabalavel": { physicalHit: 20, kaguneHit: 20, block: 20, dodge: 20, life: 40 },
  };
  for (const [id, values] of Object.entries(expected)) {
    const perk = reworkPerks.find(item => item.id === id);
    const bonus = calculateReworkBonuses(context(perk, { level: 19 }));
    for (const [key, amount] of Object.entries(values)) assert.equal(bonus[key], amount, `${perk.name}: ${key}`);
  }
});

test("Command capstone changes actual attack and defense formulas by20 and preserves its resource bonuses", () => {
  const original = character.normalizeCharacter({ rulesVersion: 8, species: "ghoul", grade: 20, narrativeLimits: true, baseAttributes: { ...attributes, controle: 15 }, weaponKind: "kagune", kaguneType: "Rinkaku", kaguneActive: true, currentSanity: 999, extraPE: 9999 }, 8);
  const before = character.calculateCharacter(original);
  const after = character.calculateCharacter({ ...original, perks: { "r26-passos-controle-comando-catastrofe": { rank: 1 } } });
  for (const key of ["physicalHitTest", "kaguneTest", "blockTest", "dodgeTest"]) assert.equal(accuracyTotal(after[key]) - accuracyTotal(before[key]), 20, key);
  assert.equal(after.maxSanity - before.maxSanity, 100);
  assert.equal(after.maxRC - before.maxRC, 100);
  assert.equal(after.kaguneSteps - before.kaguneSteps, 80);
  assert.equal(after.peSpent - before.peSpent, 150);
});
