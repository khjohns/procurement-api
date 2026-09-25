# Backlog: Dokumentgenerering (issue-klar)

**Dato:** 2026-09-25
**Relatert:** [Designplan](2026-09-25-dokumentgenerering-design.md) · [ADR-005](../adr-005-dokumentgenerering.md)

Backlogen er skrevet for å kunne legges inn som GitHub-issues én til én.
Hvert issue gir **én PR** med én tydelig leveranse.

## Konvensjoner

**Issue ↔ PR**
- Ett issue gir én PR. PR-en lukker issuet (`Closes #n`).
- En PR som vokser utover leveransen, deles i flere PR-er. Nye funn blir egne
  issues og tas ikke inn i PR-en underveis.
- ID-ene (`DG-01` …) er stabile og brukes i tittelen. GitHub-nummeret kommer i
  tillegg.

**Etiketter og milepæler**
- Etiketter: `dokumentgen` (alle), `fase-0` … `fase-5`, og i tillegg
  `malgjennomgang` (beslutnings-PR, ingen kode), `avklaring` (venter på svar,
  ingen PR) og `blokkert`.
- Én milepæl per fase: «DG fase 0 — Fundament», «DG fase 1 — Protokoll» osv.

**PR-beskrivelse** (samme struktur i alle PR-er)

```markdown
## Leveranse
<én setning — kopiert fra issuet>

## Endringer
- …

## Akseptansekriterier
- [x] … (kopiert fra issuet og krysset av)

## Verifisering
<kommandoer som er kjørt, med utdrag av resultatet>

## Utenfor omfang
- …

Closes #<n>
```

**Arbeidsflyt i en kode-PR** (se designplanen §9)
1. **Første commit er tester som feiler** og koder issuets akseptansekriterier
   (`test: akseptansetester for DG-nn`). For taggeskript og rendering er det
   lov å utforske først, men testene skal være på plass før merge.
2. Implementasjonen kommer i egne commits.
3. Reviewer leser testene og snapshot-diffene først, deretter koden.

**Definition of done (gjelder alle PR-er med kode)**
- CI er grønn (fra DG-01): `ruff check`, `ruff format --check` og `pytest --cov`
  for `dokumentgen`.
- Hvert akseptansekriterium har minst én test som ble skrevet før
  implementasjonen, og som er synlig i commit-historikken.
- Dekningsgraden holder: 100 % branch coverage for `regler/` og `tekst/`, minst 90 % totalt.
- Nye regler har grenseverditester på begge sider av terskelen, og testen viser til regelkilden.
- Snapshot-endringer er bevisste og forklart i PR-beskrivelsen.
- Testene bruker bare fiktive data og kjører offline.
- Dokument-PR-er har skjermbilde fra visuell test (`-m visuell`) i PR-beskrivelsen.
- Nye offentlige funksjoner har docstring. Designplanen er oppdatert hvis
  designet er endret.
- Ingen import fra `app/`, `protokoll/`, `artifik_mcp/` eller `eforms_labels`.

## Oversikt

| ID | Tittel | Fase | Avhenger av | Type |
|----|--------|------|-------------|------|
| DG-A1 | Avklar organisasjonsdata og adresser | 0 | — | avklaring |
| DG-A2 | Avklar lagring av TQM-originaler og sensitivitetsetiketter | 1 | — | avklaring |
| DG-01 | Pakkeskjelett og arkitekturvern | 0 | — | kode |
| DG-02 | Input-kontrakt `Sak` v1.0 med JSON Schema | 0 | DG-01 | kode |
| DG-03 | Virksomhetskonfig og norsk formatering | 0 | DG-01 | kode |
| DG-04 | Valideringsrammeverk og generelle regler | 0 | DG-02, DG-03 | kode |
| DG-05 | Renderer, dokumentregister, sporing og CLI | 0 | DG-02, DG-03, DG-04 | kode |
| DG-21 | Profilressurser (logo og font) fra punkt-assets | 0 | DG-03 | kode |
| DG-06 | Malgjennomgang: protokoll uten kunngjøring | 1 | — | malgjennomgang |
| DG-07 | Taggeskript og malkopi: protokoll | 1 | DG-05, DG-06, DG-A2 | kode |
| DG-08 | Regelbaserte begrunnelsestekster | 1 | DG-04 | kode |
| DG-09 | Dokumentdefinisjon: protokoll uten kunngjøring | 1 | DG-07, DG-08, DG-21 | kode |
| DG-10 | Malgjennomgang: tilbudsinnbydelse | 2 | DG-09 | malgjennomgang |
| DG-11 | Tilbudsinnbydelse: malkopi og dokumentdefinisjon | 2 | DG-10 | kode |
| DG-12 | Klausulbibliotek (struktur og versjonering) | 3 | DG-05 | kode |
| DG-13 | Koble på eksisterende kravavledning | 3 | DG-04 | kode |
| DG-14 | Kravvedlegg | 3 | DG-12, DG-13 | kode |
| DG-15 | Malgjennomgang: bestillingsbrev (3 varianter) | 4 | DG-12 | malgjennomgang |
| DG-16 | Bestillingsbrev tjenester | 4 | DG-15 | kode |
| DG-17 | Bestillingsbrev varer | 4 | DG-16 | kode |
| DG-18 | Bestillingsbrev bygg og anlegg / renhold | 4 | DG-16 | kode |
| DG-19 | Malgjennomgang: meddelelsesbrev og evalueringsmodell | 5 | DG-09 | malgjennomgang |
| DG-20 | Meddelelsesbrev | 5 | DG-19 | kode |

```
Fase 0:  DG-01 ─┬─ DG-02 ─┬─ DG-04 ─┬─ DG-05
                └─ DG-03 ─┘         │
Fase 1:  DG-06 ──────────────────── DG-07 ─┬─ DG-09
                        DG-04 ─ DG-08 ─────┘
Fase 2+: DG-09 ─ DG-10 ─ DG-11     DG-05 ─ DG-12 ─┬─ DG-14 ; DG-15 ─ DG-16 ─┬─ DG-17
                                   DG-04 ─ DG-13 ─┘                         └─ DG-18
```

---

## Avklaringer (issues uten PR)

### DG-A1 — Avklar organisasjonsdata og adresser
`dokumentgen` `fase-0` `avklaring`

**Spørsmål:** Hvilke adresser er riktige?
- Tilbudsinnbydelsen: Grenseveien 82 / Postboks 6391 Etterstad, 0604 Oslo.
- Bestillingsbrevet: Grenseveien 78C / Postboks 6538 Etterstad, 0606 Oslo.
- Fakturaadresse: Postboks 6532 Etterstad.

Logokilden er avklart: `@oslokommune/punkt-assets` (se DG-21). Om protokollen skal ha topptekst med logo, bestemmes i DG-06.

**Lukkes når:** Svaret er registrert i issuet. DG-03 kan merges med
plassholdere, men DG-09 kan ikke tas i bruk før dette er lukket.

### DG-A2 — Avklar lagring av TQM-originaler og sensitivitetsetiketter
`dokumentgen` `fase-1` `avklaring`

**Spørsmål:**
1. Kan TQM-originalene lagres i repoet (for sammenligning ved ny versjon), eller bare kontrollsum?
2. Skal genererte dokumenter arve Purview-etikettene (MSIP) fra malen, eller skal de fjernes?

**Lukkes når:** Svaret er registrert. Det avgjør hva DG-07 lagrer, og hva
rendereren gjør med de egendefinerte egenskapene.

---

## Fase 0 — Fundament

### DG-01 — Pakkeskjelett og arkitekturvern
`dokumentgen` `fase-0`

**Leveranse:** En tom, installerbar pakke `dokumentgen` med testoppsett, CI og
en test som håndhever at den ikke importerer noe fra resten av repoet.

**Innhold**
- `src/dokumentgen/` med underpakker fra designplanen §4, foreløpig tomme.
- Avhengighetsgruppen `dokumentgen = ["docxtpl", "pydantic>=2"]` i `pyproject.toml`, og `requirements-dokumentgen.txt`.
- Testavhengighetene `pytest-cov` og `hypothesis` i dev-gruppen.
- `[tool.pytest.ini_options]` med markøren `visuell` og innstillinger for dekningsgrad.
- `tests/dokumentgen/conftest.py` med fast klokke og en påstandshjelper for snapshots (`--oppdater-snapshots`).
- `.github/workflows/dokumentgen.yml`: `ruff` og `pytest --cov` på PR-er som endrer `src/dokumentgen/**` eller `tests/dokumentgen/**`.
- `python -m dokumentgen --help` med tomme underkommandoer.
- `tests/dokumentgen/test_importgrense.py`.
- Seksjon om `dokumentgen` i `CLAUDE.md`, med testkommandoer og kravene fra designplanen §9.

**Akseptansekriterier**
- [ ] `PYTHONPATH=src python -m dokumentgen --help` viser `schema`, `valider` og `generer`.
- [ ] Importgrense-testen feiler hvis en modul i `dokumentgen` importerer `app`, `protokoll`, `artifik_mcp`, `eforms_labels` eller andre tredjepartspakker enn `docxtpl`, `docx`, `jinja2` og `pydantic`. Det er verifisert med en midlertidig ulovlig import.
- [ ] CI-arbeidsflyten kjører og er grønn på PR-en selv. At den blir rød ved en testfeil er verifisert med en midlertidig commit.
- [ ] `pytest tests/dokumentgen` kjører offline uten GCP-oppsett.
- [ ] `ruff` er grønn.

**Utenfor omfang:** All domenelogikk.

### DG-02 — Input-kontrakt `Sak` v1.0 med JSON Schema
`dokumentgen` `fase-0`

**Leveranse:** En versjonert `Sak`-modell for hele dokumentkjeden, som kan
eksporteres til JSON Schema med `dokumentgen schema`.

**Innhold**
- Pydantic-modeller etter designplanen §5: `Sak`, `Personer`, `Prosjekt`, `Krav`, `Konkurranse`, `Tilbud`, `Evaluering`, `Skatteattest` og `Kontraktsinngaaelse`.
- Oppslag mot enum-verdier (kontraktstype, seriøsitetsgrupper, kravsett, risikokategorier, miljøvalg).
- Strukturell validering på modellnivå:
  - ID-er er unike.
  - `valgt_tilbud_id` peker på et tilbud som finnes.
  - Beløp er ikke negative.
- Beløp som `Decimal`, og tidspunkt med tidssone.
- `dokumentgen schema` skriver JSON Schema til stdout.
- Eksempel på en sak i `tests/dokumentgen/fixtures/sak_eksempel.json`.

**Akseptansekriterier**
- [ ] Eksempelsaken validerer. En sak uten grunndata (tittel, behov, verdi) avvises med en forståelig feilmelding.
- [ ] En snapshot-test av JSON Schema feiler ved endring i skjemaet. Oppdatering skjer med et eksplisitt flagg.
- [ ] Float-beløp i JSON blir `Decimal` uten avrundingsfeil (for eksempel `850000.10`).
- [ ] `schema_versjon` må være `"1.0"`.

**Utenfor omfang:** Forretningsregler og terskler (DG-04).

### DG-03 — Virksomhetskonfig og norsk formatering
`dokumentgen` `fase-0`

**Leveranse:** Organisasjonsdata og terskler lastes fra `oslobygg.toml`, og
norsk formatering av beløp, dato og klokkeslett er på plass.

**Innhold**
- `konfig/`: modellene `Virksomhet` og `Regelverdier`, og en laster (`tomllib`, med `importlib.resources`).
- `konfig/oslobygg.toml` med terskler fra TQM 836 v16. Adressene er markert som `AVKLARES` (DG-A1).
- `format.py` med `belop()` («850 000»), `belop_protokoll()` («Kr. 850 000,-»), `dato()` («25.09.2026») og `klokkeslett()` («12:00», Europe/Oslo).

**Akseptansekriterier**
- [ ] Konfigen lastes både fra kildetre og fra installert pakke (test med `importlib.resources`).
- [ ] Ukjent virksomhetsnøkkel gir en tydelig feil.
- [ ] Formateringen er testet med grenseverdier: 0, 999, 1 000, 1 300 000, desimaler, og en UTC-tid som krysser midnatt i Oslo.

**Utenfor omfang:** Bruk av konfig i regler (DG-04).

### DG-04 — Valideringsrammeverk og generelle regler
`dokumentgen` `fase-0`

**Leveranse:** `dokumentgen valider <sak.json>` gir en liste med funn (FEIL,
ADVARSEL, INFO) etter reglene i designplanen §6.2.

**Innhold**
- `Funn(kode, alvorlighet, sti, melding, regelkilde)`.
- Regler som rene funksjoner: `V-TERSKEL`, `V-TILBUD-TERSKEL`, `V-VALGT-REF`, `V-MIN-INVITERTE`, `V-SKATTEATTEST`, `V-KONTRAKTSFORM`, `V-FRIST`, `V-MILJO-BEGR`, `V-PROTOKOLL-FRIVILLIG`.
- Porten `Kravavleder` og `IngenKravavleder` (designplanen §6.3).
- CLI-kommandoen `valider`: avslutningskode 1 ved FEIL, og utdata i lesbar form eller som `--json`.
- Scenariokatalogen `tests/dokumentgen/scenarier/`: én JSON-sak per scenario med forventede funnkoder, og én parametrisert test som kjører alle scenariene.

**Akseptansekriterier**
- [ ] Hver regel har tester på begge sider av terskelen (499 999 / 500 000, 1 299 999 / 1 300 000).
- [ ] Reglene leser terskler fra konfig. Ingen beløp står fast i koden (sjekkes med grep i testen).
- [ ] Hvert funn har `regelkilde` (for eksempel «TQM 836 v16 pkt. 6.6»).
- [ ] Egenskapsbasert test (`hypothesis`): validering krasjer aldri på en gyldig `Sak`, bare returnerer funn.

**Utenfor omfang:** Dokumentspesifikke påkrevde felter (kommer i hver dokumentdefinisjon).

### DG-05 — Renderer, dokumentregister, sporing og CLI
`dokumentgen` `fase-0`

**Leveranse:** `generer()` og `dokumentgen generer` produserer `.docx` og
`.sporing.json` for en registrert dokumenttype, her vist med en testmal.

**Innhold**
- `render/`: protokollen `Renderer` og `DocxtplRenderer` med `autoescape=True`, fritekst med linjeskift (`RichText`), dokumentegenskaper og egendefinerte sporingsegenskaper.
- `dokumenter/base.py`: `Dokumentdefinisjon` og et register.
- `sporing.py`: `Sporingspost`, input-hash (kanonisk JSON) og filnavnkonvensjon.
- Modus `--utkast`, som genererer selv om det finnes FEIL og markerer manglende felter.
- En testhjelper for renhetssjekk: ingen `{{`, `{%`, «Velg et element», MACROBUTTON, kommentarer eller gul markering.
- En minimal testmal under `tests/dokumentgen/`. Ingen ekte mal.

**Akseptansekriterier**
- [ ] Brukertekst med `&`, `<` og `"` gir gyldig docx som åpnes i LibreOffice/python-docx.
- [ ] Sporingsfilen inneholder dokument-id, malmanifest, `schema_versjon`, `regler.kilde`, input-hash og funn.
- [ ] Samme input gir samme input-hash. Endret input gir ny hash.
- [ ] Streng modus nekter å generere ved FEIL og viser funnene.

**Utenfor omfang:** Ekte maler.

### DG-21 — Profilressurser (logo og font) fra punkt-assets
`dokumentgen` `fase-0`

**Leveranse:** Oslo-logoen ligger i virksomhetsprofilen med dokumentert kilde,
og de visuelle testene kan gjengi dokumenter med Oslo Sans. Ingen fontfiler
committes.

**Innhold**
- `scripts/dokumentgen/hent_profilressurser.py`:
  - Laster ned `@oslokommune/punkt-assets` i låst versjon fra npm-registeret og verifiserer sha512 (`dist.integrity`).
  - Lager PNG av logoen (`oslologo.svg`) med `cairosvg` og farge fra `profil.logo_farge`.
  - Skriver `KILDE.toml` med versjon, sti, sha256 og lisensmerknad.
- `konfig/profiler/oslobygg/oslologo.png`, `oslologo.svg` og `KILDE.toml`.
- Testoppsett (bare for `-m visuell`): henter Oslo Sans woff2 ved kjøring og gjør den om til ttf med `fontTools` i en midlertidig fontconfig-mappe, med alias `Oslo Sans Office` → `Oslo Sans`.
- Seksjonen `[profil]` i `oslobygg.toml` (designplanen §6.1).

**Akseptansekriterier**
- [ ] Skriptet feiler hvis sha512 ikke stemmer.
- [ ] Logo-PNG-en har minst 300 dpi ved bredden som brukes i malene.
- [ ] En test feiler hvis det finnes fontfiler (`*.ttf`, `*.otf`, `*.woff*`) i repoet eller i `dokumentgen`-pakken.
- [ ] Den visuelle testen gjengir med Oslo Sans når nettverk er tilgjengelig, og hoppes over med tydelig melding når det ikke er det.
- [ ] Fontlisensen (designplanen §8.1) er dokumentert i `KILDE.toml`.

**Utenfor omfang:** Innebygd font i dokumenter og PDF.

---

## Fase 1 — Protokoll uten kunngjøring

### DG-06 — Malgjennomgang: protokoll uten kunngjøring
`dokumentgen` `fase-1` `malgjennomgang`

**Leveranse:** `maler/protokoll-uten-kunngjoring/NOTAT.md` er godkjent. Notatet
beskriver felt for felt hva som genereres, hva som fjernes og hva som forenkles.

**Innhold**
- Feltliste med kilde i `Sak` (fra designplanen §7), med avvik markert.
- Hjelpetekst, kommentarer og faste elementer som skal fjernes.
- Beslutninger om topptekst og logo (DG-A1), antall tilbudsrader og formatet på miljøfeltet.
- Forenklinger som foreslås, med begrunnelse.

**Akseptansekriterier**
- [ ] Hvert felt i TQM 999 v6 er enten mappet, fjernet eller markert som bevisst utelatt.
- [ ] Notatet er godkjent av eier i PR-review.

### DG-07 — Taggeskript og malkopi: protokoll
`dokumentgen` `fase-1`

**Leveranse:** Et reproduserbart skript lager malkopien med Jinja-tagger fra
TQM-originalen, med manifest.

**Innhold**
- `scripts/dokumentgen/tagg_protokoll.py`:
  - Fjerner TQM-topptekst og -bunntekst, kommentarer og hjelpetekst.
  - Gjør avkrysningsbokser og nedtrekkslister om til tagger.
  - Gjør tilbudstabellen om til en `{%tr for %}`-løkke.
- `maler/protokoll-uten-kunngjoring/mal.docx` og `manifest.toml`, med TQM 999 v6 og hash av originalen.
- Lagring av originalen i henhold til DG-A2.

**Akseptansekriterier**
- [ ] Skriptet feiler med tydelig melding hvis et forventet anker mangler (testet med en endret kopi).
- [ ] To kjøringer gir identisk `word/document.xml`.
- [ ] Malkopien inneholder ingen kommentarer, MACROBUTTON-felt eller innholdskontroller fra originalen.
- [ ] Listen over variabler i malen er dokumentert i NOTAT.md.

**Utenfor omfang:** Kontekstbygging (DG-09).

### DG-08 — Regelbaserte begrunnelsestekster
`dokumentgen` `fase-1`

**Leveranse:** `tekst.begrunnelse(sak, regler)` lager protokollens
begrunnelsesfelt i tre deler, med formuleringer fra en fil som juridisk kan
gjennomgå.

**Innhold**
- `tekst/fraser.toml` med formuleringer. Hver formulering har `status = "utkast" | "godkjent"`.
- Tre rene funksjoner:
  - Hvorfor anskaffelsen er lovlig uten kunngjøring.
  - Hvorfor bare én eller få leverandører er invitert.
  - Hvorfor tilbudet er valgt.
- Overstyring fra `evaluering.begrunnelse_overstyring`. Sporingen merker om teksten er generert eller overstyrt.

**Akseptansekriterier**
- [ ] Del 2 tas bare med når det er færre enn 3 inviterte, og den bruker brukerens faktiske unntaksbegrunnelse.
- [ ] Ingen juridisk ordlyd står i Python-koden. Alt ligger i `fraser.toml`.
- [ ] Formuleringer med `utkast`-status gir en ADVARSEL i streng modus.
- [ ] Testene dekker 1, 2 og 3+ tilbud, med og uten poeng per kriterium.

**Utenfor omfang:** Språkmodell.

### DG-09 — Dokumentdefinisjon: protokoll uten kunngjøring
`dokumentgen` `fase-1`

**Leveranse:** `dokumentgen generer protokoll-uten-kunngjoring sak.json` gir en
ferdig utfylt protokoll som kan sendes til godkjenning i Websak.

**Innhold**
- `dokumenter/protokoll_uten_kunngjoring.py` med `gjelder_for` (fra 100 000 kr), dokumentkrav, kontekst og filnavn.
- Fire eksempelsaker (designplanen §9) med snapshot-tester av tekstinnholdet.
- Renhetstest og mal-kontrakttest: alle variabler i malen finnes i konteksten.

**Akseptansekriterier**
- [ ] Alle felter fra NOTAT.md (DG-06) er fylt ut i eksempelsakene 1–3.
- [ ] Eksempelsak 4 (feilsaker) avvises i streng modus med forventede funnkoder.
- [ ] Tilbudstabellen har like mange rader som det er tilbud, sortert på mottakstidspunkt.
- [ ] Den genererte protokollen er sjekket visuelt mot TQM-malen. Skjermbilde ligger ved i PR-en.

**Utenfor omfang:** HTTP- og MCP-adaptere.

---

## Fase 2 — Tilbudsinnbydelse

### DG-10 — Malgjennomgang: tilbudsinnbydelse
`dokumentgen` `fase-2` `malgjennomgang`

**Leveranse:** Godkjent NOTAT.md for tilbudsinnbydelsen.

**Innhold**
- Feltliste og betingede avsnitt:
  - skatteattest over 500 000 kr
  - bestillingsbrev eller kontrakt
  - kommunikasjon via e-post eller KGV
- Kriterietabeller og vedleggsliste som utledes fra saken.
- Skrivefeil som skal meldes til juridisk («ansakffelser», «likebehanding», «inidikerer», «Oppdragsgives», «dd.mm.ååå»).
- Hvordan henvisningen til Oslomodellen og aktsomhetsvurderinger erstattes med konkrete krav fra `Sak.krav`.

**Akseptansekriterier:** Som DG-06.

### DG-11 — Tilbudsinnbydelse: malkopi og dokumentdefinisjon
`dokumentgen` `fase-2`

**Leveranse:** `dokumentgen generer tilbudsinnbydelse sak.json` gir en ferdig
tilbudsinnbydelse der innholdet stemmer med protokollen for samme sak.

**Akseptansekriterier**
- [ ] Taggeskript, malkopi og manifest oppfyller de samme kriteriene som i DG-07.
- [ ] Test av sammenhengen mellom dokumentene: samme sak gir samme tilbudsfrist, krav og verdi i protokoll og tilbudsinnbydelse.
- [ ] Setningen om skatteattest vises bare fra 500 000 kr.

---

## Fase 3 — Kravvedlegg

### DG-12 — Klausulbibliotek (struktur og versjonering)
`dokumentgen` `fase-3`

**Leveranse:** Et versjonert bibliotek med klausultekster for Oslomodellen
(A–E, F–H, I–T, U, V), kravsett A og B og miljøkrav, som kan settes inn i
dokumenter.

**Blokkert av:** Klausultekstene må skaffes (TQM/FEL).

**Akseptansekriterier**
- [ ] Hver klausul har kilde, versjon og gyldig-fra-dato.
- [ ] Klausulversjonen som er brukt, registreres i sporingen.

### DG-13 — Koble på eksisterende kravavledning
`dokumentgen` `fase-3`

**Leveranse:** Den eksisterende koden for kravavledning implementerer porten
`Kravavleder`. Avvik mellom forslag og valg gir ADVARSEL med krav om begrunnelse.

**Akseptansekriterier**
- [ ] Input-kontrakten er uendret (ingen ny hovedversjon).
- [ ] `krav.kilde` og forslaget registreres i sporingen.

### DG-14 — Kravvedlegg
`dokumentgen` `fase-3`

**Leveranse:** `dokumentgen generer kravvedlegg sak.json` setter sammen de
kravene som gjelder for saken, til vedlegg til tilbudsinnbydelsen.

**Akseptansekriterier**
- [ ] Bare valgte seriøsitetskrav, kravsett og miljøkrav tas med.
- [ ] Vedleggslisten i tilbudsinnbydelsen (DG-11) viser til kravvedlegget.

---

## Fase 4 — Bestillingsbrev

### DG-15 — Malgjennomgang: bestillingsbrev (3 varianter)
`dokumentgen` `fase-4` `malgjennomgang`

**Leveranse:** Godkjent NOTAT.md som skiller mellom felles innhold og innhold
per variant.

**Blokkert av:** Malene for varer og for bygg og anlegg/renhold.

**Innhold:** Teksten «bokstav A til E», som i dag står fast i malen, erstattes
med valg fra `Sak.krav`. Valget mellom totalpris og honorarbudsjett, og
fakturafeltene, beskrives også.

### DG-16 — Bestillingsbrev tjenester
### DG-17 — Bestillingsbrev varer
### DG-18 — Bestillingsbrev bygg og anlegg / renhold
`dokumentgen` `fase-4`

**Leveranse (hver):** `dokumentgen generer bestillingsbrev-<variant> sak.json`.
DG-16 etablerer felles kontekst. DG-17 og DG-18 legger bare til maler og
forskjeller.

**Akseptansekriterier (hver)**
- [ ] Oslomodellen-vedlegget hentes fra klausulbiblioteket etter valgte krav.
- [ ] `gjelder_for` avviser saker fra 500 000 kr, der kontrakt kreves (V-KONTRAKTSFORM).
- [ ] Fakturaadressen hentes fra virksomhetskonfig.

---

## Fase 5 — Meddelelsesbrev

### DG-19 — Malgjennomgang: meddelelsesbrev og evalueringsmodell
`dokumentgen` `fase-5` `malgjennomgang`

**Leveranse:** Godkjent NOTAT.md, og en beslutning om detaljnivået i
`Evaluering` (bare valgt tilbud og begrunnelse, eller poeng per kriterium).

**Blokkert av:** Mal for meddelelsesbrev.

### DG-20 — Meddelelsesbrev
`dokumentgen` `fase-5`

**Leveranse:** `dokumentgen generer meddelelsesbrev sak.json` gir ett brev per
tilbyder, med kort begrunnelse (prosedyre 6.7).

**Akseptansekriterier**
- [ ] Begrunnelsen gjenbruker `tekst/` fra DG-08, og er konsistent med protokollen for samme sak.
