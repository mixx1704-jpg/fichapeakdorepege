import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { accuracyTotal as accuracy } from "./test-helpers.mjs";

const server = await createServer({ appType: "custom", configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
after(() => server.close());
const { reworkPerks, calculateReworkBonuses } = await server.ssrLoadModule("/app/rework-perks.ts");
const { scalingPerks } = await server.ssrLoadModule("/app/scaling-perks.ts");
const sheetRules = await server.ssrLoadModule("/app/character.ts");
const quinqueRules = await server.ssrLoadModule("/app/quinque.ts");
const attributes = { forca: 11, vigor: 11, precisao: 11, agilidade: 11, raciocinio: 11, percepcao: 11, presenca: 11, controle: 11 };
const context = (perks = {}, options = {}) => ({ perks, attributes, weaponActive: true, level: 20, species: "ghoul", kaguneTypes: ["Ukaku"], ...options });
const owned = (...ids) => Object.fromEntries(ids.map(id => [`r26-${id}`, { rank: 1 }]));

test("new purchases cover every LEVEL, attribute, species and Kagune family", () => {
  assert.ok(reworkPerks.length >= 437);
  const originalRework = reworkPerks.filter(perk => !perk.id.startsWith("r26-passos-") && !perk.id.startsWith("r26-critico-") && !perk.id.startsWith("r26-tatica-") && perk.sourceId !== "nova-era-cura");
  const additions = new Set(scalingPerks.map(perk => perk.id));
  assert.equal(originalRework.filter(p => !p.id.startsWith("r26-exp-") && !additions.has(p.id) && p.id !== "r26-colosso-carne").length, 128, "all previous rework purchases remain available");
  assert.equal(reworkPerks.filter(p => p.id.startsWith("r26-exp-")).length, 247, "128 attribute and 120 general additions");
  assert.equal(new Set(reworkPerks.map(p => p.id)).size, reworkPerks.length);
  assert.deepEqual([...new Set(reworkPerks.map(p => p.minGrade))].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  for (const attribute of Object.keys(attributes)) {
    assert.equal(originalRework.filter(p => p.attribute === attribute && p.location !== "kakuhou").length, attribute==="controle"?21:22, attribute);
    const added = reworkPerks.filter(p => p.id.startsWith(`r26-exp-${attribute}-`));
    assert.equal(added.length, attribute==="controle"?15:16, `${attribute}: sixteen new purchases`);
    assert.ok(reworkPerks.some(p => p.attribute===attribute&&p.minGrade === 20 && p.min === 15), `${attribute}: exclusive endgame`);
  }
  for (let level = 1; level <= 20; level++) assert.equal(reworkPerks.filter(p => p.id.startsWith("r26-exp-geral-") && p.minGrade === level).length, 6, `six unrestricted choices at Level ${level}`);
  for (const species of ["humano", "ghoul", "humano-dominante", "ghoul-dominante", "ghoul-artificial", "quinx"]) assert.equal(originalRework.filter(p => p.species?.includes(species)).length, 4, species);
  for (const family of ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"]) {
    const organ = originalRework.filter(p => p.organGroup === family);
    assert.equal(organ.length, 9, family);
    assert.equal(organ.filter(p => p.attribute === "controle").length, 2, family);
    assert.ok(organ.every(p => p.location === "kakuhou" && !p.requiredWeapon));
  }
  assert.ok(reworkPerks.every(p => (Array.isArray(p.cost) ? p.cost.every(cost => cost > 0) : p.cost > 0) && !/dados? (extras?|de acerto)/i.test(p.description)));
});

test("new modifiers stack with fixed acertos and never create a dice pool", () => {
  const bonus = calculateReworkBonuses(context(owned("fundamento", "guarda-viva", "golpe-denso", "pena-aguda", "balistica-mental")));
  assert.equal(bonus.physicalHit, 1);
  assert.equal(bonus.kaguneHit, 8); // 1 + 2 + floor(Controle 11 / 2)
  assert.equal(bonus.block, 1);
  assert.equal(bonus.dodge, 1);
  assert.equal(bonus.physicalSteps, 3);
  assert.equal(bonus.kaguneSteps, 3);
  assert.equal(bonus.kaguneDamage, 3);
});

test("weapon upgrades turn off with the weapon and respect its RC family", () => {
  const perks = owned("fundamento", "pena-aguda", "placa-vital", "asa-reflexa");
  const active = calculateReworkBonuses(context(perks));
  assert.equal(active.kaguneHit, 3);
  assert.equal(active.rd, 0); // Koukaku upgrade is not compatible with Ukaku.
  assert.equal(active.dodge, 2);
  const inactive = calculateReworkBonuses(context(perks, { weaponActive: false }));
  assert.equal(inactive.physicalHit, 1);
  assert.equal(inactive.kaguneHit, 1);
  assert.equal(inactive.dodge, 0);
  const quinque = calculateReworkBonuses(context(perks, { species: "humano", kaguneTypes: ["Koukaku"] }));
  assert.equal(quinque.rd, 2); // The same mechanical card works on a Quinque.
});

test("purchases honor level, attribute, race and one-purchase limits", () => {
  const perks = { ...owned("fundamento", "lenda-viva", "predador-nato", "engenho-humano", "balistica-mental"), "r26-fundamento": { rank: 99 } };
  const bonus = calculateReworkBonuses(context(perks, { level: 1, attributes: { ...attributes, controle: 0 } }));
  assert.equal(bonus.physicalHit, 1);
  assert.equal(bonus.kaguneHit, 3);
  assert.equal(bonus.rc, 3);
  assert.equal(bonus.rd, 0);
  assert.equal(bonus.sanity, 0);
});

test("vital and mental bonuses are applied as maxima, attribute checks stay separate", () => {
  const bonus = calculateReworkBonuses(context(owned("cicatrizes-ferro", "reservas-vitais", "pulso-estavel", "punho-pesado")));
  assert.equal(bonus.life, 30);
  assert.equal(bonus.sanity, 7);
  assert.equal(bonus.rd, 1);
  assert.equal(bonus.attributeChecks.forca, 1);
  assert.equal(bonus.physicalHit, 1); // Pulso Estável, not the Força check bonus.
  assert.equal(bonus.physicalSteps, 2);
});

test("buying and removing new perks changes the actual character attacks, damage, armor and life", () => {
  const original = sheetRules.normalizeCharacter({ rulesVersion: 8, grade: 8, species: "ghoul", weaponKind: "kagune", kaguneType: "Ukaku", kaguneActive: true, currentSanity: 999, baseAttributes: Object.fromEntries(Object.keys(attributes).map(key => [key, 4])) }, 8);
  const base = sheetRules.calculateCharacter(original);
  const upgraded = sheetRules.calculateCharacter({ ...original, perks: owned("fundamento", "guarda-viva", "golpe-denso", "cicatrizes-ferro", "pena-aguda") });
  assert.equal(accuracy(upgraded.physicalHitTest) - accuracy(base.physicalHitTest), 1);
  assert.equal(accuracy(upgraded.kaguneTest) - accuracy(base.kaguneTest), 3);
  assert.equal(accuracy(upgraded.blockTest) - accuracy(base.blockTest), 1);
  assert.equal(accuracy(upgraded.dodgeTest) - accuracy(base.dodgeTest), 1);
  assert.equal(upgraded.physicalSteps - base.physicalSteps, 3);
  assert.equal(upgraded.kaguneSteps - base.kaguneSteps, 3);
  assert.equal(upgraded.kaguneDamageModifier - base.kaguneDamageModifier, 1);
  assert.equal(upgraded.rd - base.rd, 1);
  assert.equal(upgraded.maxLife - base.maxLife, 11);
  const removed = sheetRules.calculateCharacter({ ...original, perks: {} });
  for (const key of ["physicalHitTest", "kaguneTest", "blockTest", "dodgeTest", "physicalDamage", "kaguneDamage", "rd", "maxLife"]) assert.equal(removed[key], base[key], key);
});

test("sanity perks affect the mentality die and every remaining modifier reaches character calculations", () => {
  const character = sheetRules.normalizeCharacter({ rulesVersion: 8, grade: 10, species: "ghoul", weaponKind: "kagune", kaguneType: "Ukaku", kaguneActive: true, currentSanity: 19, baseAttributes: Object.fromEntries(Object.keys(attributes).map(key => [key, 4])) }, 8);
  const base = sheetRules.calculateCharacter(character);
  const upgraded = sheetRules.calculateCharacter({ ...character, perks: owned("pulso-estavel", "cadencia-cristalina", "corpo-fluido", "olhos-abertos", "predador-nato", "punho-pesado") });
  assert.equal(base.testDie, 30); // 19 / 24 > 75%.
  assert.equal(upgraded.maxSanity, base.maxSanity + 4);
  assert.equal(upgraded.testDie, 20); // 19 / 28 is now in the middle band.
  assert.equal(upgraded.maxRC, base.maxRC + 3);
  assert.equal(upgraded.distance, base.distance + 1);
  assert.equal(upgraded.movement, base.movement + 1);
  assert.equal(upgraded.initiativeBonus, 2);
  assert.equal(accuracy(upgraded.initiativeTest) - accuracy(upgraded.attributeTests.agilidade), 2);
  assert.equal(accuracy(upgraded.attributeTests.forca) - accuracy(base.attributeTests.forca), 1);
  assert.equal(accuracy(upgraded.physicalHitTest) - accuracy(base.physicalHitTest), 1); // Pulso Estável; attribute-only checks do not leak.
});

test("Quinque uses compatible general and weapon purchases without inheriting racial perks", () => {
  const weapon = quinqueRules.normalizeQuinque({ grade: 8, creationGrade: 8, rcType: "Koukaku", attributes: Object.fromEntries(Object.keys(attributes).map(key => [key, 4])) });
  const base = quinqueRules.calculateQuinque(weapon);
  const upgraded = quinqueRules.calculateQuinque({ ...weapon, perks: owned("aco-nervoso", "placa-vital", "gume-comprimido", "predador-nato", "fundamento") });
  assert.equal(accuracy(upgraded.kaguneTest) - accuracy(base.kaguneTest), 3);
  assert.equal(accuracy(upgraded.blockTest) - accuracy(base.blockTest), 2);
  assert.equal(upgraded.rd - base.rd, 2);
  assert.equal(upgraded.kaguneSteps - base.kaguneSteps, 4);
  assert.equal(upgraded.kaguneDamageModifier - base.kaguneDamageModifier, 2);
  assert.equal(upgraded.ghoulControlBonus, 0);
  assert.ok(upgraded.invalidPerks.includes("r26-predador-nato"));
  assert.ok(!upgraded.invalidPerks.includes("r26-fundamento"));
  assert.equal(upgraded.testDie, 20);
});

test("new general and attribute purchases work in one Quinque, cost once and stay independent of its owner", () => {
  const weapon = quinqueRules.normalizeQuinque({ rulesVersion: 8, grade: 8, creationGrade: 8, rcType: "Koukaku", attributes: Object.fromEntries(Object.keys(attributes).map(key => [key, 4])) });
  const purchased = owned("exp-geral-olhar-de-cacador", "exp-forca-tracao-devastadora", "predador-nato");
  const updatedWeapon = { ...weapon, perks: purchased };
  const base = quinqueRules.calculateQuinque(weapon), applied = quinqueRules.calculateQuinque(updatedWeapon);
  assert.equal(accuracy(applied.kaguneTest) - accuracy(base.kaguneTest), 2);
  assert.equal(applied.kaguneSteps - base.kaguneSteps, 2);
  assert.equal(accuracy(applied.attributeTests.forca) - accuracy(base.attributeTests.forca), 2);
  assert.equal(applied.perkPE, 11, "3 + 4 compatible purchases, plus the preserved 4 PE racial purchase pending removal");
  const compatible = quinqueRules.calculateQuinque({ ...weapon, perks: owned("exp-geral-olhar-de-cacador", "exp-forca-tracao-devastadora") });
  assert.equal(compatible.perkPE, 7);
  assert.equal(compatible.spent - base.spent, 7, "each compatible purchase is charged once");
  assert.ok(applied.invalidPerks.includes("r26-predador-nato"));
  assert.equal(applied.maxRC, base.maxRC, "racial RC does not reach the equipment");
  const another = quinqueRules.normalizeQuinque({ ...weapon, id: "another" });
  assert.equal(quinqueRules.calculateQuinque(another).kaguneTest, base.kaguneTest);
  const owner = sheetRules.normalizeCharacter({ rulesVersion: 8, species: "humano", grade: 8, weaponKind: "nenhum", quinques: [weapon, another] }, 8);
  const ownerBase = sheetRules.calculateCharacter(owner);
  const ownerAfter = sheetRules.calculateCharacter({ ...owner, quinques: [updatedWeapon, another] });
  for (const key of ["peSpent", "peAvailable", "rd", "physicalHitTest", "physicalSteps", "maxLife"]) assert.equal(ownerAfter[key], ownerBase[key], key);
});

test("equipment compatibility keeps attribute, level, family and legacy restrictions", () => {
  const find = id => reworkPerks.find(p => p.id === `r26-${id}`);
  const weapon = quinqueRules.normalizeQuinque({ rulesVersion: 8, grade: 8, rcType: "Koukaku", attributes: { forca: 4, vigor: 4 } });
  const attributePerk = find("exp-forca-tracao-devastadora"), general = find("exp-geral-olhar-de-cacador");
  assert.equal(general.equipmentCompatible, true);
  assert.equal(attributePerk.equipmentCompatible, true);
  assert.equal(find("exp-vigor-reserva-do-corpo").equipmentCompatible, false, "life and sanity alone have no weapon use");
  assert.ok(reworkPerks.filter(p => p.species).every(p => !p.equipmentCompatible));
  assert.deepEqual(quinqueRules.quinquePerkMissing(weapon, attributePerk), []);
  assert.ok(quinqueRules.quinquePerkMissing({ ...weapon, attributes: { ...weapon.attributes, forca: 1 } }, attributePerk).length);
  assert.ok(quinqueRules.quinquePerkMissing({ ...weapon, grade: 2 }, attributePerk).length);
  assert.equal(quinqueRules.quinqueAllowsPerk(weapon, find("pena-aguda")), false);
  assert.equal(quinqueRules.quinqueAllowsPerk(weapon, { ...general, equipmentCompatible: undefined }), false, "old unrelated perks do not gain access");
  assert.equal(quinqueRules.quinqueAllowsPerk(weapon, { ...general, requiresKakuja: true }), false);
});

test("a compatible general armor purchase belongs to the Quinque during Forma Versátil conversion", () => {
  const weapon = quinqueRules.normalizeQuinque({ rulesVersion: 8, grade: 8, rcType: "Koukaku", attributes: { vigor: 4 }, effects: { "forma-versatil": { rank: 1 } }, mode: "attack" });
  const base = quinqueRules.calculateQuinque(weapon);
  const improved = quinqueRules.calculateQuinque({ ...weapon, perks: owned("exp-geral-defesa-cruzada") });
  assert.equal(improved.kaguneSteps - base.kaguneSteps, 1, "the weapon's +2 RD reaches the next conversion threshold");
  assert.equal(improved.rd - base.rd, 1, "the converted portion is not counted again as unconverted character RD");
});

test("each attribute has a Level 20 exclusive that requires 15 and applies substantial real bonuses", () => {
  const expected = {
    forca:{physicalSteps:60,physicalDamage:60,life:80},vigor:{life:200,rd:60,block:20},
    precisao:{physicalHit:20,kaguneHit:20,physicalDamage:60,kaguneDamage:60},agilidade:{dodge:20,movement:10,initiative:20},
    raciocinio:{physicalHit:20,kaguneHit:20,sanity:60},percepcao:{block:20,dodge:20,initiative:20},presenca:{life:100,sanity:80,block:20},
    controle:{physicalHit:20,kaguneHit:20,block:20,dodge:20,sanity:100,rc:100,weaponRD:50}
  };
  for (const attribute of Object.keys(attributes)) {
    const perk = reworkPerks.find(p => p.attribute===attribute&&p.minGrade===20&&(attribute==="controle"?p.id==="r26-passos-controle-comando-catastrofe":p.id.startsWith(`r26-exp-${attribute}-`)));
    assert.equal(perk.min, 15, attribute);
    const selection = { [perk.id]: { rank: 1 } };
    const belowAttribute = calculateReworkBonuses(context(selection, { attributes: { ...attributes, [attribute]: 14 } }));
    const belowLevel = calculateReworkBonuses(context(selection, { level: 19, attributes: { ...attributes, [attribute]: 15 } }));
    const empty = calculateReworkBonuses(context());
    assert.deepEqual(belowAttribute, empty, `${attribute}: rejected at 14`);
    assert.deepEqual(belowLevel, empty, `${attribute}: rejected at Level 19`);
    const applied = calculateReworkBonuses(context(selection, { attributes: { ...attributes, [attribute]: 15 } }));
    for (const [key, value] of Object.entries(expected[attribute])) assert.equal(applied[key], value, `${attribute}: ${key}`);
  }
});

test("new scaling purchases and six general choices apply automatic useful bonuses at ordinary levels", () => {
  const scaled = calculateReworkBonuses(context(owned("exp-forca-potencia-constante"), { level: 6, attributes: { ...attributes, forca: 7 } }));
  assert.equal(scaled.physicalDamage, 7);assert.equal(scaled.kaguneDamage, 3);
  const fractions = calculateReworkBonuses(context(owned("exp-vigor-pulso-inesgotavel"), { level: 7, attributes: { ...attributes, vigor: 7.9 } }));
  assert.equal(fractions.life, 23, "multiply before rounding down");
  for (let level = 1; level <= 20; level++) {
    const choices = reworkPerks.filter(p => p.id.startsWith("r26-exp-geral-") && p.minGrade === level);
    const outcomes = choices.map(perk => {
      const applied = calculateReworkBonuses(context({ [perk.id]: { rank: 1 } }, { level }));
      assert.ok(Object.values(applied).some(value => typeof value === "number" && value > 0), perk.name);
      return JSON.stringify(applied);
    });
    assert.equal(new Set(outcomes).size, 6, `Level ${level}: six mechanically different choices`);
  }
});

test("the actual character receives and loses the Level 20 attribute capstone bonuses", () => {
  const sheet = sheetRules.normalizeCharacter({ rulesVersion: 8, grade: 20, species: "humano", weaponKind: "nenhum", narrativeLimits: true, baseAttributes: { ...attributes, vigor: 15 }, currentSanity: 999 }, 8);
  const base = sheetRules.calculateCharacter(sheet);
  const capstone = reworkPerks.find(perk => perk.id.startsWith("r26-exp-vigor-") && perk.minGrade === 20);
  const applied = sheetRules.calculateCharacter({ ...sheet, perks: { [capstone.id]: { rank: 1 } } });
  assert.equal(applied.maxLife - base.maxLife, 530); // +200 escalado por 1.05 elevado a 20 level no Level 20.
  assert.equal(applied.rd - base.rd, 60);
  assert.equal(accuracy(applied.blockTest) - accuracy(base.blockTest), 20);
  assert.equal(applied.physicalSteps - base.physicalSteps, 0);
  const below = sheetRules.calculateCharacter({ ...sheet, baseAttributes: { ...sheet.baseAttributes, vigor: 14 }, perks: { [capstone.id]: { rank: 1 } } });
  const belowBase = sheetRules.calculateCharacter({ ...sheet, baseAttributes: { ...sheet.baseAttributes, vigor: 14 } });
  assert.equal(below.maxLife, belowBase.maxLife);
  assert.equal(below.rd, belowBase.rd);
});
