# Protokollside — Design Specification

## Intent

**Who:** An innkjøper (procurement officer) at a Norwegian public agency. They've just finished evaluating suppliers and now must document the entire procurement process in a legally required protocol (anskaffelsesprotokoll, § 25-5). They're in "compliance mode" — methodical, completing sections one by one, switching between verifying auto-filled data and writing justification text.

**What they accomplish:** Complete a 19-section structured document where ~60% is pre-filled from APIs (Artifik + Doffin eForms) and ~40% requires manual input — justifications, assessments, explanations. Then generate and download a Word document.

**Feel:** The same Analysebordet: dense, precise, professional. But here the focal point shifts from the evaluation matrix to a **document workspace** — structured sections with progress tracking. It should feel like filling in an authoritative compliance form, not a casual web form. The dominant rhythm is: scan auto-filled data → verify → write justification → move to next section.

---

## Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (228px, shared with rest of app)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Page header ──────────────────────────────────────────────┐ │
│  │  ANSKAFFELSESPROTOKOLL                                     │ │
│  │  [Procurement name]               [Generer .docx ↓]       │ │
│  │  Ref: YYYY-NNNN · Del II                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Progress strip ──────────────────────────────────────────┐  │
│  │  ██████████░░░░░░  12/19 seksjoner · 3 mangler begrunnelse│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Section accordion ───────────────────────────────────────┐  │
│  │  § 1  Generell informasjon                        ✓  AUTO │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  § 2  Prosedyre                                   ◐  DELV │  │
│  │  │  ┌─ Expanded section content ────────────────────────┐ │  │
│  │  │  │  [Auto-filled fields in info-table]               │ │  │
│  │  │  │  [Manual: Prosedyrebegrunnelse — textarea]        │ │  │
│  │  │  └───────────────────────────────────────────────────┘ │  │
│  │  § 3  Kvalifikasjonskrav                          ✓  AUTO │  │
│  │  ─────────────────────────────────────────────────────────│  │
│  │  § 14 Valgt tilbud + begrunnelse                  ○  MAN  │  │
│  │  │  ┌─ Expanded section content ────────────────────────┐ │  │
│  │  │  │  [Auto-filled: winning supplier, scores]          │ │  │
│  │  │  │  [Manual: Tildelingsbegrunnelse — Tipex editor]   │ │  │
│  │  │  └───────────────────────────────────────────────────┘ │  │
│  │  ...                                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Sticky footer ──────────────────────────────────────────┐   │
│  │  3 ufullstendige seksjoner        [Generer .docx ↓]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The page is a single scrollable column (max-width: 800px, centered) — this is document-width, not dashboard-width. The evaluation matrix needs horizontal space for supplier columns; the protocol is linear text, so a narrower column improves readability.

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

Horizontal bar showing overall document completeness. Lives between header and sections.

```
┌────────────────────────────────────────────────────────────────┐
│  ███████████████░░░░░░░░  12 av 19 seksjoner                  │
│                           3 mangler begrunnelse                │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background, `--wire` border, `--r-md` radius, `--sp-4` padding
- Progress bar: 4px height, `--score-high` fill (green) when >80%, `--vekt` when 40-80%, `--score-low` when <40%
- Fraction: `--font-data`, 13px, `--ink` color
- Missing count: 13px, `--ink-secondary`, emphasizes what's incomplete
- When 100%: bar fully green, text changes to "Fullstendig — klar for generering" in `--score-high`

---

## Section Accordion

The core of the page. 19 collapsible sections, each with a header row and expandable content.

### Section Header Row

```
┌────────────────────────────────────────────────────────────────┐
│  ▸  § 2   Prosedyre                              ◐  DELVIS   │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background on hover, transparent by default
- Bottom border: `--wire` (separator between sections)
- Chevron: `▸` rotates to `▾` when expanded, 10px, `--ink-ghost`, transition 150ms
- Section number: `--font-data`, 13px, `--ink-muted` — "§ 2" prefix for legal reference
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
- Label column: 13px, weight 500, `--ink-secondary`, right-aligned, 160px fixed width
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
│                                                                │
│  Valgfritt — standardprosedyrer krever normalt ingen           │
│  begrunnelse                                 hint text         │
└────────────────────────────────────────────────────────────────┘
```

- Textarea: `--canvas` background (inset feel — darker than surrounding `--felt`), `--wire` border, `--r-sm` radius
- Focus: `--wire-focus` border (amber)
- Placeholder: `--ink-ghost`, italic
- Hint text below: 11px, `--ink-muted`, not italic
- Min-height: 80px, auto-grows with content

**Rich text fields (tildelingsbegrunnelse, kvalifikasjonsvurdering):**

```
┌────────────────────────────────────────────────────────────────┐
│  TILDELINGSBEGRUNNELSE                       section-label     │
│                                                                │
│  ┌─ Tipex toolbar ─────────────────────────────────────────┐  │
│  │  B  I  U  │  H2  H3  │  • ─  1. ─  │  ""  —           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  Bouvet ASA tildeles kontrakten basert på følgende       │  │
│  │  vurdering av tildelingskriteriene:                      │  │
│  │                                                          │  │
│  │  ## Kompetanse (40%)                                     │  │
│  │  Bouvet har tilbudt et team med...                       │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Feltet eksporteres som formatert tekst i Word-dokumentet.     │
└────────────────────────────────────────────────────────────────┘
```

- Tipex editor container: `--canvas` background, `--wire` border, `--r-sm` radius
- Toolbar: `--felt` background, `--wire` bottom border, `--sp-2` padding
- Toolbar buttons: 24×24px, `--r-sm`, `--ink-secondary`, hover → `--felt-hover`
- Toolbar active state: `--vekt-bg` background, `--vekt` color
- Toolbar dividers: 1px `--wire`, 16px height, vertical
- Editor area: `--sp-4` padding, min-height 200px
- Editor text: `--font-ui`, 14px (slightly larger for writing comfort), `--ink`, line-height 1.6
- Focus: entire container border → `--wire-focus`

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
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Sopra Steria AS ──────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │                                                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

- Supplier card: `--felt` background, `--wire` border, `--r-sm` radius, `--sp-4` padding
- Supplier name: 13px, weight 600, `--ink`, with left border 3px `--vekt` (weight spine, consistent with matrix identity)
- Gap between cards: `--sp-3`
- Textarea inside: same `--canvas` inset treatment
- Cards with empty textarea: faded left border (15% amber — sub-criterion pattern from matrix)
- Cards with filled textarea: solid left border (amber — group-row pattern)

---

## Sticky Footer

Always visible at bottom of viewport. Shows status + generate action.

```
┌────────────────────────────────────────────────────────────────┐
│  3 ufullstendige seksjoner              [Generer .docx ↓]     │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--felt` background, `--wire` top border, `--sp-3` vertical padding, `--sp-8` horizontal
- Left: status text, 13px, `--ink-secondary`
- Right: generate button (same as header — `--vekt` bg, `--canvas` text)
- When all sections complete: status text → "Klar for generering" in `--score-high`
- Generating state: button shows spinner + "Genererer..." in `--ink-muted`, disabled

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
│  │  🔍 Søk etter anskaffelse...                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Search results ────────────────────────────────────────┐  │
│  │  IT-rammeavtale konsulenter 2026           2026-1795    │  │
│  │  Vedlikehold grøntanlegg                   2025-0892    │  │
│  │  Kontormøbler — minikonkurranse            2026-0134    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

- Search input: same combobox pattern as evaluation setup page (Picker component)
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
│  § 1  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (skeleton)              │
│  § 2  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                          │
│  § 3  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                          │
└────────────────────────────────────────────────────────────────┘
```

- Section headers shown immediately (they're static)
- Content areas show skeleton lines: `--felt-active` background, `--r-sm` radius, 12px height, 60-80% width (randomized), pulse animation
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
- Displayed in sections 3 (Kvalifikasjonskrav) and 4 (Tildelingskriterier)
- Those sections switch from auto-display to manual textarea mode

---

## Interaction States

### Section expand/collapse
- Chevron rotation: 150ms ease-out
- Content: slide-down with `transition:slide` (Svelte built-in), 200ms
- Only one section expanded at a time (accordion behavior) — or configurable to allow multiple

### Auto-save
- Manual fields auto-save to localStorage on change (debounced 500ms)
- Small "Lagret" indicator appears briefly in footer after save, then fades (1s)
- On page load, restore from localStorage if procurement ID matches

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

## Responsive Behavior

- Max-width container (800px) centers on wide screens — document-width
- Below 768px: label/value tables stack vertically (label above value)
- Below 768px: page header stacks (title above button)
- Sidebar collapses per shared app behavior
- Tipex toolbar wraps naturally (flex-wrap)

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

---

## Signature Elements

The protocol page extends the Analysebordet identity through:

1. **Vektlinjen repurposed:** The amber left-border spine appears on per-supplier justification cards — connecting the protocol visually to the evaluation matrix. Filled justifications get solid amber (like group rows), empty ones get faded amber (like sub-criteria rows).

2. **Section numbering in --font-data:** The "§ 2" prefix uses monospace, creating the same dense-data texture as the matrix. Legal paragraph references feel precise and technical.

3. **Status badges:** The same score-tier color system (green/amber/rose) communicates section completeness — a vocabulary users already understand from the evaluation.

4. **Document width:** The narrow 800px column signals "this is a document" — a deliberate contrast to the full-width evaluation matrix. Same workspace, different tool.
