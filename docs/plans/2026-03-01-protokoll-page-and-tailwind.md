# Protokollside + Tailwind CSS — Teknisk plan

**Dato:** 2026-03-01
**Avhenger av:** ADR-003 (SvelteKit-valg), protokoll-datagrunnlag.md
**Design-doc:** Lages i neste steg (interface-design)

---

## 1. Mål

Erstatte Python CLI → Word-workflow med en webside der:

1. API-data fylles inn automatisk (Artifik + Doffin, samme kilder som Python-generatoren)
2. Bruker fyller ut manuelle felter direkte i nettleseren
3. Lengre begrunnelsesfelt (tildelingsbegrunnelse, kvalifikasjon) redigeres med rik-tekst-editor
4. Genererer Word-dokument (.docx) for nedlasting via eksisterende Python-generatorer

Samtidig innføres Tailwind CSS v4 som styling-rammeverk, med migrering av eksisterende tokens.

---

## 2. Tailwind CSS v4 — innføring

### 2.1 Hvorfor nå

- **Tipex** (rik-tekst-editor) bruker Tailwind v4 — slipper å overstyre hele CSS-laget
- **Dark/light-tema** via `.dark`-klasse er innebygd infrastruktur (implementeres senere)
- **Protokollsiden er form-tung** — utility-klasser er vesentlig raskere enn scoped CSS for skjema-layout
- Prosjektet er lite nok (~15 komponenter) til at gradvis migrering er smertefritt

### 2.2 Installasjon

```bash
cd src/frontend
npm install -D tailwindcss @tailwindcss/vite
```

### 2.3 Vite-konfigurasjon

```js
// vite.config.js
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});
```

### 2.4 Token-migrering: tokens.css → @theme

Eksisterende tokens mappes til Tailwind v4 `@theme`-direktiv. Nøkkelen er at
`var(--canvas)` osv. fortsatt fungerer i scoped CSS — ingen big bang-migrering.

```css
/* app.css — erstatter nåværende import av tokens.css */
@import "tailwindcss";

@theme {
  /* Canvas & surfaces */
  --color-canvas: #0c0e14;
  --color-felt: #12151e;
  --color-felt-raised: #181c28;
  --color-felt-hover: #1e2233;
  --color-felt-active: #242840;

  /* Ink hierarchy */
  --color-ink: #e2e5ef;
  --color-ink-secondary: #8890a4;
  --color-ink-muted: #505568;
  --color-ink-ghost: #353a4d;

  /* Wire — borders */
  --color-wire: rgba(255, 255, 255, 0.06);
  --color-wire-strong: rgba(255, 255, 255, 0.10);
  --color-wire-focus: rgba(232, 168, 56, 0.35);

  /* Vekt — weight accent */
  --color-vekt: #e8a838;
  --color-vekt-dim: #c49030;
  --color-vekt-bg: rgba(232, 168, 56, 0.08);
  --color-vekt-bg-strong: rgba(232, 168, 56, 0.14);

  /* Score semantics */
  --color-score-high: #3d9a6e;
  --color-score-high-bg: rgba(61, 154, 110, 0.10);
  --color-score-mid: #8890a4;
  --color-score-low: #c45858;
  --color-score-low-bg: rgba(196, 88, 88, 0.10);

  /* Typography */
  --font-data: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Spacing (4px grid) */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

**Resultat:** `bg-canvas`, `text-ink-secondary`, `border-wire`, `font-data`,
`rounded-sm` osv. fungerer som utility-klasser. Eksisterende scoped CSS med
`var(--felt)` virker fortsatt fordi Tailwind v4 eksponerer alle `@theme`-verdier
som CSS custom properties (med `--color-`-prefiks for farger).

### 2.5 Bakoverkompatibilitet

Tailwind v4 genererer CSS custom properties fra `@theme`. Navnene endres:
- `--canvas` → `--color-canvas`
- `--sp-4` → `--spacing-4`
- `--r-sm` → `--radius-sm`

Eksisterende komponenter bruker de gamle navnene i scoped `<style>`. **Strategi:**

1. Behold `tokens.css` som alias-fil under overgangsperioden:
   ```css
   /* tokens.css — bakoverkompatibilitet */
   :root {
     --canvas: var(--color-canvas);
     --felt: var(--color-felt);
     --felt-raised: var(--color-felt-raised);
     /* ... alle aliaser */
   }
   ```
2. Nye komponenter bruker kun Tailwind-klasser eller `--color-*`-navn
3. Eksisterende komponenter migreres gradvis når de redigeres

### 2.6 Dark/light forberedelse

Tailwind v4 støtter `.dark`-klasse via `@variant dark`:

```css
@variant dark (&:where(.dark, .dark *));
```

Alle nåværende verdier er dark-mode. Light-mode legges til senere som override.
For nå settes `class="dark"` på `<html>` slik at `.dark:`-prefix er tilgjengelig
fra dag 1 uten at det endrer noe visuelt.

---

## 3. Rik-tekst-editor: Tipex (TipTap for Svelte 5)

### 3.1 Valg

| Alternativ | Vurdering |
|---|---|
| TipTap direkte | Full kontroll, men manuell reaktivitet + toolbar |
| `svelte-tiptap` | Wrapper, men tynn — sparer lite arbeid |
| **Tipex** | Svelte 5-native, runes, ferdig toolbar, Tailwind v4 |
| `sv5tiptap` | Enklere, men DaisyUI-avhengig |

**Valg: Tipex** (`@friendofsvelte/tipex`) — bygget spesifikt for Svelte 5 med
runes, snippets og floating toolbar. Bruker Tailwind v4 som vi nå innfører.

### 3.2 Installasjon

```bash
npm install @friendofsvelte/tipex
```

Tipex inkluderer TipTap-avhengigheter (`@tiptap/core`, `@tiptap/pm`,
`@tiptap/starter-kit` m.fl.) som transitive deps.

### 3.3 Bruksmønster

```svelte
<script lang="ts">
  import { Tipex } from '@friendofsvelte/tipex';
  import '@friendofsvelte/tipex/styles/index.css';
  import type { Editor } from '@tiptap/core';

  let body = $state('<p>Skriv begrunnelse her...</p>');
  let editor: Editor | undefined = $state();

  // Reaktivt HTML-innhold for lagring
  const html = $derived(editor?.getHTML() ?? '');
</script>

<Tipex {body} bind:tipex={editor} floating focal
  class="border border-wire rounded-md bg-felt min-h-[200px]" />
```

### 3.4 Tilpasning

- **Toolbar:** Tipex har innebygd toolbar med formatering, lister, lenker.
  Custom `controlComponent`-snippet kan brukes for å forenkle til kun
  det som trengs (bold, italic, lister, overskrifter)
- **Styling:** Tipex har egne CSS-variabler (`--color-tipex-*`) som kan
  overstyres i `@theme` for å matche designsystemet
- **Extensions:** Kan utvides med Placeholder, CharacterCount m.fl.

---

## 4. Protokollside — arkitektur

### 4.1 Rute

```
src/frontend/src/routes/
└── protokoll/
    ├── +page.svelte          # Protokollutfylling + generering
    └── +page.ts              # (evt. load-funksjon for å hente data)
```

Protokollsiden er en **separat rute**, ikke en del av evalueringsflowet.
Brukeren navigerer til `/protokoll`, velger anskaffelse, og fyller ut.

### 4.2 Dataflyt

```
┌──────────────────────────────────────────────────────────┐
│  Bruker velger anskaffelse (dropdown/søk)                │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Frontend henter data via Flask API proxy                │
│  GET /api/procurements/{id}          → procurement       │
│  GET /api/procurements/{id}/activities → activities      │
│  GET /api/eforms/{doffin_id}         → eForms (optional) │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Protokoll-store (ny .svelte.ts)                         │
│  - $state: procurement, activities, eforms               │
│  - $state: manualFields (brukerens input)                │
│  - $derived: seksjonene — merger API-data + manuelt      │
│  - $derived: completeness (% utfylt, mangler-liste)      │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  ProtokolForm.svelte                                     │
│  - Seksjonert skjema (akkordeon/stepper)                 │
│  - API-data: skrivebeskyttet, vist i infotabell          │
│  - Manuelle felter: input, textarea, Tipex for rik tekst │
│  - Statusindikator per seksjon (komplett/ufullstendig)   │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Generering: POST /api/protokoll/generate                │
│  - Sender merged data (API + manuelt) til Flask          │
│  - Flask kaller eksisterende Python-generator             │
│  - Returnerer .docx som blob for nedlasting              │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Backend: nye API-endepunkter

Flask-appen trenger tre nye endepunkter:

```python
# GET /api/procurements
# → Allerede i Artifik-klienten, eksponeres via proxy

# GET /api/procurements/{id}/activities
# → Allerede i Artifik-klienten, eksponeres via proxy

# GET /api/eforms/{doffin_id}
# → Ny: kaller DoffinClient.get_notice(), returnerer JSON

# POST /api/protokoll/generate
# → Ny: mottar merged data, kaller generate_protokoll_docx/_del2
# → Returnerer .docx som application/octet-stream
```

### 4.4 Protokoll-store

```typescript
// src/lib/stores/protokoll.svelte.ts

export interface ManualFields {
  // § 25-5 bokstav c — begrunnelse for ikke å dele opp
  delingsbegrunnelse?: string;
  // § 25-5 bokstav d — begrunnelse for prosedyrevalg
  prosedyrebegrunnelse?: string;
  // § 25-5 bokstav h — utvelgelsesbegrunnelse per leverandør
  utvelgelsesbegrunnelser?: Record<string, string>;
  // § 25-5 bokstav j — avvisningsbegrunnelse per leverandør
  avvisningsbegrunnelser?: Record<string, string>;
  // § 25-5 bokstav k — forkastede tilbud
  forkastedeTilbud?: string;
  // § 25-5 bokstav l — inhabilitet
  inhabilitet?: string;
  // § 25-5 bokstav m — tildelingsbegrunnelse (rik tekst via Tipex)
  tildelingsbegrunnelse?: string;
  // § 25-5 bokstav n — underleverandører
  underleverandorer?: string;
  // Kvalifikasjonsvurdering per leverandør
  kvalifikasjonsvurderinger?: Record<string, string>;
  // Klagefrist (dato)
  klagefrist?: string;
  // Del II-spesifikke
  unntakElektronisk?: boolean;
  unntakElektroniskBegrunnelse?: string;
  reservasjonIdeell?: boolean;
  reservasjonIdeellBegrunnelse?: string;
}

class ProtokollStore {
  procurement = $state<any>(null);
  activities = $state<any[]>([]);
  eforms = $state<any>(null);
  manual = $state<ManualFields>({});
  loading = $state(false);
  error = $state<string | null>(null);

  // Derived
  isDel2 = $derived(/* threshold check */);
  sections = $derived(/* merged view of all sections */);
  completeness = $derived(/* % filled, missing fields list */);
}
```

### 4.5 Seksjoner og felter

Basert på Python-generatoren (docx_del2.py / docx_del3.py):

| # | Seksjon | API-data | Manuelt felt | Rik tekst |
|---|---------|----------|--------------|-----------|
| 1 | Generell informasjon | Oppdragsgiver, ref, beskrivelse, verdi, varighet, frist | — | — |
| 2 | Prosedyre | Prosedyretype, terskel, kunngjøringsdato | Begrunnelse for valgt prosedyre | — |
| 3 | Kvalifikasjonskrav | eForms: selection_criteria | — | — |
| 4 | Tildelingskriterier | eForms: award_criteria + vekter | — | — |
| 5 | Leverandører med tilbud | Activities: SUBMIT_BID | — | — |
| 6 | Avvisning formalfeil | Activities: REJECT_PARTICIPATION | Begrunnelse per leverandør | — |
| 7 | Kvalifikasjonsvurdering | — | Vurdering per leverandør | Ja |
| 8 | Avviste leverandører | Activities: REJECT_PARTICIPATION | Kategori + begrunnelse | — |
| 9 | Utvelgelse | Activities: QUALIFYING_PARTICIPANTS | Begrunnelse per leverandør | Ja |
| 10 | Avviste tilbud | — | Forkastede tilbud + begrunnelse | — |
| 11 | Ettersending/avklaring | Activities: CONVERSATION_MARKED_COMPLETED | — | — |
| 12 | Forhandlinger/dialog | — | Detaljer (kun relevante prosedyrer) | Ja |
| 13 | Tilbud i vurderingen | Activities: SUBMIT_BID (ikke avvist) | — | — |
| 14 | **Valgt tilbud + begrunnelse** | Activities: AWARDING_PARTICIPANTS | **Tildelingsbegrunnelse** | **Ja** |
| 15 | Rammeavtaler | Procurement: framework_agreement_* | — | — |
| 16 | Underleverandører | — | Navn og omfang | — |
| 17 | Inhabilitet | — | Erklæring | — |
| 18 | Andre opplysninger | Activities: PUBLISH_ADDITIONAL_INFORMATION | Tilleggsinfo | Ja |
| 19 | Avslutning | Klagefrist-flagg | Klagefrist-dato | — |

Seksjon 14 er hovedfeltet — her brukes Tipex for tildelingsbegrunnelsen.

---

## 5. Implementeringsrekkefølge

### Fase 1: Tailwind-innføring (foundation)

1. Installer `tailwindcss` + `@tailwindcss/vite`
2. Opprett ny `app.css` med `@import "tailwindcss"` og `@theme`
3. Behold `tokens.css` som alias-fil for bakoverkompatibilitet
4. Oppdater `vite.config.js` med Tailwind-plugin
5. Verifiser at eksisterende sider ser uendret ut (alias-sjiktet)
6. Sett `class="dark"` på `<html>` i `app.html`

### Fase 2: Tipex-integrasjon (editor-komponent)

1. Installer `@friendofsvelte/tipex`
2. Lag wrapper-komponent `RichTextEditor.svelte` som:
   - Importerer Tipex med prosjektets tema-overstyringer
   - Eksponerer `body` (initial), `bind:html` (reaktivt output), `placeholder`
   - Håndterer read-only modus for API-data-visning
3. Test isolert med dummy-data

### Fase 3: Backend API-endepunkter

1. `GET /api/eforms/{doffin_id}` — wrapper rundt DoffinClient
2. `POST /api/protokoll/generate` — mottar JSON, kaller Python-generator, returnerer .docx
3. Eventuelt: `GET /api/procurements` og `GET /api/procurements/{id}/activities`
   via proxy (allerede konfigurert i Vite)

### Fase 4: Protokollside (design først)

1. **Interface-design** — detaljert UI-spec med layout, seksjoner, interaksjon
2. Protokoll-store (`protokoll.svelte.ts`)
3. Route + sidekomponent (`/protokoll/+page.svelte`)
4. Seksjonskomponenter (akkordeon med status)
5. Word-generering og nedlasting

---

## 6. Avhengigheter (nye pakker)

```json
{
  "devDependencies": {
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  },
  "dependencies": {
    "@friendofsvelte/tipex": "^latest"
  }
}
```

---

## 7. Risiko og beslutninger

| Risiko | Mitigering |
|---|---|
| Tipex-styling kolliderer med tokens | Overstyring via `@theme` + CSS custom properties |
| Tailwind v4 er relativt nytt | Kun CSS-lag — fallback til scoped CSS fungerer alltid |
| Python-generator forventer visse manuelle felter | Utvid generator-funksjoner med `manual_fields`-parameter |
| eForms ikke tilgjengelig for alle anskaffelser | Vis "ikke tilgjengelig" med manuell input som fallback |
| Stora begrunnelsesfelt kan bli tunge å lagre | LocalStorage-autosave + evt. backend draft-lagring |

---

## 8. Utenfor scope

- Light-mode tema (`.dark`-toggle) — infrastruktur legges, implementeres senere
- Migrering av alle eksisterende komponenter til Tailwind — gjøres gradvis
- Protokoll-deling / samarbeid mellom brukere
- PDF-eksport (kun .docx via eksisterende generator)
- Automatisk utfylling fra evalueringsmatrisen (kobling mellom evaluering → protokoll)
