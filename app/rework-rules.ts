/** Rules revision is saved per character so imports and automatic upgrades run once. */
export const RULES_VERSION = 8;
export const MAX_LEVEL = 20;
export const PURCHASED_ATTRIBUTE_CAP = 11;

// 17 → 18 costs 120 PE and Quinx gain 2 life per level, as confirmed by the table.
export const levelProgression = [5, 5, 5, 10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 80, 90, 100, 120, 150, 500]
  .map((requiredPE, index) => ({ from: index + 1, to: index + 2, requiredPE }));

export const normalizeLevel = (value: unknown, fallback = 1) =>
  Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(value) || fallback)));

export const levelRequirementFor = (level: number) =>
  levelProgression.find((step) => step.from === level)?.requiredPE || 0;

export const cumulativeLevelPE = (level: number) =>
  levelProgression.filter((step) => step.to <= level).reduce((total, step) => total + step.requiredPE, 0);

/** The pre-rework curve, used only to keep the exact PE balance of old sheets. */
export const previousCumulativePE = (grade: number) =>
  [10, 20, 30, 40, 50, 60].reduce((total, pe, index) => total + (grade >= 4 + index * 2 ? pe : 0), 0);

export const isMentalityGhoul = (species: string) =>
  ["ghoul", "ghoul-artificial", "ghoul-dominante"].includes(species);

export function mentalityDie(species: string, currentSanity: number, maxSanity: number): 10 | 20 | 30 {
  if (!isMentalityGhoul(species) || maxSanity <= 0) return 20;
  const ratio = Math.floor(currentSanity) / Math.max(1, Math.floor(maxSanity));
  return ratio > 0.75 ? 30 : ratio < 0.45 ? 10 : 20;
}

export function maximumLife(species: string, level: number, vigor: number, strength: number, bonus = 0) {
  const perLevel: Record<string, number> = { humano: 1, ghoul: 2, "humano-dominante": 3, "ghoul-dominante": 4, "ghoul-artificial": 4, quinx: 2 };
  // Round the final total down; keep the multiplier exact until the calculation is complete.
  return Math.max(1, Math.floor((25 + vigor * 3 + strength * 2 + level * (perLevel[species] || 1) + bonus) * (1.05 ** level)));
}

export function maximumSanity(level: number, control: number, bonus = 0, fragile = false) {
  const total = 10 + level + control + bonus;
  return Math.max(1, Math.floor(fragile ? total / 2 : total));
}

export function formatAccuracy(pool: number, modifier = 0, sides = 20) {
  pool = Math.floor(pool);
  modifier = Math.floor(modifier);
  const additive = (value: number) => value >= 0 ? `+${value}` : `${value}`;
  return `1d${sides}${additive(pool)}${modifier ? additive(modifier) : ""}`;
}

/** Convert old success-pool commands while preserving each additive modifier. */
export function convertLegacyTest(expression: string, sides = 20) {
  return expression.replace(/(\d+)d8(?:!8)?(?:\+\+([+-]?\d+))?(?:>>(\d+))?/gi,
    (_whole, pool: string, bonus?: string) => formatAccuracy(Number(pool), Number(bonus || 0), sides));
}

/** IDs and damage dice remain stable; only rules presented to players are renamed. */
export function reworkText(text: string) {
  return text
    // Pool-based rerolls now refer to the single test die, retaining their allowance.
    .replace(/rerrole até três dados falhos de Furtividade/gi, "rerrole o único dado do teste de Furtividade até três vezes")
    .replace(/rerrole até dois dados do teste de Sanidade correspondente/gi, "rerrole o único dado do teste de Sanidade correspondente até duas vezes")
    .replace(/rerrolar dois dados falhos de Controle/gi, "rerrolar o único dado do teste de Controle até duas vezes")
    .replace(/rerrole até dois dados falhos no teste para percebê-la/gi, "rerrole o único dado do teste para percebê-la até duas vezes")
    .replace(/rerrole até três dados num reparo complexo/gi, "rerrole o único dado do teste de reparo complexo até três vezes")
    .replace(/rerrola dois dados(?: de acerto)? falhos/gi, "rerrola o único dado do teste até duas vezes")
    .replace(/\b(rerrole|rerrolar|rerrola)\s+(?:um|1) dado(?!\s+de dano)(?: de acerto)?(?: falho| que falhou)?(?:\s+(?:do|no) teste)?\b/gi, "$1 o único dado do teste")
    .replace(/converta dados de acerto em \+1 Passo de Dano por dado/gi, "converta acertos aditivos em +1 Passo de Dano por acerto convertido")
    .replace(/um dado de Agilidade conta como acerto garantido/gi, "some +1 acerto aditivo ao teste de Agilidade")
    .replace(/\bGRAUS?\b/g, "LEVEL")
    .replace(/\bGraus?\b/g, "Level")
    .replace(/\bgraus?\b/g, "level")
    .replace(/([+-]?\d+)\s+dado(s)?\s+de\s+acerto/gi, (_all, count: string) => `${count} acerto${Number(count) === 1 ? "" : "s"}`)
    .replace(/([+-]?\d+)\s+dado(s)?\b(?!\s+d[eoa]\s+dano)/gi, (_all, count: string) => `${count} acerto${Math.abs(Number(count)) === 1 ? "" : "s"}`)
    .replace(/dados extras/gi, "acertos extras")
    .replace(/dado extra/gi, "acerto extra")
    .replace(/um dado de acerto adicional/gi, "1 acerto aditivo adicional")
    .replace(/dados adicionais/gi, "acertos adicionais")
    .replace(/bônus de dados/gi, "bônus de acertos aditivos")
    .replace(/bônus em dados/gi, "bônus em acertos aditivos")
    .replace(/sacrifício de dados/gi, "sacrifício de acertos aditivos")
    .replace(/conceda dados\b/gi, "conceda acertos aditivos")
    .replace(/\bem dados\b/gi, "em acertos aditivos");
}
