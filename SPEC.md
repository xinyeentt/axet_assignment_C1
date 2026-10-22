# SPEC.md — logscope

## Overview
**logscope** is a lightweight CLI tool for post-incident log analysis. It streams large log files without loading them entirely into memory, providing quick summaries, timelines, and filtered views to help operations teams investigate incidents fast.

## Commands

### 1. `logscope summary <file>`
Analyzes the entire log file and produces a summary report.

**Output includes:**
- Count of log entries by level (INFO, WARN, ERROR, DEBUG, TRACE, etc.)
- Top 5 most-frequent error messages (by exact text match)
- First log entry timestamp
- Last log entry timestamp
- Total malformed lines encountered

**Examples:**
```bash
logscope summary app.log
logscope summary app.log --format json
logscope summary app.log --format md  # Writes summary_<timestamp>.md
```

---

### 2. `logscope timeline <file> --bucket <duration>`
Groups errors by time buckets and displays a text-based bar chart.

**Parameters:**
- `--bucket` — time interval: `1m`, `5m`, `15m`, `30m`, `1h` (default: `5m`)

**Output:**
- Time range (start to end of log)
- Bucket size
- Bar chart where each row is a bucket with error count visualized as `#` symbols (ASCII bar)
- Total errors

**Examples:**
```bash
logscope timeline app.log --bucket 15m
logscope timeline app.log --bucket 1h --format json
logscope timeline app.log --bucket 5m --format md  # Writes timeline_<timestamp>.md
```

---

### 3. `logscope grep <file> [options]`
Filters and extracts log lines matching criteria.

**Options:**
- `--level <LEVEL>` — filter by log level (case-insensitive; e.g., ERROR, WARN, INFO)
- `--since <datetime>` — only lines with timestamp >= this value (format: `YYYY-MM-DD HH:MM:SS`)
- `--until <datetime>` — only lines with timestamp <= this value
- `--text <substring>` — case-insensitive substring match in message
- Combine multiple filters (all must match; AND logic)

**Output:**
- Filtered log lines (one per line, in original format)
- Line count at end (for text output)

**Examples:**
```bash
logscope grep app.log --level ERROR
logscope grep app.log --level ERROR --since "2026-10-01 09:00"
logscope grep app.log --text "database" --level WARN
logscope grep app.log --level ERROR --format json
logscope grep app.log --level ERROR --format md  # Writes grep_<timestamp>.md
```

---

## Global Options

### `--format <format>`
Output format for every command.

**Formats:**
- `text` (default) — human-readable terminal output
- `json` — machine-readable JSON
- `md` — markdown report file; writes to `<command>_<timestamp>.md` in the current directory

### `--help` / `-h`
Show usage and examples for a command.

### `--version` / `-v`
Show tool version.

---

## Log Format Detection

**Supported formats (auto-detected):**
1. **ISO 8601 + JSON** — `2026-10-22T14:35:12.345Z [INFO] {"msg":"...", "...":"..."}` or similar
2. **ISO 8601 + text** — `2026-10-22T14:35:12Z INFO: message text` or `[INFO] 2026-10-22 14:35:12 message`
3. **Timestamp + level + text** — `2026-10-22 14:35:12 INFO message text`
4. **Level + text** — `[INFO] message text` (no timestamp; treated as single occurrence)
5. **Unstructured** — any line (no timestamp; counted as malformed unless context recovers it)

**Extraction logic:**
- Extract ISO 8601 or `YYYY-MM-DD HH:MM:SS` timestamp (first or second position)
- Extract log level: `INFO`, `WARN`, `ERROR`, `DEBUG`, `TRACE`, `FATAL`, `CRITICAL` (case-insensitive, often in brackets)
- Rest is the message

**Malformed handling:**
- Lines that cannot be parsed are counted separately
- They never crash the tool
- They are skipped in filtered output (grep, timeline)
- Summary reports total malformed lines

---

## Performance & Streaming

**Memory efficiency:**
- Stream log file line-by-line; never load entire file into memory
- For summary: accumulate counters only (level counts, top 5 errors, timestamps)
- For timeline: accumulate bucket counters
- For grep: output matching lines immediately without buffering
- Large files (100 MB+) should complete in <10 seconds on modern hardware

**Implementation hints:**
- Use line-by-line readers (Node.js: `readline`, Python: `line_buffering=True` or generator)
- For "top 5 error messages": maintain a counter dict/map; sort only at end
- For "first/last timestamp": record first non-malformed timestamp and update last on each pass

---

## Error Handling

**Exit codes:**
- `0` — success
- `1` — file not found or permission denied
- `2` — invalid arguments or unsupported format
- `3` — parsing/processing error (e.g., invalid date in `--since`)

**Behavior:**
- Malformed lines do not cause exit code > 0; they are counted and reported
- Invalid `--since` date → error message and exit 2
- Missing required arguments → error message + usage and exit 2

---

## Output Examples

### Summary (text)
```
logscope summary app.log

════════════════════════════════════════════
               LOG SUMMARY
════════════════════════════════════════════

Log file: app.log
Time range: 2026-10-22 09:00:01 → 2026-10-22 14:35:12

Entries by level:
  INFO     4521
  WARN      342
  ERROR      87
  DEBUG     1203
  ────────────────
  TOTAL     6153

Top 5 error messages:
  1. (12x) "Connection timeout to database"
  2.  (9x) "Failed to parse request body"
  3.  (8x) "Authentication failed for user xyz"
  4.  (5x) "Disk space low"
  5.  (3x) "Certificate expired"

Malformed lines: 2

════════════════════════════════════════════
```

### Summary (JSON)
```json
{
  "file": "app.log",
  "time_range": {
    "first": "2026-10-22T09:00:01Z",
    "last": "2026-10-22T14:35:12Z"
  },
  "counts_by_level": {
    "INFO": 4521,
    "WARN": 342,
    "ERROR": 87,
    "DEBUG": 1203
  },
  "top_errors": [
    { "count": 12, "message": "Connection timeout to database" },
    { "count": 9, "message": "Failed to parse request body" },
    { "count": 8, "message": "Authentication failed for user xyz" },
    { "count": 5, "message": "Disk space low" },
    { "count": 3, "message": "Certificate expired" }
  ],
  "malformed_lines": 2,
  "total_entries": 6153
}
```

### Timeline (text, `--bucket 15m`)
```
logscope timeline app.log --bucket 15m

════════════════════════════════════════════
              ERROR TIMELINE
════════════════════════════════════════════

Log file: app.log
Bucket size: 15m
Time range: 2026-10-22 09:00:00 → 2026-10-22 14:45:00

  09:00 ──────────────────────────  3 errors
  09:15 ████████░░░░░░░░░░░░░░░░░  8 errors
  09:30 ██████░░░░░░░░░░░░░░░░░░░  5 errors
  09:45 ████████████░░░░░░░░░░░░░  12 errors
  10:00 ██░░░░░░░░░░░░░░░░░░░░░░░  2 errors
  10:15 ██████████░░░░░░░░░░░░░░░  10 errors
  ... (more buckets)

Total errors: 87

════════════════════════════════════════════
```

### Timeline (JSON)
```json
{
  "file": "app.log",
  "bucket_size_seconds": 900,
  "time_range": {
    "start": "2026-10-22T09:00:00Z",
    "end": "2026-10-22T14:45:00Z"
  },
  "buckets": [
    { "time": "2026-10-22T09:00:00Z", "error_count": 3 },
    { "time": "2026-10-22T09:15:00Z", "error_count": 8 },
    { "time": "2026-10-22T09:30:00Z", "error_count": 5 },
    ...
  ],
  "total_errors": 87
}
```

### Grep (text, `--level ERROR --since "2026-10-01 09:00"`)
```
logscope grep app.log --level ERROR --since "2026-10-01 09:00"

2026-10-22T14:35:12Z [ERROR] Connection timeout to database
2026-10-22T14:36:01Z [ERROR] Failed to parse request body
2026-10-22T14:36:45Z [ERROR] Authentication failed for user xyz
...

Matched 12 lines.
```

### Grep (JSON)
```json
{
  "file": "app.log",
  "filters": {
    "level": "ERROR",
    "since": "2026-10-01T09:00:00Z"
  },
  "lines": [
    { "raw": "2026-10-22T14:35:12Z [ERROR] Connection timeout to database", "timestamp": "2026-10-22T14:35:12Z", "level": "ERROR", "message": "Connection timeout to database" },
    ...
  ],
  "matched_count": 12
}
```

---

## Notes for Implementation

1. **Log parsing** should be robust; try multiple patterns and pick the first match.
2. **Timestamp extraction** must handle ISO 8601 (with/without milliseconds, with Z or +HH:MM) and `YYYY-MM-DD HH:MM:SS`.
3. **Error level extraction** is case-insensitive; normalize to uppercase internally.
4. **Top 5 errors** are ranked by frequency; ties are broken by first occurrence.
5. **Bar chart width** can be fixed (e.g., 30 characters) or dynamic; cap visual at terminal width.
6. **MD output** should be valid markdown with tables where applicable (e.g., summary counts table).
7. **No external dependencies** beyond standard library for language chosen (Node.js or Python).
