import { normalizePoisonState, type PoisonState } from './poison';
import { applyPartialPenetration } from './scaling-perks';
import { criticalAttack, type CriticalAttackInput } from './critical';
import { sumPartDamage } from './colosso';
import {damageStatistics} from './damage-dice';

export type CombatToolsState = { damage: number; scope: 'physical' | 'kagune'; criticalConfirmed:boolean; targetStructure?:boolean; poison: PoisonState };
const integer = (value: unknown) => Number.isFinite(Number(value)) ? Math.min(1_000_000_000, Math.max(0, Math.floor(Number(value)))) : 0;
export function normalizeCombatTools(value?: Partial<CombatToolsState> | null): CombatToolsState {
  return { damage: integer(value?.damage), scope: value?.scope === 'physical' ? 'physical' : 'kagune', criticalConfirmed:value?.criticalConfirmed===true, targetStructure:value?.targetStructure===true, poison: normalizePoisonState(value?.poison) };
}
export function normalizeDamageMultiplier(value: number = 1) {
  return Number.isFinite(value) ? Math.min(3,Math.max(0,value)) : 1;
}
/** All final-damage properties share a single multiplier, including structure bonuses. */
export function attackDamageMultiplier(multiplier = 1, targetStructure = false, structureMultiplier = 1) {
  return normalizeDamageMultiplier(normalizeDamageMultiplier(multiplier) * (targetStructure ? normalizeDamageMultiplier(structureMultiplier) : 1));
}
type TargetDamageResult = ReturnType<typeof applyPartialPenetration> & { rolledDamage?:number; multiplier?:number; originalTargetRD?:number; flatRDReduction?:number };
export function damageAgainstTarget(damage: number, rd: number, penetration: number, corrosion = 0, damageMultiplier?:number, targetRDReduction = 0): TargetDamageResult {
  const originalTargetRD=integer(rd),flatRDReduction=Math.min(originalTargetRD,integer(targetRDReduction));
  // Fixed reduction precedes percentages. Penetration and corrosion share that base.
  const result=applyPartialPenetration(damage, originalTargetRD-flatRDReduction, Math.max(integer(penetration), integer(corrosion)));
  if (damageMultiplier === undefined && flatRDReduction === 0) return result;
  const multiplier=normalizeDamageMultiplier(damageMultiplier),rolledDamage=result.rawDamage;
  const rawDamage=Math.floor(rolledDamage*multiplier);
  return {...result,originalTargetRD,flatRDReduction,rolledDamage,multiplier,rawDamage,damage:Math.max(0,rawDamage-result.remainingRD)};
}
export function prepareCriticalAttack(input: CriticalAttackInput & { parts?:number; ordinaryFormula:string;sharedSteps?:number;sharedFlat?:number }) {
  const result=criticalAttack(input),parts=Math.min(100,Math.max(1,integer(input.parts)||1));
  const other=criticalAttack({...input,steps:Math.max(0,input.steps-integer(input.sharedSteps)),flat:input.flat-integer(input.sharedFlat)});
  const formula=!result.critical?input.ordinaryFormula:parts===1?result.formula:sumPartDamage([result.formula,
    ...Array.from({length:parts-1},()=>sumPartDamage([other.formula,String(-other.flatBonus)])),
  ]);
  const statistics=damageStatistics(formula);
  const minimumRawDamage=result.minimumPercent?Math.max(result.minimumFlat,Math.floor(statistics.diceMaximum*result.minimumPercent/100)+statistics.flat):0;
  return {...result,parts,formula,minimumRawDamage};
}
export function attackSummary(input: { name: string; target: string; test: string; formula: string; result: ReturnType<typeof damageAgainstTarget>; critical?:boolean }) {
  const r = input.result;
  const damageLine=r.multiplier!==undefined&&r.multiplier!==1?`${r.rolledDamage} × ${r.multiplier.toLocaleString('pt-BR',{maximumFractionDigits:6})} = ${r.rawDamage} antes da RD`:String(r.rawDamage);
  const rdLine=r.flatRDReduction?`${r.originalTargetRD}; redução fixa: −${r.flatRDReduction}; RD antes da penetração: ${r.targetRD}`:String(r.targetRD);
  return `${input.name || 'Ataque'} → ${input.target || 'Alvo'}${input.critical?' · CRÍTICO NATURAL CONFIRMADO':''}\nAcerto: ${input.test}\nDano para rolar: ${input.formula}\nResultado do dano: ${damageLine}\nRD do alvo: ${rdLine}; penetração: ${r.penetrationPercent}% (−${r.ignoredRD} RD); RD restante: ${r.remainingRD}\nDano final: ${r.rawDamage} − ${r.remainingRD} = ${r.damage}`;
}
