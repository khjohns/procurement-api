"""Lesende Artifik-kontroll. Bare skjema, tellinger og status skrives ut.

Kjøres via ./dev.sh --verify-contract-fields. Ingen rå API-responser lagres.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from app.client import ArtifikAPIError, ArtifikClient


FIELDS = {
    "navn": ("name",),
    "referansenummer": ("referenceId", "contractNumber"),
    "forelder": ("parentContractId", "parentContract.name"),
    "avtaletype": ("type",),
    "fase_status": ("status", "signingStatus"),
    "administrator_virksomhet": ("organizationId", "buyerOrgName"),
    "administrator": ("ownerId", "owner.name"),
    "leverandor": ("supplierOrgName", "supplierOrg.name"),
    "leverandor_orgnr": ("supplierOrgNumber", "supplierOrg.orgNumber"),
    "leverandor_kontakt": ("supplierContactPersons",),
    "kjoper_kontakt": ("buyerContactPersons",),
    "startdato": ("durationStart", "duration_start"),
    "sluttdato": ("durationEnd", "duration_end"),
    "maks_sluttdato": ("computedMaxEndDate",),
    "opsjoner": ("optionsJSON",),
    "verdi": ("value",),
    "valuta": ("currency",),
    "anskaffelse": ("procurementId",),
    "kategorier": ("categories",),
    "beskrivelse": ("description",),
    "notater": ("notes",),
    "sokeord": ("keywords",),
    "avrop": ("callOffIds", "callOffRequestIds"),
    "team": ("team",),
    "internrapportering": ("internalReporting",),
}


def _digest(value: Any) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest()[:12]


def _lookup(item: dict, path: str) -> tuple[bool, Any]:
    value: Any = item
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            return False, None
        value = value[part]
    return True, value


def _is_filled(value: Any) -> bool:
    return value is not None and value != "" and value != [] and value != {}


def _coverage(rows: list[dict]) -> dict:
    result = {}
    for label, paths in FIELDS.items():
        present = filled = 0
        for row in rows:
            hits = [_lookup(row, path) for path in paths]
            present += any(found for found, _ in hits)
            filled += any(found and _is_filled(value) for found, value in hits)
        result[label] = {"present": present, "filled": filled, "denominator": len(rows)}
    return result


def _shape(rows: list[dict]) -> list[str]:
    """Bare feltnavn, aldri verdier eller dynamiske egendefinerte nøkler."""
    allowed = set(FIELDS.keys()) | {
        "id", "organizationId", "type", "name", "team", "internalReporting",
        "supplierOrg", "owner", "parentContract", "children", "value",
        "currency", "durationDays", "durationMonths", "duration_days",
        "duration_months", "signingStatus", "status", "procurementId",
        "contractNumber", "referenceId", "optionsJSON", "computedMaxEndDate",
        "supplierOrgNumber", "supplierOrgName", "buyerOrgName", "categories",
        "supplierContactPersons", "buyerContactPersons", "createdAt", "updatedAt",
        "durationStart", "durationEnd", "duration_start", "duration_end",
        "description", "notes", "keywords", "ownerId", "parentContractId",
        "callOffIds", "callOffRequestIds", "buyerSignees", "supplierSignees",
        "contractCategory", "language", "subscribers", "initiator",
    }
    return sorted(set().union(*(set(row) & allowed for row in rows))) if rows else []


def _call(label: str, func: Callable[[], Any], errors: dict) -> Any:
    try:
        return func()
    except ArtifikAPIError as exc:
        errors[label] = {"http_status": exc.status_code}
    except Exception as exc:  # Ingen feiltekst: den kan inneholde persondata.
        errors[label] = {"error_type": type(exc).__name__}
    return None


def _report_list(rows: Any) -> dict:
    if not isinstance(rows, list):
        return {"response_type": type(rows).__name__}
    clean = [row for row in rows if isinstance(row, dict)]
    return {
        "count": len(rows),
        "types": dict(sorted(Counter(str(row.get("type", "<mangler>")) for row in clean).items())),
        "keys": _shape(clean),
        "coverage": _coverage(clean),
    }


def _report_template(response: Any) -> dict:
    if not isinstance(response, dict):
        return {"response_type": type(response).__name__}
    columns = response.get("columns")
    rows = response.get("rows")
    return {
        "keys": sorted(set(response) & {"templateId", "templateName", "columns", "rows", "page", "pageSize", "totalCount", "totalPages"}),
        "column_count": len(columns) if isinstance(columns, list) else None,
        "column_shape": sorted(set().union(*(set(col) for col in columns if isinstance(col, dict)))) if isinstance(columns, list) and columns else [],
        "row_count": len(rows) if isinstance(rows, list) else None,
        "flat_rows": isinstance(rows, list) and all(isinstance(row, dict) and "values" not in row for row in rows),
        "page": response.get("page") if isinstance(response.get("page"), int) else None,
        "total_count": response.get("totalCount") if isinstance(response.get("totalCount"), int) else None,
        "total_pages": response.get("totalPages") if isinstance(response.get("totalPages"), int) else None,
    }


def run() -> dict:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--organization-index", type=int, default=0)
    parser.add_argument("--max-details", type=int, default=30)
    args = parser.parse_args()
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=Path(__file__).resolve().parents[1], text=True).strip()
    result: dict[str, Any] = {
        "revision": revision, "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": "https://api.artifik.no", "authentication_endpoint": "/external/v2/token",
        "organization_index": args.organization_index, "max_details": args.max_details,
        "errors": {},
    }
    errors = result["errors"]
    client = ArtifikClient()
    if _call("authenticate", client.authenticate, errors) is None:
        return result
    whoami = _call("whoami", client.whoami, errors)
    result["whoami"] = {"response_type": type(whoami).__name__, "accessible": whoami is not None}
    organizations = _call("organizations", client.list_organizations, errors)
    if not isinstance(organizations, list):
        return result
    result["organization_count"] = len(organizations)
    if not 0 <= args.organization_index < len(organizations):
        result["errors"]["organization_index"] = {"error_type": "IndexError"}
        return result
    org = organizations[args.organization_index]
    if not isinstance(org, dict) or org.get("id") is None:
        result["errors"]["organization"] = {"error_type": "MissingId"}
        return result
    org_id = str(org["id"])
    result["organization_id_sha256_12"] = _digest(org_id)
    result["organization_keys"] = sorted(set(org) & {"id", "name", "parentId", "parentOrganizationId", "orgNumber", "organizationNumber", "type"})
    members = _call("organization_members", lambda: client.list_organization_members(org_id), errors)
    result["members"] = {"count": len(members), "keys": sorted(set().union(*(set(m) for m in members if isinstance(m, dict))))} if isinstance(members, list) else {"response_type": type(members).__name__}

    lists: dict[str, Any] = {}
    selected: list[dict] = []
    for version in (2, 3):
        for suffix, team, reporting in (("plain", False, False), ("team", True, False), ("reporting", False, True), ("both", True, True)):
            key = f"v{version}_{suffix}"
            rows = _call(key, lambda v=version, t=team, r=reporting: client.list_contracts(organization_id=org_id, api_version=v, include_team=t, include_internal_reporting=r), errors)
            lists[key] = _report_list(rows)
            if key == "v3_both" and isinstance(rows, list):
                selected = [row for row in rows if isinstance(row, dict)]
    result["lists"] = lists
    ids = [row["id"] for row in selected if isinstance(row.get("id"), int)]
    result["sample_selection"] = {"source": "v3_both", "available_ids": len(ids), "sample_size": min(max(args.max_details, 0), len(ids)), "order": "API list order"}
    details = {}
    for version in (2, 3):
        plain_rows, enriched_rows = [], []
        for contract_id in ids[:max(args.max_details, 0)]:
            plain = _call(f"v{version}_detail_plain", lambda i=contract_id, v=version: client.get_contract(i, api_version=v), errors)
            enriched = _call(f"v{version}_detail_both", lambda i=contract_id, v=version: client.get_contract(i, api_version=v, include_team=True, include_internal_reporting=True), errors)
            if isinstance(plain, dict):
                plain_rows.append(plain)
            if isinstance(enriched, dict):
                enriched_rows.append(enriched)
        details[f"v{version}_plain"] = _report_list(plain_rows)
        details[f"v{version}_both"] = _report_list(enriched_rows)
    result["details"] = details

    active = _call("active_contract_template", lambda: client.get_contract_internal_reporting_template(org_id), errors)
    result["active_contract_template"] = {
        "response_type": type(active).__name__,
        "keys": sorted(set(active) & {"id", "templateId", "fields", "columns", "nodes", "name", "status"}) if isinstance(active, dict) else [],
        "field_count": len(active.get("fields", [])) if isinstance(active, dict) and isinstance(active.get("fields"), list) else None,
    }
    templates = _call("templates", lambda: client.list_templates(org_id), errors)
    result["templates"] = {"count": len(templates)} if isinstance(templates, list) else {"response_type": type(templates).__name__}
    if isinstance(templates, list):
        template_ids = []
        if isinstance(active, dict) and isinstance(active.get("templateId"), int):
            template_ids.append(active["templateId"])
        template_ids.extend(
            template["id"] for template in templates
            if isinstance(template, dict) and isinstance(template.get("id"), int)
            and template["id"] not in template_ids
        )
        result["template_responses"] = {}
        for template_id in template_ids[:5]:
            pages = []
            for page in (1, 2):
                response = _call("template_responses", lambda t=template_id, p=page: client.get_template_responses(org_id, t, entity_type="contract", page=p, page_size=25), errors)
                pages.append(_report_template(response))
                if not isinstance(response, dict) or not isinstance(response.get("totalPages"), int) or response["totalPages"] < 2:
                    break
            result["template_responses"][_digest(template_id)] = pages
    return result


if __name__ == "__main__":
    report = run()
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    if report["errors"]:
        raise SystemExit(1)
