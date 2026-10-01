#!/usr/bin/env bash
# Start local Flask dev server with secrets from GCP Secret Manager.
# Secrets are injected as env vars — never written to disk.
#
# Usage:   ./dev.sh [--verify-contract-fields [--organization-index N] [--max-details N]]
# Prereqs: gcloud auth login + access to procurement-mcp project
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate local .venv if it exists and not already active
if [ -f "$SCRIPT_DIR/.venv/bin/activate" ] && [ "${VIRTUAL_ENV:-}" != "$SCRIPT_DIR/.venv" ]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
fi

export PYTHONPATH="$SCRIPT_DIR/src:${PYTHONPATH:-}"
PYTHON_BIN=python
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    PYTHON_BIN=python3
fi

PROJECT=procurement-mcp

load_secret() {
    local secret_name="$1"
    local secret_value
    if ! secret_value=$(gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT" 2>/dev/null) || [ -z "$secret_value" ]; then
        printf 'Kunne ikke hente secret %s fra GCP Secret Manager.\n' "$secret_name" >&2
        return 1
    fi
    printf '%s' "$secret_value"
}

echo "Henter secrets fra GCP Secret Manager…" >&2

if [ "${1:-}" = "--verify-contract-fields" ]; then
    VENDOR_API_ID=$(load_secret vendor-api-id) || exit 1
    VENDOR_API_KEY=$(load_secret vendor-api-key) || exit 1
    export VENDOR_API_ID VENDOR_API_KEY
    shift
    exec "$PYTHON_BIN" "$SCRIPT_DIR/scripts/verify_artifik_fields.py" "$@"
fi

VENDOR_API_ID=$(load_secret vendor-api-id) || exit 1
VENDOR_API_KEY=$(load_secret vendor-api-key) || exit 1
DOFFIN_API_KEY=$(load_secret doffin-api-key) || exit 1
export VENDOR_API_ID VENDOR_API_KEY DOFFIN_API_KEY

echo "Starting Flask dev server on http://localhost:8080"
exec "$PYTHON_BIN" -m flask --app "app:create_app()" run --host 0.0.0.0 --port 8080 --debug
