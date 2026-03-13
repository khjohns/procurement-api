/**
 * Item/resource CRUD mutation delegates for EvaluationStore.
 * All functions take `data: EvaluationData` and mutate it directly.
 */

import type { EvaluationData, AggregationMethod } from './evaluation.svelte';
import { DEFAULT_ITEM_LABEL } from './evaluation.svelte';
import { findSub, findItemCriterion, clampScore, clampWeight, uid } from './evaluation-helpers';

/** Add an item to a supplier's list for a sub-criterion (sub-level item eval). */
export function addItem(
  data: EvaluationData,
  subCriterionId: string,
  supplierId: string,
  name: string,
  label?: string
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub || sub.evaluationType !== 'item') return;
  if (!sub.items) sub.items = {};
  if (!sub.items[supplierId]) sub.items[supplierId] = [];
  sub.items[supplierId].push({
    id: uid('item'),
    name,
    label,
    scores: {},
    notes: {},
  });
}

/** Remove an item (sub-level). */
export function removeItem(
  data: EvaluationData,
  subCriterionId: string,
  supplierId: string,
  itemId: string
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub?.items) return;
  const items = sub.items[supplierId];
  if (!items) return;
  sub.items[supplierId] = items.filter((i) => i.id !== itemId);
}

/** Set a score for a specific item on a specific item-criterion (sub-level). */
export function setItemScore(
  data: EvaluationData,
  subCriterionId: string,
  supplierId: string,
  itemId: string,
  itemCriterionId: string,
  value: number
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub?.items) return;
  const items = sub.items[supplierId];
  if (!items) return;
  const item = items.find((i) => i.id === itemId);
  if (item) item.scores[itemCriterionId] = clampScore(value);
}

/** Set a note for a specific item on a specific item-criterion (sub-level). */
export function setItemNote(
  data: EvaluationData,
  subCriterionId: string,
  supplierId: string,
  itemId: string,
  itemCriterionId: string,
  text: string
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub?.items) return;
  const items = sub.items[supplierId];
  if (!items) return;
  const item = items.find((i) => i.id === itemId);
  if (item) item.notes[itemCriterionId] = text;
}

/** Set a holistic resource note (covering all dimensions) on sub-level items. */
export function setItemResourceNote(
  data: EvaluationData,
  subCriterionId: string,
  supplierId: string,
  itemId: string,
  text: string
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub?.items) return;
  const items = sub.items[supplierId];
  if (!items) return;
  const item = items.find((i) => i.id === itemId);
  if (item) item.note = text;
}

/** Toggle a sub-criterion between simple and item-level evaluation. */
export function setEvaluationType(
  data: EvaluationData,
  subCriterionId: string,
  type: 'simple' | 'item'
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub) return;
  sub.evaluationType = type;
  if (type === 'item') {
    if (!sub.itemCriteria || sub.itemCriteria.length === 0) {
      sub.itemCriteria = [{ id: uid('ic'), name: '', weight: 100 }];
    }
    if (!sub.items) sub.items = {};
    if (!sub.itemLabel) sub.itemLabel = DEFAULT_ITEM_LABEL;
    if (!sub.aggregation) sub.aggregation = 'average';
  }
}

/** Set the item label for an item-evaluated sub-criterion. */
export function setItemLabel(
  data: EvaluationData,
  subCriterionId: string,
  label: string
): void {
  const sub = findSub(data, subCriterionId);
  if (sub) sub.itemLabel = label;
}

/** Change aggregation method (sub-level). */
export function setAggregation(
  data: EvaluationData,
  subCriterionId: string,
  method: AggregationMethod
): void {
  const sub = findSub(data, subCriterionId);
  if (sub) sub.aggregation = method;
}

/** Add an item-criterion (moment/dimension) to an item-evaluated sub-criterion. */
export function addItemCriterion(
  data: EvaluationData,
  subCriterionId: string,
  name: string,
  weight: number
): string {
  const sub = findSub(data, subCriterionId);
  if (!sub || !sub.itemCriteria) return '';
  const id = uid('ic');
  sub.itemCriteria = [...sub.itemCriteria, { id, name, weight }];
  return id;
}

/** Remove an item-criterion dimension. */
export function removeItemCriterion(
  data: EvaluationData,
  subCriterionId: string,
  itemCriterionId: string
): void {
  const sub = findSub(data, subCriterionId);
  if (!sub || !sub.itemCriteria) return;
  sub.itemCriteria = sub.itemCriteria.filter((ic) => ic.id !== itemCriterionId);
  if (sub.items) {
    for (const items of Object.values(sub.items)) {
      for (const item of items) {
        delete item.scores[itemCriterionId];
        delete item.notes[itemCriterionId];
      }
    }
  }
}

/** Rename an item-criterion dimension. */
export function renameItemCriterion(
  data: EvaluationData,
  subCriterionId: string,
  itemCriterionId: string,
  name: string
): void {
  const ic = findItemCriterion(data, subCriterionId, itemCriterionId);
  if (ic) ic.name = name;
}

/** Set weight for an item-criterion dimension. */
export function setItemCriterionWeight(
  data: EvaluationData,
  subCriterionId: string,
  itemCriterionId: string,
  weight: number
): void {
  const ic = findItemCriterion(data, subCriterionId, itemCriterionId);
  if (ic) ic.weight = clampWeight(weight);
}
