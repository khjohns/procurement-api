"""CLI for portfolio analysis of Doffin notices.

Usage:
    python -m analyse --buyer "Oslobygg"
    python -m analyse --buyer "Oslobygg" --format csv -o analyse.csv
    python -m analyse --buyer "Oslobygg" --no-enrich
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from io import StringIO
from pathlib import Path

_SRC_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _SRC_DIR.parent
sys.path.insert(0, str(_SRC_DIR))

GCP_PROJECT = "procurement-mcp"

_MAX_CRITERIA_COLS = 4


def _fetch_secret(name: str) -> str:
    result = subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest",
         f"--secret={name}", f"--project={GCP_PROJECT}"],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip()


def _to_csv(notices: list[dict]) -> str:
    """Convert notices to CSV string."""
    buf = StringIO()
    headers = [
        "doffin_id", "title", "type", "status", "publication_date",
        "procedure_code", "contract_nature", "estimated_value", "currency",
    ]
    for i in range(1, _MAX_CRITERIA_COLS + 1):
        headers.extend([
            f"award_criterion_{i}_name",
            f"award_criterion_{i}_type",
            f"award_criterion_{i}_weight",
        ])
    headers.extend([
        "selection_criteria_count", "env_criterion_code",
        "received_tenders", "framework_type", "framework_max_value",
    ])

    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()

    for n in notices:
        row = {
            "doffin_id": n.get("doffin_id"),
            "title": n.get("title"),
            "type": n.get("type"),
            "status": n.get("status"),
            "publication_date": n.get("publication_date"),
            "procedure_code": n.get("procedure_code"),
            "contract_nature": n.get("contract_nature"),
            "estimated_value": (n.get("estimated_value") or {}).get("amount")
                if isinstance(n.get("estimated_value"), dict)
                else n.get("estimated_value"),
            "currency": (n.get("estimated_value") or {}).get("currencyCode")
                if isinstance(n.get("estimated_value"), dict) else "",
            "selection_criteria_count": len(n.get("selection_criteria") or []),
            "env_criterion_code": n.get("env_criterion_code"),
            "received_tenders": n.get("received_tenders"),
            "framework_type": n.get("framework_type"),
            "framework_max_value": n.get("framework_max_value"),
        }
        for i, ac in enumerate(n.get("award_criteria") or [], 1):
            if i > _MAX_CRITERIA_COLS:
                break
            row[f"award_criterion_{i}_name"] = ac.get("name")
            row[f"award_criterion_{i}_type"] = ac.get("type")
            row[f"award_criterion_{i}_weight"] = ac.get("weight_percent")
        writer.writerow(row)

    return buf.getvalue()


def main() -> None:
    import logging

    from app.doffin import DoffinClient

    parser = argparse.ArgumentParser(description="Porteføljeanalyse av Doffin-kunngjøringer.")
    parser.add_argument("--buyer", required=True, help="Søkestreng for oppdragsgiver")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("-o", "--output", help="Output-fil (default: stdout)")
    parser.add_argument("--no-enrich", action="store_true", help="Skip eForms XML-parsing")
    parser.add_argument("--max-pages", type=int, default=10, help="Maks antall søkesider")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        stream=sys.stderr,
    )

    logging.info("Henter Doffin API-nøkkel...")
    api_key = _fetch_secret("doffin-api-key")
    cache_dir = str(_PROJECT_ROOT / ".cache" / "eforms")
    client = DoffinClient(api_key=api_key, cache_dir=cache_dir)

    result = client.analyze_buyer(
        search_string=args.buyer,
        enrich=not args.no_enrich,
        max_pages=args.max_pages,
    )

    if args.format == "csv":
        output = _to_csv(result.get("notices") or [])
    else:
        output = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(output)
        print(f"Skrevet til {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
