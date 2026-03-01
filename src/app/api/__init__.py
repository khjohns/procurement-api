"""API blueprint — exposes Artifik data as JSON endpoints."""

from __future__ import annotations

import io
import logging

from flask import Blueprint, current_app, jsonify, request, send_file

bp = Blueprint("api", __name__)
log = logging.getLogger(__name__)


def _client():
    return current_app.artifik  # type: ignore[attr-defined]


@bp.route("/procurements")
def list_procurements():
    org_id = request.args.get("organizationId")
    data = _client().list_procurements(organization_id=org_id)
    return jsonify(data)


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
    from app.doffin import DoffinClient

    try:
        client = DoffinClient()
        data = client.get_notice(doffin_id)
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
