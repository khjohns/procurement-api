# Plan: Fleksibel kriteriemodell med ressursevaluering

## Fem endringer

1. **Kriterier uten underkriterier** — bladkriterier med direkte scoring og vekt
2. **Ressursevaluering på kriterienivå** — underkriterier blir momenter
3. **Rename «Dimensjon» → «Moment»** — konsekvent terminologi
4. **Alltid redigerbar matrise** — fjern binært skille mellom oppsett og evaluering
5. **Rollebasert ressursoppsett** — definer roller én gang, navngi per leverandør

## Ny kriteriemodell — tre moduser

```
Modus 1: Bladkriterium (subcriteria.length === 0, evaluationType !== 'item')
  «Pris» (30%) → direkte score per leverandør

Modus 2: Tradisjonelt (subcriteria.length > 0, evaluationType !== 'item')
  «Kvalitet» (40%)
    ├─ Funksjonalitet (20%)
    └─ Brukervennlighet (20%)

Modus 3: Ressursevaluering (evaluationType === 'item', subcriteria = momenter)
  «Kompetanse» (30%) [RESSURS-modus]
    Roller: Prosjektleder, Utvikler, Arkitekt    ← felles for alle leverandører
    Momenter:
      ├─ Erfaring (40%)       ← moment (underkriterium)
      ├─ Utdanning (30%)      ← moment
      └─ Sertifiseringer (30%) ← moment

    Leverandør A:
      Prosjektleder: «Ola Nordmann»    ← bare identifikasjon
      Utvikler: «Kari Hansen»
      Arkitekt: «Per Olsen»
    Leverandør B:
      Prosjektleder: «Anna Svensson»
      ...
```

## Endring 4: Alltid redigerbar matrise

### Problem
I dag er det et binært skille: man er i «oppsett» (SetupEmptyState) helt til `isReady` slår inn, da er man i «evaluering» og kan ikke endre kriterier/leverandører.

### Løsning
- **Fjern SetupEmptyState som egen tilstand**. Konfigurasjon skjer *inline* i matrisen.
- Kriterier, leverandører og vekter kan alltid redigeres — også etter at scoring har startet.
- `isReady` brukes kun til å vise/skjule resultater og rangering, ikke til å låse redigering.
- I EvaluationMatrix: legg til «+ Legg til kriterium» og «+ Legg til leverandør» i matrisen.
- Vektredigering er alltid tilgjengelig (toggle edit-modus i headeren).

### Konsekvenser
- SetupEmptyState forenkles eller fjernes — konfigurasjonslogikken flyttes inn i matrisen
- EvaluationMatrix får inline-redigering av kriterienavn, vekt, modus
- Ingen state-gate mellom oppsett og evaluering

## Endring 5: Rollebasert ressursoppsett

### Problem
I dag legges ressurser til én og én, per leverandør. Man vet vanligvis på forhånd hvilke roller (prosjektleder, utvikler, etc.) som skal evalueres.

### Løsning — `roles` på kriterienivå

**Datamodell:**
```typescript
interface Criterion {
  // ...eksisterende felter...
  roles?: Role[];  // defineres én gang, gjelder alle leverandører
}

interface Role {
  id: string;
  name: string;      // "Prosjektleder", "Utvikler", etc.
}

// items endres: key er nå `${supplierId}-${roleId}`
// EvaluationItem får rollekobling:
interface EvaluationItem {
  id: string;
  roleId: string;    // kobler til Role
  label: string;     // personnavn — ren identifikasjon
  scores: Record<string, number>;  // momentId → score
  notes?: Record<string, string>;
}
```

**Oppsett-flyt:**
1. Bruker aktiverer ressursmodus på kriteriet
2. Definerer roller: «Prosjektleder», «Utvikler», «Arkitekt»
3. Definerer momenter (underkriterier): «Erfaring», «Utdanning», etc.
4. For hver leverandør: navngir personen i hver rolle

**UI i matrise/CriterionView:**
```
              Leverandør A                    Leverandør B
              Prosjektl.  Utvikler  Arkitekt  Prosjektl.  Utvikler  Arkitekt
Erfaring      [7]        [8]       [6]       [5]        [9]       [7]
Utdanning     [8]        [7]       [8]       [6]        [8]       [6]
Sertifis.     [9]        [6]       [7]       [7]        [7]       [8]
```

**Aggregering:**
- Per rolle: vektet snitt av momentscores → rollescore
- Per leverandør: gjennomsnitt (eller minimum) av rollescores → leverandørscore for kriteriet

### Metoder
- `addRole(criterionId, name)` — legg til rolle
- `removeRole(criterionId, roleId)` — fjern rolle
- `renameRole(criterionId, roleId, name)` — endre rollenavn
- `setRoleLabel(criterionId, supplierId, roleId, label)` — sett personnavn
- `setRoleScore(criterionId, supplierId, roleId, momentId, value)` — sett score
- `setRoleNote(criterionId, supplierId, roleId, momentId, text)` — sett notat

## Steg 1: Store (evaluation.svelte.ts)

### Typeendringer

**Criterion** — nye felter:
```typescript
interface Criterion {
  // eksisterende...
  scores?: Record<string, number>;    // direkte scoring (modus 1)
  evaluationType?: 'simple' | 'item'; // ressursmodus (modus 3)
  roles?: Role[];                     // roller (modus 3) — felles for alle leverandører
  items?: Record<string, EvaluationItem[]>; // `supplierId` → ressurser (med roleId)
  aggregation?: AggregationMethod;    // 'average' | 'minimum'
}

interface Role {
  id: string;
  name: string;
}
```

**Subcriterion i modus 3** fungerer som «moment» (evalueringsmoment). Ingen typeendring nødvendig — bare ny terminologi i UI.

### Beregningsendringer

**isReady** — mykere krav, brukes kun for resultater:
```typescript
isReady = $derived(
  this.data.suppliers.length >= 2 &&
  this.data.criteria.length > 0 &&
  this.data.criteria.every((c) => c.weight > 0)
);
```

**groupScores**: Tre greiner:
```typescript
for (const criterion of this.data.criteria) {
  result[criterion.id] = {};
  for (const supplier of this.data.suppliers) {
    if (criterion.evaluationType === 'item') {
      // Modus 3: roller × momenter (underkriterier)
      const items = criterion.items?.[supplier.id] ?? [];
      // Aggreger: per rolle → vektet snitt av momentscores
      // Per leverandør → snitt/min av rollescores
      result[criterion.id][supplier.id] = aggregateRoleScores(
        items, criterion.subcriteria, criterion.aggregation ?? 'average'
      );
    } else if (criterion.subcriteria.length === 0) {
      // Modus 1: bladkriterium
      result[criterion.id][supplier.id] = criterion.scores?.[supplier.id] ?? 0;
    } else {
      // Modus 2: tradisjonelt
      result[criterion.id][supplier.id] = weightedAverage(
        criterion.subcriteria, supplier.id, this.itemScores
      );
    }
  }
}
```

**priceDeductions**: Håndter modus 1 og 3.

**progress**: Telle celler for alle tre moduser. Modus 3: roller × momenter × leverandører.

**bestScores**: Håndter bladkriterier og criterion-level items.

**weightWarnings**: Sjekk for modus 2 (underkriterie-vekter) og modus 3 (momentvekter).

### Nye mutasjonsmetoder

Bladkriterier (modus 1):
- `setCriterionScore(criterionId, supplierId, value)`

Ressursmodus (modus 3):
- `setCriterionEvaluationType(criterionId, type)`
- `setCriterionAggregation(criterionId, method)`
- `addRole(criterionId, name)`
- `removeRole(criterionId, roleId)`
- `renameRole(criterionId, roleId, name)`
- `setRoleLabel(criterionId, supplierId, roleId, label)` — personnavn
- `setRoleScore(criterionId, supplierId, roleId, momentId, value)`
- `setRoleNote(criterionId, supplierId, roleId, momentId, text)`

Konfigurasjon (alltid tilgjengelig):
- `setCriterionWeight(criterionId, weight)` — direkte vektsetting
- `renameCriterion(criterionId, name)`

### addCriterion endring

Opprett uten subcriteria (bladkriterium som default):
```typescript
addCriterion(name, type): string {
  // Opprett uten subcriteria — bladkriterium
  // Bruker kan legge til underkriterier eller aktivere ressursmodus etterpå
}
```

## Steg 2: UI — Inline konfigurasjon i EvaluationMatrix

Siden matrisen alltid er redigerbar, flyttes konfigurasjonslogikk hit:
- **Kriterierader**: Klikk for å redigere navn, vekt, modus
- **Modus-velger**: Dropdown/toggle: Enkel | Ressurs | + Underkriterier
- **«+ Kriterium»**: Rad nederst i matrisen
- **«+ Leverandør»**: Kolonne til høyre
- **Ressursmodus-konfig**: Ekspanderbar seksjon for roller og momenter

## Steg 3: UI — EvaluationMatrix.svelte

- **Modus 1**: Kriterierad med direkte ScoreCell (ingen sub-rader)
- **Modus 3**: Kriterierad med drilldown, ekspanderer til ItemEvaluationPanel med rollestruktur
  - Sub-rader viser momentene med beregnede scores fra roller
- **Modus 2**: Som i dag

## Steg 4: UI — CriterionView.svelte

- **Modus 1**: Enkel tabell, én rad per leverandør med direkte score
- **Modus 3**: Rollematrise — rader = momenter, kolonner = roller gruppert per leverandør
- **Modus 2**: Som i dag

## Steg 5: UI — ItemEvaluationPanel.svelte

- Støtte criterion-level roller (momenter = underkriterier, kolonner = roller)
- Score-keys bruker subCriterionId (momentId)

## Steg 6: UI — JustificationPanel.svelte

- Håndter bladkriterier (direkte notat)
- Håndter criterion-level roller (per-rolle notater)

## Steg 7: UI — OverviewMatrix.svelte

- Tilpass for tre moduser
- Vis evaluationType-indikator

## Steg 8: Rename «Dimensjon» → «Moment»

- Alle UI-steder med "Dimensjon" → "Moment"
- "Dimensjoner" → "Momenter"
- "Legg til Dimensjon" → "Legg til moment"

## Steg 9: Fjern/forenkle SetupEmptyState

- SetupEmptyState beholdes kun for initial tom tilstand (ingen kriterier/leverandører)
- All konfigurasjonslogikk som finnes der flyttes til inline-redigering i matrisen

## Rekkefølge

1. Store-endringer (typer, beregninger, metoder)
2. EvaluationMatrix (inline konfig + tre moduser)
3. CriterionView (detaljvisning med roller)
4. ItemEvaluationPanel (rolle-scoring)
5. JustificationPanel (begrunnelser)
6. OverviewMatrix (oversikt)
7. SetupEmptyState (forenkle/fjerne)
8. Rename dimensjon → moment (alle komponenter)
9. Type-check (`npx svelte-check --threshold error`)
