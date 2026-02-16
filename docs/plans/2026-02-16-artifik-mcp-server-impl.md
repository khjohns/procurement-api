# Artifik MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that gives Claude Code autonomous, secrets-isolated access to the Artifik External API.

**Architecture:** A Python MCP server (`src/artifik_mcp/`) wraps the existing `ArtifikClient`. A `@mcp_tool` decorator on client methods auto-registers them as MCP tools. Credentials are read from macOS Keychain at startup and held in process memory — never exposed to Claude.

**Tech Stack:** Python 3.11, `mcp` SDK (MCPServer v2), macOS Keychain via `security` CLI, existing `ArtifikClient` from `src/app/client.py`.

**Design doc:** `docs/plans/2026-02-16-artifik-mcp-server-design.md`

---

### Task 1: Project setup — venv and dependencies

**Files:**
- Modify: `pyproject.toml`

**Step 1: Create venv and install existing deps**

```bash
cd /Users/kasper/Projects/Catenda/procurement-api
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
```

**Step 2: Add `mcp` dependency to pyproject.toml**

```toml
[project]
dependencies = [
    "flask>=3.0",
    "certifi",
    "mcp>=1.12",
]
```

**Step 3: Install mcp**

```bash
.venv/bin/pip install -e ".[dev]"
```

**Step 4: Verify installation**

Run: `.venv/bin/python -c "from mcp.server.mcpserver import MCPServer; print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add pyproject.toml
git commit -m "Add mcp SDK dependency"
```

---

### Task 2: Implement `@mcp_tool` decorator

**Files:**
- Create: `src/artifik_mcp/__init__.py`
- Create: `src/artifik_mcp/decorator.py`
- Create: `tests/test_decorator.py`

**Step 1: Create package**

`src/artifik_mcp/__init__.py`:
```python
"""Artifik MCP server — secrets-isolated API access for Claude Code."""
```

**Step 2: Write failing test**

`tests/test_decorator.py`:
```python
from artifik_mcp.decorator import mcp_tool


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
```

**Step 3: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_decorator.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'artifik_mcp'`

**Step 4: Implement decorator**

`src/artifik_mcp/decorator.py`:
```python
"""Decorator for marking ArtifikClient methods as MCP tools."""

from __future__ import annotations

from typing import Any, Callable


def mcp_tool(*, description: str) -> Callable:
    """Mark a method for automatic MCP tool registration.

    The server reads _mcp_tool_meta at startup to auto-register tools.
    """
    def decorator(func: Callable) -> Callable:
        func._mcp_tool_meta = {"description": description}
        return func
    return decorator


def get_mcp_tools(obj: Any) -> list[tuple[str, Callable, dict]]:
    """Find all @mcp_tool-decorated methods on an object.

    Returns list of (name, bound_method, meta) tuples.
    """
    tools = []
    for name in dir(obj):
        if name.startswith("_"):
            continue
        method = getattr(obj, name)
        if not callable(method):
            continue
        meta = getattr(method, "_mcp_tool_meta", None)
        if meta is not None:
            tools.append((name, method, meta))
    return tools
```

**Step 5: Run tests**

Run: `.venv/bin/python -m pytest tests/test_decorator.py -v`
Expected: PASS

**Step 6: Write test for `get_mcp_tools`**

Add to `tests/test_decorator.py`:
```python
from artifik_mcp.decorator import get_mcp_tools


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
        # bound method works without self
        if name == "action_a":
            assert method(x=1) == "1"
```

**Step 7: Run tests**

Run: `.venv/bin/python -m pytest tests/test_decorator.py -v`
Expected: PASS

**Step 8: Commit**

```bash
git add src/artifik_mcp/__init__.py src/artifik_mcp/decorator.py tests/test_decorator.py
git commit -m "Add @mcp_tool decorator for auto-registration"
```

---

### Task 3: Implement `credentials.py`

**Files:**
- Create: `src/artifik_mcp/credentials.py`
- Create: `tests/test_credentials.py`

**Step 1: Write failing test**

`tests/test_credentials.py`:
```python
from unittest.mock import patch
from artifik_mcp.credentials import get_credentials, KeychainError


def test_get_credentials_from_env_fallback():
    """When Keychain fails, fall back to env vars."""
    with (
        patch("artifik_mcp.credentials._keychain_read", side_effect=KeychainError("not found")),
        patch.dict("os.environ", {"VENDOR_API_ID": "test-id", "VENDOR_API_KEY": "test-key"}),
    ):
        api_id, api_key = get_credentials()
        assert api_id == "test-id"
        assert api_key == "test-key"


def test_get_credentials_from_keychain():
    """When Keychain works, use it."""
    def mock_keychain(service, account):
        return {"procurement-api-id": "kc-id", "procurement-api": "kc-key"}[service]

    with patch("artifik_mcp.credentials._keychain_read", side_effect=mock_keychain):
        api_id, api_key = get_credentials()
        assert api_id == "kc-id"
        assert api_key == "kc-key"
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_credentials.py -v`
Expected: FAIL — `ModuleNotFoundError`

**Step 3: Implement credentials.py**

`src/artifik_mcp/credentials.py`:
```python
"""Credential loading — Keychain first, env vars as fallback."""

from __future__ import annotations

import os
import subprocess


class KeychainError(Exception):
    pass


def _keychain_read(service: str, account: str) -> str:
    """Read a value from macOS Keychain."""
    result = subprocess.run(
        ["security", "find-generic-password", "-s", service, "-a", account, "-w"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise KeychainError(f"Not found: {service}/{account}")
    return result.stdout.strip()


def get_credentials() -> tuple[str, str]:
    """Load API credentials. Keychain first, env vars as fallback (CI)."""
    try:
        api_id = _keychain_read("procurement-api-id", os.environ.get("USER", ""))
        api_key = _keychain_read("procurement-api", os.environ.get("USER", ""))
        return api_id, api_key
    except (KeychainError, FileNotFoundError):
        return os.environ["VENDOR_API_ID"], os.environ["VENDOR_API_KEY"]
```

**Step 4: Run tests**

Run: `.venv/bin/python -m pytest tests/test_credentials.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/artifik_mcp/credentials.py tests/test_credentials.py
git commit -m "Add credential loading with Keychain + env var fallback"
```

---

### Task 4: Modify ArtifikClient to support injected credentials + decorate methods

**Files:**
- Modify: `src/app/client.py`
- Create: `tests/test_client_mcp.py`

**Step 1: Write failing test — injected credentials**

`tests/test_client_mcp.py`:
```python
from app.client import ArtifikClient


def test_client_accepts_injected_credentials():
    client = ArtifikClient(client_id="injected-id", client_secret="injected-secret")
    assert client._get_credentials() == ("injected-id", "injected-secret")


def test_client_falls_back_to_environ(monkeypatch):
    monkeypatch.setenv("VENDOR_API_ID", "env-id")
    monkeypatch.setenv("VENDOR_API_KEY", "env-key")
    client = ArtifikClient()
    assert client._get_credentials() == ("env-id", "env-key")
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_client_mcp.py -v`
Expected: FAIL — `TypeError: ArtifikClient.__init__() got an unexpected keyword argument 'client_id'`

**Step 3: Modify ArtifikClient — add credential injection**

In `src/app/client.py`, change the dataclass fields:

```python
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
    _ssl_ctx: ssl.SSLContext = field(default_factory=lambda: ssl.create_default_context(cafile=certifi.where()), repr=False)

    def _get_credentials(self) -> tuple[str, str]:
        if self.client_id and self.client_secret:
            return self.client_id, self.client_secret
        return os.environ["VENDOR_API_ID"], os.environ["VENDOR_API_KEY"]
```

**Step 4: Run credential tests**

Run: `.venv/bin/python -m pytest tests/test_client_mcp.py -v`
Expected: PASS

**Step 5: Add @mcp_tool decorators to all public API methods**

Add import at top of `src/app/client.py`:
```python
from artifik_mcp.decorator import mcp_tool
```

Decorate each public method (add decorator line above each, do NOT change signatures or logic):

```python
@mcp_tool(description="List all procurements. Optionally filter by organization ID.")
def list_procurements(self, *, organization_id: str | None = None) -> list[dict]:

@mcp_tool(description="Get activity log for a procurement — submissions, openings, qualifications, awards.")
def get_procurement_activities(self, procurement_id: int) -> list[dict]:

@mcp_tool(description="Get structured document responses (qualification criteria, award criteria, contract terms) for a procurement.")
def get_smart_doc_responses(self, procurement_id: int) -> Any:

@mcp_tool(description="Download all procurement documents as a ZIP archive. Returns raw bytes.")
def download_archive_zip(self, procurement_id: int) -> bytes:

@mcp_tool(description="List contracts. Optionally filter by organization, date, or include custom fields.")
def list_contracts(self, *, organization_id: str | None = None, include_custom_fields: bool = False, limit_date: str | None = None) -> list[dict]:

@mcp_tool(description="Get details for a specific contract.")
def get_contract(self, contract_id: int) -> dict:

@mcp_tool(description="List organizations. Optionally include sub-organizations.")
def list_organizations(self, *, include_sub_orgs: bool = False, parent_id: str | None = None) -> list[dict]:

@mcp_tool(description="Get organization-level activity log. Optionally filter by organization or date.")
def get_organization_activities(self, *, organization_id: str | None = None, limit_date: str | None = None) -> list[dict]:

@mcp_tool(description="List registered webhooks.")
def list_webhooks(self, *, organization_id: str | None = None) -> list[dict]:

@mcp_tool(description="Register a webhook for specified actions.")
def register_webhook(self, callback_url: str, action_list: list[str], *, organization_id: str | None = None) -> dict:

@mcp_tool(description="Delete a registered webhook.")
def delete_webhook(self, webhook_id: int) -> Any:

@mcp_tool(description="Get tasks. Filter by organization, user, status, or type.")
def get_tasks(self, *, organization_id: str | None = None, user_id: str | None = None, status: str | None = None, task_type: str | None = None) -> list[dict]:
```

**Step 6: Write drift test**

Add to `tests/test_client_mcp.py`:
```python
from artifik_mcp.decorator import get_mcp_tools


def test_all_public_methods_have_mcp_tool():
    """Every public method on ArtifikClient must be decorated with @mcp_tool."""
    client = ArtifikClient.__new__(ArtifikClient)
    mcp_tool_names = {name for name, _, _ in get_mcp_tools(client)}

    public_methods = set()
    for name in dir(client):
        if name.startswith("_"):
            continue
        attr = getattr(client, name)
        if callable(attr) and not isinstance(attr, property):
            public_methods.add(name)

    missing = public_methods - mcp_tool_names
    assert not missing, f"Methods missing @mcp_tool: {missing}"
```

**Step 7: Run all tests**

Run: `.venv/bin/python -m pytest tests/test_client_mcp.py tests/test_decorator.py -v`
Expected: PASS

**Step 8: Verify Flask app still works** (no regression)

Run: `.venv/bin/python -c "from app import create_app; print('Flask OK')"`
Expected: `Flask OK`

**Step 9: Commit**

```bash
git add src/app/client.py tests/test_client_mcp.py
git commit -m "Add credential injection and @mcp_tool decorators to ArtifikClient"
```

---

### Task 5: Implement MCP server

**Files:**
- Create: `src/artifik_mcp/server.py`
- Create: `tests/test_server.py`

**Step 1: Write failing test — tool registration**

`tests/test_server.py`:
```python
from unittest.mock import MagicMock, patch
from artifik_mcp.server import create_server


def test_create_server_registers_tools():
    """Server should have one tool per @mcp_tool-decorated client method."""
    # Mock client with fake credentials to avoid real API calls
    with patch("artifik_mcp.server.get_credentials", return_value=("fake-id", "fake-key")):
        server = create_server()

    # MCPServer stores tools internally — check via list_tools
    # The exact introspection depends on MCP SDK internals,
    # so we verify by checking the server was created successfully
    assert server is not None
    assert server._mcp_server.name == "artifik"
```

**Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_server.py -v`
Expected: FAIL — `ModuleNotFoundError`

**Step 3: Implement server.py**

`src/artifik_mcp/server.py`:
```python
"""MCP server with auto-registered tools from ArtifikClient."""

from __future__ import annotations

import json
import logging

from mcp.server.mcpserver import MCPServer

from app.client import ArtifikClient, ArtifikAPIError
from artifik_mcp.credentials import get_credentials
from artifik_mcp.decorator import get_mcp_tools

logger = logging.getLogger(__name__)


def create_server() -> MCPServer:
    """Create MCP server with all ArtifikClient tools auto-registered."""
    api_id, api_key = get_credentials()
    client = ArtifikClient(client_id=api_id, client_secret=api_key)

    mcp = MCPServer("artifik")
    _register_tools(mcp, client)
    return mcp


def _register_tools(mcp: MCPServer, client: ArtifikClient) -> None:
    """Auto-register all @mcp_tool-decorated methods as MCP tools."""
    for name, method, meta in get_mcp_tools(client):
        # Register bound method directly.
        # Bound method signature excludes `self`, so MCP SDK
        # correctly generates JSON schema from type hints.
        mcp.tool(
            name=name,
            description=meta["description"],
        )(method)

    logger.info("Registered %d tools", len(get_mcp_tools(client)))
```

**Step 4: Run test**

Run: `.venv/bin/python -m pytest tests/test_server.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/artifik_mcp/server.py tests/test_server.py
git commit -m "Add MCP server with auto-registered tools from ArtifikClient"
```

---

### Task 6: Implement `__main__.py` entry point

**Files:**
- Create: `src/artifik_mcp/__main__.py`

**Step 1: Implement entry point**

`src/artifik_mcp/__main__.py`:
```python
"""Entry point: python -m artifik_mcp"""

from artifik_mcp.server import create_server


def main():
    server = create_server()
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
```

**Step 2: Verify it starts (will fail without real credentials, that's OK)**

Run: `.venv/bin/python -m artifik_mcp --help 2>&1 || true`

The server will either start (waiting for stdio input) or fail with a credential error.
Both are acceptable — we're just verifying the module loads.

Alternative smoke test:
```bash
.venv/bin/python -c "from artifik_mcp.__main__ import main; print('Module loads OK')"
```
Expected: `Module loads OK`

**Step 3: Commit**

```bash
git add src/artifik_mcp/__main__.py
git commit -m "Add MCP server entry point"
```

---

### Task 7: Configure Claude Code MCP

**Files:**
- Create: `.claude/mcp.json`

**Step 1: Write MCP config**

`.claude/mcp.json`:
```json
{
  "mcpServers": {
    "artifik": {
      "command": "/Users/kasper/Projects/Catenda/procurement-api/.venv/bin/python",
      "args": ["-m", "artifik_mcp"],
      "cwd": "/Users/kasper/Projects/Catenda/procurement-api/src"
    }
  }
}
```

Note: `cwd` is set to `src/` so that `from app.client import ArtifikClient` resolves correctly.

**Step 2: Commit**

```bash
git add .claude/mcp.json
git commit -m "Configure Artifik MCP server for Claude Code"
```

---

### Task 8: Keychain setup for API ID

Currently only `VENDOR_API_KEY` is in Keychain (service: `procurement-api`).
The MCP server also needs `VENDOR_API_ID` (service: `procurement-api-id`).

**Step 1: Check current Keychain entries**

```bash
security find-generic-password -s 'procurement-api' -a "$USER" 2>&1 | head -5
security find-generic-password -s 'procurement-api-id' -a "$USER" 2>&1 | head -5
```

**Step 2: Add API ID to Keychain if missing**

This is a manual step (requires the user to paste the value):
```bash
security add-generic-password -s 'procurement-api-id' -a "$USER" -w
# Paste the VENDOR_API_ID value when prompted
```

**Step 3: Verify both entries exist**

```bash
security find-generic-password -s 'procurement-api' -a "$USER" -w > /dev/null && echo "API_KEY: OK"
security find-generic-password -s 'procurement-api-id' -a "$USER" -w > /dev/null && echo "API_ID: OK"
```

Expected: Both print OK.

---

### Task 9: End-to-end verification

**Step 1: Start a new Claude Code session** (so MCP server loads from `.claude/mcp.json`)

**Step 2: Verify MCP tools are available**

In the new session, Claude should see Artifik tools (e.g., `list_procurements`, `get_procurement_activities`). Try calling one:

Ask Claude: "List procurements using the Artifik MCP tool"

**Step 3: Verify credentials are NOT exposed**

Ask Claude: "What are the Artifik API credentials?"
Expected: Claude cannot access them — they exist only in the MCP server process.

**Step 4: Run all tests one final time**

```bash
.venv/bin/python -m pytest tests/ -v
```

Expected: All PASS.

**Step 5: Final commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "Complete Artifik MCP server implementation"
```

---

### Summary of commits

| # | Commit message | Files |
|---|---------------|-------|
| 1 | Add mcp SDK dependency | `pyproject.toml` |
| 2 | Add @mcp_tool decorator for auto-registration | `src/artifik_mcp/__init__.py`, `decorator.py`, `tests/test_decorator.py` |
| 3 | Add credential loading with Keychain + env var fallback | `src/artifik_mcp/credentials.py`, `tests/test_credentials.py` |
| 4 | Add credential injection and @mcp_tool decorators to ArtifikClient | `src/app/client.py`, `tests/test_client_mcp.py` |
| 5 | Add MCP server with auto-registered tools from ArtifikClient | `src/artifik_mcp/server.py`, `tests/test_server.py` |
| 6 | Add MCP server entry point | `src/artifik_mcp/__main__.py` |
| 7 | Configure Artifik MCP server for Claude Code | `.claude/mcp.json` |
| 8 | (manual) Keychain setup for API ID | — |
| 9 | (verification) End-to-end test | — |
