#!/bin/bash
# Guard hook: blocks Bash commands that might expose secrets.
# Called by Claude Code PreToolUse hook with $CLAUDE_TOOL_INPUT containing the command.
#
# Defense in depth:
#   Layer 1 (this hook) — block commands that reference secrets by name
#   Layer 2 (PostToolUse)  — block output that contains actual secret values
#   Layer 3 (architecture) — for production, use a proxy so Claude never has credentials

set -euo pipefail

INPUT="${CLAUDE_TOOL_INPUT:-}"

# --- Layer 1: Block commands referencing secrets by name ---
BLOCKED_PATTERNS=(
  # Direct env var references
  'VENDOR_API_KEY'
  'VENDOR_API_ID'
  'API_KEY'
  'API_ID'
  'API_SECRET'
  'AUTHORIZATION'

  # Shell tools that dump environment
  '\benv\b'
  '\bprintenv\b'
  '\bexport\b'
  'set \| grep'
  '/etc/environment'

  # Keychain access
  'security find-generic-password'
  'security dump-keychain'

  # Env files
  '\.env'
  'credentials'

  # HTTP tools with auth headers
  'curl.*-H.*[Aa]uth'
  'httpie.*-A'

  # Python patterns for env var access (including obfuscation attempts)
  'os\.environ'
  'os\.getenv'
  'subprocess.*env'
  '__import__.*os'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$INPUT" | grep -qiE "$pattern"; then
    echo "BLOCKED: Command matches secret-exposure pattern: $pattern" >&2
    exit 2
  fi
done
