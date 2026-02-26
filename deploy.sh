#!/usr/bin/env bash
# Deploy the Artifik MCP server to Cloud Run.
# Safe to re-run; gcloud run deploy is idempotent.
set -euo pipefail

gcloud run deploy artifik-mcp \
  --source . \
  --region europe-north1 \
  --project=procurement-mcp \
  --set-secrets=VENDOR_API_ID=vendor-api-id:latest,VENDOR_API_KEY=vendor-api-key:latest,MCP_AUTH_TOKEN=mcp-auth-token:latest \
  --min-instances=0 \
  --max-instances=1 \
  --memory=256Mi \
  --no-allow-unauthenticated
