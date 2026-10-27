import { attributeKeys, evolutions, kaguneEffects, perks, type AttributeKey, type KaguneFamily, type Evolution, type KaguneEffect, type Perk } from './data';
import { normalizeCustomSkills, type CustomSkill } from './CustomSkillsPanel';
import { RULES_VERSION, cumulativeLevelPE, previousCumulativePE } from './rework-rules';
import { normalizeCombatTools, type CombatToolsState } from './combat-tools';
import { normalizeTacticalState, type TacticalState } from './tactical';
import { normalizePerkPurchases } from './perk-migrations';
import { scalingIncrease } from './scaling-perks';
import { appendQuinqueSuccesses, quinqueCarrierBonuses, type QuinqueCarrier } from './quinque-carrier';
import { normalizeCharacter, calculateCharacter, effectMaximum, effectRequirementStatus, evolutionRequirementStatus, evolutionCostsForSheet, incrementalCosts, rankCost, progressionPEFor, gradeRequirementFor, damageConditionsForSheet, perkRequirementMet } from './character';

export type Quinque = {
 rulesVersion:number; progressionOffset:number; narrativeLimits:boolean;
 id:string; name:string; image:string; rcType:KaguneFamily; grade:number; creationGrade:number; earnedPE:number; progressPE:number; bonusPE:number;
 attributeBonuses:Record<AttributeKey,number>; attributeDice:Record<AttributeKey,number>;
 attributes:Record<AttributeKey,number>; effects:Record<string,{rank:number;target?:AttributeKey}>; evolutions:string[]; perks:Record<string,{rank:number;target?:AttributeKey}>; customSkills:CustomSkill[];
 hitDice:number; hitModifier:number; damageSteps:number; damageModifier:number; rangeBonus:number; rdOverride:number|null; durabilityOverride:number|null;
 blockDice:number; dodgeDice:number; rdBonus:number; targetKaguneType:KaguneFamily|''; milPenasSacrifices:number; growthPoints:number; predadorCeusStacks:number;
 combatTools:CombatToolsState;
 tactical:TacticalState;
 mode:'normal'|'attack'|'defense'; activeEffects:Record<string,boolean>; confirmedRequirements:Record<string,boolean>; notes:string;
};
const families:KaguneFamily[]=['Ukaku','Koukaku','Rinkaku','Bikaku'];
const num=(v:unknown,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
// Keep the stored field name so old Quinques migrate without losing their level.
const grade=(v:unknown)=>Math.max(1,Math.min(20,Math.floor(num(v,1))));
const override=(v:unknown)=>v==null||v===''?null:Math.max(0,num(v));
export function normalizeQuinque(raw:Partial<Quinque>={}):Quinque {
 const selections=(source:Record<string,{rank:number;target?:AttributeKey}>|undefined)=>Object.fromEntries(Object.entries(source||{}).map(([id,item])=>[id,{rank:Math.max(1,Math.floor(num(item?.rank,1))),...(attributeKeys.includes(item?.target as AttributeKey)?{target:item.target}:{})}]));
 return {tactical:normalizeTacticalState(raw.tactical),combatTools:normalizeCombatTools(raw.combatTools),rulesVersion:RULES_VERSION,progressionOffset:raw.rulesVersion===RULES_VERSION?num(raw.progressionOffset):previousCumulativePE(grade(raw.grade))-cumulativeLevelPE(grade(raw.grade)),narrativeLimits:raw.narrativeLimits===true,image:typeof raw.image==='string'?raw.image:'',blockDice:Math.trunc(num(raw.blockDice)),dodgeDice:Math.trunc(num(raw.dodgeDice)),rdBonus:num(raw.rdBonus),targetKaguneType:families.includes(raw.targetKaguneType as KaguneFamily)?raw.targetKaguneType!:'',milPenasSacrifices:Math.max(0,Math.trunc(num(raw.milPenasSacrifices))),growthPoints:Math.max(0,Math.trunc(num(raw.growthPoints))),predadorCeusStacks:Math.max(0,Math.min(4,Math.trunc(num(raw.predadorCeusStacks)))),id:typeof raw.id==='string'&&raw.id?raw.id:crypto.randomUUID(),name:typeof raw.name==='string'?raw.name:'Nova Quinque',rcType:families.includes(raw.rcType!)?raw.rcType!:'Koukaku',grade:grade(raw.grade),creationGrade:grade(raw.creationGrade),earnedPE:Math.max(0,num(raw.earnedPE)),progressPE:Math.max(0,num(raw.progressPE)),bonusPE:num(raw.bonusPE),
 attributeBonuses:Object.fromEntries(attributeKeys.map(k=>[k,Math.trunc(num(raw.attributeBonuses?.[k]))])) as Record<AttributeKey,number>,
 attributeDice:Object.fromEntries(attributeKeys.map(k=>[k,Math.trunc(num(raw.attributeDice?.[k]))])) as Record<AttributeKey,number>,
 attributes:Object.fromEntries(attributeKeys.map(k => [k, Math.max(0, Math.floor(num(raw.attributes?.[k])))])) as Record<AttributeKey,number>,
 effects:selections(raw.effects),perks:normalizePerkPurchases(selections(raw.perks)),evolutions:(Array.isArray(raw.evolutions)?raw.evolutions:[]).filter((id):id is string=>typeof id==='string'),customSkills:normalizeCustomSkills(raw.customSkills),
 hitDice:num(raw.hitDice),hitModifier:num(raw.hitModifier),damageSteps:num(raw.damageSteps),damageModifier:num(raw.damageModifier),rangeBonus:num(raw.rangeBonus),rdOverride:override(raw.rdOverride),durabilityOverride:override(raw.durabilityOverride),mode:raw.mode==='attack'||raw.mode==='defense'?raw.mode:'normal',activeEffects:raw.activeEffects||{},confirmedRequirements:raw.confirmedRequirements||{},notes:typeof raw.notes==='string'?raw.notes:''};
}
export const quinqueAllowsEffect=(q:Quinque,e:KaguneEffect)=>(e.family==='Geral'||e.family===q.rcType);
// A Quinque has one RC type. Bikaku never inherits the Kakuhou cross-family access rule.
export const quinqueAllowsEvolution=(q:Quinque,e:Evolution)=>(e.family==='Geral'||e.family===q.rcType)&&!e.requiresKakuja&&!e.minKaguneTypes&&(!e.kaguneTypes||e.kaguneTypes.every(t=>t===q.rcType));
export function quinqueAllowsPerk(q:Quinque,p:Perk) {
 if(p.species)return false;
 if(!p.equipmentCompatible&&p.requiredWeapon!=='quinque'&&p.location!=='kakuhou')return false;
 if(p.requiresKakuja||(p.minKaguneTypes||0)>1||(p.kaguneTypes&&p.kaguneTypes.some(t=>t!==q.rcType)))return false;
 if(p.organGroup&&families.includes(p.organGroup as KaguneFamily))return p.organGroup===q.rcType;
 if(['Quimera','Kakuja','Quinx / Arata'].includes(p.organGroup||''))return false;
 return !p.requiredWeapon||p.requiredWeapon==='quinque'||p.requiredWeapon==='kagune';
}
function baseSheet(q:Quinque,carrier=quinqueCarrierBonuses()) {
 const attributeBonuses=Object.fromEntries(attributeKeys.map(key=>[key,q.attributeBonuses[key]+carrier.attributes[key]])) as Record<AttributeKey,number>;
 const attributeDice=Object.fromEntries(attributeKeys.map(key=>[key,q.attributeDice[key]+carrier.attributeDice[key]])) as Record<AttributeKey,number>;
 return normalizeCharacter({quinques:[],rulesVersion:RULES_VERSION,narrativeLimits:q.narrativeLimits,species:'ghoul',weaponKind:'kagune',grade:q.grade,kaguneType:q.rcType,kaguneActive:true,currentRC:999,baseAttributes:q.attributes,extraDice:attributeDice,effects:q.effects,selectedEvolutions:q.evolutions,confirmedRequirements:q.confirmedRequirements,customSkills:q.customSkills,perks:q.perks,damageContext:{targetKaguneType:q.targetKaguneType,milPenasSacrifices:q.milPenasSacrifices,growthPoints:q.growthPoints,predadorCeusStacks:q.predadorCeusStacks,kaguneExtraRD:q.rdBonus,kaguneExtraSteps:q.damageSteps,kaguneExtraModifier:q.damageModifier,koukakuMode:q.mode,active:q.activeEffects} as never,customBonuses:{distance:q.rangeBonus,attributes:attributeBonuses} as never},RULES_VERSION);
}
export function quinqueEffectMissing(q:Quinque,e:KaguneEffect,rank=1,carrier?:QuinqueCarrier) {
 const s=baseSheet(q,quinqueCarrierBonuses(carrier));const missing=effectRequirementStatus(e,s).missing;
 if(!quinqueAllowsEffect(q,e))missing.push('Tipo de RC incompatível');
 if(rank>effectMaximum(e,s))missing.push('Limite de nível pelo Level da Quinque');
 return missing;
}
export function quinqueEvolutionMissing(q:Quinque,e:Evolution,rank=1,carrier?:QuinqueCarrier) {
 const missing=evolutionRequirementStatus(e,baseSheet(q,quinqueCarrierBonuses(carrier)),undefined,undefined,rank).missing;
 if(!quinqueAllowsEvolution(q,e))missing.push('Tipo de RC incompatível ou estrutura adicional necessária');
 return missing;
}
export function quinquePerkMissing(q:Quinque,p:Perk,carrier?:QuinqueCarrier) {
 const missing:string[]=[];
 if(!quinqueAllowsPerk(q,p))missing.push('Tipo incompatível');
 const inherited=quinqueCarrierBonuses(carrier);
 const sheet=baseSheet(q,inherited);
 if(!perkRequirementMet({...p,requiredWeapon:'kagune'},sheet,Object.fromEntries(attributeKeys.map(k=>[k,q.attributes[k]+q.attributeBonuses[k]+inherited.attributes[k]])) as Record<AttributeKey,number>))missing.push('Pré-requisitos de atributo, Level ou técnica pendentes');
 if(q.grade<(p.minGrade||1))missing.push(`Level ${p.minGrade||1}`);
 if(p.requiredEffect&&!q.effects[p.requiredEffect])missing.push('Efeito necessário');
 if(p.requiredEvolution&&!q.evolutions.includes(p.requiredEvolution))missing.push('Evolução necessária');
 return missing;
}
export function calculateQuinque(q:Quinque,carrier?:QuinqueCarrier) {
 const inherited=quinqueCarrierBonuses(carrier);
 q={...q,perks:normalizePerkPurchases(q.perks)};
 const invalidEffects=Object.entries(q.effects).filter(([id,v])=>{const e=kaguneEffects.find(x=>x.id===id);return !e||quinqueEffectMissing(q,e,v.rank,inherited).length>0;}).map(([id])=>id);
 const invalidEvolutions=[...new Set(q.evolutions)].filter(id=>{const e=evolutions.find(x=>x.id===id);return !e||quinqueEvolutionMissing(q,e,q.evolutions.filter(x=>x===id).length,inherited).length>0;});
 // Recheck dependency chains after filtering invalid purchases; keep originals saved for review.
 let usable={...q,effects:Object.fromEntries(Object.entries(q.effects).filter(([id])=>!invalidEffects.includes(id))),evolutions:q.evolutions.filter(id=>!invalidEvolutions.includes(id))};
 for(let i=0;i<q.evolutions.length+Object.keys(q.effects).length;i++){
  const badEffects=Object.keys(usable.effects).filter(id=>quinqueEffectMissing(usable,kaguneEffects.find(e=>e.id===id)!,usable.effects[id].rank,inherited).length);
  const badEvolutions=usable.evolutions.filter(id=>quinqueEvolutionMissing(usable,evolutions.find(e=>e.id===id)!,usable.evolutions.filter(x=>x===id).length,inherited).length);
  if(!badEffects.length&&!badEvolutions.length)break;
  invalidEffects.push(...badEffects);invalidEvolutions.push(...badEvolutions);
  usable={...usable,effects:Object.fromEntries(Object.entries(usable.effects).filter(([id])=>!badEffects.includes(id))),evolutions:usable.evolutions.filter(id=>!badEvolutions.includes(id))};
 }
 const invalidPerks=Object.keys(q.perks).filter(id=>{const p=perks.find(x=>x.id===id);return !p||quinquePerkMissing(usable,p,inherited).length>0;});
 usable={...usable,perks:Object.fromEntries(Object.entries(q.perks).filter(([id])=>!invalidPerks.includes(id)))};
 const s=baseSheet(usable,inherited);
 s.customSkills.push({id:'quinque-carrier-bonuses',name:'Bônus do portador',description:'',cost:0,activation:'passive',enabled:true,effects:[{id:'hit',type:'hit-dice',value:inherited.hit,scope:'kagune',attribute:'forca'},{id:'block',type:'block-dice',value:inherited.block,scope:'kagune',attribute:'vigor'},{id:'dodge',type:'dodge-dice',value:inherited.dodge,scope:'kagune',attribute:'agilidade'},{id:'steps',type:'damage-steps',value:inherited.physicalSteps,scope:'kagune',attribute:'forca'}]});
 // Manual defense dice stay local to this weapon and stack with authorial skills.
 s.customSkills.push({id:'quinque-defense-adjustments',name:'Ajustes da arma',description:'',cost:0,activation:'passive',enabled:true,effects:[{id:'block',type:'block-dice',value:q.blockDice,scope:'kagune',attribute:'vigor'},{id:'dodge',type:'dodge-dice',value:q.dodgeDice,scope:'kagune',attribute:'agilidade'}]}); const primary:AttributeKey=q.rcType==='Ukaku'?'precisao':q.rcType==='Koukaku'?'vigor':q.rcType==='Rinkaku'?'forca':'agilidade';
 s.customSkills.push({id:'quinque-hit-adjustment',name:'Acerto da arma',description:'',cost:0,activation:'passive',enabled:true,effects:[{id:'hit',type:'hit-dice',value:q.hitDice,scope:'kagune',attribute:primary}]});
 const d=calculateCharacter(s,{quinque:true});
 const effectPE=Object.entries(q.effects).reduce((n,[id,v])=>{const e=kaguneEffects.find(x=>x.id===id);return n+(e?incrementalCosts(e,v.rank).reduce((a,b)=>a+b,0):0);},0);
 const evolutionPE=[...new Set(q.evolutions)].reduce((n,id)=>{const e=evolutions.find(x=>x.id===id);return n+(e?evolutionCostsForSheet(e,q.evolutions.filter(x=>x===id).length,'ghoul').paidTotal:0);},0);
 const perkPE=Object.entries(q.perks).reduce((n,[id,v])=>{const p=perks.find(x=>x.id===id);return n+(p?rankCost(p.cost,v.rank,p.costMode):0);},0);
 const available=Math.floor(8+q.creationGrade+progressionPEFor(q)+q.bonusPE);
 const spent=Math.floor(d.attributePE+effectPE+evolutionPE+perkPE+d.customSkillsPE);

 const manualHitModifier=Math.floor(q.hitModifier);
 const hitSubtotal=d.scaling.totals.kaguneHit-d.scaling.bonuses.kaguneHit+manualHitModifier;
 const hitScalingBonus=scalingIncrease('kaguneHit',hitSubtotal,d.scaling.percentages);
 const extraScaling=hitScalingBonus-d.scaling.bonuses.kaguneHit;
 const scaling={...d.scaling,bonuses:{...d.scaling.bonuses,kaguneHit:hitScalingBonus},totals:{...d.scaling.totals,kaguneHit:hitSubtotal+hitScalingBonus}};
 const kaguneTest=`${d.kaguneTest}${manualHitModifier>0?`+${manualHitModifier}`:manualHitModifier<0?manualHitModifier:''}${extraScaling>0?`+${extraScaling}`:extraScaling<0?extraScaling:''}`;
 const attributeTests=Object.fromEntries(attributeKeys.map(key=>[key,appendQuinqueSuccesses(d.attributeTests[key],inherited.attributeChecks[key])])) as Record<AttributeKey,string>;
 return {...d,attributeTests,carrierBonuses:inherited,scaling,kaguneTest,conditions:damageConditionsForSheet(s,'kagune'),available,spent,remaining:available-spent,effectPE:Math.floor(effectPE),evolutionPE:Math.floor(evolutionPE),perkPE:Math.floor(perkPE),invalidEffects:[...new Set(invalidEffects)],invalidEvolutions:[...new Set(invalidEvolutions)],invalidPerks,rd:Math.floor(q.rdOverride??d.rd),durability:Math.floor(q.durabilityOverride??d.kaguneDurability),nextGradePE:gradeRequirementFor(q.grade),hitModifier:Math.floor(Math.floor(d.activeAttributes[primary]/2)+q.hitModifier)};
}
