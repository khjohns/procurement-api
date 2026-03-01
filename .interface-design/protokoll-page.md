# Protokollside — Design Specification

## Intent

**Who:** An innkjøper (procurement officer) at a Norwegian public agency. They've just finished evaluating suppliers and now must document the entire procurement process in a legally required protocol (anskaffelsesprotokoll, FOA § 25-5). They're in "compliance mode" — methodical, completing sections one by one, switching between verifying auto-filled data and writing justification text.

**What they accomplish:** Complete a structured document (grouped into chapters mirroring the Word output) where ~60% is pre-filled from APIs (Artifik + Doffin eForms) and ~40% requires manual input — justifications, assessments, explanations. Then generate and download a Word document.

**Feel:** The same Analysebordet: dense, precise, professional. But here the focal point shifts from the evaluation matrix to a **document workspace** — structured sections with progress tracking. It should feel like filling in an authoritative compliance form, not a casual web form. The dominant rhythm is: scan auto-filled data → verify → write justification → move to next section.

---

## Document Variants: Del I, II, III

The protocol has three structural variants based on procurement threshold:

| Del | Threshold | FOA chapter | Status |
|-----|-----------|-------------|--------|
| Del I | Under nasjonal terskel | Del I (§§ 1-7) | Future scope |
| Del II | Nasjonal, under EØS-terskel | Del II (§§ 8-10) | Supported |
| Del III | Over EØS-terskel | Del III (§§ 11-27) | Supported |

Del II and Del III share the same rendering engine and component patterns, but have **different chapter structures, different sections, and different conditional logic.** A section registry per del defines the document structure declaratively — the page reads the appropriate registry based on `isDel2` and renders through shared components.

### Chapter Structure Comparison

**Del II:**
```
RAMMEVERK                           ← Generell info, Prosedyre
DIALOG OG AVKLARING                 ← Dialog/forhandlinger, Ettersending
KVALIFISERING                       ← Kvalifikasjonsvurdering, Utvelgelse
AVVISNING                           ← Formalfeil, Leverandør, Tilbud
TILDELING                           ← Kriterier, Vurdering, Tildeling, Meddelelse, Rammeavtale
AVSLUTNING                          ← Markedsdialog, Habilitet, Annet, Datakvalitet
```

**Del III:**
```
RAMMEVERK                           ← Generell info, Prosedyre
KVALIFISERING                       ← Foreløpig kvalifisering, Kvalifikasjon, Utvelgelse
AVVISNING                           ← Formalfeil, Leverandør, Tilbud (+ unormalt lave)
ETTERSENDING, FORHANDLINGER OG DIALOG  ← Ettersending, Forhandlinger, Dialog
TILDELING                           ← Kriterier, Vurdering, Tildeling, Rammeavtale
AVSLUTNING                          ← Markedsdialog, Habilitet, Annet, Datakvalitet
```

**Key differences:**
- Chapter ordering differs (Dialog is chapter 2 in Del II, chapter 4 in Del III)
- Del III adds Foreløpig kvalifikasjonsvurdering (FOA § 17-1)
- Del III splits Ettersending/Forhandlinger/Dialog into three separate sections
- Del III adds "Unormalt lave tilbud" (FOA § 24-9) subsection
- Del II has Meddelelse om tildeling as separate section; Del III merges it into Tildeling
- Del II has three-tier qualification assessment (FOA § 8-10 stages); Del III has one
- Both end with a Datakvalitet section (internal reference, not exported to Word)

### Design Implication

The page renders from a section definition array. Each section definition declares its chapter group, fields, data sources, and visibility condition. Adding Del I later means adding a third array — no new components needed. Chapter labels and section numbering are derived from the active definition, not hardcoded.

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
│         │  │  ☐ Unntak fra elektronisk kommunikasjon               │
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
│         │  │ ┌─ Tipex (floating toolbar) ──────────────────────┐   │
│         │  │ │ Bouvet tildeles kontrakten basert på...         │   │
│         │  │ │                              max-height: 60vh ↕ │   │
│         │  │ └──────────────────────────────────────────────────┘   │
│         │  │  2 847 tegn                                            │
│         │  ...                                                       │
│         │  ──── AVSLUTNING ──────────────────────────────────────   │
│         │  ▸  18  Datakvalitet                          ✓  AUTO     │
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
ANSKAFFELSESPROTOKOLL              section-label style (11px, uppercase, --color-ink-ghost)

IT-rammeavtale konsulenter 2026    headline (20px, --font-ui, weight 700, --color-ink)
Ref: 2026-1795 · Del II            body (13px, --color-ink-secondary)

                            ┌──────────────────────┐
                            │  ↓  Generer .docx     │  primary action button
                            └──────────────────────┘
```

- Section label: same 11px/600/uppercase/`--color-ink-ghost` pattern from system.md
- Title: procurement name from API, same headline style as evaluation page
- Reference + del (II or III): derived from procurement threshold
- Generate button: right-aligned, `--color-vekt` background, `--color-canvas` text, `--radius-sm` radius, weight 600
- Generate button disabled state: `--color-felt-active` background, `--color-ink-muted` text — when completeness < 100% or still loading

---

## Progress Strip

Horizontal bar showing overall document completeness. Lives between header and sections. Scrolls with content — the sticky footer carries persistent progress.

```
┌────────────────────────────────────────────────────────────────┐
│  ███████████████░░░░░░░░  12 av 15 seksjoner                   │
│                           3 mangler begrunnelse                 │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--color-felt` background, `--color-wire` border, `--radius-md` radius, `--spacing-4` padding
- Progress bar: 4px height, `--color-score-high` fill (green) when >80%, `--color-vekt` when 40-80%, `--color-score-low` when <40%
- Fraction: `--font-data`, 13px, `--color-ink` color
- Missing count: 13px, `--color-ink-secondary`, emphasizes what's incomplete
- When 100%: bar fully green, text changes to "Fullstendig — klar for generering" in `--color-score-high`
- **Denominator excludes N/A sections.** If 4 sections are N/A for this procurement, show "12 av 15" — not "12 av 19". Parenthetical "(4 ikke relevant)" in `--color-ink-ghost` if needed for transparency.

---

## Chapter Groupings

Sections are grouped into chapters matching the Word document's heading structure (mirroring the Python generator's output). Chapter labels are non-collapsible visual landmarks — they give the accordion document-level rhythm.

Chapter names are **derived from the section registry** for the active del (II or III). See the Document Variants section above for the per-del chapter structures.

```
──── RAMMEVERK ─────────────────────────────────────────────────
▸  1   Generell informasjon                          ✓  AUTO
─────────────────────────────────────────────────────────────────
▸  2   Prosedyre                                     ◐  DELVIS
──── KVALIFISERING ─────────────────────────────────────────────
▸  3   Kvalifikasjonskrav                            ✓  AUTO
...
```

- Chapter label: 10px, uppercase, weight 600, `--color-ink-ghost`, letter-spacing 0.12em
- Horizontal rule: `--color-wire` border, top and bottom of the label line
- Not collapsible, not interactive — purely structural

---

## Section Accordion

The core of the page. Collapsible sections within chapter groups. Multiple sections can be open simultaneously — the user needs to cross-reference API data between sections (e.g., verifying supplier lists across related sections).

### Section Header Row

```
┌────────────────────────────────────────────────────────────────┐
│  ▸  2   Prosedyre                              ◐  DELVIS      │
└────────────────────────────────────────────────────────────────┘
```

- Container: `--color-felt` background on hover, transparent by default
- **Sticky:** `position: sticky; top: 0; z-index: 10` — stays pinned when scrolling through expanded section content. The collapse chevron remains reachable regardless of how long the section content is.
- Bottom border: `--color-wire` (separator between sections)
- Chevron: `▸` rotates to `▾` when expanded, 10px, `--color-ink-ghost`, transition 150ms
- Section number: `--font-data`, 13px, `--color-ink-muted` — plain ordinal (no § prefix — § is reserved for actual FOA references within section content)
- Section name: `--font-ui`, 13px, weight 500, `--color-ink`
- Status badge (right-aligned):

| Status | Badge | Color |
|--------|-------|-------|
| Complete (all fields filled) | `✓ AUTO` or `✓ OK` | `--color-score-high` text, `--color-score-high-bg` background |
| Partial (some manual fields empty) | `◐ DELVIS` | `--color-vekt` text, `--color-vekt-bg` background |
| Empty (manual fields required, none filled) | `○ MANGLER` | `--color-score-low` text, `--color-score-low-bg` background |
| Not applicable (section hidden for this procurement) | `— N/A` | `--color-ink-ghost` text |

- Badge: pill shape (`--radius-sm`), 10px uppercase, weight 600, letter-spacing 0.06em, padding 2px 8px
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
- Label column: 13px, weight 500, `--color-ink-secondary`, **left-aligned**, 160px fixed width
- Value column: 13px, weight 500, `--color-ink`, `--font-data` for numbers/dates, `--font-ui` for text
- Row: `--spacing-2` vertical padding, `--color-wire` bottom border
- Container: `--color-felt` background, `--color-wire` border, `--radius-sm` radius
- Numbers formatted with Norwegian locale (`Intl.NumberFormat('nb-NO')`)

When data is missing from API: show `—` in `--color-ink-ghost` with a small info tooltip: "Ikke tilgjengelig fra Artifik"

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

- Section label: 11px, uppercase, weight 600, `--color-ink-ghost`, letter-spacing 0.08em
- Supplier items: 13px, `--font-ui`, weight 500, `--color-ink`
- Numbered list: `--font-data` for numbers, `--color-ink-muted`
- Container: same `--color-felt` / `--color-wire` treatment as info tables

### Section Content — Manual Fields

Manual input areas for justifications and assessments the user must write. Six field types used across sections:

#### Short text fields (begrunnelser, one-liners)

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

- Textarea: `--color-canvas` background (inset feel — darker than surrounding `--color-felt`), `--color-wire` border, `--radius-sm` radius
- Focus: `--color-wire-focus` border (amber)
- Placeholder: `--color-ink-ghost`, italic
- Hint text below: 11px, `--color-ink-muted`, not italic
- Character count: 11px, `--color-ink-muted`, `--font-data`, right-aligned on same line as hint (or alone if no hint)
- Min-height: 80px, auto-grows with content (no max-height — short fields)

#### Checkbox with conditional textarea

Used for Del II-specific boolean fields (unntak fra elektronisk kommunikasjon, reservasjon for ideelle organisasjoner) and section-level "Ingen avvist" / "Ingen forhandlinger" checkboxes.

```
┌────────────────────────────────────────────────────────────────┐
│  ☐  Unntak fra elektronisk kommunikasjon, jf. FOA § 10-5      │
│                                                                │
│  (textarea appears only when checked:)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Begrunnelse for unntak...                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Begrunn hvorfor elektronisk kommunikasjon ikke benyttes.      │
└────────────────────────────────────────────────────────────────┘
```

- Checkbox: 16×16px, `--color-wire-strong` border, `--radius-sm`. Checked: `--color-vekt` fill, `✓` in `--color-canvas`
- Label: 13px, weight 500, `--color-ink`, inline with checkbox. FOA reference in `--color-ink-muted`
- Conditional textarea: slides in with `transition:slide` (200ms) when checkbox is checked
- Textarea: same `--color-canvas` inset pattern as short text fields
- Completeness: checkbox alone = complete (if unchecked, no begrunnelse needed). Checkbox checked + empty textarea = incomplete.

#### Rich text fields (Tipex)

Used for three fields: **utvelgelsesbegrunnelse** (section 9), **forhandlinger/dialog** (section 12), and **tildelingsbegrunnelse** (section 14).

```
┌────────────────────────────────────────────────────────────────┐
│  TILDELINGSBEGRUNNELSE                       section-label     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
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

- Uses Tipex (`@friendofsvelte/tipex`) with **standard floating toolbar** — toolbar appears near cursor/selection, not pinned to top. This is Tipex's default `floating focal` mode.
- Tipex editor container: `--color-canvas` background, `--color-wire` border, `--radius-sm` radius
- Tipex CSS variables overridden in `@theme` to match design system (surface colors, accent colors)
- Editor area: `--spacing-4` padding, min-height 200px, **max-height 60vh, overflow-y auto** (internal scroll when content exceeds ~1.5 A4 pages)
- Editor text: `--font-ui`, 14px (slightly larger for writing comfort), `--color-ink`, line-height 1.6
- Focus: entire container border → `--color-wire-focus`
- Character count below: 11px, `--color-ink-muted`, `--font-data`
- Extensions: CharacterCount (for tegn count), Placeholder

**Word export mapping** (applies to all Tipex fields):

| Formatting | Word mapping | Use case |
|------------|-------------|----------|
| Bold | Bold run | Emphasis, supplier names |
| Italic | Italic run | Terms, document names |
| Underline | Underline run | Legal emphasis convention |
| H2, H3 | Heading 2, 3 styles | Structuring long begrunnelse by criterion |
| Bullet list | Bullet list | Listing evaluation points |
| Numbered list | Numbered list | Sequential arguments |
| Blockquote | Indented paragraph | Quoting from tilbud or FOA text |

#### Per-supplier text fields

When a section requires plain-text justification per supplier (kvalifikasjonsvurdering, avvisningsbegrunnelse):

```
┌────────────────────────────────────────────────────────────────┐
│  KVALIFIKASJONSVURDERING PER LEVERANDØR      section-label     │
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

- Supplier card: `--color-felt` background, `--color-wire` border, `--radius-sm` radius, `--spacing-4` padding
- Supplier name: 13px, weight 600, `--color-ink`, with left border 3px `--color-vekt` (weight spine, consistent with matrix identity)
- Gap between cards: `--spacing-3`
- Textarea inside: same `--color-canvas` inset treatment
- Character count: 11px, `--color-ink-muted`, `--font-data`, below each textarea
- Cards with empty textarea: faded left border (15% amber — sub-criterion pattern from matrix)
- Cards with filled textarea: solid left border (amber — group-row pattern)

#### Per-supplier rich text fields (Tipex)

Used for **utvelgelsesbegrunnelse** (section 9) where each supplier needs a structured justification. Same supplier-card layout as above, but with Tipex instead of plain textarea:

- Tipex inside supplier card: same `--color-canvas` container, `floating focal` toolbar
- Min-height: 120px (smaller than standalone Tipex — multiple editors on screen simultaneously)
- Max-height: 40vh (tighter than standalone — prevents one supplier card from dominating)
- All other Tipex patterns apply (character count, focus, Word export)

#### Avvisningsbegrunnelse with category selector

Used for rejection sections (Avvisning formalfeil, Avvisning leverandør, Avvisning tilbud). The Python generator needs the FOA reference per rejection, not just a text justification.

```
┌────────────────────────────────────────────────────────────────┐
│  AVVISNING PER LEVERANDØR                    section-label     │
│                                                                │
│  ┌─ Konsulentfirma AS ──────────────────────────────────────┐ │
│  │  HJEMMEL                                                  │ │
│  │  ○ § 9-4 / § 24-1 Formalfeil                             │ │
│  │  ● § 9-5 / § 24-2 Kvalifikasjonssvikt                    │ │
│  │  ○ § 9-6 / § 24-8 Avvisning av tilbud                    │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Leverandøren oppfyller ikke krav til erfaring...    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │  186 tegn                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

- Radio group: `--font-ui`, 13px, weight 500. FOA references in `--font-data`, `--color-ink-muted`
- Radio indicator: 14px circle, `--color-wire-strong` border. Selected: `--color-vekt` fill with inset ring (same pattern as AggregationStrip in evaluation)
- The displayed FOA references adapt to del: Del II shows §§ 9-4/9-5/9-6, Del III shows §§ 24-1/24-2/24-8
- Textarea below: same `--color-canvas` inset pattern
- Completeness: requires both category selection AND text justification

---

## Datakvalitet Section

The final section in both Del II and Del III. An auto-generated internal reference showing which sections were populated from API, eForms, or manual input. Not exported to the Word document — purely a transparency aid for the innkjøper.

```
┌────────────────────────────────────────────────────────────────┐
│  DATAKVALITET — API VS. MANUELT              section-label     │
│                                                                │
│  Seksjon                   │  Kilde                            │
│  ─────────────────────────┼──────────────────────────────      │
│  Generell informasjon      │  ● Artifik API                    │
│  Prosedyre                 │  ● Artifik API  ◐ Manuelt         │
│  Kvalifikasjonskrav        │  ● Doffin eForms                  │
│  Tildelingskriterier       │  ● Doffin eForms                  │
│  Leverandører med tilbud   │  ● Artifik API                    │
│  Tildelingsbegrunnelse     │  ◐ Manuelt                        │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

- Auto-generated from section registry metadata (no user input)
- Source indicators: `●` = full, `◐` = partial, colored by source type
  - Artifik API: `--color-score-high` (green)
  - Doffin eForms: `--color-vekt` (amber)
  - Manuelt: `--color-ink-secondary` (neutral)
- Status: always `✓ AUTO`
- Not included in progress denominator (it's meta-information, not a user task)

---

## Sticky Footer

Always visible at bottom of viewport. Spans full workspace width (it's chrome, not content). Inner content centers to match 800px column.

```
┌────────────────────────────────────────────────────────────────┐
│  ██████░░░  12/15 · 3 mangler      Lukk alle   Generer .docx ↓│
└────────────────────────────────────────────────────────────────┘
```

- Container: `--color-felt` background, `--color-wire` top border, `position: sticky; bottom: 0`
- Inner content: `max-width: 800px; margin: 0 auto` — aligns with page column
- Padding: `--spacing-3` vertical, `--spacing-4` horizontal
- Left: compact progress bar (3px height, 80px width) + fraction (`--font-data`, 12px) + missing count (`--color-ink-secondary`, 12px)
- Center: "Lukk alle" ghost button — `--color-wire` border, `--color-ink-secondary` text, 12px. Collapses all open sections. Only visible when ≥2 sections are expanded.
- Right: generate button (same as header — `--color-vekt` bg, `--color-canvas` text)
- When all sections complete: progress text → "Klar" in `--color-score-high`, progress bar fully green
- Generating state: button shows spinner + "Genererer..." in `--color-ink-muted`, disabled
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

- Search input: same combobox pattern as evaluation setup page (Picker component). SVG search icon (16×16, `--color-ink-ghost` stroke) — no emoji.
- Results: `--color-felt` rows, hover → `--color-felt-hover`, `--color-wire` separator
- Procurement name: 13px, weight 500, `--color-ink`
- Reference number: `--font-data`, `--color-ink-muted`, right-aligned
- On select: fetches procurement data + activities, transitions to form view
- Loading state: skeleton lines in `--color-felt-active` with subtle pulse animation

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

- Chapter labels and section numbers shown immediately (they're static, derived from section registry)
- Content areas show skeleton lines: `--color-felt-active` background, `--radius-sm` radius, 12px height, fixed widths matching expected content proportions (label: 160px, value: ~200px), pulse animation
- Progress strip shows "Henter data fra Artifik..." in `--color-ink-muted`

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

- Warning container: `--color-vekt-bg` background, `--color-vekt` left border (3px), `--radius-sm` radius
- Icon + text: 13px, `--color-vekt-dim`
- Retry button: ghost style, `--color-wire` border, `--color-ink-secondary` text

**eForms not available:**

Not an error — many procurements lack eForms data. Show inline note:

```
eForms-data ikke tilgjengelig for denne kunngjøringen.
Kvalifikasjonskrav og tildelingskriterier fylles ut manuelt.
```

- 12px, `--color-ink-muted`, italic
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
3. POST to `/api/protokoll/generate` with merged data (includes `del` indicator for backend)
4. On success: browser downloads .docx blob
5. On error: toast/inline error below button

---

## Data Source Clarifications

### What auto-fills from which API

| Source | Data |
|--------|------|
| **Artifik API** (procurement + activities) | Procurement metadata, supplier lists (SUBMIT_BID, REJECT_PARTICIPATION, QUALIFYING_PARTICIPANTS, AWARDING_PARTICIPANTS), conversation events, dates |
| **Doffin eForms** (when available) | Award criteria + weights, selection criteria, contract nature, framework agreement details |
| **Manual** (always) | All begrunnelse fields, kvalifikasjonsvurderinger, inhabilitet, underleverandører, avvisningskategorier |

**Important:** Evaluation scores (from the evaluation matrix) are **not** auto-filled into the protocol. The Artifik API provides award participant names and contract values, but not evaluation scores. Section 14 (Valgt tilbud + begrunnelse) auto-fills the winner name and contract value from the API; the tildelingsbegrunnelse is always manual. Section 14's default status is ◐ DELVIS (auto-filled metadata + empty manual begrunnelse).

---

## Responsive Behavior

- Max-width container (800px) centers on wide screens — document-width
- Below 768px: label/value tables stack vertically (label above value)
- Below 768px: page header stacks (title above button)
- Sidebar collapses per shared app behavior
- Tipex floating toolbar adapts to viewport naturally
- Sticky footer: progress bar and fraction hide below 480px, only button + status text remain

---

## Accessibility

- Section headers: `<button>` with `aria-expanded`, `aria-controls` pointing to content panel
- Content panels: `role="region"`, `aria-labelledby` pointing to header
- Status badges: `aria-label` with full status text (e.g., "Seksjon 2, Prosedyre, delvis utfylt")
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Tipex editor: `aria-label` matching field name, inherits TipTap's ARIA support
- Checkboxes: native `<input type="checkbox">` with `<label>` — no custom ARIA needed
- Radio groups (avvisningskategori): `role="radiogroup"` with `role="radio"` + `aria-checked`
- Generate button: `aria-disabled` when incomplete + `title` explaining why
- Keyboard: Enter/Space toggles sections, Tab moves between sections, focus-visible with `--color-wire-focus`
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
