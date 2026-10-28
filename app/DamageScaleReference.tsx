"use client";
import { useState } from "react";
import { formatDamage } from "./damage-dice";

export function DamageScaleReference() {
  const [steps, setSteps] = useState(5);
  const [copied, setCopied] = useState(false);
  const formula = formatDamage(steps, 0);
  return <article className="damage-scale-reference">
    <b>Dano</b><h3>Escala de dano</h3>
    <p>O primeiro Passo é 1d4. Cada Passo aumenta 2 faces, até 1d100 no Passo 49. Depois, mantenha o d100 e avance outro dado desde d4. O modificador fixo soma uma vez no ataque.</p>
    <div className="field-grid two">
      <label className="field"><span>Passos para consultar</span><input aria-label="Passos para consultar" type="number" min={0} step={1} value={steps} onChange={event => { setSteps(Math.max(0, Math.floor(Number(event.target.value) || 0))); setCopied(false); }} /></label>
      <button className="test-command" type="button" onClick={async () => { try { await navigator.clipboard.writeText(formula); setCopied(true); } catch { setCopied(false); } }}><span>{copied ? "Copiado" : "Copiar dano"}</span><code>{formula}</code></button>
    </div>
    <table><thead><tr><th>Passos</th><th>Dano</th></tr></thead><tbody>{[1, 5, 6, 7, 49, 50, 98].map(value => <tr key={value}><td>{value}</td><td><code>{formatDamage(value, 0)}</code></td></tr>)}</tbody></table>
  </article>;
}
