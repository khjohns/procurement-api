# Mockup Implementation Plan — Procurement Tools

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 mockups from `docs/mockups/` as working Svelte pages: saksoversikt, anskaffelsesregistrering, terskelverdikalkulator, fristberegner, and unntaksveiviser — all with demo data, using the existing design system.

**Architecture:** Each tool is built as a standalone Svelte component with its own route. Data types and demo data are extracted to dedicated files. The mockups use React with inline styles — we translate to Svelte 5 (runes, `$state`, `$derived`) with scoped `<style>` using existing CSS custom properties. No API integration yet.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, CSS custom properties (existing design system in `app.css`), TypeScript.

**Note on testing:** No frontend test framework is configured. Verification is via `npm run check` (type-check) and visual inspection in dev server (`npm run dev`).

**Note on typography:** The mockups use Spectral/Karla/IBM Plex Mono. We use the existing project fonts: `--font-ui` (Inter), `--font-data` (Source Code Pro), `--font-prose` (IBM Plex Sans). Map mockup `var(--serif)` → `--font-prose`, `var(--sans)` → `--font-ui`, `var(--mono)` → `--font-data`.

**Note on colors:** The mockups use raw hex values. We map them to existing design tokens: `#1E2530` → `var(--color-ink)`, `#4D5666` → `var(--color-ink-secondary)`, `#9A9488`/`#A09B90` → `var(--color-ink-ghost)`, `#7A7568` → `var(--color-ink-muted)`, `#CCC8BF` → `var(--color-wire)`, `#E6E3DD`/`#ECEAE4` → `var(--color-felt-active)`, `#F4F2EE` → `var(--color-felt-raised)`, `#FBFAF8` → `var(--color-felt)`, `#E8E5DF`/`#EDEAE4` → `var(--color-canvas)`, `#2B6B7F` → `var(--color-vekt)`, `#EBF2F5` → `var(--color-vekt-bg)`, `#3D7A5A`/`#2D6B47` → `var(--color-score-high)`, `#8B6914` → `var(--color-warn)`, `#FFFBF0`/`#FDF6E8` → `var(--color-warn-bg)`, `#6E9DAB` → use `var(--color-vekt)` (accept slight visual difference).

**Note on `data/` directory:** `src/frontend/src/lib/data/` does not exist yet — create it when adding the first data file.

**Note on `ssr`:** The root `+layout.ts` already exports `ssr = false`, which cascades to all child routes. We skip creating redundant `+page.ts` files for new routes.

---

## File Structure

### New routes
```
src/frontend/src/routes/
  anskaffelser/[id]/+page.svelte          — REPLACE (saksoversikt, currently placeholder)
  anskaffelser/ny/+page.svelte            — CREATE (registration form)
  verktoy/+layout.svelte                  — CREATE (shared tool layout, no app.css re-import)
  verktoy/+page.svelte                    — CREATE (tool index page)
  verktoy/kalkulator/+page.svelte         — CREATE (threshold calculator)
  verktoy/fristberegner/+page.svelte      — CREATE (deadline calculator)
  verktoy/unntak/+page.svelte             — CREATE (exception wizard)
```

### New components
```
src/frontend/src/lib/components/
  saksmappe/
    SaksmappeHeader.svelte                — Case header (saksnr, title, metadata grid)
    SaksmappeSituasjon.svelte             — Situation panel (next steps + deadlines)
    SaksmappeProsess.svelte               — Process timeline (phases with vertical line)
    SaksmappeFase.svelte                  — Single phase component (fullført/aktiv/kommende)
    SaksmappeDokumenter.svelte            — Document list
    SaksmappeTeam.svelte                  — Team list
  registrering/
    RegistreringForm.svelte               — Main registration form
    TerskelBar.svelte                     — Threshold visualization bar (reusable)
    AnalysePanel.svelte                   — Right-side analysis panel
    RadioCards.svelte                     — Radio card selector (reusable)
    CheckboxGroup.svelte                  — Checkbox group for exceptions
    FormField.svelte                      — Label + hint + hjemmel wrapper
    FormDivider.svelte                    — Section divider with label
  verktoy/
    TerskelverdikalkulatorView.svelte     — Main calculator UI
    FristberegnerView.svelte              — Main deadline calculator UI
    UnntaksveiviserView.svelte            — Main exception wizard UI
    FristTidslinje.svelte                 — Vertical timeline for deadlines
```

### New data/types
```
src/frontend/src/lib/
  types/
    saksmappe.ts                          — Types for case overview (Sak, Fase, Dokument, etc.)
    registrering.ts                       — Types for registration form state
    verktoy.ts                            — Types for tools (calculator, deadlines, exceptions)
  data/
    saksmappe-demo.ts                     — Demo data for saksoversikt
    registrering-config.ts                — Oppdragsgivere, kontraktstyper, unntak lists
    terskel-config.ts                     — Calculation methods, thresholds
    frist-config.ts                       — Procedures, deadline calculation logic
    unntak-tree.ts                        — Decision tree data structure
```

### Modified files
```
src/frontend/src/routes/anskaffelser/+page.svelte  — Add "Ny anskaffelse" button linking to /anskaffelser/ny
src/frontend/src/lib/utils/format.ts                — Add formatNOK() helper (do not create separate file)
```

---

## Task 1: Types and Demo Data for Saksoversikt

**Files:**
- Create: `src/frontend/src/lib/types/saksmappe.ts`
- Create: `src/frontend/src/lib/data/saksmappe-demo.ts`

- [ ] **Step 1: Create saksmappe types**

Create `src/frontend/src/lib/types/saksmappe.ts` with:
```typescript
export type FaseStatus = 'fullfort' | 'aktiv' | 'kommende';

export interface FaseHendelse {
  dato: string;
  tekst: string;
}

export interface FaseAktivitet {
  label: string;
  dato: string;
  done: boolean;
}

export interface Fase {
  id: string;
  label: string;
  status: FaseStatus;
  dato?: string;
  sammendrag?: string;
  href?: string;
  aktiviteter?: FaseAktivitet[];
  hendelser?: FaseHendelse[];
  substeg?: string[];
}

export interface Dokument {
  navn: string;
  status: 'publisert' | 'sendt' | 'utkast' | 'ikke påbegynt';
  dato: string | null;
}

export interface Teammedlem {
  rolle: string;
  navn: string;
}

export interface Frist {
  label: string;
  dato: string;
  dager: number;
  ref: string;
}

export interface Sak {
  saksnr: string;
  tittel: string;
  beskrivelse: string;
  oppdragsgiver: string;
  kontraktstype: string;
  kontraktstypeRef: string;
  del: string;
  verdi: number;
  eosTerskel: number;
  varighet: string;
  prosedyre: string;
  prosedyreRef: string;
  opprettet: string;
}

export interface SaksmappeData {
  sak: Sak;
  faser: Fase[];
  dokumenter: Dokument[];
  team: Teammedlem[];
  frister: Frist[];
}
```

- [ ] **Step 2: Create demo data**

Create `src/frontend/src/lib/data/saksmappe-demo.ts` with the SAK, FASER, DOKUMENTER, TEAM, FRISTER data from `docs/mockups/saksoversikt-v3.jsx` lines 4–92, typed to the interfaces above.

- [ ] **Step 3: Type-check**

Run: `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/lib/types/saksmappe.ts src/frontend/src/lib/data/saksmappe-demo.ts
git commit -m "feat: add saksmappe types and demo data"
```

---

## Task 2: Saksmappe Components — Header and Metadata

**Files:**
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeHeader.svelte`

- [ ] **Step 1: Create SaksmappeHeader**

Translates the case header section from `docs/mockups/saksoversikt-v3.jsx` lines 361–406. Contains:
- Saksnr (mono font), Del badge (teal bg), status badge ("Pågående")
- Title (h1, prose font, large)
- Description paragraph
- Metadata grid: 4-column grid with gap-1px border pattern. Each cell has uppercase label and value. "Oppdragsgiver" spans 2 columns. Mono font for numeric values.

Use `var(--color-*)` tokens. Section header font uses `--font-prose` at 22px for the title. Badge uses `--color-vekt` bg with white text. Metadata grid uses 1px gap with `--color-wire` bg to create borders.

Props: `sak: Sak` (import from types).

Helper: `formatNOK(n: number)` — `Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n) + ' kr'` — add this to the existing `src/frontend/src/lib/utils/format.ts` file (which already has Norwegian locale date formatters).

- [ ] **Step 2: Type-check**

Run: `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`

- [ ] **Step 3: Commit**

---

## Task 3: Saksmappe Components — Fase Timeline

**Files:**
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeFase.svelte`
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeProsess.svelte`

- [ ] **Step 1: Create SaksmappeFase**

Translates the `Phase` component from `docs/mockups/saksoversikt-v3.jsx` lines 100–281. This is the most complex component in the mockup. Key features:

- Left column: dot (colored by status) + vertical connecting line
- Dot shape: round for fullført/kommende, square-ish (2px radius) for aktiv
- Dot color: `--color-score-high` for fullført, `--color-vekt` for aktiv, `--color-wire` for kommende
- Line color: score-high-bg for fullført, wire for others

**Fullført state:** Show sammendrag text + expandable hendelser list (click "N hendelser ›" to toggle).

**Aktiv state:** Show aktiviteter in a card panel. Recent done items + undone items visible, with "N tidligere aktiviteter — vis alle" toggle. Below: expandable hendelseslogg.

**Kommende state:** Show substeg list or italic placeholder text.

Props: `fase: Fase`, `isLast: boolean`

Local state: `showAllAkt: boolean`, `showHendelser: boolean` (both `$state(false)`)

- [ ] **Step 2: Create SaksmappeProsess**

Simple wrapper that iterates `faser` and renders `SaksmappeFase` for each, passing `isLast`.

Props: `faser: Fase[]`

Section label: "PROSESSFORLØP" in uppercase small caps style (9.5px, weight 700, ghost color, letter-spacing 0.08em).

- [ ] **Step 3: Type-check and visual review**

Run type-check. Start dev server and navigate to verify rendering.

- [ ] **Step 4: Commit**

---

## Task 4: Saksmappe Components — Situasjon, Dokumenter, Team

**Files:**
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeSituasjon.svelte`
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeDokumenter.svelte`
- Create: `src/frontend/src/lib/components/saksmappe/SaksmappeTeam.svelte`

- [ ] **Step 1: Create SaksmappeSituasjon**

Translates lines 408–453 from saksoversikt-v3.jsx. Two-column layout:
- Left: "NESTE STEG" section with descriptive text and action links (accent color)
- Right: "KOMMENDE FRISTER" section with frist cards showing label, days remaining, date, and paragraph reference

The `dager` value uses warn color when ≤ 14 days.

Props: `frister: Frist[]` (the action links are hardcoded for now since they're contextual).

Background: `--color-felt-raised`. Bottom border.

- [ ] **Step 2: Create SaksmappeDokumenter**

Translates lines 474–513. Table with alternating row backgrounds. Each row: checkmark (done) or circle (pending), document name (clickable if done), date (mono), status label (colored by status).

Props: `dokumenter: Dokument[]`

- [ ] **Step 3: Create SaksmappeTeam**

Translates lines 516–534. Simple table with alternating rows. Each row: uppercase rolle label, navn below.

Props: `team: Teammedlem[]`

- [ ] **Step 4: Type-check**

- [ ] **Step 5: Commit**

---

## Task 5: Saksoversikt Page — Assemble and Replace Placeholder

**Files:**
- Replace: `src/frontend/src/routes/anskaffelser/[id]/+page.svelte`

- [ ] **Step 1: Replace placeholder page**

Replace the existing 79-line placeholder with the full saksoversikt composition. The page:

1. Gets `data` from `+layout.ts` (which already fetches `proc`, `activities`, `eforms`).
2. For now, imports demo data from `saksmappe-demo.ts` (ignoring API data — we'll connect later).
3. Renders inside a single-column document container (max-width 780px, centered, felt bg, wire border):
   - `<SaksmappeHeader sak={demoData.sak} />`
   - `<SaksmappeSituasjon frister={demoData.frister} />`
   - Main content area with:
     - `<SaksmappeProsess faser={demoData.faser} />`
     - Horizontal divider
     - Two-column flex: `<SaksmappeDokumenter>` (flex 1) + `<SaksmappeTeam>` (flex 0 0 220px)

The document container uses the mockup's styling: `max-width: 780px`, `margin: 24px auto`, felt bg, wire border, radius-sm, `min-height: calc(100vh - 100px)`.

**Important:** The existing `[id]/+layout.svelte` wraps this page with header + workspace switcher. The saksoversikt is the "default" view (no workspace selected). This already works since `+page.svelte` renders when no sub-route is matched.

- [ ] **Step 2: Type-check**

Run: `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`

- [ ] **Step 3: Visual verification**

Run dev server, navigate to `/anskaffelser/1795` (or any ID). Confirm:
- Document-style single column layout
- Header with metadata grid
- Situation panel with frister
- Phase timeline with expand/collapse
- Documents and team tables

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/lib/components/saksmappe/ "src/frontend/src/routes/anskaffelser/[id]/+page.svelte"
git commit -m "feat: implement saksoversikt page from mockup"
```

---

## Task 6: Shared Form Components for Registration

**Files:**
- Create: `src/frontend/src/lib/components/registrering/FormField.svelte`
- Create: `src/frontend/src/lib/components/registrering/FormDivider.svelte`
- Create: `src/frontend/src/lib/components/registrering/RadioCards.svelte`
- Create: `src/frontend/src/lib/components/registrering/CheckboxGroup.svelte`

- [ ] **Step 1: Create FormField**

Wrapper component. Translates the `Fl` pattern from mockups.

Props: `label: string`, `hjemmel?: string`, `hint?: string`, `children: Snippet` (from `'svelte'`).

Use the Svelte 5 snippet pattern:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, hjemmel, hint, children }: {
    label: string; hjemmel?: string; hint?: string; children: Snippet;
  } = $props();
</script>
<!-- label + hjemmel row -->
{@render children()}
<!-- hint if provided -->
```

Renders: label (11.5px, weight 600) + hjemmel (9px, data font, ghost color) on one line, then children, then hint text if provided.

- [ ] **Step 2: Create FormDivider**

Translates the `Div` component. Horizontal line with centered uppercase label.

Props: `label?: string`

- [ ] **Step 3: Create RadioCards**

Translates the `RadioCards` pattern. Flex-wrap container of buttons.

Props: `options: Array<{ id: string, label: string, ref?: string }>`, `value: string`, `onchange: (id: string) => void`, `small?: boolean`

Selected state: vekt border + vekt-bg background. Unselected: wire border + white bg.

- [ ] **Step 4: Create CheckboxGroup**

Translates the `CG` component. Bordered list of checkbox items.

Props: `items: Array<{ id: string, label: string, hjemmel: string }>`, `selected: string[]`, `onchange: (selected: string[]) => void`

Alternating row backgrounds. Selected rows get vekt-bg.

- [ ] **Step 5: Type-check**

- [ ] **Step 6: Commit**

---

## Task 7: Registration Config Data and Types

**Files:**
- Create: `src/frontend/src/lib/types/registrering.ts`
- Create: `src/frontend/src/lib/data/registrering-config.ts`

- [ ] **Step 1: Create types**

```typescript
export type OppdragsgiverType = 'statlig' | 'kommunal' | 'offentligrettslig';
export type KontraktstypeId = 'vare' | 'tjeneste' | 'bygge' | 'saerlig' | 'helse';
export type VarighetType = 'tidsbegrenset' | 'tidsubegrenset';

export interface GjeldendeDel {
  del: string;
  label: string;
  desc: string;
}

export interface Krav {
  l: string;
  r: string;
  w?: boolean;
}
```

- [ ] **Step 2: Create config data**

Extract from `docs/mockups/anskaffelsesregistrering.jsx` lines 4–53:
- `OPPDRAGSGIVERE` array
- `KONTRAKTSTYPER` array
- `UNNTAK_GENERELLE`, `UNNTAK_DEL2`, `UNNTAK_DEL3_FORH`, `UNNTAK_DEL3_UTEN` arrays

Also extract the logic functions `getEos()` and `getDel()` from lines 55–76 — these are pure functions that compute threshold and applicable regulation part.

- [ ] **Step 3: Type-check and commit**

---

## Task 8: TerskelBar Component

**Files:**
- Create: `src/frontend/src/lib/components/registrering/TerskelBar.svelte`

- [ ] **Step 1: Create TerskelBar**

Translates the `Bar` component from `docs/mockups/anskaffelsesregistrering.jsx` lines 84–148. This is the signature "terskelmeter" visualization.

Props: `verdi: number`, `oppdragsgiver: OppdragsgiverType`, `kontraktstype: KontraktstypeId`

Key behavior:
- Computes zones based on kontraktstype (helse → 3 zones, saerlig → 4 zones, standard → 4 zones)
- Each zone has a percentage width, label, from/to values
- A marker (2px wide, dark line) slides to the position corresponding to `verdi`
- Position calculated as percentage through the zone widths
- Threshold labels below the bar

Colors: Use gradient from `--color-felt-active` (lowest zone) through `--color-wire` to `var(--color-vekt)` (highest zone).

CSS transition on marker: `left 0.35s cubic-bezier(0.4, 0, 0.2, 1)`.

- [ ] **Step 2: Type-check and commit**

---

## Task 9: Registration Form and Analysis Panel

**Files:**
- Create: `src/frontend/src/lib/components/registrering/RegistreringForm.svelte`
- Create: `src/frontend/src/lib/components/registrering/AnalysePanel.svelte`

- [ ] **Step 1: Create AnalysePanel**

Translates lines 453–523 from anskaffelsesregistrering.jsx. Sticky right panel (38% width, felt-raised bg).

Props: `tittel: string`, `saksnr: string`, `totalVerdi: number`, `oppdragsgiver: OppdragsgiverType`, `kontraktstype: KontraktstypeId`, `harUnntak: boolean`

Shows (when verdi > 0 and oppdragsgiver + kontraktstype are set):
1. "Gjeldende regelverk" — Del badge + label + description
2. "Terskelverdi" — `<TerskelBar>` component
3. "Krav som utløses" — List of requirements (computed from `getDel()` and value thresholds)

The krav computation uses the logic from mockup lines 259–278.

- [ ] **Step 2: Create RegistreringForm**

Translates the main form from anskaffelsesregistrering.jsx lines 283–451. This is the left side (62% width).

**State ownership:** Form state is owned by the page (Task 10), NOT internal to this component. RegistreringForm receives all state as props and emits changes via callback props. This allows the page to pass the same state to AnalysePanel.

Props (received from page):
- `saksnr`, `tittel`, `beskrivelse`
- `oppdragsgiver`, `kontraktstype`
- `varighetType`, `varighetMnd`, `maanedligVerdi`, `anslattVerdi`, `opsjonVerdi`
- `valgtUnntak: string[]`, `unntakBegrunnelse`
- `totalVerdi: number` (computed by page as `$derived`)
- `gjeldendeDel: GjeldendeDel` (computed by page)
- Callback props for mutations: `onsaksnr`, `ontittel`, etc. — or use `$bindable()` for two-way binding on each field.

Recommended approach: Use `$bindable()` on all form fields so the page can bind them directly. This avoids the boilerplate of individual callback props.

Sections (using FormDivider):
1. **Identifikasjon** — saksnr (mono input) + tittel + beskrivelse (textarea)
2. **Klassifisering** — oppdragsgiver (RadioCards) + kontraktstype (RadioCards)
3. **Verdiberegning** — varighet toggle, conditional fields (tidsbegrenset: months + value + options; tidsubegrenset: monthly value × 48 with warn-bg box)
4. **Unntak** — generelle unntak (always), del2 unntak (if del is II/II+), del3 unntak (if del is III). Begrunnelse textarea when any unntak selected.

- [ ] **Step 3: Type-check**

- [ ] **Step 4: Commit**

---

## Task 10: Registration Page Route

**Files:**
- Create: `src/frontend/src/routes/anskaffelser/ny/+page.ts`
- Create: `src/frontend/src/routes/anskaffelser/ny/+page.svelte`
- Modify: `src/frontend/src/routes/anskaffelser/+page.svelte` (add "Ny anskaffelse" link)

- [ ] **Step 1: Create page route**

`+page.svelte`: Layout structure from mockup — header bar (dark, "Anskaffelsesregistrering" title + forskrift ref), then max-width 1040px flex container with:
- Left: `<RegistreringForm>` (62%, border-right)
- Right: `<AnalysePanel>` (38%, sticky)

**The page owns all form state as `$state` fields.** It passes state to both components via `bind:` (using `$bindable` props on RegistreringForm). Computed values (`totalVerdi`, `gjeldendeDel`, `eos`, `krav`) are `$derived` at page level and passed as read-only props to both components.

```svelte
<script lang="ts">
  // All form state owned here
  let saksnr = $state('');
  let tittel = $state('');
  // ... etc

  const totalVerdi = $derived(/* calculation */);
  const gjeldendeDel = $derived(getDel(totalVerdi, kontraktstype, eos));
</script>

<RegistreringForm bind:saksnr bind:tittel ... {totalVerdi} {gjeldendeDel} />
<AnalysePanel {tittel} {saksnr} {totalVerdi} ... />
```

- [ ] **Step 2: Add navigation from anskaffelser list**

In `src/frontend/src/routes/anskaffelser/+page.svelte`, add a "Ny anskaffelse" button/link in the header area that navigates to `/anskaffelser/ny`.

- [ ] **Step 3: Type-check and visual verification**

Navigate to `/anskaffelser/ny`. Confirm:
- Form sections appear correctly
- RadioCards toggle selection
- Value calculation updates live
- TerskelBar responds to value/oppdragsgiver/kontraktstype changes
- Analysis panel shows gjeldende del, krav, terskelbar
- Unntak section shows correct options per del

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: implement anskaffelsesregistrering from mockup"
```

---

## Task 11: Terskelverdikalkulator — Data and Types

**Files:**
- Create: `src/frontend/src/lib/types/verktoy.ts`
- Create: `src/frontend/src/lib/data/terskel-config.ts`

- [ ] **Step 1: Create verktoy types**

Types for all three tools. For the calculator:
```typescript
export type BeregningsmetodeId = 'standard' | 'rammeavtale' | 'regelmessig' | 'leasing' | 'tjeneste_uten_pris' | 'delkontrakter' | 'bygge';

export interface Beregningsmetode {
  id: BeregningsmetodeId;
  label: string;
  desc: string;
  ref: string;
}

export interface Delkontrakt {
  navn: string;
  verdi: string;
  type: 'vare_tjeneste' | 'bygge';
}

// Fristberegner
export type ProsedyreId = 'aapen' | 'begrenset' | 'forhandling' | 'del2';

export interface Prosedyre {
  id: ProsedyreId;
  label: string;
  ref: string;
  del: string;
}

export type FristType = 'start' | 'deadline' | 'milestone' | 'info' | 'soft';

export interface FristPunkt {
  label: string;
  date: Date;
  ref?: string;
  type: FristType;
  note?: string | null;
}

// Unntaksveiviser
export type ConclusionType = 'unntak' | 'nei' | 'ok';

export interface KravItem {
  text: string;
  type: 'krav' | 'anbefalt';
}

export interface KofaRef {
  sak: string;
  tekst: string;
}

export interface Conclusion {
  hjemmel: string;
  label: string;
  krav: KravItem[];
  kofa?: KofaRef[];
  type: ConclusionType;
}

export interface TreeOption {
  label: string;
  next?: string;
  conclusion?: Conclusion;
}

export interface TreeNode {
  q: string;
  hint?: string;
  opts: TreeOption[];
}
```

- [ ] **Step 2: Create terskel config**

Extract the `METODER` array from `docs/mockups/terskelverdikalkulator.jsx` lines 3–11 and the EOS threshold logic.

- [ ] **Step 3: Type-check and commit**

---

## Task 12: Terskelverdikalkulator — Component and Route

**Files:**
- Create: `src/frontend/src/lib/components/verktoy/TerskelverdikalkulatorView.svelte`
- Create: `src/frontend/src/routes/verktoy/+layout.svelte`
- Create: `src/frontend/src/routes/verktoy/kalkulator/+page.svelte`
- Create: `src/frontend/src/routes/verktoy/kalkulator/+page.ts`

- [ ] **Step 1: Create verktoy layout**

Minimal layout providing tool-specific chrome. The root `+layout.svelte` already imports `app.css`, so do NOT re-import it here. Just provide the tool shell structure:

```svelte
<script lang="ts">
  let { children } = $props();
</script>

<div class="tool-shell">
  {@render children()}
</div>
```

Also create a simple `/verktoy/+page.svelte` index page that lists the three tools with links: Terskelverdikalkulator, Fristberegner, Unntaks-veiviser.

- [ ] **Step 2: Create TerskelverdikalkulatorView**

Translates the full `docs/mockups/terskelverdikalkulator.jsx`. This is a single large component with conditional sub-sections per calculation method.

State (`$state`): `metode: BeregningsmetodeId | ''`, `resultat: number`, `oppdragsgiver: OppdragsgiverType`

The component contains 7 calculation method sub-sections (Standard, Rammeavtale, Regelmessig, Leasing, TjenesteUtenPris, Delkontrakter, ByggeOgAnlegg). Each is a `{#if metode === '...'}` block rather than separate components (they're small enough, and this avoids prop-threading the `onResult` callback).

Each method section has its own local `$state` fields and a `$derived` that computes the result. The parent component picks up the result via a reactive binding or by having the calculation inline.

**Svelte pattern:** Each method section is an `{#if}` block within the main component. **All state fields for all methods coexist simultaneously** as `$state` (e.g., `standardVerdi`, `standardOpsjon`, `rammeavtaleAntall`, `rammeavtaleSnitt`, etc.). The `resultat` is `$derived` using a switch on `metode` to select which fields to read. This is necessary because `$derived` must be able to statically reference all its dependencies — it cannot conditionally subscribe to different state variables.

Key UI elements:
- Oppdragsgiver radio cards (affects EOS threshold)
- Beregningsmetode grid (auto-fill, min 220px cards)
- Calculation area (felt-raised bg, wire border, padding)
- Result display: computed value in mono font, Del badge
- Delkontrakter: editable table with add/remove rows, smådel-unntak analysis
- Warning note about § 5-4 fjerde ledd

Reuse `RadioCards` and `FormField` from Task 6 (import from registrering/).

- [ ] **Step 3: Create route page**

`+page.ts`: `export const ssr = false;`
`+page.svelte`: Header bar + `<TerskelverdikalkulatorView />`

- [ ] **Step 4: Type-check and visual verification**

Navigate to `/verktoy/kalkulator`. Test all 7 methods, verify calculations, check del badge updates.

- [ ] **Step 5: Commit**

---

## Task 13: Fristberegner — Component and Route

**Files:**
- Create: `src/frontend/src/lib/data/frist-config.ts`
- Create: `src/frontend/src/lib/components/verktoy/FristTidslinje.svelte`
- Create: `src/frontend/src/lib/components/verktoy/FristberegnerView.svelte`
- Create: `src/frontend/src/routes/verktoy/fristberegner/+page.svelte`
- Create: `src/frontend/src/routes/verktoy/fristberegner/+page.ts`

- [ ] **Step 1: Create frist config**

Extract from `docs/mockups/fristberegner.jsx`:
- `PROSEDYRER` array (lines 3–8)
- `calcFrister()` function (lines 24–111) — the core deadline calculation logic. This is a pure function: `(prosedyre, kunngjoring, veiledende, hast, elektronisk) => FristPunkt[]`
- Helper functions `addDays`, `fmtDate`, `fmtShort`

- [ ] **Step 2: Create FristTidslinje**

Translates the timeline rendering from fristberegner.jsx lines 217–257. Vertical timeline with:
- Absolute-positioned vertical line (1px, wire color)
- For each frist punkt: gap indicator (+N dager), then node with dot + label + date + ref
- Node shape: round for most, square for milestone
- Node colors by type: start=ink, deadline=vekt, milestone=score-high, info=ink-muted, soft=ink-ghost

Props: `frister: FristPunkt[]`

- [ ] **Step 3: Create FristberegnerView**

Main component. State: `prosedyre`, `kunngjoring` (date string), `veiledende`, `hast`, `elektronisk` (all `$state`).

Computed: `frister = $derived(calcFrister(...))`, `totalDager = $derived(...)`.

UI: Prosedyre radio cards, date input, checkboxes for modifiers, then `<FristTidslinje>` when frister exist.

- [ ] **Step 4: Create route**

`+page.ts` + `+page.svelte` with header and view component.

- [ ] **Step 5: Type-check, visual verification, commit**

---

## Task 14: Unntaksveiviser — Data and Component

**Files:**
- Create: `src/frontend/src/lib/data/unntak-tree.ts`
- Create: `src/frontend/src/lib/components/verktoy/UnntaksveiviserView.svelte`
- Create: `src/frontend/src/routes/verktoy/unntak/+page.svelte`
- Create: `src/frontend/src/routes/verktoy/unntak/+page.ts`

- [ ] **Step 1: Create decision tree data**

Extract the entire `TREE` object from `docs/mockups/unntaksveiviser.jsx` lines 11–663. This is ~650 lines of structured data. **Copy the data structure nearly verbatim** — only convert JSX syntax to TypeScript (remove JSX elements like `<br />` and `<strong>` from text, replace with plain text or markdown). Add type assertion: `export const TREE: Record<string, TreeNode> = { ... } as const;`

This is the largest data file. Each node has a question, optional hint, and array of options. Options either link to `next` node or contain a `conclusion`.

- [ ] **Step 2: Create UnntaksveiviserView**

Translates the render section from unntaksveiviser.jsx lines 669–end.

State:
- `path: string[]` = `$state(['start'])` — breadcrumb trail of visited nodes
- `conclusion: Conclusion | null` = `$state(null)`

Computed: `current = $derived(TREE[path[path.length - 1]])` — current tree node

Methods:
- `choose(opt)` — if opt has conclusion, set it; else push opt.next to path
- `back()` — pop last path entry, clear conclusion
- `reset()` — path = ['start'], conclusion = null

UI sections:
1. **Legend** — small bar explaining "Forskriftskrav" vs "Anbefaling"
2. **Breadcrumb** — clickable path showing truncated question text
3. **Question** — serif font, large, with hint below
4. **Options** — vertical stack of buttons, hover effect (vekt border + vekt-bg)
5. **Conclusion** (when reached):
   - Colored panel (unntak=vekt-bg, nei=red-bg, ok=green-bg)
   - Hjemmel badge, label, krav list (with type indicators), KOFA references if any
   - "Start på nytt" button

Conclusion styling from mockup: `typeStyles` object maps conclusion type to bg/border/accent/icon colors.

- [ ] **Step 3: Create route**

- [ ] **Step 4: Type-check and visual verification**

Navigate to `/verktoy/unntak`. Walk through several decision paths:
- Del I → grunnprinsippene gjelder
- Del II → eneleverandør → ja → unntak
- Del III → hastetilfelle → nei → vilkåret ikke oppfylt
- Generelt → egenregi → ja → unntatt

Confirm breadcrumb navigation, back button, reset.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: implement unntaksveiviser decision tree from mockup"
```

---

## Task 15: Navigation and Polish

**Files:**
- Modify: `src/frontend/src/routes/anskaffelser/+page.svelte`
- Modify: `src/frontend/src/routes/anskaffelser/[id]/+layout.svelte`

- [ ] **Step 1: Add "Ny anskaffelse" to anskaffelser list**

Add a button or link in the header area of the anskaffelser list page that navigates to `/anskaffelser/ny`. Style as accent-colored button, consistent with existing UI.

- [ ] **Step 2: Add verktøy links**

Consider where tool links should live. Options:
- In the registration form's analysis panel (contextual links to kalkulatoren)
- In the [id] layout's workspace switcher (add Verktøy as an option)

For now, add links to the verktøy pages from the registration form's analysis panel: "Åpne terskelverdikalkulator ›" and "Åpne fristberegner ›" as accent-colored links.

- [ ] **Step 3: Final type-check**

Run: `cd src/frontend && npx svelte-kit sync && npx svelte-check --threshold error`
Confirm zero errors.

- [ ] **Step 4: Full visual walkthrough**

Verify the full flow:
1. `/anskaffelser` → see list + "Ny anskaffelse" button
2. Click "Ny anskaffelse" → `/anskaffelser/ny` → registration form works
3. Navigate to `/anskaffelser/1795` → saksoversikt renders with demo data
4. `/verktoy/kalkulator` → all 7 methods work
5. `/verktoy/fristberegner` → all 4 procedures produce correct timelines
6. `/verktoy/unntak` → decision tree navigates correctly

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add navigation between mockup pages"
```
