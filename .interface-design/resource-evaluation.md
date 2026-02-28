# Item-Level Evaluation — Design Specification

## Problem

The current evaluation matrix operates on two dimensions:

```
SubCriterion × Supplier → Score (0–10)
```

This is sufficient when a sub-criterion maps to a single qualitative judgement per supplier
(e.g. "Gjennomføringsplan" → one score). But several evaluation scenarios require
scoring **individual items** that a supplier offers, each on **multiple dimensions**:

| Criterion | Items per supplier | Dimensions |
|---|---|---|
| Tilbudt personell | 2–6 named consultants | Erfaring, utdanning, sertifiseringer, rolleforståelse |
| Referanseprosjekter | 2–5 reference projects | Relevans, størrelse, resultat, kundetilfredshet |
| Teknisk løsning | N solution components | Innovasjon, modenhet, skalerbarhet |
| Miljøtiltak | N measures | Effekt, gjennomførbarhet, dokumentasjon |

This adds a third dimension:

```
SubCriterion × Supplier × Item → Score per ItemCriterion
```

The design must support this **without breaking** the existing matrix pattern.

---

## Principle: Aggregation Transparency

Every score visible in the main matrix must be **derivable** — users should never
manually enter a "summary score" when item-level detail exists. The system computes
upward:

```
ItemCriterion scores → Item score (weighted avg) → SubCriterion score (avg of items) → Criterion score → Total
```

The main matrix always shows the aggregated result. Detail is accessed by drill-down.

---

## Data Model Extension

### New types

```typescript
/** A dimension on which individual items are scored. */
interface ItemCriterion {
  id: string;
  name: string;
  weight: number;          // Weight within item evaluation, sums to 100
}

/** A single evaluable item offered by one supplier. */
interface EvaluationItem {
  id: string;
  name: string;
  label?: string;          // Role, type, category — contextual metadata
  scores: Record<string, number>;   // itemCriterionId → score (0–10)
  notes: Record<string, string>;    // itemCriterionId → justification
}
```

### Extended SubCriterion

```typescript
interface SubCriterion {
  id: string;
  name: string;
  weight: number;

  // === Existing (simple evaluation) ===
  scores: Record<string, number>;     // supplierId → score
  notes: Record<string, string>;      // supplierId → note

  // === New (item-level evaluation, optional) ===
  evaluationType?: 'simple' | 'item';
  itemLabel?: string;                  // "Ressurs", "Prosjekt", "Tiltak" — UI label
  itemCriteria?: ItemCriterion[];
  items?: Record<string, EvaluationItem[]>;  // supplierId → items
  aggregation?: AggregationMethod;
}

type AggregationMethod = 'average' | 'weighted' | 'best-n' | 'minimum';
```

When `evaluationType === 'item'`:
- `scores[supplierId]` is **derived** (computed from item scores), not user-entered.
- `notes[supplierId]` remains available for an overarching justification.
- `items[supplierId]` contains the supplier's offered items with per-dimension scores.

When `evaluationType` is absent or `'simple'`:
- Behaviour is identical to the current system. No migration needed.

### Why on SubCriterion (not Criterion)?

Item-level evaluation applies at the sub-criterion level because:
1. Weight accounting stays clean — one sub-criterion, one weight, one derived score.
2. A criterion like "Kompetanse" may have some sub-criteria that are simple
   (e.g. "Forståelse av oppdraget") and some that are item-evaluated
   (e.g. "Tilbudt personell"). Mixing is natural.
3. The main matrix row structure doesn't change — item detail is accessed via expansion.

---

## Score Computation

### Per item (weighted average of item-criteria)

```typescript
function itemScore(item: EvaluationItem, criteria: ItemCriterion[]): number {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = criteria.reduce(
    (acc, c) => acc + (item.scores[c.id] ?? 0) * c.weight, 0
  );
  return sum / totalWeight;
}
```

### Per supplier (aggregate items → sub-criterion score)

```typescript
function supplierItemScore(
  items: EvaluationItem[],
  criteria: ItemCriterion[],
  method: AggregationMethod
): number {
  if (items.length === 0) return 0;
  const scores = items.map(item => itemScore(item, criteria));

  switch (method) {
    case 'average':
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    case 'weighted':
      // Future: per-item weight (e.g. prosjektleder counts double)
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    case 'minimum':
      return Math.min(...scores);
    case 'best-n':
      // Take best N items (N configurable, default: all)
      return scores.sort((a, b) => b - a)
        .slice(0, scores.length)
        .reduce((a, b) => a + b, 0) / scores.length;
  }
}
```

### Integration with existing cascading $derived

In the EvaluationStore, the existing `groupScores` and `totals` computations
continue to read `sub.scores[supplierId]`. For item-evaluated sub-criteria,
a new `$derived` block pre-computes these scores:

```typescript
/** Derived item-level scores → populates sub.scores for item-evaluated subcriteria. */
itemDerivedScores = $derived.by(() => {
  for (const criterion of this.data.criteria) {
    for (const sub of criterion.subcriteria) {
      if (sub.evaluationType !== 'item' || !sub.items || !sub.itemCriteria) continue;
      for (const supplier of this.data.suppliers) {
        const supplierItems = sub.items[supplier.id] ?? [];
        sub.scores[supplier.id] = supplierItemScore(
          supplierItems, sub.itemCriteria, sub.aggregation ?? 'average'
        );
      }
    }
  }
});
```

All downstream `$derived` (groupScores, totals, ranking, priceDeductions) work unchanged.

---

## Component Design

### Main Matrix — Visual Indicator

When a sub-criterion has `evaluationType: 'item'`, the score cell in the main
matrix gains a **drill-down indicator**:

```
┌──────────┐
│   7.8  ▾ │   ← small chevron indicates expandable detail
│     ●    │   ← amber dot (notes exist), as current
└──────────┘
```

The chevron replaces the click-to-annotate behaviour: clicking opens the
`ItemEvaluationPanel` instead of the simple `AnnotationPanel`.

### ItemEvaluationPanel

Replaces the AnnotationPanel for item-evaluated sub-criteria. Renders as a
full-width `<tr>` below the sub-criterion row (same pattern as AnnotationPanel).

```
┌──────────────────────────────────────────────────────────────────────┐
│ ─── Bouvet ASA › Tilbudt personell ──────────────────────────────── │
│                                                                      │
│  AGGREGERING    ◉ Snitt  ○ Minimum  ○ Beste N         Resultat 7.8  │
│                                                                      │
│  ┌───────────────────┬───────────┬───────────┬───────────┬────────┐  │
│  │ RESSURS           │ ERFARING  │ UTDANNING │ SERTIF.   │ SNITT  │  │
│  │                   │    40%    │    30%    │    30%    │        │  │
│  ├───────────────────┼───────────┼───────────┼───────────┼────────┤  │
│  │ Kari N. — PL      │    ❽     │    ❼     │    ❾     │  8.1   │  │
│  │ Ola H. — Utvikler │    ❼     │    ❽     │    ❻     │  7.0   │  │
│  │ Eva S. — Arkitekt │    ❾     │    ❽     │    ❽     │  8.4   │  │
│  ├───────────────────┼───────────┼───────────┼───────────┼────────┤  │
│  │ SNITT             │   8.0     │   7.7     │   7.7     │  7.8   │  │
│  └───────────────────┴───────────┴───────────┴───────────┴────────┘  │
│                                                                      │
│  [+ Legg til ressurs]                                                │
│                                                                      │
│  BEGRUNNELSE                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Bouvet tilbyr et sterkt team med komplementær kompetanse.   │    │
│  │ Prosjektleder har særlig sterk sertifisering...             │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  423 tegn                                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Details

**Context bar** (top):
- Breadcrumb: `SupplierName › SubCriterionName`
- Same style as AnnotationPanel: 11px, supplier bold, separator ghost

**Aggregation strip**:
- Horizontal row, `--felt` background, `--wire` border, `--r-sm` radius
- Radio-style segments for aggregation method
- Right-aligned result score in `--font-data`, 16px, weight 700, tier-colored

**Item table**:
- Dense table inside the panel, `--felt` background, `--wire` borders
- Fixed column widths: item name (flex), criteria columns (80px each), average (72px)
- Header row: criterion name (11px uppercase) + weight in `--vekt-dim`
- Score cells: `--font-data`, 13px, centered, tier-colored
- Score cells are **editable** — click to reveal inline score selector
- Average column: `--font-data`, 13px, weight 600, tier-colored, computed

**Item name column**:
- Name: 13px, weight 500, `--ink`
- Label (role): after em-dash, `--ink-muted`
- Hover: `--felt-hover` background on entire row

**Footer row** (SNITT):
- Background: `--canvas` (slightly darker than table body)
- Scores: weight 600, computed column averages
- Final cell (bottom-right): weight 700, this is the value shown in the main matrix

**Add item button**:
- Text button: `+ Legg til ressurs` (uses `sub.itemLabel` for the noun)
- Style: 12px, `--ink-muted`, hover → `--vekt`
- Opens inline row with name input + role input

**Notes area**:
- Identical to current AnnotationPanel textarea
- Label: "BEGRUNNELSE" (section label style)
- Serves as overarching justification for the item-level scores

### Inline Score Editing

Each score cell in the item table uses a **compact score input** (not the full
11-segment selector — too wide for the dense table):

**Default state:** Number display, tier-colored, clickable
```
  ❽       ← filled circle with number, --font-data, centered
```

**Edit state (on click):** Small popover with mini-segment selector
```
  ┌─────────────────────────────────┐
  │ 0 1 2 3 4 5 6 7 8 9 10         │   ← 22×26px segments (compact)
  └─────────────────────────────────┘
```

The popover appears below the cell, auto-closes on selection.
Alternatively, keyboard input: click cell → type number → Enter/Tab to advance.

### Per-Item Notes (Optional Expansion)

Each item row can expand to show per-criterion notes:

```
  │ Kari N. — PL      │    ❽     │    ❼     │    ❾     │  8.1   │
  │  └─ Erfaring: Dokumentert 8 års erfaring med...                │
  │  └─ Sertif.: PMP-sertifisert siden 2019, PRINCE2...           │
```

This is triggered by clicking the item name. The notes appear as indented
sub-rows below the item, one per criterion that has a note.

---

## Generalization Pattern

The system should NOT hardcode "personnel" or "resources". The `itemLabel` field
on SubCriterion controls the UI vocabulary:

| itemLabel | "Add" button | Table header | Context |
|---|---|---|---|
| `"Ressurs"` | + Legg til ressurs | RESSURS | Personnel evaluation |
| `"Prosjekt"` | + Legg til prosjekt | PROSJEKT | Reference projects |
| `"Tiltak"` | + Legg til tiltak | TILTAK | Environmental measures |
| `"Komponent"` | + Legg til komponent | KOMPONENT | Solution components |

The `label` field on each EvaluationItem provides the secondary descriptor:
- Resources: role ("Prosjektleder", "Utvikler")
- Projects: client ("Bergen kommune", "Helse Vest")
- Measures: category ("Transport", "Energi")

No other UI changes needed — the component is fully generic.

---

## Mock Data Example

```typescript
{
  id: 'personell',
  name: 'Tilbudt personell',
  weight: 20,
  evaluationType: 'item',
  itemLabel: 'Ressurs',
  aggregation: 'average',
  itemCriteria: [
    { id: 'erfaring', name: 'Relevant erfaring', weight: 40 },
    { id: 'utdanning', name: 'Utdanning og fagkompetanse', weight: 30 },
    { id: 'sertifisering', name: 'Sertifiseringer', weight: 30 }
  ],
  items: {
    bouvet: [
      {
        id: 'b1', name: 'Kari Nordmann', label: 'Prosjektleder',
        scores: { erfaring: 8, utdanning: 7, sertifisering: 9 },
        notes: { erfaring: 'Dokumentert 8 års erfaring fra tilsvarende prosjekter.' }
      },
      {
        id: 'b2', name: 'Ola Hansen', label: 'Seniorutvikler',
        scores: { erfaring: 7, utdanning: 8, sertifisering: 6 },
        notes: {}
      },
      {
        id: 'b3', name: 'Eva Solberg', label: 'Løsningsarkitekt',
        scores: { erfaring: 9, utdanning: 8, sertifisering: 8 },
        notes: {}
      }
    ],
    sopra: [
      {
        id: 's1', name: 'Lars Eriksen', label: 'Prosjektleder',
        scores: { erfaring: 7, utdanning: 8, sertifisering: 7 },
        notes: {}
      },
      {
        id: 's2', name: 'Maria Johansen', label: 'Utvikler',
        scores: { erfaring: 7, utdanning: 7, sertifisering: 8 },
        notes: {}
      }
    ],
    knowit: [
      {
        id: 'k1', name: 'Anders Berg', label: 'Prosjektleder',
        scores: { erfaring: 9, utdanning: 9, sertifisering: 9 },
        notes: {}
      },
      {
        id: 'k2', name: 'Ingrid Dahl', label: 'Seniorutvikler',
        scores: { erfaring: 8, utdanning: 8, sertifisering: 9 },
        notes: {}
      },
      {
        id: 'k3', name: 'Thomas Lie', label: 'Arkitekt',
        scores: { erfaring: 8, utdanning: 9, sertifisering: 7 },
        notes: {}
      }
    ]
  },
  // Derived — computed, not entered:
  scores: { bouvet: 7.8, sopra: 7.2, knowit: 8.5 },
  notes: {}
}
```

---

## Component Hierarchy

```
EvaluationMatrix.svelte
  └── (for each sub-criterion row)
        ├── ScoreCell.svelte                    (evaluationType: 'simple')
        │     └── AnnotationPanel.svelte        (on click)
        │
        └── ScoreCell.svelte [variant: drilldown] (evaluationType: 'item')
              └── ItemEvaluationPanel.svelte     (on click)
                    ├── AggregationStrip.svelte
                    ├── ItemTable.svelte
                    │     ├── ItemRow.svelte
                    │     │     ├── ItemScoreCell.svelte   (compact inline edit)
                    │     │     └── ItemNotes.svelte        (expandable per-item)
                    │     └── ItemTotalRow.svelte
                    ├── AddItemRow.svelte
                    └── AnnotationNotes.svelte    (overarching justification)
```

### New components

| Component | Responsibility |
|---|---|
| `ItemEvaluationPanel.svelte` | Full-width expansion panel for item-level scoring. Replaces AnnotationPanel for item-evaluated sub-criteria. |
| `ItemTable.svelte` | Dense table: rows = items, columns = item-criteria + average. |
| `ItemRow.svelte` | Single item row with inline-editable score cells. |
| `ItemScoreCell.svelte` | Compact score display + popover edit (0–10). |
| `ItemTotalRow.svelte` | Footer row with column averages and final aggregated score. |
| `AggregationStrip.svelte` | Radio toggle for aggregation method + result display. |
| `AddItemRow.svelte` | Inline form to add a new item (name + label). |

---

## Store Integration

### New methods on EvaluationStore

```typescript
/** Set a score for a specific item on a specific item-criterion. */
setItemScore(subCriterionId: string, supplierId: string,
             itemId: string, itemCriterionId: string, value: number): void;

/** Set a note for a specific item on a specific item-criterion. */
setItemNote(subCriterionId: string, supplierId: string,
            itemId: string, itemCriterionId: string, text: string): void;

/** Add an item to a supplier's list for a sub-criterion. */
addItem(subCriterionId: string, supplierId: string,
        name: string, label?: string): void;

/** Remove an item. */
removeItem(subCriterionId: string, supplierId: string, itemId: string): void;

/** Change aggregation method. */
setAggregation(subCriterionId: string, method: AggregationMethod): void;
```

### New $derived block

```typescript
/** Item-level progress tracking (separate from simple scores). */
itemProgress = $derived.by(() => {
  let totalCells = 0;
  let filledCells = 0;

  for (const criterion of this.data.criteria) {
    for (const sub of criterion.subcriteria) {
      if (sub.evaluationType !== 'item' || !sub.items || !sub.itemCriteria) continue;
      for (const supplier of this.data.suppliers) {
        const items = sub.items[supplier.id] ?? [];
        for (const item of items) {
          for (const ic of sub.itemCriteria) {
            totalCells++;
            if (item.scores[ic.id] !== undefined) filledCells++;
          }
        }
      }
    }
  }

  return { filled: filledCells, total: totalCells };
});
```

---

## Styling

All new components follow the existing design system tokens. Key specifics:

**ItemTable**:
```css
.item-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--felt);
  border: 1px solid var(--wire);
  border-radius: var(--r-sm);
}

.item-table th {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-ghost);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--wire);
}

.item-table .col-weight {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--vekt-dim);
}
```

**ItemScoreCell** (compact variant):
```css
.item-score {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: var(--sp-2);
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: background 0.1s;
  min-width: 36px;
}

.item-score:hover {
  background: var(--felt-hover);
}

/* Tier colors — same as main matrix */
.item-score.tier-high { color: var(--score-high); }
.item-score.tier-mid  { color: var(--ink-secondary); }
.item-score.tier-low  { color: var(--score-low); }
```

**AggregationStrip**:
```css
.aggregation-strip {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  background: var(--felt);
  border: 1px solid var(--wire);
  border-radius: var(--r-sm);
  margin-bottom: var(--sp-4);
}

.agg-option {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: 12px;
  color: var(--ink-secondary);
  cursor: pointer;
}

.agg-option.active {
  color: var(--vekt);
  font-weight: 600;
}

.agg-result {
  margin-left: auto;
  font-family: var(--font-data);
  font-size: 16px;
  font-weight: 700;
}
```

**Drill-down chevron** (on main matrix ScoreCell):
```css
.score-drilldown::after {
  content: '▾';
  font-size: 8px;
  color: var(--ink-ghost);
  margin-left: 2px;
  transition: transform 0.15s;
}

.score-drilldown.expanded::after {
  transform: rotate(180deg);
}
```

---

## Edge Cases

### Variable item count per supplier

Suppliers may offer different numbers of items. The UI handles this naturally —
each supplier gets their own ItemEvaluationPanel when their score cell is clicked.
The main matrix shows per-supplier aggregated scores regardless of item count.

### Zero items

If a supplier has no items registered yet, the panel shows:
```
  Ingen ressurser registrert.
  [+ Legg til ressurs]
```
The derived score defaults to 0.

### Score override

Users **cannot** manually override the derived score for item-evaluated sub-criteria.
This ensures auditability: every score in the protocol is traceable to specific
item-level assessments. The overarching notes field provides space for qualitative
justification.

### Backward compatibility

Existing sub-criteria without `evaluationType` default to `'simple'`.
No data migration needed — the extension is purely additive.

### Price model integration

Item-evaluated sub-criteria participate in the price model identically to simple
sub-criteria. The derived `scores[supplierId]` value flows into `priceDeductions`
unchanged.

### Maximum items

Soft limit of 10 items per supplier per sub-criterion. Beyond this, the panel
scrolls vertically. A hard limit is not enforced — evaluation complexity is the
user's domain decision.

---

## Keyboard Navigation

The item table supports keyboard navigation for efficient scoring:

- **Tab**: Move to next score cell (left→right, then next row)
- **Shift+Tab**: Move to previous score cell
- **0–9**: Enter score directly (single digit)
- **1 then 0**: Enter score 10 (brief delay before committing single-digit)
- **Enter**: Confirm and move down
- **Escape**: Cancel edit, revert to display mode

---

## Analysis & Differentiation

The scoring table shows *what* was scored. The analysis layer answers *so what?*
— surfacing the patterns, differences and decisive factors that drive the result.

Analysis operates at three levels:

### Level 1: ItemInsightsStrip (inline, per supplier)

Embedded directly below the item table in the `ItemEvaluationPanel`. Shows
at-a-glance diagnostics for the supplier's items on this sub-criterion.

```
┌─── ANALYSE ──────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─ Sterkeste ressurs ──────────┐  ┌─ Svakeste dimensjon ─────────┐ │
│  │ Eva Solberg — Arkitekt       │  │ Sertifiseringer               │ │
│  │ Snitt 8.4                    │  │ Snitt 7.7 (lavest)            │ │
│  │ Sterkest på erfaring (9)     │  │ Ola Hansen trekker ned (6)    │ │
│  └──────────────────────────────┘  └───────────────────────────────┘ │
│                                                                      │
│  ┌─ Spredning ──────────────────────────────────────────────────────┐│
│  │ Erfaring  ████████░░  8.0  (spredning: 2)                       ││
│  │ Utdanning ███████░░░  7.7  (spredning: 1)                       ││
│  │ Sertif.   ███████░░░  7.7  (spredning: 3)  ← størst variasjon  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Computed signals:**
- **Sterkeste/svakeste ressurs**: Item with highest/lowest weighted average
- **Svakeste dimensjon**: ItemCriterion with lowest average across items
- **Spredning per dimensjon**: `max - min` score across items, with bar visualization
- **Risikoflagg**: If any single item scores ≤ 3 on any dimension (amber warning)

**Styling:**
- Two-column card layout for top insights, `--felt-raised` background
- Spread bars: horizontal, proportional to score, `--score-high` fill (or `--lav` for low)
- Section label: "ANALYSE" in standard 10px uppercase ghost style
- Cards: `--wire` border, `--r-sm` radius, compact `--sp-2` padding

```typescript
/** Per-supplier item analysis for a single sub-criterion. */
interface ItemInsights {
  strongestItem: { name: string; label?: string; score: number; bestDimension: string };
  weakestDimension: { name: string; average: number; weakestItem: string; weakestScore: number };
  dimensionSpread: Array<{
    name: string;
    average: number;
    min: number;
    max: number;
    spread: number;
  }>;
  riskFlags: Array<{ itemName: string; dimensionName: string; score: number }>;
}
```

### Level 2: Cross-Supplier Comparison (per sub-criterion)

When items are scored across all suppliers, the key question is: *"What actually
separates the suppliers on this criterion?"* A dedicated comparison view answers this.

**Trigger:** A tab or toggle at the top of the ItemEvaluationPanel:
`[Per leverandør]  [Sammenligning]`

The comparison view shows all suppliers side by side for the same sub-criterion.

```
┌─── SAMMENLIGNING — Tilbudt personell ───────────────────────────────────┐
│                                                                          │
│  [Per leverandør ↹]  [◉ Sammenligning]                                   │
│                                                                          │
│  DIMENSJONSSAMMENLIGNING                                                 │
│  ┌────────────────────┬──────────┬──────────┬──────────┬────────────────┐│
│  │ DIMENSJON          │ Bouvet   │ Sopra    │ Knowit   │ DIFFERANSE     ││
│  │                    │ (3 res.) │ (2 res.) │ (3 res.) │                ││
│  ├────────────────────┼──────────┼──────────┼──────────┼────────────────┤│
│  │ Erfaring     40%   │   8.0    │   7.0    │   8.3    │  1.3 ▲ Knowit ││
│  │ Utdanning    30%   │   7.7    │   7.5    │   8.7    │  1.2 ▲ Knowit ││
│  │ Sertif.      30%   │   7.7    │   7.5    │   8.3    │  0.8 ▲ Knowit ││
│  ├────────────────────┼──────────┼──────────┼──────────┼────────────────┤│
│  │ TOTALT             │   7.8    │   7.0    │   8.5    │  1.5 ▲ Knowit ││
│  └────────────────────┴──────────┴──────────┴──────────┴────────────────┘│
│                                                                          │
│  UTSLAGSGIVENDE DIMENSJONER                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  1. Erfaring (40%)  ← størst vektet differanse                      ││
│  │     Knowit leder med 8.3 — Sopra lavest med 7.0                     ││
│  │     Vektet bidrag til forskjell: 0.52 poeng                          ││
│  │                                                                      ││
│  │  2. Utdanning (30%)                                                  ││
│  │     Knowit leder med 8.7 — Sopra lavest med 7.5                     ││
│  │     Vektet bidrag til forskjell: 0.36 poeng                          ││
│  │                                                                      ││
│  │  3. Sertifiseringer (30%)                                            ││
│  │     Knowit leder med 8.3 — Sopra lavest med 7.5                     ││
│  │     Vektet bidrag til forskjell: 0.24 poeng                          ││
│  │                                                                      ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  STYRKE/SVAKHETS-KART                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │      Bouvet          Sopra           Knowit                          ││
│  │  Erf  ████████░░   ███████░░░   ████████░░   ← stacked horiz bars  ││
│  │  Utd  ████████░░   ████████░░   █████████░                          ││
│  │  Ser  ████████░░   ████████░░   ████████░░                          ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key computed values:**

```typescript
/** Cross-supplier analysis for an item-evaluated sub-criterion. */
interface CrossSupplierAnalysis {
  /** Per dimension: average score per supplier + spread. */
  dimensionComparison: Array<{
    criterion: ItemCriterion;
    supplierAverages: Record<string, number>;   // supplierId → avg across items
    leader: { supplierId: string; score: number };
    laggard: { supplierId: string; score: number };
    spread: number;
  }>;

  /** Dimensions ranked by impact (weight × spread). */
  impactRanking: Array<{
    criterion: ItemCriterion;
    weightedSpread: number;             // weight/100 × spread
    leader: string;                     // supplier name
    laggard: string;                    // supplier name
  }>;

  /** Per supplier: score profile across dimensions for visual comparison. */
  supplierProfiles: Record<string, {
    supplierName: string;
    itemCount: number;
    dimensionScores: Record<string, number>;  // criterionId → average
    totalScore: number;
  }>;
}
```

**"Utslagsgivende dimensjoner" algorithm:**

Ranks item-criteria by `(weight / 100) × (max_supplier_avg - min_supplier_avg)`.
This answers: *"Which dimension, considering its weight, creates the biggest
point difference between the best and worst supplier?"*

```typescript
function impactRanking(
  sub: SubCriterion,
  suppliers: Supplier[]
): Array<{ criterionName: string; weightedSpread: number; leader: string; laggard: string }> {
  if (!sub.itemCriteria || !sub.items) return [];

  return sub.itemCriteria
    .map(ic => {
      const avgs = suppliers.map(s => {
        const items = sub.items![s.id] ?? [];
        if (items.length === 0) return { supplierId: s.id, avg: 0 };
        const avg = items.reduce((sum, item) => sum + (item.scores[ic.id] ?? 0), 0) / items.length;
        return { supplierId: s.id, avg };
      });

      const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
      const spread = sorted[0].avg - sorted[sorted.length - 1].avg;

      return {
        criterionName: ic.name,
        weightedSpread: (ic.weight / 100) * spread,
        leader: suppliers.find(s => s.id === sorted[0].supplierId)!.name,
        laggard: suppliers.find(s => s.id === sorted[sorted.length - 1].supplierId)!.name
      };
    })
    .sort((a, b) => b.weightedSpread - a.weightedSpread);
}
```

**Styrke/svakhets-kart** (Strength/weakness map):

A compact grouped horizontal bar chart. One bar group per dimension, one bar
per supplier. Max bar = 10 (full width). Provides instant visual pattern
recognition:
- All bars similar length → suppliers are close on this dimension
- One bar notably shorter → clear weakness for that supplier
- Converging/diverging patterns → where differentiation happens

Styling:
- Bars: 6px height, `--r-sm` radius, `--score-high` fill, `--felt-raised` track
- Supplier labels: 11px, `--font-data`, positioned above bar group
- Dimension labels: 11px, `--ink-muted`, left-aligned
- Best bar per group: `--vekt` color instead of green

### Level 3: Global InsightsPanel — "Ressursanalyse" Tab

Adds a fourth tab to the existing InsightsPanel:
`Betalingsvilje  Robusthet  Metodekontroll  [Ressursanalyse]`

This tab only appears when at least one sub-criterion has `evaluationType: 'item'`.

```
┌─── RESSURSANALYSE ──────────────────────────────────────────────────────┐
│                                                                          │
│  OVERSIKT ITEM-EVALUERTE KRITERIER                                       │
│  ┌─────────────────────┬──────┬──────────┬──────────┬──────────┬───────┐│
│  │ Kriterium           │ Vekt │ Bouvet   │ Sopra    │ Knowit   │ Diff  ││
│  ├─────────────────────┼──────┼──────────┼──────────┼──────────┼───────┤│
│  │ Tilbudt personell   │ 20%  │ 7.8 (3r) │ 7.0 (2r) │ 8.5 (3r) │ 1.5  ││
│  │ Referanseprosjekter │ 10%  │ 8.2 (3p) │ 7.5 (2p) │ 7.8 (4p) │ 0.7  ││
│  └─────────────────────┴──────┴──────────┴──────────┴──────────┴───────┘│
│                                                                          │
│  MEST UTSLAGSGIVENDE DIMENSJONER (PÅ TVERS AV ALLE ITEM-KRITERIER)      │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  1. Relevant erfaring (under Tilbudt personell, 40%)                 ││
│  │     Vektet differanse: 0.52 poeng                                    ││
│  │     Knowit leder (8.3) — Sopra lavest (7.0)                         ││
│  │                                                                      ││
│  │  2. Utdanning og fagkompetanse (under Tilbudt personell, 30%)        ││
│  │     Vektet differanse: 0.36 poeng                                    ││
│  │     Knowit leder (8.7) — Sopra lavest (7.5)                         ││
│  │                                                                      ││
│  │  3. Relevans (under Referanseprosjekter, 50%)                        ││
│  │     Vektet differanse: 0.21 poeng                                    ││
│  │     Bouvet leder (9.0) — Knowit lavest (7.5)                        ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  RISIKOVARSEL                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  ⚠  Sopra Steria: Tilbudt personell — bare 2 ressurser             ││
│  │     vs. Bouvet (3) og Knowit (3). Smalere team kan innebære risiko. ││
│  │                                                                      ││
│  │  ⚠  Bouvet: Ola Hansen — Sertifiseringer score 6 (lavest av alle   ││
│  │     tilbudte ressurser på denne dimensjonen)                         ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Analysis Store Computations

New `$derived` blocks on `EvaluationStore`:

```typescript
/** All item-level analysis, computed reactively. */
itemAnalysis = $derived.by(() => {
  const result: ItemAnalysisResult = {
    perSubCriterion: {},
    globalImpactRanking: [],
    riskWarnings: []
  };

  for (const criterion of this.data.criteria) {
    for (const sub of criterion.subcriteria) {
      if (sub.evaluationType !== 'item' || !sub.items || !sub.itemCriteria) continue;

      // ── Per-supplier insights ──
      const supplierInsights: Record<string, ItemInsights> = {};
      for (const supplier of this.data.suppliers) {
        const items = sub.items[supplier.id] ?? [];
        if (items.length === 0) continue;

        const itemScores = items.map(item => ({
          item,
          score: itemScore(item, sub.itemCriteria!)
        }));

        // Strongest/weakest item
        const sorted = [...itemScores].sort((a, b) => b.score - a.score);
        const strongest = sorted[0];
        const weakest = sorted[sorted.length - 1];

        // Best dimension for strongest item
        const bestDim = sub.itemCriteria!.reduce((best, ic) =>
          (strongest.item.scores[ic.id] ?? 0) > (strongest.item.scores[best.id] ?? 0)
            ? ic : best
        );

        // Weakest dimension across items
        const dimAverages = sub.itemCriteria!.map(ic => {
          const avg = items.reduce((s, item) => s + (item.scores[ic.id] ?? 0), 0) / items.length;
          const weakestItem = items.reduce((w, item) =>
            (item.scores[ic.id] ?? 0) < (w.scores[ic.id] ?? 0) ? item : w
          );
          return {
            name: ic.name,
            average: avg,
            min: Math.min(...items.map(i => i.scores[ic.id] ?? 0)),
            max: Math.max(...items.map(i => i.scores[ic.id] ?? 0)),
            spread: Math.max(...items.map(i => i.scores[ic.id] ?? 0))
                  - Math.min(...items.map(i => i.scores[ic.id] ?? 0)),
            weakestItem: weakestItem.name,
            weakestScore: weakestItem.scores[ic.id] ?? 0
          };
        });

        const weakestDim = dimAverages.reduce((w, d) => d.average < w.average ? d : w);

        supplierInsights[supplier.id] = {
          strongestItem: {
            name: strongest.item.name,
            label: strongest.item.label,
            score: strongest.score,
            bestDimension: bestDim.name
          },
          weakestDimension: {
            name: weakestDim.name,
            average: weakestDim.average,
            weakestItem: weakestDim.weakestItem,
            weakestScore: weakestDim.weakestScore
          },
          dimensionSpread: dimAverages,
          riskFlags: items.flatMap(item =>
            sub.itemCriteria!
              .filter(ic => (item.scores[ic.id] ?? 0) <= 3)
              .map(ic => ({
                itemName: item.name,
                dimensionName: ic.name,
                score: item.scores[ic.id] ?? 0
              }))
          )
        };

        // Collect global risk warnings
        for (const flag of supplierInsights[supplier.id].riskFlags) {
          result.riskWarnings.push({
            supplierName: supplier.name,
            subCriterionName: sub.name,
            ...flag
          });
        }
      }

      // ── Cross-supplier comparison ──
      const crossSupplier = impactRanking(sub, this.data.suppliers);

      // ── Item count disparity warning ──
      const itemCounts = this.data.suppliers.map(s => ({
        name: s.name,
        count: (sub.items![s.id] ?? []).length
      }));
      const maxCount = Math.max(...itemCounts.map(ic => ic.count));
      const minCount = Math.min(...itemCounts.map(ic => ic.count));
      if (maxCount > 0 && minCount < maxCount * 0.6) {
        const fewest = itemCounts.find(ic => ic.count === minCount)!;
        result.riskWarnings.push({
          supplierName: fewest.name,
          subCriterionName: sub.name,
          itemName: '',
          dimensionName: '',
          score: 0,
          type: 'item-count-disparity',
          message: `bare ${fewest.count} ${sub.itemLabel?.toLowerCase() ?? 'elementer'}`
            + ` vs. ${maxCount} hos andre leverandører`
        });
      }

      result.perSubCriterion[sub.id] = {
        supplierInsights,
        crossSupplier,
        impactRanking: crossSupplier
      };

      // Add to global impact ranking (adjusted for sub-criterion weight in parent)
      const subWeightFactor = sub.weight / 100;
      for (const impact of crossSupplier) {
        result.globalImpactRanking.push({
          ...impact,
          subCriterionName: sub.name,
          globalWeightedSpread: impact.weightedSpread * subWeightFactor
        });
      }
    }
  }

  // Sort global impact ranking
  result.globalImpactRanking.sort((a, b) => b.globalWeightedSpread - a.globalWeightedSpread);

  return result;
});
```

### Analysis types

```typescript
interface ItemAnalysisResult {
  perSubCriterion: Record<string, {
    supplierInsights: Record<string, ItemInsights>;
    crossSupplier: CrossSupplierAnalysis['dimensionComparison'];
    impactRanking: CrossSupplierAnalysis['impactRanking'];
  }>;

  /** All item-criteria ranked by global impact (weight × spread). */
  globalImpactRanking: Array<{
    criterionName: string;
    subCriterionName: string;
    weightedSpread: number;
    globalWeightedSpread: number;
    leader: string;
    laggard: string;
  }>;

  /** Risk warnings across all item-evaluated criteria. */
  riskWarnings: Array<{
    supplierName: string;
    subCriterionName: string;
    itemName: string;
    dimensionName: string;
    score: number;
    type?: 'low-score' | 'item-count-disparity';
    message?: string;
  }>;
}
```

---

## Updated Component Hierarchy

```
EvaluationMatrix.svelte
  └── (for each sub-criterion row)
        ├── ScoreCell.svelte                    (evaluationType: 'simple')
        │     └── AnnotationPanel.svelte        (on click)
        │
        └── ScoreCell.svelte [variant: drilldown] (evaluationType: 'item')
              └── ItemEvaluationPanel.svelte     (on click)
                    ├── ViewToggle.svelte          [Per leverandør | Sammenligning]
                    │
                    ├── (Per leverandør view):
                    │     ├── AggregationStrip.svelte
                    │     ├── ItemTable.svelte
                    │     │     ├── ItemRow.svelte
                    │     │     │     ├── ItemScoreCell.svelte
                    │     │     │     └── ItemNotes.svelte
                    │     │     └── ItemTotalRow.svelte
                    │     ├── AddItemRow.svelte
                    │     ├── ItemInsightsStrip.svelte    ← NEW: per-supplier analysis
                    │     └── AnnotationNotes.svelte
                    │
                    └── (Sammenligning view):
                          ├── DimensionComparisonTable.svelte  ← NEW
                          ├── ImpactRanking.svelte             ← NEW
                          └── StrengthMap.svelte               ← NEW

InsightsPanel.svelte
  ├── (existing tabs: Betalingsvilje, Robusthet, Metodekontroll)
  └── RessursanalyseTab.svelte               ← NEW: global item-level analysis
        ├── ItemCriteriaOverview.svelte
        ├── GlobalImpactRanking.svelte
        └── RiskWarnings.svelte
```

### New components (analysis layer)

| Component | Level | Responsibility |
|---|---|---|
| `ItemInsightsStrip.svelte` | 1 (per supplier) | Strongest/weakest item, dimension spread, risk flags |
| `ViewToggle.svelte` | 2 (panel) | Toggle between per-supplier scoring and comparison view |
| `DimensionComparisonTable.svelte` | 2 (comparison) | Side-by-side dimension averages across all suppliers |
| `ImpactRanking.svelte` | 2 (comparison) | Ranked list of most decisive dimensions |
| `StrengthMap.svelte` | 2 (comparison) | Grouped horizontal bar chart for visual profiling |
| `RessursanalyseTab.svelte` | 3 (global) | InsightsPanel tab aggregating all item-level analysis |
| `GlobalImpactRanking.svelte` | 3 (global) | Impact ranking across all item-evaluated criteria |
| `RiskWarnings.svelte` | 3 (global) | Collected warnings (low scores, team size disparity) |

---

## Analysis Styling

All analysis components extend the existing InsightsPanel patterns:

**Impact ranking cards** (re-uses `.robusthet-insight` pattern):
```css
.impact-item {
  padding: var(--sp-3) var(--sp-4);
  background: var(--felt-raised);
  border-radius: var(--r-sm);
  border: 1px solid var(--wire);
  border-left: 3px solid var(--vekt);
}

.impact-rank {
  font-family: var(--font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--vekt-dim);
  margin-right: var(--sp-3);
}

.impact-value {
  font-family: var(--font-data);
  font-weight: 600;
  color: var(--vekt);
}
```

**Risk warnings** (amber for disparity, rose for low scores):
```css
.risk-warning {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-sm);
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

.risk-warning.low-score {
  background: var(--lav-bg);
  border: 1px solid rgba(196, 88, 88, 0.15);
  border-left: 3px solid var(--lav);
  color: var(--ink-secondary);
}

.risk-warning.disparity {
  background: var(--vekt-bg);
  border: 1px solid rgba(232, 168, 56, 0.12);
  border-left: 3px solid var(--vekt-dim);
  color: var(--ink-secondary);
}

.risk-icon {
  font-size: 14px;
  flex-shrink: 0;
}
```

**Strength map bars**:
```css
.strength-bar-group {
  display: grid;
  grid-template-columns: 60px repeat(var(--supplier-count), 1fr);
  gap: var(--sp-2);
  align-items: center;
  padding: var(--sp-1) 0;
}

.strength-bar-track {
  height: 6px;
  background: var(--felt-raised);
  border-radius: 3px;
  overflow: hidden;
}

.strength-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.strength-bar-fill.leader { background: var(--vekt); }
.strength-bar-fill.high   { background: var(--score-high); }
.strength-bar-fill.mid    { background: var(--ink-muted); }
.strength-bar-fill.low    { background: var(--score-low); }
```

**Dimension comparison table** (extends matrix pattern):
```css
.dim-comparison {
  width: 100%;
  border-collapse: collapse;
  background: var(--felt);
  border: 1px solid var(--wire);
  border-radius: var(--r-sm);
}

.dim-comparison td.diff-cell {
  font-family: var(--font-data);
  font-weight: 600;
  white-space: nowrap;
}

.diff-cell .diff-leader {
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-muted);
  margin-left: var(--sp-1);
}

.diff-cell .diff-arrow {
  color: var(--vekt);
  font-size: 10px;
}
```

---

## Future Considerations (Out of Scope)

- **Per-item weighting**: Allow items to have different weights (e.g. project leader
  counts double). Deferred — adds complexity without clear immediate need.
- **Import from bid documents**: Auto-populate items from parsed supplier submissions.
  Depends on document parsing capabilities.
- **Sensitivity analysis**: "If supplier X's weakest resource improved by 1 point on
  dimension Y, would the ranking change?" Requires scenario simulation layer.
- **Export**: Generate a formatted comparison report (PDF/DOCX) for the evaluation
  protocol, including item-level detail and analysis findings.
