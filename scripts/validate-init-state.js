const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function validateState(state, previous, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (state.loadedNetwork !== 'homestead') throw new Error(`Unexpected network: ${state.loadedNetwork}`);
  if (!Number.isInteger(state.loadedBlockNumber) || state.loadedBlockNumber <= 0) throw new Error('Invalid block number');
  if (!Number.isInteger(state.loadedBlockTimestamp) || state.loadedBlockTimestamp <= 0) throw new Error('Invalid block timestamp');
  if (!Array.isArray(state.ads) || state.ads.length === 0) throw new Error('Generated state contains no ads');
  if (state.loadedBlockNumber < previous.loadedBlockNumber) throw new Error('Generated block regressed');
  if (state.ads.length < previous.ads.length) throw new Error(`Ad count regressed: ${previous.ads.length} -> ${state.ads.length}`);

  const ageSeconds = nowSeconds - state.loadedBlockTimestamp;
  if (ageSeconds < -300 || ageSeconds > 3600) throw new Error(`Generated state is not fresh: ${ageSeconds}s old`);

  return {
    adCount: state.ads.length,
    ageSeconds,
    blockNumber: state.loadedBlockNumber,
  };
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const statePath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(repoRoot, 'static', 'initState.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const previous = JSON.parse(execFileSync(
    'git',
    ['show', 'HEAD:static/initState.json'],
    { cwd: repoRoot, encoding: 'utf8' },
  ));
  const result = validateState(state, previous);

  console.log(`Validated ${result.adCount} ads at block ${result.blockNumber} (${result.ageSeconds}s old)`);
}

if (require.main === module) main();

module.exports = { validateState };
