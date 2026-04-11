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
import re
import subprocess
import sys
from io import StringIO
from pathlib import Path

_SRC_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _SRC_DIR.parent
sys.path.insert(0, str(_SRC_DIR))

GCP_PROJECT = "procurement-mcp"

_MAX_CRITERIA_COLS = 4

from eforms_labels import get_labels  # noqa: E402

# Artifik API notice types — not from eForms SDK, kept here.
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

# eForms labels from eforms-sdk-nor (with our UI overrides)
_PROCEDURE_LABELS = get_labels("procurement-procedure-type")
_CONTRACT_NATURE_LABELS = get_labels("contract-nature")
_FRAMEWORK_TYPE_LABELS = {
    **get_labels("framework-agreement"),
    "dps": "Dynamisk innkjøpsordning",  # from dps-usage, merged here for convenience
}

_CPV_GROUP_LABELS = {
    "09": "Petroleumsprodukter og energi",
    "18": "Klær og tekstiler",
    "30": "Kontor- og datautstyr",
    "34": "Transportutstyr",
    "35": "Sikkerhetsutstyr",
    "38": "Laboratorium- og presisjonsutstyr",
    "39": "Møbler og innredning",
    "42": "Industrimaskiner",
    "43": "Anleggsmaskiner",
    "44": "Byggevarer",
    "45": "Bygg og anlegg",
    "48": "Programvare",
    "50": "Vedlikehold og reparasjon",
    "55": "Hotell og restaurant",
    "60": "Transporttjenester",
    "64": "Post og telekommunikasjon",
    "65": "Energiforsyning",
    "71": "Arkitekt- og rådgivningstjenester",
    "72": "IT-tjenester",
    "77": "Landbruk og hagebruk",
    "79": "Konsulenttjenester",
    "85": "Helse og sosial",
    "90": "Avfall og rengjøring",
    "92": "Kultur og fritid",
    "98": "Andre tjenester",
}


def _normalize_org_id(raw: str) -> str:
    """Normalize org.nr: strip 'NO', spaces, 'MVA', keep only digits."""
    digits = re.sub(r"\D", "", raw)
    # Valid Norwegian org.nr is 9 digits
    return digits if len(digits) == 9 else ""


def _fetch_secret(name: str) -> str:
    result = subprocess.run(
        [
            "gcloud",
            "secrets",
            "versions",
            "access",
            "latest",
            f"--secret={name}",
            f"--project={GCP_PROJECT}",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _to_csv(notices: list[dict]) -> str:
    """Convert notices to CSV string."""
    buf = StringIO()
    headers = [
        "doffin_id",
        "title",
        "buyer_name",
        "buyer_org_id",
        "winner",
        "type",
        "status",
        "publication_date",
        "procedure_code",
        "contract_nature",
        "estimated_value",
        "currency",
    ]
    for i in range(1, _MAX_CRITERIA_COLS + 1):
        headers.extend(
            [
                f"award_criterion_{i}_name",
                f"award_criterion_{i}_type",
                f"award_criterion_{i}_weight",
            ]
        )
    headers.extend(
        [
            "selection_criteria_count",
            "env_criterion_code",
            "received_tenders",
            "framework_type",
            "framework_max_value",
        ]
    )

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
            if isinstance(n.get("estimated_value"), dict)
            else "",
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


def _normalize_title(title: str) -> str:
    """Normalize for fuzzy matching."""
    t = title.lower().strip()
    for prefix in [
        "åpen anbudskonkurranse - ",
        "åpen anbudskonkurranse for ",
        "åpen anbudskonkurranse for kjøp av ",
        "anskaffelse av ",
    ]:
        if t.startswith(prefix):
            t = t[len(prefix) :]
    return t


def _find_competition(title: str, competitions: dict[str, dict]) -> dict | None:
    """Find matching competition: exact normalized match, then substring containment."""
    norm = _normalize_title(title)
    comp = competitions.get(norm)
    if comp:
        return comp
    # Substring fallback: award title contains competition title or vice versa
    for comp_title, comp_notice in competitions.items():
        if len(comp_title) >= 10 and (comp_title in norm or norm in comp_title):
            return comp_notice
    return None


def _match_competitions(notices: list[dict]) -> dict[str, dict]:
    """Match awards to their competition announcement by title.

    Returns dict keyed by doffin_id with matched data (value, criteria).
    Only fills in fields the award is missing.
    """
    competitions: dict[str, dict] = {}
    for n in notices:
        if n.get("type") == "ANNOUNCEMENT_OF_COMPETITION":
            competitions[_normalize_title(n["title"])] = n

    matched: dict[str, dict] = {}
    for n in notices:
        if not n.get("winner"):
            continue
        comp = _find_competition(n["title"], competitions)
        if not comp:
            continue
        fill: dict = {}
        # Fill missing value
        if not _get_value(n):
            comp_val = _get_value(comp)
            if comp_val:
                fill["value"] = comp_val
        # Fill missing criteria
        if not n.get("award_criteria") and comp.get("award_criteria"):
            fill["award_criteria"] = comp["award_criteria"]
        if fill:
            matched[n["doffin_id"]] = fill
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
    matched = _match_competitions(notices)

    def value_for(n: dict) -> float | None:
        v = _get_value(n)
        if v:
            return v
        fill = matched.get(n.get("doffin_id", ""))
        return fill["value"] if fill and "value" in fill else None

    def criteria_for(n: dict) -> list[dict]:
        acs = n.get("award_criteria") or []
        if acs:
            return acs
        fill = matched.get(n.get("doffin_id", ""))
        return fill["award_criteria"] if fill and "award_criteria" in fill else []

    def _is_price_type(ac: dict) -> bool:
        return ac.get("type") in ("price", "cost")

    # -- A. Oversikt --
    print(f"{'=' * 60}")
    print(f"  PORTEFØLJEANALYSE: {search}")
    print(f"  {len(notices)} kunngjøringer")
    print(f"{'=' * 60}")

    from collections import Counter

    print("\n--- Kunngjøringstyper ---")
    for t, c in Counter(
        _NOTICE_TYPE_LABELS.get(n.get("type", ""), n.get("type", "")) for n in notices
    ).most_common():
        print(f"  {c:4d}  {t}")

    print("\n--- Prosedyre ---")
    procs = [n.get("procedure_code") or "" for n in notices if n.get("procedure_code")]
    for p, c in Counter(procs).most_common():
        print(f"  {c:4d}  {_PROCEDURE_LABELS.get(p, p)}")

    print("\n--- Kontraktstype ---")
    for t, c in Counter(
        _CONTRACT_NATURE_LABELS.get(
            n.get("contract_nature", ""), n.get("contract_nature", "")
        )
        for n in notices
        if n.get("contract_nature")
    ).most_common():
        print(f"  {c:4d}  {t}")

    # -- B. Tildelingskriterier --
    print("\n--- Tildelingskriterier ---")
    notices_with_criteria = [n for n in notices if criteria_for(n)]
    print(
        f"  Kunngjøringer med kriterier: {len(notices_with_criteria)} av {len(notices)}"
    )

    criterion_names: Counter = Counter()
    _PLACEHOLDER = "Price is not the only award criterion"
    for n in notices_with_criteria:
        for ac in criteria_for(n):
            name = ac.get("name")
            if name and name.startswith(_PLACEHOLDER):
                continue  # skip eForms placeholder text
            if not name:
                # Use type as fallback label
                name = {
                    "price": "Pris",
                    "quality": "Kvalitet",
                    "cost": "Pris (LCC)",
                }.get(ac.get("type") or "", "Ukjent")
            criterion_names[name] += 1

    # Price weight per notice (not per criterion)
    notice_price_weights = []
    for n in notices_with_criteria:
        acs = criteria_for(n)
        pw = sum(ac.get("weight_percent") or 0 for ac in acs if _is_price_type(ac))
        has_weight = any(ac.get("weight_percent") is not None for ac in acs)
        if has_weight:
            notice_price_weights.append(pw)

    if notice_price_weights:
        avg_price = sum(notice_price_weights) / len(notice_price_weights)
        price_dominant = sum(1 for w in notice_price_weights if w > 50)
        quality_dominant = sum(1 for w in notice_price_weights if w < 50)
        balanced = sum(1 for w in notice_price_weights if w == 50)
        print(f"  Gjennomsnittlig prisvekt: {avg_price:.0f}%")
        print(f"  Pris-dominert (>50%): {price_dominant}")
        print(f"  Kvalitet-dominert (<50%): {quality_dominant}")
        print(f"  Balansert (50/50): {balanced}")
        print(
            f"  Uten vekting: {len(notices_with_criteria) - len(notice_price_weights)}"
        )

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
            ac.get("name")
            and "miljø" in ac["name"].lower()
            and (ac.get("weight_percent") or 0) > 0
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

    # Separate frameworks and non-frameworks to avoid mixing value types
    frameworks = [n for n in notices if (n.get("framework_type") or "none") != "none"]
    non_frameworks = [
        n for n in notices if (n.get("framework_type") or "none") == "none"
    ]

    # Estimated values (non-framework contracts)
    nf_values = [
        v for v in (value_for(n) for n in non_frameworks) if v is not None and v > 0
    ]
    nf_matched = sum(
        1
        for n in non_frameworks
        if n["doffin_id"] in matched and "value" in matched[n["doffin_id"]]
    )
    if nf_values:
        nf_sorted = sorted(nf_values)
        nf_median = nf_sorted[len(nf_sorted) // 2]
        print("  Enkeltstående kontrakter (ikke rammeavtale):")
        print(f"    Med verdi: {len(nf_values)} av {len(non_frameworks)}")
        if nf_matched:
            print(f"      herav {nf_matched} koblet fra konkurransekunngjøring")
        print(f"    Total estimert verdi: {_fmt_nok(sum(nf_values))} NOK")
        print(
            f"    Gjennomsnitt:         {_fmt_nok(sum(nf_values) / len(nf_values))} NOK"
        )
        print(f"    Median:               {_fmt_nok(nf_median)} NOK")

    # Framework max values (separate from estimated)
    fw_max_values = [
        n.get("framework_max_value") for n in frameworks if n.get("framework_max_value")
    ]
    fw_est_values = [
        v for v in (value_for(n) for n in frameworks) if v is not None and v > 0
    ]
    fw_matched = sum(
        1
        for n in frameworks
        if n["doffin_id"] in matched and "value" in matched[n["doffin_id"]]
    )
    print(f"\n  Rammeavtaler: {len(frameworks)}")
    if fw_max_values:
        print(f"    Med maksverdi (tak): {len(fw_max_values)}")
        print(f"    Total maksverdi:     {_fmt_nok(sum(fw_max_values))} NOK")
    if fw_est_values:
        print(f"    Med estimert verdi:  {len(fw_est_values)}")
        if fw_matched:
            print(f"      herav {fw_matched} koblet fra konkurransekunngjøring")
        print(f"    Total estimert:      {_fmt_nok(sum(fw_est_values))} NOK")

    # Combined totals
    all_values = nf_values + fw_est_values
    if all_values:
        print(f"\n  Totalt (alle med verdi): {len(all_values)} kunngjøringer")
        print(f"    Samlet estimert verdi: {_fmt_nok(sum(all_values))} NOK")

    fw_types = Counter(
        _FRAMEWORK_TYPE_LABELS.get(
            n.get("framework_type") or "", n.get("framework_type") or ""
        )
        for n in frameworks
    )
    if fw_types:
        print("\n  Rammeavtaletype:")
        for ft, c in fw_types.most_common():
            print(f"    {c:4d}  {ft}")

    # -- E. Vinnere --
    tildelinger = [n for n in notices if n.get("winner")]
    print(f"\n--- Vinnere ({len(tildelinger)} tildelinger) ---")

    # Build org_id lookup from winner_details (normalized)
    _org_id_for_name: dict[str, str] = {}
    for n in tildelinger:
        for wd in n.get("winner_details") or []:
            norm = _normalize_org_id(wd.get("org_id") or "")
            if norm:
                _org_id_for_name[wd["name"].lower()] = norm

    # Split comma-separated winners so each firm is counted individually
    # Use normalized org_id for dedup when available, fall back to case-insensitive name
    winner_data: dict[str, dict] = {}
    winner_display: dict[str, str] = {}
    winner_org_ids: dict[str, str] = {}
    for n in tildelinger:
        winners = [w.strip() for w in n["winner"].split(",") if w.strip()]
        val = value_for(n)
        pw_list = [
            ac["weight_percent"]
            for ac in criteria_for(n)
            if _is_price_type(ac) and ac.get("weight_percent") is not None
        ]
        share = val / len(winners) if val and len(winners) > 1 else val
        for w in winners:
            org_id = _org_id_for_name.get(w.lower(), "")
            key = org_id if org_id else w.lower()
            if key not in winner_data:
                winner_data[key] = {"count": 0, "values": [], "price_weights": []}
                winner_display[key] = w
                winner_org_ids[key] = org_id
            winner_data[key]["count"] += 1
            if share:
                winner_data[key]["values"].append(share)
            winner_data[key]["price_weights"].extend(pw_list)

    print(
        f"\n  {'Leverandør':<40s} {'Org.nr':<10s} {'Ant':>4s} {'Verdi':>12s} {'Prisvekt':>8s}"
    )
    print(f"  {'-' * 40} {'-' * 10} {'-' * 4} {'-' * 12} {'-' * 8}")
    for key, d in sorted(winner_data.items(), key=lambda x: -x[1]["count"]):
        total_val = sum(d["values"]) if d["values"] else None
        avg_pw = (
            sum(d["price_weights"]) / len(d["price_weights"])
            if d["price_weights"]
            else None
        )
        pw_str = f"{avg_pw:.0f}%" if avg_pw is not None else "?"
        name = winner_display[key]
        org_id = winner_org_ids.get(key, "")
        print(
            f"  {name[:40]:<40s} {org_id:<10s} {d['count']:>4d} {_fmt_nok(total_val):>12s} {pw_str:>8s}"
        )

    # -- G. CPV-kategorier --
    print("\n--- Kategorier (CPV) ---")
    cpv_groups: Counter = Counter()
    for n in notices:
        for cpv in n.get("cpv_codes") or []:
            code = str(cpv) if not isinstance(cpv, str) else cpv
            group = code[:2]
            cpv_groups[group] += 1
    for group, c in cpv_groups.most_common(8):
        label = _CPV_GROUP_LABELS.get(group, f"Gruppe {group}")
        print(f"  {c:4d}  {group}xxx  {label}")

    # -- Kontraktsvarighet --
    durations_by_nature: dict[str, list[float]] = {}
    for n in notices:
        dm = n.get("duration_months")
        if dm and dm > 0:
            nature = _CONTRACT_NATURE_LABELS.get(n.get("contract_nature", ""), "Ukjent")
            durations_by_nature.setdefault(nature, []).append(dm)
    all_durations = [d for ds in durations_by_nature.values() for d in ds]
    if all_durations:
        print("\n--- Kontraktsvarighet ---")
        sorted_dur = sorted(all_durations)
        median_dur = sorted_dur[len(sorted_dur) // 2]
        avg_dur = sum(all_durations) / len(all_durations)
        print(f"  Kunngjøringer med varighet: {len(all_durations)}")
        print(f"  Gjennomsnitt: {avg_dur:.0f} mnd")
        print(f"  Median:       {median_dur:.0f} mnd")
        if len(durations_by_nature) > 1:
            print("\n  Per kontraktstype:")
            for nature, ds in sorted(
                durations_by_nature.items(), key=lambda x: -len(x[1])
            ):
                s = sorted(ds)
                med = s[len(s) // 2]
                print(
                    f"    {nature:<20s}  {len(ds):3d} stk  snitt {sum(ds) / len(ds):.0f} mnd  median {med:.0f} mnd"
                )

    # -- H. Konkurranseintensitet --
    print("\n--- Konkurranseintensitet ---")
    award_tender_counts = [
        n["received_tenders"]
        for n in tildelinger
        if n.get("received_tenders") is not None
    ]
    if award_tender_counts:
        sorted_tc = sorted(award_tender_counts)
        median_tc = sorted_tc[len(sorted_tc) // 2]
        avg_tc = sum(award_tender_counts) / len(award_tender_counts)
        solo = sum(1 for t in award_tender_counts if t == 1)
        print(
            f"  Tildelinger med tilbudsdata: {len(award_tender_counts)} av {len(tildelinger)}"
        )
        print(f"  Gjennomsnitt mottatte tilbud: {avg_tc:.1f}")
        print(f"  Median:                       {median_tc}")
        print(
            f"  Bare 1 tilbud:                {solo} ({solo * 100 // len(award_tender_counts)}%)"
        )

        buckets = [
            ("1 tilbud", lambda t: t == 1),
            ("2-3", lambda t: 2 <= t <= 3),
            ("4-5", lambda t: 4 <= t <= 5),
            ("6+", lambda t: t >= 6),
        ]
        max_count = max(
            sum(1 for t in award_tender_counts if fn(t)) for _, fn in buckets
        )
        scale = max(1, max_count // 10)
        print("\n  Fordeling:")
        for label, fn in buckets:
            cnt = sum(1 for t in award_tender_counts if fn(t))
            if cnt == 0:
                continue
            bar = "\u2588" * (cnt // scale)
            print(f"    {label:>10s}: {cnt:3d}  {bar}")

    # -- I. Tidslinje --
    from datetime import date as Date

    competitions_by_title: dict[str, dict] = {}
    for n in notices:
        if n.get("type") == "ANNOUNCEMENT_OF_COMPETITION":
            competitions_by_title[_normalize_title(n["title"])] = n

    timeline_pub_days: list[int] = []
    timeline_deadline_days: list[int] = []
    for n in notices:
        if n.get("type") not in (
            "ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT",
            "RESULT",
        ):
            continue
        comp = _find_competition(n["title"], competitions_by_title)
        if not comp:
            continue
        try:
            d_award = Date.fromisoformat(n["publication_date"][:10])
            # Kunngjøring → tildeling
            d_comp = Date.fromisoformat(comp["publication_date"][:10])
            days = (d_award - d_comp).days
            if days > 0:
                timeline_pub_days.append(days)
            # Tilbudsfrist → tildeling
            deadline = comp.get("submission_deadline")
            if deadline:
                d_deadline = Date.fromisoformat(deadline[:10])
                dl_days = (d_award - d_deadline).days
                if dl_days > 0:
                    timeline_deadline_days.append(dl_days)
        except (KeyError, ValueError, TypeError):
            continue

    def _print_timeline(label: str, days_list: list[int]) -> None:
        sorted_days = sorted(days_list)
        median_days = sorted_days[len(sorted_days) // 2]
        avg_days = sum(days_list) / len(days_list)
        print(f"\n  {label} ({len(days_list)} par):")
        print(f"    Gjennomsnitt: {avg_days:.0f} dager")
        print(f"    Median:       {median_days} dager")
        print(f"    Raskest:      {sorted_days[0]} dager")
        print(f"    Tregest:      {sorted_days[-1]} dager")

        tl_buckets = [
            ("<60 dager", lambda d: d < 60),
            ("60-90", lambda d: 60 <= d <= 90),
            ("90-180", lambda d: 90 < d <= 180),
            ("180-365", lambda d: 180 < d <= 365),
            (">365", lambda d: d > 365),
        ]
        max_tl = max(sum(1 for d in days_list if fn(d)) for _, fn in tl_buckets)
        tl_scale = max(1, max_tl // 10)
        print("    Fordeling:")
        for bucket_label, fn in tl_buckets:
            cnt = sum(1 for d in days_list if fn(d))
            if cnt == 0:
                continue
            bar = "\u2588" * (cnt // tl_scale)
            print(f"      {bucket_label:>10s}: {cnt:3d}  {bar}")

    if timeline_pub_days or timeline_deadline_days:
        print("\n--- Tidslinje ---")
    if timeline_pub_days:
        _print_timeline("Kunngjøring \u2192 tildeling", timeline_pub_days)
    if timeline_deadline_days:
        _print_timeline("Tilbudsfrist \u2192 tildeling", timeline_deadline_days)

    # -- J. Avlyste --
    cancelled = [
        n
        for n in notices
        if n.get("type") == "CANCELLED_OR_MISSING_CONCLUSION_OF_CONTRACT"
    ]
    if cancelled:
        with_tenders = sum(1 for n in cancelled if (n.get("received_tenders") or 0) > 0)
        without = len(cancelled) - with_tenders
        print(f"\n--- Avlyste/ingen tildeling ({len(cancelled)}) ---")
        print(f"  Med mottatte tilbud: {with_tenders}")
        print(f"  Uten tilbud:         {without}")

    # -- K. Planlegging → konkurranse --
    planning = [
        n
        for n in notices
        if n.get("type") in ("ADVISORY_NOTICE", "PRE_ANNOUNCEMENT", "PLANNING")
    ]
    if planning:
        converted = 0
        for p in planning:
            if _find_competition(p["title"], competitions_by_title):
                converted += 1
        print("\n--- Planlegging \u2192 konkurranse ---")
        print(f"  Veiledende/forhåndskunngjøringer: {len(planning)}")
        print(f"  Ble til konkurranse:              {converted}")
        print(f"  Ikke (ennå) utlyst:               {len(planning) - converted}")

    # -- F. Prisvekt vs kontraktsverdi --
    # Expand each award into per-winner rows with split value
    award_rows = []
    has_low_pw = False
    for n in tildelinger:
        val = value_for(n)
        acs = criteria_for(n)
        pw = next((ac["weight_percent"] for ac in acs if _is_price_type(ac)), None)
        qw = sum(
            ac.get("weight_percent") or 0 for ac in acs if ac.get("type") == "quality"
        )
        total_weight = sum(ac.get("weight_percent") or 0 for ac in acs)
        low_pw = total_weight > 0 and total_weight < 10
        if low_pw:
            has_low_pw = True
        winners = [w.strip() for w in n["winner"].split(",") if w.strip()]
        share = val / len(winners) if val and len(winners) > 1 else val
        for w in winners:
            award_rows.append(
                {
                    "winner": w,
                    "value": share,
                    "pw": pw,
                    "qw": qw,
                    "title": n["title"],
                    "n_winners": len(winners),
                    "low_pw": low_pw,
                }
            )

    print("\n--- Prisvekt vs kontraktsverdi (topp 15) ---")
    print(
        f"\n  {'Verdi':>14s}  {'Pris':>5s}  {'Kval':>5s}  {'Vinner':<30s}  {'Tittel'}"
    )
    print(f"  {'-' * 14}  {'-' * 5}  {'-' * 5}  {'-' * 30}  {'-' * 30}")

    ranked = sorted(award_rows, key=lambda r: r["value"] or 0, reverse=True)[:15]
    for r in ranked:
        mark = " *" if r.get("low_pw") else ""
        pw_str = f"{r['pw']:.0f}%{mark}" if r["pw"] is not None else "?"
        qw_str = f"{r['qw']:.0f}%" if r["qw"] else "?"
        val_str = f"{_fmt_nok(r['value']):>14s}" if r["value"] else f"{'ukjent':>14s}"
        print(
            f"  {val_str}  {pw_str:>5s}  {qw_str:>5s}  {r['winner'][:30]:<30s}  {r['title'][:40]}"
        )

    if has_low_pw:
        print(
            "\n  * Prisvekt under 10% — mulig samspill/BVP eller datakvalitetsproblem"
        )

    print()


_EFORMS_FIELDS = [
    "award_criteria",
    "selection_criteria",
    "procedure_code",
    "contract_nature",
    "env_criterion_code",
    "env_justification",
    "framework_type",
    "framework_max_value",
    "submission_deadline",
    "duration_months",
    "framework_max_participants",
]


def _reprocess(args: argparse.Namespace) -> None:
    """Re-enrich existing JSON from eForms cache. No Doffin API calls."""
    import logging

    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)

    data = json.loads(Path(args.reprocess).read_text())
    notices = data.get("notices") or []
    cache_dir = _PROJECT_ROOT / ".cache" / "eforms"

    updated = 0
    for n in notices:
        doffin_id = n.get("doffin_id")
        if not doffin_id:
            continue

        # Re-enrich from eForms cache
        cache_file = cache_dir / f"{doffin_id}.json"
        if cache_file.exists():
            eforms = json.loads(cache_file.read_text())
            for field in _EFORMS_FIELDS:
                n[field] = eforms.get(field)

        # Rebuild winner_details from lots data
        lots = n.get("lots") or []
        winner_details: list[dict[str, str]] = []
        seen_keys: set[str] = set()
        for lot in lots:
            for w in lot.get("winner") or []:
                name = w.get("name") or ""
                org_id = w.get("organizationId") or ""
                key = org_id if org_id else name
                if name and key not in seen_keys:
                    seen_keys.add(key)
                    winner_details.append({"name": name, "org_id": org_id})
        if winner_details:
            n["winner_details"] = winner_details

        updated += 1

    logging.info("Re-beriket %d/%d kunngjøringer fra cache.", updated, len(notices))

    output = json.dumps(data, ensure_ascii=False, indent=2)
    out_path = args.output or args.reprocess
    Path(out_path).write_text(output)
    logging.info("Skrevet til %s", out_path)


def main() -> None:
    import logging

    parser = argparse.ArgumentParser(
        description="Porteføljeanalyse av Doffin-kunngjøringer."
    )
    parser.add_argument("--buyer", help="Søkestreng for oppdragsgiver")
    parser.add_argument("--format", choices=["json", "csv"], default="json")
    parser.add_argument("-o", "--output", help="Output-fil (default: stdout)")
    parser.add_argument(
        "--no-enrich", action="store_true", help="Skip eForms XML-parsing"
    )
    parser.add_argument(
        "--max-pages", type=int, default=10, help="Maks antall søkesider"
    )
    parser.add_argument(
        "--summary",
        metavar="JSON_FILE",
        help="Porteføljeanalyse fra eksisterende JSON-fil",
    )
    parser.add_argument(
        "--reprocess",
        metavar="JSON_FILE",
        help="Re-berik eksisterende JSON fra eForms-cache (ingen API-kall)",
    )

    args = parser.parse_args()

    # Summary mode — read existing JSON, no API calls
    if args.summary:
        data = json.loads(Path(args.summary).read_text())
        _print_summary(data)
        return

    # Reprocess mode — re-enrich from eForms cache, no Doffin API calls
    if args.reprocess:
        _reprocess(args)
        return

    if not args.buyer:
        parser.error(
            "--buyer er påkrevd (bruk --summary for analyse av eksisterende fil)"
        )

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
