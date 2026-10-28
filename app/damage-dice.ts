export const DAMAGE_MIN_SIDES = 4;
export const DAMAGE_MAX_SIDES = 100;
export const DAMAGE_SIDES_PER_STEP = 2;
export const DAMAGE_STEPS_PER_CYCLE = (DAMAGE_MAX_SIDES - DAMAGE_MIN_SIDES) / DAMAGE_SIDES_PER_STEP + 1;

/** One-based ladder: d4, d6, ... d100, then add another die from d4. */
export function damageDiceGroups(steps: number): Array<{ sides: number; count: number }> {
  const safeSteps = Number.isFinite(steps) ? Math.max(1, Math.floor(steps)) : 1;
  const fullDice = Math.floor(safeSteps / DAMAGE_STEPS_PER_CYCLE);
  const remainder = safeSteps % DAMAGE_STEPS_PER_CYCLE;
  const groups: Array<{ sides: number; count: number }> = [];
  if (fullDice) groups.push({ sides: DAMAGE_MAX_SIDES, count: fullDice });
  if (remainder) groups.push({ sides: DAMAGE_MIN_SIDES + (remainder - 1) * DAMAGE_SIDES_PER_STEP, count: 1 });
  return groups;
}

/** Converts whole damage steps into the shared ladder and applies fixed damage once. */
export function formatDamage(steps: number, modifier: number) {
  modifier = Number.isFinite(modifier) ? Math.floor(modifier) : 0;
  const dice = damageDiceGroups(steps).map(({ sides, count }) => `${count}d${sides}`).join("+");
  return `${dice}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`;
}

/** Statistics of the generated damage expression; fixed damage is counted once. */
export function damageStatistics(formula:string){
  let diceMaximum=0,flat=0,mean=0,diceCount=0;
  for(const match of formula.replace(/\s/g,'').matchAll(/([+-]?)(?:(\d+)d(\d+)|(\d+))/g)){
    const sign=match[1]==='-'?-1:1;
    if(match[2]){const count=Math.min(10000,Number(match[2])),sides=Math.min(1000,Number(match[3]));diceMaximum+=sign*count*sides;mean+=sign*count*(sides+1)/2;diceCount+=count;}
    else{const value=sign*Number(match[4]);flat+=value;mean+=value;}
  }
  return {diceMaximum,flat,maximum:Math.max(0,diceMaximum+flat),mean:Math.max(0,mean),diceCount};
}
