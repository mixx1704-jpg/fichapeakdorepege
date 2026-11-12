import { cumulativeLevelPE, MAX_LEVEL } from './rework-rules';

export type PERewardRecord = {
  id: string; original: number; multiplier: number; received: number;
  createdAt: number; sources: string[]; reversed: boolean; reversedAt?: number;
};
export type PERewardInput = {
  id: string; original: number; multiplier?: number; factors?: readonly number[];
  createdAt: number; sources?: readonly string[];
};
export type PERewardState = {
  grade: number; earnedPE: number; progressPE: number; progressionOffset?: number;
  extraPE?: number; peHistory?: PERewardRecord[];
};
const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positiveWhole = (value: unknown) => Math.max(0, Math.floor(finite(value)));
const floorPE = (value: number) => Math.floor(value + Number.EPSILON * Math.max(1,Math.abs(value)));
const sourceNames = (input: unknown) => Array.isArray(input) ? [...new Set(input.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))] : [];

/** Independent factors add their changes from one: ×2 and ×1.5 become ×2.5. */
export function combinePEMultipliers(factors: readonly number[]): number {
  return Math.max(0, 1 + factors.reduce((total, factor) => total + (Math.max(0, finite(factor, 1)) - 1), 0));
}

/** A reward is an immutable receipt of the original event, never a projection of the current balance. */
export function computeReward(input: PERewardInput): PERewardRecord {
  if (!input.id?.trim()) throw new Error('A recompensa precisa de um identificador.');
  const original = positiveWhole(input.original);
  const multiplier = input.factors ? combinePEMultipliers(input.factors) : Math.max(0, finite(input.multiplier, 1));
  const received = floorPE(original * multiplier);
  if (!Number.isSafeInteger(received)) throw new Error('A recompensa excede o limite numérico suportado.');
  return { id: input.id.trim(), original, multiplier, received, createdAt: positiveWhole(input.createdAt), sources: sourceNames(input.sources), reversed: false };
}

/** Loading receipts validates their saved final amounts without reapplying any reward. */
export function normalizePEHistory(input: unknown): PERewardRecord[] {
  if (!Array.isArray(input)) return [];
  const records = new Map<string,PERewardRecord>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id.trim()) continue;
    const id = raw.id.trim();
    const existing = records.get(id);
    if (existing) {
      // A duplicate import cannot undo a reversal or change the amount first recorded for that ID.
      if (raw.reversed === true) { existing.reversed = true; existing.reversedAt = positiveWhole(raw.reversedAt); }
      continue;
    }
    records.set(id, {
      id, original: positiveWhole(raw.original), multiplier: Math.max(0,finite(raw.multiplier,1)),
      received: positiveWhole(raw.received), createdAt: positiveWhole(raw.createdAt),
      sources: sourceNames(raw.sources), reversed: raw.reversed === true,
      ...(raw.reversed === true ? { reversedAt: positiveWhole(raw.reversedAt) } : {}),
    });
  }
  return [...records.values()];
}

export function earnedPEBaseline(state: PERewardState): number {
  return Math.max(0, finite(state.earnedPE), cumulativeLevelPE(state.grade) + finite(state.progressionOffset) + finite(state.progressPE));
}

/** Explicit event IDs make resubmitting the same reward idempotent. */
export function applyPEReward<T extends PERewardState>(state: T, input: PERewardInput): T {
  const history = normalizePEHistory(state.peHistory);
  if (history.some(record => record.id === input.id.trim())) return state;
  const reward = computeReward(input);
  if (!reward.original) return state;
  return {
    ...state,
    earnedPE: earnedPEBaseline(state) + reward.received,
    progressPE: state.grade < MAX_LEVEL ? positiveWhole(state.progressPE) + reward.received : state.progressPE,
    peHistory: [...history, reward],
  };
}

/** Keep the achieved level and purchases; reverse exactly the PE actually granted. */
export function undoPEReward<T extends PERewardState>(state: T, id: string, at: number): T {
  const history = normalizePEHistory(state.peHistory);
  const reward = history.find(record => record.id === id);
  if (!reward || reward.reversed) return state;
  const baseline = earnedPEBaseline(state);
  const remaining = Math.max(0, baseline - reward.received);
  const progressPE = Math.max(0, positiveWhole(state.progressPE) - reward.received);
  const shortfall = Math.max(0, reward.received - baseline);
  return {
    ...state, earnedPE: remaining, progressPE,
    progressionOffset: remaining - cumulativeLevelPE(state.grade) - progressPE,
    extraPE: finite(state.extraPE) - shortfall,
    peHistory: history.map(record => record.id === id ? { ...record, reversed: true, reversedAt: positiveWhole(at) } : record),
  };
}

/** Bookkeeping corrections are raw adjustments, with no multiplier or reward receipt. */
export function applyManualPECorrection<T extends PERewardState>(state: T, delta: number): T {
  const adjustment = Math.trunc(finite(delta));
  return adjustment ? { ...state, extraPE: finite(state.extraPE) + adjustment } : state;
}
