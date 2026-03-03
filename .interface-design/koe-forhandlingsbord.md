# Forhandlingsbordet — Oversiktsside for KOE-sak

## Konsept

Forhandlingsbordet er landingssiden for en KOE-sak. Når du åpner KOE-2024-047, lander du ikke på et spesifikt spor — du lander *her*. Oversikten er en **vertikal tidslinje** der hendelser fra alle spor er plassert kronologisk, gruppert i sporkort.

Tre funksjoner:
1. **Oversikt** — hele forhandlingslandskapet i ett blikk (alle spor, alle statuser)
2. **Fokus** — hva som krever din oppmerksomhet *nå* (det kan være flere samtidige handlinger)
3. **Inngang** — klikk for å grave dypere i ett spor via tre-kolonne spordetaljvisningen

---

## Navigasjonsflyt

```
Saksliste          Forhandlingsbordet         Spordetalj
(alle KOE-saker)   (oversikt, én sak)         (arbeidsflate, ett spor)
                                               ┌─────────┬──────┬──────┐
┌──────────┐       ┌───────┬──────────┐        │ Nav     │ Form │ Begr │
│ Liste    │  →    │ Sak   │ Tidslinje│   →    │         │      │      │
│          │       │ info  │          │        │         │      │      │
└──────────┘       └───────┴──────────┘        └─────────┴──────┴──────┘
                   2 kolonner = scanning        3 kolonner = arbeid
```

Mellomnivået. Du scanner, prioriterer, velger hva du jobber med.

Layoutskiftet — fra to til tre kolonner — kommuniserer modusbytte: oversikt → arbeid. Høyrepanelet (begrunnelse-editoren) eksisterer *bare* i spordetalj, der du faktisk skriver.

---

## Layout

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Sakskontekst (260px) │ Tidslinje (flex)                                                 │
│                      │                                                                  │
│ Fast: partene,       │ Dynamisk: sporkort langs vertikal kronologisk spine.             │
│ status, frister,     │ Sist oppdaterte spor øverst. Handlinger fremhevet.               │
│ varsling             │                                                                  │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

Ingen høyrepanel. Det reserveres for spordetalj.

### Venstre panel — Sakskontekst

Vedvarende informasjon som gjelder hele saken, uavhengig av aktivt spor:

```
KOE-2024-047
Forsinket leveranse
stålkonstruksjon

─────────────────
Veidekke (TE)
Oslobygg (BH)

─────────────────
Opprettet  10.01.26
Oppdatert  i dag

─────────────────
SPOR
● Grunnlag   ⚠ 19d
● Frist      Svar kreves
● Vederlag   Nytt

─────────────────
FRISTER
⚠ Grunnlag  passivitet
  Frist     13d igjen
  Vederlag  14d igjen

─────────────────
VARSLING
✓ §32.2   ⚠ §33.4
– §33.6   – §34.1.2
```

**SPOR-seksjonen** gir mikro-navigasjon. Klikk på et spor → scroll tidslinjen til det kortet. Status-teksten er den kompakte oppsummeringen. ⚠-flagg synlige i periferien selv når du leser tidslinjen.

**FRISTER-seksjonen** samler alle aktive tidsfrister. Sortert etter urgency. Fargekodet: normal (--ink-secondary), advarsel (--vekt), kritisk (--score-low). Passivitetsregelen (§32.3) får egen behandling — "passivitet" er et sterkere signal enn "X dager igjen" fordi konsekvensen er automatisk rettighetsforfall.

**VARSLING-seksjonen** viser kompakt paragrafstatus. ✓ = overholdt, ⚠ = mulig brudd, ✕ = brudd, – = ikke relevant ennå. Hover avslører full paragraftekst og dato.

---

## Tidslinjespinen

Vertikal linje som binder alle sporkort kronologisk. Datomerker grupperer hendelser.

```
│
├── i dag ──────────────────────────────────────
│
│   [Sporkort]
│
├── i går ──────────────────────────────────────
│
│   [Sporkort]
│
├── 15. januar ─────────────────────────────────
│
│   [Sporkort]
│
├── 10. januar ─────────────────────────────────
│
├──── ○ Sak opprettet av TE
│
```

### Hva "sist redigerte spor øverst" betyr

Hvert sporkort plasseres ved datoen for sin **siste hendelse**. Sporet med siste aktivitet havner naturlig øverst.

- BH svarer på grunnlag i dag → grunnlagskortet flytter til "i dag"-gruppen, over frist/vederlag
- TE reviderer fristkrav i morgen → fristkortet flytter til "i morgen"-gruppen, øverst

Ingen manuell sortering — kronologien gjør jobben. Effekten er "working memory": det du nettopp jobbet med er lett å finne igjen.

### Enkelthendelser uten sporkort

Noen hendelser tilhører saken, ikke et spor: "Sak opprettet", "Dokument lastet opp", "Notat lagt til". Disse vises som enkle punkter på spinen, uten kort:

```
├──── ○ Sak opprettet av TE
├──── ○ TE la til dokument: Fremdriftsplan_rev3.pdf
```

---

## Sporkort

Hvert spor i saken representeres som et kort festet til tidslinjespinen.

### Struktur

```
SPORNAVN §X.Y ·································· Statusbadge
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ● [Siste hendelse — full beskrivelse]                [tid] │
│    [Nøkkeldata — beløp, dager, metode]                       │
│                                                              │
│  ○ [dato]  [Eldre hendelse — kompakt]                        │
│  ○ [dato]  [Eldre hendelse — kompakt]                        │
│                                                              │
│  [Frist / urgency-indikator]               → [Handlingsknapp]│
└──────────────────────────────────────────────────────────────┘
```

- **Siste hendelse** (●, --ink): full beskrivelse, primær kontrast
- **Eldre hendelser** (○, --ink-muted): kompakt, sekundær — gir temporal kontekst uten å dominere
- **Handlingsknapp** (→): bare synlig når det er *din tur* å handle. Klikk → navigerer direkte til skjema i spordetaljvisningen
- **Statusbadge** til høyre for spornavnet: "Nytt", "Sendt", "Delvis godkjent", "Ubesvart ⚠"

### Visuell differensiering

| Tilstand | Overflate | Venstre kant | Handling |
|---|---|---|---|
| Handling kreves — normal | --felt | --vekt (3px) | → Svar / → Vurder |
| Handling kreves — haster | --felt + svak rose tint | --score-low (3px) | → Svar nå |
| Venter på motpart | --felt | --wire-strong (1px) | Ingen knapp, "Venter på [rolle]" |
| Godkjent / løst | --felt, --ink-secondary | --score-high (2px) | Ingen, ✓ badge |
| Avslått | --felt, normal | --score-low (2px) | → Subsidiær? / → Forsering? |

Venstre-kanten er det sterkeste signalet. Den mapper til vektlinjen fra Analysebordet — amber trekker oppmerksomhet. Rose eskalerer.

### Kollapset vs. utvidet historikk

Sporkort med >3 hendelser viser de 2 siste, med "▾ 4 tidligere" for å utvide:

```
│  ● BH godkjente 30 av 45 dager                        12.02  │
│    Innsigelse: §33.6.1                                        │
│                                                              │
│  ○ i går  TE spesifiserte fristkrav                          │
│  ▾ 2 tidligere                                               │
```

Klikk utvider og viser alle hendelsene kronologisk. Kollapset er default — tidslinjen skal gi oversikt, ikke detaljert logg.

---

## Handlingsindikatorer

### Handlingsbanner

Øverst i tidslinjen. Sticky ved scrolling. Én linje:

```
⚠ 2 handlinger venter på deg
```

Fargekodet etter den *mest urgente* handlingen. Forsvinner når ingen handlinger venter. Kompakt — tar ikke plass fra sporkortene.

### Urgency-nivåer

| Nivå | Visuelt | Eksempel |
|---|---|---|
| Informativt | Normal kort, --vekt kant | "Nytt krav mottatt" (14d frist) |
| Advarsel | Amber fristindikator, --vekt kant med sterkere opacity | "7 dager igjen" |
| Kritisk | Rose kant, ⚠ badge, svak rose bakgrunn | "Passivitet — 19d uten svar" |

Fargekodingen følger eksisterende tokens: --vekt for oppmerksomhet, --score-low for fare, --score-high for løst.

### Passivitetsregelen — spesialbehandling

§32.3 passivitet (gjelder IRREG og VALGRETT) er fundamentalt forskjellig fra vanlige tidsfrister. Det er ikke "du bør svare snart" — det er "du *mister rettigheter* om du ikke svarer." Konsekvensen er automatisk: BH kan ikke senere protestere.

Visuelt skilles dette fra vanlige frister:

```
⚠ 19 dager uten svar
Passivitet §32.3 — BH kan miste retten til å protestere
```

Rose kant + rose badge + eksplisitt konsekvens-tekst. Passivitet er ikke bare en frist — det er et juridisk vendepunkt.

---

## Rolleperspektiv

Forhandlingsbordet er rollebevisst. TE og BH ser de samme hendelsene, men handling og fremheving er forskjellig.

### BH ser:

```
  FRISTFORLENGELSE §33 ····················· Spesifisert krav
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  ● TE spesifiserte fristkrav                  14:22  │
  │    45 kalenderdager · Ny sluttdato 15.08.2026        │
  │                                                      │
  │  Frist for svar: 13 dager               → Svar på krav│
  └──────────────────────────────────────────────────────┘
```

BH har handling: "Svar på krav". Amber kant. Frist synlig.

### TE ser (samme hendelse):

```
  FRISTFORLENGELSE §33 ····················· Sendt
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  ● Du sendte spesifisert krav                 14:22  │
  │    45 kalenderdager · Ny sluttdato 15.08.2026        │
  │                                                      │
  │  Sendt i går · Venter på BHs svar                    │
  └──────────────────────────────────────────────────────┘
```

TE venter. Ingen handlingsknapp. Nøytral kant. "Du" i stedet for "TE" — personlig perspektiv.

### TE etter BH delvis godkjente:

```
  FRISTFORLENGELSE §33 ················· Delvis godkjent
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  ● BH godkjente 30 av 45 dager               12.02  │
  │    67% · Innsigelse: §33.6.1 spesifisert for sent   │
  │                                                      │
  │  ○ 28.01  Du sendte spesifisert krav                 │
  │                                                      │
  │  Godta · Revidere · Trekke                    → Velg │
  └──────────────────────────────────────────────────────┘
```

TE har handling igjen — velge mellom å godta, revidere eller trekke kravet. Nøkkeldata (67%, innsigelsen) er synlig i oversikten slik at TE kan vurdere uten å drille ned.

---

## Mockup: BH med tre aktive spor

BH åpner KOE-2024-047. Alle tre spor har mottatte krav. Grunnlag er kritisk (passivitet).

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│                      │                                                                  │
│ KOE-2024-047         │  ⚠ 3 handlinger venter på deg                                   │
│ Forsinket leveranse  │                                                                  │
│ stålkonstruksjon     │  │                                                               │
│                      │  ├── i dag ──────────────────────────────────────────────         │
│ ─────────────────    │  │                                                               │
│ Veidekke (TE)        │  │   VEDERLAG §34 ··························· Nytt krav           │
│ Oslobygg (BH)        │  │   ┌──────────────────────────────────────────────────┐        │
│                      │  │   │                                                  │        │
│ ─────────────────    │  │   │  ● TE sendte vederlagskrav                10:34  │        │
│ Opprettet  10.01     │  │   │    Regningsarbeid · 2,4 MNOK                     │        │
│ Oppdatert  i dag     │  │   │    Rigg 340k · Produktivitetstap 180k            │        │
│                      │  │   │                                                  │        │
│ ─────────────────    │  │   │  Frist: 14 dager (17.02)         → Svar på krav  │        │
│ SPOR                 │  │   └──────────────────────────────────────────────────┘        │
│ ● Grunnlag  ⚠ 19d   │  │                                                               │
│ ● Frist     Svar     │  ├── i går ──────────────────────────────────────────────         │
│ ● Vederlag  Nytt     │  │                                                               │
│                      │  │   FRISTFORLENGELSE §33 ··········· Spesifisert krav           │
│ ─────────────────    │  │   ┌──────────────────────────────────────────────────┐        │
│ FRISTER              │  │   │                                                  │        │
│ ⚠ Grunnlag           │  │   │  ● TE spesifiserte fristkrav              14:22  │        │
│   passivitet!        │  │   │    45 kalenderdager · Ny dato 15.08.2026         │        │
│   Frist  13d         │  │   │                                                  │        │
│   Vederlag  14d      │  │   │  ○ 20.01  BH forespurte spesifisering            │        │
│                      │  │   │  ○ 15.01  TE varslet fristforlengelse            │        │
│ ─────────────────    │  │   │                                                  │        │
│ VARSLING             │  │   │  Frist: 13 dager (16.02)         → Svar på krav  │        │
│ ✓ §32.2  ⚠ §33.4    │  │   └──────────────────────────────────────────────────┘        │
│ – §33.6  – §34.1.2  │  │                                                               │
│                      │  ├── 15. januar ─────────────────────────────────────────         │
│                      │  │                                                               │
│                      │  │   ⚠ ANSVARSGRUNNLAG §25.2 ············· Ubesvart ⚠           │
│                      │  │   ┌──────────────────────────────────────────────────┐        │
│                      │  │   │                                                  │        │
│                      │  │   │  ● TE varslet irregulær endring           11:42  │        │
│                      │  │   │    Underleverandør Stålmontasje AS               │        │
│                      │  │   │    §25.2 første ledd                             │        │
│                      │  │   │                                                  │        │
│                      │  │   │  ⚠ 19d uten svar — passivitet    → Svar nå      │        │
│                      │  │   └──────────────────────────────────────────────────┘        │
│                      │  │                                                               │
│                      │  ├── 10. januar ─────────────────────────────────────────         │
│                      │  │                                                               │
│                      │  ├──── ○ Sak opprettet av TE                                     │
│                      │  │                                                               │
│                      │                                                                  │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

**Leseretning:**
BH scanner ovenfra og ned. Øverste kort (Vederlag) er sist mottatt. Nederste kort (Grunnlag) er eldst — men har den sterkeste visuelle vekten (⚠, rose kant) fordi passiviteten er kritisk. BH ser umiddelbart: "tre ting venter, men grunnlaget er mest urgent."

**Handlingsprioritet:**
Handlingsbanneret sier "3 handlinger." FRISTER-seksjonen i venstre panel sorterer etter urgency — "passivitet!" øverst, ikke kronologisk. Tidslinjen sorterer kronologisk (nyeste øverst). Venstre panel gir urgency-rekkefølge. Høyre panel gir temporal rekkefølge. To komplementære perspektiver.

---

## Mockup: Blandet tilstand — noe løst, noe aktivt

BH har godkjent grunnlaget. Frist er delvis godkjent (TE vurderer). Vederlag venter.

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│                      │                                                                  │
│ KOE-2024-047         │  ⚠ 1 handling venter på deg                                     │
│ Forsinket leveranse  │                                                                  │
│ stålkonstruksjon     │  │                                                               │
│                      │  ├── i dag ──────────────────────────────────────────────         │
│ ─────────────────    │  │                                                               │
│ SPOR                 │  │   ANSVARSGRUNNLAG §25.2 ················· Godkjent ✓           │
│ ✓ Grunnlag           │  │   ┌──────────────────────────────────────────────────┐        │
│ ◐ Frist   Venter TE │  │   │                                                  │        │
│ ● Vederlag Svar      │  │   │  ● BH (du) godkjente grunnlaget           09:15  │        │
│                      │  │   │    Irregulær endring §25.2 — akseptert           │        │
│ ─────────────────    │  │   │                                                  │        │
│ FRISTER              │  │   │  ○ 15.01  TE varslet irregulær endring           │        │
│   Vederlag  14d      │  │   │                                                  │        │
│   (Ingen urgente)    │  │   │  Avsluttet                                       │        │
│                      │  │   └──────────────────────────────────────────────────┘        │
│                      │  │                                                               │
│                      │  │   VEDERLAG §34 ··························· Nytt krav           │
│                      │  │   ┌──────────────────────────────────────────────────┐        │
│                      │  │   │                                                  │        │
│                      │  │   │  ● TE sendte vederlagskrav                10:34  │        │
│                      │  │   │    Regningsarbeid · 2,4 MNOK                     │        │
│                      │  │   │                                                  │        │
│                      │  │   │  Frist: 14 dager (17.02)         → Svar på krav  │        │
│                      │  │   └──────────────────────────────────────────────────┘        │
│                      │  │                                                               │
│                      │  ├── 12. februar ────────────────────────────────────────         │
│                      │  │                                                               │
│                      │  │   FRISTFORLENGELSE §33 ··········· Delvis godkjent            │
│                      │  │   ┌──────────────────────────────────────────────────┐        │
│                      │  │   │                                                  │        │
│                      │  │   │  ● BH (du) godkjente 30 av 45 dager      12.02  │        │
│                      │  │   │    Innsigelse: §33.6.1 spesifisert for sent     │        │
│                      │  │   │                                                  │        │
│                      │  │   │  ○ 28.01  TE spesifiserte krav                   │        │
│                      │  │   │  ▾ 2 tidligere                                   │        │
│                      │  │   │                                                  │        │
│                      │  │   │  Venter på TEs svar                              │        │
│                      │  │   └──────────────────────────────────────────────────┘        │
│                      │  │                                                               │
│                      │  ├── 10. januar ─────────────────────────────────────────         │
│                      │  ├──── ○ Sak opprettet av TE                                     │
│                      │  │                                                               │
│                      │                                                                  │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

**Observasjoner:**

- **Grunnlagskortet** er "i dag" (BH godkjente nettopp) — øverst pga. siste aktivitet. Dempet kontrast + ✓ badge + grønn venstre-kant. Visuelt "ferdig."
- **Vederlagskortet** er også "i dag" — men har handling (→ Svar). Amber venstre-kant. Visuelt "aktivt."
- **Fristkortet** har sunket til 12. februar (siste hendelse). "Venter på TEs svar" — ingen handlingsknapp for BH. Nøytral kant.
- **Banneret** sier "1 handling" — bare Vederlag krever BHs handling nå.
- **SPOR i venstre** bruker ✓ (løst), ◐ (halvveis, venter), ● (aktiv) — tre distinkte tilstander i mikro-navigasjonen.

---

## Overgang: Forhandlingsbordet → Spordetalj

Klikk på et sporkort (eller handlingsknappen) navigerer til tre-kolonne spordetaljvisningen.

### Klikk "→ Svar på krav" (Vederlag)

```
Forhandlingsbordet                    Spordetalj (Vederlag §34)
┌───────┬──────────┐                  ┌─────────┬──────────────┬──────────┐
│ Sak   │ Tidslinje│  ───→            │ Nav     │ Skjema       │ Begr.    │
│ info  │ [kort]   │                  │ + spor  │ BHs respons  │ editor   │
│       │ [kort]   │                  │ status  │ på TEs krav  │          │
│       │ [kort]   │                  │         │              │          │
└───────┴──────────┘                  └─────────┴──────────────┴──────────┘
2 kolonner                            3 kolonner
```

**Hva endrer seg:**
- Tidslinjen forsvinner → midtpanelet blir sporarbeidsflate
- Høyrepanelet dukker opp → begrunnelse-editor
- Venstre panel transformerer: sakskontekst → spor-navigasjon med mini-status for andre spor

**← Tilbake** i spordetaljvisningen → tilbake til Forhandlingsbordet. Tidslinjen er uendret (med mindre du sendte et svar — da har kortet oppdatert seg).

### Hva venstre panel viser i spordetalj

Venstre panel i spordetalj er en *kondensert versjon* av Forhandlingsbordet:

```
← Forhandlingsbordet

─────────────────
NESTE HANDLING
┌────────────────┐
│ BH  Svar på    │
│ vederlag       │
└────────────────┘

─────────────────

● ANSVARSGRUNNLAG
  §25.2
  Godkjent ✓

█ VEDERLAG
▌  §34
  Nytt krav
  2,4 MNOK

● FRISTFORLENGELSE
  §33
  Delvis godkjent
  Venter på TE

─────────────────
FRISTER
  Vederlag  14d
─────────────────
VARSLING
✓ §32.2  ⚠ §33.4
✓ §33.6  – §34.1.2
```

Spor-navigasjonen i venstre panel lar deg bytte mellom spor uten å gå tilbake til oversikten. Aktivt spor har amber accent-bar (█▌). De andre viser kompakt status.

---

## Avhengigheter mellom spor

Grunnlag-sporet styrer om frist og vederlag er gyldige. Hvis grunnlag avslås, mister TE rett til fristforlengelse og vederlag under den paragrafen.

Avhengigheten vises subtilt i oversikten:

```
  ANSVARSGRUNNLAG §25.2 ··················· Avslått ✕
  ┌──────────────────────────────────────────────────────┐
  │  ● BH avviste grunnlaget                      09:15  │
  │    §25.2 — vilkår ikke oppfylt                        │
  │                                                      │
  │  ⚠ Påvirker: Frist §33, Vederlag §34                │
  └──────────────────────────────────────────────────────┘

  FRISTFORLENGELSE §33 ··················· Bortfalt
  ┌──────────────────────────────────────────────────────┐
  │  Bortfalt — grunnlag §25.2 avslått                   │
  │                                                      │
  │  ○ 28.01  TE spesifiserte krav (45d)                 │
  │                                                      │
  │  TE kan utfordre grunnlagsavslaget          → Se sak │
  └──────────────────────────────────────────────────────┘
```

Avslått grunnlag viser eksplisitt "Påvirker: Frist, Vederlag." De avhengige sporkortene viser "Bortfalt" med forklaring og lenke tilbake til grunnlaget. Visuelt dempet (--ink-muted) med stiplet venstre-kant.

---

## Spesialtilfeller

### Forsering

Når BH avslår fristkrav, kan TE forsere (utføre arbeid raskere, kreve merkostnader). Forsering er ikke et eget spor i utgangspunktet — det er en *konsekvens* av avslått fristkrav.

I tidslinjen:

```
  FRISTFORLENGELSE §33 ····················· Avslått
  ┌──────────────────────────────────────────────────────┐
  │  ● BH avviste fristkrav                       15.02  │
  │                                                      │
  │  TE kan kreve forsering §33.8                        │
  │                                                      │
  │  → Krev forsering                                    │
  └──────────────────────────────────────────────────────┘
```

Handlingsknappen "Krev forsering" initierer forseringsflyten — en ny hendelsesrekke som visuelt lenkes til det avslåtte fristkravet.

### Endringsordre

Endringsordre samler flere KOE-saker. I oversikten for én sak vises en referanse:

```
  Del av endringsordre EO-2024-012
  3 av 5 saker behandlet
```

Kompakt. Klikk navigerer til endringsordre-visningen (utenfor scope for dette dokumentet).

### Tom sak — nettopp opprettet

TE har opprettet saken men ikke sendt noe ennå:

```
  │
  ├── i dag ──────────────────────────────────────────────
  │
  │   Ingen spor startet ennå.
  │   Start med å varsle ansvarsgrunnlag.
  │
  │                                    → Opprett varsel
  │
  ├──── ○ Sak opprettet av TE                     08:00
  │
```

Veiledet start — systemet foreslår første handling (varsle ansvarsgrunnlag, som typisk er det naturlige utgangspunktet).

---

## Visuell språk — mapping til Analysebordet-tokens

Forhandlingsbordet deler Analysebordets visuelle fundament men tilpasser aksentene:

| Analysebordet | Forhandlingsbordet | Konsept |
|---|---|---|
| --vekt (amber) = vekting | --vekt (amber) = handling kreves | Amber = "dette er viktig" |
| --score-high (grønn) = god score | --score-high = godkjent/løst | Grønn = "dette er bra" |
| --score-low (rose) = dårlig score | --score-low = avslått/kritisk | Rose = "dette er problematisk" |
| Vektlinjen (amber venstre-kant) | Handlingskant (amber venstre-kant) | Kant-accent = visuelt anker |

Overflatene er identiske: --canvas bakgrunn, --felt kort, --wire kanter. Typografien er identisk: --font-data for tall/datoer, --font-ui for tekst. Dybdestrategien er identisk: borders-only, ingen skygger.

Sporkortene bruker same overflate som evalueringsmatrisen sine rader — --felt med --wire kant. Hover → --felt-hover. Klikk → navigasjon (ikke utvidelse).

### Sporkort-tokens spesifikt

```
Sporkort:
  bakgrunn: --felt
  kant: --wire
  kant-venstre (handling): 3px solid --vekt
  kant-venstre (kritisk): 3px solid --score-low
  kant-venstre (venter): 1px solid --wire-strong
  kant-venstre (løst): 2px solid --score-high
  hover: --felt-hover bakgrunn
  radius: --r-md (6px)

Tidslinjespine:
  linje: 1px solid --wire
  dato-merke: --ink-muted, 11px, uppercase, tracking 0.06em
  hendelsespunkt (●): --ink, 8px
  eldre punkt (○): --ink-muted, 6px

Handlingsknapp (→):
  bakgrunn: --vekt-bg
  tekst: --vekt
  hover: --vekt-bg-strong
  radius: --r-sm

Statusbadge:
  skrift: 10px, uppercase, weight 600, tracking 0.06em
  Nytt: --vekt tekst, --vekt-bg bakgrunn
  Sendt: --ink-secondary, --felt-active
  Godkjent: --score-high, --score-high-bg
  Avslått: --score-low, --score-low-bg
  Ubesvart: --score-low, --score-low-bg (med ⚠)
```

---

## Oppsummering — Beslutninger tatt

| Beslutning | Begrunnelse |
|---|---|
| Tidslinjen er oversiktssiden, ikke en fane | Gir dynamisk, prioriterbar oversikt over hele saken |
| To kolonner på oversikt, tre i detalj | Layoutskifte kommuniserer modusbytte: scanning → arbeid |
| Sist oppdaterte spor øverst | Naturlig kronologisk — ingen manuell sortering nødvendig |
| Sporkort langs vertikal spine | Temporal kontekst + sporstruktur i ett grep |
| Venstre panel viser urgency-sorterte frister | Komplementerer tidslinjens kronologiske rekkefølge |
| Handlingsknapp bare synlig på "din tur" | Ingen støy fra handlinger som tilhører motparten |
| Passivitet ≠ vanlig frist | Sterkere visuell vekt fordi konsekvensen er automatisk rettighetsforfall |
| Kollapset historikk (>3 hendelser) | Oversikt > detalj — drill ned for mer |
| Godkjente spor dempet men synlige | Forhandlingslandskapet er komplett — ingenting skjules |
| "Du" i stedet for rollenavn | Personlig perspektiv reduserer kognitiv avstand |
