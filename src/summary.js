/**
 * Summary command — stream entire log and produce statistics
 */

const readline = require('readline');
const fs = require('fs');
const parser = require('./parser');

/**
 * Stream a log file and compute summary statistics
 * @param {string} filePath
 * @returns {Promise<Object>} summary object
 */
async function computeSummary(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const counts = {};
  const errorMessages = {}; // message -> count
  const messageOrder = {}; // message -> first_index (for tie-breaking)
  let firstTimestamp = null;
  let lastTimestamp = null;
  let malformedCount = 0;
  let lineNumber = 0;
  let messageSequence = 0;

  for await (const line of rl) {
    lineNumber++;
    const entry = parser.parseLine(line);

    // Track timestamps
    if (entry.timestamp) {
      if (!firstTimestamp) {
        firstTimestamp = parser.parseTimestamp(entry.timestamp);
      }
      lastTimestamp = parser.parseTimestamp(entry.timestamp);
    }

    // Track log levels
    if (entry.level) {
      counts[entry.level] = (counts[entry.level] || 0) + 1;

      // Track error messages
      if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
        if (!errorMessages[entry.message]) {
          errorMessages[entry.message] = 0;
          messageOrder[entry.message] = messageSequence++;
        }
        errorMessages[entry.message]++;
      }
    }

    // Track malformed lines
    if (entry.malformed) {
      malformedCount++;
    }
  }

  // Compute top 5 error messages
  const topErrors = Object.entries(errorMessages)
    .map(([msg, count]) => ({ message: msg, count, order: messageOrder[msg] }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 5)
    .map(({ message, count }) => ({ message, count }));

  const totalEntries = lineNumber;

  return {
    file: filePath,
    time_range: {
      first: firstTimestamp ? firstTimestamp.toISOString() : null,
      last: lastTimestamp ? lastTimestamp.toISOString() : null
    },
    counts_by_level: counts,
    top_errors: topErrors,
    malformed_lines: malformedCount,
    total_entries: totalEntries
  };
}

module.exports = { computeSummary };
