from unittest.mock import patch
from artifik_mcp.server import create_server


def test_create_server_registers_all_tools():
    """Server should have one tool per @mcp_tool-decorated client method."""
    with patch("artifik_mcp.server.get_credentials", return_value=("fake-id", "fake-key")):
        server = create_server()

    assert server.name == "artifik"

    tools = server._tool_manager.list_tools()
    tool_names = {t.name for t in tools}

    expected = {
        "list_procurements",
        "get_procurement_activities",
        "get_smart_doc_responses",
        "download_archive_zip",
        "list_contracts",
        "get_contract",
        "list_organizations",
        "get_organization_activities",
        "list_webhooks",
        "register_webhook",
        "delete_webhook",
        "get_tasks",
    }

    assert tool_names == expected, f"Missing: {expected - tool_names}, Extra: {tool_names - expected}"
