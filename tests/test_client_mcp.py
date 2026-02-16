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
