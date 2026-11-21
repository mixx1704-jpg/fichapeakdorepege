import { calculateCharacter, kaguneFamiliesForSheet, type CharacterSheet } from './character';

/** Both previews use copies of the same sheet; selecting a preview never changes a purchase. */
export function crystallizationComparison(sheet: CharacterSheet) {
  const rank=sheet.effects.cristalizacao?.rank||0;
  if(!rank||sheet.weaponKind!=='kagune'||!kaguneFamiliesForSheet(sheet).has('Ukaku'))return null;
  const preview=(active:boolean)=>calculateCharacter({...sheet,kaguneActive:true,damageContext:{...sheet.damageContext,active:{...sheet.damageContext.active,'kagune:cristalizacao':active}}});
  const normal=preview(false),crystallized=preview(true);
  return {rank,normal,crystallized,steps:crystallized.kaguneSteps-normal.kaguneSteps,modifier:crystallized.kaguneDamageModifier-normal.kaguneDamageModifier,active:!!sheet.damageContext.active['kagune:cristalizacao'],available:sheet.kaguneActive&&!normal.rcSuppressed&&sheet.vats.kakuhouUntil<=sheet.vats.turn};
}
