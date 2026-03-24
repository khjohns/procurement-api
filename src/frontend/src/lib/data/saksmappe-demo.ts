import type { SaksmappeData } from '$lib/types/saksmappe';

export const demoSaksmappe: SaksmappeData = {
  sak: {
    saksnr: '2026/0847',
    tittel: 'Rammeavtale konsulenttjenester – digitalisering',
    beskrivelse:
      'Rammeavtale for kjøp av konsulenttjenester innen digitalisering og IT-utvikling for perioden 2026–2030. Avtalen skal dekke behov for rådgivning, prosjektledelse, systemutvikling og testing.',
    oppdragsgiver: 'Oslo kommune v/ Utdanningsetaten',
    kontraktstype: 'Tjenestekontrakt',
    kontraktstypeRef: '§ 4-1 (c)',
    del: 'III',
    verdi: 18_500_000,
    eosTerskel: 2_300_000,
    varighet: '48 måneder',
    prosedyre: 'Konkurranse med forhandling',
    prosedyreRef: '§ 13-2',
    opprettet: '2026-02-14',
  },
  faser: [
    {
      id: 'registrering',
      label: 'Registrering',
      status: 'fullfort',
      dato: '14. feb 2026',
      sammendrag: 'Tjenestekontrakt, Del III, anslått verdi 18,5 mill. kr. Ingen unntak.',
      href: '/registrering',
      hendelser: [{ dato: '14. feb', tekst: 'Anskaffelse registrert' }],
    },
    {
      id: 'instrukser',
      label: 'Interne instrukser',
      status: 'fullfort',
      dato: '18. feb 2026',
      sammendrag:
        'Oslo kommunes instrukser gjennomgått. Lærlingklausul, seriøsitetsbestemmelser og anti-sosial dumping-erklæring inkludert.',
      href: '/instrukser',
      hendelser: [
        {
          dato: '18. feb',
          tekst: 'Interne instrukser gjennomgått og dokumentert',
        },
      ],
    },
    {
      id: 'konkurranse',
      label: 'Konkurransegjennomføring',
      status: 'aktiv',
      aktiviteter: [
        {
          label: 'Kunngjøring sendt til Doffin og TED',
          dato: '3. mar',
          done: true,
        },
        {
          label: 'Frist for forespørsler om deltakelse',
          dato: '2. apr',
          done: true,
        },
        { label: 'Kvalifiseringsvurdering', dato: '9. apr', done: true },
        {
          label: 'Invitasjon til å gi tilbud sendt',
          dato: '14. apr',
          done: true,
        },
        { label: 'Tilbudsfrist', dato: '12. mai', done: false },
        { label: 'Forhandlingsmøter', dato: 'mai–jun', done: false },
        { label: 'Endelig tilbudsfrist', dato: 'est. jun', done: false },
      ],
      hendelser: [
        {
          dato: '14. apr',
          tekst: 'Invitasjon sendt til 5 kvalifiserte leverandører',
        },
        {
          dato: '9. apr',
          tekst: 'Kvalifiseringsvurdering fullført – 5 av 8 kvalifisert',
        },
        {
          dato: '2. apr',
          tekst: '8 forespørsler om deltakelse mottatt',
        },
        {
          dato: '3. mar',
          tekst: 'Kunngjøring publisert i Doffin og TED',
        },
      ],
    },
    {
      id: 'evaluering',
      label: 'Evaluering og tildeling',
      status: 'kommende',
      substeg: [
        'Evaluering av tilbud',
        'Meddelelse om valg av leverandør (§ 25-1)',
        'Karensperiode – 10 dager (§ 25-2)',
      ],
      href: '/evaluering',
    },
    {
      id: 'protokoll',
      label: 'Protokoll og meddelelsesbrev',
      status: 'kommende',
      substeg: ['Anskaffelsesprotokoll (§ 25-5)', 'Meddelelsesbrev til berørte leverandører'],
      href: '/protokoll',
    },
    {
      id: 'kontrakt',
      label: 'Kontraktsinngåelse',
      status: 'kommende',
      substeg: [
        'Signering etter utløp av karensperiode',
        'Kunngjøring av kontraktsinngåelse (§ 21-6)',
      ],
    },
  ],
  dokumenter: [
    { navn: 'Kunngjøring', status: 'publisert', dato: '3. mar 2026' },
    { navn: 'Konkurransegrunnlag', status: 'publisert', dato: '3. mar 2026' },
    { navn: 'Kvalifiseringsbrev', status: 'sendt', dato: '14. apr 2026' },
    { navn: 'Tilbudsinnbydelse', status: 'sendt', dato: '14. apr 2026' },
    { navn: 'Evalueringsrapport', status: 'ikke påbegynt', dato: null },
    { navn: 'Anskaffelsesprotokoll', status: 'ikke påbegynt', dato: null },
    { navn: 'Meddelelsesbrev', status: 'ikke påbegynt', dato: null },
  ],
  team: [
    { rolle: 'Prosjektleder', navn: 'Kari Nordmann' },
    { rolle: 'Innkjøpsfaglig ansvarlig', navn: 'Per Hansen' },
    { rolle: 'Juridisk', navn: 'Lise Berg' },
  ],
  frister: [
    {
      label: 'Tilbudsfrist',
      dato: '12. mai 2026',
      dager: 51,
      ref: '§ 20-4 (2)',
    },
    {
      label: 'Vedståelsesfrist utløper',
      dato: '11. jun 2026',
      dager: 81,
      ref: '§ 20-6',
    },
  ],
};
