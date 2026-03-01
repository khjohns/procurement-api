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
	type?: 'quality' | 'price';
	weight: number;
	subcriteria: SubCriterion[];
}

export interface Supplier {
	id: string;
	name: string;
	price?: number;
}

export interface EvaluationData {
	id: string;
	title: string;
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
function weightedAverage(
	subcriteria: SubCriterion[],
	supplierId: string,
	totalWeight: number,
	itemScoresOverlay?: Record<string, Record<string, number>>
): number {
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

class EvaluationStore {
	data = $state<EvaluationData>({
		id: '2024-1847',
		title: 'Evaluering av tilbud',
		reference: '2024/1847-KJH',
		status: 'Under evaluering',
		qualityWeight: 75,
		priceWeight: 25,
		contractValue: 8_000_000,
		suppliers: [
			{ id: 'bouvet', name: 'Bouvet ASA', price: 7_800_000 },
			{ id: 'sopra', name: 'Sopra Steria AS', price: 8_200_000 },
			{ id: 'knowit', name: 'Knowit Obiwan AS', price: 7_500_000 }
		],
		criteria: [
			{
				id: 'kompetanse',
				name: 'Kompetanse og erfaring',
				type: 'quality',
				weight: 35,
				subcriteria: [
					{
						id: 'personell',
						name: 'Tilbudt personell',
						weight: 15,
						evaluationType: 'item',
						itemLabel: 'Ressurs',
						aggregation: 'average',
						itemCriteria: [
							{ id: 'erfaring', name: 'Relevant erfaring', weight: 40 },
							{ id: 'utdanning', name: 'Utdanning og fagkompetanse', weight: 30 },
							{ id: 'sertifisering', name: 'Sertifiseringer', weight: 30 }
						],
						items: {
							bouvet: [
								{
									id: 'b1',
									name: 'Kari Nordmann',
									label: 'Prosjektleder',
									scores: { erfaring: 8, utdanning: 7, sertifisering: 9 },
									notes: {
										erfaring:
											'Dokumentert 8 års erfaring fra tilsvarende prosjekter.'
									}
								},
								{
									id: 'b2',
									name: 'Ola Hansen',
									label: 'Seniorutvikler',
									scores: { erfaring: 7, utdanning: 8, sertifisering: 6 },
									notes: {}
								},
								{
									id: 'b3',
									name: 'Eva Solberg',
									label: 'Løsningsarkitekt',
									scores: { erfaring: 9, utdanning: 8, sertifisering: 8 },
									notes: {}
								}
							],
							sopra: [
								{
									id: 's1',
									name: 'Lars Eriksen',
									label: 'Prosjektleder',
									scores: { erfaring: 7, utdanning: 8, sertifisering: 7 },
									notes: {}
								},
								{
									id: 's2',
									name: 'Maria Johansen',
									label: 'Utvikler',
									scores: { erfaring: 7, utdanning: 7, sertifisering: 8 },
									notes: {}
								}
							],
							knowit: [
								{
									id: 'k1',
									name: 'Anders Berg',
									label: 'Prosjektleder',
									scores: { erfaring: 9, utdanning: 9, sertifisering: 9 },
									notes: {}
								},
								{
									id: 'k2',
									name: 'Ingrid Dahl',
									label: 'Seniorutvikler',
									scores: { erfaring: 8, utdanning: 8, sertifisering: 9 },
									notes: {}
								},
								{
									id: 'k3',
									name: 'Thomas Lie',
									label: 'Arkitekt',
									scores: { erfaring: 8, utdanning: 9, sertifisering: 7 },
									notes: {}
								}
							]
						},
						scores: {},
						notes: {}
					},
					{
						id: 'referanseprosjekter',
						name: 'Relevante referanseprosjekter',
						weight: 10,
						scores: { bouvet: 9, sopra: 8, knowit: 7 },
						notes: {}
					},
					{
						id: 'forstaelse',
						name: 'Forståelse av oppdraget',
						weight: 10,
						scores: { bouvet: 8, sopra: 7, knowit: 8 },
						notes: {}
					}
				]
			},
			{
				id: 'losning',
				name: 'Løsningsbeskrivelse',
				type: 'quality',
				weight: 30,
				subcriteria: [
					{
						id: 'teknisk',
						name: 'Teknisk tilnærming',
						weight: 15,
						scores: { bouvet: 7, sopra: 9, knowit: 8 },
						notes: {}
					},
					{
						id: 'gjennomforing',
						name: 'Gjennomføringsplan',
						weight: 10,
						scores: { bouvet: 8, sopra: 8, knowit: 7 },
						notes: {}
					},
					{
						id: 'metodikk',
						name: 'Metodikk og kvalitetssikring',
						weight: 5,
						scores: { bouvet: 7, sopra: 9, knowit: 8 },
						notes: {}
					}
				]
			},
			{
				id: 'pris',
				name: 'Pris',
				type: 'price',
				weight: 25,
				subcriteria: [
					{
						id: 'fastpris',
						name: 'Fastpris prosjektleveranser',
						weight: 15,
						scores: { bouvet: 8, sopra: 7, knowit: 9 },
						notes: {}
					},
					{
						id: 'timepriser',
						name: 'Timepriser nøkkelroller',
						weight: 10,
						scores: { bouvet: 7, sopra: 6, knowit: 8 },
						notes: {}
					}
				]
			},
			{
				id: 'baerekraft',
				name: 'Bærekraft og samfunnsansvar',
				type: 'quality',
				weight: 10,
				subcriteria: [
					{
						id: 'miljo',
						name: 'Miljøtiltak og sertifiseringer',
						weight: 5,
						scores: { bouvet: 8, sopra: 7, knowit: 6 },
						notes: {}
					},
					{
						id: 'laerling',
						name: 'Lærlingordning og mangfold',
						weight: 5,
						scores: { bouvet: 7, sopra: 8, knowit: 7 },
						notes: {}
					}
				]
			}
		]
	});

	activeMethod = $state<ActiveMethod>('poeng');

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
					criterion.weight,
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
					criterion.weight,
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
		const qualityBudget = this.data.contractValue * (this.data.qualityWeight / 100);
		const totalWeight = this.data.criteria.reduce((s, c) => s + c.weight, 0);

		for (const criterion of this.data.criteria) {
			for (const sub of criterion.subcriteria) {
				if (!result[sub.id]) result[sub.id] = {};
				const maxDeduction = qualityBudget * (sub.weight / totalWeight);
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

	/** Evaluated price per supplier = offered price + deduction. */
	evaluatedPrices = $derived.by(() => {
		const result: Record<string, number> = {};
		for (const supplier of this.data.suppliers) {
			result[supplier.id] = (supplier.price ?? 0) + this.totalDeductions[supplier.id];
		}
		return result;
	});

	/** Price model ranking (lowest evaluated price wins). */
	priceRanking = $derived.by(() => {
		return this.data.suppliers
			.map((s) => ({
				supplier: s,
				evaluatedPrice: this.evaluatedPrices[s.id]
			}))
			.sort((a, b) => a.evaluatedPrice - b.evaluatedPrice)
			.map((entry, i) => ({ ...entry, rank: i + 1 }));
	});

	/** Progress tracking. */
	progress = $derived.by(() => {
		let totalCells = 0;
		let filledCells = 0;
		let totalNotes = 0;
		let filledNotes = 0;

		for (const criterion of this.data.criteria) {
			for (const sub of criterion.subcriteria) {
				if (sub.evaluationType === 'item' && sub.items && sub.itemCriteria) {
					// Count item-level cells
					for (const supplier of this.data.suppliers) {
						const items = sub.items[supplier.id] ?? [];
						for (const item of items) {
							for (const ic of sub.itemCriteria) {
								totalCells++;
								if (item.scores[ic.id] !== undefined) filledCells++;
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

	// ── Mutation methods ──

	/** Update a single score. */
	setScore(subCriterionId: string, supplierId: string, value: number) {
		for (const criterion of this.data.criteria) {
			const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) {
				sub.scores[supplierId] = Math.max(0, Math.min(10, value));
				return;
			}
		}
	}

	/** Update a note. */
	setNote(subCriterionId: string, supplierId: string, text: string) {
		for (const criterion of this.data.criteria) {
			const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) {
				sub.notes[supplierId] = text;
				return;
			}
		}
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
			id: `item-${Date.now()}`,
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

	/** Change aggregation method. */
	setAggregation(subCriterionId: string, method: AggregationMethod) {
		const sub = this._findSub(subCriterionId);
		if (sub) sub.aggregation = method;
	}

	/** Best score for a subcriterion (uses itemScores overlay). */
	bestScore(subCriterionId: string): number {
		// Check itemScores first
		const itemOverlay = this.itemScores[subCriterionId];
		if (itemOverlay) {
			const vals = Object.values(itemOverlay);
			return vals.length > 0 ? Math.max(...vals) : 0;
		}
		for (const criterion of this.data.criteria) {
			const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) {
				const vals = Object.values(sub.scores);
				return vals.length > 0 ? Math.max(...vals) : 0;
			}
		}
		return 0;
	}

	/** Best group score for a criterion. */
	bestGroupScore(criterionId: string): number {
		const scores = this.groupScores[criterionId];
		if (!scores) return 0;
		return Math.max(...Object.values(scores));
	}

	/** Initialize or reset the evaluation with new data. */
	initialize(newData: EvaluationData) {
		this.data = newData;
		this.activeMethod = 'poeng';
	}

	/** Check if store has been initialized with real data. */
	get hasData(): boolean {
		return this.data.criteria.length > 0 && this.data.suppliers.length > 0;
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
