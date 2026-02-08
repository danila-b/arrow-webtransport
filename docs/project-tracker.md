# Architecture: Browser-Native Analytics Streaming (Arrow + WebTransport)

## 1. Purpose and context

This project explores **browser-native, high-performance analytics streaming** by combining:

- **Apache Arrow** as the on-the-wire columnar format (Arrow IPC stream)
- **WebTransport over HTTP/3 (QUIC)** as the transport for low-latency, multiplexed streaming
- **Rust + DataFusion** as the query execution engine and server implementation
- A **Chrome** client written in JS/TS that decodes Arrow batches incrementally for interactive UX

The thesis question is: *can a browser receive analytical query results as a stream of Arrow record batches with better latency and interactivity than “traditional web” approaches (HTTP fetch / WebSocket), and how do QUIC streams + datagrams change the UX model?*

This repo intentionally contains **two comparable paths**:

- `http2-fetch/` — a baseline using HTTP/2 + Fetch streaming semantics
- `webtransport/` — the experimental path using WebTransport (HTTP/3) streams + datagrams

The code is designed to stay simple enough for an MVP, but structured so it can grow into a thesis-quality prototype with clear evaluation hooks.

---

## 2. Non-goals (for the thesis prototype)

To keep scope sane, we do **not** aim for:

- Full Apache Arrow Flight / FlightSQL compatibility
- Production auth, RBAC, row-level security (these may appear as “future work”)
- A general-purpose distributed query system
- Perfect cross-browser support (Chrome is the target for WebTransport)

---

## 3. High-level system overview

### Components

**Server (Rust)**
- Accepts a query request (initially SQL as UTF-8 text)
- Executes query in DataFusion
- Streams results as **Arrow IPC stream** bytes
- Sends control signals (progress, cancellation acknowledgment) out-of-band

**Client (Chrome, JS/TS)**
- Sends query
- Receives Arrow IPC stream and **decodes record batches incrementally**
- Renders partial results early and updates as more batches arrive
- Handles progress updates and cancellation

### Data plane vs control plane

We treat the system as two lanes:

- **Data plane (reliable, ordered):** Arrow IPC stream carrying schema + record batches  
- **Control plane (low-latency, best-effort):** progress + cancellation messages

This separation is a key thesis angle. With HTTP fetch we fake “control plane” via headers or side channels; with WebTransport we get an explicit second lane via datagrams.

---

## 5. Runtime architecture

### 5.1 HTTP/2 Fetch baseline (http2-fetch)

**Intent:** represent “typical web streaming” with minimal special protocols.

**Flow (conceptual)**
1. Client sends `POST /query` with `{ sql, options }`
2. Server executes in DataFusion
3. Server returns `200` with a streaming response body:
   - content-type: `application/vnd.apache.arrow.stream`
4. Client consumes `ReadableStream` chunks and feeds them into Arrow JS streaming reader
5. Client renders as batches arrive

**Cancellation**
- Baseline option A (simple): `AbortController` cancels fetch; server may notice disconnect and stop.
- Baseline option B (more explicit): `POST /cancel/{id}` if we implement query IDs.

**Progress**
- Baseline option: chunked trailers or a second endpoint (not as elegant, but that’s the point).

This baseline is useful because it is “what people would do today” if they want Arrow bytes in browsers.

---

### 5.2 WebTransport path (webtransport)

**Intent:** evaluate what changes when the browser can use QUIC streams + datagrams in one session.

We model a WebTransport session as a lightweight “connection” between browser and server. Within it:

- one bidirectional stream per query (request + data stream response)
- datagrams for progress and cancellation messages

**Flow (conceptual)**
1. Client opens `WebTransport("https://host/path")`
2. Client creates a bidirectional stream
3. Client writes query request (SQL / future: Substrait plan) and closes writable side
4. Server reads request, starts DataFusion execution
5. Server streams Arrow IPC bytes back on the stream as batches are produced
6. Server sends progress datagrams periodically (rows streamed, batches sent, elapsed time)
7. Client renders batches incrementally, updates progress UI from datagrams
8. Client can send cancel datagram; server stops query and closes stream

**Why this is interesting**
- QUIC streams reduce head-of-line blocking and enable parallelism
- datagrams provide low-latency “UX updates” without interfering with bulk data flow

---

## 6. Protocol design (v0 and future)

### 6.1 v0 protocol (simple, human-friendly)

**Query request (client → server)**
- UTF-8 string: SQL text
- closes stream to delimit end of message

**Query response (server → client)**
- Arrow IPC stream bytes only (schema + record batches)

**Datagrams (both directions)**
- JSON (small, <= MTU), e.g.
  - `{ "type": "progress", "rows": 123456, "batches": 42 }`
  - `{ "type": "cancel" }`
  - `{ "type": "error", "message": "..." }` (optional)

This is not trying to be Flight. It’s intentionally minimal to make experimentation fast.

### 6.2 Future protocol (thesis “vision”)

As the prototype matures, we can incrementally add:

- **Structured query envelope**:
  - `{ protocol_version, query_id, sql, limits, output_format }`
- **Substrait plan transport** (binary protobuf) as an alternative to SQL
- **Server-initiated streams** for pushing metadata or “side results”
- **Multiple concurrent queries per session** with explicit query IDs
- **Schema evolution / metadata** signals (more relevant for long-lived sessions)

The thesis can explicitly treat each added protocol feature as an experiment:
*does this feature improve UX and performance, and at what complexity cost?*

---

## 7. Server internal architecture (Rust)

### 7.1 Modules (target shape)

Both servers (`http2-fetch/server` and `webtransport/server`) should converge on similar internal boundaries:

- `query/`
  - parse/validate request
  - build DataFusion logical plan
  - run `execute_stream()` and yield `RecordBatch` stream
- `arrow_stream/`
  - encode Arrow IPC stream and write incrementally
  - handle backpressure (as best as possible)
- `control/`
  - progress accounting
  - cancellation token + query lifecycle
- `transport/`
  - HTTP/2 fetch handler OR WebTransport session handler
  - maps transport primitives → data plane + control plane abstraction

### 7.2 Query execution contract

The important contract for “streaming analytics” is:

- server must not materialize the entire result set in memory
- results should be produced and shipped batch-by-batch
- cancellation should stop further work quickly

DataFusion fits this model because it can return a stream of `RecordBatch` results.

### 7.3 Arrow IPC streaming contract

We want Arrow IPC “stream format” because:
- it’s self-describing (schema included)
- it can be decoded incrementally
- it’s a common lowest-level building block used across Arrow systems

Implementation note: Arrow IPC writers are often sync-IO oriented, while QUIC streams are async.
For the thesis prototype, it’s acceptable to use a simple buffering adapter:
- encode batch to a buffer
- flush buffer to the network after each batch

This keeps the code understandable while still demonstrating streaming behavior.

---

## 8. Client architecture (Chrome JS/TS)

### 8.1 UI and behavior

Minimal UI:
- SQL textarea
- Run button
- Cancel button
- progress indicator
- table preview (first N rows) + row count

### 8.2 Streaming decode pipeline

The client should do “real streaming”:
- read byte chunks as they arrive
- feed into Arrow JS streaming reader / DOM transform
- render record batches incrementally

This is important for the thesis: time-to-first-batch and progressive UX are central metrics.

### 8.3 Rendering strategy

For MVP:
- just render first N rows and update a counter
- avoid building a full grid component (that becomes a UI project)

If we want a stronger demo later:
- integrate a lightweight virtualized table
- add a chart that updates as batches arrive (e.g., histogram)

---

## 9. Evaluation plan (what we measure)

We treat evaluation as first-class; the architecture should make measurement easy.

### Metrics
- Connection setup time (client)
- Time-to-first-byte (TTFB)
- **Time-to-first-batch decode (TTFBD)** — key UX metric
- Time-to-first-1000 rows
- Total query time
- Throughput (rows/sec and MB/sec)
- Cancellation latency (click → server stops sending)
- CPU usage on client (optional but interesting for Arrow vs JSON)

### Scenarios
- small result / large result
- local network vs throttled network (devtools or `tc netem`)
- with and without progress datagrams (WebTransport)

---

## 10. Open questions / risks (explicitly tracked)

- WebTransport browser support beyond Chromium (acceptable thesis limitation)
- Mapping Arrow IPC encoding cleanly onto async streams (engineering detail)
- Backpressure behavior under slow clients (how QUIC + app logic interact)
- Query sandboxing (SQL injection is less relevant if no external DB, but important if extended)
- Dataset size vs demo practicality (choose a dataset that shows streaming benefits without huge infra)

Keeping these explicit helps the thesis read like a real research prototype, not a toy demo.

---

## 11. Summary

The architecture is intentionally simple: a Rust query server streams Arrow record batches to a browser over either HTTP/2 fetch or WebTransport. The WebTransport design adds a real control lane (datagrams) enabling progress and cancellation to feel immediate even while bulk data streams.

The central idea is not “invent a new database” but to explore a protocol + UX boundary:
*what changes when the browser becomes a first-class client for high-throughput, low-latency analytics streams?*

