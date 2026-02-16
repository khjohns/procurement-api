#!/bin/bash
# PostToolUse guard: blocks output that contains actual secret values.
# This is the critical layer — even if input guards are bypassed,
# secret values in output are caught before Claude sees them.

set -euo pipefail

OUTPUT="${CLAUDE_TOOL_OUTPUT:-}"

# Read actual secret values from Keychain (without exposing them)
API_ID="$(security find-generic-password -s 'procurement-api-id' -w 2>/dev/null || true)"
API_KEY="$(security find-generic-password -s 'procurement-api-key' -w 2>/dev/null || true)"

# Check if output contains the actual secret values
if [[ -n "$API_ID" && "$OUTPUT" == *"$API_ID"* ]]; then
  echo "BLOCKED: Output contains API ID value" >&2
  exit 2
fi

if [[ -n "$API_KEY" && "$OUTPUT" == *"$API_KEY"* ]]; then
  echo "BLOCKED: Output contains API key value" >&2
  exit 2
fi
