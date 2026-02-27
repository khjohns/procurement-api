"""Shared helpers for protokoll generators."""

from __future__ import annotations

import html
import re
from datetime import datetime
from typing import Any


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


def parse_submission_deadline(procurement: dict) -> datetime | None:
    """Parse the submission deadline from timeline."""
    date_str = get_timeline_date(procurement, "submission")
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


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
