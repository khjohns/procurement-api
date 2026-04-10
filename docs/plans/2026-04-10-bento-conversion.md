# Forbedring av fasesider

## Kontekst

Fasepanelet og app-shellet er implementert. Fire faser har egne ruter under `/anskaffelser/[id]`:
- Registrering (`+page.svelte`) — klassifisering, økonomi, verktøy-lenker
- Konkurranse (`konkurranse/+page.svelte`) — frist, leverandører, dokumenter, hendelser
- Tildeling (`tildeling/+page.svelte`) — lenker til protokoll og meddelelse
- Kontrakt (`kontrakt/+page.svelte`) — placeholder med forventede aktiviteter

## Designretning (revidert)

Den opprinnelige planen var å konvertere fasesidene til bento-grid layout med shadows, 10px radius, hover-animasjoner, neo-brutal aksentkort og kinetisk typografi. Etter designvurdering (se nedenfor) er retningen endret til:

**Raffinerte stablede seksjoner** med typografisk hierarki, tidssensitiv urgency, og konsistent visuelt språk med resten av verktøyet.

### Hvorfor ikke bento?

1. **Bento er et presentasjonsmønster, ikke et verktøymønster.** Det ble popularisert av Apple-keynotes og marketing-sider. Innkjøpsrådgiveren presenterer ikke anskaffelsen — hun sjekker status og navigerer videre.

2. **To visuelle moduser skaper kognitiv kostnad.** Brukeren bytter mellom fasesider og arbeidsflater via fasepanelet. Skift mellom shadows↔borders, 10px↔6px radius, hover-animasjoner↔statisk gir fire samtidige visuelle endringer som ikke kommuniserer noe brukeren ikke allerede vet.

3. **Trendretningen for profesjonelle verktøy (2025-2026) peker bort fra bento** og mot "toolification" — tette, typografidrevne, formålsbestemte layouts. Referansepunkter: Linear, Vercel, Raycast.

4. **Fasesidene er allerede nesten riktige.** Konkurranse-siden har effektivt hierarki: 48px fristtall, 2-kolonne grid, hendelsesliste. Forbedringene er inkrementelle, ikke strukturelle.

### Designprinsipper (oppdatert i system.md)

- **Typografi er hierarki**: Store monospace-tall (48px) for nøkkelverdier, 13px for labels, 11px for metadata. Kortstørrelse kommuniserer ikke viktighet — skriftstørrelse gjør det.
- **Borders, ikke shadows**: Alle kort bruker `1px solid var(--color-wire)`, `--radius-md` (6px). Ingen box-shadows, ingen hover-elevation, ingen scale-transforms.
- **Tidssensitiv urgency**: Fristkortet endrer aksent-farge basert på nærhet (teal → amber → warn → expired). Ingen animasjon.
- **Click-to-expand**: Progressiv avsløring for hendelser og leverandører. Vis 3-4, expand inline.
- **Bredere container**: `.page-inner-wide` med `max-width: 1060px` for fasesider (vs 880px for prose).
- **11px minimum**: Ingen tekst under 11px. Bumper section-labels, badges, compact metadata.

## Oppgave

Forbedre de fire fasesidene innenfor den reviderte designretningen.

### Per side

**Registrering** — eksisterende data fra `data.proc`:
- Øk `.page-inner` til 1060px
- Bump section-labels til 11px
- Økonomi-verdier (anslått verdi, kontraktsverdi) med 24px+ monospace — tydelig nøkkeltall
- Verktøy-lenker: uendret (allerede funksjonelle)

**Konkurranse** — data fra `data.proc` + `data.activities`:
- Øk `.page-inner` til 1060px
- Tidssensitiv urgency på fristkortet (fargeskifte basert på dagerIgjen)
- Click-to-expand for hendelser (vis 4, expand for resten)
- Click-to-expand for leverandører (vis 3-4, expand for resten)
- Bump alle 10px-labels til 11px

**Tildeling**:
- Øk `.page-inner` til 1060px
- Arbeidsflater-lenker med tydelig handlingsprominens
- Eventuelt: tidssensitiv urgency for karensperiode-nedtelling

**Kontrakt**:
- Øk `.page-inner` til 1060px
- Bump fontstørrelser
- Minimal endring — lite innhold, og det er riktig for denne fasen

### Viktige filer

- `.interface-design/system.md` — Designsystemet (oppdatert). Les "One Visual Language", "Screen Size Position", "Time-Sensitive Urgency".
- `src/frontend/src/app.css` — CSS-tokens. `.card`, `.page-inner`, `.section-label` er definert globalt.
- `src/frontend/src/routes/anskaffelser/[id]/+page.svelte` — Registrering
- `src/frontend/src/routes/anskaffelser/[id]/konkurranse/+page.svelte` — Konkurranse
- `src/frontend/src/routes/anskaffelser/[id]/tildeling/+page.svelte` — Tildeling
- `src/frontend/src/routes/anskaffelser/[id]/kontrakt/+page.svelte` — Kontrakt
- `src/frontend/src/lib/config/phases.ts` — Fasedefinisjoner, statusutledning

### Ikke endre

- Evaluering, kvalifisering, protokoll, meddelelse — disse er arbeidsflater med egne layouts
- Fasepanelet (`PhasePanel.svelte`) — ferdig implementert
- Layoutet (`+layout.svelte`) — header, case-info, content header er på plass

### Kvalitetskrav

- Kjør `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`
- Kjør `python scripts/svelte_complexity.py --functions` — hold funksjons-CC under 10
- Bruk eksisterende CSS-tokens fra `app.css`, ikke opprett nye farger
- Bruk `$lib/utils/format.ts` for formatering (formatNOK, formatDatoMndAar)
- Bruk `$lib/utils/protokoll-helpers.ts` for label-mapping (PROCEDURE_LABELS, CONTRACT_NATURE_LABELS)
- Les `.interface-design/system.md` grundig før implementering — spesielt "One Visual Language" og "Screen Size Position"
