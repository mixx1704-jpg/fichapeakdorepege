import { normalizeLevel } from './rework-rules';

/** One extra die replaces the previous tier; it never multiplies fixed bonuses. */
export const combatDieProgression = [
  { from: 1, to: 1, sides: 20 }, { from: 2, to: 3, sides: 40 },
  { from: 4, to: 5, sides: 80 }, { from: 6, to: 7, sides: 120 },
  { from: 8, to: 9, sides: 160 }, { from: 10, to: 11, sides: 200 },
  { from: 12, to: 13, sides: 250 }, { from: 14, to: 15, sides: 300 },
  { from: 16, to: 17, sides: 350 }, { from: 18, to: 20, sides: 400 },
] as const;

export function combatLevelDieSides(level: number) {
  const normalized = normalizeLevel(level);
  return combatDieProgression.find(tier => normalized >= tier.from && normalized <= tier.to)!.sides;
}

const combatTestKeys = ['physicalHitTest', 'kaguneTest', 'blockTest', 'dodgeTest',
  'kakujaKaguneTest', 'kakujaBlockTest', 'kakujaDodgeTest'] as const;
type CombatTests = Partial<Record<typeof combatTestKeys[number], string>>;

/** Only called once, on finalized combat tests; unavailable tests remain unavailable. */
export function applyCombatLevelDie<T extends CombatTests>(result: T, level: number): T {
  const updated = { ...result };
  for (const key of combatTestKeys) {
    const value = result[key];
    if (typeof value === 'string' && /^1d(?:10|20|30)(?=[+-]|$)/.test(value)) {
      updated[key] = `${value}+1d${combatLevelDieSides(level)}`;
    }
  }
  return updated;
}

/** Dice are random terms, never part of fixed scaling, precision spending or penalties. */
export function fixedAccuracyTotal(test: string): number {
  return [...test.replace(/\d+d\d+/g, '').matchAll(/[+-]\d+(?:\.\d+)?/g)]
    .reduce((sum, match) => sum + Math.floor(Number(match[0])), 0);
}

export function parseAccuracyRoll(formula: string) {
  const main = formula.match(/^1d(10|20|30)(?=[+-]|$)/);
  if (!main) return null;
  const rest = formula.slice(main[0].length);
  const tokens = rest.match(/[+-](?:\d+d\d+|\d+(?:\.\d+)?)/g) || [];
  if (tokens.join('') !== rest) return null;
  const extras: { count: number; sides: number }[] = [];
  for (const token of tokens) {
    const dice = token.match(/^\+(\d+)d(\d+)$/);
    if (dice) {
      const count = Number(dice[1]), sides = Number(dice[2]);
      if (count < 1 || count > 100 || sides < 2 || sides > 10000) return null;
      extras.push({ count, sides });
    } else if (token.includes('d')) return null;
  }
  return { sides: Number(main[1]), modifier: fixedAccuracyTotal(formula), extras };
}

export function rollAccuracyTest(formula: string, roll: (sides: number) => number) {
  const parsed = parseAccuracyRoll(formula);
  if (!parsed) throw new Error('Fórmula de Acerto inválida');
  const die = roll(parsed.sides);
  const bonusRolls = parsed.extras.flatMap(({ count, sides }) =>
    Array.from({ length: count }, () => ({ sides, value: roll(sides) })));
  const modifier = parsed.modifier + bonusRolls.reduce((sum, result) => sum + result.value, 0);
  return { die, modifier, total: die + modifier, bonusRolls };
}
