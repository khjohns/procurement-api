"""Tests for DoffinClient cache and get_notice."""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.doffin import DoffinClient

MINIMAL_XML = b"""\
<?xml version="1.0" encoding="UTF-8"?>
<ContractNotice
    xmlns="urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:ID>cache-test</cbc:ID>
  <cbc:IssueDate>2026-01-01</cbc:IssueDate>
</ContractNotice>
"""


def test_get_notice_caches_result():
    """get_notice should cache parsed result and not re-download."""
    with tempfile.TemporaryDirectory() as tmpdir:
        client = DoffinClient(api_key="fake", cache_dir=tmpdir)

        with patch.object(client, "_download_raw", return_value=MINIMAL_XML) as mock_dl:
            result1 = client.get_notice("test-001")
            result2 = client.get_notice("test-001")

        mock_dl.assert_called_once()  # Only downloaded once
        assert result1 == result2
        assert result1["doffin_id"] == "test-001"
        assert result1["notice_type"] == "ContractNotice"

        # Verify cache file exists
        cache_file = Path(tmpdir) / "test-001.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["doffin_id"] == "test-001"


def test_get_notice_returns_dict():
    """get_notice should return a plain dict (JSON-serializable for MCP)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        client = DoffinClient(api_key="fake", cache_dir=tmpdir)

        with patch.object(client, "_download_raw", return_value=MINIMAL_XML):
            result = client.get_notice("test-002")

        assert isinstance(result, dict)
        assert "award_criteria" in result
        assert "cpv_codes" in result
