#!/usr/bin/env node

/**
 * Synthetic log generator — creates a 100 MB test log with mixed formats and patterns
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'tests', 'test_logs', 'large_100mb.log');
const TARGET_SIZE = 100 * 1024 * 1024; // 100 MB

const LOG_TEMPLATES = [
  // ISO 8601 + text format
  (ts, level) => `${ts.toISOString()} [${level}] ${randomMessage()}`,
  // YYYY-MM-DD HH:MM:SS format
  (ts, level) => `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')} ${level}: ${randomMessage()}`,
  // [LEVEL] format without timestamp (sometimes)
  (ts, level) => `[${level}] ${randomMessage()}`,
];

const MESSAGES = [
  'Application started',
  'Connected to database',
  'Connection timeout',
  'Retrying connection',
  'Memory usage at 85%',
  'Cache hit',
  'Cache miss',
  'User authentication failed',
  'Request processed successfully',
  'Database query timeout',
  'Connection pool exhausted',
  'Thread pool saturation',
  'Disk space low',
  'API rate limit exceeded',
  'SSL certificate validation failed',
  'Configuration reload completed',
  'Health check passed',
  'Service dependency unavailable',
  'Message queue full',
  'Background job started',
  'Background job completed',
  'Graceful shutdown initiated',
  'Socket error on recv',
  'Out of memory error',
  'Stack overflow detected',
];

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

function randomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)] + Math.random().toString().substring(2, 8);
}

function randomLevel() {
  // Weight errors more heavily for realistic error reporting
  const rand = Math.random();
  if (rand < 0.7) return LEVELS[Math.floor(Math.random() * (LEVELS.length - 1))];
  return 'ERROR';
}

function generateLogs() {
  const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
  let currentSize = 0;
  let lineCount = 0;
  let startTime = Date.now();
  let baseDate = new Date('2026-10-22T09:00:00Z');

  console.log(`Generating ${(TARGET_SIZE / 1024 / 1024).toFixed(0)} MB synthetic log...`);

  return new Promise((resolve, reject) => {
    let flushing = false;

    function writeBatch() {
      let batch = '';
      let batchSize = 0;

      // Write ~100KB at a time
      while (batchSize < 100 * 1024 && currentSize < TARGET_SIZE) {
        const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
        const level = randomLevel();
        const ts = new Date(baseDate.getTime() + Math.random() * 18 * 60 * 60 * 1000); // 18 hours span
        const line = template(ts, level) + '\n';

        batch += line;
        batchSize += Buffer.byteLength(line, 'utf8');
        currentSize += Buffer.byteLength(line, 'utf8');
        lineCount++;

        // Add occasional malformed lines
        if (Math.random() < 0.001) {
          const malformed = 'garbage data %%% random junk !@#$%^&*()\n';
          batch += malformed;
          batchSize += Buffer.byteLength(malformed, 'utf8');
          currentSize += Buffer.byteLength(malformed, 'utf8');
        }

        if (currentSize >= TARGET_SIZE) break;
      }

      if (!stream.write(batch)) {
        flushing = true;
        stream.once('drain', () => {
          flushing = false;
          if (currentSize < TARGET_SIZE) {
            writeBatch();
          } else {
            stream.end();
          }
        });
      } else if (currentSize < TARGET_SIZE) {
        setImmediate(writeBatch);
      } else {
        stream.end();
      }
    }

    stream.on('finish', () => {
      const duration = Date.now() - startTime;
      const sizeInMB = (currentSize / 1024 / 1024).toFixed(2);
      console.log(`✓ Generated ${sizeInMB} MB (${lineCount} lines) in ${(duration / 1000).toFixed(2)}s`);
      console.log(`  File: ${OUTPUT_FILE}`);
      resolve();
    });

    stream.on('error', reject);
    writeBatch();
  });
}

generateLogs().catch(err => {
  console.error('Error generating log:', err);
  process.exit(1);
});
