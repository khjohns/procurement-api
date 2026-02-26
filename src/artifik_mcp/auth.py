"""Bearer token authentication for the MCP HTTP endpoint.

When deployed behind Cloud Run IAM, the Authorization header is consumed
by the IAM layer.  The app-level MCP token is sent in X-MCP-Token instead.
"""

import os


def require_bearer_token():
    """Check X-MCP-Token header against MCP_AUTH_TOKEN env var.

    Returns None if authorized, or a Flask error response tuple if not.
    """
    from flask import jsonify, request

    expected = os.environ.get("MCP_AUTH_TOKEN")
    if not expected:
        return None

    token = request.headers.get("X-MCP-Token", "")
    if not token:
        return jsonify({"error": "Missing X-MCP-Token header"}), 401

    if token != expected:
        return jsonify({"error": "Invalid token"}), 403

    return None
