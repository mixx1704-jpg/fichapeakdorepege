import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {normalizeQuinque:q,calculateQuinque:calc,quinqueAllowsEffect,quinqueAllowsPerk}=await vite.ssrLoadModule('/app/quinque.ts');
const {normalizeCharacter,calculateCharacter}=await vite.ssrLoadModule('/app/page.tsx');
const {kaguneEffects,perks}=await vite.ssrLoadModule('/app/data.ts');
const dice=s=>parseInt(s,10);
const skill={id:'def',name:'Defesa especial',description:'',cost:4,activation:'active',enabled:true,effects:[{id:'b',type:'block-dice',value:3,scope:'kagune',attribute:'vigor'},{id:'d',type:'dodge-dice',value:2,scope:'kagune',attribute:'agilidade'}]};
test('autorais somam dados às defesas do personagem e respeitam ativação',()=>{
 const sheet=normalizeCharacter({baseAttributes:{vigor:4,agilidade:3},customSkills:[]},7);
 const base=calculateCharacter(sheet),enabled=calculateCharacter({...sheet,customSkills:[skill]}),disabled=calculateCharacter({...sheet,customSkills:[{...skill,enabled:false}]});
 assert.equal(dice(enabled.blockTest),dice(base.blockTest)+3);
 assert.equal(dice(enabled.dodgeTest),dice(base.dodgeTest)+2);
 assert.equal(disabled.blockTest,base.blockTest);assert.equal(disabled.dodgeTest,base.dodgeTest);
});
test('defesa autoral e ajustes da Quinque acumulam sem contaminar acerto ou outras armas',()=>{
 const base=q({attributes:{vigor:4,agilidade:3}}),before=calc(base);
 const enhanced=calc(q({...base,customSkills:[skill],blockDice:1,dodgeDice:2,hitDice:5}));
 assert.equal(dice(enhanced.blockTest),dice(before.blockTest)+4);
 assert.equal(dice(enhanced.dodgeTest),dice(before.dodgeTest)+4);
 assert.equal(dice(enhanced.kaguneTest),dice(before.kaguneTest)+5);
 assert.equal(enhanced.customSkillsPE,4);assert.equal(calc(base).blockTest,before.blockTest);
});
test('passos, alvo e técnicas usam os mesmos cálculos de Kakuhou',()=>{
 const weapon=q({rcType:'Ukaku',grade:14,attributes:{precisao:8},effects:{'aumentar-passos':{rank:2},'estouro-rc':{rank:1}},damageSteps:3,damageModifier:4,targetKaguneType:'Bikaku',activeEffects:{'kagune:estouro-rc':true}});
 const d=calc(weapon);
 const sheet=normalizeCharacter({quinques:[],species:'ghoul',weaponKind:'kagune',grade:weapon.grade,kaguneType:weapon.rcType,kaguneActive:true,baseAttributes:weapon.attributes,effects:weapon.effects,selectedEvolutions:weapon.evolutions,damageContext:{kaguneExtraSteps:3,kaguneExtraModifier:4,targetKaguneType:'Bikaku',active:weapon.activeEffects}},7);
 const expected=calculateCharacter(sheet);
 assert.equal(d.kaguneSteps,expected.kaguneSteps);assert.equal(d.kaguneDamage,expected.kaguneDamage);
 assert.ok(d.conditions.some(x=>x.id==='estouro-rc'));
 const evolved=q({rcType:'Koukaku',grade:14,evolutions:['perda-peso'],activeEffects:{'kagune:perda-peso':true}});
 assert.equal(calc(evolved).kaguneSteps,calc(q({...evolved,activeEffects:{}})).kaguneSteps+2);
 assert.ok(calc(evolved).conditions.some(x=>x.id==='perda-peso'));
 assert.equal(quinqueAllowsEffect(q({rcType:'Rinkaku'}),kaguneEffects.find(e=>e.id==='regeneracao-superior')),true);
 const perk=perks.find(p=>p.location==='kakuhou'&&p.organGroup==='Ukaku'&&!p.requiresKakuja);
 assert.ok(perk);assert.equal(quinqueAllowsPerk(weapon,perk),true);assert.equal(quinqueAllowsPerk(q({rcType:'Koukaku'}),perk),false);
});
test('imagens e novos controles sobrevivem a exportação e importação; arquivos antigos continuam válidos',()=>{
 const image='data:image/webp;base64,dGVzdA==';
 const weapon=q({image,blockDice:2,dodgeDice:3,rdBonus:4,targetKaguneType:'Ukaku',milPenasSacrifices:2,customSkills:[skill]});
 const sheet=normalizeCharacter({kaguneImage:image,quinques:[weapon]},7);
 const restored=normalizeCharacter(JSON.parse(JSON.stringify(sheet)),7);
 assert.equal(restored.kaguneImage,image);assert.deepEqual(restored.quinques[0],weapon);
 assert.equal(q().image,'');assert.equal(q().blockDice,0);assert.equal(normalizeCharacter({},7).kaguneImage,'');
});
test('aprimoramentos corporais preservam o atributo escolhido e aplicam cada nível',()=>{
 const weapon=q({attributes:{vigor:4,forca:2},effects:{'aprimoramentos-corporais':{rank:2,target:'vigor'}}});
 const restored=q(JSON.parse(JSON.stringify(weapon)));
 assert.equal(restored.effects['aprimoramentos-corporais'].target,'vigor');
 assert.equal(calc(restored).activeAttributes.vigor,6);
 assert.equal(calc(restored).activeAttributes.forca,2);
});
