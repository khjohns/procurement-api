# Prompt Handoff: Vurder SvelteKit som frontend-rammeverk

## Din rolle

Du er en erfaren frontend-arkitekt. Vurder om **SvelteKit 2 med Svelte 5** (siste stabile versjon per februar 2026) er riktig valg for frontenden beskrevet nedenfor. Gi en ærlig, kritisk vurdering — ikke bekreft valget bare fordi det allerede er foreslått.

## Prosjektkontekst

### Hva dette er

Et **norsk offentlig anskaffelsessystem** (procurement). Backend er Python (FastAPI) som wrapper Artifik API (ekstern leverandør). Frontenden skal brukes av innkjøpere i offentlig sektor for å evaluere tilbud fra leverandører.

### Nøkkelfunksjonalitet

1. **Evalueringsmatrise** — hovedkomponenten. En tett, tallrik tabell der innkjøpere scorer leverandører (0–10) mot vektede kriterier. ~30 celler som kaskaderer til vektede snitt, rangering og innsikt. To metoder: poengmodell og prismodell.
2. **Protokollgenerator** — skjema med ~20 seksjoner, delvis forhåndsutfylt fra API, delvis manuell utfylling. Genererer anskaffelsesprotokoll ihht. forskrift § 25-5.
3. **Anskaffelsesliste** — enkel CRUD-liste over pågående anskaffelser.
4. **Innsiktpanel** — betalingsvilje, robusthetsanalyse, metodekontroll. Kollapsbart, med tabs.

### Designsystem ("Analysebordet")

Retning: Dense, number-forward evaluation workspace. Inspirert av finansielle analyseverktøy. Dark mode. Ingen ekstern komponentbibliotek — bygges fra tokens.

**Tokens (utdrag):**
- Overflater: `--canvas: #0c0e14`, `--felt: #12151e` (cool dark blues)
- Tekst: `--ink: #e2e5ef`, `--ink-secondary: #8890a4`
- Aksent: `--vekt: #e8a838` (amber, brukes til vekting/highlighting)
- Score-semantikk: grønn (høy), nøytral (midt), rosa (lav)
- Font: JetBrains Mono (data), Inter (UI)
- Spacing: 4px base grid
- Radius: 4–8px (teknisk, ikke vennlig)
- Dybde: Kun borders, ingen shadows

**Signaturelement:** "Vektlinjen" — vertikal amber-aksent langs venstre kant av matrisen.

### Eksisterende kode

- **Backend:** Python/FastAPI, ferdig
- **Frontend nå:** Vanilla JS + Vite, bare en enkel anskaffelsesliste (60 linjer JS). En separat `evaluation-mockup.html` (statisk HTML/CSS, ~800 linjer) som viser hele evalueringsmatrisen som prototype
- **Ingen rammeverk installert ennå** — pakkevalg er åpent

### Teamkontekst

- Lite team (1–2 utviklere)
- AI-assistert utvikling (Claude Code)
- Ikke enterprise-skala — hundrevis av brukere, ikke millioner
- Norsk språk i UI

## Hva du skal vurdere

### 1. Egnethet for domenet

- Passer Svelte 5 runes (`$state`, `$derived`, `$effect`) for kaskaderende matrise-beregninger?
- Håndterer Svelte tabelldata med ~30+ reaktive celler effektivt?
- Hvordan fungerer `bind:value` for skjemaer med ~20 seksjoner?
- Er innebygd `transition:` tilstrekkelig for panelanimasjoner?

### 2. Svelte 5 modenhet (per februar 2026)

- Er runes API-et stabilt nok for produksjon?
- Finnes det kjente gotchas med `$state` for nested objekter (scores-matrisen)?
- Hva er status for `$effect` — er det fortsatt advarsler om overbruk?
- Fungerer `.svelte.ts`-filer godt for delt state mellom komponenter?

### 3. Økosystem og risiko

- Tredjepartsbiblioteker: får vi det vi trenger (tabeller, charts, PDF-eksport)?
- SSR/SSG — trenger vi det? Appen er bak innlogging
- Adapter-situasjon: deployes trolig på GCP (Cloud Run). Finnes adapter?
- TypeScript-støtte i Svelte 5 — er den moden?
- Testing: Vitest + Testing Library-støtte?

### 4. Alternativer å veie mot

Vurder kort disse alternativene og begrunn hvorfor SvelteKit er/ikke er bedre:
- **React (Next.js/Vite)** — størst økosystem, mest AI-treningsdata
- **Vue 3 (Nuxt)** — lignende reaktivitetsmodell, større økosystem
- **Solid.js** — signals-basert (som Svelte 5), finkornet reaktivitet
- **HTMX + server-rendert** — backend er allerede Python, minimal JS
- **Vanilla JS (nåværende)** — mockupen fungerer allerede, kanskje bare utvide?

### 5. SvelteKit-spesifikt

- Trenger vi SvelteKit, eller holder Svelte + Vite (SPA)?
- Hva gir SvelteKit oss utover routing? (form actions, load functions, etc.)
- Er `+page.svelte`/`+layout.svelte`-konvensjonen hensiktsmessig for denne appen?

## Forventet output

Gi en strukturert vurdering med:

1. **Anbefaling** — ja/nei/betinget, med begrunnelse
2. **Styrker** — hva SvelteKit gjør spesielt godt for dette prosjektet
3. **Risikoer** — konkrete ting som kan bli problematiske
4. **Alternativ vurdering** — kort sammenligning med 2–3 mest relevante alternativer
5. **Konkrete advarsler** — ting teamet bør vite før de committer til SvelteKit
6. **Versjonanbefaling** — nøyaktig hvilke pakke-versjoner å bruke

**Vær ærlig.** Hvis vanilla JS + Vite faktisk er tilstrekkelig for dette prosjektet, si det. Hvis React er bedre valg pga. AI-verktøystøtte, si det. Ikke optimer for "kult rammeverk" — optimer for raskest vei til et fungerende, vedlikeholdbart produkt.
