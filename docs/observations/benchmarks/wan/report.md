# Benchmark Session Report

## Session

- Created: 2026-05-10T11:52:43.115Z
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
- Raw results: `results/2026-05-10T11-52-42-975Z/lan.ndjson`
- Runs CSV: `results/2026-05-10T11-52-42-975Z/runs.csv`
- Summary CSV: `results/2026-05-10T11-52-42-975Z/summary.csv`
- Report: `results/2026-05-10T11-52-42-975Z/report.md`

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
| Taxi 8 cols x 100k rows | http2-arrow | 0 | 209.1 | 1844.2 | 54224.05 | 2.88 |
| Taxi 8 cols x 100k rows | http2-json | 0 | 272.1 | 5720.8 | 17480.07 | 3.23 |
| Taxi 8 cols x 100k rows | webtransport | 177.6 | 84.3 | 1751.4 | 57097.18 | 3.03 |
| Taxi 8 cols x 200k rows | http2-arrow | 0 | 172.8 | 3292.4 | 60745.96 | 3.22 |
| Taxi 8 cols x 200k rows | http2-json | 0 | 415.9 | 11571.5 | 17283.84 | 3.3 |
| Taxi 8 cols x 200k rows | webtransport | 164.1 | 46.9 | 3266.9 | 61220.12 | 3.25 |
| Taxi 8 cols x 400k rows | http2-arrow | 0 | 180.3 | 6222.8 | 64279.75 | 3.41 |
| Taxi 8 cols x 400k rows | http2-json | 0 | 391.1 | 22772.1 | 17565.35 | 3.36 |
| Taxi 8 cols x 400k rows | webtransport | 174.1 | 45.7 | 6194.7 | 64571.33 | 3.43 |
| Taxi 8 cols x 800k rows | http2-arrow | 0 | 181.4 | 12198.4 | 65582.37 | 3.48 |
| Taxi 8 cols x 800k rows | http2-json | 0 | 519.1 | 46200.9 | 17315.68 | 3.39 |
| Taxi 8 cols x 800k rows | webtransport | 159.3 | 54.4 | 12130.4 | 65950.01 | 3.5 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 214.3 | 2338.5 | 21381.23 | 3.05 |
| Taxi all 19 cols x 50k rows | http2-json | 0 | 297.5 | 4945.3 | 10110.61 | 3.15 |
| Taxi all 19 cols x 50k rows | webtransport | 150.4 | 44.7 | 2272.7 | 22000.26 | 3.14 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 239.4 | 4358.7 | 22942.62 | 3.27 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 353.8 | 9434.6 | 10599.28 | 3.31 |
| Taxi all 19 cols x 100k rows | webtransport | 143.7 | 59.5 | 4269.4 | 23422.49 | 3.34 |
| Taxi all 19 cols x 200k rows | http2-arrow | 0 | 184.5 | 8274.9 | 24169.48 | 3.45 |
| Taxi all 19 cols x 200k rows | http2-json | 0 | 398.7 | 19397.2 | 10310.77 | 3.37 |
| Taxi all 19 cols x 200k rows | webtransport | 161.6 | 55.1 | 8280.5 | 24153.13 | 3.45 |
| Taxi all 19 cols x 400k rows | http2-arrow | 0 | 222.2 | 16316.7 | 24514.76 | 3.5 |
| Taxi all 19 cols x 400k rows | http2-json | 0 | 509.6 | 38004 | 10525.21 | 3.4 |
| Taxi all 19 cols x 400k rows | webtransport | 176.5 | 50.6 | 16264.2 | 24593.89 | 3.52 |

## Exceptions

No failed or cancelled persisted runs.

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
