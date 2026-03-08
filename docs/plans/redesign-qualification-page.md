# Plan: Kvalifikasjon — revidert datamodell og matrise

## Prinsipp

**Matrisen = skjematisk arbeid.** ESPD, grunnlag, støttevirksomheter, forpliktelseserklæringer, verdikt — alt som kan avkrysses eller velges.

**Høyrepanelet = tenkning.** Begrunnelse (fritekst), nøkkeltall, innsikt.

## Revidert datamodell

```typescript
interface SupportEntity {
  id: string;
  name: string;
  espdSubmitted: boolean;
  commitmentSubmitted: boolean;  // forpliktelseserklæring
  scope: string;                 // hva de bidrar med
}

interface QualificationAssessment {
  espdSubmitted: boolean;             // leverandørens egen ESPD
  basis: 'own' | 'supported';
  supportEntities: SupportEntity[];   // erstatter supportEntityName: string
  verdict: QualificationVerdict;
  notes: string;
}
```

## Visningsmodell

### Oversikt (activeView === 'overview')
- Kompakt krav × leverandører matrise (som nå)
- Celler viser verdikt + støttemarkører + notatmarkør
- Klikkbar rad → drill-down
- **Høyrepanel:** Kvalifikasjonsstatus (som nå) + nøkkeltall

### Kravvisning (activeView === reqId)
- Nav-bar: ← Oversikt | ‹ Kravnavn ›
- **Matrise per leverandør:** Tabellrader med alle skjematiske felter:

```
Leverandør       ESPD   Grunnlag          Verdikt
─────────────────────────────────────────────────
Bouvet ASA        ✓     Egen kapasitet       ✓
  (ingen støttevirksomheter)
─────────────────────────────────────────────────
Knowit Obiwan     ✓     Støtter seg på       ✓
  ├ Knowit AB     ✓ E   ✓ F   Kredittvurd.
  └ Tata CS       — E   — F   (ikke angitt)
  + Legg til
─────────────────────────────────────────────────
```

- Klikkbar leverandørrad → velger leverandør i høyrepanelet
- **Høyrepanel:** Begrunnelse for valgt leverandør × krav

### selectedSupplierId

Ny state i store:
```typescript
selectedSupplierId = $state<string | null>(null);
selectSupplier(id: string) { this.selectedSupplierId = id; }
```

## Implementeringssteg

1. **Store:** Oppdater datamodell (SupportEntity[], espdSubmitted, selectedSupplierId)
2. **Store:** Oppdater mutasjonsmetoder (addSupportEntity, removeSupportEntity, etc.)
3. **Store:** Oppdater mock-data til ny modell
4. **RequirementView:** Omskriv til skjematisk matrise med ESPD, grunnlag, støttevirksomheter
5. **QualificationAssessmentPanel (ny):** Høyrepanel for begrunnelse (speiler JustificationPanel)
6. **QualificationStatusPanel:** Legg til nøkkeltall i oversiktsmodus
7. **+page.svelte:** Koble opp kontekstavhengig høyrepanel
8. **QualificationOverview:** Oppdater hasSupport-sjekk til ny modell
9. **QualificationCell:** Fjern expanded-prop (ikke lenger brukt)
