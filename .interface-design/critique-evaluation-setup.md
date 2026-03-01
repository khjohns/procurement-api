# Design Critique — Evaluation Setup Page (`/evaluering/ny`)

## Scope

Critique of the evaluation setup page added in commit `c29a0e2`, assessed against system.md patterns, craft principles, and the established Analysebordet design language.

---

## Composition

The page flows top-to-bottom: Import → Config → Suppliers → Criteria → Action. This mirrors an innkjøper's mental model when setting up an evaluation — import existing data or build from scratch, then configure and launch. The focal point is correctly the criteria editor — the largest, most interactive, most important section.

**Fixed:** Section spacing was too compressed (24px top margin) for a page with five distinct sections. Increased to 32px (`--sp-8`) for clear visual separation between sections.

---

## Craft Fixes Applied

### Typography deviations from system.md

| Element | Was | system.md spec | Fixed to |
|---|---|---|---|
| Section labels | 10px, weight 600, `--ink-ghost` | 11px, weight 600, `--ink-ghost` | 11px |
| Config labels | 10px, weight 600, `--ink-ghost` | 11px, weight 500, `--ink-muted` | 11px, weight 500, `--ink-muted` |

The config labels were styled identically to section labels — a default, not a decision. system.md's Config Strip spec calls for 11px/500/`--ink-muted`, which creates proper hierarchy: section labels are ghostly landmarks, config labels are readable field labels.

### Weight column width: 80px → 72px

Aligned with system.md matrix spec (72px). The setup page's criteria editor is a precursor to the evaluation matrix — the weight spine should feel continuous when navigating from setup to scoring.

### Structural hack: `calc(80px + sp-3 + sp-3 + sp-4)` → flexbox alignment

The add-sub-criterion button used a `calc()` with a hardcoded pixel value to offset its text past the weight column. Replaced with a flex layout using a spacer element that matches the weight column width — same visual result, no magic numbers.

### Supplier name input: 140px fixed → flexible width

`width: 140px` clips names like "Coor Service Management AS" (30 chars). Changed to `min-width: 100px; width: auto` so chips grow to fit content.

### Contract value formatting

Raw `<input type="number">` was unreadable for large values. A contract value of `25000000` needs to be `25 000 000`. Replaced with formatted text input using `Intl.NumberFormat('nb-NO')`:
- Typing: strips spaces, parses integer
- Blur: formats with thousand separators
- Focus: shows raw number for easy editing

### Responsive breakpoint: 1024px → 768px

The config strip's 5 fields (3 narrow) have room for flex-wrap down to ~768px. The 1024px breakpoint forced vertical layout too aggressively.

---

## UX Fixes Applied

### Navigation guard

No `beforeNavigate` protection existed — navigating away lost all form data silently. Added `isDirty` derived state and confirmation dialog.

### Import overwrite confirmation

`importProcurement()` silently overwrote any existing criteria and suppliers. Added confirmation dialog when data already exists.

### ID generation: `Date.now()` → counter + random

`Date.now()` can produce duplicate IDs on rapid clicks. Replaced with a `uid()` function using an incrementing counter plus random suffix.

### Criteria editor empty state

An empty criteria editor showed only a "+ Hovedkriterium" button and "0%" total — no guidance. Added empty state: "Importer fra en anskaffelse, eller legg til kriterier manuelt."

---

## Accessibility Fixes Applied

| Component | Fix |
|---|---|
| Picker input | Added `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"` |
| Picker results | Added `role="listbox"` and `role="option"` on items |
| Picker empty state | Added `role="status"` |
| Picker input | Added Escape key handler to close dropdown |
| Supplier confirm button | Added `title` and `aria-label` |
| All interactive elements | Added `:focus-visible` styles using `--wire-focus` |
| Removed `svelte-ignore a11y_*` | Replaced with proper ARIA roles |

---

## Remaining considerations (not fixed)

| # | Issue | Severity | Rationale |
|---|---|---|---|
| 1 | Kvalitet/Pris split disconnected from criteria weights | MEDIUM | Domain logic question — needs product decision on whether criteria weights are within the quality portion or total |
| 2 | No drag-and-drop reordering of criteria | LOW | Significant implementation effort, can be deferred |
| 3 | Picker lacks arrow-key navigation | LOW | Full listbox keyboard nav needs dedicated implementation |
| 4 | Unicode × and ✓ characters | LOW | Functional but vary between platforms; SVG icons would be more consistent |

---

## Summary

| Category | Count | Status |
|---|---|---|
| Typography deviations | 2 | Fixed |
| Structural hacks | 1 | Fixed |
| System.md alignment | 2 | Fixed (weight col, responsive) |
| UX gaps | 4 | Fixed (nav guard, import confirm, IDs, empty state) |
| Accessibility | 6 | Fixed (ARIA, focus-visible, keyboard) |
| Deferred | 4 | Documented above |
