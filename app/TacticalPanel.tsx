"use client";
import { useState } from 'react';
import { normalizeTacticalState, resolveTactical, tacticalAvailability, tacticalOwnedTechniques, tacticalPreview, tacticalSummary, type TacticalAction, type TacticalContext, type TacticalInputs, type TacticalResolution, type TacticalState } from './tactical';

export interface TacticalPanelProps {
  state:TacticalState;context?:TacticalContext;managedTurn?:boolean;
  onAction?:(action:TacticalAction)=>void;onResolve?:(result:TacticalResolution)=>void;
  onChange?:(state:TacticalState)=>void;onSpendRC?:(amount:number)=>void;onApplyLife?:(delta:number)=>void;
}
const numberLabels:Partial<Record<keyof TacticalInputs,string>>={
  incomingDamage:'Dano pós-RD recebido ou iminente',damage:'Dano bruto já rolado',targetRD:'RD do alvo',target2RD:'RD do segundo alvo',healingPool:'Cura já rolada / PV para transferir',allocation:'PV para o primeiro alvo',doses:'Doses locais a consumir',poisonPerDose:'Dano bruto por dose',targetCurrentLife:'Vida atual do alvo',targetVigor:'Vigor do alvo',targetControl:'Controle do alvo',roll:'Resultado natural original',reroll:'Resultado natural rerrolado',rollModifier:'Modificador da rolagem',spentHit:'Acertos bônus a sacrificar',
};
export function TacticalPanel({state:raw,context={},managedTurn=false,onAction,onResolve,onChange,onSpendRC,onApplyLife}:TacticalPanelProps){
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[manualCopy,setManualCopy]=useState(''),[copied,setCopied]=useState(false),[reset,setReset]=useState<'combat'|'session'|''>('');
  const state=normalizeTacticalState(raw),owned=tacticalOwnedTechniques(context),technique=owned.find(item=>item.id===selected)||owned[0],i=state.inputs;
  const preview=technique?tacticalPreview(technique,state,context):null,blocked=technique?tacticalAvailability(technique,state,context):'';
  const dispatch=(action:TacticalAction)=>{
    setCopied(false);setManualCopy('');setError('');
    const result=resolveTactical(state,action,context);if(result.error){setError(result.error);return;}
    if(onAction){onAction(action);return;}
    if(onResolve){onResolve(result);return;}
    onChange?.(result.state);if(result.rcCost)onSpendRC?.(result.rcCost);if(result.lifeDelta)onApplyLife?.(result.lifeDelta);
  };
  const patch=(patch:Partial<TacticalInputs>)=>dispatch({type:'inputs',patch});
  const copy=async()=>{const summary=tacticalSummary(state.latest);try{if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(summary);setCopied(true);setManualCopy('');}catch{setCopied(false);setManualCopy(summary);}};
  const effect=technique?.effect,fields:(keyof TacticalInputs)[]=[];
  if(effect&&['intercept','retaliate','reflect','last-stand','redistribute'].includes(effect)||state.stance||state.aegis)fields.push('incomingDamage');
  if(effect&&['ricochet','drain','capture','push','trap','precision','counter','wave','seismic','flurry','disassemble'].includes(effect)||state.mark)fields.push('damage');
  if(effect&&['reflect','detonate','precision','capture','counter','ricochet','maximum','flurry','disassemble'].includes(effect)||state.trap||state.mark)fields.push('targetRD');
  if(effect&&['ricochet','wave','seismic','disassemble'].includes(effect))fields.push('target2RD');
  if(effect&&['split-heal','transfer'].includes(effect))fields.push('healingPool');
  if(effect==='split-heal')fields.push('allocation');
  if(effect==='detonate')fields.push('doses','poisonPerDose');
  if(effect&&['bind','push','seismic'].includes(effect))fields.push('targetVigor','targetControl','roll');
  if(effect==='capture')fields.push('targetCurrentLife');
  if(effect==='precision')fields.push('spentHit');
  if(effect==='store-natural')fields.push('roll','rollModifier');
  if(effect&&['reroll','ally-reroll','exchange'].includes(effect))fields.push('roll','reroll','rollModifier');
  const confirmation=effect&&['bind','ricochet','drain','capture','push','counter','wave','redistribute','seismic','maximum','flurry','disassemble','mark','exchange'].includes(effect)||Boolean(state.trap)||Boolean(state.mark);
  return <details className="vats-details tactical-panel"><summary>Técnicas de combate <span>{owned.length} adquiridas · turno {state.turn}</span></summary><div className="vats-detail-body">
    <p className="section-help">Uma ação e uma reação táticas por turno. Os controles geram um recibo com os valores finais; alvos e condições são confirmados na mesa.</p>
    {technique?<><label className="field"><span>Técnica adquirida</span><select value={technique.id} onChange={event=>{setSelected(event.target.value);setError('');setCopied(false);setManualCopy('');}}>{owned.map(item=><option key={item.id} value={item.id}>{item.name}{item.existing?' · incluída na perk':''} · {item.rc} RC</option>)}</select></label><p className="section-help">{technique.description}</p>
      <div className="field-grid"><label className="field"><span>Alvo / aliado</span><input value={i.target} maxLength={100} onChange={event=>patch({target:event.target.value})}/></label>{effect&&['split-heal','ricochet','redistribute','wave'].includes(effect)&&<label className="field"><span>Segundo alvo / aliado</span><input value={i.target2} maxLength={100} onChange={event=>patch({target2:event.target.value})}/></label>}
      {[...new Set(fields)].map(key=><label className="field" key={key}><span>{effect==='disassemble'&&key==='target2RD'?'RD própria da arma do alvo':numberLabels[key]}</span><input type="number" step={1} min={key==='rollModifier'?undefined:0} max={key==='doses'?4:key==='spentHit'?20:undefined} value={i[key] as number} onChange={event=>patch({[key]:Number(event.target.value)})}/></label>)}
      {effect==='reroll-damage'&&<><label className="field"><span>Dados de dano originais · separados por vírgula</span><input value={i.damageDice} placeholder="2, 4, 7, 10" onChange={event=>patch({damageDice:event.target.value})}/></label><label className="field"><span>Novos resultados para a metade inferior</span><input value={i.rerollDice} placeholder="8, 9" onChange={event=>patch({rerollDice:event.target.value})}/></label></>}
      </div>
      {confirmation&&<label className="vats-check"><input type="checkbox" checked={i.confirmed} onChange={event=>patch({confirmed:event.target.checked})}/>Acerto, defesa, passagem ou consentimento exigido confirmado na mesa</label>}
      {preview&&<div className="hit-rule"><strong>Prévia da resolução</strong><p>{preview.description}</p><small>{preview.rcCost} RC · {technique.slot==='reaction'?'reação':'ação'} tática{technique.usesSession?' · uma vez por sessão':''}</small></div>}
      <div className="card-actions"><button type="button" disabled={Boolean(blocked)} onClick={()=>dispatch({type:'use',id:technique.id})}>Resolver {technique.name} · {preview?.rcCost||0} RC</button></div>{blocked&&<p className="section-help">{blocked}</p>}
    </>:<p className="section-help">Compre técnicas no catálogo de perks. As exclusivas de atributo do LEVEL 20 também liberam suas próprias ações neste painel, sem compra adicional.</p>}
    {(state.retaliation||state.stance||state.trap||state.binding||state.credit||state.storedNatural!==null||state.aegis||state.mark)&&<div className="tactical-reserves">
      {state.aegis&&<p>Escudo de Cerco Vivo: <b>{state.aegis.remaining} PV</b> até o início de T{state.aegis.until}. <button type="button" onClick={()=>dispatch({type:'resolve-aegis'})}>Absorver impacto informado</button></p>}
      {state.mark&&<p>{state.mark.target}: <b>{state.mark.charges} aberturas</b> até o início de T{state.mark.until}. <button type="button" onClick={()=>dispatch({type:'use-mark'})}>Consumir abertura no ataque confirmado</button></p>}
      {state.retaliation&&<p>Retaliação: <b>{state.retaliation.amount} dano fixo</b> · até o fim de T{state.retaliation.expires-1} <button type="button" onClick={()=>dispatch({type:'release-retaliation'})}>Consumir no próximo ataque</button></p>}
      {state.stance&&<p>Postura: <b>deslocamento 0</b> · {state.stance.charges} impactos restantes · mitiga {state.stance.mitigationPercent}% pós-RD <button type="button" disabled={state.stance.charges<=0} onClick={()=>dispatch({type:'resolve-stance'})}>Resolver impacto informado</button></p>}
      {state.trap&&<p>Armadilha: <b>{state.trap.damage} bruto</b> · até o fim de T{state.trap.expires-1} <button type="button" onClick={()=>dispatch({type:'trigger-trap'})}>Confirmar passagem e consumir</button></p>}
      {state.binding&&<p>{state.binding.target||'Alvo'} preso até o início de T{state.binding.until}. Resistência CD {state.binding.dc}. <button type="button" onClick={()=>dispatch({type:'release-bind'})}>Confirmar libertação</button></p>}
      {state.credit&&<p>Próxima técnica de RC: desconto de <b>{state.credit.amount} RC</b> · até o fim de T{state.credit.expires-1}. A reserva de RC não aumentou.</p>}
      {state.storedNatural!==null&&<p>Natural guardado: <b>{state.storedNatural} de d{state.storedDie}</b> · substituição sem crítico. <button type="button" onClick={()=>dispatch({type:'discard-natural'})}>Descartar reserva</button></p>}
    </div>}
    {error&&<p className="vats-warning" role="status">{error}</p>}
    {state.latest&&<div className="hit-rule"><strong>Última resolução</strong><pre style={{whiteSpace:'pre-wrap'}}>{tacticalSummary(state.latest)}</pre><button type="button" onClick={copy}>{copied?'Resultado copiado':'Copiar resolução'}</button></div>}
    {manualCopy&&<label className="field"><span>Selecione e copie</span><textarea value={manualCopy} rows={6} readOnly onFocus={event=>event.currentTarget.select()}/></label>}
    <details className="combat-detail"><summary>Histórico · {state.log.length} registros</summary><ol className="combat-log">{state.log.map((line,index)=><li key={index} style={{whiteSpace:'pre-wrap'}}>{line}</li>)}</ol></details>
    {managedTurn?<p className="section-help">Usa o turno do VATS. Novo combate mantém limites por sessão; nova sessão os restaura.</p>:<div className="card-actions"><button type="button" onClick={()=>dispatch({type:'turn'})}>Próximo turno</button>{reset?<><span>{reset==='session'?'Iniciar nova sessão e restaurar usos?':'Iniciar novo combate e encerrar reservas?'}</span><button type="button" onClick={()=>{dispatch({type:reset});setReset('');}}>Confirmar</button><button type="button" onClick={()=>setReset('')}>Cancelar</button></>:<><button type="button" onClick={()=>setReset('combat')}>Novo combate</button><button type="button" onClick={()=>setReset('session')}>Nova sessão</button></>}</div>}
  </div></details>;
}
