import type { EvaluationData } from './evaluation.svelte';

export const demoData: EvaluationData = {
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
};
