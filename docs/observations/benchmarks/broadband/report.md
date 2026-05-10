# Benchmark Session Report

## Session

- Created: 2026-05-10T11:45:29.386Z
- Mode: bench-net
- Network profile: lan
- Browser: chromium 147.0.7727.15
- Warmup runs per case: 1
- Persisted repetitions per case: 3
- Persisted runs: 72/72
- Successes: 72
- Errors: 0
- Cancelled: 0
- Git SHA: e7a06e3519a7df1f781a7ef68e8350a79633f229
- Raw results: `results/2026-05-10T11-45-29-247Z/lan.ndjson`
- Runs CSV: `results/2026-05-10T11-45-29-247Z/runs.csv`
- Summary CSV: `results/2026-05-10T11-45-29-247Z/summary.csv`
- Report: `results/2026-05-10T11-45-29-247Z/report.md`

## Outcome Summary

| Query profile | Transport | Persisted runs | Successes | Errors | Cancelled |
| --- | --- | --- | --- | --- | --- |
| Taxi 8 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 200k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 200k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 200k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 400k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 400k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 400k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 800k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 800k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 800k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | webtransport | 3 | 3/3 | 0 | 0 |

## Median Metrics

| Query profile | Transport | Connect (ms) | TTFB (ms) | Total (ms) | Rows/sec | MB/sec |
| --- | --- | --- | --- | --- | --- | --- |
| Taxi 8 cols x 100k rows | http2-arrow | 0 | 58.9 | 617.2 | 162022.03 | 8.6 |
| Taxi 8 cols x 100k rows | http2-json | 0 | 183 | 1995.3 | 50117.78 | 9.27 |
| Taxi 8 cols x 100k rows | webtransport | 66.1 | 14.4 | 574.8 | 173973.56 | 9.23 |
| Taxi 8 cols x 200k rows | http2-arrow | 0 | 62.5 | 1059.6 | 188750.47 | 10.02 |
| Taxi 8 cols x 200k rows | http2-json | 0 | 203.7 | 3872.4 | 51647.56 | 9.74 |
| Taxi 8 cols x 200k rows | webtransport | 49.4 | 15.2 | 1004.5 | 199104.03 | 10.57 |
| Taxi 8 cols x 400k rows | http2-arrow | 0 | 60.6 | 1881.3 | 212618.93 | 11.28 |
| Taxi 8 cols x 400k rows | http2-json | 0 | 254.4 | 7698.9 | 51955.47 | 10.06 |
| Taxi 8 cols x 400k rows | webtransport | 68.8 | 13.2 | 1872.9 | 213572.53 | 11.33 |
| Taxi 8 cols x 800k rows | http2-arrow | 0 | 55 | 3679 | 217450.39 | 11.54 |
| Taxi 8 cols x 800k rows | http2-json | 0 | 393.3 | 15612.2 | 51241.98 | 10.25 |
| Taxi 8 cols x 800k rows | webtransport | 57.7 | 14 | 3671.7 | 217882.72 | 11.56 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 74.3 | 758.9 | 65884.83 | 9.39 |
| Taxi all 19 cols x 50k rows | http2-json | 0 | 136.3 | 1640.3 | 30482.23 | 9.51 |
| Taxi all 19 cols x 50k rows | webtransport | 53.9 | 15 | 722.1 | 69242.49 | 9.87 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 62.8 | 1359.2 | 73572.69 | 10.49 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 152.6 | 3152.9 | 31716.83 | 9.89 |
| Taxi all 19 cols x 100k rows | webtransport | 79.5 | 14.3 | 1337.2 | 74783.13 | 10.66 |
| Taxi all 19 cols x 200k rows | http2-arrow | 0 | 58.5 | 2522.3 | 79292.71 | 11.31 |
| Taxi all 19 cols x 200k rows | http2-json | 0 | 231 | 6094.5 | 32816.47 | 10.23 |
| Taxi all 19 cols x 200k rows | webtransport | 68.9 | 13.8 | 2528.6 | 79095.15 | 11.29 |
| Taxi all 19 cols x 400k rows | http2-arrow | 0 | 64 | 4917.9 | 81335.53 | 11.64 |
| Taxi all 19 cols x 400k rows | http2-json | 0 | 315.9 | 12945.2 | 30899.48 | 10.3 |
| Taxi all 19 cols x 400k rows | webtransport | 59.9 | 14.1 | 4947.2 | 80853.82 | 11.56 |

## Exceptions

No failed or cancelled persisted runs.

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
