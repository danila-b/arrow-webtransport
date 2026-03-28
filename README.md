# Browser-native analytics streaming (Arrow + WebTransport)

This repository contains a thesis prototype for comparing three ways to deliver analytical query results to the browser:

- WebTransport + Arrow IPC
- HTTP/2 + Arrow IPC
- HTTP/2 + JSON

The server side is built in Rust with DataFusion. The browser client is a single TypeScript app that can switch between all three transports and render results through the same UI.

For deeper project context, see `docs/project-tracker.md` for current status, `docs/thesis-one-pager.md` for the concise thesis summary, and `docs/thesis-research.md` for the research-oriented outline.

## Clone

This repository uses Git LFS for the Parquet dataset files. Install [Git LFS](https://git-lfs.github.com/) first.

```sh
git clone git@github.com:danila-b/arrow-webtransport.git
```

After cloning, verify that the Parquet files exist in `data/nyc_yellow_taxi_dataset/`.

## Prerequisites

- Rust toolchain via [rustup](https://rustup.rs/)
- Node.js 18+ and npm
- [`just`](https://github.com/casey/just)
- Chromium-based browser for WebTransport testing

## Quick start

```sh
# Everything: all servers + client dev server
just dev

# Client only
just client

# All servers only
just servers

# Specific servers
just servers webtransport
just servers http2-arrow http2-json
```

> [!NOTE]
> TLS certificates are generated automatically before server startup via `just gen-certs` (called as a dependency of `dev`, `servers`, and `bench-net`).
> Self-signed certs are valid for 14 days per the WebTransport spec and auto-refresh on the next run. QUIC enforces TLS, so all servers use it for equality of comparison.
> Run `just gen-certs` standalone to force-refresh certificates.

## What runs where

- `servers/webtransport/` on port `4433`
- `servers/http2-arrow/` on port `3000`
- `servers/http2-json/` on port `3001`
- `client/` on `https://localhost:5173`

Shared query execution and Arrow encoding live in `server-core/`.

## Tests

```sh
# Rust tests
cargo test

# Client tests
cd client && npm test
```

## Lint

```sh
just lint
```

## Network emulation

The repository includes a Docker-based network-emulation workflow using `tc netem`. Each profile applies shaping inside every server container on `eth0` (server-egress direction).

```sh
just bench-net <profile>
```

Then start the client separately:

```sh
just client
```

Open `https://localhost:5173` in Chrome and run queries against the containerized servers.

### Available profiles

| Profile | `tc netem` parameters | Models |
|---------|-----------------------|--------|
| `lan` | `delay 0.5ms` | Near-zero-latency local network |
| `broadband` | `delay 10ms rate 100mbit` | Healthy fixed-access link |
| `wan` | `delay 40ms rate 30mbit` | Cross-region or backbone path |
| `mobile` | `delay 80ms 20ms distribution normal rate 10mbit loss 0.5%` | Constrained mobile link with jitter and mild loss |
| `lossy` | `delay 40ms rate 30mbit loss 2%` | Moderate-latency link with significant packet loss |

To list all profiles and their parameters without starting containers:

```sh
just bench-net-list
```

Container startup logs print the applied `tc netem` string so you can confirm which profile is active.

## Notes

- Tested in Chrome; WebTransport support is treated as Chromium-focused in this prototype.
- This is a research prototype meant for experiments and comparison, not a production deployment.

