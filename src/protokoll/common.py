"""Shared helpers for protokoll generators."""

from __future__ import annotations

import html
import re
from datetime import datetime
from typing import Any


# -- Activity action constants ------------------------------------------------

ACTION_ASK_TO_QUALIFY = "ASK_TO_QUALIFY"
ACTION_AWARDING_PARTICIPANTS = "AWARDING_PARTICIPANTS"
ACTION_CONVERSATION_MARKED_COMPLETED = "CONVERSATION_MARKED_COMPLETED"
ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED = "DOFFIN_NOTICE_STATUS_PUBLISHED"
ACTION_OPEN_BIDS = "OPEN_BIDS"
ACTION_OPEN_QUALIFICATIONS = "OPEN_QUALIFICATIONS"
ACTION_PUBLISH_TO_DOFFIN = "PUBLISH_TO_DOFFIN"
ACTION_QUALIFYING_PARTICIPANTS = "QUALIFYING_PARTICIPANTS"
ACTION_REJECT_PARTICIPATION = "REJECT_PARTICIPATION"
ACTION_SUBMIT_BID = "SUBMIT_BID"
ACTION_WITHDRAW_PARTICIPATION = "WITHDRAW_PARTICIPATION"

# -- Timeline type constants --------------------------------------------------

TIMELINE_SUBMISSION = "submission"
TIMELINE_AWARD_DECISION = "award decision"

# -- Procedure mappings -------------------------------------------------------

PROCEDURE_MAP = {
    "Open": "Åpen anbudskonkurranse",
    "Limited": "Begrenset anbudskonkurranse",
    "Competitive negotiated": "Konkurranse med forhandling etter forutgående kunngjøring",
    "Competitive dialogue": "Konkurransepreget dialog",
    "Innovation partnership": "Innovasjonspartnerskap",
    "Negotiated without publication": "Konkurranse med forhandling uten forutgående kunngjøring",
    "Direct award": "Anskaffelse uten konkurranse",
}

ALL_PROCEDURES = [
    "Åpen anbudskonkurranse",
    "Begrenset anbudskonkurranse",
    "Konkurranse med forhandling etter forutgående kunngjøring",
    "Konkurransepreget dialog",
    "Innovasjonspartnerskap",
    "Konkurranse med forhandling uten forutgående kunngjøring",
    "Anskaffelse uten konkurranse",
]

DEL2_PROCEDURE_MAP = {
    "Open": "Åpen tilbudskonkurranse",
    "Limited": "Begrenset tilbudskonkurranse",
}

ALL_DEL2_PROCEDURES = [
    "Åpen tilbudskonkurranse",
    "Begrenset tilbudskonkurranse",
]


# -- Formatting helpers -------------------------------------------------------


def fmt_datetime(iso_str: str | None) -> str:
    """Format ISO datetime to 'DD.MM.YYYY, kl. HH:MM'."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y, kl. %H:%M")
    except (ValueError, TypeError):
        return str(iso_str)


def fmt_date(iso_str: str | None) -> str:
    """Format ISO datetime to 'DD.MM.YYYY'."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y")
    except (ValueError, TypeError):
        return str(iso_str)


def fmt_currency(value: Any, currency: str = "NOK") -> str:
    """Format a numeric value as currency."""
    if value is None:
        return ""
    try:
        num = float(value)
        if num == int(num):
            return f"{int(num):,} {currency}".replace(",", " ")
        return f"{num:,.2f} {currency}".replace(",", " ")
    except (ValueError, TypeError):
        return str(value)


def get_timeline_date(procurement: dict, timeline_type: str) -> str | None:
    """Get a date from the procurement timeline by type."""
    timeline = procurement.get("timeline") or {}
    for entry in timeline.values() if isinstance(timeline, dict) else timeline:
        item = entry if isinstance(entry, dict) else {}
        if item.get("type") == timeline_type:
            return item.get("date")
    return None


def get_activities_by_action(activities: list[dict], action: str) -> list[dict]:
    """Filter activities by action type, sorted by date."""
    result = [a for a in activities if a.get("action") == action]
    result.sort(key=lambda a: a.get("date") or "")
    return result


def build_org_lookup(activities: list[dict]) -> dict[str, str]:
    """Build org-id → org-name mapping from all activities with organization info.

    REJECT_PARTICIPATION events have empty organization but contain
    description.lotResponseId. Other activity types (SUBMIT_BID, CREATE_TENDER,
    etc.) carry organization.name + organization.id which we can use.
    """
    lookup: dict[str, str] = {}
    for a in activities:
        org = a.get("organization") or {}
        org_id = org.get("id")
        org_name = org.get("name")
        if org_id and org_name:
            lookup[org_id] = org_name
    return lookup


def get_org_name(activity: dict, org_lookup: dict[str, str]) -> str:
    """Get organization name from activity, falling back to org_lookup."""
    org = activity.get("organization") or {}
    name = org.get("name")
    if name:
        return name
    org_id = org.get("id")
    if org_id and org_id in org_lookup:
        return org_lookup[org_id]
    return "Ukjent leverandør"


def filter_post_deadline_conversations(
    procurement: dict, activities: list[dict]
) -> tuple[list[dict], list[dict]]:
    """Filter conversations that occurred after the submission deadline.

    Returns:
        Tuple of (post_deadline_conversations, all_conversations).
    """
    submission_deadline = parse_submission_deadline(procurement)
    conversations = get_activities_by_action(
        activities, ACTION_CONVERSATION_MARKED_COMPLETED
    )

    post_deadline = []
    if submission_deadline and conversations:
        for c in conversations:
            conv_date_str = c.get("date")
            if conv_date_str:
                try:
                    conv_date = datetime.fromisoformat(
                        conv_date_str.replace("Z", "+00:00")
                    )
                    if conv_date > submission_deadline:
                        post_deadline.append(c)
                except (ValueError, TypeError):
                    pass

    return post_deadline, conversations


def parse_submission_deadline(procurement: dict) -> datetime | None:
    """Parse the submission deadline from timeline."""
    date_str = get_timeline_date(procurement, TIMELINE_SUBMISSION)
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def parse_announcement(activities: list[dict]) -> tuple[str, str, str]:
    """Extract announcement date, Doffin reference, and TED reference from activities.

    Returns:
        Tuple of (announcement_date, doffin_ref, ted_ref) — all strings, empty if not found.
    """
    doffin_activities = get_activities_by_action(
        activities, ACTION_DOFFIN_NOTICE_STATUS_PUBLISHED
    )
    publish_activities = get_activities_by_action(activities, ACTION_PUBLISH_TO_DOFFIN)
    announcement_date = ""
    doffin_ref = ""
    ted_ref = ""
    if publish_activities:
        announcement_date = fmt_date(publish_activities[0].get("date"))
    if doffin_activities:
        desc = doffin_activities[0].get("description") or {}
        doffin_notice = desc.get("doffinNotice") or {}
        doffin_ref = doffin_notice.get("ngoj") or ""
        ted_ref = doffin_notice.get("publicationId") or ""
        if not announcement_date:
            announcement_date = fmt_date(
                doffin_notice.get("publicationDate") or doffin_activities[0].get("date")
            )
    return announcement_date, doffin_ref, ted_ref


def is_mature(procurement: dict) -> bool:
    """Check if procurement is past submission deadline and not a template/cancelled."""
    if procurement.get("isTemplate") or procurement.get("isCancelled"):
        return False
    deadline = parse_submission_deadline(procurement)
    if not deadline:
        return False
    return datetime.now(deadline.tzinfo) > deadline


def _richness(p: dict) -> int:
    """Score how much data a procurement object contains."""
    return sum(
        1 for v in p.values() if v is not None and v != "" and v != [] and v != {}
    )


def dedup_by_sequence_id(procs: list[dict]) -> list[dict]:
    """Deduplicate procurements by sequenceId, keeping the richest one."""
    best: dict[str, dict] = {}
    for p in procs:
        seq = p.get("sequenceId") or str(p.get("id"))
        existing = best.get(seq)
        if existing is None or _richness(p) > _richness(existing):
            best[seq] = p
    return list(best.values())


def safe_int(val: Any, default: int | None = None) -> int | None:
    """Safely convert a value to int, returning default on failure."""
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def strip_html(text: str) -> str:
    """Strip HTML tags and normalize whitespace from API text fields."""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(?:p|div|li|tr|h[1-6])>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    lines = text.splitlines()
    lines = [re.sub(r"[ \t\xa0]+", " ", line).strip() for line in lines]
    result = []
    for line in lines:
        if line or (result and result[-1]):
            result.append(line)
    return "\n".join(result).strip()
