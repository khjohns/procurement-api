"""MCP server with auto-registered tools from ArtifikClient."""

from __future__ import annotations

import logging

from mcp.server.fastmcp import FastMCP

from app.client import ArtifikClient
from artifik_mcp.credentials import get_credentials
from artifik_mcp.decorator import get_mcp_tools

logger = logging.getLogger(__name__)


def create_server() -> FastMCP:
    """Create MCP server with all ArtifikClient tools auto-registered."""
    api_id, api_key = get_credentials()
    client = ArtifikClient(client_id=api_id, client_secret=api_key)

    mcp = FastMCP("artifik")
    _register_tools(mcp, client)
    return mcp


def _register_tools(mcp: FastMCP, client: ArtifikClient) -> None:
    """Auto-register all @mcp_tool-decorated methods as MCP tools."""
    tools = get_mcp_tools(client)
    for name, method, meta in tools:
        mcp.tool(name=name, description=meta["description"])(method)
    logger.info("Registered %d tools", len(tools))
