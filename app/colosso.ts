import { rollemDice } from './damage-dice';
import { tailAvailability, type TailPart } from './tail-management';

export const COLOSSO_PERK_ID = 'r26-colosso-carne';

/** Fusion is a view of the saved parts; activating it never consumes their data. */
export function colossoParts(input: {
  purchased: boolean; requested: boolean; kagune: boolean; manifested: boolean;
  capacity: number; parts: TailPart[]; turn: number; kakuhouUntil: number;
}) {
  const available = Array.from({ length: Math.max(0, Math.floor(input.capacity)) }, (_, i) => i)
    .filter(i => tailAvailability(input.parts[i], input.manifested && input.kagune, input.turn, input.kakuhouUntil) === 'Disponível');
  const extraParts = Math.max(0, available.length - 1);
  const pairs = Math.floor(available.length / 2);
  const extraPairs = Math.floor(extraParts / 2);
  const ready = input.purchased && input.kagune && input.manifested && input.kakuhouUntil <= input.turn && extraParts > 0;
  return { purchased: input.purchased, requested: input.requested, ready, active: ready && input.requested, available, partCount: available.length, extraParts, pairs, extraPairs };
}

/** Sum damage, including the fixed modifier of each part exactly once. */
export function sumPartDamage(expressions: string[]) {
  const groups = new Map<number, number>();
  let modifier = 0;
  for (const expression of expressions) {
    const remainder = expression.replace(/(\d+)d(\d+)/gi, (_match, count: string, sides: string) => {
      const side = Math.max(1, Math.floor(Number(sides)));
      groups.set(side, (groups.get(side) || 0) + Math.max(0, Math.floor(Number(count))));
      return '';
    });
    for (const match of remainder.matchAll(/[+-]?\d+(?:\.\d+)?/g)) modifier += Number(match[0]);
  }
  modifier = Math.floor(modifier);
  const dice = [...groups].filter(([, count]) => count > 0).sort((a, b) => b[0] - a[0]).map(([side, count]) => rollemDice(count, side)).join('+');
  return `${dice}${modifier > 0 && dice ? '+' : ''}${modifier || !dice ? modifier : ''}`;
}

export function calculateColosso(parts: ReturnType<typeof colossoParts>, values: {
  damagePerPart: string; durabilityPerPart: number; rdPerPart: number; baseRange: number;
}) {
  const durabilitySum = Math.max(0, Math.floor(values.durabilityPerPart)) * parts.partCount;
  const rdSum = Math.max(0, Math.floor(values.rdPerPart)) * parts.partCount;
  return {
    ...parts,
    damagePerPart: values.damagePerPart,
    damage: sumPartDamage(Array.from({ length: parts.partCount }, () => values.damagePerPart)),
    durabilityPerPart: Math.max(0, Math.floor(values.durabilityPerPart)), durabilitySum, durability: Math.floor(durabilitySum / 2),
    rdPerPart: Math.max(0, Math.floor(values.rdPerPart)), rdSum, rd: rdSum,
    baseRange: Math.floor(values.baseRange), range: Math.floor(values.baseRange + parts.extraPairs),
    accuracyBonus: parts.pairs * 2, agilityPenalty: parts.extraPairs,
  };
}

export type ColossoResult = ReturnType<typeof calculateColosso>;

export function colossoSummary(result: ColossoResult, attackTest: string, totalRD?:number) {
  return [
    'Colosso de Carne',
    `${result.partCount} partes fundidas (${result.extraParts} extras; floor(${result.partCount} / 2) = ${result.pairs} pares para o acerto).`,
    `Acerto: ${attackTest}. Dano: ${result.damage}. Alcance: ${result.range} m.`,
    'O dano unido soma o dano completo de cada parte, incluindo todos os seus dados e modificadores, sem perdas na fusão.',
    `Dureza: floor(${result.durabilityPerPart} × ${result.partCount} / 2) = ${result.durability}. RD da Kagune: ${result.rdPerPart} × ${result.partCount} = ${result.rd}.`,
    ...(totalRD===undefined?[]:[`RD total da ficha, após bônus e porcentagens: ${Math.floor(totalRD)}.`]),
    `+${result.accuracyBonus} acertos de Kagune; −${result.agilityPenalty} acertos de Agilidade, Esquiva e Iniciativa.`,
    'Uma única parte e um único ataque por ação; não some ataques nem reservas das partes fundidas.',
  ].join('\n');
}
