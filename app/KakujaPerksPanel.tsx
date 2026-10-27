"use client";

import type { KakujaState } from './kakuja-data';
import { kakujaPerks, kakujaPerkMissing, normalizeKakujaPerks, type KakujaPerk } from './kakuja-perks';
import { normalizeCatalogSearch } from './catalog-filters';

export function KakujaPerksPanel({ state, grade, species, families, attributes, onChange, search, category, ownedOnly }: {
  search: string; category: string; ownedOnly: boolean; state: KakujaState; grade: number;
  species: string; families?: string[]; attributes?: Record<string, number>; onChange: (state: KakujaState) => void;
}) {
  const selected = normalizeKakujaPerks(state.selectedPerks), query = normalizeCatalogSearch(search);
  const items = kakujaPerks.filter(perk => (category === 'Todos' || perk.category === category)
    && (!ownedOnly || selected.includes(perk.id))
    && (!query || normalizeCatalogSearch(`${perk.sourceId} ${perk.category} ${perk.name} ${perk.effect} ${perk.requirement}`).includes(query)))
    .sort((left, right) => left.grade - right.grade
      || left.category.localeCompare(right.category, 'pt-BR', { sensitivity: 'base' })
      || left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
  const toggle = (perk: KakujaPerk) => {
    if (selected.includes(perk.id)) onChange({ ...state, selectedPerks: selected.filter(id => id !== perk.id), activeTechniques: state.activeTechniques.filter(id => id !== perk.id) });
    else if (!kakujaPerkMissing(perk, state, grade, species, families, attributes).length) onChange({ ...state, selectedPerks: [...selected, perk.id] });
  };
  return <>
    {items.map(perk => {
      const purchased = selected.includes(perk.id), missing = kakujaPerkMissing(perk, state, grade, species, families, attributes);
      const active = state.activeTechniques.includes(perk.id);
      return <article key={perk.id} className={`catalog-card kakuja-module-card ${purchased ? 'selected' : ''} ${missing.length ? 'unavailable' : ''}`}>
        <div className="catalog-card-top"><span>{perk.category}</span><b>{perk.cost} {perk.currency || 'PE'}</b></div>
        <h3>{perk.name}</h3><p>{perk.effect}</p>
        <div className="kakuja-card-meta"><span>Level {perk.grade}+</span>{perk.cm > 0 && <span>{perk.cm} CM</span>}<span>{perk.usage}</span></div>
        <div className="requirement">{perk.requirement}{missing.map(item => <em key={item}>Falta: {item}</em>)}{purchased && !state.active && <em>Manifeste a Kakuja para aplicar.</em>}</div>
        <div className="card-actions">
          <button type="button" className={purchased ? 'remove' : 'add'} disabled={!purchased && missing.length > 0} onClick={() => toggle(perk)}>{purchased ? 'Remover' : 'Comprar'}</button>
          {purchased && perk.activation === 'active' && <button type="button" disabled={missing.length > 0 || !state.active} aria-pressed={active} onClick={() => onChange({ ...state, activeTechniques: active ? state.activeTechniques.filter(id => id !== perk.id) : [...state.activeTechniques, perk.id] })}>{active ? 'Desativar técnica' : 'Ativar técnica'}</button>}
        </div>
      </article>;
    })}
  </>;
}
