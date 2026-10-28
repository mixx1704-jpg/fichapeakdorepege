import raw from './kakuja-perks.json';
import type {KakujaBiologicalProperties} from './kakuja-biology-perks';
import { kakujaElements, kakujaModules, type KakujaState } from './kakuja-data';
import { emptyKakujaBonuses, kakujaReworkPerks, type KakujaBonuses } from './kakuja-rework';
import { calculateCustomSkillBonuses, normalizeCustomSkills } from './CustomSkillsPanel';
import { reworkText } from './rework-rules';
export type KakujaPerk = {id:string;sourceId:string;name:string;cost:number;grade:number;cm:number;category:string;usage:string;requirement:string;effect:string;sourcePage:number;requiresModules:string[];requiresElements:string[];minElements:number;requiresPerks?:string[];currency?:'PE-K';activation?:'passive'|'active';bonuses?:Partial<KakujaBonuses>;requiresFamily?:string;requiresComplete?:boolean;requiresAttribute?:{attribute:string;min:number};biology?:KakujaBiologicalProperties};
const modernText = reworkText;
export const kakujaPerks:KakujaPerk[] = [...kakujaReworkPerks, ...(raw as KakujaPerk[]).map(p=>({...p,effect:modernText(p.effect),requirement:modernText(p.requirement),usage:modernText(p.usage)}))];
export function normalizeKakujaPerks(value:unknown):string[] {
 return Array.isArray(value)? [...new Set(value.filter((id):id is string=>typeof id==='string'))]:[];
}
export function kakujaPerksCost(ids:unknown) {
 return normalizeKakujaPerks(ids).reduce((sum,id)=>{const p=kakujaPerks.find(p=>p.id===id);return sum+(!p||p.currency==='PE-K'?0:p.cost);},0);
}
export function kakujaPEKPerksCost(ids:unknown) {
 return normalizeKakujaPerks(ids).reduce((sum,id)=>{const p=kakujaPerks.find(p=>p.id===id);return sum+(p?.currency==='PE-K'?p.cost:0);},0);
}
export function kakujaPerkMissing(p:KakujaPerk,state:KakujaState,grade:number,species:string,families?:string[],attributes:Record<string,number>={}):string[] {
 const missing:string[]=[];
 if(p.requiresAttribute&&(attributes[p.requiresAttribute.attribute]||0)<p.requiresAttribute.min)missing.push(`${p.requiresAttribute.attribute} ${p.requiresAttribute.min}+`);
 if(grade<p.grade) missing.push(`Level ${p.grade}+`);
 if(grade<6) missing.push('Level 6+ para despertar');
 if(!['ghoul','ghoul-dominante','ghoul-artificial'].includes(species)||state.cannibalPE<25) missing.push('Kakuja desbloqueada');
 if(p.requiresFamily&&families&&!families.includes(p.requiresFamily)) missing.push(`Kagune ${p.requiresFamily}`);
 if(p.requiresComplete&&(!state.complete||state.cannibalPE<60)) missing.push('Kakuja completa');
 for(const id of p.requiresModules) if(!state.selectedModules.includes(id)) missing.push(kakujaModules.find(m=>m.id===id)?.name||id);
 for(const id of p.requiresElements) if(!state.selectedElements.includes(id)) missing.push(kakujaElements.find(e=>e.id===id)?.name||id);
 if(state.selectedElements.length<p.minElements) missing.push(`${p.minElements} propriedades elementais`);
 for(const id of p.requiresPerks||[]) if(!(state.selectedPerks||[]).includes(id)) missing.push(kakujaPerks.find(e=>e.id===id)?.name||id);
 return missing;
}

/** Bonuses of the manifested Kakuja. Weapon combat bonuses never flow back into the Kagune. */
export function calculateKakujaPerkBonuses(state:KakujaState,level:number,species:string,families?:string[],attributes:Record<string,number>={}):KakujaBonuses {
 const total=emptyKakujaBonuses();
 if(!state.active||level<6||state.cannibalPE<25||!['ghoul','ghoul-dominante','ghoul-artificial'].includes(species))return total;
 for(const id of normalizeKakujaPerks(state.selectedPerks)) {
  const perk=kakujaPerks.find(p=>p.id===id)!;
  if(!perk?.bonuses||kakujaPerkMissing(perk,state,level,species,families,attributes).length)continue;
  if(perk.activation==='active'&&!state.activeTechniques.includes(id))continue;
  for(const key of Object.keys(total) as (keyof KakujaBonuses)[]) total[key]+=perk.bonuses[key]||0;
 }
 const custom=calculateCustomSkillBonuses(normalizeCustomSkills(state.customSkills));
 total.accuracy+=custom.kaguneHitDice; total.steps+=custom.kaguneSteps;
 total.modifier+=custom.kaguneDamageModifier;total.block+=custom.blockDice;total.dodge+=custom.dodgeDice;
 total.rd+=custom.rd;total.reserve+=custom.maxRC;total.durability+=custom.kaguneDurability;
 total.regeneration+=custom.regeneration;total.extraAttacks+=custom.extraAttacks;
 return total;
}
