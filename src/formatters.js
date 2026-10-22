/**
 * Output formatters — text, JSON, markdown
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate timestamp for filename
 * @returns {string} YYYYMMDD_HHMMSS
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${mins}${secs}`;
}

// ============ SUMMARY FORMATTERS ============

function formatSummaryText(data) {
  const { file, time_range, counts_by_level, top_errors, malformed_lines, total_entries } = data;

  let output = '\n' + '='.repeat(46) + '\n';
  output += ' '.repeat(14) + 'LOG SUMMARY\n';
  output += '='.repeat(46) + '\n\n';

  output += `Log file: ${file}\n`;
  output += `Time range: ${time_range.first || 'N/A'} → ${time_range.last || 'N/A'}\n\n`;

  output += 'Entries by level:\n';
  let totalCount = 0;
  for (const [level, count] of Object.entries(counts_by_level).sort()) {
    output += `  ${level.padEnd(8)} ${count.toString().padStart(6)}\n`;
    totalCount += count;
  }
  output += '  ' + '─'.repeat(14) + '\n';
  output += `  TOTAL    ${totalCount.toString().padStart(6)}\n\n`;

  output += 'Top 5 error messages:\n';
  if (top_errors.length === 0) {
    output += '  (none)\n';
  } else {
    top_errors.forEach((err, i) => {
      output += `  ${i + 1}. (${err.count}x) "${err.message}"\n`;
    });
  }

  output += `\nMalformed lines: ${malformed_lines}\n\n`;
  output += '='.repeat(46) + '\n';

  return output;
}

function formatSummaryJson(data) {
  return JSON.stringify(data, null, 2);
}

async function formatSummaryMarkdown(data, commandName = 'summary') {
  const { file, time_range, counts_by_level, top_errors, malformed_lines } = data;
  const filename = `${commandName}_${getTimestamp()}.md`;

  let md = '# Log Summary\n\n';
  md += `- **File:** ${file}\n`;
  md += `- **Time Range:** ${time_range.first || 'N/A'} to ${time_range.last || 'N/A'}\n\n`;

  md += '## Entries by Level\n\n';
  md += '| Level | Count |\n|-------|-------|\n';
  for (const [level, count] of Object.entries(counts_by_level).sort()) {
    md += `| ${level} | ${count} |\n`;
  }

  md += '\n## Top 5 Error Messages\n\n';
  if (top_errors.length === 0) {
    md += '(No errors)\n';
  } else {
    top_errors.forEach((err, i) => {
      md += `${i + 1}. **${err.count}x** — ${err.message}\n`;
    });
  }

  md += `\n## Metadata\n\n- **Malformed lines:** ${malformed_lines}\n`;

  fs.writeFileSync(filename, md, { encoding: 'utf8' });
  return `Report written to: ${filename}`;
}

// ============ TIMELINE FORMATTERS ============

function formatTimelineText(data) {
  const { file, bucket_size_seconds, time_range, buckets, total_errors } = data;

  const bucketLabel = {
    60: '1m',
    300: '5m',
    900: '15m',
    1800: '30m',
    3600: '1h'
  }[bucket_size_seconds] || `${bucket_size_seconds}s`;

  let output = '\n' + '='.repeat(46) + '\n';
  output += ' '.repeat(14) + 'ERROR TIMELINE\n';
  output += '='.repeat(46) + '\n\n';

  output += `Log file: ${file}\n`;
  output += `Bucket size: ${bucketLabel}\n`;
  output += `Time range: ${time_range.start || 'N/A'} → ${time_range.end || 'N/A'}\n\n`;

  if (buckets.length === 0) {
    output += '(No errors)\n';
  } else {
    const maxCount = Math.max(...buckets.map(b => b.error_count));
    const barWidth = 30;

    buckets.forEach(bucket => {
      const time = new Date(bucket.time);
      const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      const barLength = maxCount > 0 ? Math.round((bucket.error_count / maxCount) * barWidth) : 0;
      const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
      output += `  ${timeStr} ${bar}  ${bucket.error_count} errors\n`;
    });
  }

  output += `\nTotal errors: ${total_errors}\n\n`;
  output += '='.repeat(46) + '\n';

  return output;
}

function formatTimelineJson(data) {
  return JSON.stringify(data, null, 2);
}

async function formatTimelineMarkdown(data, commandName = 'timeline') {
  const { file, bucket_size_seconds, time_range, buckets, total_errors } = data;
  const filename = `${commandName}_${getTimestamp()}.md`;

  const bucketLabel = {
    60: '1m',
    300: '5m',
    900: '15m',
    1800: '30m',
    3600: '1h'
  }[bucket_size_seconds] || `${bucket_size_seconds}s`;

  let md = '# Error Timeline\n\n';
  md += `- **File:** ${file}\n`;
  md += `- **Bucket Size:** ${bucketLabel}\n`;
  md += `- **Time Range:** ${time_range.start || 'N/A'} to ${time_range.end || 'N/A'}\n`;
  md += `- **Total Errors:** ${total_errors}\n\n`;

  md += '## Timeline\n\n';
  md += '| Time | Error Count |\n|------|-------------|\n';
  buckets.forEach(bucket => {
    const time = new Date(bucket.time).toISOString();
    md += `| ${time} | ${bucket.error_count} |\n`;
  });

  fs.writeFileSync(filename, md, { encoding: 'utf8' });
  return `Report written to: ${filename}`;
}

// ============ GREP FORMATTERS ============

function formatGrepText(data) {
  const { lines, matched_count } = data;

  let output = '';
  lines.forEach(line => {
    output += line.raw + '\n';
  });
  output += `\nMatched ${matched_count} lines.\n`;

  return output;
}

function formatGrepJson(data) {
  return JSON.stringify(data, null, 2);
}

async function formatGrepMarkdown(data, commandName = 'grep') {
  const { file, filters, lines, matched_count } = data;
  const filename = `${commandName}_${getTimestamp()}.md`;

  let md = '# Grep Results\n\n';
  md += `- **File:** ${file}\n`;
  md += `- **Matched:** ${matched_count} lines\n\n`;

  md += '## Filters\n\n';
  if (filters.level) md += `- **Level:** ${filters.level}\n`;
  if (filters.since) md += `- **Since:** ${filters.since}\n`;
  if (filters.until) md += `- **Until:** ${filters.until}\n`;
  if (filters.text) md += `- **Text:** ${filters.text}\n`;
  md += '\n## Results\n\n```\n';

  lines.forEach(line => {
    md += line.raw + '\n';
  });

  md += '```\n';

  fs.writeFileSync(filename, md, { encoding: 'utf8' });
  return `Report written to: ${filename}`;
}

module.exports = {
  summary: { text: formatSummaryText, json: formatSummaryJson, md: formatSummaryMarkdown },
  timeline: { text: formatTimelineText, json: formatTimelineJson, md: formatTimelineMarkdown },
  grep: { text: formatGrepText, json: formatGrepJson, md: formatGrepMarkdown }
};
