# Browser-native analytics streaming (Arrow + WebTransport)

This repo is a thesis prototype exploring **streaming analytical query results directly into the browser** using:

- **Apache Arrow IPC stream** — efficient columnar format used on the wire
- **Rust + DataFusion** for query execution on the server
- Three transport paths, each running as a separate server binary:
  - **WebTransport** (`servers/webtransport/`, port 4433) — Arrow IPC over QUIC streams + datagrams for progress/cancel
  - **HTTP/2 Arrow** (`servers/http2-arrow/`, port 3000) — Arrow IPC streaming over HTTP POST
  - **HTTP/2 JSON** (`servers/http2-json/`, port 3001) — traditional JSON-over-HTTP baseline
- A **single unified client** (`client/`) with a transport picker to switch between all three

Shared query execution and Arrow encoding live in `server-core/`. The client uses the same rendering and stats pipeline regardless of transport.

## How to clone

This repository uses Git LFS to manage large Parquet dataset files. Install Git LFS first: https://git-lfs.github.com/

```sh
git clone git@github.com:danila-b/arrow-webtransport.git
```

Verify the Parquet files exist in `data/nyc_yellow_taxi_dataset/`.

## How to run

### Prerequisites

- Rust toolchain (install via [rustup](https://rustup.rs/))
- Node.js >= 18 and npm
- [`just`](https://github.com/casey/just) command runner (recommended)
- A Chromium-based browser (required for WebTransport)

### 1. Install client dependencies

```sh
cd client && npm install
```

### 2. Quick start 

```sh
# Everything — all three servers + client dev server (Ctrl+C stops all)
just dev

# Only the client dev server
just client

# All servers (no client)
just servers

# Specific server(s)
just servers webtransport
just servers http2-arrow http2-json
```

### 2b. Manual start (without `just`)

Each server is a separate binary in the Cargo workspace. Start whichever ones you need (or all of them). Run these from the repo root:

```sh
# WebTransport server (port 4433) — Arrow IPC over QUIC
cargo run -p server-webtransport

# HTTP/2 Arrow server (port 3000) — Arrow IPC over HTTP
cargo run -p server-http2-arrow

# HTTP/2 JSON server (port 3001) — JSON over HTTP
cargo run -p server-http2-json
```

You can run them in separate terminals. Only the ones you plan to test need to be running.

### 3. Start the client

```sh
cd client && npm run dev
```

Open [https://localhost:5173](https://localhost:5173) in Chrome. Use the transport picker at the top to select which server to query.

> [!NOTE]
> The WebTransport option requires starting the WebTransport server first, since it generates the certificate that the client needs.

## Running tests

```sh
# Rust tests (all server crates)
cargo test

# Client tests
cd client && npm test
```

## Notes

- Tested on Chrome. WebTransport requires a Chromium-based browser.
- This is a research prototype: the goal is reliable experiments and measurements, not a production service.

## Linting

Lint the entire repo (Rust + TypeScript) in one command:

```sh
just lint
```

Or run linters individually:

**TypeScript** (via [Biome](https://biomejs.dev/) — config in `biome.json`):

```sh
cd client
npm run lint
npm run lint:fix
```

**Rust** (via rustfmt + clippy — config in `rustfmt.toml` / `clippy.toml`):

```sh
cargo fmt
cargo clippy
```
