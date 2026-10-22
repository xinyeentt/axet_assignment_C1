/**
 * Timeline command — stream log and bucket errors by time interval
 */

const readline = require('readline');
const fs = require('fs');
const parser = require('./parser');

const BUCKET_SIZES = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600
};

/**
 * Parse bucket parameter
 * @param {string} bucketStr
 * @returns {number} seconds or null
 */
function parseBucket(bucketStr) {
  return BUCKET_SIZES[bucketStr] || null;
}

/**
 * Compute bucket key for a timestamp
 * @param {Date} date
 * @param {number} bucketSeconds
 * @returns {number} bucket key (unix timestamp rounded down)
 */
function getBucketKey(date, bucketSeconds) {
  const timestamp = date.getTime() / 1000;
  return Math.floor(timestamp / bucketSeconds) * bucketSeconds;
}

/**
 * Stream log and compute timeline buckets
 * @param {string} filePath
 * @param {string} bucketStr - '1m', '5m', '15m', '30m', '1h'
 * @returns {Promise<Object>} timeline object
 */
async function computeTimeline(filePath, bucketStr) {
  const bucketSeconds = parseBucket(bucketStr);
  if (!bucketSeconds) {
    throw new Error(`Invalid bucket size: ${bucketStr}. Use: 1m, 5m, 15m, 30m, 1h`);
  }

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const buckets = {}; // bucket_key -> count
  let firstTimestamp = null;
  let lastTimestamp = null;
  let totalErrors = 0;

  for await (const line of rl) {
    const entry = parser.parseLine(line);

    // Only count ERROR and above
    if (entry.level && (entry.level === 'ERROR' || entry.level === 'CRITICAL')) {
      if (entry.timestamp) {
        const ts = parser.parseTimestamp(entry.timestamp);
        if (ts) {
          const bucketKey = getBucketKey(ts, bucketSeconds);
          buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
          totalErrors++;

          // Track time range
          if (!firstTimestamp) {
            firstTimestamp = ts;
          }
          lastTimestamp = ts;
        }
      }
    }
  }

  // Convert buckets to sorted array
  const sortedBuckets = Object.entries(buckets)
    .map(([key, count]) => ({
      time: new Date(parseInt(key) * 1000).toISOString(),
      error_count: count
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  return {
    file: filePath,
    bucket_size_seconds: bucketSeconds,
    time_range: {
      start: firstTimestamp ? firstTimestamp.toISOString() : null,
      end: lastTimestamp ? lastTimestamp.toISOString() : null
    },
    buckets: sortedBuckets,
    total_errors: totalErrors
  };
}

module.exports = { computeTimeline, parseBucket };
