# Design Critique — Protokollside

## Scope

Critique of `.interface-design/protokoll-page.md` assessed against system.md, the technical plan (`docs/plans/2026-03-01-protokoll-page-and-tailwind.md`), the existing evaluation page implementation, and the Python protokoll generator (`src/protokoll/`). Focus areas: scroll architecture for long begrunnelse fields, accordion behavior, and compositional decisions.

---

## Part 1: Composition — The Scroll Problem

### CRITICAL — Auto-grow begrunnelse breaks the page at scale

The spec says textareas have "Min-height: 80px, auto-grows with content" and Tipex editors have "min-height 200px". The tildelingsbegrunnelse (§ 14) is the most important manual field — the legal core of the document. For a major procurement, this is routinely 3–8 A4 pages (~1500–4000 words, ~8000–25000 characters).

At 14px font-size with 1.6 line-height, one A4 page of text ≈ 400px of editor height. Five pages = 2000px. Eight pages = 3200px.

**What happens:** The user opens § 14, starts writing. After one A4 page, the section header has scrolled off-screen. After three pages, the progress strip is gone. After five pages, the user must scroll 2000px — past their own text — to reach the collapse chevron or the next section. The design's stated workflow ("scan auto-filled data → verify → write justification → move to next section") breaks at the step where the user writes more than ~400px of text.

The accordion mitigates this (only one section open), but § 14 is the section the user spends the most time in. While writing it, they're trapped in a scroll desert with no landmarks.

**Decision:** Rich text editors (Tipex) get `max-height: 60vh; overflow-y: auto` after content exceeds that height. This caps the editor at ~60% of viewport, always leaving room for the section header above and the next section or footer below. Plain textareas keep auto-grow — they're for short fields (1–5 lines) where the limit won't be reached.

The 60vh threshold means:
- On a 1080p display: ~648px, roughly 1.5 A4 pages visible at once
- The user scrolls within the editor to review their text
- The surrounding document structure remains reachable

This is a genuine trade-off. Internal scroll adds a nested scroll context. But the alternative — 3000px of auto-grown content pushing everything offscreen — is worse. The user came to fill out a compliance form, not to free-scroll through their own prose.

---

### CRITICAL — "Single or multiple expansion" is a non-decision

The spec hedges: "Only one section expanded at a time (accordion behavior) — or configurable to allow multiple."

This is two different designs with different scroll consequences:
- **Single expansion:** Safe scroll-wise, but forces open-close-open cycling when comparing data across sections (e.g., verifying that § 5 "Leverandører med tilbud" matches § 13 "Tilbud i vurderingen")
- **Multiple expansion:** Better for cross-reference, but compounds the auto-grow problem — two long begrunnelser open simultaneously could push the page past 5000px

**Decision:** Multiple sections can be open. The user's workflow requires cross-referencing API data between sections. The max-height constraint on rich text editors (from the fix above) prevents unbounded growth. Short sections (auto-filled data) are typically 150–300px — having 3–4 open simultaneously is manageable.

However: **add "Lukk alle" (Collapse all) to the sticky footer.** When the page gets long from multiple open sections, one click resets to the overview. This is the escape hatch.

---

### HIGH — No sticky section header

When an expanded section has long content (even 400px — one A4 page), the section header scrolls away. The user loses:
- Which section they're in
- The section status badge (✓ AUTO / ◐ DELVIS / ○ MANGLER)
- The collapse chevron

**Fix:** Section headers should be `position: sticky; top: 0; z-index: 10` within their section container. When the user scrolls through a long section, the header pins to the top of the viewport. The chevron remains clickable — one click to collapse, regardless of scroll position.

This is the same pattern as sticky table headers in the evaluation matrix (`.matrix-wrap` already has sticky column headers). The vocabulary is established.

---

### HIGH — Progress feedback scrolls away

The progress strip ("12/19 seksjoner · 3 mangler begrunnelse") provides the primary motivational signal: how much is done, what remains. It lives between the page header and the accordion. After scrolling past two sections, it's gone.

The sticky footer already shows "3 ufullstendige seksjoner" — partial progress info. But the progress bar and fraction are only in the strip.

**Fix:** Move the progress bar into the sticky footer. The footer becomes the persistent status line:

```
┌────────────────────────────────────────────────────────────────┐
│  ██████████░░░░  12/19 · 3 mangler    Lukk alle  Generer .docx│
└────────────────────────────────────────────────────────────────┘
```

The page header keeps the full progress strip for initial orientation. But once the user scrolls into the document, the footer carries the progress signal. This follows the evaluation page pattern where the progress indicators are at the bottom.

---

## Part 2: Craft

### HIGH — § prefix is a legal collision

The spec uses "§ 2" as a sequential section number. But § is the Norwegian/European legal reference symbol. The Python generator and the actual compliance framework reference specific FOA paragraphs: § 9-3, § 25-5 bokstav c, § 24-2.

A user seeing "§ 2 Prosedyre" may read this as referencing FOA § 2, which covers a different topic entirely (Virkeområde / Scope). In a legal compliance document, this ambiguity is not cosmetic — it's a professional credibility issue.

**Fix:** Drop the § prefix for section numbers. Use plain ordinals:

```
▸  2   Prosedyre                              ◐  DELVIS
```

The monospace `--font-data` numbering still creates the dense-data texture. Reserve § for actual FOA references within section content (e.g., "Hjemmel: § 9-3 første ledd").

---

### HIGH — Sticky footer width relationship to 800px column

The spec describes a `--felt` footer with `--sp-8` horizontal padding, "always visible at bottom of viewport." But the content column is 800px centered. Two interpretations:

1. Footer spans full viewport width → visual disconnect with the narrow column above
2. Footer matches 800px → oddly narrow band floating at bottom

Neither is specified. This is a default that wasn't resolved.

**Fix:** Footer spans full viewport width (it's chrome, not content — same justification as the sidebar spanning full height). Content inside the footer uses a max-width container matching the page column, so text aligns with the sections above.

```css
.sticky-footer {
  position: sticky;
  bottom: 0;
  width: 100%; /* spans workspace */
}
.sticky-footer-content {
  max-width: 800px;
  margin: 0 auto;
}
```

---

### MEDIUM — Info table label alignment

The spec says labels are "right-aligned, 160px fixed width." Right-aligned labels create ragged left edges. Norwegian labels vary significantly in length: "Ref" vs. "Kunngjøringsdato" vs. "Kontraktsverdi." Right alignment pushes short labels deep into the column, creating visual holes.

The evaluation page's config strip uses left-aligned labels. Inconsistency between pages in the same app.

**Fix:** Left-aligned labels. The 160px fixed column still provides visual structure. Short labels sit at the left edge, long labels fill more of the column — both are scannable. This matches the existing app convention.

---

### MEDIUM — Tipex toolbar includes unspecified items

The toolbar diagram shows `B I U │ H2 H3 │ • ─ 1. ─ │ "" —` without explaining what `""` and `—` represent. Presumably blockquote and horizontal rule. But:

- Blockquote in a legal compliance document: when would this be used? Quoting FOA text? Quoting from a supplier's tilbud? The use case is real but unspecified.
- Horizontal rule: in a Word export, this maps to what? A paragraph border? A drawn line?
- **Underline (U):** In modern web conventions, underline implies hyperlink. In legal documents, underline implies emphasis. These conflict. For a Word export, underline is unambiguous. Keep it, but document the rationale.

**Fix:** Specify each toolbar item's purpose and Word export mapping:

| Toolbar | Word mapping | Use case |
|---------|-------------|----------|
| **B** (Bold) | Bold run | Emphasis, supplier names |
| *I* (Italic) | Italic run | Terms, document names |
| U (Underline) | Underline run | Legal emphasis convention |
| H2, H3 | Heading 2, 3 | Structuring long begrunnelse by criterion |
| • (Unordered list) | Bullet list | Listing evaluation points |
| 1. (Ordered list) | Numbered list | Sequential arguments |
| "" (Blockquote) | Indented paragraph | Quoting from tilbud or FOA |
| — (Horizontal rule) | *Remove.* | No clear Word mapping, clutters toolbar |

---

### MEDIUM — No character count on begrunnelse fields

The evaluation page's AnnotationPanel shows character count below the textarea. The protocol page specifies no character indicators on any field, even though:

- Legal practitioners have practical length norms for different begrunnelse types
- The Word generator produces a document where very short justifications look inadequate and very long ones are unusual
- Users need feedback on whether they've written "enough"

**Fix:** All textarea and Tipex fields show character count: `{count} tegn`. For key fields, add hint text with guidance:

```
Tildelingsbegrunnelse:    "Begrunn valget opp mot hvert tildelingskriterium"
Avvisningsbegrunnelse:    "Oppgi hjemmel og faktisk grunnlag"
Prosedyrebegrunnelse:     "Valgfritt for åpen anbudskonkurranse"
```

---

### MEDIUM — Emoji in procurement selector

The spec shows `🔍 Søk etter anskaffelse...` with an emoji search icon. The Analysebordet design direction is "dense, precise, professional" — "Not: warm, friendly, spacious." Emoji breaks this tone.

**Fix:** Use a simple SVG search icon (16×16, `--ink-ghost` stroke) or plain text placeholder without icon. Match the evaluation setup page's Picker component, which already has this pattern.

---

## Part 3: Content

### HIGH — Section numbering vs. actual document structure

The tech plan lists 19 sections (§ 1–19) in a flat sequence. But the Python generator (`docx_del2.py`, `docx_del3.py`) structures the document with **nested headings**:

```
RAMMEVERK
  1. Generell informasjon
  2. Prosedyre
  3. Kunngjøring
DIALOG OG AVKLARING
  4. Dialog/forhandlinger
  5. Ettersending
KVALIFISERING
  6. Kvalifikasjonskrav
  ...
```

The design spec flattens this into 19 equal accordion sections. This loses the document's chapter structure. When an innkjøper reads the final Word document, they see grouped chapters. The web form should mirror this structure so the mental model transfers.

**Fix:** Add chapter groupings as visual separators in the accordion:

```
──── RAMMEVERK ────────────────────────────────────────────────
▸  1   Generell informasjon                        ✓  AUTO
▸  2   Prosedyre                                   ◐  DELVIS
▸  3   Kunngjøring                                 ✓  AUTO
──── KVALIFISERING ────────────────────────────────────────────
▸  4   Kvalifikasjonskrav                          ✓  AUTO
▸  5   Kvalifikasjonsvurdering                     ○  MANGLER
```

Chapter labels: 10px, uppercase, `--ink-ghost`, letter-spacing 0.12em, `--wire` border top/bottom. Not collapsible — they're landmarks, not containers.

---

### HIGH — Progress denominator includes N/A sections

The progress strip shows "12 av 19 seksjoner." But sections like "Rammeavtaler" (§ 15) and "Forhandlinger/dialog" (§ 12) may be N/A for a given procurement. If 4 sections are N/A, the real denominator is 15, not 19.

Showing "12/19" when the true target is "12/15" understates progress. The user feels 63% done when they're actually 80% done. For a compliance form where motivation matters, this is demoralizing.

**Fix:** Exclude N/A sections from the count. Show "12 av 15 seksjoner" with a parenthetical "(4 ikke relevant)" in `--ink-ghost` if needed.

---

### MEDIUM — § 14 shows "Auto-filled: winning supplier, scores" but source is unclear

The tech plan puts "kobling mellom evaluering → protokoll" explicitly out of scope. Yet the design shows auto-filled award data (winning supplier, scores) in § 14. The Artifik API's AWARDING_PARTICIPANTS activity gives participant names and award status, not evaluation scores.

Where do the scores come from? If they don't come from the evaluation store, § 14's "auto-filled" status badge (✓ AUTO) is wrong — those fields are manual.

**Fix:** Clarify the data source. § 14 auto-fills only what the API provides: winning supplier name, contract value, and awarding date. Evaluation scores (if shown) must come from the evaluation store — and that integration is out of scope. Mark § 14 as ◐ DELVIS by default: auto-filled award metadata + manual tildelingsbegrunnelse.

---

## Part 4: Structure

### MEDIUM — localStorage for legal document drafts

The spec prescribes `localStorage` auto-save (debounced 500ms) for all manual fields. Concerns:

1. **Size limit:** localStorage allows 5–10MB per origin. A Tipex rich-text begrunnelse stores HTML. Five A4 pages of formatted text ≈ 30–80KB of HTML. With 19 sections × multiple fields × drafts for different procurements, this approaches the limit.
2. **No cleanup:** No mention of evicting old drafts. A user working on 20 procurements over months accumulates stale data.
3. **No export/import:** If localStorage is cleared (browser reset, new device), all draft data is lost. For a legal document, this is unacceptable.

**Fix:** Keep localStorage as immediate draft cache (it's fast, synchronous, good UX). But add:
- Key structure: `protokoll:{procurementId}` to isolate procurement drafts
- Size monitoring: warn if approaching 4MB total
- Future: API endpoint for server-side draft persistence (out of current scope but design for it — the store should abstract storage behind an interface, not hardcode localStorage)

---

### LOW — Skeleton loading: randomized widths

The spec describes skeleton lines with "60-80% width (randomized)." Randomization is a playful, consumer-app pattern. The Analysebordet is a precise, technical workspace. Skeletons should match expected content proportions.

**Fix:** Use fixed widths that approximate real content: label column = 160px, value column = ~200px. For section headers, skeleton matches full row width.

---

## Summary

### Design Spec Issues

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| P1 | Auto-grow begrunnelse creates unbounded scroll | **CRITICAL** | Scroll |
| P2 | Accordion single/multiple is a non-decision | **CRITICAL** | Interaction |
| P3 | No sticky section headers | HIGH | Scroll |
| P4 | Progress feedback scrolls off-screen | HIGH | Scroll |
| P5 | § prefix collides with legal references | HIGH | Content |
| P6 | Sticky footer width unspecified | HIGH | Layout |
| P7 | § 14 data source unclear (scores vs. API) | HIGH | Content |
| P8 | Progress denominator includes N/A sections | HIGH | Content |
| P9 | Flat section list loses document chapter structure | HIGH | Content |
| P10 | Info table labels right-aligned | MEDIUM | Craft |
| P11 | Tipex toolbar items unspecified | MEDIUM | Craft |
| P12 | No character count on begrunnelse fields | MEDIUM | Craft |
| P13 | Emoji in search placeholder | MEDIUM | Tone |
| P14 | localStorage size/cleanup strategy | MEDIUM | Architecture |
| P15 | Skeleton randomized widths | LOW | Craft |

### Recommended Priority

**Must fix before implementation** (architectural):
1. P1 — max-height on Tipex editors
2. P2 — decide: multiple expansion + "Lukk alle"
3. P3 — sticky section headers
4. P4 — progress in sticky footer

**Fix in design spec** (before building components):
5. P5 — drop § prefix
6. P6 — footer width decision
7. P9 — chapter groupings
8. P8 — N/A section count
9. P7 — § 14 data source

**Fix during implementation** (component-level):
10. P10–P15 — craft and structural items
