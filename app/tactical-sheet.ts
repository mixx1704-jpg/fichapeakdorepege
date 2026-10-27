import { calculateCharacter, type CharacterSheet } from './character';
import { resolveTactical } from './tactical';
import { isRCSuppressed } from './vats-engine';

export type TacticalSheetContext = Parameters<typeof resolveTactical>[2];
export type TacticalSheetAction = Parameters<typeof resolveTactical>[1];

/** Resolve against the latest saved state so rapid clicks cannot pay or apply twice. */
export function applyCharacterTacticalAction(sheet: CharacterSheet, action: TacticalSheetAction, context: TacticalSheetContext): CharacterSheet {
  const derived = calculateCharacter(sheet);
  const freshContext: TacticalSheetContext = {
    ...context,
    currentRC: sheet.currentRC,
    currentLife: sheet.currentLife,
    ownedPerks: sheet.perks,
    level: sheet.grade,
    species: sheet.species,
    weaponKind: sheet.weaponKind,
    kaguneType: sheet.kaguneType,
    isRCSuppressed: isRCSuppressed(sheet.vats),
    weaponActive: sheet.weaponKind !== 'kagune' || (sheet.kaguneActive && sheet.vats.kakuhouUntil <= sheet.vats.turn && !isRCSuppressed(sheet.vats)),
    attributes: derived.permanentAttributes,
    maxLife: derived.maxLife,
    rd: derived.rd,
    control: derived.activeAttributes.controle,
    die: derived.testDie,
    turn: sheet.vats.turn,
    damageSteps: sheet.weaponKind === 'kagune' && sheet.kaguneActive ? derived.kaguneSteps : derived.physicalSteps,
    damageFormula: sheet.weaponKind === 'kagune' && sheet.kaguneActive ? derived.kaguneDamage : derived.physicalDamage,
    penetrationPercent:derived.scaling.penetrationPercent,
    hitBonus: [...(sheet.weaponKind === 'kagune' && sheet.kaguneActive ? derived.kaguneTest : derived.physicalHitTest).matchAll(/[+-]\d+/g)].reduce((sum, match) => sum + Number(match[0]), 0),
  };
  const synced = resolveTactical(sheet.tactical, { type: 'sync-turn', turn: sheet.vats.turn }, freshContext).state;
  const result = resolveTactical(synced, action, freshContext);
  if (result.error) return sheet;
  const cost = Math.max(0, Math.floor(result.rcCost));
  if (cost > sheet.currentRC) return sheet;
  const lifeDelta = Math.floor(result.lifeDelta);
  return {
    ...sheet,
    tactical: result.state,
    currentRC: cost ? Math.max(0, Math.floor(sheet.currentRC) - cost) : sheet.currentRC,
    currentLife: lifeDelta > 0
      ? Math.min(derived.maxLife, Math.max(0, Math.floor(sheet.currentLife) + lifeDelta))
      : lifeDelta < 0 ? Math.max(0, Math.floor(sheet.currentLife) + lifeDelta) : sheet.currentLife,
    ...(result.clearRCSuppression ? { vats: { ...sheet.vats, rcSuppressedUntil: sheet.vats.turn } } : {}),
  };
}
