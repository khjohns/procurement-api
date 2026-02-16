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
