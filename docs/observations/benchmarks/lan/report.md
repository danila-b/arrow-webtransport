# Benchmark Session Report

## Session

- Created: 2026-05-10T11:40:56.430Z
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
- Raw results: `results/2026-05-10T11-40-56-068Z/lan.ndjson`
- Runs CSV: `results/2026-05-10T11-40-56-068Z/runs.csv`
- Summary CSV: `results/2026-05-10T11-40-56-068Z/summary.csv`
- Report: `results/2026-05-10T11-40-56-068Z/report.md`

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
| Taxi 8 cols x 100k rows | http2-arrow | 0 | 13.9 | 88.5 | 1129943.5 | 59.97 |
| Taxi 8 cols x 100k rows | http2-json | 0 | 73 | 303.6 | 329380.76 | 60.94 |
| Taxi 8 cols x 100k rows | webtransport | 15.3 | 2.4 | 91.5 | 1092896.17 | 58.01 |
| Taxi 8 cols x 200k rows | http2-arrow | 0 | 11.4 | 92.7 | 2157497.3 | 114.49 |
| Taxi 8 cols x 200k rows | http2-json | 0 | 114.2 | 611.1 | 327278.68 | 61.73 |
| Taxi 8 cols x 200k rows | webtransport | 15.2 | 2.3 | 97.6 | 2049180.33 | 108.75 |
| Taxi 8 cols x 400k rows | http2-arrow | 0 | 13.5 | 106.4 | 3759398.5 | 199.49 |
| Taxi 8 cols x 400k rows | http2-json | 0 | 169.7 | 1263.9 | 316480.73 | 60.87 |
| Taxi 8 cols x 400k rows | webtransport | 16.2 | 2.4 | 155.1 | 2578981.3 | 136.85 |
| Taxi 8 cols x 800k rows | http2-arrow | 0 | 10.2 | 132.4 | 6042296.07 | 320.63 |
| Taxi 8 cols x 800k rows | http2-json | 0 | 297.2 | 2423.1 | 330155.59 | 65.09 |
| Taxi 8 cols x 800k rows | webtransport | 16.6 | 2.1 | 268.1 | 2983961.21 | 158.34 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 12.1 | 137 | 364963.5 | 52.03 |
| Taxi all 19 cols x 50k rows | http2-json | 0 | 66.4 | 249.7 | 200240.29 | 62.45 |
| Taxi all 19 cols x 50k rows | webtransport | 17.2 | 2.5 | 170.5 | 293255.13 | 41.81 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 16.1 | 145.2 | 688705.23 | 98.17 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 104.8 | 441.1 | 226705.96 | 70.69 |
| Taxi all 19 cols x 100k rows | webtransport | 14.6 | 3.7 | 368.7 | 271223.22 | 38.66 |
| Taxi all 19 cols x 200k rows | http2-arrow | 0 | 14.7 | 175.2 | 1141552.51 | 162.69 |
| Taxi all 19 cols x 200k rows | http2-json | 0 | 151.9 | 868.2 | 230361.67 | 75.37 |
| Taxi all 19 cols x 200k rows | webtransport | 14.1 | 4 | 643.6 | 310752.02 | 44.34 |
| Taxi all 19 cols x 400k rows | http2-arrow | 0 | 12.2 | 252.4 | 1584786.05 | 226.56 |
| Taxi all 19 cols x 400k rows | http2-json | 0 | 255.4 | 1814.5 | 220446.4 | 73.91 |
| Taxi all 19 cols x 400k rows | webtransport | 15.6 | 4.5 | 1416.4 | 282406.1 | 40.37 |

## Exceptions

No failed or cancelled persisted runs.

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
