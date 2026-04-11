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
} from './protokoll-helpers';
import { eformsLabel } from './eforms-labels';

export type InfoRow = { label: string; value: any; mono?: boolean };

// ── Formatting helpers ──

function procurerStr(proc: any): string | undefined {
  const p = proc.about_procurer ?? {};
  if (p.name) {
    return p.national_id ? `${p.name} (org.nr. ${p.national_id})` : p.name;
  }
  return proc.buyerName ?? proc.buyer?.name;
}

function descriptionStr(proc: any): string {
  const name = stripHtml(proc.name ?? '');
  const desc = stripHtml(proc.description ?? '').replace(/\s*\n\s*/g, ' ');
  if (name && desc && desc.toLowerCase() !== name.toLowerCase()) return `${name}. ${desc}`;
  return name || desc;
}

function durationStr(proc: any): string | null {
  if (proc.duration_months) return `${proc.duration_months} måneder`;
  return proc.duration ? String(proc.duration) : null;
}

function refStr(proc: any): string {
  const seqId = proc.sequenceId ?? '';
  return proc.externalId ? `${seqId} (ekstern ref: ${proc.externalId})` : seqId;
}

// ── Section row builders ──

export function generellInfoRows(proc: any): InfoRow[] {
  return [
    { label: 'Saksnummer', value: refStr(proc), mono: true },
    { label: 'Oppdragsgiver', value: procurerStr(proc) },
    { label: 'Protokollfører', value: (proc.about_procurer ?? {}).contact_person },
    { label: 'Beskrivelse', value: descriptionStr(proc) },
    { label: 'Estimert verdi', value: fmtCurrency(proc.estimated_value, proc.currency), mono: true },
    { label: 'Kontraktens varighet', value: durationStr(proc) },
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

function directAwardJustification(proc: any): string | null {
  const code = proc.direct_award_justification_code ?? '';
  const reason = proc.direct_award_justification_reason ?? '';
  const label = code ? eformsLabel('direct-award-justification', code) : '';
  if (label && reason) return `${label}. ${reason}`;
  return label || reason || null;
}

export function prosedyreRows(proc: any, eforms: any, activities: any[]): InfoRow[] {
  const procedure = proc.procedure ?? '';
  const rows: InfoRow[] = [
    { label: 'Prosedyre', value: PROCEDURE_LABELS[procedure] ?? procedure },
  ];

  if (eforms?.contract_nature) {
    rows.push({
      label: 'Kontraktstype',
      value: eformsLabel('contract-nature', eforms.contract_nature),
    });
  }

  const kunngj = kunngjoringStr(proc, activities);
  if (kunngj) rows.push({ label: 'Kunngjøring', value: kunngj });

  if (['Negotiated without publication', 'Direct award'].includes(procedure)) {
    rows.push({ label: 'Hjemmel for direkteanskaffelse', value: directAwardJustification(proc) });
  }

  rows.push({ label: 'Terskel', value: formatThreshold(proc.threshold) });

  if (eforms?.env_criterion_code) {
    rows.push({
      label: 'Miljøkrav FOA § 7-9',
      value: eformsLabel('award-criterion-type-no', eforms.env_criterion_code),
    });
  }

  return rows;
}

/** Extract Doffin notice details from activities. */
function doffinDetails(activities: any[]): { date: string; ref: string; ted: string } {
  const doffinActs = activities.filter(
    (a: any) => a.action === 'DOFFIN_NOTICE_STATUS_PUBLISHED'
  );
  const publishActs = activities.filter((a: any) => a.action === 'PUBLISH_TO_DOFFIN');

  let date = publishActs.length ? formatDato(publishActs[0].date) : '';
  let ref = '';
  let ted = '';

  if (doffinActs.length) {
    const notice = (doffinActs[0].description ?? {}).doffinNotice ?? {};
    ref = notice.ngoj ?? '';
    ted = notice.publicationId ?? '';
    if (!date) date = formatDato(notice.publicationDate ?? doffinActs[0].date);
  }

  return { date, ref, ted };
}

/** Kunngjøring — Doffin/TED ref from activities. */
export function kunngjoringStr(proc: any, activities: any[]): string | null {
  const d = doffinDetails(activities);

  if (d.date) {
    const parts = [`Kunngjort ${d.date} på Doffin`];
    if (d.ref) parts.push(`ref. ${d.ref} (NGOJ)`);
    if (d.ted) parts.push(`TED ${d.ted}`);
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

export function kvalifikasjonskravRows(eforms: any): InfoRow[] {
  const sel = eforms?.selection_criteria;
  if (!sel?.length) return [{ label: 'Kvalifikasjonskrav', value: 'Ikke tilgjengelig fra eForms' }];
  return sel.map((s: any) => ({
    label: eformsLabel('selection-criterion', s.type_code, s.type_code ?? 'Krav'),
    value: s.description ?? '—',
  }));
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

  if (eforms?.framework_type && eforms.framework_type !== 'none') {
    rows.push({
      label: 'Rammeavtaletype',
      value: eformsLabel('framework-agreement', eforms.framework_type),
    });
  }
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

export function avlysningInfoRows(proc: any): InfoRow[] {
  const rows: InfoRow[] = [{ label: 'Status', value: 'Konkurransen er avlyst' }];
  if (proc.cancelingReason) {
    rows.push({ label: 'Begrunnelse fra system', value: stripHtml(proc.cancelingReason) });
  }
  return rows;
}

export function andreOpplysningerRows(proc: any): InfoRow[] {
  // Cancellation info now in dedicated AVLYSNING chapter
  if (proc.isCancelled) return [];
  return [{ label: 'Avlysning', value: 'Ikke relevant (konkurransen ble ikke avlyst)' }];
}
