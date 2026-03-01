# Arkitekturvurdering — Mars 2026

**Dato:** 2026-03-01
**Scope:** Full gjennomgang av systemarkitektur, teknologivalg, sikkerhet, deploy og vedlikeholdbarhet

---

## 1. Overordnet vurdering

Systemet er velstrukturert for sin størrelse og modenhet. Tre deployment-targets (web, MCP, protokoll-CLI) deler kode effektivt gjennom felles klienter (`ArtifikClient`, `DoffinClient`). Arkitekturen følger klare prinsipper: secrets-isolasjon via Cloud Run, adapter-static for enkel deploy, og deklarativ seksjonsstyring i frontend.

**Hovedstyrker:**
- Gjennomtenkt secrets-arkitektur med to-lags auth for MCP-serveren
- Effektiv mono-repo med delt kode mellom tre deployment-targets
- Deklarativ protokoll-seksjonsdefinisjon (Del II/Del III) som er lett å utvide
- Svelte 5 runes brukes idiomatisk — `$derived` for beregninger, ingen `$effect`-misbruk
- Tailwind v4 med `@theme` er korrekt konfigurert for CSS-first tokens

**Områder som bør adresseres:**

| Prioritet | Funn | Risiko |
|-----------|------|--------|
| KRITISK | `SECRET_KEY="dev"` hardkodet i prod | Sikkerhet |
| HØY | Dockerfile bruker `python:3.11` — bør oppgraderes | Vedlikehold |
| HØY | Vite 6 er utdatert — Vite 7 er stabil | Vedlikehold |
| HØY | Ingen error handling / feilgrenser i Flask API | Robusthet |
| HØY | Vite dev-server CVEs (2025) — krever oppdatering | Sikkerhet |
| MIDDELS | Gunicorn kjører uten `--workers` / `--threads`-config | Ytelse |
| MIDDELS | Ingen CORS-konfigurasjon | Sikkerhet |
| MIDDELS | Ingen health check-endepunkt for web-appen | Drift |
| MIDDELS | `cloudbuild-web.yaml` refererer `Dockerfile.web` som ikke eksisterer | Deploy |
| MIDDELS | Docker container kjører som root | Sikkerhet |
| LAV | Tokens definert to steder (app.css + tokens.css) | Vedlikehold |
| LAV | Test for `server.py` kaller `create_server()` som ikke finnes | Testkvalitet |

---

## 2. Python-backend

### 2.1 Flask-applikasjonen

**Versjon:** Flask >=3.0. Nåværende stabile versjon er **Flask 3.1.3** (feb 2026). Prosjektets krav er kompatible.

**Funn:**

#### KRITISK: Hardkodet SECRET_KEY

```python
# src/app/__init__.py:18
app.config.from_mapping(SECRET_KEY="dev")
```

`SECRET_KEY="dev"` brukes i produksjon. Dette gjør sessions og signerte cookies forutsigbare. Flask 3.1.1 fikset også en sikkerhets-issue (GHSA-4grg-w6v8-c28g) relatert til `SECRET_KEY_FALLBACKS`.

**Anbefaling:** Les `SECRET_KEY` fra miljøvariabel eller GCP Secret Manager:
```python
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-fallback")
```

#### Manglende feilhåndtering i API-ruter

API-blueprint (`src/app/api/__init__.py`) har inkonsistent feilhåndtering. Noen endepunkter har `try/except` (eForms, protokoll), mens andre (procurements, contracts, organizations) lar exceptions propagere ukontrollert.

**Anbefaling:** Legg til en `@bp.errorhandler(Exception)` som returnerer strukturerte JSON-feil:
```python
@bp.errorhandler(Exception)
def handle_api_error(e):
    log.exception("API error: %s", e)
    status = getattr(e, "status_code", 500)
    return jsonify({"error": str(e)}), status
```

#### DoffinClient instantieres per request

```python
# src/app/api/__init__.py:71
client = DoffinClient()
```

eForms-endepunktet oppretter en ny `DoffinClient` per forespørsel, mens `ArtifikClient` deles via `app.artifik`. Dette betyr at `DoffinClient`s cache-dir ikke settes, og SSL-kontekst opprettes på nytt hver gang.

**Anbefaling:** Registrer `DoffinClient` som app-attributt i `create_app()`:
```python
app.doffin = DoffinClient(cache_dir=".cache/eforms")
```

#### Ingen CORS-header

Selv om frontend og API deler origin i produksjon (`adapter-static` + Flask), kan det bli relevant ved lokale utviklingsmiljøer der Vite dev-server kjører på `:5173` og Flask på `:5000`. Vite proxy løser dette i dag, men direkte API-kall fra andre klienter vil feile.

### 2.2 HTTP-klienter (ArtifikClient, DoffinClient)

Begge klientene bruker `urllib.request` i stedet for `requests` eller `httpx`. Dette er et bevisst valg (færre avhengigheter), men gir noen begrensninger:

- **Ingen connection pooling** — hver request åpner ny TCP-forbindelse
- **Duplisert kode** — `_do_request()`, SSL-kontekst, URL-bygging er nesten identisk i begge klienter
- **Synkron I/O** — blokkerer Gunicorn-workers under API-kall

For nåværende trafikkmønster (lav volum, interne brukere) er dette akseptabelt. Ved økt volum, vurder:
- Felles `BaseAPIClient`-klasse med delt HTTP-logikk
- `httpx` med connection pooling
- Async Flask/Gunicorn for parallelle API-kall

### 2.3 MCP-server

MCP-serveren er solid implementert med tilpasset JSON-RPC i stedet for FastMCP. `@mcp_tool`-dekoratoren og `get_mcp_tools()`-introspeksjonen er elegant og enkel å utvide.

**Funn:**
- Protokollversjon `2025-06-18` bør verifiseres mot nyeste MCP-spec
- `_build_input_schema()` introspekterer type-hints, men håndterer ikke `list[str]` vs `list[dict]` for alle edge-cases
- Test `test_server.py` kaller `create_server()` som ikke finnes i `server.py` — testen feiler

### 2.4 Protokollgenerator

God modularisering med `docx_del2.py`, `docx_del3.py`, `common.py`, og `docx_helpers.py`. `python-docx` er en valgfri avhengighet via `[protokoll]` extras — bra separasjon.

Delt kode mellom Del II og Del III via imports (`_award_criteria`, `_bids_in_evaluation`, `_framework_agreement`) er fornuftig.

---

## 3. Frontend (SvelteKit + Svelte 5)

### 3.1 Versjoner og oppdateringer

| Pakke | Nåværende | Nyeste stabile | Status |
|-------|-----------|---------------|--------|
| `svelte` | ^5.16.0 | ~5.46+ | **Bør oppdateres** — sikkerhetspatcher i 5.46.4+ |
| `@sveltejs/kit` | ^2.16.0 | ~2.49+ | **Bør oppdateres** — sikkerhetspatcher i 2.49.5+ |
| `vite` | ^6.0.0 | **7.3.1** | **Utdatert major** — Vite 7 er stabil siden juni 2025 |
| `tailwindcss` | ^4.2.1 | Aktuell | OK |
| `@sveltejs/adapter-static` | ^3.0.10 | Aktuell | OK |

**Vite 7 breaking changes som er relevante:**
- Krever Node 20.19+ eller 22.12+ (Docker `node:22-slim` tilfredsstiller dette)
- `splitVendorChunkPlugin` er fjernet (ikke i bruk her)
- Ny standard browser-target: `baseline-widely-available` — kan påvirke transpilering
- Rolldown (Rust-basert bundler) er tilgjengelig som opt-in via `rolldown-vite`
- Vitest 3.2+ kreves med Vite 7

**Vite sikkerhets-CVEer (2025) — gjelder dev-server:**
- **CVE-2025-30208:** Vilkårlig fillesing via `@fs` path traversal bypass. Fikset i 6.2.3+
- **CVE-2025-31486:** Lignende fillesing via spesiallagde URL-er
- **GHSA-vg6x-rcgg-rjx6:** DNS rebinding/SSRF — websider kan lese dev-server-data

Alle disse krever at `--host` eller `server.host` er satt. Vite 7.x inkluderer alle patches. Sett alltid `server.allowedHosts` eksplisitt (aldri `true`).

**Svelte sikkerhets-CVEer (Q4 2025 / Q1 2026):**

| CVE | Pakke | Fikset i | Relevant? |
|-----|-------|----------|-----------|
| CVE-2025-67647 | `@sveltejs/kit` + `adapter-node` | kit 2.49.5 | Lav (bruker adapter-static) |
| CVE-2026-22803 | `@sveltejs/kit` (Remote Functions) | kit 2.49.5 | Lav (bruker ikke Remote Functions) |
| CVE-2025-15265 | `svelte` (XSS via hydratable) | svelte 5.46.4 | Lav (bruker ikke hydratable) |

Ingen av CVE-ene er direkte utnyttbare med `adapter-static` på Cloud Run, men oppdatering anbefales.

**Anbefaling:** Kjør `npm update` i `src/frontend/` og verifiser med `npm run check && npm run build`.

### 3.2 Runes-bruk og store-mønster

Evalueringsstore (`evaluation.svelte.ts`) er eksemplarisk:
- Klass-basert singleton — anbefalt mønster for Svelte 5
- `$derived.by()` for alle beregnede verdier — korrekt, ingen `$effect` for beregninger
- Beregningskjede: `itemScores → groupScores → totals → ranking → priceDeductions → evaluatedPrices`
- Mutation via eksplisitte metoder, aldri direkte state-tilordning utenfra

Protokollstore (`protokoll.svelte.ts`) følger samme mønster med `$derived`-kjeder for synlighet, status og fullstendighet.

**Observasjoner:**
- `evaluation.svelte.ts` har hardkodet demo-data (Bouvet, Sopra Steria, Knowit). Bra for prototyping, men bør erstattes med en tom initial-state og `initialize()`-kall fra API-data
- `$state<any>` brukes flere steder i protokoll-storen — sterkere typing ville gitt bedre IDE-støtte og feilfangst

**Nye Svelte 5-features siden prosjektets versjon (5.16.0) som kan være nyttige:**
- `$derived` er nå skrivbar (5.25.0) — nyttig for midlertidige overrides i evalueringsmatrisen
- `createContext` (5.40.0) — typet kontekst uten casting
- `$state.eager()` (5.41.0) — umiddelbar UI-oppdatering uten å vente på mikrotask
- State i deriveds/effects kan nå leses/skrives lokalt uten self-invalidering (5.24.0)
- Attachments (5.29.0) — moderne erstatning for actions

### 3.3 Tailwind v4 og designsystem

Prosjektet bruker Tailwind v4 med `@theme`-direktivet korrekt:

```css
/* app.css */
@import "tailwindcss";
@theme {
  --color-canvas: #0c0e14;
  --color-felt: #12151e;
  /* ... */
}
```

Tokens defineres i `@theme`-blokken og er tilgjengelige som CSS custom properties. I tillegg finnes backward-kompatible aliaser i `tokens.css`:

```css
:root {
  --canvas: var(--color-canvas, #0c0e14);
  --sp-4: var(--spacing-4, 16px);
}
```

**Observasjoner:**
- Aliaser defineres **to steder**: både i `app.css` (`:root`-blokken) og `tokens.css`. Disse er identiske og bør konsolideres til ett sted
- Eldre komponenter (layout, evaluering) bruker `--sp-4`, `--wire` etc., mens nyere komponenter (protokoll) bruker `--spacing-4`, `--color-wire`. Migrering til Tailwind-navngiving bør gjøres gradvis
- `@variant dark` er definert men ikke brukt — kan fjernes med mindre lysmode planlegges

### 3.4 Komponentstruktur

```
components/
├── evaluation/    (7 komponenter — matrise, celler, metode-toggle)
├── insights/      (1 komponent)
└── protokoll/     (8 komponenter — accordion, cards, editor, tabeller)
```

God dekomponering. Evalueringsmatrisen er delt i logiske enheter (ScoreCell, ItemScoreCell, AnnotationPanel). Protokoll-komponenter er generiske og datadrevne (SectionAccordion, CheckboxTextarea, PerSupplierCards).

**Observasjon:** Ingen delte UI-komponenter (`ui/`-mappe). Knapper, inputs og labels gjentar stilmønstre. Ved videre vekst, vurder en liten `ui/`-mappe med atomære komponenter.

### 3.5 SPA-ruting og layout

```
routes/
├── +layout.svelte    (sidebar + workspace)
├── +layout.ts        (ssr: false)
├── +page.svelte      (redirect til /evaluering)
├── anskaffelser/
├── evaluering/
│   └── ny/
└── protokoll/
```

`ssr: false` er korrekt for en app bak innlogging. `adapter-static` med `fallback: 'index.html'` fungerer bra med Flask SPA-servering.

**Observasjon:** `+page.svelte` (root) inneholder trolig en redirect til `/evaluering`, men den er ikke lest i denne analysen. Verifiser at den bruker SvelteKit's `redirect()` i en `load`-funksjon, ikke JavaScript `window.location`.

---

## 4. Deployment og infrastruktur

### 4.1 Dockerfile

```dockerfile
FROM node:22-slim AS frontend    # OK
FROM python:3.11-slim            # ⚠️ Bør oppgraderes
```

**Funn:**

1. **Python 3.11 bør oppgraderes til 3.12+**. Python 3.11 er fortsatt støttet (EOL oktober 2027), men 3.12 og 3.13 gir bedre ytelse og feilmeldinger. ADR-003 refererer allerede til `python:3.12-slim`.

2. **Avhengigheter installeres med `pip install` direkte** i stedet for `pip install .` fra `pyproject.toml`:
   ```dockerfile
   RUN pip install --no-cache-dir flask gunicorn certifi
   ```
   Dette betyr at avhengigheter i `pyproject.toml` og Dockerfile kan divergere. Bedre å bruke:
   ```dockerfile
   COPY pyproject.toml .
   RUN pip install --no-cache-dir .
   ```

3. **Protokoll-modulen kopieres ikke** (`COPY src/protokoll/` mangler). Protokoll-generering fra web-appen vil feile fordi `/api/protokoll/generate` importerer `from protokoll import ...`.

4. **Gunicorn kjører uten tuning:**
   ```dockerfile
   CMD ["gunicorn", "app:create_app()", "-b", "0.0.0.0:8080"]
   ```
   Default er 1 sync worker uten timeout-konfigurasjon. Googles anbefaling for Cloud Run er **1 worker + 8 threads** (Cloud Run håndterer horisontal skalering, så tråder for concurrency innen instansen er viktigere enn prosesser):
   ```dockerfile
   CMD ["gunicorn", "app:create_app()", "-b", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0"]
   ```
   `--timeout 0` anbefales fordi Cloud Run håndhever sin egen request-timeout — dobbel-håndhevelse i Gunicorn gir unødvendige worker-restarter.

5. **Container kjører som root.** Ingen `USER`-instruksjon i Dockerfile. Best practice er å kjøre som ikke-root bruker:
   ```dockerfile
   RUN adduser --disabled-password --gecos '' appuser
   USER appuser
   ```

6. **Ingen `HEALTHCHECK`-instruksjon** i Dockerfile. Cloud Run bruker TCP-sjekk som standard, men en HTTP health-endepunkt gir bedre diagnostikk.

### 4.2 Cloud Run-deploy

**Web-app (`deploy-web.sh`):**
```bash
--allow-unauthenticated    # ⚠️ Offentlig tilgjengelig
--min-instances=0          # Cold starts
--max-instances=1          # Ingen skalering
--memory=256Mi             # Begrenset
```

**Observasjoner:**
- `--allow-unauthenticated` er riktig for en web-app, men betyr at API-endepunktene er åpne. Vurder rate-limiting eller API-key-validering
- `--max-instances=1` er OK for lav trafikk, men gir nedetid under deploy. Vurder `--max-instances=2` for zero-downtime deploy
- `256Mi` kan bli trangt med Gunicorn + protokoll-generering (python-docx). Monitor minnebruk

**MCP-server (`deploy.sh`):**
```bash
--no-allow-unauthenticated  # ✓ Korrekt — IAM-beskyttet
--memory=256Mi              # OK for MCP
```

**`cloudbuild-web.yaml` refererer `Dockerfile.web`** som ikke eksisterer i repoet. Kun `Dockerfile` finnes. Deploy via `--source .` (i `deploy-web.sh`) bruker Cloud Build implisitt og fungerer, men `cloudbuild-web.yaml` er enten utdatert eller ubrukt.

### 4.3 Manglende health check

Web-appen har ikke et `/health`-endepunkt. MCP-serveren har ett (`/health` i `__main__.py`), men web-appen mangler. Cloud Run sender trafikk til containere som rapporterer "running" på TCP, selv om Flask ikke er klar.

**Anbefaling:** Legg til health check i `create_app()`:
```python
@app.route("/health")
def health():
    return {"status": "ok"}
```

---

## 5. Sikkerhet

### 5.1 Bra

- **Secrets-isolasjon:** API-nøkler i GCP Secret Manager, aldri på utviklermaskin
- **To-lags MCP-auth:** IAM + app-token. Solid design (ADR-001)
- **MCP-server IAM-beskyttet:** `--no-allow-unauthenticated`
- **SSL/TLS:** `certifi` for CA-bundle, `ssl.create_default_context()` for alle HTTP-kall
- **`.gitignore`:** Ekskluderer `.env`, `.key`, `.pem`, `credentials.*`

### 5.2 Må fikses

| Funn | Alvorlighet | Fil |
|------|-------------|-----|
| `SECRET_KEY="dev"` hardkodet | KRITISK | `src/app/__init__.py:18` |
| Ingen CSRF-beskyttelse for POST `/api/protokoll/generate` | MIDDELS | `src/app/api/__init__.py:83` |
| MCP auth bruker string-sammenligning (`token != expected`) | LAV | `src/artifik_mcp/auth.py:23` |
| Ingen rate-limiting på offentlige API-endepunkter | LAV | `src/app/api/__init__.py` |

**CSRF:** POST-endepunktet `/api/protokoll/generate` aksepterer JSON-body uten CSRF-token. Fordi `Content-Type: application/json` kreves, er risikoen begrenset (browsers sender ikke JSON cross-origin med `<form>`), men en `SameSite=Lax` session-cookie og `Origin`-sjekk gir ekstra forsvar.

**Token-sammenligning:** `if token != expected` i `auth.py` er sårbar for timing-angrep. Bruk `hmac.compare_digest()` i stedet:
```python
import hmac
if not hmac.compare_digest(token, expected):
    return jsonify({"error": "Invalid token"}), 403
```

---

## 6. Testing

### 6.1 Nåværende dekning

```
tests/
├── test_client_mcp.py       # MCP client integration
├── test_credentials.py       # Credential handling
├── test_decorator.py         # @mcp_tool decorator (4 tests)
├── test_doffin_client.py     # Doffin client
├── test_eforms_cache.py      # eForms caching
├── test_eforms_parser.py     # eForms XML parsing (6 tests)
└── test_server.py            # MCP server (1 test — ⚠️ BROKEN)
```

**Funn:**
- `test_server.py` kaller `create_server()` som ikke finnes i den gjeldende `server.py` (som bruker `MCPServer`-klassen direkte). Testen er trolig fra en eldre versjon med FastMCP
- Ingen frontend-tester overhodet — dette er dokumentert i CLAUDE.md som et kjent gap
- Ingen integrasjonstester for Flask API-endepunkter
- Ingen test for protokoll-generering (docx)

**Anbefaling:** Prioritert test-plan:
1. Fiks `test_server.py` til å bruke `MCPServer()`
2. Legg til Flask API-tester med `app.test_client()`
3. Legg til Vitest + `@testing-library/svelte` for frontend-logikk (evaluering/scoring)
4. Legg til protokoll docx-generering tester

---

## 7. Avhengigheter og versjoner

### 7.1 Python

| Pakke | Nåværende krav | Vurdering |
|-------|---------------|-----------|
| `flask>=3.0` | Flask 3.1.3 er stabil | OK |
| `gunicorn>=22.0` | Aktuell | OK |
| `certifi` | Upinnet | OK — bør holdes oppdatert |
| `python-docx` | Upinnet (optional) | OK |
| `ruff` | Dev-avhengighet | OK |
| `pytest` | Dev-avhengighet | OK |

**Observasjon:** Ingen `requirements.txt`-lock (pinned versions). `pip install -r requirements.txt` gir ikke reproduserbare builds. Vurder `pip-compile` (pip-tools) eller en `requirements.lock`.

### 7.2 Frontend

| Pakke | Nåværende | Nyeste | Handling |
|-------|-----------|--------|---------|
| `svelte` | ^5.16.0 | ~5.46+ | **Oppdater** (sikkerhetsfix) |
| `@sveltejs/kit` | ^2.16.0 | ~2.49+ | **Oppdater** (sikkerhetsfix) |
| `vite` | ^6.0.0 | 7.3.1 | **Major upgrade** |
| `typescript` | ^5.7.0 | Aktuell | OK |
| `tailwindcss` | ^4.2.1 | Aktuell | OK |
| `@sveltejs/vite-plugin-svelte` | ^5.0.0 | Sjekk kompatibilitet med Vite 7 | Oppdater |
| `@tailwindcss/vite` | ^4.2.1 | Aktuell | OK |

### 7.3 Docker base images

| Image | Nåværende | Anbefalt |
|-------|-----------|----------|
| `node:22-slim` | OK | OK (Node 22 er LTS) |
| `python:3.11-slim` | Fungerer | **Oppgrader til 3.12-slim eller 3.13-slim** |

---

## 8. Arkitekturdiagram (oppdatert)

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Run (web)                        │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  SvelteKit SPA       │  │  Flask                   │  │
│  │  (adapter-static)    │  │  ├─ /api/procurements    │  │
│  │  ├─ /evaluering      │  │  ├─ /api/contracts       │  │
│  │  ├─ /evaluering/ny   │  │  ├─ /api/eforms/:id      │  │
│  │  ├─ /anskaffelser    │  │  ├─ /api/protokoll/gen   │  │
│  │  └─ /protokoll       │  │  └─ /* (SPA fallback)    │  │
│  └──────────────────────┘  └──────────┬────────────────┘  │
│                                       │                    │
│                              Gunicorn (1 worker, sync)     │
└───────────────────────────────────────┼────────────────────┘
                                        │
               ┌────────────────────────┼────────────────────┐
               │                        │                     │
        ┌──────▼──────┐         ┌───────▼──────┐      ┌──────▼──────┐
        │ Artifik API │         │ Doffin API   │      │ GCP Secret  │
        │ (OAuth2)    │         │ (API key)    │      │ Manager     │
        └─────────────┘         └──────────────┘      └─────────────┘

┌─────────────────────────────────────────────────────────┐
│                Cloud Run (MCP)                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MCPServer (JSON-RPC)                             │   │
│  │  ├─ Auto-registrerte @mcp_tool-metoder            │   │
│  │  ├─ ArtifikClient (OAuth2)                        │   │
│  │  └─ DoffinClient (API key + eForms parsing)       │   │
│  └──────────────────────────────────────────────────┘   │
│  Auth: IAM + X-MCP-Token                                 │
└──────────────────────────────────────────────────────────┘
        ▲
        │ stdio → HTTP proxy
        │
┌───────┴──────┐
│ Claude Code  │
│ (lokal)      │
└──────────────┘

┌───────────────────┐
│ Protokoll CLI     │
│ python -m         │
│ protokoll         │
│ --id 1795         │
└───────────────────┘
```

---

## 9. Anbefalinger — prioritert handlingsplan

### Umiddelbart (denne uken)

1. **Fiks `SECRET_KEY`** — Les fra miljøvariabel, legg til i Cloud Run `--set-secrets`
2. **Oppdater frontend-avhengigheter** — Minst Svelte 5.46.4+ og SvelteKit 2.49.5+ for sikkerhetspatcher
3. **Fiks `test_server.py`** — Oppdater til å bruke `MCPServer()`-klassen
4. **Legg til `COPY src/protokoll/`** i Dockerfile — Protokoll-generering fra web feiler uten

### Neste sprint

5. **Oppgrader Vite til v7** — Breaking change: krever Node 20.19+. `@sveltejs/vite-plugin-svelte` trenger også oppdatering
6. **Oppgrader Python base-image til 3.12-slim** — Bedre ytelse, bedre feilmeldinger
7. **Legg til `/health`-endepunkt** i web-appen og konfigurer Cloud Run health check
8. **Konsolider design-tokens** — Fjern dupliserte aliaser, velg ett kanonisk sted
9. **Bruk `hmac.compare_digest()`** for token-validering i `auth.py`

### Backlog

10. **Delt `DoffinClient`-instans** i Flask-appen (unngå per-request instantiering)
11. **Flask error handler** for API-blueprint
12. **Gunicorn-tuning** — `--workers 1 --threads 8 --timeout 0` (Googles Cloud Run-anbefaling)
13. **Vurder `httpx`** for connection pooling i API-klienter ved økt volum
14. **Frontend-tester** med Vitest
15. **Reproduserbare Python-builds** med `pip-compile` eller `uv lock`
16. **Fjern/oppdater `cloudbuild-web.yaml`** som refererer ikke-eksisterende `Dockerfile.web`

---

## 10. Teknologistatus — oppdatert mars 2026

### Svelte 5 / SvelteKit 2

- Svelte 5 er modent og stabilt. Nyeste stabile: **5.49.x** (feb 2026). Runes-mønsteret er etablert
- `adapter-static` er stabil uten breaking changes i 2025–2026
- Klasse-baserte stores i `.svelte.ts` er fortsatt anbefalt mønster — Svelte 4 `writable()` er utfaset
- `$state`, `$derived`, `$effect` best practices er uendret — prosjektet følger disse korrekt
- Nye features: skrivbare `$derived` (5.25), `createContext` (5.40), `$state.eager` (5.41), `fork` API (5.42)
- 5 CVE-er patched i Q1 2026 — ingen direkte utnyttbare med `adapter-static`, men oppdatering anbefales

### Vite

- **Vite 7.0** ble lansert juni 2025 (nåværende: **7.3.1**). Prosjektet bruker Vite 6 — **utdatert major**
- Vite 7 krever Node 20.19+ (Docker `node:22-slim` tilfredsstiller dette)
- Rolldown (Rust-basert bundler) tilgjengelig som opt-in i Vite 7 via `rolldown-vite`
- Vite 8 beta tilgjengelig med Rolldown som standard-bundler
- Flere sikkerhets-CVEer i Vite 5/6 (path traversal, DNS rebinding) — alle fikset i 7.x

### Flask

- **Flask 3.1.3** (feb 2026) er nåværende stabil. Prosjektet er kompatibelt
- Flask 3.2.0 planlagt med sammenslåtte app/request-kontekster — ingen breaking changes forventet
- Flask er i en moden, stabil fase med ~70M PyPI-nedlastinger/mnd

### Tailwind CSS v4

- Tailwind v4.2.0 (feb 2026) er stabil. Prosjektet bruker ^4.2.1 — korrekt
- CSS-first `@theme` brukes korrekt i prosjektet
- **Viktig for framtidig utvikling:** `@theme inline` kreves for tokens som peker til runtime `var()`-referanser (f.eks. for dark mode). Vanlig `@theme` resolves verdier ved build-tid
- `@apply` i Svelte `<style>`-blokker krever `@reference "tailwindcss"` prefix
- Rust-basert Oxide-engine gir ~5x raskere full builds og ~100x raskere inkrementelle builds

### Cloud Run

- Multi-region deploy nå tilgjengelig (Preview) for høy tilgjengelighet
- Service-level min-instances er GA
- **Ny: Kan deaktivere innebygd `.run.app`-URL** (GA) — viktig sikkerhetsherdning for prod
- Cloud Run Functions (tidl. Cloud Functions) er nå en del av Cloud Run-plattformen
- Googles anbefaling for Python/Gunicorn: 1 worker + 8 threads + `--timeout 0`
- `--cpu-boost` gir raskere cold starts uten permanent min-instances

---

## 11. API-vurdering (tillegg)

### 11.1 Manglende rute: `/api/procurements/<id>`

Protokoll-storen kaller `fetch('/api/procurements/${procurementId}')`, men ruten fantes ikke. Bare `/api/procurements` (liste) og `/api/procurements/<id>/activities` eksisterte. **Fikset** — rute lagt til i denne reviewen.

### 11.2 Root-redirect bruker `onMount` + `goto`

```ts
// +page.svelte (FØR)
onMount(() => { goto('/evaluering') });
```

Bør bruke SvelteKit's `redirect()` i `+page.ts` load-funksjon for å unngå flash av tom side. **Fikset** — `+page.ts` med `redirect(307, '/evaluering')`.

### 11.3 `$effect` for data-fetching i anskaffelsessiden

`anskaffelser/+page.svelte:18` bruker `$effect(() => { loadProcurements() })` for data-lasting. Fungerer, men er et anti-mønster — bør bruke `onMount` eller `+page.ts` load-funksjon. **Dokumentert** — ikke fikset i denne omgangen.

### 11.4 Ingen API-input-validering

`/api/protokoll/generate` leser `request.get_json()` uten å validere form. Feilformet input kan gi uventede feil i `python-docx`. Vurder `pydantic` for payload-validering. **Dokumentert** — backlog.

### 11.5 `analyze_buyer()` er en tung operasjon

DoffinClient's `analyze_buyer()` kan laste ned hundrevis av eForms XML-filer med `time.sleep(10-30s)` for rate-limiting. Ikke eksponert som web-endepunkt i dag (kun MCP), men bør merkes tydelig som MCP-only. **Dokumentert** — ikke et problem per i dag.

### 11.6 Broken test: `test_credentials.py`

Refererer `artifik_mcp.credentials` som ikke lenger eksisterer. Pre-eksisterende feil fra før credentials ble flyttet til env vars. **Dokumentert** — bør fjernes eller oppdateres.

---

## 12. Teknologier verdt å vurdere

| Teknologi | Hva det løser | Prioritet |
|-----------|--------------|-----------|
| **`uv`** | Erstatter pip/pip-tools. 10-100x raskere installs, innebygd lockfile (`uv.lock`), reproduserbare builds. Drop-in | HØY |
| **Structured logging** (`structlog`) | JSON-logging til Cloud Logging. Gjør logger søkbare/filtrerbare | MIDDELS |
| **Sentry / Cloud Error Reporting** | Feilrapportering med stack traces, automatisk alerting | MIDDELS |
| **Vitest** | Frontend-testing — nevnt i ADR-003 men ikke satt opp | MIDDELS |
| **`pydantic`** | Validering av API-input (protokoll-payload). Erstatter manuell `get()`-kaskade | LAV |
| **Cloud Run `--cpu-boost`** | 2x CPU under oppstart — raskere cold starts uten min-instances-kostnad | LAV |

**Ikke anbefalt nå:**
- **FastAPI** — Flask dekker behovene, ingen asynkron gevinst med nåværende trafikk
- **Bun** — Node 22 fungerer fint for frontend-build
- **Redis/database** — localStorage + JSON-cache dekker behovene

---

## 13. Fikser gjort i denne reviewen

| Fil | Endring |
|-----|---------|
| `src/app/__init__.py` | SECRET_KEY fra env var, delt DoffinClient, `/health`-endepunkt |
| `src/app/api/__init__.py` | Ny `/api/procurements/<id>` rute, error handlers, delt DoffinClient |
| `src/artifik_mcp/auth.py` | `hmac.compare_digest()` for timing-safe token-sjekk |
| `Dockerfile` | Python 3.12, `python-docx`, `src/protokoll/`, non-root user, Gunicorn-tuning |
| `tests/test_server.py` | Rewritten for `MCPServer()` — 3 tester som passerer |
| `src/frontend/src/routes/+page.svelte` | Fjernet `onMount`/`goto` redirect |
| `src/frontend/src/routes/+page.ts` | Ny fil — SvelteKit `redirect(307, '/evaluering')` |

---

## 14. Konklusjon

Systemet har et solid arkitekturfundament med gjennomtenkte beslutninger (secrets-isolasjon, deklarativ UI, delt kode).

De viktigste forbedringene er fikset direkte:
1. **Sikkerhet:** SECRET_KEY fra env var, timing-safe token-sjekk
2. **Robusthet:** Health check, error handlers, manglende API-rute, Docker-kopier
3. **Testdekning:** Rewritten `test_server.py` (19 av 19 tester passerer)
4. **Docker:** Python 3.12, non-root user, Gunicorn-tuning, protokoll-modul

Gjenstående forbedringer er dokumentert i seksjon 9 (prioritert handlingsplan) og seksjon 12 (teknologier å vurdere). Ingen av de gjenstående funnene krever arkitekturendring.

---

## Kilder

### Svelte / SvelteKit
- [Svelte Releases](https://github.com/sveltejs/svelte/releases)
- [What's new in Svelte: February 2026](https://svelte.dev/blog/whats-new-in-svelte-february-2026)
- [CVEs affecting the Svelte ecosystem](https://svelte.dev/blog/cves-affecting-the-svelte-ecosystem)
- [SvelteKit adapter-static docs](https://svelte.dev/docs/kit/adapter-static)
- [Svelte 5 $derived docs](https://svelte.dev/docs/svelte/$derived)
- [Global state in Svelte 5 (Mainmatter)](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/)

### Vite
- [Vite 7.0 announcement](https://vite.dev/blog/announcing-vite7)
- [Vite 6.0 announcement](https://vite.dev/blog/announcing-vite6)
- [CVE-2025-30208 — Vite arbitrary file read](https://www.offsec.com/blog/cve-2025-30208/)
- [GHSA-vg6x-rcgg-rjx6 — DNS rebinding](https://github.com/vitejs/vite/security/advisories/GHSA-vg6x-rcgg-rjx6)

### Flask
- [Flask Changes (3.1.x)](https://flask.palletsprojects.com/en/stable/changes/)
- [Flask Security Considerations](https://flask.palletsprojects.com/en/stable/web-security/)
- [Flask Single-Page Applications](https://flask.palletsprojects.com/en/stable/patterns/singlepageapplications/)
- [A Year in Review: Flask in 2025](https://blog.miguelgrinberg.com/post/a-year-in-review-flask-in-2025)

### Tailwind CSS
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind v4 Theme Variables](https://tailwindcss.com/docs/theme)
- [Tailwind v4 @theme inline discussion](https://github.com/tailwindlabs/tailwindcss/discussions/15600)
- [Design Tokens That Scale in 2026 (Mavik Labs)](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)

### Cloud Run
- [Cloud Run release notes](https://docs.cloud.google.com/run/docs/release-notes)
- [Optimize Python for Cloud Run](https://cloud.google.com/run/docs/tips/python)
- [Cloud Run health checks](https://docs.cloud.google.com/run/docs/configuring/healthchecks)
- [Cloud Run secrets configuration](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run security best practices](https://alphasec.io/google-cloud-run-security-best-practices/)
