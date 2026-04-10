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

### Per side

**Registrering** — eksisterende data fra `data.proc`:
- Hero: Sammendrag (kontraktstype, prosedyre, terskel, verdi — alt i ett kort)
- Standard: Verktøy-lenker (unntak, kalkulator, fristberegner)
- Standard: Tom plass for fremtidig team/dokumenter

**Konkurranse** — data fra `data.proc` + `data.activities`:
- Hero: Fristkort med stor nedtelling (allerede implementert som `.frist-card` med teal venstre-border)
- Standard: Leverandører (kvalifiserte/tilbud)
- Standard: Dokumenter (utledet fra aktiviteter)
- Standard: Hendelser (sortert, nyeste først)

**Tildeling**:
- Hero: Arbeidsflater (protokoll + meddelelse som prominente lenker)
- Standard: Kommende aktiviteter (karensperiode, klager)

**Kontrakt**:
- Hero: Fasebeskrivelse + forutsetninger
- Standard: Forventede aktiviteter

### Viktige filer

- `.interface-design/system.md` — Designsystemet. Les "Two Visual Modes" og "Bento Grid Pattern".
- `src/frontend/src/app.css` — CSS-tokens. `.card` og `.page-inner` er definert globalt.
- `src/frontend/src/routes/anskaffelser/[id]/+page.svelte` — Registrering
- `src/frontend/src/routes/anskaffelser/[id]/konkurranse/+page.svelte` — Konkurranse
- `src/frontend/src/routes/anskaffelser/[id]/tildeling/+page.svelte` — Tildeling
- `src/frontend/src/routes/anskaffelser/[id]/kontrakt/+page.svelte` — Kontrakt
- `src/frontend/src/lib/config/phases.ts` — Fasedefinisjoner, statusutledning

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
