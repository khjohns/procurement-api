# Forhandlingsbordet — Oversiktsside for KOE-sak

## Konsept

Forhandlingsbordet er landingssiden for en KOE-sak. Når du åpner KOE-2024-047, lander du ikke på et spesifikt spor — du lander *her*.

Tre funksjoner:
1. **Oversikt** — hele forhandlingslandskapet i ett blikk
2. **Fokus** — hva som krever din oppmerksomhet *nå* (det kan være flere)
3. **Inngang** — klikk for å grave dypere via spordetaljvisningen

### Tetthetsfilosofi

Analysebordet er "dense, number-forward." Forhandlingsbordet arver dette. En kontraktsansvarlig med 20 saker trenger <3 sekunder per sak. Hvert sporkort er 2–3 linjer — nøkkeldata, frist, handling. Alle spor synlige uten scrolling.

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

Layoutskiftet kommuniserer modusbytte: oversikt → arbeid. Høyrepanelet (begrunnelse-editoren) eksisterer bare i spordetalj.

---

## Layout

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Sakskontekst (260px) │ Tidslinje (flex)                                                 │
│                      │                                                                  │
│ Fast: partene,       │ Kompakte sporkort langs vertikal kronologisk spine.               │
│ frister, varsling    │ Sist oppdaterte spor øverst. Handlinger fremhevet.               │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

Ingen høyrepanel. Det reserveres for spordetalj.

### Venstre panel — Sakskontekst

```
KOE-2024-047
Forsinket leveranse
stålkonstruksjon

─────────────────
Veidekke (TE)
Oslobygg (BH)

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

To seksjoner utover saksidentitet:

**FRISTER** — urgency-sortert. Mest presserende øverst. Fargekodet: normal (--ink-secondary), advarsel (--vekt), kritisk (--score-low). "Passivitet" er et juridisk vendepunkt — sterkere enn en vanlig frist.

**VARSLING** — kompakt paragrafstatus. ✓ overholdt, ⚠ mulig brudd, ✕ brudd, – ikke relevant ennå. Hover avslører full tekst.

Ikke SPOR-seksjon her — den ville duplisert sporkortene i tidslinjen.

---

## Urgency vs. kronologi

**Spenningen:** Kronologisk sortering (sist redigerte øverst) kan begrave det mest urgente. Grunnlag varslet for 19 dager siden havner nederst, men passiviteten gjør det mest presserende.

**Løsningen — to komplementære virkemidler:**

1. **Tidslinjen sorterer kronologisk** — sist redigerte spor øverst. Arbeidsstøtte: det du nettopp jobbet med er lett å finne.

2. **Visuell vekt overvinner romlig posisjon** — kritiske kort (passivitet, preklusion) har rose-tonet bakgrunn, sterkere kant, konsekvenstekst. De *roper* uavhengig av posisjon. Sidepanelet viser FRISTER urgency-sortert.

Effekten: øynene faller naturlig på det nyeste (posisjon), men trekkes mot det mest urgente (visuell vekt). To signaler som samvirker.

---

## Signaturelement: Paragrafstatus

Unik for dette produktet. Kompakte juridiske statusflagg vevd inn i hvert nivå av grensesnittet:

**I sidebar** (aggregert): `✓ §32.2  ⚠ §33.4  – §33.6  – §34.1.2`

**I sporkort** (inline): `FRIST §33 · Spesifisert krav · ⚠§33.4 ✓§33.6`

**I spordetalj** (utvidet): Full forklaring med dato, begrunnelse, konsekvens.

En trading-terminal har tickers. En code editor har lint-markører. Et KOE-verktøy har paragrafstatus — kontraktuelle compliance-signaler i hvert lag av grensesnittet. Ingenting annet ser slik ut.

---

## Sporkort — kompakt format

Hvert spor som et tett kort: 2–3 linjer. Nøkkeldata, ikke prosa.

### Anatomi

```
┌─ SPORNAVN §X ─ Status ─ §-flagg ──────── → Handling ─┐
│ [Nøkkeldata: tall, beløp, dager, metode · Frist Xd]   │
│ [Mini-historikk: dato hendelse · dato hendelse · ...]  │
└────────────────────────────────────────────────────────┘
```

- **Linje 0 (header):** Spornavn, paragraf, statusbadge, varslingsflagg, handlingsknapp
- **Linje 1:** Nøkkeldata med prikk-separatorer. Tall i --font-data.
- **Linje 2 (valgfri):** Mini-historikk — siste 2–3 hendelser kronologisk, --ink-muted

Kun 2 linjer når sporet har én hendelse. 3 linjer når det er historikk.

### Eksempler per tilstand

**Handling kreves (din tur):**
```
┌─ FRIST §33 ─ Spesifisert krav ─ ⚠§33.4 ────── → Svar ──┐
│ 45d krevd · Ny dato 15.08.26 · Frist 13d (16.02)         │
│ i går TE spesifiserte · 20.01 forespurt · 15.01 varslet  │
└───────────────────────────────────────────────────────────┘
```
Amber venstre-kant (3px). Handlingsknapp synlig.

**Handling kreves — kritisk (passivitet):**
```
┌─ ⚠ GRUNNLAG §25.2 ─ Ubesvart ──────────── → Svar nå ───┐
│ TE varslet irregulær endring · Stålmontasje AS · §25.2    │
│ ⚠ 19d uten svar — passivitet: risiko for rettighetsforfall│
└───────────────────────────────────────────────────────────┘
```
Rose-tonet bakgrunn (--score-low-bg) på HELE kortet. Rose venstre-kant. Konsekvenstekst på siste linje. "Svar nå" i stedet for bare "Svar."

**Venter på motpart:**
```
┌─ FRIST §33 ─ Delvis godkjent ─ Venter på TE ────────────┐
│ 30 av 45d godkjent (67%) · Innsigelse §33.6.1 · 12.02   │
│ 28.01 TE spesifiserte · 20.01 forespurt · 15.01 varslet  │
└───────────────────────────────────────────────────────────┘
```
Nøytral kant (--wire-strong, 1px). Ingen handlingsknapp. "Venter på [rolle]" i headeren.

**Godkjent / løst:**
```
┌─ GRUNNLAG §25.2 ─ Godkjent ✓ ───────────────────────────┐
│ Irregulær endring · Godkjent 03.02                        │
└───────────────────────────────────────────────────────────┘
```
Dempet kontrast (--ink-secondary). Grønn venstre-kant (2px). To linjer. Kollapset.

**TE etter delvis godkjenning — valg:**
```
┌─ FRIST §33 ─ Delvis godkjent ──────────────── → Velg ───┐
│ 30 av 45d (67%) · Innsigelse §33.6.1                     │
│ Godta · Revidere · Trekke                                 │
└───────────────────────────────────────────────────────────┘
```
Linje 2 viser TEs mulige handlinger direkte i kortet.

### Visuell differensiering

| Tilstand | Bakgrunn | Venstre kant | Handling |
|---|---|---|---|
| Handling — normal | --felt | 3px --vekt | → Svar |
| Handling — kritisk | --score-low-bg | 3px --score-low | → Svar nå |
| Venter | --felt | 1px --wire-strong | Ingen |
| Godkjent | --felt | 2px --score-high | Ingen, ✓ badge |
| Avslått | --felt | 2px --score-low | → Forsering? |
| Bortfalt | --felt | 1px stiplet --ink-ghost | → Se sak |

---

## Tidslinjespinen

Vertikal linje som binder sporkortene kronologisk:

```
│
├── i dag ──────────────────────────────────
│
│  [Sporkort]
│
├── i går ──────────────────────────────────
│
│  [Sporkort]
│
├── 15. januar ─────────────────────────────
│
│  [Sporkort]
│
├── 10. januar ─────────────────────────────
│  ○ Sak opprettet av TE
│
```

Hvert sporkort plasseres ved sin **siste hendelse**. Sporet med siste aktivitet havner naturlig øverst. BH svarer på grunnlag i dag → grunnlagskortet flytter til "i dag."

Enkelthendelser uten spor (sakopprettelse, dokumentopplasting) vises som punkter på spinen.

---

## Handlingsbanner

Øverst i tidslinjen. Sticky ved scrolling. Én linje:

```
⚠ 3 handlinger venter på deg
```

Fargekodet etter mest urgent handling. Forsvinner når alt er besvart.

---

## Mockup: BH med tre aktive spor

Alle tre spor har mottatte krav. Grunnlag er kritisk (passivitet).

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│                      │                                                                  │
│ KOE-2024-047         │  ⚠ 3 handlinger venter på deg                                   │
│ Forsinket leveranse  │                                                                  │
│ stålkonstruksjon     │  │                                                               │
│                      │  ├── i dag ──────────────────────────────────────────────         │
│ ─────────────────    │  │                                                               │
│ Veidekke (TE)        │  │  ┌─ VEDERLAG §34 ─ Nytt krav ──────────── → Svar ───┐        │
│ Oslobygg (BH)        │  │  │ Regningsarbeid · 2,4M · Rigg 340k · Prod.tap 180k│        │
│                      │  │  │ i dag TE sendte krav · Frist 14d (17.02)          │        │
│ ─────────────────    │  │  └───────────────────────────────────────────────────┘        │
│ FRISTER              │  │                                                               │
│ ⚠ Grunnlag           │  ├── i går ──────────────────────────────────────────────         │
│   passivitet!        │  │                                                               │
│   Frist  13d         │  │  ┌─ FRIST §33 ─ Spesifisert krav ─ ⚠§33.4 ── → Svar┐        │
│   Vederlag  14d      │  │  │ 45d krevd · Ny dato 15.08.26 · Frist 13d (16.02) │        │
│                      │  │  │ i går spesifisert · 20.01 forespurt · 15.01 varslet│       │
│ ─────────────────    │  │  └───────────────────────────────────────────────────┘        │
│ VARSLING             │  │                                                               │
│ ✓ §32.2  ⚠ §33.4    │  ├── 15. januar ─────────────────────────────────────────         │
│ – §33.6  – §34.1.2  │  │                                                               │
│                      │  │  ┌─ ⚠ GRUNNLAG §25.2 ─ Ubesvart ──────── → Svar nå ┐        │
│                      │  │  │ TE varslet irregulær endring · Stålmontasje AS    │        │
│                      │  │  │ ⚠ 19d uten svar — passivitet: rettighetsforfall   │        │
│                      │  │  └───────────────────────────────────────────────────┘        │
│                      │  │                    ░░░░░░ rose-tonet bakgrunn ░░░░░░░         │
│                      │  ├── 10. januar ─────────────────────────────────────────         │
│                      │  │  ○ Sak opprettet av TE                                        │
│                      │  │                                                               │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

**Leseretning:** Øverste kort (Vederlag) = sist mottatt. Nederste kort (Grunnlag) = eldst, men *visuelt sterkest*: rose bakgrunn, ⚠-prefiks, konsekvenstekst. Rose overvinner posisjon.

**Tetthet:** Tre sporkort = ~9 linjer. Alt over folden. BH ser umiddelbart: "tre handlinger, grunnlaget er mest presserende."

**Sidebar vs. tidslinje:** FRISTER sorterer etter urgency ("passivitet!" øverst). Tidslinjen sorterer kronologisk. To perspektiver som supplerer — urgency i periferien, kontekst i sentrum.

---

## Mockup: Blandet tilstand

BH har godkjent grunnlaget (nettopp). Frist delvis godkjent (venter TE). Vederlag nytt.

```
┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
│                      │                                                                  │
│ KOE-2024-047         │  ⚠ 1 handling venter på deg                                     │
│ Forsinket leveranse  │                                                                  │
│ stålkonstruksjon     │  │                                                               │
│                      │  ├── i dag ──────────────────────────────────────────────         │
│ ─────────────────    │  │                                                               │
│ FRISTER              │  │  ┌─ GRUNNLAG §25.2 ─ Godkjent ✓ ──────────────────┐          │
│   Vederlag  14d      │  │  │ Irregulær endring · Godkjent 03.03              │          │
│   (Ingen urgente)    │  │  └─────────────────────────────────────────────────┘          │
│                      │  │                                                               │
│ ─────────────────    │  │  ┌─ VEDERLAG §34 ─ Nytt krav ──────────── → Svar ──┐         │
│ VARSLING             │  │  │ Regningsarbeid · 2,4M · Frist 14d (17.03)        │         │
│ ✓ §32.2  ⚠ §33.4    │  │  │ i dag TE sendte krav                             │         │
│ ✓ §33.6  – §34.1.2  │  │  └──────────────────────────────────────────────────┘         │
│                      │  │                                                               │
│                      │  ├── 12. februar ────────────────────────────────────────         │
│                      │  │                                                               │
│                      │  │  ┌─ FRIST §33 ─ Delvis godkjent ─ Venter på TE ────┐         │
│                      │  │  │ 30 av 45d godkjent (67%) · Innsigelse §33.6.1    │         │
│                      │  │  │ 28.01 spesifisert · 20.01 forespurt · 15.01 varsl│         │
│                      │  │  └──────────────────────────────────────────────────┘         │
│                      │  │                                                               │
│                      │  ├── 10. januar ─────────────────────────────────────────         │
│                      │  │  ○ Sak opprettet av TE                                        │
│                      │  │                                                               │
└──────────────────────┴──────────────────────────────────────────────────────────────────┘
```

- **Grunnlag** godkjent → dempet, 2 linjer, grønn kant, ingen handling
- **Vederlag** nytt → amber kant, handlingsknapp, 3 linjer
- **Frist** venter TE → nøytral kant, ingen knapp, 3 linjer
- **Banner** sier "1 handling" — bare Vederlag er BHs tur

---

## Rolleperspektiv

TE og BH ser samme hendelser, men handling og ordlyd er forskjellig.

**BH ser:** `→ Svar på krav` (amber knapp, frist synlig)
**TE ser:** `Sendt i går · Venter på BHs svar` (ingen knapp, nøytral kant)

TE etter BH delvis godkjente:
```
┌─ FRIST §33 ─ Delvis godkjent ──────────────── → Velg ───┐
│ 30 av 45d (67%) · Innsigelse §33.6.1                     │
│ Godta · Revidere · Trekke                                 │
└───────────────────────────────────────────────────────────┘
```

"Du" brukes i stedet for rollenavn: "Du sendte spesifisert krav" (ikke "TE sendte").

---

## Overgang: Forhandlingsbordet → Spordetalj

Klikk sporkort (eller handlingsknapp) → tre-kolonne spordetaljvisning.

```
Forhandlingsbordet                    Spordetalj (Vederlag §34)
┌───────┬──────────┐                  ┌─────────┬──────────────┬──────────┐
│ Sak   │ Tidslinje│  ───→            │ Nav     │ Skjema       │ Begr.    │
│ info  │ [kort]   │                  │ + spor  │ BHs respons  │ editor   │
│       │ [kort]   │                  │ status  │ på TEs krav  │          │
└───────┴──────────┘                  └─────────┴──────────────┴──────────┘
```

- Tidslinjen → midtpanelet (sporarbeidsflate)
- Høyrepanelet dukker opp (begrunnelse-editor)
- Venstre panel transformerer til spor-navigasjon med mini-status

**← Tilbake** → tilbake til Forhandlingsbordet.

### Venstre panel i spordetalj

Kondensert versjon av oversikten — spor-navigasjon med amber accent på aktivt spor:

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
  Nytt krav · 2,4M

● FRISTFORLENGELSE
  §33
  Delvis godkjent

─────────────────
FRISTER
  Vederlag  14d
```

---

## Avhengigheter mellom spor

Grunnlag styrer om frist og vederlag er gyldige. Avslått grunnlag → avhengige spor vises som "bortfalt":

```
┌─ GRUNNLAG §25.2 ─ Avslått ✕ ────────────────────────────┐
│ §25.2 vilkår ikke oppfylt · ⚠ Påvirker: Frist, Vederlag │
└──────────────────────────────────────────────────────────┘

┌─ FRIST §33 ─ Bortfalt ───────────────────────── → Se sak┐
│ Bortfalt — grunnlag §25.2 avslått                        │
└──────────────────────────────────────────────────────────┘
```

Bortfalte kort: dempet, stiplet venstre-kant (--ink-ghost), lenke tilbake til grunnlaget.

---

## Spesialtilfeller

### Forsering

BH avslår fristkrav → TE kan forsere:
```
┌─ FRIST §33 ─ Avslått ──────────────── → Krev forsering ─┐
│ BH avviste fristkrav · 15.02 · TE kan forsere §33.8      │
└───────────────────────────────────────────────────────────┘
```

### Endringsordre

```
Del av endringsordre EO-2024-012 · 3 av 5 saker behandlet
```

### Tom sak

```
│
├── i dag ──────────────────────────────────────
│
│   Ingen spor startet ennå.
│   Start med å varsle ansvarsgrunnlag.
│
│                              → Opprett varsel
│
├── ○ Sak opprettet av TE                08:00
│
```

### Ingen handlinger (BH scanner raskt)

```
┌──────────────────────┬─────────────────────────────────────────┐
│ KOE-2024-047         │  Ingen handlinger. Venter på TE.        │
│ Forsinket leveranse  │                                         │
│ ...                  │  [kompakte sporkort i ventemodus]        │
└──────────────────────┴─────────────────────────────────────────┘
```

Null-tilstand for saker der ingenting krever BHs handling. <3 sekunder å vurdere og gå videre.

---

## Visuell språk

### Mapping til Analysebordet

| Analysebordet | Forhandlingsbordet | Prinsipp |
|---|---|---|
| --vekt = vekting | --vekt = handling kreves | Amber = "viktig" |
| --score-high = god score | --score-high = godkjent | Grønn = "bra" |
| --score-low = dårlig score | --score-low = kritisk | Rose = "problem" |
| Vektlinjen | Handlingskant | Kant-accent = anker |

Overflater, typografi, dybde: identisk med Analysebordet. --canvas, --felt, --wire, borders-only.

### Sporkort-tokens

```
Sporkort:
  bakgrunn: --felt (normal), --score-low-bg (kritisk)
  kant: --wire
  kant-venstre: se differensieringstabell
  hover: --felt-hover
  radius: --r-md

Header-linje:
  spornavn: --font-ui, 12px, weight 600
  statusbadge: 10px, uppercase, weight 600, tracking 0.06em
  §-flagg: 10px, --ink-muted (✓ = --score-high, ⚠ = --vekt, ✕ = --score-low)
  handlingsknapp: --vekt tekst, --vekt-bg bakgrunn, --r-sm

Data-linje:
  --font-data, 12px, --ink · prikk-separert

Historikk-linje:
  --font-ui, 11px, --ink-muted · prikk-separert

Tidslinjespine:
  linje: 1px solid --wire
  dato-merke: --ink-muted, 11px, uppercase, tracking 0.06em
```

---

## Oppsummering

| Beslutning | Begrunnelse |
|---|---|
| Tidslinjen er oversiktssiden | Dynamisk, prioriterbar oversikt over hele saken |
| 2–3 linjers sporkort | Analysebordet-tetthet: alt over folden, <3s scanning |
| Kronologisk sort + visuell urgency-vekt | Posisjon gir kontekst, visuell vekt gir prioritet |
| Paragrafstatus som signatur (§-flagg) | Inline juridiske statusflagg — unikt for dette domenet |
| Rose bakgrunn på hele kortet ved passivitet | Overvinner romlig posisjon — kritisk synlig uansett |
| Sidebar: FRISTER + VARSLING, ikke SPOR | SPOR ville duplisert tidslinjen |
| Handlingsknapp bare på "din tur" | Ingen støy fra motpartens handlinger |
| "Ingen handlinger" null-tilstand | Rask avfeiing for saker som ikke krever oppmerksomhet |
| "Du" i stedet for rollenavn | Personlig perspektiv |
