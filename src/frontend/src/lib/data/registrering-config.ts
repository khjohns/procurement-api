import type {
  OppdragsgiverType,
  KontraktstypeId,
  GjeldendeDel,
  Krav,
  UnntakItem,
} from '$lib/types/registrering';

export const OPPDRAGSGIVERE = [
  { id: 'statlig' as const, label: 'Statlig myndighet' },
  { id: 'kommunal' as const, label: 'Kommune / fylkeskommune' },
  { id: 'offentligrettslig' as const, label: 'Offentligrettslig organ' },
];

export const KONTRAKTSTYPER = [
  { id: 'vare' as const, label: 'Varekontrakt', ref: '§ 4-1 (b)' },
  { id: 'tjeneste' as const, label: 'Tjenestekontrakt', ref: '§ 4-1 (c)' },
  { id: 'bygge' as const, label: 'Bygge- og anlegg', ref: '§ 4-1 (d)' },
  { id: 'saerlig' as const, label: 'Særlige tjenester', ref: 'vedlegg 2' },
  { id: 'helse' as const, label: 'Helse- og sosial', ref: 'vedlegg 3' },
];

export const UNNTAK_GENERELLE: UnntakItem[] = [
  {
    id: '2-5',
    label: 'FoU-tjenester (utbyttet tilfaller ikke fullt ut oppdragsgiver)',
    hjemmel: '§ 2-5',
  },
  { id: '3-1', label: 'Utvidet egenregi', hjemmel: '§ 3-1' },
  { id: '2-4a', label: 'Erverv / leie av fast eiendom', hjemmel: '§ 2-4 (a)' },
  { id: '2-4d', label: 'Juridiske tjenester (advokat i tvistesak mv.)', hjemmel: '§ 2-4 (d)' },
  { id: '2-4f', label: 'Ansettelser', hjemmel: '§ 2-4 (f)' },
];

export const UNNTAK_DEL2: UnntakItem[] = [
  { id: '5-2a', label: 'Bare én leverandør i markedet', hjemmel: '§ 5-2 (a)' },
  { id: '5-2b', label: 'Usedvanlig fordelaktig tilbud', hjemmel: '§ 5-2 (b)' },
  { id: '5-2c', label: 'Uforutsette omstendigheter – hast', hjemmel: '§ 5-2 (c)' },
  {
    id: '5-2d',
    label: 'Nødvendige tilleggsytelser (uforutsett, samme leverandør)',
    hjemmel: '§ 5-2 (d)',
  },
  {
    id: '5-2e',
    label: 'Mislykket åpen / begrenset tilbudskonkurranse',
    hjemmel: '§ 5-2 (e)',
  },
  { id: '5-2f', label: 'Børskjøp', hjemmel: '§ 5-2 (f)' },
  { id: '5-2g', label: 'Dekningskjøp (avlysning / tvist)', hjemmel: '§ 5-2 (g)' },
];

export const UNNTAK_DEL3_FORH: UnntakItem[] = [
  {
    id: '13-3a',
    label: 'Bare uakseptable tilbud i forutgående konkurranse',
    hjemmel: '§ 13-3 (a)',
  },
  { id: '13-3b', label: 'Ingen tilbud / forespørsler mottatt', hjemmel: '§ 13-3 (b)' },
  {
    id: '13-3e',
    label: 'Uforutsett hastetilfelle – strengt nødvendig omfang',
    hjemmel: '§ 13-3 (e)',
  },
  {
    id: '13-3f',
    label: 'Dekningskjøp etter kontrakt kjent uten virkning',
    hjemmel: '§ 13-3 (f)',
  },
];

export const UNNTAK_DEL3_UTEN: UnntakItem[] = [
  {
    id: '13-4-1',
    label: 'Umulig å gjennomføre konkurranse etter § 13-3',
    hjemmel: '§ 13-4 nr. 1',
  },
  { id: '13-4-2a', label: 'Unikt kunstnerisk verk / fremføring', hjemmel: '§ 13-4 nr. 2 (a)' },
  {
    id: '13-4-2b',
    label: 'Konkurranse umulig av tekniske årsaker',
    hjemmel: '§ 13-4 nr. 2 (b)',
  },
  {
    id: '13-4-2c',
    label: 'Leverandør har enerett (inkl. immaterielle rettigheter)',
    hjemmel: '§ 13-4 nr. 2 (c)',
  },
  {
    id: '13-4-3',
    label: 'Tilleggsleveranser fra opprinnelig leverandør (maks 3 år)',
    hjemmel: '§ 13-4 nr. 3',
  },
  {
    id: '13-4-4',
    label: 'Gjentakelse av lignende ytelser (maks 3 år)',
    hjemmel: '§ 13-4 nr. 4',
  },
  { id: '13-4-5', label: 'Varer kjøpt på varebørs', hjemmel: '§ 13-4 nr. 5' },
  {
    id: '13-4-6',
    label: 'Særlig fordelaktige vilkår (konkursbo mv.)',
    hjemmel: '§ 13-4 nr. 6',
  },
];

/** EØS threshold based on oppdragsgiver and kontraktstype */
export function getEos(o: OppdragsgiverType, k: KontraktstypeId): number {
  if (k === 'bygge') return 57_800_000;
  if (k === 'saerlig' || k === 'helse') return 7_800_000;
  if (o === 'statlig') return 1_490_000;
  return 2_300_000;
}

/** Determine applicable regulation part based on value, type and threshold */
export function getDel(v: number, k: KontraktstypeId, t: number): GjeldendeDel {
  if (v < 100_000)
    return {
      del: 'ingen',
      label: 'Under forskriftens virkeområde',
      desc: 'Regelverket gjelder ikke.',
    };

  if (k === 'helse') {
    if (v >= 7_800_000)
      return {
        del: 'IV',
        label: 'Del I + Del IV',
        desc: 'Kunngjøring etter Del IV. Egne prosedyreregler for helse- og sosialtjenester.',
      };
    return {
      del: 'I',
      label: 'Kun Del I',
      desc: 'Grunnprinsippene og fellesreglene gjelder. Ingen kunngjøringsplikt.',
    };
  }

  if (k === 'saerlig') {
    if (v >= 7_800_000)
      return {
        del: 'II+',
        label: 'Del I + Del II (tilleggskrav)',
        desc: 'Kunngjøring i Doffin og TED. Del II med EØS-tilleggskrav.',
      };
    if (v >= 1_300_000)
      return {
        del: 'II',
        label: 'Del I + Del II',
        desc: 'Kunngjøring i Doffin. Nasjonale prosedyreregler.',
      };
    return {
      del: 'I',
      label: 'Kun Del I',
      desc: 'Grunnprinsippene og fellesreglene gjelder. Ingen kunngjøringsplikt.',
    };
  }

  if (v >= t)
    return {
      del: 'III',
      label: 'Del I + Del III',
      desc: 'Kunngjøring i Doffin og TED. Fulle EØS-prosedyreregler.',
    };
  if (v >= 1_300_000)
    return {
      del: 'II',
      label: 'Del I + Del II',
      desc: 'Kunngjøring i Doffin. Nasjonale prosedyreregler.',
    };
  return {
    del: 'I',
    label: 'Kun Del I',
    desc: 'Grunnprinsippene og fellesreglene gjelder. Ingen kunngjøringsplikt.',
  };
}

/** Compute triggered requirements based on value, del, and exceptions */
export function getKrav(totalVerdi: number, del: string, harUnntak: boolean): Krav[] {
  const k: Krav[] = [];
  if (totalVerdi >= 100_000) {
    k.push({ l: 'Dokumentasjonsplikt', r: '§ 7-1' });
    k.push({ l: 'Habilitetsvurdering', r: '§ 7-5' });
    k.push({ l: 'Klima- og miljøhensyn (30 %)', r: '§ 7-9' });
  }
  if (totalVerdi >= 500_000) k.push({ l: 'Skatteattest', r: '§ 7-2' });
  if (['II', 'II+', 'III', 'IV'].includes(del) && !harUnntak) {
    k.push({
      l: 'Kunngjøring i Doffin',
      r: del === 'IV' ? '§ 30-5' : '§ 8-17 / § 21-2',
    });
    k.push({ l: 'Anskaffelsesprotokoll', r: del === 'III' ? '§ 25-5' : '§ 10-5' });
  }
  if (['III', 'II+', 'IV'].includes(del) && !harUnntak) {
    k.push({ l: 'Kunngjøring i TED', r: '§ 21-1' });
  }
  if (del === 'III') k.push({ l: 'Begrunnelse for ikke å dele opp', r: '§ 19-4' });
  if (harUnntak) {
    k.push({ l: '⚠ Begrunnelse for unntak i protokoll', r: '§ 10-5 / § 25-5', w: true });
    k.push({ l: '⚠ Vurder intensjonskunngjøring', r: '§ 8-18 / § 21-5', w: true });
  }
  return k;
}
