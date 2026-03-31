# Observation: HTTP/2 Arrow has ~10× higher throughput than WebTransport on localhost network

**Date:** 2026-02-20
**Query:** `SELECT * FROM yellow_taxi LIMIT 1000000`
**Dataset:** NYC Yellow Taxi (parquet), 1M rows, ~143 MB Arrow IPC on the wire

## Raw numbers

| Metric | WebTransport | HTTP/2 Arrow |
|---|---|---|
| Connection setup | 86 ms | 0 ms |
| Time to first byte | 11 ms | 83 ms |
| Total time | 5.54 s | 522 ms |
| Throughput (rows/sec) | 180,600 | 1,914,608 |
| Throughput (MB/sec) | 25.86 | 274.06 |
| Long tasks | 24 (3315 ms blocked) | 26 (3519 ms blocked) |

WebTransport wins on TTFB (11 ms vs 83 ms) — a QUIC stream delivers the first bytes
before HTTP/2 has even finished the response headers. But total throughput is roughly
10× worse, which makes the overall transfer dramatically slower.

Both transports produced 123 batches of ~8192 rows (~1.17 MB each).

## Why this happens

Several factors stack up, roughly in order of impact.

### 1. Serial write loop vs buffered producer/consumer

This is the biggest one. The two servers have fundamentally different I/O patterns.

**HTTP/2 Arrow** uses a 16-slot `mpsc` channel. A spawned task encodes batches and
pushes them into the channel; Axum/hyper reads from the other end independently and
writes to the TCP socket with its own internal buffering. Encoding and network I/O
overlap — the producer can stay 16 batches ahead of the consumer.

**WebTransport** calls `send.write_all(&chunk).await` directly in the batch loop.
Each ~1.17 MB write must fully complete before the next batch is even encoded.
The pipeline is one-deep: encode → write_all → wait → encode → write_all → wait…
for 123 iterations. No overlap at all.

### 2. Kernel TCP vs userspace QUIC

HTTP/2 runs over TCP, which goes through the kernel's highly optimized network stack
with decades of tuning, zero-copy paths, and hardware offloading.

QUIC (via quinn, underneath wtransport 0.7) runs entirely in userspace. Every packet
hops through: application → tokio → quinn → UDP socket → kernel → loopback → kernel
→ UDP socket → quinn → tokio → application. For bulk transfer this is measurably
more overhead per byte.

### 3. QUIC flow control windows

QUIC has per-stream and per-connection flow control. Quinn's defaults are relatively
conservative (initial stream receive window ~1 MB). Each batch is ~1.17 MB, so the
sender likely hits the stream flow control ceiling on almost every write, waiting for
the receiver to send MAX_STREAM_DATA frames before more data can flow.

TCP's window scaling, by contrast, ramps up quickly on localhost to very large
effective windows with no such per-write stall.

### 4. Plain HTTP vs mandatory TLS

The HTTP/2 Arrow server runs plain `http://127.0.0.1:3000` — no encryption at all.
WebTransport requires TLS 1.3 by spec, so every packet of the ~143 MB transfer goes
through per-packet encryption. On bulk data this is non-trivial CPU cost, even on
localhost.

### 5. Per-batch progress datagrams

The WebTransport server sends a progress datagram after every batch (123 JSON
serializations + 123 datagram sends). Not huge individually, but it adds up in a
tight loop that's already bottlenecked.

### 6. tokio::select! overhead

The WebTransport loop uses `tokio::select!` on every iteration to race between the
next batch and a potential cancel datagram. That's 123 times the runtime polls two
futures instead of just reading the next batch.

## Takeaways

The throughput gap is real but largely an artifact of the current implementation, not
a fundamental WebTransport limitation. The serial `write_all` pattern is the dominant
bottleneck — it turns what should be a pipelined bulk transfer into a sequential
stop-and-wait loop.

QUIC/WebTransport's strengths (multiplexed streams, 0-RTT, independent stream
head-of-line blocking) are latency and concurrency advantages, not raw single-stream
bulk throughput. The TTFB numbers already show this: 11 ms vs 83 ms.

## Potential improvements to try

1. **Decouple encoding from writing** — use the same mpsc channel + spawned task
   pattern in the WebTransport server so encoding runs ahead of the network.
2. **Tune QUIC transport config** — increase quinn's `send_window` /
   `receive_window` / `initial_window` (e.g. 8–16 MB) to reduce flow control stalls.
3. **Reduce progress datagram frequency** — send every Nth batch or on a timer,
   not every single batch.
4. **Run HTTP/2 over TLS too** — for a fair apples-to-apples comparison in the
   thesis, both transports should either use TLS or neither should.
5. **Coalesce writes** — buffer 2–4 encoded batches and write them as one larger
   chunk to amortize QUIC framing and flow control overhead.

## Updates

### Update 1: Decouple encoding from writing

Applied the mpsc channel + spawned producer task pattern (item 1 above). Encoding
now runs in a separate tokio task, feeding a 16-slot channel; the session task
consumes from the channel and calls `write_all`.

**Result:** negligible improvement (a few percent at most).

**Why:** Encoding is fast (~microseconds per 1.17 MB batch). The real bottleneck is
`write_all` blocking on QUIC flow control — quinn's default stream receive window
(~1 MB) is smaller than a single batch, so every write stalls waiting for
MAX_STREAM_DATA. The producer fills the channel almost instantly and then blocks on
`tx.send()` too. The pipeline is serialized at the network layer, not the encoding
layer.

### Update 2: Tune QUIC windows + coalesce writes + reduce overhead

Applied items 1, 2, 3, and 5 together:

- **QUIC transport config** — `send_window` 8 MB, `stream_receive_window` 8 MB,
  `receive_window` 16 MB (via `with_custom_transport` + quinn feature).
- **Write coalescing** — consumer drains all ready chunks with `try_recv()` and
  combines them into a single `write_all`, reducing QUIC framing and flow control
  interactions.
- **Reduced per-batch overhead** — removed `println!` from the hot path (both
  producer and consumer); progress datagrams sent once per coalesced write instead
  of once per batch.
- **Biased `tokio::select!`** — always prefers the data path over cancel-datagram
  polling.

**Result:** modest improvement - ~50% faster throughput, but still much slower than HTTP/2 Arrow.

### Update 3: Run HTTP/2 over TLS too

Applied item 4 above. The HTTP/2 Arrow server now runs over TLS.

**Result:** no significant downgrade in throughput for them, the gap still exists between WebTransport and HTTP/2 Arrow. JSON server is still slower than any of the other two.

### Update 4: Remove channel+coalesce, inline the streaming loop

Removed the mpsc channel, spawned encoding task, and `try_recv` coalescing loop
introduced in Updates 1–2. Replaced with a direct inline loop: encode batch → write
batch → next, with `tokio::select!` racing each `write_all` against the cancellation
token. The QUIC window tuning from Update 2 is preserved.

**Motivation:** The coalescing pattern (Update 2) introduced several problems that
outweighed its benefits:

- **Redundant memcpy** — `extend_from_slice` copied every coalesced chunk into a
  combined buffer. For large results this was O(total_bytes) wasted work.
- **Bursty writes** — the recv+try_recv drain created a pause→burst→pause cadence
  that fights QUIC congestion control, especially under network emulation.
- **Silent error swallowing** — the fire-and-forget encoding task dropped DataFusion
  stream errors and encode errors, surfacing them as confusing client-side parse
  failures rather than clear server errors.
- **Cancel unresponsive** — cancel was only checked after `write_all` completed, so
  a flow-control stall could delay cancellation indefinitely.

The channel was originally added (Update 1) to pipeline encoding ahead of writes,
mimicking the HTTP/2 server's `mpsc` → `Body::from_stream` pattern. But that pattern
exists in HTTP/2 because axum requires returning a `Body` — the channel is an
architectural boundary, not a performance optimization. WebTransport has no such
constraint; the send stream is directly accessible.

With the QUIC windows already tuned to 8 MB (Update 2), the original serial-write
bottleneck is resolved. The inline loop is now structurally equivalent to what hyper
does internally for HTTP/2: encode → write, with the transport stack managing its own
buffering.
