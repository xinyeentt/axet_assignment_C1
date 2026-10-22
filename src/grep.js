/**
 * Grep command — filter log lines by criteria
 */

const readline = require('readline');
const fs = require('fs');
const parser = require('./parser');

/**
 * Parse datetime for filtering
 * @param {string} dtStr - "YYYY-MM-DD HH:MM:SS" format
 * @returns {Date}
 */
function parseDateTime(dtStr) {
  const d = parser.parseTimestamp(dtStr);
  if (!d) {
    throw new Error(`Invalid datetime: ${dtStr}. Use format: YYYY-MM-DD HH:MM:SS or ISO 8601`);
  }
  return d;
}

/**
 * Filter a log file by criteria
 * @param {string} filePath
 * @param {Object} filters - { level, since, until, text }
 * @returns {Promise<Object>} grep result { lines, filters, matched_count }
 */
async function grepLog(filePath, filters = {}) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const lines = [];
  let matchedCount = 0;

  // Parse and validate filters
  let sinceDate = null;
  let untilDate = null;

  if (filters.since) {
    sinceDate = parseDateTime(filters.since);
  }
  if (filters.until) {
    untilDate = parseDateTime(filters.until);
  }

  const levelFilter = filters.level ? filters.level.toUpperCase() : null;
  const textFilter = filters.text ? filters.text.toLowerCase() : null;

  for await (const line of rl) {
    const entry = parser.parseLine(line);

    // Skip malformed lines
    if (entry.malformed) {
      continue;
    }

    // Apply level filter
    if (levelFilter && entry.level !== levelFilter) {
      continue;
    }

    // Apply timestamp filters
    if (entry.timestamp) {
      const ts = parser.parseTimestamp(entry.timestamp);
      if (ts) {
        if (sinceDate && ts < sinceDate) continue;
        if (untilDate && ts > untilDate) continue;
      }
    }

    // Apply text filter (case-insensitive substring)
    if (textFilter && !entry.message.toLowerCase().includes(textFilter)) {
      continue;
    }

    // Line matches all filters
    lines.push({
      raw: entry.raw,
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message
    });
    matchedCount++;
  }

  return {
    file: filePath,
    filters: {
      level: levelFilter,
      since: filters.since,
      until: filters.until,
      text: filters.text
    },
    lines,
    matched_count: matchedCount
  };
}

module.exports = { grepLog };
