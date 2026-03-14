/**
 * Per-section info row builders for the protokoll page.
 * Each function builds the rows for one `info-table` section.
 *
 * Extracted from the getInfoRows() switch in +page.svelte.
 */

import { formatDato, formatDatoTid } from './format';
import {
  stripHtml,
  getTimelineDate,
  getOrgName,
  getOrgNameWithLookup,
  buildOrgLookup,
  fmtCurrency,
  formatThreshold,
  PROCEDURE_LABELS,
  CONTRACT_NATURE_LABELS,
} from './protokoll-helpers';

export type InfoRow = { label: string; value: any; mono?: boolean };

// ── Section row builders ──

export function generellInfoRows(proc: any): InfoRow[] {
  const procurer = proc.about_procurer ?? {};
  const procurerStr = procurer.name
    ? procurer.national_id
      ? `${procurer.name} (org.nr. ${procurer.national_id})`
      : procurer.name
    : (proc.buyerName ?? proc.buyer?.name);

  const name = stripHtml(proc.name ?? '');
  const desc = stripHtml(proc.description ?? '').replace(/\s*\n\s*/g, ' ');
  const descStr =
    name && desc && desc.toLowerCase() !== name.toLowerCase() ? `${name}. ${desc}` : name || desc;

  const durationMonths = proc.duration_months;
  const duration = proc.duration;
  const durationStr = durationMonths
    ? `${durationMonths} måneder`
    : duration
      ? String(duration)
      : null;

  const seqId = proc.sequenceId ?? '';
  const extId = proc.externalId;
  const refStr = extId ? `${seqId} (ekstern ref: ${extId})` : seqId;

  return [
    { label: 'Saksnummer', value: refStr, mono: true },
    { label: 'Oppdragsgiver', value: procurerStr },
    { label: 'Protokollfører', value: procurer.contact_person },
    { label: 'Beskrivelse', value: descStr },
    { label: 'Estimert verdi', value: fmtCurrency(proc.estimated_value, proc.currency), mono: true },
    { label: 'Kontraktens varighet', value: durationStr },
    { label: 'Tilbudsfrist', value: formatDatoTid(getTimelineDate(proc, 'submission')) },
  ];
}

export function mottakTilbudRows(activities: any[]): InfoRow[] {
  const submissions = activities.filter((a: any) => a.action === 'SUBMIT_BID');
  if (!submissions.length) return [{ label: 'Mottak av tilbud', value: 'Ingen tilbud registrert' }];
  return submissions.map((s: any) => ({
    label: getOrgName(s),
    value: formatDatoTid(s.date),
    mono: true,
  }));
}

export function prosedyreRows(proc: any, eforms: any, activities: any[]): InfoRow[] {
  const procedure = proc.procedure ?? '';
  const rows: InfoRow[] = [
    { label: 'Prosedyre', value: PROCEDURE_LABELS[procedure] ?? procedure },
  ];

  if (eforms?.contract_nature) {
    rows.push({
      label: 'Kontraktstype',
      value: CONTRACT_NATURE_LABELS[eforms.contract_nature] ?? eforms.contract_nature,
    });
  }

  const kunngj = kunngjoringStr(proc, activities);
  if (kunngj) rows.push({ label: 'Kunngjøring', value: kunngj });

  if (['Negotiated without publication', 'Direct award'].includes(procedure)) {
    const code = proc.direct_award_justification_code ?? '';
    const reason = proc.direct_award_justification_reason ?? '';
    const justification =
      code && reason ? `Hjemmel: ${code}. ${reason}` : code || reason || null;
    rows.push({ label: 'Hjemmel for direkteanskaffelse', value: justification });
  }

  rows.push({ label: 'Terskel', value: formatThreshold(proc.threshold) });
  return rows;
}

/** Kunngjøring — Doffin/TED ref from activities. */
export function kunngjoringStr(proc: any, activities: any[]): string | null {
  const doffinActs = activities.filter(
    (a: any) => a.action === 'DOFFIN_NOTICE_STATUS_PUBLISHED'
  );
  const publishActs = activities.filter((a: any) => a.action === 'PUBLISH_TO_DOFFIN');

  let announcementDate = '';
  let doffinRef = '';
  let tedRef = '';

  if (publishActs.length) announcementDate = formatDato(publishActs[0].date);
  if (doffinActs.length) {
    const desc = doffinActs[0].description ?? {};
    const notice = desc.doffinNotice ?? {};
    doffinRef = notice.ngoj ?? '';
    tedRef = notice.publicationId ?? '';
    if (!announcementDate) {
      announcementDate = formatDato(notice.publicationDate ?? doffinActs[0].date);
    }
  }

  if (announcementDate) {
    const parts = [`Kunngjort ${announcementDate} på Doffin`];
    if (doffinRef) parts.push(`ref. ${doffinRef} (NGOJ)`);
    if (tedRef) parts.push(`TED ${tedRef}`);
    return parts.join(', ');
  }

  const pubDate = proc?.publicationDate;
  return pubDate ? `Kunngjort ${formatDato(pubDate)}` : null;
}

export function ettersendingRows(proc: any, activities: any[]): InfoRow[] {
  const submissionDate = getTimelineDate(proc, 'submission');
  const conversations = activities.filter(
    (a: any) => a.action === 'CONVERSATION_MARKED_COMPLETED'
  );
  const orgLookup = buildOrgLookup(activities);

  if (!submissionDate || !conversations.length) {
    return [{ label: 'Status', value: 'Ingen avklaringer registrert' }];
  }

  const deadline = new Date(submissionDate);
  const postDeadline = conversations.filter(
    (c: any) => new Date(c.date) > deadline
  );

  if (!postDeadline.length) {
    return [
      {
        label: 'Status',
        value: 'Ingen avklaringer etter tilbudsfrist (meldinger finnes, men alle er Q&A før frist)',
      },
    ];
  }

  return postDeadline.map((c: any) => {
    const name = getOrgNameWithLookup(c, orgLookup);
    const title = c.description?.conversationTitle ?? '';
    const how = title ? `Melding i KGV: «${title}»` : 'Melding i KGV';
    return { label: name, value: `${formatDato(c.date)} — ${how}` };
  });
}

export function tildelingskriterierRows(eforms: any): InfoRow[] {
  if (eforms?.award_criteria) {
    return eforms.award_criteria.map((c: any) => ({
      label: c.name ?? c.description ?? 'Kriterium',
      value: c.weight_percent != null ? `${c.weight_percent}%` : '—',
      mono: true,
    }));
  }
  return [{ label: 'Tildelingskriterier', value: 'Ikke tilgjengelig fra eForms' }];
}

export function valgtTilbudRows(proc: any, activities: any[]): InfoRow[] {
  const totalValue = proc.contracts_total_value_amount;
  const estimated = proc.estimated_value;
  const currency = proc.currency ?? 'NOK';
  let valueStr: string | null = null;
  if (totalValue) valueStr = fmtCurrency(totalValue, currency);
  else if (estimated) valueStr = `${fmtCurrency(estimated, currency)} (estimert verdi)`;

  let awardDate = getTimelineDate(proc, 'award decision');
  if (!awardDate) {
    const awardAct = activities.find((a: any) => a.action === 'AWARDING_PARTICIPANTS');
    awardDate = awardAct?.date ?? null;
  }

  return [
    { label: 'Kontraktsverdi', value: valueStr ?? '—', mono: true },
    { label: 'Tildelingsbeslutning', value: formatDato(awardDate) },
    {
      label: 'Meddelelsesbrev sendt',
      value: proc.areAwardLettersSent ? 'Sendt (dato ikke tilgjengelig i API)' : 'Nei',
    },
  ];
}

export function meddelelseRows(proc: any): InfoRow[] {
  return [{ label: 'Meddelelse sendt', value: proc.areAwardLettersSent ? 'Ja' : 'Nei' }];
}

export function rammeavtaleRows(proc: any, eforms: any): InfoRow[] {
  const maxPart =
    proc.framework_agreement_maximum_participants ?? proc.frameworkAgreementMaximumParticipants;
  const rows: InfoRow[] = [];
  if (maxPart && Number(maxPart) === 1) {
    rows.push({ label: 'Rammeavtale med én leverandør', value: 'Ja' });
    rows.push({ label: 'Rammeavtale med flere leverandører', value: 'Nei' });
  } else if (maxPart && Number(maxPart) > 1) {
    rows.push({ label: 'Rammeavtale med én leverandør', value: 'Nei' });
    rows.push({
      label: 'Rammeavtale med flere leverandører',
      value: `Ja (maks ${maxPart} deltakere)`,
    });
  } else {
    rows.push({
      label: 'Rammeavtale',
      value: proc.framework_agreement_involved ? 'Ja' : '—',
    });
  }
  if (eforms?.framework_max_value) {
    rows.push({
      label: 'Maksimal verdi',
      value: fmtCurrency(eforms.framework_max_value, eforms.currency),
      mono: true,
    });
  }
  return rows;
}

export function andreOpplysningerRows(proc: any): InfoRow[] {
  if (proc.isCancelled) {
    return [
      {
        label: 'Avlysning',
        value: proc.cancelingReason ? stripHtml(proc.cancelingReason) : '(ingen begrunnelse oppgitt)',
      },
    ];
  }
  return [{ label: 'Avlysning', value: 'Ikke relevant (konkurransen ble ikke avlyst)' }];
}
