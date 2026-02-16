"""Artifik External API client with OAuth2 client credentials flow."""

from __future__ import annotations

import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any

import certifi

BASE_URL = "https://api.artifik.no"
TOKEN_MARGIN_SECONDS = 60


@dataclass
class TokenInfo:
    access_token: str
    token_type: str
    expires_at: float
    scope: str = ""

    @property
    def is_expired(self) -> bool:
        return time.time() >= self.expires_at - TOKEN_MARGIN_SECONDS

    @property
    def authorization_header(self) -> str:
        return f"{self.token_type} {self.access_token}"


@dataclass
class ArtifikClient:
    """Client for the Artifik External API.

    Reads credentials from environment variables:
        VENDOR_API_ID  — OAuth2 client_id
        VENDOR_API_KEY — OAuth2 client_secret
    """

    base_url: str = BASE_URL
    _token: TokenInfo | None = field(default=None, repr=False)
    _ssl_ctx: ssl.SSLContext = field(default_factory=lambda: ssl.create_default_context(cafile=certifi.where()), repr=False)

    # -- Auth --------------------------------------------------------

    def _get_credentials(self) -> tuple[str, str]:
        return os.environ["VENDOR_API_ID"], os.environ["VENDOR_API_KEY"]

    def authenticate(self) -> TokenInfo:
        """Obtain a fresh OAuth2 access token."""
        client_id, client_secret = self._get_credentials()

        data = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }).encode()

        req = urllib.request.Request(
            f"{self.base_url}/external/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        resp_data = self._do_request(req, auth=False)

        self._token = TokenInfo(
            access_token=resp_data["access_token"],
            token_type=resp_data.get("token_type", "Bearer"),
            expires_at=time.time() + resp_data.get("expires_in", 3600),
            scope=resp_data.get("scope", ""),
        )
        return self._token

    @property
    def token(self) -> TokenInfo:
        if self._token is None or self._token.is_expired:
            self.authenticate()
        assert self._token is not None
        return self._token

    # -- HTTP helpers ------------------------------------------------

    def _do_request(
        self,
        req: urllib.request.Request,
        *,
        auth: bool = True,
    ) -> Any:
        if auth:
            req.add_header("Authorization", self.token.authorization_header)

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
            raise ArtifikAPIError(e.code, e.reason, error_body) from e

    def _get(self, path: str, params: dict[str, str | None] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered)
        req = urllib.request.Request(url)
        return self._do_request(req)

    def _post(self, path: str, body: dict | None = None, params: dict[str, str | None] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered)
        data = json.dumps(body or {}).encode()
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        return self._do_request(req)

    def _delete(self, path: str) -> Any:
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            method="DELETE",
        )
        return self._do_request(req)

    # -- Procurements ------------------------------------------------

    def list_procurements(self, *, organization_id: str | None = None) -> list[dict]:
        return self._get("/external/procurements", {"organizationId": organization_id})

    def get_procurement_activities(self, procurement_id: int) -> list[dict]:
        return self._get(f"/external/{procurement_id}/activities")

    def get_smart_doc_responses(self, procurement_id: int) -> Any:
        return self._get(f"/external/{procurement_id}/smartDocResponses")

    def download_archive_zip(self, procurement_id: int) -> bytes:
        return self._get(f"/external/{procurement_id}/archiveZip")

    # -- Contracts ---------------------------------------------------

    def list_contracts(
        self,
        *,
        organization_id: str | None = None,
        include_custom_fields: bool = False,
        limit_date: str | None = None,
    ) -> list[dict]:
        return self._get("/external/contracts", {
            "organizationId": organization_id,
            "includeCustomFields": "1" if include_custom_fields else None,
            "limitDate": limit_date,
        })

    def get_contract(self, contract_id: int) -> dict:
        return self._get(f"/external/contracts/{contract_id}")

    # -- Organizations -----------------------------------------------

    def list_organizations(self, *, include_sub_orgs: bool = False, parent_id: str | None = None) -> list[dict]:
        return self._get("/external/organizations", {
            "includeSubOrgs": "1" if include_sub_orgs else None,
            "parentId": parent_id,
        })

    # -- Activities --------------------------------------------------

    def get_organization_activities(
        self,
        *,
        organization_id: str | None = None,
        limit_date: str | None = None,
    ) -> list[dict]:
        return self._get("/external/activities", {
            "organizationId": organization_id,
            "limitDate": limit_date,
        })

    # -- Webhooks ----------------------------------------------------

    def list_webhooks(self, *, organization_id: str | None = None) -> list[dict]:
        return self._get("/external/webhooks", {"organizationId": organization_id})

    def register_webhook(
        self,
        callback_url: str,
        action_list: list[str],
        *,
        organization_id: str | None = None,
    ) -> dict:
        return self._post(
            "/external/webhooks",
            body={"callbackURL": callback_url, "actionList": action_list},
            params={"organizationId": organization_id},
        )

    def delete_webhook(self, webhook_id: int) -> Any:
        return self._delete(f"/external/webhooks/{webhook_id}")

    # -- Tasks -------------------------------------------------------

    def get_tasks(
        self,
        *,
        organization_id: str | None = None,
        user_id: str | None = None,
        status: str | None = None,
        task_type: str | None = None,
    ) -> list[dict]:
        return self._get("/external/tasks", {
            "organizationId": organization_id,
            "userId": user_id,
            "status": status,
            "type": task_type,
        })


class ArtifikAPIError(Exception):
    def __init__(self, status_code: int, reason: str, body: str):
        self.status_code = status_code
        self.reason = reason
        self.body = body
        super().__init__(f"HTTP {status_code} {reason}: {body[:200]}")
