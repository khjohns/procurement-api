/**
 * Qualification store — reactive state for the qualification requirements matrix.
 * Uses Svelte 5 runes with class-based pattern (per ADR-003).
 *
 * All cascading calculations use $derived — no $effect.
 * Binary pass/fail assessments, not weighted scores.
 */

// ── Types ──

export type DocumentationStatus = 'submitted' | 'not_submitted' | 'not_assessed';
export type QualificationBasis = 'own' | 'supported';
export type QualificationVerdict = 'met' | 'not_met' | 'not_assessed';

export interface QualificationAssessment {
	documentation: DocumentationStatus;
	basis: QualificationBasis;
	supportEntityName: string;
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
		documentation: 'not_assessed',
		basis: 'own',
		supportEntityName: '',
		verdict: 'not_assessed',
		notes: ''
	};
}

class QualificationStore {
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
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'met',
						notes: 'Alle attester levert og kontrollert.'
					},
					sopra: {
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'met',
						notes: 'Skatteattest og firmaattest i orden.'
					},
					knowit: {
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
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
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'met',
						notes: 'Kredittvurdering AAA. Forsikringsbevis vedlagt.'
					},
					sopra: {
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'met',
						notes: ''
					},
					knowit: {
						documentation: 'submitted',
						basis: 'supported',
						supportEntityName: 'Knowit AB',
						verdict: 'met',
						notes:
							'Knowit Obiwan AS oppfyller ikke kravet alene. Støtter seg på morselskapet Knowit AB. Forpliktelseserklæring vedlagt.'
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
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'met',
						notes: '5 relevante referanseprosjekter dokumentert. ISO 27001-sertifisert.'
					},
					sopra: {
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'not_assessed',
						notes: ''
					},
					knowit: {
						documentation: 'submitted',
						basis: 'own',
						supportEntityName: '',
						verdict: 'not_assessed',
						notes: ''
					}
				}
			}
		]
	});

	/** Per-supplier qualification result: met/notMet/pending counts and final verdict. */
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

	/** Progress: how many cells have been assessed (verdict !== 'not_assessed'). */
	progress = $derived.by(() => {
		let total = 0;
		let assessed = 0;
		let documented = 0;

		for (const req of this.data.requirements) {
			for (const supplier of this.data.suppliers) {
				total++;
				const a = req.assessments[supplier.id];
				if (a && a.verdict !== 'not_assessed') assessed++;
				if (a && a.documentation === 'submitted') documented++;
			}
		}

		return {
			assessments: { filled: assessed, total },
			documentation: { filled: documented, total }
		};
	});

	// ── Mutation methods ──

	setDocumentation(reqId: string, supplierId: string, status: DocumentationStatus) {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		req.assessments[supplierId].documentation = status;
	}

	setBasis(reqId: string, supplierId: string, basis: QualificationBasis) {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		req.assessments[supplierId].basis = basis;
		if (basis === 'own') {
			req.assessments[supplierId].supportEntityName = '';
		}
	}

	setSupportEntityName(reqId: string, supplierId: string, name: string) {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		req.assessments[supplierId].supportEntityName = name;
	}

	setVerdict(reqId: string, supplierId: string, verdict: QualificationVerdict) {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		req.assessments[supplierId].verdict = verdict;
	}

	setNote(reqId: string, supplierId: string, text: string) {
		const req = this.data.requirements.find((r) => r.id === reqId);
		if (!req) return;
		if (!req.assessments[supplierId]) req.assessments[supplierId] = emptyAssessment();
		req.assessments[supplierId].notes = text;
	}

	initialize(newData: QualificationData) {
		this.data = newData;
	}

	get hasData(): boolean {
		return this.data.requirements.length > 0 && this.data.suppliers.length > 0;
	}
}

export const qualification = new QualificationStore();
