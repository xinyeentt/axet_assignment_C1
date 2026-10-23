# logscope

A lightweight CLI tool for post-incident log analysis. Streams large log files without loading them entirely into memory, providing quick summaries, timelines, and filtered views to help operations teams investigate incidents fast.

## Features

- **Stream-based processing** — handle 100+ MB logs without memory issues
- **Multi-format detection** — auto-detect ISO 8601, YYYY-MM-DD HH:MM:SS, and other formats
- **Robust parsing** — malformed lines are counted and reported, never crash
- **Three core commands** — summary, timeline, grep
- **Multiple output formats** — text (default), JSON, Markdown
- **LLM integration** (stretch goal) — analyze top errors with AI for root-cause summary

## Quick Start

### Installation

```bash
npm install
```

### Usage

```bash
# Summary: counts by level, top 5 errors, time range
node bin/logscope summary app.log
node bin/logscope summary app.log --format json
node bin/logscope summary app.log --format md

# Timeline: error count per time bucket with bar chart
node bin/logscope timeline app.log --bucket 15m
node bin/logscope timeline app.log --bucket 1h --format json

# Grep: filter lines by criteria (AND logic)
node bin/logscope grep app.log --level ERROR
node bin/logscope grep app.log --level ERROR --since "2026-10-22 09:00:00"
node bin/logscope grep app.log --text "timeout" --level WARN
node bin/logscope grep app.log --level ERROR --format json

# Explain: LLM-based root cause analysis (requires LLM endpoint)
LOGSCOPE_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions \
LOGSCOPE_LLM_KEY=your-api-key \
node bin/logscope explain app.log
```

## Commands

### `logscope summary <file>`

Analyzes the entire log file and produces a summary report.

**Output includes:**
- Count of log entries by level (INFO, WARN, ERROR, DEBUG, TRACE, CRITICAL, FATAL)
- Top 5 most-frequent error messages (by exact text match)
- First log entry timestamp
- Last log entry timestamp
- Total malformed lines encountered

**Example:**
```bash
$ node bin/logscope summary app.log

==================================================
              LOG SUMMARY
==================================================

Log file: app.log
Time range: 2026-10-22T09:00:01Z → 2026-10-22T14:35:12Z

Entries by level:
  INFO     4521
  WARN      342
  ERROR      87
  DEBUG     1203
  ──────────────
  TOTAL     6153

Top 5 error messages:
  1. (12x) "Connection timeout to database"
  2.  (9x) "Failed to parse request body"
  3.  (8x) "Authentication failed for user xyz"
  4.  (5x) "Disk space low"
  5.  (3x) "Certificate expired"

Malformed lines: 2

==================================================
```

### `logscope timeline <file> --bucket <duration>`

Groups errors by time buckets and displays a text-based bar chart.

**Parameters:**
- `--bucket` — time interval: `1m`, `5m`, `15m`, `30m`, `1h` (default: `5m`)

**Example:**
```bash
$ node bin/logscope timeline app.log --bucket 15m

==================================================
              ERROR TIMELINE
==================================================

Log file: app.log
Bucket size: 15m
Time range: 2026-10-22T09:00:00Z → 2026-10-22T14:45:00Z

  09:00 ██████████░░░░░░░░░░░░░░░░░░  3 errors
  09:15 ████████░░░░░░░░░░░░░░░░░░░░  8 errors
  09:30 ██████░░░░░░░░░░░░░░░░░░░░░  5 errors
  09:45 ████████████░░░░░░░░░░░░░░░  12 errors
  ... (more buckets)

Total errors: 87

==================================================
```

### `logscope grep <file> [options]`

Filters and extracts log lines matching criteria.

**Options:**
- `--level <LEVEL>` — filter by log level (case-insensitive; e.g., ERROR, WARN, INFO)
- `--since <datetime>` — only lines with timestamp >= this value (format: `YYYY-MM-DD HH:MM:SS`)
- `--until <datetime>` — only lines with timestamp <= this value
- `--text <substring>` — case-insensitive substring match in message
- Combine multiple filters (all must match; AND logic)

**Example:**
```bash
$ node bin/logscope grep app.log --level ERROR

2026-10-22T14:35:12Z [ERROR] Connection timeout to database
2026-10-22T14:36:01Z [ERROR] Failed to parse request body
2026-10-22T14:36:45Z [ERROR] Authentication failed for user xyz
...

Matched 12 lines.
```

### `logscope explain <file>` (Stretch Goal)

Analyzes top error messages with an LLM endpoint to provide probable root-cause summary.

**Setup:**
```bash
export LOGSCOPE_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
export LOGSCOPE_LLM_KEY=sk-...
```

**Example:**
```bash
$ node bin/logscope explain app.log

==================================================
  ROOT CAUSE ANALYSIS
==================================================

Based on the top errors, the application appears to be experiencing database connectivity issues. The "Connection timeout to database" error (12 occurrences) is the primary symptom, followed by parsing failures. This suggests either:
1. Database server is down or unreachable
2. Network connectivity issues between app and database
3. Database connection pool exhaustion

Recommend checking database health, network connectivity, and connection pool configuration.

==================================================
```

## Log Format Support

The parser automatically detects and handles:

1. **ISO 8601 + JSON** — `2026-10-22T14:35:12.345Z [INFO] {"msg":"...", "...":"..."}`
2. **ISO 8601 + text** — `2026-10-22T14:35:12Z INFO: message text`
3. **Timestamp + level + text** — `2026-10-22 14:35:12 INFO message text`
4. **Level + text** — `[INFO] message text` (no timestamp)
5. **Unstructured** — any line (counted as malformed if no timestamp/level)

## Performance

- **100 MB log file** — <5 seconds (summary, timeline, or grep)
- **Memory usage** — stable <350 MB (regardless of file size)
- **Line-by-line streaming** — never loads entire file into memory

### Benchmark Results

```
✓ summary                   4051.58ms (heap: 263.6 MB)
✓ timeline --bucket 5m      1388.19ms (heap: -4.0 MB)
✓ grep --level ERROR        1545.70ms (heap: 282.2 MB)
✓ grep --text timeout       2047.98ms (heap: 130.2 MB)
```

## Testing

Run the test suite:

```bash
npm test
```

Generate a 100 MB synthetic log for testing:

```bash
npm run gen-log
```

Run benchmarks:

```bash
node scripts/benchmark.js
```

## Global Options

### `--format <format>`

Output format for every command.

**Options:**
- `text` (default) — human-readable terminal output
- `json` — machine-readable JSON
- `md` — markdown report file; writes to `<command>_<timestamp>.md` in the current directory

### `--help` / `-h`

Show usage and examples for a command.

### `--version` / `-v`

Show tool version.

## Error Handling

**Exit codes:**
- `0` — success
- `1` — file not found or permission denied
- `2` — invalid arguments or unsupported format
- `3` — parsing/processing error

**Malformed lines:**
- Counted and reported in summary
- Skipped in grep and timeline output
- Never cause the tool to crash

## Project Structure

```
.
├── bin/
│   └── logscope              # CLI entry point
├── src/
│   ├── parser.js             # Log format detection and parsing
│   ├── summary.js            # Summary command
│   ├── timeline.js           # Timeline command
│   ├── grep.js               # Grep command
│   ├── explain.js            # LLM-based analysis (stretch goal)
│   └── formatters.js         # Output formatters (text, JSON, markdown)
├── scripts/
│   ├── gen_log.js            # Synthetic log generator
│   └── benchmark.js          # Performance benchmark
├── tests/
│   ├── parser.test.js        # Parser unit tests
│   ├── summary.test.js       # Summary command tests
│   ├── timeline.test.js      # Timeline command tests
│   ├── grep.test.js          # Grep command tests
│   └── test_logs/            # Sample test files
│       ├── simple.log
│       ├── mixed_format.log
│       ├── malformed.log
│       └── large_100mb.log   # Generated benchmark file
├── package.json              # Project metadata and dependencies
└── README.md                 # This file
```

## Development

### Adding a new command

1. Create a new module in `src/` (e.g., `src/mycommand.js`)
2. Export an async function that processes the log and returns data
3. Add a formatter for each output type in `src/formatters.js`
4. Add the command handler in `bin/logscope`
5. Write tests in `tests/mycommand.test.js`
6. Update help text in `showHelp()`

### Extending the parser

The parser (`src/parser.js`) has priority-based format detection. To add a new format:

1. Add a regex pattern at the top of the file
2. Implement format-specific extraction logic in `parseLine()`
3. Add tests to `tests/parser.test.js`

## License

MIT
