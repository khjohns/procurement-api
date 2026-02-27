"""Doffin Public API client."""

from __future__ import annotations

import json
import logging
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import certifi

from artifik_mcp.decorator import mcp_tool
from app.eforms import parse_eforms_xml

log = logging.getLogger(__name__)


@dataclass
class DoffinClient:
    """Client for the Doffin Public API.

    API key can be injected directly or read from environment variable:
        DOFFIN_API_KEY — Ocp-Apim-Subscription-Key
    """

    base_url: str = "https://api.doffin.no/public"
    api_key: str | None = field(default=None, repr=False)
    cache_dir: str | None = field(default=None, repr=False)
    _ssl_ctx: ssl.SSLContext = field(default_factory=lambda: ssl.create_default_context(cafile=certifi.where()), repr=False)

    def _get_api_key(self) -> str:
        if self.api_key:
            return self.api_key
        # Check environment variable, but don't fail yet to allow manual injection
        return os.environ.get("DOFFIN_API_KEY", "")

    def _do_request(self, req: urllib.request.Request) -> Any:
        import time

        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("DOFFIN_API_KEY environment variable not set and no API key provided to client.")

        req.add_header("Ocp-Apim-Subscription-Key", api_key)

        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, context=self._ssl_ctx) as resp:
                    body = resp.read()
                    if not body:
                        return None
                    content_type = resp.headers.get("Content-Type", "")
                    if "json" in content_type:
                        return json.loads(body)
                    return body
            except urllib.error.HTTPError as e:
                error_body = e.read().decode(errors="replace")
                if e.code == 429 and attempt < 3:
                    wait = 10 * (attempt + 1)
                    log.info("Rate limited, venter %d sekunder ...", wait)
                    time.sleep(wait)
                    # Rebuild request since urlopen consumed it
                    req = urllib.request.Request(req.full_url)
                    req.add_header("Ocp-Apim-Subscription-Key", api_key)
                    continue
                raise DoffinAPIError(e.code, e.reason, error_body) from e
        raise RuntimeError("Exhausted retries")

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered, doseq=True)
        req = urllib.request.Request(url)
        return self._do_request(req)

    @mcp_tool(description="Search notices in Doffin with various filters.")
    def search_notices(
        self,
        *,
        search_string: str | None = None,
        status: str | None = None,
        type: list[str] | None = None,
        issue_date_from: str | None = None,
        issue_date_to: str | None = None,
        num_hits_per_page: int = 20,
        page: int = 1,
        sort_by: str = "PUBLICATION_DATE_DESC",
    ) -> dict:
        """Search notices with given parameters."""
        params = {
            "searchString": search_string,
            "status": status,
            "type": type,
            "issueDateFrom": issue_date_from,
            "issueDateTo": issue_date_to,
            "numHitsPerPage": num_hits_per_page,
            "page": page,
            "sortBy": sort_by,
        }
        return self._get("/v2/search", params)

    def _download_raw(self, doffin_id: str) -> bytes:
        """Download raw notice XML."""
        return self._get(f"/v2/download/{doffin_id}")

    def _cache_path(self, doffin_id: str) -> Path | None:
        if not self.cache_dir:
            return None
        return Path(self.cache_dir) / f"{doffin_id}.json"

    def _cache_read(self, doffin_id: str) -> dict | None:
        path = self._cache_path(doffin_id)
        if path and path.exists():
            return json.loads(path.read_text())
        return None

    def _cache_write(self, doffin_id: str, data: dict) -> None:
        path = self._cache_path(doffin_id)
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2))

    @mcp_tool(description="Download and parse a Doffin eForms notice. Returns structured JSON with award criteria, qualification requirements, procedure type, and more.")
    def get_notice(self, doffin_id: str) -> dict:
        """Download, parse, and cache an eForms notice."""
        cached = self._cache_read(doffin_id)
        if cached:
            return cached
        xml_bytes = self._download_raw(doffin_id)
        notice = parse_eforms_xml(xml_bytes, doffin_id)
        result = notice.to_dict()
        self._cache_write(doffin_id, result)
        return result

    def _search_all(
        self, search_string: str, *, max_pages: int = 10
    ) -> list[dict]:
        """Search with automatic date-windowing to bypass the 1000-hit API limit.

        Doffin API caps at 1000 results per search. If we hit that limit,
        we split the time range and search each window separately.
        """
        return self._search_window(
            search_string, max_pages=max_pages,
            date_from=None, date_to=None, depth=0,
        )

    def _search_window(
        self,
        search_string: str,
        *,
        max_pages: int,
        date_from: str | None,
        date_to: str | None,
        depth: int = 0,
    ) -> list[dict]:
        """Search a single date window, splitting recursively if we hit 1000."""
        from datetime import date as Date, timedelta

        all_hits: list[dict] = []
        seen_ids: set[str] = set()
        page = 1
        while page <= max_pages:
            window_desc = f"{date_from or '...'} → {date_to or '...'}"
            log.info("Søker side %d (%s) ...", page, window_desc)
            result = self.search_notices(
                search_string=search_string,
                issue_date_from=date_from,
                issue_date_to=date_to,
                num_hits_per_page=100,
                page=page,
            )
            hits = result.get("hits") or []
            for h in hits:
                hid = h.get("id")
                if hid and hid not in seen_ids:
                    seen_ids.add(hid)
                    all_hits.append(h)
            log.info("  %d treff (totalt %d unike)", len(hits), len(all_hits))
            if len(hits) < 100:
                break
            page += 1

        # If we fetched exactly 1000, there are probably more — split the window
        if len(all_hits) >= 1000 and depth < 5:
            log.info("Treffer 1000-grensen, deler opp tidsvindu %s → %s (dybde %d)",
                     date_from or "start", date_to or "nå", depth)

            # Determine the actual date range from results
            dates = []
            for h in all_hits:
                d = h.get("publicationDate") or h.get("issueDate")
                if d:
                    dates.append(d[:10])
            if not dates:
                return all_hits  # can't split without dates

            earliest = min(dates)
            latest = max(dates)
            mid_date = Date.fromisoformat(earliest) + (
                Date.fromisoformat(latest) - Date.fromisoformat(earliest)
            ) // 2

            # Clear and search each half
            all_hits.clear()
            seen_ids.clear()

            first_half = self._search_window(
                search_string, max_pages=max_pages,
                date_from=date_from,
                date_to=mid_date.isoformat(),
                depth=depth + 1,
            )
            for h in first_half:
                hid = h.get("id")
                if hid and hid not in seen_ids:
                    seen_ids.add(hid)
                    all_hits.append(h)

            next_day = (mid_date + timedelta(days=1)).isoformat()
            second_half = self._search_window(
                search_string, max_pages=max_pages,
                date_from=next_day,
                date_to=date_to,
                depth=depth + 1,
            )
            for h in second_half:
                hid = h.get("id")
                if hid and hid not in seen_ids:
                    seen_ids.add(hid)
                    all_hits.append(h)

            log.info("Etter splitting: %d unike treff totalt", len(all_hits))

        return all_hits

    @mcp_tool(description="Search all Doffin notices for a buyer and return structured summary. Set enrich=true to parse eForms XML for award criteria and qualification requirements.")
    def analyze_buyer(self, search_string: str, enrich: bool = True, max_pages: int = 10) -> dict:
        """Search notices for a buyer, optionally enriching with eForms data."""
        all_hits = self._search_all(search_string, max_pages=max_pages)

        # Extract buyer names/orgs and filter to hits where search_string matches buyer
        search_lower = search_string.lower()
        filtered_hits = []
        for hit in all_hits:
            buyers = hit.get("buyer") or []
            buyer_match = any(
                search_lower in (b.get("name") or "").lower()
                for b in buyers
            )
            if buyer_match:
                filtered_hits.append(hit)

        log.info("Fant %d kunngjøringer (%d filtrert bort — buyer matcher ikke '%s').",
                 len(filtered_hits), len(all_hits) - len(filtered_hits), search_string)

        total = len(filtered_hits)
        notices = []
        enriched_count = 0
        cached_count = 0
        error_count = 0
        for i, hit in enumerate(filtered_hits, 1):
            buyers = hit.get("buyer") or []
            buyer_names = ", ".join(b.get("name") or "" for b in buyers)
            buyer_org_ids = ", ".join(b.get("organizationId") or "" for b in buyers)
            # Extract winners from lots (with org.nr for dedup)
            lots = hit.get("lots") or []
            winner_details: list[dict[str, str]] = []
            seen_winner_keys: set[str] = set()
            for lot in lots:
                for w in lot.get("winner") or []:
                    name = w.get("name") or ""
                    org_id = w.get("organizationId") or ""
                    key = org_id if org_id else name
                    if name and key not in seen_winner_keys:
                        seen_winner_keys.add(key)
                        winner_details.append({"name": name, "org_id": org_id})

            entry = {
                "doffin_id": hit.get("id"),
                "title": hit.get("heading"),
                "buyer_name": buyer_names,
                "buyer_org_id": buyer_org_ids,
                "winner": ", ".join(wd["name"] for wd in winner_details) if winner_details else None,
                "winner_details": winner_details if winner_details else None,
                "description": hit.get("description"),
                "type": hit.get("type"),
                "status": hit.get("status"),
                "publication_date": hit.get("publicationDate"),
                "estimated_value": hit.get("estimatedValue"),
                "cpv_codes": hit.get("cpvCodes") or [],
                "received_tenders": hit.get("receivedTenders"),
                "lots": lots,
            }
            if enrich and entry["doffin_id"]:
                was_cached = self._cache_read(entry["doffin_id"]) is not None
                try:
                    eforms = self.get_notice(entry["doffin_id"])
                    entry["award_criteria"] = eforms.get("award_criteria") or []
                    entry["selection_criteria"] = eforms.get("selection_criteria") or []
                    entry["procedure_code"] = eforms.get("procedure_code")
                    entry["contract_nature"] = eforms.get("contract_nature")
                    entry["env_criterion_code"] = eforms.get("env_criterion_code")
                    entry["env_justification"] = eforms.get("env_justification")
                    entry["framework_type"] = eforms.get("framework_type")
                    entry["framework_max_value"] = eforms.get("framework_max_value")
                    entry["submission_deadline"] = eforms.get("submission_deadline")
                    entry["duration_months"] = eforms.get("duration_months")
                    entry["framework_max_participants"] = eforms.get("framework_max_participants")
                    enriched_count += 1
                    if was_cached:
                        cached_count += 1
                except Exception:
                    entry["enrich_error"] = True
                    error_count += 1
                if i % 10 == 0 or i == total:
                    log.info("  Beriket %d/%d (%d fra cache, %d feil)", i, total, cached_count, error_count)
            notices.append(entry)

        summary = _build_summary(notices) if notices else {}

        return {
            "search_string": search_string,
            "total_notices": len(notices),
            "enriched": enrich,
            "notices": notices,
            "summary": summary,
        }


def _build_summary(notices: list[dict]) -> dict:
    """Build aggregated summary from enriched notices."""
    by_procedure: dict[str, int] = {}
    by_nature: dict[str, int] = {}
    criteria_counts = []
    env_codes: dict[str, int] = {}

    for n in notices:
        proc = n.get("procedure_code") or "unknown"
        by_procedure[proc] = by_procedure.get(proc, 0) + 1

        nature = n.get("contract_nature") or "unknown"
        by_nature[nature] = by_nature.get(nature, 0) + 1

        ac = n.get("award_criteria") or []
        if ac:
            criteria_counts.append(len(ac))

        env = n.get("env_criterion_code") or "unknown"
        env_codes[env] = env_codes.get(env, 0) + 1

    return {
        "by_procedure": by_procedure,
        "by_contract_nature": by_nature,
        "avg_award_criteria_count": (
            round(sum(criteria_counts) / len(criteria_counts), 1)
            if criteria_counts else 0
        ),
        "env_compliance": env_codes,
    }


class DoffinAPIError(Exception):
    def __init__(self, status_code: int, reason: str, body: str):
        self.status_code = status_code
        self.reason = reason
        self.body = body
        super().__init__(f"HTTP {status_code} {reason}: {body[:200]}")
