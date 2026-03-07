# Plan: Slå sammen ny evaluering og evaluering til én side

## Bakgrunn

Dagens flyt: `/evaluering/ny` → bruker fyller inn oppsett → `evaluation.initialize()` → redirect til `/evaluering`. Problemet:
1. `initialize()` overskriver all state — justeringer under evaluering krever å starte på nytt
2. Kriterier kan hentes fra API (eForms), så oppsett er lettere enn en egen side tilsier
3. Designprinsippet «Analysebordet» skiller konfigurasjon fra arbeid i *soner*, ikke *sider*

## Arkitekturendringer

### 1. Store: Fra `initialize()` til granulære mutasjoner

**Fil:** `src/frontend/src/lib/stores/evaluation.svelte.ts`

Nye metoder på `EvaluationStore`:

```ts
// Erstatter initialize() for import-bruk
importFromEforms(eforms: EFormsData, procurement: ProcurementSummary): void
// Merger criteria inn — bevarer eksisterende scores der IDer matcher

// Struktur-mutasjoner (allerede delvis der via setCriterionWeight/setSubCriterionWeight)
addCriterion(name: string, type: 'quality' | 'price'): string  // returns id
removeCriterion(criterionId: string): void
renameCriterion(criterionId: string, name: string): void
reorderCriteria(fromIndex: number, toIndex: number): void

addSubCriterion(criterionId: string, name: string, weight: number): string
removeSubCriterion(subCriterionId: string): void
renameSubCriterion(subCriterionId: string, name: string): void
reorderSubCriteria(criterionId: string, fromIndex: number, toIndex: number): void

addSupplier(name: string, price?: number): string
removeSupplier(supplierId: string): void  // cascades: fjerner scores, notes, items
renameSupplier(supplierId: string, name: string): void

setTitle(title: string): void
setReference(reference: string): void
setContractValue(value: number): void
setQualityPriceWeights(quality: number, price: number): void
```

Ny derived:

```ts
/** True når minimumsdata er på plass for å vise matrisen. */
isReady = $derived(
  this.data.suppliers.length >= 2 &&
  this.data.criteria.length > 0 &&
  this.data.criteria.every(c => c.subcriteria.length > 0)
);

/** True når vekter summerer til 100. */
weightsValid = $derived(this.totalWeight === 100);
```

Endre default initial state til tom evaluering:

```ts
data = $state<EvaluationData>({
  id: '', title: '', procurementName: '', reference: '',
  status: 'Oppsett',
  qualityWeight: 0, priceWeight: 0,
  contractValue: 0,
  suppliers: [],
  criteria: []
});
```

Demo-data lastes via en eksplisitt `evaluation.loadDemo()` eller URL-parameter.

### 2. Slett `/ny`-ruten, utvid `/evaluering`

**Slett:** `src/frontend/src/routes/anskaffelser/[id]/evaluering/ny/+page.svelte`

**Endre:** `src/frontend/src/routes/anskaffelser/[id]/evaluering/+page.svelte`

Ny logikk: Siden viser enten **oppsett-modus** eller **arbeids-modus** basert på `evaluation.isReady`:

```svelte
{#if !evaluation.isReady}
  <!-- Oppsett: Empty state + høyrepanel med import/config -->
  <SetupEmptyState />
{:else}
  <!-- Arbeid: Eksisterende matrise-layout -->
  {#if isPriceMode}
    <PriceMatrix />
  {:else if isOverview}
    <OverviewMatrix />
  {:else if activeCriterion}
    <CriterionView criterionId={activeCriterion.id} />
  {/if}
{/if}
```

Høyrepanelet endrer innhold basert på kontekst:

| Tilstand | Høyrepanel |
|---|---|
| `!isReady` | Import-søk + leverandør-liste + oppsett-felter |
| `isReady && isOverview` | Rangering + nøkkeltall + oppsett-toggle |
| `isReady && activeCriterion` | Begrunnelse |

### 3. Nye komponenter

#### `SetupEmptyState.svelte`
Vises i eval-main når `!isReady`. Visuelt konsistent med matrise-estetikken:
- Vektlinjen (amber spine) langs venstre kant
- Tekst: «Importer kriterier fra Doffin, eller legg til manuelt»
- Viser kriterier inline med redigerbare vekter så snart de finnes (re-use fra eksisterende kriterium-editor i ny-siden, men som matrise-rader)

#### `SetupPanel.svelte`
Høyrepanel-innhold for oppsett-modus:
- Import-søk (erstatter mock-data med ekte API-kall til `/api/eforms/{doffinId}`)
- Leverandør-liste med add/remove
- Kontraktsverdi-input
- Kvalitet/pris-vekting
- «Start evaluering»-indikator (checklist: ≥2 leverandører, ≥1 kriterium, vekt=100%)

#### `SetupToggle.svelte`
Liten toggle-knapp i høyrepanelet (synlig kun i arbeids-modus, overview):
- Lukket: tannhjul-ikon
- Åpen: viser SetupPanel inline i panelet (erstatter rangering midlertidig)
- Lar brukeren justere oppsett uten å miste scores

### 4. Inline-redigering i matrisen

Utvid `OverviewMatrix.svelte`:
- **Vekt-kolonnen:** Klikk → inline `<input type="number">` (allerede visuelt definert i system.md weight column)
- **Kriterium-navn:** Dobbeltklikk → inline `<input type="text">`
- **Legg til rad:** `+ Underkriterium`-rad nederst i hver gruppe (samme mønster som ny-sidens `add-sub-btn`)
- **Legg til kolonne:** `+`-knapp etter siste leverandør-header → åpner navn-input
- **Fjern:** Hover på rad/kolonne → subtle `×`-knapp (opacity 0→1 on hover, rose on hover)
- Alle endringer går via store-metoder, scores bevares automatisk

### 5. API-integrasjon for import

**Erstatt mock-data med ekte API-kall:**

1. Frontend søker `/api/procurements/mature` → viser liste
2. Bruker velger anskaffelse → frontend henter:
   - Anskaffelsesdata fra `/api/procurements/{id}` (tittel, referanse)
   - eForms fra `/api/eforms/{doffinId}` (tildelingskriterier med vekter)
   - Aktiviteter fra `/api/procurements/{id}/activities` (leverandører via `SUBMIT_BID`)
3. `evaluation.importFromEforms()` setter kriterier + leverandører

Doffin-ID hentes fra anskaffelsens aktiviteter (ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED → `description.doffinNotice.reference`).

Leverandører fra aktiviteter:
```ts
activities
  .filter(a => a.action === 'SUBMIT_BID')
  .map(a => ({ name: getOrgName(a), id: uid('sup') }))
```

### 6. Navigasjonsendringer

- Fjern lenke til `/evaluering/ny` fra saksmappen
- Saksmappen lenker direkte til `/evaluering` — viser oppsett om tomt, matrise om data
- Breadcrumb: «Ny evaluering» → «Evaluering» (alltid)
- Oppdater `+layout.svelte` subRoute-logikk (fjern `/ny`-sjekk)

### 7. Oppdater system.md

Dokumenter den nye sone-baserte tilnærmingen i stedet for side-basert oppsett.

## Implementeringsrekkefølge

1. **Store-utvidelse** — Legg til mutasjonsmetoder, endre default til tom state, legg til `isReady`/`weightsValid`
2. **SetupPanel + SetupEmptyState** — Nye komponenter for oppsett-sonen
3. **Evalueringssiden** — Integrer oppsett/arbeid-logikk, flytt import hit
4. **Inline-redigering** — Utvid OverviewMatrix med editering av vekter/navn
5. **API-integrasjon** — Erstatt mock med ekte Doffin/Artifik-kall
6. **Opprydding** — Slett `/ny`-ruten, oppdater navigasjon, oppdater system.md
7. **Demo-data** — Flytt til lazy-load via URL-parameter eller dev-knapp
