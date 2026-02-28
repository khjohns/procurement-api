# Design Critique — Item-Level Evaluation & Existing Implementation

## Scope

This critique covers two areas:
1. **The new resource-evaluation.md design** — internal consistency, UX issues, missing considerations
2. **The implemented components** — deviations from system.md, accessibility, and structural issues

---

## Part 1: Critique of resource-evaluation.md

### CRITICAL — $derived with side effects

The proposed `itemDerivedScores` block **mutates state inside a `$derived`**:

```typescript
itemDerivedScores = $derived.by(() => {
  // ...
  sub.scores[supplier.id] = supplierItemScore(...);  // ← mutation inside $derived
});
```

This is a Svelte 5 anti-pattern. `$derived` should be pure — it reads reactive
state and returns a value. Mutating `sub.scores` inside `$derived` creates
unpredictable reactive dependency cycles and will likely trigger Svelte warnings.

**Fix:** Use a `$derived` that *returns* the computed scores, then read from that
derived map instead of writing back into `sub.scores`. The `groupScores` and
`totals` computations should check for item-evaluated sub-criteria and read from
the derived item scores directly:

```typescript
/** Computed scores for item-evaluated subcriteria. */
itemScores = $derived.by(() => {
  const result: Record<string, Record<string, number>> = {};
  for (const criterion of this.data.criteria) {
    for (const sub of criterion.subcriteria) {
      if (sub.evaluationType !== 'item' || !sub.items || !sub.itemCriteria) continue;
      result[sub.id] = {};
      for (const supplier of this.data.suppliers) {
        const items = sub.items[supplier.id] ?? [];
        result[sub.id][supplier.id] = supplierItemScore(
          items, sub.itemCriteria, sub.aggregation ?? 'average'
        );
      }
    }
  }
  return result;
});
```

Then modify `weightedAverage()` to accept an optional overlay map, or adjust
`groupScores`/`totals` to prefer `itemScores[sub.id][supplierId]` when available.

---

### HIGH — Dead aggregation variants

Two of four `AggregationMethod` values are non-functional:

- **`'weighted'`**: Identical to `'average'` — says "Future: per-item weight" but
  ships as a no-op duplicate. Users see a radio option that does nothing different.
- **`'best-n'`**: Takes `slice(0, scores.length)` — i.e., all items. Without a
  configurable N value, this is also identical to `'average'`.

**Fix:** Either:
1. Remove `'weighted'` and `'best-n'` until they have distinct implementations, or
2. Add an `aggregationConfig?: { n?: number; weights?: Record<string, number> }`
   field and implement them properly.

Showing options that behave identically erodes user trust.

---

### HIGH — Panel ownership ambiguity

The ItemEvaluationPanel is triggered by clicking a *supplier's* score cell in the
main matrix. But the `[Sammenligning]` view inside that panel shows *all suppliers*.

Questions left unresolved:
- Where in the DOM does the comparison view live? It was opened from Bouvet's column,
  but now spans all columns.
- If the user clicks Sopra's score cell while Bouvet's panel is open, does Bouvet's
  close first? Do we stack panels?
- The comparison view duplicates data from other suppliers' panels — is it the same
  data or a separate read?

**Recommendation:** The comparison view should probably be triggered from the
*row header* (clicking the sub-criterion name "Tilbudt personell"), not from
individual supplier cells. This makes the ownership clear: row-level comparison
vs. cell-level per-supplier scoring.

```
Row click (sub-criterion name) → Comparison view (all suppliers)
Cell click (supplier score)    → Per-supplier scoring view
```

---

### MEDIUM — Inconsistent score input patterns

The design introduces two different 0–10 input mechanisms:
1. **AnnotationPanel**: Full segment selector (30×32px buttons, 11 segments)
2. **ItemScoreCell**: Compact popover (22×26px segments) or keyboard entry

Users will use both in the same session (simple sub-criteria use the full selector,
item-evaluated sub-criteria use the compact one). The mental models differ:
- Full selector: click directly on the score value
- Compact: click cell → popover appears → click score → popover closes

**Recommendation:** Unify the interaction. The compact popover should share the
same visual vocabulary (segment styling, filled/active states, colors) just at
reduced scale. Document this as a "ScoreInput" primitive with size variants.

---

### MEDIUM — No item management lifecycle

`AddItemRow` adds items, but the design doesn't address:
- **Renaming**: Typo in a resource name — how to fix?
- **Reordering**: The team lead should appear first — how to move items?
- **Editing labels**: Changed role assignment — how to update?
- **Deletion confirmation**: Removing a resource deletes all its scores — is there
  a confirmation step?

These are basic CRUD operations that users will need immediately.

**Recommendation:** Add an item context menu (right-click or `⋮` button):
`Rediger | Flytt opp | Flytt ned | Slett`

---

### MEDIUM — Risk flag threshold is arbitrary

The design hardcodes `≤ 3` as the risk flag threshold, and `60%` as the
item-count-disparity ratio. These aren't derived from the existing tier system
(which uses `< 5` for 'low' in the store, or `≤ 3` per design system comments).

- The store's `scoreTier()` uses thresholds 7.5/5 (implementation) or 7/4 (spec)
- Neither matches the risk flag's `≤ 3`
- The 60% item count ratio has no documented rationale

**Recommendation:** Risk flags should use the tier system's 'low' threshold
(whatever it is — see Part 2 about the threshold mismatch). Document the
item-count-disparity rationale or make it configurable.

---

### LOW — Comparison view DIFFERANSE column oversimplifies

The cross-supplier comparison shows:

```
│ Erfaring  40%   │  8.0  │  7.0  │  8.3  │  1.3 ▲ Knowit │
```

The "DIFFERANSE" column only shows the spread and the leader. With 3+ suppliers,
the positions of middle suppliers are invisible. Who is second? How close is
second to first vs. to last?

**Recommendation:** Add a compact rank indicator per cell:
```
│ Erfaring  40%   │  8.0 ②  │  7.0 ③  │  8.3 ①  │  1.3 │
```

Or use the strength-map bars inline to show relative position.

---

### LOW — Missing considerations

1. **Undo/redo**: Item-level scoring has many more data points. Accidental score
   changes are more likely. No undo mechanism is specified.
2. **Print/export**: How does nested item data appear in an evaluation protocol?
   The PDF export needs a table-within-table layout.
3. **Loading state**: When item data loads from the backend, the panel needs a
   skeleton/loading state. Not mentioned.
4. **system.md update**: The design system document should be updated to include
   the new component patterns (ItemTable, compact score input, analysis cards).
   Currently only resource-evaluation.md knows about these.

---

## Part 2: Critique of Implemented Components vs. system.md

### CRITICAL — Score tier thresholds mismatch

| | Store (`scoreTier()`) | system.md |
|---|---|---|
| High | `≥ 7.5` | `7+` |
| Mid | `≥ 5` | `4–6` |
| Low | `< 5` | `≤ 3` |

A score of **5.0** is classified as 'mid' in both — OK.
A score of **7.0** is classified as 'mid' in code but 'high' in the spec.
A score of **4.0** is classified as 'low' in code but 'mid' in the spec.

The gap between 4 and 5 (spec says mid, code says low) and 7 and 7.5 (spec says
high, code says mid) means visual tier colors will be **incorrect for ~15% of
the score range**.

**Impact:** A supplier scoring 7.0 gets neutral grey instead of green. Significant
visual misrepresentation that affects evaluation perception.

**Fix:** Align `scoreTier()` to match spec:
```typescript
if (score >= 7) return 'high';
if (score >= 4) return 'mid';
return 'low';
```

---

### CRITICAL — Accessibility gaps

No component has adequate ARIA support:

| Component | Missing |
|---|---|
| ScoreCell | `aria-label` (what does this score represent?), `aria-expanded` (panel state) |
| AnnotationPanel | Score segments lack `role="radiogroup"` + `role="radio"` + `aria-checked` |
| MethodToggle | Buttons lack `aria-pressed` or `aria-current` |
| InsightsPanel | Toggle lacks `aria-expanded`; tabs lack `role="tablist"` / `role="tab"` / `aria-selected`; panes lack `role="tabpanel"` |
| EvaluationMatrix | Table lacks `aria-label`; group rows lack `aria-expanded` |
| RankingStrip | Cards lack semantic structure (`role="list"` / `role="listitem"`) |

No component defines `:focus-visible` styles. The design system's focus token
(`--wire-focus`) exists but is only used on textarea focus, not on any interactive
element.

**Impact:** Screen reader users cannot navigate the evaluation matrix. Keyboard-only
users have no visible focus indicators.

---

### HIGH — Score display precision (2 decimals vs. 1)

system.md specifies "one decimal" for group-row scores. Implementation uses `.toFixed(2)`.

- RankingStrip: `7.83` should be `7.8`
- ScoreCell (group rows): `8.23` should be `8.2`
- InsightsPanel robusthet: margin shows 2 decimals

Two-decimal precision creates false confidence in scores derived from integer inputs.
A score of 7.83 implies precision that doesn't exist when the inputs are whole numbers.

**Fix:** Use `.toFixed(1)` for all derived scores. Reserve 2 decimals for margin
analysis in InsightsPanel where the extra precision aids comparison.

---

### HIGH — Ranking card #1 doesn't match spec

system.md specifies: "amber-tinted border + gradient background + Anbefalt badge"

Implementation has: 2px amber top border + flat background + badge.

Missing: the tinted border (should be all-around, not just top) and the gradient
background. The #1 card should visually pop — current implementation is subtle.

**Fix:**
```css
.rank-1 {
  border-color: rgba(232, 168, 56, 0.18);
  background: linear-gradient(
    180deg,
    var(--vekt-bg-strong) 0%,
    var(--felt) 100%
  );
}
```

---

### HIGH — Total row uses wrong background

system.md: `var(--canvas)` (darker, stands out from matrix).
Implementation: `var(--felt)` (same as other rows, blends in).

The total row is the most important row in the matrix — it summarizes everything.
Using the same background as data rows makes it visually indistinct.

**Fix:** Change `.row-total` background from `--felt` to `--canvas`.

---

### MEDIUM — Column widths diverge from grid spec

| Column | system.md | EvaluationMatrix | PriceMatrix |
|---|---|---|---|
| Weight | 72px | 80px | 100px |
| Criteria | 260px | auto | auto |
| Suppliers | flexible | flexible | flexible |

Using `auto` for the criteria column means long criterion names push the column
wider, potentially squeezing supplier columns. The 260px fixed width ensures
consistent alignment between the two matrix views.

Different weight column widths (80 vs 100) between poeng and pris views means
the matrices don't align when switching methods — the "Vektlinjen" (weight spine)
shifts horizontally.

---

### MEDIUM — CSS token naming: English vs. Norwegian

system.md defines tokens in Norwegian (`--høy`, `--midt`, `--lav`, `--vekt`).
tokens.css uses English (`--score-high`, `--score-mid`, `--score-low`) but keeps
`--vekt` in Norwegian.

This creates a mixed-language token vocabulary where some tokens match the spec
and others don't. New contributors reading system.md won't find `--høy` in the
codebase.

**Recommendation:** Pick one language for tokens. Since the CSS is code, English
is more practical. Update system.md to document the actual token names used.

---

### MEDIUM — Weight bar max width

system.md: "max 48px". Implementation: 40px fixed.

The weight bar visualizes relative importance — 48px max gives 20% more visual
range for distinguishing between weights (e.g., 35% vs 25%).

---

### LOW — Notes indicator dot: 4px vs 5px

Minor but compounds with other sub-pixel deviations. One fewer pixel makes the
dot harder to spot at a glance, especially on high-DPI displays where 4px
renders as 2 physical pixels.

---

### LOW — Matrix header letter-spacing: 0.06em vs 0.08em

The 0.02em difference is nearly imperceptible but contributes to a pattern
of "close but not quite" adherence to the design system. When multiple small
deviations accumulate, the overall feel drifts from the intended design.

---

## Summary

### resource-evaluation.md — Design Issues

| # | Issue | Severity | Category |
|---|---|---|---|
| D1 | `$derived` with side effects (mutation) | **CRITICAL** | Architecture |
| D2 | Dead aggregation variants (`weighted`, `best-n`) | HIGH | API |
| D3 | Panel ownership ambiguity (comparison vs. per-supplier) | HIGH | UX |
| D4 | Inconsistent score input patterns | MEDIUM | UX |
| D5 | No item CRUD lifecycle (rename, reorder, delete confirm) | MEDIUM | UX |
| D6 | Arbitrary risk flag thresholds | MEDIUM | Logic |
| D7 | DIFFERANSE column oversimplifies for 3+ suppliers | LOW | UX |
| D8 | No undo, print, loading, or system.md sync | LOW | Completeness |

### Implemented Components — Deviations from system.md

| # | Issue | Severity | Category |
|---|---|---|---|
| I1 | Score tier thresholds (7.5/5 vs 7/4) | **CRITICAL** | Logic |
| I2 | Missing ARIA, roles, focus-visible across all components | **CRITICAL** | Accessibility |
| I3 | Score precision 2 decimals vs. 1 | HIGH | Visual |
| I4 | Ranking #1 card missing gradient and border treatment | HIGH | Visual |
| I5 | Total row background --felt instead of --canvas | HIGH | Visual |
| I6 | Column widths diverge (weight: 80/100 vs 72, criteria: auto vs 260) | MEDIUM | Layout |
| I7 | Mixed English/Norwegian token naming | MEDIUM | Naming |
| I8 | Weight bar 40px vs 48px max | LOW | Visual |
| I9 | Notes dot 4px vs 5px | LOW | Visual |
| I10 | Header tracking 0.06em vs 0.08em | LOW | Typography |

### Recommended Priority

**Immediate** (blocks correct evaluation):
1. Fix score tier thresholds (I1) — wrong visual classification
2. Fix `$derived` mutation pattern (D1) — architectural defect

**Before implementation** (design corrections):
3. Resolve panel ownership (D3) — UX confusion
4. Remove dead aggregation options (D2) — misleading UI
5. Add item CRUD lifecycle (D5) — basic usability

**Implementation polish** (visual correctness):
6. Fix score precision to 1 decimal (I3)
7. Fix total row background (I5)
8. Fix ranking #1 card treatment (I4)
9. Align column widths (I6)

**Track separately** (significant effort):
10. Accessibility overhaul (I2) — needs dedicated pass across all components
