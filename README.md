# Browser-native analytics streaming (Arrow + WebTransport)

This repo is a thesis prototype exploring **streaming analytical query results directly into the browser** using:

- **Apache Arrow IPC stream** (columnar, efficient)
- **Rust + DataFusion** for query execution
- Two transports:
  - `http2-fetch/` — baseline: HTTP/2 + Fetch streaming
  - `webtransport/` — experimental: WebTransport over HTTP/3 (QUIC), with streams + datagrams

The core thesis idea is “Flight-like streaming, but directly into the browser”: receive Arrow record batches incrementally, measure time-to-first-batch, and explore interactive UX features (progress + cancellation) enabled by WebTransport datagrams.

## How to run 

Run the server:
```sh
cd webtransport/server && cargo run
```

Run the client:
```sh
cd webtransport/client && npm run dev
```

Open the client in your browser: [https://localhost:5173](https://localhost:5173)

## Notes

- Chrome is the target client for WebTransport.
- This is a research prototype: the goal is to get reliable experiments and measurements, not a production-ready service.

## Linting

Lint configs live at the repo root and are shared by all projects automatically.

**TypeScript** (via [Biome](https://biomejs.dev/) — config in `biome.json`):

```sh
# from any client/ directory
npm run lint        
npm run lint:fix    
```

**Rust** (via rustfmt + clippy — config in `rustfmt.toml` / `clippy.toml`):

```sh
# from any server/ directory
cargo fmt           
cargo clippy        
```
