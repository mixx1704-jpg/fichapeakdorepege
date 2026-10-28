import type { AttributeKey, Perk } from './data';
import {canonicalPerkId} from './perk-migrations';
import {additionalEndgameTactics,endgameTacticalPreview} from './endgame-tactics';
import {DAMAGE_MAX_SIDES} from './damage-dice';

export type TacticalSlot = 'action' | 'reaction';
export type TacticalEffect = 'intercept' | 'retaliate' | 'stance' | 'split-heal' | 'detonate' | 'bind' | 'ricochet' | 'last-stand' | 'reflect' | 'drain' | 'transfer' | 'move' | 'capture' | 'push' | 'trap' | 'precision' | 'counter' | 'fuel' | 'blood' | 'redistribute' | 'wave' | 'reroll-damage' | 'store-natural' | 'reroll' | 'ally-reroll' | 'release-rc' | 'seismic' | 'aegis' | 'maximum' | 'flurry' | 'disassemble' | 'mark' | 'exchange';
export interface TacticalTechnique {
  id: string; name: string; level: number; pe: number; rc: number; slot: TacticalSlot; effect: TacticalEffect;
  description: string; percent?: number; usesSession?: boolean; attribute?: AttributeKey; min?: number;
  requiresRC?: boolean; weaponOnly?: boolean; equipmentCompatible?: boolean; existing?: boolean;
}

const techniques: TacticalTechnique[] = [];
function add(id: string, name: string, level: number, pe: number, rc: number, slot: TacticalSlot, effect: TacticalEffect, description: string, extra: Partial<TacticalTechnique> = {}) {
  techniques.push({ id: `r26-tatica-${id}`, name, level, pe, rc, slot, effect, description, equipmentCompatible: rc === 0 && ['ricochet','move','capture','push','precision','counter'].includes(effect), requiresRC: rc > 0, ...extra });
}
add('guarda-interposta','Guarda Interposta',2,6,0,'reaction','intercept','Intercepte um dano pós-RD que atingiria um aliado. Você recebe metade, arredondada para baixo, e a outra metade é impedida; o aliado não recebe esse dano.',{percent:50});
add('reserva-dor','Reserva de Dor',3,8,0,'reaction','retaliate','Informe um dano pós-RD que você já recebeu. Guarde 50%, até metade de sua Vida máxima, como dano fixo para um único próximo ataque. A reserva é consumida ao liberar e expira no início do segundo turno seguinte. Não aplica de novo o dano recebido.',{percent:50});
add('postura-ancora','Postura de Âncora',4,10,0,'action','stance','Até seu próximo turno, seu deslocamento fica 0. Contra o próximo dano pós-RD recebido, reduza 50%. Use Resolver impacto uma vez; não altera sua RD nem concede ataques.',{percent:50});
add('partilha-vital','Partilha Vital',4,9,0,'action','split-heal','Informe uma cura já rolada e ainda não aplicada. Distribua entre dois alvos: o primeiro recebe o valor escolhido e o segundo a sobra. A soma nunca ultrapassa a cura original. O resultado é um recibo para as fichas dos destinatários.');
add('detonacao-toxica','Detonação Tóxica',5,12,3,'action','detonate','Consuma até 4 doses registradas neste controlador. Dano bruto = doses × dano por dose informado; desconte a RD inteira do alvo. Copie o resultado e encerre manualmente as mesmas doses no painel original; não produz novo veneno.',{weaponOnly:true});
add('laco-constritor','Laço Constritor',5,12,2,'action','bind','Depois de confirmar um acerto, o alvo testa 1d20 + Vigor + Controle contra 15 + seu Controle. Falha prende o alvo por 2 turnos: deslocamento 0, sem retirar ações ou defesas. Ele pode gastar sua ação para repetir o teste; use Libertação para registrar o sucesso.',{weaponOnly:true});
add('ricochete-duplo','Ricochete Duplo',6,14,0,'action','ricochet','Depois de confirmar um ataque, divida o dano bruto já rolado entre dois alvos: metade para o primeiro e a sobra para o segundo. Cada alvo desconta sua própria RD inteira. Não repita críticos, veneno ou ricochetes nesta divisão.');
add('ultimo-pulso','Último Pulso',7,18,6,'reaction','last-stand','Uma vez por sessão, quando um dano pós-RD derrubaria você de Vida positiva para 0, permaneça com 1 PV. Informe o dano antes de aplicá-lo; não ressuscita quem já está com 0 PV.',{usesSession:true});
add('baluarte-aliado','Baluarte Aliado',8,20,0,'reaction','intercept','Intercepte um dano pós-RD de um aliado: receba 25%, arredondados para baixo, e impeça o restante. O aliado não recebe esse dano. A redução acontece uma vez, depois da RD original.',{percent:75});
add('refluxo-dor','Refluxo de Dor',8,18,3,'reaction','reflect','Após um dano pós-RD já recebido, devolva metade como um impacto contra o atacante; desconte a RD inteira dele. Não causa novamente o dano original, não pode gerar outro Refluxo e não conta como novo ataque.',{weaponOnly:true});
add('drenagem-ferida','Drenagem da Ferida',9,22,4,'action','drain','Confirme um acerto e informe o dano pós-RD efetivamente causado. Recupere 25% desse dano, limitado a 20% da sua Vida máxima e à Vida que falta. Uma resolução por turno; não conta cura de outro painel.',{percent:25,weaponOnly:true});
add('transfusao-campo','Transfusão de Campo',9,20,0,'action','transfer','Transfira uma quantidade escolhida de sua própria Vida para um aliado por contato. Você precisa permanecer com pelo menos 1 PV; o aliado recebe exatamente o que você perdeu. O recibo não aplica cura na ficha dele.');
add('recuo-coberto','Recuo Coberto',10,24,0,'reaction','move','Mova 2 + metade da Agilidade em espaços antes ou depois de uma defesa, sem provocar ataques durante esse movimento. É reposicionamento, não uma ação ou ataque adicional.',{percent:50});
add('captura-viva','Captura Viva',10,24,0,'action','capture','Confirme o acerto e informe Vida atual e RD do alvo. Cause o dano normal, mas limite o dano final para deixá-lo com pelo menos 1 PV. Se conseguir esse limite, a captura ainda exige confirmação da mesa; não ignora defesas.');
add('arranco-impacto','Arranco de Impacto',11,28,0,'action','push','Após um acerto confirmado, converta todo o dano bruto em deslocamento forçado: piso(dano ÷ máximo(1, Vigor do alvo)), até 10 espaços. Não causa dano de ataque. O alvo pode resistir com Vigor + Controle contra 15 + seu Controle.');
add('campo-espinhos','Campo de Espinhos',12,30,4,'action','trap','Guarde metade de um dano bruto rolado como armadilha até o início do segundo turno seguinte. Ao confirmar que um inimigo atravessou a área, gaste sua reação para disparar uma vez, descontando a RD inteira dele. A armadilha é consumida.',{weaponOnly:true});
add('acerto-cirurgico','Acerto Cirúrgico',12,30,0,'action','precision','Para um ataque, sacrifique até 20 de seus acertos bônus: cada acerto sacrificado concede 2% de penetração, até 40%. Informe a quantidade e copie a penalidade junto do resultado. Não cria acertos; a RD é descontada depois.');
add('janela-contraataque','Janela de Contra-Ataque',13,32,0,'reaction','counter','Após confirmar um bloqueio ou desvio, faça um contra-ataque com metade do dano bruto informado. O inimigo pode defender normalmente; desconte sua RD inteira. Um contra-ataque por turno, sem gerar novas janelas.');
add('carne-combustivel','Carne como Combustível',14,36,0,'action','fuel','Sacrifique 10% de sua Vida máxima, permanecendo com pelo menos 1 PV. Guarde desconto de RC igual a piso(Vida sacrificada/5), até 6 RC, para a próxima técnica deste controlador até o segundo turno seguinte. Não recupera nem cria RC.',{requiresRC:true,equipmentCompatible:false});
add('sangue-por-sangue','Sangue por Sangue',15,40,3,'action','blood','Sacrifique 20% de sua Vida máxima, permanecendo com pelo menos 1 PV. Guarde duas vezes a Vida perdida como dano fixo para um próximo ataque, limitado à metade da Vida máxima. Consome a reserva ao liberar; expira no segundo turno seguinte.',{weaponOnly:true});
add('rede-distribuicao','Rede de Distribuição',18,50,0,'reaction','redistribute','Com dois aliados voluntários e confirmação da mesa, redistribua um dano pós-RD entre você e eles em três parcelas. Você recebe piso(dano/3), o primeiro aliado recebe piso(dano/3) e o segundo a sobra. Não reduz a soma nem permite novas redistribuições.');
add('sentenca-ruina','Sentença de Ruína',20,280,8,'action','detonate','Consuma até 4 doses locais: dano bruto = doses × dano por dose × 2. Ignore 50% da RD do alvo, sem somar com outras fontes. As mesmas doses precisam ser encerradas no painel original. Não causa um novo acúmulo.',{percent:200,attribute:'precisao',min:15,weaponOnly:true});
add('bastiao-vivo','Bastião Vivo',20,340,0,'action','stance','Uma vez por sessão, fixe seu deslocamento em 0 até seu próximo turno. Reduza em 75% cada um dos próximos dois danos pós-RD recebidos. Use Resolver impacto para cada golpe; não é imunidade nem modifica a RD.',{percent:75,usesSession:true,attribute:'vigor',min:15});
add('retaliacao-absoluta','Retaliação Absoluta',20,360,0,'reaction','retaliate','Guarde 100% de um dano pós-RD já recebido, até sua Vida máxima. Um próximo ataque pode consumir a reserva inteira como dano fixo e usar 50% de penetração. Expira no início do segundo turno seguinte; não duplica o dano recebido.',{percent:100,attribute:'forca',min:15});

const existing: TacticalTechnique[] = [
  {id:'r26-exp-forca-atlas-vivo',name:'Atlas Vivo · onda de impacto',attribute:'forca',effect:'wave',slot:'action',description:'Após um ataque confirmado, cause metade do dano bruto informado a um segundo alvo, descontando a RD inteira dele. O primeiro ataque não é aplicado de novo. A onda não gera outras ondas.'},
  {id:'r26-exp-vigor-corpo-continental',name:'Corpo Continental · impedir queda',attribute:'vigor',effect:'last-stand',slot:'reaction',usesSession:true,description:'Uma vez por sessão, receba um golpe que levaria de Vida positiva a 0 e permaneça com 1 PV. Informe o dano antes de aplicá-lo. Não custa RC nem ressuscita quem já caiu.'},
  {id:'r26-exp-precisao-zero-desvio',name:'Zero Desvio · refazer dano',attribute:'precisao',effect:'reroll-damage',slot:'action',description:'Informe os resultados dos dados de dano e rerrole a metade inferior deles, arredondada para baixo. Substitua cada dado escolhido apenas se a nova rolagem for maior. O dano fixo não é rerrolado. Uma vez por turno.'},
  {id:'r26-exp-agilidade-alem-do-instante',name:'Além do Instante · reposicionar',attribute:'agilidade',effect:'move',slot:'reaction',percent:200,description:'Antes ou depois de defender, mova até duas vezes sua Agilidade em espaços, sem provocar ataques nesse movimento. Uma reação tática por turno; não concede novos ataques.'},
  {id:'r26-exp-raciocinio-mente-laplace',name:'Mente de Laplace · guardar natural',attribute:'raciocinio',effect:'store-natural',slot:'action',description:'Guarde um resultado natural já rolado no dado atual (d10, d20 ou d30). Em outro turno com o mesmo dado, consuma-o para substituir um novo natural inferior. O valor substituído nunca gera crítico. Só uma reserva; ela termina ao começar outro combate.'},
  {id:'r26-exp-percepcao-horizonte-absoluto',name:'Horizonte Absoluto · segunda leitura',attribute:'percepcao',effect:'reroll',slot:'reaction',description:'Rerrole um ataque ou defesa e mantenha o maior resultado natural. Informe os dois resultados; use o mesmo modificador. Uma reação tática por turno, sem rerrolagem em cadeia.'},
  {id:'r26-exp-presenca-imperador-do-campo',name:'Imperador do Campo · comando defensivo',attribute:'presenca',effect:'ally-reroll',slot:'reaction',description:'Um aliado pode rerrolar uma defesa e manter o maior natural. Informe os dois dados e o modificador dele; copie o recibo. Uma reação tática por turno, sem alterar a ficha do aliado.'},
  {id:'r26-passos-controle-comando-catastrofe',name:'Comando de Catástrofe · liberar RC',attribute:'controle',effect:'release-rc',slot:'action',usesSession:true,description:'Uma vez por sessão, encerre a supressão de RC em você, mesmo com a reserva zerada. Não recupera RC, não remove exaustão por falta de reserva e não cria uma técnica adicional.'},
].map(item=>({...item,level:20,min:15,pe:0,rc:0,existing:true,equipmentCompatible:false} as TacticalTechnique));

export const tacticalTechniques: readonly TacticalTechnique[] = [...techniques,...existing,...additionalEndgameTactics];
export const tacticalCapstones: readonly TacticalTechnique[] = [...existing,...additionalEndgameTactics];
export const TACTICAL_PERK_DEFINITIONS: Perk[] = techniques.map(technique=>({
  id:technique.id,name:technique.name,category:technique.attribute ? ({forca:'Força',vigor:'Vigor',precisao:'Precisão'} as const)[technique.attribute as 'forca'|'vigor'|'precisao'] : 'Combate',
  cost:technique.pe,maxRank:1,minGrade:technique.level,attribute:technique.attribute,min:technique.min,
  equipmentCompatible:technique.equipmentCompatible,requiresRC:technique.requiresRC,requiredWeapon:technique.weaponOnly?'kagune':undefined,
  sourceId:'nova-era-tatica',supplement:true,useType:`Ativa · ${technique.slot==='reaction'?'reação':'ação'} tática`,
  requirement:`LEVEL ${technique.level}${technique.attribute?` · ${technique.attribute} ${technique.min}`:''}${technique.usesSession?' · 1/sessão':''}`,
  description:`${technique.description} ${technique.rc?`${technique.rc} RC por uso. `:''}Usa a ${technique.slot==='reaction'?'reação':'ação'} tática do turno. A ficha calcula e registra o resultado; efeitos em outros alvos são resolvidos na mesa.`,
}));

export interface TacticalContext {
  level?:number;species?:string;attributes?:Partial<Record<AttributeKey,number>>;ownedPerks?:Record<string,{rank:number}>|readonly string[];
  currentRC?:number;maxLife?:number;currentLife?:number;damageSteps?:number;hitBonus?:number;rd?:number;control?:number;
  weaponKind?:string;kaguneType?:string;isRCSuppressed?:boolean;weaponActive?:boolean;weaponOnly?:boolean;turn?:number;die?:number;damageFormula?:string;penetrationPercent?:number;
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
const remainingRD=(rd:number,percent=0)=>num(rd)-Math.floor(num(rd)*Math.min(50,num(percent))/100);
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
    retaliation:num(r.amount)>0?{amount:num(r.amount),expires:num(r.expires),penetrationPercent:Math.min(50,num(r.penetrationPercent))}:null,
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
export function tacticalAvailability(technique:TacticalTechnique,state:TacticalState,c:TacticalContext={}):string {
  if(!owned(c,technique.id))return 'Técnica não adquirida.';
  if(num(c.level,1,1,20)<technique.level)return `Requer LEVEL ${technique.level}.`;
  if(technique.attribute&&num(c.attributes?.[technique.attribute])<(technique.min||0))return `Requer ${technique.attribute} ${technique.min}.`;
  if(c.weaponOnly&&(!technique.equipmentCompatible||technique.rc>0||technique.requiresRC))return 'Técnica incompatível com esta Quinque.';
  if(technique.weaponOnly&&(c.weaponActive===false||!['kagune','quinque'].includes(c.weaponKind||'')))return 'A arma precisa estar disponível e ativa.';
  if(technique.requiresRC&&!hasRC(c))return 'Exige um organismo ou arma com RC.';
  if(technique.requiresRC&&c.isRCSuppressed)return 'RC suprimido.';
  const cost=Math.max(0,technique.rc-(state.credit?.amount||0));
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
  return {description,lifeDelta,amount,penetration,rcCost:Math.max(0,technique.rc-(state.credit?.amount||0)),testTotal,dc};
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
    const penetration=Math.min(50,Math.max(25,num(c.penetrationPercent))),remaining=state.mark.charges-1;
    name='Consumir abertura de Presa Terminal';id='use-mark';message=`${state.mark.target}: dano ${i.damage} com penetração ${penetration}% contra RD ${i.targetRD} = ${netDamage(i.damage,i.targetRD,penetration)}. Aberturas restantes ${remaining}.`;
    state={...state,mark:remaining?{...state.mark,charges:remaining}:null,inputs:{...i,damage:0,confirmed:false}};
  }
  else if(action.type==='discard-natural'){if(state.storedNatural===null)return fail('Sem natural guardado.');name='Descartar natural';id='discard-natural';message=`Natural ${state.storedNatural} de d${state.storedDie} descartado.`;state={...state,storedNatural:null};}
  else if(action.type==='release-retaliation'){
    if(!state.retaliation)return fail('Sem dano reservado.');if(state.usedTurn.action===state.turn)return fail('Ação tática já usada neste turno.');
    const reserve=state.retaliation;name='Liberar retaliação';id='release-retaliation';message=`Adicione ${reserve.amount} de dano fixo a UM ataque. Penetração desta reserva ${reserve.penetrationPercent}%; use a maior fonte, até 50%. Se o ataque falhar, a reserva também foi gasta. Não produz nova reserva.`;state={...state,retaliation:null,usedTurn:{...state.usedTurn,action:state.turn}};
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
