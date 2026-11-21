import { perkCatalog } from './perk-catalog';
import {type KakujaBiologicalProperties} from './kakuja-biology-perks';

/** Kakuja rework: permanent purchases, explicit effects, and additive d20 accuracy. */
export type KakujaBonuses = {
  accuracy: number; block: number; dodge: number; steps: number; modifier: number;
  rd: number; durability: number; reserve: number; regeneration: number; extraAttacks: number;
};
export type KakujaReworkPerk = {
  id: string; sourceId: string; name: string; cost: number; grade: number; cm: number;
  category: string; usage: string; requirement: string; effect: string; sourcePage: number;
  requiresModules: string[]; requiresElements: string[]; minElements: number;
  currency: "PE-K"; activation: "passive" | "active"; bonuses: Partial<KakujaBonuses>;
  requiresFamily?: string; requiresComplete?: boolean;
  requiresAttribute?: {attribute:string;min:number}; biology?:KakujaBiologicalProperties;
};

export const kakujaReworkPerks = perkCatalog.kakujaPerks.filter(p=>p.catalogGroups?.includes('rework')) as KakujaReworkPerk[];

export const emptyKakujaBonuses = (): KakujaBonuses => ({ accuracy: 0, block: 0, dodge: 0, steps: 0, modifier: 0, rd: 0, durability: 0, reserve: 0, regeneration: 0, extraAttacks: 0 });
