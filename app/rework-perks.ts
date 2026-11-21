import { perkCatalog, catalogGroup } from './perk-catalog';
import type { AttributeKey, CatalogCategory, KaguneFamily, Perk, SpeciesId } from "./data";
import { normalizePerkPurchases } from "./perk-migrations";
import { perkKaguneRequirementsMet } from './bikaku-access';

/** Numeric effects are the source of truth for both the card and the calculation. */
export interface ReworkBonuses {
  physicalHit: number;
  kaguneHit: number;
  block: number;
  dodge: number;
  physicalSteps: number;
  kaguneSteps: number;
  physicalDamage: number;
  kaguneDamage: number;
  rd: number;
  weaponRD: number;
  life: number;
  sanity: number;
  rc: number;
  movement: number;
  initiative: number;
  range: number;
  attributeChecks: Record<AttributeKey, number>;
}

type BonusKey = Exclude<keyof ReworkBonuses, "attributeChecks">;
type Scale = { attribute: AttributeKey; divisor?: number; multiplier?: number; minimum?:number };
type BonusValue = number | Scale;
type Modifiers = Partial<Record<BonusKey, BonusValue>> & { checks?: Partial<Record<AttributeKey, number>> };
type Definition = { perk: Perk; modifiers: Modifiers; weaponOnly: boolean };
const definitions: Definition[] = perkCatalog.perks.flatMap(perk => perk.automation?.rework ? [{perk, ...perk.automation.rework} as Definition] : []);
export const reworkPerks: Perk[] = catalogGroup('rework');
export const reworkPerkIds = new Set(reworkPerks.map(({ id }) => id));

export interface ReworkBonusContext {
  perks: Record<string, { rank: number }>;
  attributes: Record<AttributeKey, number>;
  weaponActive: boolean;
  level?: number;
  species?: SpeciesId;
  kaguneTypes?: KaguneFamily[];
  primaryKaguneType?: KaguneFamily;
  weaponKind?: string;
  quinque?: boolean;
}

export function calculateReworkBonuses(context: ReworkBonusContext): ReworkBonuses {
  context={...context,perks:normalizePerkPurchases(context.perks)};
  const result: ReworkBonuses = {
    physicalHit: 0, kaguneHit: 0, block: 0, dodge: 0, physicalSteps: 0, kaguneSteps: 0,
    physicalDamage: 0, kaguneDamage: 0, rd: 0, weaponRD: 0, life: 0, sanity: 0, rc: 0,
    movement: 0, initiative: 0, range: 0,
    attributeChecks: { forca: 0, vigor: 0, precisao: 0, agilidade: 0, raciocinio: 0, percepcao: 0, presenca: 0, controle: 0 },
  };
  for (const { perk, modifiers, weaponOnly } of definitions) {
    const rank = Math.max(0, Math.min(perk.maxRank || 1, Math.floor(context.perks[perk.id]?.rank || 0)));
    if (!rank || (weaponOnly && !context.weaponActive)) continue;
    if (context.level !== undefined && context.level < (perk.minGrade || 1)) continue;
    if (context.species && perk.species && !perk.species.includes(context.species)) continue;
    if (!perkKaguneRequirementsMet(perk, context)) continue;
    if (perk.attribute && (context.attributes[perk.attribute] || 0) < (perk.min || 0)) continue;
    for (const [key, value] of Object.entries(modifiers)) {
      if(key === 'weaponRD' && !context.weaponActive) continue;
      if (key === "checks") {
        for (const [attribute, amount] of Object.entries(value)) result.attributeChecks[attribute as AttributeKey] += amount * rank;
      } else {
        const amount = typeof value === "number" ? value : Math.max((value as Scale).minimum||0,Math.floor(Math.max(0, context.attributes[(value as Scale).attribute] || 0) * ((value as Scale).multiplier || 1) / ((value as Scale).divisor || 1)));
        result[key as BonusKey] += amount * rank;
      }
    }
  }
  return result;
}
