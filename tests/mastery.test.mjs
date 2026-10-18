import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const rules=await vite.ssrLoadModule('/app/page.tsx');
const {masteryEvolutions,tailAttackCost,growthBonus}=await vite.ssrLoadModule('/app/kakuhou-mastery.ts');
const {blankVats,vatsAction}=await vite.ssrLoadModule('/app/vats-engine.ts');
const sheet=(family,selected=[],extra={})=>rules.normalizeCharacter({species:'ghoul',grade:12,weaponKind:'kagune',kaguneType:family,kaguneActive:true,currentRC:100,baseAttributes:{forca:8,vigor:8,precisao:8,agilidade:8,raciocinio:4,percepcao:4,presenca:4,controle:4},selectedEvolutions:selected,...extra},7);
const dice=s=>Number(s.match(/^\d+/)[0]);

test('15 evoluções, custos cumulativos, descontos e graus por nível',()=>{
 assert.equal(masteryEvolutions.length,15);
 for(const family of ['Koukaku','Rinkaku','Bikaku'])assert.equal(masteryEvolutions.filter(x=>x.family===family).length,5);
 for(const [id,dependency,costs,grades] of [['arquitetura-cerco','eixo-aco',[12,16],[10,12]],['consciencia-tentacular','sinapse-distribuida',[8,10,12],[10,10,12]],['dominio-centro','instinto-exatidao',[12,16],[10,12]]]){
  const item=masteryEvolutions.find(x=>x.id===id);
  assert.equal(rules.evolutionCostsForSheet(item,costs.length,'ghoul').paidTotal,costs.reduce((a,b)=>a+b,0));
  assert.equal(rules.evolutionCostsForSheet(item,costs.length,'ghoul-dominante').paidTotal,costs.reduce((a,b)=>a+b-3,0));
  grades.forEach((g,i)=>{assert.equal(rules.evolutionRequirementStatus(item,sheet(item.family,[dependency],{grade:g}),undefined,undefined,i+1).met,true);assert.equal(rules.evolutionRequirementStatus(item,sheet(item.family,[dependency],{grade:g-2}),undefined,undefined,i+1).met,false);});
  assert.equal(rules.evolutionRequirementStatus(item,sheet(item.family)).met,false);
 }
});

test('Koukaku aplica +6 dados, Passos por Vigor base, alcance e bloqueio em cálculos reais',()=>{
 const plain=rules.calculateCharacter(sheet('Koukaku'));
 const powered=rules.calculateCharacter(sheet('Koukaku',['eixo-aco','arquitetura-cerco','arquitetura-cerco','nucleo-impacto','lamina-telescopica','guarda-estrutural']));
 assert.equal(dice(powered.kaguneTest)-dice(plain.kaguneTest),6);
 assert.equal(powered.kaguneSteps-plain.kaguneSteps,4);
 assert.equal(powered.kaguneDamageModifier,plain.kaguneDamageModifier);
 assert.equal(powered.distance-plain.distance,2);
 assert.equal(dice(powered.blockTest)-dice(plain.blockTest),2);
 assert.equal(powered.mastery.stability,2);
});

test('Bikaku aplica +7 dados, defesa simultânea, Passos e Movimento; retrair remove bônus novos',()=>{
 const ids=['instinto-exatidao','dominio-centro','dominio-centro','equilibrio-absoluto','gume-integral','continuidade-predatoria'];
 const plain=rules.calculateCharacter(sheet('Bikaku')),on=rules.calculateCharacter(sheet('Bikaku',ids)),off=rules.calculateCharacter(sheet('Bikaku',ids,{kaguneActive:false}));
 assert.equal(dice(on.kaguneTest)-dice(plain.kaguneTest),7);
 assert.equal(on.kaguneSteps-plain.kaguneSteps,2);
 assert.equal(on.movement-plain.movement,1);
 assert.equal(dice(on.blockTest)-dice(plain.blockTest),2);
 assert.equal(dice(on.dodgeTest)-dice(plain.dodgeTest),2);
 assert.equal(off.mastery.hit,0);assert.equal(off.mastery.steps,0);assert.equal(off.mastery.movement,0);
});

test('Rinkaku aplica +5 a cada teste, conserva caudas permanentes e recupera Dureza',()=>{
 const ids=['sinapse-distribuida','consciencia-tentacular','consciencia-tentacular','consciencia-tentacular','tendoes-longo-alcance','circuito-rc-eficiente','trama-sustentacao','multiplas-caudas-plus'];
 const plain=rules.calculateCharacter(sheet('Rinkaku')),on=rules.calculateCharacter(sheet('Rinkaku',ids,{effects:{'multiplas-caudas':{rank:4}}}));
 assert.equal(dice(on.kaguneTest)-dice(plain.kaguneTest),5);
 assert.equal(on.distance-plain.distance,2);
 assert.equal(on.rinkakuTailCount,6);assert.equal(on.maximumTails,6);
 assert.equal(on.kaguneDurability,on.rawKaguneDurability+5);
 assert.equal(on.tailAttackRC,1);
 assert.equal(tailAttackCost(0,true),0);assert.equal(tailAttackCost(1,true),1);assert.equal(tailAttackCost(5,true),4);
});

test('imagens independentes sobrevivem à migração e ao JSON da ficha',()=>{
 const old=sheet('Bikaku');assert.equal(old.kakuja.incompleteImage,'');assert.equal(old.kakuja.completeImage,'');
 old.kakuja.incompleteImage='data:image/png;base64,AAAA';old.kakuja.completeImage='data:image/webp;base64,BBBB';
 const saved=rules.normalizeCharacter(JSON.parse(JSON.stringify(old)),7);
 assert.equal(saved.kakuja.incompleteImage,old.kakuja.incompleteImage);assert.equal(saved.kakuja.completeImage,old.kakuja.completeImage);
 saved.kakuja.completeImage='';assert.equal(saved.kakuja.incompleteImage,old.kakuja.incompleteImage);
});

const cfg={maxLife:30,maxRC:100,rc:20,hunger:0,vigor:8,baseVigor:8,grade:12,regeneration:0,regenLevel:0,superior:0,cells:false,kami:false,hasKagune:true,kaguneActive:true,durability:40,tails:3,powers:['continua-crescendo'],rd:0,movement:1,dodgeTest:'8d8',blockTest:'8d8'};
test('Crescimento dá 1 acúmulo e 2 Passos por destruição inimiga, máximo igual às caudas',()=>{
 let v=blankVats();
 for(let i=0;i<3;i++)v=vatsAction(v,cfg,{type:'break',index:i,enemy:true}).vats;
 assert.equal(v.growth,3);assert.equal(growthBonus(v.growth,cfg.tails),6);
 assert.equal(vatsAction(v,cfg,{type:'break',index:0,enemy:true}).vats.growth,3);
 const unpaid=vatsAction(v,{...cfg,rc:3},{type:'growth'});assert.equal(unpaid.currentRC,3);assert.equal(unpaid.vats.growth,3);assert.ok(unpaid.vats.parts.every(x=>x.ready>0));
 const healed=vatsAction(v,cfg,{type:'growth'});assert.equal(healed.currentRC,16);assert.equal(healed.vats.growth,0);assert.ok(healed.vats.parts.every(x=>x.ready===0&&x.damage===0));
 assert.equal(vatsAction(blankVats(),cfg,{type:'break',index:0,enemy:false}).vats.growth,0);
 assert.equal(growthBonus(12,3),6);
 const baseline=rules.calculateCharacter(sheet('Rinkaku',['continua-crescendo'],{effects:{'multiplas-caudas':{rank:2}}}));
 const boosted=rules.calculateCharacter(sheet('Rinkaku',['continua-crescendo'],{effects:{'multiplas-caudas':{rank:2}},vats:v}));
 assert.equal(boosted.kaguneSteps-baseline.kaguneSteps,6);
});

test('ataque pago da cauda cobra RC descontado e respeita integridade',()=>{
 const c={...cfg,paidTailStart:1,tailAttackRC:1};
 const hit=vatsAction(blankVats(),c,{type:'tail-attack',index:1});assert.equal(hit.currentRC,19);
 assert.equal(vatsAction(hit.vats,{...c,rc:0},{type:'tail-attack',index:1}).currentRC,0);
 const broken=vatsAction(hit.vats,c,{type:'break',index:1}).vats;
 assert.equal(vatsAction(broken,c,{type:'tail-attack',index:1}).currentRC,20);
 assert.equal(vatsAction(hit.vats,c,{type:'tail-attack',index:0}).currentRC,20);
});
