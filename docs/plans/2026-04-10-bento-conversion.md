# Bento-konvertering av fasesider

## Kontekst

Fasepanelet og app-shellet er implementert. Seks faser har egne ruter under `/anskaffelser/[id]`:
- Registrering (`+page.svelte`) — klassifisering, økonomi, verktøy-lenker
- Konkurranse (`konkurranse/+page.svelte`) — frist, leverandører, dokumenter, hendelser
- Tildeling (`tildeling/+page.svelte`) — lenker til protokoll og meddelelse
- Kontrakt (`kontrakt/+page.svelte`) — placeholder med forventede aktiviteter

Disse sidene bruker i dag enkel vertikal kortstabling (`.card` + `.page-inner`). Alle kort har lik visuell vekt. Det er feil for orientering — størrelse bør kommunisere viktighet.

## Oppgave

Konverter de fire orienteringssidene til bento-grid layout der kortstørrelse kommuniserer viktighet.

### Designprinsipper (fra system.md)

- **Størrelse er informasjon**: Hero-kort (span 2) for det viktigste (frist, nøkkeltall). Standard-kort (span 1) for støttende innhold.
- **Shadows, ikke borders**: Orienterings-kort bruker `box-shadow: 0 1px 6px rgba(0,0,0,0.03)`, hover → `0 6px 24px rgba(0,0,0,0.08)` + `translateY(-1px)`. Ingen synlige card borders.
- **Radius**: `border-radius: 10px` for bento-kort (ikke 6px som i arbeidsmodus).
- **Responsivt**: 3 kolonner ved 1200px+, 2 ved 768-1199px, stacking under 768px. Bruk `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` som base, med eksplisitte `grid-column: span 2` for hero-kort.
- **Ingen glassmorphism**: Varme, opake overflater (`--color-felt`). Materialmetaforen er *filt og papir*, ikke glass.
- **Entry-animasjon**: Kort fader opp ved sidelast (fadeUp, 60-100ms stagger). Respekter `prefers-reduced-motion`.

### Avanserte teknikker å vurdere

**Kinetisk typografi** — for frist-nedtellinger:
- Dager gjenstående i fristkortet (tilbudsfrist, vedståelsesfrist) kan telle ned/opp ved innlasting. Subtil `font-variation-settings`-endring ved hover. Ikke for alle tall — kun frister der urgency er relevant. Effekten skal føles presis og seriøs, ikke leken.

**Neo-brutal aksentkort** — for å bryte monotoni:
- Ett kort per side som bryter med den myke stilen: solid aksentfarge, hard skygge (`4px 4px 0`), tykk border. Kandidater: fristkortet på konkurranse-siden (urgency), verdi-kortet på registrering (nøkkeltall), "neste steg"-kort. Bruk sparsomt — maks ett per bento-grid. Fargen bør hentes fra eksisterende palette (`--color-vekt`, `--color-warn`).

**Tidssensitiv urgency** — fristkortet endrer karakter:
- `>30 dager`: rolig, standard bento-kort. Teal aksentfarge.
- `10-30 dager`: amber aksentfarge, litt mer prominent.
- `<10 dager`: warn-farger, mulig neo-brutal stil. Fristkortet "eskalerer" visuelt.
- `Utgått`: rose/score-low, dempet. Ikke alarm — bare tydelig at fristen er passert.

**Click-to-expand** — for kort med skjult dybde:
- Hendelseskortet (konkurranse): vis 3-4 siste, expand inline for full historikk.
- Leverandørkortet: vis antall + topp 3, expand for komplett liste med detaljer.
- Ikke for hero-kort eller navigasjons-kort (verktøy, arbeidsflater) — de lenker videre.
- Expand-animasjon: `max-height` transition + fadeIn for nytt innhold.

### Per side

**Registrering** — eksisterende data fra `data.proc`:
- Hero (span 2): Sammendrag (kontraktstype, prosedyre, terskel, verdi — alt i ett kort)
- Standard: Verktøy-lenker (unntak, kalkulator, fristberegner)
- Kandidat for neo-brutal: verdi-kortet (anslått verdi som stort tall)

**Konkurranse** — data fra `data.proc` + `data.activities`:
- Hero (span 2): Fristkort med kinetisk nedtelling, tidssensitiv urgency
- Standard: Leverandører (click-to-expand for full liste)
- Standard: Dokumenter (utledet fra aktiviteter)
- Standard: Hendelser (click-to-expand for full historikk, vis siste 3-4 default)

**Tildeling**:
- Hero (span 2): Arbeidsflater (protokoll + meddelelse som prominente lenker)
- Standard: Kommende aktiviteter (karensperiode, klager)
- Kandidat for tidssensitiv: karensperiode-nedtelling (når relevant)

**Kontrakt**:
- Hero (span 2): Fasebeskrivelse + forutsetninger
- Standard: Forventede aktiviteter

### Viktige filer

- `.interface-design/system.md` — Designsystemet. Les "Two Visual Modes" og "Bento Grid Pattern".
- `src/frontend/src/app.css` — CSS-tokens. `.card` og `.page-inner` er definert globalt.
- `src/frontend/src/routes/anskaffelser/[id]/+page.svelte` — Registrering
- `src/frontend/src/routes/anskaffelser/[id]/konkurranse/+page.svelte` — Konkurranse
- `src/frontend/src/routes/anskaffelser/[id]/tildeling/+page.svelte` — Tildeling
- `src/frontend/src/routes/anskaffelser/[id]/kontrakt/+page.svelte` — Kontrakt
- `src/frontend/src/lib/config/phases.ts` — Fasedefinisjoner, statusutledning
- React-prototypen ble delt i samtalen som startet dette arbeidet — den viser bento-mønsteret for BentoReg, BentoKonk, BentoFuture.

### Ikke endre

- Evaluering, kvalifisering, protokoll, meddelelse — disse er arbeidsflater med uniform layout
- Fasepanelet (`PhasePanel.svelte`) — ferdig implementert
- Layoutet (`+layout.svelte`) — header, case-info, content header er på plass

### Kvalitetskrav

- Kjør `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`
- Kjør `python scripts/svelte_complexity.py --functions` — hold funksjons-CC under 10
- Bruk eksisterende CSS-tokens fra `app.css`, ikke opprett nye farger
- Bruk `$lib/utils/format.ts` for formatering (formatNOK, formatDatoMndAar)
- Bruk `$lib/utils/protokoll-helpers.ts` for label-mapping (PROCEDURE_LABELS, CONTRACT_NATURE_LABELS)
- Les `.interface-design/system.md` grundig før implementering — spesielt "Two Visual Modes" og "Bento Grid Pattern"
