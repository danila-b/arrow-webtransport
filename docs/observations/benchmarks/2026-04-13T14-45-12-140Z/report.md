# Benchmark Session Report

## Session

- Created: 2026-04-13T14:45:12.445Z
- Mode: bench-net
- Network profile: lan
- Browser: chromium 147.0.7727.15
- Warmup runs per case: 1
- Persisted repetitions per case: 3
- Persisted runs: 72/72
- Successes: 72
- Errors: 0
- Cancelled: 0
- Git SHA: 6e6777491e993f351fa20d1e7f5b534f7b71d34a
- Raw results: `results/2026-04-13T14-45-12-140Z/lan.ndjson`
- Runs CSV: `results/2026-04-13T14-45-12-140Z/runs.csv`
- Summary CSV: `results/2026-04-13T14-45-12-140Z/summary.csv`
- Report: `results/2026-04-13T14-45-12-140Z/report.md`

## Outcome Summary

| Query profile | Transport | Persisted runs | Successes | Errors | Cancelled |
| --- | --- | --- | --- | --- | --- |
| Taxi 10 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 250k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 250k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 250k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 500k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 500k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 500k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 1M rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 1M rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 10 cols x 1M rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 250k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 250k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 250k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 500k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 500k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 500k rows | webtransport | 3 | 3/3 | 0 | 0 |

## Median Metrics

| Query profile | Transport | Connect (ms) | TTFB (ms) | Total (ms) | Rows/sec | MB/sec |
| --- | --- | --- | --- | --- | --- | --- |
| Taxi 10 cols x 100k rows | http2-arrow | 0 | 226.4 | 2314.8 | 43200.28 | 3 |
| Taxi 10 cols x 100k rows | http2-json | 0 | 331.3 | 6959.3 | 14369.26 | 3.19 |
| Taxi 10 cols x 100k rows | webtransport | 166.6 | 49.3 | 2279.6 | 43867.35 | 3.04 |
| Taxi 10 cols x 250k rows | http2-arrow | 0 | 198.9 | 5169 | 48365.25 | 3.35 |
| Taxi 10 cols x 250k rows | http2-json | 0 | 388 | 16716.8 | 14955.02 | 3.33 |
| Taxi 10 cols x 250k rows | webtransport | 177.6 | 54.6 | 5135.7 | 48678.86 | 3.37 |
| Taxi 10 cols x 500k rows | http2-arrow | 0 | 183.7 | 10032.2 | 49839.52 | 3.46 |
| Taxi 10 cols x 500k rows | http2-json | 0 | 514.6 | 33726.1 | 14825.31 | 3.38 |
| Taxi 10 cols x 500k rows | webtransport | 175.5 | 48.6 | 9979.2 | 50104.22 | 3.47 |
| Taxi 10 cols x 1M rows | http2-arrow | 0 | 208.7 | 19706.9 | 50743.65 | 3.52 |
| Taxi 10 cols x 1M rows | http2-json | 0 | 738.3 | 68685.1 | 14559.2 | 3.41 |
| Taxi 10 cols x 1M rows | webtransport | 173.6 | 52.9 | 19681.3 | 50809.65 | 3.52 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 182 | 2318.3 | 21567.53 | 3.07 |
| Taxi all 19 cols x 50k rows | http2-json | 0 | 271.3 | 4916.8 | 10169.22 | 3.17 |
| Taxi all 19 cols x 50k rows | webtransport | 158.6 | 49.4 | 2355.5 | 21226.92 | 3.03 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 175.4 | 4359.1 | 22940.52 | 3.27 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 317.2 | 9403.7 | 10634.11 | 3.32 |
| Taxi all 19 cols x 100k rows | webtransport | 160.5 | 46.5 | 4292.7 | 23295.36 | 3.32 |
| Taxi all 19 cols x 250k rows | http2-arrow | 0 | 192.6 | 10354.8 | 24143.39 | 3.45 |
| Taxi all 19 cols x 250k rows | http2-json | 0 | 415.9 | 25181.6 | 9927.88 | 3.4 |
| Taxi all 19 cols x 250k rows | webtransport | 180.5 | 47.3 | 10306.1 | 24257.48 | 3.46 |
| Taxi all 19 cols x 500k rows | http2-arrow | 0 | 206.2 | 20321.3 | 24604.73 | 3.52 |
| Taxi all 19 cols x 500k rows | http2-json | 0 | 587.1 | 52377.4 | 9546.1 | 3.42 |
| Taxi all 19 cols x 500k rows | webtransport | 160.4 | 59.9 | 20307.9 | 24620.96 | 3.52 |

## Exceptions

No failed or cancelled persisted runs.

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
