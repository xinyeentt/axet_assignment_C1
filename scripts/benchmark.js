#!/usr/bin/env node

/**
 * Benchmark script — measure runtime and memory on 100 MB log
 */

const path = require('path');
const { performance } = require('perf_hooks');
const { computeSummary } = require(path.join(__dirname, '..', 'src', 'summary'));
const { computeTimeline } = require(path.join(__dirname, '..', 'src', 'timeline'));
const { grepLog } = require(path.join(__dirname, '..', 'src', 'grep'));

async function benchmark() {
  const logFile = './tests/test_logs/large_100mb.log';

  console.log('\n═══════════════════════════════════════');
  console.log('  100 MB Log Processing Benchmark');
  console.log('═══════════════════════════════════════\n');

  async function runCommand(name, fn) {
    const memStart = process.memoryUsage().heapUsed / 1024 / 1024;
    const start = performance.now();

    try {
      await fn();
    } catch (err) {
      console.error(`  ✗ ${name} failed: ${err.message}`);
      return;
    }

    const duration = performance.now() - start;
    const memEnd = process.memoryUsage().heapUsed / 1024 / 1024;
    const memUsed = memEnd - memStart;

    console.log(`✓ ${name.padEnd(25)} ${duration.toFixed(2)}ms (heap: ${memUsed.toFixed(1)} MB)`);
  }

  await runCommand('summary', () => computeSummary(logFile));
  await runCommand('timeline --bucket 5m', () => computeTimeline(logFile, '5m'));
  await runCommand('grep --level ERROR', () => grepLog(logFile, { level: 'ERROR' }));
  await runCommand('grep --text timeout', () => grepLog(logFile, { text: 'timeout' }));

  console.log('\n═══════════════════════════════════════\n');
}

benchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
