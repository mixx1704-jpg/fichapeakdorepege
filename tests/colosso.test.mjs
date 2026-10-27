import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import { accuracyTotal } from './test-helpers.mjs';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { normalizeCharacter, calculateCharacter, multiplyDamage } = await vite.ssrLoadModule('/app/character.ts');
const { colossoParts, sumPartDamage, colossoSummary } = await vite.ssrLoadModule('/app/colosso.ts');
const { tailLoadout } = await vite.ssrLoadModule('/app/tail-management.ts');
const { blankVats, normalizeVats, vatsAction } = await vite.ssrLoadModule('/app/vats-engine.ts');
const part = (patch = {}) => ({ damage: 0, ready: 0, sacrificedUntil: 0, enabled: true, role: 'attack', ...patch });
const sheet = (patch = {}) => normalizeCharacter({ rulesVersion: 8, species: 'ghoul', grade: 8, currentSanity: 12, weaponKind: 'kagune', kaguneType: 'Rinkaku', kaguneActive: true, colossoActive: false, baseAttributes: { forca: 8, vigor: 8, agilidade: 8, precisao: 8, controle: 4 }, perks: { 'r26-colosso-carne': { rank: 1 } }, effects: { 'multiplas-caudas': { rank: 4 } }, ...patch }, 8);

test('Colosso usa pares completos das partes extras e exclui partes indisponíveis', () => {
  for (let count = 1; count <= 8; count++) {
    const result = colossoParts({ purchased: true, requested: true, kagune: true, manifested: true, capacity: count, parts: [], turn: 1, kakuhouUntil: 0 });
    assert.equal(result.extraParts, count - 1);
    assert.equal(result.pairs, Math.floor((count - 1) / 2));
    assert.equal(result.active, count >= 2);
  }
  const result = colossoParts({ purchased: true, requested: true, kagune: true, manifested: true, capacity: 7, parts: [part(), part({ enabled: false }), part({ ready: 4 }), part({ sacrificedUntil: 3 }), part({ role: 'guard' }), part({ role: 'utility' }), part({ role: 'dodge' })], turn: 1, kakuhouUntil: 0 });
  assert.deepEqual(result.available, [0, 4, 5, 6]);
  assert.equal(result.pairs, 1);
});

test('soma do dano conserva cada dado e cada modificador uma única vez por parte', () => {
  assert.equal(sumPartDamage(['1d12+1d6+7', '1d12+1d6+7', '1d12+1d6+7']), '3d12+3d6+21');
  assert.equal(sumPartDamage(['1d8-3', '1d8-3']), '2d8-6');
  assert.equal(sumPartDamage(['1d10+5', '1d6-2']), '1d10+1d6+3');
  assert.equal(sumPartDamage([]), '0');
  const before = calculateCharacter(sheet());
  const after = calculateCharacter(sheet({ colossoActive: true }));
  assert.equal(after.colosso.damage, multiplyDamage(before.rinkakuTailDamage, 5));
  assert.equal(after.kaguneDamage, after.colosso.damage);
  assert.equal(after.rinkakuAllTailsDamage, after.kaguneDamage);
  assert.equal(after.activeTailCount, 1);
});

test('fusão transforma RD da Kagune e dureza, sem multiplicar RD corporal', () => {
  const base = sheet({ kaguneType: 'Koukaku', perks: { 'r26-colosso-carne': { rank: 1 }, 'pele-dura': { rank: 1 } }, effects: { 'multiplas-caudas': { rank: 4 }, 'couraca-revestida': { rank: 3 } } });
  const normal = calculateCharacter(base);
  const fused = calculateCharacter({ ...base, colossoActive: true });
  assert.equal(fused.colosso.rd, Math.floor(normal.kagunePartRD * 5 / 2));
  assert.equal(fused.rd, normal.rd - normal.kagunePartRD + fused.colosso.rd);
  assert.equal(fused.kaguneDurability, Math.floor(normal.kagunePartDurability * 5 / 2));
  assert.equal(fused.distance, normal.distance + 2);
});

test('penalidade reduz acertos de Agilidade, Esquiva e Iniciativa, sem reduzir atributos', () => {
  for (const family of ['Ukaku', 'Koukaku', 'Rinkaku', 'Bikaku']) {
    const base = sheet({ kaguneType: family });
    const normal = calculateCharacter(base);
    const fused = calculateCharacter({ ...base, colossoActive: true });
    assert.equal(accuracyTotal(fused.attributeTests.agilidade), accuracyTotal(normal.attributeTests.agilidade) - 2, family);
    assert.equal(accuracyTotal(fused.dodgeTest), accuracyTotal(normal.dodgeTest) - 2, family);
    assert.equal(accuracyTotal(fused.initiativeTest), accuracyTotal(normal.initiativeTest) - 2, family);
    assert.equal(accuracyTotal(fused.kaguneTest) - accuracyTotal(normal.kaguneTest), family === 'Bikaku' ? 0 : 2, family);
    assert.deepEqual(fused.activeAttributes, normal.activeAttributes);
    assert.match(fused.kaguneTest, /^1d20/);
  }
});

test('fusão absorve as reservas e preserva configuração, integridade e dados ao desativar', () => {
  const base = sheet({ selectedEvolutions: ['oito-caminhos'], vats: { parts: [part({ name: 'Escudo', role: 'guard', damage: 3, notes: 'Pessoal' }), part({ role: 'utility' }), part(), part(), part()] } });
  const snapshot = JSON.stringify(base);
  const normal = calculateCharacter(base);
  const fused = calculateCharacter({ ...base, colossoActive: true });
  assert.equal(fused.tails.rd, 0);
  assert.equal(fused.tails.dodge, 0);
  assert.equal(fused.tails.reserved, undefined);
  assert.equal(fused.tails.attacks.length, 1);
  assert.equal(fused.colosso.partCount, 5);
  assert.equal(JSON.stringify(base), snapshot);
  assert.deepEqual(calculateCharacter({ ...base, colossoActive: false }).tails, normal.tails);
  assert.equal(tailLoadout(base.vats.parts, 5, true, 1, 0, true, true).reserved, undefined);
});

test('fusão exige compra, arma Kagune, manifestação e Kakuhou disponível', () => {
  for (const patch of [{ perks: {} }, { weaponKind: 'quinque' }, { weaponKind: 'nenhum' }, { kaguneActive: false }, { vats: { kakuhouUntil: 5 } }, { effects: {} }]) {
    const base = sheet({ ...patch, colossoActive: true });
    const actual = calculateCharacter(base);
    const disabled = calculateCharacter({ ...base, colossoActive: false });
    assert.equal(actual.colosso.active, false, JSON.stringify(patch));
    assert.equal(actual.kaguneDamage, disabled.kaguneDamage);
    assert.equal(actual.dodgeTest, disabled.dodgeTest);
  }
  assert.equal(calculateCharacter(sheet({ colossoActive: true }), { quinque: true }).colosso.active, false);
});

test('migração antiga mantém fusão desligada; versão atual persiste só boolean real', () => {
  const old = normalizeCharacter({ name: 'Legado', grade: 14 }, 2);
  assert.equal(old.colossoActive, false);
  assert.equal(old.rulesVersion, 8);
  assert.equal(normalizeCharacter({ colossoActive: 'true' }, 8).colossoActive, false);
  const active = sheet({ colossoActive: true });
  const roundTrip = normalizeCharacter(JSON.parse(JSON.stringify(active)), 8);
  assert.equal(roundTrip.colossoActive, true);
  assert.deepEqual(roundTrip.vats, active.vats);
  assert.match(colossoSummary(calculateCharacter(roundTrip).colosso, calculateCharacter(roundTrip).kaguneTest), /5 partes fundidas/);
});

test('VATS bloqueia gestão e ataques das partes fundidas sem gastar RC nem alterar suas reservas', () => {
  const source = normalizeVats({ ...blankVats(), turn: 3, growth: 3, manualTails: 2, parts: [part({ name: 'Original', notes: 'Preservar' }), part({ ready: 1, damage: 30 }), part()] });
  const config = { colossoActive: true, hasKagune: true, kaguneActive: true, maxLife: 100, maxRC: 300, rc: 200, hunger: 0, vigor: 8, baseVigor: 8, grade: 8, regeneration: 0, regenLevel: 0, superior: 0, cells: false, kami: false, durability: 30, tails: 3, naturalTails: 1, paidTailStart: 1, tailAttackRC: 2, powers: ['oito-caminhos', 'tentaculos-incessantes', 'mil-pernas', 'mitose-tentacruel', 'hidra-faminta', 'canibalismo-celular', 'continua-crescendo'], rd: 3, movement: 1, dodgeTest: '1d20+10', blockTest: '1d20+10' };
  const actions = [
    { type: 'manual-tails', amount: 3 }, { type: 'manual-tail-cost', amount: 9 },
    { type: 'tail-config', index: 0, role: 'guard', enabled: false, name: 'Mudou' },
    { type: 'tails-all', enabled: false }, { type: 'tentacle-momentum' },
    { type: 'mil-pernas' }, { type: 'mitosis', amount: 1, cost: 8 },
    { type: 'part-damage', index: 0, amount: 10 }, { type: 'break', index: 0 },
    { type: 'part-regen', index: 1 }, { type: 'hydra', index: 1 },
    { type: 'sacrifice', index: 0 }, { type: 'tails-attack' }, { type: 'tail-attack', index: 2 }, { type: 'growth' },
  ];
  for (const action of actions) {
    const result = vatsAction(source, config, action);
    assert.equal(result.currentRC, 200, action.type);
    assert.equal(result.vats.rcSpent, 0, action.type);
    assert.deepEqual({ ...result.vats, log: [] }, { ...source, log: [] }, action.type);
    assert.match(result.vats.log[0], /desfaça a fusão/, action.type);
  }
  const turn = vatsAction(source, config, { type: 'turn' });
  assert.equal(turn.vats.turn, 4);
  assert.equal(turn.currentRC, 200);
  const body = vatsAction(source, config, { type: 'damage', region: 'torso', amount: 4 });
  assert.equal(body.vats.body.torso.damage, 4);
  assert.deepEqual(body.vats.parts, source.parts);
  assert.equal(vatsAction(source, { ...config, colossoActive: false }, { type: 'tail-attack', index: 2 }).currentRC, 198);
});
