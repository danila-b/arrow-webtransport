# Benchmark Session Report

## Session

- Created: 2026-05-10T12:16:52.028Z
- Mode: bench-net
- Network profile: lan
- Browser: chromium 147.0.7727.15
- Warmup runs per case: 1
- Persisted repetitions per case: 3
- Persisted runs: 72/72
- Successes: 62
- Errors: 10
- Cancelled: 0
- Git SHA: e7a06e3519a7df1f781a7ef68e8350a79633f229
- Raw results: `results/2026-05-10T12-16-51-901Z/lan.ndjson`
- Runs CSV: `results/2026-05-10T12-16-51-901Z/runs.csv`
- Summary CSV: `results/2026-05-10T12-16-51-901Z/summary.csv`
- Report: `results/2026-05-10T12-16-51-901Z/report.md`

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
| Taxi 8 cols x 800k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | http2-json | 3 | 2/3 | 1 | 0 |
| Taxi all 19 cols x 200k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | webtransport | 3 | 3/3 | 0 | 0 |
| taxi_19c_0050k | http2-json | 3 | 0/3 | 3 | 0 |
| taxi_19c_0400k | http2-json | 3 | 0/3 | 3 | 0 |
| taxi_8c_0800k | http2-json | 3 | 0/3 | 3 | 0 |

## Median Metrics

| Query profile | Transport | Connect (ms) | TTFB (ms) | Total (ms) | Rows/sec | MB/sec |
| --- | --- | --- | --- | --- | --- | --- |
| Taxi 8 cols x 100k rows | http2-arrow | 0 | 375.4 | 11450.8 | 8733.01 | 0.46 |
| Taxi 8 cols x 100k rows | http2-json | 0 | 552 | 66067.9 | 1513.59 | 0.28 |
| Taxi 8 cols x 100k rows | webtransport | 251.7 | 132.7 | 4943.2 | 20229.81 | 1.07 |
| Taxi 8 cols x 200k rows | http2-arrow | 0 | 373 | 34770.1 | 5752.07 | 0.31 |
| Taxi 8 cols x 200k rows | http2-json | 0 | 567.1 | 117300.2 | 1705.03 | 0.32 |
| Taxi 8 cols x 200k rows | webtransport | 269.5 | 107.1 | 9726.4 | 20562.59 | 1.09 |
| Taxi 8 cols x 400k rows | http2-arrow | 0 | 347.7 | 70903.9 | 5641.44 | 0.3 |
| Taxi 8 cols x 400k rows | http2-json | 0 | 580.5 | 250723 | 1595.39 | 0.3 |
| Taxi 8 cols x 400k rows | webtransport | 338.3 | 108.2 | 37653.7 | 10623.13 | 0.56 |
| Taxi 8 cols x 800k rows | http2-arrow | 0 | 324.3 | 150331.1 | 5321.59 | 0.28 |
| Taxi 8 cols x 800k rows | webtransport | 317.1 | 130.8 | 44436.4 | 18003.26 | 0.96 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 372.9 | 19103.5 | 2617.32 | 0.37 |
| Taxi all 19 cols x 50k rows | webtransport | 362.8 | 130.9 | 8733.9 | 5724.82 | 0.82 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 345 | 42985.4 | 2326.37 | 0.33 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 468.7 | 102116.4 | 979.27 | 0.31 |
| Taxi all 19 cols x 100k rows | webtransport | 342.3 | 112.1 | 14987.1 | 6672.4 | 0.95 |
| Taxi all 19 cols x 200k rows | http2-arrow | 0 | 349.7 | 91104.9 | 2195.27 | 0.31 |
| Taxi all 19 cols x 200k rows | http2-json | 0 | 647.8 | 212963.3 | 907.12 | 0.28 |
| Taxi all 19 cols x 200k rows | webtransport | 299 | 142.6 | 34215.5 | 5845.3 | 0.83 |
| Taxi all 19 cols x 400k rows | http2-arrow | 0 | 382.2 | 192188.5 | 2081.29 | 0.3 |
| Taxi all 19 cols x 400k rows | webtransport | 377 | 127.1 | 78637 | 5086.66 | 0.73 |
| taxi_19c_0050k | http2-json | n/a | n/a | n/a | n/a | n/a |
| taxi_19c_0400k | http2-json | n/a | n/a | n/a | n/a | n/a |
| taxi_8c_0800k | http2-json | 0 | 929.4 | 118760.4 | n/a | n/a |

## Exceptions

| Query profile | Transport | Repetition | Result | Details |
| --- | --- | --- | --- | --- |
| Taxi 8 cols x 800k rows | http2-json | 2 | error | Failed to fetch |
| Taxi all 19 cols x 200k rows | http2-json | 3 | error | Failed to fetch |
| taxi_19c_0050k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0050k | http2-json | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0050k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0800k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0800k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
