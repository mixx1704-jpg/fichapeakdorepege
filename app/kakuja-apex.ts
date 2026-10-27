import type {KakujaState} from './kakuja-data';
export type KakujaApexState={damage:number;spend:number;confirmed:boolean;receipt:string};
export type KakujaApexAction={type:'input';patch:Partial<KakujaApexState>}|{type:'attack'}|{type:'absorb'};
const n=(v:unknown,max=1_000_000_000)=>Math.min(max,Math.max(0,Math.floor(Number.isFinite(Number(v))?Number(v):0)));
export function normalizeKakujaApex(v?:Partial<KakujaApexState>):KakujaApexState{return {damage:n(v?.damage),spend:n(v?.spend??10,10),confirmed:v?.confirmed===true,receipt:typeof v?.receipt==='string'?v.receipt.slice(0,3000):''};}
export function resolveKakujaApex(state:KakujaState,action:KakujaApexAction,context:{level:number;species:string;suppressed?:boolean}):{state:KakujaState;error?:string}{
  const apex=normalizeKakujaApex(state.apex),fail=(error:string)=>({state,error});
  if(action.type==='input')return {state:{...state,apex:normalizeKakujaApex({...apex,...action.patch})}};
  if(context.level<20||!['ghoul','ghoul-artificial','ghoul-dominante'].includes(context.species)||!state.active||!state.complete||state.cannibalPE<60||context.suppressed)return fail('Exige LEVEL 20 e Kakuja completa manifestada, sem supressão de RC.');
  const id=action.type==='attack'?'k20-deus-devorador':'k20-soberano-eterno';
  if(!state.selectedPerks.includes(id))return fail('Perk não adquirida.');
  if(!apex.confirmed||apex.damage<=0)return fail('Informe um novo dano e confirme o golpe.');
  if(apex.spend<1||state.currentReserve<apex.spend)return fail('Reserva da Kakuja insuficiente.');
  const percent=action.type==='attack'?Math.floor(apex.spend*2.5):50;
  const amount=action.type==='attack'?Math.floor(apex.damage*percent/100):Math.min(Math.floor(apex.damage/2),apex.spend*10);
  const receipt=action.type==='attack'?`Deus Devorador: ${apex.damage} bruto + ${percent}% (${amount}) = ${apex.damage+amount} bruto antes da RD. ${apex.spend} RC da reserva Kakuja gastos. Um golpe; não reaplique a amplificação neste resultado.`:`Soberano Eterno: impacto pós-RD ${apex.damage}; ${amount} absorvidos (máximo 50% e ${apex.spend*10}); restam ${apex.damage-amount} para aplicar à Vida ou região atingida. ${apex.spend} RC da reserva Kakuja gastos. Aplique o dano restante uma vez no VATS.`;
  return {state:{...state,currentReserve:Math.max(0,Math.floor(state.currentReserve)-apex.spend),apex:{...apex,damage:0,confirmed:false,receipt}}};
}
