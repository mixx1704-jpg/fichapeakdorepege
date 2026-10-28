import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { KakujaPanel } = await vite.ssrLoadModule('/app/KakujaPanel.tsx');
const { blankKakujaState } = await vite.ssrLoadModule('/app/kakuja-data.ts');
const state = patch => ({ ...blankKakujaState(), active: true, cannibalPE: 80, ...patch });
const render = (patch = {}) => renderToStaticMarkup(React.createElement(KakujaPanel, {
  grade: 14, species: 'ghoul', vigor: 10, kaguneSteps: 10,
  kaguneTest: '1d20+30+9', kaguneDurability: 20, kaguneFamilies: ['Bikaku'],
  state: state({}), onChange: () => {}, ...patch,
}));

test('Kakuja defense buttons use ready totals without adding form and authorial bonuses twice', () => {
  const saved = state({ customSkills: [{
    id: 'defense', name: 'Escamas móveis', cost: 20, activation: 'passive', enabled: true,
    effects: [
      { id: 'guard', type: 'block-dice', value: 7, scope: 'kagune', attribute: 'vigor' },
      { id: 'dodge', type: 'dodge-dice', value: 8, scope: 'kagune', attribute: 'agilidade' },
    ],
  }] });
  const html = render({ state: saved, blockTest: '1d20+40+12', dodgeTest: '1d20+41+13', extraAttacks: 4 });
  assert.match(html, /<dt>Bloqueio da Kakuja<\/dt><dd>1d20\+40\+12 <button[^>]*>Copiar bloqueio<\/button>/);
  assert.match(html, /<dt>Esquiva da Kakuja<\/dt><dd>1d20\+41\+13 <button[^>]*>Copiar esquiva<\/button>/);
  assert.match(html, /\+10 bloqueio \/ \+11 esquiva/);
  assert.match(html, /<dt>Ataques extras herdados e da forma<\/dt><dd>4<\/dd>/);
  assert.match(html, /<button type="button">Copiar resumo da Kakuja<\/button>/);
  assert.doesNotMatch(html, /1d20\+40\+12\+10|1d20\+41\+13\+11/);
});

test('Kakuja retraction, RC suppression and missing awakening prevent copying active defenses', () => {
  for (const patch of [
    { state: state({ active: false }) },
    { suppressed: true },
    { state: state({ cannibalPE: 24 }) },
    { species: 'humano' },
  ]) {
    const html = render({ blockTest: '1d10+50', dodgeTest: '1d10+51', ...patch });
    assert.match(html, /Indisponível · Kakuja retraída ou suprimida/);
    assert.doesNotMatch(html, />Copiar bloqueio<|>Copiar esquiva</);
    assert.match(html, /<button type="button" disabled="">Copiar resumo da Kakuja<\/button>/);
  }
  const legacy = render();
  assert.match(legacy, /Teste não informado/);
  assert.doesNotMatch(legacy, />Copiar bloqueio<|>Copiar esquiva</);
});

test('Kakuja damage and own RD inherit Kagune values once while preserving independent hardness', () => {
  const saved = state({});
  const snapshot = structuredClone(saved);
  const inherited = render({ state: saved, kaguneModifier: 20, kaguneRD: 14 });
  assert.match(inherited, /<span>Dano da Kakuja<\/span><strong>1d62\+22<\/strong>/); // Thirty steps: ten inherited plus twenty from the incomplete form.
  assert.match(inherited, /<dt>RD da Kakuja<\/dt><dd>16 <small>inclui 14 da Kagune/);
  assert.match(inherited, /<span>Dureza total da Kakuja<\/span><strong>44<\/strong>/);
  const legacy = render();
  assert.match(legacy, /<span>Dano da Kakuja<\/span><strong>1d62\+2<\/strong>/);
  assert.match(legacy, /<dt>RD da Kakuja<\/dt><dd>2 <small>inclui 0 da Kagune/);
  assert.deepEqual(saved, snapshot);
});

test('Kakuja percentage armor grows from the combined own subtotal and floors only once', () => {
  const html = render({ state: state({ selectedPerks: ['kbio-lamelas'] }), kaguneRD: 13 });
  assert.match(html, /<dt>RD da Kakuja<\/dt><dd>18 <small>inclui 13 da Kagune/);
});
