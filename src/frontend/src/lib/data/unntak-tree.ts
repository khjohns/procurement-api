export type ConclusionType = 'unntak' | 'nei' | 'ok';

export interface KravItem {
  text: string;
  type: 'krav' | 'anbefalt';
}

export interface KofaRef {
  sak: string;
  tekst: string;
}

export interface Conclusion {
  hjemmel: string;
  label: string;
  krav: KravItem[];
  kofa?: KofaRef[];
  type: ConclusionType;
}

export interface TreeOption {
  label: string;
  next?: string;
  conclusion?: Conclusion;
}

export interface TreeNode {
  q: string;
  hint?: string;
  opts: TreeOption[];
}

export const TREE: Record<string, TreeNode> = {
  start: {
    q: 'Hvilken del av forskriften gjelder for anskaffelsen?',
    hint: 'Basert på anslått verdi, kontraktstype og oppdragsgiver (§ 5-1, jf. § 5-3).',
    opts: [
      { label: 'Kun Del I (100 000 – 1,3 mill. kr)', next: 'del1' },
      { label: 'Del II (1,3 mill. – EØS-terskel)', next: 'del2_saerlig_sjekk' },
      { label: 'Del III (over EØS-terskel)', next: 'del3_grunn' },
      { label: 'Usikker / trenger hjelp med terskelverdi', next: 'usikker' },
    ],
  },
  usikker: {
    q: 'For å vurdere unntak må du først vite hvilken del av forskriften som gjelder.',
    hint: 'Bruk terskelverdikalkulatoren eller registreringsskjemaet for å beregne anslått verdi og fastslå gjeldende del.',
    opts: [{ label: '← Tilbake til start', next: 'start' }],
  },

  // DEL I
  del1: {
    q: 'Anskaffelsen er under kunngjøringsterskelen (1,3 mill. kr). Det er ingen kunngjøringsplikt etter forskriften, men ønsker du å vurdere om anskaffelsen er helt unntatt fra regelverket?',
    opts: [
      { label: 'Ja – vurder om forskriften/loven gjelder i det hele tatt', next: 'generelt_type' },
      {
        label: 'Nei – grunnprinsippene gjelder, avslutt',
        conclusion: {
          hjemmel: 'FOA § 5-1 (1), jf. anskaffelsesloven § 4',
          label: 'Ingen kunngjøringsplikt – Del I og grunnprinsippene gjelder',
          krav: [
            {
              text: 'Grunnprinsippene om konkurranse, likebehandling, forutberegnelighet, etterprøvbarhet og forholdsmessighet gjelder.',
              type: 'krav',
            },
            {
              text: 'Dokumentasjonsplikt: oppbevar tilstrekkelig dokumentasjon til å begrunne viktige beslutninger (§ 7-1).',
              type: 'krav',
            },
            {
              text: 'Skatteattest kreves ved anskaffelser over 500 000 kr ekskl. mva. (§ 7-2).',
              type: 'krav',
            },
            {
              text: 'Klima- og miljøhensyn med minimum 30 % vekting gjelder (§ 7-9).',
              type: 'krav',
            },
            {
              text: 'Selv uten kunngjøringsplikt anbefales det å innhente flere tilbud for å sikre reell konkurranse.',
              type: 'anbefalt',
            },
          ],
          type: 'ok',
        },
      },
    ],
  },

  // GENERELLE UNNTAK
  generelt_type: {
    q: 'Hva slags unntak vurderer du?',
    hint: 'Generelle unntak gjør at hele forskriften og/eller anskaffelsesloven ikke gjelder.',
    opts: [
      { label: 'FoU-tjenester (§ 2-5)', next: 'gen_fou' },
      {
        label: 'Egenregi / samarbeid i offentlig sektor (§§ 3-1 til 3-3)',
        next: 'gen_egenregi_type',
      },
      { label: 'Unntak for visse tjenestekontrakter (§ 2-4)', next: 'gen_2_4' },
      { label: 'Ingen generelle unntak passer – tilbake', next: 'start' },
    ],
  },
  gen_fou: {
    q: 'Gjelder kontrakten forsknings- og utviklingstjenester med en CPV-kode i 73-serien?',
    hint: 'CPV-kodene 73000000–73430000 dekker FoU-virksomhet, forskning, eksperimentell utvikling, test og evaluering mv.',
    opts: [
      { label: 'Ja – CPV-kode i 73-serien', next: 'gen_fou_vilkaar' },
      {
        label: 'Nei – annen CPV-kode, eller FoU uten relevant CPV',
        conclusion: {
          hjemmel: '§ 2-5 første ledd',
          label: 'Unntatt – FoU-tjenester utenfor 73-serien',
          krav: [
            {
              text: 'Anskaffelsesloven og forskriften gjelder ikke for kontrakter om forsknings- og utviklingstjenester (§ 2-5 første ledd).',
              type: 'krav',
            },
            { text: 'Dokumenter at kontrakten gjelder FoU-tjenester.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
    ],
  },
  gen_fou_vilkaar: {
    q: 'Er begge disse vilkårene oppfylt?\n\n1. Utbyttet tilfaller fullt ut oppdragsgiveren til bruk i sin virksomhet\n2. Oppdragsgiveren betaler fullt ut for tjenesten',
    hint: 'Når begge vilkår er oppfylt for kontrakter med CPV-kode i 73-serien, gjelder regelverket likevel (§ 2-5 annet ledd).',
    opts: [
      {
        label: 'Ja – begge vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 2-5 annet ledd',
          label: 'Ikke unntatt – regelverket gjelder',
          krav: [
            {
              text: 'Når begge vilkår i § 2-5 annet ledd er oppfylt, gjelder anskaffelsesregelverket på vanlig måte.',
              type: 'krav',
            },
            {
              text: 'Anskaffelsen skal gjennomføres etter den delen av forskriften som verdien tilsier.',
              type: 'krav',
            },
          ],
          type: 'nei',
        },
      },
      {
        label: 'Nei – ett eller begge vilkår er ikke oppfylt',
        conclusion: {
          hjemmel: '§ 2-5',
          label: 'Unntatt – FoU-tjenester',
          krav: [
            {
              text: 'Når minst ett av vilkårene i § 2-5 annet ledd ikke er oppfylt, gjelder unntaket i § 2-5 første ledd.',
              type: 'krav',
            },
            { text: 'Dokumenter konkret hvilket vilkår som ikke er oppfylt.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
    ],
  },
  gen_egenregi_type: {
    q: 'Hva slags offentlig samarbeid gjelder?',
    opts: [
      {
        label: 'Utvidet egenregi – kontrakt med kontrollert rettssubjekt (§ 3-1)',
        next: 'gen_egenregi',
      },
      {
        label: 'Felles kontroll – flere oppdragsgivere kontrollerer sammen (§ 3-2)',
        next: 'gen_felles',
      },
      { label: 'Samarbeidsavtale mellom oppdragsgivere (§ 3-3)', next: 'gen_samarbeid' },
    ],
  },
  gen_egenregi: {
    q: 'Er alle tre vilkår for utvidet egenregi oppfylt?',
    hint: '1) Kontroll som over egen virksomhet\n2) Mer enn 80 % av aktiviteten utføres for oppdragsgiver\n3) Ingen direkte private eierandeler',
    opts: [
      {
        label: 'Ja – alle tre vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 3-1',
          label: 'Unntatt – utvidet egenregi',
          krav: [
            {
              text: 'Alle tre kumulative vilkår i § 3-1 første ledd må være oppfylt.',
              type: 'krav',
            },
            {
              text: 'Kontrollvilkåret krever bestemmende innflytelse over både strategiske mål og viktige beslutninger.',
              type: 'krav',
            },
            {
              text: 'Dokumenter oppfyllelsen av hvert enkelt vilkår med referanse til vedtekter, eierstruktur og årsregnskap.',
              type: 'anbefalt',
            },
          ],
          kofa: [
            {
              sak: '2024/1342',
              tekst:
                'KOFA presiserte at kontrollvilkåret krever bestemmende innflytelse over strategiske mål og viktige beslutninger.',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei – ett eller flere vilkår mangler',
        conclusion: {
          hjemmel: '§ 3-1',
          label: 'Vilkårene er ikke oppfylt – regelverket gjelder',
          krav: [{ text: 'Anskaffelsen må gjennomføres etter de ordinære reglene.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  gen_felles: {
    q: 'Er vilkårene for felles kontroll oppfylt (§ 3-2)?',
    hint: 'Krav: (a) felles kontroll, (b) > 80 % aktivitet for kontrollerende oppdragsgivere, (c) ingen direkte private eierandeler.',
    opts: [
      {
        label: 'Ja – alle vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 3-2',
          label: 'Unntatt – felles kontroll',
          krav: [
            {
              text: 'Alle tre kumulative vilkår i § 3-2 første ledd må være oppfylt.',
              type: 'krav',
            },
            { text: 'Dokumenter eierstruktur, vedtekter og styresammensetning.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 3-2',
          label: 'Vilkårene er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må gjennomføres etter de ordinære reglene.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  gen_samarbeid: {
    q: 'Er alle tre vilkår for samarbeidsavtaler oppfylt (§ 3-3)?',
    hint: '1) Samarbeidet sikrer at offentlige oppgaver utføres for et felles mål\n2) Utføres utelukkende av hensyn til offentlige interesser\n3) Mindre enn 20 % av aktivitetene utføres for andre enn oppdragsgiverne',
    opts: [
      {
        label: 'Ja – alle vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 3-3',
          label: 'Unntatt – samarbeidsavtale',
          krav: [
            {
              text: 'Kontrakten må inngås utelukkende mellom to eller flere oppdragsgivere.',
              type: 'krav',
            },
            {
              text: 'Dokumenter samarbeidets formål og at 20 %-grensen overholdes.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 3-3',
          label: 'Vilkårene er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må gjennomføres etter de ordinære reglene.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  gen_2_4: {
    q: 'Hva slags tjeneste gjelder kontrakten?',
    hint: '§ 2-4 lister uttømmende hvilke tjenestekontrakter som er unntatt.',
    opts: [
      {
        label: 'Erverv eller leie av fast eiendom',
        conclusion: {
          hjemmel: '§ 2-4 bokstav a',
          label: 'Unntatt – fast eiendom',
          krav: [
            {
              text: 'Anskaffelsesloven og forskriften gjelder ikke for erverv eller leie av fast eiendom (§ 2-4 bokstav a).',
              type: 'krav',
            },
            {
              text: 'Merk: unntaket gjelder ikke for kontrakter om oppføring av ny bygning.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Juridiske tjenester – advokat i tvistesak',
        conclusion: {
          hjemmel: '§ 2-4 bokstav d nr. 1 og 2',
          label: 'Unntatt – juridiske tjenester',
          krav: [
            {
              text: 'Unntaket gjelder representasjon ved advokat i tvistesaker og juridisk rådgivning til forberedelse av slik sak.',
              type: 'krav',
            },
            { text: 'Annen juridisk rådgivning er IKKE unntatt.', type: 'krav' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Ansettelser',
        conclusion: {
          hjemmel: '§ 2-4 bokstav f',
          label: 'Unntatt – ansettelser',
          krav: [
            {
              text: 'Forskriften gjelder ikke for ansettelseskontrakter (§ 2-4 bokstav f).',
              type: 'krav',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Voldgifts- / meklingstjenester',
        conclusion: {
          hjemmel: '§ 2-4 bokstav c',
          label: 'Unntatt – voldgift/mekling',
          krav: [
            {
              text: 'Forskriften gjelder ikke for voldgifts- og meklingstjenester (§ 2-4 bokstav c).',
              type: 'krav',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Finansielle tjenester (lån, emisjoner, sentralbank)',
        conclusion: {
          hjemmel: '§ 2-4 bokstav e',
          label: 'Unntatt – finansielle tjenester',
          krav: [
            {
              text: 'Unntaket gjelder låntjenester ifm. emisjon/salg av verdipapirer og sentralbanktjenester.',
              type: 'krav',
            },
          ],
          type: 'unntak',
        },
      },
      { label: 'Ingen av disse passer', next: 'generelt_type' },
    ],
  },

  // DEL II
  del2_saerlig_sjekk: {
    q: 'Gjelder anskaffelsen særlige tjenester (vedlegg 2) med en verdi over 7,8 mill. kr?',
    hint: '§ 5-2 annet ledd: Unntakene i § 5-2 første ledd gjelder IKKE for kontrakter om særlige tjenester som overstiger EØS-terskelverdien.',
    opts: [
      {
        label: 'Ja – særlige tjenester over 7,8 mill. kr',
        conclusion: {
          hjemmel: '§ 5-2 annet ledd',
          label: '§ 5-2-unntakene gjelder ikke for denne anskaffelsen',
          krav: [
            {
              text: 'Unntakene i § 5-2 gjelder ikke for særlige tjenester over EØS-terskel.',
              type: 'krav',
            },
            {
              text: 'Vurder om et generelt unntak (§§ 2-4, 2-5, 3-1 til 3-3) kan være relevant.',
              type: 'anbefalt',
            },
          ],
          type: 'nei',
        },
      },
      { label: 'Nei – ordinær anskaffelse eller under 7,8 mill.', next: 'del2_grunn' },
    ],
  },
  del2_grunn: {
    q: 'Hva er grunnen til at du vurderer unntak fra Del II?',
    hint: '§ 5-2 lister uttømmende vilkår for når Del II ikke gjelder.',
    opts: [
      { label: 'Bare én leverandør kan levere', next: 'del2_enelev' },
      { label: 'Uforutsette omstendigheter – hast', next: 'del2_hast' },
      { label: 'Mislykket forutgående konkurranse', next: 'del2_mislykket' },
      { label: 'Usedvanlig fordelaktig tilbud', next: 'del2_fordelaktig' },
      { label: 'Nødvendige tilleggsytelser', next: 'del2_tillegg' },
      { label: 'Børskjøp', next: 'del2_bors' },
      { label: 'Dekningskjøp (avlysning / tvist)', next: 'del2_dekk' },
      { label: 'Generelt unntak fra forskriften', next: 'generelt_type' },
    ],
  },
  del2_enelev: {
    q: 'Kan du dokumentere at kontrakten bare kan inngås med denne ene bestemte leverandøren i markedet?',
    hint: 'Det er ikke tilstrekkelig at leverandøren er best eller billigst.',
    opts: [
      {
        label: 'Ja – det finnes ingen andre leverandører',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav a',
          label: 'Unntak fra Del II – bare én leverandør',
          krav: [
            {
              text: 'Del II gjelder ikke for kontrakter som bare kan inngås med én bestemt leverandør (§ 5-2 (1) bokstav a).',
              type: 'krav',
            },
            { text: 'Gjennomfør og dokumenter en markedsundersøkelse.', type: 'anbefalt' },
            {
              text: 'Vurder å publisere intensjonskunngjøring i Doffin (§ 8-18).',
              type: 'anbefalt',
            },
          ],
          kofa: [
            {
              sak: '2023/137',
              tekst:
                'KOFA presiserte at § 5-2 (1) bokstav a (Del II) må brukes der anskaffelsen faller under EØS-terskelverdi.',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei – det finnes alternative leverandører',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav a',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del2_hast: {
    q: 'Er alle tre vilkår oppfylt?\n\n1. Uforutsette omstendigheter\n2. Som oppdragsgiver ikke kunne forutse\n3. Kontrakten kan ikke utsettes',
    opts: [
      {
        label: 'Ja – alle tre vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav c',
          label: 'Unntak fra Del II – uforutsette omstendigheter',
          krav: [
            {
              text: 'Del II gjelder ikke ved uforutsette omstendigheter (§ 5-2 (1) bokstav c).',
              type: 'krav',
            },
            { text: 'Dokumenter de uforutsette omstendighetene konkret.', type: 'anbefalt' },
            {
              text: 'Begrens kontraktens omfang og varighet til det nødvendige.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav c',
          label: 'Vilkåret er ikke oppfylt',
          krav: [
            { text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' },
            { text: 'Dårlig planlegging er aldri en uforutsett omstendighet.', type: 'anbefalt' },
          ],
          type: 'nei',
        },
      },
    ],
  },
  del2_mislykket: {
    q: 'Ble det gjennomført en åpen eller begrenset tilbudskonkurranse som ikke ga akseptable resultater?',
    opts: [
      {
        label: 'Ja – konkurransen var mislykket',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav e',
          label: 'Unntak fra Del II – mislykket konkurranse',
          krav: [
            {
              text: 'Det kan ikke foretas vesentlige endringer i anskaffelsesdokumentene.',
              type: 'krav',
            },
            { text: 'Dokumenter den forutgående konkurransen.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav e',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del2_fordelaktig: {
    q: 'Gir tilbudet en pris som ligger vesentlig under normale markedspriser?',
    opts: [
      {
        label: 'Ja – vesentlig under markedspris',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav b',
          label: 'Unntak fra Del II – usedvanlig fordelaktig tilbud',
          krav: [
            { text: 'Dokumenter normal markedspris og den tilbudte prisen.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav b',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del2_tillegg: {
    q: 'Er tilleggsytelsene strengt nødvendige pga. uforutsette omstendigheter, med samme leverandør?',
    opts: [
      {
        label: 'Ja – begge vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav d',
          label: 'Unntak fra Del II – nødvendige tilleggsytelser',
          krav: [
            {
              text: 'Dokumenter den opprinnelige kontrakten og de uforutsette omstendighetene.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav d',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del2_bors: {
    q: 'Kjøpes varene eller tjenestene på børs?',
    opts: [
      {
        label: 'Ja',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav f',
          label: 'Unntak fra Del II – børskjøp',
          krav: [
            {
              text: 'Dokumenter at kjøpet skjer på en børs eller lignende markedsplass.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav f',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del2_dekk: {
    q: 'Er dekningskjøpet nødvendig fordi en konkurranse måtte avlyses, eller fordi en tvist forsinker kontraktsinngåelsen?',
    opts: [
      {
        label: 'Ja',
        conclusion: {
          hjemmel: '§ 5-2 første ledd bokstav g',
          label: 'Unntak fra Del II – dekningskjøp',
          krav: [
            {
              text: 'Kontrakten kan ikke inngås for en lengre periode enn nødvendig.',
              type: 'krav',
            },
            { text: 'Dokumenter avlysningen eller tvisten.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 5-2 (1) bokstav g',
          label: 'Vilkåret er ikke oppfylt',
          krav: [{ text: 'Anskaffelsen må kunngjøres etter Del II.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },

  // DEL III
  del3_grunn: {
    q: 'Hva er grunnen til at du vurderer unntak fra kunngjøring eller konkurranse i Del III?',
    hint: 'Del III skiller mellom forhandling uten kunngjøring (§ 13-3) og anskaffelse uten konkurranse (§ 13-4). Vilkårene tolkes strengt.',
    opts: [
      { label: 'Bare én leverandør kan levere', next: 'del3_enelev' },
      { label: 'Hastetilfelle', next: 'del3_hast' },
      { label: 'Mislykket forutgående konkurranse', next: 'del3_mislykket' },
      { label: 'Tilleggsleveranser fra opprinnelig leverandør', next: 'del3_tillegg' },
      { label: 'Gjentakelse av lignende ytelser', next: 'del3_gjentakelse' },
      { label: 'Varer på varebørs', next: 'del3_bors' },
      { label: 'Særlig fordelaktige vilkår (konkursbo mv.)', next: 'del3_fordelaktig' },
      { label: 'Generelt unntak fra forskriften', next: 'generelt_type' },
    ],
  },
  del3_enelev: {
    q: 'Hva er årsaken til at bare denne leverandøren kan levere?',
    opts: [
      {
        label: 'Unikt kunstnerisk verk',
        conclusion: {
          hjemmel: '§ 13-4 nr. 2 bokstav a',
          label: 'Uten konkurranse – unikt kunstnerisk verk',
          krav: [
            { text: 'Dokumenter at ytelsen har en unik kunstnerisk karakter.', type: 'anbefalt' },
            { text: 'Begrunnelsen skal fremgå av anskaffelsesprotokollen (§ 25-5).', type: 'krav' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Tekniske årsaker',
        conclusion: {
          hjemmel: '§ 13-4 nr. 2 bokstav b',
          label: 'Uten konkurranse – teknisk umulig',
          krav: [
            { text: 'Gjelder bare når det ikke finnes rimelige alternativer.', type: 'krav' },
            { text: 'Begrunnelsen skal fremgå av anskaffelsesprotokollen (§ 25-5).', type: 'krav' },
            { text: 'Dokumenter de tekniske årsakene konkret.', type: 'anbefalt' },
          ],
          kofa: [
            {
              sak: '2024/796',
              tekst: 'Statens vegvesen – KOFA ila overtredelsesgebyr. Beviskravet er strengt.',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Enerett (immaterielle rettigheter)',
        conclusion: {
          hjemmel: '§ 13-4 nr. 2 bokstav c',
          label: 'Uten konkurranse – enerett',
          krav: [
            { text: 'Gjelder bare når det ikke finnes rimelige alternativer.', type: 'krav' },
            { text: 'Dokumenter eneretten og dens grunnlag.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      { label: 'Ingen av disse grunnene passer', next: 'del3_grunn' },
    ],
  },
  del3_hast: {
    q: 'Er alle tre vilkår oppfylt?\n\n1. Umulig å overholde fristene\n2. Skyldes ikke oppdragsgiver\n3. Oppdragsgiver kunne ikke forutse forholdet',
    opts: [
      {
        label: 'Ja – alle vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 13-3 bokstav e',
          label: 'Forhandling uten kunngjøring – hastetilfelle',
          krav: [
            {
              text: 'Kontraktens omfang skal ikke være større enn strengt nødvendig.',
              type: 'krav',
            },
            { text: 'Begrunnelsen skal fremgå av anskaffelsesprotokollen (§ 25-5).', type: 'krav' },
            {
              text: 'Dokumenter at det er umulig å overholde fristene – ikke bare upraktisk.',
              type: 'anbefalt',
            },
          ],
          kofa: [
            {
              sak: '2025/0225',
              tekst: 'Bjørnafjorden kommune – KOFA fant brudd. Unntaket fikk ikke anvendelse.',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 13-3 bokstav e',
          label: 'Vilkåret er ikke oppfylt',
          krav: [
            { text: 'Gjennomfør ordinær konkurranse med kunngjøring.', type: 'krav' },
            { text: 'Dårlig planlegging er aldri et hastetilfelle.', type: 'anbefalt' },
          ],
          type: 'nei',
        },
      },
    ],
  },
  del3_mislykket: {
    q: 'Hva var resultatet av den forutgående konkurransen?',
    opts: [
      {
        label: 'Bare uakseptable tilbud',
        conclusion: {
          hjemmel: '§ 13-3 bokstav a',
          label: 'Forhandling uten kunngjøring – uakseptable tilbud',
          krav: [
            {
              text: 'Alle leverandørene som ga tilbud skal inviteres til forhandlinger.',
              type: 'krav',
            },
            {
              text: 'Det kan ikke foretas vesentlige endringer i kravspesifikasjonene.',
              type: 'krav',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Ingen tilbud eller forespørsler mottatt',
        conclusion: {
          hjemmel: '§ 13-3 bokstav b',
          label: 'Forhandling uten kunngjøring – ingen tilbud',
          krav: [
            {
              text: 'Det kan ikke foretas vesentlige endringer i kravspesifikasjonene.',
              type: 'krav',
            },
          ],
          type: 'unntak',
        },
      },
    ],
  },
  del3_tillegg: {
    q: 'Er alle vilkår for tilleggsleveranser oppfylt?',
    hint: 'Gjelder bare varekontrakter. Skifte av leverandør må gi teknisk uforenlige varer.',
    opts: [
      {
        label: 'Ja',
        conclusion: {
          hjemmel: '§ 13-4 nr. 3',
          label: 'Uten konkurranse – tilleggsleveranser',
          krav: [
            { text: 'Varigheten skal normalt ikke overstige tre år.', type: 'krav' },
            { text: 'Dokumenter den tekniske uforenligheten.', type: 'anbefalt' },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 13-4 nr. 3',
          label: 'Vilkårene er ikke oppfylt',
          krav: [{ text: 'Gjennomfør ordinær konkurranse med kunngjøring.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del3_gjentakelse: {
    q: 'Er alle fire vilkår for gjentakelse oppfylt?',
    hint: '1) Opprinnelig kontrakt etter kunngjort konkurranse\n2) Nye ytelser i samsvar med opprinnelig prosjekt\n3) Muligheten forutsatt i anskaffelsesdokumentene\n4) Inntil 3 år etter opprinnelig kontrakt',
    opts: [
      {
        label: 'Ja – alle fire vilkår er oppfylt',
        conclusion: {
          hjemmel: '§ 13-4 nr. 4',
          label: 'Uten konkurranse – gjentakelse',
          krav: [
            { text: 'Kontrakten kan inngås inntil tre år etter den opprinnelige.', type: 'krav' },
            {
              text: 'Dokumenter den opprinnelige kontrakten og kunngjøringsnummer.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      {
        label: 'Nei',
        conclusion: {
          hjemmel: '§ 13-4 nr. 4',
          label: 'Vilkårene er ikke oppfylt',
          krav: [{ text: 'Gjennomfør ordinær konkurranse med kunngjøring.', type: 'krav' }],
          type: 'nei',
        },
      },
    ],
  },
  del3_bors: {
    q: 'Kjøpes varene på varebørs?',
    opts: [
      {
        label: 'Ja',
        conclusion: {
          hjemmel: '§ 13-4 nr. 5',
          label: 'Uten konkurranse – varebørs',
          krav: [{ text: 'Dokumenter at kjøpet skjer på varebørs.', type: 'anbefalt' }],
          kofa: [
            {
              sak: '2024/595',
              tekst: 'Halden kommune – KOFA aksepterte kjøp av elektrisk kraft på børs.',
            },
          ],
          type: 'unntak',
        },
      },
      { label: 'Nei', next: 'del3_grunn' },
    ],
  },
  del3_fordelaktig: {
    q: 'Har leverandøren stanset forretningsførselen, eller kjøpes ytelsene fra et konkursbo?',
    opts: [
      {
        label: 'Ja',
        conclusion: {
          hjemmel: '§ 13-4 nr. 6',
          label: 'Uten konkurranse – særlig fordelaktige vilkår',
          krav: [
            {
              text: 'Dokumenter de særlig fordelaktige vilkårene og leverandørens situasjon.',
              type: 'anbefalt',
            },
          ],
          type: 'unntak',
        },
      },
      { label: 'Nei', next: 'del3_grunn' },
    ],
  },
};
