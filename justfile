set shell := ["bash", "-c"]

# Run all servers and the client dev server
dev:
    #!/usr/bin/env bash
    trap 'kill 0' SIGINT SIGTERM
    cargo run -p server-webtransport &
    cargo run -p server-http2-arrow &
    cargo run -p server-http2-json &
    cd client && npm run dev &
    wait

# Run only the client dev server
client:
    cd client && npm run dev

# Run servers (default: all). Specify names: just servers webtransport http2-arrow
servers *names:
    #!/usr/bin/env bash
    trap 'kill 0' SIGINT SIGTERM
    if [ -z "{{names}}" ]; then
        cargo run -p server-webtransport &
        cargo run -p server-http2-arrow &
        cargo run -p server-http2-json &
    else
        for name in {{names}}; do
            case "$name" in
                webtransport) cargo run -p server-webtransport & ;;
                http2-arrow)  cargo run -p server-http2-arrow & ;;
                http2-json)   cargo run -p server-http2-json & ;;
                *) echo "Unknown server: $name. Options: webtransport, http2-arrow, http2-json"; exit 1 ;;
            esac
        done
    fi
    wait

# Lint the whole repo (Rust + TypeScript)
lint:
    cargo fmt --check
    cargo clippy
    cd client && npm run lint
