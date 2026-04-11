"""Norwegian labels for eForms codelist values.

Loads translations from the bundled eforms_labels_nb.json (synced from
anskaffelser/eforms-sdk-nor) with support for per-codelist overrides
where SDK labels are too verbose or don't match our UI conventions.

Usage:
    from eforms_labels import get_label, get_labels

    get_label("procurement-procedure-type", "open")   # "Åpen anbudskonkurranse"
    get_labels("contract-nature")                       # {"services": "Tjenester", ...}
"""

from __future__ import annotations

import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "app" / "data" / "eforms_labels_nb.json"

_cache: dict[str, dict[str, str]] | None = None

# ── Overrides ──
# Where SDK labels are too terse, verbose, or don't match our UI conventions,
# we override specific entries here.  Keys not listed fall through to SDK.
#
# Principle: only override when there's a real UX reason.  Keep this dict
# small — most SDK labels are fine as-is.

OVERRIDES: dict[str, dict[str, str]] = {
    "procurement-procedure-type": {
        # SDK says just "Åpen" / "Begrenset" — too terse without context
        "open": "Åpen anbudskonkurranse",
        "restricted": "Begrenset anbudskonkurranse",
        # SDK: "Konkurranse med forhandling med  forhåndskunngjøring/..."
        "neg-w-call": "Konkurranse med forhandling",
        # SDK: "Konkurranse med forhandling uten forutgående kunngjøring"
        "neg-wo-call": "Forhandling uten kunngjøring",
        # SDK: "andre ett-trinnsprosedyrer" — our convention for this code
        "oth-single": "Direkte anskaffelse",
        # SDK: "andre flertrinnsprosedyrer"
        "oth-mult": "Annet (flere prosedyrer)",
    },
    "contract-nature": {
        # Singularis passer bedre i tabeller/filtre
        "services": "Tjeneste",
        # Kortere enn SDK "Bygge- og anleggsarbeid"
        "works": "Bygg og anlegg",
    },
    "framework-agreement": {
        # SDK: "Rammeavtale. delvis uten gjenåpning og delvis med gjenåpning..."
        "fa-mix": "Rammeavtale (blandet)",
        # SDK: "Rammeavtale med gjenåpning av konkurransen"
        "fa-w-rc": "Rammeavtale med gjenåpning",
        # SDK: "Rammeavtale uten gjenåpning av konkurransen"
        "fa-wo-rc": "Rammeavtale uten gjenåpning",
        # SDK: "Ingen/nei" — vi er mer eksplisitt
        "none": "Ingen rammeavtale",
    },
}


def _load() -> dict[str, dict[str, str]]:
    """Lazy-load the label data from JSON, with overrides pre-merged."""
    global _cache
    if _cache is None:
        if _DATA_PATH.exists():
            raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
            _cache = {k: v for k, v in raw.items() if not k.startswith("_")}
        else:
            _cache = {}
        for codelist, overrides in OVERRIDES.items():
            _cache.setdefault(codelist, {}).update(overrides)
    return _cache


def get_all_labels() -> dict[str, dict[str, str]]:
    """Return all codelists with overrides applied. Safe for serialization."""
    return _load()


def get_labels(codelist: str) -> dict[str, str]:
    """Return the {code: label} dict for a codelist."""
    return _load().get(codelist, {})


def get_label(codelist: str, code: str, default: str | None = None) -> str | None:
    """Look up a single label.  Returns default (or None) if not found."""
    return _load().get(codelist, {}).get(code, default)
