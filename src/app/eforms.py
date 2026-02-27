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
        # CPV codes (MainCommodityClassification and AdditionalCommodityClassification)
        for tag in ("MainCommodityClassification", "AdditionalCommodityClassification"):
            for cls in proj.findall(
                f".//cac:{tag}/cbc:ItemClassificationCode", _NS
            ):
                if cls.text and cls.text not in notice.cpv_codes:
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
