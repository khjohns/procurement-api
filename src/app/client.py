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

from artifik_mcp.decorator import mcp_tool

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

    Credentials can be injected directly or read from environment variables:
        VENDOR_API_ID  — OAuth2 client_id
        VENDOR_API_KEY — OAuth2 client_secret
    """

    base_url: str = BASE_URL
    client_id: str | None = field(default=None, repr=False)
    client_secret: str | None = field(default=None, repr=False)
    _token: TokenInfo | None = field(default=None, repr=False)
    _ssl_ctx: ssl.SSLContext = field(
        default_factory=lambda: ssl.create_default_context(cafile=certifi.where()),
        repr=False,
    )

    # -- Auth --------------------------------------------------------

    def _get_credentials(self) -> tuple[str, str]:
        if self.client_id and self.client_secret:
            return self.client_id, self.client_secret
        return os.environ["VENDOR_API_ID"], os.environ["VENDOR_API_KEY"]

    def authenticate(self) -> TokenInfo:
        """Obtain a fresh OAuth2 access token."""
        client_id, client_secret = self._get_credentials()

        # Live API 01.10.2026 godtar form-data her, selv om OpenAPI angir JSON.
        data = urllib.parse.urlencode(
            {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }
        ).encode()

        req = urllib.request.Request(
            f"{self.base_url}/external/v2/token",
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

    @staticmethod
    def _versioned_path(path: str, api_version: int) -> str:
        if api_version not in (2, 3):
            raise ValueError("api_version må være 2 eller 3")
        return f"/external/v{api_version}/{path}"

    @mcp_tool(description="Get the current API access context.")
    def whoami(self) -> dict:
        return self._get("/external/v3/whoami")

    def _post(
        self,
        path: str,
        body: dict | None = None,
        params: dict[str, str | None] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered)
        data = json.dumps(body or {}).encode()
        req = urllib.request.Request(
            url,
            data=data,
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

    @mcp_tool(
        description="List all procurements. Filter by organization, or include team, internal reporting, custom fields, and sub-organizations."
    )
    def list_procurements(
        self,
        *,
        organization_id: str | None = None,
        include_team: bool = False,
        include_internal_reporting: bool = False,
        include_custom_fields: bool = False,
        include_sub_orgs: bool = False,
        api_version: int = 2,
    ) -> list[dict]:
        return self._get(
            self._versioned_path("procurements", api_version),
            {
                "organizationId": organization_id,
                "includeTeam": "true" if include_team else None,
                "includeInternalReporting": (
                    "true" if include_internal_reporting else None
                ),
                "includeCustomFields": "true" if include_custom_fields else None,
                "includeSubOrgs": "true" if include_sub_orgs else None,
            },
        )

    @mcp_tool(
        description="Get a single procurement by ID. Optionally include team, internal reporting, or notices info."
    )
    def get_procurement(
        self,
        procurement_id: int,
        *,
        include_team: bool = False,
        include_internal_reporting: bool = False,
        include_notices_info: bool = False,
        api_version: int = 2,
    ) -> dict:
        return self._get(
            self._versioned_path(f"procurements/{procurement_id}", api_version),
            {
                "includeTeam": "true" if include_team else None,
                "includeInternalReporting": (
                    "true" if include_internal_reporting else None
                ),
                "includeNoticesInfo": "true" if include_notices_info else None,
            },
        )

    @mcp_tool(
        description="Get activity log for a procurement — submissions, openings, qualifications, awards."
    )
    def get_procurement_activities(self, procurement_id: int) -> list[dict]:
        return self._get(f"/external/v2/{procurement_id}/activities")

    @mcp_tool(
        description="Get structured document responses (qualification criteria, award criteria, contract terms)."
    )
    def get_smart_doc_responses(self, procurement_id: int) -> Any:
        return self._get(f"/external/v2/{procurement_id}/smartDocResponses")

    @mcp_tool(
        description="Download all procurement documents as a ZIP archive. Returns raw bytes."
    )
    def download_archive_zip(self, procurement_id: int) -> bytes:
        return self._get(f"/external/v2/{procurement_id}/archiveZip")

    # -- Contracts ---------------------------------------------------

    @mcp_tool(
        description="List contracts. Filter by organization, date, or include team, internal reporting, custom fields, and sub-organizations."
    )
    def list_contracts(
        self,
        *,
        organization_id: str | None = None,
        include_custom_fields: bool = False,
        limit_date: str | None = None,
        include_team: bool = False,
        include_internal_reporting: bool = False,
        include_sub_orgs: bool = False,
        api_version: int = 2,
    ) -> list[dict]:
        return self._get(
            self._versioned_path("contracts", api_version),
            {
                "organizationId": organization_id,
                "includeCustomFields": "true" if include_custom_fields else None,
                "limitDate": limit_date,
                "includeTeam": "true" if include_team else None,
                "includeInternalReporting": (
                    "true" if include_internal_reporting else None
                ),
                "includeSubOrgs": "true" if include_sub_orgs else None,
            },
        )

    @mcp_tool(
        description="List contracts (alias for list_contracts). Filter by organization, date, or include team, internal reporting, custom fields, and sub-organizations."
    )
    def get_contracts(
        self,
        *,
        organization_id: str | None = None,
        include_custom_fields: bool = False,
        limit_date: str | None = None,
        include_team: bool = False,
        include_internal_reporting: bool = False,
        include_sub_orgs: bool = False,
        api_version: int = 2,
    ) -> list[dict]:
        return self.list_contracts(
            organization_id=organization_id,
            include_custom_fields=include_custom_fields,
            limit_date=limit_date,
            include_team=include_team,
            include_internal_reporting=include_internal_reporting,
            include_sub_orgs=include_sub_orgs,
            api_version=api_version,
        )

    @mcp_tool(
        description="Get details for a specific contract. Optionally include team and internal reporting."
    )
    def get_contract(
        self,
        contract_id: int,
        *,
        include_team: bool = False,
        include_internal_reporting: bool = False,
        api_version: int = 2,
    ) -> dict:
        return self._get(
            self._versioned_path(f"contracts/{contract_id}", api_version),
            {
                "includeTeam": "true" if include_team else None,
                "includeInternalReporting": (
                    "true" if include_internal_reporting else None
                ),
            },
        )

    @mcp_tool(description="Get a presigned upload URL for a large contract file.")
    def get_contract_upload_url(
        self,
        contract_id: int,
        file_name: str,
        file_type: str = "",
    ) -> dict:
        body: dict[str, Any] = {"fileName": file_name}
        if file_type:
            body["fileType"] = file_type
        return self._post(
            f"/external/v2/contracts/{contract_id}/upload-url",
            body=body,
        )

    # -- Deviations (KAV) --------------------------------------------

    @mcp_tool(
        description="List contract deviations (KAV avvik). Filter by organization, contract, status, severity, page."
    )
    def get_deviations(
        self,
        *,
        organization_id: str | None = None,
        contract_id: int | None = None,
        page: int | None = None,
        page_size: int | None = None,
        severity: str | None = None,
        status: str | None = None,
        supplier_org_number: str | None = None,
        include_sub_orgs: bool = False,
    ) -> dict:
        return self._get(
            "/external/v2/deviations",
            {
                "page": str(page) if page is not None else None,
                "pageSize": str(page_size) if page_size is not None else None,
                "organizationId": organization_id,
                "contractId": str(contract_id) if contract_id is not None else None,
                "severity": severity,
                "status": status,
                "supplierOrgNumber": supplier_org_number,
                "includeSubOrgs": "true" if include_sub_orgs else None,
            },
        )

    @mcp_tool(
        description="List contract deviations (KAV avvik). Alias for get_deviations."
    )
    def list_deviations(
        self,
        *,
        organization_id: str | None = None,
        contract_id: int | None = None,
        page: int | None = None,
        page_size: int | None = None,
        severity: str | None = None,
        status: str | None = None,
        supplier_org_number: str | None = None,
        include_sub_orgs: bool = False,
    ) -> dict:
        return self.get_deviations(
            organization_id=organization_id,
            contract_id=contract_id,
            page=page,
            page_size=page_size,
            severity=severity,
            status=status,
            supplier_org_number=supplier_org_number,
            include_sub_orgs=include_sub_orgs,
        )

    # -- Organizations -----------------------------------------------

    @mcp_tool(description="List organizations. Optionally include sub-organizations.")
    def list_organizations(
        self, *, include_sub_orgs: bool = False, parent_id: str | None = None
    ) -> list[dict]:
        return self._get(
            "/external/v2/organizations",
            {
                "includeSubOrgs": "true" if include_sub_orgs else None,
                "parentId": parent_id,
            },
        )

    @mcp_tool(description="List members of an organization.")
    def list_organization_members(
        self, organization_id: str, *, include_sub_orgs: bool = False
    ) -> list[dict]:
        return self._get(
            f"/external/v2/{urllib.parse.quote(organization_id, safe='')}/members",
            {"includeSubOrgs": "1" if include_sub_orgs else None},
        )

    # -- Activities --------------------------------------------------

    @mcp_tool(
        description="Get organization-level activity log. Optionally filter by organization or date."
    )
    def get_organization_activities(
        self,
        *,
        organization_id: str | None = None,
        limit_date: str | None = None,
    ) -> list[dict]:
        return self._get(
            "/external/v2/activities",
            {
                "organizationId": organization_id,
                "limitDate": limit_date,
            },
        )

    # -- Webhooks ----------------------------------------------------

    @mcp_tool(description="List registered webhooks.")
    def list_webhooks(self, *, organization_id: str | None = None) -> list[dict]:
        return self._get("/external/v2/webhooks", {"organizationId": organization_id})

    @mcp_tool(description="Register a webhook for specified actions.")
    def register_webhook(
        self,
        callback_url: str,
        action_list: list[str],
        *,
        organization_id: str | None = None,
    ) -> dict:
        return self._post(
            "/external/v2/webhooks",
            body={"callbackURL": callback_url, "actionList": action_list},
            params={"organizationId": organization_id},
        )

    @mcp_tool(description="Delete a registered webhook.")
    def delete_webhook(self, webhook_id: int) -> Any:
        return self._delete(f"/external/v2/webhooks/{webhook_id}")

    # -- Tasks -------------------------------------------------------

    @mcp_tool(description="Get tasks. Filter by organization, user, status, or type.")
    def get_tasks(
        self,
        *,
        organization_id: str | None = None,
        user_id: str | None = None,
        status: str | None = None,
        task_type: str | None = None,
    ) -> list[dict]:
        return self._get(
            "/external/v2/tasks",
            {
                "organizationId": organization_id,
                "userId": user_id,
                "status": status,
                "type": task_type,
            },
        )

    # -- Templates & Internal Reporting ---------------------------

    @mcp_tool(
        description="List published procurement templates available to an organization."
    )
    def list_templates(self, organization_id: str) -> list[dict]:
        organization_path = urllib.parse.quote(organization_id, safe="")
        return self._get(f"/external/v2/organization/{organization_path}/templates")

    @mcp_tool(
        description="Get active contract internal-reporting template fields for an organization."
    )
    def get_contract_internal_reporting_template(self, organization_id: str) -> dict:
        organization_path = urllib.parse.quote(organization_id, safe="")
        return self._get(
            f"/external/v2/organization/{organization_path}/contract-internal-reporting/template"
        )

    @mcp_tool(
        description="Get one page of responses to a smart-doc template as a rectangular table (columns and rows)."
    )
    def get_template_responses(
        self,
        organization_id: str,
        template_id: int,
        *,
        entity_type: str | None = None,
        include_sub_orgs: bool = False,
        page: int | None = None,
        page_size: int | None = None,
        api_version: int = 2,
    ) -> dict:
        organization_path = urllib.parse.quote(organization_id, safe="")
        return self._get(
            self._versioned_path(
                f"organization/{organization_path}/templates/{template_id}/responses",
                api_version,
            ),
            {
                "page": str(page) if page is not None else None,
                "pageSize": str(page_size) if page_size is not None else None,
                "entityType": entity_type,
                "includeSubOrgs": "true" if include_sub_orgs else None,
            },
        )

    @mcp_tool(
        description="Parse an internalReporting list into a key-value dictionary keyed by nodeId or prompt."
    )
    def parse_internal_reporting(
        self,
        reporting_list: list[dict],
        by: str = "nodeId",
        use_text: bool = False,
    ) -> dict[str, Any]:
        return parse_internal_reporting(reporting_list, by=by, use_text=use_text)


def parse_internal_reporting(
    reporting_list: list[dict] | None,
    by: str = "nodeId",
    use_text: bool = False,
) -> dict[str, Any]:
    """Parse an internalReporting list into a key-value dictionary.

    Args:
        reporting_list: List of internal reporting answer dicts, each typically
            containing 'nodeId', 'prompt', 'type', 'value', and 'valueText'.
        by: Key to use in output dict ('nodeId' for stable UUID, 'prompt' for human-readable label).
        use_text: If True, uses 'valueText' (rendered string) instead of raw 'value'.

    Returns:
        Dictionary mapping the chosen key to value.
    """
    if not reporting_list:
        return {}
    result: dict[str, Any] = {}
    for item in reporting_list:
        if not isinstance(item, dict):
            continue
        key = item.get(by)
        if key is None:
            continue
        if use_text:
            val = item.get("valueText")
            if val is None:
                val = item.get("value")
        else:
            val = item.get("value")
        result[key] = val
    return result


class ArtifikAPIError(Exception):
    def __init__(self, status_code: int, reason: str, body: str):
        self.status_code = status_code
        self.reason = reason
        self.body = body
        super().__init__(f"HTTP {status_code} {reason}: {body[:200]}")
