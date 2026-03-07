"""Verify API access by obtaining a token and listing procurements."""

import json
import os
import ssl
import sys
import urllib.parse
import urllib.request
import urllib.error

import certifi

BASE_URL = "https://api.artifik.no"
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def get_token() -> str:
    """Get OAuth2 access token using client credentials."""
    payload = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": os.environ["VENDOR_API_ID"],
            "client_secret": os.environ["VENDOR_API_KEY"],
        }
    ).encode()

    req = urllib.request.Request(
        f"{BASE_URL}/external/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        data = json.loads(resp.read())

    print(
        f"Token obtained. Type: {data.get('token_type')}, "
        f"expires_in: {data.get('expires_in')}s"
    )
    return data["access_token"]


def list_procurements(token: str) -> None:
    """List procurements to verify API access works."""
    req = urllib.request.Request(
        f"{BASE_URL}/external/procurements",
        headers={"Authorization": f"Bearer {token}"},
    )

    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        data = json.loads(resp.read())

    print(f"\nProcurements response (status {resp.status}):")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])

    if isinstance(data, list):
        print(f"\nTotal procurements: {len(data)}")


def main() -> None:
    try:
        token = get_token()
        list_procurements(token)
        print("\nAPI access verified successfully.")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr)
        print(body[:500], file=sys.stderr)
        sys.exit(1)
    except KeyError as e:
        print(f"Missing environment variable: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
