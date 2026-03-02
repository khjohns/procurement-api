"""Markdown protocol generator (Del III — EØS)."""

from __future__ import annotations

import re
from datetime import datetime

from .common import (
    ALL_PROCEDURES,
    PROCEDURE_MAP,
    build_org_lookup,
    filter_post_deadline_conversations,
    fmt_currency,
    fmt_date,
    fmt_datetime,
    get_activities_by_action,
    get_org_name,
    get_timeline_date,
    parse_announcement,
    safe_int,
    strip_html,
)


# -- Section generators ------------------------------------------------------


def _section_general_info(procurement: dict, activities: list[dict]) -> str:
    lines = []
    lines.append("## Generell informasjon")
    lines.append("")

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
        duration_str = "<!-- MANUELT -->"

    submission_date = get_timeline_date(procurement, "submission")
    submission_str = (
        fmt_datetime(submission_date) if submission_date else "<!-- MANUELT -->"
    )

    lines.append("| Felt | Beskrivelse |")
    lines.append("| --- | --- |")
    lines.append(f"| **Konkurransens saksnummer:** | {sak_ref} |")
    lines.append(f"| **Oppdragsgiver(e):** | {procurer_str} |")
    lines.append(
        f"| **Protokollfører/saksbehandler:** | {contact} <!-- MANUELT: bekreft --> |"
    )
    lines.append(f"| **Beskrivelse av anskaffelsen:** | {desc_str} |")
    lines.append(
        f"| **Anskaffelsens anslåtte verdi på kunngjøringstidspunktet:** | {value_str} |"
    )
    lines.append(f"| **Kontraktens varighet:** | {duration_str} |")
    lines.append(f"| **Frist for innlevering av tilbud:** | {submission_str} |")
    lines.append("")

    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    lines.append("**Tidspunkt for mottak av tilbud:**")
    lines.append("")
    lines.append("| Leverandørens navn | Tidspunkt for mottak |")
    lines.append("| --- | --- |")
    if submissions:
        for s in submissions:
            org = s.get("organization") or {}
            org_name = org.get("name") or "Ukjent leverandør"
            date = fmt_datetime(s.get("date"))
            lines.append(f"| {org_name} | {date} |")
    else:
        lines.append("| *Ingen tilbud registrert* | |")
    lines.append("")

    return "\n".join(lines)


def _section_procedure(procurement: dict, activities: list[dict]) -> str:
    lines = []
    lines.append("## Anskaffelsesprosedyre")
    lines.append("")
    lines.append(
        "Følgende anskaffelsesprosedyre er lagt til grunn i denne konkurransen:"
    )
    lines.append("")

    procedure = procurement.get("procedure") or ""
    selected = PROCEDURE_MAP.get(procedure, "")

    for p in ALL_PROCEDURES:
        if p == selected:
            lines.append(f"- **[x] {p}**")
        else:
            lines.append(f"- \u2610 {p}")
    lines.append("")

    if procedure in ("Competitive negotiated", "Competitive dialogue"):
        lines.append(
            "**Begrunnelse for bruk av konkurransepreget dialog eller konkurranse med forhandling etter forutgående kunngjøring:**"
        )
        lines.append("<!-- MANUELT: Fyll inn begrunnelse for valg av prosedyre -->")
    else:
        lines.append(
            "**Begrunnelse for bruk av konkurransepreget dialog eller konkurranse med forhandling etter forutgående kunngjøring:**"
        )
        lines.append("Ikke relevant.")
    lines.append("")

    if procedure in ("Negotiated without publication", "Direct award"):
        code = procurement.get("direct_award_justification_code") or ""
        reason = (
            procurement.get("direct_award_justification_reason") or "<!-- MANUELT -->"
        )
        lines.append(
            "**Begrunnelse for å bruke konkurranse med forhandling uten forutgående kunngjøring eller anskaffelse uten konkurranse:**"
        )
        if code:
            lines.append(f"Hjemmel: {code}. {reason}")
        else:
            lines.append(reason)
    else:
        lines.append(
            "**Begrunnelse for å bruke konkurranse med forhandling uten forutgående kunngjøring eller anskaffelse uten konkurranse:**"
        )
        lines.append("Ikke relevant.")
    lines.append("")

    lines.append(
        "**Dersom anskaffelsen ikke deles opp i delkontrakter, begrunnelse for ikke å dele opp kontrakten (jf. FOA \u00a7 19-4):**"
    )
    lines.append(
        "<!-- MANUELT: Fyll inn begrunnelse for hvorfor det ikke er delt opp i delkontrakter -->"
    )
    lines.append("")

    announcement_date, doffin_ref, ted_ref = parse_announcement(activities)

    lines.append("**Kunngjøring:**")
    if announcement_date:
        parts = [f"Anskaffelsen ble kunngjort {announcement_date} på Doffin"]
        if doffin_ref:
            parts.append(f"referansenummer {doffin_ref} (NGOJ)")
        if ted_ref:
            parts.append(f"TED-referanse {ted_ref}")
        lines.append(", ".join(parts) + ".")
    else:
        pub_date = procurement.get("publicationDate")
        if pub_date:
            lines.append(f"Anskaffelsen ble kunngjort {fmt_date(pub_date)}.")
        else:
            lines.append("<!-- MANUELT: Kunngjøringsinformasjon mangler -->")
    lines.append("")

    return "\n".join(lines)


def _section_formal_rejection(activities: list[dict]) -> str:
    lines = []
    lines.append("## Avvisning på grunn av formalfeil, jf. FOA \u00a7 24-1")
    lines.append("")

    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        lines.append("\u2610 Ingen leverandører eller tilbud ble avvist")
        lines.append("<!-- MANUELT: Bekreft at ingen ble avvist på formalfeil -->")
    else:
        lines.append(
            "<!-- MANUELT: Avgjør hvilke avvisninger som gjelder formalfeil (\u00a7 24-1) vs. kvalifikasjon (\u00a7 24-2) -->"
        )

    lines.append("")
    lines.append("| Leverandørens navn | Begrunnelsen for avvisningen | Dato sendt |")
    lines.append("| --- | --- | --- |")
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(r.get("date"))
            lines.append(f"| {org_name} | <!-- MANUELT: begrunnelse --> | {date} |")
    else:
        lines.append("| | | |")
    lines.append("")

    return "\n".join(lines)


def _section_preliminary_qualification(procedure: str) -> str:
    lines = []
    lines.append("## Foreløpig kvalifikasjonsvurdering, jf. FOA \u00a7 17-1 annet ledd")
    lines.append("")

    if procedure == "Open":
        lines.append("Ikke relevant (åpen anbudskonkurranse).")
    else:
        lines.append("**Leverandører som er kvalifisert:**")
        lines.append("<!-- MANUELT -->")
    lines.append("")

    return "\n".join(lines)


def _section_qualification(eforms=None) -> str:
    lines = []
    lines.append("## Kvalifikasjonsvurdering")
    lines.append("")

    if eforms:
        sel = eforms.get("selection_criteria") or []
        if sel:
            lines.append("Kvalifikasjonskrav fra kunngjøringen:")
            lines.append("")
            lines.append("| Type | Beskrivelse |")
            lines.append("| --- | --- |")
            for s in sel:
                lines.append(
                    f"| {s.get('type_code') or ''} | {s.get('description') or ''} |"
                )
            lines.append("")

    lines.append(
        "<!-- MANUELT: Kvalifikasjonskrav og -vurdering er ikke tilgjengelig via API. Fyll inn basert på konkurransegrunnlaget. -->"
    )
    lines.append("")
    lines.append("**Leverandører som er kvalifisert:**")
    lines.append("<!-- MANUELT -->")
    lines.append("")
    lines.append(
        "**Hvis relevant, begrunnelse for hvorfor leverandører som har restanser i henhold til skatte- og avgiftslovgivningen har fått delta i konkurransen:**"
    )
    lines.append("<!-- MANUELT -->")
    lines.append("")

    return "\n".join(lines)


def _section_supplier_rejection(activities: list[dict]) -> str:
    lines = []
    lines.append("## Leverandører som er avvist, jf. FOA \u00a7 24-2")
    lines.append("")

    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    if not rejections:
        lines.append("\u2610 Ingen leverandører ble avvist")
        lines.append("<!-- MANUELT: Bekreft. API viser ingen avvisningshendelser. -->")
    else:
        lines.append("Følgende leverandører ble avvist:")

    lines.append("")
    lines.append("| Leverandørens navn | Begrunnelsen for avvisningen | Dato sendt |")
    lines.append("| --- | --- | --- |")
    if rejections:
        for r in rejections:
            org = r.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(r.get("date"))
            lines.append(f"| {org_name} | <!-- MANUELT: begrunnelse --> | {date} |")
    else:
        lines.append("| | | |")
    lines.append("")

    return "\n".join(lines)


def _section_supplier_selection(procedure: str, activities: list[dict]) -> str:
    lines = []
    lines.append("## Utvelgelse av leverandører")
    lines.append("")

    if procedure == "Open":
        lines.append("Ikke relevant (åpen anbudskonkurranse — ingen utvelgelsesfase).")
    elif procedure in (
        "Limited",
        "Competitive negotiated",
        "Innovation partnership",
        "Competitive dialogue",
    ):
        qualifying = get_activities_by_action(activities, "QUALIFYING_PARTICIPANTS")
        if qualifying:
            lines.append(
                "<!-- MANUELT: Fyll inn begrunnelse for utvelgelse per leverandør -->"
            )
            lines.append("")
            lines.append("| Leverandørens navn | Begrunnelse for utvelgelse |")
            lines.append("| --- | --- |")
            for q in qualifying:
                desc = q.get("description") or {}
                tenders_ids = desc.get("tendersIds") or []
                for tid in tenders_ids:
                    lines.append(f"| Leverandør (tender {tid}) | <!-- MANUELT --> |")
        else:
            lines.append("<!-- MANUELT: Fyll inn utvelgelsesresultat -->")
            lines.append("")
            lines.append("| Leverandørens navn | Begrunnelse for utvelgelse |")
            lines.append("| --- | --- |")
            lines.append("| <!-- MANUELT --> | <!-- MANUELT --> |")
    else:
        lines.append("Ikke relevant.")
    lines.append("")

    return "\n".join(lines)


def _section_bid_rejection() -> str:
    lines = []
    lines.append("## Tilbud som er avvist, jf. FOA \u00a7\u00a7 24-8 og 24-9")
    lines.append("")
    lines.append("\u2610 Ingen tilbud ble avvist")
    lines.append("<!-- MANUELT: Bekreft -->")
    lines.append("")
    lines.append("| Leverandørenes navn | Begrunnelsen for avvisningen | Dato sendt |")
    lines.append("| --- | --- | --- |")
    lines.append("| | | |")
    lines.append("")

    return "\n".join(lines)


def _section_clarification(procurement: dict, activities: list[dict]) -> str:
    lines = []
    lines.append(
        "## Ettersending og avklaring av opplysninger og dokumentasjon, jf. FOA \u00a7 23-5"
    )
    lines.append("")

    post_deadline_convs, conversations = filter_post_deadline_conversations(
        procurement, activities
    )

    if not post_deadline_convs:
        lines.append("\u2610 Det ble ikke foretatt avklaringer eller dialog")
        if not conversations:
            lines.append(
                "<!-- MANUELT: Bekreft. API har ingen avklaringshendelser for denne anskaffelsen. -->"
            )
        else:
            lines.append(
                "<!-- MANUELT: Bekreft. API har meldingshendelser, men alle er før tilbudsfrist (Q&A). -->"
            )
    else:
        lines.append(
            "Følgende avklaringer/ettersendinger ble gjennomført etter tilbudsfrist:"
        )

    lines.append("")
    lines.append("| Leverandørens navn | Dato | Hvordan? |")
    lines.append("| --- | --- | --- |")

    if post_deadline_convs:
        for c in post_deadline_convs:
            org = c.get("organization") or {}
            org_name = org.get("name") or "Ukjent"
            date = fmt_date(c.get("date"))
            desc = c.get("description") or {}
            title = desc.get("conversationTitle") or ""
            how = f"Melding i KGV: \u00ab{title}\u00bb" if title else "Melding i KGV"
            lines.append(f"| {org_name} | {date} | {how} |")
    else:
        lines.append("| | | |")
    lines.append("")

    return "\n".join(lines)


def _section_negotiations(procedure: str) -> str:
    lines = []
    lines.append("## Forhandlinger")
    lines.append("")

    if procedure in ("Competitive negotiated", "Innovation partnership"):
        lines.append("<!-- MANUELT: Fyll inn forhandlingsdetaljer -->")
        lines.append("")
        lines.append("\u2610 Det ble ikke gjennomført forhandlinger")
        lines.append("")
        lines.append(
            "| Leverandørens navn | Dato for forhandling | Mottatt revidert tilbud |"
        )
        lines.append("| --- | --- | --- |")
        lines.append("| <!-- MANUELT --> | <!-- MANUELT --> | <!-- MANUELT --> |")
    else:
        lines.append(
            f"Ikke relevant ({PROCEDURE_MAP.get(procedure, procedure)})."
            if procedure != "Open"
            else "Ikke relevant (åpen anbudskonkurranse)."
        )
    lines.append("")

    return "\n".join(lines)


def _section_dialog(procedure: str) -> str:
    lines = []
    lines.append("## Dialog")
    lines.append("")

    if procedure == "Competitive dialogue":
        lines.append("<!-- MANUELT: Fyll inn dialogdetaljer -->")
        lines.append("")
        lines.append("\u2610 Det ble ikke gjennomført dialog")
        lines.append("")
        lines.append("| Leverandørens navn | Dato for dialog |")
        lines.append("| --- | --- |")
        lines.append("| <!-- MANUELT --> | <!-- MANUELT --> |")
    else:
        lines.append(
            f"Ikke relevant ({PROCEDURE_MAP.get(procedure, procedure)})."
            if procedure != "Open"
            else "Ikke relevant (åpen anbudskonkurranse)."
        )
    lines.append("")

    return "\n".join(lines)


def _section_award_criteria(eforms=None) -> str:
    lines = []
    lines.append("## Tildelingskriterier")
    lines.append("")

    if not eforms:
        lines.append(
            "<!-- MANUELT: Fyll inn tildelingskriterier fra konkurransegrunnlaget -->"
        )
        lines.append("")
        return "\n".join(lines)

    criteria = eforms.get("award_criteria") or []
    if not criteria:
        lines.append(
            "<!-- MANUELT: Ingen tildelingskriterier funnet i kunngjøringen — fyll inn manuelt -->"
        )
        lines.append("")
        return "\n".join(lines)

    lines.append("| Kriterium | Type | Vekt |")
    lines.append("| --- | --- | --- |")
    for c in criteria:
        name = c.get("name") or "Ukjent"
        ctype = c.get("type") or ""
        weight = c.get("weight_percent")
        weight_str = f"{weight:.0f} %" if weight is not None else "<!-- MANUELT -->"
        lines.append(f"| {name} | {ctype} | {weight_str} |")
    lines.append("")

    env = eforms.get("env_criterion_code")
    if env:
        env_labels = {
            "quality-nor-env-criteria": "Klima/miljø vektet i tildelingskriteriene (§ 7-9 (2)–(3))",
            "quality-nor-env-spec": "Klima/miljø ivaretatt i kravspesifikasjonen (§ 7-9 (4))",
            "quality-nor-env-none": "Ubetydelig klima-/miljøavtrykk — unntak (§ 7-9 (5))",
        }
        label = env_labels.get(env, env)
        lines.append(f"**Miljøkrav FOA § 7-9:** {label}")
        lines.append("")

    return "\n".join(lines)


def _section_bids_in_evaluation(
    activities: list[dict], org_lookup: dict[str, str]
) -> str:
    lines = []
    lines.append("## Tilbud som er med i tildelingsvurderingen")
    lines.append("")

    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    withdrawals = get_activities_by_action(activities, "WITHDRAW_PARTICIPATION")

    rejected_ids = {(r.get("organization") or {}).get("id") for r in rejections} - {
        None
    }
    withdrawn_ids = {(w.get("organization") or {}).get("id") for w in withdrawals} - {
        None
    }
    excluded_ids = rejected_ids | withdrawn_ids
    excluded_names = {
        get_org_name(r, org_lookup).lower() for r in [*rejections, *withdrawals]
    }

    evaluated = []
    for s in submissions:
        org_id = (s.get("organization") or {}).get("id")
        if org_id and org_id in excluded_ids:
            continue
        name = get_org_name(s, org_lookup)
        if name.lower() in excluded_names:
            continue
        evaluated.append(name)

    lines.append("| Tilbuds-/løpenummer | Leverandørenes navn |")
    lines.append("| --- | --- |")
    if evaluated:
        for i, name in enumerate(evaluated, 1):
            lines.append(f"| {i} | {name} |")
    else:
        lines.append("| | <!-- MANUELT --> |")
    lines.append("")

    return "\n".join(lines)


def _section_award(procurement: dict, activities: list[dict]) -> str:
    lines = []
    lines.append("## Det (de) valgte tilbud med begrunnelse og kontraktsverdi")
    lines.append("")
    lines.append(
        "<!-- MANUELT: Fyll inn navn på valgt leverandør, tildelingsbegrunnelse og kontraktsverdi. API gir kun tenderIds, ikke leverandørnavn eller begrunnelse. -->"
    )
    lines.append("")

    total_value = procurement.get("contracts_total_value_amount")
    estimated = procurement.get("estimated_value")
    currency = procurement.get("currency") or "NOK"
    if total_value:
        lines.append(f"**Kontraktsverdi:** {fmt_currency(total_value, currency)}")
    elif estimated:
        lines.append(
            f"**Kontraktsverdi:** {fmt_currency(estimated, currency)} (estimert verdi)"
        )
    else:
        lines.append("**Kontraktsverdi:** <!-- MANUELT -->")
    lines.append("")

    award_letters = procurement.get("areAwardLettersSent")

    lines.append("| Felt | Beskrivelse |")
    lines.append("| --- | --- |")
    if award_letters:
        lines.append(
            "| **Meddelelsesbrev sendt:** | <!-- MANUELT: areAwardLettersSent=True, men dato ikke i API --> |"
        )
    else:
        lines.append("| **Meddelelsesbrev sendt:** | <!-- MANUELT --> |")
    lines.append("| **Karensperiodens utløp:** | <!-- MANUELT --> |")
    lines.append("| **Eventuelle klager:** | <!-- MANUELT --> |")
    lines.append("| **Resultat av klage:** | <!-- MANUELT --> |")
    lines.append("")

    award_date = get_timeline_date(procurement, "award decision")
    if award_date:
        lines.append(f"**Tildelingsbeslutning:** {fmt_date(award_date)}")
    else:
        award_activities = get_activities_by_action(activities, "AWARDING_PARTICIPANTS")
        if award_activities:
            lines.append(
                f"**Tildelingsbeslutning:** {fmt_date(award_activities[0].get('date'))}"
            )
        else:
            lines.append("**Tildelingsbeslutning:** <!-- MANUELT -->")
    lines.append("")

    return "\n".join(lines)


def _section_framework_agreement(procurement: dict) -> str:
    lines = []
    lines.append("## Tildeling av rammeavtaler")
    lines.append("")

    is_framework = procurement.get("framework_agreement_involved")
    if not is_framework:
        lines.append("Ikke relevant (dette er ikke en rammeavtale).")
    else:
        max_participants = safe_int(
            procurement.get("framework_agreement_maximum_participants")
        )
        if max_participants is not None and max_participants == 1:
            lines.append("- **Rammeavtale med en leverandør?** Ja")
            lines.append("- **Rammeavtale med flere leverandører?** Nei")
        elif max_participants is not None and max_participants > 1:
            lines.append("- **Rammeavtale med en leverandør?** Nei")
            lines.append(
                f"- **Rammeavtale med flere leverandører?** Ja (maks {max_participants} deltakere)"
            )
            lines.append(
                "- Ved rammeavtale med flere leverandører; Hvilken fordelingsmekanisme skal benyttes? <!-- MANUELT -->"
            )
            lines.append(
                "- Ved minikonkurranse som fordelingsmekanisme; Hvilke kriterier skal brukes? <!-- MANUELT -->"
            )
        else:
            lines.append("- **Rammeavtale med en leverandør?** <!-- MANUELT -->")
            lines.append("- **Rammeavtale med flere leverandører?** <!-- MANUELT -->")
    lines.append("")

    return "\n".join(lines)


def _section_other(procurement: dict) -> str:
    lines = []
    lines.append("## Andre opplysninger og avslutning")
    lines.append("")
    lines.append(
        "**Hvis relevant, hvilke deler av kontrakten valgte leverandør planlegger at underleverandører skal utføre, og underleverandørens navn, forutsatt at opplysningene er kjent:**"
    )
    lines.append("<!-- MANUELT -->")
    lines.append("")

    is_cancelled = procurement.get("isCancelled")
    if is_cancelled:
        reason = (
            procurement.get("cancelingReason")
            or "<!-- MANUELT: begrunnelse mangler -->"
        )
        lines.append(
            "**Hvis relevant, begrunnelse for hvorfor konkurransen avlyses, jf. FOA \u00a7 25-4:**"
        )
        lines.append(reason)
    else:
        lines.append(
            "**Hvis relevant, begrunnelse for hvorfor konkurransen avlyses, jf. FOA \u00a7 25-4:**"
        )
        lines.append("Ikke relevant (konkurransen ble ikke avlyst).")
    lines.append("")

    lines.append(
        "**Hvis relevant, opplysninger om tilfeller av inhabilitet eller konkurransevridning som følge av dialog med leverandørene, og eventuelle avhjelpende tiltak som er gjennomført:**"
    )
    lines.append("<!-- MANUELT -->")
    lines.append("")

    lines.append(
        "**Andre opplysninger, vesentlige forhold eller viktige beslutninger som er av betydning for konkurransen:**"
    )
    lines.append("<!-- MANUELT -->")
    lines.append("")

    return "\n".join(lines)


def _section_data_quality(procurement: dict, activities: list[dict]) -> str:
    lines = []
    lines.append("## Datakvalitet — API vs. manuelt")
    lines.append("")

    submissions = get_activities_by_action(activities, "SUBMIT_BID")
    rejections = get_activities_by_action(activities, "REJECT_PARTICIPATION")
    doffin = get_activities_by_action(activities, "DOFFIN_NOTICE_STATUS_PUBLISHED")
    publish = get_activities_by_action(activities, "PUBLISH_TO_DOFFIN")

    post_deadline, _ = filter_post_deadline_conversations(procurement, activities)

    lines.append("| Seksjon | Kilde | Merknad |")
    lines.append("| --- | --- | --- |")
    lines.append("| Generell informasjon | API | Komplett |")
    lines.append(
        f"| Tidspunkt for mottak | API (SUBMIT_BID) | {'Komplett' if submissions else 'Ingen tilbud registrert'} |"
    )
    lines.append("| Prosedyretype | API (procedure) | Komplett |")
    lines.append(
        f"| Kunngjøring | API {'(DOFFIN_NOTICE)' if doffin or publish else ''} | {'Komplett' if doffin or publish else 'Trenger bekreftelse'} |"
    )

    if rejections:
        lines.append(
            f"| Avvisning (formalfeil) | API ({len(rejections)} hendelser) | Trenger manuell klassifisering |"
        )
    else:
        lines.append(
            "| Avvisning (formalfeil) | API (ingen hendelser) | Trenger bekreftelse |"
        )

    lines.append("| Kvalifikasjonsvurdering | **Manuelt** | Ikke i API |")

    if rejections:
        lines.append(
            f"| Avvisning av leverandører | API ({len(rejections)} hendelser) | Begrunnelse mangler |"
        )
    else:
        lines.append(
            "| Avvisning av leverandører | API (ingen hendelser) | Trenger bekreftelse |"
        )

    lines.append(
        "| Avvisning av tilbud | API (ingen hendelser) | Trenger bekreftelse |"
    )

    if post_deadline:
        lines.append(
            f"| Ettersending/avklaring | API ({len(post_deadline)} meldinger etter frist) | Innhold mangler |"
        )
    else:
        lines.append(
            "| Ettersending/avklaring | API (ingen hendelser) | Trenger bekreftelse |"
        )

    lines.append(
        f"| Tilbud i vurdering | API (SUBMIT_BID) | {'Komplett' if submissions else 'Ingen'} |"
    )
    lines.append(
        "| Valgte tilbud + begrunnelse | **Manuelt** | API har kun tenderIds |"
    )
    lines.append("| Meddelelsesbrev/karens | **Manuelt** | Kun flag, ikke datoer |")
    lines.append("| Delkontrakter (begrunnelse) | **Manuelt** | Ikke i API |")
    lines.append("| Underleverandører | **Manuelt** | Ikke i API |")
    lines.append("| Inhabilitet | **Manuelt** | Ikke i API |")

    return "\n".join(lines)


# -- Main generator ----------------------------------------------------------


def generate_protokoll(procurement: dict, activities: list[dict], eforms=None) -> str:
    """Generate a complete anskaffelsesprotokoll in markdown.

    Args:
        procurement: Full procurement object from Artifik API.
        activities: List of activity objects from get_procurement_activities.
        eforms: Optional eForms data from Doffin for enrichment.

    Returns:
        Markdown string with the protocol.
    """
    procedure = procurement.get("procedure") or ""
    seq_id = procurement.get("sequenceId") or procurement.get("name") or "Ukjent"
    today = datetime.now().strftime("%Y-%m-%d")
    org_lookup = build_org_lookup(activities)

    sections = []

    sections.append(f"# ANSKAFFELSESPROTOKOLL — {seq_id}")
    sections.append("")
    sections.append(
        f"> **Generert fra API-data {today}.** Felter markert med `<!-- MANUELT -->` krever manuell utfylling."
    )
    sections.append("")

    sections.append(_section_general_info(procurement, activities))
    sections.append("---\n")
    sections.append(_section_procedure(procurement, activities))
    sections.append("---\n")
    sections.append(_section_formal_rejection(activities))
    sections.append("---\n")
    sections.append(_section_preliminary_qualification(procedure))
    sections.append("---\n")
    sections.append(_section_qualification(eforms))
    sections.append("---\n")
    sections.append(_section_supplier_rejection(activities))
    sections.append("---\n")
    sections.append(_section_supplier_selection(procedure, activities))
    sections.append("---\n")
    sections.append(_section_bid_rejection())
    sections.append("---\n")
    sections.append(_section_clarification(procurement, activities))
    sections.append("---\n")
    sections.append(_section_negotiations(procedure))
    sections.append("---\n")
    sections.append(_section_dialog(procedure))
    sections.append("---\n")
    sections.append(_section_award_criteria(eforms))
    sections.append("---\n")
    sections.append(_section_bids_in_evaluation(activities, org_lookup))
    sections.append("---\n")
    sections.append(_section_award(procurement, activities))
    sections.append("---\n")
    sections.append(_section_framework_agreement(procurement))
    sections.append("---\n")
    sections.append(_section_other(procurement))
    sections.append("---\n")
    sections.append(_section_data_quality(procurement, activities))

    return "\n".join(sections) + "\n"
