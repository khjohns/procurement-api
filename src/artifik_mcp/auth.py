"""Bearer token authentication for the MCP HTTP endpoint."""

import os


def require_bearer_token():
    """Check Authorization header against MCP_AUTH_TOKEN env var.

    Returns None if authorized, or a Flask error response tuple if not.
    """
    from flask import jsonify, request

    expected = os.environ.get("MCP_AUTH_TOKEN")
    if not expected:
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing Bearer token"}), 401

    token = auth_header[7:]
    if token != expected:
        return jsonify({"error": "Invalid token"}), 403

    return None
