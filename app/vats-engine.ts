import injuries from './vats-injuries.json';

export const regions = [ ['head','Cabeça','head'], ['torso','Tronco','torso'], ['armL','Braço esquerdo','arm'], ['armR','Braço direito','arm'], ['legL','Perna esquerda','leg'], ['legR','Perna direita','leg'] ] as const;
export type RegionId = typeof regions[number][0];
export const injuryGroups: Record<string, string[][]> = injuries;
export const injuryByName = Object.fromEntries(Object.values(injuryGroups).flat().map(x => [x[0], x]));
export type BodyRegion = { damage: number; destroyed: boolean; effects: string[] };
export type VatsState = { turn: number; body: Record<RegionId, BodyRegion>; global: string[]; meter: number; healedTurn: number; kakuhouUntil: number; parts: { damage: number; ready: number; sacrificedUntil: number }[]; log: string[]; rcSpent: number; fleshUntil: number; fleshUsed: boolean; centipedeUntil: number; centipedeUsed: boolean; freeTailTurn: number; hydraTurn: number; axolotlTurn: number; fortressTurn: number; fortressBonus: number; sacrifices: number; growth: number; breathe: number; secondWind: boolean; angel: number };
export const blankVats = (): VatsState => ({ turn:1, body:Object.fromEntries(regions.map(([id]) => [id,{damage:0,destroyed:false,effects:[]}])) as unknown as VatsState['body'],global:[],meter:0,healedTurn:0,kakuhouUntil:0,parts:[],log:[],rcSpent:0,fleshUntil:0,fleshUsed:false,centipedeUntil:0,centipedeUsed:false,freeTailTurn:0,hydraTurn:0,axolotlTurn:0,fortressTurn:0,fortressBonus:0,sacrifices:0,growth:0,breathe:0,secondWind:false,angel:0 });
const positive = (v: unknown) => Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0);
export function normalizeVats(input?: Partial<VatsState>): VatsState {
 const base=blankVats(); if(!input || typeof input!=='object') return base;
 for(const key of Object.keys(base) as (keyof VatsState)[]) if(typeof base[key]==='number') (base as unknown as Record<string,unknown>)[key]=positive(input[key] ?? base[key]);
 base.turn=Math.max(1,Math.floor(base.turn));
 for(const [id] of regions){const r=input.body?.[id]; base.body[id]={damage:positive(r?.damage),destroyed:!!r?.destroyed,effects:Array.isArray(r?.effects)?r.effects.filter(e=>typeof e==='string'&&injuryByName[e]):[]};}
 base.global=Array.isArray(input.global)?input.global.filter(e=>injuryGroups.global.some(x=>x[0]===e)):[];
 base.parts=Array.isArray(input.parts)?input.parts.slice(0,50).map(p=>({damage:positive(p.damage),ready:positive(p.ready),sacrificedUntil:positive(p.sacrificedUntil)})):[];
 base.log=Array.isArray(input.log)?input.log.filter(s=>typeof s==='string').slice(0,80):[];
 base.fleshUsed=!!input.fleshUsed; base.centipedeUsed=!!input.centipedeUsed; base.secondWind=!!input.secondWind;
 return base;
}
export function kaguneRange(type:string,rank:number,bonus:number) {return Math.max(0,(type==='Koukaku'?0:1)+Math.min(type==='Koukaku'?2:4,positive(rank))+(Number.isFinite(bonus)?bonus:0));}
export function effectsOf(v:VatsState) {return [...v.global,...regions.flatMap(([id])=>v.body[id].effects)];}
export function penalties(v:VatsState) {
 const all=effectsOf(v), has=(n:string)=>all.includes(n);
 const physical=-(all.filter(n=>n==='Sangramento Grave').length+(has('Órgãos Destruídos')?1:0)+(has('Sub-Vivo')?2:0));
 const mental=has('Concussão')?-1:0, agility=has('Coluna Danificada')?-2:0;
 const legPenalty=Math.max(...['legL','legR'].map(id=>v.body[id as RegionId].destroyed||v.body[id as RegionId].effects.includes('Perna Destruída')?3:v.body[id as RegionId].effects.includes('Perna Quebrada')?2:0));
 return {physical,mental,agility,dodge:physical+agility-legPenalty-(has('Empalado')?2:0)-(has('Caído')?1:0),effort:has('Dois Pulmões Comprometidos')?-3:has('Pulmão Perfurado')?-2:0,vision:has('Um Olho Destruído')?-1:0,hearing:has('Ouvido Rompido')?-1:0,next:has('Atordoado')?-2:0,regenCost:(has('Órgãos Destruídos')?1:0)+(has('Sub-Vivo')?1:0),movement:has('Coluna Quebrada')||has('Esmagado')||has('Empalado')?0:legPenalty===3?0:legPenalty===2?.5:1,actions:has('Colapsado')?1:null,reaction:!has('Colapsado'),exhausted:has('Exaurido de RC')};
}
export const adjustTest=(test:string,delta:number)=>test.replace(/^\d+d8/,s=>`${Math.max(0,parseInt(s)+delta)}d8`);
export type VatsConfig={ maxLife:number; maxRC:number; rc:number; hunger:number; vigor:number; baseVigor:number; grade:number; regeneration:number; regenLevel:number; superior:number; cells:boolean; kami:boolean; hasKagune:boolean; durability:number; tails:number; powers:string[]; rd:number; movement:number; dodgeTest:string; blockTest:string; centipedeAllowed?:boolean; tests?:Record<string,string> };
export type VatsAction={type:string; region?:RegionId; amount?:number; effect?:string; index?:number; enemy?:boolean; reduceRD?:boolean};
export function passivePreview(v:VatsState,c:VatsConfig) {
 const biological=c.regeneration, cells=c.cells?Math.floor(c.maxLife/6)+(biological===0?c.grade:0):0;
 const amount=Math.max(0,Math.floor(biological*(c.kami||v.fleshUntil>v.turn?2:1)+cells));
 const total=regions.reduce((s,[id])=>s+(v.body[id].destroyed?0:Math.min(amount,Math.min(c.maxLife,v.body[id].damage))),0);
 const threshold=c.maxLife+c.regenLevel;
 const cost=(c.regenLevel>0?Math.floor((v.meter+total)/threshold)*2:0)+(total?penalties(v).regenCost:0);
 return {amount,total,cost,threshold};
}
export function vatsAction(source:VatsState,c:VatsConfig,a:VatsAction,roll:(s:number)=>number=s=>Math.floor(Math.random()*s)+1) {
 const v=normalizeVats(source); let rc=Math.min(c.maxRC,positive(c.rc)),hunger=c.hunger;
 const log=(s:string)=>{v.log.unshift(`T${v.turn} · ${s}`);v.log=v.log.slice(0,80);};
 const spend=(n:number)=>{if(rc<n||penalties(v).exhausted){log('Ação indisponível: RC insuficiente ou exaustão.');return false;}rc-=n;v.rcSpent+=n;return true;};
 const gain=(n:number)=>{if(v.fleshUntil>v.turn){log('Recuperação de RC bloqueada por Carne que se Recusa.');return;}rc=Math.min(c.maxRC,rc+n);};
 const heal=(n:number)=>{for(const [id] of regions) if(!v.body[id].destroyed) v.body[id].damage=Math.max(0,Math.min(c.maxLife,v.body[id].damage)-n);};
 const breakPart=(index:number,enemy=false)=>{const p=v.parts[index]; if(!p||p.ready)return; p.damage=c.durability;p.ready=v.turn+2; if(enemy&&c.powers.includes('continua-crescendo'))v.growth=Math.min(5,v.growth+.5); if(v.centipedeUntil>v.turn&&v.freeTailTurn!==v.turn){p.damage=0;p.ready=0;v.freeTailTurn=v.turn;log('Centopeia: primeira cauda regenerada gratuitamente.');}else log(`Kagune ${index+1} quebrada; regeneração no turno ${p.ready}.`);};
 for(let i=v.parts.length;i<c.tails;i++)v.parts.push({damage:0,ready:0,sacrificedUntil:0});
 const r=a.region?v.body[a.region]:undefined,amount=positive(a.amount),p=v.parts[a.index??0];
 switch(a.type){
 case 'damage': if(r){const reduced=Math.max(0,amount-(a.reduceRD?c.rd:0)-v.fortressBonus);const actual=Math.min(c.maxLife,reduced);v.fortressBonus=0;r.damage=Math.min(c.maxLife,r.damage+actual);if(r.damage>=c.maxLife&&a.region!=='head'&&a.region!=='torso')r.destroyed=true;log(`${regions.find(x=>x[0]===a.region)?.[1]}: ${actual} de dano líquido.`);}break;
 case 'heal':if(r&&!r.destroyed){r.damage=Math.max(0,Math.min(c.maxLife,r.damage)-amount);log(`Cura localizada: ${amount} PV.`);}break;
 case 'destroy':if(r){r.destroyed=true;r.damage=c.maxLife;log('Região destruída.');}break;
 case 'rebuild':if(r){r.destroyed=false;r.effects=r.effects.filter(e=>!['Braço Destruído','Perna Destruída','Mão Destruída'].includes(e));log('Reconstrução autorizada pela mesa; PV não recuperados.');}break;
 case 'add':if(a.effect&&injuryByName[a.effect]){const list=injuryGroups.global.some(e=>e[0]===a.effect)?v.global:r?.effects;if(list&&!list.includes(a.effect)){const families=[['Sangramento Leve','Sangramento Grave','Hemorragia'],['Braço Ferido','Braço Quebrado','Braço Destruído'],['Perna Ferida','Perna Quebrada','Perna Destruída'],['Pulmão Perfurado','Dois Pulmões Comprometidos'],['Um Olho Destruído','Cego'],['Ouvido Rompido','Surdo'],['Coluna Danificada','Coluna Quebrada']];const family=families.find(f=>f.includes(a.effect!));if(family)for(let i=list.length-1;i>=0;i--)if(family.includes(list[i]))list.splice(i,1);list.push(a.effect);if(r&&['Braço Destruído','Perna Destruída'].includes(a.effect)){r.destroyed=true;r.damage=c.maxLife;}log(`Aplicado: ${a.effect}.`);}}break;
 case 'remove':if(a.effect){v.global=v.global.filter(e=>e!==a.effect);if(r)r.effects=r.effects.filter(e=>e!==a.effect);log(`Removido: ${a.effect}.`);}break;
 case 'consume-stun':for(const [id] of regions)v.body[id].effects=v.body[id].effects.filter(e=>e!=='Atordoado');log('Atordoado consumido no teste.');break;
 case 'passive':{if(v.healedTurn===v.turn){log('Regeneração já aplicada neste turno.');break;}const q=passivePreview(v,c);if(!q.total)break;if(spend(q.cost)){heal(q.amount);v.healedTurn=v.turn;if(c.regenLevel)v.meter=(v.meter+q.total)%q.threshold;log(`Regeneração: ${q.total} PV efetivos; ${q.cost} RC; saldo ${v.meter}/${q.threshold} PV.`);}break;}
 case 'turn':{for(const [id,name] of regions){const b=v.body[id];for(const e of b.effects){const die=e==='Sangramento Leve'?4:e==='Sangramento Grave'?6:e==='Hemorragia'?8:0;if(die){const n=roll(die);b.damage=Math.min(c.maxLife,b.damage+n);log(`${name} · ${e}: 1d${die} = ${n} PV.`);}const loss=e==='Hemorragia'?1:e==='Estômago Destruído'?2:0;if(loss){rc=Math.max(0,rc-loss);log(`${e}: −${loss} RC.`);}}if(b.damage>=c.maxLife&&!['head','torso'].includes(id))b.destroyed=true;}v.turn++;v.sacrifices=0;v.angel=0;log('Início do turno.');if(v.kakuhouUntil&&v.turn>=v.kakuhouUntil){v.kakuhouUntil=0;log('Kakuhou disponível novamente.');}break;}
 case 'kakuhou':if(c.hasKagune&&v.kakuhouUntil<=v.turn){const n=roll(6);rc=Math.max(0,rc-n);v.kakuhouUntil=v.turn+2;log(`Kakuhou destruído · vazamento 1d6 = ${n} RC · bloqueio até T${v.kakuhouUntil}.`);}break;
 case 'part-damage':if(p&&!p.ready){p.damage=Math.min(c.durability,p.damage+amount);if(p.damage>=c.durability)breakPart(a.index??0,!!a.enemy);else log(`Kagune ${(a.index??0)+1}: −${amount} PV.`);}break;
 case 'break':breakPart(a.index??0,!!a.enemy);break;
 case 'part-regen':if(p&&p.ready&&v.turn>=p.ready&&v.turn>=p.sacrificedUntil&&v.turn>=v.kakuhouUntil&&spend(2)){p.damage=0;p.ready=0;p.sacrificedUntil=0;log('Kagune regenerada · 2 RC.');}break;
 case 'hydra':if(c.powers.includes('hidra-faminta')&&p?.ready&&!p.sacrificedUntil&&v.hydraTurn!==v.turn&&v.turn>=v.kakuhouUntil&&spend(5)){p.damage=0;p.ready=0;v.hydraTurn=v.turn;log('Hidra Faminta · 5 RC · ataque desta cauda: −1d.');}break;
 case 'sacrifice':if(c.powers.includes('canibalismo-celular')&&p&&!p.ready&&v.sacrifices<2){v.sacrifices++;p.damage=c.durability;p.ready=v.turn+3;p.sacrificedUntil=p.ready;heal(Math.floor(c.maxLife*(v.sacrifices===1?.10:.05)));gain(v.sacrifices===1?4:2);log(`Canibalismo Celular · cauda bloqueada até T${p.ready}.`);}break;
 case 'growth':if(c.powers.includes('continua-crescendo')&&v.growth>=5&&v.turn>=v.kakuhouUntil){v.parts.forEach(p=>{p.damage=0;p.ready=0;p.sacrificedUntil=0;});v.growth=0;log('5 Crescimento consumidos: caudas regeneradas.');}break;
 case 'axolotl':if(c.powers.includes('axolote')&&v.axolotlTurn!==v.turn&&spend(6)){for(const [id,,type]of regions)if(type==='arm'||type==='leg'){v.body[id].destroyed=false;v.body[id].effects=v.body[id].effects.filter(e=>!['Braço Destruído','Perna Destruída','Mão Destruída'].includes(e));}v.axolotlTurn=v.turn;log('Axolote: membros reconstruídos, sem recuperar PV.');}break;
 case 'flesh':if(c.powers.includes('carne-recusa')&&!v.fleshUsed&&spend(20)){v.fleshUsed=true;v.fleshUntil=v.turn+2;for(const [id]of regions)if(!v.body[id].destroyed&&v.body[id].damage>=c.maxLife)v.body[id].damage=c.maxLife-1;log('Carne que se Recusa: 1 PV nas regiões não destruídas; regeneração ×2 por 2 turnos.');}break;
 case 'centipede':if(c.powers.includes('centopeia')&&c.centipedeAllowed!==false&&!v.centipedeUsed){v.centipedeUsed=true;v.centipedeUntil=v.turn+3;log('Centopeia por 3 turnos. Ataque extra custa 10 RC na ficha.');}break;
 case 'full':if(c.superior===4&&spend(6+penalties(v).regenCost)){heal(c.maxLife);log('Regeneração Superior: cura total das regiões não destruídas.');}break;
 case 'breathe':if(c.powers.includes('respirar-fundo')&&v.breathe<2){v.breathe++;heal(c.vigor+4);log(`Respirar Fundo: +${c.vigor+4} PV por região; ${v.breathe}/2 usos.`);}break;
 case 'second':if(c.powers.includes('segundo-folego')&&!v.secondWind&&regions.some(([id])=>v.body[id].damage>=c.maxLife/2)){v.secondWind=true;heal(Math.ceil(c.vigor/2));log('Segundo Fôlego usado.');}break;
 case 'angel':if(c.powers.includes('anjo-morte')&&v.angel<4){gain(2);v.angel+=2;log('Abate confirmado: +2 RC.');}break;
 case 'fortress':if(c.powers.includes('fortaleza-carne')&&v.fortressTurn!==v.turn&&spend(5)){v.fortressTurn=v.turn;v.fortressBonus=Math.floor(c.baseVigor/2);log(`Fortaleza de Carne: +${Math.floor(c.baseVigor/2)} RD para este golpe.`);}break;
 case 'rest':v.breathe=0;v.secondWind=false;log('Descanso: usos de Respirar Fundo e Segundo Fôlego renovados.');break;
 case 'session':v.fleshUsed=false;v.centipedeUsed=false;log('Nova sessão: habilidades por sessão renovadas.');break;
 }
 return {vats:v,currentRC:rc,hunger};
}
