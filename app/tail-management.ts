export type TailRole = 'attack' | 'guard' | 'dodge' | 'utility';
export type TailPart = {damage:number;ready:number;sacrificedUntil:number;name?:string;enabled?:boolean;role?:TailRole;notes?:string};
export function tailAvailability(part:TailPart|undefined, manifested:boolean, turn:number, kakuhouUntil:number) {
 if(!manifested||kakuhouUntil>turn)return 'Kagune indisponível';
 if(part?.ready||part?.sacrificedUntil && part.sacrificedUntil>turn)return 'Quebrada / sacrificada';
 if(part?.enabled===false)return 'Recolhida';
 return 'Disponível';
}
export function tailLoadout(parts:TailPart[],capacity:number,manifested:boolean,turn:number,kakuhouUntil:number,eightPaths:boolean) {
 const available=Array.from({length:capacity},(_,i)=>i).filter(i=>tailAvailability(parts[i],manifested,turn,kakuhouUntil)==='Disponível');
 const attacks=available.filter(i=>!parts[i]?.role||parts[i].role==='attack');
 // Oito Caminhos reserves one tail for one defense, never stacks per tail.
 const reserved=eightPaths?available.find(i=>parts[i]?.role==='guard'||parts[i]?.role==='dodge'):undefined;
 return {available,attacks,reserved,rd:reserved!==undefined&&parts[reserved]?.role==='guard'?2:0,dodge:reserved!==undefined&&parts[reserved]?.role==='dodge'?2:0};
}
