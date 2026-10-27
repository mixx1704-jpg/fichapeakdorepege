import { normalizePoisonState, type PoisonState } from './poison';
import { applyPartialPenetration } from './scaling-perks';
import { criticalAttack, type CriticalAttackInput } from './critical';
import { sumPartDamage } from './colosso';
import {damageStatistics} from './damage-dice';

export type CombatToolsState = { damage: number; scope: 'physical' | 'kagune'; criticalConfirmed:boolean; poison: PoisonState };
const integer = (value: unknown) => Number.isFinite(Number(value)) ? Math.min(1_000_000_000, Math.max(0, Math.floor(Number(value)))) : 0;
export function normalizeCombatTools(value?: Partial<CombatToolsState> | null): CombatToolsState {
  return { damage: integer(value?.damage), scope: value?.scope === 'physical' ? 'physical' : 'kagune', criticalConfirmed:value?.criticalConfirmed===true, poison: normalizePoisonState(value?.poison) };
}
export function damageAgainstTarget(damage: number, rd: number, penetration: number, corrosion = 0) {
  // Both reductions refer to the original armor: use one source, never a cascade.
  return applyPartialPenetration(damage, rd, Math.max(integer(penetration), integer(corrosion)));
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
  return `${input.name || 'Ataque'} → ${input.target || 'Alvo'}${input.critical?' · CRÍTICO NATURAL CONFIRMADO':''}\nAcerto: ${input.test}\nDano para rolar: ${input.formula}\nResultado do dano: ${r.rawDamage}\nRD do alvo: ${r.targetRD}; penetração: ${r.penetrationPercent}% (−${r.ignoredRD} RD); RD restante: ${r.remainingRD}\nDano final: ${r.rawDamage} − ${r.remainingRD} = ${r.damage}`;
}
