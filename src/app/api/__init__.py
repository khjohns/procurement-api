"""API blueprint — exposes Artifik data as JSON endpoints."""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("api", __name__)


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
