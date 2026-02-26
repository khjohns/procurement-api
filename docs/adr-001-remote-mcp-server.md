# ADR-001: Remote MCP-server på Cloud Run

**Status:** Godkjent
**Dato:** 2026-02-17
**Oppdatert:** 2026-02-26

## Kontekst

Claude Code bruker MCP-verktøy (Model Context Protocol) for å kalle Artifik API på vegne av brukeren. Opprinnelig kjørte MCP-serveren lokalt som en stdio-prosess. API-nøkler lå i macOS Keychain, men Claude hadde shell-tilgang til samme maskin og kunne potensielt omgå sikkerhetshookene.

## Beslutning

Flytte MCP-serveren til Google Cloud Run slik at secrets aldri finnes på Claudes maskin. En lokal stdio-proxy håndterer GCP IAM-autentisering og videresender forespørsler til Cloud Run.

## Arkitektur

```
Claude Code ──stdio──▶ proxy.py (lokal)
                          │
                          ├─ Authorization: Bearer <GCP identity token>
                          ├─ X-MCP-Token: <app-token>
                          │
                          ▼
                    Cloud Run (artifik-mcp) ──OAuth2──▶ Artifik API
                          │
                          ▼
                   GCP Secret Manager
                   ├─ vendor-api-id
                   ├─ vendor-api-key
                   └─ mcp-auth-token
```

### Autentisering (to uavhengige lag)

| Lag | Header | Hva det sjekker | Hvem styrer |
|-----|--------|-----------------|-------------|
| **Cloud Run IAM** | `Authorization: Bearer <identity-token>` | Er kalleren en GCP-bruker med `run.invoker`-rolle? | Google IAM |
| **App-level** | `X-MCP-Token` | Har kalleren MCP-tilgangsnøkkelen? | Secret Manager |

1. **Cloud Run IAM:** `--no-allow-unauthenticated` krever et gyldig GCP identity token. Proxyen henter dette via `gcloud auth print-identity-token`, som bruker operatørens Google-konto.
2. **App-level:** `X-MCP-Token`-headeren sjekkes mot `MCP_AUTH_TOKEN` env var i containeren. Hindrer at GCP-brukere uten MCP-tokenet kan kalle endepunktet.

Begge lag må passere. Selv om MCP-tokenet lekker, kreves også GCP-kontoautentisering. Selv om noen har GCP-tilgang, trenger de MCP-tokenet i tillegg.

### Secrets-flyt

- **GCP Secret Manager** → injiseres som env vars i containeren via `--set-secrets`
- **Cloud Run service account** har `secretmanager.secretAccessor`-rollen
- **Claude** ser aldri API-nøkler — kun MCP-verktøyenes JSON-svar

## Komponenter

| Komponent | Fil | Rolle |
|-----------|-----|-------|
| MCP-server | `src/artifik_mcp/server.py` | Custom JSON-RPC handler med auto-registrering av `@mcp_tool`-metoder |
| HTTP-transport | `src/artifik_mcp/__main__.py` | Flask-app med `--remote` flag, POST `/mcp` |
| App auth | `src/artifik_mcp/auth.py` | Middleware som sjekker `X-MCP-Token`-header |
| Stdio-proxy | `src/artifik_mcp/proxy.py` | Lokal bro: stdio → HTTP med GCP identity token + MCP-token |
| Container | `Dockerfile` | python:3.11-slim, pip install fra pyproject.toml |
| Klient-config | `.claude/mcp.json` | Stdio-transport via proxy (ikke committet med token-verdi) |

## Deploy

```bash
gcloud run deploy artifik-mcp \
  --source . \
  --region europe-north1 \
  --set-secrets=VENDOR_API_ID=vendor-api-id:latest,VENDOR_API_KEY=vendor-api-key:latest,MCP_AUTH_TOKEN=mcp-auth-token:latest \
  --min-instances=0 \
  --max-instances=1 \
  --memory=256Mi \
  --no-allow-unauthenticated
```

`--source .` bygger container via Cloud Build uten lokal Docker.

### Forutsetninger

- Operatøren er logget inn via `gcloud auth login`
- Operatøren har `run.invoker`-rollen på Cloud Run-tjenesten
- Cloud Run service account har `secretmanager.secretAccessor` på alle tre secrets

## Konsekvenser

### Positive

- **Secrets isolert:** API-nøkler eksisterer kun i GCP Secret Manager. Claude kan ikke nå dem via shell, env vars, eller Keychain.
- **To-lags auth:** GCP identity token (kort-levd, knyttet til Google-konto) + app-level MCP-token. Begge kreves.
- **Enkel deploy:** `gcloud run deploy --source .` bygger og deployer fra repo.
- **Lav latens:** Cloud Run i `europe-north1`, cold start ~2s.
- **Ingen FastMCP-avhengighet:** Custom MCPServer med JSON-RPC direkte — færre avhengigheter, full kontroll.

### Negative

- **Nettverksavhengighet:** MCP-kall krever internettforbindelse.
- **gcloud-avhengighet:** Proxyen krever lokal `gcloud` CLI med aktiv innlogging.
- **GCP-kostnad:** Minimal (Cloud Run fakturerer kun ved bruk), men krever GCP-prosjekt.
- **MCP-token i mcp.json:** Tokenet gir kun tilgang sammen med gyldig GCP-identitet, men bør ikke committes til git.

## Alternativer vurdert

1. **Lokalt med Keychain + hooks:** Opprinnelig løsning. Hooks blokkerte secret-eksponering, men Claude hadde shell-tilgang til samme maskin. Utilstrekkelig isolering.
2. **FastMCP med streamable-http:** FastMCP sin innebygde HTTP-transport. Droppet til fordel for custom server etter paragraf-mønsteret — enklere, færre avhengigheter, full kontroll over JSON-RPC.
3. **Direkte HTTP fra Claude Code (`url` i mcp.json):** Claude Code støtter ikke GCP identity tokens i HTTP-transport, så Cloud Run IAM blokkerer forespørselen. Kun app-level Bearer token ville gått gjennom med `--allow-unauthenticated`, men det fjerner et sikkerhetslag.
4. **`gcloud run services proxy`:** Google-verktøy som lager lokal proxy til Cloud Run med IAM-auth. Krever at brukeren starter en separat prosess manuelt. Stdio-proxyen er selvforsynt og startes automatisk av Claude Code.
