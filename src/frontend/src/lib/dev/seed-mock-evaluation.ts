/**
 * Dev-only mock data seeder for testing begrunnelse/meddelsesbrev generators.
 *
 * Seeds localStorage with realistic evaluation + protokoll data for a given
 * procurement ID. Does NOT touch any production code or API.
 *
 * Usage from browser console:
 *   import('/src/lib/dev/seed-mock-evaluation.ts').then(m => m.seed(1665))
 *
 * Or from a dev route:
 *   import { seed, MOCK_PROC_ID } from '$lib/dev/seed-mock-evaluation';
 *   seed(MOCK_PROC_ID);
 *
 * To clear:
 *   import('/src/lib/dev/seed-mock-evaluation.ts').then(m => m.clear(1665))
 */

// ── Mock procurement ID (matches a real ID for API data) ──
export const MOCK_PROC_ID = 1665;

// ── Suppliers ──

const suppliers = [
  { id: 'sup-1', name: 'Norsk Brannvern AS', price: 2_450_000 },
  { id: 'sup-2', name: 'Firesafe AS', price: 2_180_000 },
  { id: 'sup-3', name: 'Noha Norway AS', price: 2_890_000 },
  { id: 'sup-4', name: 'Presto AS', price: 2_620_000 },
];

// ── Evaluation data ──

function buildEvaluationData() {
  return {
    data: {
      id: `eval-${MOCK_PROC_ID}`,
      title: 'Evaluering — Rammeavtale for manuelt slokkeutstyr',
      procurementName: 'Rammeavtale for manuelt slokkeutstyr',
      reference: 'OSL0005',
      status: 'active',
      qualityWeight: 60,
      priceWeight: 40,
      contractValue: 3_000_000,
      suppliers,
      criteria: [
        // ── Kvalitet (60 %) med 2 underkriterier ──
        {
          id: 'c-kvalitet',
          name: 'Kvalitet',
          type: 'quality' as const,
          weight: 60,
          subcriteria: [
            {
              id: 'sc-kompetanse',
              name: 'Kompetanse og erfaring',
              weight: 60,
              scores: {
                'sup-1': 9,
                'sup-2': 7,
                'sup-3': 6,
                'sup-4': 8,
              },
              notes: {
                'sup-1':
                  'Solid referanseliste med 15 års erfaring fra offentlige bygg. Dokumentert kompetanse innen alle relevante slokkesystemer. Dedikert prosjektleder med sertifisering.',
                'sup-2':
                  'God kompetanse, men noe begrenset erfaring med større bygg over 10 000 m². Prosjektleder har relevant bakgrunn.',
                'sup-3':
                  'Begrenset referanseliste. Kun 3 sammenlignbare oppdrag siste 5 år. Mangler spesifikk erfaring med sprinklersystemer i eldre bygg.',
                'sup-4':
                  'Bred erfaring fra både privat og offentlig sektor. God dokumentasjon av gjennomførte oppdrag, inkludert to prosjekter for Oslo kommune.',
              },
            },
            {
              id: 'sc-oppgaveforstaelse',
              name: 'Oppdragsforståelse',
              weight: 40,
              scores: {
                'sup-1': 8,
                'sup-2': 9,
                'sup-3': 5,
                'sup-4': 7,
              },
              notes: {
                'sup-1':
                  'God forståelse av oppdraget. Beskriver en strukturert tilnærming til kartlegging og implementering. Noe generell metodebeskrivelse.',
                'sup-2':
                  'Svært god oppdragsforståelse. Detaljert gjennomføringsplan med milepæler. Tydelig beskrivelse av kvalitetssikring og oppfølging mot tidsplan.',
                'sup-3':
                  'Svak oppdragsforståelse. Generisk beskrivelse uten tilpasning til dette oppdraget. Mangler konkret plan for gjennomføring.',
                'sup-4':
                  'God oppdragsforståelse med konkrete forslag til effektivisering. Beskriver relevant erfaring fra tilsvarende rammeavtaler.',
              },
            },
          ],
          notes: {
            'sup-1':
              'Norsk Brannvern viser samlet sett den sterkeste kvalitetsprofilen med høy kompetanse og god oppdragsforståelse.',
            'sup-2':
              'Firesafe har den beste oppdragsforståelsen, men noe svakere på kompetansesiden.',
          },
        },
        // ── Pris (40 %) ──
        {
          id: 'c-pris',
          name: 'Pris',
          type: 'price' as const,
          weight: 40,
          subcriteria: [],
          scores: {},
          notes: {},
        },
      ],
    } satisfies import('$lib/stores/evaluation.svelte').EvaluationData,
    activeMethod: 'poeng' as const,
  };
}

// ── Protokoll manual fields ──

function buildProtokollData() {
  return {
    selectedSuppliers: ['sup-1'],
    meddelelseDato: '2026-03-18',
    klagefrist: '2026-03-28',
    karensperiodeUtlop: '2026-03-28',
    kvalifikasjonsvurderinger: {
      'sup-1': 'Alle kvalifikasjonskrav oppfylt. Dokumentasjon godkjent.',
      'sup-2': 'Alle kvalifikasjonskrav oppfylt. Dokumentasjon godkjent.',
      'sup-3': 'Alle kvalifikasjonskrav oppfylt. Dokumentasjon godkjent.',
      'sup-4': 'Avvist — mangler tilstrekkelig forsikringsdekning, jf. kvalifikasjonskrav pkt. 3.',
    },
    avvisningerLeverandor: {
      'sup-4-org': {
        kategori: 'leverandor',
        begrunnelse:
          'Presto AS oppfyller ikke kvalifikasjonskrav om forsikringsdekning (min. 10 MNOK). Fremlagt dokumentasjon viser dekning på 5 MNOK.',
        datoAvvist: '2026-03-10',
      },
    },
  };
}

// ── Seed / clear ──

export function seed(procId: number = MOCK_PROC_ID) {
  const evalData = buildEvaluationData();
  const protokollData = buildProtokollData();

  localStorage.setItem(`eval-${procId}`, JSON.stringify(evalData));
  localStorage.setItem(`protokoll:${procId}`, JSON.stringify(protokollData));

  console.log(`✅ Mock data seeded for procurement ${procId}`);
  console.log(
    `   Evaluation: ${evalData.data.suppliers.length} suppliers, ${evalData.data.criteria.length} criteria`
  );
  console.log(
    `   Protokoll: ${protokollData.selectedSuppliers.length} selected, klagefrist ${protokollData.klagefrist}`
  );
  console.log(`   → Navigate to /anskaffelser/${procId}/protokoll or /meddelelse to test`);
}

export function clear(procId: number = MOCK_PROC_ID) {
  localStorage.removeItem(`eval-${procId}`);
  localStorage.removeItem(`protokoll:${procId}`);
  console.log(`🗑️  Mock data cleared for procurement ${procId}`);
}

// Auto-seed when imported directly (convenience)
if (typeof window !== 'undefined') {
  (window as any).__seedMock = seed;
  (window as any).__clearMock = clear;
  console.log('Mock helpers available: __seedMock(procId?) and __clearMock(procId?)');
}
