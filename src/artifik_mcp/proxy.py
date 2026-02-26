"""Stdio-to-HTTP proxy for Cloud Run MCP server.

Reads JSON-RPC from stdin, forwards to the Cloud Run endpoint with
GCP identity token (IAM auth) + X-MCP-Token (app auth), and writes
responses to stdout.

Uses `gcloud auth print-identity-token` for IAM authentication,
which works with the user's existing gcloud login.

Usage: python -m artifik_mcp.proxy
"""

import json
import os
import ssl
import subprocess
import sys
import time
import urllib.request

import certifi

CLOUD_RUN_URL = os.environ.get(
    "MCP_SERVER_URL",
    "https://artifik-mcp-667049401109.europe-north1.run.app",
)
MCP_ENDPOINT = f"{CLOUD_RUN_URL}/mcp"
MCP_TOKEN = os.environ.get("MCP_AUTH_TOKEN", "")

# Cache identity token (valid for ~1 hour)
_cached_token: str = ""
_token_expires: float = 0


def _get_identity_token() -> str:
    """Get a GCP identity token using gcloud CLI."""
    global _cached_token, _token_expires

    if _cached_token and time.time() < _token_expires:
        return _cached_token

    result = subprocess.run(
        ["gcloud", "auth", "print-identity-token"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gcloud auth failed: {result.stderr.strip()}")

    _cached_token = result.stdout.strip()
    _token_expires = time.time() + 3000  # refresh after 50 min
    return _cached_token


def _forward(body: dict) -> dict:
    """Send JSON-RPC request to Cloud Run and return the response."""
    data = json.dumps(body).encode()
    identity_token = _get_identity_token()

    req = urllib.request.Request(
        MCP_ENDPOINT,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {identity_token}",
            "X-MCP-Token": MCP_TOKEN,
        },
        method="POST",
    )

    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
        return json.loads(resp.read())


def main():
    print("Artifik MCP proxy (stdio → Cloud Run). Send JSON-RPC via stdin.", file=sys.stderr)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = _forward(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError as e:
            error = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {e}"},
            }
            print(json.dumps(error), flush=True)
        except Exception as e:
            print(f"Proxy error: {e}", file=sys.stderr)
            error = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": f"Proxy error: {e}"},
            }
            print(json.dumps(error), flush=True)


if __name__ == "__main__":
    main()
