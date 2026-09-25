# ADR-005: Malbasert dokumentgenerering som selvstendig pakke

**Status:** Foreslått
**Dato:** 2026-09-25
**Kontekst:** Automatisering av dokumentene i Oslobyggs prosedyre for enkeltanskaffelser som ikke må kunngjøres (TQM 836)

---

## 1. Beslutning

Dokumentgenerering bygges som en **selvstendig Python-pakke (`dokumentgen`)**
med:

1. **Én input-kontrakt** (`Sak`, pydantic v2 → JSON Schema) for hele
   dokumentkjeden. Hvert dokument er en projeksjon av saken.
2. **Malbasert rendering med docxtpl** på maskinlesbare kopier av
   TQM-malene. Kopiene lages av reproduserbare skript og knyttes til
   TQM-dokument-ID og versjon i et manifest.
3. **Regler og terskler som data** (virksomhetskonfig i TOML med regelkilde),
   **juridiske fraser som data** (godkjent av eier, som er jurist), og **rene funksjoner** for
   validering, begrunnelser og kontekstbygging.
4. **Sporing** av input-hash, mal og malversjon, schemaversjon, regelkilde og
   generert kontra overstyrt tekst, i dokumentegenskapene og i en sidefil.
5. **Ingen avhengigheter til resten av repoet.** En importgrense-test håndhever
   dette.
6. **PDF for eksterne dokumenter** via LibreOffice headless bak et utskiftbart
   grensesnitt, med innebygd `Oslo Sans Office` fra kjøremiljøet. Fonten ligger
   aldri i pakken.

Detaljer står i [designplanen](plans/2026-09-25-dokumentgenerering-design.md).

---

## 2. Bakgrunn

Den eksisterende protokollgeneratoren (ADR-002, `src/protokoll/`) bygger
Word-dokumenter i kode fra rå Artifik-data. Det passer for EØS-protokoller
der dataene kommer fra API. Det passer dårlig for anskaffelser uten
kunngjøring, fordi:

- **Juridisk eier malene.** De ligger i TQM, har versjoner og endres uten at
  koden endres. Dokumenter som er bygd i kode glir bort fra malen.
- **Dataene kommer fra et skjema, ikke fra Artifik.** Vi trenger en eksplisitt
  kontrakt som et skjema i en annen løsning kan mappes til.
- **Dokumentene henger sammen.** Protokollens kravvalg styrer
  tilbudsinnbydelsen, kravvedlegget og bestillingsbrevet. Uten én felles
  sannhetskilde oppstår avvik.
- **Koden skal kunne flyttes** til et annet repo.

### Vurderte alternativer for rendering

| Alternativ | Vurdering |
|-----------|-----------|
| **docxtpl på malkopi** | **Valgt.** Malen beholder utseende og kan redigeres i Word. Løkker gir tilbudsrader, og betingelser gir avsnitt som gjelder over 500 000 kr. Ulempen er at kopien må oppdateres ved ny TQM-versjon. Det reduseres med et reproduserbart taggeskript og manifest med hash av originalen. |
| Fylle TQM-malen direkte (innholdskontroller og plassholdere) | Avvist. Malene har nesten ingen navngitte innholdskontroller, og plassholderne er MACROBUTTON-felt. Løkker og betingelser måtte skrives for hånd for hver mal. Løsningen blir skjør. |
| Bygge i kode (python-docx, som ADR-002) | Avvist. Dokumentene avviker fra de offisielle malene, og juridisk tekst havner i koden. |

### Vurderte alternativer for input-modell

| Alternativ | Vurdering |
|-----------|-----------|
| **pydantic v2** | **Valgt.** Gir validering, typede feilmeldinger og JSON Schema til skjemakontrakten uten ekstra arbeid. |
| dataclasses | Avvist. Én avhengighet færre, men validering og JSON Schema måtte vedlikeholdes for hånd. |

---

## 3. Konsekvenser

**Positive**
- Genererte dokumenter ligner de godkjente malene. Hjelpetekst kan ikke lekke
  ut, fordi den ikke finnes i malkopien.
- Skjemaet utenfor repoet får en stabil og versjonert kontrakt (JSON Schema).
- Terskler, fraser og maler kan endres uten kodeendring. Regelkilden (TQM 836
  v16) følger med i sporingen.
- Pakken kan flyttes. Den bruker bare standardbiblioteket, docxtpl og pydantic.

**Negative / risiko**
- Malkopiene må oppdateres når TQM endres. Tiltak: taggeskript som feiler ved
  strukturendring, og en hash av originalen i manifestet.
- docxtpl er følsom for hvordan Word deler opp tekst i biter (runs). Tiltak:
  taggene settes inn av skript og ikke for hånd i Word, og en mal-kontrakttest
  verifiserer at alle variabler finnes i konteksten.
- PDF-steget krever LibreOffice og `Oslo Sans Office` i kjøremiljøet. Tiltak:
  generatoren kontrollerer at fonten er innebygd i PDF-en, og nekter å lage PDF
  med erstatningsfont i streng modus.
- To protokollgeneratorer finnes side om side (`protokoll/` for EØS/Artifik og
  `dokumentgen` for anskaffelser uten kunngjøring). Det er akseptert fordi de
  har ulike datakilder og ulike maleiere.
