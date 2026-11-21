import { perkCatalog } from './perk-catalog';
import type { KakujaReworkPerk } from './kakuja-rework';

export type KakujaBiologicalProperties = {
  stepsPercent?:number; rdPercent?:number; durabilityPercent?:number; reservePercent?:number; regenerationPercent?:number;
  range?:number; movement?:number; penetration?:number; postRDReduction?:number; criticalResistance?:number;
  dotResistance?:number; followupPercent?:number; retaliationPercent?:number; drainPercent?:number;
  supportPercent?:number; woundReliefPercent?:number; regenerationLifePercent?:number; splitTargets?:number;
  remoteRange?:number; corePenalty?:number; repairPercent?:number;
};
export const kakujaBiologyPerks = perkCatalog.kakujaPerks.filter(p=>p.catalogGroups?.includes('biology')) as KakujaReworkPerk[];
