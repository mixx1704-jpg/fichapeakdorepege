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

test("uses the exact PE requirements for every Grade promotion", () => {
  assert.deepEqual(
    rules.gradeProgression.map((step) => [step.from, step.to, step.requiredPE]),
    [
      [2, 4, 10],
      [4, 6, 20],
      [6, 8, 30],
      [8, 10, 40],
      [10, 12, 50],
      [12, 14, 60],
    ],
  );
  assert.equal(rules.gradeRequirementFor(4), 20);
  assert.equal(rules.gradeRequirementFor(14), 0);
  assert.equal(rules.cumulativeGradePE(6), 30);
  assert.equal(rules.cumulativeGradePE(14), 210);
});

test("migrates old progression values to the corrected automatic Grade grant", () => {
  const migrated = rules.normalizeCharacter({ grade: 10, progressPE: 7 }, 4);
  assert.equal(migrated.earnedPE, 0);
  assert.equal(migrated.progressPE, 7);
  assert.equal(rules.progressionPEFor(migrated), 107);

  const migratedV5 = rules.normalizeCharacter({ grade: 10, earnedPE: 147, progressPE: 17 }, 5);
  assert.equal(migratedV5.earnedPE, 117);
  assert.equal(rules.progressionPEFor(migratedV5), 117);

  const current = rules.normalizeCharacter({ grade: 10, earnedPE: 147, progressPE: 17 }, 6);
  assert.equal(current.earnedPE, 147);
  assert.equal(rules.progressionPEFor(current), 147);
});

test("registers earned PE and resets only Grade progress after promotion", () => {
  const started = { grade: 4, earnedPE: 35, progressPE: 15, marker: "preserved" };
  const rewarded = rules.registerEarnedPE(started, 7);
  assert.deepEqual(rewarded, { grade: 4, earnedPE: 42, progressPE: 22, marker: "preserved" });

  const promoted = rules.advanceGradeIfReady(rewarded);
  assert.deepEqual(promoted, { grade: 6, earnedPE: 42, progressPE: 0, marker: "preserved" });
  assert.equal(rules.advanceGradeIfReady({ grade: 6, progressPE: 29 }).grade, 6);
});

test("applies Grade PE automatically without double-counting registered gains", () => {
  assert.equal(rules.progressionPEFor({ grade: 10, earnedPE: 0, progressPE: 0 }), 100);
  assert.equal(rules.progressionPEFor({ grade: 10, earnedPE: 105, progressPE: 5 }), 105);
  assert.equal(rules.progressionPEFor({ grade: 10, earnedPE: 118, progressPE: 5 }), 118);

  const rewarded = rules.registerEarnedPE({ grade: 10, earnedPE: 0, progressPE: 0 }, 7);
  assert.deepEqual(rewarded, { grade: 10, earnedPE: 107, progressPE: 7 });
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

test("Kakuja durability adds normal Kakuhou durability before instability", () => {
  assert.equal(kakujaRules.calculateKakujaDurability(151, 80, false), 231);
  assert.equal(kakujaRules.calculateKakujaDurability(151, 80, true), 173);
});

test("regeneration keeps Superior N4 at half Life per turn", () => {
  assert.deepEqual(rules.calculateRegeneration(38, 14, 0, 4), {
    normalBase: 0,
    normal: 0,
    superior: 19,
    perTurn: 19,
  });
  assert.equal(rules.calculateRegeneration(38, 14, 3, 0).perTurn, 19);
  assert.equal(rules.calculateRegeneration(38, 14, 4, 4).perTurn, 21);
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

test("includes all 28 offensive Kakuja modules with their hard requirements", async () => {
  const modules = JSON.parse(await readFile(path.join(root, "app/kakuja-modules.json"), "utf8"));
  const extras = modules.filter((item) => /^(19|20|21|22)\./.test(item.section));
  const byId = new Map(extras.map((item) => [item.id, item]));

  assert.equal(extras.length, 28);
  assert.deepEqual(byId.get("dupla-salva").requiresFamilies, ["Ukaku"]);
  assert.deepEqual(byId.get("reversao-perfeita").requires, ["duelo-absoluto"]);
  assert.equal(byId.get("alternancia-quimerica").minFamilies, 2);
  assert.equal(byId.get("motor-de-carnificina").cb, 22);
  assert.match(byId.get("membro-de-reserva").effect, /metade dos Passos de Dano/);
});

test("sets Kakuja CM to Grade plus 10", async () => {
  const kakujaData = await vite.ssrLoadModule("/app/kakuja-data.ts");
  assert.equal(kakujaData.kakujaCaps[6].cm, 16);
  assert.equal(kakujaData.kakujaCaps[8].cm, 18);
  assert.equal(kakujaData.kakujaCaps[10].cm, 20);
  assert.equal(kakujaData.kakujaCaps[12].cm, 22);
  assert.equal(kakujaData.kakujaCaps[14].cm, 24);
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
