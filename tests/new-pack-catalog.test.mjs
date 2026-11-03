import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { NEW_PACK_DEFINITIONS, newPackDefinition, newPackPerks } = await vite.ssrLoadModule('/app/new-pack-catalog.ts');
const { perks } = await vite.ssrLoadModule('/app/data.ts');
const { normalizeQuinque, quinqueAllowsPerk } = await vite.ssrLoadModule('/app/quinque.ts');
const { calculatePackEffects } = await vite.ssrLoadModule('/app/pack-effects.ts');
const { PackEffectsPanel } = await vite.ssrLoadModule('/app/PackEffectsPanel.tsx');
const byId = id => newPackPerks.find(perk => perk.id === id);

test('o pacote preserva 180 perks e 100 propriedades em IDs estáveis sem substituir o catálogo', () => {
  assert.equal(NEW_PACK_DEFINITIONS.length, 280);
  assert.equal(NEW_PACK_DEFINITIONS.filter(item => item.kind === 'perk').length, 180);
  assert.equal(NEW_PACK_DEFINITIONS.filter(item => item.kind === 'property').length, 100);
  assert.equal(new Set(perks.map(perk => perk.id)).size, perks.length);
  for (const definition of NEW_PACK_DEFINITIONS) {
    assert.equal(definition.id, `n26-pack-${definition.kind}-${String(definition.ordinal).padStart(3, '0')}`);
    assert.equal(perks.filter(perk => perk.id === definition.id).length, 1);
    assert.equal(newPackDefinition(definition.id), definition);
    assert.ok(definition.sourceLine > 0);
    assert.ok(definition.raw.includes(definition.name));
    assert.ok(definition.body.trim().length > 0);
    assert.ok(byId(definition.id).description.includes(definition.body));
  }
  assert.equal(newPackDefinition('não-existe'), undefined);
});

test('preços originais dos 180 registros permanecem iguais ao texto da fonte', () => {
  for (const definition of NEW_PACK_DEFINITIONS.filter(item => item.kind === 'perk')) {
    const sourcePrice = definition.raw.match(/(?:Custo:\s*)?(\d+)\s*PE\b/u)?.[1];
    assert.ok(sourcePrice, definition.id);
    assert.equal(byId(definition.id).cost, Number(sourcePrice), definition.id);
  }
});

test('as propriedades recebem preço e requisitos de compra sem acrescentar ranks ilimitados', () => {
  for (const definition of NEW_PACK_DEFINITIONS.filter(item => item.kind === 'property')) {
    const perk = byId(definition.id);
    assert.ok(Number.isInteger(perk.cost) && perk.cost >= 6 && perk.cost <= 45);
    assert.ok(perk.minGrade >= 1 && perk.minGrade <= 20);
    assert.equal(perk.maxRank, 1);
    assert.ok(Object.keys(perk.requirements).length);
    assert.equal(perk.location, 'kakuhou');
  }
  assert.equal(byId('n26-pack-property-043').cost, 45);
  assert.equal(byId('n26-pack-property-049').cost, 45);
});

test('requisitos múltiplos, alternativas físicas, caudas e famílias ficam explícitos', () => {
  assert.deepEqual(byId('n26-pack-perk-179').requirements, { forca: 14, vigor: 14 });
  assert.deepEqual(newPackDefinition('n26-pack-perk-180').requirements, {
    level: 20, attributes: { controle: 12 }, families: [], anyPhysicalMinimum: 15,
  });
  assert.equal(newPackDefinition('n26-pack-perk-168').requirements.anyPhysicalMinimum, 10);
  assert.equal(newPackDefinition('n26-pack-perk-074').requirements.minimumTails, 2);
  assert.deepEqual(byId('n26-pack-perk-101').kaguneTypes, ['Ukaku', 'Koukaku']);
  assert.equal(byId('n26-pack-perk-119').minKaguneTypes, 3);
  assert.equal(byId('n26-pack-perk-123').minKaguneTypes, 4);
  assert.deepEqual(byId('n26-pack-perk-124').kaguneTypes, ['Ukaku', 'Koukaku', 'Rinkaku', 'Bikaku']);
});

test('nomes repetidos continuam sendo habilidades distintas com a origem preservada', () => {
  const repeated = newPackPerks.filter(perk => perk.name === 'Corpo de Guerra');
  assert.equal(repeated.length, 2);
  assert.deepEqual(repeated.map(perk => perk.id), ['n26-pack-perk-119', 'n26-pack-perk-131']);
  assert.notEqual(repeated[0].description, repeated[1].description);
  const momentum = perks.filter(perk => perk.name === 'Momentum');
  assert.ok(momentum.length >= 2);
  assert.ok(momentum.some(perk => !perk.id.startsWith('n26-pack-')));
});

test('metabolismo e órgãos próprios não são compras de Quinque; geometria compatível continua disponível', () => {
  const quinque = normalizeQuinque({ rcType: 'Bikaku' });
  for (const ordinal of [1,2,8,39,40,42,43,44,45,46,58,60,63,79,80,85,90,91,92,93,100]) {
    assert.equal(quinqueAllowsPerk(quinque, byId(`n26-pack-property-${String(ordinal).padStart(3, '0')}`)), false, String(ordinal));
  }
  assert.equal(quinqueAllowsPerk(quinque, byId('n26-pack-property-023')), true);
  assert.equal(quinqueAllowsPerk(quinque, byId('n26-pack-property-086')), true);
  assert.equal(quinqueAllowsPerk(quinque, byId('n26-pack-perk-024')), false);
});

test('texto truncado e limites de adaptações são conservados sem inventar bônus automáticos', () => {
  const recycling = newPackDefinition('n26-pack-perk-022');
  assert.ok(recycling.raw.includes('15+: recup'));
  assert.ok(recycling.pendingClarification);
  assert.match(byId('n26-pack-perk-022').description, /Texto incompleto/u);
  assert.match(newPackDefinition('n26-pack-property-052').integrationNotes, /pagas como melhoria autoral/u);
  assert.match(newPackDefinition('n26-pack-property-001').integrationNotes, /não disparam uma à outra/u);
  assert.match(newPackDefinition('n26-pack-property-091').integrationNotes, /Máximo de 5/u);
});

test('o painel mostra condições, valores e custos sem criar separação de perks antigas e novas', () => {
  const context = { perks: { 'n26-pack-perk-042': {rank:1}, 'n26-pack-property-086': {rank:1} }, attributes: { forca:15,vigor:15,precisao:15,agilidade:15,raciocinio:15,percepcao:15,presenca:15,controle:15 }, level:20,species:'ghoul',kaguneTypes:['Ukaku'],primaryKaguneType:'Ukaku',weaponKind:'kagune',weaponActive:true,conditions:{'n26-pack-perk-042':{active:true},'n26-pack-property-086':{counter:2}} };
  const effects = calculatePackEffects(context);
  const html = renderToStaticMarkup(React.createElement(PackEffectsPanel, { effects, value:context.conditions, onChange:()=>{}, currentRC:5, onRCChange:()=>{} }));
  assert.match(html, /Habilidades em combate/);
  assert.match(html, /Penas Guiadas/);
  assert.match(html, /CONVERSÃO DE PRECISÃO/);
  assert.match(html, /Aplicar Penas Guiadas ao ataque/);
  assert.match(html, /Acerto sacrificado neste ataque/);
  assert.match(html, /Registrar gasto: 2 RC/);
  assert.match(html, /Copiar resultado/);
  assert.doesNotMatch(html, /perks novas|perks antigas|novo pacote/iu);
  const weaponHTML = renderToStaticMarkup(React.createElement(PackEffectsPanel, { effects, value:context.conditions, onChange:()=>{} }));
  assert.doesNotMatch(weaponHTML, /Registrar gasto:/);
});

test('recibos da arma recolhida não liberam botões de copiar execução ou debitar RC', () => {
  const effects = calculatePackEffects({perks:{'n26-pack-perk-042':{rank:1}},attributes:{forca:15,vigor:15,precisao:15,agilidade:15,raciocinio:15,percepcao:15,presenca:15,controle:15},level:20,species:'ghoul',kaguneTypes:['Ukaku'],weaponKind:'kagune',weaponActive:false,conditions:{'n26-pack-perk-042':{active:true}}});
  const html = renderToStaticMarkup(React.createElement(PackEffectsPanel, {effects,value:{'n26-pack-perk-042':{active:true}},onChange:()=>{},currentRC:5,onRCChange:()=>{}}));
  assert.match(html, /disabled=""[^>]*>Copiar resultado/);
  assert.match(html, /disabled=""[^>]*>Registrar gasto: 2 RC/);
  assert.match(html, /Requer Kagune ou Quinque manifestada/);
});
