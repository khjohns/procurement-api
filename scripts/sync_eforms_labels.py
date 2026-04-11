#!/usr/bin/env python3
"""Sync Norwegian codelist labels from anskaffelser/eforms-sdk-nor.

Downloads YAML codelists from the GitHub repo and produces a compact JSON
file at src/app/data/eforms_labels_nb.json.

Usage:
    pip install pyyaml
    python scripts/sync_eforms_labels.py [--tag v1.13.2]

Without --tag, fetches from the main branch.
"""

from __future__ import annotations

import argparse
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

OUTPUT_PATH = Path(__file__).parent.parent / "src" / "app" / "data" / "eforms_labels_nb.json"


def fetch_yaml(url: str) -> dict | None:
    """Download and parse a YAML file. Returns None on 404."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "procurement-api-sync/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return yaml.safe_load(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  WARN: 404 for {url}")
            return None
        raise


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
            # Apply typo fixes
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync eforms-sdk-nor labels")
    parser.add_argument("--ref", default="main", help="Git ref (branch/tag), e.g. v1.13.2")
    args = parser.parse_args()

    ref = args.ref
    print(f"Syncing from {REPO} @ {ref}")

    output: dict[str, dict[str, str]] = {}
    total_entries = 0

    # Standard codelists
    for key, filename in CODELISTS.items():
        url = BASE_URL.format(repo=REPO, ref=ref, file=filename)
        print(f"  {key} <- {filename} ... ", end="", flush=True)
        data = fetch_yaml(url)
        if data is None:
            print("SKIP (not found)")
            continue
        labels = extract_nob(data, key)
        output[key] = labels
        total_entries += len(labels)
        print(f"{len(labels)} entries")

    # Norwegian-specific codelists
    for key, filename in CODELISTS_NO.items():
        url = BASE_URL_NO.format(repo=REPO, ref=ref, file=filename)
        print(f"  {key} <- codelists-no/{filename} ... ", end="", flush=True)
        data = fetch_yaml(url)
        if data is None:
            print("SKIP (not found)")
            continue
        # Try standard format first, then NO-specific format
        labels = extract_nob(data, key)
        if not labels:
            labels = extract_nob_no(data)
        output[key] = labels
        total_entries += len(labels)
        print(f"{len(labels)} entries")

    # Add metadata
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

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output_with_meta, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"\nWrote {OUTPUT_PATH} ({size_kb:.1f} KB, {len(output)} codelists, {total_entries} entries)")


if __name__ == "__main__":
    main()
