import {calculateKakujaBiology,kakujaRegeneration,kakujaWoundPenalty} from './kakuja-biology';
import { formatDamage } from "./damage-dice";
import { kakujaFormBonuses } from "./kakuja-data";
import { attributeKeys, attributeLabels, drawbacks, evolutions, kaguneEffects, perks, physicalAttributes, speciesOptions, type AttributeKey, type Drawback, type Evolution, type KaguneEffect, type KaguneFamily, type Perk, type SpeciesId } from "./data";
import { blankKakujaState, type KakujaState } from "./kakuja-data";
import { kakujaPerksCost, normalizeKakujaPerks, calculateKakujaPerkBonuses } from "./kakuja-perks";
import { RULES_VERSION, MAX_LEVEL, PURCHASED_ATTRIBUTE_CAP, levelProgression, normalizeLevel, previousCumulativePE, mentalityDie, isMentalityGhoul, maximumLife, maximumSanity, formatAccuracy } from "./rework-rules";
import { calculateCustomSkillBonuses, customSkillsCost, normalizeCustomSkills, type CustomSkill } from "./CustomSkillsPanel";
import { masteryBonuses, tailAttackCost, growthBonus } from "./kakuhou-mastery";
import { calculateReworkBonuses } from "./rework-perks";
import { calculateScalingBonuses, scalingIncrease, isScalingPerkActive, poisonPerks, type ScalingStat, type ScalingBase } from "./scaling-perks";
import { normalizeCombatTools, type CombatToolsState } from "./combat-tools";
import { normalizeTacticalState, type TacticalState } from "./tactical";
import { normalizePerkPurchases } from "./perk-migrations";
import { normalizeQuinque, type Quinque } from "./quinque";
import { tailLoadout } from "./tail-management";
import { COLOSSO_PERK_ID, calculateColosso, colossoParts, sumPartDamage } from "./colosso";
import { blankVats, normalizeVats, kaguneRange, penalties, adjustTest, passiveRegeneration, isRCSuppressed, type VatsState } from "./vats-engine";

export type TabId = "vats" | "resumo" | "atributos" | "vantagens" | "kakuhou" | "kakuja" | "historia";
export type WeaponKind = "nenhum" | "kagune" | "quinque" | "arata";
export type RankedChoice = { rank: number; target?: AttributeKey; targets?: AttributeKey[] };
export type InventoryItem = { id: string; name: string; quantity: number; notes: string };
export type CustomPerk = { id: string; name: string; description: string; cost: number };
export type DamageContext = {
  physicalAttribute: "forca" | "vigor";
  targetKaguneType: KaguneFamily | "";
  physicalExtraSteps: number;
  physicalExtraModifier: number;
  kaguneExtraSteps: number;
  kaguneExtraModifier: number;
  kaguneExtraRD: number;
  focusLethalSteps: number;
  preciseHitDice: number;
  equationLethalDice: number;
  milPenasSacrifices: number;
  growthPoints: number;
  predadorCeusStacks: number;
  koukakuMode: "normal" | "attack" | "defense";
  active: Record<string, boolean>;
};
export type LegacyDamageContext = Partial<DamageContext> & {
  physicalExtraDice?: number;
  kaguneExtraDice?: number;
  focusLethalDice?: number;
  multiTailsPlusRank?: number;
};
export type LegacyKakujaState = Partial<KakujaState> & { advantageDice?: number };
export type CustomBonuses = { distance: number; hp: number; rc: number; sanity: number; attributes: Record<AttributeKey, number> };

export type CharacterSheet = {
  rulesVersion: number;
  narrativeLimits: boolean;
  progressionOffset: number;
  id: string;
  name: string;
  player: string;
  age: string;
  pronouns: string;
  species: SpeciesId;
  grade: number;
  archetype: string;
  concept: string;
  centralPhrase: string;
  image: string;
  baseAttributes: Record<AttributeKey, number>;
  extraDice: Record<AttributeKey, number>;
  mentalBonus: AttributeKey;
  physicalBonus: AttributeKey;
  secondMentalBonus: AttributeKey;
  secondPhysicalBonus: AttributeKey;
  artificialDominantBlend: boolean;
  perks: Record<string, RankedChoice>;
  customPerks: CustomPerk[];
  customSkills: CustomSkill[];
  drawbacks: Record<string, RankedChoice>;
  weaponKind: WeaponKind;
  quinques: Quinque[];
  kaguneName: string;
  kaguneImage: string;
  kaguneType: KaguneFamily;
  kaguneSecondType: KaguneFamily | "";
  kaguneThirdType: KaguneFamily | "";
  kaguneFourthType: KaguneFamily | "";
  kaguneActive: boolean;
  colossoActive: boolean;
  quinxFrame: number;
  sourceGhoulGrade: number;
  effects: Record<string, RankedChoice>;
  selectedEvolutions: string[];
  instinctiveChoices: string[];
  taijiUses: number;
  confirmedRequirements: Record<string, boolean>;
  extraPE: number;
  earnedPE: number;
  progressPE: number;
  includeGradePE: boolean;
  currentLife: number;
  currentSanity: number;
  currentRC: number;
  reactionEnemyBonus: boolean;
  hunger: number;
  instinct: number;
  anchors: { name: string; bond: string }[];
  appearance: string;
  history: string;
  personality: string;
  kaguneDescription: string;
  notes: string;
  conditions: string;
  inventory: InventoryItem[];
  damageContext: DamageContext;
  combatTools: CombatToolsState;
  tactical: TacticalState;
  customBonuses: CustomBonuses;
  kakuja: KakujaState;
  vats: VatsState;
  updatedAt: number;
};

export type SaveFile = { version: 8; activeId: string; characters: CharacterSheet[] };
export const STORAGE_KEY = "fome-justica-fichas-v2";
export const THEME_KEY = "fome-justica-theme";

export const gradeProgression = levelProgression;

export function reactionsPerRound(agility: number, grade: number, enemyBonus = false) {
  return Math.floor(4 + agility / 4 + grade / 4 + (enemyBonus ? 3 : 0));
}

export function gradeRequirementFor(grade: number) {
  return gradeProgression.find((step) => step.from === grade)?.requiredPE || 0;
}

export function cumulativeGradePE(grade: number) {
  return gradeProgression
    .filter((step) => step.to <= grade)
    .reduce((total, step) => total + step.requiredPE, 0);
}

export function legacyCumulativeGradePE(grade: number) {
  const legacyRequirements = [
    { to: 4, requiredPE: 10 },
    { to: 6, requiredPE: 30 },
    { to: 8, requiredPE: 40 },
    { to: 10, requiredPE: 50 },
    { to: 12, requiredPE: 60 },
    { to: 14, requiredPE: 70 },
  ];
  return legacyRequirements
    .filter((step) => step.to <= grade)
    .reduce((total, step) => total + step.requiredPE, 0);
}

export function progressionPEFor(state: { grade: number; earnedPE: number; progressPE: number; progressionOffset?: number }) {
  return Math.max(state.earnedPE, cumulativeGradePE(state.grade) + (state.progressionOffset || 0) + state.progressPE);
}

export function registerEarnedPE<T extends { grade: number; earnedPE: number; progressPE: number }>(state: T, amount: number): T {
  const gained = Math.max(0, Math.floor(amount));
  if (!gained) return state;
  return {
    ...state,
    earnedPE: progressionPEFor(state) + gained,
    progressPE: state.grade < MAX_LEVEL ? state.progressPE + gained : state.progressPE,
  };
}

export function advanceGradeIfReady<T extends { grade: number; progressPE: number }>(state: T): T {
  const requiredPE = gradeRequirementFor(state.grade);
  if (!requiredPE || state.progressPE < requiredPE || state.grade >= MAX_LEVEL) return state;
  return { ...state, grade: state.grade + 1, progressPE: state.progressPE - requiredPE };
}

export const blankAttributeMap = (value = 0): Record<AttributeKey, number> => ({
  forca: value,
  vigor: value,
  precisao: value,
  agilidade: value,
  raciocinio: value,
  percepcao: value,
  presenca: value,
  controle: value,
});

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const blankDamageContext = (): DamageContext => ({
  physicalAttribute: "forca", targetKaguneType: "",
  physicalExtraSteps: 0, physicalExtraModifier: 0,
  kaguneExtraSteps: 0, kaguneExtraModifier: 0, kaguneExtraRD: 0,
  focusLethalSteps: 0, preciseHitDice: 0, equationLethalDice: 0,
  milPenasSacrifices: 0, growthPoints: 0, predadorCeusStacks: 0, koukakuMode: "normal", active: {},
});

export function newCharacter(name = "Novo personagem"): CharacterSheet {
  return {
    rulesVersion: RULES_VERSION, narrativeLimits: false, progressionOffset: 0,
    id: uid(), name, player: "", age: "", pronouns: "", species: "humano", grade: 1,
    archetype: "O Protetor", concept: "", centralPhrase: "", image: "",
    baseAttributes: blankAttributeMap(), extraDice: blankAttributeMap(),
    mentalBonus: "raciocinio", physicalBonus: "forca", secondMentalBonus: "controle",
    secondPhysicalBonus: "agilidade", artificialDominantBlend: false,
    perks: {}, customPerks: [], customSkills: [], drawbacks: {}, quinques: [], weaponKind: "nenhum", kaguneName: "", kaguneImage: "", kaguneType: "Rinkaku",
    kaguneSecondType: "", kaguneThirdType: "", kaguneFourthType: "", kaguneActive: false, colossoActive: false, quinxFrame: 2, sourceGhoulGrade: 2,
    effects: {}, selectedEvolutions: [], instinctiveChoices: [], taijiUses: 0, confirmedRequirements: {}, extraPE: 0, earnedPE: 0, progressPE: 0, includeGradePE: false,
    currentLife: 0, currentSanity: 0, currentRC: 0, reactionEnemyBonus: false, hunger: 0, instinct: 0,
    anchors: [{ name: "", bond: "" }, { name: "", bond: "" }, { name: "", bond: "" }],
    appearance: "", history: "", personality: "", kaguneDescription: "", notes: "", conditions: "",
    inventory: [], damageContext: blankDamageContext(), combatTools: normalizeCombatTools(), tactical: normalizeTacticalState(), vats: blankVats(), customBonuses: { distance: 0, hp: 0, rc: 0, sanity: 0, attributes: blankAttributeMap() },
    kakuja: blankKakujaState(), updatedAt: Date.now(),
  };
}

export function normalizeCharacter(input: Partial<CharacterSheet>, sourceVersion = 2): CharacterSheet {
  // A character marker takes precedence over an outdated enclosing save version.
  const migrationVersion = input.rulesVersion === RULES_VERSION ? RULES_VERSION : sourceVersion;
  const base = newCharacter(input.name || "Personagem");
  const blankKakuja = blankKakujaState();
  const legacyDamage = (input.damageContext || {}) as LegacyDamageContext;
  const legacyKakuja = (input.kakuja || {}) as LegacyKakujaState;
  const {
    physicalExtraDice = 0,
    kaguneExtraDice = 0,
    focusLethalDice = 0,
    ...safeDamage
  } = legacyDamage;
  delete safeDamage.multiTailsPlusRank;
  const { advantageDice = 0, ...safeKakuja } = legacyKakuja;
  const migratingDamageDice = migrationVersion < 3;
  const selectedKakujaModules = input.kakuja?.selectedModules || [];
  const normalizedKakujaProfiles = input.kakuja?.profiles?.length
    ? blankKakuja.profiles.map((fallback, index) => ({ ...fallback, ...(input.kakuja?.profiles[index] || {}) }))
    : blankKakuja.profiles;
  if (migrationVersion < 4 && selectedKakujaModules.length > 0 && normalizedKakujaProfiles.every((profile) => profile.moduleIds.length === 0)) {
    normalizedKakujaProfiles[0] = { ...normalizedKakujaProfiles[0], moduleIds: [...selectedKakujaModules] };
  }
  const normalizedGrade = normalizeLevel(input.grade, migrationVersion < RULES_VERSION ? 2 : 1);
  const normalizedProgressPE = Math.max(0, Number(input.progressPE) || 0);
  const savedEarnedPE = Math.max(0, Number(input.earnedPE) || 0);
  const legacyGradeGrant = legacyCumulativeGradePE(normalizedGrade);
  const normalizedEarnedPE = migrationVersion === 5 && savedEarnedPE >= legacyGradeGrant
    ? previousCumulativePE(normalizedGrade) + (savedEarnedPE - legacyGradeGrant)
    : savedEarnedPE;
  const normalized: CharacterSheet = {
    ...base, ...input, id: input.id || base.id,
    rulesVersion: RULES_VERSION,
    narrativeLimits: input.narrativeLimits === true,
    colossoActive: input.colossoActive === true,
    combatTools: normalizeCombatTools(input.combatTools),
    tactical: normalizeTacticalState(input.tactical),
    grade: normalizedGrade,
    progressionOffset: input.rulesVersion === RULES_VERSION
      ? Number(input.progressionOffset) || 0
      : migrationVersion < RULES_VERSION ? previousCumulativePE(normalizedGrade) - cumulativeGradePE(normalizedGrade) : 0,
    quinques: Array.isArray(input.quinques) ? input.quinques.map(normalizeQuinque) : [],
    kaguneImage: typeof input.kaguneImage === "string" ? input.kaguneImage : "",
    vats: normalizeVats(input.vats),
    reactionEnemyBonus: input.reactionEnemyBonus === true,
    earnedPE: normalizedEarnedPE,
    progressPE: normalizedProgressPE,
    baseAttributes: { ...base.baseAttributes, ...(input.baseAttributes || {}) },
    extraDice: { ...base.extraDice, ...(input.extraDice || {}) },
    perks: normalizePerkPurchases(input.perks), customPerks: input.customPerks || [], customSkills: normalizeCustomSkills(input.customSkills), drawbacks: input.drawbacks || {}, effects: input.effects || {},
    selectedEvolutions: normalizeEvolutionSelections(input.selectedEvolutions || [], true),
    instinctiveChoices: normalizeInstinctiveChoices(input.instinctiveChoices),
    taijiUses: Math.max(0, Math.min(5, Math.floor(Number(input.taijiUses) || 0))),
    confirmedRequirements: input.confirmedRequirements || {},
    anchors: input.anchors?.length ? input.anchors.slice(0, 3) : base.anchors,
    inventory: input.inventory || [],
    damageContext: {
      ...base.damageContext,
      ...safeDamage,
      physicalExtraSteps: (legacyDamage.physicalExtraSteps || 0) + (migratingDamageDice ? physicalExtraDice : 0),
      kaguneExtraSteps: (legacyDamage.kaguneExtraSteps || 0) + (migratingDamageDice ? kaguneExtraDice : 0),
      focusLethalSteps: legacyDamage.focusLethalSteps ?? focusLethalDice,
      active: { ...base.damageContext.active, ...(input.damageContext?.active || {}) },
    },
    customBonuses: {
      ...base.customBonuses,
      ...(input.customBonuses || {}),
      attributes: { ...base.customBonuses.attributes, ...(input.customBonuses?.attributes || {}) },
    },
    kakuja: {
      ...blankKakuja,
      ...safeKakuja,
      customSkills: normalizeCustomSkills(legacyKakuja.customSkills),
      incompleteImage: typeof safeKakuja.incompleteImage === "string" ? safeKakuja.incompleteImage : "",
      completeImage: typeof safeKakuja.completeImage === "string" ? safeKakuja.completeImage : "",
      advantageSteps: (legacyKakuja.advantageSteps || 0) + (migratingDamageDice ? advantageDice : 0),
      selectedModules: selectedKakujaModules,
      selectedPerks: normalizeKakujaPerks(input.kakuja?.selectedPerks),
      selectedInstabilities: input.kakuja?.selectedInstabilities || [],
      selectedElements: input.kakuja?.selectedElements || [],
      activeTechniques: input.kakuja?.activeTechniques || [],
      techniqueStacks: input.kakuja?.techniqueStacks || {},
      customModules: input.kakuja?.customModules || [],
      profiles: normalizedKakujaProfiles,
    },
  };
  if (input.weaponKind === "quinque" && !Array.isArray(input.quinques)) {
    const weaponPerks = Object.fromEntries(Object.entries(normalized.perks).filter(([id]) => perks.find(p => p.id === id)?.requiredWeapon === "quinque"));
    normalized.quinques = [normalizeQuinque({
      image: normalized.kaguneImage, name: input.kaguneName || "Quinque importada", rcType: input.kaguneType,
      grade: input.sourceGhoulGrade || 2, creationGrade: input.sourceGhoulGrade || 2,
      attributes: normalized.baseAttributes, effects: normalized.effects, evolutions: normalized.selectedEvolutions,
      perks: weaponPerks, customSkills: normalized.customSkills,
      hitDice: normalized.extraDice[input.kaguneType === "Ukaku" ? "precisao" : input.kaguneType === "Koukaku" ? "vigor" : input.kaguneType === "Rinkaku" ? "forca" : "agilidade"],
      damageSteps: normalized.damageContext.kaguneExtraSteps, damageModifier: normalized.damageContext.kaguneExtraModifier,
      activeEffects: normalized.damageContext.active, mode: normalized.damageContext.koukakuMode,
      rangeBonus: normalized.customBonuses.distance,
      rdOverride: normalized.damageContext.kaguneExtraRD || null,
      confirmedRequirements: normalized.confirmedRequirements,
      notes: "Migrada da estrutura Quinque antiga. Os atributos do portador foram copiados como valores iniciais da arma; revise o orçamento independente.",
    })];
    normalized.weaponKind = "nenhum";
    normalized.kaguneActive = false;
    normalized.kaguneName = "";
    normalized.kaguneImage = "";
    normalized.effects = {};
    normalized.selectedEvolutions = [];
    normalized.customSkills = [];
    normalized.perks = Object.fromEntries(Object.entries(normalized.perks).filter(([id]) => !weaponPerks[id]));
    normalized.damageContext = { ...normalized.damageContext, kaguneExtraSteps: 0, kaguneExtraModifier: 0, kaguneExtraRD: 0, koukakuMode: "normal", active: {} };
  }
  return normalized;
}

export function rankCost(cost: number | number[], rank: number, mode: "choice" | "sum" = "sum") {
  if (rank <= 0) return 0;
  if (typeof cost === "number") return cost * rank;
  if (mode === "choice") return cost[Math.min(rank - 1, cost.length - 1)] ?? 0;
  return cost.slice(0, rank).reduce((total, item) => total + item, 0);
}

export function incrementalCosts(effect: KaguneEffect, rank: number) {
  if (rank <= 0) return [];
  if (effect.levelCostStart != null && effect.levelCostStep != null) {
    return Array.from({ length: rank }, (_, index) => effect.levelCostStart! + effect.levelCostStep! * index);
  }
  if (typeof effect.cost === "number") return Array.from({ length: rank }, () => effect.cost as number);
  const listed = effect.costMode === "choice"
    ? effect.cost.map((total, index, list) => total - (list[index - 1] || 0))
    : effect.cost;
  const repeated = Array.from({ length: Math.max(0, rank - listed.length) }, () => effect.repeatCost ?? listed.at(-1) ?? 0);
  return [...listed.slice(0, rank), ...repeated];
}

export function evolutionRank(selectedEvolutions: string[], id: string) {
  return selectedEvolutions.filter((candidate) => candidate === id).length;
}

export function normalizeEvolutionSelections(selectedEvolutions: string[], preservePurchases = false) {
  if (preservePurchases) return Array.isArray(selectedEvolutions) ? selectedEvolutions.filter((id): id is string => typeof id === "string") : [];
  const counts = new Map<string, number>();
  return selectedEvolutions.filter((id) => {
    const item = evolutions.find((candidate) => candidate.id === id);
    if (!item) return false;
    const next = (counts.get(id) || 0) + 1;
    if (next > (item.maxRank || 1)) return false;
    counts.set(id, next);
    return true;
  });
}

export function drawbackMaximum(item: Drawback) {
  return item.maxRank || (Array.isArray(item.credit) ? item.credit.length : 1);
}

export function drawbackTargets(acquired: RankedChoice) {
  return acquired.targets?.length ? acquired.targets : acquired.target ? [acquired.target] : [];
}

export function kaguneFamiliesForSheet(sheet: Pick<CharacterSheet, "kaguneType" | "kaguneSecondType" | "kaguneThirdType" | "kaguneFourthType">) {
  return new Set<KaguneFamily>([sheet.kaguneType, sheet.kaguneSecondType, sheet.kaguneThirdType, sheet.kaguneFourthType].filter(Boolean) as KaguneFamily[]);
}

export function effectCostForSheet(effect: KaguneEffect, rank: number, sheet: CharacterSheet) {
  const baseIncrements = incrementalCosts(effect, rank);
  const foreignBikaku = sheet.kaguneType === "Bikaku" && effect.family !== "Geral" && !kaguneFamiliesForSheet(sheet).has(effect.family as KaguneFamily);
  const paidIncrements = baseIncrements.map((increment) => {
    let levelCost = increment + (foreignBikaku && !sheet.selectedEvolutions.includes("custo-beneficio") ? 2 : 0);
    if (sheet.species === "ghoul-dominante") levelCost = Math.max(1, levelCost - 3);
    if (sheet.weaponKind === "arata") levelCost = Math.floor(levelCost / 2);
    return levelCost;
  });
  return {
    baseTotal: baseIncrements.reduce((total, value) => total + value, 0),
    paidTotal: paidIncrements.reduce((total, value) => total + value, 0),
    paidIncrements,
  };
}

export function evolutionCostsForSheet(item: Evolution, rank: number, species: SpeciesId) {
  const baseIncrements = Array.from({ length: Math.max(0, rank) }, (_, index) => item.rankCosts?.[index] ?? item.cost);
  const paidIncrements = baseIncrements.map((cost) => species === "ghoul-dominante" ? Math.max(1, cost - 3) : cost);
  return {
    baseTotal: baseIncrements.reduce((total, cost) => total + cost, 0),
    paidTotal: paidIncrements.reduce((total, cost) => total + cost, 0),
    paidIncrements,
  };
}

export function attributePurchaseCost(level: number) {
  let total = 0;
  for (let next = 1; next <= level; next += 1) total += Math.max(2, next - 1);
  return total;
}

export function formatTest(dice: number, modifier: number, _zeroAttribute = false, sides = 20) {
  return formatAccuracy(dice, modifier, sides);
}

export { formatDamage } from "./damage-dice";

export function multiplyDamage(expression: string, multiplier: number) {
  const safeMultiplier = Math.max(1, Math.floor(multiplier));
  const dice = [...expression.matchAll(/(\d+)d(\d+)/g)]
    .map((match) => `${Number(match[1]) * safeMultiplier}d${match[2]}`)
    .join("+");
  const modifier = Number(expression.match(/([+-]\d+)$/)?.[1] || 0) * safeMultiplier;
  return `${dice}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`;
}

export function calculateRegeneration(maxLife: number, grade: number, normalRank: number, superiorRank: number) {
  const normalBase = normalRank > 0 ? 1 + (normalRank - 1) * 2 : 0;
  const normal = normalRank > 0 ? normalBase + grade : 0;
  const superiorBase = superiorRank === 1
    ? Math.floor(maxLife / 6)
    : superiorRank === 2
      ? Math.floor(maxLife / 4)
      : superiorRank >= 3
        ? Math.floor(maxLife / 2)
        : 0;
  const superior = superiorRank > 0 ? superiorBase + grade : 0;
  return { normalBase, normal, superior, perTurn: Math.max(normal, superior) };
}

export const humanSurchargeIds = new Set([
  "terapeuta", "atante-medicina", "determinado-salvar", "apostador", "arma-favorita",
  "paciente", "nunca-prostra", "corpo-pesado", "corpo-leve", "frio-calculista",
  "observador-frio", "furioso",
]);

export function hasHumanPerkSurcharge(item: Perk, species: SpeciesId) {
  if (item.supplement) return false;
  const qualifiesForHumanSurcharge = item.category !== "Genérica" || humanSurchargeIds.has(item.id) || item.id.startsWith("acurado-");
  return species === "humano" && qualifiesForHumanSurcharge;
}

export function perkCostForSheet(item: Perk, rank: number, sheet: CharacterSheet) {
  const base = rankCost(item.cost, rank, item.costMode);
  let total = base + (hasHumanPerkSurcharge(item, sheet.species) ? 2 * rank : 0);
  if (sheet.species === "ghoul-dominante" && item.category === "Kagune Quimera") total = Math.max(1, total - 3);
  return total;
}

export function permanentAttributesForSheet(sheet: CharacterSheet) {
  const speciesBonuses = blankAttributeMap();
  const humanBased = ["humano", "humano-dominante", "ghoul-artificial", "quinx"].includes(sheet.species);
  if (humanBased) speciesBonuses[sheet.mentalBonus] += 1;
  if (sheet.species === "humano-dominante") speciesBonuses[sheet.physicalBonus] += 2;
  if (sheet.species === "ghoul-dominante") {
    speciesBonuses[sheet.physicalBonus] += 1;
    speciesBonuses[sheet.secondPhysicalBonus] += 1;
  }
  if (sheet.species === "ghoul-artificial") speciesBonuses[sheet.physicalBonus] += sheet.artificialDominantBlend ? 2 : 1;
  const permanentAttributes = blankAttributeMap();
  attributeKeys.forEach((key) => {
    permanentAttributes[key] = Math.floor(sheet.baseAttributes[key] + speciesBonuses[key] + (sheet.perks[`acurado-${key}`] ? 1 : 0) + sheet.customBonuses.attributes[key]);
  });
  return { speciesBonuses, permanentAttributes };
}

export function perkRequirementMet(perk: Perk, sheet: CharacterSheet, permanentAttributes: Record<AttributeKey, number>) {
  if (perk.requiredWeapon && sheet.weaponKind !== perk.requiredWeapon) return false;
  if (perk.requiredWeapon === "kagune" && !speciesOptions.find(s => s.id === sheet.species)?.hasKagune) return false;
  if (perk.requiresKakuja && (!["ghoul", "ghoul-dominante", "ghoul-artificial"].includes(sheet.species) || sheet.kakuja.cannibalPE < 25)) return false;
  if (perk.minKaguneTypes && sheet.species === "quinx") return false;
  if (perk.requiresRC && !speciesOptions.find(s => s.id === sheet.species)?.hasKagune) return false;
  if (perk.species && !perk.species.includes(sheet.species)) return false;
  if (perk.attribute && perk.min && permanentAttributes[perk.attribute] < perk.min) return false;
  if (perk.requirements && Object.entries(perk.requirements).some(([key, value]) => permanentAttributes[key as AttributeKey] < Number(value))) return false;
  if (perk.minGrade && sheet.grade < perk.minGrade) return false;
  const families = kaguneFamiliesForSheet(sheet);
  if (perk.kaguneTypes && perk.kaguneTypes.some((family) => !families.has(family))) return false;
  if (perk.minKaguneTypes && families.size < perk.minKaguneTypes) return false;
  if (perk.requiredPerk && !sheet.perks[perk.requiredPerk]?.rank) return false;
  if (perk.requiredEffect && !sheet.effects[perk.requiredEffect]) return false;
  if (perk.requiredEvolution && !sheet.selectedEvolutions.includes(perk.requiredEvolution)) return false;
  if (perk.requirement === "Aliado" && !sheet.perks.aliado) return false;
  if (perk.requirement === "Refúgio" && !sheet.perks.refugio) return false;
  return true;
}

export type RequirementStatus = { met: boolean; missing: string[] };

export function effectRequirementStatus(item: KaguneEffect, sheet: CharacterSheet): RequirementStatus {
  const missing: string[] = [];
  for (const dependency of item.requiresEffects || []) {
    const rank = sheet.effects[dependency.id]?.rank || 0;
    const requiredRank = dependency.minRank || 1;
    if (rank < requiredRank) {
      const name = kaguneEffects.find((candidate) => candidate.id === dependency.id)?.name || dependency.id;
      missing.push(`${name} N${requiredRank}`);
    }
  }
  if (item.minPassiveEffects) {
    const passiveCount = Object.keys(sheet.effects).filter((id) => id !== item.id && kaguneEffects.find((candidate) => candidate.id === id)?.type.startsWith("Passivo")).length;
    if (passiveCount < item.minPassiveEffects) missing.push(`${item.minPassiveEffects} outros efeitos passivos`);
  }
  return { met: missing.length === 0, missing };
}

export function normalizeInstinctiveChoices(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value)].filter((id): id is string => typeof id === "string" && evolutions.some(item => item.id === id && ["Ukaku", "Koukaku", "Rinkaku"].includes(item.family))).slice(0, 3) : [];
}

export function instinctiveAccess(item: Evolution, sheet: CharacterSheet) {
  return sheet.weaponKind === "kagune" && kaguneFamiliesForSheet(sheet).has("Bikaku") && sheet.selectedEvolutions.includes("conveniencia-instintiva") && normalizeInstinctiveChoices(sheet.instinctiveChoices).includes(item.id);
}

export function evolutionRequirementStatus(
  item: Evolution,
  sheet: CharacterSheet,
  providedAttributes?: Record<AttributeKey, number>,
  providedMaxSanity?: number,
  targetRank = Math.max(1, evolutionRank(sheet.selectedEvolutions, item.id)),
): RequirementStatus {
  const missing: string[] = [];
  const requiredGrade = item.rankGrades?.[Math.max(0, targetRank - 1)] ?? item.grade;
  if (sheet.grade < requiredGrade) missing.push(`Grau ${requiredGrade}`);
  const families = kaguneFamiliesForSheet(sheet);
  const foreignAccess = instinctiveAccess(item, sheet);
  if (["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].includes(item.family) && !families.has(item.family as KaguneFamily) && !foreignAccess) missing.push(`Kakuhou ${item.family}`);
  if (item.kaguneTypes) item.kaguneTypes.filter((family) => !families.has(family) && !(foreignAccess && family === item.family)).forEach((family) => missing.push(`Kakuhou ${family}`));
  if (item.minKaguneTypes && families.size < item.minKaguneTypes) missing.push(`${item.minKaguneTypes} tipos de Kakuhou`);
  const attributes = providedAttributes || permanentAttributesForSheet(sheet).permanentAttributes;
  for (const [key, value] of Object.entries(item.attributeRequirements || {})) {
    if (attributes[key as AttributeKey] < Number(value)) missing.push(`${attributeLabels[key as AttributeKey]} ${value}`);
  }
  for (const dependency of item.requiresEffects || []) {
    const requiredRank = dependency.minRank || 1;
    if ((sheet.effects[dependency.id]?.rank || 0) < requiredRank) {
      const name = kaguneEffects.find((candidate) => candidate.id === dependency.id)?.name || dependency.id;
      missing.push(`${name} N${requiredRank}`);
    }
  }
  for (const dependency of item.requiresEvolutions || []) {
    if (!sheet.selectedEvolutions.includes(dependency)) missing.push(evolutions.find((candidate) => candidate.id === dependency)?.name || dependency);
  }
  const kakujaAwakened = ["ghoul", "ghoul-dominante", "ghoul-artificial"].includes(sheet.species) && sheet.kakuja.cannibalPE >= 25;
  const kakujaComplete = kakujaAwakened && sheet.kakuja.complete && sheet.kakuja.cannibalPE >= 60;
  if (item.requiresKakuja === "incomplete" && (!kakujaAwakened || kakujaComplete)) missing.push("Kakuja Incompleta despertada");
  if (item.requiresKakuja === "complete" && !kakujaComplete) missing.push("Kakuja Completa");
  if (item.requiresLowSanity) {
    const maxSanity = providedMaxSanity ?? maximumSanity(sheet.grade, attributes.controle, -(sheet.selectedEvolutions.includes("monstro") ? 5 : 0) + sheet.customBonuses.sanity, Boolean(sheet.drawbacks["mente-fragil"]));
    if (sheet.currentSanity > Math.floor(Math.max(1, maxSanity) / 2)) missing.push("Sanidade em metade ou menos");
  }
  if (item.narrativeRequirement && !sheet.confirmedRequirements[`evolution:${item.id}`]) missing.push(`${item.narrativeRequirement} confirmado pelo Narrador`);
  return { met: missing.length === 0, missing };
}

export function evolutionRequirementMet(item: Evolution, sheet: CharacterSheet) {
  return evolutionRequirementStatus(item, sheet).met;
}

export function effectCompatibleForSheet(item: KaguneEffect, sheet: CharacterSheet) {
  if (item.family === "Geral") return true;
  const families = kaguneFamiliesForSheet(sheet);
  return families.has(item.family) || families.has("Bikaku");
}

export function pruneStructuralDependencies(sheet: CharacterSheet): CharacterSheet {
  // Saved purchases belong to the player. Unmet requirements are reported by
  // calculateCharacter and never erase skills during an unrelated edit.
  return sheet;
}

export function familyColor(family: string) {
  if (family === "Ukaku") return "sky";
  if (family === "Koukaku") return "amber";
  if (family === "Rinkaku") return "crimson";
  if (family === "Bikaku") return "violet";
  return "neutral";
}

export function effectMaximum(item: KaguneEffect, sheet: CharacterSheet) {
  const gradeCap = Math.max(1, Math.floor(sheet.grade / 2) + 1);
  let max = item.rankCap === "grade" ? gradeCap : item.maxRank || 1;
  if (item.id === "aumentar-distancia") max = kaguneFamiliesForSheet(sheet).has("Koukaku") ? 2 : 4;
  if (item.id === "couraca-superior") max = Math.min(item.maxRank || 1, Math.max(1, Math.floor(sheet.grade / 2)));
  if (sheet.kaguneType === "Bikaku" && item.family !== "Geral" && !kaguneFamiliesForSheet(sheet).has(item.family as KaguneFamily) && !sheet.selectedEvolutions.includes("custo-beneficio")) max = Math.max(1, max - 1);
  return max;
}

function calculateCharacterCore(sheet: CharacterSheet, context: {quinque?:boolean} = {}) {
    sheet = { ...sheet, perks: normalizePerkPurchases(sheet.perks) };
    const rcSuppressed = !context.quinque && isRCSuppressed(sheet.vats);
    if (rcSuppressed) sheet = { ...sheet, kaguneActive: false, kakuja: { ...sheet.kakuja, active: false }, damageContext: { ...sheet.damageContext, koukakuMode: "normal" } };
    const ghoulCombatBase = !context.quinque && isMentalityGhoul(sheet.species) ? Math.floor(sheet.grade / 2) : 0;
    if(sheet.vats.kakuhouUntil>sheet.vats.turn) sheet={...sheet,kakuja:{...sheet.kakuja,active:false}};
    const vatsWounds = penalties(sheet.vats);
    const centipedeActive = sheet.vats.centipedeUntil > sheet.vats.turn;
    const species = speciesOptions.find((item) => item.id === sheet.species) || speciesOptions[0];
    const customSkillBonuses = calculateCustomSkillBonuses(sheet.customSkills);
    const customSkillsPE = customSkillsCost(sheet.customSkills);
    const mastery = masteryBonuses(sheet.selectedEvolutions, sheet.weaponKind === "kagune" && sheet.kaguneActive, sheet.baseAttributes.vigor);
    const { speciesBonuses, permanentAttributes } = permanentAttributesForSheet(sheet);
    const activeAttributes = { ...permanentAttributes };
    attributeKeys.forEach((key) => { activeAttributes[key] += customSkillBonuses.attributeBonus[key]; });
    const bodyUpgrade = sheet.effects["aprimoramentos-corporais"];
    if (sheet.kaguneActive && bodyUpgrade?.target) activeAttributes[bodyUpgrade.target] += bodyUpgrade.rank;
    attributeKeys.forEach(key => { activeAttributes[key] = Math.floor(activeAttributes[key]); });
    const kakujaState = context.quinque ? { ...sheet.kakuja, active: false } : sheet.kakuja;
    const kakujaManifested = kakujaState.active && sheet.grade >= 6 && ["ghoul", "ghoul-dominante", "ghoul-artificial"].includes(sheet.species) && kakujaState.cannibalPE >= 25;
    const kakujaBonuses=calculateKakujaPerkBonuses(kakujaState,sheet.grade,sheet.species,[...kaguneFamiliesForSheet(sheet)],activeAttributes);
    const kakujaBiology=calculateKakujaBiology(kakujaState,sheet.grade,sheet.species,[...kaguneFamiliesForSheet(sheet)],activeAttributes);
    const kakujaWounds={...vatsWounds,physical:kakujaWoundPenalty(vatsWounds.physical,kakujaBiology),agility:kakujaWoundPenalty(vatsWounds.agility,kakujaBiology),dodge:kakujaWoundPenalty(vatsWounds.dodge,kakujaBiology)};
    const reworkFamilies = kaguneFamiliesForSheet(sheet);
    const reworkWeaponActive = sheet.weaponKind !== "nenhum" && sheet.vats.kakuhouUntil <= sheet.vats.turn && (sheet.kaguneActive || (Boolean(sheet.effects["forma-versatil"]) && reworkFamilies.has("Koukaku") && sheet.damageContext.koukakuMode !== "normal"));
    // A Quinque owns only compatible equipment purchases; it never inherits a racial perk.
    const reworkSelections = context.quinque ? Object.fromEntries(Object.entries(sheet.perks).filter(([id]) => {
      const item = perks.find(candidate => candidate.id === id);
      return item && !item.species && (item.equipmentCompatible || item.location === "kakuhou" || item.requiredWeapon === "quinque");
    })) : sheet.perks;
    const reworkContext = { perks: reworkSelections, attributes: activeAttributes, weaponActive: reworkWeaponActive, level: sheet.grade, species: sheet.species, kaguneTypes: [...reworkFamilies] };
    const reworkBonuses = calculateReworkBonuses(reworkContext);
    const scalingContext = { ...reworkContext, weaponActive: reworkWeaponActive && (Boolean(context.quinque) || sheet.weaponKind === "kagune") && sheet.vats.kakuhouUntil <= sheet.vats.turn, weaponKind: context.quinque ? "quinque" : sheet.weaponKind, quinque: Boolean(context.quinque), hasRC: Boolean(context.quinque) || species.hasKagune };
    const scalingMeta = calculateScalingBonuses(scalingContext, {});
    const scalingBase: ScalingBase = {};
    const scaled = (stat: ScalingStat, subtotal: number) => {
      scalingBase[stat] = Math.floor(subtotal);
      return Math.floor(subtotal) + scalingIncrease(stat, subtotal, scalingMeta.percentages);
    };
    const activePoisonPerks = poisonPerks.filter(item => isScalingPerkActive(item.id, scalingContext)).map(item => item.id);
    const poisonConfig = { enabled: activePoisonPerks.includes("r26-veneno-inoculacao"), control: activeAttributes.controle, level: sheet.grade, perks: activePoisonPerks };
    // Only the weapon's own armor participates in Koukaku's Forma Versátil conversion.
    const generalReworkBonuses = calculateReworkBonuses({ ...reworkContext, weaponActive: false });
    const reworkWeaponRD = reworkBonuses.weaponRD + (context.quinque ? reworkBonuses.rd : reworkBonuses.rd - generalReworkBonuses.rd);
    const ghoulControlBonus = !context.quinque && isMentalityGhoul(sheet.species) ? activeAttributes.controle : 0;
    const ghoulCombatDice = ghoulCombatBase + ghoulControlBonus;
    const maxSanity = scaled("sanity", maximumSanity(sheet.grade, activeAttributes.controle, -(sheet.selectedEvolutions.includes("monstro") ? 5 : 0) + sheet.customBonuses.sanity + customSkillBonuses.maxSanity + reworkBonuses.sanity, Boolean(sheet.drawbacks["mente-fragil"])));
    const testDie = context.quinque ? 20 : mentalityDie(sheet.species, sheet.currentSanity, maxSanity);
    const scaledTest = (stat: ScalingStat, dice: number, modifier: number) => {
      const subtotal = Math.floor(dice) + Math.floor(modifier);
      return formatTest(dice + scaled(stat, subtotal) - subtotal, modifier, false, testDie);
    };

    const permanentDice = blankAttributeMap();
    if (sheet.perks["cem-por-cento"]) permanentDice.raciocinio += 2;
    if (sheet.perks["olho-deus"]) permanentDice.percepcao += 1;
    if (sheet.perks.elegante) permanentDice.presenca += 2;
    if (sheet.perks["frio-neve"]) permanentDice.controle += 2;
    attributeKeys.forEach((key) => { permanentDice[key] += customSkillBonuses.attributeDice[key]; });
    const attributeTests = Object.fromEntries(attributeKeys.map((key) => {
      const attribute = activeAttributes[key];
      const dice = attribute + permanentDice[key] + sheet.extraDice[key] + reworkBonuses.attributeChecks[key];
      return [key, formatTest(dice, Math.floor(attribute / 2), false, testDie)];
    })) as Record<AttributeKey, string>;

    const increaseHitRank = sheet.effects["aumentar-acerto"]?.rank || 0;
    const multipleTailsRank = sheet.effects["multiplas-caudas"]?.rank || 0;
    const multipleTailsPlusRank = evolutionRank(sheet.selectedEvolutions, "multiplas-caudas-plus");
    const naturalTails = Math.max(1, 1 + multipleTailsRank + multipleTailsPlusRank);
    const milPernasActive = sheet.selectedEvolutions.includes('mil-pernas') && sheet.vats.milPernasUntil > sheet.vats.turn;
    const mitosisExtra = sheet.selectedEvolutions.includes('mitose-tentacruel') && sheet.vats.mitosisUntil > sheet.vats.turn ? Math.min(naturalTails,sheet.vats.mitosisCount) : 0;
    const maximumTails = naturalTails + sheet.vats.manualTails + (milPernasActive ? 2 : 0) + mitosisExtra;
    const colossoState = colossoParts({ purchased: !context.quinque && Boolean(sheet.perks[COLOSSO_PERK_ID]?.rank), requested: sheet.colossoActive, kagune: sheet.weaponKind === "kagune", manifested: sheet.kaguneActive, capacity: maximumTails, parts: sheet.vats.parts, turn: sheet.vats.turn, kakuhouUntil: sheet.vats.kakuhouUntil });
    const colossoAgilityPenalty = colossoState.active ? colossoState.pairs : 0;
    const tails = tailLoadout(sheet.vats.parts,maximumTails,sheet.kaguneActive,sheet.vats.turn,sheet.vats.kakuhouUntil,sheet.selectedEvolutions.includes('oito-caminhos'),colossoState.active);
    const tentacleMomentum = sheet.selectedEvolutions.includes('tentaculos-incessantes') && sheet.kaguneActive && sheet.vats.lastTentacleAttackTurn >= sheet.vats.turn-1 ? sheet.vats.tentacleMomentum : 0;
    const damage = sheet.damageContext;
    const isActive = (scope: "physical" | "kagune", id: string) => Boolean(damage.active[`${scope}:${id}`]);
    const situationalHit = (scope: "physical" | "kagune") =>
      (sheet.archetype === 'O Justiceiro' && isActive(scope,'justiceiro') ? 1 : 0)
      + (sheet.perks['entre-costelas'] && isActive(scope,'entre-costelas') ? 1 : 0)
      - (sheet.perks['golpe-preciso'] && isActive(scope,'golpe-preciso') ? Math.max(0,damage.preciseHitDice) : 0)
      - (sheet.perks['equacao-letal'] && isActive(scope,'equacao-letal') ? Math.min(2,Math.max(0,damage.equationLethalDice)) : 0);
    const evolutionHit = (sheet.selectedEvolutions.includes('predador-ceus') && isActive('kagune','predador-ceus') ? Math.min(4,Math.max(0,damage.predadorCeusStacks)) : 0)
      + (sheet.selectedEvolutions.includes('mil-penas') && isActive('kagune','mil-penas') ? Math.max(0,damage.milPenasSacrifices) : 0)
      + (sheet.selectedEvolutions.includes('lanca-ceus') && isActive('kagune','lanca-ceus') ? 2 : 0)
      + (sheet.selectedEvolutions.includes('lanca-deus') && isActive('kagune','lanca-deus') ? 4 : 0);
    const officialExtraAttacks = evolutionRank(sheet.selectedEvolutions, "ataque-extra");
    const extraAttacks = Math.floor(officialExtraAttacks + customSkillBonuses.extraAttacks);
    const kakujaExtraAttacks = Math.floor(extraAttacks + kakujaBonuses.extraAttacks);
    const primaryAttribute: AttributeKey = sheet.kaguneType === "Ukaku" ? "precisao" : sheet.kaguneType === "Koukaku" ? "vigor" : sheet.kaguneType === "Rinkaku" ? "forca" : "agilidade";
    const primaryValue = activeAttributes[primaryAttribute];
    const primaryDice = primaryValue + permanentDice[primaryAttribute] + sheet.extraDice[primaryAttribute] + customSkillBonuses.kaguneHitDice + mastery.hit + ghoulCombatDice + tentacleMomentum + situationalHit("kagune") + evolutionHit + increaseHitRank + reworkBonuses.kaguneHit;
    const kaguneModifier = Math.floor(primaryValue / 2) + (multipleTailsRank >= 4 ? 1 : 0);
    const kaguneTest = adjustTest(scaledTest("kaguneHit", primaryDice, kaguneModifier), (physicalAttributes.includes(primaryAttribute) ? vatsWounds.physical : vatsWounds.mental) + (primaryAttribute === "agilidade" ? vatsWounds.agility - colossoAgilityPenalty : 0) + (centipedeActive ? 2 : 0) + (colossoState.active ? colossoState.pairs : 0));
    const kakujaKaguneTest = adjustTest(kaguneTest, (physicalAttributes.includes(primaryAttribute) ? kakujaWounds.physical - vatsWounds.physical : 0) + (primaryAttribute === "agilidade" ? kakujaWounds.agility - vatsWounds.agility : 0));
    const looseHitAdjustments = 0;

    const situationalSteps = (scope: "physical" | "kagune") => {
      let total = sheet.perks.furioso?.rank || 0;
      if (sheet.archetype === "O Justiceiro" && isActive(scope, "justiceiro")) total += 2;
      if (sheet.archetype === "O Hedonista" && isActive(scope, "hedonista")) total += 3;
      if (sheet.perks["golpe-preciso"] && isActive(scope, "golpe-preciso")) total += damage.preciseHitDice;
      if (sheet.perks["equacao-letal"] && isActive(scope, "equacao-letal")) total += damage.equationLethalDice * 2;
      if (sheet.perks["quebra-portas"] && isActive(scope, "quebra-portas")) total += 2;
      if (scope === "physical" && sheet.perks.skadoosh && isActive(scope, "skadoosh")) total += 40;
      if (sheet.perks["respiracao-contida"] && isActive(scope, "respiracao-contida")) total += 2;
      if (sheet.perks["disparo-reflexivo"] && isActive(scope, "disparo-reflexivo")) total -= 2;
      if (sheet.perks["golpe-direcionado"] && isActive(scope, "golpe-direcionado")) total += 2;
      if (sheet.perks["olho-cacador"] && isActive(scope, "olho-cacador")) total += 2;
      if (sheet.perks["disparo-alma"] && isActive(scope, "disparo-alma")) total += 5;
      if (sheet.perks["entre-costelas"] && isActive(scope, "entre-costelas")) total -= 2;
      if (sheet.perks.momentum && isActive(scope, "momentum")) total += 2;
      if (sheet.perks["corpo-lamina"] && isActive(scope, "corpo-lamina")) total += 3;
      if (sheet.perks.adaptabilidade && isActive(scope, "adaptabilidade")) total += Math.floor(activeAttributes.raciocinio / 2);
      if (sheet.perks.fortificador && isActive(scope, "fortificador")) total += 2;
      if (sheet.perks["foco-letal"] && isActive(scope, "foco-letal")) total += damage.focusLethalSteps * 2;
      return total;
    };
    const consumedSteps = (scope: "physical" | "kagune") =>
      (sheet.perks["foco-letal"] && isActive(scope, "foco-letal") ? damage.focusLethalSteps : 0);
    const hungerDamage = sheet.hunger >= 10 ? sheet.grade : 0;

    const physicalAttribute = damage.physicalAttribute;
    const physicalValue = activeAttributes[physicalAttribute];
    const physicalHitDice = physicalValue + permanentDice[physicalAttribute] + sheet.extraDice[physicalAttribute] + customSkillBonuses.physicalHitDice + ghoulCombatDice + situationalHit("physical") + reworkBonuses.physicalHit;
    const physicalHitTest = adjustTest(scaledTest("physicalHit", physicalHitDice, Math.floor(physicalValue / 2)), vatsWounds.physical);
    let physicalSteps = Math.floor(physicalValue / 2) + damage.physicalExtraSteps + situationalSteps("physical") - consumedSteps("physical") + customSkillBonuses.physicalSteps + reworkBonuses.physicalSteps;
    if (sheet.perks.pugilista) physicalSteps += 2;
    if (sheet.drawbacks["soca-fofo"]) physicalSteps -= 2;
    if (sheet.perks["impacto-cinetico"] && isActive("physical", "impacto-cinetico")) physicalSteps += 2;
    if (sheet.perks["corpo-cerco"] && isActive("physical", "corpo-cerco")) physicalSteps += 3;
    if (sheet.perks["cacador-aberturas"] && isActive("physical", "cacador-aberturas")) physicalSteps += 2;
    if (sheet.perks.oportunista && isActive("physical", "oportunista")) physicalSteps += 2;
    if (sheet.perks["guarda-agressiva"] && isActive("physical", "guarda-agressiva")) physicalSteps += 2;
    if (sheet.perks["ritmo-combate"] && isActive("physical", "ritmo-combate")) physicalSteps += 1;
    if (sheet.perks.carrasco && isActive("physical", "carrasco")) physicalSteps += 2;
    if (sheet.perks["ultimo-homem-pe"] && isActive("physical", "ultimo-homem-pe")) physicalSteps += 2;
    if (sheet.perks["lenda-dragao"] && isActive("physical", "lenda-dragao")) physicalSteps += 15;
    const physicalDamageModifier = Math.floor(Math.floor(physicalValue / 2) + damage.physicalExtraModifier + hungerDamage + customSkillBonuses.physicalDamageModifier + reworkBonuses.physicalDamage);
    physicalSteps = scaled("physicalSteps", physicalSteps);
    const physicalDamage = formatDamage(physicalSteps, physicalDamageModifier);

    let kaguneSteps = Math.floor(primaryValue / 2) + (sheet.effects["aumentar-passos"]?.rank || 0) + damage.kaguneExtraSteps + situationalSteps("kagune") - consumedSteps("kagune") + customSkillBonuses.kaguneSteps + mastery.steps + reworkBonuses.kaguneSteps;
    let kaguneDamageModifier = Math.floor(primaryValue / 2) + (sheet.effects["aumentar-dano"]?.rank || 0) + damage.kaguneExtraModifier + hungerDamage + customSkillBonuses.kaguneDamageModifier + reworkBonuses.kaguneDamage;
    const kaguneFamilies = kaguneFamiliesForSheet(sheet);
    if (kaguneFamilies.has("Rinkaku")) kaguneDamageModifier += 2;
    if ((kaguneFamilies.has("Ukaku") && damage.targetKaguneType === "Bikaku") || (kaguneFamilies.has("Rinkaku") && damage.targetKaguneType === "Koukaku")) kaguneDamageModifier += 2;
    let multipleTailsEvolutionBonusSteps = 0;
    if (sheet.effects["mudanca-forma"] && isActive("kagune", "mudanca-forma")) kaguneSteps += Math.floor(sheet.effects["mudanca-forma"].rank / 2);
    if (sheet.effects.cristalizacao && isActive("kagune", "cristalizacao")) {
      kaguneSteps += [0, 2, 3, 4][sheet.effects.cristalizacao.rank] || 4;
      kaguneDamageModifier += (sheet.effects["cristalizacao-potencializada"]?.rank || 0) * 2;
    }
    if (sheet.effects["criar-arma"] && isActive("kagune", "criar-arma")) kaguneSteps += sheet.effects["criar-arma"].rank;
    if (sheet.effects["adicionar-elemento"] && isActive("kagune", "adicionar-elemento")) kaguneDamageModifier += sheet.effects["adicionar-elemento"].rank >= 2 ? 6 : 3;
    if (sheet.effects["tiros-explosivos"] && isActive("kagune", "tiros-explosivos")) kaguneSteps += sheet.effects["tiros-explosivos"].rank;
    if (sheet.effects["lamina-cauda-viva"] && isActive("kagune", "lamina-cauda-viva")) kaguneSteps += 2;
    if (sheet.selectedEvolutions.includes("perda-peso") && isActive("kagune", "perda-peso")) kaguneSteps += 2;
    if (sheet.selectedEvolutions.includes("mestre-armas") && damage.koukakuMode === "attack" && isActive("kagune", "mestre-armas")) kaguneSteps += 2;
    if (sheet.selectedEvolutions.includes("multiplas-caudas-plus") && isActive("kagune", "multiplas-caudas-plus")) {
      if (multipleTailsPlusRank >= 1) multipleTailsEvolutionBonusSteps = multipleTailsPlusRank === 3 ? 2 : 1;
      kaguneSteps += multipleTailsEvolutionBonusSteps;
    }
    if (sheet.selectedEvolutions.includes("ferreiro-guerra") && isActive("kagune", "ferreiro-guerra")) kaguneSteps += Math.floor(Math.max(sheet.baseAttributes.forca, sheet.baseAttributes.agilidade) / 2);
    if (sheet.selectedEvolutions.includes("lanca-ceus") && isActive("kagune", "lanca-ceus")) kaguneSteps += 10;
    if (milPernasActive) kaguneSteps += 2;
    if (sheet.selectedEvolutions.includes("predador-perfeito") && isActive("kagune", "predador-perfeito")) kaguneSteps += 2;
    if (sheet.selectedEvolutions.includes("chuva-carmesim") && isActive("kagune", "chuva-carmesim")) kaguneSteps += 4;
    if (sheet.selectedEvolutions.includes("chuva-carmesim") && isActive("kagune", "chuva-carmesim-penalidade")) kaguneSteps -= 2;
    if (sheet.selectedEvolutions.includes("predador-ceus") && isActive("kagune", "predador-ceus")) kaguneSteps += damage.predadorCeusStacks;
    if (sheet.selectedEvolutions.includes("arsenal-vivo") && isActive("kagune", "arsenal-vivo")) kaguneSteps += 5;
    if (sheet.selectedEvolutions.includes("continua-crescendo")) kaguneSteps += growthBonus(Math.max(sheet.vats.growth, isActive("kagune", "continua-crescendo") ? damage.growthPoints : 0), maximumTails);
    if (sheet.selectedEvolutions.includes("mestre-nada") && isActive("kagune", "mestre-nada")) kaguneSteps += 4;
    if (sheet.selectedEvolutions.includes("mil-penas") && isActive("kagune", "mil-penas")) kaguneSteps += damage.milPenasSacrifices * 2;
    if (sheet.selectedEvolutions.includes("lanca-deus") && isActive("kagune", "lanca-deus")) kaguneSteps += 15;
    if (sheet.selectedEvolutions.includes("centopeia") && (centipedeActive || isActive("kagune", "centopeia"))) kaguneSteps += 4;
    if (sheet.perks["wally-like"] && isActive("kagune", "wally-like")) kaguneSteps += Math.min(activeAttributes.agilidade, Math.floor(activeAttributes.agilidade / 2) + Math.floor(activeAttributes.precisao / 2));
    if (sheet.perks.ceifador && isActive("kagune", "ceifador")) kaguneSteps += 8;
    if (sheet.effects["estouro-rc"] && isActive("kagune", "estouro-rc")) kaguneSteps += 3;
    if (sheet.effects["estouro-rc"] && isActive("kagune", "estouro-rc-penalidade")) kaguneSteps -= 1;
    if (sheet.perks["cristais-tungstenio"] && isActive("kagune", "cristais-tungstenio")) kaguneSteps += 2;
    if (sheet.perks["railgun-rc"] && isActive("kagune", "railgun-rc")) kaguneSteps += 7;
    if (sheet.perks["ultimo-horizonte"] && isActive("kagune", "ultimo-horizonte")) kaguneSteps += 12;
    if (sheet.perks["hidra-cristalina"] && isActive("kagune", "hidra-cristalina")) kaguneSteps += 3;
    if (sheet.perks["muda-penas"] && isActive("kagune", "muda-penas")) kaguneSteps += 2;
    if (sheet.perks["predador-angulo-morto"] && isActive("kagune", "predador-angulo-morto")) kaguneSteps += 2;
    if (sheet.perks["mergulho-escarlate"] && isActive("kagune", "mergulho-escarlate")) kaguneSteps += 4;
    if (sheet.perks["tentaculo-blindado"] && isActive("kagune", "tentaculo-blindado")) kaguneSteps += 2;
    if (sheet.perks["leviata-imortal"] && isActive("kagune", "leviata-imortal")) kaguneSteps += 3;
    if (sheet.perks["postura-dupla"] && isActive("kagune", "postura-dupla-ataque")) kaguneSteps += 2;
    if (sheet.perks["lanca-escorpionica"] && isActive("kagune", "lanca-escorpionica")) kaguneSteps += 2;
    if (sheet.perks["arsenal-carrasco"] && isActive("kagune", "arsenal-carrasco-ataque")) kaguneSteps += 4;
    if (sheet.perks["cavaleiro-escarlate"] && isActive("kagune", "cavaleiro-escarlate-ataque")) kaguneSteps += 5;
    if (sheet.perks["danca-serpentes"] && isActive("kagune", "danca-serpentes")) kaguneSteps += 2;
    if (sheet.perks["predador-reacao"] && isActive("kagune", "predador-reacao")) kaguneSteps += 3;
    if (sheet.perks.orochi && isActive("kagune", "orochi")) kaguneSteps += 3;
    if (sheet.perks["serafim-ferro-sangue"] && isActive("kagune", "serafim-ferro-sangue")) kaguneSteps += 3;
    if (sheet.perks["motor-cerco-celeste"] && isActive("kagune", "motor-cerco-celeste")) kaguneSteps += 2;
    if (sheet.perks["leviata-carne"] && isActive("kagune", "leviata-carne-ataque")) kaguneSteps += 2;
    if (sheet.perks["trindade-predatoria"] && isActive("kagune", "trindade-predatoria-ataque")) kaguneSteps += 2;
    if (sheet.perks["quimera-absoluta"] && isActive("kagune", "quimera-absoluta")) kaguneSteps += 4;
    if (sheet.perks["impacto-cinetico"] && isActive("kagune", "impacto-cinetico")) kaguneSteps += 2;
    if (sheet.perks["corpo-cerco"] && isActive("kagune", "corpo-cerco")) kaguneSteps += 3;
    if (sheet.perks["cacador-aberturas"] && isActive("kagune", "cacador-aberturas")) kaguneSteps += 2;
    if (sheet.perks.oportunista && isActive("kagune", "oportunista")) kaguneSteps += 2;
    if (sheet.perks["guarda-agressiva"] && isActive("kagune", "guarda-agressiva")) kaguneSteps += 2;
    if (sheet.perks["ritmo-combate"] && isActive("kagune", "ritmo-combate")) kaguneSteps += 1;
    if (sheet.perks.carrasco && isActive("kagune", "carrasco")) kaguneSteps += 2;
    if (sheet.perks["ultimo-homem-pe"] && isActive("kagune", "ultimo-homem-pe")) kaguneSteps += 2;

    kaguneSteps = Math.floor(kaguneSteps);
    kaguneDamageModifier = Math.floor(kaguneDamageModifier);
    const formaVersatilRank = sheet.effects["forma-versatil"]?.rank || 0;
    const canUseVersatileForm = sheet.weaponKind !== "nenhum" && formaVersatilRank > 0 && kaguneFamilies.has("Koukaku");
    const kaguneManifested = sheet.kaguneActive || (canUseVersatileForm && damage.koukakuMode !== "normal");
    const characterRD = sheet.perks["pele-dura"] ? Math.floor(activeAttributes.vigor / 2) : 0;
    let kaguneRD = (kaguneManifested && kaguneFamilies.has("Koukaku") ? 2 : 0) + reworkWeaponRD;
    if (kaguneManifested) kaguneRD += sheet.effects["couraca-revestida"]?.rank || 0;
    if (kaguneManifested && kaguneFamilies.has("Koukaku")) kaguneRD += 5 * evolutionRank(sheet.selectedEvolutions, "revestimento-exoesqueletico");
    const superiorArmor = kaguneManifested ? sheet.effects["couraca-superior"]?.rank || 0 : 0;
    if (superiorArmor) kaguneRD += activeAttributes.vigor + Math.max(0, superiorArmor - 1);
    if (kaguneManifested) kaguneRD += damage.kaguneExtraRD;
    if (sheet.perks["carne-mineral"] && isActive("kagune", "carne-mineral")) kaguneRD += 3;
    if (sheet.perks["leviata-imortal"] && isActive("kagune", "leviata-imortal")) kaguneRD += 5;
    if (sheet.perks["postura-dupla"] && isActive("kagune", "postura-dupla-defesa")) kaguneRD += 2;
    if (sheet.perks["arsenal-carrasco"] && isActive("kagune", "arsenal-carrasco-defesa")) kaguneRD += 3;
    if (sheet.perks["cavaleiro-escarlate"] && isActive("kagune", "cavaleiro-escarlate-defesa")) kaguneRD += 4;
    if (sheet.perks["guarda-hidra"] && isActive("kagune", "guarda-hidra")) kaguneRD += 2;
    if (sheet.perks["serafim-ferro-sangue"] && isActive("kagune", "serafim-ferro-sangue-defesa")) kaguneRD += 3;
    if (sheet.perks["motor-cerco-celeste"] && isActive("kagune", "motor-cerco-celeste-defesa")) kaguneRD += 2;
    if (sheet.perks["leviata-carne"] && isActive("kagune", "leviata-carne-defesa")) kaguneRD += 2;
    if (sheet.perks["trindade-predatoria"] && isActive("kagune", "trindade-predatoria-defesa")) kaguneRD += 3;
    if (sheet.perks["quimera-absoluta"] && isActive("kagune", "quimera-absoluta")) kaguneRD += 4;
    if (sheet.selectedEvolutions.includes("perda-peso") && isActive("kagune", "perda-peso")) kaguneRD = Math.max(0, kaguneRD - 6);
    let rawRD = characterRD + kaguneRD + customSkillBonuses.rd + tails.rd + reworkBonuses.rd - (reworkWeaponRD - reworkBonuses.weaponRD);
    const stepsBeforeVersatileForm = kaguneSteps;
    const rdBeforeVersatileForm = rawRD;
    const versatileDamageBonusSteps = Math.max(0, kaguneSteps - Math.floor(primaryValue / 2));
    let versatileConvertedDamageSteps = 0;
    const versatileConvertibleRD = Math.max(0, kaguneRD);
    let versatileConvertedRD = 0;
    let versatileStepChange = 0;
    let versatileRDChange = 0;
    if (canUseVersatileForm && damage.koukakuMode === "defense") {
      versatileConvertedDamageSteps = Math.floor(versatileDamageBonusSteps / 2);
      kaguneSteps -= versatileConvertedDamageSteps;
      rawRD += formaVersatilRank + versatileConvertedDamageSteps;
      versatileStepChange = -versatileConvertedDamageSteps;
      versatileRDChange = formaVersatilRank + versatileConvertedDamageSteps;
    }
    if (canUseVersatileForm && damage.koukakuMode === "attack") {
      versatileConvertedRD = Math.floor(versatileConvertibleRD / 2);
      const gainedSteps = formaVersatilRank + Math.floor(versatileConvertedRD / 2);
      rawRD -= versatileConvertedRD;
      kaguneSteps += gainedSteps;
      versatileStepChange = gainedSteps;
      versatileRDChange = -versatileConvertedRD;
    }
    kaguneSteps = scaled("kaguneSteps", kaguneSteps);
    const kaguneDamagePerPart = formatDamage(kaguneSteps, kaguneDamageModifier);
    const additionalEvolutionTails = multipleTailsPlusRank;
    const hasMultipleTails = multipleTailsRank > 0 || additionalEvolutionTails > 0;
    const rinkakuTailCount = hasMultipleTails || kaguneFamilies.has("Rinkaku") ? maximumTails : 0;
    const activeTailCount = rinkakuTailCount ? tails.attacks.length : 0;
    const rinkakuTailDamage = rinkakuTailCount ? formatDamage(kaguneSteps - (hasMultipleTails ? 2 : 0), kaguneDamageModifier) : "";
    const colossoDamagePerPart = rinkakuTailDamage || kaguneDamagePerPart;
    const sharedStepBase=canUseVersatileForm&&damage.koukakuMode==='defense'?Math.ceil(generalReworkBonuses.kaguneSteps/2):generalReworkBonuses.kaguneSteps;
    const fusionSharedSteps=colossoState.active?Math.min(kaguneSteps,sharedStepBase+scalingIncrease('kaguneSteps',sharedStepBase,scalingMeta.percentages)):0;
    const fusionSharedFlat=colossoState.active?generalReworkBonuses.kaguneDamage:0;
    const colossoOtherPartDamage=formatDamage(Math.max(0,kaguneSteps-(hasMultipleTails?2:0)-fusionSharedSteps),kaguneDamageModifier-fusionSharedFlat);
    const kaguneDamage = colossoState.active ? sumPartDamage([colossoDamagePerPart,...Array.from({length:colossoState.partCount-1},()=>colossoOtherPartDamage)]) : kaguneDamagePerPart;
    const rinkakuAllTailsDamage = colossoState.active ? kaguneDamage : activeTailCount ? multiplyDamage(rinkakuTailDamage, activeTailCount) : "0";

    const attributePE = attributeKeys.reduce((total, key) => total + attributePurchaseCost(sheet.baseAttributes[key]), 0);
    const catalogPerksPE = Object.entries(sheet.perks).reduce((total, [id, acquired]) => {
      const item = perks.find((candidate) => candidate.id === id);
      return total + (item ? perkCostForSheet(item, acquired.rank, sheet) : 0);
    }, 0);
    const kagunePerksPE = Object.entries(sheet.perks).reduce((total, [id, acquired]) => {
      const item = perks.find((candidate) => candidate.id === id);
      return total + (item?.category === "Kagune Quimera" ? perkCostForSheet(item, acquired.rank, sheet) : 0);
    }, 0);
    const nonKaguneCatalogPerksPE = catalogPerksPE - kagunePerksPE;
    const nonKagunePerkCount = Object.keys(sheet.perks).filter((id) => perks.find((candidate) => candidate.id === id)?.category !== "Kagune Quimera").length;
    const kagunePerkLevelCount = Object.entries(sheet.perks).reduce((total, [id, acquired]) => perks.find((candidate) => candidate.id === id)?.category === "Kagune Quimera" ? total + acquired.rank : total, 0);
    const customPerksPE = Math.floor(sheet.customPerks.reduce((total, item) => total + Math.max(0, item.cost || 0), 0));
    const perksPE = catalogPerksPE + customPerksPE;
    const drawbackCredit = Object.entries(sheet.drawbacks).reduce((total, [id, acquired]) => {
      const item = drawbacks.find((candidate) => candidate.id === id);
      return total + (item ? rankCost(item.credit, acquired.rank, "choice") : 0);
    }, 0);

    let nominalEffectPE = 0;
    let actualEffectPE = 0;
    let effectLevelCount = 0;
    Object.entries(sheet.effects).forEach(([id, acquired]) => {
      const item = kaguneEffects.find((candidate) => candidate.id === id);
      if (!item) return;
      const costs = effectCostForSheet(item, acquired.rank, sheet);
      nominalEffectPE += costs.baseTotal;
      actualEffectPE += costs.paidTotal;
      effectLevelCount += acquired.rank;
    });
    const evolutionCounts = new Map<string, number>();
    let nominalEvolutionPE = 0;
    let evolutionPE = 0;
    sheet.selectedEvolutions.forEach((id) => {
      const item = evolutions.find((candidate) => candidate.id === id);
      if (!item) return;
      const nextRank = (evolutionCounts.get(id) || 0) + 1;
      evolutionCounts.set(id, nextRank);
      const costs = evolutionCostsForSheet(item, nextRank, sheet.species);
      nominalEvolutionPE += costs.baseTotal - evolutionCostsForSheet(item, nextRank - 1, sheet.species).baseTotal;
      evolutionPE += costs.paidTotal - evolutionCostsForSheet(item, nextRank - 1, sheet.species).paidTotal;
    });
    const quimeraTypeCount = kaguneFamilies.size;
    const quimeraCost = sheet.weaponKind === "kagune" ? Math.max(0, quimeraTypeCount - 1) * 6 : 0;
    const frameBudget = sheet.species === "quinx" ? 2 + (sheet.quinxFrame >= 3 ? 4 : 0) + (sheet.quinxFrame >= 4 ? Math.floor(sheet.grade / 2) : 0) + (sheet.quinxFrame >= 5 ? Math.floor(sheet.grade / 2) : 0) : 0;
    const freeKaguneBudget = frameBudget + (sheet.species === "humano-dominante" ? 6 : 0);
    const paidEffectPE = sheet.weaponKind === "kagune" ? Math.max(0, actualEffectPE - freeKaguneBudget) : 0;
    const completedGradeSteps = gradeProgression.filter((step) => step.to <= sheet.grade);
    const currentGradeRequirement = completedGradeSteps.at(-1)?.requiredPE || 0;
    const cumulativeGradeRequirement = cumulativeGradePE(sheet.grade);
    const hasNextGrade = sheet.grade < MAX_LEVEL;
    const nextGrade = hasNextGrade ? sheet.grade + 1 : sheet.grade;
    const nextGradeRequirement = hasNextGrade ? gradeRequirementFor(sheet.grade) : 0;
    const nextCumulativeRequirement = cumulativeGradeRequirement + nextGradeRequirement;
    const gradeGrant = cumulativeGradeRequirement;
    const gradeRewardBreakdown = completedGradeSteps.map((step) => step.requiredPE);
    const progressionPE = Math.floor(progressionPEFor(sheet));
    const progressRemaining = Math.floor(Math.max(0, nextGradeRequirement - sheet.progressPE));
    const progressPercent = Math.floor(hasNextGrade && nextGradeRequirement > 0 ? Math.min(100, (sheet.progressPE / nextGradeRequirement) * 100) : 100);
    const canAdvanceGrade = hasNextGrade && sheet.progressPE >= nextGradeRequirement;
    const peAvailable = Math.floor(20 + species.creationGrant + progressionPE + sheet.extraPE + drawbackCredit);
    const kakujaCommonPE = Math.floor(Math.max(0, sheet.kakuja.extraKakujaPE || 0) + kakujaPerksCost(sheet.kakuja.selectedPerks));
    const peSpent = Math.floor(species.subCost + quimeraCost + attributePE + perksPE + paidEffectPE + evolutionPE + customSkillsPE + kakujaCommonPE);
    const peRemaining = Math.floor(peAvailable - peSpent);

    const maxLife = scaled("life", maximumLife(sheet.species, sheet.grade, activeAttributes.vigor, activeAttributes.forca, (sheet.perks.resistente ? Math.min(sheet.grade, 10) : 0) + sheet.customBonuses.hp + customSkillBonuses.maxLife + reworkBonuses.life));
    const carrying = Math.floor(Math.max(0, 7 + activeAttributes.forca + customSkillBonuses.carrying));
    const wounds = kakujaWounds;
    const kaguneBaseRange = kaguneRange(sheet.kaguneType, sheet.effects["aumentar-distancia"]?.rank || 0, sheet.customBonuses.distance + mastery.range + reworkBonuses.range);
    const distance = kaguneBaseRange + (colossoState.active ? colossoState.pairs : 0);
    const tacticalMovementLocked = !context.quinque && Boolean(sheet.tactical?.stance && sheet.tactical.stance.until > sheet.vats.turn);
    const movement = tacticalMovementLocked ? 0 : Math.floor(wounds.movement * Math.max(0, (sheet.perks.velocista ? 2 : 1) + customSkillBonuses.movement + mastery.movement + reworkBonuses.movement + kakujaBiology.movement));
    const determination = Math.floor(Math.max(0, (sheet.perks["nunca-prostra"] ? activeAttributes.controle + 4 : activeAttributes.controle + 2) + customSkillBonuses.determination));
    const evolutionLevelCount = sheet.selectedEvolutions.length;
    const effectRC = sheet.species === "ghoul-dominante" ? actualEffectPE + effectLevelCount : nominalEffectPE;
    const evolutionRC = sheet.species === "ghoul-dominante" ? evolutionPE + evolutionLevelCount : nominalEvolutionPE;
    const kagunePerkRC = sheet.species === "ghoul-dominante" ? kagunePerksPE + kagunePerkLevelCount : kagunePerksPE;
    const customSkillRC = sheet.species === "ghoul-dominante" ? customSkillsPE + sheet.customSkills.length : customSkillsPE;
    const maxRC = scaled("rc", Math.floor(sheet.weaponKind === "kagune" ? Math.max(0, effectRC + evolutionRC + kagunePerkRC + customSkillRC + quimeraCost + activeAttributes.vigor + 4 + sheet.customBonuses.rc + customSkillBonuses.maxRC + reworkBonuses.rc) : 0));
    const kagunePartRD = Math.floor(Math.max(0, kaguneRD - versatileConvertedRD + (canUseVersatileForm && damage.koukakuMode === "defense" ? formaVersatilRank + versatileConvertedDamageSteps : 0)));
    const rd = scaled("rd", Math.floor(Math.max(0, colossoState.active ? rawRD - kagunePartRD + Math.floor(kagunePartRD * colossoState.partCount / 2) : rawRD)));
    const kaguneInvestmentPE = sheet.weaponKind === "kagune" ? actualEffectPE + evolutionPE + kagunePerksPE + customSkillsPE + quimeraCost : 0;
    const rawKaguneDurability = activeAttributes.vigor + kaguneInvestmentPE;
    const durabilityMultiplier = sheet.kaguneType === "Ukaku" ? (sheet.selectedEvolutions.includes("coruka") ? 0.8 : 0.5) : sheet.kaguneType === "Koukaku" ? 1.5 : 1;
    const kagunePartDurability = Math.floor(sheet.weaponKind === "kagune" ? Math.max(1, Math.floor(rawKaguneDurability * durabilityMultiplier) - (mastery.noTailPenalty ? 0 : multipleTailsRank) + customSkillBonuses.kaguneDurability + mastery.tailDurability - (milPernasActive ? 2 : 0)) : 0);
    const colosso = calculateColosso(colossoState, { damagePerPart: colossoDamagePerPart, otherPartDamage:colossoState.active?colossoOtherPartDamage:undefined, durabilityPerPart: kagunePartDurability, rdPerPart: kagunePartRD, baseRange: kaguneBaseRange });
    const kaguneDurability = colosso.active ? colosso.durability : kagunePartDurability;
    const normalRegenerationRank = sheet.effects["regeneracao-anormal"]?.rank || 0;
    const superiorRegenerationRank = sheet.effects["regeneracao-superior"]?.rank || 0;
    const regenerationValues = calculateRegeneration(maxLife, sheet.grade, normalRegenerationRank, superiorRegenerationRank);
    const normalRegeneration = regenerationValues.normal;
    const superiorRegeneration = regenerationValues.superior;
    const regenerationSkill = kakujaRegeneration(Math.floor(Math.max(0, Math.max(normalRegeneration, superiorRegeneration) + customSkillBonuses.regeneration + kakujaBonuses.regeneration)),maxLife,kakujaBiology);
    const regeneration = passiveRegeneration(sheet.vats, {
      regeneration: regenerationSkill, maxLife, grade: sheet.grade,
      cells: Boolean(sheet.perks["celulas-ageis"]), kami: Boolean(sheet.perks["vivo-kami"]),
    }).amount;
    const kakujaDefenseDice = kakujaManifested ? kakujaFormBonuses(sheet.kakuja.complete && sheet.kakuja.cannibalPE >= 60).dice : 0;
    const blockBonus = (sheet.perks["corpo-pesado"] ? 1 : 0) + (sheet.effects["bloqueio-ferro"] && sheet.kaguneActive ? 1 : 0) + customSkillBonuses.blockDice + mastery.block + ghoulCombatDice + (sheet.selectedEvolutions.includes("perda-peso") && isActive("kagune","perda-peso") ? Math.floor(sheet.baseAttributes.agilidade/2) : 0) + reworkBonuses.block;
    const dodgeBonus = (centipedeActive ? 2 : 0) + (sheet.perks["corpo-leve"] ? 1 : 0) + (sheet.effects["esquiva-pena"] && sheet.kaguneActive ? 1 : 0) + (sheet.perks["cem-por-cento"] ? 1 : 0) + (sheet.perks.ceifador ? 2 : 0) + customSkillBonuses.dodgeDice + mastery.dodge + ghoulCombatDice + tails.dodge + reworkBonuses.dodge;
    const blockDice = activeAttributes.vigor + permanentDice.vigor + sheet.extraDice.vigor + blockBonus;
    const dodgeDice = activeAttributes.agilidade + permanentDice.agilidade + sheet.extraDice.agilidade + dodgeBonus;
    const blockModifier = Math.floor(activeAttributes.vigor / 2), dodgeModifier = Math.floor(activeAttributes.agilidade / 2);
    const blockTest = adjustTest(scaledTest("block", blockDice, blockModifier), vatsWounds.physical);
    const dodgeTest = adjustTest(scaledTest("dodge", dodgeDice, dodgeModifier), vatsWounds.dodge - colossoAgilityPenalty);
    // Scale the complete Kakuja subtotal once without changing the Kagune scaling ledger.
    const kakujaDefenseTest = (stat: "block" | "dodge", dice: number, modifier: number, penalty: number) => adjustTest(formatTest(dice + scalingIncrease(stat, dice + modifier, scalingMeta.percentages), modifier, false, testDie), penalty);
    const kakujaBlockTest = kakujaDefenseTest("block", blockDice + kakujaDefenseDice + kakujaBonuses.block, blockModifier, kakujaWounds.physical);
    const kakujaDodgeTest = kakujaDefenseTest("dodge", dodgeDice + kakujaDefenseDice + kakujaBonuses.dodge, dodgeModifier, kakujaWounds.dodge - colossoAgilityPenalty - (kakujaManifested && sheet.kakuja.selectedInstabilities.includes("corpo-pesado") ? 1 : 0));
    const kakujaKaguneRD = kagunePartRD + scalingIncrease("rd", kagunePartRD, scalingMeta.percentages);
    const kakujaPartDurability = kakujaManifested && sheet.kaguneType === "Ukaku" && sheet.selectedEvolutions.includes("coruka") ? Math.floor(Math.max(1, Math.floor(rawKaguneDurability * 1.1) - (mastery.noTailPenalty ? 0 : multipleTailsRank) + customSkillBonuses.kaguneDurability + mastery.tailDurability - (milPernasActive ? 2 : 0))) : kagunePartDurability;
    const kakujaKaguneDurability = colosso.active ? Math.floor(kakujaPartDurability * colossoState.partCount / 2) : kakujaPartDurability;
    for (const key of attributeKeys) attributeTests[key] = adjustTest(attributeTests[key], physicalAttributes.includes(key) ? wounds.physical + (key === "agilidade" ? wounds.agility : 0) : wounds.mental);
    attributeTests.agilidade = adjustTest(attributeTests.agilidade, -colossoAgilityPenalty);
    const initiativeBonus = reworkBonuses.initiative;
    const initiativeTest = adjustTest(attributeTests.agilidade, initiativeBonus);

    const issues: string[] = [];
    const purchasedCap = sheet.narrativeLimits ? Number.POSITIVE_INFINITY : PURCHASED_ATTRIBUTE_CAP;
    attributeKeys.forEach((key) => { if (sheet.baseAttributes[key] > purchasedCap) issues.push(`${attributeLabels[key]} passa do limite comprado ${purchasedCap}.`); });
    if (sheet.drawbacks.desabilidade) drawbackTargets(sheet.drawbacks.desabilidade).forEach((target) => {
      if (permanentAttributes[target] > 4) issues.push(`${attributeLabels[target]} passa do limite 4 de Desabilidade.`);
    });
    Object.keys(sheet.perks).forEach((id) => { const item = perks.find((candidate) => candidate.id === id); if (item && !perkRequirementMet(item, sheet, permanentAttributes)) issues.push(`Requisito não atendido: ${item.name}.`); });
    Object.keys(sheet.effects).forEach((id) => {
      const item = kaguneEffects.find((candidate) => candidate.id === id);
      if (item && !effectRequirementStatus(item, sheet).met) issues.push(`Pré-requisito de efeito não atendido: ${item.name}.`);
    });
    [...new Set(sheet.selectedEvolutions)].forEach((id) => {
      const item = evolutions.find((candidate) => candidate.id === id);
      if (item && !evolutionRequirementStatus(item, sheet, permanentAttributes, maxSanity).met) issues.push(`Pré-requisito de evolução não atendido: ${item.name}.`);
    });
    if (sheet.weaponKind === "quinque" && Object.keys(sheet.effects).some((id) => id !== "forma-versatil" && kaguneEffects.find((item) => item.id === id)?.type.includes("Biológico"))) issues.push("Quinque não recebe efeitos Biológicos, salvo Forma Versátil e exceções do Narrador.");
    if (peRemaining < 0) issues.push(`Faltam ${Math.abs(peRemaining)} PE para fechar a ficha.`);

    const scaling = calculateScalingBonuses(scalingContext, scalingBase);
    return { kakujaManifested, kakujaDefenseDice, kakujaBlockTest, kakujaDodgeTest, kakujaExtraAttacks, kakujaKaguneTest, kakujaKaguneSteps:kaguneSteps, kakujaKaguneDamageModifier:kaguneDamageModifier, kakujaKaguneRD, kakujaKaguneDurability, kakujaKaguneRange:distance, kakujaKagunePenetration:scaling.penetrationPercent, kakujaMovement:movement, kakujaAttributes:activeAttributes, kakujaBiology, fusionSharedSteps,fusionSharedFlat,rcSuppressed, scaling, poisonConfig, colosso, kagunePartDurability, kagunePartRD, kaguneDamagePerPart, reworkBonuses, initiativeBonus, initiativeTest, testDie, ghoulControlBonus, ghoulCombatBase, kakujaBonuses, ghoulCombatDice, naturalTails, activeTailCount, tails, mastery, maximumTails, tailAttackRC: tailAttackCost(2, mastery.efficientTailRC), distance, wounds, species, speciesBonuses, permanentAttributes, activeAttributes, permanentDice, attributeTests, primaryAttribute, kaguneTest, increaseHitRank, looseHitAdjustments, physicalAttribute, physicalValue, physicalHitTest, physicalSteps, physicalDamageModifier, physicalDamage, kaguneSteps, kaguneDamageModifier, kaguneDamage, extraAttacks, officialExtraAttacks, rinkakuTailCount, rinkakuTailDamage, rinkakuAllTailsDamage, multipleTailsRank, multipleTailsPlusRank, activeMultipleTailsPlusRank: additionalEvolutionTails, formaVersatilRank, stepsBeforeVersatileForm, rdBeforeVersatileForm, versatileDamageBonusSteps, versatileConvertedDamageSteps, versatileConvertibleRD, versatileConvertedRD, versatileStepChange, versatileRDChange, attributePE, catalogPerksPE, nonKaguneCatalogPerksPE, nonKagunePerkCount, kagunePerksPE, kagunePerkLevelCount, customPerksPE, customSkillsPE, customSkillRC, customSkillBonuses, perksPE, drawbackCredit, nominalEffectPE, actualEffectPE, effectLevelCount, effectRC, freeKaguneBudget, paidEffectPE, nominalEvolutionPE, evolutionPE, evolutionLevelCount, evolutionRC, currentGradeRequirement, cumulativeGradeRequirement, gradeGrant, gradeRewardBreakdown, progressionPE, hasNextGrade, nextGrade, nextGradeRequirement, nextCumulativeRequirement, progressRemaining, progressPercent, canAdvanceGrade, peAvailable, peSpent, peRemaining, kakujaCommonPE, maxLife, maxSanity, maxRC, carrying, movement, determination, rd, kaguneInvestmentPE, rawKaguneDurability, durabilityMultiplier, kaguneDurability, normalRegeneration, superiorRegeneration, regenerationSkill, regeneration, blockTest, dodgeTest, purchasedCap, issues, quimeraCost, quimeraTypeCount, frameBudget };

}


/** Kakuja includes the manifested Kagune; its bonuses never flow back into that base weapon. */
export function calculateCharacter(sheet: CharacterSheet, context: {quinque?:boolean} = {}) {
  const base = calculateCharacterCore(sheet, context);
  if (!base.kakujaManifested || (sheet.kaguneActive && sheet.weaponKind === "kagune")) return base;
  const inherited = calculateCharacterCore({ ...sheet, weaponKind: "kagune", kaguneActive: true }, context);
  const biology = inherited.kakujaBiology;
  const originalWounds = penalties(sheet.vats);
  const wounds = { ...originalWounds, physical:kakujaWoundPenalty(originalWounds.physical,biology), agility:kakujaWoundPenalty(originalWounds.agility,biology), dodge:kakujaWoundPenalty(originalWounds.dodge,biology) };
  const regenerationSkill = kakujaRegeneration(Math.floor(Math.max(0, Math.max(base.normalRegeneration,base.superiorRegeneration) + base.customSkillBonuses.regeneration + inherited.kakujaBonuses.regeneration)),base.maxLife,biology);
  const regeneration = passiveRegeneration(sheet.vats,{regeneration:regenerationSkill,maxLife:base.maxLife,grade:sheet.grade,cells:Boolean(sheet.perks["celulas-ageis"]),kami:Boolean(sheet.perks["vivo-kami"])}).amount;
  const movementLocked = Boolean(sheet.tactical?.stance && sheet.tactical.stance.until > sheet.vats.turn);
  const movement = movementLocked ? 0 : Math.floor(wounds.movement * Math.max(0,(sheet.perks.velocista ? 2 : 1) + base.customSkillBonuses.movement + base.mastery.movement + base.reworkBonuses.movement + biology.movement));
  return {
    ...base,
    wounds,
    regenerationSkill,
    regeneration,
    movement,
    kakujaBonuses: inherited.kakujaBonuses,
    kakujaBiology: inherited.kakujaBiology,
    kakujaDefenseDice: inherited.kakujaDefenseDice,
    kakujaBlockTest: inherited.kakujaBlockTest,
    kakujaDodgeTest: inherited.kakujaDodgeTest,
    kakujaExtraAttacks: inherited.kakujaExtraAttacks,
    kakujaKaguneTest: inherited.kakujaKaguneTest,
    kakujaKaguneSteps: inherited.kakujaKaguneSteps,
    kakujaKaguneDamageModifier: inherited.kakujaKaguneDamageModifier,
    kakujaKaguneRD: inherited.kakujaKaguneRD,
    kakujaKaguneDurability: inherited.kakujaKaguneDurability,
    kakujaKaguneRange: inherited.kakujaKaguneRange,
    kakujaKagunePenetration: inherited.kakujaKagunePenetration,
    kakujaMovement: inherited.kakujaMovement,
    kakujaAttributes: inherited.kakujaAttributes,
  };
}

export const damageConditionsForSheet = (sheet: CharacterSheet, scope: "physical" | "kagune") => {
    const options: { id: string; label: string; detail: string }[] = [];
    const add = (available: boolean, id: string, label: string, detail: string) => { if (available) options.push({ id, label, detail }); };
    add(sheet.archetype === "O Justiceiro", "justiceiro", "Alvo do Justiceiro", "+2 Passos");
    add(sheet.archetype === "O Hedonista", "hedonista", "Prazer do Hedonista", "+3 Passos");
    add(Boolean(sheet.perks["golpe-preciso"]), "golpe-preciso", "Golpe Preciso", "+1 Passo por acerto convertido");
    add(Boolean(sheet.perks["equacao-letal"]), "equacao-letal", "Equação Letal", "+2 Passos por acerto convertido");
    add(Boolean(sheet.perks["quebra-portas"]), "quebra-portas", "Contra estrutura", "+2 Passos");
    if (scope === "physical") add(Boolean(sheet.perks.skadoosh), "skadoosh", "Skadoosh", "+40 Passos de Dano · um golpe por sessão");
    add(Boolean(sheet.perks["respiracao-contida"]), "respiracao-contida", "Respiração Contida", "+2 Passos à distância");
    add(Boolean(sheet.perks["disparo-reflexivo"]), "disparo-reflexivo", "Disparo Reflexivo", "−2 Passos");
    add(Boolean(sheet.perks["golpe-direcionado"]), "golpe-direcionado", "Golpe Direcionado", "+2 Passos");
    add(Boolean(sheet.perks["olho-cacador"]), "olho-cacador", "Olho do Caçador", "+2 Passos");
    add(Boolean(sheet.perks["disparo-alma"]), "disparo-alma", "Disparo da Alma", "+5 Passos");
    add(Boolean(sheet.perks["entre-costelas"]), "entre-costelas", "Entre as Costelas", "−2 Passos; +1 acerto de acerto");
    add(Boolean(sheet.perks.momentum), "momentum", "Momentum", "+2 Passos corpo a corpo");
    add(Boolean(sheet.perks["corpo-lamina"]), "corpo-lamina", "Corpo de Lâmina", "+3 Passos");
    add(Boolean(sheet.perks.adaptabilidade), "adaptabilidade", "Adaptabilidade concluída", "+metade do Raciocínio em Passos");
    add(Boolean(sheet.perks.fortificador), "fortificador", "Fortificador", "+2 Passos");
    add(Boolean(sheet.perks["foco-letal"]), "foco-letal", "Foco Letal", "Converte 1 Passo em +2 Passos");
    add(Boolean(sheet.perks["impacto-cinetico"]), "impacto-cinetico", "Impacto Cinético", "+2 Passos após mover");
    add(Boolean(sheet.perks["corpo-cerco"]), "corpo-cerco", "Corpo de Cerco", "+3 Passos após Bloqueio total");
    add(Boolean(sheet.perks["cacador-aberturas"]), "cacador-aberturas", "Caçador de Aberturas", "+2 Passos após erro inimigo");
    add(Boolean(sheet.perks.oportunista), "oportunista", "Oportunista", "+2 Passos em ataque de oportunidade");
    add(Boolean(sheet.perks["guarda-agressiva"]), "guarda-agressiva", "Guarda Agressiva", "+2 Passos após Bloqueio total");
    add(Boolean(sheet.perks["ritmo-combate"]), "ritmo-combate", "Ritmo de Combate", "+1 Passo de Dano");
    add(Boolean(sheet.perks.carrasco), "carrasco", "Carrasco", "+2 Passos contra alvo com 1/4 da Vida");
    add(Boolean(sheet.perks["ultimo-homem-pe"]), "ultimo-homem-pe", "Último Homem de Pé", "+2 Passos de Dano");
    if (scope === "physical") add(Boolean(sheet.perks["lenda-dragao"]), "lenda-dragao", "Lenda do Dragão", "+15 Passos · um ataque físico direto por turno");
    if (scope === "kagune") {
      add(Boolean(sheet.effects["mudanca-forma"]), "mudanca-forma", "Mudança de Forma ofensiva", "+1 Passo a cada 2 níveis");
      add(Boolean(sheet.effects.cristalizacao), "cristalizacao", "Cristalização", "+Passos conforme o nível");
      add(Boolean(sheet.effects["criar-arma"]), "criar-arma", "Arma criada", "+1 Passo por nível");
      add(Boolean(sheet.effects["adicionar-elemento"]), "adicionar-elemento", "Elemento ativo", "+3/+6 no dano");
      add(Boolean(sheet.effects["tiros-explosivos"]), "tiros-explosivos", "Tiros Explosivos", "+1/+2 Passos");
      add(Boolean(sheet.effects["lamina-cauda-viva"]), "lamina-cauda-viva", "Lâmina de Cauda Viva", "+2 Passos após errar");
      add(Boolean(sheet.effects["estouro-rc"]), "estouro-rc", "Estouro de RC", "+3 Passos de Dano");
      add(Boolean(sheet.effects["estouro-rc"]), "estouro-rc-penalidade", "Após Estouro de RC", "−1 Passo de Dano");
      add(sheet.selectedEvolutions.includes("perda-peso"), "perda-peso", "Perda de Peso", "+2 Passos");
      add(sheet.selectedEvolutions.includes("mestre-armas"), "mestre-armas", "Mestre das Armas ofensivo", "+2 Passos");
      add(sheet.selectedEvolutions.includes("multiplas-caudas-plus"), "multiplas-caudas-plus", "Múltiplas Caudas +", "+1/+1/+2 Passos conforme compras");
      add(sheet.selectedEvolutions.includes("ferreiro-guerra"), "ferreiro-guerra", "Ferreiro da Guerra corpo a corpo", "+metade de Força/Agilidade em Passos");
      add(sheet.selectedEvolutions.includes("lanca-ceus"), "lanca-ceus", "Lança que Devora Céus", "+10 Passos");
      
      add(sheet.selectedEvolutions.includes("predador-perfeito"), "predador-perfeito", "Predador Perfeito — Ataque", "+2 Passos");
      add(sheet.selectedEvolutions.includes("chuva-carmesim"), "chuva-carmesim", "Chuva Carmesim", "+4 Passos");
      add(sheet.selectedEvolutions.includes("chuva-carmesim"), "chuva-carmesim-penalidade", "Após Chuva Carmesim", "−2 Passos");
      add(sheet.selectedEvolutions.includes("predador-ceus"), "predador-ceus", "Predador dos Céus", "+Passos acumulados");
      add(sheet.selectedEvolutions.includes("arsenal-vivo"), "arsenal-vivo", "Arsenal Vivo — Martelo", "+5 Passos de Dano");
      add(sheet.selectedEvolutions.includes("continua-crescendo"), "continua-crescendo", "Aquilo que Continua Crescendo", "+2 Passos por Crescimento");
      add(sheet.selectedEvolutions.includes("mestre-nada"), "mestre-nada", "Mestre de Nada — Ataque", "+4 Passos");
      add(sheet.selectedEvolutions.includes("mil-penas"), "mil-penas", "Mil Penas", "+2 Passos por ataque sacrificado");
      add(sheet.selectedEvolutions.includes("lanca-deus"), "lanca-deus", "Lança que Perfurou Deus", "+15 Passos");
      add(sheet.selectedEvolutions.includes("centopeia"), "centopeia", "Centopeia", "+4 Passos");
      add(Boolean(sheet.perks["wally-like"]), "wally-like", "Wally Like", "+metades de Agilidade e Precisão em Passos");
      add(Boolean(sheet.perks.ceifador), "ceifador", "Ceifador furtivo/oportunidade", "+8 Passos");
      add(Boolean(sheet.perks["cristais-tungstenio"]), "cristais-tungstenio", "Cristais de Tungstênio", "+2 Passos");
      add(Boolean(sheet.perks["railgun-rc"]), "railgun-rc", "Railgun de RC", "+7 Passos");
      add(Boolean(sheet.perks["ultimo-horizonte"]), "ultimo-horizonte", "Último Horizonte", "+12 Passos");
      add(Boolean(sheet.perks["hidra-cristalina"]), "hidra-cristalina", "Hidra Cristalina", "+3 Passos");
      add(Boolean(sheet.perks["muda-penas"]), "muda-penas", "Muda de Penas", "+2 Passos");
      add(Boolean(sheet.perks["predador-angulo-morto"]), "predador-angulo-morto", "Predador de Ângulo Morto", "+2 Passos");
      add(Boolean(sheet.perks["mergulho-escarlate"]), "mergulho-escarlate", "Mergulho Escarlate", "+4 Passos");
      add(Boolean(sheet.perks["tentaculo-blindado"]), "tentaculo-blindado", "Tentáculo Blindado", "+2 Passos");
      add(Boolean(sheet.perks["carne-mineral"]), "carne-mineral", "Carne Mineral", "+3 RD");
      add(Boolean(sheet.perks["leviata-imortal"]), "leviata-imortal", "Leviatã Imortal", "+3 Passos e +5 RD");
      add(Boolean(sheet.perks["postura-dupla"]), "postura-dupla-ataque", "Postura Dupla — Duelo", "+2 Passos");
      add(Boolean(sheet.perks["postura-dupla"]), "postura-dupla-defesa", "Postura Dupla — Guarda", "+2 RD");
      add(Boolean(sheet.perks["lanca-escorpionica"]), "lanca-escorpionica", "Lança Escorpiônica", "+2 Passos em oportunidade");
      add(Boolean(sheet.perks["arsenal-carrasco"]), "arsenal-carrasco-ataque", "Arsenal — Machado", "+4 Passos");
      add(Boolean(sheet.perks["arsenal-carrasco"]), "arsenal-carrasco-defesa", "Arsenal — Escudo-Cauda", "+3 RD");
      add(Boolean(sheet.perks["cavaleiro-escarlate"]), "cavaleiro-escarlate-ataque", "Cavaleiro — Oportunidade", "+5 Passos");
      add(Boolean(sheet.perks["cavaleiro-escarlate"]), "cavaleiro-escarlate-defesa", "Cavaleiro — Defesa", "+4 RD");
      add(Boolean(sheet.perks["danca-serpentes"]), "danca-serpentes", "Dança das Serpentes", "+2 Passos");
      add(Boolean(sheet.perks["guarda-hidra"]), "guarda-hidra", "Guarda de Hidra", "+2 RD");
      add(Boolean(sheet.perks["predador-reacao"]), "predador-reacao", "Predador de Reação", "+3 Passos");
      add(Boolean(sheet.perks.orochi), "orochi", "Orochi", "+3 Passos");
      add(Boolean(sheet.perks["serafim-ferro-sangue"]), "serafim-ferro-sangue", "Serafim — Tentáculos", "+3 Passos");
      add(Boolean(sheet.perks["serafim-ferro-sangue"]), "serafim-ferro-sangue-defesa", "Serafim — Armadura", "+3 RD");
      add(Boolean(sheet.perks["motor-cerco-celeste"]), "motor-cerco-celeste", "Motor de Cerco — ataque", "+2 Passos");
      add(Boolean(sheet.perks["motor-cerco-celeste"]), "motor-cerco-celeste-defesa", "Motor de Cerco — defesa", "+2 RD");
      add(Boolean(sheet.perks["leviata-carne"]), "leviata-carne-ataque", "Leviatã de Carne — ataque", "+2 Passos");
      add(Boolean(sheet.perks["leviata-carne"]), "leviata-carne-defesa", "Leviatã de Carne — defesa", "+2 RD");
      add(Boolean(sheet.perks["trindade-predatoria"]), "trindade-predatoria-ataque", "Trindade — Rinkaku", "+2 Passos");
      add(Boolean(sheet.perks["trindade-predatoria"]), "trindade-predatoria-defesa", "Trindade — Koukaku", "+3 RD");
      add(Boolean(sheet.perks["quimera-absoluta"]), "quimera-absoluta", "Quimera Absoluta", "+4 Passos e +4 RD");
    }
    return options;
  };

