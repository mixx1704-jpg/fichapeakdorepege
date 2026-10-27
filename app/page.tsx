/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";
import { filterPerkCatalog } from "./catalog-filters";
import { LevelUp, Modal, QuickRoll, ReleaseWatcher, Rulebook } from "./ReworkUI";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { archetypes, attributeDescriptions, attributeKeys, attributeLabels, combatManeuvers, drawbacks, evolutions, kaguneEffects, mentalAttributes, perks, physicalAttributes, speciesOptions, type AttributeKey, type Drawback, type Evolution, type KaguneEffect, type KaguneFamily, type Perk, type SpeciesId } from "./data";
import { SupplementOrganPerks } from "./SupplementPerks";
import { KakujaPanel } from "./KakujaPanel";
import { CustomSkillsPanel, type CustomSkillBonuses } from "./CustomSkillsPanel";
import { KakujaImageSlot } from "./KakujaImages";
import { QuinquesPanel } from "./QuinquesPanel";
import { normalizeQuinque } from "./quinque";
import { TailsPanel } from "./TailsPanel";
import { ColossoPanel } from "./ColossoPanel";
import { AttackToolsPanel } from "./AttackToolsPanel";
import { TacticalPanel } from "./TacticalPanel";
import { resolveTactical, type TacticalContext, type TacticalAction } from "./tactical";
import { applyCharacterTacticalAction } from "./tactical-sheet";
import { VatsPanel } from "./VatsPanel";
import { vatsAction, type VatsConfig, type VatsAction } from "./vats-engine";
import {
  type TabId,
  type WeaponKind,
  type InventoryItem,
  type CustomPerk,
  type DamageContext,
  type CustomBonuses,
  type CharacterSheet,
  type SaveFile,
  STORAGE_KEY,
  THEME_KEY,
  gradeProgression,
  reactionsPerRound,
  registerEarnedPE,
  advanceGradeIfReady,
  uid,
  newCharacter,
  normalizeCharacter,
  rankCost,
  evolutionRank,
  drawbackMaximum,
  drawbackTargets,
  kaguneFamiliesForSheet,
  effectCostForSheet,
  evolutionCostsForSheet,
  attributePurchaseCost,
  hasHumanPerkSurcharge,
  perkCostForSheet,
  permanentAttributesForSheet,
  perkRequirementMet,
  effectRequirementStatus,
  instinctiveAccess,
  evolutionRequirementStatus,
  effectCompatibleForSheet,
  pruneStructuralDependencies,
  familyColor,
  effectMaximum,
  calculateCharacter,
  damageConditionsForSheet,
} from "./character";

export default function Home() {
  const [characters, setCharacters] = useState<CharacterSheet[]>(() => [{ ...newCharacter(), id: "rascunho-local" }]);
  const [activeId, setActiveId] = useState("rascunho-local");
  const [tab, setTab] = useState<TabId>("resumo");
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [copied, setCopied] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [perkCategory, setPerkCategory] = useState("Todas");
  const [perkView, setPerkView] = useState<"vantagens" | "desvantagens">("vantagens");
  const [effectSearch, setEffectSearch] = useState("");
  const [effectFamily, setEffectFamily] = useState("Compatíveis");
  const [taijiFrom, setTaijiFrom] = useState<AttributeKey>("forca");
  const [taijiTo, setTaijiTo] = useState<AttributeKey>("agilidade");
  const [equipmentView, setEquipmentView] = useState<"kagune" | "quinques">("kagune");
  const [selectedQuinqueId, setSelectedQuinqueId] = useState("");
  const [kakuhouView, setKakuhouView] = useState<"oficiais" | "autorais">("oficiais");
  const [showMenu, setShowMenu] = useState(false);
  const [dialogView, setDialogView] = useState<"rules" | "roll" | null>(null);
  const [levelCelebration, setLevelCelebration] = useState<number | null>(null);
  const [migrationNotice, setMigrationNotice] = useState(0);
  const [storageError, setStorageError] = useState("");
  const [canPersist, setCanPersist] = useState(true);
  const [backupNeedsDownload, setBackupNeedsDownload] = useState(false);
  const [catalogOwned, setCatalogOwned] = useState(false);
  const [catalogAvailable, setCatalogAvailable] = useState(false);
  const [catalogLimit, setCatalogLimit] = useState(48);
  const [catalogTier, setCatalogTier] = useState("all");
  const [detailPerk, setDetailPerk] = useState<Perk | null>(null);
  const backupRef = useRef<string | null>(null);
  const [peGainInput, setPeGainInput] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const sheet = characters.find((character) => character.id === activeId) || characters[0];

  useEffect(() => {
    if (tab === "kakuja" && sheet.grade < 6) setTab("resumo");
  }, [sheet.grade, tab]);

  useEffect(() => {
    setPeGainInput(0);
  }, [activeId]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        backupRef.current = stored;
        const parsed = JSON.parse(stored) as Partial<SaveFile>;
        if (!Array.isArray(parsed.characters) || !parsed.characters.length || parsed.characters.some(item => !item || typeof item !== "object")) throw new Error("invalid-save");
        const sourceVersion = Number((parsed as { version?: number }).version) || 2;
        if (sourceVersion > 8) throw new Error("newer-version");
        if (sourceVersion < 8) {
          try {
            if (!localStorage.getItem(`${STORAGE_KEY}-backup-before-level20`)) localStorage.setItem(`${STORAGE_KEY}-backup-before-level20`, stored);
          } catch {
            setCanPersist(false);
            setBackupNeedsDownload(true);
            setStorageError("O navegador não tem espaço para o backup. Baixe a cópia antiga para liberar o salvamento da versão nova.");
          }
        }
        const loaded = parsed.characters.map((character) => normalizeCharacter(character, sourceVersion));
        setCharacters(loaded);
        setActiveId(loaded.some((item) => item.id === parsed.activeId) ? String(parsed.activeId) : loaded[0].id);
        if (sourceVersion < 8) setMigrationNotice(loaded.length);
      }
    } catch {
      backupRef.current = stored;
      setCanPersist(false);
      setStorageError("Não foi possível abrir o salvamento local. Ele foi preservado. Baixe o arquivo para recuperar ou importe uma cópia válida.");
    } finally { setHydrated(true); }
  }, []);

  useEffect(() => {
    try {
      setTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
    } catch { /* Usa o tema claro se o navegador bloquear armazenamento. */ }
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* A preferência continua ativa nesta visita. */ }
  }, [theme]);

  useEffect(() => {
    if (!hydrated || !canPersist) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 8, activeId, characters } satisfies SaveFile));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [characters, activeId, hydrated, canPersist]);

  const updateSheet = (updater: (current: CharacterSheet) => CharacterSheet) => {
    setCharacters((current) => current.map((character) => character.id === activeId ? { ...updater(character), updatedAt: Date.now() } : character));
  };
  const patchSheet = (patch: Partial<CharacterSheet>) => updateSheet((current) => ({ ...current, ...patch }));

  const derived = useMemo(() => calculateCharacter(sheet), [sheet]);

  const filteredPerks = useMemo(() => filterPerkCatalog(perks, {
    query: catalogSearch, category: perkCategory,
    ownedOnly: catalogOwned, availableOnly: catalogAvailable,
    isOwned: item => Boolean(sheet.perks[item.id]),
    isAvailable: item => perkRequirementMet(item, sheet, derived.permanentAttributes),
  }).filter(item => catalogTier !== "20" || item.minGrade === 20), [catalogSearch, perkCategory, catalogOwned, catalogAvailable, catalogTier, sheet, derived.permanentAttributes]);
  const filteredDrawbacks = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase("pt-BR");
    return drawbacks.filter((item) => !query || `${item.name} ${item.description}`.toLocaleLowerCase("pt-BR").includes(query));
  }, [catalogSearch]);
  const compatibleFamilies = useMemo(() => {
    const selected = kaguneFamiliesForSheet(sheet);
    const families = new Set<string>(["Geral", ...selected]);
    if (selected.has("Bikaku")) ["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].forEach((family) => families.add(family));
    return families;
  }, [sheet]);
  const filteredEffects = useMemo(() => {
    const query = effectSearch.trim().toLocaleLowerCase("pt-BR");
    return kaguneEffects.filter((item) => (effectFamily === "Todos" || (effectFamily === "Compatíveis" ? compatibleFamilies.has(item.family) : item.family === effectFamily)) && (!query || `${item.name} ${item.description} ${item.type}`.toLocaleLowerCase("pt-BR").includes(query)));
  }, [effectSearch, effectFamily, compatibleFamilies]);
  const filteredQuimeraPerks = useMemo(() => {
    const query = effectSearch.trim().toLocaleLowerCase("pt-BR");
    return perks.filter((item) => item.category === "Kagune Quimera" && (!query || `${item.name} ${item.description} ${item.requirement || ""}`.toLocaleLowerCase("pt-BR").includes(query)));
  }, [effectSearch]);
  const filteredEvolutions = useMemo(() => {
    const families = kaguneFamiliesForSheet(sheet);
    return evolutions.filter((item) => item.family === "Geral" || item.family === "Quimera" || families.has(item.family as KaguneFamily) || instinctiveAccess(item, sheet) || sheet.selectedEvolutions.includes(item.id));
  }, [sheet]);

  useEffect(() => { setCatalogLimit(48); }, [catalogSearch, perkCategory, catalogOwned, catalogAvailable, catalogTier]);

  const copyTest = async (formula: string, key: string) => {
    try { await navigator.clipboard.writeText(formula); setCopied(key); window.setTimeout(() => setCopied(""), 1300); }
    catch { setCopied(""); }
  };
  const setAttribute = (key: AttributeKey, value: number) => updateSheet((current) => ({ ...current, baseAttributes: { ...current.baseAttributes, [key]: Math.max(0, Math.floor(current.narrativeLimits || value <= current.baseAttributes[key] ? value : Math.min(11, value))) } }));
  const setExtraDice = (key: AttributeKey, value: number) => updateSheet((current) => ({ ...current, extraDice: { ...current.extraDice, [key]: Math.max(-9999, Math.min(9999, value)) } }));
  const patchDamage = (patch: Partial<DamageContext>) => updateSheet((current) => ({ ...current, damageContext: { ...current.damageContext, ...patch } }));
  const patchCustomBonuses = (patch: Partial<Omit<CustomBonuses, "attributes">>) => updateSheet((current) => ({ ...current, customBonuses: { ...current.customBonuses, ...patch } }));
  const setCustomAttributeBonus = (key: AttributeKey, value: number) => updateSheet((current) => ({ ...current, customBonuses: { ...current.customBonuses, attributes: { ...current.customBonuses.attributes, [key]: value } } }));
  const toggleDamageCondition = (scope: "physical" | "kagune", id: string) => updateSheet((current) => ({
    ...current,
    damageContext: { ...current.damageContext, active: { ...current.damageContext.active, [`${scope}:${id}`]: !current.damageContext.active[`${scope}:${id}`] } },
  }));

  const addCustomPerk = () => updateSheet((current) => ({
    ...current,
    customPerks: [...current.customPerks, { id: uid(), name: "Nova vantagem", description: "", cost: 0 }],
  }));
  const updateCustomPerk = (id: string, patch: Partial<CustomPerk>) => updateSheet((current) => ({
    ...current,
    customPerks: current.customPerks.map((item) => item.id === id ? { ...item, ...patch } : item),
  }));
  const removeCustomPerk = (id: string) => updateSheet((current) => ({
    ...current,
    customPerks: current.customPerks.filter((item) => item.id !== id),
  }));

  const togglePerk = (item: Perk) => updateSheet((current) => {
    const next = { ...current.perks };
    if (next[item.id]) delete next[item.id];
    else {
      const attributes = permanentAttributesForSheet(current).permanentAttributes;
      if (!perkRequirementMet(item, current, attributes)) return current;
      next[item.id] = { rank: 1, target: item.targetAttribute ? (item.targetAttribute === "mental" ? "raciocinio" : "forca") : undefined };
    }
    return pruneStructuralDependencies({ ...current, perks: next });
  });
  const updatePerkRank = (item: Perk, delta: number) => updateSheet((current) => {
    const acquired = current.perks[item.id]; if (!acquired) return current;
    return { ...current, perks: { ...current.perks, [item.id]: { ...acquired, rank: Math.max(1, Math.min(item.maxRank || 1, acquired.rank + delta)) } } };
  });
  const toggleDrawback = (item: Drawback) => updateSheet((current) => {
    const next = { ...current.drawbacks };
    if (next[item.id]) delete next[item.id];
    else next[item.id] = { rank: 1, target: item.targetAttribute ? "forca" : undefined, targets: item.uniqueTargets ? ["forca"] : undefined };
    return { ...current, drawbacks: next };
  });
  const updateDrawbackRank = (item: Drawback, delta: number) => updateSheet((current) => {
    const acquired = current.drawbacks[item.id]; if (!acquired) return current;
    const rank = Math.max(1, Math.min(drawbackMaximum(item), acquired.rank + delta));
    if (!item.uniqueTargets) return { ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, rank } } };
    const targets = drawbackTargets(acquired).slice(0, rank);
    while (targets.length < rank) targets.push(attributeKeys.find((key) => !targets.includes(key)) || attributeKeys[0]);
    return { ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, rank, target: targets[0], targets } } };
  });
  const updateDrawbackTarget = (item: Drawback, index: number, target: AttributeKey) => updateSheet((current) => {
    const acquired = current.drawbacks[item.id]; if (!acquired) return current;
    if (!item.uniqueTargets) return { ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, target } } };
    const targets = drawbackTargets(acquired);
    targets[index] = target;
    return { ...current, drawbacks: { ...current.drawbacks, [item.id]: { ...acquired, target: targets[0], targets } } };
  });
  const toggleEffect = (item: KaguneEffect) => updateSheet((current) => {
    const next = { ...current.effects };
    if (next[item.id]) delete next[item.id];
    else {
      const biologicalBlocked = current.weaponKind === "quinque" && item.id !== "forma-versatil" && item.type.includes("Biológico");
      if (biologicalBlocked || !effectCompatibleForSheet(item, current) || !effectRequirementStatus(item, current).met) return current;
      next[item.id] = { rank: 1, target: item.targetAttribute ? current.physicalBonus : undefined };
    }
    return pruneStructuralDependencies({ ...current, effects: next });
  });
  const updateEffectRank = (item: KaguneEffect, delta: number) => updateSheet((current) => {
    const acquired = current.effects[item.id]; if (!acquired) return current;
    const max = effectMaximum(item, current);
    return pruneStructuralDependencies({ ...current, effects: { ...current.effects, [item.id]: { ...acquired, rank: Math.max(1, Math.min(max, acquired.rank + delta)) } } });
  });
  const toggleEvolution = (item: Evolution) => updateSheet((current) => {
    if (!current.selectedEvolutions.includes(item.id) && !evolutionRequirementStatus(item, current).met) return current;
    return pruneStructuralDependencies({
      ...current,
      selectedEvolutions: current.selectedEvolutions.includes(item.id)
        ? current.selectedEvolutions.filter((id) => id !== item.id)
        : [...current.selectedEvolutions, item.id],
    });
  });
  const updateEvolutionRank = (item: Evolution, delta: number) => updateSheet((current) => {
    const rank = evolutionRank(current.selectedEvolutions, item.id);
    if (!rank) return current;
    const nextRank = Math.max(1, Math.min(item.maxRank || 1, rank + delta));
    if (delta > 0 && !evolutionRequirementStatus(item, current, undefined, undefined, nextRank).met) return current;
    return pruneStructuralDependencies({
      ...current,
      selectedEvolutions: [
        ...current.selectedEvolutions.filter((id) => id !== item.id),
        ...Array.from({ length: nextRank }, () => item.id),
      ],
    });
  });
  const changeSpecies = (species: SpeciesId) => {
    const config = speciesOptions.find((item) => item.id === species)!;
    patchSheet({ species, weaponKind: config.hasKagune ? "kagune" : "nenhum", quinxFrame: species === "quinx" ? 2 : sheet.quinxFrame });
  };
  const registerProgressPE = () => {
    const gained = Math.max(0, Math.floor(peGainInput));
    if (!gained) return;
    updateSheet((current) => registerEarnedPE(current, gained));
    setPeGainInput(0);
  };
  const advanceGrade = () => {
    const next = advanceGradeIfReady(sheet);
    if (next.grade !== sheet.grade) { updateSheet(advanceGradeIfReady); setLevelCelebration(next.grade); }
  };
  const downloadBackup = () => {
    let raw = backupRef.current;
    try { raw = localStorage.getItem(`${STORAGE_KEY}-backup-before-level20`) || raw; } catch { /* Usa a cópia preservada em memória. */ }
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fichas-backup-antes-do-rework.json"; anchor.click(); URL.revokeObjectURL(url);
    if (backupNeedsDownload) { setCanPersist(true); setBackupNeedsDownload(false); setStorageError(""); }
  };

  const addCharacter = () => { const created = newCharacter(`Personagem ${characters.length + 1}`); setCharacters((current) => [...current, created]); setActiveId(created.id); setTab("resumo"); setShowMenu(false); };
  const duplicateCharacter = () => { const duplicate = normalizeCharacter({ ...sheet, id: uid(), name: `${sheet.name || "Personagem"} — cópia`, updatedAt: Date.now() }, 8); setCharacters((current) => [...current, duplicate]); setActiveId(duplicate.id); setShowMenu(false); };
  const removeCharacter = () => {
    if (characters.length === 1 || !window.confirm(`Excluir “${sheet.name || "Personagem"}” deste dispositivo?`)) return;
    const remaining = characters.filter((item) => item.id !== activeId); setCharacters(remaining); setActiveId(remaining[0].id); setShowMenu(false);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 8, activeId, characters } satisfies SaveFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `fome-justica-${(sheet.name || "fichas").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}.json`; anchor.click(); URL.revokeObjectURL(url); setShowMenu(false);
  };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SaveFile> | Partial<CharacterSheet>;
      if ("characters" in parsed && Array.isArray(parsed.characters)) {
        const sourceVersion = Number((parsed as { version?: number }).version) || 2;
        if (sourceVersion > 8) throw new Error("newer-version");
        const imported = parsed.characters.map((character) => normalizeCharacter(character, sourceVersion));
        if (imported.length) { if (characters.length) localStorage.setItem(`${STORAGE_KEY}-before-import`, JSON.stringify({version:8,activeId,characters})); setCanPersist(true); setStorageError(""); setCharacters(imported); setActiveId(imported.some((item) => item.id === parsed.activeId) ? String(parsed.activeId) : imported[0].id); }
      } else { if (!parsed || typeof parsed !== "object" || !("baseAttributes" in parsed || "species" in parsed || "name" in parsed)) throw new Error("invalid-character"); const imported = normalizeCharacter(parsed as Partial<CharacterSheet>); setCanPersist(true); setStorageError(""); setCharacters((current) => [...current, imported]); setActiveId(imported.id); }
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
  const damageConditionsFor = (scope: "physical" | "kagune") => damageConditionsForSheet(sheet, scope);

  const vatsConfig: VatsConfig = {
    maxLife: derived.maxLife, currentLife: sheet.currentLife, species: sheet.species, maxRC: derived.maxRC, rc: sheet.currentRC, hunger: sheet.hunger,
    vigor: derived.activeAttributes.vigor, baseVigor: sheet.baseAttributes.vigor, grade: sheet.grade,
    regeneration: derived.regenerationSkill, regenLevel: sheet.effects["regeneracao-superior"]?.rank || sheet.effects["regeneracao-anormal"]?.rank || 0,
    superior: sheet.effects["regeneracao-superior"]?.rank || 0, cells: !!sheet.perks["celulas-ageis"], kami: !!sheet.perks["vivo-kami"],
    centipedeAllowed: evolutionRequirementStatus(evolutions.find(e=>e.id==="centopeia")!, sheet, derived.permanentAttributes, derived.maxSanity).met,
    paidTailStart: 1 + derived.multipleTailsRank, tailAttackRC: derived.tailAttackRC, kaguneActive: sheet.kaguneActive,
    hasKagune: sheet.weaponKind === "kagune", durability: derived.kagunePartDurability, colossoActive: derived.colosso.active,
    naturalTails:derived.naturalTails, tails: sheet.weaponKind === "kagune" ? derived.maximumTails : 0,
    powers: [...sheet.selectedEvolutions,...Object.keys(sheet.perks)],rd:derived.rd,movement:derived.movement,dodgeTest:derived.dodgeTest,blockTest:derived.blockTest,tests:derived.attributeTests,
  };
  const tacticalContext: TacticalContext = {
    level:sheet.grade,species:sheet.species,attributes:derived.permanentAttributes,ownedPerks:sheet.perks,
    currentRC:sheet.currentRC,maxLife:derived.maxLife,currentLife:sheet.currentLife,
    damageSteps:sheet.weaponKind === "kagune" && sheet.kaguneActive ? derived.kaguneSteps : derived.physicalSteps,
    damageFormula:sheet.weaponKind === "kagune" && sheet.kaguneActive ? derived.kaguneDamage : derived.physicalDamage,
    penetrationPercent:derived.scaling.penetrationPercent,
    hitBonus:[...(sheet.weaponKind === "kagune" && sheet.kaguneActive ? derived.kaguneTest : derived.physicalHitTest).matchAll(/[+-]\d+/g)].reduce((sum,match)=>sum+Number(match[0]),0),
    rd:derived.rd,control:derived.activeAttributes.controle,weaponKind:sheet.weaponKind,kaguneType:sheet.kaguneType,
    isRCSuppressed:derived.rcSuppressed,weaponActive:sheet.weaponKind !== "kagune" || (sheet.kaguneActive && !derived.rcSuppressed && sheet.vats.kakuhouUntil <= sheet.vats.turn),
    turn:sheet.vats.turn,die:derived.testDie,
  };
  const actTactical = (action:TacticalAction) => updateSheet(current=>applyCharacterTacticalAction(current,action,tacticalContext));
  const actVats = (action: VatsAction) => updateSheet(current => {
    const result=vatsAction(current.vats,{...vatsConfig,currentLife:current.currentLife,rc:current.currentRC,hunger:current.hunger},action);
    const clock:TacticalAction|null=action.type === "session" ? {type:"session"} : action.type === "combat" ? {type:"combat"} : action.type === "turn" ? {type:"sync-turn",turn:result.vats.turn} : null;
    const tactical=clock ? resolveTactical(current.tactical,clock,{...tacticalContext,turn:undefined}).state : current.tactical;
    return {...current,...(action.type === "session" ? {taijiUses:0} : {}),...result,tactical,
      ...((action.type === "kakuhou" || action.type === "suppress-rc" && (action.amount || 0)>0) ? {kaguneActive:false,kakuja:{...current.kakuja,active:false}} : {})};
  });

  const navItems: [TabId, string, string][] = [
    ["resumo", "01", "Resumo"],
    ["atributos", "02", "Atributos"],
    ["vantagens", "03", "Perks"],
    ["kakuhou", "04", "Kagune e armas"],
    ["vats", "05", "Combate"],
    ...(sheet.grade >= 6 ? [["kakuja", "06", "Kakuja"] as [TabId, string, string]] : []),
    ["historia", sheet.grade >= 6 ? "07" : "06", "Notas"],
  ];

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">FJ</span><div><p>Fome &amp; Justiça</p><span>Tokyo Ghoul RPG</span></div></div>
        <div className="character-switcher"><button className="rules-button" type="button" onClick={() => setDialogView("rules")}>Regras</button>
          <label className="sr-only" htmlFor="character-select">Ficha ativa</label>
          <select id="character-select" value={activeId} onChange={(event) => setActiveId(event.target.value)}>{characters.map((character) => <option key={character.id} value={character.id}>{character.name || "Sem nome"}</option>)}</select>
          <span className={`save-state ${saveStatus}`}><i />{saveStatus === "saving" ? "Salvando" : saveStatus === "error" ? "Não foi possível salvar" : "Salvo neste dispositivo"}</span>
          <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}>{theme === "dark" ? "☀ Claro" : "☾ Escuro"}</button>
          <div className="menu-wrap"><button className="icon-button" type="button" onClick={() => setShowMenu((value) => !value)} aria-label="Opções da ficha" aria-expanded={showMenu}>•••</button>
            {showMenu && <div className="sheet-menu"><button type="button" onClick={addCharacter}>Nova ficha</button><button type="button" onClick={duplicateCharacter}>Duplicar ficha</button><button type="button" onClick={exportData}>Exportar arquivo</button>{backupRef.current && <button type="button" onClick={() => {downloadBackup();setShowMenu(false);}}>Backup anterior ao rework</button>}<button type="button" onClick={() => importRef.current?.click()}>Importar arquivo</button><button type="button" onClick={() => window.print()}>Imprimir</button><button className="danger" type="button" onClick={removeCharacter} disabled={characters.length === 1}>Excluir ficha</button></div>}
          </div><input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importData} />
        </div>
      </header>

      <ReleaseWatcher canReload={hydrated && canPersist && saveStatus === "saved"} />
      {dialogView === "rules" && <Rulebook onClose={() => setDialogView(null)} />}
      {dialogView === "roll" && <QuickRoll critical={{perks:sheet.perks,context:{level:sheet.grade,attributes:derived.activeAttributes}}} onClose={() => setDialogView(null)} tests={[{name:"Ataque físico",formula:derived.physicalHitTest}, ...(sheet.weaponKind === "kagune" ? [{name:"Kagune",formula:derived.kaguneTest}] : []), {name:"Bloqueio",formula:derived.blockTest}, {name:"Esquiva",formula:derived.dodgeTest}, ...attributeKeys.map(key => ({name:attributeLabels[key],formula:derived.attributeTests[key]}))]} />}
      {levelCelebration !== null && <LevelUp level={levelCelebration} onClose={() => setLevelCelebration(null)} />}
      {detailPerk && <Modal title={detailPerk.name} onClose={() => setDetailPerk(null)}><p className="detail-category">{detailPerk.category} · LEVEL {detailPerk.minGrade || 1} · {perkCostForSheet(detailPerk, sheet.perks[detailPerk.id]?.rank || 1, sheet)} PE</p><p className="perk-detail-description">{detailPerk.description}</p><p className="section-help">{detailPerk.requirement || "Sem requisito adicional."}</p><button type="button" className="primary-action" disabled={!sheet.perks[detailPerk.id] && !perkRequirementMet(detailPerk, sheet, derived.permanentAttributes)} onClick={() => { togglePerk(detailPerk); setDetailPerk(null); }}>{sheet.perks[detailPerk.id] ? "Remover perk" : "Comprar perk"}</button></Modal>}
      <div className="workspace">
        <aside className="sidebar"><nav aria-label="Seções da ficha">{navItems.map(([id, number, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{number}</span>{label}</button>)}</nav>
          <div className="pe-mini"><div><span>PE restante</span><strong className={derived.peRemaining < 0 ? "negative" : ""}>{derived.peRemaining}</strong></div><div className="meter"><i style={{ width: `${Math.max(0, Math.min(100, derived.peAvailable ? (derived.peSpent / derived.peAvailable) * 100 : 0))}%` }} /></div><small>{derived.peSpent} gastos de {derived.peAvailable}</small></div>
        </aside>

        <section className="content" key={`${activeId}-${tab}`}>
          {storageError && <aside className="migration-banner error" role="alert"><div><b>Salvamento protegido</b><p>{storageError}</p></div><button type="button" onClick={downloadBackup}>Baixar arquivo preservado</button><button type="button" onClick={() => importRef.current?.click()}>Importar cópia</button></aside>}
          {migrationNotice > 0 && <aside className="migration-banner" role="status"><div><b>Fichas atualizadas</b><p>{migrationNotice} {migrationNotice === 1 ? "ficha atualizada" : "fichas atualizadas"} para LEVEL e d20. Compras, PE e dados da história preservados.</p></div><button type="button" onClick={downloadBackup}>Baixar backup antigo</button><button type="button" aria-label="Fechar aviso de migração" onClick={() => setMigrationNotice(0)}>×</button></aside>}
          {tab === "vats" && <div className="page-stack"><AttackToolsPanel key={`attack-${sheet.id}`} value={sheet.combatTools} onChange={combatTools=>patchSheet({combatTools})} name={sheet.name} physicalTest={derived.physicalHitTest} physicalDamage={derived.physicalDamage} kaguneTest={derived.kaguneTest} kaguneDamage={derived.kaguneDamage} scaling={derived.scaling} poisonConfig={derived.poisonConfig} criticalPerks={sheet.perks} criticalContext={{level:sheet.grade,attributes:derived.activeAttributes}} die={derived.testDie} physicalSteps={derived.physicalSteps} physicalFlat={derived.physicalDamageModifier} kaguneSteps={derived.kaguneSteps-(derived.colosso.active&&(derived.multipleTailsRank>0||derived.multipleTailsPlusRank>0)?2:0)} kaguneFlat={derived.kaguneDamageModifier} fusedParts={derived.colosso.active?derived.colosso.partCount:1} sharedSteps={derived.fusionSharedSteps} sharedFlat={derived.fusionSharedFlat} weaponActive={sheet.weaponKind === "kagune" && sheet.kaguneActive && !derived.rcSuppressed && sheet.vats.kakuhouUntil <= sheet.vats.turn}/><TacticalPanel key={`tactical-${sheet.id}`} state={sheet.tactical} context={tacticalContext} onChange={tactical=>patchSheet({tactical})} onAction={actTactical} managedTurn/><VatsPanel key={sheet.id} state={sheet.vats} config={vatsConfig} name={sheet.name} onAction={actVats} /></div>}
          {tab === "resumo" && <div className="page-stack">
            <header className="sheet-heading"><div><h1>Resumo</h1><p>{derived.species.label} <span>·</span> Level {sheet.grade}</p></div><div className="sheet-actions"><button type="button" className="solid-button" onClick={() => setDialogView("roll")}>Rolar teste</button><button type="button" onClick={() => setTab("vantagens")}>Perks</button></div></header><section className="identity-grid">
              <div className="portrait-card"><label className="portrait-upload">{sheet.image ? <img src={sheet.image} alt={`Retrato de ${sheet.name || "personagem"}`} /> : <span><b>+</b>Adicionar retrato<small>JPG ou PNG</small></span>}<input type="file" accept="image/*" onChange={handleImage} /></label>{sheet.image && <button className="remove-image" type="button" onClick={() => patchSheet({ image: "" })}>Remover imagem</button>}</div>
              <div className="identity-fields"><label className="hero-name"><span className="sr-only">Nome</span><input value={sheet.name} onChange={(event) => patchSheet({ name: event.target.value })} placeholder="Nome do personagem" /></label>
                <div className="field-grid four"><Field label="Jogador"><input value={sheet.player} onChange={(event) => patchSheet({ player: event.target.value })} placeholder="Nome" /></Field><Field label="Idade"><input value={sheet.age} onChange={(event) => patchSheet({ age: event.target.value })} placeholder="—" /></Field><Field label="Pronomes"><input value={sheet.pronouns} onChange={(event) => patchSheet({ pronouns: event.target.value })} placeholder="—" /></Field><Field label="LEVEL"><select value={sheet.grade} onChange={(event) => patchSheet({ grade: Number(event.target.value), progressPE: 0 })}>{Array.from({length:20},(_,i)=>i+1).map((grade) => <option key={grade}>{grade}</option>)}</select></Field></div>
                <div className="field-grid two"><Field label="Espécie"><select value={sheet.species} onChange={(event) => changeSpecies(event.target.value as SpeciesId)}>{speciesOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label="Arquétipo"><select value={sheet.archetype} onChange={(event) => patchSheet({ archetype: event.target.value })}>{archetypes.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field></div>
                <p className="species-note">{derived.species.summary}</p><Field label="Conceito"><input value={sheet.concept} onChange={(event) => patchSheet({ concept: event.target.value })} placeholder="Ex.: investigador obstinado, herdeiro descartado..." /></Field><Field label="Frase central"><input value={sheet.centralPhrase} onChange={(event) => patchSheet({ centralPhrase: event.target.value })} placeholder="A ideia que guia o personagem" /></Field>
              </div>
            </section>
            <section className="section-block"><SectionTitle kicker="Estado atual" title="Recursos e parâmetros" aside={<button className="text-button" type="button" onClick={() => patchSheet({ currentLife: derived.maxLife, currentSanity: derived.maxSanity, currentRC: derived.maxRC })}>Preencher máximos</button>} />
              <div className="resource-grid"><ResourceCard label="Vida" current={sheet.currentLife} max={derived.maxLife} tone="life" onChange={(value) => patchSheet({ currentLife: value })} /><ResourceCard label="Sanidade" current={sheet.currentSanity} max={derived.maxSanity} tone="sanity" onChange={(value) => patchSheet({ currentSanity: value })} />{sheet.weaponKind === "kagune" && <ResourceCard label="RC" current={sheet.currentRC} max={derived.maxRC} tone="rc" onChange={(value) => patchSheet({ currentRC: value })} />}{showsHunger && <ResourceCard label="Fome" current={sheet.hunger} max={10} tone="hunger" onChange={(value) => patchSheet({ hunger: value })} />}{showsInstinct && <ResourceCard label="Carga instintiva" current={sheet.instinct} max={10} tone="instinct" onChange={(value) => patchSheet({ instinct: value })} />}</div>
              <p className="mental-state"><span>TESTES / d{derived.testDie}</span>{["ghoul","ghoul-artificial","ghoul-dominante"].includes(sheet.species) ? `Sanidade ${Math.floor(sheet.currentSanity / derived.maxSanity * 100)}% · Controle +${derived.ghoulControlBonus} em ataque, bloqueio e esquiva` : "Um d20 + todos os modificadores de acerto"}</p><div className="stat-strip"><button type="button" className="stat copyable" aria-pressed={sheet.reactionEnemyBonus} title={`${sheet.reactionEnemyBonus ? "Desativar" : "Ativar"} +3 reações: mais de 10 vezes o número de inimigos`} onClick={() => patchSheet({ reactionEnemyBonus: !sheet.reactionEnemyBonus })}><span>Reações por Rodada</span><strong>{reactionsPerRound(derived.activeAttributes.agilidade, sheet.grade, sheet.reactionEnemyBonus).toLocaleString("pt-BR")}</strong></button><Stat label="Iniciativa" value={derived.initiativeTest} mono onCopy={() => copyTest(derived.initiativeTest,"initiative")} copied={copied === "initiative"} /><Stat label="RD" value={derived.rd} />{sheet.weaponKind === "kagune" && <Stat label="Alcance da Kagune" value={`${derived.distance} m`} />}{sheet.weaponKind === "kagune" && <Stat label="Dureza da Kagune" value={derived.kaguneDurability} />}{sheet.weaponKind === "kagune" && <Stat label="Regeneração / turno" value={derived.regeneration} />}<Stat label="Deslocamento" value={`${derived.movement} ${derived.movement === 1 ? "espaço" : "espaços"}`} /><Stat label="Carga" value={derived.carrying} />{hasDetermination && <Stat label="Determinação" value={derived.determination} />}<Stat label="Bloqueio" value={derived.blockTest} mono onCopy={() => copyTest(derived.blockTest, "block")} copied={copied === "block"} /><Stat label="Esquiva" value={derived.dodgeTest} mono onCopy={() => copyTest(derived.dodgeTest, "dodge")} copied={copied === "dodge"} /></div>
              <div className="custom-resource-bonuses"><span>Ajustes adicionais da mesa</span><div><Field label="Distância adicional (m)"><input type="number" step="0.5" value={sheet.customBonuses.distance} onChange={(event) => patchCustomBonuses({ distance: Number(event.target.value) || 0 })} /></Field><Field label="Vida adicional"><input type="number" value={sheet.customBonuses.hp} onChange={(event) => patchCustomBonuses({ hp: Number(event.target.value) || 0 })} /></Field><Field label="RC adicional"><input type="number" value={sheet.customBonuses.rc} onChange={(event) => patchCustomBonuses({ rc: Number(event.target.value) || 0 })} /></Field><Field label="Sanidade adicional"><input type="number" value={sheet.customBonuses.sanity} onChange={(event) => patchCustomBonuses({ sanity: Number(event.target.value) || 0 })} /></Field></div></div>
            </section>
            <div className="vats-entry"><div><span>MONITOR CORPORAL</span><strong>{Object.values(sheet.vats.body).filter(r=>r.damage>0||r.effects.length||r.destroyed).length} / 6 regiões afetadas</strong><small>Vida regional é independente da Vida geral, como no VATS original.</small></div><button type="button" onClick={()=>setTab("vats")}>Abrir VATS ↗</button></div><section className="summary-columns">
              <div className="section-block compact">
                <SectionTitle kicker="Evolução" title="Pontos de Evolução" />
                <div className="pe-hero"><strong className={derived.peRemaining < 0 ? "negative" : ""}>{derived.peRemaining}</strong><span>PE disponíveis</span></div>
                <div className="ledger"><Ledger label="Verba total" value={derived.peAvailable} /><Ledger label="PE aplicado pela progressão" value={derived.progressionPE} positive /><Ledger label="Atributos" value={derived.attributePE} negative /><Ledger label="Vantagens do catálogo" value={derived.nonKaguneCatalogPerksPE} negative /><Ledger label="Vantagens personalizadas" value={derived.customPerksPE} negative /><Ledger label="Kakuhou / arma" value={derived.paidEffectPE + derived.evolutionPE + derived.quimeraCost + derived.kagunePerksPE + derived.customSkillsPE} negative /><Ledger label="Kakuja · PE comum" value={derived.kakujaCommonPE} negative /><Ledger label="Subespécie" value={derived.species.subCost} negative /><Ledger label="Desvantagens" value={derived.drawbackCredit} positive /></div>
                <div className="inline-controls single"><label><span>PE adicionais da mesa</span><input type="number" value={sheet.extraPE} onChange={(event) => patchSheet({ extraPE: Number(event.target.value) || 0 })} /></label></div>
                <div className="grade-progress">
                  <div className="grade-progress-head"><span>Progressão de LEVEL</span><strong>LEVEL {sheet.grade}{derived.hasNextGrade ? ` → ${derived.nextGrade}` : " · máximo"}</strong></div>
                  {derived.hasNextGrade ? <>
                    <div className="grade-progress-values"><b>{sheet.progressPE} / {derived.nextGradeRequirement} PE</b><small>{derived.canAdvanceGrade ? "Requisito cumprido" : `${derived.progressRemaining} PE restantes`}</small></div>
                    <div className="grade-progress-meter" role="progressbar" aria-label={`Progresso para o LEVEL ${derived.nextGrade}`} aria-valuemin={0} aria-valuemax={derived.nextGradeRequirement} aria-valuenow={Math.min(sheet.progressPE, derived.nextGradeRequirement)}><i style={{ width: `${derived.progressPercent}%` }} /></div>
                  </> : <p className="grade-max-message">O LEVEL 20 é o máximo. Novos PE ainda entram normalmente na verba da ficha.</p>}
                  <div className="pe-gain-row"><label><span>PE ganho</span><input type="number" min={0} step={1} value={peGainInput || ""} onChange={(event) => setPeGainInput(Math.max(0, Number(event.target.value) || 0))} onKeyDown={(event) => { if (event.key === "Enter") registerProgressPE(); }} placeholder="Ex.: 5" /></label><button type="button" onClick={registerProgressPE} disabled={peGainInput <= 0}>Registrar PE</button></div>
                  <small className="grade-progress-note">O valor registrado entra imediatamente na verba e no progresso. Ao subir, só o custo do próximo LEVEL é descontado da barra. O excedente e todo PE já ganho permanecem na ficha.</small>
                  {derived.hasNextGrade && <button type="button" className={`grade-up-button ${derived.canAdvanceGrade ? "ready" : ""}`} disabled={!derived.canAdvanceGrade} onClick={advanceGrade}>{derived.canAdvanceGrade ? `Evoluir para LEVEL ${derived.nextGrade}` : `Faltam ${derived.progressRemaining} PE para o LEVEL ${derived.nextGrade}`}</button>}
                  <div className="grade-requirements" aria-label="Requisitos de progressão por LEVEL">{gradeProgression.map((step) => <span key={step.from} className={step.to <= sheet.grade ? "completed" : step.from === sheet.grade ? "current" : ""}><b>{step.from} → {step.to}</b><small>{step.requiredPE} PE</small></span>)}</div>
                </div>
              </div>
              <div className="section-block compact"><SectionTitle kicker="Psiquê" title={currentArchetype.name} /><p className="ability-text">{currentArchetype.ability}</p><div className="rule-note"><b>2 usos por descanso.</b> Habilidades em duas etapas só gastam o uso após a conclusão.</div>{sheet.conditions && <div className="condition-note"><span>Condições</span><p>{sheet.conditions}</p></div>}</div>
            </section>
            {derived.issues.length > 0 && <section className="validation-panel"><div><span>!</span><strong>{derived.issues.length} {derived.issues.length === 1 ? "ponto para revisar" : "pontos para revisar"}</strong></div><ul>{derived.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
          </div>}

          {tab === "atributos" && <div className="page-stack"><PageHeader number="02" title="Atributos" description="Um único dado + atributo + todos os acertos extras. O dado muda com a sanidade dos Ghouls; os modificadores continuam aditivos." />
            <div className="formula-rule"><div><span>Pool antigo</span><code>48d8++18&gt;&gt;7</code></div><b>→</b><div className="result"><span>Teste novo</span><code>1d20+48+18</code></div><b>+</b><div><span>Perk de acerto +1</span><code>1d20+48+19</code></div></div><label className="narrative-toggle"><input type="checkbox" checked={sheet.narrativeLimits} onChange={event => patchSheet({narrativeLimits:event.target.checked})} /><span><b>Modo narrativo · remover limite de atributos</b><small>Compras normais vão até 11. Ative para ultrapassar o limite com autorização da mesa.</small></span></label>
            <section className="section-block compact"><h2>Controle & mentalidade Ghoul</h2><p>LEVEL {sheet.grade}: <strong>+{derived.ghoulCombatBase} acertos</strong> de progressão e <strong>+{derived.ghoulControlBonus} de Controle</strong> em ataque, bloqueio e esquiva. O Controle já está somado nesses testes para Ghoul, Ghoul Artificial e Ghoul Dominante. Sanidade acima de 75%: d30; abaixo de 45%: d10; demais casos: d20.</p></section><section className="bonus-choices section-block compact"><SectionTitle kicker="Bônus de espécie" title="Escolhas gratuitas" />{sheet.species === "ghoul-artificial" && <label className="species-variant-toggle"><input type="checkbox" checked={sheet.artificialDominantBlend} onChange={(event) => patchSheet({ artificialDominantBlend: event.target.checked })} /><span><b>Humano-Dominante + Ghoul Artificial</b><small>Troca o bônus físico para +2. Mantém +1 Mental, Vida e passivas de Ghoul Artificial, sem receber as fraquezas do Humano Dominante.</small></span></label>}<div className="field-grid three">{["humano", "humano-dominante", "ghoul-artificial", "quinx"].includes(sheet.species) && <Field label="+1 Mental"><select value={sheet.mentalBonus} onChange={(event) => patchSheet({ mentalBonus: event.target.value as AttributeKey })}>{mentalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}{["humano-dominante", "ghoul-dominante", "ghoul-artificial"].includes(sheet.species) && <Field label={sheet.species === "humano-dominante" || (sheet.species === "ghoul-artificial" && sheet.artificialDominantBlend) ? "+2 Físico" : "+1 Físico A"}><select value={sheet.physicalBonus} onChange={(event) => { const physicalBonus = event.target.value as AttributeKey; patchSheet({ physicalBonus, ...(sheet.species === "ghoul-dominante" && physicalBonus === sheet.secondPhysicalBonus ? { secondPhysicalBonus: physicalAttributes.find((key) => key !== physicalBonus) || "agilidade" } : {}) }); }}>{physicalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}{sheet.species === "ghoul-dominante" && <Field label="+1 Físico B"><select value={sheet.secondPhysicalBonus} onChange={(event) => patchSheet({ secondPhysicalBonus: event.target.value as AttributeKey })}>{physicalAttributes.filter((key) => key !== sheet.physicalBonus).map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field>}</div><div className="custom-attribute-bonuses"><span>Bônus adicionais da mesa</span><div>{attributeKeys.map((key) => <Field key={key} label={attributeLabels[key]}><input type="number" value={sheet.customBonuses.attributes[key]} onChange={(event) => setCustomAttributeBonus(key, Number(event.target.value) || 0)} /></Field>)}</div></div></section>
            <section><div className="attribute-section-head"><div><span>Físicos</span><p>Limite comprado atual: {Number.isFinite(derived.purchasedCap) ? derived.purchasedCap : "sem limite narrativo"}</p></div><strong>{physicalAttributes.reduce((sum, key) => sum + attributePurchaseCost(sheet.baseAttributes[key]), 0)} PE</strong></div><div className="attribute-grid">{physicalAttributes.map((key) => <AttributeCard key={key} attributeKey={key} sheet={sheet} derived={derived} copied={copied} onCopy={copyTest} onSet={setAttribute} onExtra={setExtraDice} />)}</div></section>
            <section><div className="attribute-section-head"><div><span>Mentais</span><p>Limite comprado atual: {Number.isFinite(derived.purchasedCap) ? derived.purchasedCap : "sem limite narrativo"}</p></div><strong>{mentalAttributes.reduce((sum, key) => sum + attributePurchaseCost(sheet.baseAttributes[key]), 0)} PE</strong></div><div className="attribute-grid">{mentalAttributes.map((key) => <AttributeCard key={key} attributeKey={key} sheet={sheet} derived={derived} copied={copied} onCopy={copyTest} onSet={setAttribute} onExtra={setExtraDice} />)}</div></section>
          </div>}

          {tab === "vantagens" && <div className="page-stack"><PageHeader number="03" title="Perks" description="Vantagens, desvantagens e compras do personagem." />
            <div className="rework-catalog-tools"><label><input type="checkbox" checked={catalogAvailable} onChange={event => setCatalogAvailable(event.target.checked)} />Disponíveis</label><label><input type="checkbox" checked={catalogOwned} onChange={event => setCatalogOwned(event.target.checked)} />Compradas</label></div><div className="catalog-toolbar"><div className="segmented"><button type="button" className={perkView === "vantagens" ? "active" : ""} onClick={() => setPerkView("vantagens")}>Perks <span>{Object.keys(sheet.perks).length + sheet.customPerks.length}</span></button><button type="button" className={perkView === "desvantagens" ? "active" : ""} onClick={() => setPerkView("desvantagens")}>Desvantagens <span>{Object.keys(sheet.drawbacks).length}</span></button></div><label className="search-field"><span>⌕</span><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Buscar por nome ou efeito" /></label></div>
            {perkView === "vantagens" ? <><div className="catalog-references"><details className="catalog-reference"><summary>Manobras de combate</summary><section className="section-block compact maneuver-section"><SectionTitle kicker="Expansão" title="Manobras avançadas" /><p className="section-help">Regras universais e gratuitas: não gastam PE e já estão disponíveis para todos.</p><div className="maneuver-grid">{combatManeuvers.map((item) => <article key={item.name}><span>Manobra</span><strong>{item.name}</strong><p>{item.description}</p></article>)}</div></section></details><details className="catalog-reference"><summary>Perks personalizadas ({sheet.customPerks.length})</summary><section className="section-block compact custom-perks"><SectionTitle kicker="Regras da mesa" title="Vantagens personalizadas" aside={<button type="button" className="text-button" onClick={addCustomPerk}>+ Criar vantagem</button>} /><p className="section-help">Crie vantagens próprias e defina o custo em PE. O valor entra automaticamente no total da ficha.</p>{sheet.customPerks.length ? <div className="custom-perk-list">{sheet.customPerks.map((item) => <div className="custom-perk-row" key={item.id}><label><span>Nome</span><input value={item.name} onChange={(event) => updateCustomPerk(item.id, { name: event.target.value })} placeholder="Nome da vantagem" /></label><label className="custom-perk-cost"><span>Custo</span><div><input type="number" min={0} value={item.cost} onChange={(event) => updateCustomPerk(item.id, { cost: Math.max(0, Number(event.target.value) || 0) })} /><b>PE</b></div></label><label className="custom-perk-description"><span>Descrição</span><textarea rows={2} value={item.description} onChange={(event) => updateCustomPerk(item.id, { description: event.target.value })} placeholder="Efeito, requisito e observações..." /></label><button type="button" className="custom-perk-remove" aria-label={`Remover ${item.name || "vantagem personalizada"}`} onClick={() => removeCustomPerk(item.id)}>×</button></div>)}</div> : <button type="button" className="empty-add" onClick={addCustomPerk}>Nenhuma vantagem personalizada <span>Criar a primeira</span></button>}</section></details></div><div className="catalog-selectors"><label className="field"><span>Categoria</span><select value={perkCategory} onChange={event => setPerkCategory(event.target.value)}>{["Todas", "Genérica", "Força", "Vigor", "Precisão", "Agilidade", "Raciocínio", "Percepção", "Presença", "Controle", "Híbrida", "Combate", "Kagune Quimera", "Ukaku", "Koukaku", "Rinkaku", "Bikaku", "Quimera", "Kakuja", "Quinque", "Quinx / Arata"].map(category => <option key={category}>{category}</option>)}</select></label><label className="field"><span>Level</span><select value={catalogTier} onChange={event => setCatalogTier(event.target.value)}><option value="all">Todos os levels</option><option value="20">Level 20</option></select></label><span className="catalog-count">{filteredPerks.length} perks</span></div>{catalogTier === "20" && <p className="catalog-level-note">As exclusivas de atributo exigem Level 20 e 15 no atributo correspondente.</p>}<div className="catalog-grid">{filteredPerks.slice(0,catalogLimit).map((item) => {
              const acquired = sheet.perks[item.id]; const eligible = perkRequirementMet(item, sheet, derived.permanentAttributes); const price = perkCostForSheet(item, acquired?.rank || 1, sheet);
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone={item.category.toLocaleLowerCase("pt-BR")}><div className="catalog-card-top"><span>{item.organGroup || item.category}{item.useType ? ` · ${item.useType}` : ""}</span><b>{price} PE{item.category === "Kagune Quimera" && sheet.species === "ghoul-dominante" ? ` (${rankCost(item.cost, acquired?.rank || 1, item.costMode)} base)` : ""}</b></div><h3>{item.name}</h3><p>{item.description}</p><button type="button" className="perk-details" onClick={() => setDetailPerk(item)}>Detalhes</button><div className="requirement">{item.requirement || (item.attribute && item.min ? `${attributeLabels[item.attribute]} ${item.min}+` : "Disponível")}{hasHumanPerkSurcharge(item, sheet.species) && <em>+2 PE: Corpo de Carne</em>}{item.category === "Kagune Quimera" && sheet.species === "ghoul-dominante" && <em>−3 PE de Kagune Superior</em>}{!eligible && <em>Requisito pendente</em>}</div>{acquired && item.targetAttribute && <label className="target-select"><span>Atributo</span><select value={acquired.target || "forca"} onChange={(event) => updateSheet((current) => ({ ...current, perks: { ...current.perks, [item.id]: { ...acquired, target: event.target.value as AttributeKey } } }))}>{(item.targetAttribute === "physical" ? physicalAttributes : item.targetAttribute === "mental" ? mentalAttributes : attributeKeys).map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></label>}<div className="card-actions">{acquired && (item.maxRank || 1) > 1 && <RankControl rank={acquired.rank} max={item.maxRank || 1} onDown={() => updatePerkRank(item, -1)} onUp={() => updatePerkRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} disabled={!eligible && !acquired} onClick={() => togglePerk(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div>{filteredPerks.length > catalogLimit && <button type="button" className="load-more-perks" onClick={() => setCatalogLimit(value => value + 48)}>Mostrar mais perks · {Math.min(catalogLimit,filteredPerks.length)} de {filteredPerks.length}</button>}{!filteredPerks.length && <p className="empty-catalog">Nenhuma perk com estes filtros.</p>}</> : <><div className="catalog-summary"><span>{filteredDrawbacks.length} opções</span><strong className="positive">+{derived.drawbackCredit} PE recebidos</strong></div><div className="catalog-grid">{filteredDrawbacks.map((item) => {
              const acquired = sheet.drawbacks[item.id]; const eligible = !item.species || item.species.includes(sheet.species); const maxRank = drawbackMaximum(item); const credit = rankCost(item.credit, acquired?.rank || 1, "choice"); const selectedTargets = acquired ? drawbackTargets(acquired) : [];
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone="drawback"><div className="catalog-card-top"><span>Desvantagem</span><b>+{credit} PE</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{eligible ? "Disponível" : "Espécie incompatível"}{maxRank > 1 && <em>Máximo {maxRank} compras</em>}</div>{acquired && item.targetAttribute && <div className={item.uniqueTargets ? "target-stack" : undefined}>{(item.uniqueTargets ? selectedTargets : [acquired.target || "forca"]).map((target, index) => <label className="target-select" key={`${item.id}-${index}`}><span>{item.uniqueTargets ? `Atributo limitado ${index + 1}` : "Atributo limitado"}</span><select value={target} onChange={(event) => updateDrawbackTarget(item, index, event.target.value as AttributeKey)}>{attributeKeys.map((key) => <option key={key} value={key} disabled={item.uniqueTargets && key !== target && selectedTargets.includes(key)}>{attributeLabels[key]}</option>)}</select></label>)}</div>}<div className="card-actions">{acquired && maxRank > 1 && <RankControl rank={acquired.rank} max={maxRank} onDown={() => updateDrawbackRank(item, -1)} onUp={() => updateDrawbackRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} disabled={!eligible && !acquired} onClick={() => toggleDrawback(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div></>}
          </div>}

          {tab === "kakuhou" && <div className="page-stack"><PageHeader number="04" title="Kakuhou & armas" description="Kagune do personagem e Quinques com LEVEL, atributos, habilidades e orçamento independentes." />
            <div className="equipment-tabs"><div className="segmented" role="tablist" aria-label="Kagune e Quinques"><button type="button" role="tab" aria-selected={equipmentView === "kagune"} className={equipmentView === "kagune" ? "active" : ""} onClick={() => setEquipmentView("kagune")}>Kagune</button><button type="button" role="tab" aria-selected={equipmentView === "quinques"} className={equipmentView === "quinques" ? "active" : ""} onClick={() => setEquipmentView("quinques")}>Quinques ({sheet.quinques.length})</button></div><button type="button" className="add-quinque" onClick={() => {const item = normalizeQuinque({rulesVersion:8,name: `Quinque ${sheet.quinques.length + 1}`});patchSheet({quinques: [...sheet.quinques,item]});setSelectedQuinqueId(item.id);setEquipmentView("quinques");}}>+ Adicionar Quinque</button></div>
            {equipmentView === "quinques" && <QuinquesPanel key={sheet.id} items={sheet.quinques} selectedId={selectedQuinqueId} onSelect={setSelectedQuinqueId} onChange={quinques => patchSheet({quinques})} />}
            {equipmentView === "kagune" && <>
            <div className="kakuhou-subtabs segmented" role="tablist" aria-label="Conteúdo de Kakuhou e arma"><button type="button" role="tab" aria-selected={kakuhouView === "oficiais"} className={kakuhouView === "oficiais" ? "active" : ""} onClick={() => setKakuhouView("oficiais")}>Combate & catálogo</button><button type="button" role="tab" aria-selected={kakuhouView === "autorais"} className={kakuhouView === "autorais" ? "active" : ""} onClick={() => setKakuhouView("autorais")}>Habilidades autorais <span>{sheet.customSkills.length}</span></button></div>
            {kakuhouView === "oficiais" && <>
            <nav className="filter-row" aria-label="Seções de Kakuhou e arma">{[["kakuhou-estrutura", "Estrutura"], ["kakuhou-efeitos", "Efeitos"], ["kakuhou-quimera", "Vantagens Quimera"], ["kakuhou-evolucoes", "Evoluções na Kakuhou"], ["kakuhou-perks", "Perks - Kakuhou & Quinque"]].map(([id, label]) => <button type="button" key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</button>)}</nav>
            {sheet.weaponKind === "kagune" && <section className="section-block mastery-summary"><h2>Maestrias da Kakuhou</h2>{derived.ghoulCombatDice > 0 && <p>Bônus Ghoul de LEVEL: <strong>+{derived.ghoulCombatDice} acertos</strong> em acerto, bloqueio e esquiva, já somados aos testes. Quinques não recebem este bônus.</p>}<p>{sheet.kaguneActive ? "Bônus passivos aplicados à ficha enquanto a Kagune está manifestada." : "Manifeste a Kagune para aplicar os bônus passivos comprados."}</p><div className="weapon-metrics"><Stat label="Acerto em cada ataque" value={`+${derived.mastery.hit} acertos`} /><Stat label="Passos de Dano" value={`+${derived.mastery.steps}`} /><Stat label="Alcance adicional" value={`+${derived.mastery.range} m`} /><Stat label="Bloqueio / Esquiva" value={`+${derived.mastery.block} / +${derived.mastery.dodge}`} /></div>{derived.mastery.stability > 0 && <p>Guarda Estrutural: +2 acertos para resistir a empurrões e derrubadas. Some apenas nesses testes.</p>}{derived.mastery.efficientTailRC && <p>Circuito RC Eficiente: ataque de cauda adicional de 2 RC passa a {derived.tailAttackRC} RC. Não reduz técnicas anexadas ao golpe.</p>}{derived.mastery.movement > 0 && <p>Continuidade Predatória: +1 espaço já aplicado ao Deslocamento. Divida o Movimento disponível antes, entre e depois dos ataques.</p>}</section>}
            <section className="section-block"><KakujaImageSlot label="Kagune" value={sheet.kaguneImage} onChange={kaguneImage => patchSheet({kaguneImage})} /></section>
            {derived.rcSuppressed && <p className="vats-warning">RC suprimido. A reserva permanece salva; manifestação e gastos de RC ficam bloqueados. Trate o estado em Combate → Cura e suporte.</p>}
            <section id="kakuhou-estrutura" className="weapon-builder section-block"><div className="weapon-head"><div><Field label="Estrutura"><select value={sheet.weaponKind} onChange={(event) => patchSheet({ weaponKind: event.target.value as WeaponKind })}><option value="nenhum">Nenhuma</option><option value="kagune">Kagune / Kakuhou</option><option value="arata">Arata</option></select></Field><Field label="Nome"><input value={sheet.kaguneName} onChange={(event) => patchSheet({ kaguneName: event.target.value })} placeholder="Nome da arma ou Kagune" /></Field></div>{sheet.weaponKind !== "nenhum" && <label className="activation-toggle"><input type="checkbox" checked={sheet.kaguneActive} disabled={!sheet.kaguneActive && (derived.rcSuppressed || sheet.vats.kakuhouUntil > sheet.vats.turn || (sheet.weaponKind === "kagune" && (sheet.currentRC <= 0 || derived.wounds.exhausted)))} onChange={(event) => patchSheet({ kaguneActive: event.target.checked })} /><span><i />{sheet.kaguneActive ? "Ativa" : "Inativa"}</span></label>}</div>
              {sheet.weaponKind !== "nenhum" && <><div className="field-grid four"><Field label="Tipo principal"><select value={sheet.kaguneType} onChange={(event) => { const kaguneType = event.target.value as KaguneFamily; patchSheet({ kaguneType, kaguneSecondType: sheet.kaguneSecondType === kaguneType ? "" : sheet.kaguneSecondType, kaguneThirdType: sheet.kaguneThirdType === kaguneType ? "" : sheet.kaguneThirdType, kaguneFourthType: sheet.kaguneFourthType === kaguneType ? "" : sheet.kaguneFourthType }); }}>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].map((type) => <option key={type}>{type}</option>)}</select></Field>{sheet.weaponKind === "kagune" && <Field label="Quimera II"><select value={sheet.kaguneSecondType} onChange={(event) => { const kaguneSecondType = event.target.value as KaguneFamily | ""; patchSheet({ kaguneSecondType, kaguneThirdType: kaguneSecondType ? sheet.kaguneThirdType : "", kaguneFourthType: kaguneSecondType ? sheet.kaguneFourthType : "" }); }}><option value="">Nenhum</option>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((type) => type !== sheet.kaguneType).map((type) => <option key={type}>{type}</option>)}</select></Field>}{sheet.weaponKind === "kagune" && sheet.kaguneSecondType && <Field label="Quimera III"><select value={sheet.kaguneThirdType} onChange={(event) => { const kaguneThirdType = event.target.value as KaguneFamily | ""; patchSheet({ kaguneThirdType, kaguneFourthType: kaguneThirdType ? sheet.kaguneFourthType : "" }); }}><option value="">Nenhum</option>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((type) => type !== sheet.kaguneType && type !== sheet.kaguneSecondType).map((type) => <option key={type}>{type}</option>)}</select></Field>}{sheet.weaponKind === "kagune" && sheet.kaguneThirdType && <Field label="Quimera IV"><select value={sheet.kaguneFourthType} onChange={(event) => patchSheet({ kaguneFourthType: event.target.value as KaguneFamily | "" })}><option value="">Nenhum</option>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].filter((type) => type !== sheet.kaguneType && type !== sheet.kaguneSecondType && type !== sheet.kaguneThirdType).map((type) => <option key={type}>{type}</option>)}</select></Field>}{sheet.species === "quinx" && <Field label="Frame"><select value={sheet.quinxFrame} onChange={(event) => patchSheet({ quinxFrame: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((frame) => <option key={frame}>{frame}</option>)}</select></Field>}{(sheet.weaponKind === "quinque" || sheet.weaponKind === "arata") && <Field label="LEVEL do Ghoul fonte"><select value={sheet.sourceGhoulGrade} onChange={(event) => patchSheet({ sourceGhoulGrade: Number(event.target.value) })}>{Array.from({length:20},(_,i)=>i+1).map((grade) => <option key={grade}>{grade}</option>)}</select></Field>}</div>
                {sheet.vats.kakuhouUntil > sheet.vats.turn && <p className="vats-warning">Kakuhou destruído: Kagune indisponível até o turno {sheet.vats.kakuhouUntil}. Acompanhe na aba VATS.</p>}<div className="weapon-metrics">{sheet.weaponKind === "kagune" ? <><Stat label="Teste principal" value={derived.kaguneTest} mono onCopy={() => copyTest(derived.kaguneTest, "kagune")} copied={copied === "kagune"} /><Stat label="Atributo principal" value={attributeLabels[derived.primaryAttribute]} /><Stat label="Ataques extras" value={derived.extraAttacks} /><Stat label="RC máximo" value={derived.maxRC} /><Stat label="Verba gratuita" value={`${derived.freeKaguneBudget} PE`} /></> : <><Stat label="Verba de criação" value={`${8 + sheet.sourceGhoulGrade} PE`} /><Stat label="Investido" value={`${derived.actualEffectPE + derived.customSkillsPE} PE`} /><Stat label="Ativos" value={sheet.weaponKind === "quinque" ? "Sacrificam acertos" : "Conforme efeito"} /><Stat label="Efeitos" value={Object.keys(sheet.effects).length + sheet.customSkills.length} /></>}</div>
                {sheet.weaponKind === "kagune" && sheet.species === "ghoul-dominante" && <div className="hit-rule"><strong>RC do Ghoul Dominante</strong><span>4 base + {derived.activeAttributes.vigor} Vigor + {derived.actualEffectPE} PE de efeitos + {derived.effectLevelCount} níveis + {derived.evolutionPE} PE de evoluções + {derived.evolutionLevelCount} evoluções + {derived.kagunePerksPE} PE de Vantagens Quimera + {derived.kagunePerkLevelCount} compras + {derived.quimeraCost} da configuração + {derived.customSkillRC} das habilidades autorais{sheet.customBonuses.rc ? ` + ${sheet.customBonuses.rc} ajuste` : ""} = <b>{derived.maxRC} RC</b>.</span></div>}
                {sheet.weaponKind === "kagune" && sheet.species !== "ghoul-dominante" && <div className="hit-rule"><strong>Cálculo de RC</strong><span>4 base + {derived.activeAttributes.vigor} Vigor + {derived.nominalEffectPE} em efeitos + {derived.nominalEvolutionPE} em evoluções + {derived.kagunePerksPE} em Vantagens Quimera + {derived.quimeraCost} da configuração + {derived.customSkillRC} das habilidades autorais{sheet.customBonuses.rc ? ` + ${sheet.customBonuses.rc} ajuste` : ""} = <b>{derived.maxRC} RC</b>.</span></div>}
                {sheet.weaponKind === "kagune" && <div className="hit-rule"><strong>Dureza e regeneração</strong><span>Dureza: ({derived.activeAttributes.vigor} Vigor + {derived.kaguneInvestmentPE} PE investidos) × {derived.durabilityMultiplier}{derived.multipleTailsRank > 0 && !derived.mastery.noTailPenalty ? ` − ${derived.multipleTailsRank} de Múltiplas Caudas` : ""}{derived.mastery.tailDurability ? ` + ${derived.mastery.tailDurability} de Trama de Sustentação por cauda` : ""}{derived.customSkillBonuses.kaguneDurability ? ` + ${derived.customSkillBonuses.kaguneDurability} autoral` : ""} = <b>{derived.kaguneDurability}</b>. Regeneração comum: {derived.normalRegeneration || 0}{derived.normalRegeneration ? ` (base + LEVEL ${sheet.grade})` : ""}; Superior passiva: {derived.superiorRegeneration || 0}{derived.customSkillBonuses.regeneration ? `; autoral: ${derived.customSkillBonuses.regeneration >= 0 ? "+" : ""}${derived.customSkillBonuses.regeneration}` : ""}. Resultado: <b>{derived.regeneration}</b> por turno. O N4 Superior mantém 1/2 da Vida + LEVEL por turno; a cura total é uma ação de 6 RC.</span></div>}
                {derived.increaseHitRank > 0 && <div className="hit-rule"><strong>Aumentar Acerto N{derived.increaseHitRank}</strong><span>+{derived.increaseHitRank} acertos, já somados ao teste da Kagune.</span></div>}</>}
            </section>
            {sheet.weaponKind==='kagune' && <ColossoPanel result={derived.colosso} attackTest={derived.kaguneTest} totalRD={derived.rd} onToggle={colossoActive=>patchSheet({colossoActive})}/>}
            {sheet.weaponKind==='kagune' && <TailsPanel fused={derived.colosso.active} state={sheet.vats} capacity={derived.maximumTails} natural={derived.naturalTails} manifested={sheet.kaguneActive && !derived.rcSuppressed} attackCount={derived.activeTailCount} attackTest={derived.kaguneTest} tailDamage={derived.rinkakuTailDamage} totalDamage={derived.rinkakuAllTailsDamage} paidTailStart={1+derived.multipleTailsRank} tailAttackRC={derived.tailAttackRC} powers={sheet.selectedEvolutions} rc={derived.rcSuppressed ? 0 : sheet.currentRC} onAction={actVats}/>}
            <section className="section-block damage-calculator"><SectionTitle kicker="Cálculo automático" title="Passos de dano" /><p className="section-help">Atributos, vantagens, desvantagens e melhorias permanentes já entram no valor. Ative abaixo apenas o que estiver valendo neste golpe.</p><div className="damage-grid">
              <DamageCard title="Socos, chutes e golpes normais" kicker="Dano físico" formula={derived.physicalDamage} hitFormula={derived.physicalHitTest} attribute={`${attributeLabels[derived.physicalAttribute]} ${derived.physicalValue}`} steps={derived.physicalSteps} modifier={derived.physicalDamageModifier} scope="physical" conditions={damageConditionsFor("physical")} active={sheet.damageContext.active} onToggle={toggleDamageCondition} onHitCopy={() => copyTest(derived.physicalHitTest, "physical-hit")} onCopy={() => copyTest(derived.physicalDamage, "physical-damage")} hitCopied={copied === "physical-hit"} copied={copied === "physical-damage"} controls={<><Field label="Atributo de escala"><select value={sheet.damageContext.physicalAttribute} onChange={(event) => patchDamage({ physicalAttribute: event.target.value as "forca" | "vigor" })}><option value="forca">Força</option><option value="vigor">Vigor</option></select></Field><Field label="Passos manuais"><input type="number" value={sheet.damageContext.physicalExtraSteps} onChange={(event) => patchDamage({ physicalExtraSteps: Number(event.target.value) || 0 })} /></Field><Field label="Mod. manual"><input type="number" value={sheet.damageContext.physicalExtraModifier} onChange={(event) => patchDamage({ physicalExtraModifier: Number(event.target.value) || 0 })} /></Field></>} counters={(sheet.perks["golpe-preciso"] || sheet.perks["equacao-letal"] || sheet.perks["foco-letal"]) && <div className="damage-counters">{sheet.perks["golpe-preciso"] && <Field label="Acertos: Golpe Preciso"><input type="number" min={0} value={sheet.damageContext.preciseHitDice} onChange={(event) => patchDamage({ preciseHitDice: Math.max(0, Number(event.target.value) || 0) })} /></Field>}{sheet.perks["equacao-letal"] && <Field label="Acertos: Equação Letal"><input type="number" min={0} max={2} value={sheet.damageContext.equationLethalDice} onChange={(event) => patchDamage({ equationLethalDice: Math.max(0, Math.min(2, Number(event.target.value) || 0)) })} /></Field>}{sheet.perks["foco-letal"] && <Field label="Passos convertidos: Foco Letal"><input type="number" min={0} max={3} value={sheet.damageContext.focusLethalSteps} onChange={(event) => patchDamage({ focusLethalSteps: Math.max(0, Math.min(3, Number(event.target.value) || 0)) })} /></Field>}</div>} />
              <DamageCard title={sheet.weaponKind === "kagune" ? (sheet.kaguneName || "Kagune") : "Kagune / arma RC"} kicker="Dano da Kagune" formula={derived.kaguneDamage} hitFormula={derived.kaguneTest} attribute={`${attributeLabels[derived.primaryAttribute]} ${derived.activeAttributes[derived.primaryAttribute]}`} steps={derived.kaguneSteps} modifier={derived.kaguneDamageModifier} scope="kagune" conditions={damageConditionsFor("kagune")} active={sheet.damageContext.active} onToggle={toggleDamageCondition} onHitCopy={() => copyTest(derived.kaguneTest, "kagune-hit")} onCopy={() => copyTest(derived.kaguneDamage, "kagune-damage")} hitCopied={copied === "kagune-hit"} copied={copied === "kagune-damage"} controls={<><Field label="Kagune do alvo"><select value={sheet.damageContext.targetKaguneType} onChange={(event) => patchDamage({ targetKaguneType: event.target.value as KaguneFamily | "" })}><option value="">Não informada</option>{["Ukaku", "Koukaku", "Rinkaku", "Bikaku"].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Passos manuais"><input type="number" value={sheet.damageContext.kaguneExtraSteps} onChange={(event) => patchDamage({ kaguneExtraSteps: Number(event.target.value) || 0 })} /></Field><Field label="Mod. manual"><input type="number" value={sheet.damageContext.kaguneExtraModifier} onChange={(event) => patchDamage({ kaguneExtraModifier: Number(event.target.value) || 0 })} /></Field><Field label="RD manual da Kagune"><input type="number" value={sheet.damageContext.kaguneExtraRD} onChange={(event) => patchDamage({ kaguneExtraRD: Number(event.target.value) || 0 })} /></Field></>} counters={<div className="damage-counters">{sheet.perks["golpe-preciso"] && <Field label="Acertos: Golpe Preciso"><input type="number" min={0} value={sheet.damageContext.preciseHitDice} onChange={(event) => patchDamage({ preciseHitDice: Math.max(0, Number(event.target.value) || 0) })} /></Field>}{sheet.perks["equacao-letal"] && <Field label="Acertos: Equação Letal"><input type="number" min={0} max={2} value={sheet.damageContext.equationLethalDice} onChange={(event) => patchDamage({ equationLethalDice: Math.max(0, Math.min(2, Number(event.target.value) || 0)) })} /></Field>}{sheet.perks["foco-letal"] && <Field label="Passos convertidos: Foco Letal"><input type="number" min={0} max={3} value={sheet.damageContext.focusLethalSteps} onChange={(event) => patchDamage({ focusLethalSteps: Math.max(0, Math.min(3, Number(event.target.value) || 0)) })} /></Field>}{sheet.selectedEvolutions.includes("mil-penas") && <Field label="Ataques sacrificados"><input type="number" min={0} value={sheet.damageContext.milPenasSacrifices} onChange={(event) => patchDamage({ milPenasSacrifices: Math.max(0, Number(event.target.value) || 0) })} /></Field>}{sheet.selectedEvolutions.includes("continua-crescendo") && <Field label="Pontos de Crescimento"><input type="number" min={0} max={derived.maximumTails} value={Math.min(derived.maximumTails, sheet.damageContext.growthPoints)} onChange={(event) => patchDamage({ growthPoints: Math.min(derived.maximumTails, Math.max(0, Math.floor(Number(event.target.value) || 0))) })} /></Field>}{sheet.selectedEvolutions.includes("predador-ceus") && <Field label="Acúmulo Predador dos Céus"><input type="number" min={0} max={4} value={sheet.damageContext.predadorCeusStacks} onChange={(event) => patchDamage({ predadorCeusStacks: Math.max(0, Math.min(4, Number(event.target.value) || 0)) })} /></Field>}</div>} />
            </div>{derived.rinkakuTailCount > 0 && <div className="combat-breakdown"><div><span>Rinkaku · {derived.rinkakuTailCount} tentáculos</span><strong>Dano por tentáculo</strong><button type="button" onClick={() => copyTest(derived.rinkakuTailDamage, "tail-damage")}><code>{derived.rinkakuTailDamage}</code><i>{copied === "tail-damage" ? "Copiado" : "⧉"}</i></button><small>Múltiplas Caudas aplica −2 Passos por tentáculo; sem essa melhoria, a cauda única usa o dano padrão.</small></div><div><span>Todos acertando o mesmo alvo</span><strong>Dano total · {derived.activeTailCount} tentáculos selecionados</strong><button type="button" onClick={() => copyTest(derived.rinkakuAllTailsDamage, "all-tails-damage")}><code>{derived.rinkakuAllTailsDamage}</code><i>{copied === "all-tails-damage" ? "Copiado" : "⧉"}</i></button><small>1 inicial + {derived.multipleTailsRank} de Múltiplas Caudas{derived.activeMultipleTailsPlusRank > 0 ? ` + ${derived.activeMultipleTailsPlusRank} permanentes da evolução` : ""}. Cada grupo de dados e o modificador são multiplicados por {derived.activeTailCount}.</small></div></div>}{derived.formaVersatilRank > 0 && kaguneFamiliesForSheet(sheet).has("Koukaku") && <div className="versatile-form-panel"><div><span>Forma Versátil N{derived.formaVersatilRank}</span><strong>Configuração da Koukaku</strong><select value={sheet.damageContext.koukakuMode} onChange={(event) => patchDamage({ koukakuMode: event.target.value as DamageContext["koukakuMode"] })}><option value="normal">Forma normal</option><option value="attack">Lâmina que Tudo Corta</option><option value="defense">Escudo Inquebrável</option></select><small className="versatile-rule">{sheet.damageContext.koukakuMode === "defense" ? `Metade de ${derived.versatileDamageBonusSteps} Passos bônus = ${derived.versatileConvertedDamageSteps} convertidos em RD; +${derived.formaVersatilRank} RD natural do efeito.` : sheet.damageContext.koukakuMode === "attack" ? `Metade de ${derived.versatileConvertibleRD} RD da Kagune = ${derived.versatileConvertedRD} RD convertidos; cada 2 concedem 1 Passo, além de +${derived.formaVersatilRank} Passos naturais.` : "Selecione uma forma para aplicar a conversão automaticamente. A troca custa 4 RC."}</small></div><div className="versatile-metrics"><span><small>Passos antes</small><b>{derived.stepsBeforeVersatileForm}</b></span><span><small>Alteração</small><b>{derived.versatileStepChange >= 0 ? `+${derived.versatileStepChange}` : derived.versatileStepChange}</b></span><span><small>Passos finais</small><b>{derived.kaguneSteps}</b></span><span><small>RD antes</small><b>{derived.rdBeforeVersatileForm}</b></span><span><small>Alteração</small><b>{derived.versatileRDChange >= 0 ? `+${derived.versatileRDChange}` : derived.versatileRDChange}</b></span><span><small>RD final</small><b>{derived.rd}</b></span></div></div>}<div className="damage-legend"><span><b>Automático:</b> +1 Passo e +1 Modificador a cada 2 pontos do atributo.</span><span><b>Furioso:</b> +{sheet.perks.furioso?.rank || 0} Passos em todos os danos do personagem.</span><span><b>Separado:</b> melhorias de Kagune nunca alteram socos ou chutes.</span>{sheet.hunger >= 10 && <span className="warning"><b>Fome 10:</b> +{sheet.grade} no dano já aplicado aos dois ataques.</span>}</div></section>
            {sheet.weaponKind === "nenhum" && <section id="kakuhou-efeitos" className="section-block"><h2>Catálogo de efeitos</h2><p>Selecione uma estrutura acima para acessar os efeitos de criação.</p></section>}
            {sheet.weaponKind !== "kagune" && <><section id="kakuhou-quimera" className="section-block"><h2>Vantagens de Kagune Quimera</h2><p>Disponíveis com a estrutura Kagune / Kakuhou.</p></section><section id="kakuhou-evolucoes" className="section-block"><h2>Evoluções na Kakuhou</h2><p>Selecione a estrutura Kagune / Kakuhou para acessar as evoluções do seu tipo.</p></section></>}
            {sheet.weaponKind !== "nenhum" && <><section id="kakuhou-efeitos"><div className="catalog-toolbar"><div><span className="section-kicker">Efeitos de criação</span><h2 className="toolbar-title">Catálogo de efeitos</h2></div><label className="search-field"><span>⌕</span><input value={effectSearch} onChange={(event) => setEffectSearch(event.target.value)} placeholder="Buscar efeito" /></label></div><div className="filter-row">{["Compatíveis", "Todos", "Geral", "Ukaku", "Koukaku", "Rinkaku", "Bikaku"].map((family) => <button type="button" key={family} className={effectFamily === family ? "active" : ""} onClick={() => setEffectFamily(family)}>{family}</button>)}</div><div className="catalog-summary"><span>{filteredEffects.length} efeitos</span><strong>{derived.actualEffectPE} PE em efeitos</strong></div><div className="catalog-grid effects">{filteredEffects.map((item) => {
              const acquired = sheet.effects[item.id]; const compatible = compatibleFamilies.has(item.family); const biologicalBlocked = sheet.weaponKind === "quinque" && item.id !== "forma-versatil" && item.type.includes("Biológico"); const requirementStatus = effectRequirementStatus(item, sheet); const eligible = compatible && !biologicalBlocked && requirementStatus.met; const shownRank = acquired?.rank || 1; const costs = effectCostForSheet(item, shownRank, sheet); const discounted = costs.paidTotal !== costs.baseTotal; const maxRank = effectMaximum(item, sheet); const fullCosts = effectCostForSheet(item, maxRank, sheet);
              return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone={familyColor(item.family)}><div className="catalog-card-top"><span>{item.family} · {item.type}</span><b>{costs.paidTotal} PE{discounted ? ` (${costs.baseTotal} base)` : ""}</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.requirement || (biologicalBlocked ? "Biológico: incompatível com Quinque" : compatible ? "Compatível" : "Fora do tipo")}{maxRank > 1 && <em>Máximo atual: {maxRank} compras</em>}{item.levelCostStart != null && <em>Custos por compra: {fullCosts.paidIncrements.map((cost) => `${cost} PE`).join(" · ")}</em>}{sheet.species === "ghoul-dominante" && item.levelCostStart == null && <em>Por nível: {costs.paidIncrements.map((cost) => `${cost} PE`).join(" + ")}</em>}{requirementStatus.missing.map((missing) => <em key={missing}>Falta: {missing}</em>)}</div>{acquired && item.targetAttribute && <label className="target-select"><span>Atributo</span><select value={acquired.target || "forca"} onChange={(event) => updateSheet((current) => ({ ...current, effects: { ...current.effects, [item.id]: { ...acquired, target: event.target.value as AttributeKey } } }))}>{physicalAttributes.map((key) => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></label>}<div className="card-actions">{acquired && maxRank > 1 && <RankControl rank={acquired.rank} max={maxRank} onDown={() => updateEffectRank(item, -1)} onUp={() => updateEffectRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} disabled={!acquired && !eligible} onClick={() => toggleEffect(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
            })}</div></section>

              {sheet.weaponKind === "kagune" && <section id="kakuhou-quimera"><div className="attribute-section-head"><div><span>Vantagens de Kagune Quimera</span><p>Integram a Kakuhou e entram automaticamente em PE, RC, Dureza e requisitos.</p></div><strong>{derived.kagunePerksPE} PE</strong></div><div className="catalog-summary"><span>{filteredQuimeraPerks.length} opções quiméricas</span><strong>{Object.keys(sheet.perks).filter((id) => perks.find((candidate) => candidate.id === id)?.category === "Kagune Quimera").length} adquiridas</strong></div><div className="catalog-grid effects">{filteredQuimeraPerks.map((item) => {
                const acquired = sheet.perks[item.id]; const eligible = perkRequirementMet(item, sheet, derived.permanentAttributes); const price = perkCostForSheet(item, acquired?.rank || 1, sheet);
                return <CatalogCard key={item.id} selected={Boolean(acquired)} unavailable={!eligible} tone={item.category.toLocaleLowerCase("pt-BR")}><div className="catalog-card-top"><span>Kakuhou · Quimera</span><b>{price} PE{sheet.species === "ghoul-dominante" ? ` (${rankCost(item.cost, acquired?.rank || 1, item.costMode)} base)` : ""}</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.requirement || "Disponível"}{sheet.species === "ghoul-dominante" && <em>−3 PE de Kagune Superior</em>}{!eligible && <em>Requisito pendente</em>}</div><div className="card-actions">{acquired && (item.maxRank || 1) > 1 && <RankControl rank={acquired.rank} max={item.maxRank || 1} onDown={() => updatePerkRank(item, -1)} onUp={() => updatePerkRank(item, 1)} />}<button type="button" className={acquired ? "remove" : "add"} disabled={!eligible && !acquired} onClick={() => togglePerk(item)}>{acquired ? "Remover" : "Adicionar"}</button></div></CatalogCard>;
              })}</div></section>}
              {sheet.weaponKind === "kagune" && kaguneFamiliesForSheet(sheet).has("Bikaku") && sheet.selectedEvolutions.includes("conveniencia-instintiva") && <section className="section-block">
                <h2>Conveniência Instintiva · {sheet.instinctiveChoices.length}/3 escolhas</h2>
                <p>Selecione três evoluções de outros tipos. Selecionar não concede a habilidade nem cobra PE: compre cada uma no catálogo abaixo, pagando seu custo e cumprindo os demais requisitos. Para trocar uma escolha comprada, remova primeiro sua compra.</p>
                <div className="instinctive-table"><table><thead><tr><th>Selecionar</th><th>Evolução</th><th>Tipo</th><th>Custo inicial</th><th>Descrição e requisitos</th></tr></thead><tbody>{evolutions.filter(item => ["Ukaku", "Koukaku", "Rinkaku"].includes(item.family) && (!kaguneFamiliesForSheet(sheet).has(item.family as KaguneFamily) || sheet.instinctiveChoices.includes(item.id))).map(item => {
                  const chosen = sheet.instinctiveChoices.includes(item.id); const owned = sheet.selectedEvolutions.includes(item.id);
                  return <tr key={item.id}><td><input type="checkbox" aria-label={`Liberar compra de ${item.name}`} checked={chosen} disabled={owned || (!chosen && sheet.instinctiveChoices.length >= 3)} onChange={() => patchSheet({instinctiveChoices: chosen ? sheet.instinctiveChoices.filter(id => id !== item.id) : [...sheet.instinctiveChoices, item.id]})} /></td><th scope="row">{item.name}<small>{owned ? "Comprada" : chosen ? "Compra liberada" : "Não selecionada"}</small></th><td>{item.family}</td><td>{evolutionCostsForSheet(item, 1, sheet.species).paidTotal} PE</td><td>{item.description}<small>LEVEL {item.grade}+{item.requirement ? ` · ${item.requirement}` : ""}</small></td></tr>;
                })}</tbody></table></div>
              </section>}
              {sheet.weaponKind === "kagune" && sheet.selectedEvolutions.includes("taiji") && <section className="section-block"><h2>Taiji · {5 - sheet.taijiUses}/5 usos restantes</h2><p>Escolha o teste e o atributo físico que será usado no lugar dele.</p><div className="field-grid four"><Field label="Teste original"><select value={taijiFrom} onChange={event => setTaijiFrom(event.target.value as AttributeKey)}>{physicalAttributes.map(key => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field><Field label="Usar atributo"><select value={taijiTo} onChange={event => setTaijiTo(event.target.value as AttributeKey)}>{physicalAttributes.map(key => <option key={key} value={key}>{attributeLabels[key]}</option>)}</select></Field></div><p>{attributeLabels[taijiFrom]} com {attributeLabels[taijiTo]}: <strong>{derived.attributeTests[taijiTo]}</strong></p><div className="card-actions"><button type="button" disabled={sheet.taijiUses >= 5 || taijiFrom === taijiTo} onClick={() => { patchSheet({taijiUses: Math.min(5, sheet.taijiUses + 1)}); copyTest(derived.attributeTests[taijiTo], "taiji"); }}>{copied === "taiji" ? "Copiado!" : "Usar Taiji e copiar teste"}</button><button type="button" onClick={() => patchSheet({taijiUses: 0})}>Nova sessão · restaurar 5 usos</button></div></section>}
              {sheet.weaponKind === "kagune" && <section id="kakuhou-evolucoes"><div className="attribute-section-head"><div><span>Evoluções na Kakuhou</span><p>Evoluções por tipo, maestrias passivas e opções quiméricas. Custos de níveis são adicionais; o bônus do maior nível substitui o anterior.</p></div><strong>{derived.evolutionPE} PE</strong></div><div className="catalog-grid evolutions">{filteredEvolutions.map((item) => { const rank = evolutionRank(sheet.selectedEvolutions, item.id); const selected = rank > 0; const requirementStatus = evolutionRequirementStatus(item, sheet, derived.permanentAttributes, derived.maxSanity); const eligible = requirementStatus.met; const shownRank = Math.max(1, rank); const costs = evolutionCostsForSheet(item, shownRank, sheet.species); const maxCosts = evolutionCostsForSheet(item, item.maxRank || 1, sheet.species); const maxRank = item.maxRank || 1; return <CatalogCard key={item.id} selected={selected} unavailable={!eligible} tone={familyColor(item.family)}><div className="catalog-card-top"><span>{item.family} · LEVEL {item.grade}+</span><b>{costs.paidTotal} PE{costs.paidTotal !== costs.baseTotal ? ` (${costs.baseTotal} base)` : ""}</b></div><h3>{item.name}</h3><p>{item.description}</p><div className="requirement">{item.requirement || (eligible ? "Disponível" : `Requer LEVEL ${item.grade}`)}{maxRank > 1 && <em>Custos: {maxCosts.paidIncrements.map((cost, index) => `N${index + 1} ${cost} PE${item.rankGrades ? ` · LEVEL ${item.rankGrades[index]}` : ""}`).join(" · ")}</em>}{sheet.species === "ghoul-dominante" && <em>−3 PE de Kagune Superior por compra</em>}{requirementStatus.missing.map((missing) => <em key={missing}>Falta: {missing}</em>)}</div>{item.narrativeRequirement && !selected && <label className="requirement-confirm"><input type="checkbox" checked={Boolean(sheet.confirmedRequirements[`evolution:${item.id}`])} onChange={(event) => patchSheet({ confirmedRequirements: { ...sheet.confirmedRequirements, [`evolution:${item.id}`]: event.target.checked } })} /><span>Requisito “{item.narrativeRequirement}” confirmado pelo Narrador</span></label>}<div className={`card-actions ${maxRank === 1 ? "solo" : ""}`}>{selected && maxRank > 1 && <RankControl rank={rank} max={maxRank} availableMax={item.rankGrades ? item.rankGrades.filter(grade => sheet.grade >= grade).length : maxRank} onDown={() => updateEvolutionRank(item, -1)} onUp={() => updateEvolutionRank(item, 1)} />}<button type="button" className={selected ? "remove" : "add"} disabled={!eligible && !selected} onClick={() => toggleEvolution(item)}>{selected ? "Remover" : "Adicionar"}</button></div></CatalogCard>; })}</div></section>}
            </>}
            <div id="kakuhou-perks">
              <SupplementOrganPerks items={perks.filter(p => p.location === "kakuhou" && p.requiredWeapon !== "quinque")} owned={id => Boolean(sheet.perks[id])} eligible={p => perkRequirementMet(p, sheet, derived.permanentAttributes)} onToggle={togglePerk}/>
            </div>
            </>}
            {kakuhouView === "autorais" && <CustomSkillsPanel skills={sheet.customSkills} onChange={(customSkills) => patchSheet({ customSkills })} />}
            </>}
          </div>}

          {tab === "kakuja" && sheet.grade >= 6 && <div className="page-stack"><PageHeader number="05" title="KAKUJA" description="Construção modular independente, com repertório, Perfis, CM e dano próprios." />
            <KakujaPanel key={sheet.id}
              grade={sheet.grade}
              species={sheet.species}
              vigor={derived.permanentAttributes.vigor}
              attributes={derived.activeAttributes}
              maxLife={derived.maxLife}
              baseRange={derived.distance}
              baseMovement={derived.movement}
              passiveRegeneration={derived.regeneration}
              basePenetration={derived.scaling.penetrationPercent}
              kaguneTest={derived.kaguneTest}
              kaguneSteps={derived.kaguneSteps}
              kaguneDurability={derived.kaguneDurability}
              kaguneFamilies={[...kaguneFamiliesForSheet(sheet)]}
              state={derived.rcSuppressed ? {...sheet.kakuja,active:false} : sheet.kakuja}
              suppressed={derived.rcSuppressed || sheet.vats.kakuhouUntil > sheet.vats.turn}
              onChange={(kakuja) => patchSheet({ kakuja: derived.rcSuppressed ? {...kakuja,active:false} : kakuja })}
            />
          </div>}

          {tab === "historia" && <div className="page-stack"><PageHeader number={sheet.grade >= 6 ? "06" : "05"} title="História & notas" description="História, vínculos, inventário e anotações." />
            <div className="story-grid"><section className="section-block compact"><SectionTitle kicker="Personagem" title="História" /><Field label="História"><textarea rows={12} value={sheet.history} onChange={(event) => patchSheet({ history: event.target.value })} placeholder="Origem, eventos marcantes, relações e objetivos..." /></Field><Field label="Personalidade"><textarea rows={6} value={sheet.personality} onChange={(event) => patchSheet({ personality: event.target.value })} placeholder="Hábitos, contradições, medos e desejos..." /></Field><Field label="Aparência"><textarea rows={5} value={sheet.appearance} onChange={(event) => patchSheet({ appearance: event.target.value })} placeholder="Traços, roupas, marcas e postura..." /></Field></section>
              <div className="page-stack tight"><section className="section-block compact"><SectionTitle kicker="Psiquê" title="Alicerces" /><p className="section-help">Escolha de um a três. Registre a pessoa e a característica central do vínculo.</p><div className="anchor-list">{sheet.anchors.map((anchor, index) => <div key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={anchor.name} onChange={(event) => patchSheet({ anchors: sheet.anchors.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} placeholder="Nome" /><input value={anchor.bond} onChange={(event) => patchSheet({ anchors: sheet.anchors.map((item, itemIndex) => itemIndex === index ? { ...item, bond: event.target.value } : item) })} placeholder="Característica central" /></div>)}</div></section><section className="section-block compact"><SectionTitle kicker="Estado" title="Condições" /><textarea rows={5} value={sheet.conditions} onChange={(event) => patchSheet({ conditions: event.target.value })} placeholder="Máculas, ferimentos, efeitos ativos..." /></section><section className="section-block compact"><SectionTitle kicker="Kakuhou / arma" title="Descrição visual" /><textarea rows={6} value={sheet.kaguneDescription} onChange={(event) => patchSheet({ kaguneDescription: event.target.value })} placeholder="Forma, cor, origem, mudanças e manifestações..." /></section></div>
            </div>
            <section className="section-block compact"><SectionTitle kicker="Carga" title="Inventário" aside={<button type="button" className="text-button" onClick={addInventoryItem}>+ Adicionar item</button>} />{sheet.inventory.length ? <div className="inventory-list"><div className="inventory-head"><span>Item</span><span>Qtd.</span><span>Observação</span><span /></div>{sheet.inventory.map((item) => <div className="inventory-row" key={item.id}><input value={item.name} onChange={(event) => updateInventoryItem(item.id, { name: event.target.value })} /><input type="number" min={0} value={item.quantity} onChange={(event) => updateInventoryItem(item.id, { quantity: Number(event.target.value) || 0 })} /><input value={item.notes} onChange={(event) => updateInventoryItem(item.id, { notes: event.target.value })} placeholder="Detalhes" /><button type="button" aria-label={`Remover ${item.name}`} onClick={() => patchSheet({ inventory: sheet.inventory.filter((candidate) => candidate.id !== item.id) })}>×</button></div>)}</div> : <button className="empty-add" type="button" onClick={addInventoryItem}>Nenhum item registrado <span>Adicionar o primeiro</span></button>}</section>
            <section className="section-block compact"><SectionTitle kicker="Livre" title="Notas da sessão" /><textarea className="notes-area" rows={10} value={sheet.notes} onChange={(event) => patchSheet({ notes: event.target.value })} placeholder="Pistas, nomes, promessas, dívidas, objetivos..." /></section>
          </div>}
        </section>
      </div>
      <nav className="mobile-nav" aria-label="Seções da ficha">{navItems.map(([id, number, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{number}</span>{id === "kakuja" ? "Kakuja" : id === "kakuhou" ? "Kakuhou" : label.split(" ")[0]}</button>)}</nav>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function SectionTitle({ kicker, title, aside }: { kicker: string; title: string; aside?: React.ReactNode }) { return <div className="section-title"><div><span>{kicker}</span><h2>{title}</h2></div>{aside}</div>; }
function PageHeader({ number, title, description }: { number: string; title: string; description: string }) { return <header className="page-header"><span>{number}</span><div><h1>{title}</h1><p>{description}</p></div></header>; }
function ResourceCard({ label, current, max, tone, onChange }: { label: string; current: number; max: number; tone: string; onChange: (value: number) => void }) { const percent = max ? Math.max(0, Math.min(100, (current / max) * 100)) : 0; return <div className={`resource-card ${tone}`}><div><span>{label}</span><label><input type="number" min={0} step={1} value={Math.floor(current)} onChange={(event) => onChange(Math.max(0, Math.floor(Number(event.target.value) || 0)))} aria-label={`${label} atual`} /><i>/</i><b>{max}</b></label></div><div className="resource-meter"><i style={{ width: `${percent}%` }} /></div></div>; }
function Stat({ label, value, mono, onCopy, copied }: { label: string; value: React.ReactNode; mono?: boolean; onCopy?: () => void; copied?: boolean }) { return <button type="button" className={`stat ${onCopy ? "copyable" : ""}`} onClick={onCopy} disabled={!onCopy}><span>{copied ? "Copiado" : label}</span><strong className={mono ? "mono" : ""}>{value}</strong></button>; }
function DamageCard({ title, kicker, formula, hitFormula, attribute, steps, modifier, controls, counters, conditions, scope, active, onToggle, onCopy, onHitCopy, copied, hitCopied }: {
  title: string; kicker: string; formula: string; attribute: string; steps: number; modifier: number;
  controls: React.ReactNode; counters?: React.ReactNode; conditions: { id: string; label: string; detail: string }[];
  scope: "physical" | "kagune"; active: Record<string, boolean>; onToggle: (scope: "physical" | "kagune", id: string) => void;
  hitFormula: string; onCopy: () => void; onHitCopy: () => void; copied: boolean; hitCopied: boolean;
}) { return <article className="damage-card"><div className="damage-card-head"><div><span>{kicker}</span><h3>{title}</h3></div><div className="damage-metrics"><span>{attribute}</span><b>{steps} Passos</b><b>{modifier >= 0 ? `+${modifier}` : modifier} Mod.</b></div></div><div className="damage-formulas"><button type="button" className="hit-formula" onClick={onHitCopy}><span>{hitCopied ? "Copiado" : "Teste de acerto"}</span><code>{hitFormula}</code><i>⧉</i></button><button type="button" className="damage-formula" onClick={onCopy}><span>{copied ? "Copiado" : "Dano final"}</span><code>{formula}</code><i>⧉</i></button></div><div className="damage-controls">{controls}</div>{counters}<div className="damage-condition-list">{conditions.length ? conditions.map((condition) => { const checked = Boolean(active[`${scope}:${condition.id}`]); return <label key={condition.id} className={checked ? "active" : ""}><input type="checkbox" checked={checked} onChange={() => onToggle(scope, condition.id)} /><span><b>{condition.label}</b><small>{condition.detail}</small></span></label>; }) : <p>Nenhuma condição comprada para este ataque.</p>}</div></article>; }
function Ledger({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) { return <div><span>{label}</span><b className={positive ? "positive" : negative ? "muted" : ""}>{positive && value ? "+" : negative && value ? "−" : ""}{value}</b></div>; }
function CatalogCard({ children, selected, unavailable, tone }: { children: React.ReactNode; selected: boolean; unavailable?: boolean; tone: string }) { return <article className={`catalog-card ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} data-tone={tone}>{children}</article>; }
function RankControl({ rank, max, availableMax = max, onDown, onUp }: { rank: number; max: number; availableMax?: number; onDown: () => void; onUp: () => void }) { return <div className="rank-control"><button type="button" onClick={onDown} disabled={rank <= 1}>−</button><span>N{rank}/{max}</span><button type="button" onClick={onUp} disabled={rank >= availableMax} title={availableMax < max ? "Próximo nível exige LEVEL maior" : "Comprar próximo nível"}>+</button></div>; }

function AttributeCard({ attributeKey, sheet, derived, copied, onCopy, onSet, onExtra }: {
  attributeKey: AttributeKey; sheet: CharacterSheet;
  derived: { speciesBonuses: Record<AttributeKey, number>; permanentAttributes: Record<AttributeKey, number>; activeAttributes: Record<AttributeKey, number>; permanentDice: Record<AttributeKey, number>; attributeTests: Record<AttributeKey, string>; primaryAttribute: AttributeKey; kaguneTest: string; looseHitAdjustments: number; purchasedCap: number; customSkillBonuses: CustomSkillBonuses };
  copied: string; onCopy: (formula: string, key: string) => void; onSet: (key: AttributeKey, value: number) => void; onExtra: (key: AttributeKey, value: number) => void;
}) {
  const base = sheet.baseAttributes[attributeKey]; const total = derived.activeAttributes[attributeKey]; const speciesBonus = derived.speciesBonuses[attributeKey]; const customBonus = sheet.customBonuses.attributes[attributeKey]; const skillAttributeBonus = derived.customSkillBonuses.attributeBonus[attributeKey]; const skillDice = derived.customSkillBonuses.attributeDice[attributeKey];
  const acurado = sheet.perks[`acurado-${attributeKey}`] ? 1 : 0; const bodyUpgrade = sheet.kaguneActive && sheet.effects["aprimoramentos-corporais"]?.target === attributeKey ? sheet.effects["aprimoramentos-corporais"].rank : 0;
  const rawBonus = derived.permanentDice[attributeKey] - skillDice; const formula = derived.attributeTests[attributeKey]; const isPrimary = sheet.weaponKind === "kagune" && derived.primaryAttribute === attributeKey;
  return <article className={`attribute-card ${base > derived.purchasedCap ? "over-cap" : ""}`}><div className="attribute-title"><div><span>{attributeLabels[attributeKey]}</span><p>{attributeDescriptions[attributeKey]}</p></div><b>{attributePurchaseCost(base)} PE</b></div><div className="attribute-value-row"><div className="stepper"><button type="button" onClick={() => onSet(attributeKey, base - 1)} disabled={base <= 0}>−</button><strong>{base}</strong><button type="button" onClick={() => onSet(attributeKey, base + 1)} disabled={!sheet.narrativeLimits && base >= 11}>+</button></div>{(speciesBonus + acurado + bodyUpgrade + customBonus + skillAttributeBonus) !== 0 && <div className="total-value"><span>Total</span><b>{total}</b></div>}</div><div className="bonus-chips">{speciesBonus > 0 && <span>+{speciesBonus} espécie</span>}{acurado > 0 && <span>+1 Acurado</span>}{bodyUpgrade > 0 && <span>+{bodyUpgrade} Kakuhou</span>}{customBonus !== 0 && <span>{customBonus > 0 ? "+" : ""}{customBonus} mesa</span>}{skillAttributeBonus !== 0 && <span>{skillAttributeBonus > 0 ? "+" : ""}{skillAttributeBonus} autoral</span>}{rawBonus > 0 && <span>+{rawBonus} acertos de perk</span>}{skillDice !== 0 && <span>{skillDice > 0 ? "+" : ""}{skillDice} acertos autorais</span>}</div><button className="test-command" type="button" onClick={() => onCopy(formula, attributeKey)}><span>{copied === attributeKey ? "Copiado" : "Teste Rollem"}</span><code>{formula}</code><i>⧉</i></button>{base === 0 && <p className="zero-rule">Atributo 0: um único dado, mantendo os demais acertos.</p>}{isPrimary && <button className="test-command kagune" type="button" onClick={() => onCopy(derived.kaguneTest, `${attributeKey}-kagune`)}><span>{copied === `${attributeKey}-kagune` ? "Copiado" : "Com Kagune"}</span><code>{derived.kaguneTest}</code><i>⧉</i></button>}<label className="extra-dice"><span>Acertos extras / penalidade</span><div><button type="button" onClick={() => onExtra(attributeKey, sheet.extraDice[attributeKey] - 1)}>−</button><input type="number" value={sheet.extraDice[attributeKey]} onChange={(event) => onExtra(attributeKey, Number(event.target.value) || 0)} /><button type="button" onClick={() => onExtra(attributeKey, sheet.extraDice[attributeKey] + 1)}>+</button></div></label></article>;
}


