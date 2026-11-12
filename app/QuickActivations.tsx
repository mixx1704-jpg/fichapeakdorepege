"use client";
import { customSkillRequiresActivation, type CustomSkill } from "./CustomSkillsPanel";
import { isConditionalCatalogEntry } from "./catalog-filters";
import type { Evolution, KaguneEffect, Perk } from "./data";

export function QuickCustomSkills({ skills, onChange, label }: { skills: CustomSkill[]; onChange: (skills: CustomSkill[]) => void; label: string }) {
  const visible = skills.filter(customSkillRequiresActivation);
  if (!visible.length) return null;
  return <section className="section-block quick-activations"><h2>Ativações rápidas · {label}</h2><p className="section-help">Os controles usam o mesmo estado salvo no editor autoral. Confira custos, duração e condições na descrição.</p><div className="quick-activation-grid">{visible.map(skill => <label key={skill.id} className={`requirement-confirm quick-activation ${skill.enabled ? "active" : ""}`}><input type="checkbox" checked={skill.enabled} onChange={e => onChange(skills.map(item => item.id === skill.id ? { ...item, enabled: e.target.checked } : item))} /><span><b>{skill.name || "Habilidade autoral"}</b><small>{skill.description || "Habilidade autoral com ativação manual."}</small><em>{skill.enabled ? "Ativa" : "Inativa"} · {skill.cost} PE</em></span></label>)}</div></section>;
}

/** Tracking for narrative triggers that have no numerical automation in the attack calculator. */
export function QuickRuleConditions({ items, active, onToggle }: { items: Array<Perk | KaguneEffect | Evolution>; active: Record<string, boolean>; onToggle: (id: string) => void }) {
  const visible = items.filter(item => isConditionalCatalogEntry({ ...item, cost: "cost" in item ? item.cost : 0 }));
  if (!visible.length) return null;
  return <details className="section-block quick-rule-conditions"><summary>Outras condições e habilidades · {visible.length}</summary><p className="section-help">Marcadores para acompanhar gatilhos e efeitos narrativos. A descrição informa os custos e limites; estes marcadores não acrescentam bônus numéricos.</p><div className="quick-activation-grid">{visible.map(item => <label className="requirement-confirm quick-activation" key={item.id}><input type="checkbox" checked={!!active[`tracking:${item.id}`]} onChange={() => onToggle(item.id)} /><span><b>{item.name}</b><small>{item.description}</small></span></label>)}</div></details>;
}
