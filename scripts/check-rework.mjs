import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!process.argv.includes('--skip-types')) run([path.join(root,'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.app.json', '--noEmit']);
run(['--test', '--test-concurrency=1',
  'tests/rework.test.mjs', 'tests/rework-perks.test.mjs', 'tests/kakuja-rework.test.mjs', 'tests/kakuja-biology.test.mjs', 'tests/kakuja-defense.test.mjs', 'tests/kakuja-panel-inheritance.test.mjs', 'tests/custom-skill-images.test.mjs',
  'tests/catalog-filtering.test.mjs', 'tests/rounding.test.mjs', 'tests/rounding-vats.test.mjs',
  'tests/legacy-accuracy-text.test.mjs',
  'tests/endgame-accuracy-cap.test.mjs',
  'tests/tactical.test.mjs', 'tests/tactical-integration.test.mjs',
  'tests/rebalance.test.mjs',
  'tests/colosso.test.mjs', 'tests/scaling-perks.test.mjs', 'tests/scaling-integration.test.mjs',
  'tests/poison.test.mjs', 'tests/combat-tools.test.mjs', 'tests/attack-integration.test.mjs', 'tests/healing.test.mjs', 'tests/critical.test.mjs', 'tests/damage-step-perks.test.mjs',
  'tests/catalog-stacks.test.mjs', 'tests/catalog-audit.test.mjs', 'tests/vats.test.mjs', 'tests/quinque.test.mjs', 'tests/quinque-carrier.test.mjs',
  'tests/weapon-updates.test.mjs', 'tests/mastery.test.mjs', 'tests/ghoul-tails.test.mjs',
]);
