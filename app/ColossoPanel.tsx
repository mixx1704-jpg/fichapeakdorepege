"use client";
import { useState } from 'react';
import { colossoSummary, type ColossoResult } from './colosso';

export function ColossoPanel({ result, attackTest, totalRD, onToggle }: { result: ColossoResult; attackTest: string; totalRD?:number; onToggle: (enabled: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  if (!result.purchased) return null;
  return <section className="section-block colosso-panel"><h2>Colosso de Carne</h2>
    <label className="requirement-confirm"><input type="checkbox" checked={result.requested} disabled={!result.ready && !result.requested} onChange={event => onToggle(event.target.checked)} /><span>Fundir as partes disponíveis em uma Kagune</span></label>
    <p className="section-help">{result.active ? 'Fusão ativa.' : result.ready ? 'Fusão disponível.' : 'Manifeste a Kagune e mantenha pelo menos duas partes disponíveis para fundir.'} {result.partCount} partes disponíveis: 1 base + {result.extraParts} extras. Cada 2 extras completas concedem +1 m e +1 acerto de Kagune, com −1 acerto de Agilidade. floor({result.extraParts} ÷ 2) = {result.pairs}.</p>
    <div className="weapon-metrics"><div className="stat"><span>Dano unido</span><strong>{result.damage}</strong></div><div className="stat"><span>Dureza unida</span><strong>{result.durability}</strong></div><div className="stat"><span>RD da Kagune unida</span><strong>{result.rd}</strong></div><div className="stat"><span>Alcance unido</span><strong>{result.range} m</strong></div></div>
    <p className="section-help">Dano: {result.damagePerPart} + {Math.max(0,result.partCount-1)} × ({result.otherPartDamage}). Bônus gerais de personagem entram uma vez no ataque unido; efeitos próprios das partes continuam somando. Dureza: floor({result.durabilitySum} ÷ 2) = {result.durability}. RD: floor({result.rdSum} ÷ 2) = {result.rd}. O RD corporal é somado uma vez. As partes fundidas não atacam nem reservam defesa separadamente; desfazer a fusão preserva nomes, funções e integridade.</p>
    {result.active&&totalRD!==undefined&&<p className="section-help">RD total da ficha, após os demais bônus e porcentagens: <strong>{totalRD}</strong>.</p>}
    {result.active && <><p className="section-help">Acerto unido: {attackTest}. Agilidade, Esquiva e Iniciativa já recebem −{result.agilityPenalty} acertos; o valor comprado do atributo é preservado.</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(colossoSummary(result, attackTest,totalRD)); setCopied(true);setCopyFallback(''); } catch { setCopied(false);setCopyFallback(colossoSummary(result, attackTest,totalRD)); } }}>{copied ? 'Resultado copiado' : 'Copiar resultado da fusão'}</button>{copyFallback&&<label className="field"><span>Selecione o resultado para copiar</span><textarea readOnly value={colossoSummary(result,attackTest,totalRD)} onFocus={event=>event.currentTarget.select()}/></label>}</>}
  </section>;
}
