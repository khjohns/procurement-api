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
        for codelist, labels in _ARTIFIK_CODELISTS.items():
            _cache.setdefault(codelist, {}).update(labels)
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


# ── Artifik API → eForms code mapping ──
# Artifik uses English phrases for procedure codes; eForms uses short codes.
# This mapping lets us use one label source for both systems.

ARTIFIK_PROCEDURE_TO_EFORMS: dict[str, str] = {
    "Open": "open",
    "Limited": "restricted",
    "Competitive negotiated": "neg-w-call",
    "Competitive dialogue": "comp-dial",
    "Innovation partnership": "innovation",
    "Negotiated without publication": "neg-wo-call",
    "Direct award": "oth-single",
}

ARTIFIK_NATURE_TO_EFORMS: dict[str, str] = {
    "SERVICES": "services",
    "SUPPLIES": "supplies",
    "WORKS": "works",
}

# ── Artifik-only codelists (not from eForms SDK) ──
# These are injected into _cache at load time alongside SDK data.

_ARTIFIK_CODELISTS: dict[str, dict[str, str]] = {
    # Short procedure labels for compact list views
    "procedure-short": {
        "Open": "Åpen",
        "Limited": "Begrenset",
        "Competitive negotiated": "Forhandling",
        "Competitive dialogue": "Dialog",
        "Innovation partnership": "Innovasjon",
        "Negotiated without publication": "Uten kunngj.",
        "Direct award": "Direkte",
    },
    # Del II uses "tilbudskonkurranse" instead of "anbudskonkurranse"
    "procedure-del2": {
        "Open": "Åpen tilbudskonkurranse",
        "Limited": "Begrenset tilbudskonkurranse",
    },
    # Artifik threshold codes
    "threshold": {
        "over_eea_threshold_value": "Over EØS-terskel (Del III)",
        "below_eea_threshold_value": "Under EØS-terskel (Del II)",
        "national_threshold": "Nasjonal terskel (Del II)",
        "below_national_threshold": "Under nasjonal terskel (Del I)",
    },
    # Short threshold labels for list views
    "threshold-short": {
        "over_eea_threshold_value": "Over EØS",
        "below_eea_threshold_value": "Under EØS",
        "national_threshold": "Nasjonal",
        "below_national_threshold": "Under terskel",
    },
}


def artifik_procedure_label(artifik_code: str, default: str | None = None) -> str | None:
    """Translate an Artifik procedure code to Norwegian via eForms labels."""
    eforms_code = ARTIFIK_PROCEDURE_TO_EFORMS.get(artifik_code)
    if eforms_code:
        return get_label("procurement-procedure-type", eforms_code, default)
    return default


def artifik_nature_label(artifik_code: str, default: str | None = None) -> str | None:
    """Translate an Artifik contract nature code to Norwegian via eForms labels."""
    eforms_code = ARTIFIK_NATURE_TO_EFORMS.get(artifik_code, artifik_code.lower())
    return get_label("contract-nature", eforms_code, default)
