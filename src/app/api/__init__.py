"""API blueprint — exposes Artifik data as JSON endpoints."""

from __future__ import annotations

import atexit
import io
import logging
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Blueprint, current_app, jsonify, request, send_file

from app.client import ArtifikAPIError
from eforms_labels import get_labels as _get_labels
from app.constants import (
    ACTION_ASK_TO_QUALIFY,
    ACTION_AWARD_LETTERS_SENT,
    ACTION_AWARDING_PARTICIPANTS,
    ACTION_CONVERSATION_MARKED_COMPLETED,
    ACTION_CONVERSATION_REOPENED,
    ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED,
    ACTION_LABELS,
    ACTION_OPEN_BIDS,
    ACTION_OPEN_QUALIFICATIONS,
    ACTION_PUBLISH_ADDITIONAL_INFORMATION,
    ACTION_PUBLISH_CHANGE_PROCUREMENT,
    ACTION_PUBLISH_Q8A,
    ACTION_PUBLISH_TO_DOFFIN,
    ACTION_QUALIFYING_PARTICIPANTS,
    ACTION_REJECT_PARTICIPATION,
    ACTION_SUBMIT_BID,
    ACTION_WITHDRAW_PARTICIPATION,
    TIMELINE_SUBMISSION,
)
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
    publish = get_activities_by_action(activities, ACTION_PUBLISH_TO_DOFFIN)
    if publish:
        return publish[0].get("date") or ""
    doffin = get_activities_by_action(activities, ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED)
    if doffin:
        desc = doffin[0].get("description") or {}
        doffin_notice = desc.get("doffinNotice") or {}
        return doffin_notice.get("publicationDate") or doffin[0].get("date") or ""
    return ""


def _build_hendelser(procurement: dict, activities: list[dict]) -> list[dict]:
    """Build timeline events from procurement data and activities.

    Each hendelse carries both a ``type`` (7-letter lifecycle phase for the
    timeline) and an ``action`` (original Artifik activity for the
    hendelseslogg in the right panel).

    Dates are returned as ISO strings for frontend Date parsing.
    """
    hendelser: list[dict] = []
    org_lookup = build_org_lookup(activities)

    # Pre-group activities by action in a single pass
    by_action: dict[str, list[dict]] = defaultdict(list)
    for a in activities:
        by_action[a.get("action", "")].append(a)
    for v in by_action.values():
        v.sort(key=lambda a: a.get("date") or "")

    def _h(
        typ: str,
        action: str,
        dato: str,
        label: str,
        *,
        besvart: bool = True,
        avvist: bool = False,
    ) -> dict:
        h: dict = {"type": typ, "action": action, "dato": dato, "label": label, "besvart": besvart}
        if avvist:
            h["avvist"] = True
        return h

    # K — Kunngjort
    _, doffin_ref, ted_ref = parse_announcement(activities)
    ann_date = _announcement_iso_date(activities)
    if ann_date:
        label = "Kunngjort"
        if doffin_ref:
            label += f" ({doffin_ref})"
        hendelser.append(_h("K", ACTION_PUBLISH_TO_DOFFIN, ann_date, label))

    # F — Forespørsel om deltakelse (klynge per leverandør)
    for a in by_action[ACTION_ASK_TO_QUALIFY]:
        name = get_org_name(a, org_lookup)
        hendelser.append(
            _h("F", ACTION_ASK_TO_QUALIFY, _iso_date(a), f"Forespørsel: {name}")
        )

    # S — Kvalifisering
    for a in by_action[ACTION_OPEN_QUALIFICATIONS]:
        hendelser.append(
            _h("S", ACTION_OPEN_QUALIFICATIONS, _iso_date(a), "Kvalifikasjoner åpnet")
        )

    for a in by_action[ACTION_QUALIFYING_PARTICIPANTS]:
        hendelser.append(
            _h("S", ACTION_QUALIFYING_PARTICIPANTS, _iso_date(a), "Kvalifiserte leverandører")
        )

    for a in by_action[ACTION_REJECT_PARTICIPATION]:
        # TODO: REJECT_PARTICIPATION activities often have empty organization
        # fields, causing fallback to "Ukjent leverandør". The activity carries
        # description.lotResponseId which could be cross-referenced against
        # SUBMIT_BID/ASK_TO_QUALIFY activities to resolve the supplier name.
        name = get_org_name(a, org_lookup)
        hendelser.append(
            _h("S", ACTION_REJECT_PARTICIPATION, _iso_date(a), f"Avvist: {name}", avvist=True)
        )

    # T — Tilbud
    for a in by_action[ACTION_SUBMIT_BID]:
        name = get_org_name(a, org_lookup)
        hendelser.append(
            _h("T", ACTION_SUBMIT_BID, _iso_date(a), f"Tilbud: {name}")
        )

    for a in by_action[ACTION_OPEN_BIDS]:
        hendelser.append(
            _h("T", ACTION_OPEN_BIDS, _iso_date(a), "Tilbudsåpning")
        )

    # E — Evaluert
    for a in by_action[ACTION_AWARDING_PARTICIPANTS]:
        hendelser.append(
            _h("E", ACTION_AWARDING_PARTICIPANTS, _iso_date(a), "Tildeling utført")
        )

    # P — Protokoll (from procurement field, not activity)
    if procurement.get("areAwardLettersSent"):
        hendelser.append(
            _h("P", ACTION_AWARD_LETTERS_SENT, "", "Tildelingsbrev sendt")
        )

    # ── Non-node activities (shown only in hendelseslogg, not in timeline) ──

    for a in by_action[ACTION_PUBLISH_Q8A]:
        hendelser.append(
            _h("", ACTION_PUBLISH_Q8A, _iso_date(a), "Spørsmål og svar publisert")
        )

    for a in by_action[ACTION_PUBLISH_ADDITIONAL_INFORMATION]:
        desc = a.get("description") or {}
        info_text = desc.get("text") or ""
        label = "Tilleggsinformasjon"
        if info_text:
            label += f": {strip_html(info_text)[:80]}"
        hendelser.append(
            _h("", ACTION_PUBLISH_ADDITIONAL_INFORMATION, _iso_date(a), label)
        )

    for a in by_action[ACTION_PUBLISH_CHANGE_PROCUREMENT]:
        hendelser.append(
            _h("", ACTION_PUBLISH_CHANGE_PROCUREMENT, _iso_date(a), "Endring i konkurransen")
        )

    for a in by_action[ACTION_WITHDRAW_PARTICIPATION]:
        name = get_org_name(a, org_lookup)
        hendelser.append(
            _h("", ACTION_WITHDRAW_PARTICIPATION, _iso_date(a), f"Tilbaketrekking: {name}")
        )

    for a in by_action[ACTION_CONVERSATION_MARKED_COMPLETED]:
        desc = a.get("description") or {}
        title = desc.get("title") or ""
        name = get_org_name(a, org_lookup)
        label = f"Dialog fullført: {name}"
        if title:
            label += f" — {title}"
        hendelser.append(
            _h("", ACTION_CONVERSATION_MARKED_COMPLETED, _iso_date(a), label)
        )

    for a in by_action[ACTION_CONVERSATION_REOPENED]:
        name = get_org_name(a, org_lookup)
        hendelser.append(
            _h("", ACTION_CONVERSATION_REOPENED, _iso_date(a), f"Dialog gjenåpnet: {name}")
        )

    # U — Opprettet (earliest activity — show actual activity name)
    dated = [a for a in activities if a.get("date")]
    if dated:
        dated.sort(key=lambda a: a["date"])
        earliest = dated[0]
        earliest_action = earliest.get("action") or ""
        earliest_label = ACTION_LABELS.get(earliest_action, earliest_action)
        hendelser.append(
            _h("U", earliest_action, earliest["date"], f"Opprettet ({earliest_label})")
        )
    elif not any(h["type"] == "K" for h in hendelser):
        hendelser.append(_h("U", "", "", "Utkast"))

    return hendelser


def _fallback_hendelser(procurement: dict) -> list[dict]:
    """Minimal hendelser from procurement data alone (graceful degradation)."""
    hendelser: list[dict] = []
    deadline_str = get_timeline_date(procurement, TIMELINE_SUBMISSION) or ""
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


def _extract_doffin_id(activities: list[dict]) -> str | None:
    """Extract Doffin notice ID (NGOJ) from activities."""
    doffin_acts = get_activities_by_action(
        activities, ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED
    )
    if not doffin_acts:
        return None
    desc = doffin_acts[0].get("description") or {}
    doffin_notice = desc.get("doffinNotice") or {}
    return doffin_notice.get("ngoj") or None


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


def _fetch_hendelser_and_doffin_parallel(
    client, procurements: list[dict]
) -> tuple[dict[int, list[dict]], dict[int, str]]:
    """Fetch activities and build hendelser + extract doffin IDs in parallel."""
    hendelser_result: dict[int, list[dict]] = {}
    doffin_result: dict[int, str] = {}
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
            hendelser_result[pid] = _build_hendelser(proc, activities)
            doffin_id = _extract_doffin_id(activities)
            if doffin_id:
                doffin_result[pid] = doffin_id
        except Exception:
            log.warning(
                "Failed to fetch activities for procurement %s", pid, exc_info=True
            )
            hendelser_result[pid] = _fallback_hendelser(proc)

    return hendelser_result, doffin_result


# -- Procurement filtering (mirrors CLI protokoll logic) ---------------------

THRESHOLD_SHORT = _get_labels("threshold-short")
PROCEDURE_SHORT = _get_labels("procedure-short")


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
    mature.sort(
        key=lambda p: get_timeline_date(p, TIMELINE_SUBMISSION) or "", reverse=True
    )

    # Fetch activities in parallel for all mature procurements
    hendelser_map, doffin_map = _fetch_hendelser_and_doffin_parallel(
        _client(), mature
    )

    results = []
    for p in mature:
        raw_name = p.get("name") or p.get("title") or p.get("description") or ""
        name = strip_html(raw_name).split("\n")[0]  # first line only
        raw_desc = p.get("description") or ""
        description = strip_html(raw_desc).strip()
        if len(description) > 400:
            description = description[:399] + "\u2026"
        raw_proc = p.get("procedure") or ""
        raw_thresh = p.get("threshold") or ""
        deadline_str = get_timeline_date(p, TIMELINE_SUBMISSION) or ""
        procurer = p.get("about_procurer") or {}
        pid = p.get("id")

        entry: dict = {
            "id": pid,
            "sequenceId": p.get("sequenceId"),
            "name": name or f"Anskaffelse {pid}",
            "description": description,
            "procedure": PROCEDURE_SHORT.get(raw_proc, raw_proc or "?"),
            "threshold": THRESHOLD_SHORT.get(raw_thresh, raw_thresh or "?"),
            "deadline": deadline_str[:10] if deadline_str else "",
            "contactPerson": procurer.get("contact_person") or "",
            "awarded": bool(p.get("areAwardLettersSent")),
            "framework": bool(p.get("framework_agreement_involved")),
            "hendelser": hendelser_map.get(pid, _fallback_hendelser(p)),
        }
        doffin_id = doffin_map.get(pid)
        if doffin_id:
            entry["doffinId"] = doffin_id
        results.append(entry)

    return jsonify(results)


@bp.route("/procurements/<int:procurement_id>")
def get_procurement(procurement_id: int):
    """Get a single procurement by ID (filtered from list endpoint)."""
    all_procs = _cached_list_procurements()
    for p in all_procs:
        if p.get("id") == procurement_id:
            result = dict(p)
            activities = _cached_activities(_client(), procurement_id)
            doffin_id = _extract_doffin_id(activities)
            if doffin_id:
                result["doffinId"] = doffin_id
            return jsonify(result)
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


# ── CPV labels ──

_cpv_labels: dict[str, str] | None = None


def _get_cpv_labels() -> dict[str, str]:
    """Lazy-load Norwegian CPV labels from bundled JSON."""
    global _cpv_labels
    if _cpv_labels is None:
        import json
        from pathlib import Path

        path = Path(__file__).parent.parent / "data" / "cpv_labels_nb.json"
        _cpv_labels = json.loads(path.read_text()) if path.exists() else {}
    return _cpv_labels


@bp.route("/cpv/<codes>")
def get_cpv_labels(codes: str):
    """Look up Norwegian labels for CPV codes (comma-separated)."""
    labels = _get_cpv_labels()
    result = {}
    for code in codes.split(","):
        code = code.strip()
        if code:
            result[code] = labels.get(code)
    return jsonify(result)


# ── eForms codelist labels ──


@bp.route("/eforms-labels")
def get_eforms_labels():
    """Return all eForms codelist labels, or a specific codelist via ?codelist=name."""
    from eforms_labels import get_all_labels, get_labels

    codelist = request.args.get("codelist")
    if codelist:
        return jsonify(get_labels(codelist))
    return jsonify(get_all_labels())


@bp.route("/eforms-labels/<codelist>/<code>")
def get_eforms_label(codelist: str, code: str):
    """Look up a single eForms label."""
    from eforms_labels import get_label

    label = get_label(codelist, code)
    return jsonify({"code": code, "label": label})


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
