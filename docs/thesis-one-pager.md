# Thesis One-Pager

## Title

**Browser-Native Analytics Streaming: Performance Evaluation of WebTransport and HTTP/2 for Columnar Data Delivery Under Varying Network Conditions**

## Abstract

Modern web applications increasingly demand real-time, interactive access to analytical data directly in the browser. Traditionally, this is achieved by serializing query results as JSON over HTTP — an approach that suffers from high serialization overhead and limited streaming capability. Apache Arrow IPC offers an efficient columnar binary alternative, and WebTransport (built on QUIC/HTTP/3) introduces multiplexed streams and unreliable datagrams to the browser for the first time.

This thesis designs and implements a prototype system that streams Apache Arrow IPC record batches from a Rust-based query engine (DataFusion) to a browser client over three transport paths: WebTransport, HTTP/2 with Arrow IPC, and HTTP/2 with JSON. Using this prototype, we conduct a systematic performance evaluation comparing the transports across multiple query workloads and network conditions — including varying latency, bandwidth, and packet loss — measuring latency, throughput, and user-perceived interactivity. The goal is to determine whether WebTransport provides measurable benefits over HTTP/2 for data-intensive browser applications, and under which network conditions those benefits are most pronounced.

## Scope

The thesis covers the following:

1. **System design and implementation** — a working prototype with three comparable transport paths (WebTransport, HTTP/2 Arrow, HTTP/2 JSON) sharing a common query engine, and a unified browser client that can switch between them under identical conditions.

2. **Transport-level comparison** — systematic benchmarking of the three paths using a suite of analytical SQL queries varying in result set size (hundreds to millions of rows) and shape (narrow vs wide schemas).

3. **Network condition analysis** — evaluation under emulated network profiles representing real-world scenarios: low-latency LAN, typical broadband, high-latency WAN, constrained mobile (3G/4G), and lossy links with 1–5% packet loss.

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
| **Client CPU time** | Time spent decoding Arrow IPC vs parsing JSON (via `performance.measure()`) |
| **Long tasks** | Number and duration of main-thread tasks > 50 ms (via PerformanceObserver) |
| **Memory pressure** | Peak memory usage during streaming decode |

### Experiment matrix

The evaluation crosses three dimensions:

- **3 transports**: WebTransport, HTTP/2 Arrow, HTTP/2 JSON
- **5 query workloads**: ~100 rows, ~10K rows, ~100K rows, ~1M rows, wide schema (many columns)
- **5 network profiles TBD** examples: LAN (1 ms RTT), broadband (20 ms RTT, 50 Mbps), WAN (100 ms RTT, 10 Mbps), mobile (80 ms RTT, 5 Mbps, 1% loss), lossy (50 ms RTT, 5% loss)

Each configuration is repeated 20+ times for statistical significance. Results are reported with medians, percentiles, and confidence intervals.

### Expected results

1. **Arrow IPC vs JSON**: Arrow transports (both WebTransport and HTTP/2) are expected to significantly outperform JSON in throughput and client CPU usage, since Arrow avoids serialization/deserialization overhead and transfers a compact binary format. The gap should widen with larger result sets.

2. **WebTransport vs HTTP/2 Arrow throughput**: WebTransport is experimental and largely in user-space, without any hardware optimizations, so we expect it to perform worse than HTTP/2 Arrow in sheer throughput. However, WebTransport time to first batch and byte should be significantly better than HTTP/2 Arrow, since it can start sending data immediately after the handshake is complete and achieve real stream-like behavior.

3. **WebTransport vs HTTP/2 Arrow under good conditions**: On LAN and broadband, we expect the two Arrow transports to perform similarly. QUIC's 0-RTT handshake may yield a small connection setup advantage, but steady-state throughput should be comparable since the bottleneck is query execution, not transport.

4. **WebTransport advantage under degraded conditions**: Under packet loss (1–5%), WebTransport should show better tail latency and more consistent TTFB, because QUIC recovers from loss at the stream level without blocking the entire connection (no TCP head-of-line blocking). This is the core hypothesis.

5. **Cancellation latency**: WebTransport's datagram-based cancel should achieve lower and more consistent cancellation latency than HTTP/2's AbortController, since datagrams bypass stream flow control and are delivered immediately.

6. **Progressive rendering**: WebTransport and HTTP/2 Arrow should both enable early partial rendering (time to first batch well before total completion), while JSON requires full materialization, delaying any rendering to the end.
