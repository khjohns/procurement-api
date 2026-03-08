/**
 * Qualification store — reactive state for the qualification requirements matrix.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 * Binary pass/fail assessments, not weighted scores.
 */

// ── Types ──

export type QualificationBasis = 'own' | 'supported';
export type QualificationVerdict = 'met' | 'not_met' | 'not_assessed';

export interface SupportEntity {
	id: string;
	name: string;
	espdSubmitted: boolean;
	commitmentSubmitted: boolean;
	scope: string;
}

export interface QualificationAssessment {
	espdSubmitted: boolean;
	basis: QualificationBasis;
	supportEntities: SupportEntity[];
	verdict: QualificationVerdict;
	notes: string;
}

export interface QualificationRequirement {
	id: string;
	name: string;
	description: string;
	assessments: Record<string, QualificationAssessment>; // supplierId → assessment
}

export interface QualificationSupplier {
	id: string;
	name: string;
}

export interface QualificationData {
	id: string;
	title: string;
	reference: string;
	status: string;
	suppliers: QualificationSupplier[];
	requirements: QualificationRequirement[];
}

// ── Helper ──

function emptyAssessment(): QualificationAssessment {
	return {
		espdSubmitted: false,
		basis: 'own',
		supportEntities: [],
		verdict: 'not_assessed',
		notes: ''
	};
}

let nextEntityId = 1;

class QualificationStore {
	activeView = $state<string>('overview');
	selectedSupplierId = $state<string | null>(null);

	setActiveView(view: string) {
		this.activeView = view;
	}

	selectSupplier(id: string) {
		this.selectedSupplierId = id;
	}

	data = $state<QualificationData>({
		id: '2024-1847',
		title: 'Kvalifisering av leverandører',
		reference: '2024/1847-KJH',
		status: 'Under vurdering',
		suppliers: [
			{ id: 'bouvet', name: 'Bouvet ASA' },
			{ id: 'sopra', name: 'Sopra Steria AS' },
			{ id: 'knowit', name: 'Knowit Obiwan AS' }
		],
		requirements: [
			{
				id: 'organisatorisk',
				name: 'Organisatorisk og juridisk stilling',
				description:
					'Registrert i Foretaksregisteret, skatteattest, HMS-egenerklæring',
				assessments: {
					bouvet: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: 'Alle attester levert og kontrollert.'
					},
					sopra: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: 'Skatteattest og firmaattest i orden.'
					},
					knowit: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: ''
					}
				}
			},
			{
				id: 'okonomi',
				name: 'Økonomisk og finansiell kapasitet',
				description:
					'Kredittvurdering minimum A, ansvarsforsikring min. 10 MNOK',
				assessments: {
					bouvet: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: 'Kredittvurdering AAA. Forsikringsbevis vedlagt.'
					},
					sopra: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: ''
					},
					knowit: {
						espdSubmitted: true,
						basis: 'supported',
						supportEntities: [
							{
								id: 'se-1',
								name: 'Knowit AB',
								espdSubmitted: true,
								commitmentSubmitted: true,
								scope: 'Kredittvurdering og forsikringsdekning'
							}
						],
						verdict: 'met',
						notes: 'Knowit Obiwan AS oppfyller ikke kravet alene. Støtter seg på morselskapet Knowit AB. Forpliktelseserklæring vedlagt.'
					}
				}
			},
			{
				id: 'teknisk',
				name: 'Teknisk og faglig kompetanse',
				description:
					'Minst 3 relevante referanseprosjekter siste 5 år, ISO 27001 eller tilsvarende',
				assessments: {
					bouvet: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'met',
						notes: '5 relevante referanseprosjekter dokumentert. ISO 27001-sertifisert.'
					},
					sopra: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'not_assessed',
						notes: ''
					},
					knowit: {
						espdSubmitted: true,
						basis: 'own',
						supportEntities: [],
						verdict: 'not_assessed',
						notes: ''
					}
				}
			}
		]
	});

	/** The currently active requirement (when drilled down). */
	activeRequirement = $derived(
		this.activeView !== 'overview'
			? this.data.requirements.find((r) => r.id === this.activeView) ?? null
			: null
	);

	/** Per-supplier qualification result. */
	supplierResults = $derived.by(() => {
		const result: Record<string, { qualified: boolean; met: number; notMet: number; total: number; allAssessed: boolean }> = {};
		for (const supplier of this.data.suppliers) {
			let met = 0;
			let notMet = 0;
			const total = this.data.requirements.length;
			for (const req of this.data.requirements) {
				const verdict = req.assessments[supplier.id]?.verdict;
				if (verdict === 'met') met++;
				else if (verdict === 'not_met') notMet++;
			}
			result[supplier.id] = {
				qualified: met === total && total > 0,
				met,
				notMet,
				total,
				allAssessed: (met + notMet) === total && total > 0
			};
		}
		return result;
	});

	/** Progress: how many cells have been assessed. */
	progress = $derived.by(() => {
		let total = 0;
		let assessed = 0;
		let espdCount = 0;

		for (const req of this.data.requirements) {
			for (const supplier of this.data.suppliers) {
				total++;
				const a = req.assessments[supplier.id];
				if (a && a.verdict !== 'not_assessed') assessed++;
				if (a && a.espdSubmitted) espdCount++;
			}
		}

		return {
			assessments: { filled: assessed, total },
			espd: { filled: espdCount, total }
		};
	});

	/** Aggregate stats for overview panel. */
	stats = $derived.by(() => {
		const results = Object.values(this.supplierResults);
		const qualified = results.filter((r) => r.qualified).length;
		const rejected = results.filter((r) => r.allAssessed && !r.qualified).length;
		const pending = results.length - qualified - rejected;

		let supportCount = 0;
		for (const req of this.data.requirements) {
			for (const supplier of this.data.suppliers) {
				const a = req.assessments[supplier.id];
				if (a && a.basis === 'supported') supportCount++;
			}
		}

		return { qualified, rejected, pending, supportCount, total: results.length };
	});

	// ── Mutation methods ──

	private getAssessment(reqId: string, supplierId: string): QualificationAssessment | null {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return null;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		return req.assessments[supplierId];
	}

	setEspd(reqId: string, supplierId: string, submitted: boolean) {
		const a = this.getAssessment(reqId, supplierId);
		if (a) a.espdSubmitted = submitted;
	}

	setBasis(reqId: string, supplierId: string, basis: QualificationBasis) {
		const a = this.getAssessment(reqId, supplierId);
		if (!a) return;
		a.basis = basis;
		if (basis === 'own') a.supportEntities = [];
	}

	setVerdict(reqId: string, supplierId: string, verdict: QualificationVerdict) {
		const a = this.getAssessment(reqId, supplierId);
		if (a) a.verdict = verdict;
	}

	setNote(reqId: string, supplierId: string, text: string) {
		const a = this.getAssessment(reqId, supplierId);
		if (a) a.notes = text;
	}

	// ── Support entity methods ──

	addSupportEntity(reqId: string, supplierId: string, name: string) {
		const a = this.getAssessment(reqId, supplierId);
		if (!a) return;
		a.supportEntities = [...a.supportEntities, {
			id: `se-${nextEntityId++}`,
			name,
			espdSubmitted: false,
			commitmentSubmitted: false,
			scope: ''
		}];
	}

	removeSupportEntity(reqId: string, supplierId: string, entityId: string) {
		const a = this.getAssessment(reqId, supplierId);
		if (!a) return;
		a.supportEntities = a.supportEntities.filter((e) => e.id !== entityId);
	}

	updateSupportEntity(reqId: string, supplierId: string, entityId: string, patch: Partial<Omit<SupportEntity, 'id'>>) {
		const entity = this.getAssessment(reqId, supplierId)?.supportEntities.find((e) => e.id === entityId);
		if (entity) Object.assign(entity, patch);
	}

	initialize(newData: QualificationData) {
		this.data = newData;
	}

	get hasData(): boolean {
		return this.data.requirements.length > 0 && this.data.suppliers.length > 0;
	}
}

export const qualification = new QualificationStore();
