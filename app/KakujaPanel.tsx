"use client";

import { useMemo, useRef, useState } from "react";
import { KakujaImageSlot } from "./KakujaImages";
import { calculateKakujaPerkBonuses, kakujaPerks, kakujaPerksCost, kakujaPEKPerksCost } from "./kakuja-perks";
import { CustomSkillsPanel, customSkillsCost, normalizeCustomSkills } from "./CustomSkillsPanel";
import {calculateKakujaBiology,applyKakujaBiology} from './kakuja-biology';
import {KakujaBiologyPanel} from './KakujaBiologyPanel';
import { KakujaPerksPanel } from "./KakujaPerksPanel";
import {KakujaApexPanel} from './KakujaApexPanel';
import {resolveKakujaApex,type KakujaApexAction} from './kakuja-apex';
import {
  kakujaFormBonuses,
  kakujaAccuracyTest,
  authorialAdjustments,
  authorialBases,
  kakujaCaps,
  kakujaElements,
  kakujaInstabilities,
  kakujaModules,
  kakujaModuleCost,
  universalKakujaRules,
  type KakujaCustomModule,
  type KakujaModule,
  type KakujaState,
} from "./kakuja-data";

type Props = {
  suppressed?: boolean;
  attributes?:Record<string,number>;maxLife?:number;baseRange?:number;baseMovement?:number;passiveRegeneration?:number;basePenetration?:number;
  grade: number;
  species: string;
  vigor: number;
  kaguneSteps: number;
  kaguneTest: string;
  kaguneDurability: number;
  kaguneFamilies: string[];
  state: KakujaState;
  onChange: (next: KakujaState) => void;
};

type Calculation = {
  mode: "passive" | "toggle";
  steps?: number;
  modifier?: number;
  accuracy?: number;
  rd?: number;
  durability?: number;
  reserve?: number;
  stepsPerStack?: number;
  stackMax?: number | "halfGrade";
  stackLabel?: string;
  activeLabel?: string;
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

export const calculations: Record<string, Calculation> = {
  "compactacao-predatoria": { mode: "passive", rd: -2 },
  "massa-ampliada-i": { mode: "passive", steps: 2 },
  "massa-ampliada-ii": { mode: "passive", steps: 4 },
  "colosso-de-rc": { mode: "passive", steps: 5 },
  "corpo-integral": { mode: "passive", durability: 4 },
  "mandibula-predatoria": { mode: "toggle", steps: 2 },
  "placas-retrateis": { mode: "toggle", rd: 2 },
  "potencia-predatoria-i": { mode: "passive", steps: 1 },
  "potencia-predatoria-ii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iv": { mode: "passive", steps: 1 },
  "potencia-predatoria-v": { mode: "passive", steps: 1 },
  "potencia-predatoria-vi": { mode: "passive", steps: 1 },
  "massa-de-impacto": { mode: "passive", steps: 2 },
  "mira-organica": { mode: "passive", accuracy: 1 },
  "arsenal-organico": { mode: "toggle", steps: 3, accuracy: -1, activeLabel: "Arsenal Orgânico — Martelo" },
  "ruptura-organica": { mode: "toggle", steps: -2 },
  "golpe-de-cerco": { mode: "toggle", steps: 2 },
  "varredura-monstruosa": { mode: "toggle", steps: -2 },
  "tremor-de-carne": { mode: "toggle", steps: -2 },
  "golpe-colossal": { mode: "toggle", steps: 4 },
  "cacada-crescente": { mode: "toggle", stepsPerStack: 1, stackMax: 3, stackLabel: "Acúmulos" },
  "execucao-predatoria": { mode: "toggle", steps: 4 },
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
  "armazenar-impacto": { mode: "toggle", stepsPerStack: 1, stackMax: "halfGrade", stackLabel: "Carga" },
  "vesicula-de-rc-i": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-ii": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-iii": { mode: "passive", reserve: 4 },
  "infusao-elemental": { mode: "toggle", modifier: 3 },
  "potencia-elemental": { mode: "toggle", modifier: 3 },
  "explosao-elemental": { mode: "toggle", steps: 2 },
  "feixe-concentrado": { mode: "toggle", steps: 6 },
  "canhao-de-nucleo": { mode: "toggle", steps: 11 },
  "dominio-elemental": { mode: "toggle", steps: 4, rd: 2 },
  "artilharia-alada": { mode: "toggle", steps: 2 },
  "chuva-de-cristais": { mode: "toggle", steps: -2 },
  "mergulho-rubro": { mode: "toggle", steps: 5 },
  "onda-de-choque": { mode: "toggle", steps: -1 },
  "railgun-organico": { mode: "toggle", steps: 7, accuracy: 4 },
  "cidadele-de-carne": { mode: "passive", rd: 3 },
  "cidadela-de-carne": { mode: "passive", rd: 3 },
  "arma-de-cerco": { mode: "passive", steps: 2, accuracy: -1 },
  "montanha-inamovivel": { mode: "toggle", rd: 6 },
  "arsenal-do-carrasco": { mode: "toggle", steps: 5, activeLabel: "Arsenal do Carrasco — Machado" },
  "caudas-ofensivas": { mode: "passive", steps: 2, rd: -2 },
  "guarda-de-hidra": { mode: "toggle", rd: 2 },
  "centopeia": { mode: "toggle", steps: 4, accuracy: 2 },
  "preacertor-perfeito": { mode: "toggle", steps: 2 },
  "lamina-adaptativa": { mode: "toggle", steps: 2, accuracy: 1 },
  "mestre-de-nada": { mode: "toggle", steps: 4 },
  "evolucao-convergente": { mode: "toggle", steps: 5, activeLabel: "Evolução Convergente — adaptação de dano" },
  "bombardeiro-couracado": { mode: "toggle", rd: 3 },
  "railgun-de-tungstenio": { mode: "toggle", steps: 10, accuracy: 6 },
  "fenix-centopeia": { mode: "toggle", steps: 3 },
  "preacertor-de-angulo-morto": { mode: "toggle", steps: 2, accuracy: 2 },
  "linha-de-execucao": { mode: "toggle", steps: 7, accuracy: 5 },
  "fortaleza-ambulante": { mode: "passive", rd: 1 },
  "leviata-imortal": { mode: "toggle", steps: 3, rd: 5 },
  "lanca-escorpionica": { mode: "toggle", steps: 3, accuracy: 2 },
  "cavaleiro-escarlate": { mode: "toggle", rd: 4, accuracy: 2 },
  "orochi": { mode: "toggle", steps: 3 },
  "tempestade-de-carne": { mode: "toggle", stepsPerStack: 1, stackMax: 5, stackLabel: "Cargas" },
  "quimera-absoluta": { mode: "toggle", steps: 4, rd: 4, accuracy: 3 },
  "rei-das-feras": { mode: "toggle", steps: 2, accuracy: 2 },
  "bastiao-devorador": { mode: "toggle", rd: 4, stepsPerStack: 1, stackMax: 3, stackLabel: "Cargas consumidas" },
  "enxame-faminto": { mode: "toggle", steps: -2 },
  "muda-adaptativa": { mode: "toggle", rd: 2 },
  "tirano-de-guerra": { mode: "toggle", steps: 6 },
  "fortaleza-que-anda": { mode: "toggle", rd: 6 },
  "arsenal-de-cem-formas": { mode: "toggle", steps: 4 },
  "impacto-de-exterminio": { mode: "toggle", steps: 13 },
  "canhao-do-kakuhou": { mode: "toggle", steps: 14 },
  "avatar-da-fome": { mode: "toggle", steps: 4, accuracy: 4 },
  "leviata-absoluto": { mode: "toggle", rd: 8 },
  "preacertor-absoluto": { mode: "toggle", steps: 4, accuracy: 3 },
  "ruina-de-cem-membros": { mode: "toggle", steps: 16 },
  "golpe-que-rasga-o-ceu": { mode: "toggle", steps: 18, accuracy: 4 },
  "calamidade-ambulante": { mode: "toggle", steps: 12, rd: 5, accuracy: 2 },
  "forma-dragao": { mode: "toggle", steps: 4 },
  "o-monstro-nao-escolheu": { mode: "toggle", steps: 4 },
  "fim-da-cacada": { mode: "toggle", steps: 28, accuracy: 5 },
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
  const capGrade = ([6, 8, 10, 12, 14, 16, 18, 20] as const).filter((value) => value <= grade).at(-1) || 6;
  return kakujaCaps[capGrade];
}

function formatDamage(steps: number, modifier: number) {
  modifier = Math.floor(modifier);
  const safeSteps = Math.max(0, Math.floor(steps));
  const fullD12 = Math.floor(safeSteps / 5);
  const remainder = safeSteps % 5;
  const sides = [4, 6, 8, 10, 12][remainder];
  const groups = new Map<number, number>();
  if (fullD12) groups.set(12, fullD12);
  groups.set(sides, (groups.get(sides) || 0) + 1);
  const dice = [...groups.entries()].filter(([, count]) => count > 0).sort((a, b) => b[0] - a[0]).map(([side, count]) => `${count}d${side}`).join("+") || "1d4";
  return `${dice}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`;
}

export function calculateKakujaSteps(kaguneSteps: number, moduleSteps: number, advantageSteps: number) {
  return Math.max(0, Math.floor(Math.max(0, kaguneSteps) + moduleSteps + advantageSteps));
}

function requiredFamilies(module: KakujaModule) {
  if (module.requiresFamilies?.length) return module.requiresFamilies;
  if (module.section === "17. Convergências Quiméricas") {
    if (module.id === "quimera-absoluta") return ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"];
    return ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((family) => module.category.includes(family));
  }
  const family = familySections[module.section];
  return family ? [family] : [];
}

function actualCost(module: KakujaModule | KakujaCustomModule, dominant: boolean, foreign = false) {
  return kakujaModuleCost(module, dominant, foreign);
}

export function calculateKakujaDurability(kaguneDurability: number, ownDurability: number, fragile: boolean) {
  const combined = Math.max(1, kaguneDurability + ownDurability);
  return Math.max(1, Math.floor(combined * (fragile ? 0.75 : 1)));
}

export function KakujaPanel({ grade, species, vigor, kaguneSteps, kaguneTest, kaguneDurability, kaguneFamilies, state, onChange, suppressed = false,attributes={},maxLife=0,baseRange=0,baseMovement=0,passiveRegeneration=0,basePenetration=0 }: Props) {
  const [activeTab, setActiveTab] = useState("painel");
  const [search, setSearch] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [section, setSection] = useState("Todos");
  const [draftBase, setDraftBase] = useState<string>(authorialBases[0].id);
  const [draftAdjustments, setDraftAdjustments] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftEffect, setDraftEffect] = useState("");
  const [draftGrade, setDraftGrade] = useState(6);

  const latestState = useRef(state);
  latestState.current = state;
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

  const moduleIsForeign = (module: KakujaModule) => {
    if (module.requiresFamilies?.length === 1) return !familySet.has(module.requiresFamilies[0]);
    const family = familySections[module.section];
    return Boolean(family && !familySet.has(family));
  };

  const foreignSelected = state.selectedModules.filter((id) => {
    const item = kakujaModules.find((candidate) => candidate.id === id);
    return item ? moduleIsForeign(item) : false;
  });

  const moduleAllowed = (module: KakujaModule) => {
    if (grade < module.grade) return false;
    if (module.minFamilies && familySet.size < module.minFamilies) return false;
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
    return (module.requires || []).every((id) => selectedSet.has(id));
  };

  const missingModuleRequirements = (module: KakujaModule) => (module.requires || [])
    .filter((id) => !selectedSet.has(id))
    .map((id) => kakujaModules.find((item) => item.id === id)?.name || id);

  const instabilityRaw = state.selectedInstabilities.reduce((total, id) => total + (kakujaInstabilities.find((item) => item.id === id)?.credit || 0), 0);
  const instabilityCap = grade >= 10 ? 4 : grade >= 8 ? 3 : 2;
  const instabilityCredit = Math.min(instabilityRaw, instabilityCap);
  const modulesSpent = state.selectedModules.reduce((total, id) => {
    const item = kakujaModules.find((candidate) => candidate.id === id);
    return total + (item ? actualCost(item, dominant, moduleIsForeign(item)) : 0);
  }, 0);
  const authorialSkills = normalizeCustomSkills(state.customSkills);
  const customSpent = state.customModules.reduce((total, item) => total + actualCost(item, dominant), 0) + customSkillsCost(authorialSkills);
  const perkSpent = kakujaPEKPerksCost(state.selectedPerks);
  const spent = Math.floor(modulesSpent + customSpent + perkSpent);
  const budget = awakened ? Math.floor(6 + Math.max(0, state.cannibalPE) + Math.max(0, state.extraKakujaPE) + instabilityCredit) : 0;
  const remaining = budget - spent;
  const profileCM = activeModules.reduce((total, item) => total + item.cm, 0) + activeCustomModules.reduce((total, item) => total + item.cm, 0);
  const allowedCM = cap.cm + (state.overload ? 2 : 0);
  const profileLimit = selectedSet.has("morfologia-alternativa-ii") ? 3 : selectedSet.has("morfologia-alternativa-i") ? 2 : 1;
  const calculationStackMax = (item: Calculation) => item.stackMax === "halfGrade" ? Math.floor(grade / 2) : (item.stackMax || 0);
  const effectiveActiveModules = activeModules.filter((module) => {
    if (module.id === "massa-ampliada-i") return !activeIds.includes("massa-ampliada-ii") && !activeIds.includes("colosso-de-rc");
    if (module.id === "massa-ampliada-ii") return !activeIds.includes("colosso-de-rc");
    return true;
  });

  const calculation = effectiveActiveModules.reduce((total, module) => {
    const item = calculations[module.id];
    if (!item || (item.mode === "toggle" && !state.activeTechniques.includes(module.id))) return total;
    const stackMax = calculationStackMax(item);
    const stacks = stackMax > 0 ? clamp(state.techniqueStacks[module.id] || 0, 0, stackMax) : 0;
    return {
      steps: total.steps + (item.steps || 0) + stacks * (item.stepsPerStack || 0),
      modifier: total.modifier + (item.modifier || 0),
      accuracy: total.accuracy + (item.accuracy || 0),
      rd: total.rd + (item.rd || 0),
      durability: total.durability + (item.durability || 0),
      reserve: total.reserve + (item.reserve || 0),
      burst: total.burst || item.mode === "toggle",
    };
  }, { steps: 0, modifier: 0, accuracy: 0, rd: 0, durability: 0, reserve: 0, burst: false });

  const stepsCap = calculation.burst ? cap.burstSteps : cap.passiveSteps;
  const perkBonuses = calculateKakujaPerkBonuses(suppressed?{...state,active:false}:state, grade, species, kaguneFamilies,attributes);
  const moduleSteps = Math.min(stepsCap, Math.max(-stepsCap, calculation.steps));
  const moduleRD = Math.min(cap.rd, Math.max(-cap.rd, calculation.rd));
  const initialSteps = Math.max(0, kaguneSteps);
  const formBonus = kakujaFormBonuses(complete);
  const biological=calculateKakujaBiology(suppressed?{...state,active:false}:state,grade,species,kaguneFamilies,attributes);
  const baseSteps = calculateKakujaSteps(initialSteps, moduleSteps + perkBonuses.steps, state.advantageSteps) + formBonus.steps;
  const totalModifier = Math.floor(2 + calculation.modifier + state.advantageModifier + perkBonuses.modifier);
  const totalAccuracy = Math.floor(formBonus.dice + calculation.accuracy + state.advantageAccuracy + perkBonuses.accuracy);
  const accuracyTest = kakujaAccuracyTest(kaguneTest, totalAccuracy);

  const baseRD = Math.max(0, Math.floor(2 + moduleRD + state.advantageRD + perkBonuses.rd));
  const typeMultiplier = kaguneFamilies[0] === "Koukaku" ? 1.5 : kaguneFamilies[0] === "Ukaku" ? (selectedSet.has("blindagem-cristalina") ? 0.8 : 0.5) : 1;
  const ownDurabilityValue = Math.max(1, (vigor + grade + spent + calculation.durability) * typeMultiplier + perkBonuses.durability);
  const rawReserveMax=Math.floor(calculation.reserve+perkBonuses.reserve);
  const anatomy=applyKakujaBiology({steps:baseSteps,rd:baseRD,ownDurability:ownDurabilityValue,reserve:rawReserveMax},biological);
  const totalSteps=anatomy.steps,rd=anatomy.rd,ownDurability=anatomy.ownDurability;
  const damage=formatDamage(totalSteps,totalModifier);
  const durability = calculateKakujaDurability(kaguneDurability, biological.durabilityPercent?ownDurability:ownDurabilityValue, state.selectedInstabilities.includes("carapaca-fragil"));
  const controlMD = Math.floor(grade / 2 + (state.selectedInstabilities.includes("mente-rachada") ? 1 : 0) + (state.overload ? Math.max(1, profileCM - cap.cm) : 0));
  const activationCost = Math.max(2, 4 - (selectedSet.has("metabolismo-eficiente") && state.activationsSinceRest === 0 ? 2 : 0));
  const nextHunger = (state.activationsSinceRest > 0 ? 2 : 0) + (state.selectedInstabilities.includes("fome-anormal") ? 1 : 0) + (state.overload ? 1 : 0);
  const reserveMax=anatomy.reserve;

  const issues = [
    !ghoulSpecies ? "Kakuja é exclusiva de Ghoul; Quinx e espécies humanas não têm acesso." : "",
    state.cannibalPE < 25 ? `Faltam ${Math.floor(25 - state.cannibalPE)} PE obtidos por canibalização para a Kakuja Incompleta.` : "",
    state.complete && state.cannibalPE < 60 ? `Faltam ${Math.floor(60 - state.cannibalPE)} PE de canibalização e o desenvolvimento narrativo para a Kakuja Completa.` : "",
    remaining < 0 ? `O repertório excede o orçamento em ${Math.abs(remaining)} PE-K.` : "",
    profileCM > allowedCM ? `O Perfil ativo usa ${Math.floor(profileCM)} CM; o limite atual é ${allowedCM}.` : "",
    activeModules.filter((item) => item.section.startsWith("18.")).length > 1 ? "Somente uma Evolução de Kakuja pode ficar ativa no mesmo Perfil." : "",
    ...state.selectedModules.filter((id) => {
      const item = kakujaModules.find((candidate) => candidate.id === id);
      return item ? !moduleRequirementMet(item) : false;
    }).map((id) => `Pré-requisito pendente em ${kakujaModules.find((item) => item.id === id)?.name || id}.`),
    instabilityRaw > instabilityCap ? `Instabilidades somam ${instabilityRaw} PE-K, mas o Level permite reembolso máximo de ${instabilityCap}.` : "",
  ].filter(Boolean);

  const sections = ["Todos", ...Array.from(new Set([...kakujaModules.map((item) => item.section), ...kakujaPerks.map((item) => item.category)]))];
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filteredModules = kakujaModules.filter((item) => (!ownedOnly || selectedSet.has(item.id)) && (section === "Todos" || item.section === section) && (!query || `${item.name} ${item.category} ${item.effect}`.toLocaleLowerCase("pt-BR").includes(query)));

  const patch = (next: Partial<KakujaState>) => onChange({ ...latestState.current, ...next });
  const actApex=(action:KakujaApexAction)=>{
    const result=resolveKakujaApex(latestState.current,action,{level:grade,species,suppressed});
    if(result.error)return result.error;
    latestState.current=result.state;onChange(result.state);
  };
  const togglePurchased = (module: KakujaModule) => {
    if (selectedSet.has(module.id)) {
      const removed = new Set([module.id]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const id of state.selectedModules) {
          const candidate = kakujaModules.find((item) => item.id === id);
          if (candidate?.requires?.some((requirement) => removed.has(requirement)) && !removed.has(id)) {
            removed.add(id);
            expanded = true;
          }
        }
      }
      patch({
        selectedModules: state.selectedModules.filter((id) => !removed.has(id)),
        activeTechniques: state.activeTechniques.filter((id) => !removed.has(id)),
        techniqueStacks: Object.fromEntries(Object.entries(state.techniqueStacks).filter(([id]) => !removed.has(id))),
        profiles: state.profiles.map((profile) => ({ ...profile, moduleIds: profile.moduleIds.filter((id) => !removed.has(id)) })),
        ...(removed.has("infusao-elemental") ? { selectedElements: [], activeElement: "" } : {}),
      });
      return;
    }
    if (!moduleAllowed(module) || !moduleRequirementMet(module)) return;
    const targetProfileId = activeProfile?.id || state.profiles[0]?.id;
    patch({
      selectedModules: [...state.selectedModules, module.id],
      profiles: state.profiles.map((profile) => profile.id === targetProfileId && !profile.moduleIds.includes(module.id)
        ? { ...profile, moduleIds: [...profile.moduleIds, module.id] }
        : profile),
    });
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
  const draftCK = kakujaModuleCost({ cb: draftCB }, dominant);
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
      <div><span>Sistema modular exclusivo</span><h2>{state.name || "Kakuja sem epíteto"}</h2><p>A Kakuja usa os Passos atuais da Kagune como base. Seus módulos, Perfis, CM, Dureza e reserva continuam sendo calculados separadamente.</p></div>
      <label className="kakuja-active"><Switch checked={state.active && awakened && !suppressed} disabled={!awakened || suppressed} onCheckedChange={(checked) => patch({ active: checked })} /><b>{state.active && awakened && !suppressed ? "Manifestada" : "Retraída"}</b></label>
    </section>

    {suppressed && <p className="vats-warning">Manifestação bloqueada por supressão RC ou Kakuhou destruído. Trate o estado em Combate → Cura e suporte.</p>}
    {!awakened && <section className="kakuja-lock">
      <strong>Despertar pendente</strong>
      <p>{!ghoulSpecies ? "A espécie atual não possui Kakuja. Quinx permanece sem acesso." : "A aba foi liberada pelo Level, mas o despertar exige 25 PE obtidos por canibalização."}</p>
      <div className="kakuja-requirements"><span className={grade >= 6 ? "done" : ""}>Level 6+</span><span className={ghoulSpecies ? "done" : ""}>Ghoul</span><span className={state.cannibalPE >= 25 ? "done" : ""}>25 PE canibalização</span></div>
    </section>}

    <div className="kakuja-tabs">
      <div className="kakuja-tab-list" role="tablist" aria-label="Seções da Kakuja">
        {[["painel", "Painel"], ["modulos", "Módulos & Perks"], ["perfis", "Perfis"], ["elementos", "Elementos"], ["instabilidades", "Instabilidades"], ["autoral", "Autoral"], ["regras", "Regras"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}
      </div>

      {activeTab === "painel" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="section-block"><h2>Aparência das formas</h2><p>Guarde uma imagem para cada estágio. As imagens são salvas na ficha e acompanham a exportação.</p><div className="kakuja-image-grid"><KakujaImageSlot label="Kakuja incompleta" value={state.incompleteImage} onChange={incompleteImage => patch({incompleteImage})} /><KakujaImageSlot label="Kakuja completa" value={state.completeImage} onChange={completeImage => patch({completeImage})} /></div></section>
        <section className="section-block kakuja-identity">
          <div className="field-grid four">
            <label className="field"><span>Nome / epíteto</span><input value={state.name} onChange={(event) => patch({ name: event.target.value })} placeholder="A Centopeia Rubra" /></label>
            <label className="field"><span>PE por canibalização → PE-K</span><input type="number" min="0" value={Math.floor(state.cannibalPE)} onChange={(event) => patch({ cannibalPE: clamp(Number(event.target.value), 0, 999999) })} /></label>
            <label className="field"><span>PE comum investido</span><input type="number" min="0" value={Math.floor(state.extraKakujaPE)} onChange={(event) => patch({ extraKakujaPE: clamp(Number(event.target.value), 0, 999999) })} /></label>
            <label className="field"><span>Ativações desde descanso</span><input type="number" min="0" value={Math.floor(state.activationsSinceRest)} onChange={(event) => patch({ activationsSinceRest: clamp(Number(event.target.value), 0, 99) })} /></label>
          </div>
          <label className="field"><span>Forma e anatomia</span><textarea value={state.description} onChange={(event) => patch({ description: event.target.value })} placeholder="A aparência é livre; só benefícios mecânicos exigem módulos." /></label>
          <div className="kakuja-switches">
            <label><Switch checked={state.complete} disabled={state.cannibalPE < 60 || !ghoulSpecies} onCheckedChange={(checked) => patch({ complete: checked })} /><span><b>{complete ? "Completa" : "Incompleta"}</b><small>Selecionar forma completa · 60 PE por canibalização + desenvolvimento narrativo</small></span></label>
            <label><Switch checked={state.overload} disabled={!awakened} onCheckedChange={(checked) => patch({ overload: checked })} /><span><b>Sobrecarga voluntária</b><small>Até +2 CM por 2 turnos; +2 RC/CM, +1 MD/CM e +1 Fome</small></span></label>
          </div>
        </section>

        <div className="kakuja-metric-grid">
          <article><span>Estado</span><strong>{complete ? "Completa" : awakened ? "Incompleta" : "Adormecida"}</strong><small>{complete && !state.selectedInstabilities.includes("mente-rachada") ? "Sem teste quando usada sozinha" : `Controle MD ${controlMD}`}</small></article>
          <article><span>Orçamento</span><strong>{remaining} PE-K</strong><small>{spent} gastos de {budget} disponíveis · {Math.floor(state.cannibalPE)} por canibalização</small></article>
          <article><span>Perfil ativo</span><strong>{Math.floor(profileCM)}/{allowedCM} CM</strong><small>{activeProfile?.name || "Perfil 1"}</small></article>
          <article><span>Dureza total da Kakuja</span><strong>{durability}</strong><small>{Math.floor(kaguneDurability)} da Kakuhou + {ownDurability} própria{state.selectedInstabilities.includes("carapaca-fragil") ? " −25%" : ""}</small></article>
          <article><span>Reserva Kakuja</span><strong>{Math.floor(state.currentReserve)}/{reserveMax} RC</strong><small>Separada do RC da Kagune</small><label className="field"><span>Reserva atual</span><input aria-label="Reserva atual da Kakuja" type="number" min={0} max={reserveMax} value={Math.floor(state.currentReserve)} onChange={event=>patch({currentReserve:Math.min(reserveMax,Math.max(0,Math.floor(Number(event.target.value)||0)))})}/></label></article>
          <article><span>Próxima ativação</span><strong>{activationCost} RC</strong><small>+{nextHunger} Fome adicional</small></article>
        </div>

        <section className="kakuja-combat section-block">
          <div className="kakuja-damage-card">
            <div><span>Dano da Kakuja</span><strong>{damage}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(damage)}>Copiar</button></div>
            <dl><div><dt>Base da Kagune</dt><dd>{Math.floor(initialSteps)} Passos</dd></div><div><dt>Módulos ativos</dt><dd>{moduleSteps >= 0 ? "+" : ""}{Math.floor(moduleSteps)} Passos</dd></div><div><dt>Vantagens</dt><dd>{state.advantageSteps >= 0 ? "+" : ""}{Math.floor(state.advantageSteps)} Passos</dd></div><div><dt>Bônus base da {complete ? "Completa" : "Incompleta"}</dt><dd>+{formBonus.steps} Passos</dd></div><div><dt>Acerto da Kakuja</dt><dd>{accuracyTest} <button type="button" onClick={() => navigator.clipboard?.writeText(accuracyTest)}>Copiar acerto</button></dd></div><div><dt>Bloqueio e desvio enquanto ativa</dt><dd>+{Math.floor(formBonus.dice + perkBonuses.block)} bloqueio / +{Math.floor(formBonus.dice + perkBonuses.dodge)} desvio</dd></div><div><dt>Perks e autorais de Kakuja</dt><dd>+{Math.floor(perkBonuses.accuracy)} acerto / +{Math.floor(perkBonuses.steps)} Passos / +{Math.floor(perkBonuses.modifier)} dano</dd></div><div><dt>Regeneração e ataques extras da forma</dt><dd>+{Math.floor(perkBonuses.regeneration)} por turno / +{Math.floor(perkBonuses.extraAttacks)} ataques</dd></div><div><dt>RD total</dt><dd>{rd}</dd></div></dl>
            <p><b>Regra aplicada:</b> a Kakuja começa com os mesmos {Math.floor(initialSteps)} Passos de Dano atuais da Kagune. Soma +{formBonus.steps} Passos base, além dos módulos manifestados no Perfil ativo e dos bônus de Vantagens. O acerto usa o teste atual da Kagune com +{formBonus.dice} acertos base, além dos ajustes de módulos e Vantagens.</p>
          </div>
          <div className="kakuja-advantage-box">
            <div><span>Bônus de Vantagens</span><strong>Aplicação separada</strong></div>
            <p>Preencha somente bônus vindos de Vantagens que estejam ativos. Eles entram depois dos tetos próprios da Kakuja.</p>
            <div className="field-grid two">
              <label className="field"><span>Passos</span><input type="number" value={Math.floor(state.advantageSteps)} onChange={(event) => patch({ advantageSteps: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Acerto</span><input type="number" value={Math.floor(state.advantageAccuracy)} onChange={(event) => patch({ advantageAccuracy: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Mod. de dano</span><input type="number" value={Math.floor(state.advantageModifier)} onChange={(event) => patch({ advantageModifier: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>RD</span><input type="number" value={Math.floor(state.advantageRD)} onChange={(event) => patch({ advantageRD: clamp(Number(event.target.value), -30, 30) })} /></label>
            </div>
          </div>
        </section>

        <KakujaBiologyPanel key={biological.names.join('|')} bio={biological} rd={rd} ownDurability={Math.floor(ownDurability*(state.selectedInstabilities.includes("carapaca-fragil")?0.75:1))} reserve={reserveMax} range={Math.floor(baseRange+biological.range)} movement={baseMovement} regeneration={passiveRegeneration} maxLife={maxLife} penetration={basePenetration}/>
        <KakujaApexPanel state={state} onAction={actApex}/>
        {activeModules.some((item) => calculations[item.id]?.mode === "toggle") && <section className="section-block">
          <div className="kakuja-section-title"><div><span>Cena atual</span><h3>Técnicas e condições ativas</h3></div><small>Somente itens do Perfil ativo aparecem aqui.</small></div>
          <div className="kakuja-techniques">{activeModules.filter((item) => calculations[item.id]?.mode === "toggle").map((item) => {
            const config = calculations[item.id]; const active = state.activeTechniques.includes(item.id); const stackMax = calculationStackMax(config);
            return <label key={item.id} className={active ? "active" : ""}><Checkbox checked={active} onCheckedChange={(checked) => patch({ activeTechniques: checked ? [...state.activeTechniques, item.id] : state.activeTechniques.filter((id) => id !== item.id), techniqueStacks: checked ? state.techniqueStacks : { ...state.techniqueStacks, [item.id]: 0 } })} /><span><b>{config.activeLabel || item.name}</b><small>{item.effect}</small>{stackMax > 0 && <span className="technique-stack"><i>{config.stackLabel || "Acúmulos"}</i><input type="number" min={0} max={stackMax} disabled={!active} value={Math.floor(state.techniqueStacks[item.id] || 0)} onChange={(event) => patch({ techniqueStacks: { ...state.techniqueStacks, [item.id]: clamp(Number(event.target.value), 0, stackMax) } })} /><em>máx. {stackMax}</em></span>}</span></label>;
          })}</div>
        </section>}

        {issues.length > 0 && <section className="kakuja-issues"><strong>Verificações pendentes</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
      </div>}

      {activeTab === "modulos" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="catalog-toolbar kakuja-toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, efeito ou categoria" /></label><select value={section} onChange={(event) => setSection(event.target.value)}>{sections.map((item) => <option key={item} value={item}>{item.replace(/\bGrau\b/g,"Level")}</option>)}</select></section>
        <label className="vats-check"><input type="checkbox" checked={ownedOnly} onChange={event => setOwnedOnly(event.target.checked)}/>Somente compradas</label>
        <div className="catalog-summary"><span>Módulos e perks de Kakuja</span><strong>{state.selectedModules.length + state.selectedPerks.length} compradas · {spent} PE-K · {kakujaPerksCost(state.selectedPerks)} PE</strong></div>
        <section className="catalog-grid kakuja-module-grid">{filteredModules.map((item) => {
          const purchased = selectedSet.has(item.id); const allowed = moduleAllowed(item); const requirement = moduleRequirementMet(item); const missing = missingModuleRequirements(item); const foreign = moduleIsForeign(item); const cost = actualCost(item, dominant, foreign);
          return <article key={item.id} className={`catalog-card kakuja-module-card ${purchased ? "selected" : ""} ${!allowed || !requirement ? "unavailable" : ""}`}>
            <div className="catalog-card-top"><span>{item.section.replace(/^\d+\.\s*/, "")}</span><b>{cost} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p>
            <div className="kakuja-card-meta"><span>Level {item.grade}+</span><span>{Math.floor(item.cm)} CM</span><span>CB {Math.floor(item.cb)} / CK {item.ck}</span></div>
            <div className="requirement">{item.category}{foreign && <em>Bikaku estrangeiro: +2 CB</em>}{grade < item.grade && <em>Exige Level {item.grade}</em>}{item.minFamilies && familySet.size < item.minFamilies && <em>Exige {item.minFamilies} tipos reais de Kakuhou</em>}{!allowed && grade >= item.grade && !(item.minFamilies && familySet.size < item.minFamilies) && <em>Tipo incompatível</em>}{missing.map((name) => <em key={name}>Falta: {name}</em>)}{purchased && <em>{activeIds.includes(item.id) ? "Aplicado no Perfil ativo" : "Comprado; manifeste na aba Perfis"}</em>}</div>
            <div className="card-actions solo"><button type="button" className={purchased ? "remove" : "add"} disabled={!purchased && (!allowed || !requirement || !awakened)} onClick={() => togglePurchased(item)}>{purchased ? "Remover" : "Comprar"}</button></div>
          </article>;
        })}<KakujaPerksPanel state={state} grade={grade} species={species} families={kaguneFamilies} attributes={attributes} onChange={onChange} search={search} category={section} ownedOnly={ownedOnly}/></section>
      </div>}

      {activeTab === "perfis" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-profile-intro"><div><span>CM disponível neste Level</span><strong>{cap.cm}</strong></div><p>Comprar adiciona ao repertório. Marcar em um Perfil manifesta o módulo. Sem Morfologia Alternativa, apenas o primeiro Perfil pode ser escolhido na cena.</p></section>
        <div className="kakuja-profiles">{state.profiles.map((profile, index) => {
          const profileModules = profile.moduleIds.map((id) => kakujaModules.find((item) => item.id === id)).filter(Boolean) as KakujaModule[];
          const profileCustom = profile.customModuleIds.map((id) => state.customModules.find((item) => item.id === id)).filter(Boolean) as KakujaCustomModule[];
          const cm = profileModules.reduce((total, item) => total + item.cm, 0) + profileCustom.reduce((total, item) => total + item.cm, 0);
          const evolutionCount = profileModules.filter((item) => item.section.startsWith("18.")).length;
          const selectable = index < profileLimit;
          return <section key={profile.id} className={`section-block kakuja-profile ${state.activeProfileId === profile.id ? "active" : ""}`}>
            <div className="kakuja-profile-head"><input value={profile.name} onChange={(event) => patch({ profiles: state.profiles.map((item) => item.id === profile.id ? { ...item, name: event.target.value } : item) })} /><div><span className={cm > cap.cm + 2 ? "bad" : ""}>{Math.floor(cm)}/{cap.cm} CM</span><button type="button" disabled={!selectable || !awakened} onClick={() => patch({ activeProfileId: profile.id })}>{state.activeProfileId === profile.id ? "Ativo" : selectable ? "Usar Perfil" : "Exige Morfologia"}</button></div></div>
            {!selectable && <p className="kakuja-profile-note">Planejamento salvo, mas este Perfil não pode ser escolhido sem ampliar Morfologia Alternativa.</p>}
            {evolutionCount > 1 && <p className="kakuja-profile-warning">Somente uma Evolução pode permanecer ativa por Perfil.</p>}
            <div className="kakuja-profile-list">{state.selectedModules.map((id) => { const item = kakujaModules.find((candidate) => candidate.id === id); if (!item) return null; const checked = profile.moduleIds.includes(id); return <label key={id}><Checkbox checked={checked} onCheckedChange={() => toggleProfileModule(profile.id, id)} /><span><b>{item.name}</b><small>{Math.floor(item.cm)} CM · {item.category}</small></span></label>; })}{state.customModules.map((item) => <label key={item.id}><Checkbox checked={profile.customModuleIds.includes(item.id)} onCheckedChange={() => toggleProfileModule(profile.id, item.id, true)} /><span><b>{item.name}</b><small>{Math.floor(item.cm)} CM · Autoral</small></span></label>)}</div>
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
        <CustomSkillsPanel targetLabel="Kakuja" currency="PE-K" restrictToKakuja effectsEnabled={state.active && awakened} skills={authorialSkills} onChange={customSkills=>patch({customSkills})}/>
        <details className="section-block"><summary>Construir módulos</summary>
        <section className="section-block kakuja-author-builder">
          <div className="kakuja-section-title"><div><span>Categoria própria</span><h3>Construção de módulos autorais</h3></div><small>Separe dano, acerto, alvos, RD e condições em compras diferentes.</small></div>
          <div className="field-grid three"><label className="field"><span>Nome do módulo</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Nome da mutação" /></label><label className="field"><span>Efeito-base</span><select value={draftBase} onChange={(event) => setDraftBase(event.target.value)}>{authorialBases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Level mínimo</span><select value={draftGrade} onChange={(event) => setDraftGrade(Number(event.target.value))}>{Array.from({length:15},(_,index)=>index+6).map((value) => <option key={value} value={value}>{value}+</option>)}</select></label></div>
          <label className="field"><span>Descrição final</span><textarea value={draftEffect} onChange={(event) => setDraftEffect(event.target.value)} placeholder={`${base.label}. ${base.rule}`} /></label>
          <div className="kakuja-author-adjustments"><span>Ajustes de custo</span><div>{authorialAdjustments.map((item) => <label key={item.id}><Checkbox checked={draftAdjustments.includes(item.id)} onCheckedChange={(checked) => setDraftAdjustments(checked ? [...draftAdjustments, item.id] : draftAdjustments.filter((id) => id !== item.id))} /><span><b>{item.label}</b><small>{item.cb > 0 ? "+" : ""}{Math.floor(item.cb)} CB · {item.rule}</small></span></label>)}</div></div>
          <div className="kakuja-author-total"><div><span>CB</span><strong>{draftCB}</strong></div><div><span>CK</span><strong>{draftCK}</strong></div><div><span>CM</span><strong>{draftCM}</strong></div><button type="button" disabled={!awakened} onClick={addCustomModule}>Criar módulo</button></div>
        </section>
        {state.customModules.length > 0 && <section className="catalog-grid kakuja-module-grid">{state.customModules.map((item) => <article key={item.id} className="catalog-card kakuja-module-card selected"><div className="catalog-card-top"><span>Autoral</span><b>{actualCost(item, dominant)} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p><div className="kakuja-card-meta"><span>Level {item.grade}+</span><span>{Math.floor(item.cm)} CM</span><span>CB {Math.floor(item.cb)}</span></div><div className="card-actions solo"><button type="button" className="remove" onClick={() => patch({ customModules: state.customModules.filter((candidate) => candidate.id !== item.id), profiles: state.profiles.map((profile) => ({ ...profile, customModuleIds: profile.customModuleIds.filter((id) => id !== item.id) })) })}>Remover</button></div></article>)}</section>}
        </details>
      </div>}

      {activeTab === "regras" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-rule-grid">{universalKakujaRules.map((rule) => <article key={rule.title}><span>{String(universalKakujaRules.indexOf(rule) + 1).padStart(2, "0")}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></article>)}</section>
      </div>}
    </div>
  </div>;
}
