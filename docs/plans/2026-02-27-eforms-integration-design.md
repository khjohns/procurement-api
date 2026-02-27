# eForms-integrasjon — design

Dato: 2026-02-27

## Bakgrunn

Doffin-kunngjøringer inneholder strukturert data i eForms UBL XML-format som
ikke finnes i Artifik API: tildelingskriterier med vekting, kvalifikasjonskrav,
utelukkelsesgrunnlag, rammeavtale-verdier, og norske miljøkrav-koder (§ 7-9).

To bruksområder:

1. **Protokoll** — berike protokollgeneratoren med kunngjøringsdata
2. **Virksomhetsanalyse** — mønstre og sammenhenger på tvers av anskaffelser

## Beslutninger

| Spørsmål | Valg |
|----------|------|
| Protokoll-kobling | Automatisk i CLI — henter eForms under generering |
| Analyse-grensesnitt | MCP-verktøy + CLI med CSV/JSON-eksport |
| Analyse-scope | Alle kunngjøringer på Doffin for oppdragsgiver (ikke begrenset til Artifik) |
| Data-strategi | Search-API som grunnlag, selektiv XML-download for berikelse |
| Caching | Lokal JSON-cache i `.cache/eforms/` |
| Arkitektur | Flat parser-modul (`eforms.py`) + cache i DoffinClient |

## Arkitektur

```
                       ┌─────────────────┐
                       │  eForms parser   │
                       │  src/app/eforms.py│
                       └────────┬────────┘
                                │ parse_eforms_xml(bytes) → EFormsNotice
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼───────┐       ┌───────▼───────┐
            │  DoffinClient  │       │  Protokoll    │
            │  get_notice()  │       │  __main__.py  │
            │  analyze_buyer()│      │  docx_del2/3  │
            └───────┬───────┘       └───────┬───────┘
                    │                       │
              .cache/eforms/         Artifik + Doffin
              {doffin_id}.json       → docx med berikelse
```

## Seksjon 1: eForms-parser (`src/app/eforms.py`)

Kjernemodulen. Parser eForms UBL XML til typede dataclasses.

### Datamodell

```python
@dataclass
class AwardCriterion:
    name: str | None
    type: str | None        # price, quality, cost
    weight_percent: float | None

@dataclass
class SelectionCriterion:
    type_code: str | None   # BT-809: sui-act, tp-abil, ef-stand, etc.
    description: str | None

@dataclass
class ExclusionGround:
    code: str | None
    description: str | None

@dataclass
class EFormsNotice:
    # Metadata
    doffin_id: str
    notice_type: str              # ContractNotice, ContractAwardNotice, etc.
    issue_date: str | None

    # Buyer
    buyer_name: str | None
    buyer_org_id: str | None

    # Procurement
    title: str | None
    description: str | None
    procedure_code: str | None    # open, restricted, neg-w-call, etc.
    contract_nature: str | None   # services, supplies, works
    cpv_codes: list[str]
    estimated_value: float | None
    currency: str | None
    duration_months: int | None

    # Award criteria (protokoll-kritisk)
    award_criteria: list[AwardCriterion]

    # Selection/qualification criteria
    selection_criteria: list[SelectionCriterion]

    # Exclusion grounds
    exclusion_grounds: list[ExclusionGround]

    # Framework
    framework_type: str | None
    framework_max_value: float | None
    framework_max_participants: int | None

    # Norwegian extensions (FOA § 7-9)
    env_criterion_code: str | None

    # Submission
    submission_deadline: str | None

    # Lots (summary)
    lots: list[dict]

    def to_dict(self) -> dict: ...
```

### Parser-funksjon

```python
def parse_eforms_xml(xml_bytes: bytes, doffin_id: str = "") -> EFormsNotice:
```

- Bruker stdlib `xml.etree.ElementTree` — ingen nye dependencies
- Håndterer eForms-namespaces: cbc, cac, efac, efbc, efext
- Tolerant: returnerer None for felter som ikke finnes i XML-en
- Tildelingskriterier: BT-539 (type) + BT-734/540 (navn/beskrivelse) + BT-5421 (vekt)
- Kvalifikasjonskrav: BT-809 (type) + BT-750 (beskrivelse)
- Utelukkelsesgrunnlag: BT-67a (brukt/ubrukt) + BT-67b (beskrivelse)

### eForms-namespaces

```python
_NS = {
    'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'efac': 'http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1',
    'efbc': 'http://data.europa.eu/p27/eforms-ubl-extension-basic-components/1',
    'efext': 'http://data.europa.eu/p27/eforms-ubl-extensions/1',
    'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
}
```

## Seksjon 2: DoffinClient-endringer (`src/app/doffin.py`)

### API-endringer

| Metode | Før | Etter |
|--------|-----|-------|
| `download_notice()` | `@mcp_tool`, returnerer `bytes` | Intern `_download_raw()`, ingen MCP |
| — | — | `get_notice(doffin_id)` — nytt MCP-verktøy: download + parse + cache → dict |
| — | — | `analyze_buyer(search_string, enrich)` — nytt MCP-verktøy: søk + berik |

### `get_notice(doffin_id) → dict`

```python
@mcp_tool(description="Download and parse a Doffin eForms notice. Returns structured JSON.")
def get_notice(self, doffin_id: str) -> dict:
    cached = self._cache_read(doffin_id)
    if cached:
        return cached
    xml_bytes = self._download_raw(doffin_id)
    notice = parse_eforms_xml(xml_bytes, doffin_id)
    result = notice.to_dict()
    self._cache_write(doffin_id, result)
    return result
```

### `analyze_buyer(search_string, enrich) → dict`

```python
@mcp_tool(description="Search Doffin notices for a buyer. Optionally enrich with eForms data.")
def analyze_buyer(self, search_string: str, enrich: bool = True) -> dict:
    # 1. Paginer gjennom alle search-treff (maks 100/side)
    # 2. For hver: hvis enrich → get_notice() (bruker cache)
    # 3. Returner aggregert oversikt
```

Returnerer:

```json
{
  "buyer": "Oslobygg KF",
  "total_notices": 47,
  "notices": [ { "doffin_id": "...", "title": "...", "award_criteria": [...], ... } ],
  "summary": {
    "by_procedure": { "open": 30, "restricted": 12, ... },
    "by_contract_nature": { "services": 25, "works": 15, ... },
    "avg_award_criteria_count": 3.2,
    "env_compliance": { "criteria": 10, "spec": 5, "none": 2, "unknown": 30 }
  }
}
```

### Cache

```
.cache/eforms/{doffin_id}.json
```

- Filbasert, ingen TTL (kunngjøringer endres sjelden)
- `.cache/` i `.gitignore`
- Cache-path konfigurerbar via constructor-parameter

## Seksjon 3: Protokoll-integrasjon

### Flyt i `__main__.py`

```
1. Hent procurement + activities fra Artifik    (eksisterende)
2. Finn Doffin-referanse fra DOFFIN_NOTICE_STATUS_PUBLISHED activity
3. Hvis funnet: DoffinClient.get_notice(doffin_id) → eforms dict
4. Kall generate_protokoll_docx(procurement, activities, eforms=eforms)
```

Krever `DOFFIN_API_KEY` — hentes fra GCP Secret Manager i CLI,
eller fra env-var i MCP-serveren.

### Generator-signaturene

```python
# Bakoverkompatibelt — eforms er valgfri
def generate_protokoll_docx(procurement, activities, eforms=None) -> DocxDocument
def generate_protokoll_docx_del2(procurement, activities, eforms=None) -> DocxDocument
```

### Berikede seksjoner

| Protokoll-seksjon | Uten eForms (nåværende) | Med eForms |
|---|---|---|
| Tildelingskriterier | Manuelt [Fyll inn] | Tabell: navn + type + vekt % |
| Kvalifikasjonskrav | Manuelt [Fyll inn] | Type + beskrivelse per krav |
| Prosedyretype | Artifik `procedure` | Bekreftet fra kunngjøring |
| Estimert verdi | Artifik `estimated_value` | Kryssjekk mot eForms BT-27 |
| Rammeavtale maks verdi | Ikke tilgjengelig | BT-271 fra eForms |
| Kontraktstype | Ikke vist | Tjeneste/varer/bygg fra BT-23 |
| Miljøkrav § 7-9 | Ikke vist | NOR-utvidelses kode + beskrivelse |
| Utelukkelsesgrunnlag | Ikke vist | Referanse (protokollen krever det ikke, men nyttig) |

Felter som **ikke** berikes (forblir manuelle): tildelingsbegrunnelse,
avvisningsbegrunnelse, inhabilitet, underleverandører — dette er
post-kunngjøringsdata som ikke finnes i eForms.

## Seksjon 4: Analyse-CLI

### Kommando

```bash
python -m analyse --buyer "Oslobygg"                    # default: JSON til stdout
python -m analyse --buyer "Oslobygg" --format csv -o analyse.csv
python -m analyse --buyer "Oslobygg" --no-enrich        # kun search-data
```

### Plassering

```
src/analyse/__init__.py
src/analyse/__main__.py
```

### CSV-kolonner

```
doffin_id, title, notice_type, publication_date, status,
procedure_code, contract_nature, estimated_value, currency,
award_criterion_1_name, award_criterion_1_type, award_criterion_1_weight,
award_criterion_2_name, award_criterion_2_type, award_criterion_2_weight,
award_criterion_3_name, award_criterion_3_type, award_criterion_3_weight,
award_criterion_4_name, award_criterion_4_type, award_criterion_4_weight,
selection_criteria_count, env_criterion_code,
winner_1_name, winner_1_org_id, received_tenders,
framework_type, framework_max_value
```

### MCP-verktøy

`analyze_buyer()` og `get_notice()` i DoffinClient gir Claude interaktiv
tilgang til samme data. Claude kan svare på spørsmål som:

- "Hvilke tildelingskriterier bruker Oslobygg oftest?"
- "Hvor stor andel av anskaffelsene har miljøkrav i tildelingskriteriene?"
- "Hvilke leverandører vinner flest konkurranser?"

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/app/eforms.py` | **Ny** — parser + dataclasses |
| `src/app/doffin.py` | Endre: `download_notice` → intern, legg til `get_notice` + `analyze_buyer` + cache |
| `src/protokoll/__main__.py` | Endre: legg til Doffin-steg, hent eForms, send til generator |
| `src/protokoll/docx_del2.py` | Endre: aksepter `eforms` param, berik seksjoner |
| `src/protokoll/docx_del3.py` | Endre: aksepter `eforms` param, berik seksjoner |
| `src/analyse/__init__.py` | **Ny** — analyse-modul |
| `src/analyse/__main__.py` | **Ny** — CLI for porteføljeanalyse |
| `deploy.sh` | Allerede oppdatert med DOFFIN_API_KEY |
| `.gitignore` | Legg til `.cache/` |

## Dependencies

Ingen nye. Bruker:
- `xml.etree.ElementTree` (stdlib) for XML-parsing
- `json` (stdlib) for cache
- `csv` (stdlib) for CSV-eksport

## Begrensninger og risiko

- **XML-struktur varierer** mellom kunngjøringstyper (CN vs CAN vs PIN).
  Parseren må håndtere manglende felter gracefully.
- **Doffin rate-limiting** er ukjent. `analyze_buyer` med `enrich=True`
  gjør mange kall. Cache reduserer problemet ved gjentatte kjøringer.
- **Eldre kunngjøringer** (pre-eForms) kan ha annet XML-format.
  Parseren bør fange dette og returnere tomme felter.
- **Nasjonale kunngjøringer** (under EØS) bruker forenklede eForms-skjemaer
  med færre felter. Parseren håndterer dette via None-defaults.
