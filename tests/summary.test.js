const { test } = require('node:test');
const assert = require('node:assert');
const { computeSummary } = require('../src/summary');
const path = require('path');

const SIMPLE_LOG = path.join(__dirname, 'test_logs', 'simple.log');

test('summary - simple.log', async () => {
  const result = await computeSummary(SIMPLE_LOG);

  assert.ok(result.counts_by_level);
  assert.ok(result.counts_by_level.INFO > 0);
  assert.ok(result.counts_by_level.ERROR > 0);
  assert.ok(result.time_range.first);
  assert.ok(result.time_range.last);
  assert.ok(result.top_errors.length > 0);
  assert.strictEqual(result.malformed_lines, 0);
});

test('summary - top 5 errors are sorted by frequency', async () => {
  const result = await computeSummary(SIMPLE_LOG);
  
  assert.ok(result.top_errors.length <= 5);
  for (let i = 1; i < result.top_errors.length; i++) {
    assert.ok(result.top_errors[i - 1].count >= result.top_errors[i].count);
  }
});
