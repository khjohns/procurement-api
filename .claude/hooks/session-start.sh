#!/bin/bash
# Installerer Python-avhengigheter slik at pytest og ruff virker i
# Claude Code on the web. Frontend (npm) installeres ikke her.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Debian-installert blinker mangler RECORD-fil og kan ikke avinstalleres av pip;
# installer egen kopi først slik at flask-oppgradering ikke feiler.
python3 -m pip install --quiet --disable-pip-version-check --ignore-installed blinker

python3 -m pip install --quiet --disable-pip-version-check -r requirements-dev.txt

# Dokumentgenerering (opprettes i DG-01)
if [ -f requirements-dokumentgen.txt ]; then
  python3 -m pip install --quiet --disable-pip-version-check -r requirements-dokumentgen.txt
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PYTHONPATH="$CLAUDE_PROJECT_DIR/src"' >> "$CLAUDE_ENV_FILE"
fi
