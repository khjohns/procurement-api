/**
 * Meddelsesbrev (award notification letter) generator.
 * Generates per-supplier HTML letters using the shared evaluation description
 * from justification-generator.ts.
 *
 * No runes, no side effects — pure function.
 */

import { type Supplier, fmt1 } from '$lib/stores/evaluation.svelte';
import { esc, type JustificationInput } from './justification-generator';
import { ARTIFIK_PROCEDURE_TO_EFORMS, getProcName } from './protokoll-helpers';
import { eformsLabel } from './eforms-labels';
import { formatDato } from './format';

// ── Types ──

export interface MeddelelseInput {
  /** Shared evaluation data (same shape as JustificationInput). */
  evaluation: JustificationInput;
  /** The supplier this letter is addressed to. */
  recipientSupplier: Supplier;
  /** Procurement metadata. */
  procurement: {
    name?: string;
    title?: string;
    procedure?: string;
    threshold?: string;
    externalId?: string;
    sequenceId?: string;
    about_procurer?: {
      name?: string;
      national_id?: string;
      contact_person?: string;
    };
    buyerName?: string;
  };
  /** Number of received bids. */
  totalBids: number;
  /** Number of rejected suppliers. */
  rejectedCount: number;
  /** Karens days (user-specified). 0 means no karens. */
  karensDager: number;
  /** Klagefrist date (ISO string, user-specified). */
  klagefristDato?: string;
  /** Pre-computed evaluation description HTML (avoids re-computing per supplier). */
  evaluationDescriptionHtml: string;
}

// ── Helpers ──

function procurerName(proc: MeddelelseInput['procurement']): string {
  const p = proc.about_procurer;
  if (p?.name) return p.name;
  return proc.buyerName ?? 'Oppdragsgiver';
}

function saksnummer(proc: MeddelelseInput['procurement']): string {
  return proc.externalId ?? proc.sequenceId ?? '';
}

function saksbehandler(proc: MeddelelseInput['procurement']): string {
  return proc.about_procurer?.contact_person ?? '';
}

function procedureLabel(proc: MeddelelseInput['procurement']): string {
  const code = proc.procedure ?? '';
  const eformsCode = ARTIFIK_PROCEDURE_TO_EFORMS[code];
  return eformsCode
    ? eformsLabel('procurement-procedure-type', eformsCode, code) ?? 'tilbudskonkurranse'
    : code || 'tilbudskonkurranse';
}

/** Determine which klageadgang alternative applies. */
function klageadgangAlternativ(input: MeddelelseInput): 1 | 2 | 3 {
  const threshold = input.procurement.threshold ?? '';
  // Only below_national_threshold is Del I. national_threshold is Del II (has karensperiode).
  const isDel1 = threshold === 'below_national_threshold';

  // Alt 3: Only one bid
  if (input.totalBids <= 1) return 3;

  // Alt 2: Del I (below national threshold)
  if (isDel1) return 2;

  // Alt 1: Standard karensperiode (del II or del III)
  return 1;
}

/** Is this an EØS procurement (del III)? */
function isOverEEA(threshold: string | undefined): boolean {
  return threshold === 'over_eea_threshold_value';
}

// ── Generator ──

export function generateMeddelelse(input: MeddelelseInput): string {
  const {
    evaluation,
    recipientSupplier,
    procurement,
    totalBids,
    rejectedCount,
    karensDager,
    klagefristDato,
    evaluationDescriptionHtml,
  } = input;
  const { selectedSupplierIds, totals } = evaluation;
  const winnerSuppliers = selectedSupplierIds
    .map((id) => evaluation.data.suppliers.find((s) => s.id === id))
    .filter((s): s is Supplier => s != null);

  const sections: string[] = [];
  const dato = formatDato(new Date().toISOString().slice(0, 10));
  const isWinner = selectedSupplierIds.includes(recipientSupplier.id);
  const qualified = totalBids - rejectedCount;
  const anskaffelsesnavn = getProcName(procurement) || 'anskaffelsen';

  // ── Header (structured metadata) ──
  const ref = saksnummer(procurement);
  const sbh = saksbehandler(procurement);
  sections.push('<div class="meddelelse-header">');
  sections.push('<table class="meddelelse-meta-table"><tbody>');
  sections.push(
    `<tr><td>Deres ref.:</td><td></td><td>Vår ref. (saksnr.):</td><td>${ref ? esc(ref) : ''}</td></tr>`
  );
  sections.push(
    `<tr><td>Saksbehandler:</td><td>${sbh ? esc(sbh) : ''}</td><td>Dato:</td><td>${dato}</td></tr>`
  );
  sections.push('</tbody></table>');
  sections.push('</div>');

  // ── Title ──
  sections.push(`<h2>Meddelelse om tildeling \u2014 ${esc(anskaffelsesnavn)}</h2>`);

  // ── Introduction ──
  const oppdragsgiver = esc(procurerName(procurement));
  const prosedyre = procedureLabel(procurement).toLowerCase();
  const winnerNames = winnerSuppliers.map((s) => `<strong>${esc(s.name)}</strong>`).join(', ');

  sections.push(
    `<p>Vi viser til deres tilbud i ${esc(prosedyre)} for anskaffelse av ${esc(anskaffelsesnavn)}. ` +
      `Etter en totalevaluering av de innkomne tilbudene gjort i samsvar med konkurransegrunnlaget, ` +
      `har ${oppdragsgiver} besluttet å tildele kontrakt til:</p>`
  );
  sections.push(`<p>${winnerNames}</p>`);

  // Bid summary
  const bidParts: string[] = [
    `Ved tilbudsfristens utløp var det registrert ${totalBids} mottatte tilbud.`,
  ];
  if (rejectedCount > 0) {
    bidParts.push(
      `${rejectedCount} leverandør${rejectedCount > 1 ? 'er' : ''} ble avvist, og ${qualified} fikk delta videre i konkurransen.`
    );
  }
  if (isWinner) {
    bidParts.push('Innstilte leverandør ble vurdert å være kvalifisert.');
  }
  sections.push(`<p>${bidParts.join(' ')}</p>`);

  // ── Evaluation description (pre-computed, shared across all letters) ──
  sections.push('<h2>Beskrivelse av evalueringen</h2>');
  sections.push(evaluationDescriptionHtml);

  // ── Per-supplier conclusion ──
  const topWinner = winnerSuppliers[0];
  const topScore = totals[topWinner?.id] ?? 0;
  const recipientScore = totals[recipientSupplier.id] ?? 0;

  if (winnerSuppliers.length === 1 && topWinner) {
    sections.push(
      `<p>På grunnlag av dette er <strong>${esc(topWinner.name)}</strong> vurdert å ha tilbudt ` +
        `det beste forholdet mellom pris og kvalitet, med høyest vektet totalpoeng ` +
        `(${fmt1(topScore)} av 10).</p>`
    );
  } else if (winnerSuppliers.length > 1) {
    const names = winnerSuppliers.map((s) => `<strong>${esc(s.name)}</strong>`).join(', ');
    sections.push(
      `<p>På grunnlag av dette innstilles følgende leverandører for rammeavtale: ${names}.</p>`
    );
  }

  if (!isWinner) {
    sections.push(`<p>Deres tilbud oppnådde en totalpoeng på ${fmt1(recipientScore)} av 10.</p>`);
  }

  // ── Klageadgang og karensperiode ──
  sections.push('<h2>Klageadgang og karensperiode</h2>');

  const alt = klageadgangAlternativ(input);

  if (alt === 1) {
    const foaRef = isOverEEA(procurement.threshold) ? '§ 25-2(1)' : '§ 10-2(1)';
    const fristStr = klagefristDato ? formatDato(klagefristDato) : `[dd.mm.åååå]`;
    sections.push(
      `<p>Vi gjør oppmerksom på at karensperioden jf. forskrift om offentlige anskaffelser ` +
        `${foaRef} er ${karensDager || '[antall]'} dager regnet fra dagen etter denne meddelelsen. ` +
        `I karensperioden har deltakerne i konkurransen klageadgang, samt anledning til å fremsette ` +
        `begjæring om midlertidig forføyning med oppsettende virkning` +
        `${isOverEEA(procurement.threshold) ? ', jf. § 25-3 første ledd' : ''}. ` +
        `Frist for å klage er satt til ${fristStr}.</p>`
    );
  } else if (alt === 2) {
    sections.push(
      `<p>Ettersom konkurransen er gjennomført etter forskrift om offentlige anskaffelser del I, ` +
        `er det ikke satt en klagefrist. Kontrakt vil bli inngått umiddelbart.</p>`
    );
  } else {
    const foaRef = isOverEEA(procurement.threshold)
      ? 'foa § 25-2 (2) bokstav b'
      : 'foa § 10-2 (3) bokstav b';
    sections.push(
      `<p>Ettersom det ikke kom inn flere tilbud enn det vinnende tilbud, ` +
        `gjelder ikke kravet om karensperiode, jf. ${foaRef}.</p>`
    );
  }

  // ── Avslutning ──
  sections.push('<hr>');
  sections.push(
    `<p>Vi takker igjen for deres interesse og ønsker velkommen tilbake til mulige oppdrag i fremtiden.</p>`
  );
  sections.push(`<p>Vennlig hilsen</p>`);
  sections.push(`<p><strong>${esc(procurerName(procurement))}</strong></p>`);

  // ── Footer ──
  sections.push('<div class="meddelelse-footer">');
  sections.push(
    `<div class="footer-org">Oslo kommune Oslobygg KF &middot; Økonomi- og virksomhetsstyring &middot; Juridisk avdeling</div>`
  );
  sections.push('<table class="footer-grid"><tbody>');
  sections.push(
    `<tr><td>Besøksadresse:</td><td>Grenseveien 82, 0663 Oslo</td><td>Telefon:</td><td>2180 2180</td></tr>`
  );
  sections.push(
    `<tr><td>Postadresse:</td><td>Postboks 6391, 0604 OSLO</td><td>Org. nr.:</td><td>924599545</td></tr>`
  );
  sections.push('</tbody></table>');
  sections.push('</div>');

  return sections.join('\n');
}
