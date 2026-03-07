"""API blueprint — exposes Artifik data as JSON endpoints."""

from __future__ import annotations

import atexit
import io
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Blueprint, current_app, jsonify, request, send_file

from app.client import ArtifikAPIError
from protokoll.common import (
    build_org_lookup,
    dedup_by_sequence_id,
    get_activities_by_action,
    get_org_name,
    get_timeline_date,
    is_mature,
    parse_announcement,
    strip_html,
)

bp = Blueprint("api", __name__)
log = logging.getLogger(__name__)

# ── In-memory caches ──

_CACHE_TTL = 120  # seconds
_proc_cache: dict[str, tuple[float, list[dict]]] = {}
_activity_cache: dict[int, tuple[float, list[dict]]] = {}

_executor = ThreadPoolExecutor(max_workers=10)
atexit.register(_executor.shutdown, wait=False)


def _cached_list_procurements(org_id: str | None = None) -> list[dict]:
    """Return list_procurements() with a TTL cache to avoid repeated API calls."""
    key = org_id or "__all__"
    now = time.monotonic()
    cached = _proc_cache.get(key)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]
    data = _client().list_procurements(organization_id=org_id)
    _proc_cache[key] = (now, data)
    return data


def _cached_activities(client, procurement_id: int) -> list[dict]:
    """Return activities for a procurement with a TTL cache.

    Takes ``client`` explicitly because this runs in executor threads
    outside Flask's application context (``_client()`` would fail).
    """
    now = time.monotonic()
    cached = _activity_cache.get(procurement_id)
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]
    data = client.get_procurement_activities(procurement_id)
    _activity_cache[procurement_id] = (now, data)
    return data


def _iso_date(activity: dict) -> str:
    """Extract ISO date string from an activity, suitable for JS Date parsing."""
    return activity.get("date") or ""


def _announcement_iso_date(activities: list[dict]) -> str:
    """Get announcement date as ISO string (not formatted for display)."""
    publish = get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")
    if publish:
        return publish[0].get("date") or ""
    doffin = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    if doffin:
        desc = doffin[0].get("description") or {}
        doffin_notice = desc.get("doffinNotice") or {}
        return doffin_notice.get("publicationDate") or doffin[0].get("date") or ""
    return ""


def _build_hendelser(procurement: dict, activities: list[dict]) -> list[dict]:
    """Build timeline events from procurement data and activities.

    Dates are returned as ISO strings for frontend Date parsing.
    """
    hendelser: list[dict] = []
    org_lookup = build_org_lookup(activities)

    # K — Kunngjort
    _, doffin_ref, ted_ref = parse_announcement(activities)
    ann_date = _announcement_iso_date(activities)
    if ann_date:
        label = "Kunngjort"
        if doffin_ref:
            label += f" ({doffin_ref})"
        hendelser.append(
            {"type": "K", "dato": ann_date, "label": label, "besvart": True}
        )

    # F — Forespørsel om deltakelse (klynge per leverandør)
    for a in get_activities_by_action(activities, "ASK_TO_QUALIFY"):
        name = get_org_name(a, org_lookup)
        hendelser.append(
            {
                "type": "F",
                "dato": _iso_date(a),
                "label": f"Forespørsel: {name}",
                "besvart": True,
            }
        )

    # S — Kvalifisering
    for a in get_activities_by_action(activities, "OPEN_QUALIFICATIONS"):
        hendelser.append(
            {
                "type": "S",
                "dato": _iso_date(a),
                "label": "Kvalifikasjoner åpnet",
                "besvart": True,
            }
        )

    for a in get_activities_by_action(activities, "QUALIFYING_PARTICIPANTS"):
        hendelser.append(
            {
                "type": "S",
                "dato": _iso_date(a),
                "label": "Kvalifiserte leverandører",
                "besvart": True,
            }
        )

    for a in get_activities_by_action(activities, "REJECT_PARTICIPATION"):
        name = get_org_name(a, org_lookup)
        hendelser.append(
            {
                "type": "S",
                "dato": _iso_date(a),
                "label": f"Avvist: {name}",
                "besvart": True,
                "avvist": True,
            }
        )

    # T — Tilbud
    for a in get_activities_by_action(activities, "SUBMIT_BID"):
        name = get_org_name(a, org_lookup)
        hendelser.append(
            {
                "type": "T",
                "dato": _iso_date(a),
                "label": f"Tilbud: {name}",
                "besvart": True,
            }
        )

    for a in get_activities_by_action(activities, "OPEN_BIDS"):
        hendelser.append(
            {
                "type": "T",
                "dato": _iso_date(a),
                "label": "Tilbudsåpning",
                "besvart": True,
            }
        )

    # E — Evaluert
    for a in get_activities_by_action(activities, "AWARDING_PARTICIPANTS"):
        hendelser.append(
            {
                "type": "E",
                "dato": _iso_date(a),
                "label": "Tildeling utført",
                "besvart": True,
            }
        )

    # P — Protokoll (from procurement field, not activity)
    if procurement.get("areAwardLettersSent"):
        hendelser.append(
            {"type": "P", "dato": "", "label": "Tildelingsbrev sendt", "besvart": True}
        )

    # U — Utkast (if no K-node exists)
    if not any(h["type"] == "K" for h in hendelser):
        hendelser.append({"type": "U", "dato": "", "label": "Utkast", "besvart": True})

    return hendelser


def _fallback_hendelser(procurement: dict) -> list[dict]:
    """Minimal hendelser from procurement data alone (graceful degradation)."""
    hendelser: list[dict] = []
    deadline_str = get_timeline_date(procurement, "submission") or ""
    if deadline_str:
        hendelser.append(
            {
                "type": "K",
                "dato": deadline_str,
                "label": "Kunngjort",
                "besvart": True,
            }
        )
        hendelser.append(
            {
                "type": "T",
                "dato": deadline_str,
                "label": f"Tilbudsfrist {deadline_str[:10]}",
                "besvart": False,
            }
        )
    else:
        hendelser.append({"type": "U", "dato": "", "label": "Utkast", "besvart": True})
    return hendelser


def _fetch_hendelser_parallel(
    client, procurements: list[dict]
) -> dict[int, list[dict]]:
    """Fetch activities and build hendelser for all procurements in parallel."""
    result: dict[int, list[dict]] = {}
    futures = {}
    for p in procurements:
        pid = p.get("id")
        if pid is None:
            continue
        future = _executor.submit(_cached_activities, client, pid)
        futures[future] = (pid, p)

    for future in as_completed(futures):
        pid, proc = futures[future]
        try:
            activities = future.result(timeout=10)
            result[pid] = _build_hendelser(proc, activities)
        except Exception:
            log.warning(
                "Failed to fetch activities for procurement %s", pid, exc_info=True
            )
            result[pid] = _fallback_hendelser(proc)

    return result


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
    return jsonify(_cached_list_procurements(org_id))


@bp.route("/procurements/mature")
def list_mature_procurements():
    """Filtered list: past deadline, no templates/cancelled, deduplicated."""
    all_procs = _cached_list_procurements()
    mature = [p for p in all_procs if is_mature(p)]
    mature = dedup_by_sequence_id(mature)
    mature.sort(key=lambda p: get_timeline_date(p, "submission") or "", reverse=True)

    # Fetch activities in parallel for all mature procurements
    hendelser_map = _fetch_hendelser_parallel(_client(), mature)

    results = []
    for p in mature:
        raw_name = p.get("name") or p.get("title") or p.get("description") or ""
        name = strip_html(raw_name).split("\n")[0]  # first line only
        raw_proc = p.get("procedure") or ""
        raw_thresh = p.get("threshold") or ""
        deadline_str = get_timeline_date(p, "submission") or ""
        procurer = p.get("about_procurer") or {}
        pid = p.get("id")

        results.append(
            {
                "id": pid,
                "sequenceId": p.get("sequenceId"),
                "name": name or f"Anskaffelse {pid}",
                "procedure": PROCEDURE_SHORT.get(raw_proc, raw_proc or "?"),
                "threshold": THRESHOLD_SHORT.get(raw_thresh, raw_thresh or "?"),
                "deadline": deadline_str[:10] if deadline_str else "",
                "contactPerson": procurer.get("contact_person") or "",
                "awarded": bool(p.get("areAwardLettersSent")),
                "framework": bool(p.get("framework_agreement_involved")),
                "hendelser": hendelser_map.get(pid, _fallback_hendelser(p)),
            }
        )

    return jsonify(results)


@bp.route("/procurements/<int:procurement_id>")
def get_procurement(procurement_id: int):
    """Get a single procurement by ID (filtered from list endpoint)."""
    all_procs = _cached_list_procurements()
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
