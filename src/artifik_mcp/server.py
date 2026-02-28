"""MCP server with auto-registered tools from ArtifikClient."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.client import ArtifikClient
from app.doffin import DoffinClient
from artifik_mcp.decorator import get_mcp_tools

logger = logging.getLogger(__name__)

PROTOCOL_VERSION = "2025-06-18"

SERVER_INFO = {
    "name": "artifik",
    "version": "0.1.0",
}


class MCPServer:
    """MCP Server handling JSON-RPC for ArtifikClient and DoffinClient tools."""

    def __init__(self):
        self.artifik = ArtifikClient()
        self.doffin = DoffinClient()
        self._clients = [self.artifik, self.doffin]
        self.tools = self._build_tool_defs()
        self._tool_methods: dict[str, Any] = {}
        self._register_tools()

    def _build_tool_defs(self) -> list[dict[str, Any]]:
        """Build MCP tool definitions from @mcp_tool-decorated methods."""
        defs = []
        for client in self._clients:
            for name, method, meta in get_mcp_tools(client):
                schema = self._build_input_schema(method)
                defs.append({
                    "name": name,
                    "description": meta["description"],
                    "inputSchema": schema,
                })
        return defs

    def _register_tools(self) -> None:
        """Map tool names to bound methods."""
        for client in self._clients:
            for name, method, _meta in get_mcp_tools(client):
                self._tool_methods[name] = method
        logger.info("Registered %d tools", len(self._tool_methods))

    @staticmethod
    def _build_input_schema(method) -> dict[str, Any]:
        """Derive JSON Schema from method signature."""
        import inspect

        sig = inspect.signature(method)
        properties: dict[str, Any] = {}
        required: list[str] = []

        for param_name, param in sig.parameters.items():
            if param_name == "self":
                continue

            prop: dict[str, Any] = {}
            annotation = param.annotation
            if annotation is int:
                prop["type"] = "integer"
            elif annotation is bool:
                prop["type"] = "boolean"
            elif annotation is float:
                prop["type"] = "number"
            elif annotation == list[str]:
                prop["type"] = "array"
                prop["items"] = {"type": "string"}
            elif annotation == list[dict]:
                prop["type"] = "array"
                prop["items"] = {"type": "object"}
            else:
                prop["type"] = "string"

            # Handle Optional types (str | None etc.)
            is_optional = (
                param.default is not inspect.Parameter.empty
                or _is_optional_annotation(annotation)
            )

            if not is_optional and param.kind != inspect.Parameter.KEYWORD_ONLY:
                required.append(param_name)

            properties[param_name] = prop

        schema: dict[str, Any] = {"type": "object", "properties": properties}
        if required:
            schema["required"] = required
        return schema

    def handle_request(self, body: dict[str, Any]) -> dict[str, Any]:
        """Handle incoming MCP JSON-RPC request."""
        method = body.get("method", "")
        params = body.get("params", {})
        request_id = body.get("id")

        try:
            if method == "initialize":
                result = self._handle_initialize(params)
            elif method == "initialized":
                result = {}
            elif method == "tools/list":
                result = {"tools": self.tools}
            elif method == "tools/call":
                result = self._handle_tools_call(params)
            elif method == "resources/list":
                result = {"resources": []}
            elif method == "prompts/list":
                result = {"prompts": []}
            elif method == "ping":
                result = {}
            else:
                return self._error_response(request_id, -32601, f"Method not found: {method}")

            return self._success_response(request_id, result)
        except Exception as e:
            logger.exception("Error handling MCP request: %s", e)
            return self._error_response(request_id, -32603, str(e))

    def _handle_initialize(self, params: dict[str, Any]) -> dict[str, Any]:
        client_info = params.get("clientInfo", {})
        logger.info(
            "MCP client connected: %s v%s",
            client_info.get("name", "unknown"),
            client_info.get("version", "?"),
        )
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "serverInfo": SERVER_INFO,
            "capabilities": {"tools": {}},
        }

    def _handle_tools_call(self, params: dict[str, Any]) -> dict[str, Any]:
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        logger.info("Tool call: %s with args: %s", tool_name, arguments)

        method = self._tool_methods.get(tool_name)
        if method is None:
            return {
                "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}],
                "isError": True,
            }

        try:
            result = method(**arguments)
            text = json.dumps(result, ensure_ascii=False, indent=2) if not isinstance(result, str) else result
            return {"content": [{"type": "text", "text": text}]}
        except Exception as e:
            logger.exception("Tool execution error: %s", e)
            return {
                "content": [{"type": "text", "text": f"Error in {tool_name}: {e}"}],
                "isError": True,
            }

    @staticmethod
    def _success_response(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    @staticmethod
    def _error_response(request_id: Any, code: int, message: str) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def _is_optional_annotation(annotation) -> bool:
    """Check if annotation is Optional (X | None)."""
    import types

    if isinstance(annotation, types.UnionType):
        return type(None) in annotation.__args__
    origin = getattr(annotation, "__origin__", None)
    if origin is not None:
        import typing
        if origin is typing.Union:
            return type(None) in annotation.__args__
    return False
