# Procurement API

API-testing mot leverandørens konkurransegjennomføringsverktøy.

## Arkitektur

MCP-serveren kjører på Cloud Run. Se `docs/adr-001-remote-mcp-server.md` for detaljer.

```
Claude Code  ──Bearer token──▶  Cloud Run  ──OAuth2──▶  Artifik API
                                    │
                                GCP Secret Manager
```

Secrets finnes kun i GCP Secret Manager — aldri lokalt.

## API — tilgjengelige data

### procurements
Metadata om anskaffelsen: navn, prosedyre, terskelverdi, regulering, fase/status,
rammeavtale-config, estimert verdi, CPV-koder, varighet, oppdragsgiver (org.nr,
kontakt), konkurransedokumenter (filnavn/dato), tidslinje (kunngjøring,
kvalifikasjonsfrist, tilbudsfrist, tildelingsbeslutning, kontraktssignering).

### activities
Hendelseslogg per anskaffelse — nyttig for protokoll:
- `ASK_TO_QUALIFY` / `SUBMIT_BID` — leverandør, tidspunkt (innlevering)
- `OPEN_QUALIFICATIONS` / `OPEN_BIDS` — tidspunkt for åpning
- `QUALIFYING_PARTICIPANTS` / `AWARDING_PARTICIPANTS` — tildelingshendelser
- `PUBLISH_Q8A` — publisering av Q&A (kun tidspunkt, ikke innhold)
- `WITHDRAW_PARTICIPATION` — leverandører som trakk seg

### smartDocResponses
Strukturerte dokumenter med leverandørsvar (konkurransegrunnlag, kvalifikasjonskrav,
tildelingskriterier, kontraktutkast). Vedlegg i `files`-feltet (prisskjema m.m.).

### contracts
Avtaleoversikt med custom fields, datofilter, rammeavtale-underkontrakter.

## API-begrensninger (Artifik)

- **ESPD** fylles ut i KGV-verktøyet, ikke tilgjengelig via API.
- **Q&A-innhold** ikke eksponert — kun tidspunkt for publisering via activities.
- **smartDocResponses** tomme på de fleste anskaffelser (2 av 150 per feb 2026).

## Deploy

```bash
gcloud run deploy artifik-mcp \
  --source . \
  --region europe-north1 \
  --set-secrets=VENDOR_API_ID=vendor-api-id:latest,VENDOR_API_KEY=vendor-api-key:latest,MCP_AUTH_TOKEN=mcp-auth-token:latest \
  --min-instances=0 --max-instances=1 --memory=256Mi \
  --no-allow-unauthenticated
```

## Kommandoer

```bash
ruff check src/            # Linting
```
