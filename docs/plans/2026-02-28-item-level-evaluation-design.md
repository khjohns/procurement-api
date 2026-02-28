# Item-Level Evaluation — Design

## Scope

Implement item-level evaluation for the SvelteKit procurement evaluation app, plus critical fixes from the design critique.

**In scope:**
- Store extension: types, computed scores, methods
- ItemEvaluationPanel with ItemTable (per-supplier scoring view)
- Score cell drilldown variant for item-evaluated sub-criteria
- Mock data for "Tilbudt personell" sub-criterion
- Critical fixes: I1 (score thresholds), I3 (score precision), I5 (total row background)
- Design critique fixes: D1 ($derived purity), D2 (remove dead aggregation)

**Out of scope (later):**
- Cross-supplier comparison view (Level 2 analysis)
- Ressursanalyse tab in InsightsPanel (Level 3 analysis)
- ItemInsightsStrip (Level 1 analysis)
- Item CRUD lifecycle (rename, reorder, delete confirm)
- Accessibility overhaul (I2)
- Keyboard navigation for item table

## Architecture

### Approach: Progressive Layering

Build in layers where each is independently testable:

1. **Store extension + critical fixes + mock data**
2. **ItemEvaluationPanel with ItemTable**

### Design Decisions

| Issue | Decision |
|---|---|
| D1: `$derived` mutation | Return computed map from `$derived`, overlay in `groupScores`/`totals` |
| D2: Dead aggregation | Remove `weighted` and `best-n`; keep `average` + `minimum` |
| D3: Panel ownership | Cell-click → per-supplier view (only view for now) |
| I1: Score thresholds | `>=7` high, `>=4` mid, `<4` low (align to system.md) |
| I3: Score precision | `.toFixed(1)` for all derived scores |
| I5: Total row bg | `--canvas` instead of `--felt` |

## Data Model

### New Types (in evaluation.svelte.ts)

```typescript
interface ItemCriterion {
  id: string;
  name: string;
  weight: number;  // sums to 100 within sub-criterion
}

interface EvaluationItem {
  id: string;
  name: string;
  label?: string;  // role, type, category
  scores: Record<string, number>;  // itemCriterionId → 0–10
  notes: Record<string, string>;   // itemCriterionId → text
}

type AggregationMethod = 'average' | 'minimum';
```

### Extended SubCriterion

```typescript
interface SubCriterion {
  // ... existing fields ...
  evaluationType?: 'simple' | 'item';
  itemLabel?: string;                       // "Ressurs", "Prosjekt" etc.
  itemCriteria?: ItemCriterion[];
  items?: Record<string, EvaluationItem[]>; // supplierId → items
  aggregation?: AggregationMethod;
}
```

### Store Computed Properties

```typescript
// Pure $derived — returns a map, never mutates $state
itemScores = $derived.by(() => {
  const result: Record<string, Record<string, number>> = {};
  // For each item-evaluated sub, compute supplierId → aggregated score
  return result;
});
```

`groupScores` and `totals` check `itemScores[sub.id]?.[supplierId]` before falling back to `sub.scores[supplierId]`.

### Store Methods

```typescript
setItemScore(subId, supplierId, itemId, criterionId, value): void
setItemNote(subId, supplierId, itemId, criterionId, text): void
addItem(subId, supplierId, name, label?): void
removeItem(subId, supplierId, itemId): void
setAggregation(subId, method): void
```

## Components

### Modified: ScoreCell.svelte

New prop `drilldown?: boolean`. When true:
- Shows `▾` chevron after score value
- Score displays with `.toFixed(1)` (derived scores are never integers)

### Modified: EvaluationMatrix.svelte

For sub-criteria with `evaluationType === 'item'`:
- Pass `drilldown={true}` to ScoreCell
- On click, open ItemEvaluationPanel instead of AnnotationPanel

### New: ItemEvaluationPanel.svelte

Full-width `<tr>` below sub-criterion row (same pattern as AnnotationPanel).

Structure:
- Context bar: supplier › sub-criterion name
- AggregationStrip: radio-style `Snitt | Minimum` + result score
- ItemTable: dense scoring table
- Add item button
- Notes textarea (overarching justification)

### New: ItemTable.svelte

Dense `<table>` inside the panel:
- Columns: item name (flex) | criteria (80px each) | average (72px)
- Header: criterion name + weight percentage
- Rows: one per EvaluationItem
- Footer: column averages + final aggregated score
- Score cells: clickable, inline compact selector (popover)

### New: ItemScoreCell.svelte

Compact score display with click-to-edit:
- Default: number, tier-colored
- Edit: small popover with 0–10 segments (22×26px, compact)
- Auto-closes on selection

## Styling

All components follow `.interface-design/system.md` tokens exactly:

- Surfaces: `--felt`, `--felt-raised`, `--canvas`
- Text: `--ink`, `--ink-secondary`, `--ink-muted`, `--ink-ghost`
- Borders: `--wire`, `--wire-strong`
- Data font: `--font-data` with `tabular-nums`
- Score tiers: `--score-high` (>=7), `--ink-secondary` (>=4), `--score-low` (<4)
- Weight spine: `--vekt` left border (3px) on panel
- Spacing: 4px grid (`--sp-1` through `--sp-8`)
- Radius: `--r-sm` (4px) for inputs/buttons, `--r-md` (6px) for cards

Item table header: 10px uppercase, `letter-spacing: 0.08em`, `--ink-ghost`.
Item table footer: `--canvas` background (per system.md total row pattern).

## Critical Fixes (applied during implementation)

1. **scoreTier()** → `>=7` high, `>=4` mid, `<4` low
2. **ScoreCell** → `.toFixed(1)` for non-integer scores
3. **Total row** → `background: var(--canvas)` not `var(--felt)`
4. **$derived purity** → `itemScores` returns map, no mutation
5. **AggregationMethod** → only `'average'` | `'minimum'`

## Mock Data

One item-evaluated sub-criterion: "Tilbudt personell" (replacing existing "Nøkkelpersonellets kvalifikasjoner"):
- 3 item criteria: Erfaring (40%), Utdanning (30%), Sertifiseringer (30%)
- 3 suppliers with 2-3 resources each
- Pre-filled scores for immediate visual testing
