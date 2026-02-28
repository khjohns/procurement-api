/**
 * Evaluation store — reactive state for the scoring matrix.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 */

export interface SubCriterion {
	id: string;
	name: string;
	weight: number;
	scores: Record<string, number>;
	notes: Record<string, string>;
}

export interface Criterion {
	id: string;
	name: string;
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

/** Weighted average for a single supplier across subcriteria. */
function weightedAverage(
	subcriteria: SubCriterion[],
	supplierId: string,
	totalWeight: number
): number {
	if (totalWeight === 0) return 0;
	const sum = subcriteria.reduce(
		(acc, sub) => acc + (sub.scores[supplierId] ?? 0) * sub.weight,
		0
	);
	return sum / totalWeight;
}

/** Format number with Norwegian spacing (e.g. 8 000 000). */
export function formatNOK(value: number): string {
	return value.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
}

/** Determine score tier for CSS class. */
export function scoreTier(score: number): 'high' | 'mid' | 'low' {
	if (score >= 7.5) return 'high';
	if (score >= 5) return 'mid';
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
				weight: 35,
				subcriteria: [
					{
						id: 'nokkelpersonell',
						name: 'Nøkkelpersonellets kvalifikasjoner',
						weight: 15,
						scores: { bouvet: 8, sopra: 7, knowit: 9 },
						notes: {
							knowit:
								'Svært sterkt team med bred erfaring fra tilsvarende prosjekter i offentlig sektor. Alle tre nøkkelpersoner har relevant sertifisering (PMP, PRINCE2) og dokumentert erfaring med lignende oppdrag hos Bergen kommune og Helse Vest.'
						}
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

	/** Computed group averages per supplier. */
	groupScores = $derived.by(() => {
		const result: Record<string, Record<string, number>> = {};
		for (const criterion of this.data.criteria) {
			result[criterion.id] = {};
			for (const supplier of this.data.suppliers) {
				result[criterion.id][supplier.id] = weightedAverage(
					criterion.subcriteria,
					supplier.id,
					criterion.weight
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
				const avg = weightedAverage(criterion.subcriteria, supplier.id, criterion.weight);
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
					const score = sub.scores[supplier.id] ?? 0;
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
				for (const supplier of this.data.suppliers) {
					totalCells++;
					if (sub.scores[supplier.id] !== undefined) filledCells++;
					totalNotes++;
					if (sub.notes[supplier.id]) filledNotes++;
				}
			}
		}

		return {
			scores: { filled: filledCells, total: totalCells },
			notes: { filled: filledNotes, total: totalNotes }
		};
	});

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

	/** Best score for a subcriterion. */
	bestScore(subCriterionId: string): number {
		for (const criterion of this.data.criteria) {
			const sub = criterion.subcriteria.find((s) => s.id === subCriterionId);
			if (sub) {
				return Math.max(...Object.values(sub.scores));
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
}

export const evaluation = new EvaluationStore();
