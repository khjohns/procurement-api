# Handoff: Protokollgenerator-skript

## Oppgave

Lag et Python-skript (`src/protokoll_generator.py`) som:
1. Henter anskaffelser fra Artifik API via MCP-verktøyene
2. Lar brukeren velge blant ferdig/modne anskaffelser
3. Genererer en utfylt anskaffelsesprotokoll i markdown

## Steg 1: Velg anskaffelse

Hent `list_procurements` og filtrer:
- `isTemplate = False`
- `isCancelled = False`
- Tilbudsfrist passert (sjekk `timeline` for type `submission`, dato < nå)
- La brukeren filtrere på `procedure`: `Open`, `Limited`, `Competitive dialogue`, etc.
- La brukeren filtrere på `threshold`: `over_eea_threshold_value`, `below_eea_threshold_value`, etc.
- Vis som nummerert liste med navn, prosedyre, terskel, status

## Steg 2: Hent data

For valgt anskaffelse (procurement_id):
- **Metadata** allerede i procurement-objektet fra steg 1
- **Activities** via `get_procurement_activities(procurement_id)`

### Nøkkeldata fra procurement-objektet

```
id, sequenceId, externalId, name, description
procedure (Open/Limited/Competitive dialogue/etc)
regulation, threshold
estimated_value, contracts_total_value_amount, currency, budget
duration, duration_months
about_procurer (name, national_id, postal_address, town, email, contact_person)
framework_agreement_involved, framework_agreement_maximum_participants
direct_award_justification_code, direct_award_justification_reason
cancelingReason, isCancelled, isCompleted
timeline (dict med entries: type=announcement/submission/award decision/contract signing/acceptance)
milestones (dict med entries: name=DEADLINE_TO_ASK_QUESTIONS, date)
files (list med name, lastModified)
publicationDate
areAwardLettersSent
```

### Nøkkeldata fra activities

| Action | Data | Protokollbruk |
|--------|------|---------------|
| `PUBLISH_TO_DOFFIN` | dato, user | Kunngjøringstidspunkt |
| `DOFFIN_NOTICE_STATUS_PUBLISHED` | description.doffinNotice.ngoj, publicationId, publicationDate | Doffin/TED-referanse |
| `ASK_TO_QUALIFY` | organization.name, dato | Leverandører med forespørsler (begrenset) |
| `SUBMIT_BID` | organization.name, user.name, dato | Leverandører + tidspunkt for mottak |
| `OPEN_BIDS` / `OPEN_QUALIFICATIONS` | dato | Åpningstidspunkt |
| `QUALIFYING_PARTICIPANTS` | description.tendersIds | Kvalifiserte |
| `REJECT_PARTICIPATION` | organization.name, dato (beskrivelse tom) | Avviste leverandører |
| `AWARDING_PARTICIPANTS` | description.tendersIds, dato | Tildeling |
| `UPDATE_LOT_AWARD_STATUS` | description.lotResponseId, isAssignedToWin | Tildelingsdetaljer |
| `WITHDRAW_PARTICIPATION` | organization.name, dato | Trukket seg |
| `CONVERSATION_MARKED_COMPLETED` | description.conversationTitle, organization.name, dato | Meldinger (§ 23-5 hvis etter tilbudsfrist) |
| `PUBLISH_Q8A` | dato | Q&A publisert |
| `MARK_PROCUREMENT_AS_COMPLETE` | dato | Fullføringsdato |

## Steg 3: Generer protokoll

Bruk malen i `docs/anskaffelsesprotokoll` som utgangspunkt. Se `docs/protokoll-1795-iso-sertifisering.md` for eksempel på utfylt protokoll.

### Viktige regler

- **Prosedyretype** avgjør hvilke seksjoner som er relevante:
  - Åpen anbud: Ingen utvelgelse, forhandling eller dialog
  - Begrenset: Har kvalifikasjon + utvelgelse, ingen forhandling
  - Forhandling: Har forhandlingsseksjon
  - Konkurransepreget dialog: Har dialogseksjon

- **Ettersending/avklaring (§ 23-5):** Filtrer `CONVERSATION_MARKED_COMPLETED` på dato > tilbudsfrist. Meldinger før tilbudsfrist er Q&A, ikke avklaringer.

- **Felter som ALLTID krever manuelt supplement** (merk med `<!-- MANUELT -->`):
  - Begrunnelse for ikke å dele opp i delkontrakter (c)
  - Kvalifikasjonskrav og -vurdering
  - Avvisningsbegrunnelse (description er tom i API)
  - Tildelingsbegrunnelse (API har kun tendersIds)
  - Meddelelsesbrev dato og karensperiode
  - Underleverandører
  - Inhabilitet

- **Datakvalitetstabell** på slutten: vis for hver seksjon om data er fra API, manuelt, eller trenger bekreftelse.

## Kontekst

- MCP-verktøyene kalles via `mcp__artifik__*` (stdio-proxy til Cloud Run)
- Skriptet skal kjøre som CLI: `python src/protokoll_generator.py`
- Det skal IKKE kalle MCP direkte — det skal bruke `ArtifikClient` fra `src/app/client.py`
- Men NB: `ArtifikClient` leser credentials fra env vars (`VENDOR_API_ID`, `VENDOR_API_KEY`) som kun finnes på Cloud Run. For lokal kjøring trenger vi en alternativ tilnærming.
- **Anbefalt:** Lag skriptet slik at det kan importeres og kalles fra Claude Code med data som allerede er hentet via MCP. Altså: skriptet tar inn procurement-data og activities som JSON, og genererer protokoll. Hentingen skjer separat.

## Filer å lese

- `docs/anskaffelsesprotokoll` — malen (markdown)
- `docs/protokoll-1795-iso-sertifisering.md` — eksempel på utfylt protokoll
- `docs/protokoll-datagrunnlag.md` — komplett kartlegging av API-felter vs. protokollkrav
- `src/app/client.py` — ArtifikClient med alle API-metoder
