/**
 * Role CRUD mutation delegates for EvaluationStore.
 * All functions take `data: EvaluationData` and mutate it directly.
 */

import type { EvaluationData, AggregationMethod } from './evaluation.svelte';
import { findCriterion, findRoleItem, clampScore, uid } from './evaluation-helpers';

/** Toggle criterion between simple and resource evaluation. */
export function setCriterionEvaluationType(
  data: EvaluationData,
  criterionId: string,
  type: 'simple' | 'item'
): void {
  const criterion = findCriterion(data, criterionId);
  if (!criterion) return;
  criterion.evaluationType = type;
  if (type === 'item') {
    if (!criterion.roles || criterion.roles.length === 0) {
      criterion.roles = [{ id: uid('role'), name: '' }];
    }
    if (!criterion.items) criterion.items = {};
    if (!criterion.aggregation) criterion.aggregation = 'average';
  }
}

/** Set aggregation method for criterion-level resources. */
export function setCriterionAggregation(
  data: EvaluationData,
  criterionId: string,
  method: AggregationMethod
): void {
  const criterion = findCriterion(data, criterionId);
  if (criterion) criterion.aggregation = method;
}

/** Add a role to a criterion. Returns the new role id. */
export function addRole(
  data: EvaluationData,
  criterionId: string,
  name: string
): string {
  const criterion = findCriterion(data, criterionId);
  if (!criterion) return '';
  if (!criterion.roles) criterion.roles = [];
  const id = uid('role');
  criterion.roles = [...criterion.roles, { id, name }];
  // Create placeholder items for all suppliers
  if (!criterion.items) criterion.items = {};
  for (const supplier of data.suppliers) {
    if (!criterion.items[supplier.id]) criterion.items[supplier.id] = [];
    criterion.items[supplier.id] = [
      ...criterion.items[supplier.id],
      { id: uid('item'), name: '', roleId: id, scores: {}, notes: {} },
    ];
  }
  return id;
}

/** Remove a role and its associated items. */
export function removeRole(
  data: EvaluationData,
  criterionId: string,
  roleId: string
): void {
  const criterion = findCriterion(data, criterionId);
  if (!criterion?.roles) return;
  criterion.roles = criterion.roles.filter((r) => r.id !== roleId);
  if (criterion.items) {
    for (const supplierId of Object.keys(criterion.items)) {
      criterion.items[supplierId] = criterion.items[supplierId].filter(
        (i) => i.roleId !== roleId
      );
    }
  }
}

/** Rename a role. */
export function renameRole(
  data: EvaluationData,
  criterionId: string,
  roleId: string,
  name: string
): void {
  const criterion = findCriterion(data, criterionId);
  const role = criterion?.roles?.find((r) => r.id === roleId);
  if (role) role.name = name;
}

/** Set the label (person name) for a role on a specific supplier. */
export function setRoleLabel(
  data: EvaluationData,
  criterionId: string,
  supplierId: string,
  roleId: string,
  label: string
): void {
  const item = findRoleItem(data, criterionId, supplierId, roleId);
  if (item) item.label = label;
}

/** Set a score for a role on a moment (subcriterion) for a specific supplier. */
export function setRoleScore(
  data: EvaluationData,
  criterionId: string,
  supplierId: string,
  roleId: string,
  momentId: string,
  value: number
): void {
  const item = findRoleItem(data, criterionId, supplierId, roleId);
  if (item) item.scores[momentId] = clampScore(value);
}

/** Set a note for a role on a moment for a specific supplier. */
export function setRoleNote(
  data: EvaluationData,
  criterionId: string,
  supplierId: string,
  roleId: string,
  momentId: string,
  text: string
): void {
  const item = findRoleItem(data, criterionId, supplierId, roleId);
  if (item) item.notes[momentId] = text;
}

/** Set a holistic note for a role resource. */
export function setRoleResourceNote(
  data: EvaluationData,
  criterionId: string,
  supplierId: string,
  roleId: string,
  text: string
): void {
  const item = findRoleItem(data, criterionId, supplierId, roleId);
  if (item) item.note = text;
}
