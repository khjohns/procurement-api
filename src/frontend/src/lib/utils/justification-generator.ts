/**
 * Pure justification text generator for protokoll punkt 12.
 * Takes evaluation data + selected suppliers and produces structured HTML
 * ready for the RichTextEditor.
 *
 * The core evaluation description (generateEvaluationDescription) is also
 * reused by the meddelelse-generator for award notification letters.
 *
 * No runes, no side effects — pure function.
 */

import {
  type Criterion,
  type Supplier,
  type EvaluationData,
  type ActiveMethod,
  criterionMode,
  fmt1,
  formatNOK,
} from '$lib/stores/evaluation.svelte';

// ── Types ──

export interface JustificationInput {
  data: EvaluationData;
  activeMethod: ActiveMethod;
  selectedSupplierIds: string[];
  /** Pre-computed group scores: criterionId → supplierId → score */
  groupScores: Record<string, Record<string, number>>;
  /** Pre-computed totals: supplierId → weighted total */
  totals: Record<string, number>;
  /** Pre-computed ranking */
  ranking: Array<{ supplier: Supplier; score: number; rank: number }>;
  /** Pre-computed price formula scores (poengmodell) */
  priceFormulaScores: Record<string, number>;
}

// ── Helpers ──

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sort suppliers by score descending for a given criterion. */
function rankByCriterion(
  suppliers: Supplier[],
  scores: Record<string, number>
): Array<{ supplier: Supplier; score: number }> {
  return suppliers
    .map((s) => ({ supplier: s, score: scores[s.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

/** Get display name, preferring short form. */
function name(s: Supplier): string {
  return esc(s.name);
}

/** Find the selected (winner) supplier objects. */
function winners(input: JustificationInput): Supplier[] {
  return input.selectedSupplierIds
    .map((id) => input.data.suppliers.find((s) => s.id === id))
    .filter((s): s is Supplier => s != null);
}

/** Collect all notes for a criterion (criterion-level + sub-level) for a supplier. */
function collectNotes(criterion: Criterion, supplierId: string): string[] {
  const notes: string[] = [];
  // Criterion-level note
  const criterionNote = criterion.notes?.[supplierId];
  if (criterionNote?.trim()) notes.push(criterionNote.trim());
  // Sub-criterion notes
  for (const sub of criterion.subcriteria) {
    const subNote = sub.notes[supplierId];
    if (subNote?.trim()) notes.push(subNote.trim());
  }
  return notes;
}

/** Weighted score = raw score × criterion weight / 100. */
function weightedScore(rawScore: number, weight: number): number {
  return (rawScore * weight) / 100;
}

// ── Score table builders ──

function priceTable(
  criterion: Criterion,
  suppliers: Supplier[],
  scores: Record<string, number>
): string {
  const ranked = rankByCriterion(suppliers, scores);
  let html =
    '<table><thead><tr><th>Leverandør</th><th>Tilbudt pris</th><th>Poeng</th><th>Vektet score</th></tr></thead><tbody>';
  for (const { supplier, score } of ranked) {
    const price = supplier.price != null ? `${formatNOK(supplier.price)} kr` : '—';
    const ws = weightedScore(score, criterion.weight);
    html += `<tr><td>${name(supplier)}</td><td>${price}</td><td>${fmt1(score)}</td><td>${fmt1(ws)}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function criterionTable(
  criterion: Criterion,
  suppliers: Supplier[],
  groupScores: Record<string, number>
): string {
  const mode = criterionMode(criterion);
  const ranked = rankByCriterion(suppliers, groupScores);

  if (mode === 'leaf' || mode === 'resource' || criterion.subcriteria.length === 0) {
    let html =
      '<table><thead><tr><th>Leverandør</th><th>Poeng</th><th>Vektet score</th></tr></thead><tbody>';
    for (const { supplier, score } of ranked) {
      const ws = weightedScore(score, criterion.weight);
      html += `<tr><td>${name(supplier)}</td><td>${fmt1(score)}</td><td>${fmt1(ws)}</td></tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  // Traditional with subcriteria
  const subWeightSum = criterion.subcriteria.reduce((s, sc) => s + sc.weight, 0);
  let html = '<table><thead><tr><th>Leverandør</th>';
  for (const sub of criterion.subcriteria) {
    const pct = subWeightSum > 0 ? Math.round((sub.weight / subWeightSum) * 100) : 0;
    html += `<th>${esc(sub.name)} (${pct}\u00A0%)</th>`;
  }
  html += '<th>Vektet snitt</th><th>Vektet score</th></tr></thead><tbody>';

  for (const { supplier, score } of ranked) {
    html += `<tr><td>${name(supplier)}</td>`;
    for (const sub of criterion.subcriteria) {
      html += `<td>${fmt1(sub.scores[supplier.id] ?? 0)}</td>`;
    }
    const ws = weightedScore(score, criterion.weight);
    html += `<td>${fmt1(score)}</td><td>${fmt1(ws)}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function totalTable(input: JustificationInput): string {
  const { data, ranking } = input;

  let html = '<table><thead><tr><th>Leverandør</th>';
  for (const c of data.criteria) {
    html += `<th>${esc(c.name)} (${c.weight}\u00A0%)</th>`;
  }
  html += '<th>Total</th></tr></thead><tbody>';

  for (const { supplier, score } of ranking) {
    const isWinner = input.selectedSupplierIds.includes(supplier.id);
    html += `<tr><td>${isWinner ? '<strong>' : ''}${name(supplier)}${isWinner ? '</strong>' : ''}</td>`;
    for (const c of data.criteria) {
      const gs = input.groupScores[c.id]?.[supplier.id] ?? 0;
      const ws = weightedScore(gs, c.weight);
      html += `<td>${isWinner ? '<strong>' : ''}${fmt1(ws)}${isWinner ? '</strong>' : ''}</td>`;
    }
    html += `<td>${isWinner ? '<strong>' : ''}${fmt1(score)}${isWinner ? '</strong>' : ''}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

// ── Note rendering ──

function renderNotes(
  criterion: Criterion,
  supplierId: string,
  supplierName: string,
  isWinner: boolean
): string {
  const notes = collectNotes(criterion, supplierId);
  if (notes.length === 0) {
    if (isWinner) {
      return `<p><em>[Begrunnelse mangler for ${esc(supplierName)} — fyll inn fra evaluering]</em></p>`;
    }
    return '';
  }
  return notes.map((n) => `<p>${esc(n)}</p>`).join('');
}

function renderComparison(
  criterion: Criterion,
  suppliers: Supplier[],
  winnerIds: Set<string>,
  scores: Record<string, number>,
  weight: number
): string {
  const others = suppliers.filter((s) => !winnerIds.has(s.id));
  if (others.length === 0) return '';

  const parts: string[] = [];
  for (const other of others) {
    const rawScore = scores[other.id] ?? 0;
    const ws = weightedScore(rawScore, weight);
    const notes = collectNotes(criterion, other.id);
    if (notes.length > 0) {
      parts.push(
        `${esc(other.name)} (${fmt1(rawScore)} poeng, vektet score ${fmt1(ws)}): ${notes.join(' ')}`
      );
    }
  }

  if (parts.length === 0) return '';
  return `<p>Til sammenligning: ${parts.join('. ')}.</p>`;
}

// ── Price formula explanation ──

function priceFormulaExplanation(criterion: Criterion): string {
  return [
    `<p>${esc(criterion.name)} er ifølge konkurransegrunnlaget vektet med ${criterion.weight}\u00A0%.`,
    `Karaktersetting på prisene er beregnet ut fra lineær metode:</p>`,
    `<p><em>10 \u2212 10 \u00D7 (aktuell pris \u2212 laveste pris) / laveste pris</em></p>`,
    `<p>Med denne metoden vil tilbyder med lavest pris få 10 poeng, og et dobbelt så dyrt tilbud vil få 0 poeng.</p>`,
  ].join('\n');
}

// ── Core evaluation description (shared with meddelelse-generator) ──

export function generateEvaluationDescription(input: JustificationInput): string {
  const { data, selectedSupplierIds, groupScores } = input;
  const winnerSuppliers = winners(input);
  const winnerIds = new Set(selectedSupplierIds);
  const sections: string[] = [];

  // Intro
  sections.push(
    `<p>Evaluering er foretatt ut fra hvilket tilbud som gir det beste forholdet mellom pris og kvalitet. ` +
      `Evalueringen er basert på følgende kriterier: ${data.criteria.map((c) => esc(c.name)).join(' og ')}.</p>`
  );
  sections.push(
    `<p>Det er gitt karakterer under hvert av tildelingskriteriene med en skala fra 0\u201310, ` +
      `hvor 0 er dårligst og 10 er best. Beste leverandør på hvert tildelingskriterie er gitt 10 poeng, ` +
      `slik angitt i konkurransegrunnlaget.</p>`
  );

  // Per-criterion sections
  for (let i = 0; i < data.criteria.length; i++) {
    const criterion = data.criteria[i];
    const scores = groupScores[criterion.id] ?? {};
    const num = i + 1;

    sections.push(`<h3>${num}. ${esc(criterion.name)} (${criterion.weight}\u00A0%)</h3>`);

    // Price formula explanation for price criteria
    if (criterion.type === 'price') {
      sections.push(priceFormulaExplanation(criterion));
    }

    // Score table
    if (criterion.type === 'price') {
      sections.push(priceTable(criterion, data.suppliers, scores));
    } else {
      sections.push(criterionTable(criterion, data.suppliers, scores));
    }

    // Winner notes
    for (const winner of winnerSuppliers) {
      sections.push(renderNotes(criterion, winner.id, winner.name, true));
    }

    // Price criterion: if winner didn't get highest price score, note it
    if (criterion.type === 'price') {
      const bestPriceSupplier = rankByCriterion(data.suppliers, scores)[0];
      if (bestPriceSupplier && !winnerIds.has(bestPriceSupplier.supplier.id)) {
        const winnerNames = winnerSuppliers.map((s) => esc(s.name)).join(', ');
        sections.push(
          `<p>${winnerNames} tilbød ikke lavest pris. De relative fordelene ved ${winnerSuppliers.length > 1 ? 'de valgte tilbudene' : 'det valgte tilbudet'} på de øvrige kriteriene oppveier prisforskjellen, som redegjort nedenfor.</p>`
        );
      }
    } else {
      // Quality criteria: compare with others
      sections.push(
        renderComparison(criterion, data.suppliers, winnerIds, scores, criterion.weight)
      );
    }
  }

  // Summary table
  sections.push('<h3>Samlet vurdering</h3>');
  sections.push(totalTable(input));

  return sections.join('\n');
}

// ── Main generator (protokoll punkt 12) ──

export function generateJustification(input: JustificationInput): string {
  const { totals } = input;
  const winnerSuppliers = winners(input);
  const sections: string[] = [];

  if (winnerSuppliers.length === 0) {
    return '<p><em>Velg innstilt(e) leverandør(er) i punkt 11 først.</em></p>';
  }

  // Core evaluation description
  sections.push(generateEvaluationDescription(input));

  // Conclusion
  const topWinner = winnerSuppliers[0];
  const topScore = totals[topWinner.id] ?? 0;

  if (winnerSuppliers.length === 1) {
    sections.push(
      `<p>På grunnlag av dette er ${esc(topWinner.name)} vurdert å ha tilbudt det beste forholdet mellom pris og kvalitet, ` +
        `med høyest vektet totalpoeng (${fmt1(topScore)} av 10), og innstilles som valgt leverandør.</p>`
    );
  } else {
    const names = winnerSuppliers.map((s) => esc(s.name)).join(', ');
    sections.push(
      `<p>På grunnlag av dette innstilles følgende leverandører for rammeavtale: ${names}.</p>`
    );
  }

  return sections.join('\n');
}
