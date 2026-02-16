from artifik_mcp.decorator import mcp_tool, get_mcp_tools


def test_mcp_tool_stores_metadata():
    @mcp_tool(description="Test tool")
    def my_func(x: int) -> str:
        return str(x)

    assert hasattr(my_func, "_mcp_tool_meta")
    assert my_func._mcp_tool_meta["description"] == "Test tool"


def test_mcp_tool_preserves_function():
    @mcp_tool(description="Test")
    def add(a: int, b: int) -> int:
        return a + b

    assert add(1, 2) == 3
    assert add.__name__ == "add"


class FakeClient:
    @mcp_tool(description="Do A")
    def action_a(self, x: int) -> str:
        return str(x)

    @mcp_tool(description="Do B")
    def action_b(self) -> list:
        return []

    def _private(self):
        pass

    def not_a_tool(self):
        pass


def test_get_mcp_tools_finds_decorated():
    client = FakeClient()
    tools = get_mcp_tools(client)
    names = [name for name, _, _ in tools]
    assert "action_a" in names
    assert "action_b" in names
    assert "_private" not in names
    assert "not_a_tool" not in names


def test_get_mcp_tools_returns_bound_methods():
    client = FakeClient()
    tools = get_mcp_tools(client)
    for name, method, meta in tools:
        assert "description" in meta
        if name == "action_a":
            assert method(x=1) == "1"
