# Design: Dokumentgenerering for anskaffelser uten kunngjøring

**Dato:** 2026-09-25
**Status:** Utkast — til godkjenning (beslutninger avklart 2026-09-25, se §2)
**Relatert:** [ADR-005](../adr-005-dokumentgenerering.md)

## 1. Oppgave

Automatisere utfylling av dokumentene i Oslobyggs *Prosedyre for gjennomføring
av enkeltanskaffelser som ikke må kunngjøres* (TQM dok-ID 836, v16, godkjent
01.07.2026). Første dokument er **Protokoll for anskaffelse uten kunngjøring**
(TQM 999, v6). Datamodellen skal dimensjoneres for hele dokumentkjeden fra
start, men hver mal gjennomgås konkret før den implementeres, og kan forenkles.

Løsningen bygges for **Oslobygg KF, Oslo kommune**. Koden skal ha god
arkitektur og integritet, og kunne flyttes ut av dette repoet uten endringer
(repoet er privat og skal flyttes til en GitHub-organisasjon i Oslo kommune). Den eksisterende protokollgeneratoren (`src/protokoll/`) og
frontend-protokollen er inspirasjon, ikke fundament (se §11).

## 2. Beslutninger (avklart 2026-09-25)

| Tema | Beslutning |
|------|-----------|
| Omfang for datamodell | Hele kjeden: protokoll, tilbudsinnbydelse, kravvedlegg, meddelelsesbrev, bestillingsbrev (3 varianter). Implementering starter med protokoll. |
| Input | Vi eier kontrakten: pydantic-modell → JSON Schema. Bestillingsskjemaet (utenfor repo) mappes til den. |
| Senere faser | Tilbud, evaluering og begrunnelse kommer som strukturert input (JSON), ikke manuell utfylling i Word. |
| Protokoll | Ett trinn (komplett etter evaluering). Tilgjengelig fra kr 100 000 (frivillig), påkrevd fra kr 500 000. |
| Kravvalg | Seriøsitetskrav/kravsett/miljø kommer som input. Eierens eksisterende kravavledning (TypeScript) porteres senere til Python, med felles scenariofiler som sikrer lik oppførsel (§6.3). |
| Klausultekster | Utsatt. Protokollen trenger kun valgene. Klausulbibliotek lages sammen med kravvedlegg/bestillingsbrev. |
| Begrunnelser | Regelbasert tekstforslag fra strukturerte data, kan overstyres av bruker. |
| Godkjenning | Eier er jurist og godkjenner malgjennomganger, juridiske formuleringer og PR-er. Ikke eget JUR-steg. |
| Maler | docxtpl på maskinlesbar malkopi, med manifest som knytter kopien til TQM-dok-ID og versjon. |
| TQM-topptekst | Fjernes. Erstattes av topptekst med logo, «Oslobygg KF», saksnummer og dokumenttype. Sporing lagres i dokumentegenskaper og sidefil. |
| Sensitivitetsetiketter | Purview/MSIP-egenskaper arvet fra malen fjernes. Office/Websak setter etikett. |
| Organisasjonsdata | Én virksomhet (Oslobygg KF). Data ligger i konfigurasjon, ikke i malene. Saken har ikke eget `virksomhet`-felt. |
| Avhengigheter | `docxtpl` (→ python-docx, Jinja2) og `pydantic` v2. Øvrig kun standardbibliotek. |
| Grensesnitt v1 | Bibliotek + CLI. HTTP/MCP kommer senere som tynne adaptere utenfor kjernen. |
| Kjøremiljø v1 | Lokalt hos eier (CLI). |
| PDF | Eksterne dokumenter (tilbudsinnbydelse, kravvedlegg, bestillingsbrev, meddelelsesbrev) lages som docx + PDF. Protokollen lages bare som docx. Motor: LibreOffice headless (§8.2). |
| Font | `Oslo Sans Office` fra IKT, installert i kjøremiljøet og innebygd i PDF. Aldri i pakken (§8.1). |
| Repo og originaler | Skal være privat og flyttes til Oslo kommune-organisasjon. TQM-originalene lagres i repoet (utenfor pakken) for reproduserbar tagging og sammenligning — **men først når repoet er privat** (§12, punkt 6). |

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
oslobygg.toml ────────────────────────────────▶ (org-data, profil, terskler, regelkilde)
maler/<id>/{mal.docx, manifest.toml} ─────────────────────▶ render
                                         .docx ──▶ pdf (LibreOffice) ──▶ .pdf  (bare eksterne dokumenter)
```

### Pakkestruktur

```
src/dokumentgen/
  __init__.py            # offentlig API: generer(), valider(), schema()
  __main__.py            # CLI
  kontrakt/              # pydantic-modeller for input (Sak m.m.) + JSON Schema-eksport
  konfig/                # Virksomhet, Profil og Regelverdier (lastes fra TOML, tomllib)
    oslobygg.toml
    profiler/oslobygg/   # oslologo.svg/.png + KILDE.toml (fra punkt-assets, §8.1)
  regler/                # rene funksjoner: terskler, validering → Funn
    kravavleder.py       # port (Protocol) + IngenKravavleder
  tekst/                 # regelbaserte begrunnelser + frasebibliotek (TOML, godkjent av eier)
  format.py              # norsk formatering: beløp, dato, klokkeslett
  dokumenter/            # én modul per dokumenttype
    base.py              # Dokumentdefinisjon, register
    protokoll_uten_kunngjoring.py
  render/
    base.py              # Renderer-protokoll
    docxtpl_renderer.py  # docxtpl + etterbehandling (egenskaper, sporing, fjerne MSIP)
    pdf.py               # PdfKonverterer-protokoll + LibreOffice headless
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
  hent_profilressurser.py
  originaler/            # TQM-originalene (ikke del av pakken)
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

    # ── Grunndata (fra bestillingsskjema) ──
    saksnummer: str | None                 # Websak, «åå/nnnnn»
    tittel: str                            # «Anskaffelsen gjelder»
    behov: str                             # «Kort om behovet»
    kontraktstype: Kontraktstype           # vare | tjeneste | bygg_anlegg | renhold
    estimert_verdi: Decimal                # inkl. opsjoner, ekskl. mva (prosedyre 4.4)
    varighet: str | None                   # «Kontraktens varighet»
    prosjekt: Prosjekt | None              # nummer, navn, leder, ressursnummer (8 tegn, «B6xxxxxx»)
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

Én virksomhet (Oslobygg KF). Konfigurasjonen lastes som standard; tester kan
sende inn en annen fil.

```toml
[virksomhet]
navn = "Oslobygg KF"
juridisk_navn = "Oslo kommune v/ Oslobygg KF"
orgnr = "924 599 545"
beskrivelse = "Oslobygg KF er et kommunalt foretak med ca. 600 ansatte, …"

[virksomhet.besoksadresse]    # AVKLARES (DG-A1) — malene har ulike adresser
[virksomhet.postadresse]      # AVKLARES (DG-A1)

[virksomhet.faktura]          # bekreftet av eier 2026-09-25
mottaker = ["Oslobygg KF", "Oslo kommune Fakturasentralen"]
adresse = ["Postboks 6532 Etterstad", "0606 Oslo"]
format = "EHF"                # e-faktura i elektronisk handelsformat
buyer_reference = "ressursnummer"   # 8 tegn, «B6xxxxxx», i feltet BuyerReference
info_url = "https://www.oslo.kommune.no/for-vare-leverandorer/faktura-til-oslo-kommune/"

[profil]                      # se §8.1 — logo fra @oslokommune/punkt-assets
logo = "profiler/oslobygg/oslologo.png"
logo_farge = "#2A2859"        # Oslo mørkeblå (fallback-fargen i punkt-SVG-en)
font = "Oslo Sans Office"     # installeres i kjøremiljøet (fra IKT), aldri i pakken

[pdf]
soffice = "soffice"           # sti til LibreOffice; kan overstyres med DOKUMENTGEN_SOFFICE

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
| `V-RESSURSNUMMER` | Ressursnummer oppgitt, men ikke 8 tegn eller starter ikke med «B6» (EHF BuyerReference) | FEIL |

Regler som krever tolkning (f.eks. sammenheng høy risiko ↔ kravsett) legges
ikke inn før regelkilden er avklart — de hører hjemme i kravavlederen.

### 6.3 Kravavleder (port for eksisterende kode)

```python
class Kravavleder(Protocol):
    def foresla(self, sak: Sak) -> Kravforslag: ...

class IngenKravavleder:          # standard i v1: ingen forslag
    def foresla(self, sak): return Kravforslag.tomt()
```

Eierens eksisterende kravavledning er skrevet i **TypeScript**. Den
**porteres til Python** (`OslomodellenKravavleder`) i DG-13. For å sikre at
oppførselen er lik:

- Oppførselen til TypeScript-koden fanges først i **felles scenariofiler**
  (`tests/dokumentgen/scenarier/krav/*.json`: input og forventet forslag), ved
  å kjøre TS-koden på et representativt utvalg saker.
- Python-porten må gi samme resultat for alle scenariene.
- Scenariofilene er språkuavhengige. Så lenge begge implementasjonene finnes,
  kan de kjøres mot TS-koden også, slik at avvik oppdages.

Når kravavlederen er koblet på: forslaget sammenlignes med valgt `krav`, og
avvik gir `ADVARSEL` som krever begrunnelse. Input-kontrakten endres ikke.

### 6.4 Regelbaserte begrunnelser (`tekst/`)

Protokollens begrunnelsesfelt har tre deler; hver del bygges av en ren
funksjon fra strukturerte data, med fraser fra `tekst/fraser.toml`
(juridisk ordlyd ligger i data, ikke kode; hver frase har `status = "utkast" |
"godkjent"`, og eier som jurist godkjenner):

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
    ekstern: bool                             # True → også PDF (§8.2)
    gjelder_for: Callable[[Sak, Regler], Funn | None]
    krav: Callable[[Sak, Regler], list[Funn]] # dokumentspesifikke påkrevde felter
    kontekst: Callable[[Sak, Virksomhet, Regler], dict]
    filnavn: Callable[[Sak], str]
```

Offentlig API:

```python
generer(dokument_id, sak, *, konfig=None, utkast=False, pdf=None) -> Resultat
    # Resultat: docx (bytes), pdf (bytes | None), funn (list[Funn]), sporing (Sporingspost)
    # pdf=None → følger Dokumentdefinisjon.ekstern
valider(dokument_id, sak) -> list[Funn]
schema() -> dict
```

### Feltmapping: protokoll uten kunngjøring

| Felt i malen | Kilde i `Sak` | Merknad |
|--------------|---------------|---------|
| Topptekst (ny) | logo, `virksomhet.navn`, `saksnummer`, dokumenttype | Erstatter TQM-toppteksten. Side X av Y i bunnteksten avgjøres i DG-06. |
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
strukturendringer når TQM publiserer ny versjon. TQM-originalene lagres i
`scripts/dokumentgen/originaler/<id>/` (utenfor pakken), slik at skriptet kan
kjøres på nytt og nye versjoner kan sammenlignes med de gamle.

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
Etterbehandling: dokumentegenskaper (tittel, forfatter = saksbehandler),
egendefinerte egenskaper for sporing (`dokumentgen.mal`, `.malversjon`,
`.tqm`, `.input_sha256`, `.generert`), og fjerning av alle
`MSIP_Label_*`-egenskaper arvet fra malen.

**Sporing:** I tillegg til dokumentegenskapene skrives
`<filnavn>.sporing.json` med dokument-id, malmanifest, `schema_versjon`,
generatorversjon, `regler.kilde`, input-hash, funn, og hvilke tekster som var
generert vs. overstyrt.

**Filnavn:** `{saksnummer}_{dokument-id}_{dato}.docx` / `.pdf` (`/` i saksnummer → `-`).

### 8.1 Profil: logo og font

**Kilde:** [`@oslokommune/punkt-assets`](https://www.npmjs.com/package/@oslokommune/punkt-assets)
(Oslo kommunes designsystem Punkt). Den brukte versjonen låses (19.0.4 per 2026-09-25).

| Ressurs | I punkt-assets | Hva malene bruker i dag | Beslutning |
|---------|----------------|--------------------------|------------|
| Logo | `dist/logos/oslologo.svg` (vektor, `fill="var(--fg-color, #2A2859)"`) | Samme logo som punktgrafikk: svart JPEG 850×579 (protokoll), mørkeblå JPG 188×100 (tilbudsinnbydelse) | Én kilde. SVG gjøres om til PNG med høy oppløsning (≥ 300 dpi ved brukt bredde) og fast farge fra `profil.logo_farge`. python-docx/docxtpl støtter ikke SVG. |
| Font | `Oslo Sans` som **woff/woff2** (nettfonter), ikke Office-varianten | `Oslo Sans Office` (237 forekomster i protokollen) | Docx viser til `Oslo Sans Office` gjennom stilene i malkopien. PDF bygger inn `Oslo Sans Office`, som er installert i kjøremiljøet (fontfil fra IKT). punkt-fonten brukes bare som reserve i visuelle tester. |

**Lisens (viktig):** npm-pakken er merket MIT, men fontfilene har en egen,
strengere lisens i fontens navnetabell. Den sier at Oslo Sans og Oslo Sans
Office er eksklusivt lisensiert til Oslo kommune, at bruken er begrenset til
kommunens virksomhet, og at retten ikke kan overføres. Konsekvenser:

- Bruken er innenfor lisensen: løsningen bygges av og for Oslobygg KF, og
  dokumentene er kommunens egen kommunikasjon, også når de går til leverandører.
- **Fontfiler committes ikke** og legges aldri i `dokumentgen`-pakken. De
  installeres i kjøremiljøet. Pakken skal kunne flyttes, og fontretten kan ikke
  overføres til tredjepart.
- Logoen er Oslo kommunes kjennetegn. Den hører til **virksomhetsprofilen**
  (`konfig/profiler/oslobygg/`) og ikke til kjernekoden, sammen med en
  `KILDE.toml` (pakkeversjon, filsti, sha256, lisensmerknad).
- Fontens `fsType = 8` tillater redigerbar innbygging, så innebygging i PDF
  er tillatt teknisk sett.

**Henting:** `scripts/dokumentgen/hent_profilressurser.py` laster ned den låste
pakkeversjonen fra npm-registeret og verifiserer `dist.integrity` (sha512).
Deretter henter skriptet ut logoen og lager PNG med `cairosvg` (bare en
utviklingsavhengighet), og skriver `KILDE.toml`. Kjernen trenger verken npm
eller node når den kjøres.

**Mottakere utenfor kommunen:** Leverandører har som regel ikke `Oslo Sans
Office`. Derfor får eksterne dokumenter PDF med innebygd font (§8.2). Docx-en
er arkiv- og arbeidsversjonen.

### 8.2 PDF for eksterne dokumenter

- **Motor:** LibreOffice headless (`soffice --headless --convert-to pdf`) bak
  protokollen `PdfKonverterer`, slik at motoren kan byttes (for eksempel til
  Microsoft Graph) uten endringer i kjernen.
- **Robusthet:** Egen midlertidig brukerprofil per kjøring
  (`-env:UserInstallation`), slik at samtidige kjøringer ikke låser hverandre.
  Tidsavbrudd og tydelig feil hvis `soffice` mangler. Stien leses fra
  `pdf.soffice` eller `DOKUMENTGEN_SOFFICE`.
- **Fontkontroll:** Etter konvertering sjekkes PDF-ens fontliste. Hvis
  `Oslo Sans Office` ikke er innebygd (fonten mangler i kjøremiljøet), er det
  `FEIL` i streng modus. PDF-en ville ellers gått ut med erstatningsfont uten at
  noen merket det. `--utkast` tillater erstatningsfont med `ADVARSEL`.
- **Kjøremiljø v1:** Lokalt hos eier. Krever LibreOffice og `Oslo Sans Office`
  installert. En installasjonsveiledning følger med i DG-22.
- **Sporing:** PDF-en får samme sporingspost som docx-en, med hash av begge
  filene.

## 9. Teststrategi og testkrav

### 9.1 Test før implementering — differensiert

| Område | Arbeidsform | Begrunnelse |
|--------|-------------|-------------|
| `regler/`, `format.py`, `tekst/`, kontekstfunksjoner, validering i `kontrakt/` | **TDD** (rød → grønn → refaktorer) | Rene funksjoner med tydelig spesifikasjon i prosedyren og malen. Testen er spesifikasjonen. |
| Hver kode-PR | **Akseptansetest først** | Første commit i PR-en inneholder tester som koder issuets akseptansekriterier og feiler. Implementasjonen kommer i senere commits. Reviewer kan godkjenne testene (hva) før koden (hvordan). |
| Taggeskript og docx-rendering | **Utforsk først, så karakteriseringstest** | Word-XML er uforutsigbart (runs, innholdskontroller). Det er lov å utforske, men oppførselen skal være låst med tester før merge. |
| Malgjennomgang (NOTAT.md) | **Feltlisten er testspesifikasjonen** | Hvert felt i notatet blir en påstand i snapshot- eller konteksttesten til dokument-PR-en. |

### 9.2 Testtyper

| Type | Hva | Kjøres |
|------|-----|--------|
| Enhet | Rene funksjoner. Tabelldrevne tester (`pytest.mark.parametrize`) med **grenseverdier på begge sider** av hver terskel. | Alltid |
| Scenariokatalog | Saker som JSON i `tests/dokumentgen/scenarier/` med forventede funnkoder og nøkkeltekster. Lesbar for juridisk. Nye regler og feil starter med et nytt scenario. | Alltid |
| Egenskapsbasert | `hypothesis` for formatering (tusenskille, avrunding, aldri `-0`), for input-hash (uavhengig av nøkkelrekkefølge) og for at validering aldri krasjer på en gyldig `Sak`. | Alltid |
| Kontrakt | Snapshot av JSON Schema. Publiserte eksempelpayloader for skjemaet valideres mot skjemaet. Eksempler fra eldre versjoner i samme hovedversjon må fortsatt validere (bakoverkompatibilitet). | Alltid |
| Mal-kontrakt | Variablene i malen er de samme som i konteksten, begge veier. Ubrukte kontekstnøkler gir feil. | Alltid |
| Dokument-snapshot | Generert docx → normalisert tekst og tabellstruktur → `.txt`-snapshot. Diffen leses i PR-en som innhold. Snapshots oppdateres bare med et eksplisitt flagg (`--oppdater-snapshots`), aldri automatisk. | Alltid |
| Renhet | Ingen `{{`/`{%`, «Velg et element», MACROBUTTON, kommentarer eller gul markering i generert docx. | Alltid |
| Konsistens mellom dokumenter | Samme scenario gir samme verdi, frist, leverandør og krav i alle dokumenter som bruker dem. | Alltid |
| Arkitektur | Importgrense-test (§4). | Alltid |
| Ende-til-ende | CLI med `subprocess`: `valider` og `generer` per dokumenttype, avslutningskoder og filer. | Alltid |
| PDF | Konvertering av eksterne dokumenter, innebygd `Oslo Sans Office` i fontlisten, sidetall, feil når fonten mangler. | `-m pdf` (krever LibreOffice og font; hoppes over med tydelig melding) |
| Visuell | LibreOffice (`soffice --headless`) → PDF → PNG. Sjekker sidetall. PNG legges ved dokument-PR-er for manuell sammenligning med TQM-malen. Ingen pikselsammenligning, fordi den er for skjør. Bruker installert `Oslo Sans Office` hvis den finnes. Ellers hentes Oslo Sans fra punkt-assets (woff2 → ttf med `fontTools`) til en midlertidig fontconfig-mappe, med alias `Oslo Sans Office` → `Oslo Sans`. Da er bildet en tilnærming. Fontfiler committes aldri. | `-m visuell`, manuelt |

### 9.3 Krav

- **Determinisme:** Kjernen kaller aldri `datetime.now()` direkte. Klokken
  sendes inn (`naa`), og testene bruker fast tid. Sorteringen er stabil.
  Docx sammenlignes på innhold (`word/document.xml` eller tekstutdrag), aldri
  byte for byte, fordi zip-tidsstempler varierer.
- **Dekningsgrad (branch coverage):** 100 % for `regler/` og `tekst/`, som er
  juridisk logikk. Minst 90 % for pakken totalt. Dekningsgrad er et gulv, ikke
  et mål. Mutasjonstesting (`mutmut`) på `regler/` kjøres ved behov og er ikke
  et krav for merge.
- **Sporbarhet:** Regeltester har navn etter regelen og viser til kilden, for
  eksempel `test_v_skatteattest_eldre_enn_6_mnd_fra_frist_gir_feil`, med
  docstring «TQM 836 v16 pkt. 6.6».
- **Testdata:** Byggefunksjoner (`lag_sak(**overstyr)`) i stedet for kopierte
  store JSON-filer. **Bare fiktive data.** Ingen ekte saker, navn,
  personopplysninger eller organisasjonsnumre (unntatt Oslobyggs eget).
- **Uavhengighet:** Ingen nettverk og ingen GCP-hemmeligheter. Testene kjører
  offline med bare `pip install -e .[dokumentgen,dev]`.
- **Hastighet:** Hele testsuiten, utenom visuelle tester, skal kjøre på under
  30 sekunder.
- **CI:** Repoet har ingen CI i dag. DG-01 legger inn en GitHub Actions-arbeidsflyt
  som kjører `ruff` og `pytest --cov` for `dokumentgen` på PR-er som endrer
  pakken. Uten CI er testkravene bare en avtale.

### 9.4 Scenarier for protokollen (minimum)

1. Tjeneste, kr 350 000, frivillig protokoll, 2 tilbud.
2. Tjeneste, kr 850 000, 3 inviterte, 3 tilbud, skatteattest OK.
3. Bygg og anlegg, kr 1 200 000, flere seriøsitetskrav, høy risiko, 1 invitert med unntaksbegrunnelse.
4. Feilsaker: valgt tilbud finnes ikke, verdi over terskel, gammel skatteattest, tilbud etter frist.
5. Tekst med spesialtegn og linjeskift (`&`, `<`, `"`, æøå, lange avsnitt).

## 10. Faseplan

Fasene er brutt ned i issue-klare arbeidspakker med én PR og én leveranse
hver, se [backlog](2026-09-25-dokumentgenerering-backlog.md).

Hver dokumentfase starter med **malgjennomgang** (resultat i `maler/<id>/NOTAT.md`):
feltliste, betingelser, hjelpetekst som skal bort, avvik mot andre maler,
forenklinger — godkjennes før implementering.

| Fase | Innhold | Forutsetninger |
|------|---------|----------------|
| **0 — Fundament** | Pakke, CI, `Sak`-kontrakt v1.0 (hele kjeden), virksomhetskonfig, format, validering (rammeverk + generelle regler), renderer, sporing, CLI (`generer`, `valider`, `schema`), importgrense-test, profilressurser | Besøks- og postadresse (DG-A1) før bruk |
| **1 — Protokoll** | Malgjennomgang, taggeskript + malkopi, kontekst, dokumentkrav, begrunnelsestekster, fixtures, snapshot-tester | Formuleringer godkjent av eier |
| **2 — Tilbudsinnbydelse** | PDF-steg (LibreOffice). Deretter som over: betingede avsnitt (skatteattest ≥ 500k, bestillingsbrev/kontrakt), kriterietabeller, vedleggsliste | `Oslo Sans Office` og LibreOffice installert lokalt |
| **3 — Kravvedlegg** | Klausulbibliotek (versjonert), sammenstilling fra `krav`, portering av kravavledning fra TypeScript | Klausultekster, tilgang til TS-koden |
| **4 — Bestillingsbrev ×3** | Felles kontekst, variant per kontraktstype, Oslomodellen-vedlegg fra klausulbibliotek | Maler for varer og B&A/renhold |
| **5 — Meddelelsesbrev** | Begrunnelse fra evaluering | Mal |
| Senere | HTTP-endepunkt, MCP-verktøy, integrasjon mot skjema, annet kjøremiljø (Cloud Run / Oslo kommunes plattform) | — |

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

1. **Besøks- og postadresse** (DG-A1): Tilbudsinnbydelsen har Grenseveien 82 / Postboks 6391
   Etterstad 0604; bestillingsbrevet har Grenseveien 78C / Postboks 6538 Etterstad 0606.
   Orgnr. og fakturaopplysninger er avklart (§6.1).
2. **Malfeil som bør rettes i TQM** (fra tilbudsinnbydelsen): «ansakffelser», «likebehanding»,
   «inidikerer», «Oppdragsgives», «dd.mm.ååå». Rettes i malkopien; eier melder til TQM-eier.
3. **Manglende maler:** bestillingsbrev varer, bestillingsbrev B&A/renhold, meddelelsesbrev.
4. **Kravavledning (TypeScript):** tilgang til koden for portering (DG-13).
5. **Fontfil:** `Oslo Sans Office` (TTF/OTF) fra IKT til kjøremiljøet (DG-22).
6. **Repoet er offentlig** (GitHub-API 2026-09-25: `visibility: public`), i strid med forutsetningen
   om privat repo. Inntil repoet er privat: ingen TQM-originaler, interne maler, fontfiler eller
   ekte saksdata committes, og issues/PR-er må ikke inneholde internt materiale.

### Avklart 2026-09-25

| Punkt | Beslutning |
|-------|-----------|
| TQM-originaler i repo | Ja, i `scripts/dokumentgen/originaler/` (utenfor pakken). |
| Sensitivitetsetiketter | MSIP-egenskaper fjernes; Office/Websak setter etikett. |
| Logo og topptekst i protokollen | Logo fra punkt-assets; topptekst med logo, Oslobygg KF, saksnummer og dokumenttype. |
| Font til eksterne | PDF med innebygd `Oslo Sans Office` (§8.2). |
| Godkjenning av formuleringer | Eier (jurist). |
| Flere virksomheter | Nei — bare Oslobygg KF, men data i konfig. |
