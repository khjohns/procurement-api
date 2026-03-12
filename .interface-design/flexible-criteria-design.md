# Design Exploration — Fleksibel kriteriemodell

## Intent

**Who is this human?** En innkjøper i norsk offentlig sektor. Sitter med et tilbudsbord foran seg — kanskje 3–5 leverandører, kanskje 3–8 kriterier. Noen kriterier er enkle (pris, leveringstid), andre er komplekse (tilbudt personell med 3 roller × 4 momenter). De har brukt timer på å lese tilbud. Nå skal de strukturere vurderingen.

**What must they accomplish?** Bygge en evalueringsstruktur som passer deres anskaffelse, og fylle den med scores og begrunnelser. Strukturen varierer: noen anskaffelser har bare 2 kriterier uten underkriterier. Andre har 5 kriterier med ressursevaluering. De trenger fleksibilitet uten kompleksitet.

**What should this feel like?** Som å jobbe med et regneark som forstår evalueringsdomenet. Tett, presist, direkte. Ingen veivisere, ingen modale dialoger, ingen faseskiller. Alt er ett ark som de gradvis fyller ut.

---

## Designproblem 1: Binært oppsett/evaluering-skille

### Nåtilstand

`isReady` fungerer som en port: ≥2 leverandører + ≥1 kriterium med underkriterier → matrise. Ellers → SetupEmptyState (fullskjerm editor). Man kan aldri gå tilbake. «⚙ Oppsett»-knappen i panelet åpner en begrenset SetupPanel, men den er ikke den fulle editoren.

### Problem

1. Matrisen «oppstår plutselig» — brukeren kontrollerer ikke overgangen
2. Etter overgang kan man ikke endre struktur (legge til/fjerne kriterier) uten å bruke den begrensede SetupPanel
3. SetupEmptyState og matrisen er to helt separate UI-verdener

### Designretning: Sømløs overgang

**Prinsipp:** Matrisen er alltid synlig, selv med 0 leverandører og 0 kriterier. Den *vokser* etter hvert som brukeren legger til data.

**Implementering:**
- Fjern `isReady` som UI-gate. Behold den kun for å styre om resultater/rangering vises.
- Matrisen har alltid en «+ Legg til kriterium»-rad og «+ Legg til leverandør»-kolonne.
- Kriterienavn, vekt, og type er redigerbare inline (klikk-for-å-redigere).
- SetupEmptyState erstattes av en tynnere «velkomst-stripe» over matrisen når den er tom.

**Velkomst-stripe (tom tilstand):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Importer fra en anskaffelse, eller legg til kriterier manuelt  │
│  [Importer...]                                                   │
└─────────────────────────────────────────────────────────────────┘
```
- `--color-felt` bakgrunn, `--color-wire` border, `--radius-md`
- Tekst: 12px, `--color-ink-secondary`
- Forsvinner så snart det finnes ≥1 kriterium

**Matrix shell (1 kriterium, 0 leverandører):**
```
┌──────────┬─────────────────┬──────────────────┐
│ VEKT     │ KRITERIUM       │ + Leverandør     │
├──────────┼─────────────────┼──────────────────┤
│  30 %    │ Kompetanse  ▼   │                  │
├──────────┼─────────────────┼──────────────────┤
│          │ + Kriterium     │                  │
└──────────┴─────────────────┴──────────────────┘
```

**Konsekvens for SetupEmptyState:** Kan fjernes helt. All konfigurasjon skjer inline.

**Konsekvens for SetupPanel (høyrepanel):** Beholdes for metadata (tittel, referanse, kontraktsverdi, kvalitet/pris-fordeling) som ikke hører hjemme i matrisen.

---

## Designproblem 2: Tre kriteriemoduser

### Modusene

1. **Enkel (blad):** Direkte score per leverandør. Ingen underkriterier. Én rad i matrisen.
2. **Tradisjonell:** Underkriterier med vekter. Flere rader gruppert under kriteriet.
3. **Ressurs:** Roller × momenter. Underkriterier fungerer som momenter (evalueringsdimensjoner).

### Hvordan velge modus?

**Ikke en eksplisitt «modus-velger».** Modus er implisitt fra handlinger:

- Nytt kriterium starter som **enkel** (ingen underkriterier, direkte vekt)
- Bruker klikker «+ Underkriterium» → blir **tradisjonell**
- Bruker aktiverer «Ressurs»-toggle → blir **ressurs**

**Ressurs-toggle** vises kun på kriterienivå (ikke på underkriterier). Den erstatter den eksisterende sub-nivå «Enkel/Ressurs»-togglen:

```
┌──────────┬──────────────────────────────────────────┬─────────┐
│  30 %    │ Kompetanse                               │ Ressurs │
│          │   ├─ Erfaring (40%)                      │   [ON]  │
│          │   ├─ Utdanning (30%)                     │         │
│          │   └─ Sertifiseringer (30%)               │         │
└──────────┴──────────────────────────────────────────┴─────────┘
```

Toggle-stil: Liten pill-toggle (`--color-felt` bg, `--color-wire` border, aktiv = `--color-vekt-bg-strong` bg + `--color-vekt` tekst), 10px uppercase, plassert til høyre i kriterieraden.

### Modus 1: Enkel — matrise-rad

```
┌──────────┬─────────────────┬──────────┬──────────┬──────────┐
│ VEKT     │ KRITERIUM       │ Bouvet   │ Sopra    │ Knowit   │
├──────────┼─────────────────┼──────────┼──────────┼──────────┤
│  30 %    │ Leveringstid    │    7     │    8     │    6     │
├──────────┼─────────────────┼──────────┼──────────┼──────────┤
│  40 %    │ Kvalitet        │   7.2    │   6.8    │   7.5    │
│          │  ─ Funksjon.    │    8     │    7     │    7     │
│          │  ─ Brukerv.     │    6     │    6     │    8     │
└──────────┴─────────────────┴──────────┴──────────┴──────────┘
```

- Bladkriterium ser ut som en grupperrad (amber spine, amber vektbg), men med direkte redigerbare scores
- ScoreCell-styling: Samme som sub-rader (klikkbar, tier-farget), men i grupperadens bakgrunn
- Ingen sub-rader under bladkriteriet
- Klikk på score → AnnotationPanel ekspanderer under (samme mønster som i dag)

### Modus 3: Ressurs — matrise-rad

I oversiktsmatrisen: Grupperrad med aggregerte scores (som tradisjonell). Drilldown viser CriterionView med rollematrise.

```
┌──────────┬─────────────────┬──────────┬──────────┬──────────┐
│  30 %    │ Kompetanse 🔸   │   7.2    │   6.1    │   7.8    │
│          │  ─ Erfaring     │   7.5    │   6.0    │   8.0    │
│          │  ─ Utdanning    │   7.0    │   6.5    │   7.5    │
│          │  ─ Sertifis.    │   7.0    │   5.5    │   8.0    │
└──────────┴─────────────────┴──────────┴──────────┴──────────┘
```

🔸 = ressurs-indikator (liten `--color-vekt` ikon/badge etter kriterienavnet).

Drilldown (CriterionView) viser den fulle rollematrisen — se Designproblem 3.

---

## Designproblem 3: Rollebasert ressursoppsett

### Problem

I dag legger man til ressurser per leverandør, én og én. Brukeren vet vanligvis at de skal evaluere f.eks. 3 roller. Roller er det viktige; navn er identifikasjon.

### Datamodell

Roller defineres på kriterienivå, navn tilordnes per leverandør:

```
Criterion.roles = [
  { id: 'r1', name: 'Prosjektleder' },
  { id: 'r2', name: 'Utvikler' },
  { id: 'r3', name: 'Arkitekt' }
]

Criterion.items['supplier-1'] = [
  { id: 'i1', roleId: 'r1', label: 'Ola Nordmann', scores: {...} },
  { id: 'i2', roleId: 'r2', label: 'Kari Hansen', scores: {...} },
  { id: 'i3', roleId: 'r3', label: 'Per Olsen', scores: {...} }
]
```

### Konfigurasjon — inline i matrisen

Når ressursmodus er aktivert, vises en konfigurasjonsseksjon under kriterieraden:

```
┌──────────────────────────────────────────────────────────────┐
│ ROLLER                                                       │
│  Prosjektleder  ×  │  Utvikler  ×  │  Arkitekt  ×  │  +    │
├──────────────────────────────────────────────────────────────┤
│ MOMENTER (underkriterier som dimensjoner)                    │
│  ─ Erfaring (40%)                                            │
│  ─ Utdanning (30%)                                           │
│  ─ Sertifiseringer (30%)                                     │
│  + Legg til moment                                           │
└──────────────────────────────────────────────────────────────┘
```

**Roller-strip:**
- Horisontal rad med chips: `--color-felt` bg, `--color-wire` border, `--radius-sm`
- Chip-tekst: 12px, `--font-ui`, `--color-ink-secondary`
- Fjern-knapp (×): `--color-ink-ghost`, hover → `--color-score-low`
- «+»-knapp: `--color-wire` border, `--color-ink-ghost` tekst, hover → `--color-vekt-dim`
- Klikk på chip → inline rename

**Momenter** er bare underkriteriene med en «moment»-label. Samme editor som tradisjonelle underkriterier, men med «MOMENTER»-label i stedet for «UNDERKRITERIER».

### CriterionView — rollematrise

Når man driller ned i et ressurskriterium:

```
Kompetanse (30%) — Ressursevaluering       AGGREGERING: ● Gjennomsnitt ○ Minimum
                                            Resultat: 7.2

┌──────────────────┬─────────────────────────────┬─────────────────────────────┐
│                  │ Bouvet                       │ Sopra                       │
│                  │ PL: Ola    Utv: Kari  Ark: Per │ PL: Anna   Utv: Erik  Ark: Li │
├──────────────────┼─────────┬─────────┬─────────┼─────────┬─────────┬─────────┤
│ Erfaring   40%   │    8    │    7    │    6    │    5    │    9    │    7    │
│ Utdanning  30%   │    7    │    8    │    8    │    6    │    7    │    6    │
│ Sertifis.  30%   │    9    │    6    │    7    │    7    │    8    │    8    │
├──────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ ROLLESCORE       │   8.0   │   6.9   │   6.9   │   5.9   │   8.1   │   7.0   │
│ LEVERANDØRSCORE  │         7.3       │         │         7.0       │         │
└──────────────────┴─────────────────────────────┴─────────────────────────────┘
```

**Struktur:**
- Leverandørgrupper: Kolonne-overskrift med leverandørnavn (bold) og rolle-sub-headers
- Rolle-sub-header: Rollenavn (10px, `--color-ink-muted`) + personnavn (11px, `--color-ink-secondary`)
- Rader = momenter (underkriterier), med vekt-kolonne (amber)
- Rollescore-rad: `--color-wire-strong` top-border, font-data 13px weight 600
- Leverandørscore-rad: `--color-canvas` bg, font-data 16px weight 700, span = alle roller per leverandør

**Navngivning av personell:**
- I kolonne-headeren: klikk på personnavn → inline edit
- Placeholder: rollenavnet i kursiv + `--color-ink-ghost`
- Bruker fyller ut navn etter hvert som de leser tilbudene

**Vektlinjen:** Beholdes i moment-rader (faded amber spine, `--color-vekt-dim` vekttall).

---

## Designproblem 4: Rename Dimensjon → Moment

### Begrunnelse

«Dimensjon» er abstrakt og teknisk. «Moment» er norsk juridisk terminologi for evalueringspunkter innenfor et tildelingskriterium. Innkjøpere kjenner ordet.

### Endringer

| Sted | Nå | Nytt |
|---|---|---|
| SetupEmptyState / inline config | «Dimensjoner» | «Momenter» |
| SetupEmptyState / inline config | «Legg til Dimensjon» | «Legg til moment» |
| SetupEmptyState / inline config | «Dimensjonsnavn» | «Momentnavn» |
| ItemCriterion type | `itemCriteria` | Beholder internt navn, men viser «moment» i UI |

Ingen endring i TypeScript-kode (intern navngivning er uavhengig av UI-labels).

---

## Designproblem 5: Inline matrise-redigering

### Kriterienavn-redigering

Klikk på kriterienavn i matrisen → inline `<input>`:
- Bakgrunn: `--color-canvas` (inset feel)
- Border: `--color-wire-focus` (amber)
- Font: Samme som visning (13px, weight 600)
- Enter/blur → lagre, Escape → avbryt
- Gjelder også underkriterier

### Vektredigering

Klikk på vekttall → inline `<input type="number">`:
- Bredde: 48px, høyrejustert
- Font: `--font-data`, `--color-vekt`
- Samme enter/blur/escape
- Auto-rekalkulering av kriterie-vekt ved endring av underkriterie-vekt

### Legg til / fjern

**+ Kriterium (rad):**
- Siste rad i matrisen, `--color-felt` bg
- Tekst: «+ Kriterium», 12px, `--color-ink-ghost`
- Hover: `--color-felt-hover`, `--color-ink-muted`
- Klikk → ny rad med tom input for kriterienavn

**+ Leverandør (kolonne):**
- Siste kolonne-header, smalere (80px)
- Tekst: «+», 14px, `--color-ink-ghost`
- Hover: `--color-felt-hover`
- Klikk → ny kolonne med tom input for leverandørnavn

**Fjern kriterium/leverandør:**
- Hover over rad/kolonne-header → ×-ikon vises (same pattern som item-remove)
- Klikk → bekreftelsesdialog hvis det finnes scores

### Type-toggle (kvalitet/pris)

Liten label under kriterienavnet:
- «kvalitet» / «pris» i 10px, `--color-ink-ghost`
- Klikk → toggle
- Visuell indikasjon: kvalitet = standard, pris = `--color-ink-muted` italic

---

## Craft-sjekk

### Swap-test
- Bytter vi layout til standard dashboard? Nei — matrisen ER grensesnittet. Ingen sidebar-nav, ingen kortgrid.
- Bytter vi font? JetBrains Mono for data er en bevisst valg — tabular nums, monospace-alignment i matrisen.
- Bytter vi farge? Amber vektlinje er signaturen. Fjerner vi den, mister matrisen sin identitet.

### Squint-test
- Hierarki: Amber spine → grupper, faded spine → sub-rader, ingen spine → bladkriterier med direkte score
- Bladkriterier: Amber bg (som grupperinger) men med scores → tydelig annerledes enn tradisjonelle grupper som viser avledede tall

### Signatur-test (vektlinjen)
1. Grupperad-spine (solid amber, 3px) ✓
2. Sub-rad-spine (faded amber) ✓
3. Moment-spine i rollematrise (faded amber) ✓ — ny
4. Vektbar i vektkolonnen ✓
5. Rolle-konfig-strip amber «+»-knapp ✓ — ny

### Token-test
Alle nye elementer bruker eksisterende tokens. Ingen nye tokens nødvendig.

---

## Oppsummering av visuelle endringer

| Element | Eksisterende mønster | Endring |
|---|---|---|
| Grupperad | Amber bg, avledede scores | + variant med direkte scores (bladkriterium) |
| Sub-rad | Faded spine, direkte scores | Uendret (tradisjonell modus) |
| Sub-rad i ressursmodus | Faded spine, avledede scores | Nå «moment-rad» — visuelt identisk |
| Ressurs-indikator | Ingen | Ny: liten badge/ikon etter kriterienavn |
| Rolle-strip | Ingen | Ny: chip-rad i konfig-seksjon |
| Rollematrise | Ingen | Ny: CriterionView med leverandør-grupperte kolonner |
| Inline-edit | Ikke i matrisen | Ny: klikk-for-å-redigere på navn og vekter |
| «+ rad/kolonne» | Ikke i matrisen | Ny: ghost-rader/kolonner |
| Velkomst-stripe | SetupEmptyState (fullskjerm) | Ny: tynn stripe over matrise |
