/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  archetypes,
  attributeDescriptions,
  attributeKeys,
  attributeLabels,
  drawbacks,
  evolutions,
  kaguneEffects,
  mentalAttributes,
  perks,
  physicalAttributes,
  speciesOptions,
  type AttributeKey,
  type Drawback,
  type Evolution,
  type KaguneEffect,
  type Perk,
  type SpeciesId,
} from "./data";

type TabId = "resumo" | "atributos" | "vantagens" | "kakuhou" | "historia";
type KaguneFamily = "Ukaku" | "Koukaku" | "Rinkaku" | "Bikaku";
type WeaponKind = "nenhum" | "kagune" | "quinque" | "arata";
type RankedChoice = { rank: number; target?: AttributeKey };
type InventoryItem = { id: string; name: string; quantity: number; notes: string };

type CharacterSheet = {
  id: string;
  name: string;
  player: string;
  age: string;
  pronouns: string;
  species: SpeciesId;
  grade: number;
  archetype: string;
  concept: string;
  centralPhrase: string;
  image: string;
  baseAttributes: Record<AttributeKey, number>;
  extraDice: Record<AttributeKey, number>;
  mentalBonus: AttributeKey;
  physicalBonus: AttributeKey;
  secondMentalBonus: AttributeKey;
  perks: Record<string, RankedChoice>;
  drawbacks: Record<string, RankedChoice>;
  weaponKind: WeaponKind;
  kaguneName: string;
  kaguneType: KaguneFamily;
  kaguneSecondType: KaguneFamily | "";
  kaguneActive: boolean;
  quinxFrame: number;
  sourceGhoulGrade: number;
  effects: Record<string, RankedChoice>;
  selectedEvolutions: string[];
  extraPE: number;
  includeGradePE: boolean;
  currentLife: number;
  currentSanity: number;
  currentRC: number;
  hunger: number;
  instinct: number;
  anchors: { name: string; bond: string }[];
  appearance: string;
  history: string;
  personality: string;
  kaguneDescription: string;
  notes: string;
  conditions: string;
  inventory: InventoryItem[];
  updatedAt: number;
};

type SaveFile = { version: 2; activeId: string; characters: CharacterSheet[] };
const STORAGE_KEY = "fome-justica-fichas-v2";
const THEME_KEY = "fome-justica-theme";

const blankAttributeMap = (value = 0): Record<AttributeKey, number> => ({
  forca: value,
  vigor: value,
  precisao: value,
  agilidade: value,
  raciocinio: value,
  percepcao: value,
  presenca: value,
  controle: value,
});

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function newCharacter(name = "Novo personagem"): CharacterSheet {
  return {
    id: uid(), name, player: "", age: "", pronouns: "", species: "humano", grade: 2,
    archetype: "O Protetor", concept: "", centralPhrase: "", image: "",
    baseAttributes: blankAttributeMap(), extraDice: blankAttributeMap(),
    mentalBonus: "raciocinio", physicalBonus: "forca", secondMentalBonus: "controle",
    perks: {}, drawbacks: {}, weaponKind: "nenhum", kaguneName: "", kaguneType: "Rinkaku",
    kaguneSecondType: "", kaguneActive: false, quinxFrame: 2, sourceGhoulGrade: 2,
    effects: {}, selectedEvolutions: [], extraPE: 0, includeGradePE: true,
    currentLife: 0, currentSanity: 0, currentRC: 0, hunger: 0, instinct: 0,
    anchors: [{ name: "", bond: "" }, { name: "", bond: "" }, { name: "", bond: "" }],
    appearance: "", history: "", personality: "", kaguneDescription: "", notes: "", conditions: "",
    inventory: [], updatedAt: Date.now(),
  };
}

function normalizeCharacter(input: Partial<CharacterSheet>): CharacterSheet {
  const base = newCharacter(input.name || "Personagem");
  return {
    ...base, ...input, id: input.id || base.id,
    baseAttributes: { ...base.baseAttributes, ...(input.baseAttributes || {}) },
    extraDice: { ...base.extraDice, ...(input.extraDice || {}) },
    perks: input.perks || {}, drawbacks: input.drawbacks || {}, effects: input.effects || {},
    selectedEvolutions: input.selectedEvolutions || [],
    anchors: input.anchors?.length ? input.anchors.slice(0, 3) : base.anchors,
    inventory: input.inventory || [],
  };
}

function rankCost(cost: number | number[], rank: number, mode: "choice" | "sum" = "sum") {
  if (rank <= 0) return 0;
  if (typeof cost === "number") return cost * rank;
  if (mode === "choice") return cost[Math.min(rank - 1, cost.length - 1)] ?? 0;
  return cost.slice(0, rank).reduce((total, item) => total + item, 0);
}

function incrementalCosts(effect: KaguneEffect, rank: number) {
  if (rank <= 0) return [];
  if (typeof effect.cost === "number") return Array.from({ length: rank }, () => effect.cost as number);
  if (effect.costMode === "choice") return effect.cost.slice(0, rank).map((total, index, list) => total - (list[index - 1] || 0));
  return effect.cost.slice(0, rank);
}

function attributePurchaseCost(level: number) {
  let total = 0;
  for (let next = 1; next <= level; next += 1) total += Math.max(2, next - 1);
  return total;
}

function formatTest(dice: number, modifier: number, zeroAttribute = false) {
  if (zeroAttribute) return `${Math.max(2, dice)}d8${modifier > 0 ? `++${modifier}` : ""}>>5`;
  return `${Math.max(1, dice)}d8${modifier > 0 ? `++${modifier}` : ""}>>5`;
}

const humanSurchargeIds = new Set([
  "terapeuta", "atante-medicina", "determinado-salvar", "apostador", "arma-favorita",
  "paciente", "nunca-prostra", "corpo-pesado", "corpo-leve", "frio-calculista",
  "observador-frio", "furioso",
]);

function hasHumanPerkSurcharge(item: Perk, species: SpeciesId) {
  const qualifiesForHumanSurcharge = item.category !== "Genérica" || humanSurchargeIds.has(item.id) || item.id.startsWith("acurado-");
  return species === "humano" && qualifiesForHumanSurcharge;
}

function perkCostForSheet(item: Perk, rank: number, species: SpeciesId) {
  const base = rankCost(item.cost, rank, item.costMode);
  return base + (hasHumanPerkSurcharge(item, species) ? 2 * rank : 0);
}

function perkRequirementMet(perk: Perk, sheet: CharacterSheet, permanentAttributes: Record<AttributeKey, number>) {
  if (perk.species && !perk.species.includes(sheet.species)) return false;
  if (perk.attribute && perk.min && permanentAttributes[perk.attribute] < perk.min) return false;
  if (perk.requirement === "Aliado" && !sheet.perks.aliado) return false;
  if (perk.requirement === "Refúgio" && !sheet.perks.refugio) return false;
  return true;
}

function familyColor(family: string) {
  if (family === "Ukaku") return "sky";
  if (family === "Koukaku") return "amber";
  if (family === "Rinkaku") return "crimson";
  if (family === "Bikaku") return "violet";
  return "neutral";
}

function effectMaximum(item: KaguneEffect, sheet: CharacterSheet) {
  let max = item.maxRank || 1;
  if (item.id === "aumentar-dano") max = Math.min(max, Math.max(1, Math.floor(sheet.grade / 2)));
  if (item.id === "aumentar-passos") max = Math.min(max, Math.max(1, Math.floor(sheet.grade / 2)));
  if (item.id === "aumentar-distancia") max = sheet.kaguneType === "Koukaku" || sheet.kaguneSecondType === "Koukaku" ? 2 : 1;
  if (item.id === "couraca-superior") max = Math.max(1, Math.floor(sheet.grade / 2));
  if (sheet.kaguneType === "Bikaku" && item.family !== "Geral" && item.family !== "Bikaku" && !sheet.selectedEvolutions.includes("custo-beneficio")) max = Math.max(1, max - 1);
  return max;
}

export default function Home() {
  const [characters, setCharacters] = useState<CharacterSheet[]>(() => [{ ...newCharacter(), id: "rascunho-local" }]);
  const [activeId, setActiveId] = useState("rascunho-local");
  const [tab, setTab] = useState<TabId>("resumo");
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [copied, setCopied] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [perkCategory, setPerkCategory] = useState("Todas");
  const [perkView, setPerkView] = useState<"vantagens" | "desvantagens">("vantagens");
  const [effectSearch, setEffectSearch] = useState("");
  const [effectFamily, setEffectFamily] = useState("Compatíveis");
  const [showMenu, setShowMenu] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const sheet = characters.find((character) => character.id === activeId) || characters[0];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SaveFile>;
        const loaded = (parsed.characters || []).map(normalizeCharacter);
        if (loaded.length) {
          setCharacters(loaded);
          setActiveId(loaded.some((item) => item.id === parsed.activeId) ? String(parsed.activeId) : loaded[0].id);
        }
      }
    } catch { /* Mantém uma ficha limpa se o salvamento local estiver corrompido. */ }
    finally { setHydrated(true); }
  }, []);

  useEffect(() => {
    try {
      setTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
    } catch { /* Usa o tema claro se o navegador bloquear armazenamento. */ }
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* A preferência continua ativa nesta visita. */ }
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, activeId, characters } satisfies SaveFile));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [characters, activeId, hydrated]);

  const updateSheet = (updater: (current: CharacterSheet) => CharacterSheet) => {
    setCharacters((current) => current.map((character) => character.id === activeId ? { ...updater(character), updatedAt: Date.now() } : character));
  };
  const patchSheet = (patch: Partial<CharacterSheet>) => updateSheet((current) => ({ ...current, ...patch }));

  const derived = useMemo(() => {
    const species = speciesOptions.find((item) => item.id === sheet.species) || speciesOptions[0];
    const speciesBonuses = blankAttributeMap();
    const humanBased = ["humano", "humano-dominante", "ghoul-artificial", "quinx"].includes(sheet.species);
    if (humanBased) speciesBonuses[sheet.mentalBonus] += 1;
    if (sheet.species === "humano-dominante") speciesBonuses[sheet.physicalBonus] += 2;
    if (sheet.species === "ghoul-dominante") { speciesBonuses[sheet.physicalBonus] += 1; speciesBonuses[sheet.secondMentalBonus] += 1; }
    if (sheet.species === "ghoul-artificial") speciesBonuses[sheet.physicalBonus] += 1;

    const permanentAttributes = blankAttributeMap();
    attributeKeys.forEach((key) => { permanentAttributes[key] = sheet.baseAttributes[key] + speciesBonuses[key] + (sheet.perks[`acurado-${key}`] ? 1 : 0); });
    const activeAttributes = { ...permanentAttributes };
    const bodyUpgrade = sheet.effects["aprimoramentos-corporais"];
    if (sheet.kaguneActive && bodyUpgrade?.target) activeAttributes[bodyUpgrade.target] += bodyUpgrade.rank;

    const permanentDice = blankAttributeMap();
    if (sheet.perks["cem-por-cento"]) permanentDice.raciocinio += 2;
    if (sheet.perks["olho-deus"]) permanentDice.percepcao += 1;
    if (sheet.perks.elegante) permanentDice.presenca += 2;
    if (sheet.perks["frio-neve"]) permanentDice.controle += 2;
    const attributeTests = Object.fromEntries(attributeKeys.map((key) => {
      const attribute = activeAttributes[key];
      const dice = (attribute === 0 ? 2 : attribute) + permanentDice[key] + sheet.extraDice[key];
      return [key, formatTest(dice, Math.floor(attribute / 2), attribute === 0)];
    })) as Record<AttributeKey, string>;

    const increaseHitRank = sheet.effects["aumentar-acerto"]?.rank || 0;
    const primaryAttribute: AttributeKey = sheet.kaguneType === "Ukaku" ? "precisao" : sheet.kaguneType === "Koukaku" ? "vigor" : sheet.kaguneType === "Rinkaku" ? "forca" : "agilidade";
    const primaryValue = activeAttributes[primaryAttribute];
    const primaryDice = (primaryValue === 0 ? 2 : primaryValue) + permanentDice[primaryAttribute] + sheet.extraDice[primaryAttribute];
    const kaguneModifier = Math.floor(primaryValue / 2) + Math.floor(increaseHitRank / 3);
    const kaguneTest = formatTest(primaryDice, kaguneModifier, primaryValue === 0);
    const looseHitAdjustments = increaseHitRank % 3;

    const attributePE = attributeKeys.reduce((total, key) => total + attributePurchaseCost(sheet.baseAttributes[key]), 0);
    const perksPE = Object.entries(sheet.perks).reduce((total, [id, acquired]) => {
      const item = perks.find((candidate) => candidate.id === id);
      return total + (item ? perkCostForSheet(item, acquired.rank, sheet.species) : 0);
    }, 0);
    const drawbackCredit = Object.entries(sheet.drawbacks).reduce((total, [id, acquired]) => {
      const item = drawbacks.find((candidate) => candidate.id === id);
      return total + (item ? rankCost(item.credit, acquired.rank, "choice") : 0);
    }, 0);

    let nominalEffectPE = 0;
    let actualEffectPE = 0;
    Object.entries(sheet.effects).forEach(([id, acquired]) => {
      const item = kaguneEffects.find((candidate) => candidate.id === id);
      if (!item) return;
      const increments = incrementalCosts(item, acquired.rank);
      nominalEffectPE += increments.reduce((total, value) => total + value, 0);
      const foreignBikaku = sheet.kaguneType === "Bikaku" && item.family !== "Geral" && item.family !== "Bikaku";
      increments.forEach((increment) => {
        let cost = increment + (foreignBikaku && !sheet.selectedEvolutions.includes("custo-beneficio") ? 2 : 0);
        if (sheet.species === "ghoul-dominante") cost = Math.max(1, cost - 3);
        actualEffectPE += sheet.weaponKind === "arata" ? Math.ceil(cost / 2) : cost;
      });
    });
    const evolutionPE = sheet.selectedEvolutions.reduce((total, id) => total + (evolutions.find((candidate) => candidate.id === id)?.cost || 0), 0);
    const quimeraCost = sheet.weaponKind === "kagune" && sheet.kaguneSecondType ? 6 : 0;
    const frameBudget = sheet.species === "quinx" ? 2 + (sheet.quinxFrame >= 3 ? 4 : 0) + (sheet.quinxFrame >= 4 ? Math.floor(sheet.grade / 2) : 0) + (sheet.quinxFrame >= 5 ? Math.floor(sheet.grade / 2) : 0) : 0;
    const freeKaguneBudget = frameBudget + (sheet.species === "humano-dominante" ? 6 : 0);
    const paidEffectPE = sheet.weaponKind === "kagune" ? Math.max(0, actualEffectPE - freeKaguneBudget) : 0;
    const gradeGrant = sheet.includeGradePE ? Math.max(0, (sheet.grade - 2) * 5) : 0;
    const peAvailable = 20 + species.creationGrant + gradeGrant + sheet.extraPE + drawbackCredit;
    const peSpent = species.subCost + quimeraCost + attributePE + perksPE + paidEffectPE + evolutionPE;
    const peRemaining = peAvailable - peSpent;

    const gradeMultiplier = Math.max(1, sheet.grade / 2);
    const maxLife = Math.max(1, Math.floor(10 + activeAttributes.vigor + species.lifeBase * gradeMultiplier + (sheet.perks.resistente ? Math.min(sheet.grade, 10) : 0) - (sheet.species === "ghoul-artificial" ? Math.floor(sheet.grade / 2) : 0)));
    let maxSanity = 10 + activeAttributes.controle - (sheet.selectedEvolutions.includes("monstro") ? 5 : 0);
    if (sheet.drawbacks["mente-fragil"]) maxSanity = Math.floor(maxSanity / 2);
    maxSanity = Math.max(1, maxSanity);
    const carrying = 7 + activeAttributes.forca;
    const movement = sheet.perks.velocista ? 2 : 1;
    const determination = sheet.perks["nunca-prostra"] ? activeAttributes.controle + 4 : activeAttributes.controle + 2;
    const maxRC = sheet.weaponKind === "kagune" ? nominalEffectPE + evolutionPE + 4 : 0;
    let rd = sheet.perks["pele-dura"] ? Math.floor(activeAttributes.vigor / 2) : 0;
    if (sheet.kaguneActive && sheet.weaponKind === "kagune" && (sheet.kaguneType === "Koukaku" || sheet.kaguneSecondType === "Koukaku")) rd += 2;
    if (sheet.kaguneActive) rd += sheet.effects["couraca-revestida"]?.rank || 0;
    const superiorArmor = sheet.kaguneActive ? sheet.effects["couraca-superior"]?.rank || 0 : 0;
    if (superiorArmor) rd += activeAttributes.vigor + Math.max(0, superiorArmor - 1);
    const blockBonus = (sheet.perks["corpo-pesado"] ? 1 : 0) + (sheet.effects["bloqueio-ferro"] && sheet.kaguneActive ? 1 : 0);
    const dodgeBonus = (sheet.perks["corpo-leve"] ? 1 : 0) + (sheet.effects["esquiva-pena"] && sheet.kaguneActive ? 1 : 0) + (sheet.perks["cem-por-cento"] ? 1 : 0) + (sheet.perks.ceifador ? 2 : 0);
    const blockTest = formatTest((activeAttributes.vigor === 0 ? 2 : activeAttributes.vigor) + permanentDice.vigor + sheet.extraDice.vigor + blockBonus, Math.floor(activeAttributes.vigor / 2), activeAttributes.vigor === 0);
    const dodgeTest = formatTest((activeAttributes.agilidade === 0 ? 2 : activeAttributes.agilidade) + permanentDice.agilidade + sheet.extraDice.agilidade + dodgeBonus, Math.floor(activeAttributes.agilidade / 2), activeAttributes.agilidade === 0);

    const issues: string[] = [];
    const purchasedCap = Math.min(species.cap, sheet.grade + 1);
    attributeKeys.forEach((key) => { if (sheet.baseAttributes[key] > purchasedCap) issues.push(`${attributeLabels[key]} passa do limite comprado ${purchasedCap}.`); });
    if (sheet.drawbacks.desabilidade?.target && permanentAttributes[sheet.drawbacks.desabilidade.target] > 4) issues.push(`${attributeLabels[sheet.drawbacks.desabilidade.target]} passa do limite 4 de Desabilidade.`);
    Object.keys(sheet.perks).forEach((id) => { const item = perks.find((candidate) => candidate.id === id); if (item && !perkRequirementMet(item, sheet, permanentAttributes)) issues.push(`Requisito não atendido: ${item.name}.`); });
    if (sheet.weaponKind === "quinque" && Object.keys(sheet.effects).some((id) => kaguneEffects.find((item) => item.id === id)?.type.includes("Biológico"))) issues.push("Quinque não recebe efeitos Biológicos, salvo exceção do Narrador.");
    if (peRemaining < 0) issues.push(`Faltam ${Math.abs(peRemaining)} PE para fechar a ficha.`);

    return { species, speciesBonuses, permanentAttributes, activeAttributes, permanentDice, attributeTests, primaryAttribute, kaguneTest, increaseHitRank, looseHitAdjustments, attributePE, perksPE, drawbackCredit, nominalEffectPE, actualEffectPE, freeKaguneBudget, paidEffectPE, evolutionPE, gradeGrant, peAvailable, peSpent, peRemaining, maxLife, maxSanity, maxRC, carrying, movement, determination, rd, blockTest, dodgeTest, purchasedCap, issues, quimeraCost, frameBudget };
  }, [sheet]);

  const filteredPerks = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase("pt-BR");
    return perks.filter((item) => (perkCategory === "Todas" || item.category === perkCategory) && (!query || `${item.name} ${item.description} ${item.requirement || ""}`.toLocaleLowerCase("pt-BR").includes(query)));
  }, [catalogSearch, perkCategory]);
  const filteredDrawbacks = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase("pt-BR");
    return drawbacks.filter((item) => !query || `${item.name} ${item.description}`.toLocaleLowerCase("pt-BR").includes(query));
  }, [catalogSearch]);
  const compatibleFamilies = useMemo(() => {
    const families = new Set<string>(["Geral", sheet.kaguneType]);
    if (sheet.kaguneSecondType) families.add(sheet.kaguneSecondType);
    if (sheet.kaguneType === "Bikaku" || sheet.kaguneSecondType === "Bikaku") ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].forEach((family) => families.add(family));
    return families;
  }, [sheet.kaguneType, sheet.kaguneSecondType]);
  const filteredEffects = useMemo(() => {
    const query = effectSearch.trim().toLocaleLowerCase("pt-BR");
    return kaguneEffects.filter((item) => (effectFamily === "Todos" || (effectFamily === "Compatíveis" ? compatibleFamilies.has(item.family) : item.family === effectFamily)) && (!query || `${item.name} ${item.description} ${item.type}`.toLocaleLowerCase("pt-BR").includes(query)));
  }, [effectSearch, effectFamily, compatibleFamilies]);
  const filteredEvolutions = useMemo(() => evolutions.filter((item) => item.family === "Geral" || item.family === sheet.kaguneType || item.family === sheet.kaguneSecondType), [sheet.kaguneType, sheet.kaguneSecondType]);

  const copyTest = async (formula: string, key: string) => {
    try { await navigator.clipboard.writeText(formula); setCopied(key); window.setTimeout(() => setCopied(""), 1300); }
    catch { setCopied(""); }
  };
  const setAttribute = (key: AttributeKey, value: number) => updateSheet((current) => ({ ...current, baseAttributes: { ...current.baseAttributes, [key]: Math.max(0, Math.min(12, value)) } }));
  const setExtraDice = (key: AttributeKey, value: number) => updateSheet((current) => ({ ...current, extraDice: { ...current.extraDice, [key]: Math.max(-10, Math.min(20, value)) } }));

  const togglePerk = (item: Perk) => updateSheet((current) => {
    const next = { ...current.perks };
    if (next[item.id]) delete next[item.id];
    else next[item.id] = { rank: 1, target: item.targetAttribute ? (item.targetAttribute === "mental" ? "raciocinio" : "forca") : undefined };
    return { ...current, perks: next };
  });
  const updatePerkRank = (item: Perk, delta: number) => updateSheet((current) => {
    const acquired = current.perks[item.id]; if (!acquired) return current;
    return { ...current, perks: { ...current.perks, [item.id]: { ...acquired, rank: Math.max(1, Math.min(item.maxRank || 1, acquired.rank + delta)) } } };
  });
  const toggleDrawback = (item: Drawback) => updateSheet((current) => {
    const next = { ...current.drawbacks };
    if (next[item.id]) delete next[item.id]; else next[item.id] = { rank: 1, target: item.targetAttribute ? "forca" : undefined };
    return { ...current, drawbacks: next };
  });
  const toggleEffect = (item: KaguneEffect) => updateSheet((current) => {
    const next = { ...current.effects };
    if (next[item.id]) delete next[item.id]; else next[item.id] = { rank: 1, target: item.targetAttribute ? current.physicalBonus : undefined };
    return { ...current, effects: next };
  });
  const updateEffectRank = (item: KaguneEffect, delta: number) => updateSheet((current) => {
    const acquired = current.effects[item.id]; if (!acquired) return current;
    const max = effectMaximum(item, current);
    return { ...current, effects: { ...current.effects, [item.id]: { ...acquired, rank: Math.max(1, Math.min(max, acquired.rank + delta)) } } };
  });
  const toggleEvolution = (item: Evolution) => patchSheet({ selectedEvolutions: sheet.selectedEvolutions.includes(item.id) ? sheet.selectedEvolutions.filter((id) => id !== item.id) : [...sheet.selectedEvolutions, item.id] });
  const changeSpecies = (species: SpeciesId) => {
    const config = speciesOptions.find((item) => item.id === species)!;
    patchSheet({ species, weaponKind: config.hasKagune ? "kagune" : "nenhum", quinxFrame: species === "quinx" ? 2 : sheet.quinxFrame });
  };

  const addCharacter = () => { const created = newCharacter(`Personagem ${characters.length + 1}`); setCharacters((current) => [...current, created]); setActiveId(created.id); setTab("resumo"); setShowMenu(false); };
  const duplicateCharacter = () => { const duplicate = normalizeCharacter({ ...sheet, id: uid(), name: `${sheet.name || "Personagem"} — cópia`, updatedAt: Date.now() }); setCharacters((current) => [...current, duplicate]); setActiveId(duplicate.id); setShowMenu(false); };
  const removeCharacter = () => {
    if (characters.length === 1 || !window.confirm(`Excluir “${sheet.name || "Personagem"}” deste dispositivo?`)) return;
    const remaining = characters.filter((item) => item.id !== activeId); setCharacters(remaining); setActiveId(remaining[0].id); setShowMenu(false);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, activeId, characters } satisfies SaveFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `fome-justica-${(sheet.name || "fichas").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}.json`; anchor.click(); URL.revokeObjectURL(url); setShowMenu(false);
  };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SaveFile> | Partial<CharacterSheet>;
      if ("characters" in parsed && Array.isArray(parsed.characters)) {
        const imported = parsed.characters.map(normalizeCharacter);
        if (imported.length) { setCharacters(imported); setActiveId(imported.some((item) => item.id === parsed.activeId) ? String(parsed.activeId) : imported[0].id); }
      } else { const imported = normalizeCharacter(parsed as Partial<CharacterSheet>); setCharacters((current) => [...current, imported]); setActiveId(imported.id); }
    } catch { window.alert("Esse arquivo não contém uma ficha válida."); }
    event.target.value = ""; setShowMenu(false);
  };
  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      const image = new Image(); image.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        patchSheet({ image: canvas.toDataURL("image/jpeg", 0.84) });
      }; image.src = String(reader.result);
    }; reader.readAsDataURL(file); event.target.value = "";
  };
  const addInventoryItem = () => patchSheet({ inventory: [...sheet.inventory, { id: uid(), name: "Novo item", quantity: 1, notes: "" }] });
  const updateInventoryItem = (id: string, patch: Partial<InventoryItem>) => patchSheet({ inventory: sheet.inventory.map((item) => item.id === id ? { ...item, ...patch } : item) });

  const currentArchetype = archetypes.find((item) => item.name === sheet.archetype) || archetypes[0];
  const showsHunger = derived.species.hasHunger || (sheet.species === "quinx" && sheet.quinxFrame >= 4);
  const showsInstinct = sheet.species === "quinx" && sheet.quinxFrame < 4;
  const hasDetermination = sheet.species === "humano" || sheet.species === "humano-dominante";

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">FJ</span><div><p>Fome &amp; Justiça</p><span>ficha de personagem</span></div></div>
        <div className="character-switcher">
          <label className="sr-only" htmlFor="character-select">Ficha ativa</label>
          <select id="character-select" value={activeId} onChange={(event) => setActiveId(event.target.value)}>{characters.map((character) => <option key={character.id} value={character.id}>{character.name || "Sem nome"}</option>)}</select>
          <span className={`save-state ${saveStatus}`}><i />{saveStatus === "saving" ? "Salvando" : saveStatus === "error" ? "Não foi possível salvar" : "Salvo neste dispositivo"}</span>
          <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}>{theme === "dark" ? "☀ Claro" : "☾ Escuro"}</button>
          <div className="menu-wrap"><button className="icon-button" type="button" onClick={() => setShowMenu((value) => !value)} aria-label="Opções da ficha" aria-expanded={showMenu}>•••</button>
            {showMenu && <div className="sheet-menu"><button type="button" onClick={addCharacter}>Nova ficha</button><button type="button" onClick={duplicateCharacter}>Duplicar ficha</button><button type="button" onClick={exportData}>Exportar arquivo</button><button type="button" onClick={() => importRef.current?.click()}>Importar arquivo</button><button type="button" onClick={() => window.print()}>Imprimir</button><button className="danger" type="button" onClick={removeCharacter} disabled={characters.length === 1}>Excluir ficha</button></div>}
          </div><input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importData} />
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar"><nav aria-label="Seções da ficha">{([["resumo", "01", "Resumo"], ["atributos", "02", "Atributos"], ["vantagens", "03", "Vantagens"], ["kakuhou", "04", "Kakuhou & arma"], ["historia", "05", "História & notas"]] as [TabId, string, string][]).map(([id, number, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{number}</span>{label}</button>)}</nav>
          <div className="pe-mini"><div><span>PE restante</span><strong className={derived.peRemaining < 0 ? "negative" : ""}>{derived.peRemaining}</strong></div><div className="meter"><i style={{ width: `${Math.max(0, Math.min(100, derived.peAvailable ? (derived.peSpent / derived.peAvailable) * 100 : 0))}%` }} /></div><small>{derived.peSpent} gastos de {derived.peAvailable}</small></div>
        </aside>

        <section className="content">
          {tab === "resumo" && <div className="page-stack">
            <section className="identity-grid">
              <div className="portrait-card"><label className="portrait-upload">{sheet.image ? <img src={sheet.image} alt={`Retrato de ${sheet.name || "personagem"}`} /> : <span><b>+</b>Adicionar retrato<small>JPG ou PNG</small></span>}<input type="file" accept="image/*" onChange={handleImage} /></label>{sheet.image && <button className="remove-image" type="button" onClick={() => patchSheet({ image: "" })}>Remover imagem</button>}</div>
              <div className="identity-fields"><div className="eyebrow"><span>Ficha ativa</span><i /></div><label className="hero-name"><span className="sr-only">Nome</span><input value={sheet.name} onChange={(event) => patchSheet({ name: event.target.value })} placeholder="Nome do personagem" /></label>
                <div className="field-grid four"><Field label="Jogador"><input value={sheet.player} onChange={(event) => patchSheet({ player: event.target.value })} placeholder="Nome" /></Field><Field label="Idade"><input value={sheet.age} onChange={(event) => patchSheet({ age: event.target.value })} placeholder="—" /></Field><Field label="Pronomes"><input value={sheet.pronouns} onChange={(event) => patchSheet({ pronouns: event.target.value })} placeholder="—" /></Field><Field label="Grau"><select value={sheet.grade} onChange={(event) => patchSheet({ grade: Number(event.target.value) })}>{[2, 4, 6, 8, 10, 12, 14].map((grade) => <option key={grade}>{grade}</option>)}</select></Field></div>
                <div className="field-grid two"><Field label="Espécie"><select value={sheet.species} onChange={(event) => changeSpecies(event.target.value as SpeciesId)}>{speciesOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label="Arquétipo"><select value={sheet.archetype} onChange={(event) => patchSheet({ archetype: event.target.value })}>{archetypes.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field></div>
                <p className="species-note">{derived.species.summary}</p><Field label="Conceito"><input value={sheet.concept} onChange={(event) => patchSheet({ concept: event.target.value })} placeholder="Ex.: investigador obstinado, herdeiro descartado..." /></Field><Field label="Frase central"><input value={sheet.centralPhrase} onChange={(event) => patchSheet({ centralPhrase: event.target.value })} placeholder="A ideia que guia o personagem" /></Field>
              </div>
            </section>
            <section className="section-block"><SectionTitle kicker="Estado atual" title="Recursos e parâmetros" aside={<button className="text-button" type="button" onClick={() => patchSheet({ currentLife: derived.maxLife, currentSanity: derived.maxSanity, currentRC: derived.maxRC })}>Preencher máximos</button>} />
              <div className="resource-grid"><ResourceCard label="Vida" current={sheet.currentLife} max={derived.maxLife} tone="life" onChange={(value) => patchSheet({ currentLife: value })} /><ResourceCard label="Sanidade" current={sheet.currentSanity} max={derived.maxSanity} tone="sanity" onChange={(value) => patchSheet({ currentSanity: value })} />{sheet.weaponKind === "kagune" && <ResourceCard label="RC" current={sheet.currentRC} max={derived.maxRC} tone="rc" onChange={(value) => patchSheet({ currentRC: value })} />}{showsHunger && <ResourceCard label="Fome" current={sheet.hunger} max={10} tone="hunger" onChange={(value) => patchSheet({ hunger: value })} />}{showsInstinct && <ResourceCard label="Carga instintiva" current={sheet.instinct} max={10} tone="instinct" onChange={(value) => patchSheet({ instinct: value })} />}</div>
              <div className="stat-strip"><Stat label="RD" value={derived.rd} /><Stat label="Deslocamento" value={`${derived.movement} ${derived.movement === 1 ? "espaço" : "espaços"}`} /><Stat label="Carga" value={derived.carrying} />{hasDetermination && <Stat label="Determinação" value={derived.determination} />}<Stat label="Bloqueio" value={derived.blockTest} mono onCopy={() => copyTest(derived.blockTest, "block")} copied={copied === "block"} /><Stat label="Esquiva" value={derived.dodgeTest} mono onCopy={() => copyTest(derived.dodgeTest, "dodge")} copied={copied === "dodge"} /></div>
            </section>
            <section className="summary-columns"><div className="section-block compact"><SectionTitle kicker="Evolução" title="Pontos de Evolução" /><div className="pe-hero"><strong className={derived.peRemaining < 0 ? "negative" : ""}>{derived.peRemaining}</strong><span>PE disponíveis</span></div><div className="ledger"><Ledger label="Verba total" value={derived.peAvailable} /><Ledger label="Atributos" value={derived.attributePE} negative /><Ledger label="Vantagens" value={derived.perksPE} negative /><Ledger label="Kakuhou / arma" value={derived.paidEffectPE + derived.evolutionPE + derived.quimeraCost} negative /><Ledger label="Subespécie" value={derived.species.subCost} negative /><Ledger label="Desvantagens" value={derived.drawbackCredit} positive /></div><div className="inline-controls"><label><span>PE adicionais</span><input type="number" value={sheet.extraPE} onChange={(event) => patchSheet({ extraPE: Number(event.target.value) || 0 })} /></label><label className="check-row"><input type="checkbox" checked={sheet.includeGradePE} onChange={(event) => patchSheet({ includeGradePE: event.target.checked })} /><span>Verba inicial por Grau (+{derived.gradeGrant})</span></label></div></div>
              <div className="section-block compact"><SectionTitle kicker="Psiquê" title={currentArchetype.name} /><p className="ability-text">{currentArchetype.ability}</p><div className="rule-note"><b>2 usos por descanso.</b> Habilidades em duas etapas só gastam o uso após a conclusão.</div>{sheet.conditions && <div className="condition-note"><span>Condições</span><p>{sheet.conditions}</p></div>}</div>
            </section>
            {derived.issues.length > 0 && <section className="validation-panel"><div><span>!</span><strong>{derived.issues.length} {derived.issues.length === 1 ? "ponto para revisar" : "pontos para revisar"}</strong></div><ul>{derived.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
          </div>}

          {tab === "atributos" && <div className="page-stack"><PageHeader number="02" title="Atributos" description="O valor do Atributo cria o ++. Dados extras alteram apenas a quantidade de d8." />
            <div className="formula-rule"><div><span>Atributo 4</span><code>4d8++2&gt;&gt;5</code></div><b>+</b><div><span>Skill: +1 dado</span><code>1d8</code></div><b>=</b><div className="result"><span>Teste final</span><code>5d8++2&gt;&gt;5</code></div></div>
            <section className="bonus-choices section-block compact"><SectionTitle kicker="Bônus de espécie" title="Escolhas gratuitas" /><div className="field-grid three">{["humano", "humano-dominante", "ghoul-artificial", "quinx"].includes(sheet.species) && <Field label="+1 Mental"><select value={sheet.mentalBonus} onChange={(event) => patchSheet({ mentalBonus: event.target.value as AttributeKey })}>{mentalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}{["humano-dominante", "ghoul-dominante", "ghoul-artificial"].includes(sheet.species) && <Field label={sheet.species === "humano-dominante" ? "+2 Físico" : "+1 Físico"}><select value={sheet.physicalBonus} onChange={(event) => patchSheet({ physicalBonus: event.target.value as AttributeKey })}>{physicalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}{sheet.species === "ghoul-dominante" && <Field label="+1 Mental"><select value={sheet.secondMentalBonus} onChange={(event) => patchSheet({ secondMentalBonus: event.target.value as AttributeKey })}>{mentalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}</div></section>
            <section><div className="attribute-section-head"><div><span>Físicos</span><p>Limite comprado atual: {derived.purchasedCap}</p></div><strong>{physicalAttributes.reduce((sum, key) => sum + attributePurchaseCost(sheet.baseAttributes[key]), 0)} PE</strong></div><div className="attribute-grid">{physicalAttributes.map((key) => <AttributeCard key={key} attributeKey={key} sheet={sheet} derived={derived} copied={copied} onCopy={copyTest} onSet={setAttribute} onExtra={setExtraDice} />)}</div></section>
            <section><div className="attribute-section-head"><div><span>Mentais</span><p>Limite comprado atual: {derived.purchasedCap}</p></div><strong>{mentalAttributes.reduce((sum, key) => sum + attributePurchaseCost(sheet.baseAttributes[key]), 0)} PE</strong></div><div className="attribute-grid">{mentalAttributes.map((key) => <AttributeCard key={key} attributeKey={key} sheet={sheet} derived={derived} copied={copied} onCopy={copyTest} onSet={setAttribute} onExtra={setExtraDice} />)}</div></section>
          </div>}

          {tab === "vantagens" && <div className="page-stack"><PageHeader number="03" title="Vantagens & desvantagens" description="Requisitos, custos e bônus permanentes são conferidos na hora." />
            <div className="catalog-toolbar"><div className="segmented"><button type="button" className={perkView === "vantagens" ? "active" : ""} onClick={() => setPerkView("vantagens")}>Vantagens <span>{Object.keys(sheet.perks).length}</span></button><button type="button" className={perkView === "desvantagens" ? "active" : ""} onClick={() => setPerkView("desvantagens")}>Desvantagens <span>{Object.keys(sheet.drawbacks).length}</span></button></div><label className="search-field"><span>⌕</span><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Buscar por nome ou efeito" /></label></div>
            {perkView === "vantagens" ? <><div className="filter-row">{["Todas", "Genérica", "Força", "Vigor", "Precisão", "Agilidade", "Raciocínio", "Percepção", "Presença", "Controle"].map((category) => <button type="button" key={category} className={perkCategory === category ? "active" : ""} onClick={() => setPerkCategory(category)}>{category}</button>)}</div><div className="catalog-summary"><span>{filteredPerks.length} opções</span><strong>{derived.perksPE} PE investidos</strong></div><div className="catalog-grid">{filteredPerks.map((item) => {
              const acquired = sheet.perks[item.id]; const eligible = perkRequirementMet(item, sheet, derived.permanentAttributes); const price = perkCostForSheet(item, acquired?.rank || 1, sheet.species);
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone={item.category.toLocaleLowerCase("pt-BR")}><div className="catalog-card-top"><span>{item.category}</span><b>{price} PE</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.attribute && item.min ? `${attributeLabels[item.attribute]} ${item.min}` : item.requirement || "Disponível"}{hasHumanPerkSurcharge(item, sheet.species) && <em>+2 PE: Corpo de Carne</em>}{!eligible && <em>Requisito pendente</em>}</div>{acquired && item.targetAttribute && <label className="target-select"><span>Atributo</span><select value={acquired.target || "forca"} onChange={(event) => updateSheet((current) => ({ ...current, perks: { ...current.perks, [item.id]: { ...acquired, target: event.target.value as AttributeKey } } }))}>{(item.targetAttribute === "physical" ? physicalAttributes : item.targetAttribute === "mental" ? mentalAttributes : attributeKeys).map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></label>}<div className="card-actions">{acquired && (item.maxRank || 1) > 1 && <RankControl rank={acquired.rank} max={item.maxRank || 1} onDown={() => updatePerkRank(item, -1)} onUp={() => updatePerkRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} onClick={() => togglePerk(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div></> : <><div className="catalog-summary"><span>{filteredDrawbacks.length} opções</span><strong className="positive">+{derived.drawbackCredit} PE recebidos</strong></div><div className="catalog-grid">{filteredDrawbacks.map((item) => {
              const acquired = sheet.drawbacks[item.id]; const eligible = !item.species || item.species.includes(sheet.species); const maxRank = Array.isArray(item.credit) ? item.credit.length : 1; const credit = rankCost(item.credit, acquired?.rank || 1, "choice");
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone="drawback"><div className="catalog-card-top"><span>Desvantagem</span><b>+{credit} PE</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{eligible ? "Disponível" : "Espécie incompatível"}</div>{acquired && item.targetAttribute && <label className="target-select"><span>Atributo limitado</span><select value={acquired.target || "forca"} onChange={(event) => updateSheet((current) => ({ ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, target: event.target.value as AttributeKey } } }))}>{attributeKeys.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></label>}<div className="card-actions">{acquired && maxRank > 1 && <RankControl rank={acquired.rank} max={maxRank} onDown={() => updateSheet((current) => ({ ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, rank: Math.max(1, acquired.rank - 1) } } }))} onUp={() => updateSheet((current) => ({ ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, rank: Math.min(maxRank, acquired.rank + 1) } } }))} />}<button type="button" className={acquired ? "remove" : "add"} disabled={!eligible && !acquired} onClick={() => toggleDrawback(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div></>}
          </div>}

          {tab === "kakuhou" && <div className="page-stack"><PageHeader number="04" title="Kakuhou & arma RC" description="Kagune, Quinque e Arata usam o mesmo catálogo, com restrições e verbas próprias." />
            <section className="weapon-builder section-block"><div className="weapon-head"><div><Field label="Estrutura"><select value={sheet.weaponKind} onChange={(event) => patchSheet({ weaponKind: event.target.value as WeaponKind })}><option value="nenhum">Nenhuma</option><option value="kagune">Kagune / Kakuhou</option><option value="quinque">Quinque</option><option value="arata">Arata</option></select></Field><Field label="Nome"><input value={sheet.kaguneName} onChange={(event) => patchSheet({ kaguneName: event.target.value })} placeholder="Nome da arma ou Kagune" /></Field></div>{sheet.weaponKind !== "nenhum" && <label className="activation-toggle"><input type="checkbox" checked={sheet.kaguneActive} onChange={(event) => patchSheet({ kaguneActive: event.target.checked })} /><span><i />{sheet.kaguneActive ? "Ativa" : "Inativa"}</span></label>}</div>
              {sheet.weaponKind !== "nenhum" && <><div className="field-grid four"><Field label="Tipo principal"><select value={sheet.kaguneType} onChange={(event) => patchSheet({ kaguneType: event.target.value as KaguneFamily })}>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].map((type) => <option key={type}>{type}</option>)}</select></Field>{sheet.weaponKind === "kagune" && <Field label="Tipo quimera"><select value={sheet.kaguneSecondType} onChange={(event) => patchSheet({ kaguneSecondType: event.target.value as KaguneFamily | "" })}><option value="">Nenhum</option>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((type) => type !== sheet.kaguneType).map((type) => <option key={type}>{type}</option>)}</select></Field>}{sheet.species === "quinx" && <Field label="Frame"><select value={sheet.quinxFrame} onChange={(event) => patchSheet({ quinxFrame: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((frame) => <option key={frame}>{frame}</option>)}</select></Field>}{(sheet.weaponKind === "quinque" || sheet.weaponKind === "arata") && <Field label="Grau do Ghoul fonte"><select value={sheet.sourceGhoulGrade} onChange={(event) => patchSheet({ sourceGhoulGrade: Number(event.target.value) })}>{[2, 4, 6, 8, 10, 12, 14].map((grade) => <option key={grade}>{grade}</option>)}</select></Field>}</div>
                <div className="weapon-metrics">{sheet.weaponKind === "kagune" ? <><Stat label="Teste principal" value={derived.kaguneTest} mono onCopy={() => copyTest(derived.kaguneTest, "kagune")} copied={copied === "kagune"} /><Stat label="Atributo principal" value={attributeLabels[derived.primaryAttribute]} /><Stat label="RC máximo" value={derived.maxRC} /><Stat label="Verba gratuita" value={`${derived.freeKaguneBudget} PE`} /></> : <><Stat label="Verba de criação" value={`${8 + sheet.sourceGhoulGrade} PE`} /><Stat label="Investido" value={`${derived.actualEffectPE} PE`} /><Stat label="Ativos" value={sheet.weaponKind === "quinque" ? "Sacrificam dados" : "Conforme efeito"} /><Stat label="Efeitos" value={Object.keys(sheet.effects).length} /></>}</div>
                {derived.increaseHitRank > 0 && <div className="hit-rule"><strong>Aumentar Acerto N{derived.increaseHitRank}</strong><span>{Math.floor(derived.increaseHitRank / 3) > 0 ? `+${Math.floor(derived.increaseHitRank / 3)} no modificador ++. ` : ""}{derived.looseHitAdjustments > 0 ? `${derived.looseHitAdjustments} ${derived.looseHitAdjustments === 1 ? "compra permite" : "compras permitem"} elevar um dado específico em +1 após a rolagem.` : "Todas as compras estão consolidadas no ++."}</span></div>}</>}
            </section>
            {sheet.weaponKind !== "nenhum" && <><section><div className="catalog-toolbar"><div><span className="section-kicker">Efeitos de criação</span><h2 className="toolbar-title">Catálogo de efeitos</h2></div><label className="search-field"><span>⌕</span><input value={effectSearch} onChange={(event) => setEffectSearch(event.target.value)} placeholder="Buscar efeito" /></label></div><div className="filter-row">{["Compatíveis", "Todos", "Geral", "Ukaku", "Koukaku", "Rinkaku", "Bikaku"].map((family) => <button type="button" key={family} className={effectFamily === family ? "active" : ""} onClick={() => setEffectFamily(family)}>{family}</button>)}</div><div className="catalog-summary"><span>{filteredEffects.length} efeitos</span><strong>{derived.actualEffectPE} PE em efeitos</strong></div><div className="catalog-grid effects">{filteredEffects.map((item) => {
              const acquired = sheet.effects[item.id]; const compatible = compatibleFamilies.has(item.family); const biologicalBlocked = sheet.weaponKind === "quinque" && item.type.includes("Biológico"); const nominal = acquired ? incrementalCosts(item, acquired.rank).reduce((sum, cost) => sum + cost, 0) : incrementalCosts(item, 1)[0] || 0;
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!compatible || biologicalBlocked} tone={familyColor(item.family)}><div className="catalog-card-top"><span>{item.family} · {item.type}</span><b>{nominal} PE</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.requirement || (biologicalBlocked ? "Biológico: incompatível com Quinque" : compatible ? "Compatível" : "Fora do tipo")}</div>{acquired && item.targetAttribute && <label className="target-select"><span>Atributo</span><select value={acquired.target || "forca"} onChange={(event) => updateSheet((current) => ({ ...current, effects: { ...current.effects, [item.id]: { ...acquired, target: event.target.value as AttributeKey } } }))}>{physicalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></label>}<div className="card-actions">{acquired && effectMaximum(item, sheet) > 1 && <RankControl rank={acquired.rank} max={effectMaximum(item, sheet)} onDown={() => updateEffectRank(item, -1)} onUp={() => updateEffectRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} disabled={biologicalBlocked && !acquired} onClick={() => toggleEffect(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div></section>
              {sheet.weaponKind === "kagune" && <section><div className="attribute-section-head"><div><span>Evoluções na Kakuhou</span><p>Opções liberadas a partir do Grau 6</p></div><strong>{derived.evolutionPE} PE</strong></div><div className="catalog-grid evolutions">{filteredEvolutions.map((item) => { const selected = sheet.selectedEvolutions.includes(item.id); const eligible = sheet.grade >= item.grade; return <CatalogCard key={item.id} selected={selected} unavailable={!eligible} tone={familyColor(item.family)}><div className="catalog-card-top"><span>{item.family} · Grau {item.grade}+</span><b>{item.cost} PE</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.requirement || (eligible ? "Disponível" : `Requer Grau ${item.grade}`)}</div><div className="card-actions solo"><button type="button" className={selected ? "remove" : "add"} disabled={!eligible && !selected} onClick={() => toggleEvolution(item)}>{selected ? "Remover" : "Adicionar"}</button></div></CatalogCard>; })}</div></section>}
            </>}
          </div>}

          {tab === "historia" && <div className="page-stack"><PageHeader number="05" title="História & notas" description="Tudo que não cabe nos números, guardado junto da ficha." />
            <div className="story-grid"><section className="section-block compact"><SectionTitle kicker="Personagem" title="História" /><Field label="História"><textarea rows={12} value={sheet.history} onChange={(event) => patchSheet({ history: event.target.value })} placeholder="Origem, eventos marcantes, relações e objetivos..." /></Field><Field label="Personalidade"><textarea rows={6} value={sheet.personality} onChange={(event) => patchSheet({ personality: event.target.value })} placeholder="Hábitos, contradições, medos e desejos..." /></Field><Field label="Aparência"><textarea rows={5} value={sheet.appearance} onChange={(event) => patchSheet({ appearance: event.target.value })} placeholder="Traços, roupas, marcas e postura..." /></Field></section>
              <div className="page-stack tight"><section className="section-block compact"><SectionTitle kicker="Psiquê" title="Alicerces" /><p className="section-help">Escolha de um a três. Registre a pessoa e a característica central do vínculo.</p><div className="anchor-list">{sheet.anchors.map((anchor, index) => <div key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={anchor.name} onChange={(event) => patchSheet({ anchors: sheet.anchors.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} placeholder="Nome" /><input value={anchor.bond} onChange={(event) => patchSheet({ anchors: sheet.anchors.map((item, itemIndex) => itemIndex === index ? { ...item, bond: event.target.value } : item) })} placeholder="Característica central" /></div>)}</div></section><section className="section-block compact"><SectionTitle kicker="Estado" title="Condições" /><textarea rows={5} value={sheet.conditions} onChange={(event) => patchSheet({ conditions: event.target.value })} placeholder="Máculas, ferimentos, efeitos ativos..." /></section><section className="section-block compact"><SectionTitle kicker="Kakuhou / arma" title="Descrição visual" /><textarea rows={6} value={sheet.kaguneDescription} onChange={(event) => patchSheet({ kaguneDescription: event.target.value })} placeholder="Forma, cor, origem, mudanças e manifestações..." /></section></div>
            </div>
            <section className="section-block compact"><SectionTitle kicker="Carga" title="Inventário" aside={<button type="button" className="text-button" onClick={addInventoryItem}>+ Adicionar item</button>} />{sheet.inventory.length ? <div className="inventory-list"><div className="inventory-head"><span>Item</span><span>Qtd.</span><span>Observação</span><span /></div>{sheet.inventory.map((item) => <div className="inventory-row" key={item.id}><input value={item.name} onChange={(event) => updateInventoryItem(item.id, { name: event.target.value })} /><input type="number" min={0} value={item.quantity} onChange={(event) => updateInventoryItem(item.id, { quantity: Number(event.target.value) || 0 })} /><input value={item.notes} onChange={(event) => updateInventoryItem(item.id, { notes: event.target.value })} placeholder="Detalhes" /><button type="button" aria-label={`Remover ${item.name}`} onClick={() => patchSheet({ inventory: sheet.inventory.filter((candidate) => candidate.id !== item.id) })}>×</button></div>)}</div> : <button className="empty-add" type="button" onClick={addInventoryItem}>Nenhum item registrado <span>Adicionar o primeiro</span></button>}</section>
            <section className="section-block compact"><SectionTitle kicker="Livre" title="Notas da sessão" /><textarea className="notes-area" rows={10} value={sheet.notes} onChange={(event) => patchSheet({ notes: event.target.value })} placeholder="Pistas, nomes, promessas, dívidas, objetivos..." /></section>
          </div>}
        </section>
      </div>
      <nav className="mobile-nav" aria-label="Seções da ficha">{(["resumo", "atributos", "vantagens", "kakuhou", "historia"] as TabId[]).map((id, index) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{String(index + 1).padStart(2, "0")}</span>{id === "kakuhou" ? "Kakuhou" : id.charAt(0).toUpperCase() + id.slice(1)}</button>)}</nav>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function SectionTitle({ kicker, title, aside }: { kicker: string; title: string; aside?: React.ReactNode }) { return <div className="section-title"><div><span>{kicker}</span><h2>{title}</h2></div>{aside}</div>; }
function PageHeader({ number, title, description }: { number: string; title: string; description: string }) { return <header className="page-header"><span>{number}</span><div><h1>{title}</h1><p>{description}</p></div></header>; }
function ResourceCard({ label, current, max, tone, onChange }: { label: string; current: number; max: number; tone: string; onChange: (value: number) => void }) { const percent = max ? Math.max(0, Math.min(100, (current / max) * 100)) : 0; return <div className={`resource-card ${tone}`}><div><span>{label}</span><label><input type="number" min={0} value={current} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} aria-label={`${label} atual`} /><i>/</i><b>{max}</b></label></div><div className="resource-meter"><i style={{ width: `${percent}%` }} /></div></div>; }
function Stat({ label, value, mono, onCopy, copied }: { label: string; value: React.ReactNode; mono?: boolean; onCopy?: () => void; copied?: boolean }) { return <button type="button" className={`stat ${onCopy ? "copyable" : ""}`} onClick={onCopy} disabled={!onCopy}><span>{copied ? "Copiado" : label}</span><strong className={mono ? "mono" : ""}>{value}</strong></button>; }
function Ledger({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) { return <div><span>{label}</span><b className={positive ? "positive" : negative ? "muted" : ""}>{positive && value ? "+" : negative && value ? "−" : ""}{value}</b></div>; }
function CatalogCard({ children, selected, unavailable, tone }: { children: React.ReactNode; selected: boolean; unavailable?: boolean; tone: string }) { return <article className={`catalog-card ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} data-tone={tone}>{children}</article>; }
function RankControl({ rank, max, onDown, onUp }: { rank: number; max: number; onDown: () => void; onUp: () => void }) { return <div className="rank-control"><button type="button" onClick={onDown} disabled={rank <= 1}>−</button><span>N{rank}</span><button type="button" onClick={onUp} disabled={rank >= max}>+</button></div>; }

function AttributeCard({ attributeKey, sheet, derived, copied, onCopy, onSet, onExtra }: {
  attributeKey: AttributeKey; sheet: CharacterSheet;
  derived: { speciesBonuses: Record<AttributeKey, number>; permanentAttributes: Record<AttributeKey, number>; activeAttributes: Record<AttributeKey, number>; permanentDice: Record<AttributeKey, number>; attributeTests: Record<AttributeKey, string>; primaryAttribute: AttributeKey; kaguneTest: string; looseHitAdjustments: number; purchasedCap: number };
  copied: string; onCopy: (formula: string, key: string) => void; onSet: (key: AttributeKey, value: number) => void; onExtra: (key: AttributeKey, value: number) => void;
}) {
  const base = sheet.baseAttributes[attributeKey]; const total = derived.activeAttributes[attributeKey]; const speciesBonus = derived.speciesBonuses[attributeKey];
  const acurado = sheet.perks[`acurado-${attributeKey}`] ? 1 : 0; const bodyUpgrade = sheet.kaguneActive && sheet.effects["aprimoramentos-corporais"]?.target === attributeKey ? sheet.effects["aprimoramentos-corporais"].rank : 0;
  const rawBonus = derived.permanentDice[attributeKey]; const formula = derived.attributeTests[attributeKey]; const isPrimary = sheet.weaponKind === "kagune" && derived.primaryAttribute === attributeKey;
  return <article className={`attribute-card ${base > derived.purchasedCap ? "over-cap" : ""}`}><div className="attribute-title"><div><span>{attributeLabels[attributeKey]}</span><p>{attributeDescriptions[attributeKey]}</p></div><b>{attributePurchaseCost(base)} PE</b></div><div className="attribute-value-row"><div className="stepper"><button type="button" onClick={() => onSet(attributeKey, base - 1)} disabled={base <= 0}>−</button><strong>{base}</strong><button type="button" onClick={() => onSet(attributeKey, base + 1)}>+</button></div>{(speciesBonus + acurado + bodyUpgrade) > 0 && <div className="total-value"><span>Total</span><b>{total}</b></div>}</div><div className="bonus-chips">{speciesBonus > 0 && <span>+{speciesBonus} espécie</span>}{acurado > 0 && <span>+1 Acurado</span>}{bodyUpgrade > 0 && <span>+{bodyUpgrade} Kakuhou</span>}{rawBonus > 0 && <span>+{rawBonus}d8 Vantagem</span>}</div><button className="test-command" type="button" onClick={() => onCopy(formula, attributeKey)}><span>{copied === attributeKey ? "Copiado" : "Teste Rollem"}</span><code>{formula}</code><i>⧉</i></button>{base === 0 && <p className="zero-rule">Atributo 0: role 2d8 e use o menor resultado.</p>}{isPrimary && <button className="test-command kagune" type="button" onClick={() => onCopy(derived.kaguneTest, `${attributeKey}-kagune`)}><span>{copied === `${attributeKey}-kagune` ? "Copiado" : "Com Kagune"}</span><code>{derived.kaguneTest}</code><i>⧉</i></button>}<label className="extra-dice"><span>Dados extras / penalidade</span><div><button type="button" onClick={() => onExtra(attributeKey, sheet.extraDice[attributeKey] - 1)}>−</button><input type="number" value={sheet.extraDice[attributeKey]} onChange={(event) => onExtra(attributeKey, Number(event.target.value) || 0)} /><button type="button" onClick={() => onExtra(attributeKey, sheet.extraDice[attributeKey] + 1)}>+</button></div></label></article>;
}
