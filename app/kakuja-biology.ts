import type {KakujaState} from './kakuja-data';
import {kakujaPerks,kakujaPerkMissing,normalizeKakujaPerks} from './kakuja-perks';
import type {KakujaBiologicalProperties} from './kakuja-biology-perks';

const n=(value:number,max=1_000_000_000)=>Math.min(max,Math.max(0,Math.floor(Number.isFinite(value)?value:0)));
export type KakujaBiology=Required<KakujaBiologicalProperties>&{names:string[];permissions:string[]};
export function calculateKakujaBiology(state:KakujaState,level:number,species:string,families:string[]=[],attributes:Record<string,number>={}):KakujaBiology{
  const bio:KakujaBiology={stepsPercent:0,rdPercent:0,durabilityPercent:0,reservePercent:0,regenerationPercent:0,range:0,movement:0,penetration:0,postRDReduction:0,criticalResistance:0,dotResistance:0,followupPercent:0,retaliationPercent:0,drainPercent:0,supportPercent:0,woundReliefPercent:0,regenerationLifePercent:0,splitTargets:1,remoteRange:0,corePenalty:0,repairPercent:0,names:[],permissions:[]};
  if(!state.active||level<6||state.cannibalPE<25||!['ghoul','ghoul-dominante','ghoul-artificial'].includes(species))return bio;
  const additive=new Set(['stepsPercent','rdPercent','durabilityPercent','reservePercent','regenerationPercent','range','movement']);
  for(const id of normalizeKakujaPerks(state.selectedPerks)){
    const perk=kakujaPerks.find(item=>item.id===id);
    if(!perk?.biology||kakujaPerkMissing(perk,state,level,species,families,attributes).length)continue;
    bio.names.push(perk.name);bio.permissions.push(`${perk.name}: ${perk.effect}`);
    for(const key of Object.keys(perk.biology) as (keyof KakujaBiologicalProperties)[]){
      const amount=n(perk.biology[key]||0);
      bio[key]=additive.has(key)?bio[key]+amount:Math.max(bio[key],amount);
    }
  }
  for(const key of ['stepsPercent','rdPercent','durabilityPercent','reservePercent','regenerationPercent'] as const)bio[key]=Math.min(75,bio[key]);
  bio.penetration=Math.min(50,bio.penetration);bio.postRDReduction=Math.min(35,bio.postRDReduction);
  bio.dotResistance=Math.min(75,bio.dotResistance);bio.criticalResistance=Math.min(50,bio.criticalResistance);
  bio.followupPercent=Math.min(30,bio.followupPercent);bio.splitTargets=Math.min(3,bio.splitTargets);
  return bio;
}

export function applyKakujaBiology(base:{steps:number;rd:number;ownDurability:number;reserve:number},bio:KakujaBiology){
  return {
    steps:n(base.steps)+Math.floor(n(base.steps)*bio.stepsPercent/100),
    rd:n(base.rd)+Math.floor(n(base.rd)*bio.rdPercent/100),
    ownDurability:n(base.ownDurability)+Math.floor(n(base.ownDurability)*bio.durabilityPercent/100),
    reserve:n(base.reserve)+Math.floor(n(base.reserve)*bio.reservePercent/100),
  };
}
export function kakujaRegeneration(base:number,maxLife:number,bio:KakujaBiology){
  return n(base)+Math.floor(n(base)*bio.regenerationPercent/100)+Math.floor(n(maxLife)*bio.regenerationLifePercent/100);
}
/** Negative penalties still round toward minus infinity, as do all game results. */
export function kakujaWoundPenalty(penalty:number,bio:KakujaBiology){
  return penalty<0?Math.floor(penalty*(100-Math.min(50,bio.woundReliefPercent))/100):Math.floor(penalty);
}
export function kakujaOutgoing(rawDamage:number,targetRD:number,bio:KakujaBiology,otherPenetration=0){
  const raw=n(rawDamage),rd=n(targetRD),penetration=Math.min(50,Math.max(bio.penetration,n(otherPenetration,50)));
  const ignoredRD=Math.floor(rd*penetration/100),effectiveRD=rd-ignoredRD,damage=Math.max(0,raw-effectiveRD);
  return {raw,penetration,ignoredRD,effectiveRD,damage,followup:Math.floor(damage*bio.followupPercent/100)};
}
export function kakujaIncoming(baseDamage:number,criticalExtra:number,rd:number,bio:KakujaBiology,periodic=false,otherReduction=0){
  const base=n(baseDamage),critical=n(criticalExtra),criticalPrevented=Math.floor(critical*bio.criticalResistance/100);
  const raw=base+critical-criticalPrevented,afterRD=Math.max(0,raw-n(rd));
  // Periodic resistance and generic reduction compete, never multiply each other.
  const reduction=Math.max(periodic?bio.dotResistance:0,bio.postRDReduction,n(otherReduction,100));
  const prevented=Math.floor(afterRD*reduction/100),damage=afterRD-prevented;
  return {base,critical,criticalPrevented,raw,afterRD,reduction,prevented,damage};
}
export function kakujaRecovery(bio:KakujaBiology,context:{regeneration:number;actualHealed:number;actualEnemyDamage:number;maxLife:number;missingLife:number;allyMissingLife:number;missingDurability:number;ownDurability?:number}){
  return {
    support:Math.min(n(context.allyMissingLife),Math.floor(n(context.regeneration)*bio.supportPercent/100)),
    drain:Math.min(n(context.missingLife),Math.floor(n(context.maxLife)*0.1),Math.floor(n(context.actualEnemyDamage)*bio.drainPercent/100)),
    repair:Math.min(n(context.missingDurability),n(context.ownDurability??context.missingDurability),Math.floor(n(context.actualHealed)*bio.repairPercent/100)),
  };
}
/** Parts partition one pool of damage. Flooring leaves unallocated points unspent. */
export function kakujaPartition(rawDamage:number,percentages:number[],targetRDs:number[],bio:KakujaBiology,otherPenetration=0){
  if(percentages.length>bio.splitTargets||percentages.some(v=>!Number.isFinite(v)||v<0)||percentages.reduce((a,b)=>a+b,0)>100)throw new Error('Divida no máximo 100% do dano entre os alvos permitidos.');
  return percentages.map((percent,index)=>kakujaOutgoing(Math.floor(n(rawDamage)*percent/100),targetRDs[index]||0,bio,otherPenetration));
}
