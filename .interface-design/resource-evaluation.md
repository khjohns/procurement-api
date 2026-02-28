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

## Future Considerations (Out of Scope)

- **Per-item weighting**: Allow items to have different weights (e.g. project leader
  counts double). Deferred — adds complexity without clear immediate need.
- **Item comparison view**: Side-by-side comparison of equivalent items across
  suppliers (e.g. all project leaders). Useful but requires role/category matching.
- **Import from bid documents**: Auto-populate items from parsed supplier submissions.
  Depends on document parsing capabilities.
- **Item-level insights**: Extend InsightsPanel with item-level analytics
  (weakest resource, strongest resource, cross-supplier comparison).
