from unittest.mock import patch

from artifik_mcp.server import MCPServer


def test_server_registers_all_tools():
    """Server should have one tool per @mcp_tool-decorated client method."""
    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    tool_names = {t["name"] for t in server.tools}

    # Artifik client tools
    expected_artifik = {
        "list_procurements",
        "get_procurement",
        "get_procurement_activities",
        "get_smart_doc_responses",
        "download_archive_zip",
        "list_contracts",
        "get_contracts",
        "get_contract",
        "get_contract_upload_url",
        "list_deviations",
        "get_deviations",
        "list_organizations",
        "get_organization_activities",
        "list_webhooks",
        "register_webhook",
        "delete_webhook",
        "get_tasks",
        "list_templates",
        "get_contract_internal_reporting_template",
        "get_template_responses",
        "parse_internal_reporting",
    }

    # Doffin client tools
    expected_doffin = {
        "search_notices",
        "get_notice",
        "analyze_buyer",
    }

    expected = expected_artifik | expected_doffin
    assert tool_names == expected, (
        f"Missing: {expected - tool_names}, Extra: {tool_names - expected}"
    )


def test_server_handles_ping():
    """Server should respond to ping."""
    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    response = server.handle_request({"jsonrpc": "2.0", "id": 1, "method": "ping"})
    assert response["id"] == 1
    assert "result" in response


def test_server_handles_tools_list():
    """Server should return tool definitions."""
    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    response = server.handle_request(
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
    )
    assert response["id"] == 2
    tools = response["result"]["tools"]
    assert len(tools) > 0
    assert all("name" in t and "description" in t for t in tools)
    tool_names = {t["name"] for t in tools}
    assert "get_procurement" in tool_names
    assert "get_deviations" in tool_names
    assert "get_contract_upload_url" in tool_names


def test_server_handles_tools_call():
    """Server should execute tool calls and return JSON formatted text."""
    from unittest.mock import MagicMock

    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    mock_func = MagicMock(return_value={"id": 123, "name": "Test"})
    server._tool_methods["get_procurement"] = mock_func

    response = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "get_procurement", "arguments": {"procurement_id": 123}},
        }
    )
    assert response["id"] == 3
    mock_func.assert_called_once_with(procurement_id=123)
    assert "result" in response
    assert response["result"]["content"][0]["type"] == "text"
    import json

    data = json.loads(response["result"]["content"][0]["text"])
    assert data["id"] == 123


def test_server_templates_tools_schema():
    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    tools_by_name = {t["name"]: t for t in server.tools}

    # list_templates
    lt = tools_by_name["list_templates"]
    assert lt["inputSchema"]["required"] == ["organization_id"]
    assert lt["inputSchema"]["properties"]["organization_id"]["type"] == "string"

    # get_contract_internal_reporting_template
    crt = tools_by_name["get_contract_internal_reporting_template"]
    assert crt["inputSchema"]["required"] == ["organization_id"]
    assert crt["inputSchema"]["properties"]["organization_id"]["type"] == "string"

    # get_template_responses
    gtr = tools_by_name["get_template_responses"]
    assert set(gtr["inputSchema"]["required"]) == {"organization_id", "template_id"}
    props = gtr["inputSchema"]["properties"]
    assert props["organization_id"]["type"] == "string"
    assert props["template_id"]["type"] == "integer"
    assert props["page"]["type"] == "integer"
    assert props["page_size"]["type"] == "integer"
    assert props["include_sub_orgs"]["type"] == "boolean"

    # parse_internal_reporting
    pir = tools_by_name["parse_internal_reporting"]
    assert pir["inputSchema"]["required"] == ["reporting_list"]
    pir_props = pir["inputSchema"]["properties"]
    assert pir_props["reporting_list"]["type"] == "array"
    assert pir_props["by"]["type"] == "string"
    assert pir_props["use_text"]["type"] == "boolean"


def test_server_handles_template_tools_calls():
    from unittest.mock import MagicMock
    import json

    with patch.dict(
        "os.environ",
        {"VENDOR_API_ID": "fake", "VENDOR_API_KEY": "fake", "DOFFIN_API_KEY": "fake"},
    ):
        server = MCPServer()

    # list_templates call
    mock_lt = MagicMock(return_value=[{"id": 1, "name": "Mal 1"}])
    server._tool_methods["list_templates"] = mock_lt
    resp = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 10,
            "method": "tools/call",
            "params": {
                "name": "list_templates",
                "arguments": {"organization_id": "org-1"},
            },
        }
    )
    assert resp["id"] == 10
    mock_lt.assert_called_once_with(organization_id="org-1")
    assert json.loads(resp["result"]["content"][0]["text"]) == [
        {"id": 1, "name": "Mal 1"}
    ]

    # get_contract_internal_reporting_template call
    mock_crt = MagicMock(return_value={"templateId": 10})
    server._tool_methods["get_contract_internal_reporting_template"] = mock_crt
    resp = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 11,
            "method": "tools/call",
            "params": {
                "name": "get_contract_internal_reporting_template",
                "arguments": {"organization_id": "org-1"},
            },
        }
    )
    assert resp["id"] == 11
    mock_crt.assert_called_once_with(organization_id="org-1")
    assert json.loads(resp["result"]["content"][0]["text"]) == {"templateId": 10}

    # get_template_responses call
    mock_gtr = MagicMock(return_value={"templateId": 10, "rows": []})
    server._tool_methods["get_template_responses"] = mock_gtr
    resp = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 12,
            "method": "tools/call",
            "params": {
                "name": "get_template_responses",
                "arguments": {
                    "organization_id": "org-1",
                    "template_id": 10,
                    "include_sub_orgs": True,
                },
            },
        }
    )
    assert resp["id"] == 12
    mock_gtr.assert_called_once_with(
        organization_id="org-1", template_id=10, include_sub_orgs=True
    )
    assert json.loads(resp["result"]["content"][0]["text"]) == {
        "templateId": 10,
        "rows": [],
    }

    # parse_internal_reporting call
    sample_list = [{"nodeId": "n1", "value": "val1"}]
    resp = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 13,
            "method": "tools/call",
            "params": {
                "name": "parse_internal_reporting",
                "arguments": {"reporting_list": sample_list, "by": "nodeId"},
            },
        }
    )
    assert resp["id"] == 13
    assert json.loads(resp["result"]["content"][0]["text"]) == {"n1": "val1"}
