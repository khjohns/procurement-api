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

// ── Shared helpers ──

/** Map each supplier to a computed value, keyed by supplier id. */
function mapSuppliers(
  suppliers: Supplier[],
  fn: (supplier: Supplier) => number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of suppliers) result[s.id] = fn(s);
  return result;
}

// ── Progress ──

export interface ProgressResult {
  scores: { filled: number; total: number };
  notes: { filled: number; total: number };
}

function progressLeaf(
  criterion: Criterion, suppliers: Supplier[],
  cells: number, filledCells: number, notes: number, filledNotes: number
): [number, number, number, number] {
  for (const supplier of suppliers) {
    cells++;
    if (criterion.scores?.[supplier.id] !== undefined) filledCells++;
    notes++;
    if (criterion.notes?.[supplier.id]) filledNotes++;
  }
  return [cells, filledCells, notes, filledNotes];
}

function progressResource(
  criterion: Criterion, suppliers: Supplier[],
  cells: number, filledCells: number, notes: number, filledNotes: number
): [number, number, number, number] {
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
  return [cells, filledCells, notes, filledNotes];
}

function progressTraditional(
  criterion: Criterion, suppliers: Supplier[],
  cells: number, filledCells: number, notes: number, filledNotes: number
): [number, number, number, number] {
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
  return [cells, filledCells, notes, filledNotes];
}

/** Count filled vs total score cells and notes across all criteria/suppliers. */
export function computeProgress(criteria: Criterion[], suppliers: Supplier[]): ProgressResult {
  let cells = 0, filledCells = 0, notes = 0, filledNotes = 0;

  for (const criterion of criteria) {
    const mode = criterionMode(criterion);
    const fn = mode === 'leaf' ? progressLeaf : mode === 'resource' ? progressResource : progressTraditional;
    [cells, filledCells, notes, filledNotes] = fn(criterion, suppliers, cells, filledCells, notes, filledNotes);
  }

  return {
    scores: { filled: filledCells, total: cells },
    notes: { filled: filledNotes, total: notes },
  };
}

// ── Price deductions (prismodell) ──

function deductionsDirect(
  criterion: Criterion,
  suppliers: Supplier[],
  maxDed: number,
  result: Record<string, Record<string, number>>
): void {
  const perSupplier: Record<string, number> = {};
  for (const supplier of suppliers) {
    const entered = criterion.priceDeductionAmounts?.[supplier.id] ?? 0;
    perSupplier[supplier.id] = Math.min(entered, maxDed);
  }
  result[criterion.id] = perSupplier;
}

function deductionsTraditional(
  criterion: Criterion,
  suppliers: Supplier[],
  maxDed: number,
  result: Record<string, Record<string, number>>
): void {
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
    if (criterion.type === 'price') continue;
    const mode = criterionMode(criterion);
    const maxDed =
      criterion.maxPriceDeduction ?? (totalWeight > 0 ? qb * (criterion.weight / totalWeight) : 0);

    if (mode === 'leaf' || mode === 'resource') {
      deductionsDirect(criterion, suppliers, maxDed, result);
    } else {
      deductionsTraditional(criterion, suppliers, maxDed, result);
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
    if (criterion.type === 'price' && activeMethod === 'poeng') {
      result[criterion.id] = mapSuppliers(suppliers, (s) => priceFormulaScores[s.id] ?? 0);
      continue;
    }
    const mode = criterionMode(criterion);
    result[criterion.id] =
      mode === 'resource' ? mapSuppliers(suppliers, (s) =>
        supplierResourceScore(
          criterion.items?.[s.id] ?? [],
          criterion.subcriteria,
          criterion.aggregation ?? 'average'
        )
      ) :
      mode === 'leaf' ? mapSuppliers(suppliers, (s) => criterion.scores?.[s.id] ?? 0) :
      mapSuppliers(suppliers, (s) => weightedAverage(criterion.subcriteria, s.id, itemScores));
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
