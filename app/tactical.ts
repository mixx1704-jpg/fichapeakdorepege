import { perkCatalog, catalogGroup } from './perk-catalog';
import type { AttributeKey, Perk } from './data';
import {canonicalPerkId} from './perk-migrations';
import {endgameTacticalPreview} from './endgame-tactics';
import {DAMAGE_MAX_SIDES} from './damage-dice';

export type TacticalSlot = 'action' | 'reaction';
export type TacticalEffect = 'intercept' | 'retaliate' | 'stance' | 'split-heal' | 'detonate' | 'bind' | 'ricochet' | 'last-stand' | 'reflect' | 'drain' | 'transfer' | 'move' | 'capture' | 'push' | 'trap' | 'precision' | 'counter' | 'fuel' | 'blood' | 'redistribute' | 'wave' | 'reroll-damage' | 'store-natural' | 'reroll' | 'ally-reroll' | 'release-rc' | 'seismic' | 'aegis' | 'maximum' | 'flurry' | 'disassemble' | 'mark' | 'exchange';
export interface TacticalTechnique {
  id: string; name: string; level: number; pe: number; rc: number; slot: TacticalSlot; effect: TacticalEffect;
  description: string; percent?: number; usesSession?: boolean; attribute?: AttributeKey; min?: number;
  requiresRC?: boolean; weaponOnly?: boolean; equipmentCompatible?: boolean; existing?: boolean;
}

export const tacticalTechniques: readonly TacticalTechnique[] = perkCatalog.perks.flatMap(p=>p.automation?.tactical?[{...p.automation.tactical,id:p.id,level:p.minGrade||1,pe:p.automation.tactical.existing?0:Array.isArray(p.cost)?p.cost[0]:p.cost}]:[]);
export const tacticalCapstones = tacticalTechniques.filter(t=>t.existing);
export const TACTICAL_PERK_DEFINITIONS: Perk[] = catalogGroup('tactical');

export interface TacticalContext {
  level?:number;species?:string;attributes?:Partial<Record<AttributeKey,number>>;ownedPerks?:Record<string,{rank:number}>|readonly string[];
  currentRC?:number;maxLife?:number;currentLife?:number;damageSteps?:number;hitBonus?:number;rd?:number;control?:number;
  weaponKind?:string;kaguneType?:string;isRCSuppressed?:boolean;weaponActive?:boolean;weaponOnly?:boolean;turn?:number;die?:number;damageFormula?:string;penetrationPercent?:number;
  rcDiscount?:number;rcCostIncrease?:number;rcCostMultiplier?:number;
  damageMultiplier?:number;
}
export interface TacticalInputs {
  target:string;target2:string;incomingDamage:number;damage:number;targetRD:number;target2RD:number;
  healingPool:number;allocation:number;doses:number;poisonPerDose:number;targetMaxLife:number;targetCurrentLife:number;
  targetVigor:number;targetControl:number;roll:number;reroll:number;rollModifier:number;sacrifice:number;spentHit:number;
  damageDice:string;rerollDice:string;confirmed:boolean;
}
export interface TacticalReceipt {id:string;name:string;turn:number;session:number;target:string;text:string;rcCost:number;lifeDelta:number}
export interface TacticalState {
  version:1;turn:number;session:number;inputs:TacticalInputs;usedTurn:Record<string,number>;usedSession:string[];
  retaliation:{amount:number;expires:number;penetrationPercent:number}|null;
  stance:{id:string;until:number;charges:number;mitigationPercent:number}|null;
  trap:{damage:number;expires:number}|null;credit:{amount:number;expires:number}|null;
  aegis:{remaining:number;until:number}|null;mark:{target:string;until:number;charges:number}|null;binding:{target:string;until:number;dc:number}|null;storedNatural:number|null;storedDie:number;latest:TacticalReceipt|null;log:string[];
}
export type TacticalAction = {type:'inputs';patch:Partial<TacticalInputs>}|{type:'use';id:string}|{type:'release-retaliation'}|{type:'resolve-stance'}|{type:'trigger-trap'}|{type:'release-bind'}|{type:'discard-natural'}|{type:'resolve-aegis'}|{type:'use-mark'}|{type:'turn'}|{type:'sync-turn';turn:number}|{type:'combat'}|{type:'session'};
export interface TacticalResolution {state:TacticalState;rcCost:number;lifeDelta:number;error?:string;receipt?:TacticalReceipt;clearRCSuppression?:boolean}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const num=(v:unknown,f=0,min=0,max=1_000_000_000)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return f;const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):f;};
const text=(v:unknown,max=100)=>typeof v==='string'?v.slice(0,max):'';
const owned=(c:TacticalContext,id:string)=>Array.isArray(c.ownedPerks)?c.ownedPerks.includes(id):num((c.ownedPerks as Record<string,{rank:number}>|undefined)?.[id]?.rank)>0;
const hasRC=(c:TacticalContext)=>['ghoul','ghoul-artificial','ghoul-dominante','quinx'].includes(c.species||'')||c.weaponKind==='quinque';
const remainingRD=(rd:number,percent=0)=>num(rd)-Math.floor(num(rd)*Math.min(100,num(percent))/100);
const netDamage=(raw:number,rd:number,percent=0)=>Math.max(0,num(raw)-remainingRD(rd,percent));
export const tacticalId=(suffix:string)=>`r26-tatica-${suffix}`;
export const tacticalOwnedTechniques=(c:TacticalContext={})=>tacticalTechniques.filter(item=>owned(c,item.id)&&(!c.weaponOnly||(item.equipmentCompatible&&!item.requiresRC&&item.rc===0)));

export function emptyTacticalState():TacticalState{return {version:1,turn:1,session:1,inputs:{target:'',target2:'',incomingDamage:0,damage:0,targetRD:0,target2RD:0,healingPool:0,allocation:0,doses:0,poisonPerDose:0,targetMaxLife:100,targetCurrentLife:100,targetVigor:0,targetControl:0,roll:10,reroll:10,rollModifier:0,sacrifice:0,spentHit:0,damageDice:'',rerollDice:'',confirmed:false},usedTurn:{},usedSession:[],retaliation:null,stance:null,trap:null,credit:null,aegis:null,mark:null,binding:null,storedNatural:null,storedDie:20,latest:null,log:[]};}
export function normalizeTacticalState(value?:unknown):TacticalState {
  const raw=record(value),defaults=emptyTacticalState(),input=record(raw.inputs),inputs={...defaults.inputs};
  for(const key of Object.keys(inputs) as (keyof TacticalInputs)[]){if(key==='target'||key==='target2')inputs[key]=text(input[key]);else if(key==='damageDice'||key==='rerollDice')inputs[key]=text(input[key],1000);else if(key==='confirmed')inputs[key]=input[key]===true;else inputs[key]=num(input[key],defaults.inputs[key] as number,key==='rollModifier'?-1_000_000_000:0,key==='doses'?4:key==='spentHit'?20:key==='roll'||key==='reroll'?30:1_000_000_000);}
  const r=record(raw.retaliation),s=record(raw.stance),t=record(raw.trap),credit=record(raw.credit),a=record(raw.aegis),mark=record(raw.mark),b=record(raw.binding),latest=record(raw.latest);
  const turns=Object.entries(record(raw.usedTurn)).reduce((out,[id,turn])=>{const key=canonicalPerkId(id);out[key]=Math.max(out[key]||0,num(turn));return out;},{} as Record<string,number>);
  return {...defaults,turn:num(raw.turn,1,1),session:num(raw.session,1,1),inputs,
    usedTurn:Object.fromEntries(Object.entries(turns).filter(([id])=>['action','reaction',...tacticalTechniques.map(item=>item.id)].includes(id)).map(([id,turn])=>[id,num(turn)])),
    usedSession:Array.isArray(raw.usedSession)?[...new Set(raw.usedSession.filter((id):id is string=>typeof id==='string').map(canonicalPerkId).filter((id):id is string=>typeof id==='string'&&tacticalTechniques.some(item=>item.id===id&&item.usesSession)))]:[],
    retaliation:num(r.amount)>0?{amount:num(r.amount),expires:num(r.expires),penetrationPercent:num(r.penetrationPercent)}:null,
    stance:typeof s.id==='string'&&num(s.until)>0?{id:text(s.id),until:num(s.until),charges:Math.min(2,num(s.charges)),mitigationPercent:Math.min(75,num(s.mitigationPercent))}:null,
    trap:num(t.damage)>0?{damage:num(t.damage),expires:num(t.expires)}:null,credit:num(credit.amount)>0?{amount:Math.min(6,num(credit.amount)),expires:num(credit.expires)}:null,
    aegis:num(a.remaining)>0?{remaining:num(a.remaining),until:num(a.until)}:null,mark:num(mark.charges)>0?{target:text(mark.target),until:num(mark.until),charges:Math.min(2,num(mark.charges))}:null,
    binding:num(b.until)>0?{target:text(b.target),until:num(b.until),dc:num(b.dc,15)}:null,
    storedNatural:raw.storedNatural===null||raw.storedNatural===undefined?null:num(raw.storedNatural,1,1,30),storedDie:[10,20,30].includes(Number(raw.storedDie))?Number(raw.storedDie):20,
    latest:typeof latest.id==='string'?{id:canonicalPerkId(text(latest.id)),name:text(latest.name),turn:num(latest.turn,1,1),session:num(latest.session,1,1),target:text(latest.target),text:text(latest.text,5000),rcCost:num(latest.rcCost),lifeDelta:num(latest.lifeDelta,0,-1_000_000_000)}:null,
    log:Array.isArray(raw.log)?raw.log.filter((line):line is string=>typeof line==='string').slice(-50).map(line=>text(line,5500)):[],
  };
}
function sync(state:TacticalState,turn:number){const next=Math.max(state.turn,num(turn,state.turn,1));return {...state,turn:next,aegis:state.aegis&&state.aegis.until>next?state.aegis:null,mark:state.mark&&state.mark.until>next?state.mark:null,retaliation:state.retaliation&&state.retaliation.expires>next?state.retaliation:null,stance:state.stance&&state.stance.until>next?state.stance:null,trap:state.trap&&state.trap.expires>next?state.trap:null,credit:state.credit&&state.credit.expires>next?state.credit:null,binding:state.binding&&state.binding.until>next?state.binding:null};}
/** Event modifiers apply once; the existing RC credit can still pay the resulting cost in full. */
export function tacticalRCCost(baseCost:number,state:Pick<TacticalState,'credit'>,c:TacticalContext={}) {
  const base=num(baseCost);
  if(!base)return 0;
  const multiplier=Number.isFinite(c.rcCostMultiplier)?Math.max(0,c.rcCostMultiplier!):1;
  const adjusted=Math.max(1,Math.floor((base-num(c.rcDiscount)+num(c.rcCostIncrease))*multiplier));
  return Math.max(0,adjusted-num(state.credit?.amount));
}
export function tacticalAvailability(technique:TacticalTechnique,state:TacticalState,c:TacticalContext={}):string {
  if(!owned(c,technique.id))return 'Técnica não adquirida.';
  if(num(c.level,1,1,20)<technique.level)return `Requer LEVEL ${technique.level}.`;
  if(technique.attribute&&num(c.attributes?.[technique.attribute])<(technique.min||0))return `Requer ${technique.attribute} ${technique.min}.`;
  if(c.weaponOnly&&(!technique.equipmentCompatible||technique.rc>0||technique.requiresRC))return 'Técnica incompatível com esta Quinque.';
  if(technique.weaponOnly&&(c.weaponActive===false||!['kagune','quinque'].includes(c.weaponKind||'')))return 'A arma precisa estar disponível e ativa.';
  if(technique.requiresRC&&!hasRC(c))return 'Exige um organismo ou arma com RC.';
  if(technique.requiresRC&&c.isRCSuppressed)return 'RC suprimido.';
  const cost=tacticalRCCost(technique.rc,state,c);
  if(num(c.currentRC)<cost)return `RC insuficiente: ${cost} necessários.`;
  if(state.usedTurn[technique.slot]===state.turn)return `${technique.slot==='reaction'?'Reação':'Ação'} tática já usada neste turno.`;
  if(technique.usesSession&&state.usedSession.includes(technique.id))return 'Já usada nesta sessão.';
  return '';
}
const diceList=(value:string)=>value.split(/[,;\s]+/).filter(Boolean).slice(0,100).map(Number).filter(n=>Number.isFinite(n)&&Number.isInteger(n)&&n>=1&&n<=DAMAGE_MAX_SIDES);
export function tacticalPreview(technique:TacticalTechnique,state:TacticalState,c:TacticalContext={}) {
  const i=state.inputs,life=num(c.currentLife),max=num(c.maxLife),control=num(c.control??c.attributes?.controle),agility=num(c.attributes?.agilidade);
  const die=[10,20,30].includes(c.die||20)?c.die||20:20;
  const testTotal=i.roll+i.targetVigor+i.targetControl,dc=15+control;
  const source=i.incomingDamage,raw=i.damage,percent=technique.percent||0;
  let description='',lifeDelta=0,amount=0,penetration=0;
  switch(technique.effect){
    case 'intercept':{const taken=Math.floor(source*(100-percent)/100),prevented=source-taken;description=`Aliado protegido: 0 dano. Dano impedido ${prevented}; você recebe ${taken} de ${source} pós-RD.`;lifeDelta=-Math.min(life,taken);amount=taken;break;}
    case 'retaliate':amount=Math.min(Math.floor(source*(percent||50)/100),Math.floor(max*(percent===100?1:.5)));description=`Reserve ${amount} de dano fixo de ${source} já recebidos. Limite ${percent===100?'Vida máxima':'metade da Vida máxima'}; libere até o fim do próximo turno, uma vez.`;penetration=percent===100?50:0;break;
    case 'stance':description=`Deslocamento 0; mitigue ${percent}% dos próximos ${technique.id===tacticalId('bastiao-vivo')?'2 danos':'1 dano'} pós-RD até o próximo turno.`;break;
    case 'split-heal':{const first=Math.min(i.healingPool,i.allocation);description=`Cura já rolada ${i.healingPool}: ${i.target||'Alvo 1'} recebe ${first}; ${i.target2||'Alvo 2'} recebe ${i.healingPool-first}. Total ${i.healingPool}, sem multiplicação.`;amount=i.healingPool;break;}
    case 'detonate':{penetration=percent===200?50:0;amount=Math.floor(i.doses*i.poisonPerDose*(percent===200?2:1));description=`Consumir ${i.doses} doses locais × ${i.poisonPerDose}${percent===200?' × 2':''} = ${amount} bruto. RD ${i.targetRD}, penetração ${penetration}%; dano final ${netDamage(amount,i.targetRD,penetration)}. Encerre manualmente essas mesmas doses no painel de origem.`;break;}
    case 'bind':description=`Resistência ${i.roll} + ${i.targetVigor} + ${i.targetControl} = ${testTotal} contra CD ${dc}: ${testTotal>=dc?'resistiu; livre':'preso por 2 turnos, deslocamento 0'}. Ações e defesas permanecem.`;amount=testTotal<dc?2:0;break;
    case 'ricochet':{const a=Math.floor(raw/2),b=raw-a;description=`Bruto dividido ${a} + ${b} = ${raw}. ${i.target||'Alvo 1'}: ${netDamage(a,i.targetRD)} após RD ${i.targetRD}; ${i.target2||'Alvo 2'}: ${netDamage(b,i.target2RD)} após RD ${i.target2RD}. Sem novos gatilhos.`;amount=raw;break;}
    case 'last-stand':description=`Dano iminente ${source}; Vida ${life} → 1. Golpe precisa ser suficiente para derrubar e sua Vida precisa estar positiva.`;lifeDelta=1-life;amount=1;break;
    case 'reflect':amount=Math.floor(source/2);description=`Dano original já recebido ${source}; refluxo ${amount} bruto − RD ${i.targetRD} = ${netDamage(amount,i.targetRD)}. Sem corrente de reflexos.`;break;
    case 'drain':amount=Math.min(Math.floor(raw*.25),Math.floor(max*.2),Math.max(0,max-life));description=`Dano pós-RD confirmado ${raw}; cura ${amount} (25% do dano, teto ${Math.floor(max*.2)}, Vida faltante ${Math.max(0,max-life)}).`;lifeDelta=amount;break;
    case 'transfer':amount=Math.min(i.healingPool,Math.max(0,life-1));description=`Você perde ${amount} PV; ${i.target||'Aliado'} recebe ${amount} PV. Você permanece com ${life-amount}.`;lifeDelta=-amount;break;
    case 'move':amount=technique.existing?agility*2:2+Math.floor(agility/2);description=`Reposicione até ${amount} espaços antes ou depois da defesa. Sem provocar ataques nesse deslocamento e sem ação ofensiva extra.`;break;
    case 'capture':{const damage=netDamage(raw,i.targetRD);amount=Math.min(damage,Math.max(0,i.targetCurrentLife-1));description=`Dano após RD ${damage}; limite de captura ${Math.max(0,i.targetCurrentLife-1)}. Dano final ${amount}; alvo fica com ${Math.max(0,i.targetCurrentLife-amount)} PV. Captura exige resolução na mesa.`;break;}
    case 'push':amount=testTotal>=dc?0:Math.min(10,Math.floor(raw/Math.max(1,i.targetVigor)));description=`Dano convertido, sem dano ao PV: ${amount} espaços. Resistência ${testTotal} contra CD ${dc}${testTotal>=dc?' impede o deslocamento':''}.`;break;
    case 'trap':amount=Math.floor(raw/2);description=`Armazene armadilha de ${amount} dano bruto até o fim do próximo turno. Disparo gasta uma reação tática e desconta RD integral.`;break;
    case 'precision':{const spent=Math.min(20,i.spentHit,num(c.hitBonus));penetration=Math.min(40,spent*2);amount=spent;description=`Este ataque recebe −${spent} acertos bônus e ${penetration}% de penetração. Bruto ${raw} − RD restante ${remainingRD(i.targetRD,penetration)} = ${netDamage(raw,i.targetRD,penetration)}. Nenhum acerto novo.`;break;}
    case 'counter':amount=Math.floor(raw/2);description=`Contra-ataque ${amount} bruto. Se acertar, dano ${netDamage(amount,i.targetRD)} após RD ${i.targetRD}. O inimigo mantém defesa; não gera novos contra-ataques.`;break;
    case 'fuel':amount=Math.floor(max*.1);lifeDelta=-amount;description=`Sacrifique ${amount} PV; guarde desconto de ${Math.min(6,Math.floor(amount/5))} RC para a próxima técnica tática, até o fim do próximo turno. Reserva de RC não aumenta.`;break;
    case 'blood':{const spent=Math.floor(max*.2);amount=Math.min(spent*2,Math.floor(max/2));lifeDelta=-spent;description=`Sacrifique ${spent} PV e reserve ${amount} de dano fixo para um próximo ataque; consuma uma vez até o fim do próximo turno.`;break;}
    case 'redistribute':{const part=Math.floor(source/3),last=source-2*part;lifeDelta=-Math.min(life,part);amount=source;description=`Você recebe ${part}; ${i.target||'Aliado 1'} recebe ${part}; ${i.target2||'Aliado 2'} recebe ${last}. Total ${source}; aliados precisam concordar e não podem redistribuir de novo.`;break;}
    case 'wave':amount=Math.floor(raw/2);description=`O ataque principal já foi resolvido. Onda no segundo alvo: ${amount} bruto − RD ${i.target2RD} = ${netDamage(amount,i.target2RD)}. Não gera nova onda nem repete o dano principal.`;break;
    case 'reroll-damage':{const rolls=diceList(i.damageDice).sort((a,b)=>a-b),count=Math.floor(rolls.length/2),rerolls=diceList(i.rerollDice).slice(0,count);const original=rolls.reduce((a,b)=>a+b,0),gain=rerolls.reduce((sum,next,index)=>sum+Math.max(0,next-rolls[index]),0);amount=original+gain;description=`Dados originais somam ${original}; refaça ${count} resultados inferiores. Novos dados [${rerolls.join(', ')}]; ganho ${gain}; total dos dados ${amount}. Some uma vez o dano fixo original.`;break;}
    case 'store-natural':amount=state.storedNatural===null?Math.min(die,Math.max(1,i.roll)):Math.max(Math.min(die,Math.max(1,i.roll)),state.storedNatural);description=state.storedNatural===null?`Guarde natural ${amount} de d${die} para outro turno, no mesmo tipo de dado. Ao consumir, não gera crítico.`:`Consuma natural guardado ${state.storedNatural} de d${state.storedDie}; natural atual ${i.roll} → ${amount}. Total ${amount+i.rollModifier}. Não pode gerar crítico.`;break;
    case 'reroll':case 'ally-reroll':amount=Math.max(i.roll,i.reroll);description=`${technique.effect==='ally-reroll'?(i.target||'Aliado'):'Você'}: naturais de d${die} ${i.roll} e ${i.reroll}; mantenha ${amount} + modificador ${i.rollModifier} = ${amount+i.rollModifier}. Uma única rerrolagem, sem cadeia.`;break;
    case 'seismic':case 'aegis':case 'maximum':case 'flurry':case 'disassemble':case 'mark':case 'exchange':{const value=endgameTacticalPreview(technique,state,c);description=value.description;amount=value.amount;lifeDelta=value.lifeDelta;penetration=value.penetration;break;}
    case 'release-rc':description='Encerre sua supressão de RC. A reserva atual permanece a mesma; exaustão por falta de RC não é removida.';break;
  }
  return {description,lifeDelta,amount,penetration,rcCost:tacticalRCCost(technique.rc,state,c),testTotal,dc};
}
export function tacticalSummary(receipt:TacticalReceipt|null):string{return receipt?`${receipt.name} · T${receipt.turn} · sessão ${receipt.session}\n${receipt.rcCost} RC${receipt.lifeDelta?` · Vida ${receipt.lifeDelta>0?'+':''}${receipt.lifeDelta}`:''}\n${receipt.text}\nResolução na mesa: confirme alvos, acerto, defesas e condições. Nenhuma ficha de outro alvo foi alterada.`:'Nenhuma técnica resolvida.';}

export function resolveTactical(input:TacticalState,action:TacticalAction,c:TacticalContext={}):TacticalResolution {
  let state=normalizeTacticalState(input);if(c.turn!==undefined)state=sync(state,c.turn);
  const fail=(error:string):TacticalResolution=>({state,rcCost:0,lifeDelta:0,error});
  if(action.type==='inputs')return {state:normalizeTacticalState({...state,inputs:{...state.inputs,...action.patch}}),rcCost:0,lifeDelta:0};
  if(action.type==='sync-turn'||action.type==='turn')return {state:sync(state,action.type==='turn'?state.turn+1:action.turn),rcCost:0,lifeDelta:0};
  if(action.type==='combat'||action.type==='session')return {state:{...state,turn:1,session:action.type==='session'?state.session+1:state.session,usedTurn:{},usedSession:action.type==='session'?[]:state.usedSession,retaliation:null,stance:null,trap:null,credit:null,aegis:null,mark:null,binding:null,storedNatural:null},rcCost:0,lifeDelta:0};
  let name='',id='',message='',rcCost=0,lifeDelta=0,clearRCSuppression=false;
  const i=state.inputs,life=num(c.currentLife),max=num(c.maxLife);
  if(action.type==='release-bind'){if(!state.binding)return fail('Nenhum alvo preso.');message=`${state.binding.target||'Alvo'} livre por resistência confirmada ou decisão da mesa.`;name='Libertação';id='release-bind';state={...state,binding:null};}
  else if(action.type==='resolve-aegis'){
    if(!state.aegis)return fail('Sem escudo ativo.');if(i.incomingDamage<=0)return fail('Informe um novo impacto pós-RD.');
    const absorbed=Math.min(state.aegis.remaining,i.incomingDamage),taken=i.incomingDamage-absorbed;
    name='Consumir escudo de Cerco Vivo';id='resolve-aegis';message=`Impacto ${i.incomingDamage}: ${absorbed} absorvidos; você recebe ${taken}. Escudo restante ${state.aegis.remaining-absorbed}.`;
    lifeDelta=-Math.min(life,taken);state={...state,aegis:state.aegis.remaining>absorbed?{...state.aegis,remaining:state.aegis.remaining-absorbed}:null,inputs:{...i,incomingDamage:0}};
  }else if(action.type==='use-mark'){
    if(!state.mark)return fail('Sem abertura preparada.');if(!i.confirmed||i.damage<=0)return fail('Informe novo dano e confirme o acerto no alvo marcado.');
    const penetration=25+num(c.penetrationPercent),remaining=state.mark.charges-1;
    name='Consumir abertura de Presa Terminal';id='use-mark';message=`${state.mark.target}: dano ${i.damage} com penetração ${penetration}% contra RD ${i.targetRD} = ${netDamage(i.damage,i.targetRD,penetration)}. Aberturas restantes ${remaining}.`;
    state={...state,mark:remaining?{...state.mark,charges:remaining}:null,inputs:{...i,damage:0,confirmed:false}};
  }
  else if(action.type==='discard-natural'){if(state.storedNatural===null)return fail('Sem natural guardado.');name='Descartar natural';id='discard-natural';message=`Natural ${state.storedNatural} de d${state.storedDie} descartado.`;state={...state,storedNatural:null};}
  else if(action.type==='release-retaliation'){
    if(!state.retaliation)return fail('Sem dano reservado.');if(state.usedTurn.action===state.turn)return fail('Ação tática já usada neste turno.');
    const reserve=state.retaliation;name='Liberar retaliação';id='release-retaliation';message=`Adicione ${reserve.amount} de dano fixo a UM ataque. Penetração desta reserva ${reserve.penetrationPercent}%; some às outras fontes; excesso acima de 100% vira bônus percentual de Passos. Se o ataque falhar, a reserva também foi gasta. Não produz nova reserva.`;state={...state,retaliation:null,usedTurn:{...state.usedTurn,action:state.turn}};
  }else if(action.type==='resolve-stance'){
    if(!state.stance)return fail('Sem postura ativa.');if(state.stance.charges<=0)return fail('Proteção da postura esgotada; deslocamento continua 0 até seu próximo turno.');if(i.incomingDamage<=0)return fail('Informe o dano pós-RD recebido.');
    const taken=Math.floor(i.incomingDamage*(100-state.stance.mitigationPercent)/100),reduced=i.incomingDamage-taken;name='Resolver impacto na postura';id='resolve-stance';message=`Dano pós-RD ${i.incomingDamage}: ${reduced} impedidos e ${taken} recebidos. Deslocamento continua 0 até seu próximo turno.`;lifeDelta=-Math.min(life,taken);state={...state,stance:{...state.stance,charges:state.stance.charges-1},inputs:{...state.inputs,incomingDamage:0}};
  }else if(action.type==='trigger-trap'){
    if(!state.trap)return fail('Sem armadilha preparada.');if(!i.confirmed)return fail('Confirme que o alvo atravessou a armadilha.');if(state.usedTurn.reaction===state.turn)return fail('Reação tática já usada neste turno.');
    name='Disparar armadilha';id='trigger-trap';message=`Armadilha consumida: ${state.trap.damage} bruto − RD ${i.targetRD} = ${netDamage(state.trap.damage,i.targetRD)}. Um alvo; não dispara outra armadilha.`;state={...state,trap:null,usedTurn:{...state.usedTurn,reaction:state.turn}};
  }else if(action.type==='use'){
    const technique=tacticalTechniques.find(item=>item.id===action.id);if(!technique)return fail('Técnica desconhecida.');const blocked=tacticalAvailability(technique,state,c);if(blocked)return fail(blocked);
    const preview=tacticalPreview(technique,state,c),effect=technique.effect;
    if(['seismic','maximum','flurry','disassemble','exchange','mark'].includes(effect)&&!i.confirmed)return fail('Confirme o acerto ou consentimento exigido na mesa.');
    if(['seismic','flurry','disassemble'].includes(effect)&&i.damage<=0)return fail('Informe um novo dano bruto positivo.');
    if(effect==='flurry'&&state.usedTurn.reaction===state.turn)return fail('A sequência exige também sua reação tática disponível.');
    if(effect==='aegis'&&(state.aegis||preview.amount<=0))return fail('O escudo exige Vida máxima positiva e nenhum escudo anterior.');
    if(effect==='maximum'&&preview.amount<=0)return fail('A fórmula atual da arma precisa ter dano calculável.');
    if(effect==='mark'&&(!i.target.trim()||state.mark))return fail('Informe um alvo e encerre ou consuma a marca anterior.');
    if(effect==='exchange'&&[i.roll,i.reroll].some(n=>n<1||n>(c.die||20)))return fail('Informe dois naturais válidos do mesmo dado.');
    if(['intercept','retaliate','reflect','redistribute','last-stand'].includes(effect)&&i.incomingDamage<=0)return fail('Informe o dano pós-RD.');
    if(['bind','ricochet','drain','capture','push','counter','wave','redistribute'].includes(effect)&&!i.confirmed)return fail('Confirme na mesa o acerto, a defesa ou o consentimento exigido.');
    if(['retaliate','blood'].includes(effect)&&state.retaliation)return fail('Libere ou espere expirar a reserva atual antes de criar outra.');
    if(effect==='last-stand'&&(life<=0||i.incomingDamage<life))return fail('Exige Vida positiva e um dano que derrubaria você.');
    if(['transfer','split-heal'].includes(effect)&&i.healingPool<=0)return fail('Informe o total de PV para distribuir.');
    if(['ricochet','drain','capture','push','trap','precision','counter','wave'].includes(effect)&&i.damage<=0)return fail('Informe um dano positivo já rolado.');
    if(effect==='detonate'&&(i.doses<=0||i.poisonPerDose<=0))return fail('Informe até 4 doses locais e o dano por dose.');
    if(effect==='precision'&&preview.amount<=0)return fail('Informe acertos disponíveis para sacrificar, até 20.');
    if(effect==='capture'&&i.targetCurrentLife<=0)return fail('O alvo já está sem Vida.');
    if(['fuel','blood'].includes(effect)&&(preview.lifeDelta>=0||life+preview.lifeDelta<1))return fail('O sacrifício precisa ser positivo e deixar pelo menos 1 PV.');
    if(effect==='fuel'&&state.credit)return fail('Já existe um desconto reservado.');
    if(effect==='trap'&&state.trap)return fail('Já existe uma armadilha preparada.');
    if(['retaliate','trap'].includes(effect)&&preview.amount<=0)return fail('O valor informado não produz uma reserva positiva.');
    if(effect==='fuel'&&Math.floor(-preview.lifeDelta/5)<=0)return fail('O sacrifício é insuficiente para gerar desconto de RC.');
    if(effect==='release-rc'&&!c.isRCSuppressed)return fail('Não há supressão de RC ativa.');
    if(['bind','push'].includes(effect)&&(i.roll<1||i.roll>20))return fail('A resistência do alvo usa um natural entre 1 e 20.');
    const die=[10,20,30].includes(c.die||20)?c.die||20:20;
    if(['store-natural','reroll','ally-reroll'].includes(effect)&&(i.roll<1||i.roll>die||((effect==='reroll'||effect==='ally-reroll')&&(i.reroll<1||i.reroll>die))))return fail(`Informe resultados naturais entre 1 e ${die}.`);
    if(effect==='store-natural'&&state.storedNatural!==null&&state.storedDie!==die)return fail(`O natural guardado é de d${state.storedDie}; use com esse dado ou descarte a reserva.`);
    if(effect==='reroll-damage'){const count=Math.floor(diceList(i.damageDice).length/2);if([i.damageDice,i.rerollDice].some(list=>list.split(/[,;\s]+/).filter(Boolean).some(value=>!Number.isInteger(Number(value))||Number(value)<1||Number(value)>DAMAGE_MAX_SIDES)))return fail(`Os dados de dano precisam ter resultados inteiros de 1 a ${DAMAGE_MAX_SIDES}.`);if(count<1||diceList(i.rerollDice).length<count)return fail('Informe pelo menos 2 dados originais e uma nova rolagem para cada dado a refazer.');}
    name=technique.name;id=technique.id;message=preview.description;rcCost=preview.rcCost;lifeDelta=preview.lifeDelta;
    state={...state,usedTurn:{...state.usedTurn,[technique.slot]:state.turn,[technique.id]:state.turn},usedSession:technique.usesSession?[...state.usedSession,technique.id]:state.usedSession};
    if(technique.rc>0&&state.credit)state={...state,credit:null};
    if(effect==='retaliate'||effect==='blood')state={...state,retaliation:{amount:preview.amount,expires:state.turn+2,penetrationPercent:preview.penetration}};
    if(effect==='stance')state={...state,stance:{id:technique.id,until:state.turn+1,charges:technique.id===tacticalId('bastiao-vivo')?2:1,mitigationPercent:technique.percent||50}};
    if(effect==='detonate')state={...state,inputs:{...state.inputs,doses:0}};
    if(effect==='bind'&&preview.amount>0)state={...state,binding:{target:i.target,until:state.turn+2,dc:preview.dc}};
    if(effect==='trap')state={...state,trap:{damage:preview.amount,expires:state.turn+2}};
    if(effect==='fuel')state={...state,credit:{amount:Math.min(6,Math.floor(-lifeDelta/5)),expires:state.turn+2}};
    if(effect==='store-natural')state={...state,storedNatural:state.storedNatural===null?preview.amount:null,storedDie:die};
    if(effect==='release-rc')clearRCSuppression=true;
    if(effect==='aegis')state={...state,aegis:{remaining:preview.amount,until:state.turn+3}};
    if(effect==='mark')state={...state,mark:{target:i.target,until:state.turn+2,charges:2}};
    if(effect==='flurry')state={...state,usedTurn:{...state.usedTurn,reaction:state.turn}};
    if(['seismic','flurry','disassemble'].includes(effect))state={...state,inputs:{...state.inputs,damage:0}};
    if(['intercept','retaliate','reflect','redistribute','last-stand'].includes(effect))state={...state,inputs:{...state.inputs,incomingDamage:0}};
    if(['split-heal','transfer'].includes(effect))state={...state,inputs:{...state.inputs,healingPool:0,allocation:0}};
    if(['ricochet','drain','capture','push','trap','precision','counter','wave'].includes(effect))state={...state,inputs:{...state.inputs,damage:0}};
    state={...state,inputs:{...state.inputs,confirmed:false}};
  }else return fail('Ação desconhecida.');
  const receipt:TacticalReceipt={id,name,turn:state.turn,session:state.session,target:i.target,text:message,rcCost,lifeDelta};
  state={...state,latest:receipt,log:[...state.log,tacticalSummary(receipt)].slice(-50)};
  return {state,rcCost,lifeDelta,receipt,...(clearRCSuppression?{clearRCSuppression:true}:{})};
}
