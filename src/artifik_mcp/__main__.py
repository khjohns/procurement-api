"""Entry point: python -m artifik_mcp"""

import json
import logging
import sys


def main():
    logging.basicConfig(level=logging.INFO)

    if "--remote" in sys.argv:
        _serve_http()
    else:
        _serve_stdio()


def _serve_stdio():
    """Stdio transport — read JSON-RPC from stdin, write to stdout."""
    from artifik_mcp.server import MCPServer

    server = MCPServer()
    print("Artifik MCP server (stdio). Send JSON-RPC via stdin.", file=sys.stderr)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = server.handle_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError as e:
            error = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {e}"},
            }
            print(json.dumps(error), flush=True)


def _serve_http():
    """HTTP transport via Flask — for Cloud Run deployment."""
    import os

    try:
        from flask import Flask
    except ImportError:
        print("Flask not installed. Run: pip install flask", file=sys.stderr)
        sys.exit(1)

    from artifik_mcp.auth import require_bearer_token
    from artifik_mcp.server import MCPServer

    server = MCPServer()
    app = Flask(__name__)
    _register_mcp_routes(app, server, require_bearer_token)

    port = int(os.environ.get("PORT", 8080))
    print(f"Artifik MCP server on http://0.0.0.0:{port}/mcp", file=sys.stderr)
    app.run(host="0.0.0.0", port=port)


def _register_mcp_routes(app, server, auth_check):
    """Register MCP JSON-RPC endpoint on Flask app."""
    from flask import Response, jsonify, request

    @app.route("/mcp", methods=["HEAD"])
    def mcp_head():
        return Response(
            status=200,
            headers={"MCP-Protocol-Version": "2025-06-18", "Content-Type": "application/json"},
        )

    @app.route("/mcp", methods=["POST"])
    def mcp_post():
        error = auth_check()
        if error:
            return error

        body = request.get_json()
        if not body:
            return jsonify(
                {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Empty body"}}
            ), 400

        response = server.handle_request(body)
        return jsonify(response)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "server": "artifik", "version": "0.1.0"})


if __name__ == "__main__":
    main()
