import raw from './kakuja-perks.json';
import { kakujaElements, kakujaModules, type KakujaState } from './kakuja-data';
export type KakujaPerk = {id:string;sourceId:string;name:string;cost:number;grade:number;cm:number;category:string;usage:string;requirement:string;effect:string;sourcePage:number;requiresModules:string[];requiresElements:string[];minElements:number;requiresPerks?:string[]};
export const kakujaPerks = raw as KakujaPerk[];
export function normalizeKakujaPerks(value:unknown):string[] {
 return Array.isArray(value)? [...new Set(value.filter((id):id is string=>typeof id==='string'&&kakujaPerks.some(p=>p.id===id)))]:[];
}
export function kakujaPerksCost(ids:unknown) {
 return normalizeKakujaPerks(ids).reduce((sum,id)=>sum+kakujaPerks.find(p=>p.id===id)!.cost,0);
}
export function kakujaPerkMissing(p:KakujaPerk,state:KakujaState,grade:number,species:string):string[] {
 const missing:string[]=[];
 if(grade<p.grade) missing.push(`Grau ${p.grade}+`);
 if(!['ghoul','ghoul-dominante','ghoul-artificial'].includes(species)||state.cannibalPE<25) missing.push('Kakuja desbloqueada');
 for(const id of p.requiresModules) if(!state.selectedModules.includes(id)) missing.push(kakujaModules.find(m=>m.id===id)?.name||id);
 for(const id of p.requiresElements) if(!state.selectedElements.includes(id)) missing.push(kakujaElements.find(e=>e.id===id)?.name||id);
 if(state.selectedElements.length<p.minElements) missing.push(`${p.minElements} propriedades elementais`);
 for(const id of p.requiresPerks||[]) if(!(state.selectedPerks||[]).includes(id)) missing.push(kakujaPerks.find(e=>e.id===id)?.name||id);
 return missing;
}
