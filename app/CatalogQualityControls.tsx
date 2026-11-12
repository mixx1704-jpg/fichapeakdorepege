"use client";
import { catalogEffectOptions, catalogSortOptions, type CatalogActivation, type CatalogEffect, type CatalogSort } from "./catalog-filters";

export type CatalogQualityState = { effect: CatalogEffect; sort: CatalogSort; activation: CatalogActivation };
export const defaultCatalogQuality: CatalogQualityState = { effect: "all", sort: "level", activation: "all" };

export function CatalogQualityControls({ value, onChange }: { value: CatalogQualityState; onChange: (value: CatalogQualityState) => void }) {
  return <div className="catalog-quality"><div className="field-grid three">
    <label className="field"><span>Filtrar efeito</span><select value={value.effect} onChange={e => onChange({ ...value, effect: e.target.value as CatalogEffect })}>{catalogEffectOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label className="field"><span>Ativação</span><select value={value.activation} onChange={e => onChange({ ...value, activation: e.target.value as CatalogActivation })}><option value="all">Todas as habilidades</option><option value="passive">Passivas sem gatilho</option><option value="conditional">Ativas ou com condição</option></select></label>
    <label className="field"><span>Ordenar por</span><select value={value.sort} onChange={e => onChange({ ...value, sort: e.target.value as CatalogSort })}>{catalogSortOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
  </div><p className="section-help">Ganhos: maior bônus positivo escrito na descrição, por compra. Valores fixos e percentuais têm ordenações próprias; condições, níveis e limites continuam valendo. Bônus variáveis por atributo precisam da leitura da habilidade.</p></div>;
}
