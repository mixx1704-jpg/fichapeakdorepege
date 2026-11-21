import { perkCatalog } from './perk-catalog';

export type CatalogMechanics = Record<string, number | number[] | boolean>;
type Group = 'perks' | 'kaguneEffects' | 'evolutions';

/** Missing parameters retain the original rule, including catalogs exported by older editors. */
export function ruleNumber(group: Group, id: string, key: string, fallback: number, rank = 1): number {
  const entry = perkCatalog[group].find(item => item.id === id) as { mechanics?: CatalogMechanics } | undefined;
  const value = entry?.mechanics?.[key];
  const selected = Array.isArray(value) ? value[Math.min(value.length - 1, Math.max(0, Math.floor(rank) - 1))] : value;
  return typeof selected === 'number' && Number.isFinite(selected) ? selected : fallback;
}

export const effectNumber = (id: string, key: string, fallback: number, rank = 1) => ruleNumber('kaguneEffects', id, key, fallback, rank);
export const evolutionNumber = (id: string, key: string, fallback: number, rank = 1) => ruleNumber('evolutions', id, key, fallback, rank);
export const perkNumber = (id: string, key: string, fallback: number, rank = 1) => ruleNumber('perks', id, key, fallback, rank);

export function evolutionFlag(id: string, key: string, fallback: boolean) {
  const value = perkCatalog.evolutions.find(item=>item.id===id)?.mechanics?.[key];
  return typeof value === 'boolean' ? value : fallback;
}
