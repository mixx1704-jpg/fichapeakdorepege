import type { KaguneFamily, Perk } from './data';

export interface KagunePerkAccessContext {
  kaguneTypes?: KaguneFamily[];
  primaryKaguneType?: KaguneFamily;
  weaponKind?: string;
  quinque?: boolean;
}

const otherFamilies: KaguneFamily[] = ['Ukaku', 'Koukaku', 'Rinkaku'];

/** Borrowing one technique does not create another Kakuhou or a Chimera. */
export function perkKaguneFamilies(perk: Perk): KaguneFamily[] {
  const families = [...(perk.kaguneTypes || [])];
  if (otherFamilies.includes(perk.organGroup as KaguneFamily) || perk.organGroup === 'Bikaku') {
    families.push(perk.organGroup as KaguneFamily);
  }
  return [...new Set(families)];
}

export function isBikakuForeignPerk(perk: Perk, context: KagunePerkAccessContext): boolean {
  const original = context.kaguneTypes || [];
  const primary = context.primaryKaguneType || original[0];
  const required = perkKaguneFamilies(perk);
  return !context.quinque
    && (context.weaponKind === undefined || context.weaponKind === 'kagune')
    && primary === 'Bikaku'
    && required.length === 1
    && otherFamilies.includes(required[0])
    && !original.includes(required[0])
    && (perk.minGrade || 1) <= 14
    && !perk.requiresKakuja
    && (perk.minKaguneTypes || 0) <= 1
    && perk.category !== 'Kagune Quimera';
}

export function perkKaguneRequirementsMet(perk: Perk, context: KagunePerkAccessContext): boolean {
  if (context.kaguneTypes === undefined) return true;
  return perkKaguneFamilies(perk).every(family => context.kaguneTypes!.includes(family))
    || isBikakuForeignPerk(perk, context);
}

/** PE added per purchased rank; choice costs represent one selected tier. */
export function bikakuPerkSurcharge(perk: Perk, rank: number, context: KagunePerkAccessContext): number {
  if (!isBikakuForeignPerk(perk, context)) return 0;
  const count = Math.max(0, Math.floor(rank));
  if (!count) return 0;
  const surcharge = (cost: number) => 3 + Math.floor(Math.max(0, cost) / 10);
  if (typeof perk.cost === 'number') return count * surcharge(perk.cost);
  if (perk.costMode === 'choice') return surcharge(perk.cost[Math.min(count - 1, perk.cost.length - 1)] || 0);
  return perk.cost.slice(0, count).reduce((total, cost) => total + surcharge(cost), 0);
}
