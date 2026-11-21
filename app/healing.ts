import { perkCatalog, catalogGroup } from './perk-catalog';
import type { Perk } from './data';

export type HealingTarget = 'life' | 'body' | 'part' | 'kakuhou' | 'rc';
export type HealingTechnique = { id: string; name: string; level: number; pe: number; rc: number; minVigor?:number; kind: 'heal' | 'cleanse' | 'rebuild' | 'release'; dice?: number; sides?: number; description: string };
export const healingSpecies = ['ghoul', 'ghoul-artificial', 'ghoul-dominante'];
export const healingTechniques: HealingTechnique[] = perkCatalog.perks.flatMap(p=>p.automation?.healing?[{...p.automation.healing,id:p.id,name:p.name,level:p.minGrade||1,pe:Array.isArray(p.cost)?p.cost[0]:p.cost}]:[]);
export const healingPerks: Perk[] = catalogGroup('healing');

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

export type HealingResult = { turn: number; id: string; name: string; formula: string; rolls: number[]; total: number; applied: number; rcCost: number; ally: boolean; target: string; effect: string; restored: string; receivedMultiplier?:number };

export function normalizeHealingResult(input: unknown): HealingResult | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<HealingResult>;
  const technique = healingTechniques.find(item => item.id === raw.id);
  if (!technique) return null;
  const positiveInteger = (value: unknown) => Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0));
  const rcCost=technique.rc===0?0:Math.max(1,Math.min(9999,raw.rcCost==null?technique.rc:positiveInteger(raw.rcCost)));
  const receivedMultiplier=raw.receivedMultiplier!=null&&Number.isFinite(Number(raw.receivedMultiplier))&&raw.ally!==true?Math.max(0,Math.min(2,Number(raw.receivedMultiplier))):1;
  return { turn: positiveInteger(raw.turn), id: technique.id, name: technique.name, formula: healingFormula(technique), rolls: Array.isArray(raw.rolls) ? raw.rolls.slice(0, 12).map(value => Math.min(12, Math.max(1, positiveInteger(value)))) : [], total: positiveInteger(raw.total), applied: positiveInteger(raw.applied), rcCost, ally: raw.ally === true, target: typeof raw.target === 'string' ? raw.target : '', effect: typeof raw.effect === 'string' ? raw.effect : '', restored: typeof raw.restored === 'string' ? raw.restored : '',...(receivedMultiplier!==1?{receivedMultiplier}:{}) };
}

export function healingSummary(result: HealingResult) {
  return [
    `${result.name} · turno ${result.turn} · ${result.rcCost} RC`,
    `Alvo: ${result.ally ? 'aliado · ' : ''}${result.target}.`,
    result.rolls.length ? `Cura ${result.formula}: [${result.rolls.join(', ')}] = ${result.total} PV.${result.receivedMultiplier!=null?` Cura recebida ×${result.receivedMultiplier}: ${Math.floor(result.total*result.receivedMultiplier)} PV.`:''}${result.ally ? ' Aplique na ficha do aliado.' : ` Recuperação efetiva: ${result.applied} PV.`}` : '',
    result.effect ? `Condição removida: ${result.effect}.` : '', result.restored ? `Restaurado: ${result.restored}.` : '',
  ].filter(Boolean).join('\n');
}
