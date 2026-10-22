# PROJECT_INSTRUCTIONS.md

## logscope — Quick Log Analysis CLI for Operations

### Overview
This project delivers **logscope**, a command-line tool built for operations teams to analyze application logs after incidents without dashboards. It streams large files efficiently and provides summaries, timelines, and filtered views.

---

## Requirements

### Language
- **Python 3.8+** OR **Node.js 16+**
- Choose one; build it in that language.

### Core Features
1. **summary** — counts by level, top 5 error messages, first/last timestamps
2. **timeline** — error count per time bucket with ASCII bar chart
3. **grep** — filter by level, timestamp range, or text
4. **Formats** — text (default), JSON, Markdown reports
5. **Streaming** — handle 100 MB logs without loading fully into memory
6. **Robustness** — malformed lines are counted and skipped, never crash

### Quality Standards
- **Memory efficient:** line-by-line streaming only
- **Fast:** 100 MB files process in <10 seconds
- **Robust parsing:** auto-detect log formats (ISO 8601, text, JSON)
- **No crashes:** malformed lines counted, reported, skipped
- **Exit codes:** 0 = success, 1 = file error, 2 = arg error, 3 = parse error

---

## Deliverables

### Code Structure
```
.
├── SPEC.md                          # (Provided) Full specification
├── PROJECT_INSTRUCTIONS.md          # This file
├── src/                             # (Create; language-specific)
│   ├── logscope.py                  # (Python) OR logscope.js (Node.js)
│   ├── log_parser.py / parser.js    # Log format detection and parsing
│   ├── formatters.py / formatters.js # Output formatters (text, JSON, md)
│   └── utils.py / utils.js          # Helpers (time bucketing, arg parsing)
├── bin/                             # (Create)
│   └── logscope                     # CLI entry point (shebang script or .js)
├── tests/                           # (Create; optional but recommended)
│   ├── test_parser.py / test_parser.js
│   ├── test_summary.py / test_summary.js
│   └── test_logs/                   # Sample test logs
│       ├── simple.log
│       ├── mixed_format.log
│       └── malformed.log
├── package.json                     # (Node.js only)
├── requirements.txt                 # (Python only)
└── README.md                        # Usage guide and examples
```

### Entry Point
- **Python:** Run `python bin/logscope <command> [options]` or `python -m logscope <command>`
- **Node.js:** Run `node bin/logscope <command>` or make it executable with shebang (`#!/usr/bin/env node`)

### CLI Interface
```bash
logscope summary <file> [--format {text,json,md}]
logscope timeline <file> --bucket {1m,5m,15m,30m,1h} [--format {text,json,md}]
logscope grep <file> [--level LEVEL] [--since DATETIME] [--until DATETIME] [--text TEXT] [--format {text,json,md}]
logscope --help
logscope --version
```

---

## Implementation Checklist

### Phase 1: Core Parsing
- [ ] Implement log line parser (multi-format detection)
  - ISO 8601 + text / JSON
  - Timestamp + level + text
  - Level + text (no timestamp)
  - Unstructured (malformed)
- [ ] Extract: timestamp, level, message
- [ ] Handle malformed lines gracefully

### Phase 2: Commands
- [ ] **summary** — stream file, count by level, track top 5 errors, record first/last timestamp
- [ ] **timeline** — stream file, bucket errors by time, track counts
- [ ] **grep** — stream file, apply filters, output matching lines

### Phase 3: Output Formatting
- [ ] Text formatter (human-readable with ASCII art for timeline)
- [ ] JSON formatter (structured data)
- [ ] Markdown formatter (report files with tables)

### Phase 4: CLI & Integration
- [ ] Argument parser (support all `--format`, `--bucket`, `--level`, `--since`, `--until`, `--text`)
- [ ] File I/O with line buffering
- [ ] Exit codes (0, 1, 2, 3)
- [ ] Error messages and help text

### Phase 5: Testing & Documentation
- [ ] Unit tests (optional but recommended)
- [ ] Sample logs in `tests/test_logs/` (mixed formats, malformed lines)
- [ ] README with examples
- [ ] Verify streaming on 100 MB log file

---

## Key Design Decisions

### 1. Log Format Detection
Auto-detect and parse the most common formats. Priority order:
1. ISO 8601 (with or without ms/Z)
2. `YYYY-MM-DD HH:MM:SS`
3. Named levels in square brackets `[INFO]` or inline
4. If no timestamp, treat as malformed but count it

### 2. Streaming Strategy
- Read file line-by-line (never load full file into memory)
- For **summary**: maintain only counters (dict of levels, dict of error messages, two timestamps)
- For **timeline**: maintain only bucket counters (dict keyed by bucket time)
- For **grep**: stream output directly (no buffering)

### 3. Top 5 Errors
- Extract exact message text (after level, before any JSON or extra context)
- Count by exact string match
- Sort by frequency (descending); ties broken by first occurrence
- Return top 5

### 4. Time Bucketing
- Parse `--bucket` as `1m`, `5m`, `15m`, `30m`, `1h` (convert to seconds)
- Bucket key = floor(timestamp / bucket_size) * bucket_size (as ISO string or unix timestamp)
- Error = any line with level ERROR (or higher severity)

### 5. Text Search
- `--text` filter is case-insensitive substring match on the message part
- Combine with `--level` and `--since/--until` using AND logic (all must match)

### 6. Markdown Output
- Use markdown tables for summary counts
- Use code blocks for log lines
- Use level-2 headings for sections
- Filename: `<command>_<YYYYMMDD_HHMMSS>.md`

---

## Testing Strategy

### Sample Logs
Create in `tests/test_logs/`:

**simple.log** — single format
```
2026-10-22T09:00:01Z [INFO] Application started
2026-10-22T09:00:05Z [INFO] Connected to database
2026-10-22T09:01:00Z [ERROR] Connection timeout
2026-10-22T09:02:00Z [WARN] Retrying...
2026-10-22T09:02:15Z [INFO] Connection restored
```

**mixed_format.log** — multiple formats
```
2026-10-22 09:00:01 INFO: Boot sequence initiated
[ERROR] 2026-10-22T09:15:00Z Database connection failed
2026-10-22T09:20:00Z [WARN] Memory usage high
UnparsableLineWithoutTimestampOrLevel
2026-10-22T10:00:00Z [ERROR] Out of memory
```

**malformed.log** — heavily malformed
```
{json without timestamp}
[INFO] no timestamp here
garbage data %%% !!!
2026-10-22T11:00:00Z [INFO] Valid line
more garbage
```

### Test Cases
- [ ] Parse all formats
- [ ] Count malformed lines correctly
- [ ] Summary on simple.log
- [ ] Timeline on simple.log with `--bucket 1m`
- [ ] Grep with `--level ERROR`
- [ ] Grep with `--since` filter
- [ ] JSON output
- [ ] MD output file creation
- [ ] Large file (stream test; create 100 MB test file or mock)
- [ ] Exit codes on file not found, invalid args

---

## Performance Targets
- **100 MB log file** → <10 seconds (summary, timeline, or grep)
- **Memory usage** → <50 MB (regardless of file size)
- **CPU** → efficient single-pass (or two-pass for some commands if needed)

---

## Documentation

### README.md
Include:
- **Quick start:** installation, first command
- **Examples:** each command with sample output
- **Log format support:** list detected formats
- **Troubleshooting:** common issues
- **Development:** how to run tests, extend parser

### Help Text
```bash
$ logscope --help

logscope — quick log analysis CLI for operations teams

Usage:
  logscope summary <file> [--format {text,json,md}]
  logscope timeline <file> --bucket {1m|5m|15m|30m|1h} [--format {text,json,md}]
  logscope grep <file> [--level LEVEL] [--since DATETIME] [--until DATETIME] [--text TEXT] [--format {text,json,md}]
  logscope --help
  logscope --version

Commands:
  summary     Counts by log level, top 5 errors, first/last timestamp
  timeline    Error count per time bucket as ASCII bar chart
  grep        Filter lines by level, timestamp, or text

Global options:
  --format    Output format: text (default), json, md
  --help, -h  Show this message
  --version   Show version

Examples:
  logscope summary app.log
  logscope timeline app.log --bucket 15m
  logscope grep app.log --level ERROR --since "2026-10-01 09:00"
  logscope summary app.log --format md
```

---

## Success Criteria
1. ✅ All three commands work (summary, timeline, grep)
2. ✅ All output formats work (text, JSON, md)
3. ✅ Streams large files without memory issues
4. ✅ Malformed lines handled gracefully (counted, skipped, never crash)
5. ✅ Exit codes correct (0, 1, 2, 3)
6. ✅ Help and version flags
7. ✅ README + examples
8. ✅ Tests pass (all edge cases)

---

## Notes for Developer

- **Keep it simple:** no external dependencies if possible; use stdlib only.
- **Streaming first:** design for 100 MB+ files from day one.
- **Error recovery:** malformed lines are not fatal; count and report.
- **User experience:** clear error messages, sensible defaults.
- **Operations context:** assume users are debugging under pressure; make output scannable.

---

## Questions?
Refer to SPEC.md for detailed requirements. If ambiguous, err on the side of robustness and clarity.
