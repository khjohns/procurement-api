# Procurement API Testing

API-testing mot leverandørens konkurransegjennomføringsverktøy.

## Sikkerhet

**API-nøkkelen (`VENDOR_API_KEY`) er ALDRI tilgjengelig i dette prosjektet.**

- Nøkkelen ligger i macOS Keychain
- Kode leser `os.environ["VENDOR_API_KEY"]` — verdien injiseres ved kjøring
- Hooks blokkerer Bash-kommandoer som kan eksponere hemmeligheter
- `.env`-filer skal ALDRI opprettes i dette prosjektet

### Slik kjører du kode som trenger API-nøkkelen

```bash
# Wrapper-scriptet injiserer nøkkelen fra Keychain
~/bin/procurement-api python script.py
~/bin/procurement-api python -m pytest
```

### Slik legger du til nøkkelen i Keychain (én gang)

```bash
security add-generic-password -s 'procurement-api' -a "$USER" -w
# Limer inn nøkkelen når du blir bedt om passord
```

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

## Kommandoer

```bash
python -m pytest           # Kjør tester (via wrapper)
ruff check src/            # Linting
```
