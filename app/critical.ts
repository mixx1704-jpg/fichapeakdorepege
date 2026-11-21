import { perkCatalog, catalogGroup } from './perk-catalog';
import type { AttributeKey, Perk } from "./data";
import { formatDamage, damageStatistics } from "./damage-dice";

export const CRITICAL_RANGE_ID = "r26-critico-faixa";
export const CRITICAL_RANGE_COSTS = perkCatalog.perks.find(p=>p.id===CRITICAL_RANGE_ID)!.cost as number[];
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

const flatEffects: Record<string, NonNullable<CriticalDefinition['flat']>> = {
  trauma: context => integer(context.level,1,1,20),
  'massa-impacto': (_context,steps) => Math.floor(steps/2),
  aniquilacao: () => 20,
  'incisao-absoluta': context => attribute(context,'precisao')*2,
};
const definitions: CriticalDefinition[] = perkCatalog.perks.flatMap(perk=>{
  const effects=perk.automation?.critical;
  return effects ? [{...effects,perk,flat:effects.flat?flatEffects[effects.flat]:undefined}] : [];
});
export const criticalPerks: Perk[] = catalogGroup('critical');

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
    penetrationPercent: active.reduce((sum,definition)=>sum+Math.max(0,definition.penetrationPercent||0),0),
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
  /** Shared unmultiplied reference for independent percentage modifiers. */
  referenceSteps?: number;
  extraStepsPercent?: number;
  unroundedSteps?: number;
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
  const referenceSteps = integer(input.referenceSteps ?? baseSteps);
  const extraStepsPercent = Math.max(0,Number(input.extraStepsPercent)||0);
  const rawSteps=Number.isFinite(input.unroundedSteps)?Math.max(0,input.unroundedSteps!):baseSteps;
  const bonusSteps = Math.floor(rawSteps+referenceSteps * (stepsPercent + extraStepsPercent) / 100+1e-10)-baseSteps;
  const flatBonus = critical ? bonuses.flatBonus : 0;
  const penetrationPercent = critical ? bonuses.penetrationPercent : 0;
  const ignoredRD = Math.floor(rd * Math.min(100,penetrationPercent) / 100);
  const steps = baseSteps + bonusSteps, flat = baseFlat + flatBonus;
  const formula=criticalDamageFormula(steps,flat),minimumPercent=critical?bonuses.minimumPercent:0,minimumFlat=critical?bonuses.minimumFlat:0;
  const minimumRawDamage=minimumPercent?Math.max(minimumFlat,Math.floor(damageStatistics(formula).diceMaximum*minimumPercent/100)+flat):0;
  return { critical, baseSteps, referenceSteps, extraStepsPercent, bonusSteps, steps, baseFlat, flatBonus, flat, stepsPercent, penetrationPercent, ignoredRD, remainingRD: rd - ignoredRD, formula, minimumPercent,minimumFlat,minimumRawDamage, activePerks: bonuses.activePerks };
}
