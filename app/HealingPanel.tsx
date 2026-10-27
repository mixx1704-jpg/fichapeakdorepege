"use client";
import { useState } from 'react';
import { curablePhysicalEffects, healingFormula, healingSpecies, healingSummary, healingTechniques, reconstructableEffects, type HealingTarget } from './healing';
import { isRCSuppressed, penalties, regions, type RegionId, type VatsAction, type VatsConfig, type VatsState } from './vats-engine';

export function HealingPanel({ state: v, config: c, onAction }: { state: VatsState; config: VatsConfig; onAction: (action: VatsAction) => void }) {
  const [techniqueId, setTechniqueId] = useState(''), [ally, setAlly] = useState(false), [target, setTarget] = useState<HealingTarget>('life');
  const [region, setRegion] = useState<RegionId>('torso'), [index, setIndex] = useState(0), [effect, setEffect] = useState(''), [duration, setDuration] = useState(2), [manualCopy, setManualCopy] = useState('');
  const ghoul = healingSpecies.includes(c.species || ''), suppressed = isRCSuppressed(v);
  if (!ghoul && !c.hasKagune) return null;
  const owned = ghoul ? healingTechniques.filter(item => c.powers.includes(item.id)) : [];
  const technique = owned.find(item => item.id === techniqueId) || owned[0];
  const allowed: HealingTarget[] = !technique || technique.kind === 'heal' ? ['life', 'body'] : technique.kind === 'cleanse' ? ['body', 'life'] : technique.kind === 'rebuild' ? ['body', 'part', 'kakuhou'] : ['rc'];
  const selectedTarget = allowed.includes(target) ? target : allowed[0];
  const effects = technique?.kind === 'cleanse' ? curablePhysicalEffects : technique?.kind === 'rebuild' ? reconstructableEffects : [];
  const existingEffects = selectedTarget === 'body' ? v.body[region].effects : v.global;
  const availableEffects = effects.filter(item => ally || existingEffects.includes(item));
  const selectedEffect = availableEffects.includes(effect) ? effect : availableEffects[0] || '';
  const exhausted = penalties(v).exhausted;
  let invalid = '';
  if (technique) {
    if (c.grade < technique.level) invalid = `Requer LEVEL ${technique.level}.`;
    else if (c.vigor < (technique.minVigor||0)) invalid = `Requer Vigor ${technique.minVigor}.`;
    else if (v.activeHealTurn === v.turn) invalid = 'Cura ativa já usada neste turno.';
    else if (technique.kind === 'release' && v.rcRemedyUsed) invalid = 'Desbloqueio já usado nesta sessão.';
    else if (technique.kind !== 'release' && (suppressed || exhausted || c.rc < technique.rc)) invalid = 'RC insuficiente, suprimido ou exaustão.';
    else if (!ally && technique.kind === 'heal' && selectedTarget === 'life' && (!Number.isFinite(c.currentLife) || c.currentLife! >= c.maxLife)) invalid = 'Vida geral cheia ou indisponível.';
    else if (!ally && technique.kind === 'heal' && selectedTarget === 'body' && (v.body[region].destroyed || v.body[region].damage <= 0)) invalid = 'Escolha uma região ferida não destruída.';
    else if (technique.kind === 'cleanse' && !selectedEffect) invalid = 'Não há condição física curável nesse alvo.';
    else if (!ally && technique.kind === 'rebuild' && selectedTarget === 'body' && !v.body[region].destroyed && !selectedEffect) invalid = 'Não há destruição nessa região.';
    else if (!ally && technique.kind === 'rebuild' && selectedTarget === 'part' && (c.colossoActive || !v.parts[index] || (!v.parts[index].ready && v.parts[index].sacrificedUntil <= v.turn))) invalid = c.colossoActive ? 'Desfaça a fusão antes de reconstruir partes.' : 'Escolha uma parte quebrada ou sacrificada.';
    else if (!ally && technique.kind === 'rebuild' && selectedTarget === 'kakuhou' && v.kakuhouUntil <= v.turn) invalid = 'Kakuhou disponível.';
    else if (!ally && technique.kind === 'release' && !suppressed) invalid = 'Não há supressão de RC ativa.';
  }
  const copy = async (text: string) => { try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(text); setManualCopy(''); } catch { setManualCopy(text); } };
  const targetNames: Record<HealingTarget, string> = { life: technique?.kind === 'cleanse' ? 'Estado físico geral' : 'Vida geral', body: 'Uma região corporal', part: 'Uma parte da Kagune', kakuhou: 'Kakuhou', rc: 'Supressão de RC' };
  return <details className="vats-details" open={owned.length>0||suppressed}><summary>Cura e suporte <span>{v.activeHealTurn === v.turn ? 'cura ativa usada' : '1 cura ativa / turno'} · {owned.length} técnicas</span></summary><div className="vats-detail-body">
    <p className="vats-help">Uma técnica ativa por turno, além da regeneração automática. Vida geral e PV das regiões são controles separados: selecione qual receberá a cura. Para aliados, a ficha paga o RC, rola os dados e gera um recibo; aplique o resultado na ficha deles.</p>
    {technique ? <>
      <div className="field-grid"><label className="field"><span>Técnica adquirida</span><select value={technique.id} onChange={event => setTechniqueId(event.target.value)}>{owned.map(item => <option key={item.id} value={item.id}>{item.name} · {healingFormula(item)} · {item.rc} RC</option>)}</select></label>
        <label className="field"><span>Destinatário</span><select value={ally ? 'ally' : 'self'} onChange={event => setAlly(event.target.value === 'ally')}><option value="self">Você</option><option value="ally">Aliado por contato</option></select></label>
        <label className="field"><span>Alvo da técnica</span><select value={selectedTarget} onChange={event => setTarget(event.target.value as HealingTarget)}>{allowed.map(item => <option key={item} value={item}>{targetNames[item]}</option>)}</select></label>
        {selectedTarget === 'body' && <label className="field"><span>Região</span><select value={region} onChange={event => setRegion(event.target.value as RegionId)}>{regions.map(([id, label]) => <option key={id} value={id}>{label}{!ally ? ` · ${v.body[id].destroyed ? 'destruída' : `${Math.floor(v.body[id].damage)} de dano`}` : ''}</option>)}</select></label>}
        {selectedTarget === 'part' && <label className="field"><span>Parte da Kagune</span>{ally ? <input type="number" min={1} step={1} value={index + 1} onChange={event => setIndex(Math.max(0, Math.floor(Number(event.target.value) || 1) - 1))} /> : <select value={index} onChange={event => setIndex(Number(event.target.value))}>{Array.from({ length: c.tails }, (_, i) => <option key={i} value={i}>{v.parts[i]?.name || `Parte ${i + 1}`}</option>)}</select>}</label>}
        {(technique.kind === 'cleanse' || (technique.kind === 'rebuild' && selectedTarget === 'body')) && <label className="field"><span>Condição física</span><select value={selectedEffect} onChange={event => setEffect(event.target.value)}>{!selectedEffect && <option value="">{technique.kind === 'rebuild' ? 'Reconstruir região destruída' : 'Nenhuma condição curável'}</option>}{availableEffects.map(item => <option key={item} value={item}>{item}</option>)}</select></label>}
      </div>
      <p className="vats-help">{technique.description}</p>
      <div className="card-actions"><button type="button" className="blood-button" disabled={Boolean(invalid)} onClick={() => onAction({ type: 'healing-technique', healingId: technique.id, healingTarget: selectedTarget, ally, ...(selectedTarget === 'body' ? { region } : {}), ...(selectedTarget === 'part' ? { index } : {}), ...(selectedEffect ? { effect: selectedEffect } : {}) })}>{technique.kind === 'heal' ? `Rolar ${healingFormula(technique)} e ${ally ? 'gerar cura' : 'curar'}` : 'Aplicar suporte'} · {technique.rc} RC</button>{technique.kind === 'heal' && <button type="button" onClick={() => copy(healingFormula(technique))}>Copiar fórmula</button>}</div>
      {invalid && <p className="vats-help" role="status">{invalid}</p>}
    </> : <p className="vats-help">As técnicas de cura para ghouls ficam no catálogo de perks. Compre uma para usar seus dados e efeitos aqui.</p>}
    {v.healingResult && <div className="hit-rule"><strong>Última técnica · turno {v.healingResult.turn}</strong><pre style={{ whiteSpace: 'pre-wrap' }}>{healingSummary(v.healingResult)}</pre><button type="button" onClick={() => copy(healingSummary(v.healingResult!))}>Copiar resultado completo</button></div>}
    {manualCopy && <label className="field"><span>Selecione e copie o texto</span><textarea readOnly rows={5} value={manualCopy} onFocus={event => event.currentTarget.select()} /></label>}
    <div className="field-grid"><label className="field"><span>Supressão de RC · duração em turnos</span><input type="number" min={1} step={1} value={duration} onChange={event => setDuration(Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></label><button type="button" onClick={() => onAction({ type: 'suppress-rc', amount: duration })}>Registrar supressão de RC</button>{suppressed && <button type="button" onClick={() => onAction({ type: 'suppress-rc', amount: 0 })}>Remover supressão · decisão da mesa</button>}</div>
    <p className="vats-help">{suppressed ? `RC suprimido por ${v.rcSuppressedUntil - v.turn} turno(s). A reserva de ${Math.floor(c.rc)} RC foi preservada; técnicas que a usam ficam bloqueadas.` : 'Sem supressão de RC.'} Desbloqueio de RC funciona sem gasto de RC, uma vez por sessão; não recupera reserva.</p>
  </div></details>;
}
