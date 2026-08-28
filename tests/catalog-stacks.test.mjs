import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const data = await vite.ssrLoadModule("/app/data.ts");
const rules = await vite.ssrLoadModule("/app/page.tsx");
const kakujaRules = await vite.ssrLoadModule("/app/KakujaPanel.tsx");

function sheetAtGrade(grade, kaguneType = "Rinkaku") {
  return {
    grade,
    kaguneType,
    kaguneSecondType: "",
    kaguneThirdType: "",
    kaguneFourthType: "",
    selectedEvolutions: [],
  };
}

test("uses Grau/2 + 1 for continuously scaling Kagune effects", () => {
  const ids = [
    "aumentar-dano",
    "aumentar-passos",
    "couraca-revestida",
    "regeneracao-anormal",
    "aumentar-acerto",
  ];

  for (const id of ids) {
    const item = data.kaguneEffects.find((candidate) => candidate.id === id);
    assert.ok(item, `missing ${id}`);
    assert.equal(rules.effectMaximum(item, sheetAtGrade(2)), 2, `${id} at Grau 2`);
    assert.equal(rules.effectMaximum(item, sheetAtGrade(6)), 4, `${id} at Grau 6`);
    assert.equal(rules.effectMaximum(item, sheetAtGrade(14)), 8, `${id} at Grau 14`);
  }
});

test("charges Aumentar Passos in the 3, 6, 9, 12, 15 progression", () => {
  const item = data.kaguneEffects.find((candidate) => candidate.id === "aumentar-passos");
  assert.deepEqual(rules.incrementalCosts(item, 5), [3, 6, 9, 12, 15]);
});

test("keeps finite staged effects at their own limits", () => {
  const cristalizacao = data.kaguneEffects.find((item) => item.id === "cristalizacao");
  const multiplasCaudas = data.kaguneEffects.find((item) => item.id === "multiplas-caudas");
  const couracaSuperior = data.kaguneEffects.find((item) => item.id === "couraca-superior");

  assert.equal(rules.effectMaximum(cristalizacao, sheetAtGrade(14, "Ukaku")), 3);
  assert.equal(rules.effectMaximum(multiplasCaudas, sheetAtGrade(14, "Rinkaku")), 4);
  assert.equal(rules.effectMaximum(couracaSuperior, sheetAtGrade(14, "Koukaku")), 7);
});

test("supports the three purchases of Múltiplas Caudas +", () => {
  const item = data.evolutions.find((candidate) => candidate.id === "multiplas-caudas-plus");
  assert.equal(item.maxRank, 3);
  assert.equal(rules.evolutionRank([item.id, item.id, item.id], item.id), 3);
  assert.deepEqual(
    rules.normalizeEvolutionSelections([item.id, item.id, item.id, item.id]),
    [item.id, item.id, item.id],
  );
});

test("supports one Desabilidade purchase per Attribute", () => {
  const item = data.drawbacks.find((candidate) => candidate.id === "desabilidade");
  assert.equal(item.maxRank, data.attributeKeys.length);
  assert.equal(item.uniqueTargets, true);
});

test("Rinkaku multiplies every dice group by the number of tentacles", async () => {
  const source = await readFile(path.join(root, "app/page.tsx"), "utf8");
  assert.equal(rules.multiplyDamage("5d12+4d10", 8), "40d12+32d10");
  assert.equal(rules.multiplyDamage("1d12+2d8+11", 6), "6d12+12d8+66");
  assert.equal(rules.multiplyDamage("2d12+1d6-3", 4), "8d12+4d6-12");
  assert.match(source, /multiplyDamage\(rinkakuTailDamage, rinkakuTailCount\)/);
  assert.match(source, /Cada grupo de dados e o modificador são multiplicados/);
});

test("migrates legacy damage dice into Steps exactly once", () => {
  const migrated = rules.normalizeCharacter({
    damageContext: {
      physicalExtraSteps: 2,
      physicalExtraDice: 3,
      kaguneExtraSteps: 1,
      kaguneExtraDice: 4,
      focusLethalDice: 2,
      multiTailsPlusRank: 3,
    },
    kakuja: { advantageSteps: 2, advantageDice: 3 },
  }, 2);

  assert.equal(migrated.damageContext.physicalExtraSteps, 5);
  assert.equal(migrated.damageContext.kaguneExtraSteps, 5);
  assert.equal(migrated.damageContext.focusLethalSteps, 2);
  assert.equal(migrated.kakuja.advantageSteps, 5);
  assert.equal("physicalExtraDice" in migrated.damageContext, false);
  assert.equal("multiTailsPlusRank" in migrated.damageContext, false);
  assert.equal("advantageDice" in migrated.kakuja, false);

  const normalizedAgain = rules.normalizeCharacter(migrated, 3);
  assert.equal(normalizedAgain.damageContext.physicalExtraSteps, 5);
  assert.equal(normalizedAgain.kakuja.advantageSteps, 5);
});

test("Kakuja starts with the full current Kagune Steps and applies module bonuses", () => {
  assert.equal(kakujaRules.calculateKakujaSteps(15, 4, 2), 21);
  assert.equal(kakujaRules.calculateKakujaSteps(5, -2, 0), 3);
  assert.equal(kakujaRules.calculateKakujaSteps(1, -4, 0), 0);
});

test("migrates purchased Kakuja modules into an empty active Profile", () => {
  const migrated = rules.normalizeCharacter({
    kakuja: {
      selectedModules: ["massa-ampliada-i", "potencia-predatoria-i"],
      profiles: [{ id: "perfil-1", name: "Perfil 1", moduleIds: [], customModuleIds: [] }],
    },
  }, 3);

  assert.deepEqual(migrated.kakuja.profiles[0].moduleIds, ["massa-ampliada-i", "potencia-predatoria-i"]);
  assert.deepEqual(rules.normalizeCharacter(migrated, 4).kakuja.profiles[0].moduleIds, ["massa-ampliada-i", "potencia-predatoria-i"]);
});

test("hard-gates Kakuhou effects behind their structured prerequisites", () => {
  const explosiveShots = data.kaguneEffects.find((item) => item.id === "tiros-explosivos");
  const base = rules.normalizeCharacter({ grade: 8, weaponKind: "kagune", kaguneType: "Ukaku" }, 3);

  assert.deepEqual(rules.effectRequirementStatus(explosiveShots, base).missing, ["Cristalização N2"]);
  assert.equal(rules.effectRequirementStatus(explosiveShots, {
    ...base,
    effects: { cristalizacao: { rank: 1 } },
  }).met, false);
  assert.equal(rules.effectRequirementStatus(explosiveShots, {
    ...base,
    effects: { cristalizacao: { rank: 2 } },
  }).met, true);
});

test("hard-gates Kakuhou evolutions by attributes and prior evolutions", () => {
  const anjo = data.evolutions.find((item) => item.id === "anjo");
  const lancaDeus = data.evolutions.find((item) => item.id === "lanca-deus");
  const centopeia = data.evolutions.find((item) => item.id === "centopeia");

  const ukaku = rules.normalizeCharacter({
    grade: 6,
    weaponKind: "kagune",
    kaguneType: "Ukaku",
    baseAttributes: { agilidade: 3, forca: 2 },
  }, 3);
  assert.equal(rules.evolutionRequirementStatus(anjo, ukaku).met, false);
  assert.equal(rules.evolutionRequirementStatus(anjo, {
    ...ukaku,
    baseAttributes: { ...ukaku.baseAttributes, agilidade: 4 },
  }).met, true);

  const koukaku = rules.normalizeCharacter({ grade: 12, weaponKind: "kagune", kaguneType: "Koukaku" }, 3);
  assert.equal(rules.evolutionRequirementStatus(lancaDeus, koukaku).met, false);
  assert.equal(rules.evolutionRequirementStatus(lancaDeus, {
    ...koukaku,
    selectedEvolutions: ["lanca-ceus"],
  }).met, true);

  const rinkaku = rules.normalizeCharacter({
    grade: 12,
    weaponKind: "kagune",
    kaguneType: "Rinkaku",
    selectedEvolutions: ["mil-pernas"],
    currentSanity: 6,
  }, 3);
  assert.equal(rules.evolutionRequirementStatus(centopeia, rinkaku).met, false);
  assert.equal(rules.evolutionRequirementStatus(centopeia, { ...rinkaku, currentSanity: 5 }).met, true);
});

test("Kakuja module catalog declares chains and elemental prerequisites", async () => {
  const modules = JSON.parse(await readFile(path.join(root, "app/kakuja-modules.json"), "utf8"));
  const byId = new Map(modules.map((item) => [item.id, item]));

  assert.deepEqual(byId.get("potencia-predatoria-vi").requires, ["potencia-predatoria-v"]);
  assert.deepEqual(byId.get("morfologia-alternativa-ii").requires, ["morfologia-alternativa-i"]);
  assert.deepEqual(byId.get("nucleo-trino").requires, ["nucleo-duplo"]);
  for (const item of modules.filter((module) => module.section === "11. Técnicas elementais")) {
    assert.ok(item.requires?.includes("infusao-elemental"), `${item.name} must require Infusão Elemental`);
  }
});

test("removes extra damage-die language and separates Kakuja accuracy from damage", async () => {
  const catalogFiles = ["app/data.ts", "app/expansion-data.ts", "app/kakuja-data.ts", "app/kakuja-modules.json"];
  const catalogs = (await Promise.all(catalogFiles.map((file) => readFile(path.join(root, file), "utf8")))).join("\n");
  const pageSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const kakujaSource = await readFile(path.join(root, "app/KakujaPanel.tsx"), "utf8");

  assert.doesNotMatch(catalogs, /\bdados? de dano\b/i);
  assert.doesNotMatch(catalogs, /metade dos dados/i);
  assert.doesNotMatch(pageSource, /Dados manuais|physicalExtraDamageDice|kaguneExtraDamageDice/);
  assert.match(kakujaSource, /"railgun-de-tungstenio": \{ mode: "toggle", steps: 10, accuracy: 6 \}/);
  assert.doesNotMatch(kakujaSource, /"railgun-de-tungstenio": \{[^\n]*modifier:/);
});
