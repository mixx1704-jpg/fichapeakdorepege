export const poisonKinds = ["toxic", "neurotoxic", "corrosive"] as const;
export type PoisonKind = (typeof poisonKinds)[number];

export const poisonNames: Record<PoisonKind, string> = {
  toxic: "Tóxico",
  neurotoxic: "Neurotóxico",
  corrosive: "Corrosivo",
};

export const poisonPerkIds = {
  inoculation: "r26-veneno-inoculacao",
  concentrated: "r26-veneno-concentrado",
  persistent: "r26-veneno-persistente",
  cumulative: "r26-veneno-acumulativo",
  corrosive: "r26-veneno-corrosivo",
  neurotoxic: "r26-veneno-paralisante",
} as const;

export interface PoisonTarget {
  name: string;
  maxLife: number;
  rd: number;
  vigor: number;
  control: number;
}

export interface PoisonConfig {
  enabled: boolean;
  control: number;
  level: number;
  /** Only purchased and currently valid perks should be supplied. */
  perks?: readonly string[];
  /** Allows an existing authorial/legacy effect to expose an additional type. */
  allowedKinds?: readonly PoisonKind[];
}

export interface PoisonProfile {
  potencyPercent: number;
  maxStacks: number;
  duration: number;
  neuroPerStack: number;
  resistanceDC: number;
}

export interface PoisonState {
  version: 1;
  target: PoisonTarget;
  kind: PoisonKind;
  stacks: number;
  remaining: number;
  turn: number;
  totalDamage: number;
  /** A dose keeps its original strength after changing tabs or retracting the weapon. */
  profile: PoisonProfile | null;
  log: string[];
}

export type PoisonAction =
  | { type: "target"; patch: Partial<PoisonTarget> }
  | { type: "kind"; kind: PoisonKind }
  | { type: "dose"; roll?: number; resisted?: boolean }
  | { type: "turn" }
  | { type: "clear" }
  | { type: "reset-log" };

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown, fallback = 0, min = 0, max = 1_000_000_000): number => {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
};
const cleanText = (value: unknown, max: number): string => typeof value === "string" ? value.slice(0, max) : "";
const isKind = (value: unknown): value is PoisonKind => poisonKinds.includes(value as PoisonKind);

export function emptyPoisonState(): PoisonState {
  return { version: 1, target: { name: "", maxLife: 100, rd: 0, vigor: 0, control: 0 }, kind: "toxic", stacks: 0, remaining: 0, turn: 1, totalDamage: 0, profile: null, log: [] };
}

function normalizeProfile(value: unknown): PoisonProfile | null {
  if (value === null || value === undefined) return null;
  const raw = record(value);
  return {
    potencyPercent: integer(raw.potencyPercent, 3, 3, 4),
    maxStacks: integer(raw.maxStacks, 3, 3, 4),
    duration: integer(raw.duration, 3, 3, 5),
    neuroPerStack: integer(raw.neuroPerStack, 0, 0, 10),
    resistanceDC: integer(raw.resistanceDC, 15, 15, 1_000_015),
  };
}

export function normalizePoisonState(value: unknown): PoisonState {
  const raw = record(value), target = record(raw.target), fallback = emptyPoisonState();
  const stacks = integer(raw.stacks, 0, 0, 4), remaining = integer(raw.remaining, 0, 0, 5);
  return {
    version: 1,
    target: {
      name: cleanText(target.name, 100), maxLife: integer(target.maxLife, fallback.target.maxLife),
      rd: integer(target.rd), vigor: integer(target.vigor, 0, 0, 1_000_000), control: integer(target.control, 0, 0, 1_000_000),
    },
    kind: isKind(raw.kind) ? raw.kind : "toxic",
    stacks: remaining > 0 ? stacks : 0,
    remaining: stacks > 0 ? remaining : 0,
    turn: integer(raw.turn, 1, 1),
    totalDamage: integer(raw.totalDamage, 0, 0, 1_000_000_000_000),
    profile: stacks > 0 && remaining > 0 ? normalizeProfile(raw.profile) : null,
    log: Array.isArray(raw.log) ? raw.log.filter((line): line is string => typeof line === "string").slice(-50).map(line => cleanText(line, 500)) : [],
  };
}

export function poisonRules(config: PoisonConfig) {
  const has = (id: string) => config.perks?.includes(id) ?? false;
  const control = integer(config.control, 0, 0, 1_000_000);
  const allowedKinds: PoisonKind[] = ["toxic"];
  if (has(poisonPerkIds.neurotoxic) || config.allowedKinds?.includes("neurotoxic")) allowedKinds.push("neurotoxic");
  if (has(poisonPerkIds.corrosive) || config.allowedKinds?.includes("corrosive")) allowedKinds.push("corrosive");
  return {
    enabled: Boolean(config.enabled), allowedKinds,
    potencyPercent: has(poisonPerkIds.concentrated) ? 4 : 3,
    maxStacks: has(poisonPerkIds.cumulative) ? 4 : 3,
    duration: has(poisonPerkIds.persistent) ? 5 : 3,
    neuroPerStack: Math.min(10, Math.floor(control / 3)),
    resistanceDC: 15 + control,
  };
}

export function poisonResistance(target: PoisonTarget, config: PoisonConfig, roll: number) {
  const die = integer(roll, 1, 1, 20);
  const modifier = integer(target.vigor, 0, 0, 1_000_000) + integer(target.control, 0, 0, 1_000_000);
  const dc = poisonRules(config).resistanceDC;
  return { die, modifier, total: die + modifier, dc, resisted: die + modifier >= dc, formula: `1d20+${modifier}` };
}

export function poisonPreview(input: PoisonState, config: PoisonConfig) {
  const state = normalizePoisonState(input), rules = poisonRules(config), profile = state.profile ?? rules;
  const active = state.stacks > 0 && state.remaining > 0;
  const stacks = active ? Math.min(state.stacks, profile.maxStacks) : 0;
  const percent = state.kind === "toxic" ? profile.potencyPercent * stacks : 0;
  const rawDamage = Math.floor(state.target.maxLife * percent / 100);
  const mitigation = state.kind === "toxic" ? Math.floor(state.target.rd / 2) : 0;
  const damage = Math.max(0, rawDamage - mitigation);
  const accuracyPenalty = state.kind === "neurotoxic" ? Math.min(10, profile.neuroPerStack * stacks) : 0;
  const rdReductionPercent = state.kind === "corrosive" ? Math.min(20, 5 * stacks) : 0;
  const rdIgnored = Math.floor(state.target.rd * rdReductionPercent / 100);
  return {
    active, kind: state.kind, kindLabel: poisonNames[state.kind], stacks, remaining: state.remaining,
    maxStacks: profile.maxStacks, duration: profile.duration, potencyPercent: profile.potencyPercent,
    percent, rawDamage, mitigation, damage, accuracyPenalty, rdReductionPercent, rdIgnored,
    effectiveRD: state.target.rd - rdIgnored,
    resistanceDC: rules.resistanceDC,
    resistanceModifier: state.target.vigor + state.target.control,
    resistanceTest: `1d20+${state.target.vigor + state.target.control}`,
    allowedKinds: rules.allowedKinds,
    canDose: rules.enabled && rules.allowedKinds.includes(state.kind),
  };
}

function addLog(state: PoisonState, message: string): PoisonState {
  return { ...state, log: [...state.log, `T${state.turn} · ${message}`].slice(-50) };
}

/** No action alters a player sheet's life or RC; this is the target's combat record. */
export function updatePoison(input: PoisonState, action: PoisonAction, config: PoisonConfig): PoisonState {
  const state = normalizePoisonState(input);
  const rules = poisonRules(config);
  if (action.type === "target") return normalizePoisonState({ ...state, target: { ...state.target, ...action.patch } });
  if (action.type === "reset-log") return { ...state, log: [], totalDamage: 0 };
  if (action.type === "clear") return addLog({ ...state, stacks: 0, remaining: 0, profile: null }, "Veneno encerrado.");
  if (action.type === "kind") {
    if (!isKind(action.kind) || !rules.allowedKinds.includes(action.kind) || state.kind === action.kind) return state;
    return addLog({ ...state, kind: action.kind, stacks: 0, remaining: 0, profile: null }, `Tipo alterado para ${poisonNames[action.kind]}; doses anteriores encerradas.`);
  }
  if (action.type === "dose") {
    if (!rules.enabled || !rules.allowedKinds.includes(state.kind)) return state;
    const resistance = action.roll === undefined ? null : poisonResistance(state.target, config, action.roll);
    const resisted = resistance?.resisted ?? Boolean(action.resisted);
    if (resisted) return addLog(state, `Dose resistida${resistance ? ` (${resistance.total} contra CD ${resistance.dc})` : ""}; efeito anterior mantido.`);
    const profile: PoisonProfile = {
      potencyPercent: rules.potencyPercent, maxStacks: rules.maxStacks, duration: rules.duration,
      neuroPerStack: rules.neuroPerStack, resistanceDC: rules.resistanceDC,
    };
    const next = { ...state, stacks: Math.min(rules.maxStacks, state.stacks + 1), remaining: rules.duration, profile };
    return addLog(next, `Dose de ${poisonNames[state.kind]}: ${next.stacks}/${rules.maxStacks} acúmulos; duração renovada para ${rules.duration} turnos${resistance ? ` (${resistance.total} contra CD ${resistance.dc})` : ""}.`);
  }
  if (action.type === "turn") {
    const preview = poisonPreview(state, config);
    if (!preview.active) return { ...state, turn: Math.min(1_000_000_000, state.turn + 1) };
    const effect = state.kind === "toxic"
      ? `${preview.damage} dano tóxico (${preview.rawDamage} bruto − ${preview.mitigation} por RD)`
      : state.kind === "neurotoxic"
        ? `−${preview.accuracyPenalty} acertos em ataque e desvio; nenhum dano direto`
        : `−${preview.rdReductionPercent}% da RD: ${preview.rdIgnored} RD ignorada; nenhum dano direto`;
    const remaining = Math.max(0, state.remaining - 1);
    const next = addLog({ ...state, totalDamage: Math.min(1_000_000_000_000, state.totalDamage + preview.damage), remaining, stacks: remaining ? state.stacks : 0, profile: remaining ? state.profile : null }, `${effect}. ${remaining ? `${remaining} turno(s) restante(s).` : "Veneno expirou ao fim deste turno."}`);
    return { ...next, turn: Math.min(1_000_000_000, state.turn + 1) };
  }
  return state;
}

export function poisonSummary(input: PoisonState, config: PoisonConfig): string {
  const state = normalizePoisonState(input), preview = poisonPreview(state, config);
  const heading = `${state.target.name.trim() || "Alvo"} · ${preview.kindLabel} · ${preview.stacks}/${preview.maxStacks} acúmulos · ${preview.remaining} turno(s)`;
  if (!preview.active) return `${heading}\nNenhum efeito ativo.`;
  const effect = state.kind === "toxic"
    ? `${preview.percent}% de ${state.target.maxLife} PV = ${preview.rawDamage}; − metade da RD (${preview.mitigation}) = ${preview.damage} dano por turno.`
    : state.kind === "neurotoxic"
      ? `−${preview.accuracyPenalty} acertos em ataque e desvio. Não remove ações. Nenhum dano direto.`
      : `Corrosão: ignora ${preview.rdReductionPercent}% da RD (${preview.rdIgnored} de ${state.target.rd}); RD restante ${preview.effectiveRD}. Use a maior fonte de penetração, sem somar, até 50%. Nenhum dano direto.`;
  return `${heading}\n${effect}\nResistência a uma nova dose: ${preview.resistanceTest} contra CD ${preview.resistanceDC}; sucesso impede só a nova dose.\nNova dose renova a duração. Ao encerrar turno, registre o efeito uma vez e reduza a duração.`;
}
