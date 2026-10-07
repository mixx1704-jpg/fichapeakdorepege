import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const qRules=await vite.ssrLoadModule('/app/quinque.ts');
const rules=await vite.ssrLoadModule('/app/page.tsx');
const data=await vite.ssrLoadModule('/app/data.ts');
const {normalizeQuinque,calculateQuinque,quinqueAllowsEffect,quinqueAllowsEvolution,quinqueEffectMissing,quinqueEvolutionMissing}=qRules;
const q=(patch={})=>normalizeQuinque({rcType:'Koukaku',grade:10,creationGrade:4,attributes:{vigor:8},...patch});

test('Quinque mantém 8 + criação e recebe a progressão completa do próprio Grau',()=>{
 for(const [grade,gain] of [[2,0],[4,10],[6,30],[8,60],[10,100],[12,150],[14,210]])assert.equal(calculateQuinque(q({grade,bonusPE:7})).available,8+4+gain+7);
 let weapon=q({grade:2});weapon=rules.registerEarnedPE(weapon,10);
 assert.equal(calculateQuinque(weapon).available,22);
 weapon=rules.advanceGradeIfReady(weapon);assert.equal(weapon.grade,4);assert.equal(weapon.progressPE,0);assert.equal(calculateQuinque(weapon).available,22);
});
test('atributos, RD, Dureza e PE das armas não alteram o personagem ou outra Quinque',()=>{
 const first=q({name:'A',bonusPE:12,rdOverride:23,durabilityOverride:145}),second=q({name:'B',attributes:{vigor:2}});
 const owner=rules.normalizeCharacter({species:'ghoul',weaponKind:'kagune',grade:12,kaguneType:'Bikaku',quinques:[first,second]},7);
 const before=rules.calculateCharacter(owner),weapon=calculateQuinque(first);
 assert.equal(weapon.rd,23);assert.equal(weapon.durability,145);assert.equal(weapon.primaryAttribute,'vigor');assert.equal(weapon.activeAttributes.vigor,8);
 const after=rules.calculateCharacter({...owner,quinques:[q({...first,bonusPE:999,attributes:{vigor:12}}),second]});
 for(const key of ['peSpent','peAvailable','rd','kaguneTest','kaguneDamage','maxRC'])assert.equal(after[key],before[key],key);
 assert.equal(calculateQuinque(second).activeAttributes.vigor,2);
 assert.equal(calculateQuinque(q({rdOverride:0,durabilityOverride:0})).rd,0);
 assert.equal(calculateQuinque(q({rdOverride:null})).rd,2);
});
test('cada tipo tem catálogo exclusivo mais efeitos universais; Bikaku não herda outros tipos',()=>{
 for(const family of ['Ukaku','Koukaku','Rinkaku','Bikaku']){
  const weapon=q({rcType:family});
  for(const effect of data.kaguneEffects.filter(e=>e.family!=='Geral'&&e.family!==family))assert.equal(quinqueAllowsEffect(weapon,effect),false,effect.id);
  for(const evolution of data.evolutions.filter(e=>e.family!=='Geral'&&e.family!==family))assert.equal(quinqueAllowsEvolution(weapon,evolution),false,evolution.id);
  assert.equal(quinqueAllowsEffect(weapon,data.kaguneEffects.find(e=>e.id==='aumentar-dano')),true);
 }
 assert.equal(quinqueAllowsEffect(q(),data.kaguneEffects.find(e=>e.id==='forma-versatil')),true);
 assert.equal(quinqueAllowsEffect(q({rcType:'Rinkaku'}),data.kaguneEffects.find(e=>e.id==='regeneracao-superior')),false);
});
test('graus, limites e pré-requisitos usam a arma; trocas incompatíveis não concedem bônus',()=>{
 const architecture=data.evolutions.find(e=>e.id==='arquitetura-cerco');
 assert.deepEqual(quinqueEvolutionMissing(q({evolutions:['eixo-aco']}),architecture,1),[]);
 assert.ok(quinqueEvolutionMissing(q({evolutions:['eixo-aco']}),architecture,2).length);
 assert.deepEqual(quinqueEvolutionMissing(q({grade:12,evolutions:['eixo-aco']}),architecture,2),[]);
 const foreign=q({rcType:'Bikaku',evolutions:['eixo-aco','arquitetura-cerco']});
 assert.equal(calculateQuinque(foreign).mastery.hit,0);assert.ok(calculateQuinque(foreign).invalidEvolutions.includes('eixo-aco'));
 const steps=data.kaguneEffects.find(e=>e.id==='aumentar-passos');
 assert.ok(quinqueEffectMissing(q({grade:2}),steps,6).length);
});
test('compras e habilidades autorais são cobradas uma vez na arma, sem desconto racial do dono',()=>{
 const weapon=q({evolutions:['eixo-aco','arquitetura-cerco'],effects:{'aumentar-dano':{rank:2}},customSkills:[{id:'own',name:'Ajuste',cost:5,activation:'passive',enabled:true,effects:[{id:'eff',type:'hit-dice',value:2,scope:'kagune',attribute:'vigor'}]}]});
 const d=calculateQuinque(weapon);assert.equal(d.evolutionPE,22);assert.equal(d.customSkillsPE,5);assert.equal(d.spent,d.attributePE+d.effectPE+22+5);
 assert.equal(parseInt(d.kaguneTest),14);
});
test('migração salva a Quinque antiga uma vez e preserva atributos do dono e imagens',()=>{
 const old={id:'old',species:'humano',grade:12,weaponKind:'quinque',kaguneName:'Legado',kaguneType:'Koukaku',sourceGhoulGrade:8,baseAttributes:{vigor:6},effects:{'bloqueio-ferro':{rank:1}},perks:{'mil-p0801':{rank:1}},kakuja:{incompleteImage:'data:image/png;base64,test'}};
 const migrated=rules.normalizeCharacter(old,7);assert.equal(migrated.quinques.length,1);assert.equal(migrated.quinques[0].grade,8);assert.equal(migrated.quinques[0].name,'Legado');assert.equal(migrated.quinques[0].attributes.vigor,6);assert.equal(migrated.baseAttributes.vigor,6);assert.equal(migrated.weaponKind,'nenhum');assert.deepEqual(migrated.effects,{});assert.equal(migrated.quinques[0].effects['bloqueio-ferro'].rank,1);assert.ok(migrated.quinques[0].perks['mil-p0801']);assert.equal(migrated.perks['mil-p0801'],undefined);
 const reloaded=rules.normalizeCharacter(JSON.parse(JSON.stringify(migrated)),7);assert.equal(reloaded.quinques.length,1);assert.equal(reloaded.kakuja.incompleteImage,old.kakuja.incompleteImage);
});
