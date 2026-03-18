/**
 * Section registry for protokoll page.
 * Declarative definitions for Del II and Del III sections.
 * The rendering engine reads the active registry and renders shared components.
 */

// ── Types shared with protokoll store ──

export type AvvisningKategori = 'formalfeil' | 'leverandor' | 'tilbud';

export interface Avvisning {
  kategori: AvvisningKategori;
  begrunnelse: string;
  datoAvvist?: string;
}

/** Field types the rendering engine supports */
export type FieldType =
  | 'info-table'
  | 'supplier-list'
  | 'textarea'
  | 'richtext'
  | 'date'
  | 'checkbox-textarea'
  | 'per-supplier-textarea'
  | 'per-supplier-richtext'
  | 'avvisning-card'
  | 'data-quality-table'
  | 'evaluation-summary'
  | 'justification-generator'
  | 'meddelelse-generator';

/** Context passed to computeFilled for field status resolution. */
export interface ComputeFilledContext {
  suppliers: Array<{ id: string }>;
  manual: Record<string, unknown>;
}

/** Result of a field status computation. */
export interface ComputeFilledResult {
  filled: number;
  total: number;
}

export interface FieldDefinition {
  key: string;
  type: FieldType;
  label: string;
  hint?: string;
  required?: boolean;
  foaRef?: string;
  /** Optional co-located status logic. When present, the store delegates to this. */
  computeFilled?: (value: unknown, context: ComputeFilledContext) => ComputeFilledResult;
}

// ── computeFilled implementations per field type ──

function computeFilledDate(value: unknown): ComputeFilledResult {
  const dateStr = typeof value === 'string' ? value.trim() : '';
  return { total: 1, filled: dateStr.length > 0 ? 1 : 0 };
}

function computeFilledText(value: unknown): ComputeFilledResult {
  const text = typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';
  return { total: 1, filled: text.length > 0 ? 1 : 0 };
}

function computeFilledCheckboxTextarea(
  value: unknown,
  context: ComputeFilledContext,
  key: string
): ComputeFilledResult {
  const checked = !!value;
  if (!checked) return { total: 1, filled: 1 };
  const begrunnelse =
    typeof context.manual[`${key}Begrunnelse`] === 'string'
      ? (context.manual[`${key}Begrunnelse`] as string).trim()
      : '';
  return { total: 1, filled: begrunnelse.length > 0 ? 1 : 0 };
}

function computeFilledPerSupplierText(
  value: unknown,
  context: ComputeFilledContext
): ComputeFilledResult {
  const record = value as Record<string, string> | undefined;
  if (!record || context.suppliers.length === 0) {
    return { total: context.suppliers.length || 1, filled: 0 };
  }
  let filled = 0;
  for (const s of context.suppliers) {
    const text = (record[s.id] ?? '').replace(/<[^>]*>/g, '').trim();
    if (text.length > 0) filled++;
  }
  return { total: context.suppliers.length, filled };
}

function computeFilledAvvisningCard(value: unknown): ComputeFilledResult {
  const record = value as Record<string, Avvisning> | undefined;
  if (!record) return { total: 1, filled: 0 };
  const entries = Object.values(record);
  if (entries.length === 0) return { total: 1, filled: 0 };
  let filled = 0;
  for (const entry of entries) {
    if (entry.kategori && entry.begrunnelse?.trim()) filled++;
  }
  return { total: entries.length, filled };
}

/**
 * Create a computeFilled function for a checkbox-textarea field.
 * Needs the field key to look up the companion "Begrunnelse" field.
 */
function makeCheckboxTextareaFilled(key: string): FieldDefinition['computeFilled'] {
  return (value, context) => computeFilledCheckboxTextarea(value, context, key);
}

function computeFilledSelectedSuppliers(value: unknown): ComputeFilledResult {
  const arr = Array.isArray(value) ? value : [];
  return { total: 1, filled: arr.length > 0 ? 1 : 0 };
}

export interface SectionContext {
  isDel2: boolean;
  procedure: string;
  hasEforms: boolean;
  hasFramework: boolean;
  activities: any[];
}

export interface SectionDefinition {
  id: string;
  title: string;
  chapter: string;
  fields: FieldDefinition[];
  dataSource: 'api' | 'eforms' | 'manual' | 'mixed';
  condition?: (ctx: SectionContext) => boolean;
}

// ── Shared sections ──

const MEDDELSESBREV_SECTION: SectionDefinition = {
  id: 'meddelsesbrev',
  title: 'Meddelsesbrev',
  chapter: 'TILDELING',
  dataSource: 'mixed',
  fields: [
    {
      key: 'meddelsesbrev',
      type: 'meddelelse-generator',
      label: 'Generer meddelsesbrev til leverandørene',
    },
  ],
};

// ── Del II ──

export const DEL2_SECTIONS: SectionDefinition[] = [
  // RAMMEVERK
  {
    id: 'generell-info',
    title: 'Generell informasjon',
    chapter: 'RAMMEVERK',
    dataSource: 'api',
    fields: [{ key: 'generalInfo', type: 'info-table', label: 'Generell informasjon' }],
  },
  {
    id: 'mottak-tilbud',
    title: 'Tidspunkt for mottak av tilbud',
    chapter: 'RAMMEVERK',
    dataSource: 'api',
    fields: [
      { key: 'submissionTimes', type: 'info-table', label: 'Tidspunkt for mottak av tilbud' },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'SUBMIT_BID'),
  },
  {
    id: 'prosedyre',
    title: 'Prosedyre',
    chapter: 'RAMMEVERK',
    dataSource: 'mixed',
    fields: [
      { key: 'procedureInfo', type: 'info-table', label: 'Prosedyreinformasjon' },
      {
        key: 'unntakElektronisk',
        type: 'checkbox-textarea',
        label: 'Unntak fra elektronisk kommunikasjon',
        foaRef: 'FOA § 10-5',
        hint: 'Begrunn hvorfor elektronisk kommunikasjon ikke benyttes.',
        computeFilled: makeCheckboxTextareaFilled('unntakElektronisk'),
      },
      {
        key: 'reservasjonIdeell',
        type: 'checkbox-textarea',
        label: 'Reservasjon for ideelle organisasjoner',
        foaRef: 'FOA § 2-4',
        hint: 'Begrunn reservasjon for ideelle organisasjoner.',
        computeFilled: makeCheckboxTextareaFilled('reservasjonIdeell'),
      },
      {
        key: 'prosedyrebegrunnelse',
        type: 'textarea',
        label: 'Begrunnelse for prosedyrevalg',
        hint: 'Valgfritt for standardprosedyrer.',
        computeFilled: computeFilledText,
      },
    ],
  },

  // DIALOG OG AVKLARING
  {
    id: 'dialog-forhandlinger',
    title: 'Dialog / forhandlinger',
    chapter: 'DIALOG OG AVKLARING',
    dataSource: 'manual',
    fields: [
      {
        key: 'markedsdialog',
        type: 'checkbox-textarea',
        label: 'Dialog / forhandlinger gjennomført',
        foaRef: 'FOA § 9-3',
        hint: 'Beskriv eventuelle forhandlinger/dialoger som er gjennomført.',
        computeFilled: makeCheckboxTextareaFilled('markedsdialog'),
      },
    ],
  },
  {
    id: 'ettersending-avklaring',
    title: 'Ettersending / avklaring',
    chapter: 'DIALOG OG AVKLARING',
    dataSource: 'api',
    fields: [{ key: 'conversations', type: 'info-table', label: 'Ettersending og avklaringer' }],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'CONVERSATION_MARKED_COMPLETED'),
  },

  // KVALIFISERING
  {
    id: 'kvalifikasjonsvurdering',
    title: 'Kvalifikasjonsvurdering',
    chapter: 'KVALIFISERING',
    dataSource: 'mixed',
    fields: [
      { key: 'selectionCriteria', type: 'info-table', label: 'Kvalifikasjonskrav' },
      {
        key: 'kvalifikasjonsvurderinger',
        type: 'per-supplier-textarea',
        label: 'Kvalifikasjonsvurdering per leverandør',
        hint: 'Vurder hvordan leverandøren oppfyller kvalifikasjonskravene.',
        computeFilled: computeFilledPerSupplierText,
      },
    ],
  },
  {
    id: 'utvelgelse',
    title: 'Utvelgelse',
    chapter: 'KVALIFISERING',
    dataSource: 'mixed',
    fields: [
      { key: 'qualifyingParticipants', type: 'supplier-list', label: 'Kvalifiserte leverandører' },
      {
        key: 'utvelgelsesbegrunnelser',
        type: 'per-supplier-richtext',
        label: 'Utvelgelsesbegrunnelse per leverandør',
        hint: 'Begrunn utvelgelse av leverandører, jf. FOA § 9-3.',
        required: true,
        computeFilled: computeFilledPerSupplierText,
      },
    ],
    condition: (ctx) => ctx.procedure === 'RESTRICTED',
  },

  // AVVISNING
  {
    id: 'avvisning-formalfeil',
    title: 'Avvisning — formalfeil',
    chapter: 'AVVISNING',
    dataSource: 'mixed',
    fields: [
      {
        key: 'avvisningerFormalfeil',
        type: 'avvisning-card',
        label: 'Avvisning per leverandør',
        foaRef: 'FOA § 9-4',
        hint: 'Avvisning på grunn av formalfeil.',
        computeFilled: computeFilledAvvisningCard,
      },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'REJECT_PARTICIPATION'),
  },
  {
    id: 'avvisning-leverandor',
    title: 'Avviste leverandører',
    chapter: 'AVVISNING',
    dataSource: 'mixed',
    fields: [
      {
        key: 'avvisningerLeverandor',
        type: 'avvisning-card',
        label: 'Avvisning per leverandør',
        foaRef: 'FOA § 9-5',
        hint: 'Avvisning på grunn av kvalifikasjonssvikt.',
        computeFilled: computeFilledAvvisningCard,
      },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'REJECT_PARTICIPATION'),
  },
  {
    id: 'avviste-tilbud',
    title: 'Avviste tilbud',
    chapter: 'AVVISNING',
    dataSource: 'manual',
    fields: [
      {
        key: 'forkastedeTilbud',
        type: 'checkbox-textarea',
        label: 'Forkastede tilbud',
        foaRef: 'FOA § 9-6',
        hint: 'Begrunn eventuell avvisning av tilbud.',
        computeFilled: makeCheckboxTextareaFilled('forkastedeTilbud'),
      },
    ],
  },

  // TILDELING
  {
    id: 'tildelingskriterier',
    title: 'Tildelingskriterier',
    chapter: 'TILDELING',
    dataSource: 'eforms',
    fields: [{ key: 'awardCriteria', type: 'info-table', label: 'Tildelingskriterier' }],
  },
  {
    id: 'tilbud-vurdering',
    title: 'Tilbud i vurderingen',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'bidSuppliers', type: 'supplier-list', label: 'Leverandører med tilbud' },
      {
        key: 'evaluationSummary',
        type: 'evaluation-summary',
        label: 'Poengoversikt og innstilling',
      },
      {
        key: 'selectedSuppliers',
        type: 'info-table', // status tracked via computeFilled, rendering handled by evaluation-summary
        label: 'Innstilt(e) leverandør(er)',
        computeFilled: computeFilledSelectedSuppliers,
        required: true,
      },
    ],
  },
  {
    id: 'valgt-tilbud',
    title: 'Valgt tilbud + begrunnelse',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'awardInfo', type: 'info-table', label: 'Tildeling' },
      {
        key: 'tildelingsbegrunnelse',
        type: 'justification-generator',
        label: 'Tildelingsbegrunnelse',
        hint: 'Begrunn valget opp mot hvert tildelingskriterium. Feltet eksporteres som formatert tekst i Word-dokumentet.',
        required: true,
        computeFilled: computeFilledText,
      },
    ],
  },
  {
    id: 'meddelelse-klagefrist',
    title: 'Meddelelse og klagefrist',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'awardLetterInfo', type: 'info-table', label: 'Meddelelse' },
      {
        key: 'meddelelseDato',
        type: 'date',
        label: 'Dato meddelsesbrev sendt',
        hint: 'Dato da meddelsesbrev ble sendt til leverandørene.',
        computeFilled: computeFilledDate,
      },
      {
        key: 'klagefrist',
        type: 'date',
        label: 'Klagefrist',
        hint: 'Frist for klage på tildelingsbeslutningen.',
        computeFilled: computeFilledDate,
      },
    ],
  },
  MEDDELSESBREV_SECTION,
  {
    id: 'rammeavtaler',
    title: 'Rammeavtaler',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'frameworkInfo', type: 'info-table', label: 'Rammeavtaleinformasjon' },
      {
        key: 'fordelingsmekanisme',
        type: 'textarea',
        label: 'Fordelingsmekanisme',
        hint: 'Beskriv fordelingsmekanismen for rammeavtalen.',
        computeFilled: computeFilledText,
      },
      {
        key: 'minikonkurranseKriterier',
        type: 'textarea',
        label: 'Ved minikonkurranse; hvilke kriterier',
        hint: 'Oppgi kriterier for minikonkurranser.',
        computeFilled: computeFilledText,
      },
    ],
    condition: (ctx) => ctx.hasFramework,
  },

  // AVSLUTNING
  {
    id: 'markedsdialog-habilitet',
    title: 'Markedsdialog og habilitet',
    chapter: 'AVSLUTNING',
    dataSource: 'manual',
    fields: [
      {
        key: 'markedsdialogForKonkurranse',
        type: 'checkbox-textarea',
        label: 'Ingen forberedende undersøkelser eller dialog med leverandører før konkurransen',
        foaRef: 'FOA kap. 12',
        hint: 'Beskriv forberedende undersøkelser (§ 12-1), leverandører i dialog (§ 12-2) og avhjelpende tiltak.',
        computeFilled: makeCheckboxTextareaFilled('markedsdialogForKonkurranse'),
      },
      {
        key: 'inhabilitet',
        type: 'checkbox-textarea',
        label: 'Ingen habilitetskonflikter identifisert',
        foaRef: 'FOA § 7-5',
        hint: 'Beskriv eventuell inhabilitet eller konkurransevridning og avhjelpende tiltak.',
        computeFilled: makeCheckboxTextareaFilled('inhabilitet'),
      },
    ],
  },
  {
    id: 'andre-opplysninger',
    title: 'Andre opplysninger',
    chapter: 'AVSLUTNING',
    dataSource: 'mixed',
    fields: [
      { key: 'cancellationInfo', type: 'info-table', label: 'Avlysning' },
      {
        key: 'underleverandorer',
        type: 'textarea',
        label: 'Underleverandører',
        hint: 'Oppgi eventuelle underleverandører og hvilke deler av kontrakten.',
        computeFilled: computeFilledText,
      },
      {
        key: 'andreOpplysninger',
        type: 'textarea',
        label: 'Andre vesentlige forhold',
        hint: 'Andre opplysninger, vesentlige forhold eller viktige beslutninger.',
        computeFilled: computeFilledText,
      },
    ],
  },
  {
    id: 'datakvalitet',
    title: 'Datakvalitet',
    chapter: 'AVSLUTNING',
    dataSource: 'api',
    fields: [
      { key: 'dataQuality', type: 'data-quality-table', label: 'Datakvalitet — API vs. manuelt' },
    ],
  },
];

// ── Del III ──

export const DEL3_SECTIONS: SectionDefinition[] = [
  // RAMMEVERK
  {
    id: 'generell-info',
    title: 'Generell informasjon',
    chapter: 'RAMMEVERK',
    dataSource: 'api',
    fields: [{ key: 'generalInfo', type: 'info-table', label: 'Generell informasjon' }],
  },
  {
    id: 'mottak-tilbud',
    title: 'Tidspunkt for mottak av tilbud',
    chapter: 'RAMMEVERK',
    dataSource: 'api',
    fields: [
      { key: 'submissionTimes', type: 'info-table', label: 'Tidspunkt for mottak av tilbud' },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'SUBMIT_BID'),
  },
  {
    id: 'prosedyre',
    title: 'Prosedyre',
    chapter: 'RAMMEVERK',
    dataSource: 'mixed',
    fields: [
      { key: 'procedureInfo', type: 'info-table', label: 'Prosedyreinformasjon' },
      {
        key: 'prosedyrebegrunnelse',
        type: 'textarea',
        label: 'Begrunnelse for prosedyrevalg',
        hint: 'Begrunn valg av prosedyre, jf. FOA § 13-2 flg.',
        computeFilled: computeFilledText,
      },
      {
        key: 'delingsbegrunnelse',
        type: 'textarea',
        label: 'Begrunnelse for ikke å dele opp',
        foaRef: 'FOA § 19-4',
        hint: 'Forklar hvorfor kontrakten ikke deles i delkontrakter.',
        computeFilled: computeFilledText,
      },
    ],
  },

  // KVALIFISERING
  {
    id: 'forelopig-kvalifisering',
    title: 'Foreløpig kvalifikasjonsvurdering',
    chapter: 'KVALIFISERING',
    dataSource: 'mixed',
    fields: [
      {
        key: 'kvalifikasjonsvurderinger',
        type: 'per-supplier-textarea',
        label: 'Foreløpig kvalifikasjonsvurdering per leverandør',
        hint: 'Vurder kvalifisering basert på egenerklæring (ESPD), jf. FOA § 17-1.',
        computeFilled: computeFilledPerSupplierText,
      },
    ],
    condition: (ctx) => ctx.procedure !== 'Open',
  },
  {
    id: 'kvalifikasjonsvurdering',
    title: 'Kvalifikasjonsvurdering',
    chapter: 'KVALIFISERING',
    dataSource: 'mixed',
    fields: [
      { key: 'selectionCriteria', type: 'info-table', label: 'Kvalifikasjonskrav' },
      {
        key: 'kvalifikasjonsvurderinger',
        type: 'per-supplier-textarea',
        label: 'Kvalifikasjonsvurdering per leverandør',
        hint: 'Vurder hvordan leverandøren oppfyller kvalifikasjonskravene.',
        computeFilled: computeFilledPerSupplierText,
      },
    ],
  },
  {
    id: 'utvelgelse',
    title: 'Utvelgelse',
    chapter: 'KVALIFISERING',
    dataSource: 'mixed',
    fields: [
      { key: 'qualifyingParticipants', type: 'supplier-list', label: 'Kvalifiserte leverandører' },
      {
        key: 'utvelgelsesbegrunnelser',
        type: 'per-supplier-richtext',
        label: 'Utvelgelsesbegrunnelse per leverandør',
        hint: 'Begrunn utvelgelse av leverandører.',
        required: true,
        computeFilled: computeFilledPerSupplierText,
      },
    ],
    condition: (ctx) =>
      [
        'Limited',
        'Competitive negotiated',
        'Innovation partnership',
        'Competitive dialogue',
      ].includes(ctx.procedure),
  },

  // AVVISNING
  {
    id: 'avvisning-formalfeil',
    title: 'Avvisning — formalfeil',
    chapter: 'AVVISNING',
    dataSource: 'mixed',
    fields: [
      {
        key: 'avvisningerFormalfeil',
        type: 'avvisning-card',
        label: 'Avvisning per leverandør',
        foaRef: 'FOA § 24-1',
        hint: 'Avvisning på grunn av formalfeil.',
        computeFilled: computeFilledAvvisningCard,
      },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'REJECT_PARTICIPATION'),
  },
  {
    id: 'avvisning-leverandor',
    title: 'Avviste leverandører',
    chapter: 'AVVISNING',
    dataSource: 'mixed',
    fields: [
      {
        key: 'avvisningerLeverandor',
        type: 'avvisning-card',
        label: 'Avvisning per leverandør',
        foaRef: 'FOA § 24-2',
        hint: 'Avvisning på grunn av kvalifikasjonssvikt.',
        computeFilled: computeFilledAvvisningCard,
      },
    ],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'REJECT_PARTICIPATION'),
  },
  {
    id: 'avviste-tilbud',
    title: 'Avviste tilbud',
    chapter: 'AVVISNING',
    dataSource: 'manual',
    fields: [
      {
        key: 'forkastedeTilbud',
        type: 'checkbox-textarea',
        label: 'Forkastede tilbud',
        foaRef: 'FOA § 24-8',
        hint: 'Begrunn eventuell avvisning av tilbud.',
        computeFilled: makeCheckboxTextareaFilled('forkastedeTilbud'),
      },
      {
        key: 'unormaltLavtTilbud',
        type: 'checkbox-textarea',
        label: 'Unormalt lavt tilbud',
        foaRef: 'FOA § 24-9',
        hint: 'Begrunn vurdering av unormalt lave tilbud.',
        computeFilled: makeCheckboxTextareaFilled('unormaltLavtTilbud'),
      },
    ],
  },

  // ETTERSENDING, FORHANDLINGER OG DIALOG
  {
    id: 'ettersending-avklaring',
    title: 'Ettersending / avklaring',
    chapter: 'ETTERSENDING, FORHANDLINGER OG DIALOG',
    dataSource: 'api',
    fields: [{ key: 'conversations', type: 'info-table', label: 'Ettersending og avklaringer' }],
    condition: (ctx) => ctx.activities.some((a) => a.action === 'CONVERSATION_MARKED_COMPLETED'),
  },
  {
    id: 'forhandlinger',
    title: 'Forhandlinger',
    chapter: 'ETTERSENDING, FORHANDLINGER OG DIALOG',
    dataSource: 'manual',
    fields: [
      {
        key: 'forhandlingsreferat',
        type: 'richtext',
        label: 'Forhandlingsreferat',
        hint: 'Dokumenter forhandlingsprosessen. Feltet eksporteres som formatert tekst i Word-dokumentet.',
        required: true,
        computeFilled: computeFilledText,
      },
    ],
    condition: (ctx) =>
      ['Competitive negotiated', 'Innovation partnership'].includes(ctx.procedure),
  },
  {
    id: 'dialog',
    title: 'Dialog',
    chapter: 'ETTERSENDING, FORHANDLINGER OG DIALOG',
    dataSource: 'manual',
    fields: [
      {
        key: 'markedsdialog',
        type: 'checkbox-textarea',
        label: 'Dialog gjennomført',
        foaRef: 'FOA § 23-6',
        hint: 'Beskriv eventuell dialog med markedet.',
        computeFilled: makeCheckboxTextareaFilled('markedsdialog'),
      },
    ],
  },

  // TILDELING
  {
    id: 'tildelingskriterier',
    title: 'Tildelingskriterier',
    chapter: 'TILDELING',
    dataSource: 'eforms',
    fields: [{ key: 'awardCriteria', type: 'info-table', label: 'Tildelingskriterier' }],
  },
  {
    id: 'tilbud-vurdering',
    title: 'Tilbud i vurderingen',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'bidSuppliers', type: 'supplier-list', label: 'Leverandører med tilbud' },
      {
        key: 'evaluationSummary',
        type: 'evaluation-summary',
        label: 'Poengoversikt og innstilling',
      },
      {
        key: 'selectedSuppliers',
        type: 'info-table',
        label: 'Innstilt(e) leverandør(er)',
        computeFilled: computeFilledSelectedSuppliers,
        required: true,
      },
    ],
  },
  {
    id: 'valgt-tilbud',
    title: 'Valgt tilbud + begrunnelse',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'awardInfo', type: 'info-table', label: 'Tildeling' },
      {
        key: 'tildelingsbegrunnelse',
        type: 'justification-generator',
        label: 'Tildelingsbegrunnelse',
        hint: 'Begrunn valget opp mot hvert tildelingskriterium. Feltet eksporteres som formatert tekst i Word-dokumentet.',
        required: true,
        computeFilled: computeFilledText,
      },
      {
        key: 'karensperiode',
        type: 'date',
        label: 'Karensperiodens utløp',
        hint: 'Oppgi dato for karensperiodens utløp.',
        computeFilled: computeFilledDate,
      },
      {
        key: 'klager',
        type: 'textarea',
        label: 'Eventuelle klager',
        hint: 'Oppgi eventuelle klager mottatt.',
        computeFilled: computeFilledText,
      },
      {
        key: 'klageutfall',
        type: 'textarea',
        label: 'Resultat av klage',
        hint: 'Beskriv utfallet av klagen.',
        computeFilled: computeFilledText,
      },
    ],
  },
  {
    id: 'meddelelse-karens',
    title: 'Meddelelse og karensperiode',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'awardLetterInfo', type: 'info-table', label: 'Meddelelse' },
      {
        key: 'meddelelseDato',
        type: 'date',
        label: 'Dato meddelsesbrev sendt',
        hint: 'Dato da meddelsesbrev ble sendt til leverandørene.',
        computeFilled: computeFilledDate,
      },
      {
        key: 'karensperiodeUtlop',
        type: 'date',
        label: 'Karensperiodens utløp',
        hint: 'Utløpsdato for karensperiode. Bruk +10 dager for automatisk beregning.',
        computeFilled: computeFilledDate,
      },
    ],
  },
  MEDDELSESBREV_SECTION,
  {
    id: 'rammeavtaler',
    title: 'Rammeavtaler',
    chapter: 'TILDELING',
    dataSource: 'mixed',
    fields: [
      { key: 'frameworkInfo', type: 'info-table', label: 'Rammeavtaleinformasjon' },
      {
        key: 'fordelingsmekanisme',
        type: 'textarea',
        label: 'Fordelingsmekanisme',
        hint: 'Beskriv fordelingsmekanismen for rammeavtalen.',
        computeFilled: computeFilledText,
      },
      {
        key: 'minikonkurranseKriterier',
        type: 'textarea',
        label: 'Ved minikonkurranse; hvilke kriterier',
        hint: 'Oppgi kriterier for minikonkurranser.',
        computeFilled: computeFilledText,
      },
    ],
    condition: (ctx) => ctx.hasFramework,
  },

  // AVSLUTNING
  {
    id: 'markedsdialog-habilitet',
    title: 'Markedsdialog og habilitet',
    chapter: 'AVSLUTNING',
    dataSource: 'manual',
    fields: [
      {
        key: 'markedsdialogForKonkurranse',
        type: 'checkbox-textarea',
        label: 'Ingen forberedende undersøkelser eller dialog med leverandører før konkurransen',
        foaRef: 'FOA kap. 12',
        hint: 'Beskriv forberedende undersøkelser (§ 12-1), leverandører i dialog (§ 12-2) og avhjelpende tiltak.',
        computeFilled: makeCheckboxTextareaFilled('markedsdialogForKonkurranse'),
      },
      {
        key: 'inhabilitet',
        type: 'checkbox-textarea',
        label: 'Ingen habilitetskonflikter identifisert',
        foaRef: 'FOA § 7-5',
        hint: 'Beskriv eventuell inhabilitet eller konkurransevridning og avhjelpende tiltak.',
        computeFilled: makeCheckboxTextareaFilled('inhabilitet'),
      },
    ],
  },
  {
    id: 'andre-opplysninger',
    title: 'Andre opplysninger',
    chapter: 'AVSLUTNING',
    dataSource: 'mixed',
    fields: [
      { key: 'cancellationInfo', type: 'info-table', label: 'Avlysning' },
      {
        key: 'underleverandorer',
        type: 'textarea',
        label: 'Underleverandører',
        hint: 'Oppgi eventuelle underleverandører og hvilke deler av kontrakten.',
        computeFilled: computeFilledText,
      },
      {
        key: 'andreOpplysninger',
        type: 'textarea',
        label: 'Andre vesentlige forhold',
        hint: 'Andre opplysninger, vesentlige forhold eller viktige beslutninger.',
        computeFilled: computeFilledText,
      },
    ],
  },
  {
    id: 'datakvalitet',
    title: 'Datakvalitet',
    chapter: 'AVSLUTNING',
    dataSource: 'api',
    fields: [
      { key: 'dataQuality', type: 'data-quality-table', label: 'Datakvalitet — API vs. manuelt' },
    ],
  },
];
