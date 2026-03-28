# Thesis Research: Browser-Native Analytics Streaming via Arrow IPC and WebTransport

This document is the research-oriented thesis outline. It explains the problem, the research questions, the planned methodology, and the expected contribution. Day-to-day implementation status lives in `docs/project-tracker.md`.

---

## 1. Working title

*Browser-Native Analytics Streaming: Performance Evaluation of WebTransport and HTTP/2 for Columnar Data Delivery Under Varying Network Conditions*

## 2. Research motivation

Modern analytical systems increasingly end in the browser. People run SQL in web-based editors, inspect logs and traces in browser dashboards, and expect large datasets to feel interactive even on imperfect networks. Yet the last hop to the browser is often still handled in a very traditional way: execute the query, materialize the result, serialize it as JSON, send it as one HTTP response, then wait for the browser to parse everything before the UI becomes useful.

That pattern works, but it comes with obvious costs:

- JSON serialization and parsing are expensive for large analytical result sets
- the browser gets little value until a large response is mostly complete
- HTTP request-response is awkward for progress updates and fine-grained cancellation

This thesis asks whether a browser can be treated more like a serious analytical client: one that receives structured data incrementally, can react to partial results, and can communicate control signals without relying on clumsy side channels.

---

## 3. Problem statement

The core problem is not just how to move bytes faster. It is how to deliver analytical results to the browser in a way that preserves structure, enables progressive rendering, and remains responsive under real network conditions.

The thesis investigates a prototype with three comparable transport paths:

- **WebTransport + Arrow IPC**
- **HTTP/2 + Arrow IPC**
- **HTTP/2 + JSON**

The comparison is designed to separate two questions that are often mixed together:

1. What changes when JSON is replaced with Arrow IPC?
2. What changes when HTTP/2 is replaced with WebTransport and QUIC?

That separation matters. Arrow may reduce encoding and decoding overhead, while WebTransport may improve interactivity and control signaling. The thesis should make it clear which benefits come from the data format and which come from the transport.

---

## 4. Research questions

### Primary research question

Can WebTransport improve the latency and interactivity of browser-facing analytical data delivery compared with HTTP/2, when query results are streamed as Apache Arrow IPC record batches?

### Supporting questions

1. How much of the observed gain comes from Arrow IPC itself, compared with a JSON baseline?
2. Under what network conditions do WebTransport and QUIC show an advantage over HTTP/2?
3. Does a separate control plane for progress and cancellation meaningfully improve the user experience?
4. What trade-offs appear between interactivity, throughput, implementation complexity, and protocol behavior?

---

## 5. Working hypotheses

1. **Arrow IPC vs JSON**  
Arrow-based delivery will reduce serialization overhead, reduce client parsing cost, and enable earlier rendering than JSON.

2. **WebTransport vs HTTP/2 under healthy networks**  
When the network is good, WebTransport may not outperform HTTP/2 in raw throughput. Any benefit is more likely to appear in connection behavior, responsiveness, or control signaling.

3. **WebTransport vs HTTP/2 under impaired networks**  
Under packet loss or higher latency, WebTransport should show better interactive behavior because QUIC avoids TCP-style head-of-line blocking across the entire connection.

4. **Datagram-based control plane**  
Progress updates and cancellation should feel more immediate when they travel separately from the main data stream.

---

## 6. Why Arrow IPC

Apache Arrow is central to this thesis because it fits the shape of analytical data well.

- It is columnar, which matches how analytical engines already store and process data.
- Its IPC stream format is self-describing and batch-oriented, so it can be decoded incrementally.
- It avoids much of the conversion work required by text-based formats such as JSON.
- It aligns naturally with DataFusion, which already works in Arrow-native batches.

In practical terms, Arrow IPC makes it possible to stream a schema followed by record batches and let the browser start rendering before the full query result is available. That is exactly the behavior the thesis wants to evaluate.

Arrow Flight and FlightSQL are relevant related systems, but they are built around gRPC and are not directly browser-native. This thesis therefore focuses on a direct browser path instead of a browser-to-proxy compromise.

---

## 7. Why WebTransport

WebTransport is interesting here not because it is automatically faster, but because it exposes transport features that map well to an interactive analytics workflow.

### 7.1 Multiplexed QUIC streams

HTTP/2 multiplexes logical streams over a single TCP connection, but TCP loss recovery still affects the whole connection. QUIC moves reliability into userspace and handles loss in a stream-aware way. For this project, that means one delayed packet should not necessarily freeze unrelated application activity in the same way.

### 7.2 Datagram support

WebTransport exposes QUIC datagrams, which are small, unordered, and unreliable. That makes them suitable for low-cost control messages where freshness matters more than guaranteed delivery. A stale progress update is not harmful; the next one replaces it. Cancellation messages also benefit from a path that does not compete directly with the bulk data stream.

### 7.3 Connection behavior

QUIC combines transport and security setup more tightly than TCP + TLS. The thesis should consider whether that helps browser-facing analytical requests, especially when users repeatedly submit short interactive queries over higher-latency links.

### 7.4 Important boundary

The thesis should not assume that WebTransport wins on peak throughput. In this project, the more realistic claim is narrower: WebTransport may improve responsiveness, progress signaling, and behavior under impairment, even if HTTP/2 remains stronger for raw bulk transfer.

---

## 8. Communication engineering angle

This topic sits naturally within communication engineering because it connects transport-layer behavior to application-visible outcomes.

The independent variables in the study are network and protocol properties:

- latency
- bandwidth limits
- packet loss
- transport choice
- data/control separation strategy

The dependent variables are user-visible metrics:

- time to first byte
- time to first decoded batch
- total completion time
- throughput
- cancellation latency
- responsiveness under loss

The central communication-engineering claim is straightforward: transport design choices such as stream multiplexing, loss recovery behavior, and control/data separation should produce measurable application-level effects. The thesis uses a browser analytics workload as the test case for that claim.

---

## 9. Methodology

### 9.1 Prototype

The thesis is grounded in a working prototype implemented in this repository:

- Rust + DataFusion on the server
- Apache Arrow IPC for streaming result batches
- three transport paths with a shared query core
- one browser client for controlled comparison

The current implementation baseline already supports manual comparison runs. The full thesis evaluation will extend that baseline with broader instrumentation and a more automated experiment workflow.

### 9.2 Experimental design

The intended study compares:

- **3 transports**: WebTransport, HTTP/2 Arrow, HTTP/2 JSON
- **multiple query workloads**: varying result size and schema shape
- **multiple network profiles**: from low-latency LAN to higher-latency and lossy links

The final evaluation should use repeated runs per configuration so that medians, percentiles, and variability can be reported rather than single anecdotal measurements.

### 9.3 Metrics

The key metrics are:

- connection setup time
- time to first byte
- time to first decoded batch
- total query time
- throughput in rows/sec and MB/sec
- cancellation latency
- client long tasks
- client CPU and memory costs where practical

Some of these are already present in the prototype. Others belong to the planned thesis-grade instrumentation and should be presented as such.

### 9.4 Network emulation

Controlled impairment is an important part of the methodology. The repository uses `tc netem` inside Docker containers to shape server-egress traffic under five named profiles:

| Profile | `tc netem` parameters | Models |
|---------|-----------------------|--------|
| `lan` | `delay 0.5ms` | Near-zero-latency local network |
| `broadband` | `delay 10ms rate 100mbit` | Healthy fixed-access link |
| `wan` | `delay 40ms rate 30mbit` | Cross-region or backbone path |
| `mobile` | `delay 80ms 20ms distribution normal rate 10mbit loss 0.5%` | Constrained mobile link with jitter and mild loss |
| `lossy` | `delay 40ms rate 30mbit loss 2%` | Moderate-latency link with significant packet loss |

The profiles intentionally separate impairment dimensions (latency, bandwidth, jitter, loss) so that each transport-level effect can be attributed more clearly. Shaping is currently applied on server egress only; symmetric RTT modeling would require an IFB or router-sidecar topology.

---

## 10. Proposed thesis structure

### Chapter 1. Introduction

Introduce the browser analytics delivery problem, the limitations of JSON-over-HTTP, and the motivation for comparing Arrow IPC and WebTransport.

### Chapter 2. Background

Cover the required concepts:

- browser-based analytics workflows
- Apache Arrow and Arrow IPC
- HTTP/2, QUIC, and WebTransport
- progressive rendering and cancellation in web clients

### Chapter 3. System design and implementation

Describe the prototype architecture, transport paths, unified client, and the separation of data plane and control plane.

### Chapter 4. Experimental methodology

Define workloads, metrics, network profiles, benchmark procedure, and threats to validity.

### Chapter 5. Results

Present the measured results for latency, throughput, cancellation, and responsiveness across transport and network conditions.

### Chapter 6. Discussion

Interpret the results carefully:

- where Arrow clearly helps
- where WebTransport helps and where it does not
- what the results mean for browser-facing data systems
- what the results imply for transport and protocol design

### Chapter 7. Conclusion and future work

Summarize findings and outline next steps such as richer protocol envelopes, automated benchmarking, or broader browser support.

---

## 11. Expected contributions

This thesis should contribute four things:

1. A browser-native prototype for comparing JSON, Arrow IPC over HTTP/2, and Arrow IPC over WebTransport.
2. An empirical evaluation of transport behavior for browser-facing analytical workloads under controlled conditions.
3. A clearer picture of where WebTransport helps in practice, especially for responsiveness and impaired networks.
4. A reusable reference point for others exploring browser-native analytical data delivery.

---

## 12. Practical relevance

Although this is a research project, the outcome should still be useful to practitioners. The most likely audience is people building browser-based analytics, observability interfaces, SQL workbenches, or any web client that needs to handle large structured results without waiting for a fully materialized JSON response.

The practical value is not in claiming that every system should switch to WebTransport. The more useful result is a set of clearer boundaries:

- when JSON is clearly the wrong fit
- when Arrow IPC provides immediate value regardless of transport
- when WebTransport is worth the added complexity
- when HTTP/2 remains the simpler and more sensible choice

---

## 13. Related work directions

The literature review should draw from several neighboring areas:

- WebTransport and QUIC evaluations, especially under controlled network impairment
- browser-side streaming and progressive rendering techniques
- Apache Arrow and columnar data interchange
- browser-native analytics systems such as DuckDB-WASM
- comparisons with adjacent alternatives such as WebSockets, SSE, gRPC-Web, and Arrow Flight

The main gap this thesis targets is the combination of these ideas in one setting: direct browser delivery of analytical results using a columnar stream, compared across modern web transports.

---

## 14. Risks and scope boundaries

- Chrome or Chromium remains the practical target for WebTransport work in this prototype.
- Peak throughput may continue to favor HTTP/2, especially on localhost or well-provisioned links.
- Some thesis-grade metrics and automation are still planned rather than fully implemented.
- The work evaluates a prototype, not a production-ready secure analytics platform.

These are acceptable boundaries as long as they are stated clearly and kept separate from the main claims.

---

*Last updated: 2026-03-27*
