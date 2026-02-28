# ADR-003: Vurdering av SvelteKit 2 med Svelte 5 som frontend-rammeverk

**Status:** Anbefalt med forbehold
**Dato:** 2026-02-28
**Kontekst:** Valg av frontend-rammeverk for anskaffelsessystemets evalueringsmodul

---

## 1. Anbefaling

**Betinget ja — SvelteKit 2 med Svelte 5 er et godt valg for dette prosjektet, men ikke det eneste forsvarlige.**

SvelteKit anbefales fremfor alternativene basert på en samlet vurdering av prosjektets karakter: tett, tallrik evalueringsmatrise med kaskaderende beregninger, lite team, AI-assistert utvikling, og et designsystem som bygges fra bunnen. Anbefalingen er betinget fordi vanilla JS + Vite er et reelt alternativ for den nåværende funksjonaliteten, og React ville gitt bedre AI-verktøystøtte.

**Avgjørende faktorer for SvelteKit:**
- Svelte 5 runes (`$state`, `$derived`) passer svært godt for kaskaderende matrise-beregninger
- Kompilator-basert tilnærming gir minimal runtime-overhead — viktig for et dense data-UI
- Innebygd `transition:` og `animate:` dekker behovene for panelanimasjoner
- Prosjektet bygger eget designsystem (ingen avhengighet av komponentbiblioteker)
- SvelteKit gir filbasert routing, API-proxy og SSR/SPA-fleksibilitet uten ekstra oppsett

---

## 2. Styrker — hva SvelteKit gjør spesielt godt for dette prosjektet

### 2.1 Runes og evalueringsmatrisen

Svelte 5 runes er som skapt for denne typen kaskaderende beregninger:

```svelte
<script>
  // Scores-matrisen som reaktiv state
  let scores = $state({
    criteria: [
      {
        name: 'Kompetanse',
        weight: 30,
        subcriteria: [
          { name: 'Erfaring', weight: 15, scores: { bouvet: 8, sopra: 7, knowit: 6 } },
          { name: 'Kapasitet', weight: 15, scores: { bouvet: 7, sopra: 8, knowit: 7 } }
        ]
      }
    ]
  });

  // Vektede snitt kaskaderer automatisk
  let weightedTotals = $derived(
    calculateWeightedTotals(scores.criteria)
  );

  // Rangering oppdateres reaktivt
  let ranking = $derived(
    Object.entries(weightedTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score], i) => ({ rank: i + 1, name, score }))
  );
</script>
```

- `$derived` håndterer kaskaderende beregninger uten manuell abonnementshåndtering
- Dyp reaktivitet via proxyer betyr at endring av en enkelt score (`scores.criteria[0].subcriteria[1].scores.bouvet = 9`) automatisk oppdaterer vektede snitt, rangering og innsiktpanel
- ~30 reaktive celler er godt innenfor Svelte 5s ytelsesbudsjett — dette er ikke en tabell med tusenvis av rader

### 2.2 Skjemahåndtering for protokollgeneratoren

`bind:value` fungerer utmerket for ~20 seksjoner:

```svelte
<input bind:value={protocol.section1.title} />
<textarea bind:value={protocol.section5.description} />
<select bind:value={protocol.method}>
  <option value="poeng">Poengmodell</option>
  <option value="pris">Prismodell</option>
</select>
```

- To-veis binding er Sveltes kjernestyrke og eliminerer boilerplate
- Ingen behov for controlled components-mønsteret fra React
- `$state` med dype objekter dekker skjemaets datamodell direkte

### 2.3 Animasjoner og overganger

Innebygd `transition:` dekker innsiktpanelets behov:

```svelte
{#if showInnsikt}
  <div transition:slide={{ duration: 200 }}>
    <!-- Innsiktpanel -->
  </div>
{/if}
```

- Ingen ekstra bibliotek nødvendig for panelanimasjoner, tab-overganger, kollapserbare seksjoner
- `animate:flip` kan brukes for sorteringsanimasjoner i rangeringslisten

### 2.4 Kompilert output og ytelse

- Svelte kompilerer bort rammeverket — output er vanilla JS med kirurgiske DOM-oppdateringer
- Spesielt relevant for det dense, tall-tunge UI-et der unødvendige re-renders ville merkes
- Bundle-størrelse typisk 15–30 % mindre enn React-ekvivalent

### 2.5 CSS-scoping

Sveltes innebygde CSS-scoping passer perfekt når man bygger designsystem fra tokens:

```svelte
<style>
  .cell-score {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }
</style>
```

- Ingen CSS-in-JS-bibliotek nødvendig
- Tokens fra mockupen (`--canvas`, `--felt`, `--vekt`, etc.) brukes direkte som CSS custom properties
- Scoping forhindrer navnekollisjon mellom komponenter

---

## 3. Risikoer — konkrete ting som kan bli problematiske

### 3.1 `$state` med dype nestede objekter (MIDDELS RISIKO)

**Problem:** Scores-matrisen er et dypt nestet objekt. Svelte 5 bruker proxyer for dyp reaktivitet, men det er viktige begrensninger:

- Kun POJOs og arrays proxifiseres — klasser og `Object.create()`-objekter får ikke dyp reaktivitet
- `$state(data)` kan bryte forbindelsen til `$props()` i SvelteKit-ruter (kjent issue med `+page.svelte` data)
- Reactive Maps og Sets proxifiserer ikke verdiene sine dypt

**Mitigering:**
- Hold scores-matrisen som plain objects (ikke klasser)
- Bruk `$state.snapshot()` før serialisering til API
- For store, ikke-muterte datasett (f.eks. leverandørliste fra API): bruk `$state.raw`

### 3.2 `$effect`-overbruk (MIDDELS RISIKO)

**Problem:** Det er fristende å bruke `$effect` for å synkronisere matrise → rangering → innsikt, men dette er et kjent anti-mønster i Svelte 5.

**Offisiell veiledning:**
- Bruk `$derived` for beregninger, **aldri** `$effect`
- `$effect` kun for ekte sideeffekter: DOM-manipulasjon, API-kall, logging
- Oppdatering av `$state` inne i `$effect` kan gi uendelige løkker

**Mitigering:**
- Etabler konvensjon tidlig: `$derived` for all beregningslogikk
- Bruk `$effect` kun for: lagring til API, clipboard-operasjoner, fokus-håndtering
- `$inspect.trace()` for debugging under utvikling

### 3.3 Økosystem for tredjepartskomponenter (LAV-MIDDELS RISIKO)

**Tabeller:** Prosjektet trenger ikke et generisk tabell-bibliotek — evalueringsmatrisen er en spesialbygget komponent med domene-spesifikk logikk. Den statiske mockupen (2500 linjer HTML/CSS) viser at teamet allerede bygger dette selv.

**Charts:** Begrenset behov. D3.js og Chart.js fungerer rammeverk-agnostisk. LayerChart og Pancake er Svelte-native alternativer.

**PDF-eksport:** Protokollgeneratoren bruker allerede `python-docx` på serversiden — dette er uavhengig av frontend-rammeverk.

### 3.4 AI-verktøystøtte (MIDDELS RISIKO)

**Problem:** React har klart mest treningsdata for AI-kodingsassistenter (Claude, Copilot). Svelte 5 runes-syntaksen er relativt ny (stabil siden Q4 2024), og AI-modeller kan generere utdatert Svelte 4-kode.

**Realitet per februar 2026:**
- Claude og Copilot håndterer Svelte 5 runes godt for standardmønstre
- Mer obskure mønstre (f.eks. `$effect.root`, `$state.raw` for ytelsesoptimalisering) kan kreve mer manuell korrigering
- SvelteKit-konvensjoner (`+page.svelte`, `+layout.server.ts`) er godt dekket

**Mitigering:**
- Inkluder `.svelte`-eksempler i prosjektets `CLAUDE.md` for å veilede AI
- Standardmønstre dekker 90 % av behovet

### 3.5 Teamkompetanse (VURDER SELV)

- Hvis teamet allerede kan Svelte: lav risiko
- Hvis teamet kun kan React: SvelteKit-læringskurven er kortere enn forventet, men runes-paradigmet krever omstilling
- For 1–2 utviklere er Svelte generelt raskere å bli produktiv med enn React (mindre boilerplate)

---

## 4. Alternativ vurdering

### 4.1 React (Vite eller Next.js) — «Det trygge valget»

| Aspekt | Vurdering |
|--------|-----------|
| **Økosystem** | Størst. TanStack Table, Recharts, AG Grid, utallige komponentbiblioteker |
| **AI-verktøystøtte** | Best i klassen. Mest treningsdata, best Copilot-støtte |
| **Evalueringsmatrise** | Krever mer boilerplate (`useState`, `useMemo`, `useCallback`) for kaskaderende beregninger. `useEffect`-fellen er enda verre enn Svelte 5s `$effect` |
| **Bundle-størrelse** | Større runtime (~40 KB gzipped for React + ReactDOM) |
| **Skjemahåndtering** | Controlled components krever mer kode enn `bind:value` |
| **Prosjektegnethet** | Overkill for denne skalaen. React skinner i store team og store apper |

**Konklusjon:** React er et forsvarlig valg og det tryggeste for AI-assistert utvikling. 82 % bruksandel (State of JS 2024) betyr at Claude, Copilot og Cursor genererer vesentlig bedre React-kode enn kode for noe annet rammeverk. For et 1–2 personers team som lener seg tungt på AI er dette en reell 2–3x produktivitetsmultiplikator. Likevel gir React mer boilerplate for kaskaderende beregninger (`useReducer`/`useMemo` vs. `$derived`), og prosjektet bygger eget designsystem (ingen fordel av Reacts komponentbiblioteker). **React + Vite (ikke Next.js) er det sterkeste alternativet til SvelteKit.** Velg React hvis AI-verktøystøtte er viktigere enn utviklerergonomi for reaktive beregninger.

### 4.2 Vue 3 (Nuxt) — «SvelteKit-alternativet med større økosystem»

| Aspekt | Vurdering |
|--------|-----------|
| **Reaktivitet** | `ref()` / `computed()` er konseptuelt likt `$state` / `$derived`, men mer verbost |
| **Økosystem** | Større enn Svelte, spesielt i Europa/Asia |
| **v-model** | Lignende ergonomi som `bind:value` |
| **Bundle** | Mindre enn React, større enn Svelte |
| **Template-syntaks** | Separate `<template>`, `<script>`, `<style>`-blokker — fungerer, men mer indireksjon enn Svelte |

**Konklusjon:** Solid alternativ, men gir ingen avgjørende fordel over SvelteKit for dette prosjektet. Ville vært foretrukket hvis teamet allerede bruker Vue.

### 4.3 HTMX + server-rendert — «Minimal JS»

| Aspekt | Vurdering |
|--------|-----------|
| **Backend-integrasjon** | Ideelt — Flask/FastAPI serverer HTML direkte |
| **Evalueringsmatrise** | **Ikke egnet.** ~30 celler med kaskaderende klient-side beregninger, live score-oppdateringer og innsiktpanel krever rike klient-side interaksjoner. HTMX sender hvert klikk til serveren |
| **Skjemaer** | Fungerer utmerket for protokollgeneratoren |
| **Kompleksitet** | Lavest mulig JS-fotavtrykk |

**Konklusjon:** Faller på evalueringsmatrisens krav. Den kaskaderende beregningslogikken hører hjemme i klienten, ikke i 30 HTTP-roundtrips per endring. HTMX passer for CRUD, ikke for interaktive analyseverktøy.

### 4.4 Vanilla JS + Vite (nåværende) — «Utvid det som fungerer»

| Aspekt | Vurdering |
|--------|-----------|
| **Dagens tilstand** | 60 linjer JS (anskaffelsesliste) + 2500 linjer statisk mockup |
| **Skalerbarhet** | Mockupen viser allerede at vanilla JS blir uhåndterlig — 80+ linjer ren DOM-manipulasjon for enkel interaktivitet |
| **State management** | Må bygges manuelt. Kaskaderende beregninger uten reaktivitetssystem = manuell dependency tracking |
| **Komponentisering** | Ingen — alt i ett script. Evalueringsmatrisen, innsiktpanelet og rangeringen ville bli én stor fil |
| **Testing** | Vanskelig å teste uten komponentgrenser |

**Konklusjon:** Anskaffelseslisten (CRUD) klarer seg med vanilla JS. Evalueringsmatrisen med kaskaderende beregninger, to metoder, og innsiktpanel vil bli uhåndterlig uten et reaktivitetssystem. **Vanilla JS er tilstrekkelig for dagens kode, men ikke for den planlagte funksjonaliteten.**

### 4.5 Solid.js — «Svelte 5-alternativet»

| Aspekt | Vurdering |
|--------|-----------|
| **Reaktivitet** | Signals-basert, konseptuelt svært likt Svelte 5 runes |
| **Ytelse** | Marginalt bedre raw performance enn Svelte i benchmarks |
| **Økosystem** | Vesentlig mindre enn Svelte, mye mindre enn React |
| **SolidStart** | Mindre modent enn SvelteKit |
| **AI-støtte** | Dårligst av alle alternativer — svært lite treningsdata |

**Konklusjon:** Teknisk interessant, men økosystemet og AI-verktøystøtten er for liten for et produksjonsprosjekt med 1–2 utviklere.

---

## 5. SvelteKit vs. Svelte + Vite (SPA)

### Trenger vi SvelteKit?

**Kort svar: Ja, men ikke for SSR.**

Appen er bak innlogging — SSR/SSG gir ingen SEO-fordel. Men SvelteKit gir vesentlige fordeler utover SSR:

| SvelteKit-funksjon | Verdi for dette prosjektet |
|--------------------|---------------------------|
| **Filbasert routing** | 4-5 ruter (anskaffelsesliste, evaluering, protokoll, kontrakter, innstillinger) — konvensjonsbasert i stedet for manuell router-konfig |
| **`+page.ts` load functions** | Data-fetching med type-sikkerhet, automatisk avhengighetsbasert re-fetching |
| **`+layout.svelte`** | Sidebar + workspace-layout fra mockupen, delt på tvers av alle sider |
| **`+error.svelte`** | Feilhåndtering per rute |
| **API-proxy / server routes** | `+server.ts` kan erstatte Vite proxy-config for API-kall til Flask |
| **Adapter-system** | `adapter-node` for Cloud Run-deploy (offisiell Google Cloud-dokumentasjon finnes) |
| **Forhåndsbygd optimalisering** | Code splitting, prefetching, preloading uten manuell konfig |

**Valgt konfigurasjon: `adapter-static` (SPA-modus)**

`adapter-node` ble opprinnelig vurdert, men **`adapter-static`** er bedre for dette prosjektet:

1. **Én container.** Flask serverer både API og statiske filer fra samme Cloud Run-instans. Ingen separat Node-server.
2. **Enklere deploy.** `npm run build` → statiske filer i `build/` → Flask serverer dem. Ingen Node-runtime i prod.
3. **Billigere.** Ingen ekstra Cloud Run-tjeneste for frontend. Statiske filer koster ingenting å serve.
4. **Secrets på ett sted.** Alle Cloud Run-secrets tilhører Flask-tjenesten.

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({ fallback: 'index.html' })
  }
};
```

```ts
// src/routes/+layout.ts
export const ssr = false; // Ren SPA — alt rendres client-side
```

Flask serverer SvelteKit-buildet:
```python
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    file_path = os.path.join(BUILD_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(BUILD_DIR, path)
    return send_from_directory(BUILD_DIR, "index.html")
```

**Deploy-arkitektur:**
```
Cloud Run (én tjeneste, Python-container)
├── Flask API            →  /api/*
└── SvelteKit build/     →  /* (statisk HTML/JS/CSS)
```

---

## 6. Konkrete advarsler — ting teamet bør vite før de committer

### 6.1 Sikkerhetspatcher (KRITISK)

Svelte-teamet slapp patches for 5 CVE-er i økosystemet i løpet av Q4 2025/Q1 2026. **Hold avhengigheter oppdatert** og les [sikkerhets-bloggposten](https://svelte.dev/blog).

### 6.2 `$state` med nestede objekter

- Bruk kun plain objects — aldri klasser — for reaktiv state
- Bruk `$state.snapshot()` før du sender data til API
- Bruk `$state.raw` for store read-only datasett (leverandørlister fra API)

### 6.3 `$effect` — minimér bruken

- Aldri oppdater `$state` inne i `$effect` uten `untrack`
- Bruk `$derived` for alle beregninger (vektede snitt, rangering, innsikt)
- `$effect` kun for: API-kall, DOM-manipulasjon, logging

### 6.4 Testing: velg riktig oppsett

To alternativer:

1. **Tradisjonell:** `@testing-library/svelte` + jsdom + Vitest — fungerer, men kan gi problemer med runes-reaktivitet
2. **Moderne (anbefalt):** `vitest-browser-svelte` + Playwright — tester i ekte browser, bedre runes-støtte

### 6.5 SvelteKit + Flask-integrasjon (VALGT)

Flask serverer SvelteKit-buildet direkte fra `src/frontend/build/`. Én Cloud Run-instans, ingen CORS, ingen separat frontend-server.

- **Dev:** `vite dev` med proxy til Flask (`/api` → `localhost:5000`)
- **Prod:** `npm run build` → Flask serverer statiske filer + `index.html` fallback
- **Ingen `adapter-node`** — kun `adapter-static` med `fallback: 'index.html'`

### 6.6 Migrering av mockup

Evalueringsmockupen (2512 linjer) bør dekomponeres til Svelte-komponenter:

```
src/lib/components/
├── evaluation/
│   ├── EvaluationMatrix.svelte      # Hovedtabell
│   ├── ScoreCell.svelte             # Enkelt score-felt
│   ├── CriterionRow.svelte          # Kriteriegruppe-rad
│   ├── AnnotationPanel.svelte       # Utvidet notat-panel
│   ├── RankingStrip.svelte          # Top-3 rangering
│   └── MethodToggle.svelte          # Poeng/Pris-toggle
├── insights/
│   ├── InsightsPanel.svelte         # Kollapsbart innsiktpanel
│   ├── WillingnessToPayTab.svelte   # Betalingsvilje
│   ├── RobustnessTab.svelte         # Robusthetsanalyse
│   └── MethodControlTab.svelte      # Metodekontroll
├── protocol/
│   └── ProtocolForm.svelte          # Protokollgenerator
└── ui/
    ├── tokens.css                   # Designsystem-tokens
    └── DataCell.svelte              # Gjenbrukbar data-celle
```

### 6.7 Cloud Run-deploy (VALGT: adapter-static + Flask)

`adapter-node` er **ikke nødvendig.** SvelteKit bygges med `adapter-static` til rene HTML/JS/CSS-filer som Flask serverer fra samme container. Fordeler:

- **Én Cloud Run-tjeneste** — Python-container med Flask. Ingen Node-runtime i prod.
- **Secrets samlet** — alle Cloud Run-secrets tilhører Flask-instansen.
- **Ingen CORS** — frontend og API på samme origin.
- **Enklere Dockerfile** — kun Python-avhengigheter + `npm run build` i build-steg.

```dockerfile
# Multi-stage: build frontend, then run Python
FROM node:22-slim AS frontend
WORKDIR /app/src/frontend
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY --from=frontend /app/src/frontend/build src/frontend/build
COPY . .
RUN pip install -r requirements.txt
CMD ["gunicorn", "src.app:create_app()", "-b", "0.0.0.0:8080"]
```

### 6.8 `.svelte.ts` for delt state — anbefalt mønster

Runes fungerer i `.svelte.ts`-filer, men du **kan ikke eksportere en reassignable `$state`-variabel** direkte. Bruk klasse-baserte stores (Rich Harris' anbefalte mønster):

```ts
// src/lib/stores/evaluation.svelte.ts
class EvaluationStore {
  #scores = $state<ScoreMatrix>({});

  get scores() { return this.#scores; }

  updateScore(criterionId: string, supplierId: string, value: number) {
    this.#scores[criterionId].suppliers[supplierId] = value;
  }
}
export const evaluation = new EvaluationStore();
```

**SSR-advarsel:** Modul-nivå state deles mellom alle requests på serveren. Bruk `setContext`/`getContext` i `+layout.svelte` for SSR-sikker state-isolasjon. (Mindre relevant med `ssr: false`.)

### 6.9 SvelteKit 2 breaking changes å kjenne til

- `throw error()` / `throw redirect()` er fjernet — kall `error()` / `redirect()` direkte
- Top-level promises i `load` auto-awaites ikke — eksplisitt `await` kreves
- `cookies.set()` krever `path`-option
- Komponenter er funksjoner, ikke klasser — bruk `mount()` i stedet for `new Component()`

---

## 7. Versjonsanbefaling

Per februar 2026, bruk følgende versjoner:

```json
{
  "devDependencies": {
    "svelte": "^5.53.5",
    "@sveltejs/kit": "^2.53.3",
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "vitest": "^4.0.0",
    "vitest-browser-svelte": "^0.1.0",
    "@vitest/browser": "^4.0.0",
    "playwright": "^1.50.0"
  }
}
```

**Sikkerhetsminimumsversjoner (CVE-patcher Q4 2025/Q1 2026):**
- `svelte >= 5.46.4`
- `@sveltejs/kit >= 2.49.5`
- `@sveltejs/adapter-node >= 5.5.1`
- `devalue >= 5.6.2`

**Pinning-strategi:** Bruk `^` (caret) for minor-oppdateringer, men test grundig etter oppgradering — Svelte 5 har hatt breaking warnings mellom minor-versjoner (f.eks. `state_referenced_locally` i 5.45.3).

---

## 8. Oppsummering

| Kriterium | SvelteKit | React | Vue | HTMX | Vanilla JS |
|-----------|:---------:|:-----:|:---:|:----:|:----------:|
| Kaskaderende beregninger | **A** | B | B | D | C |
| Skjemahåndtering | **A** | C | A | B | C |
| Bundle-størrelse | **A** | C | B | A | A |
| AI-verktøystøtte | B | **A** | B | C | B |
| Økosystem | C | **A** | B | C | - |
| Læringskurve | **A** | B | A | A | - |
| Vedlikeholdbarhet | **A** | A | A | B | D |
| Cloud Run-deploy | A | A | A | A | A |

**Totalvurdering:** SvelteKit 2 med Svelte 5 gir den beste balansen mellom utviklerergonomi, ytelse og egnethet for domenet. Runes-systemet er modent nok for produksjon, adapter-node fungerer på Cloud Run, og det planlagte designsystemet drar fordel av Sveltes innebygde CSS-scoping og transition-system.

**Neste steg:**
1. Initialiser SvelteKit-prosjekt med `npx sv create`
2. Konfigurer `adapter-node` og SPA-modus
3. Migrer designtokens fra mockupen til `tokens.css`
4. Bygg evalueringsmatrisen som første komponent — dette er proof-of-concept for hele valget
