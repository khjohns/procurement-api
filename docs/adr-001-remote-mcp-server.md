# ADR-001: Remote MCP-server på Cloud Run

**Status:** Godkjent
**Dato:** 2026-02-17

## Kontekst

Claude Code bruker MCP-verktøy (Model Context Protocol) for å kalle Artifik API på vegne av brukeren. Opprinnelig kjørte MCP-serveren lokalt som en stdio-prosess. API-nøkler lå i macOS Keychain, men Claude hadde shell-tilgang til samme maskin og kunne potensielt omgå sikkerhetshookene.

## Beslutning

Flytte MCP-serveren til Google Cloud Run slik at secrets aldri finnes på Claudes maskin.

## Arkitektur

```
Claude Code  ──Bearer token──▶  Cloud Run (artifik-mcp)  ──OAuth2──▶  Artifik API
                                        │
                                        ▼
                                 GCP Secret Manager
                                 ├─ vendor-api-id
                                 ├─ vendor-api-key
                                 └─ mcp-auth-token
```

### Autentisering (to lag)

1. **MCP-lag:** Bearer token i `Authorization`-header. Sjekkes mot `MCP_AUTH_TOKEN` env var i containeren. Hindrer at tilfeldige klienter kan kalle endepunktet.
2. **Cloud Run IAM:** `--no-allow-unauthenticated` krever at kalleren har `run.invoker`-rollen. Claude Code sin HTTP-klient håndterer dette via headeren i `mcp.json`.

### Secrets-flyt

- **GCP Secret Manager** → injiseres som env vars i containeren via `--set-secrets`
- **Cloud Run service account** har `secretmanager.secretAccessor`-rollen
- **Claude** ser aldri API-nøkler — kun MCP-verktøyenes JSON-svar

## Komponenter

| Komponent | Fil | Rolle |
|-----------|-----|-------|
| MCP-server | `src/artifik_mcp/server.py` | Custom JSON-RPC handler med auto-registrering av `@mcp_tool`-metoder |
| HTTP-transport | `src/artifik_mcp/__main__.py` | Flask-app med `--remote` flag, POST `/mcp` |
| Bearer auth | `src/artifik_mcp/auth.py` | Middleware som sjekker `Authorization: Bearer <token>` |
| Container | `Dockerfile` | python:3.11-slim, pip install fra pyproject.toml |
| Klient-config | `.claude/mcp.json` | URL + Bearer token (ikke committet med verdi) |

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

## Konsekvenser

### Positive

- **Secrets isolert:** API-nøkler eksisterer kun i GCP Secret Manager. Claude kan ikke nå dem via shell, env vars, eller Keychain.
- **Enkel deploy:** `gcloud run deploy --source .` bygger og deployer fra repo.
- **Lav latens:** Cloud Run i `europe-north1`, cold start ~2s.
- **Ingen FastMCP-avhengighet:** Custom MCPServer med JSON-RPC direkte — færre avhengigheter, full kontroll.

### Negative

- **Nettverksavhengighet:** MCP-kall krever internettforbindelse (lokalt stdio fungerer fortsatt med `--remote` utelatt).
- **GCP-kostnad:** Minimal (Cloud Run fakturerer kun ved bruk), men krever GCP-prosjekt.
- **Bearer token i mcp.json:** Tokenet gir kun tilgang til MCP-proxyen (ikke Artifik direkte), men bør ikke committes til git.

## Alternativer vurdert

1. **Lokalt med Keychain + hooks:** Opprinnelig løsning. Hooks blokkerte secret-eksponering, men Claude hadde shell-tilgang til samme maskin. Utilstrekkelig isolering.
2. **FastMCP med streamable-http:** FastMCP sin innebygde HTTP-transport. Droppet til fordel for custom server etter paragraf-mønsteret — enklere, færre avhengigheter, full kontroll over JSON-RPC.
