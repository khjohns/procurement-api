/**
 * Pure generator for "samlet vurdering" per criterion.
 * Produces narrative plain text structured best-first, with all sub-criteria
 * per supplier. The text is written to be directly usable by the
 * justification-generator (protokoll/meddelelsesbrev).
 *
 * No runes, no side effects.
 */

import {
  type Criterion,
  type Supplier,
  type SubCriterion,
  criterionMode,
  fmt1,
} from '$lib/stores/evaluation.svelte';

export interface SamletVurderingInput {
  criterion: Criterion;
  suppliers: Supplier[];
  /** Pre-computed group scores for this criterion: supplierId → score */
  groupScores: Record<string, number>;
}

/** Rank suppliers by score descending. */
function ranked(
  suppliers: Supplier[],
  scores: Record<string, number>
): Array<{ supplier: Supplier; score: number }> {
  return suppliers
    .map((s) => ({ supplier: s, score: scores[s.id] ?? 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Collect all notes for a supplier on a criterion. */
function collectNotes(criterion: Criterion, supplierId: string): string[] {
  const notes: string[] = [];
  const criterionNote = criterion.notes?.[supplierId]?.trim();
  if (criterionNote) notes.push(criterionNote);
  for (const sub of criterion.subcriteria) {
    const subNote = sub.notes[supplierId]?.trim();
    if (subNote) notes.push(subNote);
  }
  return notes;
}

export function generateSamletVurdering(input: SamletVurderingInput): string {
  const { criterion, suppliers, groupScores } = input;
  const mode = criterionMode(criterion);
  const ranking = ranked(suppliers, groupScores);

  if (ranking.length === 0) return '';

  switch (mode) {
    case 'leaf':
      return generateLeaf(criterion, ranking);
    case 'traditional':
      return generateTraditional(criterion, ranking);
    case 'resource':
      return generateResource(criterion, ranking);
  }
}

// ── Leaf ──

function generateLeaf(
  criterion: Criterion,
  ranking: Array<{ supplier: Supplier; score: number }>
): string {
  const paragraphs: string[] = [];
  const best = ranking[0];

  // Best supplier
  const bestNote = criterion.notes?.[best.supplier.id]?.trim();
  paragraphs.push(
    `${best.supplier.name} er gitt ${fmt1(best.score)} poeng på ${criterion.name.toLowerCase()}.` +
      (bestNote ? ` ${bestNote}` : ' [Begrunnelse mangler]')
  );

  // Others
  for (const entry of ranking.slice(1)) {
    const note = criterion.notes?.[entry.supplier.id]?.trim();
    paragraphs.push(
      `${entry.supplier.name} er gitt ${fmt1(entry.score)} poeng.` + (note ? ` ${note}` : '')
    );
  }

  return paragraphs.join('\n\n');
}

// ── Traditional ──

function subScoreText(sub: SubCriterion, supplierId: string): string {
  const score = sub.scores[supplierId];
  if (score == null) return '';
  const note = sub.notes[supplierId]?.trim();
  return `${sub.name}: ${score}/10${note ? ` – ${note}` : ''}`;
}

function generateTraditional(
  criterion: Criterion,
  ranking: Array<{ supplier: Supplier; score: number }>
): string {
  const paragraphs: string[] = [];
  const best = ranking[0];

  // Best supplier with all sub-criteria
  const bestParts: string[] = [];
  bestParts.push(
    `${best.supplier.name} er gitt høyest score på ${criterion.name.toLowerCase()} med ${fmt1(best.score)} poeng.`
  );
  for (const sub of criterion.subcriteria) {
    const detail = subScoreText(sub, best.supplier.id);
    if (detail) bestParts.push(detail);
  }
  const criterionNote = criterion.notes?.[best.supplier.id]?.trim();
  if (criterionNote) bestParts.push(criterionNote);
  paragraphs.push(bestParts.join(' '));

  // Others
  for (const entry of ranking.slice(1)) {
    const parts: string[] = [];
    parts.push(`${entry.supplier.name} er gitt ${fmt1(entry.score)} poeng.`);
    for (const sub of criterion.subcriteria) {
      const detail = subScoreText(sub, entry.supplier.id);
      if (detail) parts.push(detail);
    }
    const note = criterion.notes?.[entry.supplier.id]?.trim();
    if (note) parts.push(note);
    paragraphs.push(parts.join(' '));
  }

  return paragraphs.join('\n\n');
}

// ── Resource ──

function generateResource(
  criterion: Criterion,
  ranking: Array<{ supplier: Supplier; score: number }>
): string {
  const roles = criterion.roles ?? [];
  const moments = criterion.subcriteria;
  const paragraphs: string[] = [];
  const best = ranking[0];

  // Best supplier
  const bestParts: string[] = [];
  bestParts.push(
    `${best.supplier.name} er gitt høyest score på ${criterion.name.toLowerCase()} med ${fmt1(best.score)} poeng.`
  );
  for (const role of roles) {
    const item = criterion.items?.[best.supplier.id]?.find((it) => it.roleId === role.id);
    if (!item) continue;
    const personName = item.label || '[Ikke navngitt]';
    const dims = moments
      .filter((m) => item.scores[m.id] != null)
      .map((m) => `${m.name.toLowerCase()} ${item.scores[m.id]}/10`)
      .join(', ');
    if (dims) {
      bestParts.push(`${role.name}: ${personName} (${dims}).`);
    }
    if (item.note?.trim()) bestParts.push(item.note.trim());
  }
  paragraphs.push(bestParts.join(' '));

  // Others
  for (const entry of ranking.slice(1)) {
    const parts: string[] = [];
    parts.push(`${entry.supplier.name} er gitt ${fmt1(entry.score)} poeng.`);
    for (const role of roles) {
      const item = criterion.items?.[entry.supplier.id]?.find((it) => it.roleId === role.id);
      if (!item) continue;
      const personName = item.label || '[Ikke navngitt]';
      const dims = moments
        .filter((m) => item.scores[m.id] != null)
        .map((m) => `${m.name.toLowerCase()} ${item.scores[m.id]}/10`)
        .join(', ');
      if (dims) {
        parts.push(`${role.name}: ${personName} (${dims}).`);
      }
      if (item.note?.trim()) parts.push(item.note.trim());
    }
    paragraphs.push(parts.join(' '));
  }

  return paragraphs.join('\n\n');
}
