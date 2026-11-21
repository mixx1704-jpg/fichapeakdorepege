import { perkCatalog } from './perk-catalog';
export const damageStepRows = perkCatalog.perks.filter(p=>p.id.startsWith('r26-passos-')).map(p=>[
  p.id.slice(4), p.name, p.minGrade, p.cost, p.category, p.automation?.rework?.modifiers, p,
]);
