#!/usr/bin/env bash
# Deploy the web app (SvelteKit frontend + Flask API) to Cloud Run.
# Safe to re-run; gcloud run deploy is idempotent.
set -euo pipefail

gcloud run deploy procurement-web \
  --source . \
  --region europe-north1 \
  --project=procurement-mcp \
  --set-secrets=VENDOR_API_ID=vendor-api-id:latest,VENDOR_API_KEY=vendor-api-key:latest,DOFFIN_API_KEY=doffin-api-key:latest \
  --set-env-vars=CACHE_BUCKET=procurement-eforms-cache \
  --min-instances=0 \
  --max-instances=1 \
  --memory=256Mi \
  --allow-unauthenticated
