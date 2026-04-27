# Project Tracker

This file is the living status document for the prototype and thesis work. It tracks what exists today, what still needs to be built, and the technical observations that shape the next steps.

## Current state

The repository currently contains a working prototype for comparing three browser-facing transport paths for analytical query results:

- `src/servers/webtransport/`: WebTransport over QUIC with Arrow IPC streaming and datagrams for progress and cancel
- `src/servers/http2-arrow/`: HTTP/2 streaming response with Arrow IPC
- `src/servers/http2-json/`: HTTP/2 JSON baseline with full result materialization
- `src/server-core/`: shared query execution, Arrow encoding, and certificate support
- `src/client/`: one browser client with a transport picker and shared rendering/stats pipeline

The prototype is now suitable for both manual comparison runs in Chrome and minimal automated browser-driven experiment runs. It is not yet a full thesis-grade experiment harness.

## Implemented

### Technical baseline

- Shared Rust query core based on DataFusion and local Parquet data
- Incremental Arrow IPC streaming for WebTransport and HTTP/2 Arrow
- Buffered JSON baseline for comparison
- Unified TypeScript client for all three transports
- Streaming table rendering for Arrow-based paths
- Cancellation support on all transports
- WebTransport progress updates over datagrams
- Local TLS certificate generation with spec-compliant 14-day validity and race-free startup

### Query workload suite (partial)

The client now defines a clearer taxi-focused transport-comparison matrix in `src/client/src/workloads.ts`:

| Workload family | Rows | Intent |
|---------------|------|--------|
| Taxi 10 cols | 100k, 250k, 500k, 1M | narrow-schema row-scaling ladder |
| Taxi all 19 cols | 50k, 100k, 250k, 500k | wide-schema row-scaling ladder |
| Aggregation | varies | `GROUP BY` with counts/avgs/sums for exploratory/manual runs |

Custom SQL is also supported via a free-text input. The stats panel tracks `workloadId` and `transportId` for each run. The automated runner now also persists a stable `queryCaseId`, a human-readable `queryCaseLabel`, and structured profile metadata such as dataset, family, column count, and row count. All current presets target the single `yellow_taxi` dataset (NYC TLC Yellow Taxi Parquet files).

### Current measurements available in the client

The client-side stats panel currently measures:

| Metric | Status |
|--------|--------|
| Connection setup time | Available |
| Time to first byte | Available |
| Total query time | Available |
| Throughput (rows/sec, MB/sec) | Available |
| Cancellation latency | Available |
| Long tasks (>50 ms) | Available |
| Bytes received | Available |
| Rows received | Available |

These are the metrics implemented today. Additional metrics for the thesis study may be added later.

### Minimal automated experiment runner

The repository now includes a minimal benchmark harness for repeated browser-driven runs:

- Chromium automation via Playwright that drives the existing client UI
- Configurable transport/workload/repetition matrix execution
- Raw artifact persistence as NDJSON plus a per-session manifest under `results/<timestamp>/`
- A machine-readable `window.__bench` bridge sourced from the same `StatsCollector.snapshot()` payload that powers the stats panel

This is intentionally a thin automation layer around the real browser path, not a second benchmark implementation. It improves repeatability and result capture, but it does not yet orchestrate the environment, expand the thesis metrics set, or add server-side observability. See `docs/experiment-runner.md` for the concrete workflow and scope boundary.

### Research baseline

- Clear comparison target: WebTransport vs HTTP/2 Arrow vs HTTP/2 JSON
- Core thesis angle established: separate data plane and control plane in the browser
- Initial evaluation framing defined around latency, throughput, cancellation, and perceived interactivity
- Network emulation via Docker and `tc netem` with five named profiles: `lan`, `broadband`, `wan`, `mobile`, and `lossy`

## Current limitations and open risks

- WebTransport support is effectively Chromium-only for this prototype
- The automated runner is intentionally minimal; it still depends on the user to start the correct environment (`just dev` or `just bench-net <profile>` plus `just client`)
- Network emulation shapes server egress only; symmetric RTT modeling would require an IFB or router-sidecar topology
- Some thesis metrics are still target-study metrics rather than implemented instrumentation
- The experiment matrix is still narrow relative to the final thesis design; the current runner now automates a controlled taxi row-scaling suite plus the existing client metrics
- Raw result capture exists, but there is not yet a built-in analysis pipeline for statistical summaries, charts, or significance testing
- Backpressure and QUIC flow-control behavior under slower clients still need more systematic testing
- The JSON baseline is intentionally non-streaming, so it is useful for comparison but not feature-parity
- HTTP baselines currently run through the Vite proxy in the browser client; final thesis runs should verify or remove that proxy path so the measured protocol is unambiguous
- Some client-side metric names are still broader than their thesis definitions, especially throughput and cancellation latency
- Failed connection attempts can still produce misleading timing artifacts, so failed-run metric handling needs tightening before final analysis

## Planned work

The items below are the current roadmap. They describe the intended thesis-grade evaluation, not features that are already complete.

### 1. ~~Query workload suite~~ (partially done)

The client now has a structured taxi row-scaling matrix with explicit profile names plus an aggregation preset. See "Implemented > Query workload suite" above for details. Remaining work is tracked under items 7 and 8 below.

### 2. Server-side timing instrumentation

Add server-side timing, batch counts, and byte counters so client-side observations can be cross-checked against server execution behavior.

### 3. ~~Expanded network emulation profiles~~ (done)

Five named profiles are now available via `just bench-net <profile>`: `lan`, `broadband`, `wan`, `mobile`, and `lossy`. See README for the full parameter table.

### 4. ~~Automated experiment runner~~ (minimal v1 done)

A minimal runner now exists:

- it automates the browser client with Playwright
- executes configurable repeated runs across transports and workloads
- persists raw NDJSON records plus a manifest

Remaining work is about deepening this harness rather than creating it from scratch. That follow-up work is tracked under items 5, 7, 8, and 9 below.

### 5. Results analysis pipeline

A first session-level analysis pipeline now exists:

- each benchmark session now derives `runs.csv`, `summary.csv`, and `report.md` alongside the raw NDJSON and manifest
- the new outputs stay intentionally narrow: per-session only, human-readable, and sourced from the same browser-side metrics already shown in the client UI

Remaining work is about deepening that pipeline into richer thesis outputs:

- add percentiles, confidence intervals, and stronger statistical summaries
- generate charts suitable for the thesis results chapter
- support cross-session comparison once the experiment matrix grows

### 6. Protocol refinements

Explore stretch improvements such as richer query envelopes, multiple queries per WebTransport session, or richer control signaling.

### 7. Expand query workload suite

The current default automated suite is now better controlled, but it still targets a single dataset shape (NYC taxi trips). To strengthen the evaluation:

- Add queries with varying selectivity (high-selectivity filters vs full scans)
- Add queries that produce different column type mixes (timestamps, strings, nested types) to stress Arrow IPC encoding diversity
- Add a "tiny" workload (single row or schema-only) to isolate pure protocol overhead
- Consider a "cancellation" workload designed to be long-running so cancellation behavior can be studied under each transport

### 8. Add TPC-H dataset and workloads

Introduce TPC-H as a second, well-known analytical benchmark dataset to complement NYC taxi:

- Use DataFusion's built-in TPC-H data generator (`datafusion-benchmarks` or `tpch` crate) or pre-generate Parquet files at a chosen scale factor (SF1 or SF10)
- Register TPC-H tables in the shared query context alongside `yellow_taxi`
- Add a subset of TPC-H queries (e.g. Q1, Q6, Q12, Q14) as preset workloads — chosen to cover different result sizes, join depths, and aggregation patterns
- This provides a standardized, reproducible baseline that reviewers and readers will recognize

### 9. Deepen the experiment harness

The minimal runner solves repeatability and raw artifact capture, but several follow-ups remain to make it thesis-grade:

- Record actual browser transport/protocol metadata for HTTP baselines, not only the selected UI transport id
- Add guardrails for failed runs so invalid timings are null or excluded from median summaries
- Define and implement the final metrics set for the study, including any missing browser-side metrics such as time to first decoded batch, and make the raw output schema explicit and stable
- Expand the experiment matrix beyond the current presets: more workload shapes, more selectivity variation, cancellation-focused runs, and eventually broader dataset coverage
- Add server-side observability and statistics so browser-observed timings can be cross-checked against execution, encoding, and transport behavior
- Add environment metadata and guardrails so runs record more of the experimental context (browser version, git SHA, startup mode, network profile, and eventually machine/environment notes)
- Add analysis helpers that turn raw NDJSON into summary tables, percentiles, and plots without making the runner itself responsible for interpretation
- Consider thin orchestration around startup and teardown once the measurement model is stable, but keep that secondary to measurement quality

### 10. Verify HTTP baseline path

Resolve the Vite proxy measurement ambiguity before final thesis runs:

- either make the browser client call the Rust HTTP/2 servers directly, or explicitly verify and record the actual negotiated protocol for proxied HTTP baseline requests
- document the chosen path so HTTP/2 Arrow and HTTP/2 JSON results are not confused with development-proxy behavior

### 11. Implementation review follow-ups

Recent code review highlighted a few concise improvement candidates:

- Make HTTP Arrow stream errors explicit instead of only logging them from the spawned streaming task
- Split end-to-end throughput from transfer-window throughput so execution/rendering cost is not confused with network delivery
- Add time to first decoded batch and time to first rendered row for the progressive-rendering claim
- Capture server-side cancellation milestones: cancel observed, stream stopped, and final bytes sent
- Prefer success-only statistical summaries, with failed and cancelled runs reported separately

## Technical log

### 2026-04-13

- Implemented a minimal automated experiment runner for the browser client.
  - Added a machine-readable `window.__bench` bridge in the client so automation can read final run state and the exact `StatsCollector.snapshot()` payload without scraping formatted DOM text.
  - Added a Playwright-based runner script in `src/client` that drives Chromium against the existing UI, executes configurable transport/workload/repetition matrices, and writes raw NDJSON plus a manifest under `results/<timestamp>/`.
  - Added documentation for the runner workflow and its v1 boundary: startup remains an external prerequisite, while server-side instrumentation and analysis stay as follow-up work.
- Refreshed the taxi benchmark profiles to use explicit row-scaling names instead of vague size labels.
  - Replaced the old `small`/`medium`/`large`/`wide` presets with two controlled profile families: 10-column narrow scans and full-schema wide scans.
  - Added structured query profile metadata to persisted benchmark artifacts so `runs.csv`, `summary.csv`, and `report.md` can stay readable while remaining machine-friendly for later thesis analysis.
  - Split the benchmark examples into a small smoke config and a full taxi scaling matrix config.
- Updated project status to reflect that automation now exists in minimal form. The remaining benchmark work is now primarily about metric definition, experiment-matrix expansion, server-side observability, and downstream analysis.

### 2026-03-31

- Replaced the WebTransport streaming pipeline in `session.rs`: removed the mpsc channel, spawned encoding task, and `try_recv` coalescing loop; replaced with a direct inline encode-write loop using `tokio::select!` for cancel-responsive writes. This eliminates redundant memcpy during coalescing, bursty write patterns, silent error swallowing from the fire-and-forget task, and cancel latency during flow-control stalls. The QUIC window tuning (8 MB send/stream, 16 MB connection) is preserved. See `docs/observations/2026-02-20-http2-arrow-faster-throughput.md` Update 4 for the full rationale.
- Updated project tracker to reflect partial completion of the query workload suite at the time: five preset workloads (small, medium, large, wide, aggregation) were implemented in the client with a UI picker and stats tracking.
- Added planned work items for expanding the workload suite (selectivity variations, type diversity, protocol-overhead isolation) and for introducing TPC-H as a second benchmark dataset.

### 2026-03-28

- Overhauled TLS certificate generation to fix WebTransport handshake failures.
  - Set explicit 14-day validity on generated certificates (WebTransport spec maximum); rcgen previously defaulted to multi-thousand-year validity which Chrome rejects.
  - Moved cert generation to a dedicated `gen-certs` binary run as a `just` dependency before any server starts, eliminating race conditions from parallel server startup.
  - Certificate hash (`cert-hash.json`) is now written atomically alongside PEM files during generation in `src/server-core`, removing the WebTransport server's responsibility for hash computation.
  - Added `gen-certs` init container in Docker Compose so containerized servers also avoid races.
  - Client now clears cached certificate hash on connection failure so retries pick up refreshed certs.
- Expanded network emulation from one profile (`lan`) to five: `lan`, `broadband`, `wan`, `mobile`, and `lossy`.
- Each profile maps to a single `tc netem` parameter string passed via `NETEM_PARAMS`.
- Added `just bench-net-list` helper recipe for quick reference.
- Documented the egress-only shaping caveat as a known methodological limitation.

### 2026-03-27

- Reframed the documentation so this file tracks project status instead of acting as a full architecture specification.
- Locked in the main research comparison: WebTransport, HTTP/2 Arrow, and HTTP/2 JSON through one shared client.
- Clarified a key status boundary across the docs: only the `lan` network-emulation profile is treated as implemented today; broader profile coverage remains planned work.

### Current working assumptions

- WebTransport is primarily interesting here for interactivity, control signaling, and behavior under impaired networks, not for maximum raw throughput.
- Arrow IPC is the preferred streaming format because it preserves a direct batch-oriented path from DataFusion to the browser.
- The final thesis evaluation should clearly distinguish prototype capabilities already implemented from the broader experimental design still being built.
