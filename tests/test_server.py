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
