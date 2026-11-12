import { normalizeVats, vatsAction, vatsReceivedDamage, type VatsConfig, type VatsState } from './vats-engine';
import { normalizePackConditions, type PackConditions } from './pack-effects';

export const NEUROSE_ID = 'r26-revisao-009';
export const CORTEX_ID = 'r26-revisao-049';
export type PeriodicId = typeof NEUROSE_ID | typeof CORTEX_ID;
export type PeriodicEntry = {
  characterId: string; perkId: PeriodicId; active: boolean; activatedTurn: number;
  dueTurn: number; lastProcessedTurn: number; processedCount: number;
  expiresTurn: number; usedInCombat: boolean; formula: string; stage: 'own-turn-start';
};
export type PeriodicDamageReceipt = {
  id: string; characterId: string; perkId: PeriodicId; name: string; turn: number;
  formula: string; dice: number[]; rawDamage: number; appliedDamage: number;
  region: 'head' | 'life'; fatal: boolean;
};
export type PeriodicEffectsState = {
  entries: Partial<Record<PeriodicId, PeriodicEntry>>;
  history: PeriodicDamageReceipt[];
  neuroseEverActivated: boolean; cortexLifeLoss: boolean;
  condemned: boolean;
  condemnation: { perkId: typeof NEUROSE_ID; turn: number; reason: string } | null;
};
export type PeriodicRolls = { neurose: [number, number]; cortex: [number] };
export type PeriodicCharacter = {
  id: string; perks: Record<string, { rank: number }>; packConditions: PackConditions;
  periodics?: PeriodicEffectsState; vats: VatsState; currentLife: number; currentRC: number; hunger: number;
};
export type PeriodicEvent<T extends PeriodicCharacter = PeriodicCharacter> = {
  kind: 'conditions' | 'turn' | 'long-rest' | 'combat-reset';
  config: VatsConfig; conditions?: PackConditions; rolls: PeriodicRolls;
  eligiblePerkIds?: readonly string[];
  resolveConfig?: (candidate: T) => VatsConfig;
};
const int = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
const d100 = (value: unknown) => Math.min(100, Math.max(1, int(value, 1)));
export const blankPeriodicEffects = (): PeriodicEffectsState => ({ entries: {}, history: [], neuroseEverActivated: false, cortexLifeLoss: false, condemned: false, condemnation: null });

/** Sample outside React's state updater; replaying an updater then uses identical dice. */
export function samplePeriodicRolls(roll: (sides: number) => number = sides => Math.floor(Math.random() * sides) + 1): PeriodicRolls {
  return { neurose: [d100(roll(100)), d100(roll(100))], cortex: [d100(roll(100))] };
}

export function normalizePeriodicEffects(input: unknown, characterId = ''): PeriodicEffectsState {
  const base = blankPeriodicEffects();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return base;
  const raw = input as Partial<PeriodicEffectsState>;
  for (const perkId of [NEUROSE_ID, CORTEX_ID] as const) {
    const value = raw.entries?.[perkId];
    if (!value || typeof value !== 'object') continue;
    base.entries[perkId] = {
      characterId: characterId || String(value.characterId || ''), perkId,
      active: value.active === true, activatedTurn: int(value.activatedTurn),
      dueTurn: int(value.dueTurn), lastProcessedTurn: int(value.lastProcessedTurn),
      processedCount: int(value.processedCount), expiresTurn: int(value.expiresTurn),
      usedInCombat: value.usedInCombat === true, formula: perkId === NEUROSE_ID ? '2d100+30' : '1d100+50', stage: 'own-turn-start',
    };
    const entry = base.entries[perkId]!;
    if (entry.active && !entry.dueTurn && entry.lastProcessedTurn < entry.activatedTurn) entry.dueTurn = entry.activatedTurn;
  }
  base.history = Array.isArray(raw.history) ? raw.history.filter(row => row && [NEUROSE_ID,CORTEX_ID].includes(row.perkId)).slice(-200).map(row => ({
    id: String(row.id || `${row.perkId}:${int(row.turn)}`), characterId: characterId || String(row.characterId || ''),
    perkId: row.perkId, name: row.perkId === NEUROSE_ID ? 'Neurose Forçada' : 'Córtex em Combustão',
    turn: int(row.turn), formula: row.perkId === NEUROSE_ID ? '2d100+30' : '1d100+50',
    dice: Array.isArray(row.dice) ? row.dice.slice(0,row.perkId === NEUROSE_ID ? 2 : 1).map(d100) : [],
    rawDamage: int(row.rawDamage), appliedDamage: int(row.appliedDamage),
    region: row.perkId === NEUROSE_ID ? 'head' : 'life', fatal: row.fatal === true,
  })) : [];
  base.history = [...new Map(base.history.map(row => [row.id, row])).values()];
  for (const perkId of [NEUROSE_ID,CORTEX_ID] as const) {
    const entry = base.entries[perkId];
    const rows = base.history.filter(row => row.perkId === perkId);
    if (entry && rows.length) {
      entry.lastProcessedTurn = Math.max(entry.lastProcessedTurn, ...rows.map(row => row.turn));
      entry.processedCount = Math.max(entry.processedCount, rows.length);
    }
  }
  base.neuroseEverActivated = raw.neuroseEverActivated === true || Boolean(base.entries[NEUROSE_ID]?.processedCount);
  base.cortexLifeLoss = raw.cortexLifeLoss === true;
  base.condemned = raw.condemned === true;
  if (base.condemned) base.condemnation = { perkId: NEUROSE_ID, turn: int(raw.condemnation?.turn), reason: 'Morte por dano craniano da Neurose Forçada: perda definitiva; regeneração, imortalidade e ressurreição não anulam a consequência.' };
  return base;
}

/** No timers, storage writes or random calls: only an explicit user action processes a turn. */
export function processPeriodicEvent<T extends PeriodicCharacter>(source: T, event: PeriodicEvent<T>): T {
  const state = normalizePeriodicEffects(source.periodics, source.id);
  let vats = normalizeVats(source.vats);
  const turn = Math.max(1, int(vats.turn, 1));
  const conditions = normalizePackConditions(event.conditions || source.packConditions);
  state.neuroseEverActivated ||= int(conditions[NEUROSE_ID]?.value) > 0;
  state.cortexLifeLoss ||= int(conditions[CORTEX_ID]?.value) > 0 || conditions[CORTEX_ID]?.mode === 'aftermath';
  let currentLife = int(source.currentLife);
  let config = { ...event.config, currentLife, rc: source.currentRC, hunger: source.hunger };
  const log = (message: string) => { vats.log = [`T${turn} · ${message}`, ...vats.log].slice(0,80); };
  const entryFor = (perkId: PeriodicId): PeriodicEntry => state.entries[perkId] ||= {
    characterId: source.id, perkId, active: false, activatedTurn: 0, dueTurn: 0,
    lastProcessedTurn: 0, processedCount: 0, expiresTurn: 0, usedInCombat: false,
    formula: perkId === NEUROSE_ID ? '2d100+30' : '1d100+50', stage: 'own-turn-start',
  };
  if (state.neuroseEverActivated) conditions[NEUROSE_ID] = { ...conditions[NEUROSE_ID], value: 1 };
  if (event.kind === 'long-rest') {
    state.cortexLifeLoss = false;
    const cortex = entryFor(CORTEX_ID); cortex.active = false; cortex.usedInCombat = false; cortex.expiresTurn = 0;
    conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], mode: 'none', value: 0 };
  }
  if (event.kind === 'combat-reset') for (const perkId of [NEUROSE_ID,CORTEX_ID] as const) entryFor(perkId).usedInCombat = false;
  // Expiration and persistent injury change maximum Life before this turn's cranial damage.
  const cortex = entryFor(CORTEX_ID);
  const cortexRequested = conditions[CORTEX_ID]?.mode === 'active';
  if (cortex.active && ((cortex.expiresTurn > 0 && turn >= cortex.expiresTurn) || !cortexRequested)) {
    if (cortex.lastProcessedTurn < turn && cortex.expiresTurn > turn) cortex.dueTurn = turn;
    cortex.active = false; state.cortexLifeLoss = true;
    conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], mode: 'aftermath', value: 1 };
    log('Córtex em Combustão encerrado; −10% Vida máxima até descanso longo.');
  }
  if (!cortex.active && cortex.usedInCombat && cortexRequested) conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], mode: state.cortexLifeLoss ? 'aftermath' : 'none' };
  if (state.cortexLifeLoss) conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], value: 1 };
  const candidate = { ...source, vats, currentLife, packConditions: conditions, periodics: state };
  if (event.resolveConfig) config = { ...event.resolveConfig(candidate), currentLife, rc: source.currentRC, hunger: source.hunger };
  currentLife = Math.min(currentLife, Math.max(0, Math.floor(config.maxLife * Math.max(1, Number(config.temporaryLifeCapMultiplier) || 1))));
  if (state.condemned) return preservePeriodicCondemnation(source, { ...source, periodics: state, packConditions: conditions }, config.maxLife);
  for (const perkId of [NEUROSE_ID,CORTEX_ID] as const) {
    const entry = entryFor(perkId);
    const owned = int(source.perks[perkId]?.rank) > 0;
    const eligible = owned && (!event.eligiblePerkIds || event.eligiblePerkIds.includes(perkId));
    let desired = eligible && (perkId === NEUROSE_ID ? conditions[perkId]?.active === true : conditions[perkId]?.mode === 'active');
    if (desired && !entry.active) {
      if (perkId === CORTEX_ID && entry.usedInCombat) {
        desired = false; conditions[perkId] = { ...conditions[perkId], mode: state.cortexLifeLoss ? 'aftermath' : 'none' };
        log('Córtex em Combustão já foi usado neste combate; ativação rejeitada.');
      } else {
        entry.activatedTurn = turn; entry.usedInCombat = true;
        entry.expiresTurn = perkId === CORTEX_ID ? turn + 1 : 0;
        if (!entry.dueTurn && entry.lastProcessedTurn !== turn) entry.dueTurn = turn;
        if (perkId === NEUROSE_ID) {
          state.neuroseEverActivated = true;
          conditions[perkId] = { ...conditions[perkId], value: 1 };
        }
      }
    }
    if (desired && entry.lastProcessedTurn < turn && !entry.dueTurn) entry.dueTurn = turn;
    // A saved due bill is also settled when the player turns the skill off.
    const chargeTurns: number[] = [];
    if (entry.dueTurn > entry.lastProcessedTurn && entry.dueTurn <= turn) chargeTurns.push(entry.dueTurn);
    if (desired && entry.lastProcessedTurn < turn && !chargeTurns.includes(turn)) chargeTurns.push(turn);
    for (const damageTurn of chargeTurns) {
      const dice = perkId === NEUROSE_ID ? event.rolls.neurose.map(d100) : event.rolls.cortex.map(d100);
      const damage = dice.reduce((sum,value) => sum + value, 0) + (perkId === NEUROSE_ID ? 30 : 50);
      let appliedDamage = 0;
      let fatal = false;
      if (perkId === NEUROSE_ID) {
        const before = vats.body.head.damage;
        const fortressBonus = vats.fortressBonus;
        // Direct cranial damage bypasses RD/one-hit fortress padding, while using the existing regional ledger.
        const damaged = vatsAction({ ...vats, fortressBonus: 0 }, config, { type: 'damage', region: 'head', amount: damage, reduceRD: false });
        vats = damaged.vats;
        vats.fortressBonus = fortressBonus;
        appliedDamage = Math.max(0, vats.body.head.damage - before);
        fatal = vats.body.head.destroyed || vats.body.head.damage >= Math.max(1, Math.floor(config.maxLife));
        if (fatal) {
          state.condemned = true;
          state.condemnation = { perkId: NEUROSE_ID, turn: damageTurn, reason: 'Morte por dano craniano da Neurose Forçada: perda definitiva; regeneração, imortalidade e ressurreição não anulam a consequência.' };
          currentLife = 0; vats.body.head.destroyed = true;
          log(state.condemnation.reason);
        }
      } else {
        // The source specifies direct physical damage but no body region: debit current Life, without inventing a cranial injury.
        const received = vatsReceivedDamage(damage, config);
        appliedDamage = Math.min(currentLife, received); currentLife = Math.max(0, currentLife - received);
        fatal = currentLife === 0;
      }
      entry.processedCount++;
      entry.lastProcessedTurn = damageTurn; entry.dueTurn = 0;
      const receipt: PeriodicDamageReceipt = {
        id: `${source.id}:${perkId}:T${damageTurn}`, characterId: source.id, perkId,
        name: perkId === NEUROSE_ID ? 'Neurose Forçada' : 'Córtex em Combustão', turn: damageTurn,
        formula: entry.formula, dice, rawDamage: damage, appliedDamage,
        region: perkId === NEUROSE_ID ? 'head' : 'life', fatal,
      };
      state.history = [...state.history.filter(row => row.id !== receipt.id), receipt].slice(-200);
      log(`${receipt.name}: ${receipt.formula} [${dice.join(', ')}] = ${damage}; ${appliedDamage} PV aplicados ${receipt.region === 'head' ? 'na cabeça' : 'à Vida atual'}. Cobrança única do turno ${damageTurn}.`);
      if (state.condemned) break;
    }
    if (perkId === CORTEX_ID && entry.active && !desired) state.cortexLifeLoss = true;
    entry.active = desired && !state.condemned;
    if (state.condemned) break;
  }
  if (state.cortexLifeLoss) conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], value: 1, ...(!state.entries[CORTEX_ID]?.active ? { mode: 'aftermath' } : {}) };
  if (state.condemned) {
    conditions[NEUROSE_ID] = { ...conditions[NEUROSE_ID], active: false, value: 1 };
    conditions[CORTEX_ID] = { ...conditions[CORTEX_ID], mode: state.cortexLifeLoss ? 'aftermath' : 'none' };
    for (const entry of Object.values(state.entries)) if (entry) entry.active = false;
  }
  return { ...source, vats, currentLife, packConditions: conditions, periodics: state };
}

/** A normal edit, healing action or resource refill cannot undo the saved definitive consequence. */
export function preservePeriodicCondemnation<T extends PeriodicCharacter>(previous: T, next: T, maximumLife = 1): T {
  const before = normalizePeriodicEffects(previous.periodics, previous.id);
  const after = normalizePeriodicEffects(next.periodics, next.id);
  if (!before.condemned && !after.condemned) return next;
  const periodics = before.condemned ? before : after;
  const vats = normalizeVats(next.vats);
  vats.body.head = { ...vats.body.head, damage: Math.max(vats.body.head.damage, Math.max(1, int(maximumLife, 1))), destroyed: true };
  const conditions = normalizePackConditions(next.packConditions);
  conditions[NEUROSE_ID] = { ...conditions[NEUROSE_ID], active: false, value: 1 };
  for (const entry of Object.values(periodics.entries)) if (entry) entry.active = false;
  return { ...next, currentLife: 0, vats, periodics, packConditions: conditions };
}
