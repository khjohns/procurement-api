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

/** Clamp a score to 0–10. */
function clampScore(value: number): number {
	return Math.max(0, Math.min(10, Math.round(value)));
}

/** Weighted average of an item's scores across weighted dimensions. */
export function weightedItemScore(item: EvaluationItem, dimensions: readonly { id: string; weight: number }[]): number {
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
		const score =
			itemScoresOverlay?.[sub.id]?.[supplierId] ?? sub.scores[supplierId] ?? 0;
		return acc + score * sub.weight;
	}, 0);
	return sum / totalWeight;
}

/** Format number with Norwegian spacing (e.g. 8 000 000). */
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
export function subEffectiveWeight(criterionWeight: number, subWeight: number, subWeightSum: number): number {
	return subWeightSum > 0 ? criterionWeight * subWeight / subWeightSum : 0;
}

/** Clamp a weight value to 0–100 integer. */
function clampWeight(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

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
	criteria: []
};

let idCounter = 0;
function uid(prefix: string): string {
	return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

class EvaluationStore {
	data = $state<EvaluationData>(structuredClone(emptyData));

	activeMethod = $state<ActiveMethod>('poeng');

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
	weightsValid = $derived(
		this.data.criteria.reduce((s, c) => s + c.weight, 0) === 100
	);

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
		const prices = this.data.suppliers
			.filter((s) => s.price != null && s.price > 0)
			.map((s) => ({ id: s.id, price: s.price as number }));
		if (prices.length === 0) return result;
		const pb = Math.min(...prices.map((p) => p.price));
		for (const { id, price } of prices) {
			result[id] = Math.max(0, Math.min(10, 10 - 10 * (price - pb) / pb));
		}
		return result;
	});

	/** Computed group averages per supplier (handles all three modes). */
	groupScores = $derived.by(() => {
		const result: Record<string, Record<string, number>> = {};
		for (const criterion of this.data.criteria) {
			result[criterion.id] = {};
			const mode = criterionMode(criterion);
			// Price criteria in poengmodell: auto-score from supplier prices
			if (criterion.type === 'price' && this.activeMethod === 'poeng') {
				for (const supplier of this.data.suppliers) {
					result[criterion.id][supplier.id] = this.priceFormulaScores[supplier.id] ?? 0;
				}
				continue;
			}
			for (const supplier of this.data.suppliers) {
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
						this.itemScores
					);
				}
			}
		}
		return result;
	});

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
				score: this.totals[s.id]
			}))
			.sort((a, b) => b.score - a.score)
			.map((entry, i) => ({ ...entry, rank: i + 1 }));
	});

	/** Price model: quality deduction per scoring unit per supplier. */
	priceDeductions = $derived.by(() => {
		const result: Record<string, Record<string, number>> = {};
		const qb = this.data.contractValue * (this.data.qualityWeight / 100);
		const tw = this.totalWeight;

		for (const criterion of this.data.criteria) {
			const mode = criterionMode(criterion);
			if (mode === 'leaf') {
				// Leaf criteria: deduction based on criterion-level score
				if (!result[criterion.id]) result[criterion.id] = {};
				const maxDeduction = qb * (criterion.weight / tw);
				for (const supplier of this.data.suppliers) {
					const score = criterion.scores?.[supplier.id] ?? 0;
					result[criterion.id][supplier.id] = maxDeduction * ((10 - score) / 10);
				}
			} else if (mode === 'resource') {
				// Resource criteria: deduction based on aggregated resource score
				if (!result[criterion.id]) result[criterion.id] = {};
				const maxDeduction = qb * (criterion.weight / tw);
				for (const supplier of this.data.suppliers) {
					const score = this.groupScores[criterion.id]?.[supplier.id] ?? 0;
					result[criterion.id][supplier.id] = maxDeduction * ((10 - score) / 10);
				}
			} else {
				// Traditional: per-subcriterion deductions
				// Sub-weights are relative within criterion (sum to 100),
				// so effective global weight = criterion.weight × sub.weight / subSum
				const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
				for (const sub of criterion.subcriteria) {
					if (!result[sub.id]) result[sub.id] = {};
					const maxDeduction = qb * (subEffectiveWeight(criterion.weight, sub.weight, subSum) / tw);
					for (const supplier of this.data.suppliers) {
						const score =
							this.itemScores[sub.id]?.[supplier.id] ??
							sub.scores[supplier.id] ??
							0;
						result[sub.id][supplier.id] = maxDeduction * ((10 - score) / 10);
					}
				}
			}
		}
		return result;
	});

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

	/** Evaluated price per supplier = offered price + deduction. Only includes suppliers with a price. */
	evaluatedPrices = $derived.by(() => {
		const result: Record<string, number> = {};
		for (const supplier of this.data.suppliers) {
			if (supplier.price == null) continue;
			result[supplier.id] = supplier.price + this.totalDeductions[supplier.id];
		}
		return result;
	});

	/** Price model ranking (lowest evaluated price wins). Excludes suppliers without a price. */
	priceRanking = $derived.by(() => {
		return this.data.suppliers
			.filter((s) => s.price != null)
			.map((s) => ({
				supplier: s,
				evaluatedPrice: this.evaluatedPrices[s.id]
			}))
			.sort((a, b) => a.evaluatedPrice - b.evaluatedPrice)
			.map((entry, i) => ({ ...entry, rank: i + 1 }));
	});

	/** Quality budget: how much of contract value is allocated to quality. */
	qualityBudget = $derived(
		this.data.contractValue * (this.data.qualityWeight / 100)
	);

	/** Total weight of all criteria (should be 100). */
	totalWeight = $derived(
		this.data.criteria.reduce((s, c) => s + c.weight, 0)
	);

	/** Margin between #1 and #2 in quality ranking. */
	margin = $derived(
		this.ranking.length >= 2
			? this.ranking[0].score - this.ranking[1].score
			: 0
	);

	/** Whether both evaluation methods agree on winner. */
	sameWinner = $derived(
		this.ranking[0]?.supplier.id === this.priceRanking[0]?.supplier.id
	);

	/** Progress tracking (handles all three modes). */
	progress = $derived.by(() => {
		let totalCells = 0;
		let filledCells = 0;
		let totalNotes = 0;
		let filledNotes = 0;

		for (const criterion of this.data.criteria) {
			const mode = criterionMode(criterion);

			if (mode === 'leaf') {
				// Mode 1: one cell per supplier on the criterion
				for (const supplier of this.data.suppliers) {
					totalCells++;
					if (criterion.scores?.[supplier.id] !== undefined) filledCells++;
					totalNotes++;
					if (criterion.notes?.[supplier.id]) filledNotes++;
				}
			} else if (mode === 'resource') {
				// Mode 3: roles × moments per supplier
				const nMoments = criterion.subcriteria.length;
				for (const supplier of this.data.suppliers) {
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
						for (const supplier of this.data.suppliers) {
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
						for (const supplier of this.data.suppliers) {
							totalNotes++;
							if (sub.notes[supplier.id]) filledNotes++;
						}
					} else {
						for (const supplier of this.data.suppliers) {
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
			notes: { filled: filledNotes, total: totalNotes }
		};
	});

	/** Best score per sub-criterion: subId → max score across suppliers. */
	bestScores = $derived.by(() => {
		const result: Record<string, number> = {};
		for (const criterion of this.data.criteria) {
			// For leaf criteria, best score at criterion level
			if (criterionMode(criterion) === 'leaf' && criterion.scores) {
				const vals = Object.values(criterion.scores);
				result[criterion.id] = vals.length > 0 ? Math.max(...vals) : 0;
			}
			for (const sub of criterion.subcriteria) {
				const overlay = this.itemScores[sub.id];
				const vals = overlay
					? Object.values(overlay)
					: Object.values(sub.scores);
				result[sub.id] = vals.length > 0 ? Math.max(...vals) : 0;
			}
		}
		return result;
	});

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
	weightWarnings = $derived.by(() => {
		const result: Record<string, { expected: number; subSum: number }> = {};
		for (const criterion of this.data.criteria) {
			const mode = criterionMode(criterion);
			if (mode === 'traditional') {
				const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
				if (subSum !== 100) {
					result[criterion.id] = { expected: 100, subSum };
				}
			}
		}
		return result;
	});

	// ── Mutation methods ──

	/** Update a single score (sub-criterion level). */
	setScore(subCriterionId: string, supplierId: string, value: number) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.scores[supplierId] = clampScore(value);
	}

	/** Update a score on a leaf criterion (mode 1). */
	setCriterionScore(criterionId: string, supplierId: string, value: number) {
		const criterion = this._findCriterion(criterionId);
		if (!criterion) return;
		if (!criterion.scores) criterion.scores = {};
		criterion.scores[supplierId] = clampScore(value);
	}

	/** Update a note. */
	setNote(subCriterionId: string, supplierId: string, text: string) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.notes[supplierId] = text;
	}

	/** Update supplier price. */
	setSupplierPrice(supplierId: string, price: number) {
		const supplier = this.data.suppliers.find((s) => s.id === supplierId);
		if (supplier) supplier.price = price;
	}

	/** Set a score for a specific item on a specific item-criterion (sub-level). */
	setItemScore(
		subCriterionId: string,
		supplierId: string,
		itemId: string,
		itemCriterionId: string,
		value: number
	) {
		const sub = this._findSub(subCriterionId);
		if (!sub?.items) return;
		const items = sub.items[supplierId];
		if (!items) return;
		const item = items.find((i) => i.id === itemId);
		if (item) item.scores[itemCriterionId] = clampScore(value);
	}

	/** Set a note for a specific item on a specific item-criterion (sub-level). */
	setItemNote(
		subCriterionId: string,
		supplierId: string,
		itemId: string,
		itemCriterionId: string,
		text: string
	) {
		const sub = this._findSub(subCriterionId);
		if (!sub?.items) return;
		const items = sub.items[supplierId];
		if (!items) return;
		const item = items.find((i) => i.id === itemId);
		if (item) item.notes[itemCriterionId] = text;
	}

	/** Add an item to a supplier's list for a sub-criterion (sub-level item eval). */
	addItem(subCriterionId: string, supplierId: string, name: string, label?: string) {
		const sub = this._findSub(subCriterionId);
		if (!sub || sub.evaluationType !== 'item') return;
		if (!sub.items) sub.items = {};
		if (!sub.items[supplierId]) sub.items[supplierId] = [];
		sub.items[supplierId].push({
			id: uid('item'),
			name,
			label,
			scores: {},
			notes: {}
		});
	}

	/** Remove an item (sub-level). */
	removeItem(subCriterionId: string, supplierId: string, itemId: string) {
		const sub = this._findSub(subCriterionId);
		if (!sub?.items) return;
		const items = sub.items[supplierId];
		if (!items) return;
		sub.items[supplierId] = items.filter((i) => i.id !== itemId);
	}

	/** Update a criterion's weight (direct). */
	setCriterionWeight(criterionId: string, weight: number) {
		const criterion = this._findCriterion(criterionId);
		if (criterion) criterion.weight = clampWeight(weight);
	}

	/** Update a sub-criterion's weight (relative within its criterion, sums to 100). */
	setSubCriterionWeight(subCriterionId: string, weight: number) {
		for (const c of this.data.criteria) {
			const sub = c.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) {
				sub.weight = clampWeight(weight);
				return;
			}
		}
	}

	/** Change aggregation method (sub-level). */
	setAggregation(subCriterionId: string, method: AggregationMethod) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.aggregation = method;
	}

	/** Toggle a sub-criterion between simple and item-level evaluation. */
	setEvaluationType(subCriterionId: string, type: 'simple' | 'item') {
		const sub = this._findSub(subCriterionId);
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
	setItemLabel(subCriterionId: string, label: string) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.itemLabel = label;
	}

	/** Add an item-criterion (moment/dimension) to an item-evaluated sub-criterion. */
	addItemCriterion(subCriterionId: string, name: string, weight: number): string {
		const sub = this._findSub(subCriterionId);
		if (!sub || !sub.itemCriteria) return '';
		const id = uid('ic');
		sub.itemCriteria = [...sub.itemCriteria, { id, name, weight }];
		return id;
	}

	/** Remove an item-criterion dimension. */
	removeItemCriterion(subCriterionId: string, itemCriterionId: string) {
		const sub = this._findSub(subCriterionId);
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
	renameItemCriterion(subCriterionId: string, itemCriterionId: string, name: string) {
		const ic = this._findItemCriterion(subCriterionId, itemCriterionId);
		if (ic) ic.name = name;
	}

	/** Set weight for an item-criterion dimension. */
	setItemCriterionWeight(subCriterionId: string, itemCriterionId: string, weight: number) {
		const ic = this._findItemCriterion(subCriterionId, itemCriterionId);
		if (ic) ic.weight = clampWeight(weight);
	}

	// ── Criterion-level resource evaluation (mode 3) ──

	/** Toggle criterion between simple and resource evaluation. */
	setCriterionEvaluationType(criterionId: string, type: 'simple' | 'item') {
		const criterion = this._findCriterion(criterionId);
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
	setCriterionAggregation(criterionId: string, method: AggregationMethod) {
		const criterion = this._findCriterion(criterionId);
		if (criterion) criterion.aggregation = method;
	}

	/** Add a role to a criterion. */
	addRole(criterionId: string, name: string): string {
		const criterion = this._findCriterion(criterionId);
		if (!criterion) return '';
		if (!criterion.roles) criterion.roles = [];
		const id = uid('role');
		criterion.roles = [...criterion.roles, { id, name }];
		// Create placeholder items for all suppliers
		if (!criterion.items) criterion.items = {};
		for (const supplier of this.data.suppliers) {
			if (!criterion.items[supplier.id]) criterion.items[supplier.id] = [];
			criterion.items[supplier.id] = [
				...criterion.items[supplier.id],
				{ id: uid('item'), name: '', roleId: id, scores: {}, notes: {} }
			];
		}
		return id;
	}

	/** Remove a role and its associated items. */
	removeRole(criterionId: string, roleId: string) {
		const criterion = this._findCriterion(criterionId);
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
	renameRole(criterionId: string, roleId: string, name: string) {
		const criterion = this._findCriterion(criterionId);
		const role = criterion?.roles?.find((r) => r.id === roleId);
		if (role) role.name = name;
	}

	/** Set the label (person name) for a role on a specific supplier. */
	setRoleLabel(criterionId: string, supplierId: string, roleId: string, label: string) {
		const item = this._findRoleItem(criterionId, supplierId, roleId);
		if (item) item.label = label;
	}

	/** Set a score for a role on a moment (subcriterion) for a specific supplier. */
	setRoleScore(criterionId: string, supplierId: string, roleId: string, momentId: string, value: number) {
		const item = this._findRoleItem(criterionId, supplierId, roleId);
		if (item) item.scores[momentId] = clampScore(value);
	}

	/** Set a note for a role on a moment for a specific supplier. */
	setRoleNote(criterionId: string, supplierId: string, roleId: string, momentId: string, text: string) {
		const item = this._findRoleItem(criterionId, supplierId, roleId);
		if (item) item.notes[momentId] = text;
	}

	/** Set a holistic note for a role resource. */
	setRoleResourceNote(criterionId: string, supplierId: string, roleId: string, text: string) {
		const item = this._findRoleItem(criterionId, supplierId, roleId);
		if (item) item.note = text;
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
		const criterion = this._findCriterion(criterionId);
		if (!criterion) return;
		if (!criterion.notes) criterion.notes = {};
		criterion.notes[supplierId] = text;
	}

	/** Set a holistic resource note (covering all dimensions) on sub-level items. */
	setItemResourceNote(
		subCriterionId: string,
		supplierId: string,
		itemId: string,
		text: string
	) {
		const sub = this._findSub(subCriterionId);
		if (!sub?.items) return;
		const items = sub.items[supplierId];
		if (!items) return;
		const item = items.find((i) => i.id === itemId);
		if (item) item.note = text;
	}

	// ── Structure mutation methods ──

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

	/** Add a criterion (leaf by default — no subcriteria). */
	addCriterion(name: string, type: 'quality' | 'price'): string {
		const id = uid('c');
		this.data.criteria = [
			...this.data.criteria,
			{
				id,
				name,
				type,
				weight: 0,
				subcriteria: []
			}
		];
		return id;
	}

	removeCriterion(criterionId: string) {
		this.data.criteria = this.data.criteria.filter((c) => c.id !== criterionId);
	}

	renameCriterion(criterionId: string, name: string) {
		const c = this._findCriterion(criterionId);
		if (c) c.name = name;
	}

	setCriterionType(criterionId: string, type: 'quality' | 'price') {
		const c = this._findCriterion(criterionId);
		if (c) c.type = type;
	}

	reorderCriteria(fromIndex: number, toIndex: number) {
		if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.data.criteria.length || toIndex >= this.data.criteria.length) return;
		const copy = [...this.data.criteria];
		const [item] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, item);
		this.data.criteria = copy;
	}

	addSubCriterion(criterionId: string, name: string, weight: number = 0): string {
		const c = this._findCriterion(criterionId);
		if (!c) return '';
		const id = uid(`${criterionId}-s`);
		c.subcriteria = [
			...c.subcriteria,
			{ id, name, weight, scores: {}, notes: {} }
		];
		return id;
	}

	removeSubCriterion(subCriterionId: string) {
		for (const c of this.data.criteria) {
			const filtered = c.subcriteria.filter((s) => s.id !== subCriterionId);
			if (filtered.length < c.subcriteria.length) {
				c.subcriteria = filtered;
				return;
			}
		}
	}

	renameSubCriterion(subCriterionId: string, name: string) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.name = name;
	}

	reorderSubCriteria(criterionId: string, fromIndex: number, toIndex: number) {
		const c = this._findCriterion(criterionId);
		if (!c || fromIndex < 0 || toIndex < 0 || fromIndex >= c.subcriteria.length || toIndex >= c.subcriteria.length) return;
		const copy = [...c.subcriteria];
		const [item] = copy.splice(fromIndex, 1);
		copy.splice(toIndex, 0, item);
		c.subcriteria = copy;
	}

	addSupplier(name: string, price?: number): string {
		const id = uid('sup');
		this.data.suppliers = [
			...this.data.suppliers,
			{ id, name, price }
		];
		// For resource-mode criteria with roles, create placeholder items for the new supplier
		for (const criterion of this.data.criteria) {
			if (criterionMode(criterion) === 'resource' && criterion.roles) {
				if (!criterion.items) criterion.items = {};
				criterion.items[id] = criterion.roles.map((role) => ({
					id: uid('item'),
					name: '',
					roleId: role.id,
					scores: {},
					notes: {}
				}));
			}
		}
		return id;
	}

	removeSupplier(supplierId: string) {
		this.data.suppliers = this.data.suppliers.filter((s) => s.id !== supplierId);
		// Cascade: remove scores, notes, items for this supplier
		for (const c of this.data.criteria) {
			if (c.notes) delete c.notes[supplierId];
			if (c.scores) delete c.scores[supplierId];
			if (c.items) delete c.items[supplierId];
			for (const sub of c.subcriteria) {
				delete sub.scores[supplierId];
				delete sub.notes[supplierId];
				if (sub.items) delete sub.items[supplierId];
			}
		}
	}

	renameSupplier(supplierId: string, name: string) {
		const s = this.data.suppliers.find((s) => s.id === supplierId);
		if (s) s.name = name;
	}

	/** Initialize from route data if the procurement has changed. Preserves existing work for the same procurement. */
	initializeIfNeeded(procId: number, proc: any, activities: any[], eforms: any | null) {
		if (this.data.id === String(procId)) return;

		const suppliers = extractBidders(activities);

		this.initialize({
			id: String(procId),
			title: proc?.name || proc?.title || '',
			procurementName: proc?.name || proc?.title || '',
			reference: proc?.sequenceId || String(procId),
			status: 'Oppsett',
			qualityWeight: 0,
			priceWeight: 0,
			contractValue: eforms?.estimated_value ?? 0,
			suppliers,
			criteria: []
		});

		if (eforms?.award_criteria?.length) {
			for (const ac of eforms.award_criteria) {
				const type = ac.type === 'price' ? 'price' as const : 'quality' as const;
				const name = ac.name || (type === 'price' ? 'Pris' : 'Kvalitet');
				const criterionId = this.addCriterion(name, type);
				if (ac.weight_percent) {
					this.setCriterionWeight(criterionId, Math.round(ac.weight_percent));
				}
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

	/** Find a criterion by id. */
	private _findCriterion(criterionId: string): Criterion | undefined {
		return this.data.criteria.find((c) => c.id === criterionId);
	}

	/** Find an item-criterion by sub-criterion and item-criterion id. */
	private _findItemCriterion(subCriterionId: string, itemCriterionId: string): ItemCriterion | undefined {
		const sub = this._findSub(subCriterionId);
		return sub?.itemCriteria?.find((c) => c.id === itemCriterionId);
	}

	/** Find a role's item (resource) for a supplier on a criterion. */
	private _findRoleItem(criterionId: string, supplierId: string, roleId: string): EvaluationItem | undefined {
		const criterion = this._findCriterion(criterionId);
		return criterion?.items?.[supplierId]?.find((i) => i.roleId === roleId);
	}

	/** Find a sub-criterion by id. */
	private _findSub(subCriterionId: string): SubCriterion | undefined {
		for (const criterion of this.data.criteria) {
			const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) return sub;
		}
		return undefined;
	}
}

export const evaluation = new EvaluationStore();
