import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});after(()=>vite.close());
const {normalizeCharacter,calculateCharacter}=await vite.ssrLoadModule('/app/character.ts');
const {normalizeQuinque,calculateQuinque,quinquePerkMissing}=await vite.ssrLoadModule('/app/quinque.ts');
const {quinqueCarrierBonuses}=await vite.ssrLoadModule('/app/quinque-carrier.ts');
const {attributeKeys,perks}=await vite.ssrLoadModule('/app/data.ts');
const attributes=value=>Object.fromEntries(attributeKeys.map(key=>[key,value]));
const owner=patch=>normalizeCharacter({species:'ghoul',grade:20,narrativeLimits:true,baseAttributes:attributes(15),...patch});
const weapon=patch=>normalizeQuinque({grade:20,creationGrade:1,rcType:'Koukaku',attributes:{vigor:4},...patch});
const effect=(type,value,scope='kagune',attribute='forca')=>({id:`${type}-${scope}-${attribute}`,type,value,scope,attribute});
const skill=(effects,patch={})=>({id:'authorial',name:'Autoral',description:'',cost:7,activation:'passive',enabled:true,effects,...patch});
const successes=formula=>[...formula.matchAll(/[+-]\d+/g)].reduce((sum,match)=>sum+Number(match[0]),0);

test('atributos base, raciais e mentalidade não são copiados; todos os Passos físicos são transferidos',()=>{
 const person=owner({species:'ghoul-dominante',currentSanity:1});
 const q=weapon();const base=calculateQuinque(q),received=calculateQuinque(q,person),body=calculateCharacter(person);
 assert.equal(body.testDie,10);assert.equal(received.testDie,20);
 assert.deepEqual(received.activeAttributes,base.activeAttributes);
 assert.equal(received.kaguneTest,base.kaguneTest);
 assert.equal(received.blockTest,base.blockTest);assert.equal(received.dodgeTest,base.dodgeTest);
 assert.equal(received.kaguneSteps-base.kaguneSteps,body.physicalSteps);
 assert.equal(received.kaguneDamageModifier,base.kaguneDamageModifier);
});

test('bônus de status e acertos dos atributos são separados e acompanham o tipo da Quinque',()=>{
 const person=owner({extraDice:{vigor:3,agilidade:4},customBonuses:{attributes:{vigor:2,forca:-1}},customSkills:[skill([effect('attribute-bonus',1,'kagune','vigor'),effect('attribute-dice',2,'kagune','vigor')])]});
 const inherited=quinqueCarrierBonuses(person);
 assert.equal(inherited.attributes.vigor,3);assert.equal(inherited.attributes.forca,-1);
 assert.equal(inherited.attributeDice.vigor,5);assert.equal(inherited.attributeDice.agilidade,4);
 const q=weapon({attributeBonuses:{vigor:1},attributeDice:{vigor:2}});
 const base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(received.activeAttributes.vigor,8);
 assert.equal(successes(received.kaguneTest)-successes(base.kaguneTest),10);
 assert.equal(successes(received.blockTest)-successes(base.blockTest),10);
 assert.equal(successes(received.dodgeTest)-successes(base.dodgeTest),4);
});

test('perks de ambos os ataques contam uma vez e cada efeito autoral de acerto também',()=>{
 const person=owner({perks:{'r26-exp-geral-perfeicao-inumana':{rank:1}},customSkills:[skill([effect('hit-dice',3,'both'),effect('hit-dice',4,'physical'),effect('hit-dice',5,'kagune')])]});
 const q=weapon({hitDice:2,hitModifier:3});
 const base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(received.carrierBonuses.hit,32);
 assert.equal(successes(received.kaguneTest)-successes(base.kaguneTest),32);
 assert.equal(received.spent,base.spent);
});

test('defesa legada e autoral soma nos ajustes próprios e habilidades ativas respeitam o estado',()=>{
 const person=owner({perks:{'corpo-leve':{rank:1},'corpo-pesado':{rank:1},'cem-por-cento':{rank:1},ceifador:{rank:1}},customSkills:[skill([effect('block-dice',3),effect('dodge-dice',-1)]),skill([effect('hit-dice',10),effect('block-dice',10)],{id:'active',activation:'active',enabled:false})]});
 const q=weapon({blockDice:2,dodgeDice:3});const base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(received.carrierBonuses.hit,0);
 assert.equal(successes(received.blockTest)-successes(base.blockTest),4);
 assert.equal(successes(received.dodgeTest)-successes(base.dodgeTest),3);
 const enabled={...person,customSkills:person.customSkills.map(item=>({...item,enabled:true}))};
 const next=calculateQuinque(q,enabled);assert.equal(next.carrierBonuses.hit,10);assert.equal(next.carrierBonuses.block,14);
});

test('requisitos recebem status do portador, mas acerto extra de atributo não satisfaz status',()=>{
 const command=perks.find(perk=>perk.id==='r26-passos-controle-comando-catastrofe');assert.ok(command);
 const q=weapon({attributes:{controle:10},perks:{[command.id]:{rank:1}}});
 const status=owner({customBonuses:{attributes:{controle:5}}});
 const dice=owner({extraDice:{controle:20}});
 assert.deepEqual(quinquePerkMissing(q,command,status),[]);
 assert.ok(quinquePerkMissing(q,command,dice).length);
 assert.ok(!calculateQuinque(q,status).invalidPerks.includes(command.id));
 assert.ok(calculateQuinque(q,dice).invalidPerks.includes(command.id));
 assert.equal(calculateQuinque(q,status).perkPE,150);
});

test('passos físicos incluem bônus e condições atuais, sem importar dano fixo ou passos da Kagune',()=>{
 const person=owner({weaponKind:'kagune',kaguneActive:true,kaguneType:'Rinkaku',perks:{'lenda-dragao':{rank:1}},customSkills:[skill([effect('damage-steps',10,'physical'),effect('damage-steps',100,'kagune'),effect('damage-modifier',900,'physical')])],damageContext:{physicalExtraSteps:4,active:{'physical:lenda-dragao':true}}});
 const q=weapon();const body=calculateCharacter(person),base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(received.carrierBonuses.physicalSteps,body.physicalSteps);
 assert.equal(received.kaguneSteps-base.kaguneSteps,body.physicalSteps);
 assert.equal(received.kaguneDamageModifier,base.kaguneDamageModifier);
 const changed={...person,damageContext:{...person.damageContext,active:{}}};
 assert.equal(calculateQuinque(q,person).kaguneSteps-calculateQuinque(q,changed).kaguneSteps,15);
});

test('transferência é dinâmica em cada arma, não altera dados salvos nem cobra PE adicional',()=>{
 const person=owner({customBonuses:{attributes:{vigor:3}},customSkills:[skill([effect('hit-dice',5)])]});
 const first=weapon({id:'first',name:'A'}),second=weapon({id:'second',name:'B',rcType:'Ukaku',attributes:{precisao:7}});
 const snapshot=JSON.stringify({person,first,second});
 for(const q of [first,second]){
  const baseline=calculateQuinque(q),received=calculateQuinque(q,person);
  assert.equal(received.spent,baseline.spent);assert.equal(received.attributePE,baseline.attributePE);assert.equal(received.available,baseline.available);
  assert.equal(received.carrierBonuses.hit,5);
  assert.equal(calculateQuinque(q,person).kaguneTest,received.kaguneTest);
  const changed={...person,customSkills:[]};assert.equal(calculateQuinque(q,changed).carrierBonuses.hit,0);
 }
 assert.equal(JSON.stringify({person,first,second}),snapshot);
});

test('bônus exclusivos de testes de atributo não vazam para o ataque',()=>{
 const person=owner({perks:{'r26-lenda-viva':{rank:1}}});
 const inherited=quinqueCarrierBonuses(person);assert.equal(inherited.attributeChecks.vigor,20);assert.equal(inherited.attributeDice.vigor,0);
 const q=weapon(),base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(received.kaguneTest,base.kaguneTest);
 assert.equal(received.blockTest,base.blockTest);
 assert.equal(successes(received.attributeTests.vigor)-successes(base.attributeTests.vigor),20);
});

test('atributos fracionários preservados na ficha antiga não criam penalidades fictícias',()=>{
 const person=owner({species:'ghoul-dominante',physicalBonus:'vigor',baseAttributes:{...attributes(15),vigor:4.5}});
 const q=weapon(),base=calculateQuinque(q),received=calculateQuinque(q,person);
 assert.equal(person.baseAttributes.vigor,4.5);
 assert.equal(quinqueCarrierBonuses(person).attributes.vigor,0);
 assert.equal(received.activeAttributes.vigor,base.activeAttributes.vigor);
 const boosted=owner({...person,customBonuses:{attributes:{vigor:2.25}}});
 assert.equal(calculateCharacter(boosted).activeAttributes.vigor,7);
 assert.equal(quinqueCarrierBonuses(boosted).attributes.vigor,2);
 assert.equal(calculateQuinque(q,boosted).activeAttributes.vigor,base.activeAttributes.vigor+2);
});

test('formas, perks e autorais da Kakuja não chegam à Quinque nem ampliam os extras percentuais recebidos',()=>{
 const person=owner({weaponKind:'kagune',kaguneType:'Koukaku',kaguneActive:true,
  perks:{'corpo-pesado':{rank:1},'corpo-leve':{rank:1},'r26-escala-defesa-adaptativa':{rank:1},'r26-escala-acuracia-progressiva':{rank:1}},
  customSkills:[skill([effect('hit-dice',5),effect('block-dice',3),effect('dodge-dice',4),effect('damage-steps',8,'physical')])],
  kakuja:{active:false,complete:true,cannibalPE:1000,selectedPerks:['k20-olhar-do-rei','k20-soberano-eterno'],customSkills:[skill([effect('hit-dice',20),effect('block-dice',17),effect('dodge-dice',19),effect('damage-steps',60),effect('attribute-bonus',10,'kagune','vigor')],{id:'kakuja-authorial'})]}});
 const active={...person,kakuja:{...person.kakuja,active:true}};
 assert.ok(calculateCharacter(active).kakujaBonuses.block>0);
 assert.ok(calculateCharacter(active).kakujaBonuses.dodge>0);
 const inherited=quinqueCarrierBonuses(person);
 assert.ok(inherited.hit>=5);assert.ok(inherited.block>=4);assert.ok(inherited.dodge>=5);
 assert.ok(calculateCharacter(person).scaling.bonuses.block>0);
 assert.deepEqual(quinqueCarrierBonuses(active),inherited);
 const q=weapon();const before=calculateQuinque(q,person),after=calculateQuinque(q,active);
 for(const key of ['kaguneTest','blockTest','dodgeTest','kaguneSteps','kaguneDamage','rd'])assert.equal(after[key],before[key],key);
 assert.deepEqual(after.activeAttributes,before.activeAttributes);
});
