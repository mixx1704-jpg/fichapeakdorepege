import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { formatDamage, damageDiceGroups, damageStatistics, DAMAGE_STEPS_PER_CYCLE } = await vite.ssrLoadModule('/app/damage-dice.ts');

test('every step in the first cycle advances from d4 to d100 by two faces', () => {
  assert.equal(DAMAGE_STEPS_PER_CYCLE, 49);
  for (let step = 1; step <= 49; step++) {
    assert.equal(formatDamage(step, 0), `1d${2 * step + 2}`, `step ${step}`);
  }
  assert.equal(formatDamage(5, 0), '1d12');
  assert.equal(formatDamage(6, 0), '1d14');
  assert.equal(formatDamage(7, 0), '1d16');
});

test('a completed d100 stays while the next die starts at d4', () => {
  const boundaries = [
    [48, '1d98'], [49, '1d100'], [50, '1d100+1d4'], [51, '1d100+1d6'],
    [97, '1d100+1d98'], [98, '2d100'], [99, '2d100+1d4'],
    [146, '2d100+1d98'], [147, '3d100'], [148, '3d100+1d4'],
  ];
  for (const [steps, expected] of boundaries) assert.equal(formatDamage(steps, 0), expected);
  assert.deepEqual(damageDiceGroups(99), [{ sides: 100, count: 2 }, { sides: 4, count: 1 }]);
  assert.equal(formatDamage(490, 0), '10d100');
});

test('invalid or nonpositive steps retain the minimum die', () => {
  for (const steps of [0, -1, -20.5, NaN, Infinity, -Infinity, 0.9]) {
    assert.equal(formatDamage(steps, 0), '1d4', String(steps));
  }
});

test('fractional steps and fixed bonuses floor and fixed damage appears only once', () => {
  assert.equal(formatDamage(5.99, 2.99), '1d12+2');
  assert.equal(formatDamage(6.99, -0.1), '1d14-1');
  assert.equal(formatDamage(50.9, -1.2), '1d100+1d4-2');
  assert.equal(formatDamage(98.9, 13.9), '2d100+13');
  for (const modifier of [NaN, Infinity, -Infinity]) assert.equal(formatDamage(50, modifier), '1d100+1d4');
  assert.deepEqual(damageStatistics(formatDamage(99, 13)), { diceMaximum: 204, flat: 13, maximum: 217, mean: 116.5, diceCount: 3 });
});

test('statistics support every new even-sided die through d100', () => {
  for (let sides = 14; sides <= 100; sides += 2) {
    assert.deepEqual(damageStatistics(`1d${sides}+7`), {
      diceMaximum: sides, flat: 7, maximum: sides + 7, mean: (sides + 1) / 2 + 7, diceCount: 1,
    }, `d${sides}`);
  }
});

test('damage continues increasing across cycle boundaries without losing completed dice', () => {
  let previous = damageStatistics(formatDamage(1, 0));
  for (let steps = 2; steps <= 197; steps++) {
    const current = damageStatistics(formatDamage(steps, 0));
    assert.ok(current.maximum > previous.maximum, `maximum at step ${steps}`);
    assert.ok(current.mean > previous.mean, `mean at step ${steps}`);
    assert.equal(current.diceCount, Math.ceil(steps / 49), `dice count at step ${steps}`);
    previous = current;
  }
});
