/**
 * Pure computation functions extracted from EvaluationStore.
 * No runes, no side effects — just data in, data out.
 *
 * NOTE (Svelte 5 / $derived): These functions are called from $derived.by() in
 * the store. $derived is shallow-reactive, so all reactive dependencies must be
 * passed as explicit arguments — never access store state via closure.
 */

import type { Criterion, Supplier, ActiveMethod } from './evaluation.svelte';
import { criterionMode, supplierResourceScore, weightedAverage } from './evaluation.svelte';

// ── Progress ──

export interface ProgressResult {
  scores: { filled: number; total: number };
  notes: { filled: number; total: number };
}

interface CellCounts {
  cells: number;
  filledCells: number;
  notes: number;
  filledNotes: number;
}

function addCounts(a: CellCounts, b: CellCounts): CellCounts {
  return {
    cells: a.cells + b.cells,
    filledCells: a.filledCells + b.filledCells,
    notes: a.notes + b.notes,
    filledNotes: a.filledNotes + b.filledNotes,
  };
}

const ZERO_COUNTS: CellCounts = { cells: 0, filledCells: 0, notes: 0, filledNotes: 0 };

function progressLeaf(criterion: Criterion, suppliers: Supplier[]): CellCounts {
  let cells = 0, filledCells = 0, notes = 0, filledNotes = 0;
  for (const supplier of suppliers) {
    cells++;
    if (criterion.scores?.[supplier.id] !== undefined) filledCells++;
    notes++;
    if (criterion.notes?.[supplier.id]) filledNotes++;
  }
  return { cells, filledCells, notes, filledNotes };
}

function progressResource(criterion: Criterion, suppliers: Supplier[]): CellCounts {
  let cells = 0, filledCells = 0, notes = 0, filledNotes = 0;
  const nMoments = criterion.subcriteria.length;
  for (const supplier of suppliers) {
    const items = criterion.items?.[supplier.id] ?? [];
    if (items.length === 0) {
      cells += Math.max(1, nMoments);
    } else {
      for (const item of items) {
        for (const sub of criterion.subcriteria) {
          cells++;
          if (item.scores[sub.id] !== undefined) filledCells++;
        }
      }
    }
    notes++;
    if (criterion.notes?.[supplier.id]) filledNotes++;
  }
  return { cells, filledCells, notes, filledNotes };
}

function progressTraditional(criterion: Criterion, suppliers: Supplier[]): CellCounts {
  let cells = 0, filledCells = 0, notes = 0, filledNotes = 0;
  for (const sub of criterion.subcriteria) {
    if (sub.evaluationType === 'item' && sub.itemCriteria) {
      const nCriteria = sub.itemCriteria.length;
      for (const supplier of suppliers) {
        const items = sub.items?.[supplier.id] ?? [];
        if (items.length === 0) {
          cells += nCriteria;
        } else {
          for (const item of items) {
            for (const ic of sub.itemCriteria) {
              cells++;
              if (item.scores[ic.id] !== undefined) filledCells++;
            }
          }
        }
      }
      for (const supplier of suppliers) {
        notes++;
        if (sub.notes[supplier.id]) filledNotes++;
      }
    } else {
      for (const supplier of suppliers) {
        cells++;
        if (sub.scores[supplier.id] !== undefined) filledCells++;
        notes++;
        if (sub.notes[supplier.id]) filledNotes++;
      }
    }
  }
  return { cells, filledCells, notes, filledNotes };
}

/** Count filled vs total score cells and notes across all criteria/suppliers. */
export function computeProgress(criteria: Criterion[], suppliers: Supplier[]): ProgressResult {
  let totals = ZERO_COUNTS;

  for (const criterion of criteria) {
    const mode = criterionMode(criterion);
    const counts =
      mode === 'leaf' ? progressLeaf(criterion, suppliers) :
      mode === 'resource' ? progressResource(criterion, suppliers) :
      progressTraditional(criterion, suppliers);
    totals = addCounts(totals, counts);
  }

  return {
    scores: { filled: totals.filledCells, total: totals.cells },
    notes: { filled: totals.filledNotes, total: totals.notes },
  };
}

// ── Price deductions (prismodell) ──

function deductionsDirect(
  criterion: Criterion,
  suppliers: Supplier[],
  maxDed: number
): Record<string, Record<string, number>> {
  const perSupplier: Record<string, number> = {};
  for (const supplier of suppliers) {
    const entered = criterion.priceDeductionAmounts?.[supplier.id] ?? 0;
    perSupplier[supplier.id] = Math.min(entered, maxDed);
  }
  return { [criterion.id]: perSupplier };
}

function deductionsTraditional(
  criterion: Criterion,
  suppliers: Supplier[],
  maxDed: number
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
  for (const sub of criterion.subcriteria) {
    result[sub.id] = {};
    const subMaxDed = subSum > 0 ? maxDed * (sub.weight / subSum) : 0;
    for (const supplier of suppliers) {
      const entered = sub.priceDeductionAmounts?.[supplier.id] ?? 0;
      result[sub.id][supplier.id] = Math.min(entered, subMaxDed);
    }
  }
  return result;
}

/** Compute quality deductions per criterion/sub-criterion per supplier. */
export function computePriceDeductions(
  criteria: Criterion[],
  suppliers: Supplier[],
  contractValue: number,
  qualityWeight: number,
  totalWeight: number
): Record<string, Record<string, number>> {
  let result: Record<string, Record<string, number>> = {};
  const qb = contractValue * (qualityWeight / 100);

  for (const criterion of criteria) {
    if (criterion.type === 'price') continue;
    const mode = criterionMode(criterion);
    const maxDed =
      criterion.maxPriceDeduction ?? (totalWeight > 0 ? qb * (criterion.weight / totalWeight) : 0);

    const chunk =
      mode === 'leaf' || mode === 'resource'
        ? deductionsDirect(criterion, suppliers, maxDed)
        : deductionsTraditional(criterion, suppliers, maxDed);
    result = { ...result, ...chunk };
  }
  return result;
}

// ── Group scores ──

function groupScoreResource(criterion: Criterion, suppliers: Supplier[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const supplier of suppliers) {
    const items = criterion.items?.[supplier.id] ?? [];
    scores[supplier.id] = supplierResourceScore(
      items,
      criterion.subcriteria,
      criterion.aggregation ?? 'average'
    );
  }
  return scores;
}

function groupScoreLeaf(criterion: Criterion, suppliers: Supplier[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const supplier of suppliers) {
    scores[supplier.id] = criterion.scores?.[supplier.id] ?? 0;
  }
  return scores;
}

function groupScoreTraditional(
  criterion: Criterion,
  suppliers: Supplier[],
  itemScores: Record<string, Record<string, number>>
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const supplier of suppliers) {
    scores[supplier.id] = weightedAverage(criterion.subcriteria, supplier.id, itemScores);
  }
  return scores;
}

/** Compute group averages per criterion per supplier (handles all three modes). */
export function computeGroupScores(
  criteria: Criterion[],
  suppliers: Supplier[],
  activeMethod: ActiveMethod,
  itemScores: Record<string, Record<string, number>>,
  priceFormulaScores: Record<string, number>
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const criterion of criteria) {
    if (criterion.type === 'price' && activeMethod === 'poeng') {
      result[criterion.id] = {};
      for (const supplier of suppliers) {
        result[criterion.id][supplier.id] = priceFormulaScores[supplier.id] ?? 0;
      }
      continue;
    }
    const mode = criterionMode(criterion);
    result[criterion.id] =
      mode === 'resource' ? groupScoreResource(criterion, suppliers) :
      mode === 'leaf' ? groupScoreLeaf(criterion, suppliers) :
      groupScoreTraditional(criterion, suppliers, itemScores);
  }
  return result;
}

// ── Best scores ──

/** Compute best (max) score per sub-criterion/leaf criterion across all suppliers. */
export function computeBestScores(
  criteria: Criterion[],
  itemScores: Record<string, Record<string, number>>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const criterion of criteria) {
    if (criterionMode(criterion) === 'leaf' && criterion.scores) {
      const vals = Object.values(criterion.scores);
      result[criterion.id] = vals.length > 0 ? Math.max(...vals) : 0;
    }
    for (const sub of criterion.subcriteria) {
      const overlay = itemScores[sub.id];
      const vals = overlay ? Object.values(overlay) : Object.values(sub.scores);
      result[sub.id] = vals.length > 0 ? Math.max(...vals) : 0;
    }
  }
  return result;
}

// ── Weight warnings ──

/** Detect criteria where sub-criterion weights don't sum to 100 (traditional mode only). */
export function computeWeightWarnings(
  criteria: Criterion[]
): Record<string, { expected: number; subSum: number }> {
  const result: Record<string, { expected: number; subSum: number }> = {};
  for (const criterion of criteria) {
    if (criterionMode(criterion) === 'traditional') {
      const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
      if (subSum !== 100) {
        result[criterion.id] = { expected: 100, subSum };
      }
    }
  }
  return result;
}
