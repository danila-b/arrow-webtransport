# Experiment Runner

This document describes the automated experiment runner for the browser client.

## Goal

The runner automates the existing browser UI, captures the same client-side stats path used for manual experiments, persists one raw record per run, and then derives concise per-session summary artifacts from that raw output.

Its job is intentionally narrow:

- execute a configurable transport/workload matrix
- repeat runs for future statistical analysis
- write raw NDJSON artifacts plus a manifest
- derive session-level CSV and Markdown summaries

It does not yet:

- orchestrate server startup
- apply network profiles itself
- add server-side timing instrumentation
- compute plots, confidence intervals, or cross-session comparisons

That boundary is deliberate. The harness still measures only once through the browser-side `StatsCollector`; the derived artifacts simply reorganize that same structured payload into forms that are easier to inspect and compare.

## How It Works

The runner launches Chromium with Playwright, opens the existing client at `https://localhost:5173`, selects a transport and workload, clicks `Run`, then waits for the client to publish a structured run result through `window.__bench`.

That bridge is populated from the same `StatsCollector.snapshot()` object already used to render the stats panel in the UI. This keeps manual and automated runs aligned.

## Prerequisites

Start the environment yourself before running the automation:

- local/default setup: `just dev`
- network-emulated setup: `just bench-net <profile>` and, in another terminal, `just client`

The runner records the `mode` and `networkProfile` you provide in its config, but it does not verify or enforce that environment in v1.

## Run It

From `src/client`:

```sh
npm run bench:run -- benchmarks/minimal.example.json
```

The first time on a new machine, Playwright may also need its Chromium browser installed:

```sh
npx playwright install chromium
```

## Config Shape

Example:

```json
{
  "mode": "bench-net",
  "networkProfile": "lan",
  "baseUrl": "https://localhost:5173",
  "outputDir": "results",
  "headless": true,
  "runTimeoutMs": 300000,
  "warmupRuns": 1,
  "repetitions": 3,
  "transports": ["webtransport", "http2-arrow", "http2-json"],
  "workloads": ["small", "medium"],
  "customQueries": []
}
```

Fields:

- `mode`: informational label persisted in the output
- `networkProfile`: informational label persisted in the output
- `baseUrl`: client URL, defaults to `https://localhost:5173`
- `outputDir`: root directory for artifacts, resolved from the repository root
- `headless`: whether Chromium runs headlessly
- `runTimeoutMs`: timeout per query run
- `warmupRuns`: number of warmup runs per transport/query case, not persisted
- `repetitions`: number of persisted runs per transport/query case
- `transports`: transport ids from the client UI
- `workloads`: preset workload ids from `src/client/src/workloads.ts`
- `customQueries`: optional list of `{ "id": "...", "sql": "..." }` entries

## Output

Artifacts are written under:

```text
results/<timestamp>/
```

Each session currently contains:

- `<networkProfile>.ndjson`: one JSON object per persisted run
- `manifest.json`: session metadata, config summary, and output location
- `runs.csv`: one flattened row per persisted run
- `summary.csv`: one summary row per `{transportId, queryCaseId}` pair in the session
- `report.md`: a concise session report with metadata, status counts, median metrics, and caveats

Each raw run record includes:

- reproducibility metadata such as timestamp, git SHA, mode, and network profile
- experiment inputs such as transport, query case id, repetition, and query text
- browser metadata
- final run status: `success`, `error`, or `cancelled`
- raw browser-side stats from `QueryStats`

The derived files are built from those same persisted records:

- `runs.csv` preserves per-run fidelity while making ad hoc inspection easier in spreadsheets or data tools
- `summary.csv` keeps the first deliverable concise by reporting status counts and median values for the key latency and throughput metrics
- `report.md` gives a quick human-readable session view without replacing the raw NDJSON as the source of truth

## Why The Browser Bridge Matters

The runner does not scrape formatted strings from the stats panel. Instead it reads a structured object published through `window.__bench`.

That is important for two reasons:

- it preserves the exact numeric payload already produced by `StatsCollector`
- it keeps the automation layer resilient if the UI wording changes later

## Session Analysis Notes

The session analysis step intentionally stays narrow:

- it summarizes persisted repetitions only; warmup runs are excluded
- it uses browser-side metrics only; no new measurement path is introduced
- it records `mode` and `networkProfile` labels but still does not verify the external environment itself

## Follow-Up Work

Natural next steps after this session-level pipeline:

- server-side timing and batch counters
- richer query suites and TPC-H workloads
- percentiles, confidence intervals, and chart generation
- optional orchestration around `just dev` and `just bench-net`
