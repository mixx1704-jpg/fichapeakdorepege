"use client";
import {useMemo} from 'react';
import type {CharacterSheet} from './character';
import {crystallizationComparison} from './crystallization';
import './crystallization.css';

export function CrystallizationPanel({sheet,onToggle,onCopy}:{sheet:CharacterSheet;onToggle:()=>void;onCopy:(text:string)=>void}) {
  const comparison=useMemo(()=>crystallizationComparison(sheet),[sheet]);
  if(!comparison)return null;
  const damage=(value:typeof comparison.normal)=>value.packEffects.damageMultiplier.kagune===1?value.kaguneDamage:`piso((${value.kaguneDamage}) × ${value.packEffects.damageMultiplier.kagune.toLocaleString('pt-BR')}) antes da RD`;
  return <section className="section-block crystallization-panel" aria-label="Dano da cristalização Ukaku">
    <div className="crystallization-head"><div><span>Ukaku · N{comparison.rank}</span><h2>Dano da Cristalização</h2><p>Compare com os mesmos atributos e bônus da ficha. A prévia considera a Kagune manifestada.</p></div><button type="button" disabled={!comparison.available} onClick={onToggle}>{comparison.active?'Retirar do dano':'Aplicar ao dano'}</button></div>
    <div className="crystallization-damage">{[["Sem cristalização",comparison.normal],["Com cristalização",comparison.crystallized]].map(([label,value])=>{
      const result=value as typeof comparison.normal;
      return <div key={String(label)}><span>{String(label)}</span><button type="button" title="Copiar dano" onClick={()=>onCopy(damage(result))}><code>{damage(result)}</code></button><small>{result.kaguneSteps} Passos · modificador {result.kaguneDamageModifier>=0?'+':''}{result.kaguneDamageModifier}</small></div>;
    })}</div><p className="crystallization-bonus">Cristalização: {comparison.steps>=0?'+':''}{comparison.steps} Passos · Potencializada: {comparison.modifier>=0?'+':''}{comparison.modifier} no modificador. {comparison.active?'Aplicada ao dano principal.':'Prévia disponível; aplique quando usar o efeito.'}</p>
  </section>;
}
