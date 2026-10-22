const { test } = require('node:test');
const assert = require('node:assert');
const parser = require('../src/parser');

test('parseLine - ISO 8601 + text format', () => {
  const line = '2026-10-22T09:00:01Z [INFO] Application started';
  const result = parser.parseLine(line);
  assert.strictEqual(result.timestamp, '2026-10-22T09:00:01Z');
  assert.strictEqual(result.level, 'INFO');
  assert.strictEqual(result.message, 'Application started');
  assert.strictEqual(result.malformed, false);
});

test('parseLine - YYYY-MM-DD HH:MM:SS format', () => {
  const line = '2026-10-22 09:00:01 INFO: Boot sequence initiated';
  const result = parser.parseLine(line);
  assert.strictEqual(result.timestamp, '2026-10-22 09:00:01');
  assert.strictEqual(result.level, 'INFO');
  assert.match(result.message, /Boot sequence/);
  assert.strictEqual(result.malformed, false);
});

test('parseLine - [LEVEL] without timestamp', () => {
  const line = '[ERROR] Database connection failed';
  const result = parser.parseLine(line);
  assert.strictEqual(result.timestamp, null);
  assert.strictEqual(result.level, 'ERROR');
  assert.strictEqual(result.message, 'Database connection failed');
  assert.strictEqual(result.malformed, false);
});

test('parseLine - malformed line', () => {
  const line = 'garbage data %%% !!!';
  const result = parser.parseLine(line);
  assert.strictEqual(result.timestamp, null);
  assert.strictEqual(result.level, null);
  assert.strictEqual(result.malformed, true);
});

test('parseLine - empty line', () => {
  const line = '';
  const result = parser.parseLine(line);
  assert.strictEqual(result.malformed, true);
});

test('parseLine - case-insensitive level', () => {
  const line = '2026-10-22T09:00:01Z [error] Connection timeout';
  const result = parser.parseLine(line);
  assert.strictEqual(result.level, 'ERROR');
});

test('parseTimestamp - ISO 8601', () => {
  const ts = parser.parseTimestamp('2026-10-22T09:00:01Z');
  assert.ok(ts instanceof Date);
  assert.strictEqual(ts.toISOString(), '2026-10-22T09:00:01.000Z');
});

test('parseTimestamp - YYYY-MM-DD HH:MM:SS', () => {
  const ts = parser.parseTimestamp('2026-10-22 09:00:01');
  assert.ok(ts instanceof Date);
});

test('parseTimestamp - invalid', () => {
  const ts = parser.parseTimestamp('invalid');
  assert.strictEqual(ts, null);
});

test('formatTimestamp - Date object', () => {
  const date = new Date('2026-10-22T09:00:01Z');
  const formatted = parser.formatTimestamp(date);
  assert.strictEqual(formatted, '2026-10-22T09:00:01.000Z');
});

test('formatTimestamp - string', () => {
  const formatted = parser.formatTimestamp('2026-10-22T09:00:01Z');
  assert.strictEqual(formatted, '2026-10-22T09:00:01.000Z');
});
