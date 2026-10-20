#!/bin/sh
set -e

missing=""

require_one_of() {
    primary="$1"
    legacy="$2"
    primary_value=$(printenv "$primary" || true)
    legacy_value=$(printenv "$legacy" || true)
    if [ -z "$primary_value" ] && [ -z "$legacy_value" ]; then
        echo "ERROR: $primary (or legacy $legacy) is required"
        missing="$missing $primary"
    fi
}

require_one_of NEXT_PUBLIC_VERANA_INDEXER_BASE_URL NEXT_PUBLIC_IDX_ENDPOINT
require_one_of NEXT_PUBLIC_VERANA_RPC_ENDPOINT NEXT_PUBLIC_RPC_ENDPOINT
require_one_of NEXT_PUBLIC_VERANA_REST_ENDPOINT NEXT_PUBLIC_API_ENDPOINT

if [ -n "$missing" ]; then
    echo "FATAL: missing required environment variables:$missing"
    exit 1
fi

exec "$@"
