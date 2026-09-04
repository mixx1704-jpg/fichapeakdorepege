"use client";

import { useMemo, useState } from "react";
import {
  authorialAdjustments,
  authorialBases,
  calculateKakujaCM,
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
  maxLife: number;
  kaguneSteps: number;
  kaguneDurability: number;
  kaguneFamilies: string[];
  state: KakujaState;
  onChange: (next: KakujaState) => void;
};

type NumericEffect = {
  steps?: number;
  modifier?: number;
  accuracy?: number;
  rd?: number;
  durability?: number;
  reserve?: number;
  dodge?: number;
  movement?: number;
  range?: number;
  healing?: number;
  healingDivisor?: number;
  halfBaseSteps?: boolean;
  ignoreRD?: number | "half";
  stepsPerStack?: number;
  rdPerStack?: number;
  stackMax?: number | "halfGrade";
  createsAdditional?: boolean;
  additionalSteps?: number;
  additionalAccuracy?: number;
  additionalIgnoreRD?: number | "half";
};

type CalculationOption = NumericEffect & {
  id: string;
  label: string;
  minGrade?: number;
};

type Calculation = NumericEffect & {
  mode: "passive" | "toggle";
  stackLabel?: string;
  activeLabel?: string;
  options?: CalculationOption[];
  defaultOptions?: string[];
  maxOptions?: number;
};

type CombatSummary = {
  moduleSteps: number;
  totalSteps: number;
  totalModifier: number;
  totalAccuracy: number;
  moduleRD: number;
  totalRD: number;
  durabilityBonus: number;
  reserveMax: number;
  dodge: number;
  movement: number;
  range: number;
  healing: number;
  ignoreRD: number | "half" | null;
  additional: {
    active: boolean;
    steps: number;
    modifier: number;
    accuracy: number;
    ignoreRD: number | "half" | null;
  };
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
  "compactacao-predatoria": { mode: "passive", rd: -2, dodge: 1 },
  "massa-ampliada-i": { mode: "passive", steps: 2, range: 1, dodge: -1 },
  "massa-ampliada-ii": { mode: "passive", steps: 4, range: 2, dodge: -2 },
  "colosso-de-rc": { mode: "passive", steps: 5, range: 2, dodge: -3 },
  "corpo-integral": { mode: "passive", durability: 4 },
  "mandibula-predatoria": { mode: "toggle", steps: 2 },
  "placas-retrateis": {
    mode: "toggle",
    activeLabel: "Placas Retráteis — postura atual",
    options: [
      { id: "casco", label: "Casco: +2 RD", rd: 2 },
      { id: "exposicao", label: "Exposição: +2 Passos, −2 RD", steps: 2, rd: -2 },
    ],
    defaultOptions: ["casco"],
  },
  "locomocao-quadrupede": { mode: "passive", movement: 1 },
  "potencia-predatoria-i": { mode: "passive", steps: 1 },
  "potencia-predatoria-ii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iii": { mode: "passive", steps: 1 },
  "potencia-predatoria-iv": { mode: "passive", steps: 1 },
  "potencia-predatoria-v": { mode: "passive", steps: 1 },
  "potencia-predatoria-vi": { mode: "passive", steps: 1 },
  "massa-de-impacto": { mode: "passive", steps: 2 },
  "mira-organica": { mode: "passive", accuracy: 1 },
  "arsenal-organico": {
    mode: "toggle",
    activeLabel: "Arsenal Orgânico — formas manifestadas",
    options: [
      { id: "lamina", label: "Lâmina: +1 Passo", steps: 1 },
      { id: "martelo", label: "Martelo: +3 Passos, −1 acerto", steps: 3, accuracy: -1 },
      { id: "lanca", label: "Lança: +1 acerto e alcance", accuracy: 1, range: 1 },
      { id: "chicote", label: "Chicote: segundo alvo, −2 Passos", steps: -2 },
      { id: "escudo", label: "Escudo: +2 RD", rd: 2 },
    ],
    defaultOptions: ["martelo"],
  },
  "ruptura-organica": { mode: "toggle", steps: -2 },
  "golpe-de-cerco": { mode: "toggle", steps: 2 },
  "varredura-monstruosa": { mode: "toggle", steps: -2 },
  "tremor-de-carne": { mode: "toggle", steps: -2 },
  "golpe-colossal": { mode: "toggle", steps: 4 },
  "cacada-crescente": { mode: "toggle", stepsPerStack: 1, stackMax: 3, stackLabel: "Acúmulos" },
  "execucao-predatoria": { mode: "toggle", steps: 4 },
  "impacto-carniceiro": {
    mode: "toggle",
    activeLabel: "Impacto Carniceiro — opção escolhida",
    options: [
      { id: "dano", label: "Dano: +3 Passos", steps: 3 },
      { id: "ignorar-rd", label: "Ignorar metade da RD", ignoreRD: "half" },
      { id: "sem-reacao", label: "Impedir a Reação do alvo" },
    ],
    defaultOptions: ["dano"],
  },
  "gume-perfurante": {
    mode: "toggle",
    options: [
      { id: "dois", label: "Ignorar 2 RD", ignoreRD: 2 },
      { id: "metade", label: "Ignorar metade da RD", minGrade: 10, ignoreRD: "half" },
    ],
    defaultOptions: ["dois"],
  },
  "condensacao-muscular": { mode: "toggle", halfBaseSteps: true },
  "couraca-kakuja-i": { mode: "passive", rd: 2 },
  "couraca-kakuja-ii": { mode: "passive", rd: 2 },
  "couraca-kakuja-iii": { mode: "passive", rd: 2 },
  "couraca-kakuja-iv": { mode: "passive", rd: 2 },
  "tecido-reforcado-i": { mode: "passive", durability: 6 },
  "tecido-reforcado-ii": { mode: "passive", durability: 6 },
  "armadura-adaptativa": { mode: "toggle", rd: 2 },
  "fortaleza-imovel": { mode: "toggle", rdPerStack: 2, stackMax: 2, stackLabel: "Turnos parado" },
  "casulo-de-emergencia": { mode: "toggle", rd: 6 },
  "barreira-elemental": { mode: "toggle", rd: 3 },
  "armazenar-impacto": { mode: "toggle", stepsPerStack: 1, stackMax: "halfGrade", stackLabel: "Carga" },
  "vesicula-de-rc-i": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-ii": { mode: "passive", reserve: 4 },
  "vesicula-de-rc-iii": { mode: "passive", reserve: 4 },
  "cicatrizacao-de-combate-i": { mode: "passive", healing: 2 },
  "cicatrizacao-de-combate-ii": { mode: "passive", healing: 4 },
  "infusao-elemental": { mode: "toggle", modifier: 3 },
  "explosao-elemental": { mode: "toggle", steps: 2 },
  "projetil-elemental": { mode: "toggle", range: 1 },
  "feixe-concentrado": { mode: "toggle", steps: 6 },
  "canhao-de-nucleo": { mode: "toggle", steps: 11 },
  "dominio-elemental": { mode: "toggle", steps: 4, rd: 2 },
  "armadura-elemental": { mode: "toggle", rd: 3 },
  "artilharia-alada": { mode: "toggle", steps: 2 },
  "chuva-de-cristais": { mode: "toggle", steps: -2 },
  "mergulho-rubro": { mode: "toggle", steps: 5 },
  "onda-de-choque": { mode: "toggle", steps: -1 },
  "railgun-organico": { mode: "toggle", steps: 7, accuracy: 4 },
  "predador-dos-ceus": { mode: "toggle", accuracy: 2, dodge: 2 },
  "cidadela-de-carne": { mode: "passive", rd: 3 },
  "arma-de-cerco": { mode: "passive", steps: 2, accuracy: -1 },
  "montanha-inamovivel": { mode: "toggle", rdPerStack: 2, stackMax: 3, stackLabel: "Turnos parado" },
  "arsenal-do-carrasco": {
    mode: "toggle",
    activeLabel: "Arsenal do Carrasco — forma atual",
    options: [
      { id: "sabre", label: "Sabre: +3 acerto", accuracy: 3 },
      { id: "machado", label: "Machado: +5 Passos", steps: 5 },
      { id: "escudo", label: "Escudo: +4 RD", rd: 4 },
      { id: "lanca", label: "Lança: +2 acerto e alcance", accuracy: 2, range: 1 },
    ],
    defaultOptions: ["machado"],
  },
  "fortaleza-de-carne": { mode: "toggle" },
  "caudas-ofensivas": { mode: "passive", steps: 2, rd: -2 },
  "regeneracao-superior": { mode: "passive", healingDivisor: 6 },
  "guarda-de-hidra": {
    mode: "toggle",
    options: [
      { id: "rd", label: "Cauda em guarda: +2 RD", rd: 2 },
      { id: "esquiva", label: "Cauda em guarda: +2 Esquiva", dodge: 2 },
    ],
    defaultOptions: ["rd"],
  },
  "centopeia": { mode: "toggle", steps: 4, accuracy: 2 },
  "predador-perfeito": {
    mode: "toggle",
    activeLabel: "Predador Perfeito — postura atual",
    options: [
      { id: "ataque", label: "Ataque: +2 Passos", steps: 2 },
      { id: "defesa", label: "Defesa: +2 RD", rd: 2 },
      { id: "mobilidade", label: "Mobilidade: +2 Esquiva", dodge: 2 },
    ],
    defaultOptions: ["ataque"],
  },
  "cauda-de-contrapeso": { mode: "toggle", accuracy: 1 },
  "cauda-do-escorpiao": {
    mode: "toggle",
    activeLabel: "Cauda do Escorpião — opção escolhida",
    options: [
      { id: "acerto", label: "Acerto: +2", accuracy: 2 },
      { id: "ignorar-rd", label: "Ignorar metade da RD", ignoreRD: "half" },
      { id: "parte", label: "Atingir parte específica sem penalidade" },
    ],
    defaultOptions: ["acerto"],
  },
  "duelo-absoluto": { mode: "toggle", accuracy: 1 },
  "lamina-adaptativa": { mode: "toggle", steps: 2, accuracy: 1 },
  "evolucao-convergente": {
    mode: "toggle",
    activeLabel: "Evolução Convergente — duas adaptações",
    maxOptions: 2,
    options: [
      { id: "dano", label: "Dano: +5 Passos", steps: 5 },
      { id: "acerto", label: "Acerto: +3", accuracy: 3 },
      { id: "rd", label: "Defesa: +5 RD", rd: 5 },
      { id: "esquiva", label: "Mobilidade: +3 Esquiva", dodge: 3 },
      { id: "alcance", label: "Alcance: +1 espaço", range: 1 },
    ],
    defaultOptions: ["dano", "acerto"],
  },
  "bombardeiro-couracado": { mode: "toggle", rd: 3 },
  "railgun-de-tungstenio": { mode: "toggle", steps: 10, accuracy: 6, ignoreRD: 2 },
  "fenix-centopeia": { mode: "toggle", steps: 3 },
  "predador-de-angulo-morto": { mode: "toggle", steps: 2, accuracy: 2 },
  "linha-de-execucao": { mode: "toggle", steps: 7, accuracy: 5, ignoreRD: "half" },
  "fortaleza-ambulante": { mode: "toggle", rd: 1 },
  "leviata-imortal": { mode: "toggle", steps: 3, rd: 5 },
  "lanca-escorpionica": { mode: "toggle", steps: 3, accuracy: 2 },
  "cavaleiro-escarlate": { mode: "toggle", rd: 4, accuracy: 2 },
  "orochi": { mode: "toggle", steps: 3 },
  "tempestade-de-carne": { mode: "toggle", stepsPerStack: 1, stackMax: 5, stackLabel: "Cargas" },
  "quimera-absoluta": { mode: "toggle", steps: 4, rd: 4, accuracy: 3, dodge: 2, range: 1 },
  "rei-das-feras": { mode: "toggle", steps: 2, accuracy: 2, movement: 1 },
  "bastiao-devorador": { mode: "toggle", rd: 4, stepsPerStack: 1, stackMax: 3, stackLabel: "Cargas consumidas" },
  "enxame-faminto": { mode: "toggle", steps: -2 },
  "muda-adaptativa": { mode: "toggle", rd: 2 },
  "tirano-de-guerra": { mode: "toggle", steps: 6 },
  "fortaleza-que-anda": { mode: "toggle", rd: 6, dodge: -2 },
  "arsenal-de-cem-formas": {
    mode: "toggle",
    activeLabel: "Arsenal de Cem Formas — duas formas",
    maxOptions: 2,
    options: [
      { id: "acerto", label: "Acerto: +3", accuracy: 3 },
      { id: "dano", label: "Dano: +4 Passos", steps: 4 },
      { id: "rd", label: "Defesa: +4 RD", rd: 4 },
      { id: "esquiva", label: "Mobilidade: +2 Esquiva", dodge: 2 },
      { id: "alcance", label: "Alcance: +1 espaço", range: 1 },
    ],
    defaultOptions: ["dano", "acerto"],
  },
  "impacto-de-exterminio": { mode: "toggle", steps: 13, ignoreRD: "half" },
  "canhao-do-kakuhou": { mode: "toggle", steps: 14 },
  "avatar-da-fome": { mode: "toggle", steps: 4, accuracy: 4 },
  "leviata-absoluto": { mode: "toggle", rd: 8 },
  "predador-absoluto": {
    mode: "toggle",
    accuracy: 3,
    activeLabel: "Predador Absoluto — benefício do turno",
    options: [
      { id: "dano", label: "Dano: +4 Passos", steps: 4 },
      { id: "ignorar-rd", label: "Ignorar 4 RD", ignoreRD: 4 },
      { id: "movimento", label: "Mover 1 após atacar", movement: 1 },
    ],
    defaultOptions: ["dano"],
  },
  "ruina-de-cem-membros": { mode: "toggle", steps: 16 },
  "golpe-que-rasga-o-ceu": { mode: "toggle", steps: 18, accuracy: 4, ignoreRD: "half" },
  "calamidade-ambulante": { mode: "toggle", steps: 12, rd: 5, accuracy: 2, range: 1 },
  "forma-dragao": { mode: "toggle", steps: 4 },
  "o-monstro-nao-escolheu": {
    mode: "toggle",
    activeLabel: "O Monstro Não Escolheu — dois aspectos",
    maxOptions: 2,
    options: [
      { id: "dano", label: "Dano: +4 Passos", steps: 4 },
      { id: "esquiva", label: "Esquiva: +3", dodge: 3 },
      { id: "acerto", label: "Acerto: +3", accuracy: 3 },
      { id: "rd", label: "Defesa: +5 RD", rd: 5 },
      { id: "alcance", label: "Alcance: +1 espaço", range: 1 },
      { id: "cura", label: "Primeira cura: +25%" },
    ],
    defaultOptions: ["dano", "rd"],
  },
  "fim-da-cacada": { mode: "toggle", steps: 28, accuracy: 5, ignoreRD: "half" },
  "arquitetura-de-enxame": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "barragem-de-membros": { mode: "toggle", createsAdditional: true },
  "retaliacao-bestial": { mode: "toggle", createsAdditional: true },
  "serafim-carmesim": { mode: "toggle", createsAdditional: true },
  "hidra-faminta": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "membro-de-reserva": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1 },
  "troca-de-presa": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "perseguicao-serrilhada": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "interceptacao-carniceira": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "abertura-compartilhada": { mode: "toggle", createsAdditional: true },
  "investida-bifurcada": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "ruptura-da-guarda": { mode: "toggle", createsAdditional: true, additionalIgnoreRD: 2 },
  "resposta-ao-sangue": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "ultima-mordida": { mode: "toggle", createsAdditional: true },
  "ruptura-em-duas-etapas": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1, additionalIgnoreRD: 2, rd: -3 },
  "mira-do-segundo-golpe": { mode: "toggle", accuracy: -1, additionalAccuracy: 2 },
  "massa-reservada": { mode: "toggle", steps: -1, additionalSteps: 1 },
  "impulso-perfurante": { mode: "toggle", steps: -2, additionalIgnoreRD: 4 },
  "vetor-de-arraste": { mode: "toggle", additionalSteps: -1 },
  "sobrecarga-sinaptica": { mode: "toggle", additionalAccuracy: 2, additionalIgnoreRD: 2 },
  "dupla-salva": {
    mode: "toggle",
    createsAdditional: true,
    options: [
      { id: "outro-alvo", label: "Outro alvo adjacente: sem penalidade" },
      { id: "mesmo-alvo", label: "Mesmo alvo: −1 acerto", additionalAccuracy: -1 },
    ],
    defaultOptions: ["outro-alvo"],
  },
  "disparo-de-recuo": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "contrapeso-ruptor": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1, additionalIgnoreRD: 2, rd: -2 },
  "bastiao-agressivo": { mode: "toggle", createsAdditional: true },
  "cauda-de-reserva": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1, rd: -2 },
  "autotomia-ofensiva": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1 },
  "passo-do-escorpiao": { mode: "toggle", createsAdditional: true, additionalAccuracy: -1 },
  "reversao-perfeita": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1 },
  "alternancia-quimerica": {
    mode: "toggle",
    createsAdditional: true,
    options: [
      { id: "outro-alvo", label: "Outro alvo: sem penalidade" },
      { id: "mesmo-alvo", label: "Mesmo alvo: −1 acerto", additionalAccuracy: -1 },
    ],
    defaultOptions: ["outro-alvo"],
  },
  "pinca-assimetrica": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1 },
  "cacada-paralela": { mode: "toggle", createsAdditional: true, additionalAccuracy: 1 },
  "motor-de-carnificina": { mode: "toggle", additionalAccuracy: 1, rd: -2 },
};

const familySections: Record<string, string> = {
  "13. Módulos Ukaku": "Ukaku",
  "14. Módulos Koukaku": "Koukaku",
  "15. Módulos Rinkaku": "Rinkaku",
  "16. Módulos Bikaku": "Bikaku",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function capForGrade(grade: number, investedPE = 0) {
  const capGrade = ([6, 8, 10, 12, 14] as const).filter((value) => value <= grade).at(-1) || 6;
  return { ...kakujaCaps[capGrade], cm: calculateKakujaCM(grade, investedPE) };
}

function formatDamage(steps: number, modifier: number) {
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
  return Math.max(0, Math.floor(Math.max(0, kaguneSteps)) + moduleSteps + advantageSteps);
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
  const cb = module.cb + (foreign ? 2 : 0);
  return dominant ? Math.max(1, Math.ceil(Math.max(1, cb - 3) / 2)) : Math.ceil(cb / 2);
}

export function calculateKakujaDurability(kaguneDurability: number, ownDurability: number, fragile: boolean) {
  const combined = Math.max(1, Math.floor(kaguneDurability) + Math.floor(ownDurability));
  return fragile ? Math.max(1, Math.floor(combined * 0.75)) : combined;
}

const effectKeys = ["steps", "modifier", "accuracy", "rd", "durability", "reserve", "dodge", "movement", "range", "healing", "healingDivisor", "additionalSteps", "additionalAccuracy"] as const;

function calculationFor(moduleId: string, activeModuleIds: string[], vigor: number, grade: number): Calculation | undefined {
  const original = calculations[moduleId];
  if (!original) return undefined;
  const available = original.options ? { ...original, options: original.options.filter((option) => !option.minGrade || grade >= option.minGrade) } : original;
  if (moduleId === "infusao-elemental" && activeModuleIds.includes("potencia-elemental")) return { ...available, modifier: 6 };
  if (moduleId === "fortaleza-de-carne") return { ...available, rd: Math.floor(Math.max(0, vigor) / 2) };
  if (moduleId === "arsenal-organico" && activeModuleIds.includes("arsenal-vivo-superior")) return { ...available, maxOptions: 2 };
  if (moduleId === "predador-perfeito" && activeModuleIds.includes("mestre-de-nada")) {
    return {
      ...available,
      maxOptions: 2,
      options: available.options?.map((option) => ({
        ...option,
        steps: option.steps ? 4 : option.steps,
        rd: option.rd ? 4 : option.rd,
        dodge: option.dodge ? 4 : option.dodge,
        label: option.label.replace("+2", "+4"),
      })),
    };
  }
  return available;
}

function selectedOptionsFor(config: Calculation, selected: string[] | undefined) {
  if (!config.options?.length) return [];
  const allowed = new Set(config.options.map((option) => option.id));
  const max = Math.max(1, config.maxOptions || 1);
  const stored = (selected || []).filter((id) => allowed.has(id)).slice(0, max);
  const ids = stored.length ? stored : (config.defaultOptions || [config.options[0].id]).slice(0, max);
  return config.options.filter((option) => ids.includes(option.id));
}

type CombatSummaryInput = {
  grade: number;
  vigor: number;
  maxLife: number;
  kaguneSteps: number;
  activeModuleIds: string[];
  activeTechniques: string[];
  techniqueStacks: Record<string, number>;
  techniqueOptions: Record<string, string[]>;
  advantageSteps: number;
  advantageAccuracy: number;
  advantageModifier: number;
  advantageRD: number;
};

export function calculateKakujaCombatSummary(input: CombatSummaryInput): CombatSummary {
  const cap = capForGrade(input.grade);
  const activeSet = new Set(input.activeTechniques);
  const effectiveIds = input.activeModuleIds.filter((id) => {
    if (id === "massa-ampliada-i") return !input.activeModuleIds.includes("massa-ampliada-ii") && !input.activeModuleIds.includes("colosso-de-rc");
    if (id === "massa-ampliada-ii") return !input.activeModuleIds.includes("colosso-de-rc");
    if (id === "cicatrizacao-de-combate-i") return !input.activeModuleIds.includes("cicatrizacao-de-combate-ii");
    return true;
  });
  const passive: NumericEffect[] = [];
  const active: NumericEffect[] = [];
  const selectedGeneratorId = [...input.activeTechniques].reverse().find((id) => effectiveIds.includes(id) && calculationFor(id, effectiveIds, input.vigor, input.grade)?.createsAdditional);

  for (const moduleId of effectiveIds) {
    const config = calculationFor(moduleId, effectiveIds, input.vigor, input.grade);
    if (!config) continue;
    const enabled = config.mode === "passive" || activeSet.has(moduleId);
    if (!enabled) continue;
    if (config.createsAdditional && selectedGeneratorId && moduleId !== selectedGeneratorId) continue;
    const target = config.mode === "passive" ? passive : active;
    const effect: NumericEffect = {};
    for (const key of effectKeys) effect[key] = config[key] as never;
    effect.halfBaseSteps = config.halfBaseSteps;
    effect.ignoreRD = config.ignoreRD;
    effect.createsAdditional = config.createsAdditional;
    effect.additionalIgnoreRD = config.additionalIgnoreRD;
    const stackMax = config.stackMax === "halfGrade" ? Math.floor(input.grade / 2) : (config.stackMax || 0);
    const stacks = stackMax > 0 ? clamp(input.techniqueStacks[moduleId] || 0, 0, stackMax) : 0;
    effect.steps = (effect.steps || 0) + stacks * (config.stepsPerStack || 0);
    effect.rd = (effect.rd || 0) + stacks * (config.rdPerStack || 0);
    for (const option of selectedOptionsFor(config, input.techniqueOptions[moduleId])) {
      for (const key of effectKeys) effect[key] = ((effect[key] as number | undefined) || 0) + ((option[key] as number | undefined) || 0) as never;
      effect.halfBaseSteps ||= option.halfBaseSteps;
      if (option.ignoreRD === "half" || effect.ignoreRD === "half") effect.ignoreRD = "half";
      else effect.ignoreRD = Math.max(effect.ignoreRD || 0, option.ignoreRD || 0) || undefined;
      effect.createsAdditional ||= option.createsAdditional;
      if (option.additionalIgnoreRD === "half" || effect.additionalIgnoreRD === "half") effect.additionalIgnoreRD = "half";
      else effect.additionalIgnoreRD = Math.max(effect.additionalIgnoreRD || 0, option.additionalIgnoreRD || 0) || undefined;
    }
    if (effect.halfBaseSteps) effect.steps = (effect.steps || 0) + Math.floor(Math.max(0, input.kaguneSteps) / 2);
    target.push(effect);
  }

  const sum = (list: NumericEffect[], key: typeof effectKeys[number]) => list.reduce((total, item) => total + ((item[key] as number | undefined) || 0), 0);
  const passivePositiveSteps = passive.reduce((total, item) => total + Math.max(0, item.steps || 0), 0);
  const activePositiveSteps = active.reduce((total, item) => total + Math.max(0, item.steps || 0), 0);
  const negativeSteps = [...passive, ...active].reduce((total, item) => total + Math.min(0, item.steps || 0), 0);
  const positiveStepCap = active.length ? cap.burstSteps : cap.passiveSteps;
  const cappedPositiveSteps = Math.min(positiveStepCap, Math.min(cap.passiveSteps, passivePositiveSteps) + activePositiveSteps);
  const moduleSteps = cappedPositiveSteps + negativeSteps;

  const positiveRD = [...passive, ...active].reduce((total, item) => total + Math.max(0, item.rd || 0), 0);
  const negativeRD = [...passive, ...active].reduce((total, item) => total + Math.min(0, item.rd || 0), 0);
  const moduleRD = Math.min(cap.rd, positiveRD) + negativeRD;
  const passivePositiveAccuracy = passive.reduce((total, item) => total + Math.max(0, item.accuracy || 0), 0);
  const passiveNegativeAccuracy = passive.reduce((total, item) => total + Math.min(0, item.accuracy || 0), 0);
  const moduleAccuracy = Math.min(2, passivePositiveAccuracy) + passiveNegativeAccuracy + sum(active, "accuracy");
  const totalSteps = calculateKakujaSteps(input.kaguneSteps, moduleSteps, input.advantageSteps);
  const totalModifier = 2 + sum(passive, "modifier") + sum(active, "modifier") + input.advantageModifier;
  const totalAccuracy = moduleAccuracy + input.advantageAccuracy;
  const totalRD = Math.max(0, 2 + moduleRD + input.advantageRD);
  const healing = Math.max(
    sum(passive, "healing") + sum(active, "healing"),
    ...[...passive, ...active].map((item) => item.healingDivisor ? Math.floor(input.maxLife / item.healingDivisor) : 0),
  );
  const all = [...passive, ...active];
  const ignorePrimaryRD = all.some((item) => item.ignoreRD === "half")
    ? "half" as const
    : Math.max(0, ...all.map((item) => typeof item.ignoreRD === "number" ? item.ignoreRD : 0)) || null;
  const ignoreRD = all.some((item) => item.additionalIgnoreRD === "half")
    ? "half" as const
    : Math.max(0, ...all.map((item) => typeof item.additionalIgnoreRD === "number" ? item.additionalIgnoreRD : 0)) || null;
  const additionalActive = active.some((item) => item.createsAdditional);

  return {
    moduleSteps,
    totalSteps,
    totalModifier,
    totalAccuracy,
    moduleRD,
    totalRD,
    durabilityBonus: sum(passive, "durability") + sum(active, "durability"),
    reserveMax: sum(passive, "reserve") + sum(active, "reserve"),
    dodge: sum(passive, "dodge") + sum(active, "dodge"),
    movement: sum(passive, "movement") + sum(active, "movement"),
    range: sum(passive, "range") + sum(active, "range"),
    healing,
    ignoreRD: ignorePrimaryRD,
    additional: {
      active: additionalActive,
      steps: additionalActive ? Math.max(0, Math.floor(totalSteps / 2) + sum(all, "additionalSteps")) : 0,
      modifier: totalModifier,
      accuracy: totalAccuracy + sum(all, "additionalAccuracy"),
      ignoreRD,
    },
  };
}

export function KakujaPanel({ grade, species, vigor, maxLife, kaguneSteps, kaguneDurability, kaguneFamilies, state, onChange }: Props) {
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
  const cap = capForGrade(grade, state.extraKakujaPE);
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
  const customSpent = state.customModules.reduce((total, item) => total + actualCost(item, dominant), 0);
  const spent = modulesSpent + customSpent;
  const budget = awakened ? 6 + Math.max(0, state.extraKakujaPE) + instabilityCredit : 0;
  const remaining = budget - spent;
  const profileCM = activeModules.reduce((total, item) => total + item.cm, 0) + activeCustomModules.reduce((total, item) => total + item.cm, 0);
  const allowedCM = cap.cm + (state.overload ? 2 : 0);
  const profileLimit = selectedSet.has("morfologia-alternativa-ii") ? 3 : selectedSet.has("morfologia-alternativa-i") ? 2 : 1;
  const activeEvolutionCount = activeModules.filter((item) => item.section.startsWith("18.")).length;
  const profileValid = remaining >= 0 && profileCM <= allowedCM && activeEvolutionCount <= 1 && activeCustomModules.every((item) => item.grade <= grade);
  const eligibleActiveModules = awakened && profileValid
    ? activeModules.filter((module) => moduleAllowed(module) && moduleRequirementMet(module))
    : [];
  const eligibleActiveIds = eligibleActiveModules.map((module) => module.id);
  const calculationStackMax = (item: Calculation) => item.stackMax === "halfGrade" ? Math.floor(grade / 2) : (item.stackMax || 0);
  const combat = calculateKakujaCombatSummary({
    grade,
    vigor,
    maxLife,
    kaguneSteps,
    activeModuleIds: eligibleActiveIds,
    activeTechniques: state.activeTechniques,
    techniqueStacks: state.techniqueStacks,
    techniqueOptions: state.techniqueOptions,
    advantageSteps: state.advantageSteps,
    advantageAccuracy: state.advantageAccuracy,
    advantageModifier: state.advantageModifier,
    advantageRD: state.advantageRD,
  });

  const moduleSteps = combat.moduleSteps;
  const initialSteps = Math.floor(Math.max(0, kaguneSteps));
  const totalSteps = combat.totalSteps;
  const totalModifier = combat.totalModifier;
  const totalAccuracy = combat.totalAccuracy;
  const damage = formatDamage(totalSteps, totalModifier);
  const rd = combat.totalRD;
  const typeMultiplier = kaguneFamilies[0] === "Koukaku" ? 1.5 : kaguneFamilies[0] === "Ukaku" ? (eligibleActiveIds.includes("blindagem-cristalina") ? 0.8 : 0.5) : 1;
  const ownDurability = Math.max(1, Math.floor((vigor + grade + spent + combat.durabilityBonus) * typeMultiplier));
  const durability = calculateKakujaDurability(kaguneDurability, ownDurability, state.selectedInstabilities.includes("carapaca-fragil"));
  const overloadedCM = state.overload ? Math.max(0, profileCM - cap.cm) : 0;
  const controlMD = Math.ceil(grade / 2) + (state.selectedInstabilities.includes("mente-rachada") ? 1 : 0) + overloadedCM;
  const activationCost = Math.max(2, 4 - (eligibleActiveIds.includes("metabolismo-eficiente") && state.activationsSinceRest === 0 ? 2 : 0)) + overloadedCM * 2;
  const nextHunger = (state.activationsSinceRest > 0 ? 2 : 0) + (state.selectedInstabilities.includes("fome-anormal") ? 1 : 0) + (overloadedCM > 0 ? 1 : 0);
  const reserveMax = combat.reserveMax;

  const issues = [
    !ghoulSpecies ? "Kakuja é exclusiva de Ghoul; Quinx e espécies humanas não têm acesso." : "",
    state.cannibalPE < 25 ? `Faltam ${25 - state.cannibalPE} PE obtidos por canibalização para a Kakuja Incompleta.` : "",
    state.complete && state.cannibalPE < 60 ? `Faltam ${60 - state.cannibalPE} PE de canibalização e o desenvolvimento narrativo para a Kakuja Completa.` : "",
    remaining < 0 ? `O repertório excede o orçamento em ${Math.abs(remaining)} PE-K.` : "",
    profileCM > allowedCM ? `O Perfil ativo usa ${profileCM} CM; o limite atual é ${allowedCM}.` : "",
    activeEvolutionCount > 1 ? "Somente uma Evolução de Kakuja pode ficar ativa no mesmo Perfil." : "",
    activeCustomModules.some((item) => item.grade > grade) ? "O Perfil ativo contém módulo autoral acima do Grau atual." : "",
    ...activeModules.filter((item) => !moduleAllowed(item)).map((item) => `${item.name} não está sendo aplicado: Grau ou tipo de Kakuhou incompatível.`),
    ...state.selectedModules.filter((id) => {
      const item = kakujaModules.find((candidate) => candidate.id === id);
      return item ? !moduleRequirementMet(item) : false;
    }).map((id) => `Pré-requisito pendente em ${kakujaModules.find((item) => item.id === id)?.name || id}.`),
    instabilityRaw > instabilityCap ? `Instabilidades somam ${instabilityRaw} PE-K, mas o Grau permite reembolso máximo de ${instabilityCap}.` : "",
  ].filter(Boolean);

  const sections = ["Todos", ...Array.from(new Set(kakujaModules.map((item) => item.section)))];
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filteredModules = kakujaModules.filter((item) => (section === "Todos" || item.section === section) && (!query || `${item.name} ${item.category} ${item.effect}`.toLocaleLowerCase("pt-BR").includes(query)));

  const patch = (next: Partial<KakujaState>) => onChange({ ...state, ...next });
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
        techniqueOptions: Object.fromEntries(Object.entries(state.techniqueOptions).filter(([id]) => !removed.has(id))),
        profiles: state.profiles.map((profile) => ({ ...profile, moduleIds: profile.moduleIds.filter((id) => !removed.has(id)) })),
        ...(removed.has("infusao-elemental") ? { selectedElements: [], activeElement: "" } : {}),
      });
      return;
    }
    if (!moduleAllowed(module) || !moduleRequirementMet(module) || actualCost(module, dominant, moduleIsForeign(module)) > remaining) return;
    const targetProfileId = activeProfile?.id || state.profiles[0]?.id;
    const targetProfile = state.profiles.find((profile) => profile.id === targetProfileId);
    const targetProfileCM = (targetProfile?.moduleIds || []).reduce((total, id) => total + (kakujaModules.find((item) => item.id === id)?.cm || 0), 0)
      + (targetProfile?.customModuleIds || []).reduce((total, id) => total + (state.customModules.find((item) => item.id === id)?.cm || 0), 0);
    const targetHasEvolution = (targetProfile?.moduleIds || []).some((id) => kakujaModules.find((item) => item.id === id)?.section.startsWith("18."));
    const canAutoManifest = targetProfileCM + module.cm <= allowedCM && (!module.section.startsWith("18.") || !targetHasEvolution);
    patch({
      selectedModules: [...state.selectedModules, module.id],
      profiles: state.profiles.map((profile) => canAutoManifest && profile.id === targetProfileId && !profile.moduleIds.includes(module.id)
        ? { ...profile, moduleIds: [...profile.moduleIds, module.id] }
        : profile),
    });
  };

  const toggleProfileModule = (profileId: string, moduleId: string, custom = false) => {
    patch({ profiles: state.profiles.map((profile) => {
      if (profile.id !== profileId) return profile;
      const key = custom ? "customModuleIds" : "moduleIds";
      const values = profile[key];
      if (values.includes(moduleId)) return { ...profile, [key]: values.filter((id) => id !== moduleId) };
      const profileItem = custom ? state.customModules.find((item) => item.id === moduleId) : kakujaModules.find((item) => item.id === moduleId);
      if (!profileItem || profileItem.grade > grade) return profile;
      const currentCM = profile.moduleIds.reduce((total, id) => total + (kakujaModules.find((item) => item.id === id)?.cm || 0), 0)
        + profile.customModuleIds.reduce((total, id) => total + (state.customModules.find((item) => item.id === id)?.cm || 0), 0);
      if (currentCM + profileItem.cm > allowedCM) return profile;
      if (!custom) {
        const catalogModule = profileItem as KakujaModule;
        if (!moduleAllowed(catalogModule) || !moduleRequirementMet(catalogModule)) return profile;
        if (catalogModule.section.startsWith("18.") && profile.moduleIds.some((id) => kakujaModules.find((item) => item.id === id)?.section.startsWith("18."))) return profile;
      }
      return { ...profile, [key]: [...values, moduleId] };
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
      <div><span>Sistema modular exclusivo</span><h2>{state.name || "Kakuja sem epíteto"}</h2><p>A Kakuja usa os Passos atuais da Kagune como base. Seus módulos, Perfis, CM, Dureza e reserva continuam sendo calculados separadamente.</p></div>
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
            <label className="field"><span>RC atual da Reserva</span><input type="number" min="0" max={reserveMax} value={Math.min(state.currentReserve, reserveMax)} disabled={reserveMax === 0} onChange={(event) => patch({ currentReserve: clamp(Number(event.target.value), 0, reserveMax) })} /></label>
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
          <article><span>Dureza total da Kakuja</span><strong>{durability}</strong><small>{kaguneDurability} da Kakuhou + {ownDurability} própria{state.selectedInstabilities.includes("carapaca-fragil") ? " −25%" : ""}</small></article>
          <article><span>Reserva Kakuja</span><strong>{Math.min(state.currentReserve, reserveMax)}/{reserveMax} RC</strong><small>{reserveMax ? "Ajustável no painel acima" : "Exige Vesícula de RC ativa no Perfil"}</small></article>
          <article><span>Próxima ativação</span><strong>{activationCost} RC</strong><small>+{nextHunger} Fome adicional</small></article>
        </div>

        <section className="kakuja-combat section-block">
          <div className="kakuja-damage-card">
            <div><span>Dano da Kakuja</span><strong>{damage}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(damage)}>Copiar</button></div>
            <dl><div><dt>Base da Kagune</dt><dd>{initialSteps} Passos</dd></div><div><dt>Módulos ativos</dt><dd>{moduleSteps >= 0 ? "+" : ""}{moduleSteps} Passos</dd></div><div><dt>Vantagens</dt><dd>{state.advantageSteps >= 0 ? "+" : ""}{state.advantageSteps} Passos</dd></div><div><dt>Acerto ativo</dt><dd>{totalAccuracy >= 0 ? "+" : ""}{totalAccuracy}</dd></div><div><dt>RD total</dt><dd>{rd}</dd></div><div><dt>Ignora RD</dt><dd>{combat.ignoreRD === "half" ? "Metade" : combat.ignoreRD || "—"}</dd></div><div><dt>Esquiva</dt><dd>{combat.dodge >= 0 ? "+" : ""}{combat.dodge}</dd></div><div><dt>Movimento</dt><dd>{combat.movement >= 0 ? "+" : ""}{combat.movement} espaço(s)</dd></div><div><dt>Alcance</dt><dd>{combat.range >= 0 ? "+" : ""}{combat.range} espaço(s)</dd></div>{combat.healing > 0 && <div><dt>Regeneração Kakuja</dt><dd>{combat.healing} Vida/turno</dd></div>}</dl>
            <p><b>Regra aplicada:</b> a Kakuja começa com os mesmos {initialSteps} Passos de Dano atuais da Kagune. Depois são somados os módulos manifestados no Perfil ativo e os bônus de Vantagens.</p>
          </div>
          <div className="kakuja-advantage-box">
            <div><span>Bônus de Vantagens</span><strong>Aplicação separada</strong></div>
            <p>Preencha somente bônus vindos de Vantagens que estejam ativos. Eles entram depois dos tetos próprios da Kakuja.</p>
            <div className="field-grid two">
              <label className="field"><span>Passos</span><input type="number" value={state.advantageSteps} onChange={(event) => patch({ advantageSteps: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Acerto</span><input type="number" value={state.advantageAccuracy} onChange={(event) => patch({ advantageAccuracy: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>Mod. de dano</span><input type="number" value={state.advantageModifier} onChange={(event) => patch({ advantageModifier: clamp(Number(event.target.value), -30, 30) })} /></label>
              <label className="field"><span>RD</span><input type="number" value={state.advantageRD} onChange={(event) => patch({ advantageRD: clamp(Number(event.target.value), -30, 30) })} /></label>
            </div>
          </div>
        </section>

        {combat.additional.active && <section className="kakuja-additional-card section-block"><div><span>Ataque adicional ativo</span><strong>{formatDamage(combat.additional.steps, combat.additional.modifier)}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(formatDamage(combat.additional.steps, combat.additional.modifier))}>Copiar</button></div><dl><div><dt>Passos</dt><dd>{combat.additional.steps}</dd></div><div><dt>Acerto</dt><dd>{combat.additional.accuracy >= 0 ? "+" : ""}{combat.additional.accuracy}</dd></div><div><dt>Ignora RD</dt><dd>{combat.additional.ignoreRD === "half" ? "Metade" : combat.additional.ignoreRD || "—"}</dd></div></dl><p>Calculado com metade dos Passos finais, mínimo 0. Apenas um gerador de ataque adicional pode ficar ligado por vez; alteradores compatíveis continuam somando.</p></section>}

        {eligibleActiveModules.some((item) => calculationFor(item.id, eligibleActiveIds, vigor, grade)?.mode === "toggle") && <section className="section-block">
          <div className="kakuja-section-title"><div><span>Cena atual</span><h3>Técnicas e condições ativas</h3></div><small>Somente itens do Perfil ativo aparecem aqui.</small></div>
          <div className="kakuja-techniques">{eligibleActiveModules.filter((item) => calculationFor(item.id, eligibleActiveIds, vigor, grade)?.mode === "toggle").map((item) => {
            const config = calculationFor(item.id, eligibleActiveIds, vigor, grade)!; const active = state.activeTechniques.includes(item.id); const stackMax = calculationStackMax(config);
            const selectedOptionIds = selectedOptionsFor(config, state.techniqueOptions[item.id]).map((option) => option.id);
            const maxOptions = Math.max(1, config.maxOptions || 1);
            const generatorIds = eligibleActiveModules.filter((candidate) => calculationFor(candidate.id, eligibleActiveIds, vigor, grade)?.createsAdditional).map((candidate) => candidate.id);
            const toggleTechnique = (checked: boolean) => {
              const retained = state.activeTechniques.filter((id) => id !== item.id && (!checked || !config.createsAdditional || !generatorIds.includes(id)));
              patch({ activeTechniques: checked ? [...retained, item.id] : retained, techniqueStacks: checked ? state.techniqueStacks : { ...state.techniqueStacks, [item.id]: 0 } });
            };
            const toggleOption = (optionId: string, checked = true) => {
              const next = maxOptions === 1
                ? [optionId]
                : checked
                  ? [...selectedOptionIds.filter((id) => id !== optionId), optionId].slice(-maxOptions)
                  : selectedOptionIds.filter((id) => id !== optionId);
              patch({ techniqueOptions: { ...state.techniqueOptions, [item.id]: next.length ? next : selectedOptionIds } });
            };
            return <article key={item.id} className={active ? "active" : ""}>
              <label className="technique-main"><Checkbox checked={active} onCheckedChange={toggleTechnique} /><span><b>{config.activeLabel || item.name}</b><small>{item.effect}</small></span></label>
              {active && config.options && maxOptions === 1 && <label className="technique-option-select"><span>Opção aplicada</span><select value={selectedOptionIds[0]} onChange={(event) => toggleOption(event.target.value)}>{config.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
              {active && config.options && maxOptions > 1 && <div className="technique-options"><span>Escolha até {maxOptions}</span>{config.options.map((option) => { const checked = selectedOptionIds.includes(option.id); return <label key={option.id}><Checkbox checked={checked} disabled={!checked && selectedOptionIds.length >= maxOptions} onCheckedChange={(next) => toggleOption(option.id, next)} /><small>{option.label}</small></label>; })}</div>}
              {stackMax > 0 && <span className="technique-stack"><i>{config.stackLabel || "Acúmulos"}</i><input type="number" min={0} max={stackMax} disabled={!active} value={state.techniqueStacks[item.id] || 0} onChange={(event) => patch({ techniqueStacks: { ...state.techniqueStacks, [item.id]: clamp(Number(event.target.value), 0, stackMax) } })} /><em>máx. {stackMax}</em></span>}
            </article>;
          })}</div>
        </section>}

        {issues.length > 0 && <section className="kakuja-issues"><strong>Verificações pendentes</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
      </div>}

      {activeTab === "modulos" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="catalog-toolbar kakuja-toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, efeito ou categoria" /></label><select value={section} onChange={(event) => setSection(event.target.value)}>{sections.map((item) => <option key={item}>{item}</option>)}</select></section>
        <div className="catalog-summary"><span>{filteredModules.length} módulos documentados nesta seleção</span><strong>{state.selectedModules.length} comprados · {spent} PE-K</strong></div>
        <section className="catalog-grid kakuja-module-grid">{filteredModules.map((item) => {
          const purchased = selectedSet.has(item.id); const allowed = moduleAllowed(item); const requirement = moduleRequirementMet(item); const missing = missingModuleRequirements(item); const foreign = moduleIsForeign(item); const cost = actualCost(item, dominant, foreign);
          return <article key={item.id} className={`catalog-card kakuja-module-card ${purchased ? "selected" : ""} ${!allowed || !requirement ? "unavailable" : ""}`}>
            <div className="catalog-card-top"><span>{item.section.replace(/^\d+\.\s*/, "")}</span><b>{cost} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p>
            <div className="kakuja-card-meta"><span>Grau {item.grade}+</span><span>{item.cm} CM</span><span>CB {item.cb} / CK {item.ck}</span></div>
            <div className="requirement">{item.category}{foreign && <em>Bikaku estrangeiro: +2 CB</em>}{grade < item.grade && <em>Exige Grau {item.grade}</em>}{item.minFamilies && familySet.size < item.minFamilies && <em>Exige {item.minFamilies} tipos reais de Kakuhou</em>}{!allowed && grade >= item.grade && !(item.minFamilies && familySet.size < item.minFamilies) && <em>Tipo incompatível</em>}{missing.map((name) => <em key={name}>Falta: {name}</em>)}{!purchased && cost > remaining && <em>Faltam {cost - remaining} PE-K</em>}{purchased && <em>{eligibleActiveIds.includes(item.id) ? "Aplicado no Perfil ativo" : activeIds.includes(item.id) ? "Manifestado, mas bloqueado por regra do Perfil" : "Comprado; manifeste na aba Perfis"}</em>}</div>
            <div className="card-actions solo"><button type="button" className={purchased ? "remove" : "add"} disabled={!purchased && (!allowed || !requirement || !awakened || cost > remaining)} onClick={() => togglePurchased(item)}>{purchased ? "Remover" : "Comprar"}</button></div>
          </article>;
        })}</section>
      </div>}

      {activeTab === "perfis" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-profile-intro"><div><span>CM · 30 + Grau + investimento</span><strong>{cap.cm}</strong></div><p>30 base + {grade} do Grau + {Math.floor(Math.max(0, state.extraKakujaPE) / 10) * 2} por investimento. A cada 10 PE comuns investidos na Kakuja, todos os Perfis recebem +2 CM. Comprar adiciona ao repertório; marcar no Perfil manifesta o módulo.</p></section>
        <div className="kakuja-profiles">{state.profiles.map((profile, index) => {
          const profileModules = profile.moduleIds.map((id) => kakujaModules.find((item) => item.id === id)).filter(Boolean) as KakujaModule[];
          const profileCustom = profile.customModuleIds.map((id) => state.customModules.find((item) => item.id === id)).filter(Boolean) as KakujaCustomModule[];
          const cm = profileModules.reduce((total, item) => total + item.cm, 0) + profileCustom.reduce((total, item) => total + item.cm, 0);
          const evolutionCount = profileModules.filter((item) => item.section.startsWith("18.")).length;
          const selectable = index < profileLimit;
          return <section key={profile.id} className={`section-block kakuja-profile ${state.activeProfileId === profile.id ? "active" : ""}`}>
            <div className="kakuja-profile-head"><input value={profile.name} onChange={(event) => patch({ profiles: state.profiles.map((item) => item.id === profile.id ? { ...item, name: event.target.value } : item) })} /><div><span className={cm > allowedCM ? "bad" : ""}>{cm}/{allowedCM} CM</span><button type="button" disabled={!selectable || !awakened || cm > allowedCM || evolutionCount > 1} onClick={() => patch({ activeProfileId: profile.id })}>{state.activeProfileId === profile.id ? "Ativo" : !selectable ? "Exige Morfologia" : cm > allowedCM ? "CM excedida" : evolutionCount > 1 ? "Evolução excedida" : "Usar Perfil"}</button></div></div>
            {!selectable && <p className="kakuja-profile-note">Planejamento salvo, mas este Perfil não pode ser escolhido sem ampliar Morfologia Alternativa.</p>}
            {evolutionCount > 1 && <p className="kakuja-profile-warning">Somente uma Evolução pode permanecer ativa por Perfil.</p>}
            <div className="kakuja-profile-list">{state.selectedModules.map((id) => { const item = kakujaModules.find((candidate) => candidate.id === id); if (!item) return null; const checked = profile.moduleIds.includes(id); const blocked = !checked && (cm + item.cm > allowedCM || item.grade > grade || !moduleAllowed(item) || !moduleRequirementMet(item) || (item.section.startsWith("18.") && evolutionCount > 0)); return <label key={id}><Checkbox checked={checked} disabled={blocked} onCheckedChange={() => toggleProfileModule(profile.id, id)} /><span><b>{item.name}</b><small>{item.cm} CM · {blocked ? "Não cabe ou requisito pendente" : item.category}</small></span></label>; })}{state.customModules.map((item) => { const checked = profile.customModuleIds.includes(item.id); const blocked = !checked && (cm + item.cm > allowedCM || item.grade > grade); return <label key={item.id}><Checkbox checked={checked} disabled={blocked} onCheckedChange={() => toggleProfileModule(profile.id, item.id, true)} /><span><b>{item.name}</b><small>{item.cm} CM · {blocked ? "Não cabe ou Grau insuficiente" : "Autoral"}</small></span></label>; })}</div>
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
          <div className="kakuja-author-total"><div><span>CB</span><strong>{draftCB}</strong></div><div><span>CK</span><strong>{draftCK}</strong></div><div><span>CM</span><strong>{draftCM}</strong></div><button type="button" disabled={!awakened || draftGrade > grade || draftCK > remaining} onClick={addCustomModule}>Criar módulo</button></div>
        </section>
        {state.customModules.length > 0 && <section className="catalog-grid kakuja-module-grid">{state.customModules.map((item) => <article key={item.id} className="catalog-card kakuja-module-card selected"><div className="catalog-card-top"><span>Autoral</span><b>{actualCost(item, dominant)} PE-K</b></div><h3>{item.name}</h3><p>{item.effect}</p><div className="kakuja-card-meta"><span>Grau {item.grade}+</span><span>{item.cm} CM</span><span>CB {item.cb}</span></div><div className="card-actions solo"><button type="button" className="remove" onClick={() => patch({ customModules: state.customModules.filter((candidate) => candidate.id !== item.id), profiles: state.profiles.map((profile) => ({ ...profile, customModuleIds: profile.customModuleIds.filter((id) => id !== item.id) })) })}>Remover</button></div></article>)}</section>}
      </div>}

      {activeTab === "regras" && <div className="kakuja-tab-content" role="tabpanel">
        <section className="kakuja-rule-grid">{universalKakujaRules.map((rule) => <article key={rule.title}><span>{String(universalKakujaRules.indexOf(rule) + 1).padStart(2, "0")}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></article>)}</section>
      </div>}
    </div>
  </div>;
}
