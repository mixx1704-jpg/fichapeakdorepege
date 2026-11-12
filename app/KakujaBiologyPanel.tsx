"use client";
import {useEffect,useState} from 'react';
import {kakujaIncoming,kakujaOutgoing,kakujaPartition,kakujaRecovery,type KakujaBiology} from './kakuja-biology';

const whole=(v:string)=>Math.max(0,Math.floor(Number(v)||0));
export function KakujaBiologyPanel({bio,rd,rdDisabled=false,ownDurability,reserve,range,movement,regeneration,maxLife,penetration=0,damageFormula,damageMultiplier=1}:{bio:KakujaBiology;rd:number;rdDisabled?:boolean;ownDurability:number;reserve:number;range:number;movement:number;regeneration:number;maxLife:number;penetration?:number;damageFormula?:(extraPenetration:number)=>string;damageMultiplier?:number}){
  const [raw,setRaw]=useState(400),[enemyRD,setEnemyRD]=useState(80),[otherPen,setOtherPen]=useState(0);
  const [incoming,setIncoming]=useState(400),[criticalExtra,setCriticalExtra]=useState(0),[rdOverride,setRDOverride]=useState<number|null>(null),[periodic,setPeriodic]=useState(false);
  const [actualDamage,setActualDamage]=useState(0),[healed,setHealed]=useState(0),[missing,setMissing]=useState(0),[allyMissing,setAllyMissing]=useState(0),[missingShell,setMissingShell]=useState(0),[regen,setRegen]=useState<number|null>(null);
  const [shares,setShares]=useState([50,30,20]),[splitRDs,setSplitRDs]=useState([80,80,80]);
  const [copied,setCopied]=useState('');
  const formula=damageFormula?.(otherPen);
  useEffect(()=>{if(formula)setRaw(0);},[formula]);
  if(!bio.names.length)return null;
  const effectiveRegen=regen??regeneration,usedRD=rdDisabled?0:rdOverride??rd;
  const factor=Number.isFinite(damageMultiplier)?Math.max(0,damageMultiplier):1;
  const multipliedRaw=Math.floor(raw*factor);
  const attack=kakujaOutgoing(multipliedRaw,enemyRD,bio,penetration+otherPen);
  const defense=kakujaIncoming(incoming,criticalExtra,usedRD,bio,periodic);
  const recovery=kakujaRecovery(bio,{regeneration:effectiveRegen,actualHealed:healed,actualEnemyDamage:actualDamage,maxLife,missingLife:missing,allyMissingLife:allyMissing,missingDurability:missingShell,ownDurability});
  const splitValid=shares.reduce((a,b)=>a+b,0)<=100;
  const split=bio.splitTargets>1&&splitValid?kakujaPartition(multipliedRaw,shares,splitRDs,bio,penetration+otherPen):[];
  const attackReceipt=`Kakuja: ${formula?`rolar ${formula}; `:''}${raw}${factor!==1?` × ${factor.toLocaleString('pt-BR')} = ${multipliedRaw}`:''} dano bruto; RD ${enemyRD}, penetração ${attack.penetration}% (${attack.ignoredRD} ignorada); RD efetiva ${attack.effectiveRD}; dano ${attack.damage}.${attack.excessStepsPercent?` O excesso de ${attack.excessStepsPercent}% já está na fórmula de Passos; não multiplique o dano bruto por esse percentual.`:''}${attack.followup?` Queima ${attack.followup} no próximo turno do alvo, uma vez por turno; substitui queima menor, sem crítico ou gatilhos.`:''}`;
  const defenseReceipt=`Kakuja: base ${incoming} + adicional crítico ${criticalExtra}; ${defense.criticalPrevented} do adicional crítico prevenidos. RD ${usedRD}; sobram ${defense.afterRD}; maior resistência/redução ${defense.reduction}% previne ${defense.prevented}; aplicar ${defense.damage} uma vez à Vida ou região atingida.`;
  const recoveryReceipt=`Kakuja — recuperação do turno\nRegeneração passiva de referência: ${effectiveRegen}. Enxerto a um ghoul aliado: ${recovery.support} PV.\nDreno de um único dano real a inimigo: ${recovery.drain} PV; máximo de 10% da Vida máxima por turno.\nReparo da Dureza própria: ${recovery.repair}.\nCada parcela respeita a falta informada. Enxerto e dreno só uma vez por turno, sem cadeias; registre cada resultado uma vez no alvo correspondente.`;
  const copy=async(key:string,text:string)=>{try{await navigator.clipboard.writeText(text);setCopied(key);}catch{setCopied('');}};
  const input=(label:string,value:number,set:(v:number)=>void)=><label className="field"><span>{label}</span><input type="number" min={0} step={1} value={value} onChange={e=>set(whole(e.target.value))}/></label>;
  return <section className="section-block kakuja-biology">
    <div className="kakuja-section-title"><div><h3>Anatomia</h3><p className="section-help">Passivas aplicadas à forma manifestada. Copie a resolução e registre o resultado em Combate.</p></div><small>{bio.names.length} propriedades</small></div>
    <div className="kakuja-card-meta"><span>Alcance {range} m</span><span>Deslocamento {movement} espaços</span><span>Penetração {penetration+bio.penetration}%</span><span>Redução pós-RD {bio.postRDReduction}%</span><span>Reserva {reserve} RC</span></div>
    <details><summary>Capacidades do corpo</summary><div className="kakuja-biological-notes">{bio.permissions.map(text=><p key={text}>{text}</p>)}</div><p className="section-help">Voo, cobertura, ancoragem, olhos externos e origem dos ataques são permissões para usar na mesa. O corpo remoto compartilha ações e recebe dano pelo dono; não cria uma segunda reserva de Vida.</p></details>
    <div className="kakuja-card-meta"><span>Passos +{bio.stepsPercent}%</span><span>RD +{bio.rdPercent}%</span><span>Dureza própria +{bio.durabilityPercent}%</span><span>Reserva +{bio.reservePercent}%</span><span>Regeneração +{bio.regenerationPercent}%</span>{bio.corePenalty>0&&<span>Alvo interno: −{bio.corePenalty} acertos com carapaça íntegra</span>}{bio.remoteRange>0&&<span>Órgão remoto: {bio.remoteRange} m · Dureza {ownDurability}</span>}</div>
    <details className="kakuja-calculator"><summary>Resolver ataque</summary>
      {formula&&<p className="section-help">Dano para rolar com todas as fontes de penetração: <code>{formula}</code>{factor!==1?` · depois de rolar, ×${factor.toLocaleString('pt-BR')} antes da RD (já calculado abaixo)`:''}. Alterar a fórmula zera o resultado anterior.</p>}
      <div className="field-grid three">{input('Dano bruto rolado',raw,setRaw)}{input('RD do alvo',enemyRD,setEnemyRD)}{input('Outra penetração (%)',otherPen,v=>{setOtherPen(v);setRaw(0);})}</div>
      <p className="kakuja-receipt">{attackReceipt}</p><button type="button" onClick={()=>copy('attack',attackReceipt)}>{copied==='attack'?'Copiado':'Copiar ataque'}</button>
      {bio.splitTargets>1&&<div><p>Polimorfia: divida uma única rolagem entre até três alvos. Só um deles pode gerar queima, dreno ou outro gatilho.</p><div className="field-grid three">{shares.map((value,index)=><div key={index}>{input(`Alvo ${index+1} · parcela (%)`,value,v=>setShares(shares.map((x,i)=>i===index?Math.min(100,v):x)))}{input(`Alvo ${index+1} · RD`,splitRDs[index],v=>setSplitRDs(splitRDs.map((x,i)=>i===index?v:x)))}</div>)}</div>{!splitValid?<p role="alert">As parcelas precisam somar no máximo 100%.</p>:<><p>{split.map((part,index)=>`Alvo ${index+1}: ${part.raw} bruto − ${part.effectiveRD} RD = ${part.damage}`).join(' · ')}</p><button type="button" onClick={()=>copy('split',`Polimorfia: uma ação, ${multipliedRaw} bruto dividido em ${shares.join('/')}%.\n${split.map((part,index)=>`Alvo ${index+1}: ${part.raw} bruto, RD efetiva ${part.effectiveRD}, dano ${part.damage}.`).join('\n')}\nSó um alvo gera gatilhos. Sem dano extra por arredondamento.`)}>{copied==='split'?'Copiado':'Copiar divisão'}</button></>}</div>}
    </details>
    <details className="kakuja-calculator"><summary>Resolver dano recebido</summary>
      <div className="field-grid three">{input('Dano base recebido',incoming,setIncoming)}{input('Adicional de crítico',criticalExtra,setCriticalExtra)}{input('RD usada nesta defesa',usedRD,setRDOverride)}</div>
      <label className="vats-check"><input type="checkbox" checked={periodic} onChange={e=>setPeriodic(e.target.checked)}/>Dano periódico: veneno, sangramento ou queimadura</label><p className="kakuja-receipt">{defenseReceipt}</p><p className="section-help">Informe o adicional crítico separado da base. Use esta redução ou a maior equivalente; não reduza novamente no VATS nem some a absorção de Soberano Eterno ao mesmo impacto.</p><button type="button" onClick={()=>copy('defense',defenseReceipt)}>{copied==='defense'?'Copiado':'Copiar defesa'}</button>
      {rdDisabled&&<p className="section-help">RD zerada por condição ativa; ajustes manuais não reativam a armadura durante esse efeito.</p>}
    </details>
    {(bio.supportPercent>0||bio.drainPercent>0||bio.repairPercent>0)&&<details className="kakuja-calculator"><summary>Resolver regeneração, enxerto e reparo</summary>
      <div className="field-grid three">{input('Regeneração passiva efetiva do turno',effectiveRegen,setRegen)}{input('Vida faltante do aliado',allyMissing,setAllyMissing)}{input('Vida realmente curada neste turno',healed,setHealed)}{input('Dano real a um inimigo',actualDamage,setActualDamage)}{input('Sua Vida faltante',missing,v=>setMissing(Math.min(maxLife,v)))}{input('Dureza própria faltante',missingShell,v=>setMissingShell(Math.min(ownDurability,v)))}</div>
      <p>Enxerto <b>{recovery.support}</b> PV · Dreno <b>{recovery.drain}</b> PV · Reparo <b>{recovery.repair}</b> Dureza</p><p className="section-help">A referência do enxerto é só a regeneração passiva após estados, mesmo com Vida cheia; exclui dreno, enxertos e curas recebidas. Reparo usa Vida realmente recuperada, até a Dureza {ownDurability}. Não reconstrói órgãos destruídos.</p><button type="button" onClick={()=>copy('recovery',recoveryReceipt)}>{copied==='recovery'?'Copiado':'Copiar recuperação'}</button>
    </details>}
  </section>;
}
