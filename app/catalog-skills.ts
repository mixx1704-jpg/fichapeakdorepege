import { perkCatalog } from './perk-catalog';
import type { CharacterSheet } from './character';
import type { CustomSkill } from './CustomSkillsPanel';
import type { Evolution, KaguneEffect } from './data';
import type { CustomSkillEffect } from './CustomSkillsPanel';

function rankedEffect(effect: CustomSkillEffect, rank: number) {
  const values=effect.valuesByRank;
  return {...effect,value:values?.length ? values[Math.min(values.length-1,rank-1)] : effect.value*rank};
}

/** Catalog effects are projected at calculation time; saved purchases remain IDs. */
export function catalogSkills(sheet: CharacterSheet, eligible: (id: string) => boolean, eligibleEffect: (item: KaguneEffect) => boolean = () => true, eligibleEvolution: (item: Evolution) => boolean = () => true): CustomSkill[] {
  const perks=perkCatalog.perks.flatMap(p=>{
    const custom=p.automation?.custom,rank=sheet.perks[p.id]?.rank||0;
    if(!custom||rank<=0||!eligible(p.id)||(p.location==='kakuhou'&&!sheet.kaguneActive))return [];
    return [{id:`catalog:${p.id}`,name:p.name,description:'',cost:0,activation:custom.activation,
      enabled:custom.activation==='passive'||!!sheet.damageContext.active[`tracking:${p.id}`],
      effects:custom.effects.map(e=>rankedEffect(e,Math.min(rank,p.maxRank||1)))}];
  });
  const drawbacks=perkCatalog.drawbacks.flatMap(p=>{
    const custom=p.automation?.custom,rank=sheet.drawbacks[p.id]?.rank||0;
    if(!custom||rank<=0||p.species&&!p.species.includes(sheet.species))return [];
    const maximum=p.maxRank||(Array.isArray(p.credit)?p.credit.length:1);
    return [{id:`drawback:${p.id}`,name:p.name,description:'',cost:0,activation:custom.activation,
      enabled:custom.activation==='passive'||!!sheet.damageContext.active[`tracking:${p.id}`],
      effects:custom.effects.map(e=>rankedEffect(e,Math.min(rank,maximum)))}];
  });
  const weaponActive = sheet.weaponKind !== 'nenhum' && sheet.kaguneActive;
  const effects = weaponActive ? perkCatalog.kaguneEffects.flatMap(p => {
    const custom=p.automation?.custom, rank=sheet.effects[p.id]?.rank||0;
    if(!custom||rank<=0||!eligibleEffect(p))return [];
    return [{id:`effect:${p.id}`,name:p.name,description:'',cost:0,activation:custom.activation,
      enabled:custom.activation==='passive'||!!sheet.damageContext.active[`tracking:${p.id}`],
      effects:custom.effects.map(e=>rankedEffect(e,rank))}];
  }) : [];
  const evolutions = weaponActive && sheet.weaponKind === 'kagune' ? perkCatalog.evolutions.flatMap(p => {
    const custom=p.automation?.custom, rank=sheet.selectedEvolutions.filter(id=>id===p.id).length;
    if(!custom||rank<=0||!eligibleEvolution(p))return [];
    return [{id:`evolution:${p.id}`,name:p.name,description:'',cost:0,activation:custom.activation,
      enabled:custom.activation==='passive'||!!sheet.damageContext.active[`tracking:${p.id}`],
      effects:custom.effects.map(e=>rankedEffect(e,rank))}];
  }) : [];
  return [...perks,...drawbacks,...effects,...evolutions];
}
