import { perkCatalog } from './perk-catalog';
import type { CharacterSheet } from './character';
import type { CustomSkill } from './CustomSkillsPanel';

/** Catalog effects are projected at calculation time; saved purchases remain IDs. */
export function catalogSkills(sheet: CharacterSheet, eligible: (id: string) => boolean): CustomSkill[] {
  return perkCatalog.perks.flatMap(p=>{
    const custom=p.automation?.custom,rank=sheet.perks[p.id]?.rank||0;
    if(!custom||rank<=0||!eligible(p.id)||(p.location==='kakuhou'&&!sheet.kaguneActive))return [];
    return [{id:`catalog:${p.id}`,name:p.name,description:'',cost:0,activation:custom.activation,
      enabled:custom.activation==='passive'||!!sheet.damageContext.active[`tracking:${p.id}`],
      effects:custom.effects.map(e=>({...e,value:e.value*Math.min(rank,p.maxRank||1)}))}];
  });
}
