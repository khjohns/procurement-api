#!/usr/bin/env python3
"""
Syklomatisk kompleksitet per fil i SvelteKit-frontenden.

Måler beslutningspunkter (DD) i:
  - <script>-blokker: if, else if, for, while, switch case, ternary (?),
    logical operators (&&, ||, ??), catch, optional chaining (?.)
  - Svelte-templater: {#if}, {:else if}, {#each}, {#await}, {:catch}

Syklomatisk kompleksitet CC = 1 + antall beslutningspunkter per fil.

Bruk:
  python scripts/svelte_complexity.py               # alle filer
  python scripts/svelte_complexity.py --threshold 10  # bare filer over grensen
  python scripts/svelte_complexity.py --json        # JSON-output
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).parent.parent
FRONTEND_SRC = ROOT / "src" / "frontend" / "src"

# ── Beslutningspunkter i JS/TS-kode ─────────────────────────────────────────

# Keyword-baserte: if, else if, for, while, switch case, catch, ternary ?
# Teller IKKE bare "else" (ikke et eget beslutningspunkt i standard CC)
JS_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("if",          re.compile(r'\bif\s*\(')),
    ("else if",     re.compile(r'\belse\s+if\s*\(')),
    ("for",         re.compile(r'\bfor\s*\(')),
    ("while",       re.compile(r'\bwhile\s*\(')),
    ("case",        re.compile(r'\bcase\s+.+:')),
    ("catch",       re.compile(r'\bcatch\s*[(\s]')),
    ("ternary",     re.compile(r'(?<![!<>=?])(?<!\?)(\?(?!\?))(?!=)')),  # ? men ikke ?? eller ?.
    ("&&",          re.compile(r'&&')),
    ("||",          re.compile(r'\|\|')),
    ("??",          re.compile(r'\?\?')),
]

# ── Svelte-template beslutningspunkter ──────────────────────────────────────

SVELTE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("{#if}",       re.compile(r'\{#if\b')),
    ("{:else if}",  re.compile(r'\{:else\s+if\b')),
    ("{#each}",     re.compile(r'\{#each\b')),
    ("{#await}",    re.compile(r'\{#await\b')),
    ("{:catch}",    re.compile(r'\{:catch\b')),
]


@dataclass
class FileResult:
    path: Path
    cc: int
    breakdown: dict[str, int] = field(default_factory=dict)
    lines: int = 0

    @property
    def relative_path(self) -> str:
        try:
            return str(self.path.relative_to(ROOT))
        except ValueError:
            return str(self.path)

    @property
    def rating(self) -> str:
        if self.cc <= 5:
            return "lav"
        if self.cc <= 10:
            return "moderat"
        if self.cc <= 20:
            return "høy"
        return "kritisk"


def strip_comments(code: str) -> str:
    """Fjern linje- og blokk-kommentarer fra JS/TS-kode."""
    # Blokk-kommentarer
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    # Linje-kommentarer
    code = re.sub(r'//[^\n]*', '', code)
    return code


def strip_strings(code: str) -> str:
    """Fjern string-literals for å unngå falske treff."""
    # Template literals (grov tilnærming — ikke nøstet)
    code = re.sub(r'`[^`]*`', '""', code, flags=re.DOTALL)
    # Doble og enkle anførsels­tegn
    code = re.sub(r'"(?:[^"\\]|\\.)*"', '""', code)
    code = re.sub(r"'(?:[^'\\]|\\.)*'", "''", code)
    return code


def extract_script_blocks(svelte_src: str) -> str:
    """Hent ut innholdet i alle <script>-blokker fra en .svelte-fil."""
    blocks = re.findall(r'<script[^>]*>(.*?)</script>', svelte_src, flags=re.DOTALL)
    return '\n'.join(blocks)


def extract_template(svelte_src: str) -> str:
    """Fjern <script>- og <style>-blokker og returner ren template."""
    src = re.sub(r'<script[^>]*>.*?</script>', '', svelte_src, flags=re.DOTALL)
    src = re.sub(r'<style[^>]*>.*?</style>', '', src, flags=re.DOTALL)
    return src


def count_patterns(text: str, patterns: list[tuple[str, re.Pattern]]) -> dict[str, int]:
    return {name: len(pat.findall(text)) for name, pat in patterns}


def analyse_svelte(path: Path) -> FileResult:
    src = path.read_text(encoding='utf-8')
    lines = src.count('\n') + 1

    # Script-blokker
    script = extract_script_blocks(src)
    script_clean = strip_strings(strip_comments(script))
    js_counts = count_patterns(script_clean, JS_PATTERNS)

    # Template
    template = extract_template(src)
    tpl_counts = count_patterns(template, SVELTE_PATTERNS)

    breakdown = {**js_counts, **tpl_counts}
    total_decisions = sum(breakdown.values())
    cc = 1 + total_decisions

    return FileResult(path=path, cc=cc, breakdown=breakdown, lines=lines)


def analyse_ts(path: Path) -> FileResult:
    src = path.read_text(encoding='utf-8')
    lines = src.count('\n') + 1

    clean = strip_strings(strip_comments(src))
    breakdown = count_patterns(clean, JS_PATTERNS)

    total_decisions = sum(breakdown.values())
    cc = 1 + total_decisions

    return FileResult(path=path, cc=cc, breakdown=breakdown, lines=lines)


def analyse_file(path: Path) -> FileResult:
    if path.suffix == '.svelte':
        return analyse_svelte(path)
    return analyse_ts(path)


RATING_COLOR = {
    "lav":      "\033[32m",   # grønn
    "moderat":  "\033[33m",   # gul
    "høy":      "\033[91m",   # oransje/rød
    "kritisk":  "\033[31m",   # rød
}
RESET = "\033[0m"


def print_table(results: list[FileResult], show_breakdown: bool = False) -> None:
    # Sorter høyest CC først
    results = sorted(results, key=lambda r: r.cc, reverse=True)

    col_path = max(len(r.relative_path) for r in results) + 2
    col_path = max(col_path, 40)

    header = f"{'Fil':<{col_path}}  {'CC':>4}  {'Linjer':>6}  Vurdering"
    print(header)
    print("─" * len(header))

    for r in results:
        color = RATING_COLOR.get(r.rating, "")
        cc_str = f"{r.cc:>4}"
        print(f"{r.relative_path:<{col_path}}  {color}{cc_str}{RESET}  {r.lines:>6}  {color}{r.rating}{RESET}")
        if show_breakdown:
            non_zero = {k: v for k, v in r.breakdown.items() if v > 0}
            if non_zero:
                detail = "  ".join(f"{k}={v}" for k, v in sorted(non_zero.items(), key=lambda x: -x[1]))
                print(f"  {'':>{col_path}}  └─ {detail}")

    print()
    avg_cc = sum(r.cc for r in results) / len(results) if results else 0
    max_cc = max(r.cc for r in results) if results else 0
    print(f"Filer analysert: {len(results)}  |  Gjennomsnitt CC: {avg_cc:.1f}  |  Maks CC: {max_cc}")
    print()
    print("Skala:  lav ≤5  |  moderat ≤10  |  høy ≤20  |  kritisk >20")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Mål syklomatisk kompleksitet i SvelteKit-frontend."
    )
    parser.add_argument(
        "--threshold", type=int, default=0,
        help="Vis kun filer med CC over denne grensen (default: vis alle)"
    )
    parser.add_argument(
        "--breakdown", action="store_true",
        help="Vis detaljert fordeling av beslutningspunkter per fil"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Skriv ut som JSON"
    )
    parser.add_argument(
        "--src", type=Path, default=FRONTEND_SRC,
        help=f"Kildemappe (default: {FRONTEND_SRC})"
    )
    args = parser.parse_args()

    if not args.src.exists():
        print(f"Feil: Mappen {args.src} finnes ikke.", file=sys.stderr)
        sys.exit(1)

    files = sorted(
        list(args.src.rglob("*.svelte")) + list(args.src.rglob("*.ts"))
    )

    results = [analyse_file(f) for f in files]

    if args.threshold:
        results = [r for r in results if r.cc > args.threshold]

    if not results:
        print("Ingen filer matchet kriteriene.")
        return

    if args.json:
        output = [
            {
                "fil": r.relative_path,
                "cc": r.cc,
                "linjer": r.lines,
                "vurdering": r.rating,
                "beslutningspunkter": r.breakdown,
            }
            for r in sorted(results, key=lambda r: r.cc, reverse=True)
        ]
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print_table(results, show_breakdown=args.breakdown)


if __name__ == "__main__":
    main()
