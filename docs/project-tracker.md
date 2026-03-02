# Architecture: Browser-Native Analytics Streaming (Arrow + WebTransport)

## 1. Purpose and context

This project explores **browser-native, high-performance analytics streaming** by combining:

- **Apache Arrow** as the on-the-wire columnar format (Arrow IPC stream)
- **WebTransport over HTTP/3 (QUIC)** as the transport for low-latency, multiplexed streaming
- **Rust + DataFusion** as the query execution engine and server implementation
- A **Chrome** client written in JS/TS that decodes Arrow batches incrementally for interactive UX

The thesis question is: *can a browser receive analytical query results as a stream of Arrow record batches with better latency and interactivity than "traditional web" approaches (HTTP fetch / WebSocket), and how do QUIC streams + datagrams change the UX model?*

This repo contains **three comparable transport paths**, served by separate server binaries sharing a common core, and a **single unified client** that can switch between them:

- **WebTransport** (`servers/webtransport/`, port 4433) — Arrow IPC over QUIC bidirectional streams + datagrams for progress/cancel
- **HTTP/2 Arrow** (`servers/http2-arrow/`, port 3000) — Arrow IPC streaming over HTTP POST, cancel via `AbortController`
- **HTTP/2 JSON** (`servers/http2-json/`, port 3001) — traditional JSON-over-HTTP baseline (DataFusion → JSON serialization)

Shared query execution and Arrow encoding live in `server-core/`. The unified client (`client/`) uses a transport picker UI so all three paths can be compared in the same environment.

The code is designed to stay simple enough for an MVP, but structured so it can grow into a thesis-quality prototype with clear evaluation hooks.

---

## 2. Non-goals (for the thesis prototype)

To keep scope sane, we do **not** aim for:

- Full Apache Arrow Flight / FlightSQL compatibility
- Production auth, RBAC, row-level security (these may appear as "future work")
- A general-purpose distributed query system
- Perfect cross-browser support (Chrome is the target for WebTransport)

---

## 3. High-level system overview

### Components

**Server (Rust)**
- Accepts a query request (SQL as UTF-8 text)
- Executes query in DataFusion
- Streams results as **Arrow IPC stream** bytes (WebTransport and HTTP/2 Arrow) or collects and returns JSON (HTTP/2 JSON)
- Sends control signals (progress, cancellation acknowledgment) out-of-band via datagrams (WebTransport only)

**Client (Chrome, JS/TS)**
- Sends query
- Receives Arrow IPC stream and **decodes record batches incrementally** (or parses JSON for the baseline)
- Renders partial results early and updates as more batches arrive
- Handles progress updates (WebTransport) and cancellation (all transports)

### Data plane vs control plane

We treat the system as two lanes:

- **Data plane (reliable, ordered):** Arrow IPC stream carrying schema + record batches
- **Control plane (low-latency, best-effort):** progress + cancellation messages

This separation is a key thesis angle. With HTTP/2 there is no true out-of-band control channel — cancellation uses `AbortController` and progress is unavailable. With WebTransport, datagrams provide an explicit second lane.

---

## 4. Runtime architecture

### 4.1 HTTP/2 Arrow (http2-arrow, port 3000)

**Intent:** represent streaming Arrow IPC over standard HTTP/2 — the best you can do today without WebTransport.

**Flow**
1. Client sends `POST /query` with `{ "sql": "..." }`
2. Server executes query in DataFusion via `execute_stream()`
3. Server returns `200` with a streaming response body (`application/vnd.apache.arrow.stream`), sending Arrow IPC chunks as batches are produced via an `mpsc` channel
4. Client consumes `ReadableStream` chunks and feeds them into Arrow JS `RecordBatchReader`
5. Client renders batches incrementally as they arrive

**Cancellation:** `AbortController` cancels the fetch; the server detects the dropped connection and stops streaming.

**Progress:** none — no out-of-band channel available over HTTP/2.

### 4.2 HTTP/2 JSON (http2-json, port 3001)

**Intent:** traditional JSON-over-HTTP baseline representing what most web dashboards do today.

**Flow**
1. Client sends `POST /query` with `{ "sql": "..." }`
2. Server executes query in DataFusion via `df.collect()` (full materialization)
3. Server serializes all batches to a JSON array using `arrow_json::ArrayWriter`
4. Server returns `200` with `application/json` body
5. Client parses JSON and renders

This is intentionally non-streaming: the entire result set is materialized on the server and parsed on the client, representing the worst-case baseline for time-to-first-render.

**Cancellation:** `AbortController` cancels the fetch.

**Progress:** none.

### 4.3 WebTransport (webtransport, port 4433)

**Intent:** evaluate what changes when the browser can use QUIC streams + datagrams in one session.

A WebTransport session acts as a lightweight connection between browser and server. Within it:

- one bidirectional stream per query (request + data stream response)
- datagrams for progress and cancellation messages (separate from the data stream)

**Flow**
1. Client opens `WebTransport("https://127.0.0.1:4433")` with pinned certificate hash
2. Client creates a bidirectional stream
3. Client writes SQL query as UTF-8 and closes the writable side to delimit end of message
4. Server accepts the stream, reads the SQL, starts DataFusion execution via `execute_stream()`
5. Server streams Arrow IPC bytes back on the stream as batches are produced
6. Server sends progress datagrams periodically: `{ "type": "progress", "rows": N, "batches": N, "bytes": N }`
7. Client renders batches incrementally, updates progress bar from datagrams
8. Client can send cancel datagram `{ "type": "cancel" }`; server acknowledges with `{ "type": "cancel_ack" }` and stops streaming

**Why this is interesting**
- QUIC streams avoid TCP head-of-line blocking
- Datagrams provide a low-latency control plane without interfering with bulk data flow
- Certificate pinning avoids the need for a CA-signed cert during development

---

## 5. Protocol design (v0)

**Query request (client → server)**
- UTF-8 string: SQL text
- WebTransport: closes writable side of bidirectional stream to delimit end of message
- HTTP/2: JSON body `{ "sql": "..." }` in POST request

**Query response (server → client)**
- WebTransport and HTTP/2 Arrow: Arrow IPC stream bytes (schema + record batches + EOS marker)
- HTTP/2 JSON: JSON array of row objects

**Datagrams (WebTransport only, both directions)**
- JSON (small, <= MTU):
  - Server → client: `{ "type": "progress", "rows": 123456, "batches": 42, "bytes": 8388608 }`
  - Client → server: `{ "type": "cancel" }`
  - Server → client: `{ "type": "cancel_ack" }`

This is intentionally minimal — not trying to be Arrow Flight, just enough to make experimentation fast.

---

## 6. Server internal architecture (Rust)

### 6.1 Modules

Shared logic lives in `server-core/` (a Cargo workspace member used by all three server binaries):

- `server-core/src/query.rs` — DataFusion `SessionContext` creation, parquet table registration (`yellow_taxi` from NYC Yellow Taxi dataset). Sets `schema_force_view_types = false` for JS Arrow compatibility.
- `server-core/src/encode.rs` — incremental Arrow IPC `StreamEncoder` with drainable `FlushableBuffer`. Supports writing schema header, individual batches, and EOS marker, with `drain()` returning only new bytes since the last call.
- `server-core/src/certs.rs` — TLS certificate management. Generates self-signed PEM certs (14-day validity, refresh after 13 days) for localhost/127.0.0.1. Used by all three servers.

Each server binary owns only its transport layer:

- `servers/webtransport/` — wtransport session handling, bidirectional streams, datagrams. Has its own `certs.rs` that wraps `server_core::certs::ensure_certs()` and writes a `cert-hash.json` for browser certificate pinning.
- `servers/http2-arrow/` — Axum POST handler, streaming `Body` response via `mpsc` channel. TLS via `axum-server` with rustls.
- `servers/http2-json/` — Axum POST handler, buffered JSON array response. TLS via `axum-server` with rustls.

Both HTTP/2 servers configure CORS to allow `https://localhost:5173` (the Vite dev server).

### 6.2 Query execution contract

- Server must not materialize the entire result set in memory (except HTTP/2 JSON, which intentionally does this as the baseline)
- Arrow results are produced and shipped batch-by-batch via DataFusion's `SendableRecordBatchStream`
- Cancellation stops further work: WebTransport uses datagram protocol; HTTP/2 servers detect client disconnect

### 6.3 Arrow IPC streaming

Arrow IPC "stream format" is used because:
- it's self-describing (schema included)
- it can be decoded incrementally
- it's a common building block across Arrow systems

The `StreamEncoder` uses a sync buffering adapter: encode batch to buffer, drain buffer to the network after each batch. This keeps the code understandable while demonstrating streaming behavior over async transports.

---

## 7. Client architecture (Chrome JS/TS)

### 7.1 UI and behavior

A single unified client (`client/`) built with Vite + TypeScript (no framework):
- **Transport picker** (radio buttons): WebTransport / HTTP/2 Arrow / HTTP/2 JSON
- **SQL textarea** (default: `SELECT * FROM yellow_taxi LIMIT 1000`)
- **Run / Cancel buttons** — cancel works on all transports (datagram for WebTransport, AbortController for HTTP/2)
- **Progress bar** (WebTransport only) — shows row and batch counts from datagrams
- **Streaming table** — renders rows incrementally as batches arrive, capped at 1000 displayed rows with a "Showing X of Y rows" indicator
- **Stats panel** — connection setup time, TTFB, total time, throughput (rows/sec, MB/sec), cancel latency, long tasks

### 7.2 Streaming decode pipeline

The client performs real streaming decode:
- `transport.ts` adapters return a `ReadableStream<Uint8Array>` regardless of transport
- `decode.ts` yields `RecordBatch` objects from the stream via `RecordBatchReader.from()` (apache-arrow JS)
- `main.ts` renders each batch incrementally as it arrives
- `stats.ts` (`StatsCollector`) instruments the stream with byte-level callbacks for TTFB and throughput

### 7.3 Transport adapters

Three adapters in `transport.ts` share a common interface:
- `WebTransportAdapter` — connects with cert pinning, creates bidirectional stream, listens for datagrams
- `HttpArrowAdapter` — `POST /api/arrow/query` (proxied to port 3000), streams Arrow IPC response
- `HttpJsonAdapter` — `POST /api/json/query` (proxied to port 3001), receives full JSON response

Each adapter provides `run(sql, callbacks)` returning a cancellable handle.

---

## 8. Current metrics (what is measured today)

The `StatsCollector` in the client currently tracks:

| Metric | Status |
|--------|--------|
| Connection setup time | Measured |
| Time-to-first-byte (TTFB) | Measured |
| Total query time | Measured |
| Throughput (rows/sec and MB/sec) | Measured |
| Cancellation latency | Measured (request → ack/done) |
| Long tasks (>50ms main-thread blocks) | Measured via PerformanceObserver |
| Bytes received | Measured |
| Rows received | Measured |

All metrics are displayed in the stats panel after each query completes.

---

## 9. Open questions / risks

- **WebTransport browser support beyond Chromium** — acceptable thesis limitation, documented as scope boundary
- **Backpressure behavior under slow clients** — how QUIC flow control + app-level buffering interact is untested
- **Query sandboxing** — SQL injection is less relevant since DataFusion runs on local Parquet files, but important if extended to external databases

---

## 10. Summary

The architecture is intentionally simple: a Rust query server streams Arrow record batches to a browser over either HTTP/2 or WebTransport. The WebTransport path adds a real control lane (datagrams) enabling progress and cancellation to feel immediate even while bulk data streams. The HTTP/2 JSON path provides a traditional baseline for comparison.

The central idea is not "invent a new database" but to explore a protocol + UX boundary:
*what changes when the browser becomes a first-class client for high-throughput, low-latency analytics streams?*

---

## 11. Next steps

Each item below is scoped as a single coherent PR.

### NS-1: Query workload suite

Define 5–6 SQL queries that cover the evaluation matrix: varying result size and schema width.

- `tiny`: `SELECT VendorID, tpep_pickup_datetime, total_amount FROM yellow_taxi LIMIT 100` (~100 rows, 3 narrow columns)
- `small`: `SELECT * FROM yellow_taxi LIMIT 1000` (~1K rows, all columns)
- `medium`: `SELECT * FROM yellow_taxi LIMIT 100000` (~100K rows)
- `large`: `SELECT * FROM yellow_taxi` (full dataset, millions of rows)
- `wide`: `SELECT * FROM yellow_taxi LIMIT 10000` (all columns, 10K rows — stresses schema width)
- `aggregation`: `SELECT VendorID, COUNT(*), AVG(total_amount) FROM yellow_taxi GROUP BY VendorID` (small result from large scan)

Store these as a JSON config file (`bench/workloads.json`) that both automated harness and the client UI can reference. Add a query preset picker to the client dropdown.

### NS-2: Server-side timing instrumentation

Add server-side timing to all three servers so we can cross-reference with client-side metrics.

- Instrument each server to measure and log: query parse time, first batch produced time, total execution time, total bytes written, batch count
- Return timing metadata in a response header (`X-Server-Timing`) for the HTTP/2 servers
- Send a final summary datagram for WebTransport: `{ "type": "done", "server_exec_ms": N, "batches": N, "bytes": N }`
- Write server logs in a structured format (JSON lines) for automated collection

### NS-3: Network condition emulation

Build a reproducible network emulation setup for testing under degraded conditions.

- Create a Docker Compose configuration that runs the servers behind a `tc netem` network shaper
- Define 5 network profiles as named presets:
  - `lan`: 1ms RTT, no loss
  - `broadband`: 20ms RTT, 50 Mbps, no loss
  - `wan`: 100ms RTT, 10 Mbps, no loss
  - `mobile`: 80ms RTT, 5 Mbps, 1% packet loss
  - `lossy`: 50ms RTT, 10 Mbps, 5% packet loss
- Provide a `just bench-net <profile>` command that activates a profile
- Document the setup so experiments are reproducible

### NS-4: Automated experiment runner

Build an end-to-end benchmark harness that runs the full experiment matrix and collects results.

- Script (Node or Python) that:
  1. Starts the three servers
  2. For each (transport × workload × network profile × repetition), launches a headless Chrome session, runs the query, and collects `StatsCollector` output
  3. Writes results to CSV: one row per run with all metrics columns
- Use Puppeteer or Playwright to drive the client (the client already renders stats; extract them from the DOM or expose a `window.__benchResult` hook)
- Target: 20 repetitions per configuration for statistical significance
- Provide `just bench` to run the full matrix and `just bench --quick` for a smoke test (3 reps, LAN only)

### NS-5: Results analysis and visualization

Build the analysis pipeline that turns raw CSV data into thesis-ready figures.

- Python notebook or script using pandas + matplotlib/seaborn
- Generate per-metric comparison charts: grouped bar charts (transport × network profile), box plots for variance, CDF plots for tail latency
- Statistical tests: confidence intervals, Mann-Whitney U or similar for pairwise transport comparisons
- Output figures as PDF/SVG for direct inclusion in the thesis
- Summary table generator (LaTeX or Markdown) for key findings

### NS-6: Protocol enhancements (stretch)

Incremental improvements to the wire protocol, each testable as an A/B experiment:

- **Structured query envelope**: `{ "protocol_version": 1, "query_id": "uuid", "sql": "...", "limits": { "max_rows": N } }` — enables query IDs for multi-query sessions
- **Multiple concurrent queries per session**: reuse WebTransport session for multiple bidirectional streams, each carrying a separate query with its own query ID
- **Server-initiated progress streams**: replace progress datagrams with a dedicated unidirectional stream for richer metadata (estimated total rows, ETA)

Each sub-item can be its own PR if NS-6 is too large.
