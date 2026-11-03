"use client";

import { useState } from 'react';
import { newPackDefinition } from './new-pack-catalog';
import { normalizePackConditions, packRCCost, type PackCondition, type PackConditions, type PackControl, type PackEffects, type PackReceipt } from './pack-effects';

export interface PackEffectsPanelProps {
  effects: PackEffects;
  value: PackConditions;
  onChange: (conditions: PackConditions) => void;
  currentRC?: number;
  onRCChange?: (rc: number) => void;
  currentLife?: number;
  maxLife?: number;
  onLifeChange?: (life: number) => void;
}

const whole = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const times = (value: number) => `×${Number(value.toFixed(3)).toLocaleString('pt-BR')}`;
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const bonusLabels = {
  physicalHit: 'Acerto físico', kaguneHit: 'Acerto da Kagune/Quinque', block: 'Bloqueio', dodge: 'Esquiva',
  physicalSteps: 'Passos físicos', kaguneSteps: 'Passos da Kagune/Quinque', rd: 'RD', kaguneRD: 'RD da Kagune/Quinque',
  life: 'Vida máxima', rc: 'RC máximo', regen: 'Regeneração', movement: 'Deslocamento', reactions: 'Reações',
};
const attributeLabels: Record<string, string> = { forca:'Força',vigor:'Vigor',precisao:'Precisão',agilidade:'Agilidade',raciocinio:'Raciocínio',percepcao:'Percepção',presenca:'Presença',controle:'Controle' };

function effectLines(effects: PackEffects) {
  const lines = Object.entries(bonusLabels).flatMap(([key, label]) => {
    const value = effects.bonuses[key as keyof typeof bonusLabels];
    return value ? [`${label}: ${signed(value)}`] : [];
  });
  for (const [key, value] of Object.entries(effects.bonuses.attributes)) if (value) lines.push(`${attributeLabels[key]}: ${signed(value)}`);
  for (const [key, value] of Object.entries(effects.bonuses.attributeChecks)) if (value) lines.push(`Teste de ${attributeLabels[key]}: ${signed(value)}`);
  if (effects.bonuses.range) lines.push(`Alcance: ${signed(effects.bonuses.range)} m`);
  if (effects.rdSacrifice) lines.push(`RD sacrificada: −${effects.rdSacrifice} (já descontada)`);
  for (const [label, value] of [
    ['Dano físico', effects.damageMultiplier.physical], ['Dano de Kagune/Quinque', effects.damageMultiplier.kagune],
    ['Dano contra estruturas', effects.structureDamageMultiplier], ['RD', effects.rdMultiplier], ['RD da Kagune/Quinque', effects.kaguneRDMultiplier],
    ['Vida máxima', effects.lifeMultiplier], ['RC máximo', effects.rcMultiplier], ['Regeneração', effects.regenMultiplier],
    ['Alcance', effects.rangeMultiplier], ['Deslocamento', effects.movementMultiplier], ['Custo de RC', effects.rcCostMultiplier],
    ['Cura recebida', effects.healingReceivedMultiplier],
  ] as Array<[string, number]>) if (value !== 1) lines.push(`${label}: ${times(value)}`);
  if (effects.penetrationPercent) lines.push(`Penetração: ${effects.penetrationPercent}%`);
  if (effects.targetRDReduction) lines.push(`RD do alvo contra você: −${effects.targetRDReduction}`);
  if (effects.rcDiscount) lines.push(`Desconto de RC: −${effects.rcDiscount}`);
  if (effects.rcCostIncrease) lines.push(`Custo de RC: +${effects.rcCostIncrease}`);
  if (effects.regenRCDiscount) lines.push(`Desconto de RC na regeneração: −${effects.regenRCDiscount}`);
  if (effects.blockAttribute) lines.push('Bloqueio usa Controle no lugar de Vigor');
  if (effects.temporaryLifeCapMultiplier !== 1) lines.push(`Teto de Vida temporária: ${times(effects.temporaryLifeCapMultiplier)}`);
  if (effects.temporaryRCCapMultiplier !== 1) lines.push(`Teto temporário de RC: ${times(effects.temporaryRCCapMultiplier)}`);
  return lines;
}

export function PackEffectsPanel({ effects, value, onChange, currentRC, onRCChange, currentLife, maxLife, onLifeChange }: PackEffectsPanelProps) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [fallback, setFallback] = useState('');
  const [payment, setPayment] = useState('');
  const conditions = normalizePackConditions(value);
  const lines = effectLines(effects);
  if (!effects.eligiblePerkIds.length) return null;
  const permissions = effects.permissions.filter(permission => permission.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')));
  const copy = async (key: string, text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(text);
      setCopied(key); setFallback('');
    } catch { setCopied(''); setFallback(text); }
  };
  const patch = (control: PackControl, nextValue: string | number | boolean) => {
    const previous = conditions[control.perkId] || {};
    const next: PackCondition = { ...previous, [control.key]: nextValue };
    setCopied(''); setPayment('');
    onChange(normalizePackConditions({ ...conditions, [control.perkId]: next }));
  };
  const clear = (perkId?: string) => {
    setCopied(''); setPayment(''); setFallback('');
    if (!perkId) { onChange({}); return; }
    const next = { ...conditions }; delete next[perkId]; onChange(next);
  };
  const controlValue = (control: PackControl) => conditions[control.perkId]?.[control.key] ?? control.defaultValue ?? (control.type === 'toggle' ? false : control.type === 'counter' ? 0 : 'none');
  const receiptText = (receipt: PackReceipt) => [
    receipt.label,
    receipt.costRC ? `Custo: ${packRCCost(receipt.costRC, effects)} RC${packRCCost(receipt.costRC,effects) !== receipt.costRC ? ` (${receipt.costRC} antes dos modificadores)` : ''}.` : '',
    receipt.costLife ? `Sacrifício: ${whole(receipt.costLife)} Vida.` : '',
    receipt.heal ? `Cura: ${whole(receipt.heal)} Vida, até a Vida faltante.` : '',
    receipt.restoreRC ? `Recuperação: ${whole(receipt.restoreRC)} RC, até a reserva máxima.` : '',
    receipt.amount !== undefined ? `Valor calculado: ${whole(receipt.amount)}.` : '',
    receipt.limit || '',
  ].filter(Boolean).join('\n');
  const pay = (receipt: PackReceipt) => {
    if (receipt.disabled) return;
    const rc = receipt.costRC ? packRCCost(receipt.costRC, effects) : 0;
    const life = whole(receipt.costLife);
    if ((rc && (currentRC === undefined || !onRCChange || currentRC < rc)) || (life && (currentLife === undefined || !onLifeChange || currentLife <= life))) return;
    if (rc && onRCChange && currentRC !== undefined) onRCChange(Math.max(0, whole(currentRC) - rc));
    if (life && onLifeChange && currentLife !== undefined) onLifeChange(Math.max(1, whole(currentLife) - life));
    setPayment(`Gasto registrado: ${[rc ? `${rc} RC` : '', life ? `${life} Vida` : ''].filter(Boolean).join(' e ')}. A condição e os usos continuam sob seu controle.`);
  };
  const summary = ['Habilidades em combate', ...lines, 'Condições confirmadas:', ...effects.permissions.map(permission => {
    const controls = effects.controls.filter(control => control.perkId === permission.perkId);
    return `${permission.name}${controls.length ? ` — ${controls.map(control => {
      const selectedValue = controlValue(control);
      const display = control.type === 'toggle' ? selectedValue ? 'sim' : 'não' : control.options?.find(option => option.value === selectedValue)?.label || selectedValue;
      return `${control.label}: ${display}`;
    }).join('; ')}` : ''}`;
  }), ...effects.receipts.map(receiptText), effects.rules.replace('deste pacote', 'destas habilidades')].join('\n');

  return <details className="vats-details pack-effects-panel">
    <summary>Habilidades em combate <span>{effects.eligiblePerkIds.length} adquiridas</span></summary>
    <div className="vats-detail-body">
      <p className="section-help">Marque as condições confirmadas na mesa. Os valores entram nos cálculos da ficha; trocar uma condição não gasta RC ou Vida.</p>
      <div className="card-actions"><button type="button" onClick={() => copy('all', summary)}>{copied === 'all' ? 'Resumo copiado' : 'Copiar resumo'}</button><button type="button" onClick={() => clear()}>Limpar condições</button></div>
      {lines.length > 0 && <div className="hit-rule"><strong>Aplicado nesta ficha</strong><p style={{ whiteSpace: 'pre-wrap' }}>{lines.join(' · ')}</p><small>Multiplicadores de dano incidem após rolar, antes de descontar a RD. Os demais valores já aparecem nos totais correspondentes.</small></div>}
      <label className="field"><span>Buscar entre suas habilidades</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome da habilidade" /></label>
      {permissions.map(permission => {
        const controls = effects.controls.filter(control => control.perkId === permission.perkId);
        const receipts = effects.receipts.filter(receipt => receipt.perkId === permission.perkId);
        const definition = newPackDefinition(permission.perkId);
        const key = permission.perkId;
        return <details className="combat-detail" key={key}>
          <summary>{permission.name}{effects.activePerkIds.includes(key) && <span> · em efeito</span>}{effects.pendingPerkIds.includes(key) && <span> · texto incompleto</span>}</summary>
          <p className="section-help" style={{ whiteSpace: 'pre-wrap' }}>{permission.text}</p>
          {definition?.pendingClarification && <p role="status" className="vats-warning">{definition.pendingClarification}</p>}
          {controls.some(control => control.type !== 'toggle') && <div className="field-grid">{controls.filter(control => control.type !== 'toggle').map(control => <label className="field" key={`${key}-${control.key}`}>
            <span>{control.label}</span>{control.type === 'select' ? <select value={String(controlValue(control))} onChange={event => patch(control, event.target.value)}>{control.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
              : <input type="number" min={control.min ?? 0} max={control.max} step={1} value={Number(controlValue(control))} onChange={event => patch(control, Math.min(control.max ?? 999999, Math.max(control.min ?? 0, whole(event.target.value))))} />}
          </label>)}</div>}
          {controls.filter(control => control.type === 'toggle').map(control => <label className="vats-check" key={`${key}-${control.key}`}><input type="checkbox" checked={Boolean(controlValue(control))} onChange={event => patch(control, event.target.checked)} />{control.label}</label>)}
          {receipts.map((receipt, index) => {
            const rc = receipt.costRC ? packRCCost(receipt.costRC, effects) : 0;
            const life = whole(receipt.costLife);
            const canPay = !receipt.disabled && (!rc || (currentRC !== undefined && !!onRCChange && currentRC >= rc)) && (!life || (currentLife !== undefined && !!onLifeChange && currentLife > life));
            const showPayment = (rc > 0 && onRCChange && currentRC !== undefined) || (life > 0 && onLifeChange && currentLife !== undefined);
            return <div className="hit-rule" key={`${key}-receipt-${index}`}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{receiptText(receipt)}</p>
              <div className="card-actions"><button type="button" disabled={receipt.disabled} onClick={() => copy(`${key}-${index}`, `${permission.name}\n${receiptText(receipt)}`)}>{copied === `${key}-${index}` ? 'Resultado copiado' : 'Copiar resultado'}</button>
                {showPayment && <button type="button" disabled={!canPay} onClick={() => pay(receipt)}>Registrar gasto: {[rc ? `${rc} RC` : '', life ? `${life} Vida` : ''].filter(Boolean).join(' + ')}</button>}
              </div>
              {receipt.disabled ? <small>{receipt.disabledReason || 'Esta habilidade não está disponível agora.'}</small> : showPayment && !canPay && <small>Recursos insuficientes ou sacrifício que deixaria sua Vida em 0.</small>}
            </div>;
          })}
          <div className="card-actions"><button type="button" onClick={() => copy(key, `${permission.name}\n${permission.text}`)}>{copied === key ? 'Regra copiada' : 'Copiar regra'}</button>{Object.keys(conditions[key] || {}).length > 0 && <button type="button" onClick={() => clear(key)}>Limpar esta condição</button>}</div>
        </details>;
      })}
      {!permissions.length && <p className="section-help">Nenhuma habilidade com esse nome.</p>}
      {payment && <p className="section-help" role="status">{payment}{maxLife !== undefined ? ` Vida máxima de referência: ${whole(maxLife)}.` : ''}</p>}
      {effects.bonuses.reactions > 0 && <p className="section-help">Reações extras: registre a utilização na mesa. Isso não reinicia as técnicas já utilizadas.</p>}
      <details className="combat-detail"><summary>Regras de cálculo</summary><p className="section-help">{effects.rules.replace('deste pacote', 'destas habilidades')}</p><p className="section-help">Condições, cargas, duração e limites de uso são registrados por você. Curas e recuperações geram resultados para copiar e aplicar uma vez em Combate. Registrar gasto apenas desconta o recurso informado.</p></details>
      {fallback && <label className="field"><span>Selecione e copie o resultado</span><textarea value={fallback} rows={7} readOnly onFocus={event => event.currentTarget.select()} /></label>}
    </div>
  </details>;
}
