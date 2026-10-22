/**
 * Log Parser — multi-format detection and extraction
 * Supports: ISO 8601 + text/JSON, YYYY-MM-DD HH:MM:SS, [LEVEL] + text, unstructured
 */

// Regex patterns for timestamp extraction
const ISO_8601_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2}))/;
const TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;
const LEVEL_PATTERN = /\[(DEBUG|TRACE|INFO|WARN|ERROR|FATAL|CRITICAL)\]|(?:^|\s)(DEBUG|TRACE|INFO|WARN|ERROR|FATAL|CRITICAL)(?:\s|:)/i;

// Canonical log levels
const VALID_LEVELS = new Set(['DEBUG', 'TRACE', 'INFO', 'WARN', 'ERROR', 'FATAL', 'CRITICAL']);

/**
 * Parse a single log line
 * @param {string} line - raw log line
 * @returns {Object} { timestamp: string|null, level: string|null, message: string, raw: string, malformed: boolean }
 */
function parseLine(line) {
  if (!line || line.trim().length === 0) {
    return {
      timestamp: null,
      level: null,
      message: '',
      raw: line,
      malformed: true
    };
  }

  let timestamp = null;
  let level = null;
  let message = line;

  // Try ISO 8601 timestamp first
  let isoMatch = line.match(ISO_8601_PATTERN);
  if (isoMatch) {
    timestamp = isoMatch[1];
    // Remove timestamp from line for further parsing
    message = line.substring(isoMatch.index + isoMatch[0].length).trim();
  } else {
    // Try YYYY-MM-DD HH:MM:SS format
    let tsMatch = line.match(TIMESTAMP_PATTERN);
    if (tsMatch) {
      timestamp = tsMatch[1];
      message = line.substring(tsMatch.index + tsMatch[0].length).trim();
    }
  }

  // Try to extract level from brackets first (highest priority format)
  let bracketMatch = message.match(/^\[([A-Z]+)\]\s*(.*)/i);
  if (bracketMatch) {
    const levelCandidate = bracketMatch[1].toUpperCase();
    if (VALID_LEVELS.has(levelCandidate)) {
      level = levelCandidate;
      message = bracketMatch[2];
    }
  }

  // If no bracketed level, try pattern matching
  if (!level) {
    let levelMatch = message.match(LEVEL_PATTERN);
    if (levelMatch) {
      level = (levelMatch[1] || levelMatch[2] || '').toUpperCase();
      if (VALID_LEVELS.has(level)) {
        // Remove level from message
        message = message.replace(levelMatch[0], '').trim();
      } else {
        level = null;
      }
    }
  }

  // Remove colon after level if present
  if (message.startsWith(':')) {
    message = message.substring(1).trim();
  }

  // Determine if malformed (no timestamp and no level)
  const malformed = !timestamp && !level;

  return {
    timestamp,
    level: level || null,
    message: message || line,
    raw: line,
    malformed
  };
}

/**
 * Normalize timestamp to ISO 8601 for consistent comparison
 * @param {string} ts - timestamp in any supported format
 * @returns {Date|null}
 */
function parseTimestamp(ts) {
  if (!ts) return null;

  try {
    // ISO 8601
    if (ts.includes('T')) {
      return new Date(ts);
    }
    // YYYY-MM-DD HH:MM:SS
    if (ts.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/)) {
      return new Date(ts.replace(' ', 'T') + 'Z');
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * Format timestamp to ISO 8601 string
 * @param {Date|string} ts
 * @returns {string} ISO 8601 string or null
 */
function formatTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === 'string') {
    const parsed = parseTimestamp(ts);
    return parsed ? parsed.toISOString() : null;
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  return null;
}

module.exports = {
  parseLine,
  parseTimestamp,
  formatTimestamp,
  VALID_LEVELS
};
