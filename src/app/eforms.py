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
class ContractModification:
    reason_code: str | None = None
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
    env_justification: str | None = None
    submission_deadline: str | None = None
    submission_url: str | None = None
    submission_languages: list[str] = field(default_factory=list)
    tender_validity_months: int | None = None

    contract_modifications: list[ContractModification] = field(default_factory=list)

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


def _build_org_map(root: ET.Element) -> dict[str, dict]:
    """Build lookup map from ORG reference IDs to company details.

    Real eForms XML stores org details in ext:UBLExtensions/efac:Organizations
    and references them by ID (e.g. ORG-0001) elsewhere in the document.
    """
    orgs: dict[str, dict] = {}
    for org in root.findall(
        ".//efac:Organizations/efac:Organization/efac:Company", _NS
    ):
        org_ref = _text(org, "cac:PartyIdentification/cbc:ID")
        if not org_ref:
            continue
        name = _text(org, "cac:PartyName/cbc:Name")
        company_id = _text(org, "cac:PartyLegalEntity/cbc:CompanyID")
        orgs[org_ref] = {"name": name, "company_id": company_id}
    return orgs


def parse_eforms_xml(xml_bytes: bytes, doffin_id: str = "") -> EFormsNotice:
    """Parse eForms UBL XML into structured EFormsNotice."""
    root = ET.fromstring(xml_bytes)
    tag = root.tag
    notice_type = tag.split("}")[-1] if "}" in tag else tag

    notice = EFormsNotice(doffin_id=doffin_id, notice_type=notice_type)

    # Metadata
    notice.issue_date = _text(root, "cbc:IssueDate")

    # Organization reference map (ORG-0001 → name, company_id)
    org_map = _build_org_map(root)

    # Buyer — try inline name first, then resolve via org reference
    party = root.find(".//cac:ContractingParty/cac:Party", _NS)
    if party is not None:
        notice.buyer_name = _text(party, "cac:PartyName/cbc:Name")
        notice.buyer_org_id = _text(party, "cac:PartyIdentification/cbc:ID")

        # Resolve org reference if inline name is missing
        if notice.buyer_org_id and notice.buyer_org_id in org_map:
            org = org_map[notice.buyer_org_id]
            if not notice.buyer_name and org["name"]:
                notice.buyer_name = org["name"]
            if org["company_id"]:
                notice.buyer_org_id = org["company_id"]

    # Procurement project (top-level or first lot)
    proj = root.find(".//cac:ProcurementProject", _NS)
    if proj is not None:
        notice.title = _text(proj, "cbc:Name")
        notice.description = _text(proj, "cbc:Description")
        notice.contract_nature = _text(proj, "cbc:ProcurementTypeCode")
        # CPV codes (MainCommodityClassification and AdditionalCommodityClassification)
        for tag in ("MainCommodityClassification", "AdditionalCommodityClassification"):
            for cls in proj.findall(f".//cac:{tag}/cbc:ItemClassificationCode", _NS):
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
        notice.duration_months = _int(proj, "cac:PlannedPeriod/cbc:DurationMeasure")

    # Procedure
    process = root.find(".//cac:TenderingProcess", _NS)
    if process is not None:
        notice.procedure_code = _text(process, "cbc:ProcedureCode")

    # Submission deadline
    notice.submission_deadline = _text(
        root,
        ".//cac:TenderingProcess/cac:TenderSubmissionDeadlinePeriod/cbc:EndDate",
    )

    # Submission URL (BT-124)
    notice.submission_url = _text(
        root, ".//cac:TenderingTerms/cac:TenderRecipientParty/cbc:EndpointID"
    )

    # Submission languages (BT-97)
    for lang_el in root.findall(".//cac:TenderingTerms/cac:Language/cbc:ID", _NS):
        if lang_el.text and lang_el.text not in notice.submission_languages:
            notice.submission_languages.append(lang_el.text)

    # Tender validity period (BT-98)
    validity_el = root.find(
        ".//cac:TenderingTerms/cac:TenderValidityPeriod/cbc:DurationMeasure", _NS
    )
    if validity_el is not None and validity_el.text:
        try:
            val = int(float(validity_el.text))
            unit = validity_el.get("unitCode", "MONTH")
            notice.tender_validity_months = val * 12 if unit == "YEAR" else val
        except ValueError:
            pass

    # Award criteria, selection criteria, exclusion grounds — from lots
    _parse_lots(root, notice)

    # Procedure-level exclusion grounds (TendererQualificationRequest outside lots)
    _parse_procedure_exclusions(root, notice)

    # Framework agreement
    _parse_framework(root, notice)

    # Contract modifications (CAN-MODIF notices)
    _parse_contract_modifications(root, notice)

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

            # Skip 0%-weight criteria — these are FOA § 7-9 env justification
            # texts, not real award criteria
            if ac.weight_percent is not None and ac.weight_percent == 0:
                # Store the justification text separately
                if ac.name:
                    notice.env_justification = ac.name
                continue

            notice.award_criteria.append(ac)

        # Selection criteria source (BT-809)
        # Norwegian notices typically set source=epo-procurement-document,
        # meaning criteria are in the competition documents, not in the XML.
        for sel in lot.findall(
            ".//cac:TenderingTerms/cac:TendererQualificationRequest", _NS
        ):
            # Only extract actual selection criteria with descriptions
            desc = _text(sel, "cbc:Description")
            if not desc:
                continue
            # Skip exclusion grounds (handled below) and meta entries
            code_el = sel.find(".//cbc:TendererRequirementTypeCode", _NS)
            if code_el is not None and code_el.get("listName") in (
                "exclusion-ground",
                "exclusion-grounds-source",
                "reserved-procurement",
                "selection-criteria-source",
            ):
                continue
            sc = SelectionCriterion()
            sc.description = desc
            sc.type_code = code_el.text if code_el is not None else None
            notice.selection_criteria.append(sc)

        # Exclusion grounds — in TendererQualificationRequest with listName="exclusion-ground"
        for tqr in lot.findall(
            ".//cac:TenderingTerms/cac:TendererQualificationRequest", _NS
        ):
            code_el = tqr.find(".//cbc:TendererRequirementTypeCode", _NS)
            if code_el is not None and code_el.get("listName") == "exclusion-ground":
                ground = ExclusionGround()
                ground.code = code_el.text
                ground.description = _text(tqr, "cbc:Description")
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


def _parse_procedure_exclusions(root: ET.Element, notice: EFormsNotice) -> None:
    """Parse procedure-level exclusion grounds (outside lots)."""
    # These appear in TenderingTerms at the top level, not inside ProcurementProjectLot
    for tqr in root.findall(
        ".//cac:TenderingTerms/cac:TendererQualificationRequest", _NS
    ):
        # Skip if already found inside a lot
        code_el = tqr.find(
            "cac:SpecificTendererRequirement/cbc:TendererRequirementTypeCode", _NS
        )
        if code_el is not None and code_el.get("listName") == "exclusion-ground":
            # Avoid duplicates
            if not any(eg.code == code_el.text for eg in notice.exclusion_grounds):
                ground = ExclusionGround()
                ground.code = code_el.text
                ground.description = _text(tqr, "cbc:Description")
                notice.exclusion_grounds.append(ground)


def _parse_framework(root: ET.Element, notice: EFormsNotice) -> None:
    """Parse framework agreement details."""
    # Framework type from ContractingSystem (e.g. fa-wo-rc, fa-w-rc)
    for cs in root.findall(".//cac:TenderingProcess/cac:ContractingSystem", _NS):
        code_el = cs.find("cbc:ContractingSystemTypeCode", _NS)
        if code_el is not None and code_el.get("listName") == "framework-agreement":
            notice.framework_type = code_el.text

    # Framework agreement element for max participants
    fa = root.find(".//cac:FrameworkAgreement", _NS)
    if fa is None:
        fa = root.find(".//cac:TenderingProcess/cac:FrameworkAgreement", _NS)
    if fa is not None:
        notice.framework_max_participants = _int(fa, "cbc:MaximumOperatorQuantity")

    # Framework max value — eForms extension (efbc:FrameworkMaximumAmount)
    fma = root.find(".//efbc:FrameworkMaximumAmount", _NS)
    if fma is not None and fma.text:
        try:
            notice.framework_max_value = float(fma.text)
        except ValueError:
            pass
        if not notice.currency:
            notice.currency = fma.get("currencyID")


def _parse_contract_modifications(root: ET.Element, notice: EFormsNotice) -> None:
    """Parse contract modification data from CAN-MODIF notices."""
    for cm in root.findall(
        ".//efac:ContractModification", _NS
    ):
        reason_el = cm.find("efac:ChangeReason", _NS)
        if reason_el is None:
            continue
        mod = ContractModification()
        code_el = reason_el.find("efbc:ReasonCode", _NS)
        if code_el is not None:
            mod.reason_code = code_el.text
        mod.description = _text(reason_el, "efbc:ReasonDescription")
        if mod.reason_code or mod.description:
            notice.contract_modifications.append(mod)
