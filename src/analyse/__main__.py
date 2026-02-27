"""CLI for portfolio analysis of Doffin notices.

Usage:
    python -m analyse --buyer "Oslobygg"
    python -m analyse --buyer "Oslobygg" --format csv -o analyse.csv
    python -m analyse --buyer "Oslobygg" --no-enrich
    python -m analyse --summary analyse.json
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

_NOTICE_TYPE_LABELS = {
    "PLANNING": "Planlegging",
    "NOTICE_ON_BUYER_PROFILE": "Kjøperprofil",
    "ADVISORY_NOTICE": "Veiledende kunngjøring",
    "PRE_ANNOUNCEMENT": "Forhåndskunngjøring",
    "COMPETITION": "Konkurranse",
    "ANNOUNCEMENT_OF_COMPETITION": "Kunngjøring av konkurranse",
    "DYNAMIC_PURCHASING_SCHEME": "Dynamisk innkjøpsordning",
    "QUALIFICATION_SCHEME": "Kvalifikasjonsordning",
    "RESULT": "Resultat",
    "ANNOUNCEMENT_OF_INTENT": "Intensjonskunngjøring",
    "ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT": "Kontraktstildeling",
    "CHANGE_OF_CONCLUSION_OF_CONTRACT": "Endringsmelding",
    "CANCELLED_OR_MISSING_CONCLUSION_OF_CONTRACT": "Avlyst/ingen tildeling",
}

_FRAMEWORK_TYPE_LABELS = {
    "fa-mix": "Rammeavtale (blandet)",
    "fa-w-rc": "Rammeavtale med gjenåpning",
    "fa-wo-rc": "Rammeavtale uten gjenåpning",
    "none": "Ingen rammeavtale",
    "dps": "Dynamisk innkjøpsordning",
}

_PROCEDURE_LABELS = {
    "open": "Åpen anbudskonkurranse",
    "restricted": "Begrenset anbudskonkurranse",
    "neg-w-call": "Konkurranse med forhandling",
    "neg-wo-call": "Forhandling uten kunngjøring",
    "comp-dial": "Konkurransepreget dialog",
    "innovation": "Innovasjonspartnerskap",
    "oth-single": "Direkte anskaffelse",
}

_CONTRACT_NATURE_LABELS = {
    "services": "Tjeneste",
    "supplies": "Varer",
    "works": "Bygg og anlegg",
}


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
        "doffin_id", "title", "buyer_name", "buyer_org_id", "winner",
        "type", "status", "publication_date",
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
        notice_type = n.get("type") or ""
        procedure = n.get("procedure_code") or ""
        nature = n.get("contract_nature") or ""
        fw_type = n.get("framework_type") or ""
        row = {
            "doffin_id": n.get("doffin_id"),
            "title": n.get("title"),
            "buyer_name": n.get("buyer_name"),
            "buyer_org_id": n.get("buyer_org_id"),
            "winner": n.get("winner"),
            "type": _NOTICE_TYPE_LABELS.get(notice_type, notice_type),
            "status": n.get("status"),
            "publication_date": n.get("publication_date"),
            "procedure_code": _PROCEDURE_LABELS.get(procedure, procedure),
            "contract_nature": _CONTRACT_NATURE_LABELS.get(nature, nature),
            "estimated_value": (n.get("estimated_value") or {}).get("amount")
                if isinstance(n.get("estimated_value"), dict)
                else n.get("estimated_value"),
            "currency": (n.get("estimated_value") or {}).get("currencyCode")
                if isinstance(n.get("estimated_value"), dict) else "",
            "selection_criteria_count": len(n.get("selection_criteria") or []),
            "env_criterion_code": n.get("env_criterion_code"),
            "received_tenders": n.get("received_tenders"),
            "framework_type": _FRAMEWORK_TYPE_LABELS.get(fw_type, fw_type),
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


def _get_value(notice: dict) -> float | None:
    """Extract estimated_value amount from a notice."""
    ev = notice.get("estimated_value")
    if isinstance(ev, dict):
        return ev.get("amount")
    return ev


def _match_values(notices: list[dict]) -> dict[str, float]:
    """Match awards without estimated_value to their competition announcement by title."""
    competitions = {}
    for n in notices:
        if n.get("type") == "ANNOUNCEMENT_OF_COMPETITION":
            val = _get_value(n)
            if val:
                competitions[n["title"].lower().strip()] = val

    matched = {}
    for n in notices:
        if n.get("winner") and not _get_value(n):
            title = n["title"].lower().strip()
            if title in competitions:
                matched[n["doffin_id"]] = competitions[title]
    return matched


def _fmt_nok(amount: float | None) -> str:
    if amount is None:
        return "ukjent"
    if amount >= 1_000_000_000:
        return f"{amount / 1_000_000_000:.1f} mrd"
    if amount >= 1_000_000:
        return f"{amount / 1_000_000:.0f} mill"
    return f"{amount:,.0f}"


def _print_summary(data: dict) -> None:
    """Print portfolio analysis report to stdout."""
    notices = data.get("notices") or []
    if not notices:
        print("Ingen data.")
        return

    search = data.get("search_string", "?")
    matched_values = _match_values(notices)

    def value_for(n: dict) -> float | None:
        return _get_value(n) or matched_values.get(n["doffin_id"])

    # -- A. Oversikt --
    print(f"{'=' * 60}")
    print(f"  PORTEFØLJEANALYSE: {search}")
    print(f"  {len(notices)} kunngjøringer")
    print(f"{'=' * 60}")

    from collections import Counter

    print("\n--- Kunngjøringstyper ---")
    for t, c in Counter(
        _NOTICE_TYPE_LABELS.get(n.get("type", ""), n.get("type", ""))
        for n in notices
    ).most_common():
        print(f"  {c:4d}  {t}")

    print("\n--- Prosedyre ---")
    procs = [n.get("procedure_code") or "" for n in notices if n.get("procedure_code")]
    for p, c in Counter(procs).most_common():
        print(f"  {c:4d}  {_PROCEDURE_LABELS.get(p, p)}")

    print("\n--- Kontraktstype ---")
    for t, c in Counter(
        _CONTRACT_NATURE_LABELS.get(n.get("contract_nature", ""), n.get("contract_nature", ""))
        for n in notices if n.get("contract_nature")
    ).most_common():
        print(f"  {c:4d}  {t}")

    # -- B. Tildelingskriterier --
    print("\n--- Tildelingskriterier ---")
    notices_with_criteria = [n for n in notices if n.get("award_criteria")]
    print(f"  Kunngjøringer med kriterier: {len(notices_with_criteria)} av {len(notices)}")

    price_weights = []
    criterion_names: Counter = Counter()
    for n in notices_with_criteria:
        for ac in n["award_criteria"]:
            name = ac.get("name") or "Ukjent"
            criterion_names[name] += 1
            if ac.get("type") == "price" and ac.get("weight_percent") is not None:
                price_weights.append(ac["weight_percent"])

    if price_weights:
        avg_price = sum(price_weights) / len(price_weights)
        price_dominant = sum(1 for w in price_weights if w > 50)
        quality_dominant = sum(1 for w in price_weights if w < 50)
        balanced = sum(1 for w in price_weights if w == 50)
        print(f"  Gjennomsnittlig prisvekt: {avg_price:.0f}%")
        print(f"  Pris-dominert (>50%): {price_dominant}")
        print(f"  Kvalitet-dominert (<50%): {quality_dominant}")
        print(f"  Balansert (50/50): {balanced}")

    print("\n  Mest brukte kriterienavn:")
    for name, c in criterion_names.most_common(8):
        print(f"    {c:4d}  {name[:60]}")

    # -- C. Miljø --
    print("\n--- Miljø (FOA § 7-9) ---")
    has_env_criterion = 0
    has_env_justification = 0
    no_env = 0
    not_applicable = 0
    for n in notices:
        acs = n.get("award_criteria") or []
        env_ac = any(
            ac.get("name") and "miljø" in ac["name"].lower() and (ac.get("weight_percent") or 0) > 0
            for ac in acs
        )
        has_justification = bool(n.get("env_justification"))
        env_code = n.get("env_criterion_code") or ""

        if env_ac or env_code == "quality-nor-env-criteria":
            has_env_criterion += 1
        elif has_justification or env_code == "quality-nor-env-spec":
            has_env_justification += 1
        elif acs:
            no_env += 1
        else:
            not_applicable += 1

    print(f"  Miljø vektet i tildelingskriteriene: {has_env_criterion}")
    print(f"  Miljø i kravspek (§ 7-9 unntak):    {has_env_justification}")
    print(f"  Uten miljøkrav i kunngjøringen:      {no_env}")
    print(f"  Ikke relevant (ingen kriterier):     {not_applicable}")

    # -- D. Verdier --
    print("\n--- Verdier ---")
    values = [v for v in (value_for(n) for n in notices) if v is not None and v > 0]
    if values:
        values_sorted = sorted(values)
        median = values_sorted[len(values_sorted) // 2]
        print(f"  Kunngjøringer med verdi: {len(values)} av {len(notices)}")
        print(f"    herav {len(matched_values)} koblet fra konkurransekunngjøring")
        print(f"  Total estimert verdi: {_fmt_nok(sum(values))} NOK")
        print(f"  Gjennomsnitt:         {_fmt_nok(sum(values) / len(values))} NOK")
        print(f"  Median:               {_fmt_nok(median)} NOK")

    frameworks = [n for n in notices if (n.get("framework_type") or "none") != "none"]
    fw_values = [n.get("framework_max_value") for n in frameworks if n.get("framework_max_value")]
    print(f"\n  Rammeavtaler: {len(frameworks)}")
    if fw_values:
        print(f"  Total ramme (maks): {_fmt_nok(sum(fw_values))} NOK")

    print("\n  Rammeavtaletype:")
    for ft, c in Counter(
        _FRAMEWORK_TYPE_LABELS.get(n.get("framework_type") or "", n.get("framework_type") or "")
        for n in notices if n.get("framework_type")
    ).most_common():
        print(f"    {c:4d}  {ft}")

    # -- E. Vinnere --
    tildelinger = [n for n in notices if n.get("winner")]
    print(f"\n--- Vinnere ({len(tildelinger)} tildelinger) ---")

    winner_data: dict[str, dict] = {}
    for n in tildelinger:
        w = n["winner"]
        if w not in winner_data:
            winner_data[w] = {"count": 0, "values": [], "price_weights": []}
        winner_data[w]["count"] += 1
        val = value_for(n)
        if val:
            winner_data[w]["values"].append(val)
        for ac in n.get("award_criteria") or []:
            if ac.get("type") == "price" and ac.get("weight_percent") is not None:
                winner_data[w]["price_weights"].append(ac["weight_percent"])

    print(f"\n  {'Leverandør':<40s} {'Ant':>4s} {'Verdi':>12s} {'Prisvekt':>8s}")
    print(f"  {'-' * 40} {'-' * 4} {'-' * 12} {'-' * 8}")
    for w, d in sorted(winner_data.items(), key=lambda x: -x[1]["count"]):
        total_val = sum(d["values"]) if d["values"] else None
        avg_pw = sum(d["price_weights"]) / len(d["price_weights"]) if d["price_weights"] else None
        pw_str = f"{avg_pw:.0f}%" if avg_pw is not None else "?"
        print(f"  {w[:40]:<40s} {d['count']:>4d} {_fmt_nok(total_val):>12s} {pw_str:>8s}")

    # -- F. Prisvekt vs kontraktsverdi --
    print("\n--- Prisvekt vs kontraktsverdi (topp 15) ---")
    print(f"\n  {'Verdi':>14s}  {'Pris':>5s}  {'Kval':>5s}  {'Vinner':<30s}  {'Tittel'}")
    print(f"  {'-' * 14}  {'-' * 5}  {'-' * 5}  {'-' * 30}  {'-' * 30}")

    ranked = sorted(tildelinger, key=lambda n: value_for(n) or 0, reverse=True)[:15]
    for n in ranked:
        val = value_for(n)
        acs = n.get("award_criteria") or []
        pw = next((ac["weight_percent"] for ac in acs if ac.get("type") == "price"), None)
        qw = sum(ac.get("weight_percent") or 0 for ac in acs if ac.get("type") == "quality")
        pw_str = f"{pw:.0f}%" if pw is not None else "?"
        qw_str = f"{qw:.0f}%" if qw else "?"
        val_str = f"{_fmt_nok(val):>14s}" if val else f"{'ukjent':>14s}"
        print(f"  {val_str}  {pw_str:>5s}  {qw_str:>5s}  {n['winner'][:30]:<30s}  {n['title'][:40]}")

    print()


def main() -> None:
    import logging

    parser = argparse.ArgumentParser(description="Porteføljeanalyse av Doffin-kunngjøringer.")
    parser.add_argument("--buyer", help="Søkestreng for oppdragsgiver")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("-o", "--output", help="Output-fil (default: stdout)")
    parser.add_argument("--no-enrich", action="store_true", help="Skip eForms XML-parsing")
    parser.add_argument("--max-pages", type=int, default=10, help="Maks antall søkesider")
    parser.add_argument("--summary", metavar="JSON_FILE", help="Porteføljeanalyse fra eksisterende JSON-fil")

    args = parser.parse_args()

    # Summary mode — read existing JSON, no API calls
    if args.summary:
        data = json.loads(Path(args.summary).read_text())
        _print_summary(data)
        return

    if not args.buyer:
        parser.error("--buyer er påkrevd (bruk --summary for analyse av eksisterende fil)")

    from app.doffin import DoffinClient

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
