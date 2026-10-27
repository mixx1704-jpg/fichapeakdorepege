export const RETIRED_MIND_PERK = 'r26-exp-controle-soberano-da-propria-mente';
export const COMMAND_PERK = 'r26-passos-controle-comando-catastrofe';
export const canonicalPerkId = (id:string) => id === RETIRED_MIND_PERK ? COMMAND_PERK : id;

/** One surviving purchase, including when both historical entries were acquired. */
export function normalizePerkPurchases<T extends {rank:number}>(input?:Record<string,T>):Record<string,T> {
  const result={...(input||{})};
  const retired=result[RETIRED_MIND_PERK],current=result[COMMAND_PERK];
  if(retired){
    if(retired.rank>0||current?.rank>0)result[COMMAND_PERK]={...retired,...current,rank:1};
    delete result[RETIRED_MIND_PERK];
  }
  return result;
}
