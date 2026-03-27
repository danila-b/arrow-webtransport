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
> On the first run, the servers generate local TLS certificates. This can take a few seconds and may prompt you to trust the certificate.

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

The repository includes a Docker-based network-emulation workflow using `tc netem`.

```sh
just bench-net lan
```

This starts the servers in containers with the `lan` profile and applies shaping to each container interface. Then start the client separately:

```sh
just client
```

Open `https://localhost:5173` in Chrome and run queries against the containerized servers.

At the moment, `lan` is the documented profile available in the repo workflow. Additional profiles are planned as part of the thesis evaluation work.

## Notes

- Tested in Chrome; WebTransport support is treated as Chromium-focused in this prototype.
- This is a research prototype meant for experiments and comparison, not a production deployment.

