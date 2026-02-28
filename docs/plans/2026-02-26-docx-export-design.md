# Design: Word-eksport for protokollgenerator

**Dato:** 2026-02-26
**Status:** Godkjent

## Oppgave

Utvid `src/protokoll_generator.py` med Word-generering (.docx) via `python-docx`.

## Tilnærming

Direkte python-docx bygging — parallelle `_docx_*`-funksjoner som bygger
Word-dokumentet direkte. Gjenbruker eksisterende hjelpefunksjoner for
datauthenting og formatering.

### Hvorfor direkte (ikke markdown-konvertering)?

- `<!-- MANUELT -->` blir gul highlight + kursiv — synlig og søkbar i Word
- Tabeller får ekte Word-formatering
- Avkrysningsbokser som Unicode-symboler (☐/☒)
- Kontroll over stiler (Heading 1/2, Normal)

## Struktur

### Ny hovedfunksjon

```python
def generate_protokoll_docx(procurement: dict, activities: list[dict]) -> Document:
    doc = Document()
    _docx_general_info(doc, procurement, activities)
    _docx_procedure(doc, procurement, activities)
    # ... én funksjon per seksjon
    _docx_data_quality(doc, procurement, activities)
    return doc
```

### Seksjonsmapping

| Markdown-funksjon | Docx-funksjon |
|-------------------|---------------|
| `_section_general_info` | `_docx_general_info` |
| `_section_procedure` | `_docx_procedure` |
| `_section_formal_rejection` | `_docx_formal_rejection` |
| `_section_preliminary_qualification` | `_docx_preliminary_qualification` |
| `_section_qualification` | `_docx_qualification` |
| `_section_supplier_rejection` | `_docx_supplier_rejection` |
| `_section_supplier_selection` | `_docx_supplier_selection` |
| `_section_bid_rejection` | `_docx_bid_rejection` |
| `_section_clarification` | `_docx_clarification` |
| `_section_negotiations` | `_docx_negotiations` |
| `_section_dialog` | `_docx_dialog` |
| `_section_bids_in_evaluation` | `_docx_bids_in_evaluation` |
| `_section_award` | `_docx_award` |
| `_section_framework_agreement` | `_docx_framework_agreement` |
| `_section_other` | `_docx_other` |
| `_section_data_quality` | `_docx_data_quality` |

### MANUELT-markører

Gul bakgrunn + kursiv + mørk oransje tekst (`RGBColor(0x99, 0x66, 0x00)`).

### Formatering

- Heading 1 for tittel, Heading 2 for seksjoner
- Normal for brødtekst
- Standard marginer (2.54 cm)
- Default font (Calibri)
- Unicode avkrysningsbokser: ☐ (tom), ☒ (avkrysset)

### CLI-endring

```
python3 src/protokoll_generator.py                      # default: docx
python3 src/protokoll_generator.py --format md           # markdown
python3 src/protokoll_generator.py --format docx -o x.docx
```

Default endres fra md til docx. Output-extension følger format automatisk.

## Filer som endres

| Fil | Endring |
|-----|---------|
| `src/protokoll_generator.py` | `generate_protokoll_docx()` + `_docx_*` + `--format` |
| `pyproject.toml` | Legg til `python-docx` |

## Avhengigheter

- `python-docx` — ren Python, ingen ekstern Office-installasjon nødvendig
- Fungerer med OpenOffice/LibreOffice uten problemer
