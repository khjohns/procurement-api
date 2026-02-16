#!/bin/bash
# Guard hook: blocks Read tool from accessing files that might contain secrets.
# Called by Claude Code PreToolUse hook with $CLAUDE_TOOL_INPUT containing the file path.

set -euo pipefail

INPUT="${CLAUDE_TOOL_INPUT:-}"

BLOCKED_PATTERNS=(
  '\.env'
  'credentials'
  'secrets'
  '\.key$'
  '\.pem$'
  'keychain'
  '\.netrc'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$INPUT" | grep -qiE "$pattern"; then
    echo "BLOCKED: Read target matches secret file pattern: $pattern" >&2
    exit 2
  fi
done
