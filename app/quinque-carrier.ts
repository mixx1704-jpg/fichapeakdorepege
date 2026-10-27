import { attributeKeys, type AttributeKey } from './data';
import { calculateCharacter, kaguneFamiliesForSheet, type CharacterSheet } from './character';
import { calculateReworkBonuses } from './rework-perks';
import { normalizePerkPurchases } from './perk-migrations';

const blankAttributes = () => Object.fromEntries(attributeKeys.map(key => [key, 0])) as Record<AttributeKey, number>;
export type QuinqueCarrierBonuses = {
  kind: 'quinque-carrier';
  attributes: Record<AttributeKey, number>;
  attributeDice: Record<AttributeKey, number>;
  attributeChecks: Record<AttributeKey, number>;
  hit: number;
  block: number;
  dodge: number;
  physicalSteps: number;
};
export function emptyQuinqueCarrierBonuses(): QuinqueCarrierBonuses {
  return { kind: 'quinque-carrier', attributes: blankAttributes(), attributeDice: blankAttributes(), attributeChecks: blankAttributes(), hit: 0, block: 0, dodge: 0, physicalSteps: 0 };
}
export type QuinqueCarrier = CharacterSheet | QuinqueCarrierBonuses;

/** Recomputed from the carrier; these bonuses are never written into the weapon. */
export function quinqueCarrierBonuses(carrier?: QuinqueCarrier): QuinqueCarrierBonuses {
  if (!carrier) return emptyQuinqueCarrierBonuses();
  if ('kind' in carrier && carrier.kind === 'quinque-carrier') return carrier;
  const owner = carrier as CharacterSheet;
  const derived = calculateCharacter(owner);
  const bonuses = emptyQuinqueCarrierBonuses();
  for (const key of attributeKeys) {
    bonuses.attributes[key] = Math.floor(derived.activeAttributes[key] - Math.floor(owner.baseAttributes[key] + derived.speciesBonuses[key]));
    bonuses.attributeDice[key] = Math.floor(owner.extraDice[key] + derived.permanentDice[key]);
    bonuses.attributeChecks[key] = Math.floor(derived.reworkBonuses.attributeChecks[key]);
  }
  const weaponActive = owner.weaponKind !== 'nenhum' && !derived.rcSuppressed && owner.vats.kakuhouUntil <= owner.vats.turn && (owner.kaguneActive || (Boolean(owner.effects['forma-versatil']) && kaguneFamiliesForSheet(owner).has('Koukaku') && owner.damageContext.koukakuMode !== 'normal'));
  // A purchase affecting both attack channels is one source, not two purchases.
  for (const [id, selection] of Object.entries(normalizePerkPurchases(owner.perks))) {
    const perk = calculateReworkBonuses({ perks: { [id]: selection }, attributes: derived.activeAttributes, weaponActive, level: owner.grade, species: owner.species, kaguneTypes: [...kaguneFamiliesForSheet(owner)] });
    bonuses.hit += !perk.physicalHit ? perk.kaguneHit : !perk.kaguneHit ? perk.physicalHit : Math.max(perk.physicalHit, perk.kaguneHit);
    bonuses.block += perk.block;
    bonuses.dodge += perk.dodge;
  }
  for (const skill of owner.customSkills) {
    if (skill.activation === 'active' && !skill.enabled) continue;
    for (const effect of skill.effects) if (effect.type === 'hit-dice') bonuses.hit += Number(effect.value) || 0;
  }
  const activeInEitherAttack = (id: string) => Boolean(owner.damageContext.active[`physical:${id}`] || owner.damageContext.active[`kagune:${id}`]);
  if (owner.archetype === 'O Justiceiro' && activeInEitherAttack('justiceiro')) bonuses.hit += 1;
  if (owner.perks['entre-costelas'] && activeInEitherAttack('entre-costelas')) bonuses.hit += 1;
  if (owner.perks['golpe-preciso'] && activeInEitherAttack('golpe-preciso')) bonuses.hit -= Math.max(0, owner.damageContext.preciseHitDice);
  if (owner.perks['equacao-letal'] && activeInEitherAttack('equacao-letal')) bonuses.hit -= Math.min(2, Math.max(0, owner.damageContext.equationLethalDice));
  bonuses.block += derived.customSkillBonuses.blockDice + derived.kakujaBonuses.block + (owner.perks['corpo-pesado'] ? 1 : 0);
  bonuses.dodge += derived.customSkillBonuses.dodgeDice + derived.kakujaBonuses.dodge + (owner.perks['corpo-leve'] ? 1 : 0) + (owner.perks['cem-por-cento'] ? 1 : 0) + (owner.perks.ceifador ? 2 : 0);
  // Percentage perks produce additional successes, while the carrier's base,
  // racial Control/Level and sanity die themselves remain outside this transfer.
  bonuses.hit += Math.max(derived.scaling.bonuses.physicalHit, derived.scaling.bonuses.kaguneHit);
  bonuses.block += derived.scaling.bonuses.block;
  bonuses.dodge += derived.scaling.bonuses.dodge;
  bonuses.hit = Math.floor(bonuses.hit);
  bonuses.block = Math.floor(bonuses.block);
  bonuses.dodge = Math.floor(bonuses.dodge);
  bonuses.physicalSteps = Math.floor(derived.physicalSteps);
  return bonuses;
}

export function appendQuinqueSuccesses(test: string, successes: number): string {
  const extra = Math.floor(successes);
  return `${test}${extra > 0 ? `+${extra}` : extra < 0 ? extra : ''}`;
}
