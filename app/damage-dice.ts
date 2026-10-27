/** Converts whole damage steps into the sheet's shared d4-to-d12 ladder. */
export function formatDamage(steps: number, modifier: number) {
  modifier = Number.isFinite(modifier) ? Math.floor(modifier) : 0;
  const safeSteps = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  const fullD12 = Math.floor(safeSteps / 5);
  const remainder = safeSteps % 5;
  const sides = [4, 6, 8, 10, 12][remainder];
  const groups = new Map<number, number>();
  if (fullD12) groups.set(12, fullD12);
  groups.set(sides, (groups.get(sides) || 0) + 1);
  const dice = [...groups.entries()].filter(([, count]) => count > 0).sort((a, b) => b[0] - a[0]).map(([side, count]) => `${count}d${side}`).join("+") || "1d4";
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
