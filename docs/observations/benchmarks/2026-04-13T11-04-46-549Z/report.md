# Benchmark Session Report

## Session

- Created: 2026-04-13T11:04:46.883Z
- Mode: bench-net
- Network profile: lan
- Browser: chromium 147.0.7727.15
- Warmup runs per case: 1
- Persisted repetitions per case: 3
- Persisted runs: 18/18
- Successes: 18
- Errors: 0
- Cancelled: 0
- Git SHA: 787fb2ded0ec7c95c53b8f7c9518865757f6ec50
- Raw results: `results/2026-04-13T11-04-46-549Z/lan.ndjson`
- Runs CSV: `results/2026-04-13T11-04-46-549Z/runs.csv`
- Summary CSV: `results/2026-04-13T11-04-46-549Z/summary.csv`
- Report: `results/2026-04-13T11-04-46-549Z/report.md`

## Outcome Summary

| Query case | Transport | Persisted runs | Successes | Errors | Cancelled |
| --- | --- | --- | --- | --- | --- |
| medium | http2-arrow | 3 | 3/3 | 0 | 0 |
| medium | http2-json | 3 | 3/3 | 0 | 0 |
| medium | webtransport | 3 | 3/3 | 0 | 0 |
| small | http2-arrow | 3 | 3/3 | 0 | 0 |
| small | http2-json | 3 | 3/3 | 0 | 0 |
| small | webtransport | 3 | 3/3 | 0 | 0 |

## Median Metrics

| Query case | Transport | Connect (ms) | TTFB (ms) | Total (ms) | Rows/sec | MB/sec |
| --- | --- | --- | --- | --- | --- | --- |
| medium | http2-arrow | 0 | 210.6 | 1243.6 | 40205.85 | 2.46 |
| medium | http2-json | 0 | 326.5 | 3238.8 | 15437.82 | 2.98 |
| medium | webtransport | 173.1 | 50.4 | 1167.7 | 42819.22 | 2.62 |
| small | http2-arrow | 0 | 176.3 | 232.2 | 2153.32 | 0.1 |
| small | http2-json | 0.1 | 263.8 | 327.5 | 1526.72 | 0.21 |
| small | webtransport | 174.5 | 49 | 152.6 | 3276.54 | 0.15 |

## Exceptions

No failed or cancelled persisted runs.

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
