"use client";
import { criticalAttack, criticalRange, type CriticalContext, type CriticalSelections } from "./critical";

export function CriticalPanel({ perks, context, die = 20, steps, flat, rd = 0, confirmed, onConfirmedChange }: {
  perks: CriticalSelections; context: CriticalContext; die?: number; steps: number; flat: number; rd?: number;
  confirmed: boolean; onConfirmedChange: (confirmed: boolean) => void;
}) {
  const range = criticalRange(perks, die), result = criticalAttack({ steps, flat, rd, confirmed, perks, context, die });
  return <div className="critical-panel">
    <label className="vats-check"><input type="checkbox" checked={confirmed} onChange={event => onConfirmedChange(event.target.checked)} />Crítico natural confirmado <b>{range.label}</b></label>
    <p className="section-help">Faixa no d{range.maximum}: {range.label} · {range.outcomes}/{range.maximum} resultados ({range.chancePercent}%). Modificadores de acerto não ampliam a faixa.{range.maximum !== 20 && " As compras de faixa ampliada valem somente no d20."}</p>
    {confirmed && <div className="critical-preview"><p><b>{result.baseSteps} + {result.stepsPercent}% (+{result.bonusSteps}) = {result.steps} Passos</b></p><p>Dano fixo: {result.baseFlat}{result.flatBonus ? ` + ${result.flatBonus}` : ""} = {result.flat}.</p><code>{result.formula}</code>{result.penetrationPercent > 0 && <p>Penetração do crítico: {result.penetrationPercent}% · {result.ignoredRD} de {rd} RD. Compare com outras fontes e use a maior, até 50%.</p>}<p className="section-help">Role esta fórmula uma vez. O dano rolado ainda passa pela RD restante do alvo.</p></div>}
  </div>;
}
