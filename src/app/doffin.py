"""Doffin Public API client."""

from __future__ import annotations

import json
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
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("DOFFIN_API_KEY environment variable not set and no API key provided to client.")
            
        req.add_header("Ocp-Apim-Subscription-Key", api_key)

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
            raise DoffinAPIError(e.code, e.reason, error_body) from e

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
        num_hits_per_page: int = 20,
        page: int = 1,
        sort_by: str = "PUBLICATION_DATE_DESC",
    ) -> dict:
        """Search notices with given parameters."""
        params = {
            "searchString": search_string,
            "status": status,
            "type": type,
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


class DoffinAPIError(Exception):
    def __init__(self, status_code: int, reason: str, body: str):
        self.status_code = status_code
        self.reason = reason
        self.body = body
        super().__init__(f"HTTP {status_code} {reason}: {body[:200]}")
