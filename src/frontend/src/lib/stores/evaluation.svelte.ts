/**
 * Evaluation store — reactive state for the scoring matrix.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 */

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
	scores: Record<string, number>; // itemCriterionId → 0–10
	notes: Record<string, string>; // itemCriterionId → text
	note?: string; // holistic resource note
}

export type AggregationMethod = 'average' | 'minimum';

// ── Core types ──

export interface SubCriterion {
	id: string;
	name: string;
	weight: number;
	scores: Record<string, number>;
	notes: Record<string, string>;
	// Item-level evaluation (optional)
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

// ── Score computation functions ──

/** Weighted average of item-criteria scores for a single item. */
export function itemScore(item: EvaluationItem, criteria: ItemCriterion[]): number {
	const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
	if (totalWeight === 0) return 0;
	const sum = criteria.reduce((acc, c) => acc + (item.scores[c.id] ?? 0) * c.weight, 0);
	return sum / totalWeight;
}

/** Aggregate item scores for a supplier on one sub-criterion. */
export function supplierItemScore(
	items: EvaluationItem[],
	criteria: ItemCriterion[],
	method: AggregationMethod
): number {
	if (items.length === 0) return 0;
	const scores = items.map((item) => itemScore(item, criteria));

	switch (method) {
		case 'average':
			return scores.reduce((a, b) => a + b, 0) / scores.length;
		case 'minimum':
			return Math.min(...scores);
	}
}

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
export function formatNOK(value: number): string {
	return value.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
}

/** Determine score tier for CSS class. */
export function scoreTier(score: number): 'high' | 'mid' | 'low' {
	if (score >= 7) return 'high';
	if (score >= 4) return 'mid';
	return 'low';
}

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

	/** True when minimum data is present to show the scoring matrix. */
	isReady = $derived(
		this.data.suppliers.length >= 2 &&
		this.data.criteria.length > 0 &&
		this.data.criteria.every((c) => c.subcriteria.length > 0)
	);

	/** True when criterion weights sum to exactly 100. */
	weightsValid = $derived(
		this.data.criteria.reduce((s, c) => s + c.weight, 0) === 100
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

	/** Computed group averages per supplier (uses itemScores overlay). */
	groupScores = $derived.by(() => {
		const result: Record<string, Record<string, number>> = {};
		for (const criterion of this.data.criteria) {
			result[criterion.id] = {};
			for (const supplier of this.data.suppliers) {
				result[criterion.id][supplier.id] = weightedAverage(
					criterion.subcriteria,
					supplier.id,
					this.itemScores
				);
			}
		}
		return result;
	});

	/** Total weighted score per supplier (0-10 scale). */
	totals = $derived.by(() => {
		const result: Record<string, number> = {};
		const totalWeight = this.data.criteria.reduce((s, c) => s + c.weight, 0);
		for (const supplier of this.data.suppliers) {
			let sum = 0;
			for (const criterion of this.data.criteria) {
				const avg = weightedAverage(
					criterion.subcriteria,
					supplier.id,
					this.itemScores
				);
				sum += avg * criterion.weight;
			}
			result[supplier.id] = totalWeight > 0 ? sum / totalWeight : 0;
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

	/** Price model: quality deduction per subcriterion per supplier. */
	priceDeductions = $derived.by(() => {
		const result: Record<string, Record<string, number>> = {};
		const qb = this.data.contractValue * (this.data.qualityWeight / 100);
		const tw = this.data.criteria.reduce((s, c) => s + c.weight, 0);

		for (const criterion of this.data.criteria) {
			for (const sub of criterion.subcriteria) {
				if (!result[sub.id]) result[sub.id] = {};
				const maxDeduction = qb * (sub.weight / tw);
				for (const supplier of this.data.suppliers) {
					const score =
						this.itemScores[sub.id]?.[supplier.id] ??
						sub.scores[supplier.id] ??
						0;
					result[sub.id][supplier.id] = maxDeduction * ((10 - score) / 10);
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

	/** Progress tracking. */
	progress = $derived.by(() => {
		let totalCells = 0;
		let filledCells = 0;
		let totalNotes = 0;
		let filledNotes = 0;

		for (const criterion of this.data.criteria) {
			for (const sub of criterion.subcriteria) {
				if (sub.evaluationType === 'item' && sub.itemCriteria) {
					const nCriteria = sub.itemCriteria.length;
					// Count item-level cells
					for (const supplier of this.data.suppliers) {
						const items = sub.items?.[supplier.id] ?? [];
						if (items.length === 0) {
							// Expect at least 1 item per supplier
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
					// Count sub-level notes
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

		return {
			scores: { filled: filledCells, total: totalCells },
			notes: { filled: filledNotes, total: totalNotes }
		};
	});

	/** Best score per sub-criterion: subId → max score across suppliers. */
	bestScores = $derived.by(() => {
		const result: Record<string, number> = {};
		for (const criterion of this.data.criteria) {
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

	/** Weight warnings: criterion id → mismatch between criterion weight and sub-criteria sum. */
	weightWarnings = $derived.by(() => {
		const result: Record<string, { criterionWeight: number; subSum: number }> = {};
		for (const criterion of this.data.criteria) {
			const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
			if (subSum !== criterion.weight) {
				result[criterion.id] = { criterionWeight: criterion.weight, subSum };
			}
		}
		return result;
	});

	// ── Mutation methods ──

	/** Update a single score. */
	setScore(subCriterionId: string, supplierId: string, value: number) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.scores[supplierId] = Math.max(0, Math.min(10, value));
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

	/** Set a score for a specific item on a specific item-criterion. */
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
		if (item) item.scores[itemCriterionId] = Math.max(0, Math.min(10, value));
	}

	/** Set a note for a specific item on a specific item-criterion. */
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

	/** Add an item to a supplier's list for a sub-criterion. */
	addItem(subCriterionId: string, supplierId: string, name: string, label?: string) {
		const sub = this._findSub(subCriterionId);
		if (!sub || sub.evaluationType !== 'item') return;
		if (!sub.items) sub.items = {};
		if (!sub.items[supplierId]) sub.items[supplierId] = [];
		sub.items[supplierId].push({
			id: crypto.randomUUID(),
			name,
			label,
			scores: {},
			notes: {}
		});
	}

	/** Remove an item. */
	removeItem(subCriterionId: string, supplierId: string, itemId: string) {
		const sub = this._findSub(subCriterionId);
		if (!sub?.items) return;
		const items = sub.items[supplierId];
		if (!items) return;
		sub.items[supplierId] = items.filter((i) => i.id !== itemId);
	}

	/** Update a criterion's weight. */
	setCriterionWeight(criterionId: string, weight: number) {
		const criterion = this.data.criteria.find((c) => c.id === criterionId);
		if (criterion) criterion.weight = Math.max(0, Math.min(100, Math.round(weight)));
	}

	/** Update a sub-criterion's weight. */
	setSubCriterionWeight(subCriterionId: string, weight: number) {
		const sub = this._findSub(subCriterionId);
		if (sub) {
			sub.weight = Math.max(0, Math.min(100, Math.round(weight)));
			// Recalc parent criterion weight
			for (const c of this.data.criteria) {
				if (c.subcriteria.some((s) => s.id === subCriterionId)) {
					c.weight = c.subcriteria.reduce((s, sub) => s + sub.weight, 0);
					break;
				}
			}
		}
	}

	/** Change aggregation method. */
	setAggregation(subCriterionId: string, method: AggregationMethod) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.aggregation = method;
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

	/** Set a criterion-level note (overordnet vurdering) for a supplier. */
	setCriterionNote(criterionId: string, supplierId: string, text: string) {
		const criterion = this.data.criteria.find((c) => c.id === criterionId);
		if (!criterion) return;
		if (!criterion.notes) criterion.notes = {};
		criterion.notes[supplierId] = text;
	}

	/** Set a holistic resource note (covering all dimensions). */
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

	addCriterion(name: string, type: 'quality' | 'price'): string {
		const id = uid('c');
		this.data.criteria = [
			...this.data.criteria,
			{
				id,
				name,
				type,
				weight: 0,
				subcriteria: [
					{
						id: uid(`${id}-s`),
						name: name || '',
						weight: 0,
						scores: {},
						notes: {}
					}
				]
			}
		];
		return id;
	}

	removeCriterion(criterionId: string) {
		this.data.criteria = this.data.criteria.filter((c) => c.id !== criterionId);
	}

	renameCriterion(criterionId: string, name: string) {
		const c = this.data.criteria.find((c) => c.id === criterionId);
		if (c) c.name = name;
	}

	setCriterionType(criterionId: string, type: 'quality' | 'price') {
		const c = this.data.criteria.find((c) => c.id === criterionId);
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
		const c = this.data.criteria.find((c) => c.id === criterionId);
		if (!c) return '';
		const id = uid(`${criterionId}-s`);
		c.subcriteria = [
			...c.subcriteria,
			{ id, name, weight, scores: {}, notes: {} }
		];
		this._recalcCriterionWeight(criterionId);
		return id;
	}

	removeSubCriterion(subCriterionId: string) {
		for (const c of this.data.criteria) {
			const idx = c.subcriteria.findIndex((s) => s.id === subCriterionId);
			if (idx !== -1) {
				c.subcriteria = c.subcriteria.filter((s) => s.id !== subCriterionId);
				this._recalcCriterionWeight(c.id);
				return;
			}
		}
	}

	renameSubCriterion(subCriterionId: string, name: string) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.name = name;
	}

	reorderSubCriteria(criterionId: string, fromIndex: number, toIndex: number) {
		const c = this.data.criteria.find((c) => c.id === criterionId);
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
		return id;
	}

	removeSupplier(supplierId: string) {
		this.data.suppliers = this.data.suppliers.filter((s) => s.id !== supplierId);
		// Cascade: remove scores, notes, items for this supplier
		for (const c of this.data.criteria) {
			if (c.notes) delete c.notes[supplierId];
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

	/** Recalculate criterion weight from sub-criteria sum. */
	private _recalcCriterionWeight(criterionId: string) {
		const c = this.data.criteria.find((c) => c.id === criterionId);
		if (c) c.weight = c.subcriteria.reduce((s, sub) => s + sub.weight, 0);
	}

	/** Load demo data for development. */
	loadDemo() {
		import('./demo-data').then(({ demoData }) => {
			this.data = structuredClone(demoData);
			this.activeMethod = 'poeng';
			this.activeView = 'overview';
			this.selectedSupplierId = null;
			this.data.status = 'Under evaluering';
		});
	}

	/** Initialize or reset the evaluation with new data. */
	initialize(newData: EvaluationData) {
		this.data = newData;
		this.activeMethod = 'poeng';
		this.activeView = 'overview';
		this.selectedSupplierId = null;
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
