FROM rust:bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY server-core/ server-core/
COPY servers/ servers/

RUN cargo build --release \
    --package server-webtransport \
    --package server-http2-arrow \
    --package server-http2-json \
    --package server-core

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends iproute2 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/server-webtransport /usr/local/bin/
COPY --from=builder /app/target/release/server-http2-arrow  /usr/local/bin/
COPY --from=builder /app/target/release/server-http2-json   /usr/local/bin/
COPY --from=builder /app/target/release/gen-certs           /usr/local/bin/

RUN mkdir -p /app/server-core /app/data /app/certs
