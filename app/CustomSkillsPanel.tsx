"use client";

import { attributeKeys, attributeLabels, type AttributeKey } from "./data";

export type CustomSkillActivation = "passive" | "active";
export type CustomSkillScope = "physical" | "kagune" | "both";
export type CustomSkillEffectType =
  | "hit-dice"
  | "damage-steps"
  | "damage-modifier"
  | "extra-attacks"
  | "dodge-dice"
  | "block-dice"
  | "rd"
  | "max-life"
  | "max-rc"
  | "max-sanity"
  | "regeneration"
  | "kagune-durability"
  | "movement"
  | "carrying"
  | "determination"
  | "attribute-dice"
  | "attribute-bonus";

export type CustomSkillEffect = {
  id: string;
  type: CustomSkillEffectType;
  value: number;
  scope: CustomSkillScope;
  attribute: AttributeKey;
};

export type CustomSkill = {
  id: string;
  name: string;
  description: string;
  cost: number;
  activation: CustomSkillActivation;
  enabled: boolean;
  effects: CustomSkillEffect[];
};

export type CustomSkillBonuses = {
  physicalHitDice: number;
  kaguneHitDice: number;
  physicalSteps: number;
  kaguneSteps: number;
  physicalDamageModifier: number;
  kaguneDamageModifier: number;
  extraAttacks: number;
  dodgeDice: number;
  blockDice: number;
  rd: number;
  maxLife: number;
  maxRC: number;
  maxSanity: number;
  regeneration: number;
  kaguneDurability: number;
  movement: number;
  carrying: number;
  determination: number;
  attributeDice: Record<AttributeKey, number>;
  attributeBonus: Record<AttributeKey, number>;
};

const effectOptions: { value: CustomSkillEffectType; label: string; configuration?: "scope" | "attribute" }[] = [
  { value: "hit-dice", label: "Dados de acerto adicionais", configuration: "scope" },
  { value: "damage-steps", label: "Passos de dano adicionais", configuration: "scope" },
  { value: "damage-modifier", label: "Modificador de dano", configuration: "scope" },
  { value: "extra-attacks", label: "Ataques adicionais" },
  { value: "dodge-dice", label: "Dados de esquiva adicionais" },
  { value: "block-dice", label: "Dados de bloqueio adicionais" },
  { value: "rd", label: "Redução de Dano (RD)" },
  { value: "max-life", label: "Vida máxima" },
  { value: "max-rc", label: "RC máximo" },
  { value: "max-sanity", label: "Sanidade máxima" },
  { value: "regeneration", label: "Regeneração por turno" },
  { value: "kagune-durability", label: "Dureza da Kakuhou" },
  { value: "movement", label: "Espaços de movimento" },
  { value: "carrying", label: "Capacidade de carga" },
  { value: "determination", label: "Determinação" },
  { value: "attribute-dice", label: "Dados em testes de atributo", configuration: "attribute" },
  { value: "attribute-bonus", label: "Valor de atributo", configuration: "attribute" },
];

const effectTypes = new Set(effectOptions.map((option) => option.value));
const customUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const blankAttributeMap = (): Record<AttributeKey, number> => ({
  forca: 0,
  vigor: 0,
  precisao: 0,
  agilidade: 0,
  raciocinio: 0,
  percepcao: 0,
  presenca: 0,
  controle: 0,
});

function newEffect(): CustomSkillEffect {
  return { id: customUid(), type: "hit-dice", value: 1, scope: "kagune", attribute: "forca" };
}

function newSkill(): CustomSkill {
  return {
    id: customUid(),
    name: "Nova habilidade",
    description: "",
    cost: 0,
    activation: "passive",
    enabled: true,
    effects: [newEffect()],
  };
}

export function normalizeCustomSkills(value: unknown): CustomSkill[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, skillIndex) => {
    const source = entry && typeof entry === "object" ? entry as Partial<CustomSkill> : {};
    const effects = Array.isArray(source.effects) ? source.effects.map((entryEffect, effectIndex) => {
      const effect = entryEffect && typeof entryEffect === "object" ? entryEffect as Partial<CustomSkillEffect> : {};
      const type = effectTypes.has(effect.type as CustomSkillEffectType) ? effect.type as CustomSkillEffectType : "hit-dice";
      const scope = ["physical", "kagune", "both"].includes(String(effect.scope)) ? effect.scope as CustomSkillScope : "kagune";
      const attribute = attributeKeys.includes(effect.attribute as AttributeKey) ? effect.attribute as AttributeKey : "forca";
      return {
        id: String(effect.id || `efeito-${skillIndex}-${effectIndex}`),
        type,
        value: Number(effect.value) || 0,
        scope,
        attribute,
      };
    }) : [];
    return {
      id: String(source.id || `habilidade-${skillIndex}`),
      name: String(source.name || "Habilidade autoral"),
      description: String(source.description || ""),
      cost: Math.max(0, Number(source.cost) || 0),
      activation: source.activation === "active" ? "active" : "passive",
      enabled: source.enabled !== false,
      effects,
    };
  });
}

export function customSkillsCost(skills: CustomSkill[]) {
  return skills.reduce((total, skill) => total + Math.max(0, Number(skill.cost) || 0), 0);
}

export function calculateCustomSkillBonuses(skills: CustomSkill[]): CustomSkillBonuses {
  const totals: CustomSkillBonuses = {
    physicalHitDice: 0,
    kaguneHitDice: 0,
    physicalSteps: 0,
    kaguneSteps: 0,
    physicalDamageModifier: 0,
    kaguneDamageModifier: 0,
    extraAttacks: 0,
    dodgeDice: 0,
    blockDice: 0,
    rd: 0,
    maxLife: 0,
    maxRC: 0,
    maxSanity: 0,
    regeneration: 0,
    kaguneDurability: 0,
    movement: 0,
    carrying: 0,
    determination: 0,
    attributeDice: blankAttributeMap(),
    attributeBonus: blankAttributeMap(),
  };

  const addScoped = (
    scope: CustomSkillScope,
    value: number,
    physical: "physicalHitDice" | "physicalSteps" | "physicalDamageModifier",
    kagune: "kaguneHitDice" | "kaguneSteps" | "kaguneDamageModifier",
  ) => {
    if (scope === "physical" || scope === "both") totals[physical] += value;
    if (scope === "kagune" || scope === "both") totals[kagune] += value;
  };

  skills.filter((skill) => skill.activation === "passive" || skill.enabled).forEach((skill) => {
    skill.effects.forEach((effect) => {
      const value = Number(effect.value) || 0;
      if (effect.type === "hit-dice") addScoped(effect.scope, value, "physicalHitDice", "kaguneHitDice");
      if (effect.type === "damage-steps") addScoped(effect.scope, value, "physicalSteps", "kaguneSteps");
      if (effect.type === "damage-modifier") addScoped(effect.scope, value, "physicalDamageModifier", "kaguneDamageModifier");
      if (effect.type === "extra-attacks") totals.extraAttacks += value;
      if (effect.type === "dodge-dice") totals.dodgeDice += value;
      if (effect.type === "block-dice") totals.blockDice += value;
      if (effect.type === "rd") totals.rd += value;
      if (effect.type === "max-life") totals.maxLife += value;
      if (effect.type === "max-rc") totals.maxRC += value;
      if (effect.type === "max-sanity") totals.maxSanity += value;
      if (effect.type === "regeneration") totals.regeneration += value;
      if (effect.type === "kagune-durability") totals.kaguneDurability += value;
      if (effect.type === "movement") totals.movement += value;
      if (effect.type === "carrying") totals.carrying += value;
      if (effect.type === "determination") totals.determination += value;
      if (effect.type === "attribute-dice") totals.attributeDice[effect.attribute] += value;
      if (effect.type === "attribute-bonus") totals.attributeBonus[effect.attribute] += value;
    });
  });

  return totals;
}

function effectConfiguration(type: CustomSkillEffectType) {
  return effectOptions.find((option) => option.value === type)?.configuration;
}

function effectLabel(effect: CustomSkillEffect) {
  const label = effectOptions.find((option) => option.value === effect.type)?.label || effect.type;
  const target = effectConfiguration(effect.type) === "scope"
    ? effect.scope === "both" ? "nos dois ataques" : effect.scope === "physical" ? "no físico" : "na Kagune/arma"
    : effectConfiguration(effect.type) === "attribute" ? `em ${attributeLabels[effect.attribute]}` : "";
  return `${effect.value >= 0 ? "+" : ""}${effect.value} ${label}${target ? ` ${target}` : ""}`;
}

export function CustomSkillsPanel({ skills, onChange }: { skills: CustomSkill[]; onChange: (skills: CustomSkill[]) => void }) {
  const totalCost = customSkillsCost(skills);
  const appliedCount = skills.filter((skill) => skill.activation === "passive" || skill.enabled).length;
  const updateSkill = (id: string, patch: Partial<CustomSkill>) => onChange(skills.map((skill) => skill.id === id ? { ...skill, ...patch } : skill));
  const removeSkill = (id: string) => onChange(skills.filter((skill) => skill.id !== id));
  const addEffect = (skill: CustomSkill) => updateSkill(skill.id, { effects: [...skill.effects, newEffect()] });
  const updateEffect = (skill: CustomSkill, effectId: string, patch: Partial<CustomSkillEffect>) => updateSkill(skill.id, {
    effects: skill.effects.map((effect) => effect.id === effectId ? { ...effect, ...patch } : effect),
  });
  const removeEffect = (skill: CustomSkill, effectId: string) => updateSkill(skill.id, { effects: skill.effects.filter((effect) => effect.id !== effectId) });

  return <section className="custom-skills-shell">
    <div className="custom-skills-intro section-block compact">
      <div><span>Regras da mesa</span><h2>Habilidades autorais</h2><p>Crie técnicas próprias e ligue os efeitos diretamente aos cálculos da ficha.</p></div>
      <div className="custom-skills-summary"><span><b>{skills.length}</b> habilidades</span><span><b>{appliedCount}</b> aplicadas</span><span><b>{totalCost}</b> PE</span><button type="button" onClick={() => onChange([...skills, newSkill()])}>+ Nova habilidade</button></div>
    </div>

    {skills.length ? <div className="custom-skill-list">{skills.map((skill, index) => {
      const applied = skill.activation === "passive" || skill.enabled;
      return <article className={`custom-skill-card section-block ${applied ? "applied" : ""}`} key={skill.id}>
        <div className="custom-skill-head">
          <span className="custom-skill-index">{String(index + 1).padStart(2, "0")}</span>
          <label><span>Nome</span><input value={skill.name} onChange={(event) => updateSkill(skill.id, { name: event.target.value })} placeholder="Nome da habilidade" /></label>
          <label><span>Funcionamento</span><select value={skill.activation} onChange={(event) => updateSkill(skill.id, { activation: event.target.value as CustomSkillActivation })}><option value="passive">Passiva</option><option value="active">Ativa</option></select></label>
          <label><span>Custo</span><div className="custom-skill-cost"><input type="number" min={0} value={skill.cost} onChange={(event) => updateSkill(skill.id, { cost: Math.max(0, Number(event.target.value) || 0) })} /><b>PE</b></div></label>
          <button className="custom-skill-remove" type="button" aria-label={`Remover ${skill.name}`} onClick={() => removeSkill(skill.id)}>×</button>
        </div>
        <label className="custom-skill-description"><span>Descrição, custo em RC e regras</span><textarea rows={3} value={skill.description} onChange={(event) => updateSkill(skill.id, { description: event.target.value })} placeholder="Descreva ativação, alcance, duração, custo em RC, limites e efeito narrativo..." /></label>
        <div className="custom-skill-state">
          <div><span>{skill.activation === "passive" ? "Passiva" : "Técnica ativa"}</span><strong>{applied ? "Aplicando efeitos" : "Efeitos desligados"}</strong></div>
          {skill.activation === "active" ? <label className="custom-skill-switch"><input type="checkbox" checked={skill.enabled} onChange={(event) => updateSkill(skill.id, { enabled: event.target.checked })} /><span>{skill.enabled ? "Ativada" : "Desativada"}</span></label> : <span className="custom-skill-always">Sempre aplicada</span>}
        </div>
        <div className="custom-effect-head"><div><span>Modificadores automáticos</span><p>Valores negativos também funcionam como penalidades.</p></div><button type="button" onClick={() => addEffect(skill)}>+ Adicionar efeito</button></div>
        {skill.effects.length ? <div className="custom-effect-list">{skill.effects.map((effect) => {
          const configuration = effectConfiguration(effect.type);
          return <div className="custom-effect-row" key={effect.id}>
            <label className="custom-effect-type"><span>Tipo</span><select value={effect.type} onChange={(event) => updateEffect(skill, effect.id, { type: event.target.value as CustomSkillEffectType })}>{effectOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            {configuration === "scope" && <label><span>Aplicar em</span><select value={effect.scope} onChange={(event) => updateEffect(skill, effect.id, { scope: event.target.value as CustomSkillScope })}><option value="kagune">Kagune / arma</option><option value="physical">Ataque físico</option><option value="both">Ambos</option></select></label>}
            {configuration === "attribute" && <label><span>Atributo</span><select value={effect.attribute} onChange={(event) => updateEffect(skill, effect.id, { attribute: event.target.value as AttributeKey })}>{attributeKeys.map((key) => <option value={key} key={key}>{attributeLabels[key]}</option>)}</select></label>}
            {!configuration && <div className="custom-effect-direct"><span>Aplicação</span><b>Personagem</b></div>}
            <label className="custom-effect-value"><span>Valor</span><input type="number" value={effect.value} onChange={(event) => updateEffect(skill, effect.id, { value: Number(event.target.value) || 0 })} /></label>
            <button type="button" aria-label="Remover modificador" onClick={() => removeEffect(skill, effect.id)}>×</button>
          </div>;
        })}</div> : <button className="custom-effect-empty" type="button" onClick={() => addEffect(skill)}>Nenhum modificador automático. Adicionar o primeiro.</button>}
        {skill.effects.length > 0 && <div className="custom-effect-preview">{skill.effects.map((effect) => <span key={effect.id}>{effectLabel(effect)}</span>)}</div>}
      </article>;
    })}</div> : <button className="empty-add" type="button" onClick={() => onChange([newSkill()])}>Nenhuma habilidade autoral <span>Criar a primeira</span></button>}
  </section>;
}
