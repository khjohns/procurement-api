/**
 * Evaluation store — reactive state for the scoring matrix.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 *
 * Three criterion modes:
 *   Mode 1 (leaf):        subcriteria.length === 0, evaluationType !== 'item' → direct scores
 *   Mode 2 (traditional): subcriteria.length > 0,  evaluationType !== 'item' → weighted sub-scores
 *   Mode 3 (resource):    evaluationType === 'item' → roles × moments (subcriteria as moments)
 */

import { extractBidders } from '$lib/utils/activities';
import {
  computeProgress,
  computePriceDeductions,
  computeGroupScores,
  computeBestScores,
  computeWeightWarnings,
} from './evaluation-computations';
import {
  uid,
  clampScore,
  clampWeight,
  findCriterion,
  findSub,
  findItemCriterion,
  findRoleItem,
} from './evaluation-helpers';
import * as itemMutations from './evaluation-items';
import * as roleMutations from './evaluation-roles';
import * as structureMutations from './evaluation-structure';

// ── Item-level types ──

export interface ItemCriterion {
  id: string;
  name: string;
  weight: number; // sums to 100 within sub-criterion
}

export interface EvaluationItem {
  id: string;
  name: string;
  label?: string; // role, type, category
  roleId?: string; // links to Role.id for criterion-level resource evaluation
  scores: Record<string, number>; // itemCriterionId or subCriterionId → 0–10
  notes: Record<string, string>; // itemCriterionId or subCriterionId → text
  note?: string; // holistic resource note
}

export type AggregationMethod = 'average' | 'minimum';

// ── Role type (criterion-level resource evaluation) ──

export interface Role {
  id: string;
  name: string;
}

// ── Core types ──

export interface SubCriterion {
  id: string;
  name: string;
  weight: number;
  scores: Record<string, number>;
  notes: Record<string, string>;
  /** Prismodell: direct deduction amounts in NOK per supplier. */
  priceDeductionAmounts?: Record<string, number>;
  // Item-level evaluation (optional, sub-criterion level)
  evaluationType?: 'simple' | 'item';
  itemLabel?: string; // "Ressurs", "Prosjekt", "Tiltak"
  itemCriteria?: ItemCriterion[];
  items?: Record<string, EvaluationItem[]>; // supplierId → items
  aggregation?: AggregationMethod;
}

export interface Criterion {
  id: string;
  name: string;
  type: 'quality' | 'price';
  weight: number;
  subcriteria: SubCriterion[];
  notes?: Record<string, string>; // supplierId → overordnet vurdering
  // Leaf criterion scoring (mode 1: no subcriteria)
  scores?: Record<string, number>; // supplierId → 0–10
  // Criterion-level resource evaluation (mode 3)
  evaluationType?: 'simple' | 'item';
  roles?: Role[]; // shared across all suppliers
  items?: Record<string, EvaluationItem[]>; // supplierId → resources (with roleId)
  aggregation?: AggregationMethod;
  /** Prismodell: explicit max deduction in NOK (e.g. 300_000). When set, overrides weight-derived amount. */
  maxPriceDeduction?: number;
  /** Prismodell: direct deduction amounts in NOK per supplier for leaf criteria. */
  priceDeductionAmounts?: Record<string, number>;
}

export interface Supplier {
  id: string;
  name: string;
  price?: number;
}

export interface EvaluationData {
  id: string;
  title: string;
  procurementName: string;
  reference: string;
  status: string;
  qualityWeight: number;
  priceWeight: number;
  contractValue: number;
  suppliers: Supplier[];
  criteria: Criterion[];
}

export type ActiveMethod = 'poeng' | 'pris';

/** Determine the mode of a criterion. */
export function criterionMode(c: Criterion): 'leaf' | 'traditional' | 'resource' {
  if (c.evaluationType === 'item') return 'resource';
  if (c.subcriteria.length === 0) return 'leaf';
  return 'traditional';
}

// ── Score computation functions ──

/** Weighted average of an item's scores across weighted dimensions. */
export function weightedItemScore(
  item: EvaluationItem,
  dimensions: readonly { id: string; weight: number }[]
): number {
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = dimensions.reduce((acc, d) => acc + (item.scores[d.id] ?? 0) * d.weight, 0);
  return sum / totalWeight;
}

// Convenience aliases — both use the same generic function.
export const itemScore = weightedItemScore;
export const resourceMomentScore = weightedItemScore;

/** Aggregate item scores for a supplier (average or minimum). */
export function aggregateItemScores(
  items: EvaluationItem[],
  dimensions: readonly { id: string; weight: number }[],
  method: AggregationMethod
): number {
  if (items.length === 0) return 0;
  const scores = items.map((item) => weightedItemScore(item, dimensions));

  switch (method) {
    case 'average':
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    case 'minimum':
      return Math.min(...scores);
  }
}

// Convenience aliases for call sites that pass specific types.
export const supplierItemScore = aggregateItemScores;
export const supplierResourceScore = aggregateItemScores;

/** Weighted average for a single supplier across subcriteria. */
export function weightedAverage(
  subcriteria: SubCriterion[],
  supplierId: string,
  itemScoresOverlay?: Record<string, Record<string, number>>
): number {
  const totalWeight = subcriteria.reduce((s, sub) => s + sub.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = subcriteria.reduce((acc, sub) => {
    const score = itemScoresOverlay?.[sub.id]?.[supplierId] ?? sub.scores[supplierId] ?? 0;
    return acc + score * sub.weight;
  }, 0);
  return sum / totalWeight;
}

/** Format a score for display: max 2 decimal places, no trailing zeros. */
export function fmt2(score: number): string {
  return parseFloat(score.toFixed(2)).toString();
}

export function formatNOK(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
}

/** Determine score tier for CSS class. */
export function scoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

/** Effective global weight for a sub-criterion (sub-weights are relative within criterion, sum to 100). */
export function subEffectiveWeight(
  criterionWeight: number,
  subWeight: number,
  subWeightSum: number
): number {
  return subWeightSum > 0 ? (criterionWeight * subWeight) / subWeightSum : 0;
}

export { uid, clampScore, clampWeight } from './evaluation-helpers';

export const DEFAULT_ITEM_LABEL = 'Ressurs';

const emptyData: EvaluationData = {
  id: '',
  title: '',
  procurementName: '',
  reference: '',
  status: 'Oppsett',
  qualityWeight: 0,
  priceWeight: 0,
  contractValue: 0,
  suppliers: [],
  criteria: [],
};

const LS_PREFIX = 'eval-';

class EvaluationStore {
  data = $state<EvaluationData>(structuredClone(emptyData));

  activeMethod = $state<ActiveMethod>('poeng');

  private readonly _cleanup: () => void;

  constructor() {
    // Auto-save to localStorage whenever data or activeMethod changes.
    // $effect.root() lets us use $effect outside component lifecycle.
    this._cleanup = $effect.root(() => {
      let timer: ReturnType<typeof setTimeout>;
      $effect(() => {
        const id = this.data.id;
        const snapshot = $state.snapshot(this.data);
        const method = this.activeMethod;
        if (!id || typeof localStorage === 'undefined') return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          localStorage.setItem(
            LS_PREFIX + id,
            JSON.stringify({ data: snapshot, activeMethod: method })
          );
        }, 500);
      });
    });
  }

  /** Current matrix view: 'overview' or a criterion ID. */
  activeView = $state<string>('overview');

  /** Selected supplier in the justification panel. */
  selectedSupplierId = $state<string | null>(null);

  /** Whether the overview matrix shows transposed axes (suppliers as rows). */
  matrixTransposed = $state<boolean>(false);

  /** True when minimum data is present to show results/ranking. */
  isReady = $derived(
    this.data.suppliers.length >= 2 &&
      this.data.criteria.length > 0 &&
      this.data.criteria.every((c) => c.weight > 0)
  );

  /** True when criterion weights sum to exactly 100. */
  weightsValid = $derived(this.data.criteria.reduce((s, c) => s + c.weight, 0) === 100);

  /** Derived quality weight from criteria of type 'quality'. */
  qualityWeightDerived = $derived(
    this.data.criteria.filter((c) => c.type === 'quality').reduce((s, c) => s + c.weight, 0)
  );

  /** Derived price weight from criteria of type 'price'. */
  priceWeightDerived = $derived(
    this.data.criteria.filter((c) => c.type === 'price').reduce((s, c) => s + c.weight, 0)
  );

  /** Pure $derived: computed scores for item-evaluated subcriteria. */
  itemScores = $derived.by(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const criterion of this.data.criteria) {
      for (const sub of criterion.subcriteria) {
        if (sub.evaluationType !== 'item' || !sub.items || !sub.itemCriteria) continue;
        result[sub.id] = {};
        for (const supplier of this.data.suppliers) {
          const items = sub.items[supplier.id] ?? [];
          result[sub.id][supplier.id] = supplierItemScore(
            items,
            sub.itemCriteria,
            sub.aggregation ?? 'average'
          );
        }
      }
    }
    return result;
  });

  /**
   * Price formula scores for poengmodell: score = 10 - 10*(Pe-Pb)/Pb
   * Pb = lowest supplier price. Clamped to [0, 10].
   * Only computed when at least one supplier has a price.
   */
  priceFormulaScores = $derived.by(() => {
    const result: Record<string, number> = {};
    let pb = Infinity;
    const valid: { id: string; price: number }[] = [];
    for (const s of this.data.suppliers) {
      if (s.price != null && s.price > 0) {
        valid.push({ id: s.id, price: s.price });
        if (s.price < pb) pb = s.price;
      }
    }
    for (const { id, price } of valid) {
      result[id] = Math.max(0, Math.min(10, 10 - (10 * (price - pb)) / pb));
    }
    return result;
  });

  /** Computed group averages per supplier (handles all three modes). */
  groupScores = $derived.by(() =>
    computeGroupScores(
      this.data.criteria,
      this.data.suppliers,
      this.activeMethod,
      this.itemScores,
      this.priceFormulaScores
    )
  );

  /** Total weighted score per supplier (0-10 scale). */
  totals = $derived.by(() => {
    const result: Record<string, number> = {};
    const tw = this.totalWeight;
    for (const supplier of this.data.suppliers) {
      let sum = 0;
      for (const criterion of this.data.criteria) {
        sum += (this.groupScores[criterion.id]?.[supplier.id] ?? 0) * criterion.weight;
      }
      result[supplier.id] = tw > 0 ? sum / tw : 0;
    }
    return result;
  });

  /** Sorted ranking derived from totals. */
  ranking = $derived.by(() => {
    return this.data.suppliers
      .map((s) => ({
        supplier: s,
        score: this.totals[s.id],
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  });

  /** Effective max deduction per quality criterion (explicit or weight-derived). Single source of truth for prismodell display. */
  maxDeductions = $derived.by(() => {
    const result: Record<string, number> = {};
    const qb = this.qualityBudget;
    const tw = this.totalWeight;
    for (const c of this.data.criteria) {
      if (c.type !== 'quality') continue;
      result[c.id] = c.maxPriceDeduction ?? (tw > 0 ? qb * (c.weight / tw) : 0);
    }
    return result;
  });

  /** Price model: quality deduction per scoring unit per supplier. */
  priceDeductions = $derived.by(() =>
    computePriceDeductions(
      this.data.criteria,
      this.data.suppliers,
      this.data.contractValue,
      this.data.qualityWeight,
      this.totalWeight
    )
  );

  /** Total deduction per supplier. */
  totalDeductions = $derived.by(() => {
    const result: Record<string, number> = {};
    for (const supplier of this.data.suppliers) {
      let sum = 0;
      for (const subId of Object.keys(this.priceDeductions)) {
        sum += this.priceDeductions[subId][supplier.id] ?? 0;
      }
      result[supplier.id] = sum;
    }
    return result;
  });

  /** Evaluated price per supplier = offered price − earned quality deductions. Only includes suppliers with a price. */
  evaluatedPrices = $derived.by(() => {
    const result: Record<string, number> = {};
    for (const supplier of this.data.suppliers) {
      if (supplier.price == null) continue;
      result[supplier.id] = supplier.price - this.totalDeductions[supplier.id];
    }
    return result;
  });

  /** Price model ranking (lowest evaluated price wins). Excludes suppliers without a price. */
  priceRanking = $derived.by(() => {
    return this.data.suppliers
      .filter((s) => s.price != null)
      .map((s) => ({
        supplier: s,
        evaluatedPrice: this.evaluatedPrices[s.id],
      }))
      .sort((a, b) => a.evaluatedPrice - b.evaluatedPrice)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  });

  /** Quality budget: how much of contract value is allocated to quality. */
  qualityBudget = $derived(this.data.contractValue * (this.data.qualityWeight / 100));

  /** Total weight of all criteria (should be 100). */
  totalWeight = $derived(this.data.criteria.reduce((s, c) => s + c.weight, 0));

  /** Margin between #1 and #2 in quality ranking. */
  margin = $derived(this.ranking.length >= 2 ? this.ranking[0].score - this.ranking[1].score : 0);

  /** Whether both evaluation methods agree on winner. */
  sameWinner = $derived(this.ranking[0]?.supplier.id === this.priceRanking[0]?.supplier.id);

  /** Progress tracking (handles all three modes). */
  progress = $derived.by(() => computeProgress(this.data.criteria, this.data.suppliers));

  /** Best score per sub-criterion: subId → max score across suppliers. */
  bestScores = $derived.by(() => computeBestScores(this.data.criteria, this.itemScores));

  /** Best group score per criterion: criterionId → max group score. */
  bestGroupScores = $derived.by(() => {
    const result: Record<string, number> = {};
    for (const criterion of this.data.criteria) {
      const scores = this.groupScores[criterion.id];
      if (scores) {
        const vals = Object.values(scores);
        result[criterion.id] = vals.length > 0 ? Math.max(...vals) : 0;
      }
    }
    return result;
  });

  /** Weight warnings: criterion id → sub-criteria weights don't sum to 100% (traditional mode only). */
  weightWarnings = $derived.by(() => computeWeightWarnings(this.data.criteria));

  // ── Mutation methods ──

  // ── Scoring mutations (kept inline — simple find-then-set) ──

  /** Update a single score (sub-criterion level). */
  setScore(subCriterionId: string, supplierId: string, value: number) {
    const sub = findSub(this.data, subCriterionId);
    if (sub) sub.scores[supplierId] = clampScore(value);
  }

  /** Update a score on a leaf criterion (mode 1). */
  setCriterionScore(criterionId: string, supplierId: string, value: number) {
    const criterion = findCriterion(this.data, criterionId);
    if (!criterion) return;
    if (!criterion.scores) criterion.scores = {};
    criterion.scores[supplierId] = clampScore(value);
  }

  /** Update a note. */
  setNote(subCriterionId: string, supplierId: string, text: string) {
    const sub = findSub(this.data, subCriterionId);
    if (sub) sub.notes[supplierId] = text;
  }

  /** Set the explicit max deduction for a criterion in prismodell (NOK). */
  setCriterionMaxPriceDeduction(criterionId: string, value: number) {
    const c = findCriterion(this.data, criterionId);
    if (c) c.maxPriceDeduction = Math.max(0, Math.round(value));
  }

  /** Set a prismodell deduction amount (NOK) on a leaf/resource criterion. */
  setCriterionPriceDeductionAmount(criterionId: string, supplierId: string, amount: number) {
    this._setPriceDeduction(findCriterion(this.data, criterionId), supplierId, amount);
  }

  /** Set a prismodell deduction amount (NOK) on a sub-criterion. */
  setSubPriceDeductionAmount(subCriterionId: string, supplierId: string, amount: number) {
    this._setPriceDeduction(findSub(this.data, subCriterionId), supplierId, amount);
  }

  /** Update supplier price. */
  setSupplierPrice(supplierId: string, price: number) {
    const supplier = this.data.suppliers.find((s) => s.id === supplierId);
    if (supplier) supplier.price = price;
  }

  /** Update a criterion's weight (direct). */
  setCriterionWeight(criterionId: string, weight: number) {
    const criterion = findCriterion(this.data, criterionId);
    if (criterion) criterion.weight = clampWeight(weight);
  }

  /** Update a sub-criterion's weight (relative within its criterion, sums to 100). */
  setSubCriterionWeight(subCriterionId: string, weight: number) {
    const sub = findSub(this.data, subCriterionId);
    if (sub) sub.weight = clampWeight(weight);
  }

  // ── Item mutation delegates ──

  setItemScore(subCriterionId: string, supplierId: string, itemId: string, itemCriterionId: string, value: number) {
    itemMutations.setItemScore(this.data, subCriterionId, supplierId, itemId, itemCriterionId, value);
  }

  setItemNote(subCriterionId: string, supplierId: string, itemId: string, itemCriterionId: string, text: string) {
    itemMutations.setItemNote(this.data, subCriterionId, supplierId, itemId, itemCriterionId, text);
  }

  setItemResourceNote(subCriterionId: string, supplierId: string, itemId: string, text: string) {
    itemMutations.setItemResourceNote(this.data, subCriterionId, supplierId, itemId, text);
  }

  addItem(subCriterionId: string, supplierId: string, name: string, label?: string) {
    itemMutations.addItem(this.data, subCriterionId, supplierId, name, label);
  }

  removeItem(subCriterionId: string, supplierId: string, itemId: string) {
    itemMutations.removeItem(this.data, subCriterionId, supplierId, itemId);
  }

  setEvaluationType(subCriterionId: string, type: 'simple' | 'item') {
    itemMutations.setEvaluationType(this.data, subCriterionId, type);
  }

  setItemLabel(subCriterionId: string, label: string) {
    itemMutations.setItemLabel(this.data, subCriterionId, label);
  }

  setAggregation(subCriterionId: string, method: AggregationMethod) {
    itemMutations.setAggregation(this.data, subCriterionId, method);
  }

  addItemCriterion(subCriterionId: string, name: string, weight: number): string {
    return itemMutations.addItemCriterion(this.data, subCriterionId, name, weight);
  }

  removeItemCriterion(subCriterionId: string, itemCriterionId: string) {
    itemMutations.removeItemCriterion(this.data, subCriterionId, itemCriterionId);
  }

  renameItemCriterion(subCriterionId: string, itemCriterionId: string, name: string) {
    itemMutations.renameItemCriterion(this.data, subCriterionId, itemCriterionId, name);
  }

  setItemCriterionWeight(subCriterionId: string, itemCriterionId: string, weight: number) {
    itemMutations.setItemCriterionWeight(this.data, subCriterionId, itemCriterionId, weight);
  }

  // ── Role mutation delegates ──

  setCriterionEvaluationType(criterionId: string, type: 'simple' | 'item') {
    roleMutations.setCriterionEvaluationType(this.data, criterionId, type);
  }

  setCriterionAggregation(criterionId: string, method: AggregationMethod) {
    roleMutations.setCriterionAggregation(this.data, criterionId, method);
  }

  addRole(criterionId: string, name: string): string {
    return roleMutations.addRole(this.data, criterionId, name);
  }

  removeRole(criterionId: string, roleId: string) {
    roleMutations.removeRole(this.data, criterionId, roleId);
  }

  renameRole(criterionId: string, roleId: string, name: string) {
    roleMutations.renameRole(this.data, criterionId, roleId, name);
  }

  setRoleLabel(criterionId: string, supplierId: string, roleId: string, label: string) {
    roleMutations.setRoleLabel(this.data, criterionId, supplierId, roleId, label);
  }

  setRoleScore(criterionId: string, supplierId: string, roleId: string, momentId: string, value: number) {
    roleMutations.setRoleScore(this.data, criterionId, supplierId, roleId, momentId, value);
  }

  setRoleNote(criterionId: string, supplierId: string, roleId: string, momentId: string, text: string) {
    roleMutations.setRoleNote(this.data, criterionId, supplierId, roleId, momentId, text);
  }

  setRoleResourceNote(criterionId: string, supplierId: string, roleId: string, text: string) {
    roleMutations.setRoleResourceNote(this.data, criterionId, supplierId, roleId, text);
  }

  /** Set the active view (overview or criterion detail). */
  setActiveView(view: string) {
    this.activeView = view;
    if (view === 'overview') {
      this.selectedSupplierId = null;
    } else if (!this.selectedSupplierId && this.data.suppliers.length > 0) {
      this.selectedSupplierId = this.data.suppliers[0].id;
    }
  }

  /** Select a supplier for the justification panel. */
  selectSupplier(supplierId: string) {
    this.selectedSupplierId = supplierId;
  }

  /** Toggle the overview matrix axis orientation. */
  toggleMatrixTransposed() {
    this.matrixTransposed = !this.matrixTransposed;
  }

  /** Set a criterion-level note (overordnet vurdering) for a supplier. */
  setCriterionNote(criterionId: string, supplierId: string, text: string) {
    const criterion = findCriterion(this.data, criterionId);
    if (!criterion) return;
    if (!criterion.notes) criterion.notes = {};
    criterion.notes[supplierId] = text;
  }

  // ── Structure mutation delegates ──

  setTitle(title: string) {
    this.data.title = title;
    this.data.procurementName = title;
  }

  setReference(reference: string) {
    this.data.reference = reference;
  }

  setContractValue(value: number) {
    this.data.contractValue = Math.max(0, value);
  }

  setQualityPriceWeights(quality: number, price: number) {
    this.data.qualityWeight = quality;
    this.data.priceWeight = price;
  }

  addCriterion(name: string, type: 'quality' | 'price'): string {
    return structureMutations.addCriterion(this.data, name, type);
  }

  removeCriterion(criterionId: string) {
    structureMutations.removeCriterion(this.data, criterionId);
  }

  renameCriterion(criterionId: string, name: string) {
    structureMutations.renameCriterion(this.data, criterionId, name);
  }

  setCriterionType(criterionId: string, type: 'quality' | 'price') {
    structureMutations.setCriterionType(this.data, criterionId, type);
  }

  reorderCriteria(fromIndex: number, toIndex: number) {
    structureMutations.reorderCriteria(this.data, fromIndex, toIndex);
  }

  addSubCriterion(criterionId: string, name: string, weight: number = 0): string {
    return structureMutations.addSubCriterion(this.data, criterionId, name, weight);
  }

  removeSubCriterion(subCriterionId: string) {
    structureMutations.removeSubCriterion(this.data, subCriterionId);
  }

  renameSubCriterion(subCriterionId: string, name: string) {
    structureMutations.renameSubCriterion(this.data, subCriterionId, name);
  }

  reorderSubCriteria(criterionId: string, fromIndex: number, toIndex: number) {
    structureMutations.reorderSubCriteria(this.data, criterionId, fromIndex, toIndex);
  }

  addSupplier(name: string, price?: number): string {
    return structureMutations.addSupplier(this.data, name, price);
  }

  removeSupplier(supplierId: string) {
    structureMutations.removeSupplier(this.data, supplierId);
  }

  renameSupplier(supplierId: string, name: string) {
    structureMutations.renameSupplier(this.data, supplierId, name);
  }

  /** Initialize from route data if the procurement has changed. Preserves existing work for the same procurement. */
  initializeIfNeeded(procId: number, proc: any, activities: any[], eforms: any | null) {
    if (this.data.id === String(procId)) return;

    if (this._tryRestoreFromStorage(procId)) return;

    this.initialize(this._buildFreshData(procId, proc, activities, eforms));
    this._importEformsCriteria(eforms);
  }

  /** Try to restore previously saved evaluation state from localStorage. Returns true if restored. */
  private _tryRestoreFromStorage(procId: number): boolean {
    if (typeof localStorage === 'undefined') return false;
    const saved = localStorage.getItem(LS_PREFIX + procId);
    if (!saved) return false;
    try {
      const { data, activeMethod } = JSON.parse(saved);
      this.initialize(data);
      if (activeMethod) this.activeMethod = activeMethod;
      return true;
    } catch {
      localStorage.removeItem(LS_PREFIX + procId);
      return false;
    }
  }

  /** Build initial EvaluationData from route parameters. */
  private _buildFreshData(procId: number, proc: any, activities: any[], eforms: any | null): EvaluationData {
    const title = proc?.name || proc?.title || '';
    return {
      id: String(procId),
      title,
      procurementName: title,
      reference: proc?.sequenceId || String(procId),
      status: 'Oppsett',
      qualityWeight: 0,
      priceWeight: 0,
      contractValue: eforms?.estimated_value ?? 0,
      suppliers: extractBidders(activities),
      criteria: [],
    };
  }

  /** Import award criteria from eForms data, if available. */
  private _importEformsCriteria(eforms: any | null) {
    if (!eforms?.award_criteria?.length) return;
    for (const ac of eforms.award_criteria) {
      const type = ac.type === 'price' ? ('price' as const) : ('quality' as const);
      const name = ac.name || (type === 'price' ? 'Pris' : 'Kvalitet');
      const criterionId = this.addCriterion(name, type);
      if (ac.weight_percent) {
        this.setCriterionWeight(criterionId, Math.round(ac.weight_percent));
      }
    }
  }

  /** Initialize or reset the evaluation with new data. */
  initialize(newData: EvaluationData) {
    // Migrate old-format sub-weights (global scale → relative within criterion).
    // Old format: sub-weights sum to criterion.weight. New format: sum to 100.
    for (const c of newData.criteria) {
      if (criterionMode(c) === 'traditional' && c.subcriteria.length > 0) {
        const subSum = c.subcriteria.reduce((s, sub) => s + sub.weight, 0);
        if (subSum > 0 && subSum !== 100 && subSum === c.weight) {
          const scale = 100 / subSum;
          for (const sub of c.subcriteria) {
            sub.weight = Math.round(sub.weight * scale);
          }
        }
      }
    }
    this.data = newData;
    this.activeMethod = 'poeng';
    this.activeView = 'overview';
    this.selectedSupplierId = null;
    this.matrixTransposed = false;
  }

  /** Write a prismodell deduction amount onto any criterion-like node. */
  private _setPriceDeduction(
    node: { priceDeductionAmounts?: Record<string, number> } | undefined,
    supplierId: string,
    amount: number
  ) {
    if (!node) return;
    if (!node.priceDeductionAmounts) node.priceDeductionAmounts = {};
    node.priceDeductionAmounts[supplierId] = Math.max(0, Math.round(amount));
  }

}

export const evaluation = new EvaluationStore();
