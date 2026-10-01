"""Lesende Artifik-kontroll. Bare skjema, tellinger og status skrives ut.

Kjøres via ./dev.sh --verify-contract-fields. Ingen rå API-responser lagres.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
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

SOURCE_PATHS = (
    "name", "referenceId", "contractNumber", "parentContractId",
    "parentContract.name", "parentContract.referenceId", "type",
    "signingStatus", "categories", "organizationId", "buyerOrgName",
    "ownerId", "owner.id", "owner.name", "supplierOrgName",
    "supplierOrg.name", "supplierOrg.orgNumber", "supplierOrgNumber",
    "supplierContactPersons", "buyerContactPersons", "durationStart",
    "durationEnd", "duration_start", "duration_end", "optionsJSON",
    "computedMaxEndDate", "value", "currency", "procurementId",
    "description", "callOffIds", "callOffRequestIds", "language",
    "notes", "keywords", "team", "internalReporting", "lotName",
    "signingTier", "creationTime", "summary", "isPublished",
    "framework_agreement_reopening", "framework_agreement_uses_ranking",
    "isCreatedViaExternalAPI", "organization.name", "milestones",
    "parentContract.contractNumber", "supplierOrg.id",
)


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


def _path_coverage(rows: list[dict]) -> dict:
    return {
        path: {
            "present": sum(_lookup(row, path)[0] for row in rows),
            "filled": sum(found and _is_filled(value) for row in rows for found, value in (_lookup(row, path),)),
        }
        for path in SOURCE_PATHS
    }


def _shape(rows: list[dict]) -> list[str]:
    """Bare feltnavn, aldri verdier eller dynamiske egendefinerte nøkler."""
    keys = set().union(*(set(row) for row in rows)) if rows else set()
    return sorted(key for key in keys if re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,49}", key))


def _call(label: str, func: Callable[[], Any], errors: dict) -> Any:
    try:
        return func()
    except ArtifikAPIError as exc:
        errors[label] = {"http_status": exc.status_code}
    except Exception as exc:  # Ingen feiltekst: den kan inneholde persondata.
        errors[label] = {"error_type": type(exc).__name__}
    return None


def _probe_auth(client: ArtifikClient) -> dict[str, dict]:
    """Sammenlign tokenvarianter uten å lese responskropp eller vise credentials."""
    client_id, client_secret = client._get_credentials()
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    variants = {
        "v2_json": ("/external/v2/token", "application/json", json.dumps(payload).encode()),
        "v2_form": ("/external/v2/token", "application/x-www-form-urlencoded", urllib.parse.urlencode(payload).encode()),
        "legacy_form": ("/external/token", "application/x-www-form-urlencoded", urllib.parse.urlencode(payload).encode()),
    }
    outcomes = {}
    for name, (path, content_type, data) in variants.items():
        req = urllib.request.Request(
            f"{client.base_url}{path}", data=data,
            headers={"Content-Type": content_type}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, context=client._ssl_ctx) as response:
                outcomes[name] = {"http_status": response.status}
        except urllib.error.HTTPError as exc:
            outcomes[name] = {"http_status": exc.code}
            exc.close()
        except Exception as exc:
            outcomes[name] = {"error_type": type(exc).__name__}
    return outcomes


def _report_list(rows: Any) -> dict:
    if not isinstance(rows, list):
        return {"response_type": type(rows).__name__}
    clean = [row for row in rows if isinstance(row, dict)]
    by_type = {}
    for row in clean:
        by_type.setdefault(str(row.get("type", "<mangler>")), []).append(row)
    return {
        "count": len(rows),
        "types": dict(sorted(Counter(str(row.get("type", "<mangler>")) for row in clean).items())),
        "keys": _shape(clean),
        "coverage": _coverage(clean),
        "coverage_by_type": {name: _coverage(group) for name, group in sorted(by_type.items())},
        "path_coverage": _path_coverage(clean),
        "path_coverage_by_type": {name: _path_coverage(group) for name, group in sorted(by_type.items())},
        "nested_keys": _nested_keys(clean),
        "options_shape": _options_shape(clean),
    }


def _nested_keys(rows: list[dict]) -> dict[str, list[str]]:
    fields = (
        "supplierOrg", "supplierContactPersons", "buyerContactPersons",
        "owner", "parentContract", "optionsJSON", "categories", "team",
        "internalReporting", "children", "organization", "milestones",
    )
    result = {}
    for field_name in fields:
        keys = set()
        for row in rows:
            value = row.get(field_name)
            if isinstance(value, dict):
                keys.update(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        keys.update(item)
            elif field_name == "optionsJSON" and isinstance(value, str):
                try:
                    parsed = json.loads(value)
                except ValueError:
                    continue
                if isinstance(parsed, dict):
                    keys.update(parsed)
                elif isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict):
                            keys.update(item)
        allowed = {
            "id", "name", "orgNumber", "email", "phone", "mobile", "address",
            "postalCode", "postalAddress", "city", "country", "fax", "website",
            "role", "isActive", "isOrgMember", "nodeId", "prompt", "type",
            "value", "valueText", "contractNumber", "referenceId", "durationStart",
            "durationEnd", "duration_start", "duration_end", "prolongPeriods",
            "prolongDurationYear", "prolongDurationMonth", "computedMaxEndDate",
            "title", "optionType", "description", "used", "isUsed",
        }
        result[field_name] = sorted(keys & allowed)
    return result


def _options_shape(rows: list[dict]) -> dict:
    option_types = Counter()
    periods_types = Counter()
    period_keys = set()
    option_count = 0
    for row in rows:
        value = row.get("optionsJSON")
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except ValueError:
                continue
        options = value if isinstance(value, list) else [value] if isinstance(value, dict) else []
        for option in options:
            if not isinstance(option, dict):
                continue
            option_count += 1
            option_types[str(option.get("optionType", "<mangler>"))] += 1
            periods = option.get("prolongPeriods")
            if isinstance(periods, list):
                for period in periods:
                    periods_types[type(period).__name__] += 1
                    if isinstance(period, dict):
                        period_keys.update(period)
    return {
        "option_count": option_count,
        "option_types": dict(sorted(option_types.items())),
        "period_item_types": dict(sorted(periods_types.items())),
        "period_item_keys": sorted(period_keys & {"duration", "months", "years", "value", "used", "isUsed", "status"}),
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
    parser.add_argument("--probe-auth", action="store_true", help="Sammenlign tokenvarianter uten å lese responskropp")
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
    if args.probe_auth:
        result["auth_probe"] = _probe_auth(client)
        return result
    if _call("authenticate", client.authenticate, errors) is None:
        return result
    whoami = _call("whoami", client.whoami, errors)
    result["whoami"] = {
        "response_type": type(whoami).__name__, "accessible": whoami is not None,
        "keys": sorted(set(whoami) & {"id", "organizationId", "organizations", "role", "keyType", "type"}) if isinstance(whoami, dict) else [],
    }
    organizations = _call("organizations", client.list_organizations, errors)
    if isinstance(organizations, dict):
        result["organizations_response"] = {
            "keys": sorted(set(organizations) & {"organizations", "items", "data", "results", "totalCount", "total"}),
            "value_types": {key: type(organizations[key]).__name__ for key in ("organizations", "items", "data", "results") if key in organizations},
        }
        for key in ("organizations", "items", "data", "results"):
            if isinstance(organizations.get(key), list):
                organizations = organizations[key]
                break
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
    if isinstance(members, dict):
        result["members_response_keys"] = sorted(set(members) & {"members", "items", "data", "results", "total", "totalCount"})
        members = next((members[key] for key in ("members", "items", "data", "results") if isinstance(members.get(key), list)), members)
    result["members"] = {"count": len(members), "keys": sorted(set().union(*(set(m) for m in members if isinstance(m, dict))))} if isinstance(members, list) else {"response_type": type(members).__name__}

    lists: dict[str, Any] = {}
    list_rows: dict[str, list[dict]] = {}
    selected: list[dict] = []
    for version in (2, 3):
        for suffix, team, reporting in (("plain", False, False), ("team", True, False), ("reporting", False, True), ("both", True, True)):
            key = f"v{version}_{suffix}"
            rows = _call(key, lambda v=version, t=team, r=reporting: client.list_contracts(organization_id=org_id, api_version=v, include_team=t, include_internal_reporting=r), errors)
            lists[key] = _report_list(rows)
            if isinstance(rows, list):
                list_rows[key] = [row for row in rows if isinstance(row, dict)]
            if key == "v3_both" and isinstance(rows, list):
                selected = [row for row in rows if isinstance(row, dict)]
    result["lists"] = lists
    v2_by_id = {row["id"]: row for row in list_rows.get("v2_plain", []) if isinstance(row.get("id"), int)}
    v3_by_id = {row["id"]: row for row in list_rows.get("v3_plain", []) if isinstance(row.get("id"), int)}
    common_ids = set(v2_by_id) & set(v3_by_id)
    result["v2_v3_comparison"] = {
        "v2_ids": len(v2_by_id), "v3_ids": len(v3_by_id),
        "same_id_set": set(v2_by_id) == set(v3_by_id),
        "common_ids": len(common_ids),
        "same_start_date": sum(v2_by_id[i].get("duration_start") == v3_by_id[i].get("durationStart") for i in common_ids),
        "same_end_date": sum(v2_by_id[i].get("duration_end") == v3_by_id[i].get("durationEnd") for i in common_ids),
        "same_type": sum(v2_by_id[i].get("type") == v3_by_id[i].get("type") for i in common_ids),
    }
    by_type: dict[str, list[int]] = {}
    for row in selected:
        if isinstance(row.get("id"), int):
            by_type.setdefault(str(row.get("type", "<mangler>")), []).append(row["id"])
    option_ids = [
        row["id"] for row in selected
        if isinstance(row.get("id"), int) and _is_filled(row.get("optionsJSON"))
    ]
    ids = option_ids[:max(args.max_details, 0)]
    selected_ids = set(ids)
    while any(by_type.values()) and len(ids) < max(args.max_details, 0):
        for contract_type in sorted(by_type):
            if by_type[contract_type] and len(ids) < args.max_details:
                candidate = by_type[contract_type].pop(0)
                if candidate not in selected_ids:
                    ids.append(candidate)
                    selected_ids.add(candidate)
    result["sample_selection"] = {
        "source": "v3_both", "available_ids": len(selected), "sample_size": len(ids),
        "order": "contracts with options first, then round-robin by type and API list order",
        "option_contracts_selected": len(option_ids[:max(args.max_details, 0)]),
        "sample_types": dict(sorted(Counter(str(row.get("type", "<mangler>")) for row in selected if row.get("id") in set(ids)).items())),
    }
    details = {}
    owner_member_matches = {}
    v3_enriched_rows = []
    member_emails = {m.get("email") for m in members if isinstance(m, dict) and isinstance(m.get("email"), str)} if isinstance(members, list) else set()
    member_by_email = {m["email"]: m for m in members if isinstance(m, dict) and isinstance(m.get("email"), str)} if isinstance(members, list) else {}
    for version in (2, 3):
        plain_rows, enriched_rows = [], []
        for contract_id in ids:
            plain = _call(f"v{version}_detail_plain", lambda i=contract_id, v=version: client.get_contract(i, api_version=v), errors)
            enriched = _call(f"v{version}_detail_both", lambda i=contract_id, v=version: client.get_contract(i, api_version=v, include_team=True, include_internal_reporting=True), errors)
            if isinstance(plain, dict):
                plain_rows.append(plain)
            if isinstance(enriched, dict):
                enriched_rows.append(enriched)
        details[f"v{version}_plain"] = _report_list(plain_rows)
        details[f"v{version}_both"] = _report_list(enriched_rows)
        if version == 3:
            v3_enriched_rows = enriched_rows
        owner_member_matches[f"v{version}"] = {
            "owner_id_present": sum(isinstance(row.get("owner"), dict) and row["owner"].get("id") is not None for row in enriched_rows),
            "owner_id_equals_member_email": sum(isinstance(row.get("owner"), dict) and row["owner"].get("id") in member_emails for row in enriched_rows),
            "matched_member_phone_filled": sum(
                _is_filled(member_by_email.get(row["owner"].get("id"), {}).get("phone"))
                for row in enriched_rows if isinstance(row.get("owner"), dict)
            ),
        }
    result["details"] = details
    result["owner_member_matches"] = owner_member_matches
    missing_parent_ids = list(dict.fromkeys(
        row["parentContractId"] for row in v3_enriched_rows
        if isinstance(row.get("parentContractId"), int)
        and (
            not isinstance(row.get("parentContract"), dict)
            or not _is_filled(row["parentContract"].get("name"))
            or not _is_filled(row["parentContract"].get("referenceId"))
        )
    ))
    parent_lookups = []
    for parent_id in missing_parent_ids:
        parent = _call("parent_contract_lookup", lambda i=parent_id: client.get_contract(i, api_version=3), errors)
        if isinstance(parent, dict):
            parent_lookups.append(parent)
    result["parent_lookup"] = {
        "attempted": len(missing_parent_ids), "received": len(parent_lookups),
        "name_filled": sum(_is_filled(row.get("name")) for row in parent_lookups),
        "reference_id_filled": sum(_is_filled(row.get("referenceId")) for row in parent_lookups),
        "contract_number_filled": sum(_is_filled(row.get("contractNumber")) for row in parent_lookups),
    }
    result["children_types_by_parent"] = {
        parent_type: dict(sorted(Counter(
            str(child.get("type", "<mangler>"))
            for row in v3_enriched_rows if row.get("type") == parent_type
            for child in (row.get("children") or []) if isinstance(child, dict)
        ).items()))
        for parent_type in sorted({str(row.get("type", "<mangler>")) for row in v3_enriched_rows})
    }

    procurement_ids = list(dict.fromkeys(
        row["procurementId"] for row in selected
        if isinstance(row.get("procurementId"), int)
    ))[:10]
    procurements = []
    for procurement_id in procurement_ids:
        procurement = _call(
            "procurement_detail_v3",
            lambda i=procurement_id: client.get_procurement(i, api_version=3),
            errors,
        )
        if isinstance(procurement, dict):
            procurements.append(procurement)
    result["procurement_details"] = {
        "attempted": len(procurement_ids), "received": len(procurements),
        "keys": _shape(procurements),
    }

    active = _call("active_contract_template", lambda: client.get_contract_internal_reporting_template(org_id), errors)
    result["active_contract_template"] = {
        "response_type": type(active).__name__,
        "keys": sorted(set(active) & {"id", "templateId", "fields", "columns", "nodes", "name", "status"}) if isinstance(active, dict) else [],
        "field_count": len(active.get("fields", [])) if isinstance(active, dict) and isinstance(active.get("fields"), list) else None,
        "has_template_id": isinstance(active, dict) and active.get("templateId") is not None,
    }
    templates = _call("templates", lambda: client.list_templates(org_id), errors)
    result["templates"] = {
        "count": len(templates),
        "item_keys": sorted(set().union(*(set(template) & {"id", "templateId", "name", "type", "status", "published"} for template in templates if isinstance(template, dict)))),
        "id_types": dict(sorted(Counter(type(template.get("id", template.get("templateId"))).__name__ for template in templates if isinstance(template, dict)).items())),
        "type_counts": dict(sorted(Counter(str(template.get("type", "<mangler>")) for template in templates if isinstance(template, dict)).items())),
        "status_counts": dict(sorted(Counter(str(template.get("status", "<mangler>")) for template in templates if isinstance(template, dict)).items())),
    } if isinstance(templates, list) else {"response_type": type(templates).__name__}
    if isinstance(templates, list):
        template_ids = []
        if isinstance(active, dict) and isinstance(active.get("templateId"), int):
            template_ids.append(active["templateId"])
        template_ids.extend(
            template.get("id", template.get("templateId")) for template in templates
            if isinstance(template, dict)
            and isinstance(template.get("id", template.get("templateId")), int)
            and template.get("id", template.get("templateId")) not in template_ids
        )
        result["template_responses"] = {}
        for template_id in template_ids:
            by_version = {}
            for version, entity_type in ((2, "contract"), (3, "contract"), (3, "procurement")):
                pages = []
                for page in (1, 2):
                    label = f"template_responses_v{version}_{entity_type}_{_digest(template_id)}"
                    response = _call(
                        label,
                        lambda t=template_id, p=page, v=version, e=entity_type: client.get_template_responses(
                            org_id, t, entity_type=e, page=p, page_size=25,
                            api_version=v,
                        ), errors,
                    )
                    if version == 2 and errors.get(label) == {"http_status": 404}:
                        pages.append({"http_status": 404})
                        del errors[label]
                    else:
                        pages.append(_report_template(response))
                    if not isinstance(response, dict) or not isinstance(response.get("totalPages"), int):
                        break
                    if response["totalPages"] < 2 and not (
                        version == 3 and entity_type == "procurement"
                        and page == 1 and response.get("totalCount", 0) > 0
                    ):
                        break
                by_version[f"v{version}_{entity_type}"] = pages
            result["template_responses"][_digest(template_id)] = by_version
    return result


if __name__ == "__main__":
    report = run()
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    if report["errors"]:
        raise SystemExit(1)
