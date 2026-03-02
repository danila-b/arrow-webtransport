#!/usr/bin/env bash
set -euo pipefail

if [ -n "${NETEM_PARAMS:-}" ]; then
    echo "Applying tc netem: $NETEM_PARAMS"
    tc qdisc add dev eth0 root netem $NETEM_PARAMS
fi

exec "$@"
