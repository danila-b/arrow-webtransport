# Project Tracker

This file is the living status document for the prototype and thesis work. It tracks what exists today, what still needs to be built, and the technical observations that shape the next steps.

## Current state

The repository currently contains a working prototype for comparing three browser-facing transport paths for analytical query results:

- `servers/webtransport/`: WebTransport over QUIC with Arrow IPC streaming and datagrams for progress and cancel
- `servers/http2-arrow/`: HTTP/2 streaming response with Arrow IPC
- `servers/http2-json/`: HTTP/2 JSON baseline with full result materialization
- `server-core/`: shared query execution, Arrow encoding, and certificate support
- `client/`: one browser client with a transport picker and shared rendering/stats pipeline

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

### 1. Query workload suite

Define a shared set of analytical queries that vary by result size and schema shape, then expose them both in the benchmark workflow and in the client UI.

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

## Technical log

### 2026-03-28

- Overhauled TLS certificate generation to fix WebTransport handshake failures.
  - Set explicit 14-day validity on generated certificates (WebTransport spec maximum); rcgen previously defaulted to multi-thousand-year validity which Chrome rejects.
  - Moved cert generation to a dedicated `gen-certs` binary run as a `just` dependency before any server starts, eliminating race conditions from parallel server startup.
  - Certificate hash (`cert-hash.json`) is now written atomically alongside PEM files during generation in `server-core`, removing the WebTransport server's responsibility for hash computation.
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
