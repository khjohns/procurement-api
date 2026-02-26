"""Word document generator for Del II (nasjonal, under EØS) anskaffelsesprotokoll."""

from __future__ import annotations

import re
from datetime import datetime

from docx import Document as DocxDocument

from .common import (
    ALL_DEL2_PROCEDURES,
    DEL2_PROCEDURE_MAP,
    fmt_currency,
    fmt_date,
    fmt_datetime,
    get_activities_by_action,
    get_timeline_date,
    parse_submission_deadline,
    strip_html,
)
from .docx_helpers import (
    add_manual,
    docx_add_table,
    docx_add_table_with_manual,
    docx_info_table,
    docx_setup,
    docx_subtitle,
)
# Reuse shared sections from Del III
from .docx_del3 import (
    _bids_in_evaluation,
    _framework_agreement,
)


def _general_info(doc, procurement, activities):
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

    name = strip_html(procurement.get("name") or "")
    description = strip_html(procurement.get("description") or "")
    description = re.sub(r"\s*\n\s*", " ", description)
    desc_str = name
    if description and description.lower() != name.lower():
        desc_str += f". {description}"

    estimated_value = procurement.get("estimated_value")
    currency = procurement.get("currency") or "NOK"
    value_str = fmt_currency(estimated_value, currency)

    duration_months = procurement.get("duration_months")
    duration = procurement.get("duration")
    if duration_months:
        duration_str = f"{duration_months} måneder"
    elif duration:
        duration_str = str(duration)
    else:
        duration_str = None

    submission_date = get_timeline_date(procurement, "submission")
    submission_str = fmt_datetime(submission_date) if submission_date else None

    docx_info_table(doc, [
        ("Konkurransens saksnummer:", sak_ref),
        ("Oppdragsgiver(e):", procurer_str),
        ("Protokollfører/saksbehandler:", contact or None),
        ("Beskrivelse av anskaffelsen:", desc_str),
        ("Kontraktens anslåtte verdi på kunngjøringstidspunktet:", value_str),
        ("Kontraktens varighet:", duration_str),
        ("Frist for innlevering av tilbud:", submission_str),
    ])

    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    p = doc.add_paragraph()
    p.add_run("Tidspunkt for mottak av tilbud:").bold = True

    if submissions:
        rows = []
        for s in submissions:
            org = s.get("organization") or {}
            org_name = org.get("name") or "Ukjent leverandør"
            date = fmt_datetime(s.get("date"))
            rows.append((org_name, date))
        docx_add_table(doc, ["Leverandørens navn", "Tidspunkt for mottak"], rows)
    else:
        docx_add_table(doc, ["Leverandørens navn", "Tidspunkt for mottak"],
                        [("Ingen tilbud registrert", "")])


def _procedure(doc, procurement, activities):
    doc.add_heading("Anskaffelsesprosedyre", level=2)
    doc.add_paragraph("Følgende anskaffelsesprosedyre er lagt til grunn i denne konkurransen:")

    procedure = procurement.get("procedure") or ""
    selected = DEL2_PROCEDURE_MAP.get(procedure, "")

    for p_name in ALL_DEL2_PROCEDURES:
        if p_name == selected:
            doc.add_paragraph(f"\u2612 {p_name}").runs[0].bold = True
        else:
            doc.add_paragraph(f"\u2610 {p_name}")

    # Kunngjøring
    doffin_activities = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish_activities = get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")
    announcement_date = ""
    doffin_ref = ""
    ted_ref = ""
    if publish_activities:
        announcement_date = fmt_date(publish_activities[0].get("date"))
    if doffin_activities:
        desc = doffin_activities[0].get("description") or {}
        doffin_notice = desc.get("doffinNotice") or {}
        doffin_ref = doffin_notice.get("ngoj") or ""
        ted_ref = doffin_notice.get("publicationId") or ""
        if not announcement_date:
            announcement_date = fmt_date(
                doffin_notice.get("publicationDate") or doffin_activities[0].get("date")
            )

    if announcement_date:
        parts = [f"Kunngjort {announcement_date} i DOFFIN"]
        if doffin_ref:
            parts.append(f"ref. {doffin_ref}")
        if ted_ref:
            parts.append(f"TED {ted_ref}")
        kunngj_str = ", ".join(parts)
    else:
        pub_date = procurement.get("publicationDate")
        kunngj_str = f"Kunngjort {fmt_date(pub_date)}" if pub_date else None

    docx_info_table(doc, [
        ("Kunngjøring:", kunngj_str),
    ])


def _dialog(doc, procurement, activities):
    """Dialog og/eller forhandlinger, jf. FOA § 9-3."""
    doc.add_heading("Dialog og/eller forhandlinger, jf. FOA \u00a7 9-3", level=2)

    p = doc.add_paragraph()
    p.add_run("Hvis relevant, begrunnelse for å fravike opplysningene i anskaffelsesdokumentene om planlagt dialog:").bold = True
    p2 = doc.add_paragraph()
    add_manual(p2)

    doc.add_paragraph("\u2610 Ingen dialog eller forhandlinger gjennomført")
    p = doc.add_paragraph()
    add_manual(p, "[Bekreft]")

    docx_add_table_with_manual(doc,
        ["Leverandørens navn", "Dato", "Begrunnelse for hvorfor leverandøren er valgt ut til dialog"],
        [(None, None, None)])

    docx_info_table(doc, [
        ("Inhabilitet/konkurransevridning som følge av dialog, og avhjelpende tiltak:", None),
    ])


def _formal_rejection(doc, activities):
    """Avvisning formalfeil, jf. FOA § 9-4."""
    doc.add_heading("Avvisning på grunn av formalfeil, jf. FOA \u00a7 9-4", level=2)

    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        doc.add_paragraph("\u2610 Ingen avvist på grunn av formalfeil")
        p = doc.add_paragraph()
        add_manual(p, "[Bekreft at ingen ble avvist på formalfeil]")
    else:
        p = doc.add_paragraph()
        add_manual(p, "[Avgjør hvilke avvisninger som gjelder formalfeil (\u00a7 9-4) vs. kvalifikasjon (\u00a7 9-5)]")

    rows = []
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(r.get("date"))
            rows.append((org_name, None, date))
    else:
        rows.append(("", "", ""))
    docx_add_table_with_manual(doc,
        ["Leverandørens navn", "Begrunnelsen for avvisningen", "Begrunnelse ble sendt"], rows)


def _qualification(doc):
    """Three-tier qualification (full, preliminary § 8-10, chosen supplier)."""
    # Tier 1: Full qualification
    doc.add_heading("Kvalifikasjonsvurdering", level=2)
    doc.add_paragraph("Matrisen strykes hvis ikke relevant. Matrisen benyttes hvis det ikke kreves egenerklæring som et foreløpig dokumentasjonsbevis for at leverandøren oppfyller kvalifikasjonskravene.")
    p = doc.add_paragraph()
    add_manual(p, "[Kvalifikasjonskrav og -vurdering. Fyll inn basert på konkurransegrunnlaget.]")

    docx_info_table(doc, [
        ("Leverandører som er kvalifisert:", None),
        ("Begrunnelse for leverandører med skatte-/avgiftsrestanser:", None),
    ])

    # Tier 2: Preliminary qualification via self-declaration
    doc.add_heading("Foreløpig kvalifikasjonsvurdering", level=2)
    doc.add_paragraph("Matrisen strykes hvis ikke relevant. Matrisen benyttes hvis det kreves egenerklæring som et foreløpig dokumentasjonsbevis for at leverandøren oppfyller kvalifikasjonskravene, jf. FOA \u00a7 8-10 (1).")

    docx_info_table(doc, [
        ("Leverandører som er kvalifisert:", None),
    ])

    # Tier 3: Qualification of chosen supplier(s)
    doc.add_heading("Kvalifikasjonsvurdering av valgte leverandør(er)", level=2)
    doc.add_paragraph("Matrisen strykes hvis ikke relevant. Matrisen benyttes hvis det kreves egenerklæring som et foreløpig dokumentasjonsbevis. Oppdragsgiver skal kreve at valgte leverandør leverer oppdaterte dokumentasjonsbevis, jf. FOA \u00a7 8-10 (2).")

    docx_info_table(doc, [
        ("Leverandør(er) som er kvalifisert:", None),
        ("Begrunnelse for leverandør med skatte-/avgiftsrestanser:", None),
    ])


def _supplier_rejection(doc, activities):
    """Leverandører avvist, jf. FOA § 9-5."""
    doc.add_heading("Leverandører som er avvist, jf. FOA \u00a7 9-5", level=2)

    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        doc.add_paragraph("\u2610 Ingen leverandører avvist")
        p = doc.add_paragraph()
        add_manual(p, "[Bekreft. API viser ingen avvisningshendelser.]")
    else:
        doc.add_paragraph("Følgende leverandører ble avvist:")

    rows = []
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(r.get("date"))
            rows.append((org_name, None, date))
    else:
        rows.append(("", "", ""))
    docx_add_table_with_manual(doc,
        ["Leverandørens navn", "Begrunnelsen for avvisningen", "Begrunnelse ble sendt"], rows)


def _supplier_selection(doc, procedure, activities):
    """Utvelgelse — only for begrenset tilbudskonkurranse."""
    doc.add_heading("Utvelgelse av leverandører", level=2)

    if procedure != "Limited":
        doc.add_paragraph("Matrisen strykes hvis ikke relevant. Gjelder kun ved begrenset tilbudskonkurranse.")
        doc.add_paragraph("Ikke relevant (åpen tilbudskonkurranse).")
        return

    doc.add_paragraph("Gjelder kun ved begrenset tilbudskonkurranse.")
    qualifying = get_activities_by_action(activities, "QUALIFYING_PARTICIPANTS")
    p = doc.add_paragraph()
    add_manual(p, "[Fyll inn begrunnelse for utvelgelse per leverandør]")
    if qualifying:
        rows = []
        for q in qualifying:
            desc = q.get("description") or {}
            tenders_ids = desc.get("tendersIds") or []
            for tid in tenders_ids:
                rows.append((f"Leverandør (tender {tid})", None))
        if rows:
            docx_add_table_with_manual(doc,
                ["Leverandørens navn", "Begrunnelse for utvelgelse"], rows)
    else:
        docx_add_table_with_manual(doc,
            ["Leverandørens navn", "Begrunnelse for utvelgelse"], [(None, None)])


def _bid_rejection(doc):
    """Tilbud avvist, jf. FOA § 9-6."""
    doc.add_heading("Tilbud som er avvist, jf. FOA \u00a7 9-6", level=2)
    doc.add_paragraph("\u2610 Ingen tilbud avvist")
    p = doc.add_paragraph()
    add_manual(p, "[Bekreft]")
    docx_add_table(doc,
        ["Leverandørens navn", "Begrunnelsen for avvisningen", "Begrunnelse ble sendt"],
        [("", "", "")])


def _clarification(doc, procurement, activities):
    """Ettersending og avklaring (basert på grunnleggende prinsipper)."""
    doc.add_heading("Ettersending og avklaring", level=2)

    submission_deadline = parse_submission_deadline(procurement)
    conversations = get_activities_by_action(activities, "CONVERSATION_MARKED_COMPLETED")

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
        doc.add_paragraph("\u2610 Det ble ikke foretatt avklaringer eller ettersendinger")
        if not conversations:
            p = doc.add_paragraph()
            add_manual(p, "[Bekreft. API har ingen avklaringshendelser for denne anskaffelsen.]")
        else:
            p = doc.add_paragraph()
            add_manual(p, "[Bekreft. API har meldingshendelser, men alle er før tilbudsfrist (Q&A).]")
    else:
        doc.add_paragraph("Følgende avklaringer/ettersendinger ble gjennomført etter tilbudsfrist:")

    rows = []
    if post_deadline_convs:
        for c in post_deadline_convs:
            org = c.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(c.get("date"))
            desc = c.get("description") or {}
            title = desc.get("conversationTitle") or ""
            how = f"Melding i KGV: \u00ab{title}\u00bb" if title else "Melding i KGV"
            rows.append((org_name, date, how))
    else:
        rows.append(("", "", ""))
    docx_add_table(doc, ["Leverandørens navn", "Dato", "Hvordan?"], rows)


def _award(doc, procurement, activities):
    """Valgt tilbud med begrunnelse og kontraktsverdi."""
    doc.add_heading("Det (de) valgte tilbud med begrunnelse og kontraktsverdi", level=2)

    doc.add_paragraph("Begrunnelsen skal inneholde tilstrekkelig informasjon om det valgte tilbud til at leverandøren kan vurdere om oppdragsgivers valg har vært saklig og forsvarlig. Begrunnelsen skal inneholde opplysninger om navnet på valgte leverandør, valgte tilbuds verdi, relative fordeler og egenskaper i forhold til de øvrige tilbudene.")

    p = doc.add_paragraph()
    add_manual(p, "[Fyll inn navn på valgt leverandør, tildelingsbegrunnelse og kontraktsverdi.]")

    total_value = procurement.get("contracts_total_value_amount")
    estimated = procurement.get("estimated_value")
    currency = procurement.get("currency") or "NOK"
    if total_value:
        value_str = fmt_currency(total_value, currency)
    elif estimated:
        value_str = f"{fmt_currency(estimated, currency)} (estimert verdi)"
    else:
        value_str = None

    award_date = get_timeline_date(procurement, "award decision")
    if not award_date:
        award_activities = get_activities_by_action(activities, "AWARDING_PARTICIPANTS")
        if award_activities:
            award_date = award_activities[0].get("date")
    award_str = fmt_date(award_date) if award_date else None

    docx_info_table(doc, [
        ("Kontraktsverdi:", value_str),
        ("Tildelingsbeslutning:", award_str),
    ])


def _award_notification(doc, procurement):
    """Meddelelse om tildeling og klagefrist (not karensperiode)."""
    doc.add_heading("Meddelelse om tildeling og klagefrist før inngåelse av kontrakt", level=2)

    award_letters = procurement.get("areAwardLettersSent")
    docx_info_table(doc, [
        ("Meddelelsesbrev sendt:", "Sendt (dato ikke tilgjengelig i API)" if award_letters else None),
        ("Klagefrist:", None),
        ("Eventuelle klager:", None),
        ("Resultat av klage:", None),
    ])


def _other(doc, procurement):
    """Andre opplysninger — § 10-4 for avlysning."""
    doc.add_heading("Andre opplysninger og avslutning", level=2)

    is_cancelled = procurement.get("isCancelled")
    if is_cancelled:
        reason = procurement.get("cancelingReason") or ""
        cancel_str = reason if reason else None
    else:
        cancel_str = "Ikke relevant (konkurransen ble ikke avlyst)."

    docx_info_table(doc, [
        ("Underleverandører (hvilke deler av kontrakten, navn):", None),
        ("Begrunnelse for avlysning, jf. FOA \u00a7 10-4 (1):", cancel_str),
        ("Andre opplysninger, vesentlige forhold eller viktige beslutninger:", None),
    ])


def _data_quality(doc, procurement, activities):
    doc.add_heading("Datakvalitet — API vs. manuelt", level=2)

    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    doffin = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish = get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")

    submission_deadline = parse_submission_deadline(procurement)
    conversations = get_activities_by_action(activities, "CONVERSATION_MARKED_COMPLETED")
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
        ("Dialog/forhandlinger \u00a7 9-3", "Manuelt", "Ikke i API"),
        ("Avvisning formalfeil \u00a7 9-4", f"API ({len(rejections)} hendelser)" if rejections else "API (ingen hendelser)", "Trenger manuell klassifisering" if rejections else "Trenger bekreftelse"),
        ("Kvalifikasjonsvurdering", "Manuelt", "Ikke i API"),
        ("Avvisning leverandører \u00a7 9-5", f"API ({len(rejections)} hendelser)" if rejections else "API (ingen hendelser)", "Begrunnelse mangler" if rejections else "Trenger bekreftelse"),
        ("Avvisning tilbud \u00a7 9-6", "API (ingen hendelser)", "Trenger bekreftelse"),
        ("Ettersending/avklaring", f"API ({len(post_deadline)} meldinger etter frist)" if post_deadline else "API (ingen hendelser)", "Innhold mangler" if post_deadline else "Trenger bekreftelse"),
        ("Tilbud i vurdering", "API (SUBMIT_BID)", "Komplett" if submissions else "Ingen"),
        ("Valgte tilbud + begrunnelse", "Manuelt", "API har kun tenderIds"),
        ("Meddelelsesbrev/klagefrist", "Manuelt", "Kun flag, ikke datoer"),
        ("Underleverandører", "Manuelt", "Ikke i API"),
        ("Inhabilitet", "Manuelt", "Ikke i API"),
    ]
    docx_add_table(doc, ["Seksjon", "Kilde", "Merknad"], rows)


# -- Main generator ----------------------------------------------------------

def generate_protokoll_docx_del2(procurement: dict, activities: list[dict]) -> DocxDocument:
    """Generate anskaffelsesprotokoll for Del II (nasjonal, under EØS) as Word document."""
    procedure = procurement.get("procedure") or ""
    seq_id = procurement.get("sequenceId") or procurement.get("name") or "Ukjent"
    today = datetime.now().strftime("%d.%m.%Y")

    doc = DocxDocument()
    docx_setup(doc)

    doc.add_heading(f"ANSKAFFELSESPROTOKOLL for anskaffelser etter forskriften del II — {seq_id}", level=1)
    docx_subtitle(doc, seq_id, today)

    _general_info(doc, procurement, activities)
    _procedure(doc, procurement, activities)
    _dialog(doc, procurement, activities)
    _formal_rejection(doc, activities)
    _qualification(doc)
    _supplier_rejection(doc, activities)
    _supplier_selection(doc, procedure, activities)
    _bid_rejection(doc)
    _clarification(doc, procurement, activities)
    _bids_in_evaluation(doc, activities)  # reused from Del III
    _award(doc, procurement, activities)
    _award_notification(doc, procurement)
    _framework_agreement(doc, procurement)  # reused from Del III
    _other(doc, procurement)
    _data_quality(doc, procurement, activities)

    return doc
