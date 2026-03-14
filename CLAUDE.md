# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Norwegian public procurement system (anskaffelsessystem) with three layers: an MCP server for AI-assisted procurement analysis, a Flask web app serving a SvelteKit frontend, and a protokoll generator for regulatory compliance documents.

All UI text and documentation is in **Norwegian (bokmål)**.

## Commands

### Frontend (SvelteKit)

```bash
cd src/frontend
npm run dev          # Dev server on :5173 (proxies /api → Flask :5000)
npm run build        # Production build (adapter-static → build/)
npm run check        # Type-check (svelte-kit sync + svelte-check)
```

Type-check with error threshold only:
```bash
cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error
```

### Python Backend

```bash
# Flask dev server
PYTHONPATH=src flask --app app run --port 5000

# Protokoll generator
PYTHONPATH=src python -m protokoll --id 1795    # specific procurement
PYTHONPATH=src python -m protokoll --list        # list available

# MCP server (stdio)
PYTHONPATH=src python -m artifik_mcp

# Linting
ruff check src/ tests/
ruff format src/ tests/

# Tests
pytest tests/
pytest tests/test_eforms_parser.py -v           # single file
pytest tests/test_eforms_parser.py::test_name -v  # single test
```

### Deploy

```bash
./deploy-web.sh      # Cloud Build → Cloud Run (web app)
./deploy.sh          # Cloud Build → Cloud Run (MCP server)
```

## Architecture

### Three deployment targets, one repo

```
Cloud Run (web)                    Cloud Run (MCP)
┌─────────────────────┐           ┌──────────────────┐
│ Flask (/api/*)      │           │ MCPServer (stdio) │
│ SvelteKit (/* SPA)  │           │ ArtifikClient     │
└─────────────────────┘           │ DoffinClient      │
                                  └──────────────────┘
```

Both share `ArtifikClient` (`src/app/client.py`) and `DoffinClient` (`src/app/doffin.py`).

**Docker:** Multi-stage build — Node 22 builds SvelteKit static files, Python 3.11-slim runs Flask+Gunicorn. `PYTHONPATH=/app/src`. The web app serves the SPA at `src/frontend/build/` with index.html fallback.

### Python modules (`src/`)

- **`app/`** — Flask application factory (`create_app()`). Serves SvelteKit build as SPA + `/api` blueprint. `client.py` is the Artifik External API client with OAuth2 client credentials. `doffin.py` is the Doffin/eForms API client. `eforms.py` parses eForms XML into structured dataclasses.
- **`artifik_mcp/`** — MCP server (JSON-RPC over stdio, HTTP on Cloud Run). Auto-registers tools from `@mcp_tool`-decorated methods on ArtifikClient/DoffinClient. `proxy.py` bridges local stdio to Cloud Run HTTP with GCP IAM + `X-MCP-Token` two-layer auth.
- **`protokoll/`** — Anskaffelsesprotokoll generator. `docx_del2.py` (national/under EØS) and `docx_del3.py` (EØS) build Word documents with `python-docx`. `common.py` has shared formatters and activity parsers.
- **`analyse/`** — Portfolio analytics CLI (CSV/JSON export from eForms data).

### Frontend (`src/frontend/`)

SvelteKit 2 with Svelte 5, adapter-static (SPA mode, `ssr: false` in `+layout.ts`). Flask serves the build output. Vite dev server proxies `/api` to Flask on `:5000`.

**Routes:**
- `/` — redirects to `/evaluering`
- `/anskaffelser` — procurement list from API
- `/evaluering` — main evaluation workspace (scoring matrix, ranking, insights)
- `/evaluering/ny` — evaluation setup (import, configure suppliers/criteria)

**Key architectural decisions (ADR-003):**
- Svelte 5 runes (`$state`, `$derived`) for cascading evaluation matrix calculations
- No `$effect` for computation — only `$derived`. `$effect` reserved for true side effects (API calls, DOM)
- Class-based stores in `.svelte.ts` files (module-level singleton pattern)
- Custom design system ("Analysebordet") with CSS custom properties, no component library

**Store pattern** (`src/frontend/src/lib/stores/evaluation.svelte.ts`):
- Single `EvaluationStore` class with `$state` for mutable data, `$derived` for all computed layers
- Computed chain: scores → itemScores → groupScores → totals → ranking → priceDeductions → evaluatedPrices
- Mutation via methods (`setScore`, `setNote`, `addItem`, etc.), never direct state assignment from outside
- Two evaluation methods: poengmodell (quality points) and prismodell (price with quality deductions)
- Item-level evaluation: sub-criteria can have `evaluationType: 'item'` with nested items scored on multiple dimensions, aggregated upward via `AggregationMethod` ('average' | 'minimum')
- **Composition:** Large stores decomposed into delegate modules (`evaluation-computations.ts`, `evaluation-helpers.ts`, `evaluation-items.ts`, `evaluation-roles.ts`, `evaluation-structure.ts`). Store class keeps public API, delegates to pure functions. See `docs/plans/2026-03-13-reduce-complexity-evaluation.md`.

**Design system** (`.interface-design/system.md`):
- Direction: "Analysebordet" — dense, number-forward, financial analysis aesthetic
- Dark mode with cool dark blue surfaces, amber weight accent ("vektlinjen")
- Tokens in `src/frontend/src/lib/tokens.css` — custom properties for colors, spacing (4px grid), typography (JetBrains Mono for data, Inter for UI), radius
- Depth: borders-only, no shadows
- Score thresholds: `>=7` high (green), `>=4` mid (neutral), `<4` low (rose)

### External APIs

- **Artifik** (`api.artifik.no`) — procurement data, activities, contracts. OAuth2 client credentials from GCP Secret Manager (`vendor-api-id`, `vendor-api-key`).
- **Doffin** — Norwegian procurement notices. eForms XML parsing for award criteria, selection criteria, contract nature. API key from GCP Secret Manager (`doffin-api-key`). Cache: `.cache/eforms/` (JSON, keyed by doffin_id).

## Svelte 5 Reference

Key Svelte 5 docs relevant to this project's patterns. Consult these before generating Svelte code.

**Runes (core reactivity):**
- `$state`: https://svelte.dev/docs/svelte/$state — deep reactive state via proxies. Use only POJOs, not classes, for reactive data. Use `$state.snapshot()` before serialization, `$state.raw` for read-only datasets.
- `$derived` / `$derived.by`: https://svelte.dev/docs/svelte/$derived — all computed values. `$derived.by(() => ...)` for multi-statement computations. Never use `$effect` for calculations.
- `$effect`: https://svelte.dev/docs/svelte/$effect — only for true side effects (API calls, DOM, localStorage). Never update `$state` inside `$effect` without `untrack`. `$effect.root()` for effects outside component lifecycle.
- `$bindable`: https://svelte.dev/docs/svelte/$bindable — two-way binding in custom components.
- `$inspect`: https://svelte.dev/docs/svelte/$inspect — debugging reactive values. `$inspect.trace()` for tracing updates.

**Snippets (replaces slots):**
- `{#snippet}` + `{@render}`: https://svelte.dev/docs/svelte/snippet — reusable markup blocks within/between components. Typed via `Snippet<[ParamTypes]>` from `'svelte'`. Used for shared markup (weight editors, score cells) across mode-specific components.

**Store composition pattern:**
- Runes work in `.svelte.ts` files. Pure computation functions go in regular `.ts` files — the store wraps them in `$derived`.
- Class-based singleton: export `const store = new StoreClass()` at module level.
- Break large stores into focused delegate modules with pure functions taking `data` as parameter.
- `$derived` is shallow-reactive — pass all dependencies as explicit arguments to extracted functions.
- Migration guide: https://svelte.dev/docs/svelte/v5-migration-guide

## Conventions

- Derived scores display with `.toFixed(1)`, integer scores as-is
- Frontend components use scoped `<style>` with CSS custom properties from `tokens.css`
- Python uses `ruff` for linting/formatting, no type checker configured
- No test framework configured for frontend yet
- ADRs live in `docs/adr-*.md`, implementation plans in `docs/plans/`
- Interface design specs and critiques live in `.interface-design/`
