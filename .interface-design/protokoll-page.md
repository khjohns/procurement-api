# Protokollside — Design Specification

## Intent

**Who:** An innkjøper (procurement officer) at a Norwegian public agency. They've just finished evaluating suppliers and now must document the entire procurement process in a legally required protocol (anskaffelsesprotokoll, FOA § 25-5). They're in "compliance mode" — methodical, completing sections one by one, switching between verifying auto-filled data and writing justification text.

**What they accomplish:** Complete a structured document (grouped into chapters mirroring the Word output) where ~60% is pre-filled from APIs (Artifik + Doffin eForms) and ~40% requires manual input — justifications, assessments, explanations. Then generate and download a Word document.

**Feel:** The same Analysebordet: dense, precise, professional. But here the focal point shifts from the evaluation matrix to a **document workspace** — structured sections with progress tracking. It should feel like filling in an authoritative compliance form, not a casual web form. The dominant rhythm is: scan auto-filled data → verify → write justification → move to next section.

---

## Layout

### Page Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar │          single scroll (800px max-width, centered)         │
│ (228px) │                                                            │
│         │  ┌─ Page header ─────────────────────────────────────────┐ │
│         │  │  ANSKAFFELSESPROTOKOLL                                │ │
│         │  │  IT-rammeavtale konsulenter 2026   [Generer .docx ↓]  │ │
│         │  │  Ref: 2026-1795 · Del II                              │ │
│         │  └───────────────────────────────────────────────────────┘ │
│         │                                                            │
│         │  ┌─ Progress strip ──────────────────────────────────────┐ │
│         │  │  ██████████░░░░░░  12 av 15 seksjoner                 │ │
│         │  │                    3 mangler begrunnelse               │ │
│         │  └───────────────────────────────────────────────────────┘ │
│         │                                                            │
│         │  ──── RAMMEVERK ─────────────────────────────────────────  │
│         │  ▸  1   Generell informasjon                  ✓  AUTO     │
│         │  ─────────────────────────────────────────────────────     │
│         │  ▾  2   Prosedyre              [sticky header] ◐ DELVIS   │
│         │  │ ┌──────────────────────────────────────────────────┐   │
│         │  │ │  Prosedyretype  │ Åpen anbudskonkurranse        │   │
│         │  │ └──────────────────────────────────────────────────┘   │
│         │  │  BEGRUNNELSE FOR PROSEDYREVALG                        │
│         │  │ ┌──────────────────────────────────────────────────┐   │
│         │  │ │ Åpen anbud ble valgt fordi...                   │   │
│         │  │ └──────────────────────────────────────────────────┘   │
│         │  │  127 tegn · Valgfritt for standardprosedyrer          │
│         │  ─────────────────────────────────────────────────────     │
│         │  ▸  3   Kunngjøring                           ✓  AUTO     │
│         │  ──── KVALIFISERING ─────────────────────────────────────  │
│         │  ▸  4   Kvalifikasjonskrav                    ✓  AUTO     │
│         │  ...                                                       │
│         │  ──── TILDELING ─────────────────────────────────────────  │
│         │  ▾  14  Valgt tilbud + begrunnelse            ◐  DELVIS   │
│         │  │ ┌──────────────────────────────────────────────────┐   │
│         │  │ │  Tildelt til   │ Bouvet ASA                     │   │
│         │  │ │  Kontraktsverdi│ 25 000 000 kr                  │   │
│         │  │ └──────────────────────────────────────────────────┘   │
│         │  │  TILDELINGSBEGRUNNELSE                                  │
│         │  │ ┌─ Tipex ──────────────────────────────────────────┐   │
│         │  │ │ B I U │ H2 H3 │ • 1. │ ""                      │   │
│         │  │ ├──────────────────────────────────────────────────┤   │
│         │  │ │ Bouvet tildeles kontrakten basert på...         │   │
│         │  │ │                              max-height: 60vh ↕ │   │
│         │  │ └──────────────────────────────────────────────────┘   │
│         │  │  2 847 tegn                                            │
│         │  ...                                                       │
│         │                                                            │
│         │  ┌── Sticky footer (full workspace width) ───────────────┐│
│         │  │ ██████░░░ 12/15 · 3 mangler  Lukk alle  Generer .docx││
│         │  └───────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

The page is a single scrollable column (max-width: 800px, centered) — this is document-width, not dashboard-width. The evaluation matrix needs horizontal space for supplier columns; the protocol is linear text, so a narrower column improves readability.

### Scroll Architecture

Three decisions control scroll behavior:

1. **Page scroll:** The entire column scrolls naturally in the browser. No nested scroll containers for the page itself.
2. **Rich text editors (Tipex):** `max-height: 60vh; overflow-y: auto` when content exceeds threshold. Prevents a 10 A4-page tildelingsbegrunnelse from creating 4000px of unbounded page height. On 1080p, 60vh ≈ 648px — roughly 1.5 A4 pages visible at once.
3. **Plain textareas:** Auto-grow with content (no max-height). These are short fields (prosedyrebegrunnelse, avvisning) where content rarely exceeds 200px.

**Why max-height on Tipex:** A tildelingsbegrunnelse for a major procurement is routinely 3–8 A4 pages. Without a cap, auto-grow pushes the section header off-screen, hides the progress indicator, and forces the user to scroll past their own text to reach any other element. The 60vh cap means the editor always fits within the viewport alongside the sticky section header and footer.

---

## Page Header

```
ANSKAFFELSESPROTOKOLL              section-label style (11px, uppercase, --ink-ghost)

IT-rammeavtale konsulenter 2026    headline (20px, --font-ui, weight 700, --ink)
Ref: 2026-1795 · Del II            body (13px, --ink-secondary)

                            ┌──────────────────────┐
                            │  ↓  Generer .docx     │  primary action button
                            └──────────────────────┘
```

- Section label: same 11px/600/uppercase/`--ink-ghost` pattern from system.md
- Title: procurement name from API, same headline style as evaluation page
- Reference + del (II or III): derived from procurement threshold
- Generate button: right-aligned, `--vekt` background, `--canvas` text, `--r-sm` radius, weight 600
- Generate button disabled state: `--felt-active` background, `--ink-muted` text — when completeness < 100% or still loading

---

## Progress Strip

Horizontal bar showing overall document completeness. Lives between header and sections. Scrolls with content — the sticky footer carries persistent progress.

```
┌────────────────────────────────────────────────────────────────┐
│  ███████████████░░░░░░░░  12 av 15 seksjoner                   │
│                           3 mangler begrunnelse                 │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background, `--wire` border, `--r-md` radius, `--sp-4` padding
- Progress bar: 4px height, `--score-high` fill (green) when >80%, `--vekt` when 40-80%, `--score-low` when <40%
- Fraction: `--font-data`, 13px, `--ink` color
- Missing count: 13px, `--ink-secondary`, emphasizes what's incomplete
- When 100%: bar fully green, text changes to "Fullstendig — klar for generering" in `--score-high`
- **Denominator excludes N/A sections.** If 4 of 19 possible sections are N/A for this procurement, show "12 av 15" — not "12 av 19". Parenthetical "(4 ikke relevant)" in `--ink-ghost` if needed for transparency.

---

## Chapter Groupings

Sections are grouped into chapters matching the Word document's heading structure (mirroring the Python generator's output). Chapter labels are non-collapsible visual landmarks — they give the accordion document-level rhythm.

```
──── RAMMEVERK ─────────────────────────────────────────────────
▸  1   Generell informasjon                          ✓  AUTO
─────────────────────────────────────────────────────────────────
▸  2   Prosedyre                                     ◐  DELVIS
─────────────────────────────────────────────────────────────────
▸  3   Kunngjøring                                   ✓  AUTO
──── DIALOG OG AVKLARING ───────────────────────────────────────
▸  4   Dialog og forhandlinger                       — N/A
─────────────────────────────────────────────────────────────────
▸  5   Ettersending og avklaring                     ✓  AUTO
──── KVALIFISERING ─────────────────────────────────────────────
...
──── TILDELING ─────────────────────────────────────────────────
...
──── AVSLUTNING ────────────────────────────────────────────────
...
```

- Chapter label: 10px, uppercase, weight 600, `--ink-ghost`, letter-spacing 0.12em
- Horizontal rule: `--wire` border, top and bottom of the label line
- Not collapsible, not interactive — purely structural
- Chapters match the Python generator's top-level headings: RAMMEVERK, DIALOG OG AVKLARING, KVALIFISERING, AVVISNING, TILDELING, AVSLUTNING

---

## Section Accordion

The core of the page. Collapsible sections within chapter groups. Multiple sections can be open simultaneously — the user needs to cross-reference API data between sections (e.g., verifying supplier lists across related sections).

### Section Header Row

```
┌────────────────────────────────────────────────────────────────┐
│  ▸  2   Prosedyre                              ◐  DELVIS      │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background on hover, transparent by default
- **Sticky:** `position: sticky; top: 0; z-index: 10` — stays pinned when scrolling through expanded section content. The collapse chevron remains reachable regardless of how long the section content is.
- Bottom border: `--wire` (separator between sections)
- Chevron: `▸` rotates to `▾` when expanded, 10px, `--ink-ghost`, transition 150ms
- Section number: `--font-data`, 13px, `--ink-muted` — plain ordinal (no § prefix — § is reserved for actual FOA references within section content)
- Section name: `--font-ui`, 13px, weight 500, `--ink`
- Status badge (right-aligned):

| Status | Badge | Color |
|--------|-------|-------|
| Complete (all fields filled) | `✓ AUTO` or `✓ OK` | `--score-high` text, `--score-high-bg` background |
| Partial (some manual fields empty) | `◐ DELVIS` | `--vekt` text, `--vekt-bg` background |
| Empty (manual fields required, none filled) | `○ MANGLER` | `--score-low` text, `--score-low-bg` background |
| Not applicable (section hidden for this procurement) | `— N/A` | `--ink-ghost` text |

- Badge: pill shape (`--r-sm`), 10px uppercase, weight 600, letter-spacing 0.06em, padding 2px 8px
- Click anywhere on row to toggle expand/collapse
- `AUTO` vs `OK`: sections with only API data show "AUTO" (nothing for user to do), sections with completed manual fields show "OK"

### Section Content — Auto-filled Data

API data displayed in a read-only info table. Not editable — the user verifies, not modifies.

```
┌────────────────────────────────────────────────────────────────┐
│  Oppdragsgiver    │  Oslo kommune v/ Utdanningsetaten          │
│  Kontraktsverdi   │  25 000 000 kr                             │
│  Varighet         │  01.03.2026 – 28.02.2030                   │
│  Prosedyretype    │  Åpen anbudskonkurranse                    │
│  Kunngjøringsdato │  15.01.2026                                │
└────────────────────────────────────────────────────────────────┘
```

- Two-column layout: label | value
- Label column: 13px, weight 500, `--ink-secondary`, **left-aligned**, 160px fixed width
- Value column: 13px, weight 500, `--ink`, `--font-data` for numbers/dates, `--font-ui` for text
- Row: `--sp-2` vertical padding, `--wire` bottom border
- Container: `--felt` background, `--wire` border, `--r-sm` radius
- Numbers formatted with Norwegian locale (`Intl.NumberFormat('nb-NO')`)

When data is missing from API: show `—` in `--ink-ghost` with a small info tooltip: "Ikke tilgjengelig fra Artifik"

### Section Content — Supplier Lists (from Activities)

Several sections show lists of suppliers derived from activities (SUBMIT_BID, QUALIFYING_PARTICIPANTS, REJECT_PARTICIPATION, AWARDING_PARTICIPANTS).

```
┌────────────────────────────────────────────────────────────────┐
│  LEVERANDØRER MED TILBUD                     section-label     │
│                                                                │
│  1. Bouvet ASA                                                 │
│  2. Sopra Steria AS                                            │
│  3. Knowit Solutions Norway AS                                 │
└────────────────────────────────────────────────────────────────┘
```

- Section label: 11px, uppercase, weight 600, `--ink-ghost`, letter-spacing 0.08em
- Supplier items: 13px, `--font-ui`, weight 500, `--ink`
- Numbered list: `--font-data` for numbers, `--ink-muted`
- Container: same `--felt` / `--wire` treatment as info tables

### Section Content — Manual Fields

Manual input areas for justifications and assessments the user must write.

**Short text fields (begrunnelser, one-liners):**

```
┌────────────────────────────────────────────────────────────────┐
│  BEGRUNNELSE FOR PROSEDYREVALG               section-label     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Åpen anbudskonkurranse ble valgt fordi...               │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  127 tegn                                                      │
│  Valgfritt — standardprosedyrer krever normalt ingen           │
│  begrunnelse                                 hint text         │
└────────────────────────────────────────────────────────────────┘
```

- Textarea: `--canvas` background (inset feel — darker than surrounding `--felt`), `--wire` border, `--r-sm` radius
- Focus: `--wire-focus` border (amber)
- Placeholder: `--ink-ghost`, italic
- Hint text below: 11px, `--ink-muted`, not italic
- Character count: 11px, `--ink-muted`, `--font-data`, right-aligned on same line as hint (or alone if no hint)
- Min-height: 80px, auto-grows with content (no max-height — short fields)

**Rich text fields (tildelingsbegrunnelse, kvalifikasjonsvurdering):**

```
┌────────────────────────────────────────────────────────────────┐
│  TILDELINGSBEGRUNNELSE                       section-label     │
│                                                                │
│  ┌─ Tipex toolbar ─────────────────────────────────────────┐  │
│  │  B  I  U  │  H2  H3  │  •  1.  │  ""                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  Bouvet ASA tildeles kontrakten basert på følgende       │  │
│  │  vurdering av tildelingskriteriene:                      │  │
│  │                                                          │  │
│  │  ## Kompetanse (40%)                                     │  │
│  │  Bouvet har tilbudt et team med...                       │  │
│  │                                   [max-height: 60vh  ↕]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  2 847 tegn                                                    │
│  Begrunn valget opp mot hvert tildelingskriterium.   hint      │
│  Feltet eksporteres som formatert tekst i Word-dokumentet.     │
└────────────────────────────────────────────────────────────────┘
```

- Tipex editor container: `--canvas` background, `--wire` border, `--r-sm` radius
- Toolbar: `--felt` background, `--wire` bottom border, `--sp-2` padding
- Toolbar buttons: 24×24px, `--r-sm`, `--ink-secondary`, hover → `--felt-hover`
- Toolbar active state: `--vekt-bg` background, `--vekt` color
- Toolbar dividers: 1px `--wire`, 16px height, vertical
- Editor area: `--sp-4` padding, min-height 200px, **max-height 60vh, overflow-y auto** (internal scroll when content exceeds ~1.5 A4 pages)
- Editor text: `--font-ui`, 14px (slightly larger for writing comfort), `--ink`, line-height 1.6
- Focus: entire container border → `--wire-focus`
- Character count below: 11px, `--ink-muted`, `--font-data`

**Toolbar items and Word export mapping:**

| Toolbar | Word mapping | Use case |
|---------|-------------|----------|
| **B** (Bold) | Bold run | Emphasis, supplier names |
| *I* (Italic) | Italic run | Terms, document names |
| U (Underline) | Underline run | Legal emphasis convention |
| H2, H3 | Heading 2, 3 styles | Structuring long begrunnelse by criterion |
| • (Unordered list) | Bullet list | Listing evaluation points |
| 1. (Ordered list) | Numbered list | Sequential arguments |
| "" (Blockquote) | Indented paragraph | Quoting from tilbud or FOA text |

**Per-supplier fields (utvelgelsesbegrunnelser, avvisningsbegrunnelser):**

When a section requires justification per supplier, show a stacked card layout:

```
┌────────────────────────────────────────────────────────────────┐
│  UTVELGELSESBEGRUNNELSE PER LEVERANDØR       section-label     │
│                                                                │
│  ┌─ Bouvet ASA ────────────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  Bouvet oppfyller kvalifikasjonskravene basert   │   │  │
│  │  │  på dokumentert erfaring med...                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │  342 tegn                                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Sopra Steria AS ──────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │                                                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │  0 tegn                                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

- Supplier card: `--felt` background, `--wire` border, `--r-sm` radius, `--sp-4` padding
- Supplier name: 13px, weight 600, `--ink`, with left border 3px `--vekt` (weight spine, consistent with matrix identity)
- Gap between cards: `--sp-3`
- Textarea inside: same `--canvas` inset treatment
- Character count: 11px, `--ink-muted`, `--font-data`, below each textarea
- Cards with empty textarea: faded left border (15% amber — sub-criterion pattern from matrix)
- Cards with filled textarea: solid left border (amber — group-row pattern)

---

## Sticky Footer

Always visible at bottom of viewport. Spans full workspace width (it's chrome, not content). Inner content centers to match 800px column.

```
┌────────────────────────────────────────────────────────────────┐
│  ██████░░░  12/15 · 3 mangler      Lukk alle   Generer .docx ↓│
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background, `--wire` top border, `position: sticky; bottom: 0`
- Inner content: `max-width: 800px; margin: 0 auto` — aligns with page column
- Padding: `--sp-3` vertical, `--sp-4` horizontal
- Left: compact progress bar (3px height, 80px width) + fraction (`--font-data`, 12px) + missing count (`--ink-secondary`, 12px)
- Center: "Lukk alle" ghost button — `--wire` border, `--ink-secondary` text, 12px. Collapses all open sections. Only visible when ≥2 sections are expanded.
- Right: generate button (same as header — `--vekt` bg, `--canvas` text)
- When all sections complete: progress text → "Klar" in `--score-high`, progress bar fully green
- Generating state: button shows spinner + "Genererer..." in `--ink-muted`, disabled
- Auto-save indicator: "Lagret" appears briefly (1s fade) to left of Lukk alle after successful save

---

## Procurement Selector

When no procurement is selected (initial page state), show a selector:

```
┌────────────────────────────────────────────────────────────────┐
│  ANSKAFFELSESPROTOKOLL               section-label             │
│                                                                │
│  Velg anskaffelse                    headline (20px)           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Søk etter anskaffelse...                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Search results ────────────────────────────────────────┐  │
│  │  IT-rammeavtale konsulenter 2026           2026-1795    │  │
│  │  Vedlikehold grøntanlegg                   2025-0892    │  │
│  │  Kontormøbler — minikonkurranse            2026-0134    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

- Search input: same combobox pattern as evaluation setup page (Picker component). SVG search icon (16×16, `--ink-ghost` stroke) — no emoji.
- Results: `--felt` rows, hover → `--felt-hover`, `--wire` separator
- Procurement name: 13px, weight 500, `--ink`
- Reference number: `--font-data`, `--ink-muted`, right-aligned
- On select: fetches procurement data + activities, transitions to form view
- Loading state: skeleton lines in `--felt-active` with subtle pulse animation

---

## Loading State

When procurement is selected and data is being fetched:

```
┌────────────────────────────────────────────────────────────────┐
│  ████████░░░░  Henter data...                                  │
│                                                                │
│  ──── RAMMEVERK ───────────────────────────────────────────    │
│  1  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (skeleton)                │
│  2  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                            │
│  3  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                            │
│  ──── KVALIFISERING ───────────────────────────────────────    │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

- Chapter labels and section numbers shown immediately (they're static)
- Content areas show skeleton lines: `--felt-active` background, `--r-sm` radius, 12px height, fixed widths matching expected content proportions (label: 160px, value: ~200px), pulse animation
- Progress strip shows "Henter data fra Artifik..." in `--ink-muted`

---

## Error States

**API data unavailable for specific section:**

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠  Data ikke tilgjengelig fra API                             │
│  Fyll ut manuelt i feltet under, eller prøv igjen.             │
│                                        [Prøv igjen]           │
└────────────────────────────────────────────────────────────────┘
```

- Warning container: `--vekt-bg` background, `--vekt` left border (3px), `--r-sm` radius
- Icon + text: 13px, `--vekt-dim`
- Retry button: ghost style, `--wire` border, `--ink-secondary` text

**eForms not available:**

Not an error — many procurements lack eForms data. Show inline note:

```
eForms-data ikke tilgjengelig for denne kunngjøringen.
Kvalifikasjonskrav og tildelingskriterier fylles ut manuelt.
```

- 12px, `--ink-muted`, italic
- Displayed in sections for Kvalifikasjonskrav and Tildelingskriterier
- Those sections switch from auto-display to manual textarea mode

---

## Interaction States

### Section expand/collapse
- Chevron rotation: 150ms ease-out
- Content: slide-down with `transition:slide` (Svelte built-in), 200ms
- **Multiple sections can be open simultaneously.** The user needs to cross-reference API data between sections (e.g., verifying supplier lists). Max-height on rich text editors prevents unbounded page growth.
- "Lukk alle" in sticky footer collapses all sections when ≥2 are expanded

### Auto-save
- Manual fields auto-save to localStorage on change (debounced 500ms)
- Key structure: `protokoll:{procurementId}` — isolates drafts per procurement
- Small "Lagret" indicator appears briefly in footer after save, then fades (1s)
- On page load, restore from localStorage if procurement ID matches
- Size monitoring: warn user if localStorage usage approaches 4MB (preparation for future server-side draft persistence)

### Navigation guard
- `beforeNavigate` check: if any manual field has been modified, confirm before leaving
- Same pattern as evaluation setup page (isDirty derived state)

### Generate flow
1. Click "Generer .docx"
2. Button shows spinner + "Genererer..."
3. POST to `/api/protokoll/generate` with merged data
4. On success: browser downloads .docx blob
5. On error: toast/inline error below button

---

## Data Source Clarifications

### What auto-fills from which API

| Source | Data |
|--------|------|
| **Artifik API** (procurement + activities) | Procurement metadata, supplier lists (SUBMIT_BID, REJECT_PARTICIPATION, QUALIFYING_PARTICIPANTS, AWARDING_PARTICIPANTS), conversation events, dates |
| **Doffin eForms** (when available) | Award criteria + weights, selection criteria, contract nature, framework agreement details |
| **Manual** (always) | All begrunnelse fields, kvalifikasjonsvurderinger, inhabilitet, underleverandører |

**Important:** Evaluation scores (from the evaluation matrix) are **not** auto-filled into the protocol. The Artifik API provides award participant names and contract values, but not evaluation scores. Section 14 (Valgt tilbud + begrunnelse) auto-fills the winner name and contract value from the API; the tildelingsbegrunnelse is always manual. Section 14's default status is ◐ DELVIS (auto-filled metadata + empty manual begrunnelse).

---

## Responsive Behavior

- Max-width container (800px) centers on wide screens — document-width
- Below 768px: label/value tables stack vertically (label above value)
- Below 768px: page header stacks (title above button)
- Sidebar collapses per shared app behavior
- Tipex toolbar wraps naturally (flex-wrap)
- Sticky footer: progress bar and fraction hide below 480px, only button + status text remain

---

## Accessibility

- Section headers: `<button>` with `aria-expanded`, `aria-controls` pointing to content panel
- Content panels: `role="region"`, `aria-labelledby` pointing to header
- Status badges: `aria-label` with full status text (e.g., "Seksjon 2, Prosedyre, delvis utfylt")
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Tipex editor: `aria-label="Tildelingsbegrunnelse"`, inherits TipTap's ARIA support
- Generate button: `aria-disabled` when incomplete + `title` explaining why
- Keyboard: Enter/Space toggles sections, Tab moves between sections, focus-visible with `--wire-focus`
- Skip link: "Gå til seksjon med mangler" — jumps to first incomplete section
- Chapter labels: `role="separator"` with `aria-label` for screen readers

---

## Signature Elements

The protocol page extends the Analysebordet identity through:

1. **Vektlinjen repurposed:** The amber left-border spine appears on per-supplier justification cards — connecting the protocol visually to the evaluation matrix. Filled justifications get solid amber (like group rows), empty ones get faded amber (like sub-criteria rows).

2. **Ordinal numbering in --font-data:** Section numbers use monospace, creating the same dense-data texture as the matrix. The numbering is plain ordinals (not § prefixed) — § is reserved for actual FOA references within content, maintaining legal precision.

3. **Chapter landmarks:** The uppercase chapter labels (RAMMEVERK, TILDELING, etc.) create the same structural rhythm as group rows in the evaluation matrix — visual anchors in a long document.

4. **Status badges:** The same score-tier color system (green/amber/rose) communicates section completeness — a vocabulary users already understand from the evaluation.

5. **Document width:** The narrow 800px column signals "this is a document" — a deliberate contrast to the full-width evaluation matrix. Same workspace, different tool.
