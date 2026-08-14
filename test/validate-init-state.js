const assert = require('assert');

const { validateState } = require('../scripts/validate-init-state');

const now = 1_800_000_000;
const previous = {
  loadedBlockNumber: 100,
  ads: [{ idx: 0 }],
};

function validState(overrides = {}) {
  return {
    loadedNetwork: 'homestead',
    loadedBlockNumber: 101,
    loadedBlockTimestamp: now - 60,
    ads: [{ idx: 0 }, { idx: 1 }],
    ...overrides,
  };
}

describe('validate initState', () => {
  it('accepts a fresh, monotonic mainnet state', () => {
    const result = validateState(validState(), previous, now);

    assert.deepStrictEqual(result, {
      adCount: 2,
      ageSeconds: 60,
      blockNumber: 101,
    });
  });

  it('rejects a malformed timestamp', () => {
    assert.throws(
      () => validateState(validState({ loadedBlockTimestamp: 'bad' }), previous, now),
      /Invalid block timestamp/,
    );
  });

  it('rejects block and ad-count regressions', () => {
    assert.throws(
      () => validateState(validState({ loadedBlockNumber: 99 }), previous, now),
      /Generated block regressed/,
    );
    assert.throws(
      () => validateState(
        validState({ ads: [{ idx: 0 }] }),
        { ...previous, ads: [{ idx: 0 }, { idx: 1 }] },
        now,
      ),
      /Ad count regressed/,
    );
  });

  it('rejects stale and implausibly future checkpoints', () => {
    assert.throws(
      () => validateState(validState({ loadedBlockTimestamp: now - 3601 }), previous, now),
      /Generated state is not fresh/,
    );
    assert.throws(
      () => validateState(validState({ loadedBlockTimestamp: now + 301 }), previous, now),
      /Generated state is not fresh/,
    );
  });
});
