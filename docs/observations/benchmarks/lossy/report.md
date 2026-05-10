# Benchmark Session Report

## Session

- Created: 2026-05-10T15:10:45.809Z
- Mode: bench-net
- Network profile: lan
- Browser: chromium 147.0.7727.15
- Warmup runs per case: 1
- Persisted repetitions per case: 3
- Persisted runs: 72/72
- Successes: 58
- Errors: 14
- Cancelled: 0
- Git SHA: e7a06e3519a7df1f781a7ef68e8350a79633f229
- Raw results: `results/2026-05-10T15-10-45-671Z/lan.ndjson`
- Runs CSV: `results/2026-05-10T15-10-45-671Z/runs.csv`
- Summary CSV: `results/2026-05-10T15-10-45-671Z/summary.csv`
- Report: `results/2026-05-10T15-10-45-671Z/report.md`

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
| Taxi 8 cols x 400k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 800k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi 8 cols x 800k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 50k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-arrow | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 100k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | http2-arrow | 3 | 1/3 | 2 | 0 |
| Taxi all 19 cols x 200k rows | http2-json | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 200k rows | webtransport | 3 | 3/3 | 0 | 0 |
| Taxi all 19 cols x 400k rows | webtransport | 3 | 3/3 | 0 | 0 |
| taxi_19c_0400k | http2-arrow | 3 | 0/3 | 3 | 0 |
| taxi_19c_0400k | http2-json | 3 | 0/3 | 3 | 0 |
| taxi_8c_0400k | http2-json | 3 | 0/3 | 3 | 0 |
| taxi_8c_0800k | http2-json | 3 | 0/3 | 3 | 0 |

## Median Metrics

| Query profile | Transport | Connect (ms) | TTFB (ms) | Total (ms) | Rows/sec | MB/sec |
| --- | --- | --- | --- | --- | --- | --- |
| Taxi 8 cols x 100k rows | http2-arrow | 0 | 261.2 | 17517.5 | 5708.58 | 0.3 |
| Taxi 8 cols x 100k rows | http2-json | 0 | 412.2 | 75617.9 | 1322.44 | 0.24 |
| Taxi 8 cols x 100k rows | webtransport | 164.9 | 53.8 | 6908.9 | 14474.08 | 0.77 |
| Taxi 8 cols x 200k rows | http2-arrow | 0 | 217.7 | 46628.9 | 4289.19 | 0.23 |
| Taxi 8 cols x 200k rows | http2-json | 0 | 400.2 | 147983.1 | 1351.51 | 0.25 |
| Taxi 8 cols x 200k rows | webtransport | 155.8 | 68.4 | 11193.2 | 17867.99 | 0.95 |
| Taxi 8 cols x 400k rows | http2-arrow | 0 | 251.2 | 93994.3 | 4255.58 | 0.23 |
| Taxi 8 cols x 400k rows | webtransport | 140.9 | 53.4 | 41855.9 | 9556.6 | 0.51 |
| Taxi 8 cols x 800k rows | http2-arrow | 0 | 220.3 | 190920.6 | 4190.22 | 0.22 |
| Taxi 8 cols x 800k rows | webtransport | 164.6 | 58.9 | 75174.6 | 10641.89 | 0.56 |
| Taxi all 19 cols x 50k rows | http2-arrow | 0 | 209.8 | 30989.9 | 1613.43 | 0.23 |
| Taxi all 19 cols x 50k rows | http2-json | 0 | 315 | 75704.3 | 660.46 | 0.21 |
| Taxi all 19 cols x 50k rows | webtransport | 208.3 | 47.7 | 11563.3 | 4324.03 | 0.62 |
| Taxi all 19 cols x 100k rows | http2-arrow | 0 | 245.4 | 66341.7 | 1507.35 | 0.21 |
| Taxi all 19 cols x 100k rows | http2-json | 0 | 444.9 | 141993.2 | 704.26 | 0.22 |
| Taxi all 19 cols x 100k rows | webtransport | 188.9 | 45.5 | 22349.3 | 4474.41 | 0.64 |
| Taxi all 19 cols x 200k rows | http2-arrow | 0.05 | 417.6 | 80537.8 | 1319.78 | 0.2 |
| Taxi all 19 cols x 200k rows | http2-json | 0 | 445.6 | 262252.8 | 762.62 | 0.24 |
| Taxi all 19 cols x 200k rows | webtransport | 180.4 | 64.2 | 57306.6 | 3490 | 0.5 |
| Taxi all 19 cols x 400k rows | webtransport | 189.4 | 62.5 | 115917 | 3450.74 | 0.49 |
| taxi_19c_0400k | http2-arrow | n/a | n/a | n/a | n/a | n/a |
| taxi_19c_0400k | http2-json | n/a | n/a | n/a | n/a | n/a |
| taxi_8c_0400k | http2-json | n/a | n/a | n/a | n/a | n/a |
| taxi_8c_0800k | http2-json | n/a | n/a | n/a | n/a | n/a |

## Exceptions

| Query profile | Transport | Repetition | Result | Details |
| --- | --- | --- | --- | --- |
| Taxi all 19 cols x 200k rows | http2-arrow | 2 | error | network error |
| taxi_19c_0200k | http2-arrow | 3 | error | page.goto: net::ERR_ABORTED at https://localhost:5173/
Call log:
[2m  - navigating to "https://localhost:5173/", waiting until "domcontentloaded"[22m
 |
| taxi_19c_0400k | http2-arrow | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-arrow | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-arrow | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_19c_0400k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0400k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0400k | http2-json | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0400k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0800k | http2-json | 1 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0800k | http2-json | 2 | error | page.waitForFunction: Timeout 300000ms exceeded. |
| taxi_8c_0800k | http2-json | 3 | error | page.waitForFunction: Timeout 300000ms exceeded. |

## Caveats

- Warmup runs are excluded from all derived session artifacts.
- Metrics come from the browser-side `QueryStats` payload already used by the UI.
- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.
