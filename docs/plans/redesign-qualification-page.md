# Plan: Redesign kvalifikasjonssiden

## Designintensjon

Kvalifikasjonssiden redesignes etter **samme to-panels workspace-mønster** som evalueringssiden, men med to viktige forskjeller:

1. **Ingen vektlinje** — kvalifisering er binær (oppfylt/ikke oppfylt), ingen vekting. Strukturell spine er `--wire-strong`, ikke amber.
2. **Lagdelt visning** — oversiktsmatrise → drill-down per krav (speiler evaluering: oversikt → kriterievisning).

## Arkitektur

### Visningsmodell (speiler evaluering)

```
activeView: 'overview' | reqId
```

- **Oversikt** (`activeView === 'overview'`): Kompakt matrise med alle krav × alle leverandører. Klikkbar rad → navigerer til kravvisning.
- **Kravvisning** (`activeView === reqId`): Detaljvisning for ett krav med alle leverandører. Navigasjonsbar (← Oversikt, ‹ forrige / neste ›). Her lever QualificationPanel-innholdet (dokumentasjon, grunnlag, vurdering, begrunnelse) — ett panel per leverandør, stablet vertikalt.

### Høyrepanel (300px, speiler evaluering)

Innhold skifter basert på `activeView`:

**Oversikt:**
- KVALIFIKASJONSSTATUS label
- Leverandørkort (kompakt, speiler RankingStrip-mønsteret — ikke brede kort):
  - Rad per leverandør: verdickt-ikon (✓/✗/—) + navn + `met/total` fraksjon
  - Leder-leverandør (kvalifisert) får grønn `--score-high` aksent
  - Avvist får rose `--score-low` aksent
  - Uavklart: `--ink-ghost`
  - Progressbar (2px) under hver rad
- Status i bunn (`margin-top: auto`): status label + progress fraksjon

**Kravvisning:**
- Kravinformasjon: navn + beskrivelse
- Leverandørstatus for dette kravet (kompakt liste)

### Komponentstruktur

```
+page.svelte (workspace shell)
├── QualificationOverview.svelte     (NY — kompakt matrise, klikkbare rader)
├── RequirementView.svelte           (NY — drill-down per krav)
├── QualificationStatusPanel.svelte  (NY — høyrepanel, kompakt leverandørstatus)
├── QualificationCell.svelte         (eksisterer — gjenbrukes i oversikten)
└── QualificationPanel.svelte        (eksisterer — innholdet flyttes inn i RequirementView)
```

### Store-endring

Legg til `activeView` state i QualificationStore:
```typescript
activeView = $state<string>('overview');
setActiveView(view: string) { this.activeView = view; }
```

## Implementeringssteg

### 1. Store: Legg til `activeView`
- `qualification.svelte.ts`: Legg til `activeView = $state('overview')` og `setActiveView()`

### 2. QualificationOverview.svelte (ny)
- Kompakt oversiktsmatrise (som nåværende QualificationMatrix, men uten inline panel-ekspansjon)
- Klikkbar rad → `qualification.setActiveView(req.id)`
- Fjern progress-indikatorer (flyttes til panel)
- Behold resultatrad i bunnen

### 3. RequirementView.svelte (ny)
- Navigasjonsbar: ← Oversikt | ‹ Kravnavn › | (speiler CriterionView.criterion-nav)
- Per leverandør: en "seksjon" med leverandørnavn, og deretter QualificationPanel-innholdet (dokumentasjon, grunnlag, vurdering, begrunnelse) — direkte synlig, ikke bak ekspansjon
- Left spine: `--wire-strong` (ikke amber)

### 4. QualificationStatusPanel.svelte (ny)
- RankingStrip-mønster: kompakte rader, ikke brede kort
- Leverandør-ikon (✓/✗/—) + navn + `met/total`
- 2px progressbar per leverandør
- Status strip i bunn

### 5. +page.svelte (omskriving)
- Workspace layout (`.qual-workspace` = `.eval-workspace`-mønsteret)
- Venstre: kontekstlinje + {#if overview} QualificationOverview {:else} RequirementView
- Høyre: QualificationStatusPanel
- Mobilresponsivitet: slide-in panel, floating toggle, backdrop

### 6. Opprydding
- QualificationSummary.svelte: slett (erstattes av QualificationStatusPanel)
- QualificationMatrix.svelte: slett (erstattes av QualificationOverview)
- QualificationPanel.svelte: beholdes som intern komponent i RequirementView, eller innholdet flyttes direkte
