# Plan: Reduser kompleksitet i evalueringsmodulen

**Dato:** 2026-03-13
**Status:** Forslag
**Berørte filer:** Frontend evaluerings-komponenter og stores

## Bakgrunn

Syklomatisk kompleksitet-analyse viser tre problematiske filer:

| Fil | CC | Linjer |
|---|---|---|
| `evaluation.svelte.ts` | 292 | 1170 |
| `protokoll.svelte.ts` | 116 | 451 |
| `CriterionView.svelte` | 84 | 1980 |

Rotårsakene er:
- **CriterionView**: Tre helt ulike modus-views (leaf/resource/traditional) i én komponent, pluss duplisert normal/transponert template
- **evaluation.svelte.ts**: ~40 mutasjonsmetoder med repetitivt find-then-mutate mønster, og store `$derived`-beregninger som inneholder modus-forgreninger
- **protokoll.svelte.ts**: `_fieldFilled()` switch-case tett koblet til feltdefinisjoner i annen fil

## Svelte 5-features som muliggjør refaktoreringen

### Snippets (`{#snippet}` + `{@render}`)
Svelte 5 erstatter slots med snippets — gjenbrukbare markup-blokker innenfor og mellom komponenter. Snippets kan ta parametere, har tilgang til komponent-state, og kan sendes som props til child-komponenter. Typing via `Snippet<[ParamTypes]>` fra `'svelte'`.

- **Docs:** https://svelte.dev/docs/svelte/snippet
- **Render:** https://svelte.dev/docs/svelte/@render
- **Tutorial:** https://svelte.dev/tutorial/svelte/snippets-and-render-tags

Brukes i Oppgave 1 for å dele felles markup (weight-editor, score-celler) mellom modus-komponenter uten duplisering, og for å eliminere normal/transponert template-duplisering.

### Runes utenfor komponenter
`$state` og `$derived` fungerer i `.svelte.ts`-filer. Rene beregningsfunksjoner som ikke bruker runes kan bo i vanlige `.ts`-filer — storen wrapper dem i `$derived`.

- **Docs:** https://svelte.dev/docs/svelte/$derived
- **Migrering:** https://svelte.dev/docs/svelte/v5-migration-guide
- **Merk:** `$derived` er grunn-reaktiv — sørg for at alle avhengigheter sendes som eksplisitte argumenter til ekstraherte funksjoner.

### `$bindable` rune
For two-way binding i custom komponenter (brukes i Oppgave 3 for InlineNumberEditor).

## Arkitekturprinsipper (fra CLAUDE.md/ADR-003)

- Svelte 5 runes (`$state`, `$derived`) — ingen `$effect` for beregninger
- Klasse-baserte stores i `.svelte.ts` med modul-nivå singleton
- Beregnet kjede: scores → itemScores → groupScores → totals → ranking → priceDeductions → evaluatedPrices

## Oppgaver

### Oppgave 1: Splitt CriterionView i modus-komponenter

**Mål:** Reduser CriterionView fra CC 84 / 1980 linjer til en tynn dispatcher + tre fokuserte komponenter.

**Hva skal gjøres:**
- Behold `CriterionView.svelte` som en shell med navigasjonsbar og `{#if mode}` dispatch
- Flytt leaf-modus template (linje 192–275) til `CriterionLeafView.svelte`
- Flytt resource-modus template (linje 276–478) til `CriterionResourceView.svelte`
- Flytt traditional-modus template (linje 479–885) til `CriterionTraditionalView.svelte`
- Bruk Svelte 5 snippets for delt markup (weight-editing, score-celler) — definer i shell, send som snippet-props
- Flytt tilhørende scoped CSS med hver komponent
- Relaterte hjelpefunksjoner (`getRoleItem`, `getRoleScore`, etc.) følger med komponenten som bruker dem

**Verifikasjon:** `npm run check` (type-check) og manuell visuell test av alle tre modi.

### Oppgave 2: Ekstraher beregningsfunksjoner fra EvaluationStore

**Mål:** Reduser CC i evaluation.svelte.ts med ~50 poeng og gjør kjernelogikken unit-testbar.

**Hva skal gjøres:**
- Opprett `src/frontend/src/lib/stores/evaluation-computations.ts` (vanlig `.ts` — dette er rene funksjoner)
- Flytt disse beregningene ut som eksporterte funksjoner:
  - `computeProgress(criteria, suppliers)` — fra `progress` $derived (linje 474–547)
  - `computePriceDeductions(criteria, suppliers, contractValue, qualityWeight)` — fra `priceDeductions` $derived (linje 393–424)
  - `computeGroupScores(criteria, suppliers, activeMethod, itemScores, priceFormulaScores)` — fra `groupScores` $derived (linje 318–353)
  - `computeBestScores(criteria, itemScores)` — fra `bestScores` $derived (linje 550–565)
- Storen beholder `$derived`-wrappere som kaller de nye funksjonene
- Eksisterende type-eksporter (`Criterion`, `Supplier`, etc.) forblir i `evaluation.svelte.ts`

**Verifikasjon:** `npm run check`, og verifiser at eksisterende funksjonalitet er uendret.

### Oppgave 3: Ekstraher InlineNumberEditor-komponent

**Mål:** Eliminer duplisert inline-editing pattern i CriterionView og eventuelle andre steder.

**Hva skal gjøres:**
- Opprett `src/frontend/src/lib/components/evaluation/InlineNumberEditor.svelte`
- Komponenten håndterer: visning av verdi → klikk for å editere → input med Enter/Escape/blur → commit callback
- Props: `value`, `min`, `max`, `suffix` (f.eks. "%"), `formatter`, `oncommit`
- Bruk `$bindable` for two-way binding der det gir mening
- Erstatt weight-editing mønsteret og role-score-editing mønsteret i CriterionView (etter Oppgave 1: i de nye modus-komponentene)

**Verifikasjon:** `npm run check`, visuell test at editing fungerer som før.

### Oppgave 4: Flytt feltstatuslogikk til protokoll-sections

**Mål:** Reduser CC i protokoll.svelte.ts med ~15 ved å kolokalisere statuslogikk med feltdefinisjoner.

**Hva skal gjøres:**
- Utvid `FieldDefinition` i `protokoll-sections.ts` med en valgfri `computeFilled(value, context)` metode
- Flytt logikken fra `_fieldFilled()` switch-casen (linje 185–240 i protokoll.svelte.ts) til respektive felttyper
- `_fieldFilled()` i storen delegerer til `field.computeFilled()` om den finnes, med fallback for bakoverkompatibilitet
- Storen forblir ansvarlig for å sette sammen seksjon-status fra felt-statuser

**Verifikasjon:** `npm run check`, verifiser at protokoll-seksjonsstatus beregnes korrekt.

### Oppgave 5: Grupper mutasjonsmetoder i EvaluationStore

**Mål:** Reduser CC i evaluation.svelte.ts med ~30 og forbedre navigerbarhet.

**Hva skal gjøres:**
- Opprett delegate-objekter for relaterte mutasjoner, f.eks.:
  - `evaluation-items.svelte.ts` — item/resource CRUD (addItem, removeItem, setItemScore, setItemNote, etc.)
  - `evaluation-roles.svelte.ts` — role CRUD (addRole, removeRole, setRoleScore, setRoleNote, etc.)
  - `evaluation-structure.svelte.ts` — strukturelle endringer (addCriterion, addSubCriterion, reorder, etc.)
- Storen delegerer til disse, og beholder public API uendret (metodene finnes fortsatt på storen)
- Alternativ: flytt til frie funksjoner som tar `data: EvaluationData` som parameter

**Viktig:** Denne oppgaven gjøres SIST — etter at beregningene (Oppgave 2) allerede er ute, slik at klassen er lettere å jobbe med.

**Verifikasjon:** `npm run check`, verifiser at alle mutasjoner fungerer fra UI.

## Rekkefølge og avhengigheter

```
Oppgave 1 (CriterionView splitt)     — ingen avhengigheter, størst visuell gevinst
    ↓
Oppgave 3 (InlineNumberEditor)       — avhenger av Oppgave 1 (jobber med nye filer)

Oppgave 2 (Ekstraher beregninger)    — uavhengig, kan gjøres parallelt med 1
    ↓
Oppgave 5 (Grupper mutasjoner)       — avhenger av Oppgave 2

Oppgave 4 (Protokoll feltlogikk)     — helt uavhengig
```

Oppgave 1, 2 og 4 kan alle startes parallelt.

## Hva vi IKKE gjør

- Endrer ikke evalueringslogikk eller forretningsregler
- Endrer ikke public API til EvaluationStore (alle eksisterende kall-sider forblir uendret)
- Legger ikke til nye features
- Endrer ikke design-systemet eller CSS custom properties
- Rører ikke de andre filene i kompleksitetslisten (PriceMatrix, SetupPanel, etc.) — disse kan tas i en fremtidig runde
