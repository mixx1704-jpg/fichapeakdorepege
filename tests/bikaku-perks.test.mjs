import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {createServer} from 'vite';
import {accuracyTotal} from './test-helpers.mjs';

const vite = await createServer({configFile:false,server:{middlewareMode:true,hmr:false}});
after(() => vite.close());
const rules = await vite.ssrLoadModule('/app/character.ts');
const access = await vite.ssrLoadModule('/app/bikaku-access.ts');
const {perks,attributeKeys} = await vite.ssrLoadModule('/app/data.ts');
const {filterPerkCatalog} = await vite.ssrLoadModule('/app/catalog-filters.ts');
const {calculateReworkBonuses} = await vite.ssrLoadModule('/app/rework-perks.ts');
const {normalizeQuinque,calculateQuinque,quinquePerkMissing} = await vite.ssrLoadModule('/app/quinque.ts');
const {quinqueCarrierBonuses} = await vite.ssrLoadModule('/app/quinque-carrier.ts');
const attributes = Object.fromEntries(attributeKeys.map(key => [key,15]));
const sheet = patch => rules.normalizeCharacter({species:'ghoul',grade:20,narrativeLimits:true,weaponKind:'kagune',kaguneActive:true,kaguneType:'Bikaku',baseAttributes:attributes,...patch});
const eligible = (perk, person) => rules.perkRequirementMet(perk,person,rules.permanentAttributesForSheet(person).permanentAttributes);
const template = patch => ({id:'foreign-test',name:'Estrangeira',description:'',cost:6,category:'Combate',location:'kakuhou',kaguneTypes:['Ukaku'],minGrade:14,...patch});
const ctx = patch => ({kaguneTypes:['Bikaku'],primaryKaguneType:'Bikaku',weaponKind:'kagune',...patch});

test('Bikaku principal aprende perks das três famílias até Level 14, mantendo o Level do portador', () => {
  for (const family of ['Ukaku','Koukaku','Rinkaku']) {
    const p = template({kaguneTypes:[family],organGroup:family});
    assert.equal(eligible(p,sheet({grade:14})),true,family);
    assert.equal(eligible({...p,minGrade:15},sheet({grade:20})),false,family);
    assert.equal(eligible(p,sheet({grade:13})),false,family);
  }
});

test('copiar técnicas não concede outros Kakuhou, Quimera, Kakuja nem acesso a Bikaku secundário', () => {
  const person = sheet({grade:14});
  assert.deepEqual([...rules.kaguneFamiliesForSheet(person)],['Bikaku']);
  for (const patch of [{minKaguneTypes:2},{category:'Kagune Quimera'},{kaguneTypes:['Ukaku','Rinkaku']},{requiresKakuja:true}]) {
    assert.equal(eligible(template(patch),person),false,JSON.stringify(patch));
  }
  assert.equal(eligible(template(),sheet({kaguneType:'Rinkaku',kaguneSecondType:'Bikaku'})),false);
  assert.equal(eligible(template(),sheet({weaponKind:'arata'})),false);
  assert.equal(eligible(template({organGroup:'Ukaku',kaguneTypes:undefined}),person),true);
});

test('atributos, raça e pré-requisitos de perks, efeitos e evoluções continuam obrigatórios', () => {
  for (const patch of [
    {attribute:'controle',min:16}, {requirements:{vigor:16}}, {species:['quinx']},
    {requiredPerk:'r26-fundamento'}, {requiredEffect:'aumentar-acerto'}, {requiredEvolution:'custo-beneficio'},
  ]) assert.equal(eligible(template(patch),sheet({grade:14})),false,JSON.stringify(patch));
  const person = sheet({grade:14,perks:{'r26-fundamento':{rank:1}},effects:{'aumentar-acerto':{rank:1}},selectedEvolutions:['custo-beneficio']});
  assert.equal(eligible(template({attribute:'controle',min:15,requirements:{vigor:15},requiredPerk:'r26-fundamento',requiredEffect:'aumentar-acerto',requiredEvolution:'custo-beneficio'}),person),true);
});

test('sobretaxa estrangeira é 3 PE mais 1 por cada dez PE do custo base', () => {
  const person = sheet({});
  for (const [cost,expected] of [[6,9],[10,14],[25,30],[100,113]]) {
    assert.equal(rules.perkCostForSheet(template({cost}),1,person),expected);
  }
  assert.equal(rules.perkCostForSheet(template({cost:10}),0,person),0);
});

test('preços por patamar não cobram sobretaxa sobre o total acumulado', () => {
  const person = sheet({});
  assert.equal(rules.perkCostForSheet(template({cost:6,maxRank:3}),3,person),27);
  assert.equal(rules.perkCostForSheet(template({cost:[6,10,25],maxRank:3}),3,person),53);
  assert.equal(rules.perkCostForSheet(template({cost:[6,10,25],costMode:'choice',maxRank:3}),3,person),30);
  assert.equal(access.bikakuPerkSurcharge(template({cost:[6,10,25]}),2,ctx()),7);
});

test('perks gerais, Bikaku e famílias realmente implantadas conservam o preço original', () => {
  const person = sheet({kaguneSecondType:'Ukaku'});
  assert.equal(rules.perkCostForSheet(template({cost:25}),1,person),25);
  assert.equal(rules.perkCostForSheet(template({cost:25,kaguneTypes:['Bikaku']}),1,person),25);
  assert.equal(rules.perkCostForSheet(template({cost:25,kaguneTypes:undefined}),1,person),25);
  assert.equal(eligible(template({minGrade:20}),person),true,'a real second family still grants its own Level 20 purchases');
});

test('o catálogo Disponíveis expõe as técnicas estrangeiras e esconde as de Level 15+', () => {
  const person = sheet({grade:14});
  const available = filterPerkCatalog(perks,{availableOnly:true,isAvailable:p=>eligible(p,person)});
  for (const id of ['r26-mira-neural','r26-casco-soberano','r26-sangue-esmagador']) assert.ok(available.some(p=>p.id===id),id);
  for (const id of ['r26-tempestade-cristal','r26-martelo-cerco','r26-hidra-insaciavel','r26-serafim-devastacao']) assert.ok(!available.some(p=>p.id===id),id);
});

test('bônus estrangeiros entram de verdade no ataque, defesas, PE e transferência ao portador', () => {
  const person = sheet({grade:14,perks:{'r26-pena-aguda':{rank:1},'r26-casco-soberano':{rank:1}}});
  const base = rules.calculateCharacter(sheet({grade:14}));
  const owned = rules.calculateCharacter(person);
  assert.equal(accuracyTotal(owned.kaguneTest)-accuracyTotal(base.kaguneTest),2);
  assert.equal(accuracyTotal(owned.blockTest)-accuracyTotal(base.blockTest),5);
  assert.equal(owned.kaguneDamageModifier-base.kaguneDamageModifier,1);
  assert.equal(owned.catalogPerksPE,28); // (3+3) + (18+4)
  assert.equal(owned.peSpent-base.peSpent,28);
  assert.equal(quinqueCarrierBonuses(person).hit,2);
  assert.equal(quinqueCarrierBonuses(person).block,5);
});

test('gates do cálculo respeitam a mesma família e o limite 14', () => {
  const context = {...ctx(),level:20,species:'ghoul',attributes,weaponActive:true,perks:{'r26-pena-aguda':{rank:1},'r26-tempestade-cristal':{rank:1}}};
  assert.equal(calculateReworkBonuses(context).kaguneHit,2);
  assert.equal(calculateReworkBonuses({...context,quinque:true}).kaguneHit,0);
  assert.equal(calculateReworkBonuses({...context,primaryKaguneType:'Rinkaku'}).kaguneHit,0);
  assert.equal(calculateReworkBonuses({...context,kaguneTypes:['Bikaku','Ukaku']}).kaguneHit,7);
});

test('Quinque Bikaku mantém seu tipo único e não compra perks estrangeiras', () => {
  const p = perks.find(p=>p.id==='r26-pena-aguda');
  const q = normalizeQuinque({grade:14,rcType:'Bikaku',perks:{[p.id]:{rank:1}}});
  assert.ok(quinquePerkMissing(q,p).length);
  const base = calculateQuinque(normalizeQuinque({grade:14,rcType:'Bikaku'}));
  const owned = calculateQuinque(q);
  assert.equal(owned.kaguneTest,base.kaguneTest);
});
