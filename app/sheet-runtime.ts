import {calculateCharacter,type CharacterSheet} from './character';
import {preservePeriodicCondemnation,processPeriodicEvent,type PeriodicEvent,type PeriodicRolls} from './periodics';
import type {PackConditions} from './pack-effects';
import type {VatsConfig} from './vats-engine';

/** Temporary increases never refill resources. Shrinking a maximum only clamps the current value. */
export function settleCharacterUpdate(previous:CharacterSheet,next:CharacterSheet):CharacterSheet {
  if(previous===next)return previous;
  const before=calculateCharacter(previous),after=calculateCharacter(next);
  const bounded=(value:number,max:number)=>Math.max(0,Math.min(value,max));
  return preservePeriodicCondemnation(previous,{
    ...next,
    currentLife:after.maxLife<before.maxLife?bounded(next.currentLife,after.maxLife):next.currentLife,
    currentSanity:after.maxSanity<before.maxSanity?bounded(next.currentSanity,after.maxSanity):next.currentSanity,
    currentRC:after.maxRC<before.maxRC?bounded(next.currentRC,after.maxRC):next.currentRC,
  },after.maxLife);
}

export function periodicConfigForSheet(sheet:CharacterSheet,base:VatsConfig):VatsConfig {
  const d=calculateCharacter(sheet),pack=d.kakujaManifested?d.kakujaPackEffects:d.packEffects;
  return {...base,maxLife:d.maxLife,currentLife:sheet.currentLife,rc:sheet.currentRC,hunger:sheet.hunger,rd:d.rd,durability:d.kagunePartDurability,vigor:d.activeAttributes.vigor,incomingDamageMultiplier:pack.incomingDamageMultiplier};
}

export function applyPeriodicSheetEvent(sheet:CharacterSheet,kind:PeriodicEvent['kind'],base:VatsConfig,rolls:PeriodicRolls,conditions?:PackConditions):CharacterSheet {
  const next=conditions?{...sheet,packConditions:conditions}:sheet;
  const derived=calculateCharacter(next);
  return processPeriodicEvent(next,{kind,config:periodicConfigForSheet(next,base),conditions,rolls,eligiblePerkIds:(derived.kakujaManifested?derived.kakujaPackEffects:derived.packEffects).eligiblePerkIds,resolveConfig:candidate=>periodicConfigForSheet(candidate as CharacterSheet,base)});
}
