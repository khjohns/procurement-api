# Design: Dokumentgenerering for anskaffelser uten kunngjøring

**Dato:** 2026-09-25
**Status:** Utkast — til godkjenning
**Relatert:** [ADR-005](../adr-005-dokumentgenerering.md)

## 1. Oppgave

Automatisere utfylling av dokumentene i Oslobyggs *Prosedyre for gjennomføring
av enkeltanskaffelser som ikke må kunngjøres* (TQM dok-ID 836, v16, godkjent
01.07.2026). Første dokument er **Protokoll for anskaffelse uten kunngjøring**
(TQM 999, v6). Datamodellen skal dimensjoneres for hele dokumentkjeden fra
start, men hver mal gjennomgås konkret før den implementeres, og kan forenkles.

Koden skal ha god arkitektur og integritet, og kunne flyttes ut av dette repoet
uten endringer. Den eksisterende protokollgeneratoren (`src/protokoll/`) og
frontend-protokollen er inspirasjon, ikke fundament (se §11).

## 2. Beslutninger (avklart 2026-09-25)

| Tema | Beslutning |
|------|-----------|
| Omfang for datamodell | Hele kjeden: protokoll, tilbudsinnbydelse, kravvedlegg, meddelelsesbrev, bestillingsbrev (3 varianter). Implementering starter med protokoll. |
| Input | Vi eier kontrakten: pydantic-modell → JSON Schema. Bestillingsskjemaet (utenfor repo) mappes til den. |
| Senere faser | Tilbud, evaluering og begrunnelse kommer som strukturert input (JSON), ikke manuell utfylling i Word. |
| Protokoll | Ett trinn (komplett etter evaluering). Tilgjengelig fra kr 100 000 (frivillig), påkrevd fra kr 500 000. |
| Kravvalg | Seriøsitetskrav/kravsett/miljø kommer som input. Eksisterende kode for kravavledning bygges inn senere via et definert grensesnitt (§6.3). |
| Klausultekster | Utsatt. Protokollen trenger kun valgene. Klausulbibliotek lages sammen med kravvedlegg/bestillingsbrev. |
| Begrunnelser | Regelbasert tekstforslag fra strukturerte data, kan overstyres av bruker. |
| Maler | docxtpl på maskinlesbar malkopi, med manifest som knytter kopien til TQM-dok-ID og versjon. |
| TQM-topptekst | Fjernes i generert dokument. Sporing lagres i dokumentegenskaper og sidefil. |
| Organisasjonsdata | Sentral konfigurasjon per virksomhet. |
| Avhengigheter | `docxtpl` (→ python-docx, Jinja2) og `pydantic` v2. Øvrig kun standardbibliotek. |
| Grensesnitt v1 | Bibliotek + CLI. HTTP/MCP kommer senere som tynne adaptere utenfor kjernen. |

## 3. Dokumentkjeden (fra prosedyren)

```
Verdi < 500 000 (pkt. 4, 5, 7)            Verdi 500 000 – 1 300 000 (pkt. 4, 6, 7)
─────────────────────────────             ──────────────────────────────────────────
Behov/bestilling (skjema)                 Behov/bestilling (skjema)
  │                                         │
  ├─ Tilbudsforespørsel                     ├─ 6.1 Protokoll: innledende punkter vurderes
  │   (+ utkast bestillingsbrev)            ├─ 6.2 Tilbudsinnbydelse
  │                                         │       + kravvedlegg (Oslomodellen, aktsomhet, miljø)
  ├─ Tilbud mottas, vurderes                │       + prisskjema, kravspesifikasjon, kontraktsutkast
  │                                         ├─ 6.3–6.5 Distribusjon, mottak, åpning
  └─ Bestillingsbrev (1 av 3)               ├─ 6.6 Evaluering, skatteattest ≤ 6 mnd, ferdig protokoll
      tjenester / varer / B&A+renhold       │       → godkjenning i Websak (JUR + budsjettfullmaktshaver)
                                            └─ 6.7 Meddelelsesbrev + kontrakt (signeres av BFH)
     (protokoll frivillig fra 100 000)
                                          Arkivering i Websak (pkt. 7)
```

Konsekvens for design: **Protokollen er ikke bare siste dokument, men også
kilden** for kravvalg som vedlegges tilbudsinnbydelsen. Alle dokumenter er
projeksjoner av én og samme sak.

### Dokumentkatalog

| Dokument-id | Mal | Gjelder | Mal mottatt | Fase |
|-------------|-----|---------|-------------|------|
| `protokoll-uten-kunngjoring` | TQM 999 v6 | ≥ 100k (påkrevd ≥ 500k) | ✅ | 1 |
| `tilbudsinnbydelse` | Tilbudsinnbydelse for anskaffelse uten kunngjøring | 500k–1,3M | ✅ | 2 |
| `kravvedlegg` | — (sammenstilles fra klausulbibliotek) | 500k–1,3M | — | 3 |
| `bestillingsbrev-tjenester` | Mal for bestillingsbrev tjenester | < 500k | ✅ | 4 |
| `bestillingsbrev-varer` | Mal for bestillingsbrev varer | < 500k | ❌ | 4 |
| `bestillingsbrev-bygg-renhold` | Mal for bestillingsbrev B&A og renhold | < 500k | ❌ | 4 |
| `meddelelsesbrev` | — | 500k–1,3M | ❌ | 5 |

Kontrakt (Oslo kommunes kontraktsmaler på FEL) er utenfor omfang.

## 4. Arkitektur

### Dataflyt

```
sak.json ──▶ kontrakt ──▶ regler ──────────▶ dokumenter ──▶ render ──▶ .docx
            (pydantic)   (validering,        (sak → kontekst,          + .sporing.json
                          terskler,           dokumentkrav)            + funnrapport
                          kravavleder-port)       ▲
                             │                    │
                             └──▶ tekst ──────────┘
                                 (regelbaserte begrunnelser)
virksomhet.toml ──────────────────────────────▶ (org-data, terskler, regelkilde)
maler/<id>/{mal.docx, manifest.toml} ─────────────────────▶ render
```

### Pakkestruktur

```
src/dokumentgen/
  __init__.py            # offentlig API: generer(), valider(), schema()
  __main__.py            # CLI
  kontrakt/              # pydantic-modeller for input (Sak m.m.) + JSON Schema-eksport
  konfig/                # Virksomhet + Regelverdier (lastes fra TOML, tomllib)
    oslobygg.toml
  regler/                # rene funksjoner: terskler, validering → Funn
    kravavleder.py       # port (Protocol) + IngenKravavleder
  tekst/                 # regelbaserte begrunnelser + frasebibliotek (TOML, JUR-godkjent)
  format.py              # norsk formatering: beløp, dato, klokkeslett
  dokumenter/            # én modul per dokumenttype
    base.py              # Dokumentdefinisjon, register
    protokoll_uten_kunngjoring.py
  render/
    base.py              # Renderer-protokoll
    docxtpl_renderer.py  # docxtpl + etterbehandling (egenskaper, sporing)
  maler/
    protokoll-uten-kunngjoring/
      mal.docx           # maskinlesbar kopi med Jinja-tagger
      manifest.toml      # TQM-id, versjon, godkjent-dato, sha256 av original
      NOTAT.md           # malgjennomgang: felter, forenklinger, avvik
  sporing.py             # Sporingspost (input-hash, mal, versjoner, tidspunkt)
tests/dokumentgen/
  fixtures/              # saker (JSON) for typiske scenarier
  snapshots/             # forventet tekst fra genererte dokumenter
scripts/dokumentgen/
  tagg_protokoll.py      # reproduserbar konvertering TQM-original → malkopi
```

### Avhengighetsretning (håndheves av test)

```
CLI / __init__ ──▶ dokumenter ──▶ tekst ──▶ regler ──▶ kontrakt, konfig
                        │
                        └──────▶ render   (kjenner verken kontrakt eller regler)
```

(`A ──▶ B` betyr «A importerer B». `kontrakt` og `konfig` er løvmoduler.)

- `render` kjenner ikke domenet — det får en ferdig kontekst (dict) og en malsti.
- `dokumenter` er rene funksjoner `(Sak, Virksomhet) → kontekst`. Ingen I/O.
- Kjernen importerer ingenting fra `app/`, `protokoll/`, `artifik_mcp/` eller
  `eforms_labels`. En **importgrense-test** feiler hvis `dokumentgen` importerer
  noe annet enn standardbibliotek, `docxtpl`, `docx`, `jinja2` og `pydantic`.
- Maler lastes via `importlib.resources`, slik at pakken fungerer installert
  (wheel) og ikke avhenger av repoets mappestruktur.

## 5. Input-kontrakt (`Sak`)

Én samlet modell for hele saken. Alle deler utover grunndata er valgfrie på
modellnivå; **hver dokumenttype deklarerer selv hvilke felter den krever**
(§7). Slik kan samme sak brukes gjennom hele kjeden, og skjemaet trenger bare
levere det som finnes i hver fase.

Konvensjoner:
- Norske feltnavn i ASCII snake_case (`serioesitetskrav`, `miljo`), identisk i JSON.
- Beløp som `Decimal`, alltid **ekskl. mva**. Aldri float.
- Tidspunkt som ISO 8601 med tidssone; formateres i Europe/Oslo.
- Referanser mellom objekter via id (f.eks. `valgt_tilbud_id`), valideres.
- `schema_versjon` (semver). Brudd på kontrakten → ny hovedversjon.
  Snapshot-test av JSON Schema fanger utilsiktede endringer.

```python
class Sak(BaseModel):
    schema_versjon: Literal["1.0"]
    virksomhet: str                        # nøkkel i konfig, f.eks. "oslobygg"

    # ── Grunndata (fra bestillingsskjema) ──
    saksnummer: str | None                 # Websak, «åå/nnnnn»
    tittel: str                            # «Anskaffelsen gjelder»
    behov: str                             # «Kort om behovet»
    kontraktstype: Kontraktstype           # vare | tjeneste | bygg_anlegg | renhold
    estimert_verdi: Decimal                # inkl. opsjoner, ekskl. mva (prosedyre 4.4)
    varighet: str | None                   # «Kontraktens varighet»
    prosjekt: Prosjekt | None              # nummer, navn, leder, ressursnummer
    personer: Personer                     # saksbehandler, budsjettfullmaktshaver, kontakt

    # ── Krav (protokoll innledende punkter) ──
    krav: Krav | None
        # serioesitetskrav: set[A_E | F_H | I_T | U | V]
        # aktsomhet: kravsett (A | B | INGEN), hoy_risiko: set[...], vurdering: str
        # miljo: kategori (tjeneste | vare | bygg_anlegg), valg (standard | alternativt
        #        | ikke_aktuelt), begrunnelse: str | None
        # kilde: bruker | kravavleder   (for sporing når avledning kobles på)

    # ── Konkurranse (tilbudsinnbydelse) ──
    konkurranse: Konkurranse | None
        # oppdrag, formaal, oppstart, tilbudsfrist, mottak_epost, kanal (epost | kgv)
        # kvalifikasjonskrav: list[{krav, dokumentasjon}]
        # tildelingskriterier: list[{id, navn, beskrivelse, dokumentasjon, vekt?}]
        # inviterte: list[Leverandor]
        # unntak_konkurranse: {begrunnelse} | None   (færre enn 3 / direktekjøp)

    # ── Tilbud og evaluering ──
    tilbud: list[Tilbud]                   # id, leverandor, mottatt, sum, avvist?
    evaluering: Evaluering | None
        # valgt_tilbud_id, vurderinger per kriterium (poeng?/kommentar)
        # begrunnelse_overstyring: str | None   (bruker overstyrer generert tekst)
    skatteattest: Skatteattest | None      # dato, vurdert_ok

    # ── Kontraktsinngåelse (bestillingsbrev/kontrakt) ──
    kontraktsinngaaelse: Kontraktsinngaaelse | None
        # form (bestillingsbrev | kontrakt), prisform (totalpris | honorarbudsjett)
        # ferdig_dato, kopi_til, signatarer
```

Detaljnivå for `evaluering` (bare valgt + begrunnelse, eller poeng per
kriterium) avgjøres når meddelelsesbrevet gjennomgås. Modellen tillater begge.

## 6. Konfigurasjon, regler og tekst

### 6.1 Virksomhetskonfigurasjon (`konfig/oslobygg.toml`)

```toml
[virksomhet]
navn = "Oslobygg KF"
juridisk_navn = "Oslo kommune v/ Oslobygg KF"
orgnr = "924 599 545"
beskrivelse = "Oslobygg KF er et kommunalt foretak med ca. 600 ansatte, …"
logo = "oslobygg-logo.png"

[virksomhet.besoksadresse]    # AVKLARES — malene har ulike adresser
[virksomhet.postadresse]      # AVKLARES
[virksomhet.fakturaadresse]   # Postboks 6532 Etterstad (bestillingsbrev) — AVKLARES

[regler]
kilde = "TQM 836 v16 (01.07.2026)"
protokoll_frivillig_fra = 100_000
protokoll_pakrevd_fra = 500_000
kontrakt_pakrevd_fra = 500_000
skatteattest_pakrevd_fra = 500_000
skatteattest_maks_alder_mnd = 6
min_inviterte = 3
nasjonal_terskel = 1_300_000
```

Terskler ligger i konfig, ikke i kode: de endres når regelverk eller prosedyre
endres, og `regler.kilde` følger med i sporingen.

### 6.2 Validering

Valideringen produserer `Funn(kode, alvorlighet, sti, melding, regelkilde)`
med alvorlighet `FEIL | ADVARSEL | INFO`. Streng modus (standard) nekter å
generere ved `FEIL`; `--utkast` genererer likevel, med tydelig markerte hull.

Første regelsett (kilde i parentes):

| Kode | Regel | Alvorlighet |
|------|-------|-------------|
| `V-TERSKEL` | Estimert verdi ≥ nasjonal terskel → utenfor prosedyren | FEIL |
| `V-TILBUD-TERSKEL` | Valgt tilbudssum ≥ nasjonal terskel (kontakt JUR) | FEIL |
| `V-VALGT-REF` | `valgt_tilbud_id` finnes ikke blant tilbudene | FEIL |
| `V-MIN-INVITERTE` | ≥ 500k, < 3 inviterte og ingen `unntak_konkurranse` (6.1) | FEIL |
| `V-SKATTEATTEST` | ≥ 500k og skatteattest mangler / eldre enn 6 mnd fra tilbudsfrist (6.6) | FEIL |
| `V-KONTRAKTSFORM` | ≥ 500k og form = bestillingsbrev (3.2, protokoll-NB) | FEIL |
| `V-FRIST` | Tilbud mottatt etter tilbudsfrist (6.5) | ADVARSEL |
| `V-MILJO-BEGR` | Miljø «alternativt/ikke aktuelt» uten begrunnelse (malkommentar) | ADVARSEL |
| `V-PROTOKOLL-FRIVILLIG` | Verdi 100k–500k: protokoll er frivillig | INFO |

Regler som krever tolkning (f.eks. sammenheng høy risiko ↔ kravsett) legges
ikke inn før regelkilden er avklart — de hører hjemme i kravavlederen.

### 6.3 Kravavleder (port for eksisterende kode)

```python
class Kravavleder(Protocol):
    def foresla(self, sak: Sak) -> Kravforslag: ...

class IngenKravavleder:          # standard i v1: ingen forslag
    def foresla(self, sak): return Kravforslag.tomt()
```

Når eksisterende kode kobles på: forslaget sammenlignes med valgt `krav`, og
avvik gir `ADVARSEL` som krever begrunnelse. Input-kontrakten endres ikke.

### 6.4 Regelbaserte begrunnelser (`tekst/`)

Protokollens begrunnelsesfelt har tre deler; hver del bygges av en ren
funksjon fra strukturerte data, med fraser fra `tekst/fraser.toml`
(frasene skal kvalitetssikres av JUR — juridisk ordlyd ligger i data, ikke kode):

1. **Hvorfor lovlig uten kunngjøring** — fra estimert verdi vs. nasjonal terskel.
2. **Hvorfor bare én/få leverandører** — kun når inviterte < 3; rammer inn
   brukerens faktiske `unntak_konkurranse.begrunnelse` (kan ikke genereres).
3. **Valg av tilbud** — antall tilbud, tildelingskriterier, valgt leverandør,
   evt. rangering/poeng.

`evaluering.begrunnelse_overstyring` erstatter generert tekst. Sporingen
registrerer om teksten var generert eller overstyrt.

## 7. Dokumentdefinisjoner

```python
@dataclass(frozen=True)
class Dokumentdefinisjon:
    id: str                                   # "protokoll-uten-kunngjoring"
    mal: str                                  # mappe under maler/
    gjelder_for: Callable[[Sak, Regler], Funn | None]
    krav: Callable[[Sak, Regler], list[Funn]] # dokumentspesifikke påkrevde felter
    kontekst: Callable[[Sak, Virksomhet, Regler], dict]
    filnavn: Callable[[Sak], str]
```

Offentlig API:

```python
generer(dokument_id, sak, *, virksomhet=None, utkast=False) -> Resultat
    # Resultat: docx (bytes), funn (list[Funn]), sporing (Sporingspost)
valider(dokument_id, sak) -> list[Funn]
schema() -> dict
```

### Feltmapping: protokoll uten kunngjøring

| Felt i malen | Kilde i `Sak` | Merknad |
|--------------|---------------|---------|
| Saksbehandler | `personer.saksbehandler.navn` | |
| Saksnr. | `saksnummer` | |
| Anskaffelsen gjelder | `tittel` | |
| Kort om behovet | `behov` | Fritekst, linjeskift bevares |
| Anskaffelsens anslåtte verdi | `estimert_verdi` | «Kr. 850 000,- ekskl. MVA» |
| Prosjektnummer | `prosjekt.nummer` | Valgfri («hvis aktuelt») |
| Kontraktens varighet | `varighet` | |
| Tilbudsfrist | `konkurranse.tilbudsfrist` | «dd.mm.åååå kl. HH:MM», valgfri |
| Seriøsitetskrav A-E … V | `krav.serioesitetskrav` | ☒/☐ |
| Kravsett | `krav.aktsomhet.kravsett` | Kravsett A / Kravsett B / Ingen krav |
| Høy risiko (5 kategorier) | `krav.aktsomhet.hoy_risiko` | ☒/☐ |
| Risiko- og forholdsmessighetsvurdering | `krav.aktsomhet.vurdering` | |
| Miljøkrav | `krav.miljo` | Kategori + valg + ev. begrunnelse |
| Tilbudstabell | `tilbud[]` | Dynamiske rader (malen har 5 faste), sortert på mottatt |
| Den valgte leverandør | `evaluering.valgt_tilbud_id` → `tilbud` | |
| Begrunnelse | `tekst.begrunnelse(sak)` / overstyring | §6.4 |

Hjelpetekst, malkommentarer, MACROBUTTON-plassholdere og TQM-topptekst finnes
ikke i malkopien, og kan derfor ikke lekke ut i generert dokument.

## 8. Maler og rendering

**Malkopi:** Den maskinlesbare kopien lages av et reproduserbart skript
(`scripts/dokumentgen/tagg_<mal>.py`) som leser TQM-originalen og:
fjerner topptekst/bunntekst fra TQM, kommentarer og veiledningstekst;
erstatter innholdskontroller (avkrysning, nedtrekk) og MACROBUTTON-er med
Jinja-tagger; gjør faste tabellrader om til `{%tr for %}`-løkker. Skriptet
feiler eksplisitt hvis forventede ankere ikke finnes — slik oppdages
strukturendringer når TQM publiserer ny versjon.

**Manifest (`manifest.toml`):**

```toml
id = "protokoll-uten-kunngjoring"
navn = "Protokoll for anskaffelse uten kunngjøring"
kilde = "TQM"
tqm_dokument_id = 999
tqm_versjon = 6
tqm_godkjent = 2026-09-02
original_sha256 = "…"     # hash av TQM-originalen malkopien er laget fra
malkopi_versjon = 1
```

**Rendering:** `DocxTemplate.render(kontekst, autoescape=True)` (brukertekst
med `&`/`<` må ikke ødelegge XML). Fritekst med linjeskift via `RichText`.
Etterbehandling: dokumentegenskaper (tittel, forfatter = saksbehandler) og
egendefinerte egenskaper for sporing (`dokumentgen.mal`, `.malversjon`,
`.tqm`, `.input_sha256`, `.generert`).

**Sporing:** I tillegg til dokumentegenskapene skrives
`<filnavn>.sporing.json` med dokument-id, malmanifest, `schema_versjon`,
generatorversjon, `regler.kilde`, input-hash, funn, og hvilke tekster som var
generert vs. overstyrt.

**Filnavn:** `{saksnummer}_{dokument-id}_{dato}.docx` (`/` i saksnummer → `-`).

## 9. Teststrategi

| Nivå | Hva | Hvorfor |
|------|-----|---------|
| Enhet | `regler`, `tekst`, `format`, `kontekst`-funksjoner | Rene funksjoner, raske tester |
| Kontrakt | Snapshot av JSON Schema | Fanger utilsiktede endringer i skjemakontrakten |
| Mal-kontrakt | Alle variabler i malen (`get_undeclared_template_variables`) finnes i konteksten | Mal og kode kan ikke drifte fra hverandre |
| Renhet | Generert docx inneholder ikke «Velg et element», MACROBUTTON, kommentarer, gul markering, `{{`/`{%` | Hjelpetekst lekker aldri ut |
| Snapshot | Fixture-saker → tekstutdrag av docx sammenlignes med snapshot | Regresjon i innhold |
| Arkitektur | Importgrense-test (§4) | Flyttbarhet |

Fixture-saker for protokollen (minst):
1. Tjeneste, kr 350 000, frivillig protokoll, 2 tilbud.
2. Tjeneste, kr 850 000, 3 inviterte, 3 tilbud, skatteattest OK.
3. Bygg og anlegg, kr 1 200 000, flere seriøsitetskrav, høy risiko, 1 invitert med unntaksbegrunnelse.
4. Feilsaker: valgt tilbud finnes ikke, verdi over terskel, gammel skatteattest.

## 10. Faseplan

Fasene er brutt ned i issue-klare arbeidspakker med én PR og én leveranse
hver, se [backlog](2026-09-25-dokumentgenerering-backlog.md).

Hver dokumentfase starter med **malgjennomgang** (resultat i `maler/<id>/NOTAT.md`):
feltliste, betingelser, hjelpetekst som skal bort, avvik mot andre maler,
forenklinger — godkjennes før implementering.

| Fase | Innhold | Forutsetninger |
|------|---------|----------------|
| **0 — Fundament** | Pakke, `Sak`-kontrakt v1.0 (hele kjeden), virksomhetskonfig, format, validering (rammeverk + generelle regler), renderer, sporing, CLI (`generer`, `valider`, `schema`), importgrense-test | Korrekte adresser |
| **1 — Protokoll** | Malgjennomgang, taggeskript + malkopi, kontekst, dokumentkrav, begrunnelsestekster, fixtures, snapshot-tester | Fraser til JUR-gjennomgang |
| **2 — Tilbudsinnbydelse** | Som over. Betingede avsnitt (skatteattest ≥ 500k, bestillingsbrev/kontrakt), kriterietabeller, vedleggsliste | — |
| **3 — Kravvedlegg** | Klausulbibliotek (versjonert), sammenstilling fra `krav`, kobling av kravavleder | Klausultekster, eksisterende kravkode |
| **4 — Bestillingsbrev ×3** | Felles kontekst, variant per kontraktstype, Oslomodellen-vedlegg fra klausulbibliotek | Maler for varer og B&A/renhold |
| **5 — Meddelelsesbrev** | Begrunnelse fra evaluering | Mal |
| Senere | HTTP-endepunkt, MCP-verktøy, PDF, integrasjon mot skjema | — |

CLI-eksempel (fase 0/1):

```bash
PYTHONPATH=src python -m dokumentgen schema > sak.schema.json
PYTHONPATH=src python -m dokumentgen valider protokoll-uten-kunngjoring sak.json
PYTHONPATH=src python -m dokumentgen generer protokoll-uten-kunngjoring sak.json -o ut/ [--utkast]
```

## 11. Forhold til eksisterende kode

- `src/protokoll/` bygger dokumenter i kode, tar rå Artifik-data og importerer
  fra `app/` og `eforms_labels`. Gjenbrukes ikke; formateringshjelpere
  (`fmt_currency`, `fmt_date`) kopieres ved behov inn i `dokumentgen/format.py`.
- Frontendens `justification-generator.ts` og evalueringsstoren er inspirasjon
  for begrunnelsestekster og evalueringsmodell.
- Observert, utenfor omfang: `/api/protokoll/generate` ignorerer feltet
  `manual` som frontend sender.

## 12. Åpne punkter

1. **Korrekte adresser:** Tilbudsinnbydelsen har Grenseveien 82 / Postboks 6391 Etterstad 0604;
   bestillingsbrevet har Grenseveien 78C / Postboks 6538 Etterstad 0606 og faktura Postboks 6532.
2. **Frasebibliotek:** JUR må kvalitetssikre ordlyden i begrunnelsestekstene.
3. **TQM-originaler i repo:** Kan originalene lagres (for diff ved ny versjon), eller bare hash?
4. **Sensitivitetsetiketter:** Malene har Microsoft Purview-etiketter (MSIP) i egenskapene.
   Skal generert dokument arve dem, eller settes de av Websak/Office?
5. **Logo:** TQM-toppteksten inneholder logoen. Skal protokollen ha en enkel topptekst med logo fra konfig?
6. **Malfeil å melde til JUR** (fra tilbudsinnbydelsen): «ansakffelser», «likebehanding»,
   «inidikerer», «Oppdragsgives», «dd.mm.ååå». Rettes i malkopien, men bør også rettes i TQM.
7. **Manglende maler:** bestillingsbrev varer, bestillingsbrev B&A/renhold, meddelelsesbrev.
