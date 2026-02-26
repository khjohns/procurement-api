# ADR-002: Standalone protokollgenerator

**Status:** Godkjent
**Dato:** 2026-02-26

## Kontekst

Anskaffelsesforskriften § 25-5 krever at oppdragsgiver fører protokoll over
anskaffelser over EØS-terskelverdi. Mye av datagrunnlaget finnes i Artifik API
(leverandører, tilbud, tidslinjer, avvisninger), men en del må fylles inn
manuelt (kvalifikasjonsvurdering, tildelingsbegrunnelse, inhabilitet m.m.).

Vi trenger et verktøy som automatiserer det som kan automatiseres, og tydelig
markerer hva som krever manuelt arbeid.

## Beslutning

Bygge en standalone Python CLI (`src/protokoll_generator.py`) som henter data
direkte fra Artifik API — uten avhengighet til MCP-serveren eller Claude Code.

### Hvorfor ikke MCP?

MCP-serveren (ADR-001) er designet for Claude Code. Protokollgenerering er en
oppgave for saksbehandleren, ikke for AI-agenten. Et standalone skript:

- Kan kjøres av hvem som helst med `gcloud`-tilgang
- Har ingen avhengighet til Claude Code, MCP eller Cloud Run
- Er enklere å vedlikeholde og feilsøke
- Kan integreres i andre verktøy eller CI ved behov

## Arkitektur

```
python3 src/protokoll_generator.py
         │
         ├─ gcloud secrets versions access  ──▶  GCP Secret Manager
         │   (VENDOR_API_ID, VENDOR_API_KEY)
         │
         ├─ ArtifikClient (src/app/client.py)  ──▶  api.artifik.no
         │   list_procurements()
         │   get_procurement_activities(id)
         │
         └─ generate_protokoll()  ──▶  docs/protokoll-{id}.md
```

### Dataflyt

1. **Secrets** hentes fra GCP Secret Manager via `gcloud` CLI
2. **ArtifikClient** brukes direkte mot Artifik API (samme klient som MCP-serveren)
3. **Anskaffelser** listes, filtreres (passert frist, ikke mal/kansellert), og dedupliseres
4. **Bruker velger** anskaffelse interaktivt (eller via `--id`)
5. **Activities** hentes for valgt anskaffelse
6. **Protokoll** genereres som markdown med `<!-- MANUELT -->`-markører

### Deduplisering

API-et returnerer flere objekter per anskaffelse (revisjoner/kopier) med samme
`sequenceId` men forskjellige `id`. Skriptet dedupliserer på `sequenceId` og
beholder den med flest utfylte felter — som i praksis er originalen.

## Hva protokollen dekker

| Kilde | Seksjoner |
|-------|-----------|
| **Fullt fra API** | Oppdragsgiver, beskrivelse/verdi, prosedyretype, kunngjøring (Doffin/TED), tilbud mottatt, tilbud i vurdering, tildelingsdato, avlysning, rammeavtale |
| **Delvis fra API** | Avviste leverandører (navn/dato, men ikke begrunnelse), ettersending/avklaring (meldinger etter tilbudsfrist) |
| **Manuelt** | Kvalifikasjonskrav/-vurdering, tildelingsbegrunnelse, avvisningsbegrunnelse, delkontrakt-begrunnelse, meddelelsesbrev/karens, underleverandører, inhabilitet |

Se `docs/protokoll-datagrunnlag.md` for komplett kartlegging mot § 25-5.

## Bruk

```bash
# Interaktiv velging
python3 src/protokoll_generator.py

# Spesifikk anskaffelse
python3 src/protokoll_generator.py --id 1795

# Bare liste
python3 src/protokoll_generator.py --list

# Custom output-sti
python3 src/protokoll_generator.py --id 1795 -o protokoll.md
```

### Forutsetninger

- Python 3.11+ med `certifi` installert
- `gcloud` CLI med aktiv innlogging (`gcloud auth login`)
- Tilgang til GCP-prosjektet `procurement-mcp` (Secret Manager)

## Konsekvenser

### Positive

- **Uavhengig:** Ingen kobling til MCP, Cloud Run eller Claude Code
- **Transparent:** Datakvalitetstabell viser eksakt hva som er fra API og hva som mangler
- **Trygt:** Secrets hentes on-demand fra Secret Manager, lagres aldri lokalt
- **Vedlikeholdbart:** Ren Python, ingen eksterne avhengigheter utover `certifi`

### Negative

- **gcloud-avhengighet:** Krever at brukeren er logget inn med gcloud
- **Manuelt supplement:** ~40% av protokollen må fortsatt fylles inn manuelt (API-begrensninger)
- **Ingen validering:** Skriptet sjekker ikke om manuelt-markerte felter faktisk er fylt inn
