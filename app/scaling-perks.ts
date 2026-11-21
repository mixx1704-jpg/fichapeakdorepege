import { perkCatalog, catalogGroup } from './perk-catalog';
import type { AttributeKey, KaguneFamily, Perk, SpeciesId } from "./data";
import { endgameProperties } from './endgame-properties';
import { perkKaguneRequirementsMet } from './bikaku-access';

/** Each percentage uses the same unmodified subtotal, once; bonuses never compound. */
export const SCALING_PERCENT_CAP = 75;
export const PENETRATION_PERCENT_CAP = Number.POSITIVE_INFINITY;
export const scalingStats = ["life", "sanity", "rc", "rd", "physicalHit", "kaguneHit", "block", "dodge", "physicalSteps", "kaguneSteps", "physicalDamage", "kaguneDamage"] as const;
export type ScalingStat = typeof scalingStats[number];
export type ScalingBase = Partial<Record<ScalingStat, number>>;
export type ScalingValues = Record<ScalingStat, number>;
export interface ScalingContext {
  perks: Record<string, { rank: number }>;
  attributes: Record<AttributeKey, number>;
  weaponActive: boolean;
  level?: number;
  species?: SpeciesId;
  kaguneTypes?: KaguneFamily[];
  primaryKaguneType?: KaguneFamily;
  weaponKind?: "kagune" | "quinque" | "arata" | "none" | string;
  quinque?: boolean;
  hasRC?: boolean;
}
interface ScalingDefinition {
  perk: Perk;
  percentages?: ScalingBase;
  penetrationPercent?: number;
  weaponOnly?: boolean;
}
const definitions: ScalingDefinition[] = perkCatalog.perks.flatMap(perk => perk.automation?.scaling ? [{perk, ...perk.automation.scaling} as ScalingDefinition] : []);
export const poisonPerks: Perk[] = catalogGroup('poison');
export const colossusPerk: Perk = perkCatalog.perks.find(p=>p.id==='r26-colosso-carne')!;
export const scalingPerks: Perk[] = catalogGroup('scaling');

function isEligible(definition: ScalingDefinition, context: ScalingContext): boolean {
  const { perk, weaponOnly } = definition;
  if (Math.floor(context.perks[perk.id]?.rank || 0) <= 0) return false;
  if ((context.level ?? 1) < (perk.minGrade ?? 1)) return false;
  if (weaponOnly && !context.weaponActive) return false;
  if (weaponOnly && context.weaponKind !== undefined && !["kagune", "quinque"].includes(context.weaponKind)) return false;
  if (context.quinque && !perk.equipmentCompatible) return false;
  if (perk.requiredWeapon && perk.requiredWeapon !== context.weaponKind) return false;
  if (perk.requiresRC && context.hasRC === false) return false;
  if (perk.species && (!context.species || !perk.species.includes(context.species))) return false;
  if (!perkKaguneRequirementsMet(perk, context)) return false;
  if (perk.attribute && (context.attributes[perk.attribute] || 0) < (perk.min || 0)) return false;
  if (Object.entries(perk.requirements || {}).some(([attribute, min]) => (context.attributes[attribute as AttributeKey] || 0) < Number(min))) return false;
  if (perk.requiredPerk) {
    const prerequisite = [...definitions.map(({ perk: item }) => item), ...poisonPerks].find(item => item.id === perk.requiredPerk);
    if (!prerequisite || prerequisite.requiredPerk || Math.floor(context.perks[prerequisite.id]?.rank || 0) <= 0) return false;
    if (!isEligible({ perk: prerequisite, weaponOnly: prerequisite.location === "kakuhou" }, context)) return false;
  }
  return true;
}
/** Shared by the attack and poison calculators so dormant/underlevel purchases stay inactive. */
export function isScalingPerkActive(id: string, context: ScalingContext): boolean {
  const definition = definitions.find(({ perk }) => perk.id === id);
  if (definition) return isEligible(definition, context);
  const poison = poisonPerks.find(perk => perk.id === id);
  if (poison) return isEligible({ perk: poison, weaponOnly: true }, context);
  if (id === colossusPerk.id) return isEligible({ perk: colossusPerk, weaponOnly: true }, context);
  return false;
}
function emptyValues(): ScalingValues {
  return Object.fromEntries(scalingStats.map(stat => [stat, 0])) as ScalingValues;
}
function nonnegativeInteger(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
}
export function scalingIncrease(stat: ScalingStat, subtotal: number, percentages: ScalingBase): number {
  const percent = Math.min(SCALING_PERCENT_CAP, nonnegativeInteger(percentages[stat]));
  return Math.floor(nonnegativeInteger(subtotal) * percent / 100);
}
export function calculateScalingBonuses(context: ScalingContext, base: ScalingBase) {
  const percentages = emptyValues();
  const bonuses = emptyValues();
  const totals = emptyValues();
  const activePerkIds: string[] = [];
  let penetrationPercent = 0;
  for (const definition of definitions) {
    if (!isEligible(definition, context)) continue;
    activePerkIds.push(definition.perk.id);
    for (const [stat, percent] of Object.entries(definition.percentages || {})) {
      const key = stat as ScalingStat;
      percentages[key] = Math.min(SCALING_PERCENT_CAP, percentages[key] + nonnegativeInteger(percent));
    }
    penetrationPercent += Math.max(0, definition.penetrationPercent || 0);
  }
  for(const [id,property] of Object.entries(endgameProperties)){
    if((context.level||1)<20||Math.floor(context.perks[id]?.rank||0)<=0)continue;
    // Body resources cannot be inherited by independent weapons.
    if(context.quinque && id!=='r26-exp-geral-coroa-da-devastacao')continue;
    activePerkIds.push(id);
    for(const [stat,percent] of Object.entries(property.percentages)){
      const key=stat as ScalingStat;
      percentages[key]=Math.min(SCALING_PERCENT_CAP,percentages[key]+nonnegativeInteger(percent));
    }
  }
  for (const stat of scalingStats) {
    const subtotal = nonnegativeInteger(base[stat]);
    bonuses[stat] = scalingIncrease(stat, subtotal, percentages);
    totals[stat] = subtotal + bonuses[stat];
  }
  return { bonuses, percentages, totals, penetrationPercent, activePerkIds };
}
export function calculatePenetration(context: ScalingContext): number {
  return calculateScalingBonuses(context, {}).penetrationPercent;
}
/** RD is removed once from the original target value, never from an already reduced value. */
export function applyPartialPenetration(rawDamage: number, targetRD: number, penetrationPercent: number) {
  const damage = nonnegativeInteger(rawDamage);
  const rd = nonnegativeInteger(targetRD);
  const percentage = Math.min(PENETRATION_PERCENT_CAP, nonnegativeInteger(penetrationPercent));
  const ignoredRD = Math.floor(rd * Math.min(100, percentage) / 100);
  const remainingRD = rd - ignoredRD;
  return { rawDamage: damage, targetRD: rd, penetrationPercent: percentage, excessStepsPercent: Math.max(0,percentage-100), ignoredRD, remainingRD, damage: Math.max(0, damage - remainingRD) };
}
