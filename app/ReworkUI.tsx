"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import release from "./release.json";
import { criticalRange, resolveCritical, type CriticalContext, type CriticalSelections } from "./critical";

export const RELEASE = release.release;

export function Modal({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className={`rework-modal ${className}`} onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-label={title}>
    <div className="modal-heading"><div><span>Fome & Justiça</span><h2>{title}</h2></div><button type="button" autoFocus onClick={onClose} aria-label="Fechar janela">×</button></div>{children}
  </dialog>;
}

export function LevelUp({ level, onClose }: { level: number; onClose: () => void }) {
  return <Modal title="Level atualizado" onClose={onClose} className="level-celebration"><div className="level-number"><small>LEVEL</small><strong>{level}</strong></div><p>+1 de Sanidade máxima. Sua Vida e os desbloqueios de habilidades já foram recalculados.</p><button className="primary-action" type="button" onClick={onClose}>Continuar</button></Modal>;
}

export function Rulebook({ onClose }: { onClose: () => void }) {
  return <Modal title="Regras" onClose={onClose}><div className="rulebook-grid"><article><b>Testes</b><h3>Acertos são aditivos</h3><p>Todo teste usa 1d20 + a antiga quantidade de dados + os modificadores. Dados extras de perks agora somam acertos.</p><code>48d8++18&gt;&gt;7 → 1d20+48+18</code></article><article><b>Ghouls</b><h3>Sanidade muda o dado</h3><p>Ghoul, Ghoul Artificial e Ghoul Dominante: acima de 75% usa d30; abaixo de 45%, d10. Nos limites exatos e na faixa intermediária, d20. Controle soma em ataques, bloqueios e esquivas.</p></article><article><b>Recursos</b><h3>Vida por espécie</h3><p>(25 + 3 × Vigor + 2 × Força + LEVEL × fator + bônus fixos) × 1,05^LEVEL. Fatores: Humano 1; Ghoul e Quinx 2; Humano Dominante 3; Ghoul Dominante e Artificial 4. Perks e ajustes da mesa entram na Vida total. Todos os resultados decimais são arredondados para baixo, incluindo Vida, cura, reações, custos e modificadores.</p></article><article><b>Evolução</b><h3>LEVEL 1 a 20</h3><p>Limite de atributo comprado: 11. O modo narrativo libera o limite de atributos compráveis. Cada LEVEL soma +1 à Sanidade máxima. PE excedente continua na barra após evoluir.</p><p>17 → 18: 120 PE. 18 → 19: 150 PE. 19 → 20: 500 PE.</p></article><article><b>Catálogo</b><h3>Perks e bônus</h3><p>Todas as perks ficam juntas no catálogo, com filtros de categoria, família, requisitos e compras. Os bônus calculados aparecem na ficha; permissões e efeitos de mesa estão descritos em cada perk.</p></article><article><b>Críticos</b><h3>Natural do dado</h3><p>No d20, 20 natural é crítico. A perk amplia até 16–20, com compras cumulativas de 30, 40, 50 e 60 PE. No d10/d30 só o máximo natural é crítico. Confirme em Combate para copiar o dano com bônus de Passos.</p></article><article><b>Alvo e suporte</b><h3>Cálculos de combate</h3><p>Penetração usa a maior fonte, até 50% da RD. Venenos têm cargas, resistência e duração. Cura e suporte rolam até 12d12, tratam condições físicas, recuperam Kakuhou e removem supressão de RC. Os painéis ficam em Combate.</p></article><article><b>Kakuja</b><h3>Habilidades autorais</h3><p>Habilidades autorais da Kakuja usam PE-K e funcionam enquanto ela estiver ativa. O orçamento fica separado da Kagune e das Quinques.</p></article></div></Modal>;
}

function rollDie(sides: number) {
  const limit = Math.floor(0x100000000 / sides) * sides;
  const sample = new Uint32Array(1);
  do { crypto.getRandomValues(sample); } while (sample[0] >= limit);
  return sample[0] % sides + 1;
}
export function QuickRoll({ tests, onClose, critical }: { tests: { name: string; formula: string; critical?: boolean }[]; onClose: () => void; critical?: { perks: CriticalSelections; context: CriticalContext } }) {
  const [selected, setSelected] = useState(0), [result, setResult] = useState<{ die: number; total: number } | null>(null);
  const current = tests[selected];
  const match = current?.formula.match(/^1d(10|20|30)((?:[+-]\d+(?:\.\d+)?)*)$/);
  const modifier = match ? (match[2].match(/[+-]\d+(?:\.\d+)?/g) || []).reduce((sum, value) => sum + Math.floor(Number(value)), 0) : 0;
  const isAttack = current?.critical ?? (/ataque|kagune|quinque/i.test(current?.name ?? "") && !/bloqueio|esquiva|desvio|resistência|resistencia/i.test(current?.name ?? ""));
  const sides = match ? Number(match[1]) : 20;
  const range = critical && isAttack ? criticalRange(critical.perks, sides) : null;
  const resolved = result && critical && isAttack ? resolveCritical(result.die, sides, critical.perks, critical.context) : null;
  return <Modal title="Rolagem" onClose={onClose} className="roll-modal"><div className="filter-row">{tests.map((item, index) => <button key={item.name} className={index === selected ? "active" : ""} onClick={() => { setSelected(index); setResult(null); }}>{item.name}</button>)}</div><code className="roll-formula">{current?.formula}</code><div className="roll-result" aria-live="polite" key={`${selected}-${result?.die}-${result?.total}`}><strong>{result ? result.total : "?"}</strong><span>{result ? `Natural: ${result.die} · Modificadores: ${modifier >= 0 ? "+" : ""}${modifier}` : "Pronto para rolar"}</span>{resolved && <b>{resolved.isCritical ? "Crítico natural" : "Rolagem sem crítico"}</b>}</div>{range && <p className="section-help">Crítico: {range.label} no d{range.maximum} · {range.outcomes}/{range.maximum} ({range.chancePercent}%).{sides !== 20 && " Faixa ampliada vale somente no d20."} Modificadores não alteram o valor natural.</p>}<button type="button" className="primary-action" disabled={!match} onClick={() => { const die = rollDie(Number(match![1])); setResult({ die, total: die + modifier }); }}>Rolar {match ? `d${match[1]}` : "teste"}</button>{resolved?.isCritical && <p className="section-help">Crítico: +{resolved.bonuses.stepsPercent}% dos Passos antes de rolar o dano{resolved.bonuses.penetrationPercent > 0 ? `; penetração de ${resolved.bonuses.penetrationPercent}% da RD` : ""}. Confirme o crítico na calculadora de ataque para obter a fórmula completa.</p>}<p className="section-help">O resultado soma um único dado a todos os acertos. Você também pode copiar as fórmulas da ficha para usar no Rollem.</p></Modal>;
}

export function ReleaseWatcher({ canReload }: { canReload: boolean }) {
  const [available, setAvailable] = useState(false), [deferred, setDeferred] = useState(false), [countdown, setCountdown] = useState(15);
  useEffect(() => {
    if (location.protocol === "file:") return;
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(new URL(`system-version.json?t=${Date.now()}`, location.href), { cache: "no-store" });
        if (!response.ok || !response.headers.get("content-type")?.includes("json")) return;
        const version = await response.json();
        if (!cancelled && typeof version.release === "string" && version.release !== RELEASE) setAvailable(true);
      } catch { /* As fichas continuam funcionando offline. */ }
    };
    const interval = window.setInterval(check, 60000);
    const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  useEffect(() => {
    if (!available || deferred || !canReload) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || document.activeElement?.matches("input, textarea, select")) return;
      setCountdown(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [available, deferred, canReload]);
  useEffect(() => { if (available && !deferred && canReload && countdown === 0) location.reload(); }, [available, deferred, canReload, countdown]);
  if (!available) return null;
  return <aside className="release-toast" role="status"><strong>Uma nova versão está pronta</strong><span>{deferred ? "Atualize quando terminar esta ação." : canReload ? `Sua ficha está salva. Atualizando em ${countdown}s.` : "Aguardando o salvamento da ficha."}</span><div><button type="button" disabled={!canReload} onClick={() => location.reload()}>Atualizar agora</button><button type="button" onClick={() => setDeferred(true)}>Depois</button></div></aside>;
}

