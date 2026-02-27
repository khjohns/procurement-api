"""CLI entry point for protokoll generator.

Usage:
    python -m protokoll              # interactive selection
    python -m protokoll --id 1795    # specific procurement
    python -m protokoll --list       # just list procurements
"""

from __future__ import annotations

import itertools
import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

# Add src/ to path so we can import ArtifikClient and protokoll package
_SRC_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _SRC_DIR.parent
sys.path.insert(0, str(_SRC_DIR))

from app.client import ArtifikClient  # noqa: E402
from protokoll.common import (  # noqa: E402
    fmt_date,
    get_activities_by_action,
    get_timeline_date,
    parse_submission_deadline,
)

GCP_PROJECT = "procurement-mcp"


# -- Terminal formatting -----------------------------------------------------

_COLOR = hasattr(sys.stderr, "isatty") and sys.stderr.isatty()


def _style(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _COLOR else text


def _bold(text: str) -> str:
    return _style(text, "1")


def _dim(text: str) -> str:
    return _style(text, "2")


def _green(text: str) -> str:
    return _style(text, "32")


def _yellow(text: str) -> str:
    return _style(text, "33")


def _red(text: str) -> str:
    return _style(text, "31")


def _cyan(text: str) -> str:
    return _style(text, "36")


class _Spinner:
    """Minimal terminal spinner for long-running operations."""

    _FRAMES = ["   ", ".  ", ".. ", "..."]

    def __init__(self, message: str) -> None:
        self._message = message
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def __enter__(self) -> _Spinner:
        self._stop.clear()
        self._thread = threading.Thread(target=self._spin, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *_: Any) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join()
        print("\r\033[K", end="", file=sys.stderr)

    def _spin(self) -> None:
        for frame in itertools.cycle(self._FRAMES):
            if self._stop.is_set():
                break
            print(f"\r  {_dim(self._message)}{frame}", end="", file=sys.stderr)
            time.sleep(0.3)


def _step(number: int, total: int, text: str) -> None:
    print(f"\n  {_dim(f'[{number}/{total}]')} {_bold(text)}", file=sys.stderr)


def _ok(text: str) -> None:
    print(f"  {_green('✓')} {text}", file=sys.stderr)


def _warn(text: str) -> None:
    print(f"  {_yellow('!')} {text}", file=sys.stderr)


def _die(msg: str) -> None:
    print(f"\n  {_red('Feil:')} {msg}\n", file=sys.stderr)
    sys.exit(1)


# -- GCP Secret Manager -----------------------------------------------------

def _fetch_secret(name: str) -> str:
    """Fetch a secret from GCP Secret Manager via gcloud CLI."""
    try:
        result = subprocess.run(
            [
                "gcloud", "secrets", "versions", "access", "latest",
                f"--secret={name}",
                f"--project={GCP_PROJECT}",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        _die(f"Kunne ikke hente secret '{name}': {e}")
        return ""  # unreachable


def _get_client() -> ArtifikClient:
    with _Spinner("Henter secrets fra GCP"):
        api_id = _fetch_secret("vendor-api-id")
        api_key = _fetch_secret("vendor-api-key")
    _ok("Secrets hentet")
    return ArtifikClient(client_id=api_id, client_secret=api_key)


# -- Procurement listing & selection -----------------------------------------

def _is_mature(procurement: dict) -> bool:
    """Check if procurement is past submission deadline and not a template."""
    if procurement.get("isTemplate"):
        return False
    if procurement.get("isCancelled"):
        return False
    deadline = parse_submission_deadline(procurement)
    if not deadline:
        return False
    return datetime.now(deadline.tzinfo) > deadline


def _richness(p: dict) -> int:
    """Score how much data a procurement object contains."""
    return sum(1 for v in p.values() if v is not None and v != "" and v != [] and v != {})


def _dedup_by_sequence_id(procs: list[dict]) -> list[dict]:
    """Deduplicate procurements by sequenceId, keeping the richest one."""
    best: dict[str, dict] = {}
    for p in procs:
        seq = p.get("sequenceId") or str(p.get("id"))
        existing = best.get(seq)
        if existing is None or _richness(p) > _richness(existing):
            best[seq] = p
    return list(best.values())


def _list_procurements(client: ArtifikClient) -> list[dict]:
    """Fetch and filter mature procurements."""
    with _Spinner("Henter anskaffelser fra Artifik"):
        all_procs = client.list_procurements()
    mature = [p for p in all_procs if _is_mature(p)]
    mature = _dedup_by_sequence_id(mature)
    mature.sort(key=lambda p: get_timeline_date(p, "submission") or "", reverse=True)
    _ok(f"{len(mature)} anskaffelser med passert tilbudsfrist (av {len(all_procs)} totalt)")
    return mature


THRESHOLD_SHORT = {
    "over_eea_threshold_value": "Over EØS",
    "below_eea_threshold_value": "Under EØS",
    "national_threshold": "Nasjonal",
    "below_national_threshold": "Under terskel",
}

PROCEDURE_SHORT = {
    "Open": "Åpen",
    "Limited": "Begrenset",
    "Competitive negotiated": "Forhandl.",
    "Competitive dialogue": "Dialog",
    "Innovation partnership": "Innovasjon",
    "Negotiated without publication": "Utenkunng.",
    "Direct award": "Direkte",
}


def _color_threshold(raw: str, label: str) -> str:
    if raw == "over_eea_threshold_value":
        return _style(label, "1;35")
    if raw == "below_eea_threshold_value":
        return _cyan(label)
    return _dim(label)


def _color_procedure(raw: str, label: str) -> str:
    if raw in ("Competitive negotiated", "Competitive dialogue", "Innovation partnership"):
        return _yellow(label)
    if raw in ("Negotiated without publication", "Direct award"):
        return _style(label, "33;2")
    return label


def _strip_html_simple(text: str) -> str:
    """Minimal HTML strip for display purposes."""
    import html as html_mod
    import re
    text = re.sub(r"<[^>]+>", "", text)
    return html_mod.unescape(text).strip()


def _truncate(text: str, width: int) -> str:
    return text if len(text) <= width else text[: width - 1] + "\u2026"


_COL_NR = 3
_COL_ID = 6
_COL_PROC = 12
_COL_THRESH = 14
_COL_FRIST = 12


def _print_procurement_list(procs: list[dict]) -> None:
    """Print a formatted, numbered list of procurements."""
    try:
        term_w = os.get_terminal_size().columns
    except OSError:
        term_w = 100
    fixed = 2 + _COL_NR + 2 + _COL_ID + 2 + _COL_PROC + _COL_THRESH + _COL_FRIST
    name_w = max(20, term_w - fixed)

    header = (
        f"{'#':>{_COL_NR}}  "
        f"{'ID':>{_COL_ID}}  "
        f"{'Prosedyre':<{_COL_PROC}}"
        f"{'Terskel':<{_COL_THRESH}}"
        f"{'Frist':<{_COL_FRIST}}"
        f"Navn"
    )
    print(f"\n  {_dim(header)}", file=sys.stderr)
    print(f"  {_dim('─' * min(term_w - 4, 96))}", file=sys.stderr)

    for i, p in enumerate(procs, 1):
        pid = p.get("id", "?")
        proc_raw = p.get("procedure", "")
        proc_label = PROCEDURE_SHORT.get(proc_raw, "?")
        thresh_raw = p.get("threshold") or ""
        thresh_label = THRESHOLD_SHORT.get(thresh_raw, thresh_raw or "?")
        deadline = fmt_date(get_timeline_date(p, "submission"))[:10]
        name = p.get("name") or "?"
        seq = p.get("sequenceId") or ""
        label = _truncate(name, name_w)
        seq_str = f" {_dim(seq)}" if seq else ""

        proc_padded = f"{proc_label:<{_COL_PROC}}"
        thresh_padded = f"{thresh_label:<{_COL_THRESH}}"
        frist_padded = f"{deadline:<{_COL_FRIST}}"

        print(
            f"  {_bold(f'{i:>{_COL_NR}}')}"
            f"  {_dim(f'{pid:>{_COL_ID}}')}"
            f"  {_color_procedure(proc_raw, proc_padded)}"
            f"{_color_threshold(thresh_raw, thresh_padded)}"
            f"{_dim(frist_padded)}"
            f"{label}{seq_str}",
            file=sys.stderr,
        )

    print(file=sys.stderr)


def _select_procurement(procs: list[dict]) -> dict:
    """Let user pick a procurement interactively."""
    _print_procurement_list(procs)
    while True:
        try:
            choice = input(f"  Velg anskaffelse {_dim(f'(1-{len(procs)})')}: ").strip()
        except (EOFError, KeyboardInterrupt):
            print(file=sys.stderr)
            sys.exit(0)
        if not choice:
            continue
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(procs):
                return procs[idx]
        except ValueError:
            pass
        print(f"  {_yellow('?')} Skriv et tall mellom 1 og {len(procs)}", file=sys.stderr)


# -- Summary -----------------------------------------------------------------

def _print_summary(procurement: dict, activities: list[dict], path: str) -> None:
    """Print a summary of what was generated and what needs manual work."""
    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    doffin = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish = get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")
    awards = get_activities_by_action(activities, "AWARDING_PARTICIPANTS")

    print(file=sys.stderr)
    print(f"  {_bold('Generert:')} {path}", file=sys.stderr)
    print(file=sys.stderr)

    auto = []
    if procurement.get("about_procurer"):
        auto.append("Oppdragsgiver")
    if procurement.get("name"):
        auto.append("Beskrivelse")
    if procurement.get("procedure"):
        auto.append("Prosedyre")
    if doffin or publish:
        auto.append("Kunngjøring")
    if submissions:
        auto.append(f"{len(submissions)} tilbud mottatt")
    if rejections:
        auto.append(f"{len(rejections)} avvisninger")
    if awards:
        auto.append("Tildelingsdato")

    if auto:
        print(f"  {_green('Fylt fra API:')}  {', '.join(auto)}", file=sys.stderr)

    manual = [
        "Kvalifikasjonsvurdering",
        "Tildelingsbegrunnelse",
        "Delkontrakt-begrunnelse",
        "Meddelelsesbrev/karens",
    ]
    if rejections:
        manual.append("Avvisningsbegrunnelser")
    manual.extend(["Underleverandorer", "Inhabilitet"])

    print(
        f"  {_yellow('Trenger utfylling:')}  {', '.join(manual)}",
        file=sys.stderr,
    )

    if path.endswith(".md"):
        result_text = Path(path).read_text()
        manual_count = result_text.count("<!-- MANUELT")
        if manual_count:
            print(
                f"\n  {_dim(f'Søk etter MANUELT i filen — {manual_count} steder trenger oppmerksomhet.')}",
                file=sys.stderr,
            )
    elif path.endswith(".docx"):
        print(
            f"\n  {_dim('Åpne filen — felter med gul bakgrunn trenger utfylling.')}",
            file=sys.stderr,
        )
    print(file=sys.stderr)


# -- Main --------------------------------------------------------------------

def main() -> None:
    import argparse

    from protokoll import generate_protokoll, _HAS_DOCX

    parser = argparse.ArgumentParser(
        description="Generer anskaffelsesprotokoll fra Artifik API.",
    )
    parser.add_argument("--id", type=int, help="Procurement ID (skipper interaktiv velging)")
    parser.add_argument("--list", action="store_true", dest="list_only", help="Bare list anskaffelser, ikke generer protokoll")
    parser.add_argument("-o", "--output", help="Output-fil (default: docs/protokoller/protokoll-{sequenceId}.docx)")
    parser.add_argument("--format", choices=["docx", "md"], default="docx", help="Output-format (default: docx)")

    args = parser.parse_args()

    # Banner
    print(file=sys.stderr)
    print(f"  {_bold('Protokollgenerator')}", file=sys.stderr)
    print(f"  {_dim('Anskaffelsesprotokoll fra Artifik API')}", file=sys.stderr)
    print(file=sys.stderr)

    # Step 1: Connect
    _step(1, 3, "Kobler til Artifik API")
    client = _get_client()

    # Step 2: List
    _step(2, 3, "Henter anskaffelser")
    procurements = _list_procurements(client)

    if not procurements:
        _die("Ingen modne anskaffelser funnet (passert tilbudsfrist, ikke kansellert/mal).")

    if args.list_only:
        _print_procurement_list(procurements)
        return

    # Select procurement
    if args.id:
        matches = [p for p in procurements if p.get("id") == args.id]
        if not matches:
            all_procs = client.list_procurements()
            matches = [p for p in all_procs if p.get("id") == args.id]
            if not matches:
                _die(f"Fant ingen anskaffelse med ID {args.id}.")
        procurement = matches[0]
    else:
        procurement = _select_procurement(procurements)

    pid = procurement["id"]
    seq_id = procurement.get("sequenceId") or str(pid)
    name = procurement.get("name") or ""
    print(
        f"  {_green('>')} {_bold(seq_id)} — {name}",
        file=sys.stderr,
    )
    print(file=sys.stderr)

    # Step 3: Generate
    _step(3, 3, "Genererer protokoll")

    with _Spinner("Henter aktivitetslogg"):
        activities = client.get_procurement_activities(pid)
    _ok(f"{len(activities)} hendelser")

    fmt = args.format
    threshold = procurement.get("threshold") or ""
    is_del2 = threshold in ("below_eea_threshold_value", "national_threshold")

    if is_del2:
        _ok(f"Del II-protokoll (terskel: {THRESHOLD_SHORT.get(threshold, threshold)})")
    else:
        _ok(f"Del III-protokoll (terskel: {THRESHOLD_SHORT.get(threshold, threshold)})")

    if fmt == "md":
        result = generate_protokoll(procurement, activities)
        output_path = args.output or str(_PROJECT_ROOT / f"docs/protokoller/protokoll-{seq_id.lower()}.md")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_text(result)
    else:
        if not _HAS_DOCX:
            _die("python-docx er ikke installert. Kjør: pip install python-docx")
        from protokoll import generate_protokoll_docx, generate_protokoll_docx_del2
        if is_del2:
            doc = generate_protokoll_docx_del2(procurement, activities)
        else:
            doc = generate_protokoll_docx(procurement, activities)
        output_path = args.output or str(_PROJECT_ROOT / f"docs/protokoller/protokoll-{seq_id.lower()}.docx")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        doc.save(output_path)

    _print_summary(procurement, activities, output_path)


if __name__ == "__main__":
    main()
