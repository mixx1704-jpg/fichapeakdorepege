"use client";

import { useId, useState } from "react";
import { poisonNames, poisonPreview, poisonResistance, poisonRules, poisonSummary, type PoisonAction, type PoisonConfig, type PoisonKind, type PoisonState } from "./poison";

export interface PoisonPanelProps {
  state: PoisonState;
  config: PoisonConfig;
  onAction: (action: PoisonAction) => void;
  onCopy?: (text: string) => void | Promise<void>;
  showTargetFields?: boolean;
}

export function PoisonPanel({ state, config, onAction, onCopy, showTargetFields = true }: PoisonPanelProps) {
  const id = useId();
  const [roll, setRoll] = useState(10), [resistanceMode, setResistanceMode] = useState<"failed" | "resisted" | "roll">("failed"), [copyStatus, setCopyStatus] = useState(""), [showCopyFallback, setShowCopyFallback] = useState(false);
  const preview = poisonPreview(state, config), rules = poisonRules(config), summary = poisonSummary(state, config), resistance = poisonResistance(state.target, config, roll);
  const copy = async () => {
    try {
      if (onCopy) await onCopy(summary);
      else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) await navigator.clipboard.writeText(summary);
      else throw new Error("Clipboard unavailable");
      setCopyStatus("Resumo copiado.");
    } catch {
      setCopyStatus("Selecione o resumo abaixo e copie.");
      setShowCopyFallback(true);
    }
  };
  return <section className="section-block poison-panel" aria-labelledby={`${id}-heading`}>
    <div className="section-heading"><div><h2 id={`${id}-heading`}>Veneno</h2><p className="section-help">Registre o efeito no alvo e copie os valores para a mesa.</p></div><button type="button" onClick={copy}>Copiar resumo</button></div>
    {showTargetFields && <div className="poison-target-fields" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
      <label className="field"><span>Alvo</span><input aria-label="Nome do alvo do veneno" value={state.target.name} maxLength={100} onChange={event => onAction({ type: "target", patch: { name: event.target.value } })} /></label>
      {([["maxLife", "Vida máxima"], ["rd", "RD"], ["vigor", "Vigor"], ["control", "Controle"]] as const).map(([key, label]) => <label className="field" key={key}><span>{label} do alvo</span><input aria-label={`${label} do alvo do veneno`} type="number" min={0} step={1} value={state.target[key]} onChange={event => onAction({ type: "target", patch: { [key]: Number(event.target.value) } })} /></label>)}
    </div>}
    <div className="poison-controls" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginTop: 16 }}>
      <label className="field"><span>Tipo</span><select value={state.kind} onChange={event => onAction({ type: "kind", kind: event.target.value as PoisonKind })}>{preview.allowedKinds.map(kind => <option key={kind} value={kind}>{poisonNames[kind]}</option>)}{!preview.allowedKinds.includes(state.kind) && <option value={state.kind}>{poisonNames[state.kind]} · dose existente</option>}</select></label>
      <div><b>{preview.stacks} / {preview.maxStacks}</b><p className="section-help">Acúmulos</p></div>
      <div><b>{preview.remaining} turnos</b><p className="section-help">Duração restante</p></div>
      <div><b>Turno {state.turn}</b><p className="section-help">{state.totalDamage} dano registrado</p></div>
    </div>
    <p className="section-help">{preview.active ? "Alterar o tipo encerra todas as doses anteriores. " : ""}Uma nova dose aceita acrescenta 1 acúmulo e renova a duração para {rules.duration} turnos. Só um tipo fica ativo neste alvo.</p>
    <div className="poison-effect-preview" role="status" style={{ border: "1px solid var(--line)", borderRadius: 7, padding: 14, margin: "14px 0" }}>
      {state.kind === "toxic" ? <><strong>{preview.damage} dano por turno</strong><p>{preview.percent}% de {state.target.maxLife} PV ({preview.rawDamage}) − metade da RD ({preview.mitigation}).</p><small>{preview.potencyPercent}% por acúmulo; dano mínimo 0.</small></> : state.kind === "neurotoxic" ? <><strong>−{preview.accuracyPenalty} acertos</strong><p>Aplica a ataque e desvio enquanto houver duração. Não remove ações e não causa dano direto.</p><small>Controle ÷ 3, arredondado para baixo, por acúmulo; máximo 10.</small></> : <><strong>−{preview.rdReductionPercent}% da RD do alvo</strong><p>{preview.rdIgnored} RD ignorada; RD restante {preview.effectiveRD}.</p><small>5% por acúmulo, máximo 20%. Use a maior penetração disponível; não some fontes. Nenhum dano direto.</small></>}
    </div>
    <div className="poison-dose" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
      <label className="field"><span>Resistência do alvo</span><select value={resistanceMode} onChange={event => setResistanceMode(event.target.value as typeof resistanceMode)}><option value="failed">Não resistiu · confirmado pela mesa</option><option value="resisted">Resistiu · confirmado pela mesa</option><option value="roll">Conferir resultado do d20</option></select></label>
      {resistanceMode === "roll" && <label className="field"><span>Resultado do d20</span><input aria-label="Resultado do dado de resistência" type="number" min={1} max={20} step={1} value={roll} onChange={event => setRoll(Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /></label>}
      <button type="button" disabled={!preview.canDose} onClick={() => onAction(resistanceMode === "roll" ? { type: "dose", roll } : { type: "dose", resisted: resistanceMode === "resisted" })}>Registrar dose</button>
      <button type="button" disabled={!preview.active} onClick={() => onAction({ type: "turn" })}>Encerrar turno do alvo</button>
      <button type="button" disabled={!preview.active} onClick={() => onAction({ type: "clear" })}>Encerrar veneno</button>
    </div>
    <p className="section-help">Resistência: <code>{preview.resistanceTest}</code> contra CD {preview.resistanceDC}. Vigor + Controle do alvo. Sucesso impede a nova dose; o veneno já aplicado continua.{resistanceMode === "roll" && ` Resultado: ${resistance.die} + ${resistance.modifier} = ${resistance.total}; ${resistance.resisted ? "resistiu" : "não resistiu"}.`}</p>
    {!config.enabled && <p className="section-help">Compre uma perk de veneno compatível e ative a arma para aplicar doses. Efeitos já registrados podem ser encerrados normalmente.</p>}
    <p className="section-help">Ao encerrar turno, o efeito é registrado uma vez e a duração diminui em 1. Vida e RC da sua ficha não são alterados.</p>
    <details className="poison-copy" open={showCopyFallback || undefined} style={{ marginTop: 14 }}><summary>Resumo para copiar</summary><textarea aria-label="Resumo copiável do veneno" readOnly value={summary} rows={5} onFocus={event => event.currentTarget.select()} style={{ width: "100%", marginTop: 10, resize: "vertical" }} /></details>
    {copyStatus && <p role="status" className="section-help">{copyStatus}</p>}
    <details className="poison-log" style={{ marginTop: 14 }}><summary>Registro de veneno ({state.log.length})</summary><ol className="combat-log">{state.log.length ? state.log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>) : <li>Nenhuma dose registrada.</li>}</ol></details>
  </section>;
}
