# eForms/Doffin Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Parse eForms XML from Doffin to enrich protokoll generation and enable portfolio analytics.

**Architecture:** New `src/app/eforms.py` parser module with dataclasses. DoffinClient gets `get_notice()` (cached download+parse) and `analyze_buyer()` MCP tools. Protokoll generators accept optional `eforms` dict. New `src/analyse/` CLI for CSV/JSON export.

**Tech Stack:** Python 3.11+, xml.etree.ElementTree (stdlib), existing DoffinClient, python-docx.

**Design doc:** `docs/plans/2026-02-27-eforms-integration-design.md`

---

## Task 1: Create eForms XML test fixture

We need a real eForms XML to develop the parser against. Download one from Doffin and save as test fixture.

**Files:**
- Create: `tests/fixtures/eforms-2026-100122.xml`

**Step 1: Download a real notice XML**

```bash
cd /Users/kasper/Projects/Catenda/procurement-api
python3 -c "
import sys; sys.path.insert(0, 'src')
import subprocess, json
key = subprocess.run(
    ['gcloud', 'secrets', 'versions', 'access', 'latest',
     '--secret=doffin-api-key', '--project=procurement-mcp'],
    capture_output=True, text=True, check=True
).stdout.strip()
from app.doffin import DoffinClient
c = DoffinClient(api_key=key)
xml = c.download_notice('2026-100122')
with open('tests/fixtures/eforms-2026-100122.xml', 'wb') as f:
    f.write(xml)
print(f'Saved {len(xml)} bytes')
"
```

**Step 2: Inspect the XML structure**

```bash
head -100 tests/fixtures/eforms-2026-100122.xml
```

Verify it contains: `<ContractNotice` root, namespaces for cbc/cac/efac/efbc/efext, `<cac:ProcurementProjectLot>` with award criteria, `<cac:TenderingTerms>` with selection criteria.

**Step 3: Create a minimal fixture for unit tests**

Read the real XML, then create `tests/fixtures/eforms-minimal.xml` — a stripped-down version (~50 lines) with just the fields we parse. This avoids committing a 54KB fixture. The real XML stays in fixtures for integration tests.

**Step 4: Commit**

```bash
mkdir -p tests/fixtures
git add tests/fixtures/eforms-minimal.xml
git commit -m "Add minimal eForms XML test fixture"
```

> **Note:** The real 54KB XML can stay untracked or in .gitignore if too large. The minimal fixture is what tests use.

---

## Task 2: eForms parser — dataclasses and core parser

**Files:**
- Create: `src/app/eforms.py`
- Create: `tests/test_eforms_parser.py`

**Step 1: Write the failing tests**

File: `tests/test_eforms_parser.py`

```python
"""Tests for eForms UBL XML parser."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.eforms import EFormsNotice, parse_eforms_xml


# -- Minimal XML fixture (inline for unit tests) --

MINIMAL_XML = b"""\
<?xml version="1.0" encoding="UTF-8"?>
<ContractNotice
    xmlns="urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:efac="http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1"
    xmlns:efbc="http://data.europa.eu/p27/eforms-ubl-extension-basic-components/1"
    xmlns:efext="http://data.europa.eu/p27/eforms-ubl-extensions/1"
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ID>test-notice-1</cbc:ID>
  <cbc:IssueDate>2026-01-06</cbc:IssueDate>
  <cbc:ContractFolderID>cf-001</cbc:ContractFolderID>
  <cac:ContractingParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Testkommune KF</cbc:Name></cac:PartyName>
      <cac:PartyIdentification>
        <cbc:ID schemeName="NO:ORGNR">123456789</cbc:ID>
      </cac:PartyIdentification>
    </cac:Party>
  </cac:ContractingParty>
  <cac:ProcurementProject>
    <cbc:Name>Testkontrakt</cbc:Name>
    <cbc:Description>En beskrivelse</cbc:Description>
    <cbc:ProcurementTypeCode listName="contract-nature">services</cbc:ProcurementTypeCode>
    <cac:MainCommodityClassification>
      <cbc:ItemClassificationCode>50112100</cbc:ItemClassificationCode>
    </cac:MainCommodityClassification>
    <cac:PlannedPeriod>
      <cbc:DurationMeasure unitCode="MONTH">48</cbc:DurationMeasure>
    </cac:PlannedPeriod>
    <cac:RequestedTenderTotal>
      <cbc:EstimatedOverallContractAmount currencyID="NOK">4000000</cbc:EstimatedOverallContractAmount>
    </cac:RequestedTenderTotal>
  </cac:ProcurementProject>
  <cac:TenderingProcess>
    <cbc:ProcedureCode listName="procurement-procedure-type">open</cbc:ProcedureCode>
    <cac:TenderSubmissionDeadlinePeriod>
      <cbc:EndDate>2026-02-09</cbc:EndDate>
    </cac:TenderSubmissionDeadlinePeriod>
  </cac:TenderingProcess>
</ContractNotice>
"""


def test_parse_basic_metadata():
    notice = parse_eforms_xml(MINIMAL_XML, doffin_id="2026-100122")
    assert notice.doffin_id == "2026-100122"
    assert notice.notice_type == "ContractNotice"
    assert notice.issue_date == "2026-01-06"


def test_parse_buyer():
    notice = parse_eforms_xml(MINIMAL_XML)
    assert notice.buyer_name == "Testkommune KF"
    assert notice.buyer_org_id == "123456789"


def test_parse_procurement():
    notice = parse_eforms_xml(MINIMAL_XML)
    assert notice.title == "Testkontrakt"
    assert notice.description == "En beskrivelse"
    assert notice.procedure_code == "open"
    assert notice.contract_nature == "services"
    assert notice.cpv_codes == ["50112100"]
    assert notice.estimated_value == 4000000.0
    assert notice.currency == "NOK"
    assert notice.duration_months == 48
    assert notice.submission_deadline == "2026-02-09"


def test_parse_empty_xml():
    """Parser should handle minimal/empty XML gracefully."""
    xml = b'<?xml version="1.0"?><ContractNotice xmlns="urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2"></ContractNotice>'
    notice = parse_eforms_xml(xml)
    assert notice.notice_type == "ContractNotice"
    assert notice.buyer_name is None
    assert notice.award_criteria == []
    assert notice.cpv_codes == []


def test_to_dict_roundtrip():
    notice = parse_eforms_xml(MINIMAL_XML, doffin_id="test")
    d = notice.to_dict()
    assert d["doffin_id"] == "test"
    assert d["buyer_name"] == "Testkommune KF"
    assert d["procedure_code"] == "open"
    assert isinstance(d["award_criteria"], list)
    assert isinstance(d["cpv_codes"], list)
```

**Step 2: Run tests — verify they fail**

```bash
pytest tests/test_eforms_parser.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.eforms'`

**Step 3: Implement dataclasses and parser**

File: `src/app/eforms.py`

```python
"""eForms UBL XML parser for Doffin notices."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field

# eForms UBL XML namespaces
_NS = {
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "efac": "http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1",
    "efbc": "http://data.europa.eu/p27/eforms-ubl-extension-basic-components/1",
    "efext": "http://data.europa.eu/p27/eforms-ubl-extensions/1",
    "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
}


@dataclass
class AwardCriterion:
    name: str | None = None
    type: str | None = None  # price, quality, cost
    weight_percent: float | None = None


@dataclass
class SelectionCriterion:
    type_code: str | None = None
    description: str | None = None


@dataclass
class ExclusionGround:
    code: str | None = None
    description: str | None = None


@dataclass
class EFormsNotice:
    doffin_id: str = ""
    notice_type: str = ""
    issue_date: str | None = None

    buyer_name: str | None = None
    buyer_org_id: str | None = None

    title: str | None = None
    description: str | None = None
    procedure_code: str | None = None
    contract_nature: str | None = None
    cpv_codes: list[str] = field(default_factory=list)
    estimated_value: float | None = None
    currency: str | None = None
    duration_months: int | None = None

    award_criteria: list[AwardCriterion] = field(default_factory=list)
    selection_criteria: list[SelectionCriterion] = field(default_factory=list)
    exclusion_grounds: list[ExclusionGround] = field(default_factory=list)

    framework_type: str | None = None
    framework_max_value: float | None = None
    framework_max_participants: int | None = None

    env_criterion_code: str | None = None
    submission_deadline: str | None = None

    lots: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _text(el: ET.Element, path: str) -> str | None:
    """Extract text from element at XPath, or None."""
    found = el.find(path, _NS)
    return found.text if found is not None and found.text else None


def _float(el: ET.Element, path: str) -> float | None:
    """Extract float from element at XPath, or None."""
    t = _text(el, path)
    if t is None:
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _int(el: ET.Element, path: str) -> int | None:
    """Extract int from element at XPath, or None."""
    t = _text(el, path)
    if t is None:
        return None
    try:
        return int(float(t))
    except ValueError:
        return None


def parse_eforms_xml(xml_bytes: bytes, doffin_id: str = "") -> EFormsNotice:
    """Parse eForms UBL XML into structured EFormsNotice."""
    root = ET.fromstring(xml_bytes)
    tag = root.tag
    notice_type = tag.split("}")[-1] if "}" in tag else tag

    notice = EFormsNotice(doffin_id=doffin_id, notice_type=notice_type)

    # Metadata
    notice.issue_date = _text(root, "cbc:IssueDate")

    # Buyer
    party = root.find(".//cac:ContractingParty/cac:Party", _NS)
    if party is not None:
        notice.buyer_name = _text(party, "cac:PartyName/cbc:Name")
        notice.buyer_org_id = _text(party, "cac:PartyIdentification/cbc:ID")

    # Procurement project (top-level or first lot)
    proj = root.find(".//cac:ProcurementProject", _NS)
    if proj is not None:
        notice.title = _text(proj, "cbc:Name")
        notice.description = _text(proj, "cbc:Description")
        notice.contract_nature = _text(proj, "cbc:ProcurementTypeCode")
        # CPV codes
        for cls in proj.findall(
            ".//cac:CommodityClassification/cbc:ItemClassificationCode", _NS
        ):
            if cls.text:
                notice.cpv_codes.append(cls.text)
        # Value
        notice.estimated_value = _float(
            proj, "cac:RequestedTenderTotal/cbc:EstimatedOverallContractAmount"
        )
        val_el = proj.find(
            "cac:RequestedTenderTotal/cbc:EstimatedOverallContractAmount", _NS
        )
        if val_el is not None:
            notice.currency = val_el.get("currencyID")
        # Duration
        notice.duration_months = _int(
            proj, "cac:PlannedPeriod/cbc:DurationMeasure"
        )

    # Procedure
    process = root.find(".//cac:TenderingProcess", _NS)
    if process is not None:
        notice.procedure_code = _text(process, "cbc:ProcedureCode")

    # Submission deadline
    notice.submission_deadline = _text(
        root,
        ".//cac:TenderingProcess/cac:TenderSubmissionDeadlinePeriod/cbc:EndDate",
    )

    # Award criteria, selection criteria, exclusion grounds — from lots
    _parse_lots(root, notice)

    # Framework agreement
    _parse_framework(root, notice)

    return notice


def _parse_lots(root: ET.Element, notice: EFormsNotice) -> None:
    """Parse lot-level data: award criteria, selection criteria, lots summary."""
    for lot in root.findall(".//cac:ProcurementProjectLot", _NS):
        lot_id = _text(lot, "cbc:ID")

        # Lot summary
        lot_proj = lot.find("cac:ProcurementProject", _NS)
        lot_info: dict = {"id": lot_id}
        if lot_proj is not None:
            lot_info["title"] = _text(lot_proj, "cbc:Name")
            lot_info["description"] = _text(lot_proj, "cbc:Description")
        notice.lots.append(lot_info)

        # Award criteria — look in SubordinateAwardingCriterion
        for sub in lot.findall(
            ".//cac:AwardingTerms/cac:AwardingCriterion/cac:SubordinateAwardingCriterion",
            _NS,
        ):
            ac = AwardCriterion()
            ac.name = _text(sub, "cbc:Name")
            if ac.name is None:
                ac.name = _text(sub, "cbc:Description")
            ac.type = _text(sub, "cbc:AwardingCriterionTypeCode")

            # Weight from eForms extension
            param = sub.find(".//efac:AwardCriterionParameter", _NS)
            if param is not None:
                ac.weight_percent = _float(param, "efbc:ParameterNumeric")
            notice.award_criteria.append(ac)

        # Selection criteria (BT-809 + BT-750)
        for sel in lot.findall(
            ".//cac:TenderingTerms/cac:TendererQualificationRequest", _NS
        ):
            sc = SelectionCriterion()
            sc.description = _text(sel, "cbc:Description")
            code_el = sel.find("cbc:CompanyLegalFormCode", _NS)
            if code_el is not None:
                sc.type_code = code_el.text
            if sc.description or sc.type_code:
                notice.selection_criteria.append(sc)

        # Exclusion grounds
        for eg in lot.findall(".//efac:ExclusionGround", _NS):
            ground = ExclusionGround()
            ground.code = _text(eg, "efbc:ExclusionGroundCode")
            ground.description = _text(eg, "efbc:ExclusionGroundDescription")
            if ground.code or ground.description:
                notice.exclusion_grounds.append(ground)

        # Norwegian env criterion (NOR extension)
        for sub in lot.findall(
            ".//cac:AwardingTerms/cac:AwardingCriterion/cac:SubordinateAwardingCriterion",
            _NS,
        ):
            type_code = _text(sub, "cbc:AwardingCriterionTypeCode")
            if type_code and type_code.startswith("quality-nor-env"):
                notice.env_criterion_code = type_code


def _parse_framework(root: ET.Element, notice: EFormsNotice) -> None:
    """Parse framework agreement details."""
    fa = root.find(".//cac:FrameworkAgreement", _NS)
    if fa is None:
        fa = root.find(
            ".//cac:TenderingProcess/cac:FrameworkAgreement", _NS
        )
    if fa is not None:
        notice.framework_type = _text(fa, "cbc:FrequencyCode")
        max_val = fa.find("cbc:MaximumValueAmount", _NS)
        if max_val is not None and max_val.text:
            try:
                notice.framework_max_value = float(max_val.text)
            except ValueError:
                pass
        notice.framework_max_participants = _int(
            fa, "cbc:MaximumOperatorQuantity"
        )
```

**Step 4: Run tests — verify they pass**

```bash
pytest tests/test_eforms_parser.py -v
```

Expected: All 5 tests PASS.

**Step 5: Lint**

```bash
ruff check src/app/eforms.py tests/test_eforms_parser.py
```

**Step 6: Commit**

```bash
git add src/app/eforms.py tests/test_eforms_parser.py
git commit -m "Add eForms UBL XML parser with dataclasses and tests"
```

---

## Task 3: Validate parser against real Doffin XML

Depends on Task 1 (fixture) and Task 2 (parser).

**Files:**
- Modify: `tests/test_eforms_parser.py` (add integration test)
- Possibly adjust: `src/app/eforms.py` (fix XPaths if real XML differs)

**Step 1: Write integration test using real fixture**

Append to `tests/test_eforms_parser.py`:

```python
_FIXTURE_DIR = Path(__file__).parent / "fixtures"


def test_parse_real_notice():
    """Parse a real Doffin notice (2026-100122: Rengjøring av tjenestebiler)."""
    xml_path = _FIXTURE_DIR / "eforms-2026-100122.xml"
    if not xml_path.exists():
        import pytest
        pytest.skip("Real fixture not available — run Task 1 to download")

    xml_bytes = xml_path.read_bytes()
    notice = parse_eforms_xml(xml_bytes, doffin_id="2026-100122")

    # Known facts from previous analysis
    assert notice.notice_type in ("ContractNotice", "ContractAwardNotice")
    assert notice.buyer_name is not None
    assert notice.procedure_code is not None
    assert len(notice.award_criteria) > 0, "Should have award criteria"
    # OSL0032 had: Pris 30%, Kvalitet 20%, Gjennomføring 20%, Miljø 30%
    weights = [c.weight_percent for c in notice.award_criteria if c.weight_percent]
    assert len(weights) >= 2, f"Expected weighted criteria, got {notice.award_criteria}"
    assert notice.estimated_value is not None or notice.framework_max_value is not None

    # Verify to_dict works
    d = notice.to_dict()
    assert isinstance(d, dict)
    assert len(d["award_criteria"]) > 0
```

**Step 2: Run — fix XPaths as needed**

```bash
pytest tests/test_eforms_parser.py::test_parse_real_notice -v
```

If XPaths don't match real XML, inspect the fixture and adjust `_parse_lots`, `_parse_framework` etc. in `eforms.py`. The eForms XML structure varies by SDK version — common differences:

- Award criteria may be nested deeper in `ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/efext:EformsExtension`
- Selection criteria may use `efac:SelectionCriteria` instead of `cac:TendererQualificationRequest`
- The root namespace varies between notice types

**Step 3: Commit fixes**

```bash
git add src/app/eforms.py tests/test_eforms_parser.py
git commit -m "Validate eForms parser against real Doffin notice"
```

---

## Task 4: DoffinClient — cache and get_notice MCP tool

**Files:**
- Modify: `src/app/doffin.py`
- Create: `tests/test_eforms_cache.py`

**Step 1: Write cache tests**

File: `tests/test_eforms_cache.py`

```python
"""Tests for DoffinClient cache and get_notice."""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.doffin import DoffinClient

MINIMAL_XML = b"""\
<?xml version="1.0" encoding="UTF-8"?>
<ContractNotice
    xmlns="urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>cache-test</cbc:ID>
  <cbc:IssueDate>2026-01-01</cbc:IssueDate>
</ContractNotice>
"""


def test_get_notice_caches_result():
    """get_notice should cache parsed result and not re-download."""
    with tempfile.TemporaryDirectory() as tmpdir:
        client = DoffinClient(api_key="fake", cache_dir=tmpdir)

        with patch.object(client, "_download_raw", return_value=MINIMAL_XML) as mock_dl:
            result1 = client.get_notice("test-001")
            result2 = client.get_notice("test-001")

        mock_dl.assert_called_once()  # Only downloaded once
        assert result1 == result2
        assert result1["doffin_id"] == "test-001"
        assert result1["notice_type"] == "ContractNotice"

        # Verify cache file exists
        cache_file = Path(tmpdir) / "test-001.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["doffin_id"] == "test-001"


def test_get_notice_returns_dict():
    """get_notice should return a plain dict (JSON-serializable for MCP)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        client = DoffinClient(api_key="fake", cache_dir=tmpdir)

        with patch.object(client, "_download_raw", return_value=MINIMAL_XML):
            result = client.get_notice("test-002")

        assert isinstance(result, dict)
        assert "award_criteria" in result
        assert "cpv_codes" in result
```

**Step 2: Run tests — verify they fail**

```bash
pytest tests/test_eforms_cache.py -v
```

Expected: `AttributeError: 'DoffinClient' object has no attribute 'get_notice'`

**Step 3: Implement changes in doffin.py**

Modify `src/app/doffin.py`:

1. Add `cache_dir` parameter to DoffinClient
2. Rename `download_notice` to `_download_raw` (remove `@mcp_tool`)
3. Add `_cache_read` / `_cache_write` helper methods
4. Add `get_notice()` MCP tool

```python
# Add to imports at top:
from app.eforms import parse_eforms_xml

# Add to DoffinClient dataclass fields:
    cache_dir: str | None = field(default=None, repr=False)

# Rename download_notice → _download_raw, remove @mcp_tool:
    def _download_raw(self, doffin_id: str) -> bytes:
        """Download raw notice XML."""
        return self._get(f"/v2/download/{doffin_id}")

# Add cache methods:
    def _cache_path(self, doffin_id: str) -> Path | None:
        if not self.cache_dir:
            return None
        return Path(self.cache_dir) / f"{doffin_id}.json"

    def _cache_read(self, doffin_id: str) -> dict | None:
        path = self._cache_path(doffin_id)
        if path and path.exists():
            return json.loads(path.read_text())
        return None

    def _cache_write(self, doffin_id: str, data: dict) -> None:
        path = self._cache_path(doffin_id)
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2))

# Add get_notice MCP tool:
    @mcp_tool(description="Download and parse a Doffin eForms notice. Returns structured JSON with award criteria, qualification requirements, procedure type, and more.")
    def get_notice(self, doffin_id: str) -> dict:
        """Download, parse, and cache an eForms notice."""
        cached = self._cache_read(doffin_id)
        if cached:
            return cached
        xml_bytes = self._download_raw(doffin_id)
        notice = parse_eforms_xml(xml_bytes, doffin_id)
        result = notice.to_dict()
        self._cache_write(doffin_id, result)
        return result
```

Add `from pathlib import Path` to imports if not already there.

**Step 4: Run tests — verify they pass**

```bash
pytest tests/test_eforms_cache.py -v
```

Expected: All tests PASS.

**Step 5: Lint**

```bash
ruff check src/app/doffin.py
```

**Step 6: Commit**

```bash
git add src/app/doffin.py tests/test_eforms_cache.py
git commit -m "Add get_notice MCP tool with eForms parsing and JSON cache"
```

---

## Task 5: DoffinClient — analyze_buyer MCP tool

**Files:**
- Modify: `src/app/doffin.py`

**Step 1: Implement analyze_buyer**

Add to DoffinClient in `src/app/doffin.py`:

```python
    @mcp_tool(description="Search all Doffin notices for a buyer and return structured summary. Set enrich=true to parse eForms XML for award criteria and qualification requirements.")
    def analyze_buyer(self, search_string: str, enrich: bool = True, max_pages: int = 10) -> dict:
        """Search notices for a buyer, optionally enriching with eForms data."""
        all_hits = []
        page = 1
        while page <= max_pages:
            result = self.search_notices(
                search_string=search_string,
                num_hits_per_page=100,
                page=page,
            )
            hits = result.get("hits") or []
            all_hits.extend(hits)
            if len(hits) < 100:
                break
            page += 1

        notices = []
        for hit in all_hits:
            entry = {
                "doffin_id": hit.get("id"),
                "title": hit.get("heading"),
                "description": hit.get("description"),
                "type": hit.get("type"),
                "status": hit.get("status"),
                "publication_date": hit.get("publicationDate"),
                "estimated_value": hit.get("estimatedValue"),
                "cpv_codes": hit.get("cpvCodes") or [],
                "received_tenders": hit.get("receivedTenders"),
                "lots": hit.get("lots") or [],
            }
            if enrich and entry["doffin_id"]:
                try:
                    eforms = self.get_notice(entry["doffin_id"])
                    entry["award_criteria"] = eforms.get("award_criteria") or []
                    entry["selection_criteria"] = eforms.get("selection_criteria") or []
                    entry["procedure_code"] = eforms.get("procedure_code")
                    entry["contract_nature"] = eforms.get("contract_nature")
                    entry["env_criterion_code"] = eforms.get("env_criterion_code")
                    entry["framework_type"] = eforms.get("framework_type")
                    entry["framework_max_value"] = eforms.get("framework_max_value")
                except Exception:
                    entry["enrich_error"] = True
            notices.append(entry)

        # Summary
        summary = _build_summary(notices) if notices else {}

        return {
            "search_string": search_string,
            "total_notices": len(notices),
            "enriched": enrich,
            "notices": notices,
            "summary": summary,
        }
```

Add helper function outside the class:

```python
def _build_summary(notices: list[dict]) -> dict:
    """Build aggregated summary from enriched notices."""
    by_procedure: dict[str, int] = {}
    by_nature: dict[str, int] = {}
    criteria_counts = []
    env_codes: dict[str, int] = {}

    for n in notices:
        proc = n.get("procedure_code") or "unknown"
        by_procedure[proc] = by_procedure.get(proc, 0) + 1

        nature = n.get("contract_nature") or "unknown"
        by_nature[nature] = by_nature.get(nature, 0) + 1

        ac = n.get("award_criteria") or []
        if ac:
            criteria_counts.append(len(ac))

        env = n.get("env_criterion_code") or "unknown"
        env_codes[env] = env_codes.get(env, 0) + 1

    return {
        "by_procedure": by_procedure,
        "by_contract_nature": by_nature,
        "avg_award_criteria_count": (
            round(sum(criteria_counts) / len(criteria_counts), 1)
            if criteria_counts else 0
        ),
        "env_compliance": env_codes,
    }
```

**Step 2: Lint and verify**

```bash
ruff check src/app/doffin.py
```

**Step 3: Commit**

```bash
git add src/app/doffin.py
git commit -m "Add analyze_buyer MCP tool for portfolio analysis"
```

---

## Task 6: Update .gitignore and MCP server registration

**Files:**
- Modify: `.gitignore`
- Verify: `src/artifik_mcp/server.py` (DoffinClient already registered)

**Step 1: Add .cache/ to .gitignore**

Append to `.gitignore`:

```
# eForms cache
.cache/
```

**Step 2: Verify MCP server picks up new tools**

Check `src/artifik_mcp/server.py` — it already imports DoffinClient and loops
`self._clients = [self.artifik, self.doffin]`. The `get_mcp_tools()` decorator
scanner will automatically find `get_notice` and `analyze_buyer`.

Verify `download_notice` is no longer decorated (renamed to `_download_raw` with
underscore prefix — `get_mcp_tools` skips names starting with `_`).

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "Add .cache/ to gitignore for eForms cache"
```

---

## Task 7: Protokoll CLI — fetch eForms during generation

**Files:**
- Modify: `src/protokoll/__main__.py`

**Step 1: Add Doffin secret fetch + eForms lookup**

In `__main__.py`, modify `_get_client()` to also return a DoffinClient, and add
an eForms fetch step between fetching activities and generating the document.

Changes to `__main__.py`:

1. Import DoffinClient:
   ```python
   from app.doffin import DoffinClient
   ```

2. Add DoffinClient creation in `_get_client` area:
   ```python
   def _get_doffin_client() -> DoffinClient | None:
       """Create DoffinClient with API key from GCP. Returns None if key unavailable."""
       try:
           with _Spinner("Henter Doffin API-nøkkel"):
               api_key = _fetch_secret("doffin-api-key")
           cache_dir = str(_PROJECT_ROOT / ".cache" / "eforms")
           _ok("Doffin API-nøkkel hentet")
           return DoffinClient(api_key=api_key, cache_dir=cache_dir)
       except SystemExit:
           _warn("Doffin API-nøkkel ikke tilgjengelig — eForms-berikelse deaktivert")
           return None
   ```

3. Add helper to extract Doffin ID from activities:
   ```python
   def _get_doffin_id(activities: list[dict]) -> str | None:
       """Extract Doffin notice ID (NGOJ) from activities."""
       doffin_acts = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
       if not doffin_acts:
           return None
       desc = doffin_acts[0].get("description") or {}
       doffin_notice = desc.get("doffinNotice") or {}
       return doffin_notice.get("ngoj")
   ```

4. In `main()`, after fetching activities and before generating docx, add step:
   ```python
   # Step 4: Fetch eForms (optional)
   eforms = None
   doffin_client = _get_doffin_client()
   if doffin_client:
       doffin_id = _get_doffin_id(activities)
       if doffin_id:
           with _Spinner(f"Henter eForms-data fra Doffin ({doffin_id})"):
               try:
                   eforms = doffin_client.get_notice(doffin_id)
               except Exception as e:
                   _warn(f"Kunne ikke hente eForms: {e}")
           if eforms:
               ac = eforms.get("award_criteria") or []
               sc = eforms.get("selection_criteria") or []
               _ok(f"eForms: {len(ac)} tildelingskriterier, {len(sc)} kvalifikasjonskrav")
       else:
           _warn("Ingen Doffin-referanse funnet — eForms-berikelse ikke tilgjengelig")
   ```

5. Update step count from 3 to 4, and pass eforms to generators:
   ```python
   # Change _step calls from (N, 3, ...) to (N, 4, ...)
   # Change generate calls:
   doc = generate_protokoll_docx(procurement, activities, eforms=eforms)
   # and:
   doc = generate_protokoll_docx_del2(procurement, activities, eforms=eforms)
   ```

**Step 2: Lint**

```bash
ruff check src/protokoll/__main__.py
```

**Step 3: Commit**

```bash
git add src/protokoll/__main__.py
git commit -m "Fetch eForms data from Doffin during protokoll generation"
```

---

## Task 8: Enrich protokoll generators with eForms data

**Files:**
- Modify: `src/protokoll/docx_del3.py`
- Modify: `src/protokoll/docx_del2.py`

**Step 1: Update generator signatures**

Both files: add `eforms=None` parameter to the main generator function and pass
it to relevant section functions.

In `docx_del3.py`, change:
```python
def generate_protokoll_docx(procurement, activities, eforms=None) -> DocxDocument:
```

In `docx_del2.py`, change:
```python
def generate_protokoll_docx_del2(procurement, activities, eforms=None) -> DocxDocument:
```

Pass `eforms` to `_procedure()`, `_qualification()`, `_award()`, and add a new
`_award_criteria()` section function.

**Step 2: Add _award_criteria section**

Add to both files (or to `docx_helpers.py` as shared):

```python
def _award_criteria(doc, eforms):
    """Tildelingskriterier fra kunngjøringen (eForms)."""
    doc.add_heading("Tildelingskriterier", level=3)

    if not eforms:
        add_manual(doc.add_paragraph(), "[Fyll inn tildelingskriterier fra konkurransegrunnlaget]")
        return

    criteria = eforms.get("award_criteria") or []
    if not criteria:
        add_manual(doc.add_paragraph(), "[Ingen tildelingskriterier funnet i kunngjøringen — fyll inn manuelt]")
        return

    rows = []
    for c in criteria:
        name = c.get("name") or "Ukjent"
        ctype = c.get("type") or ""
        weight = c.get("weight_percent")
        weight_str = f"{weight:.0f} %" if weight is not None else None
        rows.append((name, ctype, weight_str))

    docx_add_table_with_manual(doc, ["Kriterium", "Type", "Vekt"], rows)

    # Norwegian env criterion
    env = eforms.get("env_criterion_code")
    if env:
        env_labels = {
            "quality-nor-env-criteria": "Klima/miljø vektet i tildelingskriteriene (§ 7-9 (2)-(3))",
            "quality-nor-env-spec": "Klima/miljø ivaretatt i kravspesifikasjonen (§ 7-9 (4))",
            "quality-nor-env-none": "Ubetydelig klima-/miljøavtrykk — unntak (§ 7-9 (5))",
        }
        label = env_labels.get(env, env)
        p = doc.add_paragraph()
        p.add_run("Miljøkrav FOA § 7-9: ").bold = True
        p.add_run(label)
```

**Step 3: Enrich _qualification with selection criteria**

In the existing `_qualification()` function, add after the manual marker:

```python
    # If eForms has selection criteria, show them
    if eforms:
        sel = eforms.get("selection_criteria") or []
        if sel:
            doc.add_paragraph("Kvalifikasjonskrav fra kunngjøringen:")
            rows = [(s.get("type_code") or "", s.get("description") or "") for s in sel]
            docx_add_table(doc, ["Type", "Beskrivelse"], rows)
```

**Step 4: Enrich _procedure with contract nature**

In `_procedure()`, if eforms is available, show contract nature:

```python
    if eforms:
        nature = eforms.get("contract_nature")
        if nature:
            nature_labels = {"services": "Tjeneste", "supplies": "Varer", "works": "Bygg og anlegg"}
            p2 = doc.add_paragraph()
            p2.add_run("Kontraktstype: ").bold = True
            p2.add_run(nature_labels.get(nature, nature))
```

**Step 5: Enrich _framework_agreement with max value**

In `_framework_agreement()`, if eForms has framework_max_value:

```python
    if eforms and eforms.get("framework_max_value"):
        from .common import fmt_currency
        currency = eforms.get("currency") or "NOK"
        max_val = fmt_currency(eforms["framework_max_value"], currency)
        # Add to info table
```

**Step 6: Wire eforms through the generators**

In both `generate_protokoll_docx()` and `generate_protokoll_docx_del2()`:
- Pass `eforms` to `_procedure(doc, procurement, activities, eforms)`
- Add `_award_criteria(doc, eforms)` call in the Tildeling group (before `_award`)
- Pass `eforms` to `_qualification(doc, eforms)` and `_framework_agreement(doc, procurement, eforms)`

**Step 7: Update _data_quality table**

In both files' `_data_quality()`, add eforms-aware rows:

```python
    has_eforms = eforms is not None
    eforms_ac = len((eforms or {}).get("award_criteria") or [])
    eforms_sc = len((eforms or {}).get("selection_criteria") or [])

    # Update relevant rows:
    ("Tildelingskriterier", f"eForms ({eforms_ac} kriterier)" if has_eforms and eforms_ac else "Manuelt", "Komplett" if eforms_ac else "Ikke i API"),
    ("Kvalifikasjonskrav", f"eForms ({eforms_sc} krav)" if has_eforms and eforms_sc else "Manuelt", "Komplett" if eforms_sc else "Ikke i API"),
```

**Step 8: Lint and test**

```bash
ruff check src/protokoll/docx_del2.py src/protokoll/docx_del3.py
```

Manual test: generate a protokoll and check the docx.

**Step 9: Commit**

```bash
git add src/protokoll/docx_del2.py src/protokoll/docx_del3.py
git commit -m "Enrich protokoll with eForms award criteria and qualification requirements"
```

---

## Task 9: Analyse CLI

**Files:**
- Create: `src/analyse/__init__.py`
- Create: `src/analyse/__main__.py`

**Step 1: Create module**

File: `src/analyse/__init__.py`

```python
"""Portfolio analysis of Doffin procurement notices."""
```

**Step 2: Create CLI**

File: `src/analyse/__main__.py`

```python
"""CLI for portfolio analysis of Doffin notices.

Usage:
    python -m analyse --buyer "Oslobygg"
    python -m analyse --buyer "Oslobygg" --format csv -o analyse.csv
    python -m analyse --buyer "Oslobygg" --no-enrich
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from io import StringIO
from pathlib import Path

_SRC_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _SRC_DIR.parent
sys.path.insert(0, str(_SRC_DIR))

GCP_PROJECT = "procurement-mcp"

_MAX_CRITERIA_COLS = 4


def _fetch_secret(name: str) -> str:
    result = subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest",
         f"--secret={name}", f"--project={GCP_PROJECT}"],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip()


def _to_csv(notices: list[dict]) -> str:
    """Convert notices to CSV string."""
    buf = StringIO()
    headers = [
        "doffin_id", "title", "type", "status", "publication_date",
        "procedure_code", "contract_nature", "estimated_value", "currency",
    ]
    for i in range(1, _MAX_CRITERIA_COLS + 1):
        headers.extend([
            f"award_criterion_{i}_name",
            f"award_criterion_{i}_type",
            f"award_criterion_{i}_weight",
        ])
    headers.extend([
        "selection_criteria_count", "env_criterion_code",
        "received_tenders", "framework_type", "framework_max_value",
    ])

    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()

    for n in notices:
        row = {
            "doffin_id": n.get("doffin_id"),
            "title": n.get("title"),
            "type": n.get("type"),
            "status": n.get("status"),
            "publication_date": n.get("publication_date"),
            "procedure_code": n.get("procedure_code"),
            "contract_nature": n.get("contract_nature"),
            "estimated_value": (n.get("estimated_value") or {}).get("amount")
                if isinstance(n.get("estimated_value"), dict)
                else n.get("estimated_value"),
            "currency": (n.get("estimated_value") or {}).get("currencyCode")
                if isinstance(n.get("estimated_value"), dict) else "",
            "selection_criteria_count": len(n.get("selection_criteria") or []),
            "env_criterion_code": n.get("env_criterion_code"),
            "received_tenders": n.get("received_tenders"),
            "framework_type": n.get("framework_type"),
            "framework_max_value": n.get("framework_max_value"),
        }
        for i, ac in enumerate(n.get("award_criteria") or [], 1):
            if i > _MAX_CRITERIA_COLS:
                break
            row[f"award_criterion_{i}_name"] = ac.get("name")
            row[f"award_criterion_{i}_type"] = ac.get("type")
            row[f"award_criterion_{i}_weight"] = ac.get("weight_percent")
        writer.writerow(row)

    return buf.getvalue()


def main() -> None:
    from app.doffin import DoffinClient

    parser = argparse.ArgumentParser(description="Porteføljeanalyse av Doffin-kunngjøringer.")
    parser.add_argument("--buyer", required=True, help="Søkestreng for oppdragsgiver")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("-o", "--output", help="Output-fil (default: stdout)")
    parser.add_argument("--no-enrich", action="store_true", help="Skip eForms XML-parsing")
    parser.add_argument("--max-pages", type=int, default=10, help="Maks antall søkesider")

    args = parser.parse_args()

    print("Henter Doffin API-nøkkel...", file=sys.stderr)
    api_key = _fetch_secret("doffin-api-key")
    cache_dir = str(_PROJECT_ROOT / ".cache" / "eforms")
    client = DoffinClient(api_key=api_key, cache_dir=cache_dir)

    print(f"Søker etter '{args.buyer}'...", file=sys.stderr)
    result = client.analyze_buyer(
        search_string=args.buyer,
        enrich=not args.no_enrich,
        max_pages=args.max_pages,
    )
    print(f"Fant {result['total_notices']} kunngjøringer.", file=sys.stderr)

    if args.format == "csv":
        output = _to_csv(result.get("notices") or [])
    else:
        output = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(output)
        print(f"Skrevet til {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
```

**Step 3: Lint**

```bash
ruff check src/analyse/
```

**Step 4: Commit**

```bash
git add src/analyse/__init__.py src/analyse/__main__.py
git commit -m "Add analyse CLI for Doffin portfolio analysis"
```

---

## Task 10: Final integration test and deploy reminder

**Step 1: Run all tests**

```bash
pytest tests/ -v --ignore=tests/test_doffin_client.py --ignore=tests/test_credentials.py
```

(Ignore manual integration tests that require API keys.)

**Step 2: Run linter**

```bash
ruff check src/
```

**Step 3: Manual smoke test**

```bash
python -m protokoll --id 2771    # OSL0032, should show eForms data
```

Verify the generated docx has:
- Tildelingskriterier table with name/type/weight
- Qualification criteria from eForms
- Contract nature (Tjeneste/Varer/Bygg)

**Step 4: Commit any remaining fixes**

**Step 5: Remind about deploy**

The MCP server source files changed (`src/app/doffin.py`, new `src/app/eforms.py`).
Redeploy to Cloud Run:

```bash
bash deploy.sh
```
