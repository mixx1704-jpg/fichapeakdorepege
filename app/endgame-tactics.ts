import { catalogGroup } from './perk-catalog';
import type {TacticalTechnique,TacticalState,TacticalContext} from './tactical';
import {damageStatistics} from './damage-dice';

export const additionalEndgameTactics: TacticalTechnique[] = catalogGroup('endgame-tactical').flatMap(p=>p.automation?.tactical?[p.automation.tactical]:[]);

export function endgameTacticalPreview(t:TacticalTechnique,s:TacticalState,c:TacticalContext){
  const i=s.inputs,n=(value:unknown)=>Math.max(0,Math.floor(Number(value)||0));
  const rd=(raw:number,armor:number,pen=0)=>Math.max(0,raw-n(armor)+Math.floor(n(armor)*Math.min(100,pen)/100));
  let description='',amount=0;
  switch(t.effect){
    case 'seismic':amount=Math.floor(i.damage*.75);description=`Onda secundária: ${amount} bruto − RD ${i.target2RD} = ${rd(amount,i.target2RD)} dano. Resistência ${i.roll+i.targetVigor+i.targetControl} contra ${15+n(c.control)}: ${i.roll+i.targetVigor+i.targetControl>=15+n(c.control)?'sem recuo':'recuo de até 6 espaços'}. Golpe principal já resolvido; sem reaplicá-lo.`;break;
    case 'aegis':amount=Math.floor(n(c.maxLife)*.4);description=`Escudo próprio: ${amount} PV absorvíveis, até o início de T${s.turn+3}. Vida atual permanece igual ao preparar. Informe cada impacto pós-RD para consumir o escudo.`;break;
    case 'maximum':{const maximum=damageStatistics(c.damageFormula||'').maximum;const multiplier=Number.isFinite(c.damageMultiplier)?Math.min(2,Math.max(0,c.damageMultiplier!)):1;amount=Math.floor(maximum*multiplier);description=`Fórmula atual ${c.damageFormula||'indisponível'}: máximo bruto ${amount}${multiplier!==1?` (${maximum} × ${multiplier}, arredondado para baixo)`:''}; após RD ${i.targetRD}, dano ${rd(amount,i.targetRD)}. Um único golpe, sem reaplicar crítico ou retaliação.`;break;}
    case 'flurry':amount=Math.floor(i.damage*.7);description=`Dois ataques independentes: ${amount} bruto por golpe; se ambos acertarem, ${2*amount} bruto total. Contra RD ${i.targetRD}, ${rd(amount,i.targetRD)} por acerto. Deslocamento entre golpes até ${n(c.attributes?.agilidade)} espaços. Ação e reação táticas consumidas.`;break;
    case 'disassemble':{const half=Math.floor(i.damage/2);amount=i.damage;description=`Bruto conservado ${half}+${i.damage-half}=${i.damage}. Corpo: ${rd(half,i.targetRD)} após RD ${i.targetRD}; Dureza da arma: ${rd(i.damage-half,i.target2RD)} após RD própria ${i.target2RD}. Registre os dois danos nos seus alvos, sem duplicar na Vida geral.`;break;}
    case 'mark':amount=2;description=`${i.target||'Alvo'} exposto: duas aberturas até o início de T${s.turn+2}; cada uma usa 25% de penetração, somada às outras fontes, sem teto. É necessário consumir cada ataque no controlador.`;break;
    case 'exchange':amount=i.roll;description=`Troca consentida de naturais do mesmo d${c.die||20}: o aliado usa ${i.roll}, você usa ${i.reroll}. Cada um soma seu próprio modificador de defesa. Não gera crítico ou nova rolagem; aplique nas duas fichas.`;break;
  }
  return {description,amount,lifeDelta:0,penetration:0};
}
