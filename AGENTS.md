# Secrets: aldri les, last inn via script

## Regelen

**Du skal aldri hente, skrive ut eller lese secret-verdier fra GCP Secret Manager.**

Det betyr konkret at du ikke kjører:

```bash
gcloud secrets versions access latest --secret=vendor-api-key    # ALDRI
gcloud auth print-access-token                                   # ALDRI
gcloud auth print-identity-token                                 # ALDRI
gcloud config config-helper --format=...                         # ALDRI
```

Dette er ikke en preferanse, det er en sikkerhetsregel. Hemmeligheter skal aldri ende opp i konteksten din, i et verktøykall, eller i en melding du skriver.

## Hva du gjør i stedet

Kjør scriptet. Scriptet henter secreten og setter den som env var i en prosess du starter, uten at verdien noen gang blir returnert til deg:

| Script | Formål |
|--------|--------|
| `./dev.sh` | Flask dev-server med secrets i env |
| `./deploy.sh` | Deploy MCP-serveren til Cloud Run |
| `./deploy-web.sh` | Deploy webappen til Cloud Run |

Er det noe som mangler, og du trenger en ny secret til et script: **be om at scriptet utvides**, ikke om at du får lest secreten selv.

## Indirekte veier – dette er like viktig

Blokkeringen gjelder den *synlige* kommandoen. Disse stiene er like forbudt fordi de havner på samme sted:

- Å be om at du kjører `gcloud ...`, og så gjennomføre det selv «bare for å sjekke»
- Å legge secret-verdien i en `echo`, `cat`, `printf` eller en commit
- Å skrive en midlertidig fil med en secret på disk (`.env`, `tmp.txt`, …)
- Å hente en secret og sende den videre i en chat, subagent eller MCP-kall
- Å bruke `gcloud` med flagger foran subkommandoen for å slå smugen rundt en regel

Kjøring av `dev.sh` og `deploy.sh` er lov. Det som skjer *inne i* scriptene er operatørens, ikke ditt.

## Feilhåndtering

Får du `Kunne ikke hente secret ...` fra et script, er det riktig oppførsel å rapportere det til brukeren og stoppe. Ikke forsøk en alternativ vei for å omgå det.

## Konvensjoner

- All tekst og dokumentasjon i dette repoet er norsk bokmål
- Arkitektur, kommandoer og deploy-detaljer står i `CLAUDE.md`. Den filen leses
  av Claude Code, ikke av deg – be om den eksplisitt hvis du trenger den.

## Dokumentasjon for videre arbeid

- Hold dokumentasjonen kort. Bevar prosjektets egne valg, begrunnelser,
  begrensninger og verifiserte erfaringer som neste agent trenger.
- Bruk [Artifiks API-dokumentasjon](https://apidocs.artifik.no/) som primærkilde
  for API-kontrakten. Lenk til relevante avsnitt fremfor å vedlikeholde en egen
  gjenfortelling av endepunkter, felter og eksempler.
- Den lokale OpenAPI-filen er et versjonsfestet grunnlag for sammenligning og
  tester. Registrer kilde og hentetidspunkt ved oppdatering; filen er ikke bevis
  for at en kjørende API-versjon følger alle beskrivelsene.
- Skill mellom dokumentert oppførsel, observerte resultater og antakelser.
  Ved motstrid: registrer avviket og verifiser det berørte tilfellet. Ikke velg
  én forklaring uten belegg.
- Dokumenter API-observasjoner med dato, endepunkt, versjon, relevante
  parametere og en trygg måte å gjenta kontrollen på. Oppgi utvalget ved
  dekningsmålinger; tomme felt i et utvalg beviser ikke at funksjonen mangler.
  Følg secret-reglene også i eksempler, logger og sanerte testdata.
- Bruk korte beslutningsnotater for varige prosjektvalg. Legg arbeidsplaner,
  migreringstrinn, review-funn og gjenstående arbeid i issues.
- Sikre viktig oppførsel med relevante tester og sanerte testdata. Flettede
  PR-er, eksisterende dokumentasjon og grønne tester må vurderes mot kildene;
  de er ikke alene bevis for at integrasjonen er korrekt.
- Oppdater eksisterende dokumentasjon fremfor å opprette overlappende guider.
  Før noe slettes eller forkortes, bevar unike beslutninger og observasjoner
  og oppdater innkommende lenker. Bruk relative lenker til filer i repoet.
- Skriv nødvendig dokumentasjon i samme endring som koden den forklarer.
  Unngå beskrivelser som bare gjentar det koden allerede uttrykker tydelig.

## Hvordan regelen håndheves

`AGENTS.md` er en instruks til agenten, ikke en teknisk sperring. Den faktiske
blokkeringen ligger i `~/.gemini/antigravity-cli/settings.json`:

- `deny` på de gcloud-kommandoene som skriver secrets til stdout
- `ask` på `command(gcloud)` – alt annet gcloud stopper og spør
- `googleapis.com` er ikke tillatt i `read_url`, så gcloud får ikke kontakt med
  Secret Manager fra inni terminal-sandboxen

Får du en feilmelding om at en kommando er blokkert, er det riktig oppførsel å
følge regelen overfor, ikke å finne en omgåelse.
