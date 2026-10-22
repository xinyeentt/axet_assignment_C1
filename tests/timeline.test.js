const { test } = require('node:test');
const assert = require('node:assert');
const { computeTimeline, parseBucket } = require('../src/timeline');
const path = require('path');

const SIMPLE_LOG = path.join(__dirname, 'test_logs', 'simple.log');

test('parseBucket - valid sizes', () => {
  assert.strictEqual(parseBucket('1m'), 60);
  assert.strictEqual(parseBucket('5m'), 300);
  assert.strictEqual(parseBucket('15m'), 900);
  assert.strictEqual(parseBucket('30m'), 1800);
  assert.strictEqual(parseBucket('1h'), 3600);
});

test('parseBucket - invalid size', () => {
  assert.strictEqual(parseBucket('2m'), null);
  assert.strictEqual(parseBucket('invalid'), null);
});

test('timeline - simple.log with 15m bucket', async () => {
  const result = await computeTimeline(SIMPLE_LOG, '15m');

  assert.strictEqual(result.bucket_size_seconds, 900);
  assert.ok(result.buckets.length > 0);
  assert.ok(result.total_errors > 0);
  assert.ok(result.time_range.start);
  assert.ok(result.time_range.end);
});

test('timeline - invalid bucket throws error', async () => {
  try {
    await computeTimeline(SIMPLE_LOG, '2m');
    assert.fail('Should have thrown');
  } catch (err) {
    assert.match(err.message, /Invalid bucket/);
  }
});
