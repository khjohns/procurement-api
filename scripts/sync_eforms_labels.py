#!/usr/bin/env python3
"""Sync Norwegian codelist labels from anskaffelser/eforms-sdk-nor.

Downloads YAML codelists from the GitHub repo and produces a compact JSON
file at src/app/data/eforms_labels_nb.json.

Features:
  - ETag caching: stores raw YAML in .cache/eforms-sdk/ and skips
    re-download when upstream hasn't changed (HTTP 304).
  - Content hash: compares SHA-256 of generated JSON against the
    existing file and skips write if identical (no-op sync).

Usage:
    pip install pyyaml
    python scripts/sync_eforms_labels.py              # from main branch
    python scripts/sync_eforms_labels.py --ref v1.13.2 # specific tag
    python scripts/sync_eforms_labels.py --no-cache    # skip cache
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("pyyaml is required: pip install pyyaml")


REPO = "anskaffelser/eforms-sdk-nor"
BASE_URL = "https://raw.githubusercontent.com/{repo}/{ref}/src/codelists/{file}"
BASE_URL_NO = "https://raw.githubusercontent.com/{repo}/{ref}/src/codelists-no/{file}"

# Codelists to sync, grouped by priority.
# Key = output key in JSON, value = filename in src/codelists/
CODELISTS: dict[str, str] = {
    # Tier 1: Core
    "procurement-procedure-type": "procurement-procedure-type.yaml",
    "contract-nature": "contract-nature.yaml",
    "award-criterion-type": "award-criterion-type.yaml",
    "framework-agreement": "framework-agreement.yaml",
    "dps-usage": "dps-usage.yaml",
    "exclusion-ground": "exclusion-ground.yaml",
    "criterion": "criterion.yaml",
    "buyer-legal-type": "buyer-legal-type.yaml",
    "notice-type": "notice-type.yaml",
    "form-type": "form-type.yaml",
    # Tier 2: Procurement workflow
    "direct-award-justification": "direct-award-justification.yaml",
    "selection-criterion": "selection-criterion.yaml",
    "organisation-role": "organisation-role.yaml",
    "non-award-justification": "non-award-justification.yaml",
    "modification-justification": "modification-justification.yaml",
    "received-submission-type": "received-submission-type.yaml",
    "winner-selection-status": "winner-selection-status.yaml",
    "reserved-procurement": "reserved-procurement.yaml",
    "buyer-contracting-type": "buyer-contracting-type.yaml",
    "notice-subtype": "notice-subtype.yaml",
    "competition": "competition.yaml",
    "irregularity-type": "irregularity-type.yaml",
    # Tier 3: Strategic / supplementary
    "strategic-procurement": "strategic-procurement.yaml",
    "gpp-criteria": "gpp-criteria.yaml",
    "innovative-acquisition": "innovative-acquisition.yaml",
    "environmental-impact": "environmental-impact.yaml",
    "social-objective": "social-objective.yaml",
    "economic-operator-size": "economic-operator-size.yaml",
    "authority-activity": "authority-activity.yaml",
    "entity-activity": "entity-activity.yaml",
    "main-activity": "main-activity.yaml",
    "accessibility": "accessibility.yaml",
    "contract-detail": "contract-detail.yaml",
    "eu-funded": "eu-funded.yaml",
    "accelerated-procedure": "accelerated-procedure.yaml",
    "duration": "duration.yaml",
    "country": "country.yaml",
}

# Norwegian-specific codelists (src/codelists-no/)
CODELISTS_NO: dict[str, str] = {
    "award-criterion-type-no": "award-criterion-type.no.yaml",
}

# Typo corrections in upstream data
TYPO_FIXES: dict[str, dict[str, str]] = {
    "dps-usage": {
        "Dynamisk innkjøpsordning kun tilgjerngelig for kjøpere oppført i denne kunngjøringen": (
            "Dynamisk innkjøpsordning kun tilgjengelig for kjøpere oppført i denne kunngjøringen"
        ),
    },
}

ROOT = Path(__file__).parent.parent
OUTPUT_PATH = ROOT / "src" / "app" / "data" / "eforms_labels_nb.json"
CACHE_DIR = ROOT / ".cache" / "eforms-sdk"
ETAG_SUFFIX = ".etag"


# ── Cache helpers ──


def _cache_path(ref: str, filename: str) -> Path:
    """Return cache file path for a given ref + filename."""
    safe = filename.replace("/", "__")
    return CACHE_DIR / ref / safe


def _read_cached(ref: str, filename: str) -> tuple[str | None, bytes | None]:
    """Read cached YAML bytes and ETag. Returns (etag, content) or (None, None)."""
    path = _cache_path(ref, filename)
    etag_path = path.with_suffix(path.suffix + ETAG_SUFFIX)
    if path.exists():
        etag = etag_path.read_text().strip() if etag_path.exists() else None
        return etag, path.read_bytes()
    return None, None


def _write_cached(ref: str, filename: str, content: bytes, etag: str | None) -> None:
    """Write YAML bytes and ETag to cache."""
    path = _cache_path(ref, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    if etag:
        path.with_suffix(path.suffix + ETAG_SUFFIX).write_text(etag)


# ── Fetch ──


def fetch_yaml(url: str, ref: str, filename: str, *, use_cache: bool = True) -> dict | None:
    """Download and parse a YAML file with ETag caching. Returns None on 404."""
    cached_etag, cached_content = (None, None)
    if use_cache:
        cached_etag, cached_content = _read_cached(ref, filename)

    headers = {"User-Agent": "procurement-api-sync/1.0"}
    if cached_etag:
        headers["If-None-Match"] = cached_etag

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            etag = resp.headers.get("ETag")
            if use_cache:
                _write_cached(ref, filename, content, etag)
            return yaml.safe_load(content.decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 304 and cached_content is not None:
            return yaml.safe_load(cached_content.decode("utf-8"))
        if e.code == 404:
            print("WARN: 404")
            return None
        raise


# ── Extract ──


def extract_nob(data: dict, codelist_name: str) -> dict[str, str]:
    """Extract {code: nob_label} from a parsed YAML codelist."""
    result: dict[str, str] = {}
    if not isinstance(data, dict):
        return result
    fixes = TYPO_FIXES.get(codelist_name, {})
    for code, entry in data.items():
        if not isinstance(entry, dict):
            continue
        nob = entry.get("nob")
        if nob and isinstance(nob, str):
            label = nob.strip()
            if label in fixes:
                label = fixes[label]
            result[str(code)] = label
    return result


def extract_nob_no(data: dict) -> dict[str, str]:
    """Extract Norwegian-specific codelist entries (list-of-dicts structure)."""
    result: dict[str, str] = {}
    if not isinstance(data, dict):
        return result
    codes = data.get("codes", [])
    if not isinstance(codes, list):
        return result
    for entry in codes:
        if not isinstance(entry, dict):
            continue
        code = entry.get("code")
        label = entry.get("label", {})
        nob = label.get("nob") if isinstance(label, dict) else None
        if code and nob and isinstance(nob, str):
            result[str(code)] = nob.strip()
    return result


# ── Main ──


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync eforms-sdk-nor labels")
    parser.add_argument("--ref", default="main", help="Git ref (branch/tag), e.g. v1.13.2")
    parser.add_argument("--no-cache", action="store_true", help="Skip ETag cache, always re-download")
    args = parser.parse_args()

    ref = args.ref
    use_cache = not args.no_cache
    cache_status = "enabled" if use_cache else "disabled"
    print(f"Syncing from {REPO} @ {ref} (cache: {cache_status})")

    output: dict[str, dict[str, str]] = {}
    total_entries = 0
    cached_hits = 0

    # Standard codelists
    for key, filename in CODELISTS.items():
        url = BASE_URL.format(repo=REPO, ref=ref, file=filename)
        print(f"  {key} <- {filename} ... ", end="", flush=True)

        had_cache = _read_cached(ref, filename)[1] is not None if use_cache else False
        data = fetch_yaml(url, ref, filename, use_cache=use_cache)
        if data is None:
            print("SKIP (not found)")
            continue
        labels = extract_nob(data, key)
        output[key] = labels
        total_entries += len(labels)

        tag = " (cached)" if had_cache and use_cache else ""
        cached_hits += 1 if tag else 0
        print(f"{len(labels)} entries{tag}")

    # Norwegian-specific codelists
    for key, filename in CODELISTS_NO.items():
        url = BASE_URL_NO.format(repo=REPO, ref=ref, file=filename)
        print(f"  {key} <- codelists-no/{filename} ... ", end="", flush=True)

        had_cache = _read_cached(ref, filename)[1] is not None if use_cache else False
        data = fetch_yaml(url, ref, filename, use_cache=use_cache)
        if data is None:
            print("SKIP (not found)")
            continue
        labels = extract_nob(data, key)
        if not labels:
            labels = extract_nob_no(data)
        output[key] = labels
        total_entries += len(labels)

        tag = " (cached)" if had_cache and use_cache else ""
        cached_hits += 1 if tag else 0
        print(f"{len(labels)} entries{tag}")

    # Build final JSON
    meta: dict = {
        "_meta": {
            "source": f"https://github.com/{REPO}",
            "ref": ref,
            "license": "CC-BY-4.0 (DFO/anskaffelser.no)",
            "codelists": len(output),
            "total_entries": total_entries,
        }
    }
    output_with_meta = {**meta, **dict(sorted(output.items()))}

    new_json = json.dumps(output_with_meta, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    new_hash = hashlib.sha256(new_json.encode()).hexdigest()[:12]

    # Check if output file already matches (content hash)
    if OUTPUT_PATH.exists():
        existing_hash = hashlib.sha256(OUTPUT_PATH.read_bytes()).hexdigest()[:12]
        if existing_hash == new_hash:
            print(f"\nNo changes detected (hash: {new_hash}). File is up to date.")
            return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(new_json, encoding="utf-8")
    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(
        f"\nWrote {OUTPUT_PATH.relative_to(ROOT)} "
        f"({size_kb:.1f} KB, {len(output)} codelists, {total_entries} entries, hash: {new_hash})"
    )
    if cached_hits:
        print(f"  {cached_hits} files served from cache")


if __name__ == "__main__":
    main()
