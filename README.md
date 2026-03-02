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
- [`just`](https://github.com/casey/just) command runner 
- A Chromium-based browser (required for WebTransport)


### Quick start 

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

>[!NOTE]
> First time running the servers, the server will generate the TLS certificates. This may take a few seconds and likely will prompt you to trust the certificate.

## Notes

- Tested on Chrome. WebTransport requires a Chromium-based browser.
- This is a research prototype: the goal is reliable experiments and measurements, not a production service.

## Running tests

```sh
# Rust tests (all server crates)
cargo test

# Client tests
cd client && npm test
```

## Linting

Lint the entire repo (Rust + TypeScript) in one command:

```sh
just lint
```

## Network emulation

Run the servers inside Docker with `tc netem` network shaping to test under degraded conditions.
Requires docker compose to be installed with any conteinerization engine. 

### Usage

```sh
just bench-net lan
```

This builds the server images, starts all three servers in Docker containers with the `lan` network profile (1ms RTT), and applies `tc netem` shaping on each container's network interface.

Once the servers are running, start the client dev server separately:

```sh
just client
```

Then open `https://localhost:5173` in Chrome and use the transport picker to run queries against the containerized servers. The ports (4433, 3000, 3001) are the same as in local development.

Available profiles: `lan`. Additional profiles with bandwidth limits and packet loss will be added in future work.

