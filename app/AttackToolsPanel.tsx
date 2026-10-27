"use client";
import { useState } from 'react';
import { PoisonPanel } from './PoisonPanel';
import { poisonPreview, updatePoison, type PoisonConfig } from './poison';
import { attackSummary, damageAgainstTarget, normalizeCombatTools, prepareCriticalAttack, type CombatToolsState } from './combat-tools';
import type { calculateScalingBonuses, ScalingStat } from './scaling-perks';
import { criticalRange, type CriticalContext, type CriticalSelections } from './critical';

type Scaling = ReturnType<typeof calculateScalingBonuses>;
const statNames: Record<ScalingStat, string> = { life:'Vida',sanity:'Sanidade',rc:'RC',rd:'RD',physicalHit:'Acerto físico',kaguneHit:'Acerto da Kagune/Quinque',block:'Bloqueio',dodge:'Desvio',physicalSteps:'Passos físicos',kaguneSteps:'Passos da Kagune/Quinque',physicalDamage:'Dano fixo físico',kaguneDamage:'Dano fixo da Kagune/Quinque' };
export function AttackToolsPanel({ value, onChange, name, physicalTest, physicalDamage, kaguneTest, kaguneDamage, scaling, poisonConfig, criticalPerks, criticalContext, die=20, physicalSteps, physicalFlat, kaguneSteps, kaguneFlat, fusedParts=1, sharedSteps=0,sharedFlat=0,weaponOnly = false, weaponActive = true }: {
  value: CombatToolsState; onChange:(value:CombatToolsState)=>void; name:string;
  physicalTest:string; physicalDamage:string; kaguneTest:string; kaguneDamage:string;
  scaling:Scaling; poisonConfig:PoisonConfig; weaponOnly?:boolean; weaponActive?:boolean;
  criticalPerks:CriticalSelections; criticalContext:CriticalContext; die?:number; physicalSteps:number; physicalFlat:number; kaguneSteps:number; kaguneFlat:number; fusedParts?:number;sharedSteps?:number;sharedFlat?:number;
}) {
  const [copied,setCopied] = useState(false),[fallback,setFallback] = useState('');
  const [previousTarget,setPreviousTarget] = useState<CombatToolsState|null>(null);
  const v=normalizeCombatTools(value), target=v.poison.target;
  const scope=weaponOnly?'kagune':v.scope;
  const test=scope==='physical'?physicalTest:kaguneTest, originalFormula=scope==='physical'?physicalDamage:kaguneDamage;
  const range=criticalRange(criticalPerks,die), parts=scope==='kagune'?Math.max(1,Math.floor(fusedParts)):1;
  const critical=prepareCriticalAttack({steps:scope==='physical'?physicalSteps:kaguneSteps,flat:scope==='physical'?physicalFlat:kaguneFlat,rd:target.rd,confirmed:v.criticalConfirmed,perks:criticalPerks,context:criticalContext,die,parts,sharedSteps:scope==='kagune'?sharedSteps:0,sharedFlat:scope==='kagune'?sharedFlat:0,ordinaryFormula:originalFormula});
  const formula=critical.formula;
  const preview=poisonPreview(v.poison,poisonConfig);
  const effectiveDamage=v.damage>0?Math.max(v.damage,critical.minimumRawDamage):0;
  const result=damageAgainstTarget(effectiveDamage,target.rd,Math.max(scaling.penetrationPercent,critical.penetrationPercent),preview.rdReductionPercent);
  const inactive=scope==='kagune'&&!weaponActive;
  const patch=(next:Partial<CombatToolsState>)=>{setCopied(false);setFallback('');onChange(normalizeCombatTools({...v,...next}));};
  const setTarget=(patchTarget:Partial<typeof target>)=>patch({poison:updatePoison(v.poison,{type:'target',patch:patchTarget},poisonConfig)});
  const copy=async()=>{
    const summary=attackSummary({name,target:target.name,test,formula,result,critical:critical.critical});
    try { await navigator.clipboard.writeText(summary);setCopied(true);setFallback(''); } catch {setFallback(summary);setCopied(false);}
  };
  const stats=(Object.keys(scaling.percentages) as ScalingStat[]).filter(key=>scaling.percentages[key]>0);
  return <section className="section-block attack-tools"><div className="section-heading"><h2>Dano contra o alvo</h2><div className="card-actions"><button type="button" onClick={()=>{setPreviousTarget(v);patch({...normalizeCombatTools(),scope:v.scope});}}>Novo alvo</button>{previousTarget&&<button type="button" onClick={()=>{patch(previousTarget);setPreviousTarget(null);}}>Restaurar alvo anterior</button>}</div></div>
    <p className="section-help">Role o dano da ficha e informe o resultado. A RD é descontada uma vez. Alvo, valores e veneno ficam salvos nesta ficha.</p>
    <div className="field-grid four"><label className="field"><span>Nome do alvo</span><input value={target.name} onChange={event=>setTarget({name:event.target.value})}/></label><label className="field"><span>RD do alvo</span><input type="number" min={0} value={target.rd} onChange={event=>setTarget({rd:Number(event.target.value)})}/></label><label className="field"><span>Vida máxima do alvo</span><input type="number" min={0} value={target.maxLife} onChange={event=>setTarget({maxLife:Number(event.target.value)})}/></label>{!weaponOnly&&<label className="field"><span>Usar ataque</span><select value={scope} onChange={event=>patch({scope:event.target.value as CombatToolsState['scope']})}><option value="physical">Físico</option><option value="kagune">Kagune</option></select></label>}</div>
    <div className="attack-formulas"><span>Acerto <code>{test}</code></span><span>Dano para rolar <code>{formula}</code></span></div>
    <label className="vats-check"><input type="checkbox" checked={v.criticalConfirmed} onChange={event=>patch({criticalConfirmed:event.target.checked})}/>Crítico natural confirmado <b>{range.label}</b></label><p className="section-help">d{range.maximum}: {range.outcomes}/{range.maximum} resultados ({range.chancePercent}%). Acertos somados não geram crítico. {range.maximum!==20?'A faixa ampliada vale somente no d20.':''}</p>
    {critical.critical&&<p className="critical-preview">{critical.baseSteps} Passos + {critical.stepsPercent}% (+{critical.bonusSteps}) = {critical.steps} Passos{parts>1?` na primeira parte. A fórmula unida soma ${parts} partes e conta os bônus gerais uma única vez`:''}. Dano fixo adicional do crítico: +{critical.flatBonus} uma vez. Role a fórmula acima antes de informar o resultado.</p>}
    {critical.minimumRawDamage>0&&<p className="critical-preview">Colapso Controlado: após rolar, dano bruto mínimo {critical.minimumRawDamage}. Resultado informado {v.damage}; valor usado {effectiveDamage}. O piso entra uma vez, antes da RD.</p>}
    <div className="field-grid four"><label className="field"><span>Resultado do dano rolado</span><input type="number" min={0} value={v.damage} onChange={event=>patch({damage:Number(event.target.value)})}/></label><div className="attack-result"><span>Penetração aplicada</span><strong>{result.penetrationPercent}%</strong><small>−{result.ignoredRD} RD</small></div><div className="attack-result"><span>RD restante</span><strong>{result.remainingRD}</strong><small>{result.targetRD} − {result.ignoredRD}</small></div><div className="attack-result"><span>Dano final</span><strong>{result.damage}</strong><small>máximo(0, {result.rawDamage} − {result.remainingRD})</small></div></div>
    <p className="section-help">Penetração da ficha: {scaling.penetrationPercent}%. Crítico: {critical.penetrationPercent}%. Corrosão ativa: {preview.rdReductionPercent}%. Vale a maior fonte, até 50%; os percentuais não se somam. Frações são arredondadas para baixo.</p>
    {inactive&&<p className="vats-warning">Kagune recolhida ou indisponível. Manifeste-a para usar este ataque.</p>}
    <button type="button" disabled={inactive} onClick={copy}>{copied?'Resultado copiado':'Copiar ataque e dano final'}</button>
    {fallback&&<label className="field"><span>Selecione o texto para copiar</span><textarea readOnly value={fallback} onFocus={event=>event.currentTarget.select()}/></label>}
    {stats.length>0&&<details className="combat-detail"><summary>Bônus percentuais aplicados ({stats.length})</summary><p className="section-help">Percentuais da mesma grandeza são somados e aplicados uma vez sobre o subtotal sem estas perks. Limite: +75% por grandeza. Vida usa o máximo já calculado com ×1,05.</p><div className="scaling-lines">{stats.map(key=><div key={key}><span>{statNames[key]}</span><code>{scaling.totals[key]-scaling.bonuses[key]} + {scaling.percentages[key]}% (+{scaling.bonuses[key]}) = {scaling.totals[key]}</code></div>)}</div></details>}
    <details className="combat-detail" open={preview.active||undefined}><summary>Venenos{preview.active?` · ${preview.stacks} cargas · ${preview.remaining} turnos`:''}</summary><div className="field-grid"><label className="field"><span>Vigor do alvo</span><input type="number" min={0} value={target.vigor} onChange={event=>setTarget({vigor:Number(event.target.value)})}/></label><label className="field"><span>Controle do alvo</span><input type="number" min={0} value={target.control} onChange={event=>setTarget({control:Number(event.target.value)})}/></label></div><PoisonPanel state={v.poison} config={poisonConfig} showTargetFields={false} onAction={action=>patch({poison:updatePoison(v.poison,action,poisonConfig)})}/></details>
  </section>;
}
