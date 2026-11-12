"use client";

import { normalizePEHistory, type PERewardRecord } from './pe-rewards';

export function PEHistoryPanel({ value, multiplier = 1, sources = [], onUndo }: {
  value: PERewardRecord[]; multiplier?: number; sources?: readonly string[];
  onUndo?: (id: string) => void;
}) {
  const history = normalizePEHistory(value);
  const number = (amount: number) => amount.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return <details className="combat-detail"><summary>Histórico de PE · {history.length} concessões</summary>
    <div className="vats-detail-body">
      <p className="section-help">Próxima recompensa: ×{number(multiplier)}{sources.length ? ` · ${sources.join(', ')}` : ' · sem modificador de ganho'}. Digite o valor original recebido; o multiplicador afeta somente a nova recompensa. Correções manuais de saldo permanecem sem multiplicação.</p>
      {!history.length && <p className="section-help">Nenhuma nova recompensa registrada. O saldo de fichas anteriores foi preservado.</p>}
      {[...history].reverse().map(row => <div className="hit-rule" key={row.id}>
        <strong>{number(row.original)} PE ×{number(row.multiplier)} = {number(row.received)} PE {row.reversed ? '· revertida' : 'recebidos'}</strong>
        <p>{row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : 'Data não informada'} · {row.sources.length ? row.sources.join(', ') : 'Recompensa normal'}</p>
        {row.reversed ? <small>Revertidos exatamente {number(row.received)} PE{row.reversedAt ? ` em ${new Date(row.reversedAt).toLocaleString('pt-BR')}` : ''}. O histórico foi mantido.</small>
          : onUndo && <button type="button" onClick={() => onUndo(row.id)}>Reverter {number(row.received)} PE</button>}
      </div>)}
      {history.length > 0 && <p className="section-help">Reverter mantém o nível e as compras atuais, remove o valor efetivamente concedido e ajusta o progresso. Se necessário, a ficha mostra o saldo em falta.</p>}
    </div>
  </details>;
}
