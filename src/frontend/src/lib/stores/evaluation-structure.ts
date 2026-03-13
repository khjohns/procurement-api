/**
 * Structural mutation delegates for EvaluationStore.
 * All functions take `data: EvaluationData` and mutate it directly.
 */

import type { EvaluationData } from './evaluation.svelte';
import { criterionMode } from './evaluation.svelte';
import { findCriterion, findSub, clampWeight, uid } from './evaluation-helpers';

/** Add a criterion (leaf by default — no subcriteria). Returns the new criterion id. */
export function addCriterion(
  data: EvaluationData,
  name: string,
  type: 'quality' | 'price'
): string {
  const id = uid('c');
  data.criteria = [
    ...data.criteria,
    {
      id,
      name,
      type,
      weight: 0,
      subcriteria: [],
    },
  ];
  return id;
}

/** Remove a criterion. */
export function removeCriterion(data: EvaluationData, criterionId: string): void {
  data.criteria = data.criteria.filter((c) => c.id !== criterionId);
}

/** Rename a criterion. */
export function renameCriterion(data: EvaluationData, criterionId: string, name: string): void {
  const c = findCriterion(data, criterionId);
  if (c) c.name = name;
}

/** Set the type of a criterion (quality or price). */
export function setCriterionType(
  data: EvaluationData,
  criterionId: string,
  type: 'quality' | 'price'
): void {
  const c = findCriterion(data, criterionId);
  if (c) c.type = type;
}

/** Reorder criteria by moving from one index to another. */
export function reorderCriteria(
  data: EvaluationData,
  fromIndex: number,
  toIndex: number
): void {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= data.criteria.length ||
    toIndex >= data.criteria.length
  )
    return;
  const copy = [...data.criteria];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  data.criteria = copy;
}

/** Add a sub-criterion to a criterion. Returns the new sub-criterion id. */
export function addSubCriterion(
  data: EvaluationData,
  criterionId: string,
  name: string,
  weight: number = 0
): string {
  const c = findCriterion(data, criterionId);
  if (!c) return '';
  const id = uid(`${criterionId}-s`);
  c.subcriteria = [...c.subcriteria, { id, name, weight, scores: {}, notes: {} }];
  return id;
}

/** Remove a sub-criterion. */
export function removeSubCriterion(data: EvaluationData, subCriterionId: string): void {
  for (const c of data.criteria) {
    const filtered = c.subcriteria.filter((s) => s.id !== subCriterionId);
    if (filtered.length < c.subcriteria.length) {
      c.subcriteria = filtered;
      return;
    }
  }
}

/** Rename a sub-criterion. */
export function renameSubCriterion(
  data: EvaluationData,
  subCriterionId: string,
  name: string
): void {
  const sub = findSub(data, subCriterionId);
  if (sub) sub.name = name;
}

/** Reorder sub-criteria within a criterion. */
export function reorderSubCriteria(
  data: EvaluationData,
  criterionId: string,
  fromIndex: number,
  toIndex: number
): void {
  const c = findCriterion(data, criterionId);
  if (
    !c ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= c.subcriteria.length ||
    toIndex >= c.subcriteria.length
  )
    return;
  const copy = [...c.subcriteria];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  c.subcriteria = copy;
}

/** Add a supplier. Returns the new supplier id. */
export function addSupplier(
  data: EvaluationData,
  name: string,
  price?: number
): string {
  const id = uid('sup');
  data.suppliers = [...data.suppliers, { id, name, price }];
  // For resource-mode criteria with roles, create placeholder items for the new supplier
  for (const criterion of data.criteria) {
    if (criterionMode(criterion) === 'resource' && criterion.roles) {
      if (!criterion.items) criterion.items = {};
      criterion.items[id] = criterion.roles.map((role) => ({
        id: uid('item'),
        name: '',
        roleId: role.id,
        scores: {},
        notes: {},
      }));
    }
  }
  return id;
}

/** Remove a supplier and cascade-delete scores, notes, items. */
export function removeSupplier(data: EvaluationData, supplierId: string): void {
  data.suppliers = data.suppliers.filter((s) => s.id !== supplierId);
  // Cascade: remove scores, notes, items for this supplier
  for (const c of data.criteria) {
    if (c.notes) delete c.notes[supplierId];
    if (c.scores) delete c.scores[supplierId];
    if (c.priceDeductionAmounts) delete c.priceDeductionAmounts[supplierId];
    if (c.items) delete c.items[supplierId];
    for (const sub of c.subcriteria) {
      delete sub.scores[supplierId];
      delete sub.notes[supplierId];
      if (sub.priceDeductionAmounts) delete sub.priceDeductionAmounts[supplierId];
      if (sub.items) delete sub.items[supplierId];
    }
  }
}

/** Rename a supplier. */
export function renameSupplier(data: EvaluationData, supplierId: string, name: string): void {
  const s = data.suppliers.find((s) => s.id === supplierId);
  if (s) s.name = name;
}
