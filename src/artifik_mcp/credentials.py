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
        api_key = _keychain_read("procurement-api-key", os.environ.get("USER", ""))
        return api_id, api_key
    except (KeychainError, FileNotFoundError):
        return os.environ["VENDOR_API_ID"], os.environ["VENDOR_API_KEY"]
