# Handoff: Word-eksport for protokollgenerator

## Oppgave

Utvid `src/protokoll_generator.py` med Word-generering (.docx) via `python-docx`.

## Nåværende tilstand

- `generate_protokoll(procurement, activities)` returnerer markdown-streng
- Alle seksjonsgeneratorer (`_section_*`) returnerer markdown-strenger
- CLI henter data fra Artifik API via GCP Secret Manager + ArtifikClient
- `<!-- MANUELT -->` og `<!-- MANUELT: tekst -->` markerer felter som trenger manuell utfylling
- Se `docs/adr-002-protokollgenerator.md` for arkitektur

## Anbefalt tilnærming

Lag `generate_protokoll_docx(procurement, activities) -> Document` som bygger
Word-dokumentet direkte med `python-docx` — **ikke** konverter fra markdown.

### Hvorfor direkte?

- `<!-- MANUELT -->`-markører kan bli **gule highlight** eller **TODO-kommentarer** i Word
- Tabeller får riktig formatering (ikke markdown-ascii-tabeller)
- Avkrysningsbokser (☐ / [x]) kan bli ekte Word-checkboxer eller symboler
- Kan bruke Word-stiler (Heading 1, Heading 2, Normal, etc.)
- Kontroll over skrifttype, marginer, header/footer

### Struktur

```python
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def generate_protokoll_docx(procurement: dict, activities: list[dict]) -> Document:
    doc = Document()
    # Sett opp stiler, marginer, etc.
    _docx_general_info(doc, procurement, activities)
    _docx_procedure(doc, procurement, activities)
    # ... én funksjon per seksjon, parallelt med _section_*
    _docx_data_quality(doc, procurement, activities)
    return doc
```

Hver `_docx_*`-funksjon tar `doc` og legger til innhold direkte.

### MANUELT-markører i Word

Forslag: bruk gul bakgrunn + kursiv tekst for felter som trenger utfylling.
Alternativt Word-kommentarer (mer komplekst med python-docx).

```python
from docx.oxml.ns import qn

def _add_manual_marker(paragraph, text="Fyll inn"):
    run = paragraph.add_run(text)
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x99, 0x66, 0x00)
    # Gul highlight
    shading = OxmlElement('w:shd')
    shading.set(qn('w:fill'), 'FFFF00')
    run._element.get_or_add_rPr().append(shading)
```

### CLI-endring

Legg til `--format`-flag:

```bash
python3 src/protokoll_generator.py                        # default: docx
python3 src/protokoll_generator.py --format md             # markdown som før
python3 src/protokoll_generator.py --format docx -o out.docx
```

## Avhengigheter

```bash
pip install python-docx
# Legg til i pyproject.toml under dependencies
```

## Filer å lese

- `src/protokoll_generator.py` — nåværende skript (alle `_section_*`-funksjoner)
- `docs/anskaffelsesprotokoll` — malen (markdown, men strukturen er det som teller)
- `docs/adr-002-protokollgenerator.md` — arkitektur og dataflyt
- `docs/protokoll-datagrunnlag.md` — komplett kartlegging API-felter vs. protokollkrav

## Tips

- Gjenbruk all logikk fra hjelpefunksjonene (`_fmt_date`, `_get_activities_by_action`, etc.)
- Seksjonsgeneratorene har allerede all business-logikk for hva som er relevant per prosedyretype
- Ikke dupliser logikk — ekstraher felles data-utvinning til delte funksjoner hvis nødvendig
- Test med `python3 -c "from docx import Document; print('OK')"` for å verifisere installasjon
