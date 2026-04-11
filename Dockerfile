# Multi-stage: build SvelteKit frontend, then run Python.
# Default CMD serves the web app (Flask + gunicorn).
# MCP server overrides CMD via --command/--args in deploy.sh.

# --- Stage 1: Build SvelteKit frontend ---
FROM node:22-slim AS frontend
WORKDIR /app/src/frontend
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime ---
FROM python:3.12-slim
WORKDIR /app

# Install deps directly (not pip install . — app/__init__.py uses
# relative path from __file__ to find frontend/build/)
RUN pip install --no-cache-dir flask gunicorn certifi python-docx

# Non-root user
RUN adduser --disabled-password --gecos '' appuser

# Copy Python source
COPY src/app/ src/app/
COPY src/artifik_mcp/ src/artifik_mcp/
COPY src/protokoll/ src/protokoll/
COPY src/eforms_labels.py src/eforms_labels.py

# Copy SvelteKit build output (app/__init__.py resolves ../frontend/build)
COPY --from=frontend /app/src/frontend/build src/frontend/build

ENV PYTHONPATH=/app/src
USER appuser
CMD ["gunicorn", "app:create_app()", "-b", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0"]
