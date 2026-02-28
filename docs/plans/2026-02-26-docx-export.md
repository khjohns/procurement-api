# Docx Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Word (.docx) export to the protokoll generator, with yellow-highlighted manual markers, proper tables, and a `--format` CLI flag.

**Architecture:** Parallel `_docx_*` functions in `src/protokoll_generator.py` that build a python-docx Document directly. Reuses all existing helper functions (`_fmt_date`, `_get_activities_by_action`, etc.). CLI gets `--format` flag (default: docx).

**Tech Stack:** python-docx, existing Python 3.11+ codebase

---

### Task 1: Add python-docx dependency

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add dependency**

Add `python-docx` to the dependencies list in `pyproject.toml`:

```toml
dependencies = [
    "flask>=3.0",
    "certifi",
    "python-docx",
]
```

**Step 2: Install**

Run: `pip install python-docx`

**Step 3: Verify**

Run: `python3 -c "from docx import Document; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add pyproject.toml
git commit -m "Add python-docx dependency for Word export"
```

---

### Task 2: Add docx helpers and first section (_docx_general_info)

**Files:**
- Modify: `src/protokoll_generator.py` (add imports, helpers, first section)

**Context:** The existing file has markdown section generators at lines 420-990 and helpers at lines 170-340. We add docx code after the markdown sections (before `generate_protokoll` at line 995).

**Step 1: Add imports**

After the existing imports (line 24), add:

```python
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
```

Note: Guard these imports so the module still works without python-docx for `--format md`:

```python
try:
    from docx import Document as DocxDocument
    from docx.shared import Pt, RGBColor
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    _HAS_DOCX = True
except ImportError:
    _HAS_DOCX = False
```

**Step 2: Add docx helper functions**

Add these right before the `# -- Main generator` comment (before line 993):

```python
# -- Docx helpers --------------------------------------------------------------

def _add_manual(paragraph, text="[Fyll inn]"):
    """Add a yellow-highlighted, italic manual marker to a paragraph."""
    run = paragraph.add_run(text)
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x99, 0x66, 0x00)
    shading = OxmlElement("w:shd")
    shading.set(qn("w:val"), "clear")
    shading.set(qn("w:color"), "auto")
    shading.set(qn("w:fill"), "FFFF00")
    run._element.get_or_add_rPr().append(shading)
    return run


def _docx_add_table(doc, headers, rows):
    """Add a table with bold headers and bordered cells."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    # Header row
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
    # Data rows
    for r_idx, row_data in enumerate(rows):
        for c_idx, cell_data in enumerate(row_data):
            table.rows[r_idx + 1].cells[c_idx].text = str(cell_data)
    return table


def _docx_add_table_with_manual(doc, headers, rows):
    """Add a table where cells containing None get a yellow manual marker."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
    for r_idx, row_data in enumerate(rows):
        for c_idx, cell_data in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            if cell_data is None:
                cell.text = ""
                _add_manual(cell.paragraphs[0])
            else:
                cell.text = str(cell_data)
    return table
```

**Step 3: Add `_docx_general_info`**

```python
def _docx_general_info(doc, procurement, activities):
    doc.add_heading("Generell informasjon", level=2)

    seq_id = procurement.get("sequenceId") or ""
    ext_id = procurement.get("externalId") or ""
    sak_ref = seq_id
    if ext_id:
        sak_ref += f" (ekstern ref: {ext_id})"

    procurer = procurement.get("about_procurer") or {}
    procurer_name = procurer.get("name") or ""
    national_id = procurer.get("national_id") or ""
    procurer_str = procurer_name
    if national_id:
        procurer_str += f" (org.nr. {national_id})"

    contact = procurer.get("contact_person") or ""

    name = _strip_html(procurement.get("name") or "")
    description = _strip_html(procurement.get("description") or "")
    description = re.sub(r"\s*\n\s*", " ", description)
    desc_str = name
    if description and description.lower() != name.lower():
        desc_str += f". {description}"

    estimated_value = procurement.get("estimated_value")
    currency = procurement.get("currency") or "NOK"
    value_str = _fmt_currency(estimated_value, currency)

    duration_months = procurement.get("duration_months")
    duration = procurement.get("duration")
    if duration_months:
        duration_str = f"{duration_months} måneder"
    elif duration:
        duration_str = str(duration)
    else:
        duration_str = None  # Will become manual marker

    submission_date = _get_timeline_date(procurement, "submission")
    submission_str = _fmt_datetime(submission_date) if submission_date else None

    # Info table
    info_rows = [
        ("Konkurransens saksnummer:", sak_ref),
        ("Oppdragsgiver(e):", procurer_str),
        ("Protokollfører/saksbehandler:", contact or None),
        ("Beskrivelse av anskaffelsen:", desc_str),
        ("Anskaffelsens anslåtte verdi på kunngjøringstidspunktet:", value_str),
        ("Kontraktens varighet:", duration_str),
        ("Frist for innlevering av tilbud:", submission_str),
    ]
    table = doc.add_table(rows=len(info_rows), cols=2)
    table.style = "Table Grid"
    for i, (label, val) in enumerate(info_rows):
        cell_label = table.rows[i].cells[0]
        cell_label.text = ""
        run = cell_label.paragraphs[0].add_run(label)
        run.bold = True
        cell_val = table.rows[i].cells[1]
        if val is None:
            cell_val.text = ""
            _add_manual(cell_val.paragraphs[0])
        else:
            cell_val.text = str(val)

    doc.add_paragraph()

    # Submissions table
    submissions = _get_activities_by_action(activities, "SUBMIT_BID")
    p = doc.add_paragraph()
    p.add_run("Tidspunkt for mottak av tilbud:").bold = True

    if submissions:
        rows = []
        for s in submissions:
            org = s.get("organization") or {}
            org_name = org.get("name") or "Ukjent leverandør"
            date = _fmt_datetime(s.get("date"))
            rows.append((org_name, date))
        _docx_add_table(doc, ["Leverandørens navn", "Tidspunkt for mottak"], rows)
    else:
        _docx_add_table(doc, ["Leverandørens navn", "Tidspunkt for mottak"],
                         [("Ingen tilbud registrert", "")])
```

**Step 4: Verify syntax**

Run: `python3 -c "import ast; ast.parse(open('src/protokoll_generator.py').read()); print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add src/protokoll_generator.py
git commit -m "Add docx helpers and general info section"
```

---

### Task 3: Add remaining docx sections (procedure through dialog)

**Files:**
- Modify: `src/protokoll_generator.py`

**Step 1: Add `_docx_procedure`**

```python
def _docx_procedure(doc, procurement, activities):
    doc.add_heading("Anskaffelsesprosedyre", level=2)
    doc.add_paragraph("Følgende anskaffelsesprosedyre er lagt til grunn i denne konkurransen:")

    procedure = procurement.get("procedure") or ""
    selected = PROCEDURE_MAP.get(procedure, "")
    for p_name in ALL_PROCEDURES:
        if p_name == selected:
            doc.add_paragraph(f"☒ {p_name}").runs[0].bold = True
        else:
            doc.add_paragraph(f"☐ {p_name}")

    # Begrunnelse forhandling/dialog
    p = doc.add_paragraph()
    p.add_run("Begrunnelse for bruk av konkurransepreget dialog eller konkurranse med forhandling etter forutgående kunngjøring:").bold = True
    if procedure in ("Competitive negotiated", "Competitive dialogue"):
        p2 = doc.add_paragraph()
        _add_manual(p2, "[Fyll inn begrunnelse for valg av prosedyre]")
    else:
        doc.add_paragraph("Ikke relevant.")

    # Begrunnelse uten kunngjøring
    p = doc.add_paragraph()
    p.add_run("Begrunnelse for å bruke konkurranse med forhandling uten forutgående kunngjøring eller anskaffelse uten konkurranse:").bold = True
    if procedure in ("Negotiated without publication", "Direct award"):
        code = procurement.get("direct_award_justification_code") or ""
        reason = procurement.get("direct_award_justification_reason") or ""
        if code or reason:
            doc.add_paragraph(f"Hjemmel: {code}. {reason}" if code else reason)
        else:
            p2 = doc.add_paragraph()
            _add_manual(p2)
    else:
        doc.add_paragraph("Ikke relevant.")

    # Delkontrakter
    p = doc.add_paragraph()
    p.add_run("Dersom anskaffelsen ikke deles opp i delkontrakter, begrunnelse for ikke å dele opp kontrakten (jf. FOA \u00a7 19-4):").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2, "[Fyll inn begrunnelse]")

    # Kunngjøring
    doffin_activities = _get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish_activities = _get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")
    announcement_date = ""
    doffin_ref = ""
    ted_ref = ""
    if publish_activities:
        announcement_date = _fmt_date(publish_activities[0].get("date"))
    if doffin_activities:
        desc = doffin_activities[0].get("description") or {}
        doffin_notice = desc.get("doffinNotice") or {}
        doffin_ref = doffin_notice.get("ngoj") or ""
        ted_ref = doffin_notice.get("publicationId") or ""
        if not announcement_date:
            announcement_date = _fmt_date(
                doffin_notice.get("publicationDate") or doffin_activities[0].get("date")
            )

    p = doc.add_paragraph()
    p.add_run("Kunngjøring:").bold = True
    if announcement_date:
        parts = [f"Anskaffelsen ble kunngjort {announcement_date} på Doffin"]
        if doffin_ref:
            parts.append(f"referansenummer {doffin_ref} (NGOJ)")
        if ted_ref:
            parts.append(f"TED-referanse {ted_ref}")
        doc.add_paragraph(", ".join(parts) + ".")
    else:
        pub_date = procurement.get("publicationDate")
        if pub_date:
            doc.add_paragraph(f"Anskaffelsen ble kunngjort {_fmt_date(pub_date)}.")
        else:
            p2 = doc.add_paragraph()
            _add_manual(p2, "[Kunngjøringsinformasjon mangler]")
```

**Step 2: Add `_docx_formal_rejection`**

```python
def _docx_formal_rejection(doc, activities):
    doc.add_heading("Avvisning på grunn av formalfeil, jf. FOA \u00a7 24-1", level=2)

    rejections = _get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        doc.add_paragraph("☐ Ingen leverandører eller tilbud ble avvist")
        p = doc.add_paragraph()
        _add_manual(p, "[Bekreft at ingen ble avvist på formalfeil]")
    else:
        p = doc.add_paragraph()
        _add_manual(p, "[Avgjør hvilke avvisninger som gjelder formalfeil (\u00a7 24-1) vs. kvalifikasjon (\u00a7 24-2)]")

    rows = []
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = _fmt_date(r.get("date"))
            rows.append((org_name, None, date))
    else:
        rows.append(("", "", ""))
    _docx_add_table_with_manual(doc,
        ["Leverandørens navn", "Begrunnelsen for avvisningen", "Dato sendt"], rows)
```

**Step 3: Add `_docx_preliminary_qualification`**

```python
def _docx_preliminary_qualification(doc, procedure):
    doc.add_heading("Foreløpig kvalifikasjonsvurdering, jf. FOA \u00a7 17-1 annet ledd", level=2)

    if procedure == "Open":
        doc.add_paragraph("Ikke relevant (åpen anbudskonkurranse).")
    else:
        p = doc.add_paragraph()
        p.add_run("Leverandører som er kvalifisert:").bold = True
        p2 = doc.add_paragraph()
        _add_manual(p2)
```

**Step 4: Add `_docx_qualification`**

```python
def _docx_qualification(doc):
    doc.add_heading("Kvalifikasjonsvurdering", level=2)
    p = doc.add_paragraph()
    _add_manual(p, "[Kvalifikasjonskrav og -vurdering er ikke tilgjengelig via API. Fyll inn basert på konkurransegrunnlaget.]")

    p = doc.add_paragraph()
    p.add_run("Leverandører som er kvalifisert:").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2)

    p = doc.add_paragraph()
    p.add_run("Hvis relevant, begrunnelse for hvorfor leverandører som har restanser i henhold til skatte- og avgiftslovgivningen har fått delta i konkurransen:").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2)
```

**Step 5: Add `_docx_supplier_rejection`**

```python
def _docx_supplier_rejection(doc, activities):
    doc.add_heading("Leverandører som er avvist, jf. FOA \u00a7 24-2", level=2)

    rejections = _get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        doc.add_paragraph("☐ Ingen leverandører ble avvist")
        p = doc.add_paragraph()
        _add_manual(p, "[Bekreft. API viser ingen avvisningshendelser.]")
    else:
        doc.add_paragraph("Følgende leverandører ble avvist:")

    rows = []
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = _fmt_date(r.get("date"))
            rows.append((org_name, None, date))
    else:
        rows.append(("", "", ""))
    _docx_add_table_with_manual(doc,
        ["Leverandørens navn", "Begrunnelsen for avvisningen", "Dato sendt"], rows)
```

**Step 6: Add `_docx_supplier_selection`**

```python
def _docx_supplier_selection(doc, procedure, activities):
    doc.add_heading("Utvelgelse av leverandører", level=2)

    if procedure == "Open":
        doc.add_paragraph("Ikke relevant (åpen anbudskonkurranse — ingen utvelgelsesfase).")
    elif procedure in ("Limited", "Competitive negotiated", "Innovation partnership", "Competitive dialogue"):
        qualifying = _get_activities_by_action(activities, "QUALIFYING_PARTICIPANTS")
        p = doc.add_paragraph()
        _add_manual(p, "[Fyll inn begrunnelse for utvelgelse per leverandør]")
        if qualifying:
            rows = []
            for q in qualifying:
                desc = q.get("description") or {}
                tenders_ids = desc.get("tendersIds") or []
                for tid in tenders_ids:
                    rows.append((f"Leverandør (tender {tid})", None))
            if rows:
                _docx_add_table_with_manual(doc,
                    ["Leverandørens navn", "Begrunnelse for utvelgelse"], rows)
        else:
            _docx_add_table_with_manual(doc,
                ["Leverandørens navn", "Begrunnelse for utvelgelse"], [(None, None)])
    else:
        doc.add_paragraph("Ikke relevant.")
```

**Step 7: Add `_docx_bid_rejection`**

```python
def _docx_bid_rejection(doc):
    doc.add_heading("Tilbud som er avvist, jf. FOA \u00a7\u00a7 24-8 og 24-9", level=2)
    doc.add_paragraph("☐ Ingen tilbud ble avvist")
    p = doc.add_paragraph()
    _add_manual(p, "[Bekreft]")
    _docx_add_table(doc,
        ["Leverandørenes navn", "Begrunnelsen for avvisningen", "Dato sendt"],
        [("", "", "")])
```

**Step 8: Add `_docx_clarification`**

```python
def _docx_clarification(doc, procurement, activities):
    doc.add_heading("Ettersending og avklaring av opplysninger og dokumentasjon, jf. FOA \u00a7 23-5", level=2)

    submission_deadline = _parse_submission_deadline(procurement)
    conversations = _get_activities_by_action(activities, "CONVERSATION_MARKED_COMPLETED")

    post_deadline_convs = []
    if submission_deadline and conversations:
        for c in conversations:
            conv_date_str = c.get("date")
            if conv_date_str:
                try:
                    conv_date = datetime.fromisoformat(conv_date_str.replace("Z", "+00:00"))
                    if conv_date > submission_deadline:
                        post_deadline_convs.append(c)
                except (ValueError, TypeError):
                    pass

    if not post_deadline_convs:
        doc.add_paragraph("☐ Det ble ikke foretatt avklaringer eller dialog")
        if not conversations:
            p = doc.add_paragraph()
            _add_manual(p, "[Bekreft. API har ingen avklaringshendelser for denne anskaffelsen.]")
        else:
            p = doc.add_paragraph()
            _add_manual(p, "[Bekreft. API har meldingshendelser, men alle er før tilbudsfrist (Q&A).]")
    else:
        doc.add_paragraph("Følgende avklaringer/ettersendinger ble gjennomført etter tilbudsfrist:")

    rows = []
    if post_deadline_convs:
        for c in post_deadline_convs:
            org = c.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = _fmt_date(c.get("date"))
            desc = c.get("description") or {}
            title = desc.get("conversationTitle") or ""
            how = f"Melding i KGV: \u00ab{title}\u00bb" if title else "Melding i KGV"
            rows.append((org_name, date, how))
    else:
        rows.append(("", "", ""))
    _docx_add_table(doc, ["Leverandørens navn", "Dato", "Hvordan?"], rows)
```

**Step 9: Add `_docx_negotiations`**

```python
def _docx_negotiations(doc, procedure):
    doc.add_heading("Forhandlinger", level=2)

    if procedure in ("Competitive negotiated", "Innovation partnership"):
        p = doc.add_paragraph()
        _add_manual(p, "[Fyll inn forhandlingsdetaljer]")
        doc.add_paragraph("☐ Det ble ikke gjennomført forhandlinger")
        _docx_add_table_with_manual(doc,
            ["Leverandørens navn", "Dato for forhandling", "Mottatt revidert tilbud"],
            [(None, None, None)])
    else:
        label = PROCEDURE_MAP.get(procedure, procedure) if procedure != "Open" else "åpen anbudskonkurranse"
        doc.add_paragraph(f"Ikke relevant ({label}).")
```

**Step 10: Add `_docx_dialog`**

```python
def _docx_dialog(doc, procedure):
    doc.add_heading("Dialog", level=2)

    if procedure == "Competitive dialogue":
        p = doc.add_paragraph()
        _add_manual(p, "[Fyll inn dialogdetaljer]")
        doc.add_paragraph("☐ Det ble ikke gjennomført dialog")
        _docx_add_table_with_manual(doc,
            ["Leverandørens navn", "Dato for dialog"],
            [(None, None)])
    else:
        label = PROCEDURE_MAP.get(procedure, procedure) if procedure != "Open" else "åpen anbudskonkurranse"
        doc.add_paragraph(f"Ikke relevant ({label}).")
```

**Step 11: Verify syntax**

Run: `python3 -c "import ast; ast.parse(open('src/protokoll_generator.py').read()); print('OK')"`
Expected: `OK`

**Step 12: Commit**

```bash
git add src/protokoll_generator.py
git commit -m "Add docx sections: procedure through dialog"
```

---

### Task 4: Add remaining docx sections (bids through data quality)

**Files:**
- Modify: `src/protokoll_generator.py`

**Step 1: Add `_docx_bids_in_evaluation`**

```python
def _docx_bids_in_evaluation(doc, activities):
    doc.add_heading("Tilbud som er med i tildelingsvurderingen", level=2)

    submissions = _get_activities_by_action(activities, "SUBMIT_BID")
    rejections = _get_activities_by_action(activities, "REJECT_PARTICIPATION")
    withdrawals = _get_activities_by_action(activities, "WITHDRAW_PARTICIPATION")

    rejected_names = {
        (r.get("organization") or {}).get("name", "").lower()
        for r in rejections
    }
    withdrawn_names = {
        (w.get("organization") or {}).get("name", "").lower()
        for w in withdrawals
    }
    excluded = rejected_names | withdrawn_names

    evaluated = []
    for s in submissions:
        org = s.get("organization") or {}
        name = org.get("name") or "Ukjent"
        if name.lower() not in excluded:
            evaluated.append(name)

    if evaluated:
        rows = [(str(i), name) for i, name in enumerate(evaluated, 1)]
    else:
        rows = [("", None)]
    _docx_add_table_with_manual(doc, ["Tilbuds-/løpenummer", "Leverandørenes navn"], rows)
```

**Step 2: Add `_docx_award`**

```python
def _docx_award(doc, procurement, activities):
    doc.add_heading("Det (de) valgte tilbud med begrunnelse og kontraktsverdi", level=2)
    p = doc.add_paragraph()
    _add_manual(p, "[Fyll inn navn på valgt leverandør, tildelingsbegrunnelse og kontraktsverdi. API gir kun tenderIds, ikke leverandørnavn eller begrunnelse.]")

    total_value = procurement.get("contracts_total_value_amount")
    estimated = procurement.get("estimated_value")
    currency = procurement.get("currency") or "NOK"
    p = doc.add_paragraph()
    p.add_run("Kontraktsverdi: ").bold = True
    if total_value:
        p.add_run(_fmt_currency(total_value, currency))
    elif estimated:
        p.add_run(f"{_fmt_currency(estimated, currency)} (estimert verdi)")
    else:
        _add_manual(p)

    award_letters = procurement.get("areAwardLettersSent")

    info_rows = [
        ("Meddelelsesbrev sendt:", None),
        ("Karensperiodens utløp:", None),
        ("Eventuelle klager:", None),
        ("Resultat av klage:", None),
    ]
    table = doc.add_table(rows=len(info_rows), cols=2)
    table.style = "Table Grid"
    for i, (label, val) in enumerate(info_rows):
        cell_label = table.rows[i].cells[0]
        cell_label.text = ""
        run = cell_label.paragraphs[0].add_run(label)
        run.bold = True
        cell_val = table.rows[i].cells[1]
        cell_val.text = ""
        _add_manual(cell_val.paragraphs[0])

    doc.add_paragraph()

    award_date = _get_timeline_date(procurement, "award decision")
    p = doc.add_paragraph()
    p.add_run("Tildelingsbeslutning: ").bold = True
    if award_date:
        p.add_run(_fmt_date(award_date))
    else:
        award_activities = _get_activities_by_action(activities, "AWARDING_PARTICIPANTS")
        if award_activities:
            p.add_run(_fmt_date(award_activities[0].get("date")))
        else:
            _add_manual(p)
```

**Step 3: Add `_docx_framework_agreement`**

```python
def _docx_framework_agreement(doc, procurement):
    doc.add_heading("Tildeling av rammeavtaler", level=2)

    is_framework = procurement.get("framework_agreement_involved")
    if not is_framework:
        doc.add_paragraph("Ikke relevant (dette er ikke en rammeavtale).")
        return

    max_participants = procurement.get("framework_agreement_maximum_participants")
    if max_participants and int(max_participants) == 1:
        doc.add_paragraph("Rammeavtale med en leverandør? Ja")
        doc.add_paragraph("Rammeavtale med flere leverandører? Nei")
    elif max_participants and int(max_participants) > 1:
        doc.add_paragraph("Rammeavtale med en leverandør? Nei")
        doc.add_paragraph(f"Rammeavtale med flere leverandører? Ja (maks {max_participants} deltakere)")
        p = doc.add_paragraph()
        p.add_run("Ved rammeavtale med flere leverandører; Hvilken fordelingsmekanisme skal benyttes? ")
        _add_manual(p)
        p = doc.add_paragraph()
        p.add_run("Ved minikonkurranse som fordelingsmekanisme; Hvilke kriterier skal brukes? ")
        _add_manual(p)
    else:
        p1 = doc.add_paragraph("Rammeavtale med en leverandør? ")
        _add_manual(p1)
        p2 = doc.add_paragraph("Rammeavtale med flere leverandører? ")
        _add_manual(p2)
```

**Step 4: Add `_docx_other`**

```python
def _docx_other(doc, procurement):
    doc.add_heading("Andre opplysninger og avslutning", level=2)

    p = doc.add_paragraph()
    p.add_run("Hvis relevant, hvilke deler av kontrakten valgte leverandør planlegger at underleverandører skal utføre, og underleverandørens navn, forutsatt at opplysningene er kjent:").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2)

    p = doc.add_paragraph()
    p.add_run("Hvis relevant, begrunnelse for hvorfor konkurransen avlyses, jf. FOA \u00a7 25-4:").bold = True
    is_cancelled = procurement.get("isCancelled")
    if is_cancelled:
        reason = procurement.get("cancelingReason") or ""
        if reason:
            doc.add_paragraph(reason)
        else:
            p2 = doc.add_paragraph()
            _add_manual(p2, "[Begrunnelse mangler]")
    else:
        doc.add_paragraph("Ikke relevant (konkurransen ble ikke avlyst).")

    p = doc.add_paragraph()
    p.add_run("Hvis relevant, opplysninger om tilfeller av inhabilitet eller konkurransevridning som følge av dialog med leverandørene, og eventuelle avhjelpende tiltak som er gjennomført:").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2)

    p = doc.add_paragraph()
    p.add_run("Andre opplysninger, vesentlige forhold eller viktige beslutninger som er av betydning for konkurransen:").bold = True
    p2 = doc.add_paragraph()
    _add_manual(p2)
```

**Step 5: Add `_docx_data_quality`**

```python
def _docx_data_quality(doc, procurement, activities):
    doc.add_heading("Datakvalitet — API vs. manuelt", level=2)

    submissions = _get_activities_by_action(activities, "SUBMIT_BID")
    rejections = _get_activities_by_action(activities, "REJECT_PARTICIPATION")
    doffin = _get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish = _get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")

    submission_deadline = _parse_submission_deadline(procurement)
    conversations = _get_activities_by_action(activities, "CONVERSATION_MARKED_COMPLETED")
    post_deadline = []
    if submission_deadline:
        for c in conversations:
            try:
                dt = datetime.fromisoformat((c.get("date") or "").replace("Z", "+00:00"))
                if dt > submission_deadline:
                    post_deadline.append(c)
            except (ValueError, TypeError):
                pass

    rows = [
        ("Generell informasjon", "API", "Komplett"),
        ("Tidspunkt for mottak", "API (SUBMIT_BID)", "Komplett" if submissions else "Ingen tilbud registrert"),
        ("Prosedyretype", "API (procedure)", "Komplett"),
        ("Kunngjøring", f"API {'(DOFFIN_NOTICE)' if doffin or publish else ''}", "Komplett" if doffin or publish else "Trenger bekreftelse"),
        ("Avvisning (formalfeil)", f"API ({len(rejections)} hendelser)" if rejections else "API (ingen hendelser)", "Trenger manuell klassifisering" if rejections else "Trenger bekreftelse"),
        ("Kvalifikasjonsvurdering", "Manuelt", "Ikke i API"),
        ("Avvisning av leverandører", f"API ({len(rejections)} hendelser)" if rejections else "API (ingen hendelser)", "Begrunnelse mangler" if rejections else "Trenger bekreftelse"),
        ("Avvisning av tilbud", "API (ingen hendelser)", "Trenger bekreftelse"),
        ("Ettersending/avklaring", f"API ({len(post_deadline)} meldinger etter frist)" if post_deadline else "API (ingen hendelser)", "Innhold mangler" if post_deadline else "Trenger bekreftelse"),
        ("Tilbud i vurdering", "API (SUBMIT_BID)", "Komplett" if submissions else "Ingen"),
        ("Valgte tilbud + begrunnelse", "Manuelt", "API har kun tenderIds"),
        ("Meddelelsesbrev/karens", "Manuelt", "Kun flag, ikke datoer"),
        ("Delkontrakter (begrunnelse)", "Manuelt", "Ikke i API"),
        ("Underleverandører", "Manuelt", "Ikke i API"),
        ("Inhabilitet", "Manuelt", "Ikke i API"),
    ]
    _docx_add_table(doc, ["Seksjon", "Kilde", "Merknad"], rows)
```

**Step 6: Verify syntax**

Run: `python3 -c "import ast; ast.parse(open('src/protokoll_generator.py').read()); print('OK')"`
Expected: `OK`

**Step 7: Commit**

```bash
git add src/protokoll_generator.py
git commit -m "Add docx sections: bids through data quality"
```

---

### Task 5: Add generate_protokoll_docx and update CLI

**Files:**
- Modify: `src/protokoll_generator.py`

**Step 1: Add `generate_protokoll_docx` function**

Add right after the existing `generate_protokoll` function:

```python
def generate_protokoll_docx(procurement: dict, activities: list[dict]) -> "DocxDocument":
    """Generate a complete anskaffelsesprotokoll as a Word document.

    Args:
        procurement: Full procurement object from Artifik API.
        activities: List of activity objects from get_procurement_activities.

    Returns:
        python-docx Document object.
    """
    if not _HAS_DOCX:
        _die("python-docx er ikke installert. Kjør: pip install python-docx")

    procedure = procurement.get("procedure") or ""
    seq_id = procurement.get("sequenceId") or procurement.get("name") or "Ukjent"
    today = datetime.now().strftime("%d.%m.%Y")

    doc = DocxDocument()

    # Title
    doc.add_heading(f"ANSKAFFELSESPROTOKOLL — {seq_id}", level=1)
    p = doc.add_paragraph()
    run = p.add_run(f"Generert fra API-data {today}. ")
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run2 = p.add_run("Felter med gul bakgrunn krever manuell utfylling.")
    run2.font.size = Pt(9)
    run2.font.italic = True
    run2.font.color.rgb = RGBColor(0x99, 0x66, 0x00)
    shading = OxmlElement("w:shd")
    shading.set(qn("w:val"), "clear")
    shading.set(qn("w:color"), "auto")
    shading.set(qn("w:fill"), "FFFF00")
    run2._element.get_or_add_rPr().append(shading)

    _docx_general_info(doc, procurement, activities)
    _docx_procedure(doc, procurement, activities)
    _docx_formal_rejection(doc, activities)
    _docx_preliminary_qualification(doc, procedure)
    _docx_qualification(doc)
    _docx_supplier_rejection(doc, activities)
    _docx_supplier_selection(doc, procedure, activities)
    _docx_bid_rejection(doc)
    _docx_clarification(doc, procurement, activities)
    _docx_negotiations(doc, procedure)
    _docx_dialog(doc, procedure)
    _docx_bids_in_evaluation(doc, activities)
    _docx_award(doc, procurement, activities)
    _docx_framework_agreement(doc, procurement)
    _docx_other(doc, procurement)
    _docx_data_quality(doc, procurement, activities)

    return doc
```

**Step 2: Update CLI `main()` — add `--format` argument**

In the argparse section, add after the `-o` argument:

```python
parser.add_argument(
    "--format",
    choices=["docx", "md"],
    default="docx",
    help="Output-format (default: docx)",
)
```

**Step 3: Update CLI `main()` — change generation logic**

Replace the generation/output block (lines ~1185-1189) with:

```python
fmt = args.format

if fmt == "md":
    result = generate_protokoll(procurement, activities)
    output_path = args.output or f"docs/protokoll-{seq_id.lower()}.md"
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(result)
else:
    doc = generate_protokoll_docx(procurement, activities)
    output_path = args.output or f"docs/protokoll-{seq_id.lower()}.docx"
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)
```

**Step 4: Update `_print_summary` for docx**

The summary function reads the file to count `<!-- MANUELT` markers. For docx, skip that count or count yellow-highlighted runs instead. Simplest approach — only count for md:

Replace the manual_count block (lines ~1102-1108):

```python
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
```

**Step 5: Verify syntax**

Run: `python3 -c "import ast; ast.parse(open('src/protokoll_generator.py').read()); print('OK')"`
Expected: `OK`

**Step 6: Commit**

```bash
git add src/protokoll_generator.py
git commit -m "Add generate_protokoll_docx and --format CLI flag"
```

---

### Task 6: Smoke test

**Step 1: Verify docx generation with mock data**

Run:

```bash
python3 -c "
from src.protokoll_generator import generate_protokoll_docx
proc = {
    'id': 1, 'sequenceId': 'TEST-001', 'name': 'Test',
    'procedure': 'Open', 'about_procurer': {'name': 'Test AS', 'national_id': '123456789'},
    'estimated_value': 1000000, 'currency': 'NOK',
    'timeline': {'0': {'type': 'submission', 'date': '2025-01-01T12:00:00Z'}},
}
activities = [
    {'action': 'SUBMIT_BID', 'date': '2025-01-01T11:00:00Z', 'organization': {'name': 'Leverandør A'}},
    {'action': 'SUBMIT_BID', 'date': '2025-01-01T11:30:00Z', 'organization': {'name': 'Leverandør B'}},
]
doc = generate_protokoll_docx(proc, activities)
doc.save('/tmp/test-protokoll.docx')
print('OK — saved to /tmp/test-protokoll.docx')
"
```

Expected: `OK — saved to /tmp/test-protokoll.docx`

**Step 2: Verify markdown still works**

Run: `python3 -c "from src.protokoll_generator import generate_protokoll; print(generate_protokoll({'id':1,'procedure':'Open','sequenceId':'X'}, [])[:50])"`
Expected: First 50 chars of markdown output

**Step 3: Lint**

Run: `ruff check src/protokoll_generator.py`
Expected: No errors (or only pre-existing ones)

**Step 4: Commit any lint fixes if needed**

```bash
git add src/protokoll_generator.py
git commit -m "Fix lint issues in docx export"
```
