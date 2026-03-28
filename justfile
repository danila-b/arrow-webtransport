set shell := ["bash", "-c"]

# Generate or refresh TLS certificates (runs before any server starts)
gen-certs:
    cargo run -p server-core --bin gen-certs

# Run all servers and the client dev server
dev: gen-certs
    #!/usr/bin/env bash
    trap 'kill 0' SIGINT SIGTERM
    cargo run -p server-webtransport &
    cargo run -p server-http2-arrow &
    cargo run -p server-http2-json &
    cd src/client && npm run dev &
    wait

# Run only the client dev server
client:
    cd src/client && npm run dev

# Run servers (default: all). Specify names: just servers webtransport http2-arrow
servers *names: gen-certs
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

# Run all tests (Rust + client)
test: test-server test-client

# Run Rust server tests
test-server:
    cargo test

# Run client tests
test-client:
    cd src/client && npm test

# Run servers in Docker with network emulation. Profiles: lan, broadband, wan, mobile, lossy
bench-net profile: gen-certs
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{profile}}" in
        lan)       params="delay 0.5ms" ;;
        broadband) params="delay 10ms rate 100mbit" ;;
        wan)       params="delay 40ms rate 30mbit" ;;
        mobile)    params="delay 80ms 20ms distribution normal rate 10mbit loss 0.5%" ;;
        lossy)     params="delay 40ms rate 30mbit loss 2%" ;;
        *) echo "Unknown profile: {{profile}}. Available: lan, broadband, wan, mobile, lossy"; exit 1 ;;
    esac
    echo "Starting servers with network profile '{{profile}}': netem $params"
    NETEM_PARAMS="$params" docker compose up --build

# List available network profiles and their netem parameters
bench-net-list:
    #!/usr/bin/env bash
    echo "Available network profiles:"
    echo "  lan        delay 0.5ms"
    echo "  broadband  delay 10ms rate 100mbit"
    echo "  wan        delay 40ms rate 30mbit"
    echo "  mobile     delay 80ms 20ms distribution normal rate 10mbit loss 0.5%"
    echo "  lossy      delay 40ms rate 30mbit loss 2%"

# Lint the whole repo (Rust + TypeScript)
lint:
    cargo fmt
    cargo clippy
    cd src/client && npm run lint:fix
