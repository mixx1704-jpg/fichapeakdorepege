import { attributeKeys, evolutions, kaguneEffects, perks, type AttributeKey, type KaguneFamily, type Evolution, type KaguneEffect, type Perk } from './data';
import { normalizeCustomSkills, type CustomSkill } from './CustomSkillsPanel';
import { normalizeCharacter, calculateCharacter, effectMaximum, effectRequirementStatus, evolutionRequirementStatus, evolutionCostsForSheet, incrementalCosts, rankCost, progressionPEFor, gradeRequirementFor } from './page';

export type Quinque = {
 id:string; name:string; rcType:KaguneFamily; grade:number; creationGrade:number; earnedPE:number; progressPE:number; bonusPE:number;
 attributes:Record<AttributeKey,number>; effects:Record<string,{rank:number}>; evolutions:string[]; perks:Record<string,{rank:number}>; customSkills:CustomSkill[];
 hitDice:number; hitModifier:number; damageSteps:number; damageModifier:number; rangeBonus:number; rdOverride:number|null; durabilityOverride:number|null;
 mode:'normal'|'attack'|'defense'; activeEffects:Record<string,boolean>; confirmedRequirements:Record<string,boolean>; notes:string;
};
const families:KaguneFamily[]=['Ukaku','Koukaku','Rinkaku','Bikaku'];
const num=(v:unknown,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const grade=(v:unknown)=>Math.max(2,Math.min(14,Math.floor(num(v,2)/2)*2));
const override=(v:unknown)=>v==null||v===''?null:Math.max(0,num(v));
export function normalizeQuinque(raw:Partial<Quinque>={}):Quinque {
 const selections=(source:Record<string,{rank:number}>|undefined)=>Object.fromEntries(Object.entries(source||{}).map(([id,item])=>[id,{rank:Math.max(1,Math.floor(num(item?.rank,1)))}]));
 const counts=new Map<string,number>();
 return {id:typeof raw.id==='string'&&raw.id?raw.id:crypto.randomUUID(),name:typeof raw.name==='string'?raw.name:'Nova Quinque',rcType:families.includes(raw.rcType!)?raw.rcType!:'Koukaku',grade:grade(raw.grade),creationGrade:grade(raw.creationGrade),earnedPE:Math.max(0,num(raw.earnedPE)),progressPE:Math.max(0,num(raw.progressPE)),bonusPE:num(raw.bonusPE),
 attributes:Object.fromEntries(attributeKeys.map(k => [k, Math.max(0, Math.min(12, Math.floor(num(raw.attributes?.[k]))))])) as Record<AttributeKey,number>,
 effects:selections(raw.effects),perks:selections(raw.perks),evolutions:(Array.isArray(raw.evolutions)?raw.evolutions:[]).filter(id=>{const item=evolutions.find(e=>e.id===id);const next=(counts.get(id)||0)+1;counts.set(id,next);return item&&next<=(item.maxRank||1);}),customSkills:normalizeCustomSkills(raw.customSkills),
 hitDice:num(raw.hitDice),hitModifier:num(raw.hitModifier),damageSteps:num(raw.damageSteps),damageModifier:num(raw.damageModifier),rangeBonus:num(raw.rangeBonus),rdOverride:override(raw.rdOverride),durabilityOverride:override(raw.durabilityOverride),mode:raw.mode==='attack'||raw.mode==='defense'?raw.mode:'normal',activeEffects:raw.activeEffects||{},confirmedRequirements:raw.confirmedRequirements||{},notes:typeof raw.notes==='string'?raw.notes:''};
}
export const quinqueAllowsEffect=(q:Quinque,e:KaguneEffect)=>(e.family==='Geral'||e.family===q.rcType)&&(!e.type.includes('Biológico')||e.id==='forma-versatil');
// A Quinque has one RC type. Bikaku never inherits the Kakuhou cross-family access rule.
export const quinqueAllowsEvolution=(q:Quinque,e:Evolution)=>(e.family==='Geral'||e.family===q.rcType)&&!e.requiresKakuja&&!e.minKaguneTypes&&(!e.kaguneTypes||e.kaguneTypes.every(t=>t===q.rcType))&&!['conveniencia-instintiva','custo-beneficio','imortal','kakuhou-passivo','fenix','axolote','carne-recusa','nao-consigo-morrer','canibalismo-celular','regeneracao-anormal','regeneracao-superior'].includes(e.id);
export function quinqueAllowsPerk(q:Quinque,p:Perk) {
 if(p.requiredWeapon!=='quinque'||(p.kaguneTypes&&p.kaguneTypes.some(t=>t!==q.rcType)))return false;
 const specified=families.filter(t=>new RegExp(`\\b${t}\\b`,'i').test(`${p.name} ${p.description}`));
 return specified.length===0||specified.every(t=>t===q.rcType);
}
function baseSheet(q:Quinque) {
 return normalizeCharacter({quinques:[],species:'ghoul',weaponKind:'kagune',grade:q.grade,kaguneType:q.rcType,kaguneActive:true,currentRC:999,baseAttributes:q.attributes,effects:q.effects,selectedEvolutions:q.evolutions,confirmedRequirements:q.confirmedRequirements,customSkills:q.customSkills,damageContext:{kaguneExtraSteps:q.damageSteps,kaguneExtraModifier:q.damageModifier,koukakuMode:q.mode,active:q.activeEffects} as never,customBonuses:{distance:q.rangeBonus} as never},7);
}
export function quinqueEffectMissing(q:Quinque,e:KaguneEffect,rank=1) {
 const s=baseSheet(q);const missing=effectRequirementStatus(e,s).missing;
 if(!quinqueAllowsEffect(q,e))missing.push('Tipo de RC incompatível ou efeito biológico');
 if(rank>effectMaximum(e,s))missing.push('Limite de nível pelo Grau da Quinque');
 return missing;
}
export function quinqueEvolutionMissing(q:Quinque,e:Evolution,rank=1) {
 const missing=evolutionRequirementStatus(e,baseSheet(q),undefined,undefined,rank).missing;
 if(!quinqueAllowsEvolution(q,e))missing.push('Tipo de RC incompatível ou evolução biológica');
 return missing;
}
export function quinquePerkMissing(q:Quinque,p:Perk) {
 const missing:string[]=[];
 if(!quinqueAllowsPerk(q,p))missing.push('Tipo incompatível');
 if(q.grade<(p.minGrade||2))missing.push(`Grau ${p.minGrade}`);
 if(p.requiredEffect&&!q.effects[p.requiredEffect])missing.push('Efeito necessário');
 if(p.requiredEvolution&&!q.evolutions.includes(p.requiredEvolution))missing.push('Evolução necessária');
 return missing;
}
export function calculateQuinque(q:Quinque) {
 const invalidEffects=Object.entries(q.effects).filter(([id,v])=>{const e=kaguneEffects.find(x=>x.id===id);return !e||quinqueEffectMissing(q,e,v.rank).length>0;}).map(([id])=>id);
 const invalidEvolutions=[...new Set(q.evolutions)].filter(id=>{const e=evolutions.find(x=>x.id===id);return !e||quinqueEvolutionMissing(q,e,q.evolutions.filter(x=>x===id).length).length>0;});
 // Recheck dependency chains after filtering invalid purchases; keep originals saved for review.
 let usable={...q,effects:Object.fromEntries(Object.entries(q.effects).filter(([id])=>!invalidEffects.includes(id))),evolutions:q.evolutions.filter(id=>!invalidEvolutions.includes(id))};
 for(let i=0;i<q.evolutions.length+Object.keys(q.effects).length;i++){
  const badEffects=Object.keys(usable.effects).filter(id=>quinqueEffectMissing(usable,kaguneEffects.find(e=>e.id===id)!,usable.effects[id].rank).length);
  const badEvolutions=usable.evolutions.filter(id=>quinqueEvolutionMissing(usable,evolutions.find(e=>e.id===id)!,usable.evolutions.filter(x=>x===id).length).length);
  if(!badEffects.length&&!badEvolutions.length)break;
  invalidEffects.push(...badEffects);invalidEvolutions.push(...badEvolutions);
  usable={...usable,effects:Object.fromEntries(Object.entries(usable.effects).filter(([id])=>!badEffects.includes(id))),evolutions:usable.evolutions.filter(id=>!badEvolutions.includes(id))};
 }
 const s=baseSheet(usable); const primary:AttributeKey=q.rcType==='Ukaku'?'precisao':q.rcType==='Koukaku'?'vigor':q.rcType==='Rinkaku'?'forca':'agilidade';
 s.extraDice[primary]=q.hitDice;
 const d=calculateCharacter(s);
 const effectPE=Object.entries(q.effects).reduce((n,[id,v])=>{const e=kaguneEffects.find(x=>x.id===id);return n+(e?incrementalCosts(e,v.rank).reduce((a,b)=>a+b,0):0);},0);
 const evolutionPE=[...new Set(q.evolutions)].reduce((n,id)=>{const e=evolutions.find(x=>x.id===id);return n+(e?evolutionCostsForSheet(e,q.evolutions.filter(x=>x===id).length,'ghoul').paidTotal:0);},0);
 const perkPE=Object.entries(q.perks).reduce((n,[id,v])=>{const p=perks.find(x=>x.id===id);return n+(p?rankCost(p.cost,v.rank,p.costMode):0);},0);
 const available=8+q.creationGrade+progressionPEFor(q)+q.bonusPE;
 const spent=d.attributePE+effectPE+evolutionPE+perkPE+d.customSkillsPE;
 const invalidPerks=Object.keys(q.perks).filter(id=>{const p=perks.find(x=>x.id===id);return !p||quinquePerkMissing(usable,p).length>0;});
 return {...d,available,spent,remaining:available-spent,effectPE,evolutionPE,perkPE,invalidEffects:[...new Set(invalidEffects)],invalidEvolutions:[...new Set(invalidEvolutions)],invalidPerks,rd:q.rdOverride??d.rd,durability:q.durabilityOverride??d.kaguneDurability,nextGradePE:gradeRequirementFor(q.grade),hitModifier:Math.floor(d.activeAttributes[primary]/2)+Math.floor((usable.effects['aumentar-acerto']?.rank||0)/3)+q.hitModifier};
}
