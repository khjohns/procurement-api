# Design System — Anskaffelser

## Direction: "Analysebordet"

Dense, number-forward evaluation workspace. Inspired by financial analysis tools.
Authoritative, precise, data-dense. The evaluation matrix IS the interface.

**Feel:** Like a financial analyst's desk — numbers are the primary content, everything serves the numbers.
**Not:** Warm, friendly, spacious. This is analytical tooling.

---

## Tokens

### Surfaces (cool dark blues)

```
--canvas: #0c0e14          /* workspace background */
--felt: #12151e             /* cards, panels — barely lifted */
--felt-raised: #181c28      /* elevated: dropdowns, popovers */
--felt-hover: #1e2233       /* hover state */
--felt-active: #242840      /* pressed/active state */
```

### Ink (text hierarchy)

```
--ink: #e2e5ef              /* primary text */
--ink-secondary: #8890a4    /* supporting text, labels */
--ink-muted: #505568        /* metadata, less important */
--ink-ghost: #353a4d        /* disabled, placeholder */
```

### Wire (borders)

```
--wire: rgba(255, 255, 255, 0.06)       /* standard separation */
--wire-strong: rgba(255, 255, 255, 0.10) /* emphasis, group dividers */
--wire-focus: rgba(232, 168, 56, 0.35)   /* focus rings */
```

### Vekt (weight accent — amber)

```
--vekt: #e8a838                         /* primary weight color */
--vekt-dim: #c49030                     /* secondary weight */
--vekt-bg: rgba(232, 168, 56, 0.08)    /* weight row tint */
--vekt-bg-strong: rgba(232, 168, 56, 0.14) /* weight emphasis */
```

### Score Semantics

```
--høy: #3d9a6e                          /* high scores (7+) */
--høy-bg: rgba(61, 154, 110, 0.10)     /* high score background */
--midt: #8890a4                         /* mid scores (4-6) */
--lav: #c45858                          /* low scores (≤3) */
--lav-bg: rgba(196, 88, 88, 0.10)      /* low score background */
```

---

## Typography

```
--font-data: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

- **Numbers/scores/percentages:** Always `--font-data` with `font-variant-numeric: tabular-nums`
- **Headlines:** `--font-ui`, 20px, weight 700, tracking -0.025em
- **Body/labels:** `--font-ui`, 13px, weight 500
- **Section labels:** 11px, weight 600, uppercase, tracking 0.08em, color `--ink-ghost`
- **Data values:** `--font-data`, 13px, weight 500

---

## Spacing

Base unit: **4px**

```
--sp-1: 4px      /* micro: icon gaps */
--sp-2: 8px      /* tight: element pairs */
--sp-3: 12px     /* component: cell padding */
--sp-4: 16px     /* card padding */
--sp-5: 20px     /* generous card padding */
--sp-6: 24px     /* section gaps */
--sp-8: 32px     /* workspace padding, major separation */
--sp-12: 48px    /* page bottom padding */
```

---

## Radius

Technical, not friendly:

```
--r-sm: 4px      /* inputs, buttons, score segments */
--r-md: 6px      /* small cards, badges */
--r-lg: 8px      /* major containers, matrix wrap */
```

---

## Depth Strategy

**Borders-only.** No shadows. Dark mode + dense data = borders define structure quietly.

- Group rows: `border-left: 3px solid var(--vekt)` (weight spine)
- Sub-rows: `border-left: 3px solid rgba(232, 168, 56, 0.15)` (faded spine)
- Separators: `1px solid var(--wire)` standard, `var(--wire-strong)` for group dividers
- Annotation panel: `border-left: 3px solid var(--vekt)` (connects to spine)

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

- Background: `var(--vekt-bg)` (amber tint)
- Left border: solid amber (weight spine)
- Score values: 14px, weight 700, one decimal
- Criteria name: weight 600

### Sub-criterion Rows

- Background: transparent, hover → `var(--felt-hover)`
- Left border: faded amber
- Criteria name: indented (padding-left: 32px), with `::before` dash
- Score values: integer, weight 500

### Score Cells

- Font: `--font-data`, centered, tabular-nums
- Color coding: `.score-high` (green), `.score-mid` (neutral), `.score-low` (rose)
- Best in row: `.score-best` → green background + bold
- Has notes: `.has-notes` → 5px amber dot, top-right corner

### Annotation Panel

- Full-width row below the scored row
- Shows: context (supplier › criterion), score selector (0-10 segments), textarea
- Score segments: 30×32px buttons, filled state = green, active = solid green
- Textarea: `var(--felt)` background, wire border, focus → amber wire

### Ranking Cards

- Flex row, equal width cards
- Shows: rank position, supplier name, total score (28px monospace), score bar
- #1 card: amber-tinted border + gradient background, "Anbefalt" badge

### Total Row

- Background: `var(--canvas)` (darker than matrix)
- Score: 18px, weight 700
- Best score: amber color + amber background

### Progress Indicators

- Compact flex row below matrix
- Label + fraction value (monospace) + thin bar (3px height, 80px width)
- Complete: green fill. Partial: amber fill.

---

## Navigation

Sidebar (228px) with same canvas background, border-separated:
- Brand icon + text at top
- Nav items: 13px, weight 500, subtle hover
- Active item: amber background tint + amber text
- User footer: avatar circle + name + organization

### Method Toggle

- Segmented control: `--felt` background, `--wire` border, `--r-md` radius
- Buttons: 12px, weight 500, `--ink-secondary`
- Active: `--vekt-bg-strong` background, `--vekt` text, weight 600
- Placed between header and ranking strip

### Config Strip (Prismodell)

- Horizontal flex row, `--felt` surface, `--wire` border, `--r-md` radius
- Labels: 11px, weight 500, `--ink-muted`
- Inputs: `--canvas` background (inset feel), `--font-data`, right-aligned
- Shows kontraktsverdi + per-supplier prices
- Hidden by default, visible when prismodell active

### Prismodell Matrix

- Same matrix structure as poengmodell
- Weight column → "Maks fradrag" in kr (monospace, 11px)
- Supplier columns → "Fradrag" in kr with `+` prefix on group rows
- Color coding: `.fradrag-low` (green), `.fradrag-mid` (neutral), `.fradrag-high` (rose), `.fradrag-best` (green bg)
- Bottom rows: Tilbudt pris → Sum kvalitetsfradrag → Evaluert pris
- Result row: 16px, weight 700, best = amber

### Innsikt Panel

- Collapsible section below matrix, toggle arrow rotates on collapse
- Three tabs: Betalingsvilje, Robusthet, Metodekontroll
- Tabs: flex row, `--wire` bottom border, active = `--vekt` text + amber bottom border (2px)
- Content panes: `--sp-5` padding

**Betalingsvilje tab:**
- Data table (`.bv-table`) with criterion, weight, implisitt maks fradrag, per-poeng value
- Sub-criteria indented with `::before` dash (mirrors matrix pattern)
- Summary card: `--vekt-bg` background, `--vekt` left border (3px), highlights in amber monospace

**Robusthet tab:**
- Ranking items: `--felt-raised` background, `--wire` border, leader = amber border
- Insight cards: `--felt-raised` surface, `--vekt` left border (3px), section label + text
- Key data in `.mono` spans (amber, monospace)

**Metodekontroll tab:**
- Side-by-side grid (2 columns) comparing poengmodell vs prismodell rankings
- Each column: `--felt-raised`, `--wire` border, `--r-md` radius
- Verdict bar: `.match` (green bg) or `.mismatch` (rose bg) with icon + text

---

## View Switching

- `.view-poeng` and `.view-pris` containers toggle via `.active` class
- Both share the same matrix CSS patterns, different data columns
- Method toggle drives visibility of views and config strip

---

## States

- **Hover (rows):** `var(--felt-hover)` background
- **Hover (score cells):** same + cursor pointer
- **Focus (inputs):** `border-color: var(--wire-focus)` (amber)
- **Active (score segment):** solid green background
- **Active (method btn):** amber background tint + amber text
- **Active (innsikt tab):** amber text + amber bottom border
- **Collapsed (innsikt):** toggle icon rotates -90deg, body hidden
- **Status badge:** pill with pulsing dot, amber background
