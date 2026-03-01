"""API blueprint — exposes Artifik data as JSON endpoints."""

from __future__ import annotations

import io
import logging
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_file

from app.client import ArtifikAPIError
from protokoll.common import get_timeline_date, parse_submission_deadline, strip_html

bp = Blueprint("api", __name__)
log = logging.getLogger(__name__)


# -- Procurement filtering (mirrors CLI protokoll logic) ---------------------

THRESHOLD_SHORT = {
    "over_eea_threshold_value": "Over EØS",
    "below_eea_threshold_value": "Under EØS",
    "national_threshold": "Nasjonal",
    "below_national_threshold": "Under terskel",
}

PROCEDURE_SHORT = {
    "Open": "Åpen",
    "Limited": "Begrenset",
    "Competitive negotiated": "Forhandling",
    "Competitive dialogue": "Dialog",
    "Innovation partnership": "Innovasjon",
    "Negotiated without publication": "Uten kunngj.",
    "Direct award": "Direkte",
}


def _is_mature(procurement: dict) -> bool:
    """Procurement has passed submission deadline and is not template/cancelled."""
    if procurement.get("isTemplate") or procurement.get("isCancelled"):
        return False
    deadline = parse_submission_deadline(procurement)
    if not deadline:
        return False
    return datetime.now(deadline.tzinfo) > deadline


def _dedup_by_sequence_id(procs: list[dict]) -> list[dict]:
    """Keep the richest record per sequenceId."""
    best: dict[str, dict] = {}
    for p in procs:
        seq = p.get("sequenceId") or str(p.get("id"))
        existing = best.get(seq)
        richness = sum(1 for v in p.values() if v not in (None, "", [], {}))
        if existing is None or richness > existing["_richness"]:
            p["_richness"] = richness
            best[seq] = p
    for p in best.values():
        p.pop("_richness", None)
    return list(best.values())


def _client():
    return current_app.artifik  # type: ignore[attr-defined]


def _doffin():
    return current_app.doffin  # type: ignore[attr-defined]


@bp.errorhandler(ArtifikAPIError)
def handle_artifik_error(e: ArtifikAPIError):
    log.warning("Artifik API error: %s", e)
    return jsonify({"error": str(e)}), e.status_code


@bp.errorhandler(Exception)
def handle_unexpected_error(e: Exception):
    log.exception("Unexpected API error: %s", e)
    return jsonify({"error": "Internal server error"}), 500


@bp.route("/procurements")
def list_procurements():
    org_id = request.args.get("organizationId")
    data = _client().list_procurements(organization_id=org_id)
    return jsonify(data)


@bp.route("/procurements/mature")
def list_mature_procurements():
    """Filtered list: past deadline, no templates/cancelled, deduplicated."""
    all_procs = _client().list_procurements()
    mature = [p for p in all_procs if _is_mature(p)]
    mature = _dedup_by_sequence_id(mature)
    mature.sort(key=lambda p: get_timeline_date(p, "submission") or "", reverse=True)

    results = []
    for p in mature:
        raw_name = p.get("name") or p.get("title") or p.get("description") or ""
        name = strip_html(raw_name).split("\n")[0]  # first line only
        raw_proc = p.get("procedure") or ""
        raw_thresh = p.get("threshold") or ""
        deadline_str = get_timeline_date(p, "submission") or ""

        results.append({
            "id": p.get("id"),
            "sequenceId": p.get("sequenceId"),
            "name": name or f"Anskaffelse {p.get('id')}",
            "procedure": PROCEDURE_SHORT.get(raw_proc, raw_proc or "?"),
            "threshold": THRESHOLD_SHORT.get(raw_thresh, raw_thresh or "?"),
            "deadline": deadline_str[:10] if deadline_str else "",
        })

    return jsonify(results)


@bp.route("/procurements/<int:procurement_id>")
def get_procurement(procurement_id: int):
    """Get a single procurement by ID (filtered from list endpoint)."""
    all_procs = _client().list_procurements()
    for p in all_procs:
        if p.get("id") == procurement_id:
            return jsonify(p)
    return jsonify({"error": "Not found"}), 404


@bp.route("/procurements/<int:procurement_id>/activities")
def procurement_activities(procurement_id: int):
    data = _client().get_procurement_activities(procurement_id)
    return jsonify(data)


@bp.route("/procurements/<int:procurement_id>/smart-docs")
def smart_doc_responses(procurement_id: int):
    data = _client().get_smart_doc_responses(procurement_id)
    return jsonify(data)


@bp.route("/contracts")
def list_contracts():
    org_id = request.args.get("organizationId")
    limit_date = request.args.get("limitDate")
    include_custom = request.args.get("includeCustomFields") == "1"
    data = _client().list_contracts(
        organization_id=org_id,
        include_custom_fields=include_custom,
        limit_date=limit_date,
    )
    return jsonify(data)


@bp.route("/contracts/<int:contract_id>")
def get_contract(contract_id: int):
    data = _client().get_contract(contract_id)
    return jsonify(data)


@bp.route("/organizations")
def list_organizations():
    include_sub = request.args.get("includeSubOrgs") == "1"
    data = _client().list_organizations(include_sub_orgs=include_sub)
    return jsonify(data)


# ── eForms (Doffin) ──


@bp.route("/eforms/<doffin_id>")
def get_eforms(doffin_id: str):
    """Return parsed eForms data for a Doffin notice."""
    try:
        data = _doffin().get_notice(doffin_id)
        return jsonify(data)
    except Exception as e:
        log.warning("eForms lookup failed for %s: %s", doffin_id, e)
        return jsonify({"error": str(e)}), 404


# ── Protokoll generation ──


@bp.route("/protokoll/generate", methods=["POST"])
def generate_protokoll():
    """Generate a Word protocol document from merged API + manual data."""
    from protokoll import generate_protokoll_docx, generate_protokoll_docx_del2

    payload = request.get_json()
    if not payload:
        return jsonify({"error": "Missing JSON body"}), 400

    procurement = payload.get("procurement", {})
    activities = payload.get("activities", [])
    eforms = payload.get("eforms")
    is_del2 = payload.get("isDel2", False)

    try:
        if is_del2:
            doc = generate_protokoll_docx_del2(procurement, activities, eforms)
        else:
            doc = generate_protokoll_docx(procurement, activities, eforms)

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)

        seq_id = procurement.get("sequenceId", "protokoll")
        filename = f"protokoll-{seq_id}.docx"

        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as e:
        log.exception("Protokoll generation failed")
        return jsonify({"error": str(e)}), 500
