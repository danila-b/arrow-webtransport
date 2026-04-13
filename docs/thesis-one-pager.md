# Thesis One-Pager

This document is the short thesis summary. It describes the intended study and overall prototype direction; implementation status is tracked separately in `docs/project-tracker.md`.

## Title

**Browser-Native Analytics Streaming: Performance Evaluation of WebTransport and HTTP/2 for Columnar Data Delivery Under Varying Network Conditions**

## Abstract

Modern web applications increasingly need interactive access to analytical data directly in the browser. The usual approach is still JSON over HTTP, which is simple but expensive to serialize, expensive to parse, and poorly suited to progressive rendering. Apache Arrow IPC offers a binary columnar alternative, while WebTransport (built on QUIC/HTTP/3) gives browser applications access to multiplexed streams and unreliable datagrams.

This thesis designs and implements a prototype system that delivers analytical query results from a Rust-based query engine (DataFusion) to a browser client over three transport paths: WebTransport with Arrow IPC, HTTP/2 with Arrow IPC, and HTTP/2 with JSON. The prototype serves as the basis for a controlled performance study across multiple query workloads and network conditions, with a focus on latency, throughput, cancellation behavior, and perceived interactivity. The main question is whether WebTransport offers measurable benefits over HTTP/2 for browser-facing analytical workloads, and under which conditions those benefits actually appear.

## Current prototype snapshot

The current prototype already includes:

- a shared Rust query core
- three comparable transport paths
- one browser client with a transport picker
- incremental rendering for Arrow-based responses
- client-side metrics for connection setup, time to first byte, total query time, throughput, cancellation latency, long tasks, bytes, and rows

The final thesis evaluation is broader than the current implementation baseline. In particular, expanded network profiles and some additional measurements remain planned work.

## Scope

The thesis covers the following:

1. **System design and implementation** — a working prototype with three comparable transport paths (WebTransport, HTTP/2 Arrow, HTTP/2 JSON) sharing a common query engine, and a unified browser client that can switch between them under identical conditions.

2. **Transport-level comparison** — benchmarking of the three paths using analytical SQL queries that vary in result-set size and schema shape.

3. **Network condition analysis** — evaluation under emulated network conditions representing low-latency LAN, typical broadband, higher-latency WAN, constrained mobile links, and packet-loss scenarios.

4. **Control plane evaluation** — comparison of WebTransport's datagram-based progress/cancellation signaling against HTTP/2's in-band alternatives (AbortController, side-channel requests).

**Out of scope:** production-grade security (auth, RBAC), cross-browser compatibility (Chrome is the target), distributed query execution, and full Arrow Flight/FlightSQL protocol compliance. These are discussed as future work.

## What We Measure

### Primary metrics

| Metric | Definition | How measured |
|--------|-----------|--------------|
| **Connection setup time** | Time from initiating connection to ready state | Client-side timestamps (includes TLS/QUIC handshake) |
| **Time to first byte (TTFB)** | Time from query submission to first data byte received | Client-side, marks arrival of first stream chunk |
| **Time to first batch (TTFB-D)** | Time from query submission to first decoded Arrow RecordBatch | Client-side, marks first yielded batch from decoder |
| **Total query time** | Time from query submission to last byte received | Client-side, end-to-end |
| **Throughput** | Rows/sec and MB/sec sustained during data transfer | Derived from total rows, total bytes, and transfer duration |
| **Cancellation latency** | Time from cancel request to server stopping data transmission | Client-side, from cancel click to last received byte |

### Secondary metrics

| Metric | Definition |
|--------|-----------|
| **Client CPU time** | Time spent decoding Arrow IPC vs parsing JSON |
| **Long tasks** | Number and duration of main-thread tasks > 50 ms |
| **Memory pressure** | Peak memory usage during streaming decode |

Some of the primary metrics are already visible in the prototype today. The full set above describes the target evaluation design for the thesis.

### Experiment matrix

The evaluation crosses three dimensions:

- **3 transports**: WebTransport, HTTP/2 Arrow, HTTP/2 JSON
- **8 default automated query profiles**: taxi 8-column profiles at `100k`, `200k`, `400k`, and `800k` rows, plus full-schema taxi profiles at `50k`, `100k`, `200k`, and `400k` rows
- **5 target network profiles**: LAN, broadband, WAN, mobile, and lossy links

Each configuration is repeated 20+ times for statistical significance. Results are reported with medians, percentiles, and confidence intervals.

Aggregation and custom SQL workloads remain useful for exploratory/manual runs, but the default automated matrix now emphasizes controlled row-scaling so transport comparisons are easier to interpret.

### Research expectations

1. **Arrow IPC vs JSON**: Arrow transports (both WebTransport and HTTP/2) are expected to significantly outperform JSON in throughput and client CPU usage, since Arrow avoids serialization/deserialization overhead and transfers a compact binary format. The gap should widen with larger result sets.

2. **WebTransport vs HTTP/2 Arrow throughput**: WebTransport is not expected to win on raw throughput. Its likely advantages are earlier feedback, cleaner control signaling, and better behavior when the network is impaired.

3. **WebTransport vs HTTP/2 Arrow under good conditions**: On LAN and broadband, the two Arrow transports may perform similarly enough that the main difference is user experience rather than total transfer time.

4. **WebTransport advantage under degraded conditions**: Under packet loss, WebTransport should show better tail latency and more stable interactive behavior because QUIC avoids TCP-style head-of-line blocking across the whole connection. This is the central transport hypothesis.

5. **Cancellation latency**: WebTransport's datagram-based cancel should produce lower and more consistent cancellation latency than HTTP/2's fetch cancellation path.

6. **Progressive rendering**: WebTransport and HTTP/2 Arrow should both enable early partial rendering (time to first batch well before total completion), while JSON requires full materialization, delaying any rendering to the end.
