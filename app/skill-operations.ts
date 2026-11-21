import type {CustomSkill,CustomSkillEffect} from './CustomSkillsPanel';
import {isConditionalCatalogEntry} from './catalog-filters';

export type SkillOperation='add'|'subtract'|'multiply'|'increase-percent'|'decrease-percent';
export type SkillTiming={condition?:string;conditionMet?:boolean;durationTurns?:number;activatedTurn?:number;expiresTurn?:number;limitations?:string;source?:string};
export const skillMultiplierKeys=['physicalHit','kaguneHit','physicalSteps','kaguneSteps','physicalDamage','kaguneDamage','dodge','block','rd','life','rc','sanity','regeneration','durability','movement','carrying','determination','extraAttacks','tails','rcRegenerated','peGain'] as const;
export type SkillMultiplierKey=typeof skillMultiplierKeys[number];
export type CustomMultipliers=Record<SkillMultiplierKey,number>&{attributes:Record<string,number>;attributeChecks:Record<string,number>};
export function blankCustomMultipliers():CustomMultipliers {return {...Object.fromEntries(skillMultiplierKeys.map(k=>[k,1])),attributes:{},attributeChecks:{}} as CustomMultipliers;}
export function normalizeSkillTiming(raw:SkillTiming):SkillTiming {
  const n=(v:unknown)=>Math.max(0,Math.floor(Number(v)||0));
  return {...(raw.condition!==undefined?{condition:String(raw.condition||'')}:{}),...(raw.conditionMet!==undefined?{conditionMet:raw.conditionMet!==false}:{}),...(raw.durationTurns!==undefined?{durationTurns:n(raw.durationTurns)}:{}),...(raw.activatedTurn!==undefined?{activatedTurn:n(raw.activatedTurn)}:{}),...(raw.expiresTurn!==undefined?{expiresTurn:n(raw.expiresTurn)}:{}),...(raw.limitations!==undefined?{limitations:String(raw.limitations||'')}:{}),...(raw.source!==undefined?{source:String(raw.source||'')}:{}),};
}
export function requiresCustomActivation(skill:CustomSkill) {return skill.activation==='active'||!!skill.condition?.trim()||!!skill.durationTurns||skill.effects.some(e=>e.activation==='active'||!!e.condition?.trim()||!!e.durationTurns)||isConditionalCatalogEntry({...skill,useType:'Passiva'});}
export function customSkillIsActive(skill:CustomSkill,turn=1) {
  return (!requiresCustomActivation(skill)||skill.enabled)&&(!skill.condition?.trim()||skill.conditionMet!==false)&&(!skill.expiresTurn||turn<skill.expiresTurn);
}
export function transitionCustomSkills(previous:CustomSkill[],requested:CustomSkill[],turn:number):CustomSkill[] {
  return requested.map(skill=>{
    const old=previous.find(x=>x.id===skill.id);
    const activating=skill.enabled&&(!old?.enabled||!old.expiresTurn&&!!skill.durationTurns);
    const next=activating?{...skill,activatedTurn:turn,expiresTurn:skill.durationTurns?turn+skill.durationTurns:0}:skill;
    return {...next,effects:next.effects.map(effect=>{
      const before=old?.effects.find(x=>x.id===effect.id);
      const start=activating||effect.enabled!==false&&before?.enabled===false||!!effect.durationTurns&&!before?.expiresTurn;
      return start?{...effect,activatedTurn:turn,expiresTurn:effect.durationTurns?turn+effect.durationTurns:0}:effect;
    })};
  });
}
export function expireCustomSkills(skills:CustomSkill[],turn:number):CustomSkill[] {return skills.map(skill=>({...skill,...(skill.expiresTurn&&turn>=skill.expiresTurn?{enabled:false}:{}),effects:skill.effects.map(e=>({...e,...(e.expiresTurn&&turn>=e.expiresTurn?{enabled:false}:{})}))}));}
const targetKeys:Record<string,SkillMultiplierKey>={'hit-dice':'kaguneHit','damage-steps':'kaguneSteps','damage-modifier':'kaguneDamage','extra-attacks':'extraAttacks',tails:'tails','dodge-dice':'dodge','block-dice':'block',rd:'rd','max-life':'life','max-rc':'rc','max-sanity':'sanity',regeneration:'regeneration','kagune-durability':'durability',movement:'movement',carrying:'carrying',determination:'determination','rc-regenerated':'rcRegenerated','pe-gain':'peGain'};
export function projectCustomOperations(skills:CustomSkill[],turn=1) {
  const multipliers=blankCustomMultipliers(),additiveSkills:CustomSkill[]=[],peGainSources:string[]=[];
  let penetration=0;
  const seen=new Set<string>();
  for(const skill of skills) {
    if(seen.has(skill.id)||!customSkillIsActive(skill,turn))continue;seen.add(skill.id);
    const additive:CustomSkillEffect[]=[],effects=new Set<string>();
    for(const effect of skill.effects) {
      if(effects.has(effect.id)||effect.enabled===false||effect.condition?.trim()&&effect.conditionMet===false||effect.expiresTurn&&turn>=effect.expiresTurn)continue;effects.add(effect.id);
      const operation=effect.operation||'add',value=Number.isFinite(effect.value)?effect.value:0;
      if(effect.type==='penetration'){penetration+=operation==='subtract'?-Math.abs(value):value;continue;}
      if(operation==='add'||operation==='subtract') {
        if(effect.type==='pe-gain'){multipliers.peGain+=operation==='subtract'?-Math.abs(value):value;peGainSources.push(effect.source||skill.name);}
        else if(effect.type==='rc-regenerated')multipliers.rcRegenerated+=operation==='subtract'?-Math.abs(value):value;
        else additive.push({...effect,value:operation==='subtract'?-Math.abs(value):value});
        continue;
      }
      const factor=operation==='multiply'?value:operation==='increase-percent'?1+value/100:1-value/100;
      const delta=factor-1;
      if(effect.type==='attribute-bonus'||effect.type==='attribute-dice') {
        const map=effect.type==='attribute-bonus'?multipliers.attributes:multipliers.attributeChecks;map[effect.attribute]=(map[effect.attribute]??1)+delta;continue;
      }
      const key=targetKeys[effect.type];if(!key)continue;
      if(['hit-dice','damage-steps','damage-modifier'].includes(effect.type)) {
        if(effect.scope!=='kagune')multipliers[effect.type==='hit-dice'?'physicalHit':effect.type==='damage-steps'?'physicalSteps':'physicalDamage']+=delta;
        if(effect.scope!=='physical')multipliers[key]+=delta;
      } else multipliers[key]+=delta;
      if(key==='peGain')peGainSources.push(effect.source||skill.name);
    }
    additiveSkills.push({...skill,activation:'passive',description:'',condition:'',durationTurns:0,expiresTurn:0,effects:additive});
  }
  for(const key of skillMultiplierKeys)multipliers[key]=Math.max(0,multipliers[key]);
  for(const map of [multipliers.attributes,multipliers.attributeChecks])for(const k of Object.keys(map))map[k]=Math.max(0,map[k]);
  return {multipliers,additiveSkills,peGainSources:[...new Set(peGainSources)],penetration:Math.max(0,penetration)};
}
