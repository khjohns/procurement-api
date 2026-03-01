#!/usr/bin/env bash
# Start local Flask dev server with secrets from GCP Secret Manager.
# Secrets are injected as env vars — never written to disk.
#
# Usage:   ./dev.sh
# Prereqs: gcloud auth login + access to procurement-mcp project
set -euo pipefail

PROJECT=procurement-mcp

echo "Fetching secrets from GCP Secret Manager…"

export VENDOR_API_ID=$(gcloud secrets versions access latest --secret=vendor-api-id --project="$PROJECT")
export VENDOR_API_KEY=$(gcloud secrets versions access latest --secret=vendor-api-key --project="$PROJECT")
export DOFFIN_API_KEY=$(gcloud secrets versions access latest --secret=doffin-api-key --project="$PROJECT")

echo "Starting Flask dev server on http://localhost:8080"
exec python -m flask --app "app:create_app()" run --host 0.0.0.0 --port 8080
