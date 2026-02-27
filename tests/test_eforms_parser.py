"""Tests for eForms UBL XML parser."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.eforms import parse_eforms_xml


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


# -- Integration test against real Doffin fixture --

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
