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

    client.get_contracts(organization_id="org-500", include_team=True)
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/contracts"
    qs = parse_qs(parsed.query)
    assert qs["organizationId"] == ["org-500"]
    assert qs["includeTeam"] == ["true"]


def test_versioned_read_requests_and_whoami(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    requests = []

    def mock_urlopen(req, context=None):
        requests.append(req)
        return MockHTTPResponse(json.dumps({"id": 501, "durationStart": "2026-01-01"}).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    assert client.whoami()["id"] == 501
    assert urlparse(requests[-1].full_url).path == "/external/v3/whoami"
    assert requests[-1].get_method() == "GET"

    assert client.list_contracts(
        organization_id="org-1", api_version=3,
        include_team=True, include_internal_reporting=True,
    )["durationStart"] == "2026-01-01"
    parsed = urlparse(requests[-1].full_url)
    assert parsed.path == "/external/v3/contracts"
    assert parse_qs(parsed.query) == {
        "organizationId": ["org-1"], "includeTeam": ["true"],
        "includeInternalReporting": ["true"],
    }
    assert client.get_contract(501, api_version=3)["durationStart"] == "2026-01-01"
    assert urlparse(requests[-1].full_url).path == "/external/v3/contracts/501"
    client.get_contracts(api_version=3)
    assert urlparse(requests[-1].full_url).path == "/external/v3/contracts"
    client.list_procurements(api_version=3, include_team=True)
    assert urlparse(requests[-1].full_url).path == "/external/v3/procurements"
    client.get_procurement(42, api_version=3)
    assert urlparse(requests[-1].full_url).path == "/external/v3/procurements/42"
    try:
        client.list_contracts(api_version=4)
    except ValueError:
        pass
    else:
        raise AssertionError("Unsupported API version was accepted")
    assert requests[-1].full_url.endswith("/external/v3/procurements/42")


def test_contract_response_variants_are_returned_without_losing_values(monkeypatch):
    import json
    import urllib.request

    client = _make_client()

    def mock_urlopen(req, context=None):
        if "/v3/" in req.full_url:
            body = {
                "id": 501, "durationStart": "2026-01-01", "durationEnd": None,
                "children": [{"durationStart": "2026-02-01", "value": 0}],
                "team": [], "internalReporting": [
                    {"nodeId": "flag", "value": False, "valueText": "Nei"},
                ],
            }
        else:
            body = {
                "id": 501, "duration_start": "2026-01-01", "duration_end": None,
                "children": [{"duration_start": "2026-02-01", "value": 0}],
            }
        return MockHTTPResponse(json.dumps(body).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    v2 = client.get_contract(501)
    v3 = client.get_contract(501, api_version=3, include_team=True, include_internal_reporting=True)
    assert v2["duration_start"] == v3["durationStart"]
    assert v2["children"][0]["value"] == v3["children"][0]["value"] == 0
    assert v3["durationEnd"] is None
    assert v3["internalReporting"][0]["value"] is False


def test_organization_members_use_read_endpoint(monkeypatch):
    import json
    import urllib.request

    client = _make_client()
    requests = []

    def mock_urlopen(req, context=None):
        requests.append(req)
        return MockHTTPResponse(json.dumps([]).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    assert client.list_organization_members("org / one") == []
    assert requests[-1].full_url == "https://api.artifik.no/external/v2/org%20%2F%20one/members"
    assert requests[-1].get_method() == "GET"
    client.list_organization_members("org / one", include_sub_orgs=True)
    assert requests[-1].full_url.endswith("/external/v2/org%20%2F%20one/members?includeSubOrgs=1")


def test_template_organization_path_is_quoted(monkeypatch):
    import json
    import urllib.request

    client = _make_client()
    requests = []

    def mock_urlopen(req, context=None):
        requests.append(req)
        return MockHTTPResponse(json.dumps({"columns": [], "rows": [], "totalPages": 0}).encode())

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    client.list_templates("org / one")
    client.get_contract_internal_reporting_template("org / one")
    client.get_template_responses("org / one", 412, entity_type="contract", page=2, page_size=50)
    assert [req.full_url.split("?")[0] for req in requests] == [
        "https://api.artifik.no/external/v2/organization/org%20%2F%20one/templates",
        "https://api.artifik.no/external/v2/organization/org%20%2F%20one/contract-internal-reporting/template",
        "https://api.artifik.no/external/v2/organization/org%20%2F%20one/templates/412/responses",
    ]
    assert "entityType=contract" in requests[-1].full_url
    assert "page=2" in requests[-1].full_url
    assert "pageSize=50" in requests[-1].full_url


def test_internal_reporting_keeps_false_zero_and_null():
    from app.client import parse_internal_reporting

    rows = [
        {"nodeId": "false", "value": False, "valueText": "Nei"},
        {"nodeId": "zero", "value": 0, "valueText": "0"},
        {"nodeId": "null", "value": None},
    ]
    assert parse_internal_reporting(rows) == {"false": False, "zero": 0, "null": None}
    assert parse_internal_reporting(rows, use_text=True) == {"false": "Nei", "zero": "0", "null": None}


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


def test_list_templates(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps([{"id": 412, "name": "Standard mal"}]).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    res = client.list_templates(organization_id="org-123")
    assert len(res) == 1
    assert res[0]["id"] == 412
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/organization/org-123/templates"
    assert captured_req.headers["Authorization"] == "Bearer test-access-token"


def test_get_contract_internal_reporting_template(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps({"templateId": 100, "fields": [{"key": "f1"}]}).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    res = client.get_contract_internal_reporting_template(organization_id="org-123")
    assert res["templateId"] == 100
    parsed = urlparse(captured_req.full_url)
    assert (
        parsed.path
        == "/external/v2/organization/org-123/contract-internal-reporting/template"
    )
    assert captured_req.headers["Authorization"] == "Bearer test-access-token"


def test_get_template_responses(monkeypatch):
    import json
    import urllib.request
    from urllib.parse import parse_qs, urlparse

    client = _make_client()
    captured_req = None

    def mock_urlopen(req, context=None):
        nonlocal captured_req
        captured_req = req
        return MockHTTPResponse(
            json.dumps(
                {
                    "templateId": 412,
                    "columns": [
                        {"key": "n_1", "nodeId": "node-1", "prompt": "Avtaleeier"}
                    ],
                    "rows": [{"entityType": "contract", "n_1": "VAV"}],
                    "page": 2,
                    "pageSize": 50,
                    "totalCount": 100,
                    "totalPages": 2,
                }
            ).encode()
        )

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    # Basic call
    res = client.get_template_responses("org-99", 412)
    assert res["templateId"] == 412
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/organization/org-99/templates/412/responses"
    assert parsed.query == ""

    # Call with all parameters
    res2 = client.get_template_responses(
        organization_id="org-99",
        template_id=412,
        entity_type="contract",
        include_sub_orgs=True,
        page=2,
        page_size=50,
    )
    assert res2["totalCount"] == 100
    parsed = urlparse(captured_req.full_url)
    assert parsed.path == "/external/v2/organization/org-99/templates/412/responses"
    qs = parse_qs(parsed.query)
    assert qs["entityType"] == ["contract"]
    assert qs["includeSubOrgs"] == ["true"]
    assert qs["page"] == ["2"]
    assert qs["pageSize"] == ["50"]


def test_parse_internal_reporting():
    from app.client import parse_internal_reporting

    client = _make_client()
    sample_data = [
        {
            "nodeId": "1651f436-uuid1",
            "prompt": "Avtaleeier",
            "type": "input",
            "value": "Vann- og avløpsetaten",
            "valueText": "Vann- og avløpsetaten",
        },
        {
            "nodeId": "9c2ab710-uuid2",
            "prompt": "Kategori",
            "type": "checkbox",
            "value": ["Drift", "Vedlikehold"],
            "valueText": "Drift, Vedlikehold",
        },
        {
            "nodeId": "empty-uuid3",
            "prompt": "Ubesvart felt",
            "type": "input",
            "value": None,
            "valueText": None,
        },
        {
            "nodeId": "text-fallback-uuid4",
            "prompt": "Kun verdi",
            "type": "number",
            "value": 42,
        },
    ]

    # 1. Default: by="nodeId", use_text=False (preserves native value types)
    parsed_default = parse_internal_reporting(sample_data)
    assert parsed_default == {
        "1651f436-uuid1": "Vann- og avløpsetaten",
        "9c2ab710-uuid2": ["Drift", "Vedlikehold"],
        "empty-uuid3": None,
        "text-fallback-uuid4": 42,
    }

    # 2. by="prompt"
    parsed_prompt = parse_internal_reporting(sample_data, by="prompt")
    assert parsed_prompt == {
        "Avtaleeier": "Vann- og avløpsetaten",
        "Kategori": ["Drift", "Vedlikehold"],
        "Ubesvart felt": None,
        "Kun verdi": 42,
    }

    # 3. use_text=True (uses formatted valueText, falls back to value)
    parsed_text = parse_internal_reporting(sample_data, use_text=True)
    assert parsed_text == {
        "1651f436-uuid1": "Vann- og avløpsetaten",
        "9c2ab710-uuid2": "Drift, Vedlikehold",
        "empty-uuid3": None,
        "text-fallback-uuid4": 42,
    }

    # 4. Method call on ArtifikClient behaves identically
    client_res = client.parse_internal_reporting(
        sample_data, by="prompt", use_text=True
    )
    assert client_res == {
        "Avtaleeier": "Vann- og avløpsetaten",
        "Kategori": "Drift, Vedlikehold",
        "Ubesvart felt": None,
        "Kun verdi": 42,
    }

    # 5. Edge cases: None, empty list, malformed items
    assert parse_internal_reporting(None) == {}
    assert parse_internal_reporting([]) == {}
    assert parse_internal_reporting(["invalid", {"no_target_key": 1}]) == {}
