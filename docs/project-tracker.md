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
- Local TLS certificate generation for development

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
- Network emulation path exists through Docker-based setup, currently documented for the `lan` profile

## Current limitations and open risks

- WebTransport support is effectively Chromium-only for this prototype
- The benchmark workflow is still mostly manual; there is no automated experiment runner yet
- Only the `lan` network profile is documented as available today in the repo workflow
- Some thesis metrics are still target-study metrics rather than implemented instrumentation
- Backpressure and QUIC flow-control behavior under slower clients still need more systematic testing
- The JSON baseline is intentionally non-streaming, so it is useful for comparison but not feature-parity

## Planned work

The items below are the current roadmap. They describe the intended thesis-grade evaluation, not features that are already complete.

### 1. Query workload suite

Define a shared set of analytical queries that vary by result size and schema shape, then expose them both in the benchmark workflow and in the client UI.

### 2. Server-side timing instrumentation

Add server-side timing, batch counts, and byte counters so client-side observations can be cross-checked against server execution behavior.

### 3. Expanded network emulation profiles

Extend network shaping beyond `lan` to a stable set of named profiles such as broadband, WAN, mobile, and lossy links.

### 4. Automated experiment runner

Create a repeatable benchmark harness that drives the client automatically, executes the full experiment matrix, and writes results to machine-readable output.

### 5. Results analysis pipeline

Turn raw benchmark output into thesis-ready tables, charts, and statistical summaries.

### 6. Protocol refinements

Explore stretch improvements such as richer query envelopes, multiple queries per WebTransport session, or richer control signaling.

## Technical log

### 2026-03-27

- Reframed the documentation so this file tracks project status instead of acting as a full architecture specification.
- Locked in the main research comparison: WebTransport, HTTP/2 Arrow, and HTTP/2 JSON through one shared client.
- Clarified a key status boundary across the docs: only the `lan` network-emulation profile is treated as implemented today; broader profile coverage remains planned work.

### Current working assumptions

- WebTransport is primarily interesting here for interactivity, control signaling, and behavior under impaired networks, not for maximum raw throughput.
- Arrow IPC is the preferred streaming format because it preserves a direct batch-oriented path from DataFusion to the browser.
- The final thesis evaluation should clearly distinguish prototype capabilities already implemented from the broader experimental design still being built.
