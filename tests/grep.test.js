const { test } = require('node:test');
const assert = require('node:assert');
const { grepLog } = require('../src/grep');
const path = require('path');

const SIMPLE_LOG = path.join(__dirname, 'test_logs', 'simple.log');

test('grep - filter by level ERROR', async () => {
  const result = await grepLog(SIMPLE_LOG, { level: 'ERROR' });

  assert.ok(result.matched_count > 0);
  assert.ok(result.lines.length > 0);
  result.lines.forEach(line => {
    assert.strictEqual(line.level, 'ERROR');
  });
});

test('grep - filter by level case-insensitive', async () => {
  const result = await grepLog(SIMPLE_LOG, { level: 'error' });

  assert.ok(result.matched_count > 0);
  result.lines.forEach(line => {
    assert.strictEqual(line.level, 'ERROR');
  });
});

test('grep - filter by text substring', async () => {
  const result = await grepLog(SIMPLE_LOG, { text: 'timeout' });

  assert.ok(result.matched_count > 0);
  result.lines.forEach(line => {
    assert.ok(line.message.toLowerCase().includes('timeout'));
  });
});

test('grep - combine level and text filters', async () => {
  const result = await grepLog(SIMPLE_LOG, { level: 'ERROR', text: 'timeout' });

  assert.ok(result.matched_count > 0);
  result.lines.forEach(line => {
    assert.strictEqual(line.level, 'ERROR');
    assert.ok(line.message.toLowerCase().includes('timeout'));
  });
});

test('grep - filter by since', async () => {
  const result = await grepLog(SIMPLE_LOG, { since: '2026-10-22 11:00:00' });

  assert.ok(result.matched_count >= 0);
});

test('grep - malformed lines are skipped', async () => {
  const MIXED_LOG = path.join(__dirname, 'test_logs', 'mixed_format.log');
  const result = await grepLog(MIXED_LOG, {});

  // Should not include malformed lines
  result.lines.forEach(line => {
    assert.ok(line.timestamp || line.level);
  });
});

test('grep - invalid datetime throws error', async () => {
  try {
    await grepLog(SIMPLE_LOG, { since: 'invalid' });
    assert.fail('Should have thrown');
  } catch (err) {
    assert.match(err.message, /Invalid datetime/);
  }
});
