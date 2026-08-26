"use client";

import { useMemo, useState } from "react";
import {
  authorialAdjustments,
  authorialBases,
  kakujaCaps,
  kakujaElements,
  kakujaInstabilities,
  kakujaModules,
  universalKakujaRules,
  type KakujaCustomModule,
  type KakujaModule,
  type KakujaState,
} from "./kakuja-data";

type Props = {
  grade: number;
  species: string;
  vigor: number;
  kaguneNaturalSteps: number;
  kaguneFamilies: string[];
  state: KakujaState;
  onChange: (next: KakujaState) => void;
};

type Calculation = {
  mode: "passive" | "toggle";
  steps?: number;
  dice?: number;
  modifier?: number;
  rd?: number;
  durability?: number;
  reserve?: number;
};

type CheckProps = {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function Checkbox({ checked, disabled, onCheckedChange }: CheckProps) {
  return <input className="kakuja-checkbox" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />;
}

function Switch({ checked, disabled, onCheckedChange }: CheckProps) {
  return <input className="kakuja-switch" type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />;
}

const calculations: Record<string, Calculation> = {
  "compactacao-predatoria": { mode: "passive", rd: -2 },
  "massa-ampliada-i": { mode: "passive", dice: 2 },
  "massa-ampliada-ii": { mode: "passive", dice: 4 },
  "colosso-de-rc": { mode: "passive", steps: 1, dice: 4 },
  "corpo-integral": { mode: "passive", durability: 4 },
  "mandibula-predatoria": { mode: "toggle", steps: 2 },
  "placas-retrateis": { mode: "toggle", rd: 2 },
  "potencia-predatoria-i": { mode: "passive", steps: 1 },
  "potencia-predatoria-ii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iv": { mode: "passive", steps: 1 },
  "potencia-predatoria-v": { mode: "passive", steps: 1 },
  "potencia-predatoria-vi": { mode: "passive", steps: 1 },
  "massa-de-impacto": { mode: "passive", dice: 2 },
  "mira-organica": { mode: "passive", modifier: 1 },
  "golpe-de-cerco": { mode: "toggle", steps: 2 },
  "varredura-monstruosa": { mode: "toggle", steps: -2 },
  "tremor-de-carne": { mode: "toggle", steps: -2 },
  "golpe-colossal": { mode: "toggle", steps: 4 },
  "execucao-predatoria": { mode: "toggle", dice: 4 },
  "impacto-carniceiro": { mode: "toggle", steps: 3 },
  "couraca-kakuja-i": { mode: "passive", rd: 2 },
  "couraca-kakuja-ii": { mode: "passive", rd: 2 },
  "couraca-kakuja-iii": { mode: "passive", rd: 2 },
  "couraca-kakuja-iv": { mode: "passive", rd: 2 },
  "tecido-reforcado-i": { mode: "passive", durability: 6 },
  "tecido-reforcado-ii": { mode: "passive", durability: 6 },
  "armadura-adaptativa": { mode: "toggle", rd: 2 },
  "fortaleza-imovel": { mode: "toggle", rd: 4 },
  "barreira-elemental": { mode: "toggle", rd: 3 },
  "vesicula-de-rc-i": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-ii": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-iii": { mode: "passive", reserve: 4 },
  "infusao-elemental": { mode: "toggle", modifier: 3 },
  "potencia-elemental": { mode: "toggle", modifier: 3 },
  "explosao-elemental": { mode: "toggle", steps: 2 },
  "feixe-concentrado": { mode: "toggle", steps: 2, dice: 4 },
  "canhao-de-nucleo": { mode: "toggle", steps: 3, dice: 8 },
  "dominio-elemental": { mode: "toggle", dice: 4, rd: 2 },
  "artilharia-alada": { mode: "toggle", dice: 2 },
  "chuva-de-cristais": { mode: "toggle", steps: -2 },
  "mergulho-rubro": { mode: "toggle", steps: 2, dice: 3 },
  "railgun-organico": { mode: "toggle", steps: 1, dice: 6, modifier: 4 },
  "cidadele-de-carne": { mode: "passive", rd: 3 },
  "cidadela-de-carne": { mode: "passive", rd: 3 },
  "arma-de-cerco": { mode: "passive", steps: 2, modifier: -1 },
  "montanha-inamovivel": { mode: "toggle", rd: 6 },
  "caudas-ofensivas": { mode: "passive", dice: 2, rd: -2 },
  "guarda-de-hidra": { mode: "toggle", rd: 2 },
  "centopeia": { mode: "toggle", dice: 4, modifier: 2 },
  "predador-perfeito": { mode: "toggle", dice: 2 },
  "lamina-adaptativa": { mode: "toggle", steps: 2, modifier: 1 },
  "mestre-de-nada": { mode: "toggle", dice: 4 },
  "bombardeiro-couracado": { mode: "toggle", rd: 3 },
  "railgun-de-tungstenio": { mode: "toggle", steps: 2, dice: 8, modifier: 6 },
  "fenix-centopeia": { mode: "toggle", dice: 3 },
  "predador-de-angulo-morto": { mode: "toggle", dice: 2, modifier: 2 },
  "linha-de-execucao": { mode: "toggle", steps: 2, dice: 5, modifier: 5 },
  "fortaleza-ambulante": { mode: "passive", rd: 1 },
  "leviata-imortal": { mode: "toggle", dice: 3, rd: 5 },
  "cavaleiro-escarlate": { mode: "toggle", rd: 4, modifier: 2 },
  "orochi": { mode: "toggle", dice: 3 },
  "quimera-absoluta": { mode: "toggle", dice: 4, rd: 4, modifier: 3 },
  "rei-das-feras": { mode: "toggle", steps: 2, modifier: 2 },
  "bastiao-devorador": { mode: "toggle", rd: 4 },
  "enxame-faminto": { mode: "toggle", steps: -2 },
  "muda-adaptativa": { mode: "toggle", rd: 2 },
  "tirano-de-guerra": { mode: "toggle", steps: 3, dice: 3 },
  "fortaleza-que-anda": { mode: "toggle", rd: 6 },
  "arsenal-de-cem-formas": { mode: "toggle", dice: 4 },
  "impacto-de-exterminio": { mode: "toggle", steps: 5, dice: 8 },
  "canhao-do-kakuhou": { mode: "toggle", steps: 4, dice: 10 },
  "avatar-da-fome": { mode: "toggle", steps: 4, modifier: 4 },
  "leviata-absoluto": { mode: "toggle", rd: 8 },
  "predador-absoluto": { mode: "toggle", dice: 4, modifier: 3 },
  "ruina-de-cem-membros": { mode: "toggle", steps: 6, dice: 10 },
  "golpe-que-rasga-o-ceu": { mode: "toggle", steps: 6, dice: 12, modifier: 4 },
  "calamidade-ambulante": { mode: "toggle", steps: 6, dice: 6, rd: 5, modifier: 2 },
  "forma-dragao": { mode: "toggle", steps: 4 },
  "o-monstro-nao-escolheu": { mode: "toggle", dice: 4 },
  "fim-da-cacada": { mode: "toggle", steps: 14, dice: 14, modifier: 5 },
};

const prerequisites: Record<string, string> = {
  "morfologia-alternativa-ii": "morfologia-alternativa-i",
  "potencia-predatoria-ii": "potencia-predatoria-i",
  "potencia-predatoria-iii": "potencia-predatoria-ii",
  "potencia-predatoria-iv": "potencia-predatoria-iii",
  "potencia-predatoria-v": "potencia-predatoria-iv",
  "potencia-predatoria-vi": "potencia-predatoria-v",
  "arsenal-vivo-superior": "arsenal-organico",
  "couraca-kakuja-ii": "couraca-kakuja-i",
  "couraca-kakuja-iii": "couraca-kakuja-ii",
  "couraca-kakuja-iv": "couraca-kakuja-iii",
  "tecido-reforcado-ii": "tecido-reforcado-i",
  "vesicula-de-rc-ii": "vesicula-de-rc-i",
  "vesicula-de-rc-iii": "vesicula-de-rc-ii",
  "cicatrizacao-de-combate-ii": "cicatrizacao-de-combate-i",
  "potencia-elemental": "infusao-elemental",
  "nucleo-duplo": "infusao-elemental",
  "reacao-hibrida": "nucleo-duplo",
  "nucleo-trino": "nucleo-duplo",
};

const familySections: Record<string, string> = {
  "13. Módulos Ukaku": "Ukaku",
  "14. Módulos Koukaku": "Koukaku",
  "15. Módulos Rinkaku": "Rinkaku",
  "16. Módulos Bikaku": "Bikaku",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function capForGrade(grade: number) {
  const capGrade = ([6, 8, 10, 12, 14] as const).filter((value) => value <= grade).at(-1) || 6;
  return kakujaCaps[capGrade];
}

function formatDamage(steps: number, extraDice: number, modifier: number) {
  const safeSteps = Math.max(0, Math.floor(steps));
  const fullD12 = Math.floor(safeSteps / 5);
  const remainder = safeSteps % 5;
  const sides = [4, 6, 8, 10, 12][remainder];
  const groups = new Map<number, number>();
  if (fullD12) groups.set(12, fullD12);
  groups.set(sides, (groups.get(sides) || 0) + 1 + Math.floor(extraDice));
  const dice = [...groups.entries()].filter(([, count]) => count > 0).sort((a, b) => b[0] - a[0]).map(([side, count]) => `${count}d${side}`).join("+") || "1d4";
  return `${dice}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`;
}

function requiredFamilies(module: KakujaModule) {
  if (module.section === "17. Convergências Quiméricas") {
    if (module.id === "quimera-absoluta") return ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"];
    return ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((family) => module.category.includes(family));
  }
  const family = familySections[module.section];
  return family ? [family] : [];
}

function actualCost(module: KakujaModule | KakujaCustomModule, dominant: boolean, foreign = false) {
  const cb = module.cb + (foreign ? 2 : 0);
  return dominant ? Math.max(1, Math.ceil(Math.max(1, cb - 3) / 2)) : Math.ceil(cb / 2);
}

export function KakujaPanel({ grade, species, vigor, kaguneNaturalSteps, kaguneFamilies, state, onChange }: Props) {
  const [activeTab, setActiveTab] = useState("painel");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("Todos");
  const [draftBase, setDraftBase] = useState<string>(authorialBases[0].id);
  const [draftAdjustments, setDraftAdjustments] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftEffect, setDraftEffect] = useState("");
  const [draftGrade, setDraftGrade] = useState(6);

  const dominant = species === "ghoul-dominante";
  const ghoulSpecies = ["ghoul", "ghoul-dominante", "ghoul-artificial"].includes(species);
  const gradeUnlocked = grade >= 6;
  const awakened = gradeUnlocked && ghoulSpecies && state.cannibalPE >= 25;
  const complete = awakened && state.complete && state.cannibalPE >= 60;
  const cap = capForGrade(grade);
  const familySet = useMemo(() => new Set(kaguneFamilies), [kaguneFamilies]);
  const selectedSet = useMemo(() => new Set(state.selectedModules), [state.selectedModules]);
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
  const activeIds = activeProfile?.moduleIds || [];
  const activeCustomIds = activeProfile?.customModuleIds || [];
  const activeModules = activeIds.map((id) => kakujaModules.find((item) => item.id === id)).filter(Boolean) as KakujaModule[];
  const activeCustomModules = activeCustomIds.map((id) => state.customModules.find((item) => item.id === id)).filter(Boolean) as KakujaCustomModule[];

  const foreignSelected = state.selectedModules.filter((id) => {
    const item = kakujaModules.find((candidate) => candidate.id === id);
    const family = item ? familySections[item.section] : "";
    return Boolean(family && !familySet.has(family));
  });

  const moduleIsForeign = (module: KakujaModule) => {
    const family = familySections[module.section];
    return Boolean(family && !familySet.has(family));
  };

  const moduleAllowed = (module: KakujaModule) => {
    if (grade < module.grade) return false;
    const required = requiredFamilies(module);
    if (!required.length) {
      if (module.id === "simetria-quimerica" && familySet.size < 2) return false;
      return true;
    }
    if (required.every((family) => familySet.has(family))) return true;
    const foreign = moduleIsForeign(module);
    return foreign && kaguneFamilies[0] === "Bikaku" && (foreignSelected.length === 0 || selectedSet.has(module.id));
  };

  const moduleRequirementMet = (module: KakujaModule) => {
    const prerequisite = prerequisites[module.id];
    return !prerequisite || selectedSet.has(prerequisite);
  };

  const instabilityRaw = state.selectedInstabilities.reduce((total, id) => total + (kakujaInstabilities.find((item) => item.id === id)?.credit || 0), 0);
  const instabilityCap = grade >= 10 ? 4 : grade >= 8 ? 3 : 2;
  const instabilityCredit = Math.min(instabilityRaw, instabilityCap);
  const modulesSpent = state.selectedModules.reduce((total, id) => {
    const item = kakujaModules.find((candidate) => candidate.id === id);
    return total + (item ? actualCost(item, dominant, moduleIsForeign(item)) : 0);
  }, 0);
  const customSpent = state.customModules.reduce((total, item) => total + actualCost(item, dominant), 0);
  const spent = modulesSpent + customSpent;
  const budget = awakened ? 6 + Math.max(0, state.extraKakujaPE) + instabilityCredit : 0;
  const remaining = budget - spent;
  const profileCM = activeModules.reduce((total, item) => total + item.cm, 0) + activeCustomModules.reduce((total, item) => total + item.cm, 0);
  const allowedCM = cap.cm + (state.overload ? 2 : 0);
  const profileLimit = selectedSet.has("morfologia-alternativa-ii") ? 3 : selectedSet.has("morfologia-alternativa-i") ? 2 : 1;

  const calculation = activeModules.reduce((total, module) => {
    const item = calculations[module.id];
    if (!item || (item.mode === "toggle" && !state.activeTechniques.includes(module.id))) return total;
    return {
      steps: total.steps + (item.steps || 0),
      dice: total.dice + (item.dice || 0),
      modifier: total.modifier + (item.modifier || 0),
      rd: total.rd + (item.rd || 0),
      durability: total.durability + (item.durability || 0),
      reserve: total.reserve + (item.reserve || 0),
      burst: total.burst || item.mode === "toggle",
    };
  }, { steps: 0, dice: 0, modifier: 0, rd: 0, durability: 0, reserve: 0, burst: false });

  const stepsCap = calculation.burst ? cap.burstSteps : cap.passiveSteps;
  const diceCap = calculation.burst ? cap.burstDice : cap.passiveDice;
  const moduleSteps = Math.min(stepsCap, Math.max(-stepsCap, calculation.steps));
  const moduleDice = Math.min(diceCap, Math.max(-diceCap, calculation.dice));
  const moduleRD = Math.min(cap.rd, Math.max(-cap.rd, calculation.rd));
  const initialSteps = Math.floor(Math.max(0, kaguneNaturalSteps) / 3);
  const totalSteps = Math.max(0, initialSteps + moduleSteps + state.advantageSteps);
  const totalDice = moduleDice + state.advantageDice;
  const totalModifier = 2 + calculation.modifier + state.advantageModifier;
  const damage = formatDamage(totalSteps, totalDice, totalModifier);
  const rd = Math.max(0, 2 + moduleRD + state.advantageRD);
  const typeMultiplier = kaguneFamilies[0] === "Koukaku" ? 1.5 : kaguneFamilies[0] === "Ukaku" ? (selectedSet.has("blindagem-cristalina") ? 0.8 : 0.5) : 1;
  let durability = Math.floor((vigor + grade + spent + calculation.durability) * typeMultiplier);
  if (state.selectedInstabilities.includes("carapaca-fragil")) durability = Math.floor(durability * 0.75);
  durability = Math.max(1, durability);
  const controlMD = Math.ceil(grade / 2) + (state.selectedInstabilities.includes("mente-rachada") ? 1 : 0) + (state.overload ? Math.max(1, profileCM - cap.cm) : 0);
  const activationCost = Math.max(2, 4 - (selectedSet.has("metabolismo-eficiente") && state.activationsSinceRest === 0 ? 2 : 0));
  const nextHunger = (state.activationsSinceRest > 0 ? 2 : 0) + (state.selectedInstabilities.includes("fome-anormal") ? 1 : 0) + (state.overload ? 1 : 0);
  const reserveMax = calculation.reserve;

  const issues = [
    !ghoulSpecies ? "Kakuja é exclusiva de Ghoul; Quinx e espécies humanas não têm acesso." : "",
    state.cannibalPE < 25 ? `Faltam ${25 - state.cannibalPE} PE obtidos por canibalização para a Kakuja Incompleta.` : "",
    state.complete && state.cannibalPE < 60 ? `Faltam ${60 - state.cannibalPE} PE de canibalização e o desenvolvimento narrativo para a Kakuja Completa.` : "",
    remaining < 0 ? `O repertório excede o orçamento em ${Math.abs(remaining)} PE-K.` : "",
    profileCM > allowedCM ? `O Perfil ativo usa ${profileCM} CM; o limite atual é ${allowedCM}.` : "",
    activeModules.filter((item) => item.section.startsWith("18.")).length > 1 ? "Somente uma Evolução de Kakuja pode ficar ativa no mesmo Perfil." : "",
    instabilityRaw > instabilityCap ? `Instabilidades somam ${instabilityRaw} PE-K, mas o Grau permite reembolso máximo de ${instabilityCap}.` : "",
  ].filter(Boolean);

  const sections = ["Todos", ...Array.from(new Set(kakujaModules.map((item) => item.section)))];
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filteredModules = kakujaModules.filter((item) => (section === "Todos" || item.section === section) && (!query || `${item.name} ${item.category} ${item.effect}`.toLocaleLowerCase("pt-BR").includes(query)));

  const patch = (next: Partial<KakujaState>) => onChange({ ...state, ...next });
  const togglePurchased = (module: KakujaModule) => {
    if (selectedSet.has(module.id)) {
      patch({
        selectedModules: state.selectedModules.filter((id) => id !== module.id),
        activeTechniques: state.activeTechniques.filter((id) => id !== module.id),
        profiles: state.profiles.map((profile) => ({ ...profile, moduleIds: profile.moduleIds.filter((id) => id !== module.id) })),
      });
      return;
    }
    if (!moduleAllowed(module) || !moduleRequirementMet(module)) return;
    patch({ selectedModules: [...state.selectedModules, module.id] });
  };

  const toggleProfileModule = (profileId: string, moduleId: string, custom = false) => {
    patch({ profiles: state.profiles.map((profile) => {
      if (profile.id !== profileId) return profile;
      const key = custom ? "customModuleIds" : "moduleIds";
      const values = profile[key];
      return { ...profile, [key]: values.includes(moduleId) ? values.filter((id) => id !== moduleId) : [...values, moduleId] };
    }) });
  };

  const base = authorialBases.find((item) => item.id === draftBase) || authorialBases[0];
  const adjustments = authorialAdjustments.filter((item) => draftAdjustments.includes(item.id));
  const draftMinCB = draftAdjustments.includes("sessao") ? 8 : 4;
  const draftCB = Math.max(draftMinCB, base.cb + adjustments.reduce((total, item) => total + item.cb, 0));
  const draftCM = Math.max(0, base.cm + adjustments.reduce((total, item) => total + item.cm, 0));
  const draftCK = dominant ? Math.max(1, Math.ceil(Math.max(1, draftCB - 3) / 2)) : Math.ceil(draftCB / 2);
  const addCustomModule = () => {
    const item: KakujaCustomModule = {
      id: uid(),
      name: draftName.trim() || "Módulo autoral",
      category: `Autoral • ${base.label}`,
      grade: draftGrade,
      cb: draftCB,
      cm: draftCM,
      effect: draftEffect.trim() || `${base.label}. ${base.rule}`,
    };
    patch({ customModules: [...state.customModules, item] });
    setDraftName(""); setDraftEffect(""); setDraftAdjustments([]);
  };

  if (!gradeUnlocked) return null;

  return <div className="kakuja-shell">
    <section className="kakuja-hero">
      <div><span>Sistema modular exclusivo</span><h2>{state.name || "Kakuja sem epíteto"}</h2><p>A Kakuja tem repertório, Perfis, CM, Dureza, reserva e dano próprios. Ela não herda efeitos nem multiplicadores diretos da Kagune.</p></div>
      <label className="kakuja-active"><Switch checked={state.active && awakened} disabled={!awakened} onCheckedChange={(checked) => patch({ active: checked })} /><b>{state.active && awakened ? "Manifestada" : "Retraída"}</b></label>
    </section>

    {!awakened && <section className="kakuja-lock">
      <strong>Despertar pendente</strong>
      <p>{!ghoulSpecies ? "A espécie atual não possui Kakuja. Quinx permanece sem acesso." : "A aba foi liberada pelo Grau, mas o despertar exige 25 PE obtidos por canibalização."}</p>
      <div className="kakuja-requirements"><span className={grade >= 6 ? "done" : ""}>Grau 6+</span><span className={ghoulSpecies ? "done" : ""}>Ghoul</span><span className={state.cannibalPE >= 25 ? "done" : ""}>25 PE canibalização</span></div>
    </section>}

    <div className="kakuja-tabs">
      <div className="kakuja-tab-list" role="tablist" aria-label="Seções da Kakuja">
        {[["painel", "Painel"], ["modulos", "Módulos"], ["perfis", "Perfis"], ["elementos", "Elementos"], ["instabilidades", "Instabilidades"], ["autoral", "Autoral"], ["regras", "Regras"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}
      </div>

      {activeTab === "painel" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="section-block kakuja-identity">
          <div className="field-grid four">
            <label className="field"><span>Nome / epíteto</span><input value={state.name} onChange={(event) => patch({ name: event.target.value })} placeholder="A Centopeia Rubra" /></label>
            <label className="field"><span>PE por canibalização</span><input type="number" min="0" value={state.cannibalPE} onChange={(event) => patch({ cannibalPE: clamp(Number(event.target.value), 0, 999) })} /></label>
            <label className="field"><span>PE comum investido</span><input type="number" min="0" value={state.extraKakujaPE} onChange={(event) => patch({ extraKakujaPE: clamp(Number(event.target.value), 0, 999) })} /></label>
            <label className="field"><span>Ativações desde descanso</span><input type="number" min="0" value={state.activationsSinceRest} onChange={(event) => patch({ activationsSinceRest: clamp(Number(event.target.value), 0, 99) })} /></label>
          </div>
          <label className="field"><span>Forma e anatomia</span><textarea value={state.description} onChange={(event) => patch({ description: event.target.value })} placeholder="A aparência é livre; só benefícios mecânicos exigem módulos." /></label>
          <div className="kakuja-switches">
            <label><Switch checked={state.complete} disabled={state.cannibalPE < 60 || !ghoulSpecies} onCheckedChange={(checked) => patch({ complete: checked })} /><span><b>Kakuja Completa</b><small>60 PE por canibalização + desenvolvimento narrativo</small></span></label>
            <label><Switch checked={state.overload} disabled={!awakened} onCheckedChange={(checked) => patch({ overload: checked })} /><span><b>Sobrecarga voluntária</b><small>Até +2 CM por 2 turnos; +2 RC/CM, +1 MD/CM e +1 Fome</small></span></label>
          </div>
        </section>

        <div className="kakuja-metric-grid">
          <article><span>Estado</span><strong>{complete ? "Completa" : awakened ? "Incompleta" : "Adormecida"}</strong><small>{complete && !state.selectedInstabilities.includes("mente-rachada") ? "Sem teste quando usada sozinha" : `Controle MD ${controlMD}`}</small></article>
          <article><span>Orçamento</span><strong>{remaining} PE-K</strong><small>{spent} gastos de {budget} disponíveis</small></article>
          <article><span>Perfil ativo</span><strong>{profileCM}/{allowedCM} CM</strong><small>{activeProfile?.name || "Perfil 1"}</small></article>
          <article><span>Dureza própria</span><strong>{durability}</strong><small>(Vigor + Grau + PE pagos) × {typeMultiplier}</small></article>
          <article><span>Reserva Kakuja</span><strong>{state.currentReserve}/{reserveMax} RC</strong><small>Separada do RC da Kagune</small></article>
          <article><span>Próxima ativação</span><strong>{activationCost} RC</strong><small>+{nextHunger} Fome adicional</small></article>
        </div>

        <section className="kakuja-combat section-block">
          <div className="kakuja-damage-card">
            <div><span>Dano da Kakuja</span><strong>{damage}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(damage)}>Copiar</button></div>
            <dl><div><dt>Base independente</dt><dd>{initialSteps} Passos</dd></div><div><dt>Módulos</dt><dd>{moduleSteps >= 0 ? "+" : ""}{moduleSteps} Passos / {moduleDice >= 0 ? "+" : ""}{moduleDice} dados</dd></div><div><dt>Vantagens</dt><dd>{state.advantageSteps >= 0 ? "+" : ""}{state.advantageSteps} Passos / {state.advantageDice >= 0 ? "+" : ""}{state.advantageDice} dados</dd></div><div><dt>RD total</dt><dd>{rd}</dd></div></dl>
            <p><b>Regra aplicada:</b> {kaguneNaturalSteps} Passos naturais da Kagune ÷ 3 = {initialSteps}. Melhorias diretas, evoluções e multiplicadores da Kagune não entram.</p>
          </div>
          <div className="kakuja-advantage-box">
            <div><span>Bônus de Vantagens</span><strong>Aplicação separada</strong></div>
            <p>Preencha somente bônus vindos de Vantagens que estejam ativos. Eles entram depois dos tetos próprios da Kakuja.</p>
            <div className="field-grid two">
              <label className="field"><span>Passos</span><input type="number" value={state.advantageSteps} onChange={(event) => patch({ advantageSteps: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Dados</span><input type="number" value={state.advantageDice} onChange={(event) => patch({ advantageDice: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Modificador</span><input type="number" value={state.advantageModifier} onChange={(event) => patch({ advantageModifier: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>RD</span><input type="number" value={state.advantageRD} onChange={(event) => patch({ advantageRD: clamp(Number(event.target.value), -30, 30) })} /></label>
            </div>
          </div>
        </section>

        {activeModules.some((item) => calculations[item.id]?.mode === "toggle") && <section className="section-block">
          <div className="kakuja-section-title"><div><span>Cena atual</span><h3>Técnicas e condições ativas</h3></div><small>Somente itens do Perfil ativo aparecem aqui.</small></div>
          <div className="kakuja-techniques">{activeModules.filter((item) => calculations[item.id]?.mode === "toggle").map((item) => <label key={item.id} className={state.activeTechniques.includes(item.id) ? "active" : ""}><Checkbox checked={state.activeTechniques.includes(item.id)} onCheckedChange={(checked) => patch({ activeTechniques: checked ? [...state.activeTechniques, item.id] : state.activeTechniques.filter((id) => id !== item.id) })} /><span><b>{item.name}</b><small>{item.effect}</small></span></label>)}</div>
        </section>}

        {issues.length > 0 && <section className="kakuja-issues"><strong>Verificações pendentes</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
      </div>}

      {activeTab === "modulos" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="catalog-toolbar kakuja-toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, efeito ou categoria" /></label><select value={section} onChange={(event) => setSection(event.target.value)}>{sections.map((item) => <option key={item}>{item}</option>)}</select></section>
        <div className="catalog-summary"><span>{filteredModules.length} módulos documentados nesta seleção</span><strong>{state.selectedModules.length} comprados · {spent} PE-K</strong></div>
        <section className="catalog-grid kakuja-module-grid">{filteredModules.map((item) => {
          const purchased = selectedSet.has(item.id); const allowed = moduleAllowed(item); const requirement = moduleRequirementMet(item); const foreign = moduleIsForeign(item); const cost = actualCost(item, dominant, foreign);
          return <article key={item.id} className={`catalog-card kakuja-module-card ${purchased ? "selected" : ""} ${!allowed || !requirement ? "unavailable" : ""}`}>
            <div className="catalog-card-top"><span>{item.section.replace(/^\d+\.\s*/, "")}</span><b>{cost} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p>
            <div className="kakuja-card-meta"><span>Grau {item.grade}+</span><span>{item.cm} CM</span><span>CB {item.cb} / CK {item.ck}</span></div>
            <div className="requirement">{item.category}{foreign && <em>Bikaku estrangeiro: +2 CB</em>}{grade < item.grade && <em>Exige Grau {item.grade}</em>}{!allowed && grade >= item.grade && <em>Tipo incompatível</em>}{!requirement && <em>Pré-requisito pendente</em>}</div>
            <div className="card-actions solo"><button type="button" className={purchased ? "remove" : "add"} disabled={!purchased && (!allowed || !requirement || !awakened)} onClick={() => togglePurchased(item)}>{purchased ? "Remover" : "Comprar"}</button></div>
          </article>;
        })}</section>
      </div>}

      {activeTab === "perfis" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-profile-intro"><div><span>CM do Grau</span><strong>{cap.cm}</strong></div><p>Comprar adiciona ao repertório. Marcar em um Perfil manifesta o módulo. Sem Morfologia Alternativa, apenas o primeiro Perfil pode ser escolhido na cena.</p></section>
        <div className="kakuja-profiles">{state.profiles.map((profile, index) => {
          const profileModules = profile.moduleIds.map((id) => kakujaModules.find((item) => item.id === id)).filter(Boolean) as KakujaModule[];
          const profileCustom = profile.customModuleIds.map((id) => state.customModules.find((item) => item.id === id)).filter(Boolean) as KakujaCustomModule[];
          const cm = profileModules.reduce((total, item) => total + item.cm, 0) + profileCustom.reduce((total, item) => total + item.cm, 0);
          const evolutionCount = profileModules.filter((item) => item.section.startsWith("18.")).length;
          const selectable = index < profileLimit;
          return <section key={profile.id} className={`section-block kakuja-profile ${state.activeProfileId === profile.id ? "active" : ""}`}>
            <div className="kakuja-profile-head"><input value={profile.name} onChange={(event) => patch({ profiles: state.profiles.map((item) => item.id === profile.id ? { ...item, name: event.target.value } : item) })} /><div><span className={cm > cap.cm + 2 ? "bad" : ""}>{cm}/{cap.cm} CM</span><button type="button" disabled={!selectable || !awakened} onClick={() => patch({ activeProfileId: profile.id })}>{state.activeProfileId === profile.id ? "Ativo" : selectable ? "Usar Perfil" : "Exige Morfologia"}</button></div></div>
            {!selectable && <p className="kakuja-profile-note">Planejamento salvo, mas este Perfil não pode ser escolhido sem ampliar Morfologia Alternativa.</p>}
            {evolutionCount > 1 && <p className="kakuja-profile-warning">Somente uma Evolução pode permanecer ativa por Perfil.</p>}
            <div className="kakuja-profile-list">{state.selectedModules.map((id) => { const item = kakujaModules.find((candidate) => candidate.id === id); if (!item) return null; const checked = profile.moduleIds.includes(id); return <label key={id}><Checkbox checked={checked} onCheckedChange={() => toggleProfileModule(profile.id, id)} /><span><b>{item.name}</b><small>{item.cm} CM · {item.category}</small></span></label>; })}{state.customModules.map((item) => <label key={item.id}><Checkbox checked={profile.customModuleIds.includes(item.id)} onCheckedChange={() => toggleProfileModule(profile.id, item.id, true)} /><span><b>{item.name}</b><small>{item.cm} CM · Autoral</small></span></label>)}</div>
          </section>;
        })}</div>
      </div>}

      {activeTab === "elementos" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-element-head"><div><span>Propriedades compradas</span><strong>{state.selectedElements.length}/{selectedSet.has("nucleo-trino") ? 3 : selectedSet.has("nucleo-duplo") ? 2 : 1}</strong></div><label className="field"><span>Condutor ativo</span><select value={state.activeElement} onChange={(event) => patch({ activeElement: event.target.value })}><option value="">Nenhum</option>{state.selectedElements.map((id) => { const item = kakujaElements.find((candidate) => candidate.id === id); return item ? <option key={id} value={id}>{item.name}</option> : null; })}</select></label></section>
        {!selectedSet.has("infusao-elemental") && <section className="kakuja-lock compact"><strong>Infusão Elemental necessária</strong><p>Compre o módulo na categoria Núcleos elementais para registrar uma propriedade.</p></section>}
        <div className="kakuja-element-grid">{kakujaElements.map((item) => {
          const selected = state.selectedElements.includes(item.id); const limit = selectedSet.has("nucleo-trino") ? 3 : selectedSet.has("nucleo-duplo") ? 2 : 1; const allowed = selectedSet.has("infusao-elemental") && (item.id !== "sifao" || grade >= 10) && (selected || state.selectedElements.length < limit);
          return <article key={item.id} className={selected ? "selected" : ""}><div><Checkbox checked={selected} disabled={!allowed} onCheckedChange={(checked) => patch({ selectedElements: checked ? [...state.selectedElements, item.id] : state.selectedElements.filter((id) => id !== item.id), activeElement: !checked && state.activeElement === item.id ? "" : state.activeElement })} /><h3>{item.name}</h3></div><p><b>Básico</b>{item.basic}</p><p><b>Elevado</b>{item.elevated}</p></article>;
        })}</div>
      </div>}

      {activeTab === "instabilidades" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-profile-intro"><div><span>Reembolso aplicado</span><strong>{instabilityCredit}/{instabilityCap} PE-K</strong></div><p>Instabilidades concedem somente PE-K. Para removê-las, devolva os PE recebidos e justifique a evolução narrativa.</p></section>
        <div className="kakuja-instability-grid">{kakujaInstabilities.map((item) => { const selected = state.selectedInstabilities.includes(item.id); return <label key={item.id} className={selected ? "selected" : ""}><Checkbox checked={selected} onCheckedChange={(checked) => patch({ selectedInstabilities: checked ? [...state.selectedInstabilities, item.id] : state.selectedInstabilities.filter((id) => id !== item.id) })} /><span><b>{item.name}</b><em>+{item.credit} PE-K</em><small>{item.effect}</small></span></label>; })}</div>
      </div>}

      {activeTab === "autoral" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="section-block kakuja-author-builder">
          <div className="kakuja-section-title"><div><span>Categoria própria</span><h3>Construção de módulos autorais</h3></div><small>Separe dano, acerto, alvos, RD e condições em compras diferentes.</small></div>
          <div className="field-grid three"><label className="field"><span>Nome do módulo</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Nome da mutação" /></label><label className="field"><span>Efeito-base</span><select value={draftBase} onChange={(event) => setDraftBase(event.target.value)}>{authorialBases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Grau mínimo</span><select value={draftGrade} onChange={(event) => setDraftGrade(Number(event.target.value))}>{[6, 8, 10, 12, 14].map((value) => <option key={value} value={value}>{value}+</option>)}</select></label></div>
          <label className="field"><span>Descrição final</span><textarea value={draftEffect} onChange={(event) => setDraftEffect(event.target.value)} placeholder={`${base.label}. ${base.rule}`} /></label>
          <div className="kakuja-author-adjustments"><span>Ajustes de custo</span><div>{authorialAdjustments.map((item) => <label key={item.id}><Checkbox checked={draftAdjustments.includes(item.id)} onCheckedChange={(checked) => setDraftAdjustments(checked ? [...draftAdjustments, item.id] : draftAdjustments.filter((id) => id !== item.id))} /><span><b>{item.label}</b><small>{item.cb > 0 ? "+" : ""}{item.cb} CB · {item.rule}</small></span></label>)}</div></div>
          <div className="kakuja-author-total"><div><span>CB</span><strong>{draftCB}</strong></div><div><span>CK</span><strong>{draftCK}</strong></div><div><span>CM</span><strong>{draftCM}</strong></div><button type="button" disabled={!awakened} onClick={addCustomModule}>Criar módulo</button></div>
        </section>
        {state.customModules.length > 0 && <section className="catalog-grid kakuja-module-grid">{state.customModules.map((item) => <article key={item.id} className="catalog-card kakuja-module-card selected"><div className="catalog-card-top"><span>Autoral</span><b>{actualCost(item, dominant)} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p><div className="kakuja-card-meta"><span>Grau {item.grade}+</span><span>{item.cm} CM</span><span>CB {item.cb}</span></div><div className="card-actions solo"><button type="button" className="remove" onClick={() => patch({ customModules: state.customModules.filter((candidate) => candidate.id !== item.id), profiles: state.profiles.map((profile) => ({ ...profile, customModuleIds: profile.customModuleIds.filter((id) => id !== item.id) })) })}>Remover</button></div></article>)}</section>}
      </div>}

      {activeTab === "regras" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-rule-grid">{universalKakujaRules.map((rule) => <article key={rule.title}><span>{String(universalKakujaRules.indexOf(rule) + 1).padStart(2, "0")}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></article>)}</section>
      </div>}
    </div>
  </div>;
}
