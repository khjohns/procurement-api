"""Norwegian label registry for eForms codelist values and Artifik codes.

Loads translations from the bundled eforms_labels_nb.json (synced from
anskaffelser/eforms-sdk-nor) with support for overrides and Artifik API
code mappings.

Usage:
    from eforms_labels import get_label, get_labels

    get_label("procurement-procedure-type", "open")   # "Åpen anbudskonkurranse"
    get_label("artifik-procedure", "Open")             # "Åpen anbudskonkurranse"
    get_labels("contract-nature")                       # {"services": "Tjeneste", ...}
"""

from __future__ import annotations

import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "app" / "data" / "eforms_labels_nb.json"

_cache: dict[str, dict[str, str]] | None = None

# ── eForms SDK label overrides ──
# Where SDK labels are too terse/verbose for our UI. Keys not listed fall
# through to SDK values.

OVERRIDES: dict[str, dict[str, str]] = {
    "procurement-procedure-type": {
        "open": "Åpen anbudskonkurranse",
        "restricted": "Begrenset anbudskonkurranse",
        "neg-w-call": "Konkurranse med forhandling",
        "neg-wo-call": "Forhandling uten kunngjøring",
        "oth-single": "Direkte anskaffelse",
        "oth-mult": "Annet (flere prosedyrer)",
        "simple": "Minikonkurranse",
    },
    "contract-nature": {
        "services": "Tjeneste",
        "works": "Bygg og anlegg",
    },
    "framework-agreement": {
        "fa-mix": "Rammeavtale (blandet)",
        "fa-w-rc": "Rammeavtale med gjenåpning",
        "fa-wo-rc": "Rammeavtale uten gjenåpning",
        "none": "Ingen rammeavtale",
    },
}

# ── Artifik API → eForms code mappings ──
# Artifik uses English phrases; eForms uses short codes.

ARTIFIK_PROCEDURE_TO_EFORMS: dict[str, str] = {
    "Open": "open",
    "Limited": "restricted",
    "Competitive negotiated": "neg-w-call",
    "Competitive dialogue": "comp-dial",
    "Innovation partnership": "innovation",
    "Negotiated without publication": "neg-wo-call",
    "Negotiation without prior publication": "neg-wo-call",
    "Direct award": "oth-single",
    "Simple": "simple",  # Artifik-only: minikonkurranse under rammeavtale
}

ARTIFIK_NATURE_TO_EFORMS: dict[str, str] = {
    "SERVICES": "services",
    "SUPPLIES": "supplies",
    "WORKS": "works",
    "goods_and_services": "combined",
}

# ── Artifik-only codelists (static, not from eForms SDK) ──

_ARTIFIK_STATIC: dict[str, dict[str, str]] = {
    "procedure-short": {
        "Open": "Åpen",
        "Limited": "Begrenset",
        "Competitive negotiated": "Forhandling",
        "Competitive dialogue": "Dialog",
        "Innovation partnership": "Innovasjon",
        "Negotiated without publication": "Uten kunngj.",
        "Negotiation without prior publication": "Uten kunngj.",
        "Direct award": "Direkte",
        "Simple": "Minikonk.",
    },
    "procedure-del2": {
        "Open": "Åpen tilbudskonkurranse",
        "Limited": "Begrenset tilbudskonkurranse",
    },
    "threshold": {
        "over_eea_threshold_value": "Over EØS-terskel (Del III)",
        "below_eea_threshold_value": "Under EØS-terskel (Del II)",
        "national_threshold": "Nasjonal terskel (Del II)",
        "below_national_threshold": "Under nasjonal terskel (Del I)",
    },
    "threshold-short": {
        "over_eea_threshold_value": "Over EØS",
        "below_eea_threshold_value": "Under EØS",
        "national_threshold": "Nasjonal",
        "below_national_threshold": "Under terskel",
    },
}


def _load() -> dict[str, dict[str, str]]:
    """Lazy-load all label data: SDK JSON + overrides + Artifik codelists."""
    global _cache
    if _cache is not None:
        return _cache

    if _DATA_PATH.exists():
        raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
        _cache = {k: v for k, v in raw.items() if not k.startswith("_")}
    else:
        _cache = {}

    # Apply our label overrides on top of SDK data
    for codelist, overrides in OVERRIDES.items():
        _cache.setdefault(codelist, {}).update(overrides)

    # Inject static Artifik codelists
    for codelist, labels in _ARTIFIK_STATIC.items():
        _cache.setdefault(codelist, {}).update(labels)

    # Build pre-resolved Artifik→Norwegian labels from the mapping tables.
    # This lets the frontend do a single lookup without needing the mappings.
    proc_labels = _cache.get("procurement-procedure-type", {})
    _cache["artifik-procedure"] = {
        artifik: proc_labels.get(eforms, artifik)
        for artifik, eforms in ARTIFIK_PROCEDURE_TO_EFORMS.items()
    }
    nature_labels = _cache.get("contract-nature", {})
    _cache["artifik-nature"] = {
        artifik: nature_labels.get(eforms, artifik)
        for artifik, eforms in ARTIFIK_NATURE_TO_EFORMS.items()
    }

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
