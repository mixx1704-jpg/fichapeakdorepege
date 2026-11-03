import type { AttributeKey, KaguneFamily, SpeciesId } from './data';
import { NEW_PACK_DEFINITIONS, newPackPerks, type NewPackDefinition } from './new-pack-catalog';
import { perkKaguneRequirementsMet } from './bikaku-access';

export const PACK_DAMAGE_MULTIPLIER_CAP = 2;
export const PACK_RD_MULTIPLIER_CAP = 2;
export const PACK_REGEN_MULTIPLIER_CAP = 2;
export const PACK_STRUCTURE_DAMAGE_MULTIPLIER_CAP = 3;
export const PACK_PENETRATION_CAP = 50;
export const PACK_MULTIPLIER_RULE = 'Os multiplicadores deste pacote se multiplicam uma vez sobre o dano final antes da RD, até ×2 de dano, ×2 de RD e ×2 de regeneração. Contra estruturas, o limite de dano é ×3. Use a maior penetração, até 50%. Custos de RC nunca ficam abaixo de 1, salvo um efeito explicitamente gratuito. Arredonde apenas o resultado final para baixo.';

export type PackCondition = { active?: boolean; counter?: number; secondaryCounter?: number; value?: number; mode?: string };
export type PackConditions = Record<string, PackCondition>;
export type PackConditionKey = keyof PackCondition;
export interface PackControl {
  perkId: string;
  key: PackConditionKey;
  label: string;
  type: 'toggle' | 'counter' | 'select';
  min?: number;
  max?: number;
  defaultValue?: number | string | boolean;
  options?: Array<{ value: string; label: string }>;
}
export interface PackContext {
  perks: Record<string, { rank: number }>;
  attributes: Record<AttributeKey, number>;
  requirementAttributes?: Record<AttributeKey, number>;
  level?: number;
  species?: SpeciesId;
  kaguneTypes?: KaguneFamily[];
  primaryKaguneType?: KaguneFamily;
  weaponActive?: boolean;
  weaponKind?: string;
  quinque?: boolean;
  hasRC?: boolean;
  currentLife?: number;
  maxLife?: number;
  currentRC?: number;
  maxRC?: number;
  baseBlock?: number;
  baseDodge?: number;
  baseRD?: number;
  /** Complete projected body RD before this pack's explicit final-RD sacrifice. */
  projectedRD?: number;
  kaguneRD?: number;
  tailCount?: number;
  hunger?: number;
  conditions?: PackConditions;
  genericpackConditions?: PackConditions;
}
export interface PackBonuses {
  physicalHit: number; kaguneHit: number; block: number; dodge: number;
  physicalSteps: number; kaguneSteps: number; rd: number; kaguneRD: number;
  life: number; rc: number; regen: number; movement: number; reactions: number; range: number;
  attributes: Record<AttributeKey, number>;
  attributeChecks: Record<AttributeKey, number>;
}
export interface PackPermission { perkId: string; name: string; text: string }
export interface PackReceipt {
  perkId: string; label: string;
  /** Explicit event receipts. They are not automatic healing or RC ticks. */
  costRC?: number; costLife?: number; heal?: number; restoreRC?: number;
  amount?: number; limit?: string;
  disabled?: boolean; disabledReason?: string;
}
export interface PackEffects {
  bonuses: PackBonuses;
  carrierHit: number;
  damageMultiplier: { physical: number; kagune: number };
  structureDamageMultiplier: number;
  rdMultiplier: number;
  kaguneRDMultiplier: number;
  lifeMultiplier: number;
  rcMultiplier: number;
  regenMultiplier: number;
  movementMultiplier: number;
  rangeMultiplier: number;
  penetrationPercent: number;
  targetRDReduction: number;
  rdSacrifice: number;
  rcDiscount: number;
  rcCostIncrease: number;
  rcCostMultiplier: number;
  regenRCDiscount: number;
  healingReceivedMultiplier: number;
  blockAttribute?: 'controle';
  temporaryLifeCapMultiplier: number;
  temporaryRCCapMultiplier: number;
  controls: PackControl[];
  permissions: PackPermission[];
  receipts: PackReceipt[];
  activePerkIds: string[];
  eligiblePerkIds: string[];
  pendingPerkIds: string[];
  rules: string;
}

const attributes: AttributeKey[] = ['forca','vigor','precisao','agilidade','raciocinio','percepcao','presenca','controle'];
const biologicalSpecies = ['ghoul','ghoul-dominante','ghoul-artificial','quinx'];
const physicalAttributes: AttributeKey[] = ['forca','vigor','precisao','agilidade'];
const manifestedProperties=new Set([3,11,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,60,61,69,70,71,72,73,74,75,76,78,81,82,83,84,94,99]);
export function packFloor(value: unknown, fallback = 0): number { const n=Number(value); return Number.isFinite(n) ? Math.floor(n) : fallback; }
export function packClamp(value: unknown, minimum: number, maximum: number, fallback = minimum): number { return Math.min(maximum,Math.max(minimum,packFloor(value,fallback))); }
export function packPercent(value: number, percentage: number): number { return Math.floor(Math.max(0,value)*Math.max(0,percentage)/100); }
export function applyPackMultiplier(value: number, multiplier: number): number { return Math.floor(Math.max(0,value)*Math.max(0,Number.isFinite(multiplier)?multiplier:1)); }
export function packRCCost(cost: number, effects: Pick<PackEffects,'rcDiscount'|'rcCostIncrease'|'rcCostMultiplier'>): number {
  if(cost<=0)return 0;
  return Math.max(1,Math.floor((cost-effects.rcDiscount+effects.rcCostIncrease)*effects.rcCostMultiplier));
}
export function normalizePackConditions(input: unknown): PackConditions {
  if(!input||typeof input!=='object'||Array.isArray(input))return {};
  const validIds=new Set(NEW_PACK_DEFINITIONS.map(d=>d.id));
  const output:PackConditions={};
  for(const [id,raw] of Object.entries(input)){
    if(!validIds.has(id)||!raw||typeof raw!=='object'||Array.isArray(raw))continue;
    const value=raw as Record<string,unknown>;
    const next:PackCondition={};
    if(typeof value.active==='boolean')next.active=value.active;
    for(const key of ['counter','secondaryCounter','value'] as const)if(typeof value[key]==='number'&&Number.isFinite(value[key]))next[key]=packClamp(value[key],0,999999);
    if(typeof value.mode==='string')next.mode=value.mode.slice(0,80);
    if(Object.keys(next).length)output[id]=next;
  }
  return output;
}
export function emptyPackEffects(): PackEffects {
  return { bonuses:{physicalHit:0,kaguneHit:0,block:0,dodge:0,physicalSteps:0,kaguneSteps:0,rd:0,kaguneRD:0,life:0,rc:0,regen:0,movement:0,reactions:0,range:0,attributes:Object.fromEntries(attributes.map(a=>[a,0])) as Record<AttributeKey,number>,attributeChecks:Object.fromEntries(attributes.map(a=>[a,0])) as Record<AttributeKey,number>},carrierHit:0, damageMultiplier:{physical:1,kagune:1},structureDamageMultiplier:1,rdMultiplier:1,kaguneRDMultiplier:1,lifeMultiplier:1,rcMultiplier:1,regenMultiplier:1,movementMultiplier:1,rangeMultiplier:1,penetrationPercent:0,targetRDReduction:0,rdSacrifice:0,rcDiscount:0,rcCostIncrease:0,rcCostMultiplier:1,regenRCDiscount:0,healingReceivedMultiplier:1,temporaryLifeCapMultiplier:1,temporaryRCCapMultiplier:1,controls:[],permissions:[],receipts:[],activePerkIds:[],eligiblePerkIds:[],pendingPerkIds:[],rules:PACK_MULTIPLIER_RULE };
}

export function isPackDefinitionEligible(definition: NewPackDefinition, context: PackContext): boolean {
  if(packFloor(context.perks[definition.id]?.rank)<=0)return false;
  const r=definition.requirements, values=context.requirementAttributes||context.attributes;
  if(packFloor(context.level,1)<r.level)return false;
  if(Object.entries(r.attributes).some(([key,min])=>packFloor(values[key as AttributeKey])<Number(min)))return false;
  if(r.anyPhysicalMinimum&&!physicalAttributes.some(a=>packFloor(values[a])>=r.anyPhysicalMinimum!))return false;
  if(r.minimumTails&&(context.tailCount||0)<r.minimumTails)return false;
  if(r.minimumFamilies&&new Set(context.kaguneTypes||[]).size<r.minimumFamilies)return false;
  if(context.species==='quinx' && Math.max(r.minimumFamilies || 0,r.families.length)>1)return false;
  if(context.quinque&&!definition.equipmentCompatible)return false;
  if(definition.biological&&context.species&&!biologicalSpecies.includes(context.species))return false;
  if((definition.section==='RC / CONTROLE'||definition.kind==='property')&&context.hasRC===false)return false;
  const perk=newPackPerks.find(p=>p.id===definition.id)!;
  if(perk.species&&context.species&&!perk.species.includes(context.species))return false;
  if(!perkKaguneRequirementsMet(perk,context))return false;
  return true;
}

/** Pure projection of explicit table state. No attack, hit, kill, damage or resource event is inferred. */
export function calculatePackEffects(context: PackContext): PackEffects {
  const result=emptyPackEffects(), b=result.bonuses;
  const states=normalizePackConditions(context.conditions||context.genericpackConditions);
  const lifeMax=Math.max(1,packFloor(context.maxLife,1)), rcMax=Math.max(1,packFloor(context.maxRC,1));
  const life=Math.max(0,packFloor(context.currentLife,lifeMax)), rc=Math.max(0,packFloor(context.currentRC,rcMax));
  const hp=life/lifeMax, rp=rc/rcMax;
  const missingLife=Math.max(0,lifeMax-life);
  const weapon=context.weaponActive!==false && (context.weaponKind===undefined||['kagune','quinque'].includes(context.weaponKind));
  const attr=(key:AttributeKey)=>packFloor(context.attributes[key]);
  let current:NewPackDefinition;
  let applied=false;
  let fragileKaguneId:string|undefined;
  let rdSacrificeRequest:{id:string;amount:number}|undefined;
  const add=(key:Exclude<keyof PackBonuses,'attributes'|'attributeChecks'>,value:number)=>{if(value){b[key]+=value;applied=true;}};
  const check=(attribute:AttributeKey,value:number)=>{b.attributeChecks[attribute]+=value;if(value)applied=true;};
  const attack=(hit=0,steps=0,multiplier=1,scope:'both'|'physical'|'kagune'='both')=>{
    if(scope!=='kagune'){add('physicalHit',hit);add('physicalSteps',steps);result.damageMultiplier.physical*=multiplier;}
    if(scope!=='physical'&&weapon){add('kaguneHit',hit);add('kaguneSteps',steps);result.damageMultiplier.kagune*=multiplier;}
    if(multiplier!==1)applied=true;
  };
  const defense=(block=0,dodge=0)=>{add('block',block);add('dodge',dodge);};
  const multiply=(key:'rdMultiplier'|'kaguneRDMultiplier'|'lifeMultiplier'|'rcMultiplier'|'regenMultiplier'|'movementMultiplier'|'rangeMultiplier'|'rcCostMultiplier'|'healingReceivedMultiplier',value:number)=>{result[key]*=value;if(value!==1)applied=true;};
  const pen=(value:number)=>{result.penetrationPercent=Math.max(result.penetrationPercent,value);applied=true;};
  const receipt=(label:string,values:Omit<PackReceipt,'perkId'|'label'>={})=>{result.receipts.push({perkId:current.id,label,...values});};
  const control=(key:PackConditionKey,label:string,type:PackControl['type'],options:Partial<PackControl>={})=>{result.controls.push({perkId:current.id,key,label,type,...options});};
  const flag=(label='Aplicar a condição descrita',key:'active'='active')=>{control(key,label,'toggle',{defaultValue:false});return states[current.id]?.[key]===true;};
  const count=(label:string,max:number,key:'counter'|'secondaryCounter'|'value'='counter',fallback=0)=>{control(key,label,'counter',{min:0,max,defaultValue:fallback});return packClamp(states[current.id]?.[key],0,max,fallback);};
  const mode=(label:string,options:Array<[string,string]>,fallback='none')=>{
    control('mode',label,'select',{defaultValue:fallback,options:options.map(([value,label])=>({value,label}))});
    const value=states[current.id]?.mode;return options.some(([key])=>key===value)?value!:fallback;
  };
  const discount=(value:number,regeneration=false)=>{if(regeneration)result.regenRCDiscount+=value;else result.rcDiscount+=value;if(value)applied=true;};
  const permission=(text?:string)=>result.permissions.push({perkId:current.id,name:current.name,text:text||[current.body,current.integrationNotes].filter(Boolean).join('\n\n')});
  const simple=(condition:string,hit=0,steps=0,multiplier=1,scope:'both'|'physical'|'kagune'='both')=>{if(flag(condition))attack(hit,steps,multiplier,scope);};

  for(const definition of NEW_PACK_DEFINITIONS){
    if(!isPackDefinitionEligible(definition,context))continue;
    current=definition; applied=false;result.eligiblePerkIds.push(definition.id);
    // Every purchased entry retains its rule text, including narrative permissions and unresolved table events.
    permission();
    if(definition.pendingClarification){result.pendingPerkIds.push(definition.id);continue;}
    const weaponBound=definition.requirements.families.length>0||Boolean(definition.requirements.minimumFamilies)||(definition.kind==='property'&&manifestedProperties.has(definition.ordinal));
    const suspended=weaponBound&&!weapon;
    const physicalHitBefore=b.physicalHit,kaguneHitBefore=b.kaguneHit;
    const numericSnapshot=suspended ? { ...result,bonuses:{...b,attributes:{...b.attributes},attributeChecks:{...b.attributeChecks}},damageMultiplier:{...result.damageMultiplier} } : undefined;
    const receiptStart=result.receipts.length;
    if(definition.kind==='perk')switch(definition.ordinal){
      case 1: attack(Math.max(0,count('Turnos consecutivos atacando a mesma presa',4)-1));break;
      case 2: attack(0,3*count('Acertos corpo a corpo consecutivos antes deste golpe',3));break;
      case 3: if(flag('Eficiência disponível do turno anterior'))discount(2);break;
      case 4: simple('Ataque realizado como Reação',2,5);break;
      case 5:{const lost=count('Vida perdida desde o último turno',lifeMax,'value');if(lost>0)attack(2,0,lost>=lifeMax*.2?1.1:1);break;}
      case 6: attack(0,Math.min(6,Math.floor(count('Espaços percorridos antes do ataque',12)/2)));break;
      case 7: simple('Primeiro golpe após passar um turno sem atacar',3,8,1.1);break;
      case 8:{const n=count('Acúmulos de Ritmo',3);const m=mode('Benefício de Ritmo',[['none','Sem escolha'],['hit','Acerto'],['dodge','Esquiva']]);if(m==='hit')attack(n);if(m==='dodge')defense(0,n);break;}
      case 9: attack(0,4*count('Cargas de Brutalidade contra a presa atual',3));break;
      case 10: simple('Próximo ataque depois de sofrer crítico',0,0,1.25);break;
      case 11:{const target=count('Vida atual do alvo (%)',100,'value',100);if(target<.25*100)attack(4,0,1.15);else if(target<50)attack(2);break;}
      case 12: if(flag('Sacrificar toda a RD neste golpe')&&hp<.2){result.rdMultiplier=0;attack(0,0,1.35);}break;
      case 13: attack(count('Acertos consecutivos sem errar',3));break;
      case 14: if(flag('Reação obtida após esquivar completamente (1/rodada)'))add('reactions',1);break;
      case 15: if(flag('Defendendo a habilidade já observada duas vezes'))defense(3,3);break;
      case 16: if(count('Acertos no mesmo alvo',3)>=3)pen(20);break;
      case 17: result.targetRDReduction+=2*count('Rupturas contra o alvo atual',3);break;
      case 18: simple('Próximo ataque contra o inimigo que errou você',3);break;
      case 19: if(count('Vida atual do alvo (%)',100,'value',100)<20)attack(0,0,1.25);break;
      case 20:{const n=count('Rodadas completas de combate',5);add('rd',n);attack(0,n);break;}
      case 21: if(flag('Primeira habilidade RC deste combate'))discount(2);break;
      case 22: result.pendingPerkIds.push(definition.id);break;
      case 23: if(weapon&&flag('Começou o turno com pelo menos 75% de RC'))attack(2,0,1,'kagune');break;
      case 24: multiply('rcMultiplier',1.1);break;
      case 25: if(flag('Sobrecarga ativa (2 turnos, 1/combate)')){attack(0,0,1.2,'kagune');receipt('Ativar Núcleo em Sobrecarga',{costRC:packPercent(rcMax,15),limit:'1/combate; 2 turnos'});}break;
      case 26:{const missing=count('RC faltante a pagar com Vida',rcMax,'value');if(missing)receipt('Queimar Vida para cobrir o RC faltante',{costLife:packPercent(lifeMax,missing*2),restoreRC:missing});break;}
      case 27: if(flag('Efeito de Kagune com custo original superior a 5 RC'))discount(2);break;
      case 28: if(hp<.5)add('rd',2);break;
      case 29: attack(0,Math.min(8,2*Math.floor(missingLife/lifeMax*5)));break;
      case 30: if(flag('Acabou de cruzar 10% de Vida (1/combate)')&&hp<.1)add('reactions',1);break;
      case 31: if(flag('Mesmo tipo de dano recebido três vezes; defendendo esse tipo'))multiply('rdMultiplier',1.15);break;
      case 32: if(flag('Sobreviveu com 1 Vida; RD zerada até o próximo turno'))result.rdMultiplier=0;break;
      case 33: simple('Tiro Ukaku de Reação contra ataque à distância (1/rodada)',-2,0,1,'kagune');break;
      case 34: attack(Math.min(2,Math.max(0,count('Número do ataque Ukaku consecutivo contra o alvo',3)-1)),0,1,'kagune');break;
      case 35: simple('Alvo ainda não agiu nesta rodada',0,4,1,'kagune');break;
      case 36: receipt('Recuo de 1 espaço após disparar',{costRC:1});break;
      case 37: receipt(`Supressão no alvo: −${count('Disparos de Supressão válidos',2)} no próximo Acerto`);break;
      case 38: receipt('Ignore piso(metade da penalidade de cobertura)');break;
      case 39: simple('Você está acima do alvo',2,4,1,'kagune');break;
      case 40: receipt('Ataque Ukaku de Reação após inimigo percorrer mais de 2 espaços na linha de visão',{limit:'1/rodada; gasta Reação'});break;
      case 41: attack(0,2*count('Acertos Ukaku anteriores neste turno',3),1,'kagune');break;
      case 42: if(flag('Aplicar Penas Guiadas ao ataque')){attack(3,0,1,'kagune');receipt('Penas Guiadas',{costRC:2});}break;
      case 43: if(weapon)fragileKaguneId=definition.id;break;
      case 44: simple('Alvo exatamente no alcance máximo normal',4,0,1.15,'kagune');break;
      case 45: simple('Primeiro ataque após mover 3+ espaços em direção ao alvo',0,8,1,'kagune');break;
      case 46: attack(0,0,[1,1,1.05,1.1,1.15][count('Número do ataque Ukaku na rodada',4)],'kagune');break;
      case 47: if(flag('Percorreu ao menos metade do Deslocamento antes de atacar'))pen(20);break;
      case 48: simple('Golpe após três acertos consecutivos no alvo; depois zere',0,0,1.3,'kagune');break;
      case 49: simple('Nenhuma criatura acertou você desde o último turno',4,0,1.2,'kagune');break;
      case 50: if(flag('Céu Vermelho ativo (3 turnos, 1/combate)')){add('movement',2);defense(0,4);attack(4,0,1+Math.min(5,count('Acertos consecutivos durante Céu Vermelho',5))*.05,'kagune');}break;
      case 51: simple('Não se moveu antes de atacar',0,3,1,'kagune');break;
      case 52: if(flag('RD contra o ataque que está bloqueando'))add('rd',2);break;
      case 53: simple('Será seu único ataque neste turno',0,5,1,'kagune');break;
      case 54: add('rd',count('Acúmulos de Casco até o próximo turno',3));break;
      case 55: receipt('Empurrão ou arremesso: percorra piso(distância × 0,5)');break;
      case 56: if(flag('Primeiro ataque recebido nesta rodada'))multiply('rdMultiplier',1.15);break;
      case 57: simple('Próximo ataque após bloquear com sucesso',0,6,1,'kagune');break;
      case 58: add('rd',count('Ataques que atingiram você nesta rodada',4));break;
      case 59: if(flag('Compressão ativa até o próximo turno')){multiply('kaguneRDMultiplier',.75);attack(0,0,1.2,'kagune');}break;
      case 60: simple('Próximo golpe após bloquear completamente',3,0,1,'kagune');break;
      case 61: break;
      case 62: simple('Primeiro ataque após mover 2+ espaços em linha reta',0,10,1,'kagune');break;
      case 63: if(flag('Não atacou neste turno; defesa até o próximo turno'))multiply('rdMultiplier',1.25);break;
      case 64:{const amount=count('RD final sacrificada até o próximo turno',10);if(weapon)rdSacrificeRequest={id:definition.id,amount};break;}
      case 65: add('rd',count('Danos recebidos deste inimigo; defendendo contra ele',5));break;
      case 66: simple('RD do inimigo é menor que a sua',0,0,1.2,'kagune');break;
      case 67: if(flag('Castelo Andante ativo (3 turnos, 1/combate)')){multiply('rdMultiplier',1.3);multiply('movementMultiplier',.5);attack(0,3*count('Bloqueios armazenados para o próximo ataque',4),1,'kagune');}break;
      case 68: simple('Primeiro ataque Rinkaku do combate',0,3,1,'kagune');break;
      case 69: if(hp<.75)attack(0,2,1,'kagune');break;
      case 70: attack((context.tailCount||0)>=4?2:(context.tailCount||0)>=2?1:0,0,1,'kagune');break;
      case 71: result.regenRCDiscount+=count('Danos recebidos antes do próximo efeito regenerativo',3);break;
      case 72: attack(count('Alvos adjacentes diferentes já atacados neste turno',20),0,1,'kagune');break;
      case 73: receipt('Após causar dano, recupere 1 RC',{restoreRC:1,limit:'Máximo 2 RC/turno'});break;
      case 74: receipt('Sacrificar uma cauda: dano recebido ×0,8',{limit:'Consome uma cauda; não cura'});break;
      case 75: simple('Próximo ataque depois de recuperar Vida',0,4,1,'kagune');break;
      case 76: attack(0,2*count('Caudas destruídas por inimigos',3),1,'kagune');break;
      case 77: if(flag('RD contra inimigo que causou crítico neste combate'))add('rd',2);break;
      case 78: receipt('Quando uma cauda for destruída, role 1d20: 16+ regenera no início do próximo turno sem RC');break;
      case 79: if(hp<.3)multiply('regenMultiplier',1.25);break;
      case 80: receipt('Sacrificar uma cauda para remover uma condição física temporária',{limit:'1/rodada; não regenera órgão'});break;
      case 81: attack(0,0,1+.06*Math.min(4,Math.floor(missingLife/lifeMax*4)),'kagune');break;
      case 82: receipt('Criar uma cauda temporária por 3 turnos',{costRC:8,limit:'1/combate; registre a cauda no painel de partes'});break;
      case 83: receipt('Sacrificar uma cauda para recuperar 5 RC',{restoreRC:5,limit:'1/turno; consome uma cauda'});break;
      case 84: if(flag('Aberração Persistente ativa (3 turnos, 1/combate)')){attack(0,0,1.2,'kagune');multiply('regenMultiplier',1.3);receipt('Regenerar uma cauda destruída no fim do turno',{costRC:5});}break;
      case 85: simple('Percorreu até metade do Deslocamento',1,0,1,'kagune');break;
      case 86: if(weapon)defense(1);break;
      case 87: receipt('Depois de esquivar: mover 1 espaço',{limit:'1/rodada'});break;
      case 88: simple('Próximo ataque contra inimigo que errou golpe corpo a corpo',0,3,1,'kagune');break;
      case 89: if(weapon&&context.baseBlock!==undefined&&context.baseDodge!==undefined&&Math.abs(context.baseBlock-context.baseDodge)<=2)defense(1,1);break;
      case 90: simple('Próximo ataque após superar a defesa em 5+',2,0,1,'kagune');break;
      case 91: if(flag('Este inimigo já atacou você duas vezes'))defense(2,2);break;
      case 92: break;
      case 93: simple('Mudou de direção no movimento antes do golpe',0,4,1,'kagune');break;
      case 94:{const m=mode('Resposta ao ataque corpo a corpo',[['none','Inativa'],['block','+2 Bloqueio'],['dodge','+2 Esquiva']]);if(m!=='none'){defense(m==='block'?2:0,m==='dodge'?2:0);receipt('Resposta Imediata',{costRC:2,limit:'1/rodada'});}break;}
      case 95: simple('Ação ofensiva diferente da usada no turno anterior',2,0,1,'kagune');break;
      case 96:{const m=mode('Postura escolhida no início do turno',[['none','Sem postura'],['hit','+2 Acerto'],['block','+2 Bloqueio'],['dodge','+2 Esquiva']]);if(m==='hit')attack(2,0,1,'kagune');if(m==='block')defense(2);if(m==='dodge')defense(0,2);break;}
      case 97: attack(2*count('Erros contra o mesmo alvo antes desta tentativa',2),0,1,'kagune');break;
      case 98: simple('Ataque imediatamente após esquivar',0,0,1.18,'kagune');break;
      case 99: simple('Primeiro ataque após rodada em que atacou, bloqueou e esquivou',3,0,1.2,'kagune');break;
      case 100: if(flag('Fluxo Perfeito ativo (2 turnos, 1/combate)')){attack(4,0,1.2,'kagune');defense(4,4);}break;
      case 101: if(flag('Artilharia Entrincheirada: não se moveu')){attack(0,0,1.12,'kagune');multiply('kaguneRDMultiplier',1.12);}break;
      case 102: if(flag('Próximo disparo Ukaku após sacrificar 4 RD')){add('rd',-4);attack(0,8,1,'kagune');}break;
      case 103:{const m=mode('Última defesa válida',[['none','Nenhuma'],['dodge','Esquivou: +2 RD'],['block','Bloqueou: +2 Esquiva']]);if(m==='dodge')add('rd',2);if(m==='block')defense(0,2);break;}
      case 104: simple('Próximo disparo após sacrificar uma cauda',0,0,1.25,'kagune');break;
      case 105: if(flag('Próximo disparo depois de uma cauda regenerar'))discount(2);break;
      case 106: attack(0,Math.min(6,context.tailCount||0),1,'kagune');break;
      case 107: simple('Ataque Bikaku contra o mesmo alvo após acertar com Ukaku',0,0,1.15,'kagune');break;
      case 108: simple('Moveu-se verticalmente antes da ação',2,0,1,'kagune');break;
      case 109: simple('Atacou o mesmo inimigo de duas posições em turnos consecutivos',3,0,1.15,'kagune');break;
      case 110: if(hp>.75)multiply('rdMultiplier',1.1);else if(hp<.5)multiply('regenMultiplier',1.15);break;
      case 111: if(flag('Sacrificou uma cauda para defender este ataque'))add('rd',5);break;
      case 112: if(flag('Passou um turno sem atacar para formar Casulo')){multiply('rdMultiplier',1.2);receipt('Casulo de Carne',{heal:packPercent(lifeMax,8),limit:'Um turno sem atacar'});}break;
      case 113: break;
      case 114: simple('Próximo contra-ataque depois de bloquear',0,0,1.2,'kagune');break;
      case 115:{const m=mode('Escolha no começo do turno',[['none','Sem escolha'],['rd','RD ×1,15'],['dodge','+3 Esquiva']]);if(m==='rd')multiply('rdMultiplier',1.15);if(m==='dodge')defense(0,3);break;}
      case 116: if(flag('Próxima regeneração depois de esquivar'))discount(1,true);break;
      case 117: if(flag('Sacrificou uma cauda após falhar a Esquiva'))defense(0,3);break;
      case 118:{const n=count('Rodadas combatendo o mesmo alvo',3);attack(n,0,1,'kagune');defense(0,n);break;}
      case 119: simple('Usando a família escolhida no início do turno',2,0,1,'kagune');break;
      case 120: if(flag('Próximo efeito após usar três famílias diferentes em sequência')){discount(3);attack(0,4,1,'kagune');}break;
      case 121: simple('Próxima ação após causar dano com três famílias diferentes',0,0,1.25,'kagune');break;
      case 122:{const m=mode('Família escolhida neste turno',[['none','Nenhuma'],['Ukaku','Ukaku: +2 Acerto'],['Koukaku','Koukaku: +3 RD'],['Rinkaku','Rinkaku: +3 Passos'],['Bikaku','Bikaku: +2 Esquiva']]);if(m==='Ukaku')attack(2,0,1,'kagune');if(m==='Koukaku')add('rd',3);if(m==='Rinkaku')attack(0,3,1,'kagune');if(m==='Bikaku')defense(0,2);break;}
      case 123:{const n=count('Cargas de Evolução (trocas de família)',4);if(n<4)attack(n,0,1,'kagune');else if(flag('Consumir quatro cargas no próximo ataque'))attack(0,0,1.3,'kagune');break;}
      case 124: if(flag('Convergência ativa (3 turnos, 1/sessão)')){attack(4,0,1.25,'kagune');multiply('rangeMultiplier',1.5);multiply('rdMultiplier',1.25);multiply('regenMultiplier',1.3);defense(4,4);multiply('rcCostMultiplier',.75);}break;
      case 125: simple('Ataque corpo a corpo após mover em linha reta',0,4);break;
      case 126: if(flag('Agarrar, segurar ou impedir movimento com Força'))check('forca',3);receipt('Agarrar, segurar ou impedir movimento: +3 no teste');break;
      case 127: result.structureDamageMultiplier*=1.5;break;
      case 128: simple('Força do inimigo é igual ou maior que a sua',0,0,1.2);break;
      case 129: multiply('lifeMultiplier',1.1);break;
      case 130: break;
      case 131: if(flag('Recebeu três ataques nesta rodada'))multiply('rdMultiplier',1.15);break;
      case 132: if(hp<.1)defense(4);break;
      case 133: simple('Próxima tentativa após errar por 2 ou menos',1);break;
      case 134: simple('Alvo está imóvel',3);break;
      case 135: if(flag('Superou a defesa em 5+'))pen(15);break;
      case 136: simple('Primeiro ataque à distância deste turno',4);break;
      case 137: break;
      case 138: receipt('Depois de resolver dano crítico recebido: mover 1 espaço');break;
      case 139: if(flag('Nenhum ataque acertou você na rodada anterior'))defense(0,3);break;
      case 140: simple('Percorreu 4+ espaços antes do ataque',0,0,1.18);break;
      case 141: receipt('Rerrolar um teste que falhou',{limit:'1/combate'});break;
      case 142: if(flag('Defendendo a ação repetida por este inimigo'))defense(2,2);break;
      case 143: simple('Observou este alvo durante dois turnos',3);break;
      case 144: attack(count('Acúmulos de Xadrez (máximo uma aquisição/rodada)',3));break;
      case 145: break;
      case 146: if(flag('Primeiro ataque recebido deste inimigo'))defense(2,2);break;
      case 147: simple('Alvo com menos de 25% da Vida',2);break;
      case 148: break;
      case 149: if(flag('Teste atual de Controle contra Fome ou Sanidade'))check('controle',2);receipt('Testes de Fome e Sanidade: +2');break;
      case 150: if(flag('Aplicar Cirurgia de RC a um efeito (1/turno)'))discount(1);break;
      case 151: if(rp>.5)attack(2,0,1,'kagune');break;
      case 152: if(flag('Primeiro efeito de Kagune deste turno'))discount(2);break;
      case 153:{const m=mode('Resultado da aposta Cara ou Coroa',[['none','Sem aposta'],['win','Acertou: ×1,20'],['loss','Errou: ×0,90']]);if(m==='win')attack(0,0,1.2);if(m==='loss')attack(0,0,.9);break;}
      case 154: simple('Tudo ou Nada neste ataque: −4 Acerto',-4,0,1.35);break;
      case 155: simple('Superou a defesa exatamente pelo necessário',0,10);break;
      case 156:{const m=mode('Resultado do 1d4 de Caos Controlado',[['none','Não rolou'],['1','1: −2 Acerto'],['2','2: +4 Passos'],['3','3: +2 Acerto'],['4','4: ×1,15 dano']]);if(m==='1')attack(-2);if(m==='2')attack(0,4);if(m==='3')attack(2);if(m==='4')attack(0,0,1.15);break;}
      case 157: simple('Vida máxima do alvo é maior que a sua',0,0,1.15);break;
      case 158: simple('LEVEL do inimigo é maior que o seu',2,6);break;
      case 159: if(flag('Duelo: somente vocês interagiram diretamente na rodada')){attack(2);defense(2,2);}break;
      case 160: attack(count('Inimigos diferentes que atacaram você nesta rodada',4));break;
      case 161: if(flag('Defendendo habilidade que este inimigo já usou três vezes'))defense(4,4);break;
      case 162: defense(0,count('Ataques consecutivos deste inimigo contra você',4));break;
      case 163: simple('Primeiro ataque contra quem causou crítico em você',0,10);break;
      case 164: simple('Vingança contra quem derrubou seu aliado',3,0,1.15);break;
      case 165: if(flag('Interceptando um ataque contra aliado'))add('rd',4);break;
      case 166: attack(0,Math.min(12,packPercent(count('Último dano corpo a corpo sofrido',999999,'value'),10)));break;
      case 167: if(flag('Aposta de Sangue neste ataque (1/turno)')){attack(0,0,1.25);receipt('Aposta de Sangue',{costLife:packPercent(lifeMax,10),limit:'1/turno'});}break;
      case 168:{const m=mode('Fase de Limite Quebrado',[['none','Inativo'],['bonus','Bônus: dois turnos'],['penalty','Recuo: um turno']]);if(m==='bonus')attack(3,6);if(m==='penalty')attack(-2);break;}
      case 169: attack(count('Turnos focando exclusivamente no alvo',5));break;
      case 170: simple('Primeiro ataque após um turno sem atacar',0,0,1.3);break;
      case 171: if(count('Bloqueios deste inimigo contra você no combate',3)>=3)pen(25);break;
      case 172: if(count('Esquivas deste inimigo contra você no combate',3)>=3)attack(5);break;
      case 173: simple('Inimigo de LEVEL 18+',4,10);break;
      case 174: multiply('lifeMultiplier',1.15);break;
      case 175: multiply('rcMultiplier',1.2);break;
      case 176: add('reactions',1);break;
      case 177: simple('Primeiro ataque contra este inimigo',5);break;
      case 178: if(flag('Superou a defesa em 8+'))attack(0,0,1.25);break;
      case 179: if(hp<.5){add('rd',5);attack(0,5,1.15);}break;
      case 180: if(flag('Monstro Entre Monstros ativo; sem transformação equivalente (3 turnos)')){attack(4,0,1.2);defense(4,4);multiply('rdMultiplier',1.2);discount(2);}break;
    }
    else switch(definition.ordinal){
      case 1:{const excess=count('RC excedente a converter',999999,'counter'),overheal=count('Vida excedente a converter',999999,'secondaryCounter');if(excess)receipt('Converter excedente RC em Vida; consumir excedente uma vez',{heal:Math.floor(excess/2)});if(overheal)receipt('Converter sobrecura em RC; não dispara outra conversão',{restoreRC:Math.floor(overheal/4)});break;}
      case 2: receipt('Segundo Coração ao chegar a zero RC',{restoreRC:packPercent(rcMax,20),limit:'Primeira vez no combate; recarga após Descanso Longo'});break;
      case 3: if(flag('Pulso Reverso ativo até o próximo turno')){const steps=count('Passos concedidos por efeitos durante o Pulso',999999,'value');attack(0,-steps);add('rd',Math.floor(steps/2));receipt('Pulso Reverso',{costRC:5});}break;
      case 4: if(flag('Defendendo a única fonte adaptada após três ataques'))multiply('rdMultiplier',1.15);break;
      case 5: attack(count('Cargas de Dor; zere após rodada sem receber dano',3));break;
      case 6:{const m=mode('Único impulso pendular armazenado',[['none','Nenhum'],['attack','Próximo ataque: +4 Passos'],['block','Próximo Bloqueio: +2']]);if(m==='attack')attack(0,4);if(m==='block')defense(2);break;}
      case 7:{const other=count('RC atual do alvo',999999,'value');if(other>rc)attack(2,other>=rc*2?4:0);break;}
      case 8:{const stage=context.hunger!==undefined?packClamp(context.hunger,0,3):count('Estágio de Fome',3);add('rc',-[0,5,10,15][stage]);attack(0,[0,2,5,8][stage]);break;}
      case 9:{const n=count('Cargas Bioelétricas disponíveis',3);const m=mode('Consumir três cargas para',[['none','Guardar'],['hit','+3 Acerto'],['steps','+6 Passos'],['move','Mover 2 espaços sem Reação']]);if(n===3&&m==='hit')attack(3);if(n===3&&m==='steps')attack(0,6);if(n===3&&m==='move')receipt('Consumir três cargas: mover 2 espaços sem provocar Reação');break;}
      case 10:{const spent=count('RC convertido em movimento neste turno',5);add('movement',spent);if(spent>=4)defense(-2);if(spent)receipt('Motor de Carne',{costRC:spent,limit:'Neste turno'});break;}
      case 11: if(flag('Colapso ativo até o próximo turno')){multiply('kaguneRDMultiplier',.75);attack(0,0,1.2,'kagune');}break;
      case 12: if(mode('Atributo definido ao comprar Ossos de Kakuhou',[['vigor','Vigor'],['controle','Controle']],'vigor')==='controle')result.blockAttribute='controle';break;
      case 13: if(Math.abs(attr('forca')-attr('agilidade'))<=1)attack(2);if(Math.abs(attr('vigor')-attr('controle'))<=1)defense(2);break;
      case 14:{const bonus=2*count('Resistências contra deslocamento armazenadas',3);const m=mode('Aplicar no próximo teste contra deslocamento',[['none','Sem teste'],['forca','Força'],['vigor','Vigor'],['agilidade','Agilidade']]);if(m!=='none')check(m as AttributeKey,bonus);receipt(`Próximo teste contra deslocamento: +${bonus}`);break;}
      case 15: attack(0,count('Passos de Energia descarregados no próximo corpo a corpo',5),1,'kagune');break;
      case 16: break;
      case 17: break;
      case 18: break;
      case 19: receipt('Olhos da Kagune: enxergar pelo alcance da Kagune',{costRC:2});break;
      case 20: break;
      case 21: break;
      case 22: break;
      case 23: break;
      case 24: receipt('Redefinir uma propriedade simples da Kagune por um turno',{costRC:3});break;
      case 25: count('Formas memorizadas (registre as formas na descrição)',3);break;
      case 26: break;
      case 27: count('Segmentos; dividir igualmente dano, alcance e capacidade',3,'counter',1);break;
      case 28: receipt('Costura de Carne: encerrar Sangramento e estabilizar membro',{costRC:4,limit:'Não recupera Vida nem órgãos'});break;
      case 29: break;
      case 30: receipt(`Território Nervoso: área máxima ${attr('controle')*2} metros`,{costRC:10});break;
      case 31: receipt(`Criar Teia RC; Controle de referência ${attr('controle')}`,{costRC:8});break;
      case 32: if(flag('Ninho ativo e você está a até 10 metros'))receipt('Primeira recuperação de RC deste turno recebe +2 RC',{restoreRC:2,limit:'1/turno; Ninho: 20 Vida; sem cascata'});receipt('Criar Ninho',{costRC:12});break;
      case 33: if(flag('Matriz ativa; criatura compatível em até 5 metros (3 turnos)'))add('regen',5);receipt('Criar Matriz de Regeneração',{costRC:15,limit:'30 Vida; 5 metros; 3 turnos; não acumula'});break;
      case 34: break;
      case 35: count('Minas simultâneas (25% de uma Kagune por mina)',3);receipt('Plantar uma Mina Orgânica',{costRC:5,limit:'Detonação: 100 metros; uma ação; máximo um dano normal da Kagune somado'});break;
      case 36: receipt('Plantar Semente de Kagune',{costRC:8,limit:'Cresce após 1 turno; dura 3; extensão 10 Vida, 25% do dano; ações compartilhadas'});break;
      case 37: receipt('Rastreador de Carne após ferir o alvo',{costRC:2,limit:'4 horas; 100 metros; direção aproximada'});break;
      case 38: receipt('Implantar Parasita RC',{costRC:6,limit:'5 Vida; 3 turnos; não causa dano'});break;
      case 39: break;
      case 40: count('RC armazenado no Pulmão; não conta para porcentagens',10);break;
      case 41: if(flag('Hemorragia Controlada no próximo ataque')){attack(2,4);receipt('Hemorragia Controlada',{costLife:packPercent(lifeMax,5),limit:'1/turno'});}break;
      case 42: receipt('Autólise',{costLife:10,restoreRC:4,limit:'2/combate'});break;
      case 43:{const m=mode('Fase da Sobrecarga Adrenal',[['none','Inativa'],['bonus','Neste turno: mobilidade e Reação'],['penalty','Próximo turno: −2 Esquiva']]);if(m==='bonus'){add('movement',2);add('reactions',1);receipt('Sobrecarga Adrenal',{costRC:4,limit:'Máximo uma Reação extra por esta propriedade/turno'});}if(m==='penalty')defense(0,-2);break;}
      case 44: if(flag('Passou turno imóvel, sem atacar e sem receber dano'))receipt('No início do novo turno em Hibernação',{restoreRC:2,limit:'Receber dano encerra'});break;
      case 45: receipt('Aumentar Fome em um estágio para recuperar RC',{restoreRC:packPercent(rcMax,10),limit:'1/combate'});break;
      case 46:{const m=mode('Material consumido nesta ação',[['none','Nenhum'],['human','Carne humana'],['ghoul','Carne ghoul']]);if(m!=='none')receipt('Alimentação de Emergência',{restoreRC:m==='ghoul'?4:2,limit:'1/combate; mesmo material só conta uma vez'});break;}
      case 47: if(flag('Característica temporária aplicável à ação atual'))attack(1);break;
      case 48: break;
      case 49:{const bonus=count('Bônus permanente destinado à ação específica atual',3);const m=mode('Atributo da ação registrada atual',[['none','Sem teste'],...attributes.map(a=>[a,a] as [string,string])]);if(m!=='none')check(m as AttributeKey,bonus);receipt(`Aprendizado Reativo: +${bonus} no teste registrado`,{limit:'Máximo +3 total, distribuído entre ações; registre o histórico'});break;}
      case 50: break;
      case 51: break;
      case 52: count('Pressão Evolutiva acumulada (evolução paga e aprovada)',3);break;
      case 53: break;
      case 54: break;
      case 55: break;
      case 56: break;
      case 57: break;
      case 58: break;
      case 59: receipt('Falsa Morte: sinais quase imperceptíveis por até 10 minutos',{costRC:8});break;
      case 60: break;
      case 61: break;
      case 62: attack(count('Rodadas perseguindo exclusivamente a Presa',3));break;
      case 63: receipt(`Transferir RC consentido ao aliado: ${count('RC transferido neste turno',3)}`,{limit:'3 RC/turno; debitar do doador e creditar ao receptor; não é recuperação'});break;
      case 64: simple('Próxima ação relacionada ao sucesso de aliado vinculado (1/rodada)',1);break;
      case 65:{const n=count('Inimigos derrubados na sequência desta rodada',2);attack(n===0?0:n===1?2:3);break;}
      case 66: attack(0,count('Inimigos diferentes já feridos neste turno',5));break;
      case 67: attack(count('Rodadas sobrevividas contra adversário superior confirmado',5));break;
      case 68: if(flag('Atacando articulação ou sustentação de criatura muito maior'))attack(2);receipt(`RD ignorada apenas de tamanho: ${packPercent(count('RD concedida exclusivamente por tamanho',999999,'value'),25)}`);break;
      case 69:{const bonus=2*count('Categorias de tamanho acima da forma normal',3);const m=mode('Teste atual contra deslocamento',[['none','Sem teste'],['forca','Força'],['vigor','Vigor'],['agilidade','Agilidade']]);if(m!=='none')check(m as AttributeKey,bonus);receipt(`Contra empurrões, arremessos e agarrões: +${bonus}`);break;}
      case 70: if(flag('Kagune Compactada; desativa Expansão')){multiply('rangeMultiplier',.5);attack(0,0,1.15,'kagune');}break;
      case 71:{const compact=NEW_PACK_DEFINITIONS.find(d=>d.kind==='property'&&d.ordinal===70);const compactActive=compact&&isPackDefinitionEligible(compact,context)&&states[compact.id]?.active;if(flag('Kagune Expandida; desativa Compactação')&&!compactActive){multiply('rangeMultiplier',1.5);attack(0,0,.85,'kagune');}break;}
      case 72:{const m=mode('Densidade escolhida ao manifestar',[['none','Normal'],['light','Leve: +1 Deslocamento, −2 RD'],['dense','Densa: +2 RD, −1 Deslocamento']]);if(m==='light'){add('movement',1);add('rd',-2);}if(m==='dense'){add('movement',-1);add('rd',2);}break;}
      case 73: attack(0,2*count('Impactos consumidos neste ataque',3));break;
      case 74: receipt('Campo de Pressão até o próximo turno; interrompe entrada se alvo falhar teste físico',{costRC:6});break;
      case 75: simple('Primeiro ataque contra quem está agarrando você',3,0,1,'kagune');break;
      case 76: receipt('Ferrão Oculto: ataque curto sem manifestar toda a Kagune',{limit:'1/combate; ação normal'});break;
      case 77: receipt('Reflexo de Morte: uma ação simples antes da inconsciência',{limit:'1/sessão; sem Suprema, cura própria, turno extra ou reativação'});break;
      case 78: break;
      case 79: count('Sangue de Reserva preenchido apenas por alimentação',10);break;
      case 80:{const m=mode('Característica da presa mantida por 4 horas',[['none','Nenhuma'],...attributes.map(a=>[a,`+1 ${a}`] as [string,string]),['rd','+2 RD']]);if(attributes.includes(m as AttributeKey)){b.attributes[m as AttributeKey]+=1;applied=true;}if(m==='rd')add('rd',2);break;}
      case 81: break;
      case 82: receipt('Máscara Celular: alterar assinatura RC superficial',{costRC:5});break;
      case 83: break;
      case 84: break;
      case 85: receipt('Ciclo Fechado: devolver 1 RC após ação útil que não causou dano nem concedeu benefício',{restoreRC:1,limit:'Máximo 2 RC/turno; conversões e ações vazias não contam'});break;
      case 86:{const n=count('Acerto sacrificado neste ataque',3);attack(-n,2*n);break;}
      case 87:{const n=count('Passos sacrificados neste ataque',6);attack(Math.floor(n/2),-n);break;}
      case 88:{const m=mode('Direção da conversão defensiva',[['none','Sem conversão'],['dodge','Bloqueio → Esquiva'],['block','Esquiva → Bloqueio']]);const selected=count('Pontos convertidos até o próximo turno',4);const n=Math.min(selected,m==='dodge'?packFloor(context.baseBlock,4):packFloor(context.baseDodge,4));if(m==='dodge')defense(-n,n);if(m==='block')defense(n,-n);break;}
      case 89:{const m=mode('Distribuição até o fim da rodada',[['none','Inativa'],['hit-block','+3 Acerto / −3 Bloqueio'],['hit-dodge','+3 Acerto / −3 Esquiva'],['block-hit','+3 Bloqueio / −3 Acerto'],['block-dodge','+3 Bloqueio / −3 Esquiva'],['dodge-hit','+3 Esquiva / −3 Acerto'],['dodge-block','+3 Esquiva / −3 Bloqueio']]);const [plus,minus]=m.split('-');if(plus==='hit')attack(3);if(minus==='hit')attack(-3);if(plus==='block')defense(3);if(minus==='block')defense(-3);if(plus==='dodge')defense(0,3);if(minus==='dodge')defense(0,-3);break;}
      case 90:{const m=mode('Último patamar de RC ativado neste combate',[['none','Nenhum'],['0','0%: +2 RD'],['25','25%: +2 Passos'],['50','50%: +1 Acerto'],['75','75%: +1 Esquiva'],['100','100%: próximo custo −1 RC']]);if(m==='0')add('rd',2);if(m==='25')attack(0,2);if(m==='50')attack(1);if(m==='75')defense(0,1);if(m==='100')discount(1);break;}
      case 91:{const n=count('Efeitos positivos condicionais ativos diferentes',5);attack(0,0,1+n*.02);result.rcCostIncrease+=Math.floor(n/3);break;}
      case 92: if(hp<.5)add('regen',1);if(rp<.5&&flag('Primeiro desconto de Homeostase neste turno'))discount(1);if(hp>.5&&rp>.5)attack(1);break;
      case 93:{const m=mode('Fase e recurso do Desequilíbrio',[['none','Inativo'],['life','Vida temporária: teto 120% por 3 turnos'],['rc','RC: teto 120% por 3 turnos'],['penalty','Após terminar: −2 Acerto/Bloqueio/Esquiva por 1 turno']]);if(m==='life')result.temporaryLifeCapMultiplier=1.2;if(m==='rc')result.temporaryRCCapMultiplier=1.2;if(m==='penalty'){attack(-2);defense(-2,-2);}break;}
      case 94: attack(0,2*count('Ataques consecutivos na mesma região antes deste',3));break;
      case 95: simple('Condição permanente da sua assinatura foi cumprida',0,3);break;
      case 96: if(flag('Você está no habitat escolhido permanentemente')){attack(1);check('percepcao',1);receipt('Percepção efetiva no habitat: +1');}break;
      case 97: if(flag('Ambiente escuro')){check('percepcao',2);receipt('Percepção em combate no escuro: +2');if(count('Primeiro ataque após ocultar-se: 1 sim / 0 não',1))attack(2);}break;
      case 98:{const bonus=count('Turnos parado sem se mover',3);if(flag('Aplicar ao teste de Furtividade atual'))check('agilidade',bonus);receipt(`Furtividade por permanecer parado: +${bonus}`);break;}
      case 99: break;
      case 100: break;
    }
    if(numericSnapshot){
      // Keep the controls and rule text visible while the weapon is put away.
      // Restore every numeric contribution of this entry, without mutating saved conditions.
      Object.assign(b,numericSnapshot.bonuses);
      for(const key of Object.keys(numericSnapshot) as Array<keyof PackEffects>){
        if(key==='bonuses'||Array.isArray(numericSnapshot[key])||key==='rules')continue;
        (result as unknown as Record<string,unknown>)[key]=numericSnapshot[key];
      }
      for(const item of result.receipts.slice(receiptStart)){item.disabled=true;item.disabledReason='Requer Kagune ou Quinque manifestada.';}
      applied=false;
    }
    if(!suspended){const physical=b.physicalHit-physicalHitBefore,kagune=b.kaguneHit-kaguneHitBefore;result.carrierHit+=physical===0?kagune:kagune===0?physical:Math.max(physical,kagune);}
    if(applied)result.activePerkIds.push(definition.id);
  }
  result.rdMultiplier=Math.min(PACK_RD_MULTIPLIER_CAP,Math.max(0,result.rdMultiplier));
  result.kaguneRDMultiplier=Math.min(PACK_RD_MULTIPLIER_CAP,Math.max(0,result.kaguneRDMultiplier));
  // These two conditions depend on the RD after every other selected effect. Resolve
  // them once, after contributions are collected, instead of feeding a sacrifice
  // or its extra damage back into the resource calculation.
  const hasProjection=typeof context.projectedRD==='number'&&Number.isFinite(context.projectedRD);
  const availableRD=Math.max(0,hasProjection?packFloor(context.projectedRD):Math.floor((packFloor(context.baseRD)+b.rd)*result.rdMultiplier));
  if(rdSacrificeRequest){
    result.rdSacrifice=Math.min(availableRD,rdSacrificeRequest.amount);
    b.kaguneSteps+=Math.floor(result.rdSacrifice/2);
    if(result.rdSacrifice>0)result.activePerkIds.push(rdSacrificeRequest.id);
  }
  if(fragileKaguneId&&availableRD-result.rdSacrifice<5){
    result.damageMultiplier.kagune*=1.18;
    result.activePerkIds.push(fragileKaguneId);
  }
  result.damageMultiplier.physical=Math.min(PACK_DAMAGE_MULTIPLIER_CAP,Math.max(0,result.damageMultiplier.physical));
  result.damageMultiplier.kagune=Math.min(PACK_DAMAGE_MULTIPLIER_CAP,Math.max(0,result.damageMultiplier.kagune));
  result.structureDamageMultiplier=Math.min(PACK_STRUCTURE_DAMAGE_MULTIPLIER_CAP,Math.max(0,result.structureDamageMultiplier));
  result.regenMultiplier=Math.min(PACK_REGEN_MULTIPLIER_CAP,Math.max(0,result.regenMultiplier));
  result.lifeMultiplier=Math.min(2,Math.max(0,result.lifeMultiplier));
  result.rcMultiplier=Math.min(2,Math.max(0,result.rcMultiplier));
  result.penetrationPercent=Math.min(PACK_PENETRATION_CAP,Math.max(0,result.penetrationPercent));
  for(const [key,value] of Object.entries(b))if(typeof value==='number')(b as unknown as Record<string,unknown>)[key]=Math.floor(value);
  return result;
}
