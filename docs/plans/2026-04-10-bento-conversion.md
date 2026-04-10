# Fasesider — 3-fasemodell med kompakte oversikter

## Kontekst

Fasepanelet (6-fase vertikal sidebar) og app-shellet er implementert. Etter brukertesting og designvurdering endres informasjonsarkitekturen:

**Fra:** 6 faser (registrering → konkurranse → kvalifisering → evaluering → tildeling → kontrakt) med vertikal sidebar og vertikal stabling av kort.

**Til:** 3 faser (registrering → konkurranse → tildeling) med horisontal faselinje og kompakte 2-kolonne oversikter.

## Hvorfor 3 faser

Seks faser er forskriftens modell. Tre faser er brukerens mentale modell:

| Fase | Brukerens perspektiv | Inkluderer |
|---|---|---|
| **Registrering** | Forberede — klassifisere, sette opp | Grunndata, økonomi, CPV, tildelingskriterier |
| **Konkurranse** | Gjennomføre — alt arbeidet skjer her | Frist, leverandører, kvalifisering, evaluering, protokoll, meddelelse |
| **Tildeling** | Avslutte — tildele og signere | Karensperiode, kontrakt, arkivering |

**Kvalifisering og evaluering** er arbeidsflater *innenfor* konkurranse, ikke egne faser. Brukeren beveger seg mellom dem mens hun jobber — flikker på matrisen, sjekker protokollen, justerer begrunnelsen. Konkurranse er ikke fullført før meddelelsesbrev er sendt.

**Kontrakt** absorberes av Tildeling. Det har for lite innhold til å stå alene.

## Faselogikk

| Fase | Start-gate | Slutt-gate |
|---|---|---|
| Registrering | Anskaffelse opprettet | `PUBLISH_TO_DOFFIN` |
| Konkurranse | `PUBLISH_TO_DOFFIN` | `areAwardLettersSent === true` |
| Tildeling | `areAwardLettersSent === true` | Kontrakt signert (fremtidig) |

**Konkurranse-fullføring:** Ikke `hasBids` eller `AWARDING_PARTICIPANTS`. Konkurranse er aktiv helt til meddelelsesbrev er sendt (`areAwardLettersSent`). Inntil da vil brukeren ofte gå tilbake til evalueringsmatrisen.

## Navigasjon

### Horisontal faselinje (erstatter PhasePanel sidebar)

```
●─────────────────◉ · · · · · · · · · · · · ○
Registrering      Konkurranse               Tildeling
6. jan 2026       Frist: 22. mai · 42d      Kommende
```

- **● Fullført** — fylt node `--color-ink-muted`, dato under
- **◉ Aktiv** — fylt node `--color-vekt` med subtil puls-ring, status under
- **○ Kommende** — tom node `--color-ink-ghost`
- **Linje:** solid `--color-ink-muted` for fullført-strekning, stiplet `--color-wire` for kommende
- Klikk på node → navigerer til fasen
- Plasseres i content-header-området (36px høyde)

### Case-info strip — fjernes

Breadcrumben i header viser anskaffelsesnavn. Registreringssiden viser alle detaljer. Case-info er redundant.

**App-chrome totalt:** Header (48px) + faselinje (36px) = 84px (ned fra 128px)

### Arbeidsflater

Kvalifisering, evaluering, protokoll, meddelelse navigeres via lenker fra faseoversiktene. Tilbake-navigasjon: "← Konkurranse" / "← Tildeling" i toppen av arbeidsflaten.

Rutene er uendret:
```
/anskaffelser/[id]                → Registrering
/anskaffelser/[id]/konkurranse    → Konkurranse
/anskaffelser/[id]/kvalifisering  → Arbeidsflate (fra konkurranse)
/anskaffelser/[id]/evaluering     → Arbeidsflate (fra konkurranse)
/anskaffelser/[id]/tildeling      → Tildeling (inkl. kontrakt)
/anskaffelser/[id]/protokoll      → Arbeidsflate (fra konkurranse)
/anskaffelser/[id]/meddelelse     → Arbeidsflate (fra konkurranse)
```

## Kompakte oversikter — alle faser

### Prinsipp

Alt synlig i én viewport uten scroll (~692px på MacBook Air, ~832px på desktop 1080p). Overflow håndteres med "N til ▸" / "Les mer" — aldri med at innholdet vokser ut av viewporten.

### Registrering

```
┌─────────────────────────────────────────────────────────────┐
│ Beskrivelse (2 linjer + "Les mer" hvis lang)                │
└─────────────────────────────────────────────────────────────┘
┌────────────────────────────┐  ┌─────────────────────────────┐
│ KLASSIFISERING             │  │ ØKONOMI                ←teal│
│ Kontraktstype  Varer og tj.│  │   KONTRAKTSVERDI            │
│ Prosedyre      Åpen anbuds.│  │   4 000 000 kr              │
│ Terskel        Over EØS    │  ├─────────────────────────────┤
│ Rammeavtale    Ja          │  │ TILDELINGSKRITERIER         │
│ Kunngjort      6. jan 2026 │  │ Pris 30% · Kvalitet 20%    │
│                            │  │ Gjennomf. 20% · Miljø 30%  │
│ CPV  8 koder ▸             │  │                             │
└────────────────────────────┘  └─────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ VERKTØY  Unntak ↗  Kalkulator ↗  Fristberegner ↗  Doffin ↗│
└─────────────────────────────────────────────────────────────┘
```

~324px vertikal.

### Konkurranse (aktiv)

```
┌────────────────────────────┐  ┌─────────────────────────────┐
│ FRIST                ←teal │  │ LEVERANDØRER             5  │
│     42  dager igjen        │  │ Atea AS · Sopra Steria      │
│ 22. mai 2026               │  │ Bouvet ASA · +2 til ▸       │
│ Åpen · 4 000 000 kr        │  ├─────────────────────────────┤
├────────────────────────────┤  │ HENDELSER                   │
│ ARBEIDSFLATER              │  │ 3. apr  Tilbud fra Atea     │
│ Kvalifisering          ›  │  │ 1. apr  Tilbud fra Sopra    │
│ Evaluering             ›  │  │ 6. jan  Kunngjøring         │
│ Protokoll              ›  │  │ +4 til ▸                    │
│ Meddelelse             ›  │  │                             │
└────────────────────────────┘  └─────────────────────────────┘
```

~280px vertikal. Urgency-farger på frist (teal/amber/warn/expired).

### Konkurranse (fullført — meddelelsesbrev sendt)

Fristkortet erstattes med oppsummering + "Neste steg → Tildeling".

### Tildeling (inkl. kontrakt)

```
┌────────────────────────────┐  ┌─────────────────────────────┐
│ KARENSPERIODE        ←teal │  │ AKTIVITETER                 │
│ 10 dager gjenstår          │  │ ✓ Meddelelsesbrev sendt     │
│ Utløper 2. jun 2026        │  │ ○ Karensperiode utløper     │
├────────────────────────────┤  │ ○ Signere kontrakt          │
│ ARBEIDSFLATER              │  │ ○ Kunngjøre inngåelse       │
│ Protokoll (ferdig)     ›  │  │ ○ Arkivere dokumentasjon    │
│ Meddelelsesbrev (sendt) › │  │                             │
└────────────────────────────┘  └─────────────────────────────┘
```

~200px vertikal.

## Implementeringsplan

### Steg 1: Fasedefinisjoner og layout (strukturell endring)
- Oppdater `phases.ts`: 3 faser, nye completion gates
- Lag `PhaseLine.svelte` — horisontal tidslinje-komponent
- Refaktor `+layout.svelte`: fjern PhasePanel, case-info strip, legg til PhaseLine
- Full bredde innholdsområde (ingen sidebar)

### Steg 2: Fasesider (kompakte oversikter)
- Registrering: 2-kolonne, beskrivelse trunkert, CPV kollapset, verktøy horisontalt
- Konkurranse: 2-kolonne, frist+arbeidsflater venstre, leverandører+hendelser høyre
- Tildeling: 2-kolonne, karensperiode+arbeidsflater venstre, aktiviteter høyre
- Fjern kontrakt-ruten (innhold absorberes av tildeling)

### Steg 3: Arbeidsflater (tilbake-navigasjon)
- Legg til "← Konkurranse" / "← Tildeling" tilbake-lenke på arbeidsflater
- Kvalifisering, evaluering, protokoll, meddelelse: uendret innhold, bare ny tilbake-nav

## Viktige filer

- `src/frontend/src/lib/config/phases.ts` — Fasedefinisjoner, statusutledning
- `src/frontend/src/lib/components/phase/PhasePanel.svelte` — Fjernes
- `src/frontend/src/lib/components/phase/PhaseLine.svelte` — Ny komponent
- `src/frontend/src/routes/anskaffelser/[id]/+layout.svelte` — Hoved-refaktor
- `src/frontend/src/routes/anskaffelser/[id]/+page.svelte` — Registrering (kompakt)
- `src/frontend/src/routes/anskaffelser/[id]/konkurranse/+page.svelte` — Konkurranse (kompakt)
- `src/frontend/src/routes/anskaffelser/[id]/tildeling/+page.svelte` — Tildeling (absorberer kontrakt)
- `.interface-design/system.md` — Oppdateres med ny navigasjonsmodell

## Kvalitetskrav

- `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`
- Bruk eksisterende CSS-tokens fra `app.css`
- 11px minimum fontstørrelse
- Alt synlig uten scroll på 13" laptop (692px innholdshøyde)
