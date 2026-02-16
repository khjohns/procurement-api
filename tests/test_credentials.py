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
