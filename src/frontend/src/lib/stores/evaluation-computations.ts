/**
 * Pure computation functions extracted from EvaluationStore.
 * No runes, no side effects — just data in, data out.
 */

import type { Criterion, Supplier, ActiveMethod } from './evaluation.svelte';
import { criterionMode, supplierResourceScore, weightedAverage } from './evaluation.svelte';

// ── Progress ──

export interface ProgressResult {
  scores: { filled: number; total: number };
  notes: { filled: number; total: number };
}

/** Count filled vs total score cells and notes across all criteria/suppliers. */
export function computeProgress(criteria: Criterion[], suppliers: Supplier[]): ProgressResult {
  let totalCells = 0;
  let filledCells = 0;
  let totalNotes = 0;
  let filledNotes = 0;

  for (const criterion of criteria) {
    const mode = criterionMode(criterion);

    if (mode === 'leaf') {
      // Mode 1: one cell per supplier on the criterion
      for (const supplier of suppliers) {
        totalCells++;
        if (criterion.scores?.[supplier.id] !== undefined) filledCells++;
        totalNotes++;
        if (criterion.notes?.[supplier.id]) filledNotes++;
      }
    } else if (mode === 'resource') {
      // Mode 3: roles × moments per supplier
      const nMoments = criterion.subcriteria.length;
      for (const supplier of suppliers) {
        const items = criterion.items?.[supplier.id] ?? [];
        if (items.length === 0) {
          totalCells += Math.max(1, nMoments);
        } else {
          for (const item of items) {
            for (const sub of criterion.subcriteria) {
              totalCells++;
              if (item.scores[sub.id] !== undefined) filledCells++;
            }
          }
        }
        totalNotes++;
        if (criterion.notes?.[supplier.id]) filledNotes++;
      }
    } else {
      // Mode 2: traditional subcriteria
      for (const sub of criterion.subcriteria) {
        if (sub.evaluationType === 'item' && sub.itemCriteria) {
          const nCriteria = sub.itemCriteria.length;
          for (const supplier of suppliers) {
            const items = sub.items?.[supplier.id] ?? [];
            if (items.length === 0) {
              totalCells += nCriteria;
            } else {
              for (const item of items) {
                for (const ic of sub.itemCriteria) {
                  totalCells++;
                  if (item.scores[ic.id] !== undefined) filledCells++;
                }
              }
            }
          }
          for (const supplier of suppliers) {
            totalNotes++;
            if (sub.notes[supplier.id]) filledNotes++;
          }
        } else {
          for (const supplier of suppliers) {
            totalCells++;
            if (sub.scores[supplier.id] !== undefined) filledCells++;
            totalNotes++;
            if (sub.notes[supplier.id]) filledNotes++;
          }
        }
      }
    }
  }

  return {
    scores: { filled: filledCells, total: totalCells },
    notes: { filled: filledNotes, total: totalNotes },
  };
}

// ── Price deductions (prismodell) ──

/** Compute quality deductions per criterion/sub-criterion per supplier. */
export function computePriceDeductions(
  criteria: Criterion[],
  suppliers: Supplier[],
  contractValue: number,
  qualityWeight: number,
  totalWeight: number
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  const qb = contractValue * (qualityWeight / 100);

  for (const criterion of criteria) {
    if (criterion.type === 'price') continue; // price criteria have no deduction
    const mode = criterionMode(criterion);
    // Use explicit maxPriceDeduction if set, otherwise derive from weights
    const maxDed =
      criterion.maxPriceDeduction ?? (totalWeight > 0 ? qb * (criterion.weight / totalWeight) : 0);

    if (mode === 'leaf' || mode === 'resource') {
      result[criterion.id] = {};
      for (const supplier of suppliers) {
        const entered = criterion.priceDeductionAmounts?.[supplier.id] ?? 0;
        result[criterion.id][supplier.id] = Math.min(entered, maxDed);
      }
    } else {
      // Traditional: split maxDed proportionally across subcriteria by sub-weight
      const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
      for (const sub of criterion.subcriteria) {
        result[sub.id] = {};
        const subMaxDed = subSum > 0 ? maxDed * (sub.weight / subSum) : 0;
        for (const supplier of suppliers) {
          const entered = sub.priceDeductionAmounts?.[supplier.id] ?? 0;
          result[sub.id][supplier.id] = Math.min(entered, subMaxDed);
        }
      }
    }
  }
  return result;
}

// ── Group scores ──

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
    result[criterion.id] = {};
    const mode = criterionMode(criterion);
    // Price criteria in poengmodell: auto-score from supplier prices
    if (criterion.type === 'price' && activeMethod === 'poeng') {
      for (const supplier of suppliers) {
        result[criterion.id][supplier.id] = priceFormulaScores[supplier.id] ?? 0;
      }
      continue;
    }
    for (const supplier of suppliers) {
      if (mode === 'resource') {
        // Mode 3: roles × moments (subcriteria as dimensions)
        const items = criterion.items?.[supplier.id] ?? [];
        result[criterion.id][supplier.id] = supplierResourceScore(
          items,
          criterion.subcriteria,
          criterion.aggregation ?? 'average'
        );
      } else if (mode === 'leaf') {
        // Mode 1: direct scores on criterion
        result[criterion.id][supplier.id] = criterion.scores?.[supplier.id] ?? 0;
      } else {
        // Mode 2: traditional weighted subcriteria
        result[criterion.id][supplier.id] = weightedAverage(
          criterion.subcriteria,
          supplier.id,
          itemScores
        );
      }
    }
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
    // For leaf criteria, best score at criterion level
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
    const mode = criterionMode(criterion);
    if (mode === 'traditional') {
      const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
      if (subSum !== 100) {
        result[criterion.id] = { expected: 100, subSum };
      }
    }
  }
  return result;
}
