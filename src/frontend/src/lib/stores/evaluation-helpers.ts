/**
 * Shared helper functions for evaluation store delegates.
 * These are the finder utilities extracted from EvaluationStore's private methods.
 */

import type { Criterion, SubCriterion, ItemCriterion, EvaluationItem, EvaluationData } from './evaluation.svelte';

/** Find a criterion by id. */
export function findCriterion(data: EvaluationData, criterionId: string): Criterion | undefined {
  return data.criteria.find((c) => c.id === criterionId);
}

/** Find a sub-criterion by id (searches all criteria). */
export function findSub(data: EvaluationData, subCriterionId: string): SubCriterion | undefined {
  for (const criterion of data.criteria) {
    const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
    if (sub) return sub;
  }
  return undefined;
}

/** Find an item-criterion by sub-criterion and item-criterion id. */
export function findItemCriterion(
  data: EvaluationData,
  subCriterionId: string,
  itemCriterionId: string
): ItemCriterion | undefined {
  const sub = findSub(data, subCriterionId);
  return sub?.itemCriteria?.find((c) => c.id === itemCriterionId);
}

/** Find a role's item (resource) for a supplier on a criterion. */
export function findRoleItem(
  data: EvaluationData,
  criterionId: string,
  supplierId: string,
  roleId: string
): EvaluationItem | undefined {
  const criterion = findCriterion(data, criterionId);
  return criterion?.items?.[supplierId]?.find((i) => i.roleId === roleId);
}

/** Clamp a score to 0–10. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

/** Clamp a weight value to 0–100 integer. */
export function clampWeight(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Generate a unique id with a prefix. */
let idCounter = 0;
export function uid(prefix: string): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
