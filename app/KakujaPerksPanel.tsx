"use client";

import type {KakujaState} from './kakuja-data';
import {kakujaPerks,kakujaPerkMissing,normalizeKakujaPerks,type KakujaPerk} from './kakuja-perks';
export function KakujaPerksPanel({state,grade,species,onChange,search,category,ownedOnly}:{search:string;category:string;ownedOnly:boolean;state:KakujaState;grade:number;species:string;onChange:(state:KakujaState)=>void}) {
 const selected=normalizeKakujaPerks(state.selectedPerks),q=search.trim().toLocaleLowerCase('pt-BR');
 const items=kakujaPerks.filter(p=>(category==='Todos'||p.category===category)&&(!ownedOnly||selected.includes(p.id))&&(!q||`${p.sourceId} ${p.name} ${p.effect} ${p.requirement}`.toLocaleLowerCase('pt-BR').includes(q)));
 const toggle=(p:KakujaPerk)=>{if(selected.includes(p.id))onChange({...state,selectedPerks:selected.filter(id=>id!==p.id)});else if(!kakujaPerkMissing(p,state,grade,species).length)onChange({...state,selectedPerks:[...selected,p.id]});};
 return <>{items.map(p=>{const purchased=selected.includes(p.id),missing=kakujaPerkMissing(p,state,grade,species);return <article key={p.id} className={`catalog-card kakuja-module-card ${purchased?'selected':''} ${missing.length?'unavailable':''}`}><div className="catalog-card-top"><span>{p.category} · #{p.sourceId}</span><b>{p.cost} PE</b></div><h3>{p.name}</h3><p>{p.effect}</p><div className="kakuja-card-meta"><span>Grau {p.grade}+</span><span>{p.cm} CM</span><span>{p.usage}</span></div><div className="requirement">{p.requirement}{missing.map(m=><em key={m}>Falta: {m}</em>)}{purchased&&!state.active&&<em>Ative a Kakuja antes de usar.</em>}</div><div className="card-actions solo"><button type="button" className={purchased?'remove':'add'} disabled={!purchased&&missing.length>0} onClick={()=>toggle(p)}>{purchased?'Remover':'Comprar'}</button></div></article>;})}</>;
}
