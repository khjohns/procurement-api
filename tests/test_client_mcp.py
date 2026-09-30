from app.client import ArtifikClient
from artifik_mcp.decorator import get_mcp_tools


def test_client_accepts_injected_credentials():
    client = ArtifikClient(client_id="injected-id", client_secret="injected-secret")
    assert client._get_credentials() == ("injected-id", "injected-secret")


def test_client_falls_back_to_environ(monkeypatch):
    monkeypatch.setenv("VENDOR_API_ID", "env-id")
    monkeypatch.setenv("VENDOR_API_KEY", "env-key")
    client = ArtifikClient()
    assert client._get_credentials() == ("env-id", "env-key")


def test_all_public_methods_have_mcp_tool():
    """Every public method on ArtifikClient must be decorated with @mcp_tool."""
    client = ArtifikClient.__new__(ArtifikClient)
    mcp_tool_names = {name for name, _, _ in get_mcp_tools(client)}

    public_methods = set()
    for name in dir(client):
        if name.startswith("_"):
            continue
        # Skip properties (e.g. token) to avoid triggering side effects
        if isinstance(getattr(ArtifikClient, name, None), property):
            continue
        attr = getattr(client, name)
        if callable(attr):
            public_methods.add(name)

    # Exclude non-API methods (auth internals, dataclass fields)
    non_api = {"base_url", "client_id", "client_secret", "authenticate"}
    public_methods -= non_api

    missing = public_methods - mcp_tool_names
    assert not missing, f"Methods missing @mcp_tool: {missing}"


class MockHTTPResponse:
    def __init__(
        self, data: bytes, status: int = 200, content_type: str = "application/json"
    ):
        self._data = data
        self.status = status
        self.headers = {"Content-Type": content_type}

    def read(self) -> bytes:
        return self._data

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def _make_client():
    from app.client import TokenInfo

    client = ArtifikClient(client_id="test-id", client_secret="test-secret")
    client._token = TokenInfo(
        access_token="test-access-token",
        token_type="Bearer",
        expires_at=9999999999.0,
    )
    return client


def test_authenticate_posts_to_v2_token_endpoint(monkeypatch):
    import json
    import urllib.request

    client = ArtifikClient(client_id="test-id", client_secret="test-secret")

    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        resp_body = json.dumps(
            {
                "access_token": "fresh-token-123",
                "token_type": "Bearer",
                "expires_in": 3600,
                "scope": "read write",
            }
        ).encode()
        return MockHTTPResponse(resp_body)

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    token = client.authenticate()
    assert token.access_token == "fresh-token-123"
    assert token.token_type == "Bearer"
    assert token.authorization_header == "Bearer fresh-token-123"

    assert captured_req is not None
    assert captured_req.full_url == "https://api.artifik.no/external/v2/token"
    assert captured_req.get_method() == "POST"
    assert captured_req.headers["Content-type"] == "application/json"
    body = json.loads(captured_req.data.decode())
    assert body == {
        "grant_type": "client_credentials",
        "client_id": "test-id",
        "client_secret": "test-secret",
    }


def test_get_procurement(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps({"id": 1001, "name": "Test anskaffelse"}).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    # Basic call
    res = client.get_procurement(1001)
    assert res["id"] == 1001
    assert (
        captured_req.full_url == "https://api.artifik.no/external/v2/procurements/1001"
    )
    assert captured_req.headers["Authorization"] == "Bearer test-access-token"

    # With optional params
    client.get_procurement(
        1001,
        include_team=True,
        include_internal_reporting=True,
        include_notices_info=True,
    )
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/procurements/1001"
    qs = parse_qs(parsed.query)
    assert qs["includeTeam"] == ["true"]
    assert qs["includeInternalReporting"] == ["true"]
    assert qs["includeNoticesInfo"] == ["true"]


def test_list_procurements_with_v2_params(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(json.dumps([{"id": 1}]).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    res = client.list_procurements(
        organization_id="org-42",
        include_team=True,
        include_internal_reporting=True,
        include_custom_fields=True,
        include_sub_orgs=True,
    )
    assert len(res) == 1
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/procurements"
    qs = parse_qs(parsed.query)
    assert qs["organizationId"] == ["org-42"]
    assert qs["includeTeam"] == ["true"]
    assert qs["includeInternalReporting"] == ["true"]
    assert qs["includeCustomFields"] == ["true"]
    assert qs["includeSubOrgs"] == ["true"]


def test_contracts_v2_endpoints(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps({"id": 501, "name": "Kontrakt 501"}).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    # get_contract
    client.get_contract(501, include_team=True, include_internal_reporting=True)
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/contracts/501"
    qs = parse_qs(parsed.query)
    assert qs["includeTeam"] == ["true"]
    assert qs["includeInternalReporting"] == ["true"]

    # list_contracts
    client.list_contracts(
        organization_id="org-500",
        include_team=True,
        include_internal_reporting=True,
        include_sub_orgs=True,
    )
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/contracts"
    qs = parse_qs(parsed.query)
    assert qs["organizationId"] == ["org-500"]
    assert qs["includeTeam"] == ["true"]
    assert qs["includeInternalReporting"] == ["true"]
    assert qs["includeSubOrgs"] == ["true"]

    # get_contracts alias
    client.get_contracts(organization_id="org-500", include_team=True)
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/contracts"
    qs = parse_qs(parsed.query)
    assert qs["organizationId"] == ["org-500"]
    assert qs["includeTeam"] == ["true"]


def test_get_contract_upload_url(monkeypatch):
    import json
    import urllib.request

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps(
                {"url": "https://storage.googleapis.com/upload-123", "key": "k123"}
            ).encode(),
            status=201,
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    res = client.get_contract_upload_url(
        501, file_name="vedlegg.pdf", file_type="application/pdf"
    )
    assert res["key"] == "k123"
    assert (
        captured_req.full_url
        == "https://api.artifik.no/external/v2/contracts/501/upload-url"
    )
    assert captured_req.get_method() == "POST"
    assert captured_req.headers["Content-type"] == "application/json"
    body = json.loads(captured_req.data.decode())
    assert body["fileName"] == "vedlegg.pdf"
    assert body["fileType"] == "application/pdf"


def test_deviations_v2_endpoints(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps({"deviations": [], "totalCount": 0}).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    # get_deviations
    res = client.get_deviations(
        contract_id=88,
        organization_id="org-1",
        page=2,
        page_size=25,
        severity="high",
        status="resolved",
        supplier_org_number="123456789",
        include_sub_orgs=True,
    )
    assert res["totalCount"] == 0
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/deviations"
    qs = parse_qs(parsed.query)
    assert qs["contractId"] == ["88"]
    assert qs["organizationId"] == ["org-1"]
    assert qs["page"] == ["2"]
    assert qs["pageSize"] == ["25"]
    assert qs["severity"] == ["high"]
    assert qs["status"] == ["resolved"]
    assert qs["supplierOrgNumber"] == ["123456789"]
    assert qs["includeSubOrgs"] == ["true"]

    # list_deviations alias
    client.list_deviations(contract_id=88, page=1)
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/deviations"
    qs = parse_qs(parsed.query)
    assert qs["contractId"] == ["88"]
    assert qs["page"] == ["1"]


def test_other_v2_endpoints(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import urlparse

    client = _make_client()
    captured_urls = []

    def mock_urlopen(req, context=None):
        captured_urls.append(req.full_url)
        return MockHTTPResponse(json.dumps([]).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    client.get_procurement_activities(123)
    client.get_smart_doc_responses(123)
    client.download_archive_zip(123)
    client.list_organizations()
    client.get_organization_activities()
    client.list_webhooks()
    client.register_webhook("https://callback.com", ["ACTION_1"])
    client.delete_webhook(99)
    client.get_tasks()

    for url in captured_urls:
        parsed = urlparse(url)
        assert parsed.path.startswith("/external/v2/"), (
            f"Path {parsed.path} does not use /external/v2/"
        )
