import type {TacticalTechnique,TacticalState,TacticalContext} from './tactical';
import {damageStatistics} from './damage-dice';

const rows:Partial<TacticalTechnique>[]=[
  {id:'r26-passos-forca-quebra-mundo',name:'Quebra-Mundo · impacto sísmico',attribute:'forca',effect:'seismic',slot:'action',description:'Após acertar um único golpe físico, sua onda atinge um segundo alvo por 75% do dano bruto original, descontando a RD própria dele. Em falha no teste de Vigor + Controle contra 15 + seu Controle, ele recua até 6 espaços. O ataque principal não é aplicado de novo; sem ondas em cadeia.'},
  {id:'r26-passos-vigor-cerco-vivo',name:'Cerco Vivo · escudo de emergência',attribute:'vigor',effect:'aegis',slot:'action',usesSession:true,description:'Uma vez por sessão, crie um escudo próprio de 40% da Vida máxima, válido por 3 turnos. Resolver impacto consome o escudo e aplica somente a sobra do dano pós-RD à sua Vida. Não cura e não repõe escudo ao trocar de aba.'},
  {id:'r26-passos-precisao-ponto-final',name:'Ponto Final · dano máximo',attribute:'precisao',effect:'maximum',slot:'action',usesSession:true,weaponOnly:true,equipmentCompatible:true,description:'Uma vez por sessão, em um acerto confirmado de Kagune/Quinque, substitua a rolagem pelos valores máximos dos dados da fórmula atual, com dano fixo uma vez. Desconte a RD normalmente. Não multiplica críticos ou ativações anteriores.'},
  {id:'r26-passos-agilidade-impacto-luz',name:'Impacto à Velocidade da Luz · sequência',attribute:'agilidade',effect:'flurry',slot:'action',description:'Gaste sua ação e reação táticas. Faça dois testes de ataque e use 70% de um único dano bruto rolado para cada golpe; cada golpe exige acerto e desconta a RD inteira. Mova até sua Agilidade entre os golpes. Máximo de 140% bruto, sem novas sequências ou gatilhos em cadeia.'},
  {id:'r26-passos-raciocinio-demolicao-exata',name:'Demolição Exata · desmontar defesa',attribute:'raciocinio',effect:'disassemble',slot:'action',weaponOnly:true,equipmentCompatible:true,description:'Num acerto confirmado, divida o dano bruto igualmente: metade contra a Vida do alvo, metade contra a Dureza de sua Kagune/Quinque. Cada parcela desconta a RD correspondente. A soma não aumenta, mas o golpe ameaça corpo e arma ao mesmo tempo.'},
  {id:'r26-passos-percepcao-presa-terminal',name:'Presa Terminal · expor abertura',attribute:'percepcao',effect:'mark',slot:'action',equipmentCompatible:true,description:'Marque um alvo por 2 turnos. Os próximos dois ataques confirmados, seus ou de aliados, podem consumir uma abertura para ignorar 25% da RD original. Use a maior penetração disponível, até 50%. O controlador desconta uma carga por ataque e calcula o dano líquido.'},
  {id:'r26-passos-presenca-peso-imperio',name:'Peso de um Império · trocar defesa',attribute:'presenca',effect:'exchange',slot:'reaction',description:'Após você e um aliado rolarem uma defesa com o mesmo tamanho de dado, troquem os naturais; cada um mantém seus próprios modificadores. Você assume o resultado dele. Confirme o consentimento e copie o recibo. Não cria crítico nem uma nova rolagem.'},
];
export const additionalEndgameTactics:TacticalTechnique[]=rows.map(row=>({level:20,min:15,pe:0,rc:0,existing:true,equipmentCompatible:false,...row} as TacticalTechnique));

export function endgameTacticalPreview(t:TacticalTechnique,s:TacticalState,c:TacticalContext){
  const i=s.inputs,n=(value:unknown)=>Math.max(0,Math.floor(Number(value)||0));
  const rd=(raw:number,armor:number,pen=0)=>Math.max(0,raw-n(armor)+Math.floor(n(armor)*Math.min(50,pen)/100));
  let description='',amount=0;
  switch(t.effect){
    case 'seismic':amount=Math.floor(i.damage*.75);description=`Onda secundária: ${amount} bruto − RD ${i.target2RD} = ${rd(amount,i.target2RD)} dano. Resistência ${i.roll+i.targetVigor+i.targetControl} contra ${15+n(c.control)}: ${i.roll+i.targetVigor+i.targetControl>=15+n(c.control)?'sem recuo':'recuo de até 6 espaços'}. Golpe principal já resolvido; sem reaplicá-lo.`;break;
    case 'aegis':amount=Math.floor(n(c.maxLife)*.4);description=`Escudo próprio: ${amount} PV absorvíveis, até o início de T${s.turn+3}. Vida atual permanece igual ao preparar. Informe cada impacto pós-RD para consumir o escudo.`;break;
    case 'maximum':amount=damageStatistics(c.damageFormula||'').maximum;description=`Fórmula atual ${c.damageFormula||'indisponível'}: máximo bruto ${amount}; após RD ${i.targetRD}, dano ${rd(amount,i.targetRD)}. Um único golpe, sem reaplicar crítico ou retaliação.`;break;
    case 'flurry':amount=Math.floor(i.damage*.7);description=`Dois ataques independentes: ${amount} bruto por golpe; se ambos acertarem, ${2*amount} bruto total. Contra RD ${i.targetRD}, ${rd(amount,i.targetRD)} por acerto. Deslocamento entre golpes até ${n(c.attributes?.agilidade)} espaços. Ação e reação táticas consumidas.`;break;
    case 'disassemble':{const half=Math.floor(i.damage/2);amount=i.damage;description=`Bruto conservado ${half}+${i.damage-half}=${i.damage}. Corpo: ${rd(half,i.targetRD)} após RD ${i.targetRD}; Dureza da arma: ${rd(i.damage-half,i.target2RD)} após RD própria ${i.target2RD}. Registre os dois danos nos seus alvos, sem duplicar na Vida geral.`;break;}
    case 'mark':amount=2;description=`${i.target||'Alvo'} exposto: duas aberturas até o início de T${s.turn+2}; cada uma usa 25% de penetração, ou sua maior fonte até 50%. É necessário consumir cada ataque no controlador.`;break;
    case 'exchange':amount=i.roll;description=`Troca consentida de naturais do mesmo d${c.die||20}: o aliado usa ${i.roll}, você usa ${i.reroll}. Cada um soma seu próprio modificador de defesa. Não gera crítico ou nova rolagem; aplique nas duas fichas.`;break;
  }
  return {description,amount,lifeDelta:0,penetration:0};
}
