# Evaluation Page Redesign — Multi-View Workspace

## Problem Statement

The original evaluation page used a single matrix for all criteria with inline expansion panels
(AnnotationPanel, ItemEvaluationPanel) that disrupted the matrix when opened. For large evaluations
(10 suppliers × 5 resources × 3-6 sub-criteria per item-level criterion), the inline expansion
made the matrix unusable — evaluators lost their place, couldn't scan across suppliers, and the
matrix kept shifting.

Justification was limited to per-sub-criterion notes with no hierarchy: no way to write an
overall assessment of a supplier on a criterion, and no way to write per-resource holistic notes.

## Design Direction

### Multi-view workspace with two panels

**Left panel (matrix):** Multiple views — an overview and one view per criterion. Each view
has its own matrix layout optimized for the content type. The evaluator never fights for space
because each view shows only what's relevant.

**Right panel (justification):** Contextual to the active criterion view. Shows hierarchical
justification: overordnet vurdering (criterion-level) → per-resource or per-sub-criterion
notes. Hidden in overview and for price criteria.

### View system

| View | Matrix shows | Right panel |
|---|---|---|
| **Oversikt** | All criteria, aggregated scores per supplier. Click to drill in. | Hidden |
| **Quality criterion (simple)** | Sub-criteria as rows, suppliers as columns. Click cell to edit score. | Per-sub-criterion justification + overordnet |
| **Quality criterion (item-level)** | Item-criteria as rows, resources grouped by supplier as columns. | Per-resource justification + overordnet |
| **Price criterion** | Delegates to PriceMatrix (existing). | Hidden |

### Navigation

- **Overview → Criterion:** Click a criterion row in the overview matrix
- **Criterion → Overview:** Back button (← Oversikt)
- **Between criteria:** Prev/next arrows in the criterion header
- **Between suppliers (panel):** Supplier tabs at top of justification panel

## Data Model Changes

### New fields

```typescript
// Criterion — overordnet vurdering per supplier
interface Criterion {
  // ...existing
  notes?: Record<string, string>; // supplierId → text
}

// EvaluationItem — holistic resource note
interface EvaluationItem {
  // ...existing
  note?: string; // covers all dimensions for this resource
}
```

### New store state

```typescript
activeView: string;              // 'overview' | criterionId
selectedSupplierId: string | null;
```

### New store methods

- `setActiveView(view)` — switch view, auto-select first supplier
- `selectSupplier(supplierId)` — change panel supplier
- `setCriterionNote(criterionId, supplierId, text)` — overordnet note
- `setItemResourceNote(subId, supplierId, itemId, text)` — resource note

## Component Architecture

```
+page.svelte
├── MethodToggle (existing)
├── RankingStrip (existing)
├── workspace (flex container)
│   ├── workspace-main
│   │   ├── OverviewMatrix (new) — all criteria, clickable rows
│   │   └── CriterionView (new) — item matrix + simple matrix
│   │       └── ItemScoreCell (existing) — compact score popovers
│   └── workspace-panel (380px, sticky)
│       └── JustificationPanel (new) — hierarchical notes
└── InsightsPanel (existing)
```

### Removed components (functionality absorbed by new components)
- `EvaluationMatrix` — replaced by OverviewMatrix + CriterionView
- `AnnotationPanel` — replaced by JustificationPanel
- `ItemEvaluationPanel` — replaced by CriterionView item section

## Justification Hierarchy

For item-level criteria (e.g., "Tilbudt personell"):
1. **Overordnet vurdering** — Criterion-level note for the supplier
2. **Per-resource notes** — One textarea per resource, showing all dimension scores as badges
   - Evaluator sees: "Kari Nordmann — Erfaring: 8, Utdanning: 7, Sertifisering: 9"
   - Writes one coherent note covering the holistic assessment

For simple criteria (e.g., "Løsningsbeskrivelse"):
1. **Overordnet vurdering** — Criterion-level note
2. **Per-sub-criterion notes** — Each sub-criterion shows score + textarea

Progress indicator in panel header shows justification completeness.

## Layout

```
┌─────────────────────────────────────────────┬──────────────────────┐
│ workspace-main (flex: 1, overflow-x: auto)  │ workspace-panel      │
│                                             │ (380px, sticky)      │
│ Matrix content adapts to view               │ Justification panel  │
│                                             │ with supplier tabs   │
└─────────────────────────────────────────────┴──────────────────────┘
```

Panel is only visible for quality criterion views. Overview and price views use full width.

## Design Tokens Used

All tokens from the existing Analysebordet system. No new tokens introduced.
Key applications:
- Vektlinjen (weight spine) carries through to criterion view
- Score tier colors (high/mid/low) used in panel score badges
- Panel background: `--color-felt` with `--color-wire` border
- Panel justification sections: amber spine for overordnet, faded for sub-sections
