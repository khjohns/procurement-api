# Design System — Anskaffelser

## Direction: "Analysebordet"

Dense, number-forward evaluation workspace. Inspired by financial analysis tools.
Authoritative, precise, data-dense. The evaluation matrix IS the interface.

**Feel:** Like a financial analyst's desk — numbers are the primary content, everything serves the numbers.
**Not:** Friendly, spacious, consumer-soft. This is analytical tooling — warm neutrals serve focus, not decoration.

### Core Narrative: Arbeidsbenken

Et verktøy som føles som et godt organisert skrivebord for en fagperson i offentlig forvaltning. Brukeren (innkjøpsrådgiver) har 8–12 anskaffelser i ulike faser. Verktøyet er *mellom* dokumentlesing og møter — stedet hun strukturerer vurderingene sine.

Tre verb: *klassifisere* (registrering), *vurdere* (evaluering), *begrunne* (protokoll/meddelelsesbrev). Hele prosessen kulminerer i en skriftlig begrunnelse som tåler innsyn, klage og KOFA-prøving. Verktøyet er et *begrunnelsesverktøy*.

**Ikke** et dashboard (hun overvåker ikke). **Ikke** en wizard (hun vet hva hun gjør). **Ikke** et skjema (hun fyller ikke ut, hun *vurderer*). Nærmest en *arbeidsbenk* — et sted der materialer (tilbud, kriterier, scores) ligger fremme, og hun jobber med dem systematisk.

### Two Visual Modes

The interface has two distinct visual modes, selected by content purpose:

| Modus | Formål | Layout | Dybde | Radius | Eksempler |
|---|---|---|---|---|---|
| **Orientering** | Scanning, status, navigasjon | Bento grid (størrelse = viktighet) | Shadows (kort svever) | 10–14px (myk, fysisk) | Registrering, konkurranse, tildeling, kontrakt |
| **Arbeid** | Vurdering, scoring, skriving | Uniform vertikal (likebehandling) | Borders-only (stille struktur) | 4–8px (teknisk, presis) | Evaluering, kvalifisering, protokoll |

The phase panel bridges both modes — always visible, always the same.

### Signature Element: Fasepanelet

En vertikal prosessnavigator som *alltid* er synlig. Viser hele livssyklusen fra registrering til kontrakt. Transformerer innholdsområdet når du klikker mellom faser. Det er et *prosess-termometer* som er meningsløst utenfor anskaffelsesdomenet.

- Collapsed (52px): Ikoner fargekodet etter status (grønn = fullført, teal = aktiv, dempet = kommende). Aktiv fase har pulserende prikk. Valgt fase har tykkere ikon-strek og teal venstre-border.
- Expanded (230px): Ikon + label + meta. Fullførte faser viser `✓ 14. feb`. Aktiv konkurranse viser `Frist: 12. mai · 36d`. Labels fader inn med 60ms delay.
- Cubic-bezier(0.22,1,0.36,1) transition, 0.25s.
- Mobile: hamburger i header, slide-in overlay fra venstre (240px).

---

## Narrativ og informasjonsarkitektur

Progressiv eksponering av detaljer i tre nivåer.

Alle arbeidsflater tilhører én spesifikk anskaffelse. Navigasjonen gjenspeiler dette eierskapet.

### Rutestruktur

```
/anskaffelser                          → Kontrollbordet (oversikt)
/anskaffelser/[id]                     → Registrering (fase 01)
/anskaffelser/[id]/konkurranse         → Konkurranse (fase 02)
/anskaffelser/[id]/kvalifisering       → Kvalifisering (fase 03)
/anskaffelser/[id]/evaluering          → Evaluering (fase 04)
/anskaffelser/[id]/tildeling           → Tildeling — oversikt (fase 05)
/anskaffelser/[id]/protokoll           → Arbeidsflate: anskaffelsesprotokoll
/anskaffelser/[id]/meddelelse          → Arbeidsflate: meddelelsesbrev
/anskaffelser/[id]/kontrakt            → Kontrakt (fase 06)
```

### App-shell

All pages under `/anskaffelser/[id]` share a persistent shell:
- **Header** (48px): Breadcrumbs + theme toggle + user info
- **Case-info strip**: Procurement reference, Del II/III badge, oppdragsgiver, kontraktstype, verdi
- **Phase panel** (left): 6-phase navigator (registrering → kontrakt)
- **Content header**: Phase number + label + status badge (fullført/aktiv/kommende)
- **Main content**: Workspace component

### Narrativskille

| Nivå | Rute | Metafor | Formål | Visuell modus |
|---|---|---|---|---|
| 1 | `/anskaffelser` | **Kontrollbordet** | Scan alle anskaffelser, triage | Orientering |
| 2 | `/anskaffelser/[id]` | **Faseoversikt** | Status, fremdrift, neste steg | Orientering (bento) |
| 3 | `/anskaffelser/[id]/*` | **Arbeidsflaten** | Kvalifisering / evaluering / protokoll | Arbeid (uniform) |

**Fasesider** (registrering, konkurranse, tildeling, kontrakt) bruker orienteringsmodus — bento-grid der kortstørrelse kommuniserer viktighet. Hero-kort (2×1 eller 2×2) for frister og nøkkeltall. Mindre kort for dokumenter og team.

**Arbeidsflater** (evaluering, kvalifisering, protokoll, meddelelse) bruker arbeidsmodus — uniform layout for likebehandlet vurdering.

### Kontrollbordet — visninger

Kontrollbordet har to visninger: **tidslinje** og **tabell** (toggle, preferanse i localStorage).

#### Tidslinjevisning

HUD-inspirert tidslinjevisning (tilsvarende KOE saksoversikt). Rad-per-anskaffelse med horisontale tidslinje-noder.

**Layout:** 260px meta (anskaffelses-id + tittel) + flex tidslinje-canvas. 52px radhøyde.

**Noder (16px):** Hendelser i anskaffelsens livssyklus.

| Node | Hendelse | Type | Farge (border/tekst) | Karakter |
|---|---|---|---|---|
| U | Utkast opprettet | Singel | `ink-ghost` | Passiv |
| K | Kunngjort på Doffin | Singel | `ink-secondary` | Informativ |
| F | Forespørsel om deltakelse mottatt | Klynge (antall) | `vekt` (amber) | Innkommende |
| S | Kvalifiseringssjekk fullført | Klynge (+1 per leverandør) | `score-high`/`score-low` | Kvalifisert/avvist |
| T | Tilbud mottatt | Klynge (antall) | `vekt` (amber) | Innkommende |
| E | Tilbudsevaluering fullført | Klynge (+1 per leverandør) | `score-high` | Arbeid utført |
| P | Protokoll ferdigstilt | Singel | `ink` (full) | Ferdigstilt |

Sekvensiell livssyklus: **U → K → F → S → T → E → P**

**Ubesvart/besvart-logikk:** Noder som representerer ventende arbeid (F uten tilhørende S, T uten tilhørende E) vises som filled (krever oppmerksomhet). Ferdige noder vises som outline med redusert opacity.

**Klynge-logikk:** Hendelser innenfor 5% av tidslinjebredden grupperes. Cluster-tag med prioritet basert på hastegrad. S-noder med semantisk farge (grønn/rose) gir umiddelbar triage i klyngen.

**Tidsakse, dot grid, aktiv rad, eksplosjons-hover, digital ink-flow:** Samme mønster som KOE saksoversikt (se referanseimplementasjon).

#### Tabellvisning

Full-width tabell med kolonner: ID, Navn, Status/fase, Leverandører, Fremdrift (faseindikatorer), Siste aktivitet. Sortérbar. Samme sporkort-estetikk.

#### Høyrepanel (kontrollbordet)

Vises ved klikk på tidslinje-rad (ikke navigasjon — klikk på saksnavn navigerer til saksmappen). 460px slide-in fra høyre.

Innhold: anskaffelses-id, tittel, status, sammendrag, faseoversikt med status per fase, nøkkeltall (antall leverandører, tilbud), hendelsesforløp. "Åpne saksmappe →" lenke i bunn.

### Høyrepanel — arbeidsflater

Detaljer utarbeides separat per arbeidsflate. Kontekstavhengig innhold.

### Merknad om eksisterende sider

Eksisterende sider (evaluering, kvalifisering, protokoll) kan kreve redesign for å passe inn i den nye navigasjonsstrukturen. Alle sider er åpne for justering.

---

## Tokens

The following subsections show the **dark theme** token values. For light theme values and the full side-by-side comparison, see [## Themes](#themes) below.

### Surfaces (warm neutrals)

```
--color-canvas: #edeae4 / #111518     /* workspace background */
--color-felt: #fbfaf8 / #191d22       /* cards, panels */
--color-felt-raised: #f4f2ee / #1f252b /* elevated: dropdowns, summary tables */
--color-felt-hover: #f0ede7 / #252b32  /* hover state */
--color-felt-active: #e6e3dd / #2e3338 /* pressed/active state */
```

### Ink (text hierarchy)

```
--color-ink: #1e2530 / #d4d1ca            /* primary text */
--color-ink-secondary: #4d5666 / #9a978f  /* supporting text, labels */
--color-ink-muted: #6b6660 / #7a776f      /* labels, metadata, section titles */
--color-ink-ghost: #9a9488 / #5e5c56      /* disabled, placeholder, decorative */
```

### Wire (borders — solid warm)

```
--color-wire: #ccc8bf / #2e3338           /* standard separation */
--color-wire-strong: #b8b4ab / #3a4048    /* emphasis, group dividers */
--color-wire-focus: rgba(43,107,127,0.35) / rgba(91,164,184,0.35) /* focus rings */
```

### Vekt (weight accent — teal)

```
--color-vekt: #2b6b7f / #5ba4b8           /* primary accent */
--color-vekt-dim: #245d6e / #4d8fa0        /* secondary accent */
--color-vekt-bg: #ebf2f5 / rgba(91,164,184,0.1)   /* accent tint */
--color-vekt-bg-strong: rgba(43,107,127,0.15) / rgba(91,164,184,0.18) /* accent emphasis */
```

### Score Semantics

```
--color-score-high: #3d7a5a / #5ea87a     /* high scores (7+), green */
--color-score-high-bg: #edf5f0 / rgba(94,168,122,0.08) /* high score bg */
--color-score-mid: #6b7a5a / #8a9a6d      /* mid scores (4-6), olive */
--color-score-low: #8b5a3d / #c4805a      /* low scores (≤3), warm brown */
--color-score-low-bg: #fdf5f0 / rgba(196,128,90,0.1)   /* low score bg */
```

### Warn

```
--color-warn: #8b6914 / #c4952a           /* amber warning */
--color-warn-bg: #fdf6e8 / rgba(196,149,42,0.08)
```

### Header (dark nav bar)

```
--color-header-bg: #1e2530 / #0d0f12
--color-header-fg: #edeae4 / #d4d1ca
--color-header-muted: rgba(237,234,228,0.35) / rgba(212,209,202,0.25)
```

### Overlay & Elevation

```
--color-overlay: rgba(0,0,0,0.4) / rgba(0,0,0,0.6)
--shadow-overlay: 0 -4px 24px rgba(0,0,0,0.08)  /* drawer only */
```

### Layout

```
--header-height: 48px
```

---

## Themes

Light theme is the default (standard web convention). Dark mode is activated by adding a `.dark` class to `<html>`. OS-level preference (`prefers-color-scheme: dark`) is respected automatically; a manual toggle overrides it. An anti-flash inline script in `<head>` reads `localStorage` and applies `.dark` before first paint to prevent FOUC.

All tokens are defined in `@theme` (light values) in `app.css` and overridden in a `.dark { ... }` block.

### Token values by theme

| Token | Light | Dark |
|---|---|---|
| **Surfaces** | | |
| `--color-canvas` | `#edeae4` | `#111518` |
| `--color-felt` | `#fbfaf8` | `#191d22` |
| `--color-felt-raised` | `#f4f2ee` | `#1f252b` |
| `--color-felt-hover` | `#f0ede7` | `#252b32` |
| `--color-felt-active` | `#e6e3dd` | `#2e3338` |
| **Ink** | | |
| `--color-ink` | `#1e2530` | `#d4d1ca` |
| `--color-ink-secondary` | `#4d5666` | `#9a978f` |
| `--color-ink-muted` | `#6b6660` | `#7a776f` |
| `--color-ink-ghost` | `#9a9488` | `#5e5c56` |
| **Wire** | | |
| `--color-wire` | `#ccc8bf` | `#2e3338` |
| `--color-wire-strong` | `#b8b4ab` | `#3a4048` |
| `--color-wire-focus` | `rgba(43,107,127,0.35)` | `rgba(91,164,184,0.35)` |
| **Vekt (teal)** | | |
| `--color-vekt` | `#2b6b7f` | `#5ba4b8` |
| `--color-vekt-dim` | `#245d6e` | `#4d8fa0` |
| `--color-vekt-bg` | `#ebf2f5` | `rgba(91,164,184,0.1)` |
| `--color-vekt-bg-strong` | `rgba(43,107,127,0.15)` | `rgba(91,164,184,0.18)` |
| **Score** | | |
| `--color-score-high` | `#3d7a5a` | `#5ea87a` |
| `--color-score-high-bg` | `#edf5f0` | `rgba(94,168,122,0.08)` |
| `--color-score-mid` | `#6b7a5a` | `#8a9a6d` |
| `--color-score-low` | `#8b5a3d` | `#c4805a` |
| `--color-score-low-bg` | `#fdf5f0` | `rgba(196,128,90,0.1)` |
| **Warn** | | |
| `--color-warn` | `#8b6914` | `#c4952a` |
| `--color-warn-bg` | `#fdf6e8` | `rgba(196,149,42,0.08)` |
| **Header** | | |
| `--color-header-bg` | `#1e2530` | `#0d0f12` |
| `--color-header-fg` | `#edeae4` | `#d4d1ca` |
| `--color-header-muted` | `rgba(237,234,228,0.35)` | `rgba(212,209,202,0.25)` |
| **Overlay** | | |
| `--color-overlay` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` |

---

## Typography

### Tre fonter

```
--font-ui:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-prose: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-data:  'Source Code Pro', 'SF Mono', 'Cascadia Code', 'Consolas', monospace
```

- **`--font-ui`** — Labels, knapper, navigasjon, metadata, seksjonsoverskrifter (uppercase). Tekst du *skanner*. Høy x-høyde og åpne aperturer gir best lesbarhet ved 10–13px på HiDPI-skjermer.
- **`--font-prose`** — Begrunnelsestekster, rik teksteditor (Tiptap/protokoll), dokumenttitler, kontraktstekst. Tekst du *leser og skriver*. Mekaniske terminaler gir maskinskrevet kontrakt-kvalitet.
- **`--font-data`** — Tall, beløp, datoer, prosent, system-IDer, paragrafreferanser, klassifikasjoner, poengverdier. Verdier du *slår opp*. Alltid `font-variant-numeric: tabular-nums`.

### Fontvalg-prinsipp

- **UI** = navigasjon, interaksjon, korte labels. Fonten er usynlig — den skal ikke merkes.
- **Prosa** = dokumentinnhold, argumentasjon, avsnitt. Fontbyttet signaliserer modusendring: «nå leser/skriver du et dokument.»
- **Mono** = ville du *slått det opp, kopiert, eller sammenlignet mot et annet dokument*? Tall, datoer, IDer, koder, paragrafer.

### Overskrifter: navigasjon vs. dokumenttittel

- **Seksjonsoverskrifter** («KONTRAKTSFORHOLD», «VEDERLAGSKRAV») = `--font-ui`. Uppercase, tracked, strukturell navigasjon.
- **Dokumenttitler** = `--font-prose`. Introduserer dokumentinnholdet, skaper visuell kontinuitet med brødteksten under.

### Romlig separasjon avgjør fontvalg

- **Romlig separerte soner** kan ha forskjellig font (label venstre i `--font-ui`, verdi høyre i `--font-data`).
- **Aldri bytt font inni en sammenhengende tekstlinje.**
- **Linjen tar fonten til sin primære funksjon:** Datasammenligning = hele linjen mono. Narrativ setning = hele linjen sans.

### Skala

| Bruk | Font | Størrelse | Vekt | Annet |
|---|---|---|---|---|
| Section labels | `--font-ui` | 11px | 600 | uppercase, tracking 0.08em, `ink-muted` |
| Body/labels | `--font-ui` | 13px | 500 | |
| Headlines | `--font-ui` | 20px | 700 | tracking -0.025em |
| Prose body | `--font-prose` | 14px | 400 | line-height 1.6 |
| Document titles | `--font-prose` | 17–19px | 600 | |
| Data values | `--font-data` | 13px | 500 | tabular-nums |

---

## Spacing

Base unit: **4px**

```
--spacing-1: 4px      /* micro: icon gaps */
--spacing-2: 8px      /* tight: element pairs */
--spacing-3: 12px     /* component: cell padding */
--spacing-4: 16px     /* card padding */
--spacing-5: 20px     /* generous card padding */
--spacing-6: 24px     /* section gaps */
--spacing-8: 32px     /* workspace padding, major separation */
--spacing-12: 48px    /* page bottom padding */
```

---

## Radius

Technical, not friendly:

```
--radius-sm: 4px      /* inputs, buttons, score segments */
--radius-md: 6px      /* small cards, badges */
--radius-lg: 8px      /* major containers, matrix wrap */
```

---

## Content Width

Match panel width to content density. Form-style pages (setup, configuration) use narrower panels; data-dense pages (matrices, tables) use wider panels.

| Innholdstype | Bredde | Eksempel |
|---|---|---|
| Prose/skjema | `max-width: 880px`, sentrert | Evalueringsoppsett, protokollskjema |
| Datatett/matrise | Full bredde (side-padding 100px) | Evalueringsmatrise, oversiktstabeller |
| Begrunnelsestekst | `max-width: 760px`, venstrejustert | Samlet vurdering per kriterium |

Panelet (`.eval-card`) wrapper innholdet med border og radius. Bredden tilpasser seg innholdstypen via CSS-klasse (f.eks. `.eval-card-narrow`). På skjermer under 1200px faller side-padding tilbake til `--spacing-6`.

---

## Depth Strategy

**Context-dependent.** Two depth strategies for two visual modes.

### Arbeidsmodus (matrices, scoring)
Borders-only. Dense data + dark mode = borders define structure quietly.

- Group rows: `border-left: 3px solid var(--color-vekt)` (weight spine)
- Sub-rows: `border-left: 3px solid rgba(232, 168, 56, 0.15)` (faded spine)
- Separators: `1px solid var(--color-wire)` standard, `var(--color-wire-strong)` for group dividers
- Annotation panel: `border-left: 3px solid var(--color-vekt)` (connects to spine)

### Orienteringsmodus (bento phase pages)
Shadow-based. Cards float on canvas, borders are invisible or minimal.

- Cards: `0 1px 6px rgba(0,0,0,0.03)` at rest
- Hover: `0 6px 24px rgba(0,0,0,0.08)` + `translateY(-1px)` + `scale(1.02)` (200ms ease)
- Hero cards: accent left-border (3px `--color-vekt`) for emphasis
- No visible card borders — depth comes from shadow alone
- Radius: `--radius-bento: 10px` for bento cards (larger than work mode's 4-8px)

### Bento Grid Pattern

Used for orientation/phase pages. Size encodes importance.

```
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 14px;
```

- **Hero card** (span 2 columns): Primary content — deadline countdown, key action, summary
- **Standard card** (span 1): Supporting content — leverandører, dokumenter, metadata
- **Responsive**: 3 columns at 1200px+, 2 at 768-1199px, 1 (stacked) below 768px
- Reorder by importance on small screens, not by desktop position

Card anatomy:
- Section label (10px uppercase, ghost) at top
- Content area with generous padding (20-24px)
- Optional footer with actions or meta

### Bento Interaction

- **Hover elevation**: card lifts 1px + shadow deepens + `scale(1.02)` (200ms ease)
- **No glassmorphism**: We use warm opaque surfaces, not translucent glass. The material metaphor is *felt* and *paper*, not *glass*.
- **Staggered entry**: cards fade-up on page load (60-100ms stagger). Respect `prefers-reduced-motion`.
- **Click-to-expand**: cards with hidden depth (hendelser, leverandører) show truncated content with inline expand. Not for navigation cards — those link via routes.

### Kinetic Typography

Deadline countdowns (tilbudsfrist, vedståelsesfrist, karensperiode) use animated number transitions on page load — a brief count-up to the current value. Subtle `letter-spacing` or `font-variation-settings` shift on hover. Reserved for time-sensitive values where urgency matters. The effect should feel precise and authoritative, not playful.

### Time-Sensitive Urgency

Deadline cards change visual character based on proximity:
- `>30 days`: calm, standard bento card. Teal accent (`--color-vekt`).
- `10–30 days`: amber accent (`--color-warn`), slightly more prominent.
- `<10 days`: warn colors, possibly neo-brutal style. The card "escalates" visually.
- `Expired`: rose/score-low (`--color-score-low`), muted. Not alarm — just clear.

### Neo-Brutal Accent Card

One card per bento grid may break the soft style to prevent visual monotony: solid accent color background, hard shadow (`4px 4px 0`), thick border. Used sparingly — max one per grid. Color from existing palette. Candidates: deadline urgency, key financial figures, "next action" prompts.

---

## Signature Element: Vektlinjen (Weight Spine)

A vertical amber accent running down the left edge of the evaluation matrix.

- **Group rows:** solid amber left border (3px)
- **Sub-criteria:** faded amber left border (15% opacity)
- **Weight bars:** proportional horizontal bars in the weight column, max 48px width
- **Weight numbers:** amber monospace with % suffix in dim amber

The weight spine makes the abstract concept of "weighted evaluation" physically scannable.

---

## Component Patterns

### Evaluation Matrix

- `<table>` with `border-collapse: collapse`, `table-layout: fixed`
- Wrapped in `.matrix-wrap` with border and radius
- Columns: weight (72px) | criteria (260px) | suppliers (flexible, equal)
- Header: sticky, uppercase, 10px, tracking 0.08em

### Group Rows (main criteria)

- Background: `var(--color-vekt-bg)` (amber tint)
- Left border: solid amber (weight spine)
- Score values: 14px, weight 700, one decimal
- Criteria name: weight 600

### Sub-criterion Rows

- Background: transparent, hover → `var(--color-felt-hover)`
- Left border: faded amber
- Criteria name: indented (padding-left: 32px), with `::before` dash
- Score values: integer, weight 500

### Score Cells

- Font: `--font-data`, centered, tabular-nums
- Color coding: `.score-high` (green ≥7), `.score-mid` (neutral ≥4), `.score-low` (rose <4)
- Best in row: `.score-best` → green background + bold
- Has notes: `.has-notes` → 5px amber dot, top-right corner
- Drilldown variant: `▾` chevron (8px, `--color-ink-ghost`) after score, rotates on expand
- Derived scores: always `.toFixed(1)`, integer scores show as-is

### Annotation Panel

- Full-width row below the scored row
- Shows: context (supplier › criterion), score selector (0-10 segments), textarea
- Score segments: 30×32px buttons, filled state = green, active = solid green
- Textarea: `var(--color-felt)` background, wire border, focus → amber wire

### ItemEvaluationPanel

- Full-width row below sub-criterion row (same pattern as AnnotationPanel)
- Left border: 3px solid `--color-vekt` (connects to weight spine)
- Context bar: supplier name (bold) › sub-criterion name (muted), 11px
- Contains: AggregationStrip + ItemTable + AddItem + Notes textarea

### AggregationStrip

- Horizontal flex, `--color-felt` background, `--color-wire` border, `--radius-sm` radius
- Label: "AGGREGERING" in section label style (10px uppercase ghost)
- Radio-style options: 12px circle (border `--color-wire-strong`, checked = `--color-vekt` fill with inset ring)
- Active option: `--color-vekt` color, weight 600
- Result: right-aligned, `--font-data`, 16px, weight 700, tier-colored

### ItemTable

- Dense `<table>`, `--color-felt` background, `--color-wire` border, `--radius-sm` radius
- Header: criterion name (10px uppercase) + weight in `--color-vekt-dim` (9px)
- Columns: item name (flex) | criteria (80px each) | average (72px)
- Item rows: name (13px, weight 500) + label after em-dash (muted), hover → `--color-felt-hover`
- Remove button: `×`, absolute right, opacity 0 → 1 on row hover, hover → rose
- Footer: `--color-canvas` background, `--color-wire-strong` top border, weight 600 averages

### ItemScoreCell (compact)

- Button: 36×28px, `--font-data`, 13px, tier-colored, transparent border
- Hover: `--color-felt-hover` + `--color-wire` border
- Focus-visible: `--color-wire-focus` border
- Best: green background + weight 700
- Edit popover: positioned below, `--color-felt-raised`, `--color-wire-strong` border, shadow
- Popover segments: 22×26px, same filled/active states as AnnotationPanel segments

### Evaluation Workspace Layout

Two-panel workspace: matrix left, panel right.

- `.eval-workspace`: flex, full height, overflow hidden
- `.eval-main`: flex 1, scrollable, `--spacing-5`/`--spacing-6` padding
- `.eval-panel`: 300px fixed width, `--color-wire` left border, `--spacing-4` padding, flex column with `--spacing-5` gap
- Context line at top of main: procurement name (12px, weight 600, `--color-ink-secondary`) · reference (`--font-data`, 10px, `--color-ink-ghost`)

**Mobile (≤1023px):**
- Right panel becomes fixed slide-in from right (320px, `--color-canvas`, z-index 100)
- Opens via floating toggle button (bottom-right, `--spacing-10` size, 50% radius, `--color-felt-raised`)
- Backdrop: `--color-overlay`, z-index 99
- Toggle icon: ☰ (overview), ✎ (justification), ✕ (close)

### Compact Ranking (right panel)

- Rank items: flex row with position, name, value, hover → `--color-felt-hover`
- Position: `--font-data`, 10px, weight 600, `--color-ink-ghost` (leader: `--color-vekt-dim`)
- Name: 12px, weight 500, `--color-ink-secondary` (leader: `--color-ink`, weight 600)
- Value: `--font-data`, 13px, weight 700, tabular-nums (leader: `--color-vekt`)
- Bar track: 2px height, `--color-felt-active`, `--radius-sm`
- Bar fill: `--color-ink-ghost` (leader: `--color-vekt`), transition 0.25s ease-out

### Status Strip (right panel)

- Pushed to bottom with `margin-top: auto`
- Flex row: status label (uppercase, 10px) + progress fraction (monospace, 10px, `--color-ink-ghost`)
- No background or border — minimal presence

### Total Row

- Background: `var(--color-canvas)` (darker than matrix)
- Score: 18px, weight 700
- Best score: amber color + amber background

### Progress Indicators

- Compact flex row below matrix
- Label + fraction value (monospace) + thin bar (3px height, 80px width)
- Complete: green fill. Partial: amber fill.

---

## Navigation

### App Shell (implemented)

The `/anskaffelser/[id]` layout provides a persistent shell:

- **Header** (48px, `--color-header-bg`): hamburger (mobile only) + breadcrumbs + theme toggle + user info
- **Case-info strip** (`--color-felt`, `--color-wire` bottom border): procurement reference, Del badge, oppdragsgiver, kontraktstype, verdi
- **Phase panel** (left): 52px collapsed → 230px on hover, 6 phases with status indicators
- **Content header**: phase number + label + status badge (only on workspace pages)
- **Main content**: scrollable workspace

### Phase Panel

See "Signature Element: Fasepanelet" above. Navigation: clicking a phase navigates via SvelteKit routes. Phase status derived from activities via `derivePhaseStates()`.

### Breadcrumbs

Top nav bar (`--header-height: 48px`), `--color-header-bg`:
- Path: `Anskaffelser / {procName} / {subRoute}`, 12px, `--color-header-muted`
- Right side: theme toggle, organization name, avatar circle (24px)
- Mobile: hamburger menu button + breadcrumb text truncated (max-width 120px), org/avatar hidden

### Method Toggle

- Segmented control: `--color-felt` background, `--color-wire` border, `--radius-md` radius
- Buttons: 11px, weight 500, `--color-ink-muted`
- Active: `--color-vekt-bg-strong` background, `--color-vekt` text, weight 600
- Placed at top of right panel

### Config Strip (Prismodell)

- Horizontal flex row, `--color-felt` surface, `--color-wire` border, `--radius-md` radius
- Labels: 11px, weight 500, `--color-ink-muted`
- Inputs: `--color-canvas` background (inset feel), `--font-data`, right-aligned
- Shows kontraktsverdi + per-supplier prices
- Hidden by default, visible when prismodell active

### Prismodell Matrix

- Same matrix structure as poengmodell
- Weight column → "Maks fradrag" in kr (monospace, 11px)
- Supplier columns → "Fradrag" in kr with `+` prefix on group rows
- Color coding: `.fradrag-low` (green), `.fradrag-mid` (neutral), `.fradrag-high` (rose), `.fradrag-best` (green bg)
- Bottom rows: Tilbudt pris → Sum kvalitetsfradrag → Evaluert pris
- Result row: 16px, weight 700, best = amber

### Innsikt (hybrid approach)

Key metrics shown in right panel. Full analysis opens in bottom drawer.

**Right panel — Nøkkeltall:**
- Compact metric rows: label left, value right, hover → `--color-felt-hover`
- Margin #1→#2: monospace value + verdict pill (robust/moderat/sårbart with semantic color)
- Metodekontroll: ✓/⚠ icon + Samsvar/Avvik text
- Kvalitetsbudsjett: formatted NOK value
- Kvalitet/pris: weight split percentage
- "Åpne analyse" button: `--color-vekt-bg` background, `--color-wire-strong` border, `--color-vekt-dim` text, hover → `--color-vekt-bg-strong`

**Bottom drawer — full InsightsPanel:**
- Opens below matrix content, max-height 50%, `--color-wire-strong` top border
- Close button: uppercase section label style with ▾ icon
- Three tabs: Betalingsvilje, Robusthet, Metodekontroll
- Tabs: flex row, `--color-wire` bottom border, active = `--color-vekt` text + amber bottom border (2px)
- Content panes: `--spacing-5` padding

**Betalingsvilje tab:**
- Data table (`.bv-table`) with criterion, weight, implisitt maks fradrag, per-poeng value
- Sub-criteria indented with `::before` dash (mirrors matrix pattern)
- Summary card: `--color-vekt-bg` background, `--color-vekt` left border (3px), highlights in amber monospace

**Robusthet tab:**
- Ranking items: `--color-felt-raised` background, `--color-wire` border, leader = amber border
- Insight cards: `--color-felt-raised` surface, `--color-vekt` left border (3px), section label + text
- Key data in `.mono` spans (amber, monospace)

**Metodekontroll tab:**
- Side-by-side grid (2 columns) comparing poengmodell vs prismodell rankings
- Each column: `--color-felt-raised`, `--color-wire` border, `--radius-md` radius
- Verdict bar: `.match` (green bg) or `.mismatch` (rose bg) with icon + text

---

## Qualification Matrix (Kvalifikasjonsmatrise)

Binary pass/fail matrix for supplier qualification requirements. Fundamentally different from
the evaluation matrix: no weighting, no scoring, binary verdicts.

### Structural accent

- Left spine: `--wire-strong` (not amber) — no weights, so the vektlinjen concept doesn't apply
- The cells carry all semantic color (green/rose/ghost)
- Differentiates visually from the amber-spined evaluation matrix

### QualificationMatrix

- Same `<table>` structure as EvaluationMatrix but simpler
- No weight column — requirements aren't weighted
- Columns: requirement description (auto) | suppliers (140px each)
- Header: same sticky uppercase pattern (10px, tracking 0.08em)

### Requirement Rows

- Background: `var(--canvas)`, hover → `var(--felt-hover)`
- Left border: `3px solid var(--wire-strong)` (structural spine)
- Name: weight 600, `--ink`, 12px
- Description: 11px, `--ink-muted`, line-height 1.4 (brief text below name)

### QualificationCell (verdict cells)

- Clickable `<td>` centered, opens expansion panel
- Icon container: 28×28px, `--r-sm` radius
- **Oppfylt (met):** `✓` in `--score-high`, background `--score-high-bg`
- **Ikke oppfylt (not_met):** `✗` in `--score-low`, background `--score-low-bg`
- **Ikke vurdert (not_assessed):** `—` in `--ink-ghost`, transparent
- **Støtte-markør:** amber `◆` (7px) positioned top-right when supplier relies on supporting entity
- **Notat-markør:** 5px amber dot bottom-right (same pattern as ScoreCell `.has-notes`)

### QualificationPanel (expansion panel)

- Same full-width row pattern as AnnotationPanel
- Left border: `3px solid var(--wire-strong)` (connects to spine)
- Context bar: supplier name (bold) › requirement name (muted), 11px
- Three field groups in horizontal flex: Dokumentasjon, Grunnlag, Vurdering
- Radio-style option buttons: `--felt` background, `--wire` border, `--r-sm` radius
  - Active state has semantic color: submitted = green, not_submitted = rose, met = green, not_met = rose
- Support entity input: appears when "Støtter seg på" is selected, `--canvas` inset input
- Notes textarea: same pattern as AnnotationPanel

### QualificationSummary (status strip)

- Same card layout as RankingStrip
- Per-supplier cards with flex-equal width
- Badge: 9px uppercase bold pill
  - **Kvalifisert:** green text + `--score-high-bg`
  - **Avvist:** rose text + `--score-low-bg`
  - **Uavklart:** `--ink-muted` text + `--felt-active`
- Count: `met/total oppfylt` in monospace (22px value, 14px denominator)
- Green top bar accent on qualified cards (same `::before` pattern as rank-1)
- Rose top bar accent on rejected cards
- Progress bar: 3px, green fill

### Result Row

- Bottom of matrix, `border-top: 2px solid var(--wire-strong)`
- Label: "KVALIFISERT" uppercase, weight 700
- Value pills: "Ja" (green bg) / "Nei" (rose bg) / "—" (ghost)

---

## View Switching

- Svelte `{#if}` blocks toggle between OverviewMatrix, CriterionView, and PriceMatrix
- Method toggle in right panel drives which matrix is shown
- Right panel content is context-dependent: ranking panel (overview/price) or justification panel (criterion)

---

## States

- **Hover (rows):** `var(--color-felt-hover)` background
- **Hover (score cells):** same + cursor pointer
- **Hover (rank items / metrics):** `var(--color-felt-hover)` background, `--radius-sm`
- **Focus (inputs):** `border-color: var(--color-wire-focus)` (amber)
- **Active (score segment):** solid green background
- **Active (method btn):** amber background tint + amber text
- **Active (innsikt tab):** amber text + amber bottom border
- **Drawer open:** insights button arrow rotates 180deg
- **Mobile panel open:** slide-in from right with backdrop overlay
