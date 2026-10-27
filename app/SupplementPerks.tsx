"use client";
import { useState } from "react";
import { filterPerkCatalog } from "./catalog-filters";
import type { Perk } from "./data";

export function SupplementOrganPerks({ items, owned, eligible, onToggle }: {
  items: Perk[]; owned: (id: string) => boolean;
  eligible: (item: Perk) => boolean; onToggle: (item: Perk) => void;
}) {
  const [group, setGroup] = useState("Todos"), [limit, setLimit] = useState(40);
  const [localSearch, setLocalSearch] = useState("");
  const matches = filterPerkCatalog(items, { query: localSearch, category: group });
  return <section>
    <div className="attribute-section-head"><div><span>Perks</span><p>Melhorias de Kakuhou e equipamentos. Estas compras também aparecem no catálogo de Perks.</p></div></div>
    <label className="search-field"><span>⌕</span><input aria-label="Buscar perks de Kakuhou" placeholder="Nome ou efeito da perk" value={localSearch} onChange={event => { setLocalSearch(event.target.value); setLimit(40); }} /></label>
    <div className="filter-row">{["Todos", "Ukaku", "Koukaku", "Rinkaku", "Bikaku", "Quimera", "Kakuja", "Quinque", "Quinx / Arata"].map(value => <button type="button" key={value} className={value === group ? "active" : ""} onClick={() => { setGroup(value); setLimit(40); }}>{value}</button>)}</div>
    <div className="catalog-summary"><span>{matches.length} perks · {items.filter(item => owned(item.id)).length} compradas</span></div>
    <div className="catalog-grid effects">{matches.slice(0, limit).map(item => {
      const selected = owned(item.id), allowed = eligible(item);
      return <article key={item.id} className={`catalog-card ${selected ? "selected" : ""} ${!allowed ? "unavailable" : ""}`}>
        <div className="catalog-card-top"><span>{item.organGroup || item.category}{item.useType ? ` · ${item.useType}` : ""}</span><b>{item.cost} PE</b></div>
        <h3>{item.name}</h3><p>{item.description}</p>
        <div className="requirement">{item.requirement}{!allowed && <em>Requisito pendente: confira LEVEL, estrutura e desbloqueios.</em>}</div>
        <div className="card-actions"><button type="button" className={selected ? "remove" : "add"} disabled={!allowed && !selected} onClick={() => onToggle(item)}>{selected ? "Remover" : "Adicionar"}</button></div>
      </article>;
    })}</div>
    {matches.length > limit && <button type="button" className="text-button" onClick={() => setLimit(limit + 40)}>Mostrar mais perks · {Math.min(limit, matches.length)} de {matches.length}</button>}
    {!matches.length && <p className="section-help">Nenhuma perk encontrada neste filtro.</p>}
  </section>;
}
