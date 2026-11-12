"use client";

import { CORTEX_ID, NEUROSE_ID, normalizePeriodicEffects, type PeriodicEffectsState } from './periodics';

export function PeriodicEffectsPanel({ value, turn, onAdvanceTurn, onLongRest, onCombatReset }: {
  value: PeriodicEffectsState; turn: number;
  onAdvanceTurn?: () => void; onLongRest?: () => void; onCombatReset?: () => void;
}) {
  const state = normalizePeriodicEffects(value);
  if (!state.history.length && !state.neuroseEverActivated && !state.cortexLifeLoss) return null;
  return <section className="section-block" aria-label="Efeitos periódicos">
    <div className="section-title"><div><span className="eyebrow">TURNO PRÓPRIO {turn}</span><h2>Efeitos periódicos</h2></div></div>
    <p className="section-help">O primeiro turno é cobrado ao ativar. Cada novo turno próprio cobra uma vez; desativar quita somente eventual dano pendente. Salvar ou recarregar não repete uma cobrança.</p>
    {state.condemned && <p className="vats-warning" role="alert"><strong>Perda definitiva da ficha.</strong> Morte pelo dano craniano da Neurose Forçada. Regeneração, imortalidade e ressurreição não anulam esta consequência. Os dados do personagem permanecem preservados.</p>}
    <div className="field-grid">
      {([NEUROSE_ID,CORTEX_ID] as const).map(id => {
        const entry = state.entries[id];
        if (!entry?.processedCount && !entry?.active) return null;
        return <div className="hit-rule" key={id}><strong>{id === NEUROSE_ID ? 'Neurose Forçada' : 'Córtex em Combustão'} · {entry.active ? 'ativa' : 'inativa'}</strong>
          <p>{entry.formula} · {id === NEUROSE_ID ? 'dano na cabeça' : 'dano direto à Vida, sem RD'}</p>
          <small>Ativada no turno {entry.activatedTurn} · última cobrança: turno {entry.lastProcessedTurn || '—'} · {entry.processedCount} cobranças{entry.dueTurn ? ` · pendente: turno ${entry.dueTurn}` : ''}{entry.active && entry.expiresTurn ? ` · expira no turno ${entry.expiresTurn}` : ''}</small>
        </div>;
      })}
    </div>
    {state.neuroseEverActivated && <p className="section-help">Neurose: a perda de 20% da Vida máxima base é permanente e já foi registrada uma única vez.</p>}
    {state.cortexLifeLoss && <p className="vats-warning">Córtex: −10% de Vida máxima até concluir descanso longo. A redução não acumula entre usos.</p>}
    <div className="card-actions">
      {onAdvanceTurn && <button type="button" disabled={state.condemned} onClick={onAdvanceTurn}>Encerrar turno próprio →</button>}
      {onCombatReset && <button type="button" disabled={state.condemned} onClick={onCombatReset}>Novo combate · renovar uso do Córtex</button>}
      {onLongRest && <button type="button" disabled={state.condemned} onClick={onLongRest}>Concluir descanso longo</button>}
    </div>
    {state.history.length > 0 && <details className="combat-detail"><summary>Histórico de dano · {state.history.length} registros</summary><div className="vats-detail-body">
      {[...state.history].reverse().map(row => <p key={row.id}><strong>T{row.turn} · {row.name}</strong><br/>{row.formula} [{row.dice.join(', ')}] = {row.rawDamage} · {row.appliedDamage} PV aplicados {row.region === 'head' ? 'na cabeça' : 'à Vida atual'}{row.fatal ? ' · fatal' : ''}</p>)}
    </div></details>}
  </section>;
}
