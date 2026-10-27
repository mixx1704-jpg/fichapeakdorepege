import type { AttributeKey, Perk } from "./data";
import { formatDamage, damageStatistics } from "./damage-dice";

export const CRITICAL_RANGE_ID = "r26-critico-faixa";
export const CRITICAL_RANGE_COSTS = [30, 40, 50, 60] as const;
export type CriticalSelections = Record<string, { rank: number }>;
export interface CriticalContext {
  level: number;
  attributes: Partial<Record<AttributeKey, number>>;
}

interface CriticalDefinition {
  perk: Perk;
  stepsPercent?: number;
  penetrationPercent?: number;
  minimumPercent?:number;
  flat?: (context: CriticalContext, baseSteps: number) => number;
}

const integer = (value: unknown, fallback = 0, min = 0, max = 1_000_000_000) => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
};
const rank = (perks: CriticalSelections | null | undefined, id: string) => integer(perks?.[id]?.rank);
const attribute = (context: CriticalContext, key: AttributeKey) => integer(context.attributes?.[key]);
const defaultContext: CriticalContext = { level: 1, attributes: {} };

const rangePerk: Perk = {
  id: CRITICAL_RANGE_ID, name: "Faixa de Crítico", category: "Combate", cost: [...CRITICAL_RANGE_COSTS], costMode: "sum", maxRank: 4, minGrade: 1,
  sourceId: "REWORK 2026", supplement: true, equipmentCompatible: true, useType: "Passiva · crítico natural",
  requirement: "LEVEL 1+ · até 4 compras cumulativas",
  description: "Cada compra amplia o crítico natural do d20 em 1: 19–20, 18–20, 17–20 e 16–20. Custos das compras: 30, 40, 50 e 60 PE; totais investidos: 30, 70, 120 e 180 PE. Modificadores de acerto nunca geram crítico. Nos testes de d10/d30, apenas o máximo natural é crítico. O crítico confirmado acrescenta 50% dos Passos de Dano, arredondados para baixo, antes de rolar o dano; não multiplica dano fixo.",
};

const definitions: CriticalDefinition[] = [];
function add(id: string, name: string, level: number, cost: number, description: string, effects: Omit<CriticalDefinition, "perk">, options: Partial<Perk> = {}) {
  definitions.push({ ...effects, perk: {
    id: `r26-critico-${id}`, name, category: "Combate", minGrade: level, cost, maxRank: 1, sourceId: "REWORK 2026", supplement: true,
    equipmentCompatible: true, useType: "Passiva · crítico confirmado",
    requirement: `LEVEL ${level}+`,
    description: `${description} Só no ataque com crítico natural confirmado. Percentuais de Passos usam a maior fonte, sem somar; todos usam os Passos anteriores ao crítico. A maior penetração disponível é aplicada uma vez e limitada a 50%. Frações são arredondadas para baixo.`, ...options,
  } });
}

add("impacto-ampliado", "Impacto Ampliado", 4, 12, "O bônus do crítico sobe de +50% para +100% dos Passos de Dano.", { stepsPercent: 100 });
add("ruptura-certeira", "Ruptura Certeira", 7, 18, "O crítico ignora 10% da RD do alvo.", { penetrationPercent: 10 });
add("ponto-fraco", "Ponto Fraco", 12, 28, "O crítico ignora 20% da RD do alvo.", { penetrationPercent: 20 });
add("impacto-profundo", "Impacto Profundo", 14, 35, "O bônus do crítico sobe para +150% dos Passos de Dano.", { stepsPercent: 150 });
add("trauma", "Trauma Acumulado", 9, 20, "Adicione o seu LEVEL ao dano fixo do crítico.", { flat: context => integer(context.level, 1, 1, 20) });
add("massa-impacto", "Massa no Impacto", 16, 40, "Adicione ao dano fixo do crítico metade dos Passos de Dano anteriores ao crítico.", { flat: (_context, steps) => Math.floor(steps / 2) });
add("aniquilacao", "Aniquilação", 20, 320, "Explosão: o crítico acrescenta +200% dos Passos de Dano e +20 de dano fixo.", { stepsPercent: 200, flat: () => 20 }, { category: "Força", attribute: "forca", min: 15, requirement: "LEVEL 20 · Força 15 · exclusiva do LEVEL 20" });
add("incisao-absoluta", "Incisão Absoluta", 20, 280, "Antiblindagem: o crítico ignora 50% da RD do alvo e acrescenta duas vezes a sua Precisão ao dano fixo.", { penetrationPercent: 50, flat: context => attribute(context, "precisao") * 2 }, { category: "Precisão", attribute: "precisao", min: 15, requirement: "LEVEL 20 · Precisão 15 · exclusiva do LEVEL 20" });
add("colapso-controlado", "Colapso Controlado", 20, 300, "Consistência: após rolar o dano crítico, ele tem piso bruto igual ao maior entre 4 × Controle e 75% do máximo dos dados + dano fixo. A RD é descontada depois. O piso é aplicado uma vez no ataque unido; não acrescenta outro percentual de Passos.", { minimumPercent:75 }, { category: "Controle", attribute: "controle", min: 15, requirement: "LEVEL 20 · Controle 15 · exclusiva do LEVEL 20" });

export const criticalPerks: Perk[] = [rangePerk, ...definitions.map(definition => definition.perk)];

export function criticalRange(perks: CriticalSelections | null | undefined = {}, die = 20) {
  const maximum = [10, 20, 30].includes(die) ? die : 20;
  const rangeRank = Math.min(4, rank(perks, CRITICAL_RANGE_ID));
  const minimum = maximum === 20 ? 20 - rangeRank : maximum;
  const outcomes = maximum - minimum + 1;
  return { minimum, maximum, rank: rangeRank, outcomes, probability: outcomes / maximum, chancePercent: Math.floor(outcomes * 100 / maximum), label: minimum === maximum ? `${maximum} natural` : `${minimum}–${maximum} naturais` };
}

export function criticalRangeCost(perks: CriticalSelections | null | undefined = {}): number {
  return CRITICAL_RANGE_COSTS.slice(0, Math.min(4, rank(perks, CRITICAL_RANGE_ID))).reduce<number>((sum, cost) => sum + cost, 0);
}

function eligible(perk: Perk, perks: CriticalSelections, context: CriticalContext): boolean {
  if (!rank(perks, perk.id) || integer(context.level, 1, 1, 20) < (perk.minGrade ?? 1)) return false;
  if (perk.attribute && attribute(context, perk.attribute) < (perk.min ?? 0)) return false;
  return Object.entries(perk.requirements ?? {}).every(([key, minimum]) => attribute(context, key as AttributeKey) >= Number(minimum));
}

export function criticalBonuses(perks: CriticalSelections = {}, context: CriticalContext = defaultContext, baseSteps = 0) {
  const steps = integer(baseSteps);
  const active = definitions.filter(definition => eligible(definition.perk, perks, context));
  return {
    rangeRank: criticalRange(perks).rank,
    minimum: criticalRange(perks).minimum,
    stepsPercent: Math.max(50, ...active.map(definition => definition.stepsPercent ?? 0)),
    flatBonus: active.reduce((sum, definition) => sum + integer(definition.flat?.(context, steps)), 0),
    penetrationPercent: Math.min(50, Math.max(0, ...active.map(definition => definition.penetrationPercent ?? 0))),
    minimumPercent:Math.max(0,...active.map(definition=>definition.minimumPercent||0)),
    minimumFlat:active.some(definition=>definition.minimumPercent)?attribute(context,'controle')*4:0,
    activePerks: [...(rank(perks, CRITICAL_RANGE_ID) ? [CRITICAL_RANGE_ID] : []), ...active.map(definition => definition.perk.id)],
  };
}

export function resolveCritical(natural: number, die = 20, perks: CriticalSelections = {}, context: CriticalContext = defaultContext) {
  const range = criticalRange(perks, die);
  const valid = Number.isInteger(natural) && natural >= 1 && natural <= range.maximum;
  return { ...range, natural: valid ? natural : null, isCritical: valid && natural >= range.minimum, bonuses: criticalBonuses(perks, context) };
}

export const criticalDamageFormula = formatDamage;

export interface CriticalAttackInput {
  steps: number;
  flat: number;
  rd?: number;
  confirmed: boolean;
  perks?: CriticalSelections;
  context?: CriticalContext;
  die?: number;
  natural?: number;
}

export function criticalAttack(input: CriticalAttackInput) {
  const perks = input.perks ?? {}, context = input.context ?? defaultContext;
  const baseSteps = integer(input.steps), baseFlat = integer(input.flat, 0, -1_000_000_000), rd = integer(input.rd);
  const natural = input.natural === undefined ? null : resolveCritical(input.natural, input.die ?? 20, perks, context);
  const critical = Boolean(input.confirmed) && (natural === null || natural.isCritical);
  const bonuses = criticalBonuses(perks, context, baseSteps);
  const stepsPercent = critical ? bonuses.stepsPercent : 0;
  const bonusSteps = Math.floor(baseSteps * stepsPercent / 100);
  const flatBonus = critical ? bonuses.flatBonus : 0;
  const penetrationPercent = critical ? bonuses.penetrationPercent : 0;
  const ignoredRD = Math.floor(rd * penetrationPercent / 100);
  const steps = baseSteps + bonusSteps, flat = baseFlat + flatBonus;
  const formula=criticalDamageFormula(steps,flat),minimumPercent=critical?bonuses.minimumPercent:0,minimumFlat=critical?bonuses.minimumFlat:0;
  const minimumRawDamage=minimumPercent?Math.max(minimumFlat,Math.floor(damageStatistics(formula).diceMaximum*minimumPercent/100)+flat):0;
  return { critical, baseSteps, bonusSteps, steps, baseFlat, flatBonus, flat, stepsPercent, penetrationPercent, ignoredRD, remainingRD: rd - ignoredRD, formula, minimumPercent,minimumFlat,minimumRawDamage, activePerks: bonuses.activePerks };
}
