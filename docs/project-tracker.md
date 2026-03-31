# Project Tracker

This file is the living status document for the prototype and thesis work. It tracks what exists today, what still needs to be built, and the technical observations that shape the next steps.

## Current state

The repository currently contains a working prototype for comparing three browser-facing transport paths for analytical query results:

- `src/servers/webtransport/`: WebTransport over QUIC with Arrow IPC streaming and datagrams for progress and cancel
- `src/servers/http2-arrow/`: HTTP/2 streaming response with Arrow IPC
- `src/servers/http2-json/`: HTTP/2 JSON baseline with full result materialization
- `src/server-core/`: shared query execution, Arrow encoding, and certificate support
- `src/client/`: one browser client with a transport picker and shared rendering/stats pipeline

The prototype is already suitable for manual comparison runs in Chrome. It is not yet a full experiment harness.

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

Five preset analytical workloads are defined in `src/client/src/workloads.ts` and selectable via a dropdown in the client UI:

| Workload | Rows | Intent |
|----------|------|--------|
| Small | 500 | 6 columns, latency-dominated |
| Medium | 50k | 8 columns, filtered by trip distance |
| Large | 500k | 5 columns, throughput-dominated |
| Wide schema | 50k | `SELECT *`, full schema width |
| Aggregation | varies | `GROUP BY` with counts/avgs/sums |

Custom SQL is also supported via a free-text input. The stats panel tracks `workloadId` and `transportId` for each run. All queries currently target the single `yellow_taxi` dataset (NYC TLC Yellow Taxi Parquet files).

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

### Research baseline

- Clear comparison target: WebTransport vs HTTP/2 Arrow vs HTTP/2 JSON
- Core thesis angle established: separate data plane and control plane in the browser
- Initial evaluation framing defined around latency, throughput, cancellation, and perceived interactivity
- Network emulation via Docker and `tc netem` with five named profiles: `lan`, `broadband`, `wan`, `mobile`, and `lossy`

## Current limitations and open risks

- WebTransport support is effectively Chromium-only for this prototype
- The benchmark workflow is still mostly manual; there is no automated experiment runner yet
- Network emulation shapes server egress only; symmetric RTT modeling would require an IFB or router-sidecar topology
- Some thesis metrics are still target-study metrics rather than implemented instrumentation
- Backpressure and QUIC flow-control behavior under slower clients still need more systematic testing
- The JSON baseline is intentionally non-streaming, so it is useful for comparison but not feature-parity

## Planned work

The items below are the current roadmap. They describe the intended thesis-grade evaluation, not features that are already complete.

### 1. ~~Query workload suite~~ (partially done)

Five preset workloads are implemented in the client with a UI picker. See "Implemented > Query workload suite" above for details. Remaining work is tracked under items 7 and 8 below.

### 2. Server-side timing instrumentation

Add server-side timing, batch counts, and byte counters so client-side observations can be cross-checked against server execution behavior.

### 3. ~~Expanded network emulation profiles~~ (done)

Five named profiles are now available via `just bench-net <profile>`: `lan`, `broadband`, `wan`, `mobile`, and `lossy`. See README for the full parameter table.

### 4. Automated experiment runner

Create a repeatable benchmark harness that drives the client automatically, executes the full experiment matrix, and writes results to machine-readable output.

### 5. Results analysis pipeline

Turn raw benchmark output into thesis-ready tables, charts, and statistical summaries.

### 6. Protocol refinements

Explore stretch improvements such as richer query envelopes, multiple queries per WebTransport session, or richer control signaling.

### 7. Expand query workload suite

The current five presets all target a single dataset shape (NYC taxi trips). To strengthen the evaluation:

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

## Technical log

### 2026-03-31

- Replaced the WebTransport streaming pipeline in `session.rs`: removed the mpsc channel, spawned encoding task, and `try_recv` coalescing loop; replaced with a direct inline encode-write loop using `tokio::select!` for cancel-responsive writes. This eliminates redundant memcpy during coalescing, bursty write patterns, silent error swallowing from the fire-and-forget task, and cancel latency during flow-control stalls. The QUIC window tuning (8 MB send/stream, 16 MB connection) is preserved. See `docs/observations/2026-02-20-http2-arrow-faster-throughput.md` Update 4 for the full rationale.
- Updated project tracker to reflect partial completion of the query workload suite: five preset workloads (small, medium, large, wide, aggregation) are implemented in the client with a UI picker and stats tracking.
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
