import type { Perk } from './data';

export type HealingTarget = 'life' | 'body' | 'part' | 'kakuhou' | 'rc';
export type HealingTechnique = { id: string; name: string; level: number; pe: number; rc: number; minVigor?:number; kind: 'heal' | 'cleanse' | 'rebuild' | 'release'; dice?: number; sides?: number; description: string };
export const healingSpecies = ['ghoul', 'ghoul-artificial', 'ghoul-dominante'];
const tierRows = [
  [1, 3, 2, 2, 6, 'Cicatriz Viva'], [3, 5, 3, 4, 6, 'Sutura Carmim'],
  [5, 7, 4, 4, 8, 'Pulso Regenerativo'], [7, 9, 5, 6, 8, 'Transfusão de Kagune'],
  [9, 12, 6, 6, 10, 'Reparo Profundo'], [11, 15, 8, 8, 10, 'Enxerto Vital'],
  [13, 35, 10, 8, 12, 'Organismo Soberano'], [16, 50, 12, 10, 12, 'Ressurgimento'],
  [20, 300, 15, 12, 12, 'Reconstituição Absoluta'],
] as const;

export const healingTechniques: HealingTechnique[] = [
  ...tierRows.map(([level, pe, rc, dice, sides, name]) => ({
    id: `r26-cura-${level}`, name, level, pe, rc, dice, sides, kind: 'heal' as const, ...(level===20?{minVigor:15}:{}),
    description: `Cure ${dice}d${sides} PV de sua Vida geral OU de uma região corporal não destruída. Pode curar um aliado por contato: a ficha rola os dados e gera o resultado para copiar. Custa ${rc} RC e usa a cura ativa do turno; a regeneração automática permanece separada. Não reconstrói partes nem remove condições.`,
  })),
  { id: 'r26-sutura-emergencia', name: 'Sutura de Emergência', level: 3, pe: 6, rc: 4, kind: 'cleanse', description: 'Remova uma condição física curável selecionada: sangramento, hemorragia, ferimento, fratura não destrutiva, trauma pulmonar, concussão, atordoamento ou colapso orgânico. Não remove destruição, efeitos mentais, supressão de RC ou objetos que prendem o corpo. Pode tratar um aliado por contato. 4 RC; usa a cura ativa do turno.' },
  { id: 'r26-reconstrucao-organica', name: 'Reconstrução Orgânica', level: 8, pe: 14, rc: 8, kind: 'rebuild', description: 'Reconstrua um alvo por uso: uma região corporal destruída (retorna com 1 PV e remove suas lesões destrutivas), uma parte da Kagune quebrada/sacrificada (retorna com 1 PV), uma lesão destrutiva selecionada ou o Kakuhou perdido (encerra o bloqueio). Não recupera todos os PV nem ativa a Kagune automaticamente. Pode tratar aliado por contato. 8 RC; usa a cura ativa do turno.' },
  { id: 'r26-desbloqueio-rc', name: 'Desbloqueio de RC', level: 5, pe: 12, rc: 0, kind: 'release', description: 'Uma vez por sessão, encerre a supressão de RC em você ou num aliado por contato. Não custa RC e funciona com o RC suprimido ou zerado. A reserva permanece a mesma: não cria RC. Usa a cura ativa do turno. Não remove exaustão por falta de reserva.' },
];

export const healingPerks: Perk[] = healingTechniques.map(technique => ({
  id: technique.id, name: technique.name, category: 'Vigor', cost: technique.pe,
  description: technique.description, minGrade: technique.level, maxRank: 1,
  species: ['ghoul', 'ghoul-artificial', 'ghoul-dominante'], requiresRC: technique.kind !== 'release',
  ...(technique.minVigor?{attribute:'vigor' as const,min:technique.minVigor}:{}),
  requirement: `LEVEL ${technique.level}${technique.minVigor?` · Vigor ${technique.minVigor}`:''} · Ghoul, Ghoul Artificial ou Ghoul Dominante`,
  sourceId: 'nova-era-cura', supplement: true,
}));

/** Physical injuries only; positional restraints and mental conditions are not erased. */
export const curablePhysicalEffects = [
  'Sangramento Leve', 'Sangramento Grave', 'Hemorragia', 'Braço Ferido', 'Braço Quebrado',
  'Perna Ferida', 'Perna Quebrada', 'Costelas Quebradas', 'Pulmão Perfurado', 'Dois Pulmões Comprometidos',
  'Coluna Danificada', 'Ouvido Rompido', 'Concussão', 'Atordoado', 'Sub-Vivo', 'Colapsado',
];
export const reconstructableEffects = [
  'Braço Destruído', 'Mão Destruída', 'Perna Destruída', 'Estômago Destruído', 'Órgãos Destruídos',
  'Coluna Quebrada', 'Mandíbula Destruída', 'Um Olho Destruído', 'Cego', 'Surdo', 'Tórax Esmagado',
];
export const healingFormula = (technique: HealingTechnique) => technique.kind === 'heal' ? `${technique.dice}d${technique.sides}` : 'Sem rolagem';

export function rollHealing(technique: HealingTechnique, roll: (sides: number) => number = sides => Math.floor(Math.random() * sides) + 1) {
  const sides = Math.max(1, Math.floor(technique.sides || 1));
  const rolls = Array.from({ length: technique.kind === 'heal' ? Math.max(0, Math.floor(technique.dice || 0)) : 0 }, () => {
    const value = Number(roll(sides));
    return Math.max(1, Math.min(sides, Math.floor(Number.isFinite(value) ? value : 1)));
  });
  return { formula: healingFormula(technique), rolls, total: rolls.reduce((sum, value) => sum + value, 0) };
}

export type HealingResult = { turn: number; id: string; name: string; formula: string; rolls: number[]; total: number; applied: number; rcCost: number; ally: boolean; target: string; effect: string; restored: string };

export function normalizeHealingResult(input: unknown): HealingResult | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<HealingResult>;
  const technique = healingTechniques.find(item => item.id === raw.id);
  if (!technique) return null;
  const positiveInteger = (value: unknown) => Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0));
  return { turn: positiveInteger(raw.turn), id: technique.id, name: technique.name, formula: healingFormula(technique), rolls: Array.isArray(raw.rolls) ? raw.rolls.slice(0, 12).map(value => Math.min(12, Math.max(1, positiveInteger(value)))) : [], total: positiveInteger(raw.total), applied: positiveInteger(raw.applied), rcCost: technique.rc, ally: raw.ally === true, target: typeof raw.target === 'string' ? raw.target : '', effect: typeof raw.effect === 'string' ? raw.effect : '', restored: typeof raw.restored === 'string' ? raw.restored : '' };
}

export function healingSummary(result: HealingResult) {
  return [
    `${result.name} · turno ${result.turn} · ${result.rcCost} RC`,
    `Alvo: ${result.ally ? 'aliado · ' : ''}${result.target}.`,
    result.rolls.length ? `Cura ${result.formula}: [${result.rolls.join(', ')}] = ${result.total} PV.${result.ally ? ' Aplique na ficha do aliado.' : ` Recuperação efetiva: ${result.applied} PV.`}` : '',
    result.effect ? `Condição removida: ${result.effect}.` : '', result.restored ? `Restaurado: ${result.restored}.` : '',
  ].filter(Boolean).join('\n');
}
