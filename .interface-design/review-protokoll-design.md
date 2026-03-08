# Designvurdering — Protokollsiden

Kritisk gjennomgang av protokollsiden vurdert mot de nylig redesignede sidene (evaluering, kvalifisering, anskaffelser-oversikt) og designsystemet.

---

## Hovedspørsmål: Bør protokollsiden ha et høyrepanel?

### Argumenter FOR høyrepanel

1. **Konsistens.** Alle tre andre arbeidsflatene bruker to-panel workspace (300px høyrepanel). Protokollsiden er den eneste med enkelt-kolonne. En bruker som beveger seg fra evaluering → protokoll mister et kjent orienterings-element.

2. **Seksjonsnavigasjon.** Med 20–24 seksjoner i et langt vertikalt dokument mangler brukeren en rask måte å hoppe mellom seksjoner. I dag krever det scrolling gjennom hele dokumentet for å finne en spesifikk seksjon. Et høyrepanel med en klikkbar innholdsfortegnelse (TOC) løser dette — minimap-mønsteret.

3. **Skriveverksted.** Idéen om at høyrepanelet kan veksle mellom TOC-modus og skriveområde er forlokkende: brukeren kan holde seksjonsoversikten synlig mens de skriver en begrunnelse, eller slå panelet om til et dedikert skriveområde der tekst-editoren får mer vertikal plass enn den inlinede 60vh-begrensningen.

4. **Kontekst under skriving.** Når brukeren skriver tildelingsbegrunnelse (seksjon 14), trenger de ofte å referere til tildelingskriteriene (seksjon 11) og leverandørlisten (seksjon 12). Et høyrepanel kan vise referansedata fra andre seksjoner — som evalueringens panel viser begrunnelser mens matrisen vises i hovedområdet.

### Argumenter MOT høyrepanel

1. **Protokollens natur er annerledes.** Evaluering og kvalifisering er matrise-arbeidsflater — bredden trengs for leverandør-kolonner. Protokoll er et *dokument* — lineær, tekst-tung, sekvensiell. Den smale 800px-kolonnen er ikke en begrensning, den er en *bevisst designbeslutning* for leselighet, identisk med hvordan det endelige Word-dokumentet ser ut.

2. **Falsk konsistens.** Å tvinge protokollsiden inn i to-panel-mønsteret fordi de andre sidene bruker det er konsistens for konsistensens skyld. Ulike oppgaver fortjener ulike grensesnitt. Et regneark og et tekstdokument bør ikke se likt ut bare fordi de tilhører samme app.

3. **Skriving krever fokus, ikke periferi.** Når brukeren skriver en 5-siders tildelingsbegrunnelse, er det *fordelen* at alt annet forsvinner. En sidefelt med TOC, fremdriftsbar og metadata er distraksjoner. Dokumentsenteriske verktøy (Notion, Google Docs, Overleaf) går i motsatt retning — de *skjuler* sidepaneler under skriving.

4. **800px + 300px panel = 1100px.** Den nåværende 800px-kolonnen fungerer ned til 1024px uten problemer. Med et 300px panel trengs minst 1100px desktopbredde — eller panelet må kollapse til overlay under 1100px, noe som gir en inkonsistent opplevelse på mellomstore skjermer.

5. **Dobbel-scroll-problemet.** Hvis skriveområdet flyttes til høyrepanelet, har vi to uavhengige scroll-kontekster: seksjonslisten i hovedområdet og editoren i panelet. Brukeren mister forbindelsen mellom *hvor* begrunnelsen hører hjemme (seksjon 14) og *hva* de skriver.

### Anbefaling

**Nei, protokollsiden bør IKKE ha et permanent høyrepanel.**

Den smale enkelt-kolonne-layouten er riktig for oppgaven. Men to problemer bør løses:

#### Problem 1: Seksjonsnavigasjon i lange dokumenter

Løsning: **Fremdriftsnavigasjon i sticky footer** — utvid footeren med en kompakt vertikal popup-meny (innholdsfortegnelse) som brukeren kan åpne med ett klikk. Denne viser alle seksjoner med statusindikatorer (✓/◐/○) og lar brukeren hoppe direkte til en seksjon. Lukkes automatisk etter navigering.

```
┌─────────────────────────────────────────────────────────────┐
│ ██████░░░ 12/15 · 3 mangler  [≡ Seksjoner]  Generer .docx  │
└─────────────────────────────────────────────────────────────┘
                                  ▲
                     ┌────────────┴────────────────┐
                     │  RAMMEVERK                   │
                     │  ✓  1  Generell info         │
                     │  ◐  2  Prosedyre             │
                     │  KVALIFISERING               │
                     │  ✓  3  Kvalifikasjonskrav    │
                     │  ○  4  Kvalifikasjonsvurd.   │  ← klikkbar
                     │  ...                         │
                     │  TILDELING                   │
                     │  ◐ 14  Valgt tilbud          │
                     │  ...                         │
                     └──────────────────────────────┘
```

Dette gir rask navigasjon uten å ofre dokumentbredden. Det bygger på eksisterende mønster (sticky footer) i stedet for å introdusere et nytt layout-paradigme.

#### Problem 2: Referansedata under skriving

Løsning: **Kontekst-seksjon i editor-felt.** Når brukeren redigerer tildelingsbegrunnelse (seksjon 14), vis en kompakt, sammenleggbar kontekst-stripe *over* editoren med nøkkeldata fra relaterte seksjoner:

```
┌────────────────────────────────────────────────────────────┐
│  TILDELINGSBEGRUNNELSE                                      │
│                                                              │
│  ┌─ Kontekst ──────────────────────── [Vis/Skjul] ────┐    │
│  │ Kriterier: Kompetanse 40% · Pris 30% · Gjennomf. 30% │  │
│  │ Vinner: Bouvet ASA (25 000 000 kr)                    │  │
│  │ Evaluerte: Bouvet, Sopra Steria, Knowit               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌── Tipex editor ────────────────────────────────────────┐  │
│  │  Bouvet ASA tildeles kontrakten basert på...            │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Konteksten er *inlined* — den tilhører seksjonen, ikke et eksternt panel. Brukeren ser akkurat den informasjonen de trenger for *denne* begrunnelsen, uten å miste fokus.

---

## Overskrift, knapper og navigasjon

### Hva fungerer godt

1. **Page-label + title + meta** mønsteret er konsistent med evalueringssiden. "ANSKAFFELSESPROTOKOLL" som uppercase section-label, deretter procurement-navn som headline, deretter referanse + del — dette er riktig hierarki.

2. **Generate-knappen** (amber, `--color-vekt`) som primæraksjon er riktig. Amber signaliserer "dette er handlingen som produserer resultatet" — konsistent med hvordan amber brukes som vekt-aksent i matrisen.

3. **Sticky footer** med duplisert generate-knapp er god UX for et langt dokument — brukeren trenger aldri å scrolle tilbake til toppen for å generere.

### Hva bør forbedres

#### A. Overskriftsmønsteret er *nesten* riktig, men mangler kontekst-linjen

Evaluerings- og kvalifiseringssidene har en **kontekst-linje** øverst i hovedområdet:

```
Evalueringsmatrise · 2026-1795                   ← evaluering
Kvalifikasjonsmatrise · 2026-1795                ← kvalifisering
```

Protokollsiden har i stedet:
```
ANSKAFFELSESPROTOKOLL                            ← page-label
IT-rammeavtale konsulenter 2026                  ← title
Ref: 2026-1795 · Del II                          ← meta
```

Det er *ingen kontekst-linje* i det samme formatet. Sidene bruker ulike mønster for å kommunisere "hvilken anskaffelse jobber du med". Protokollsiden har tyngre overskrift (20px headline), mens evaluering/kvalifisering har lett kontekst-linje (12px) + matrisen som hovedinnhold.

**Vurdering:** Forskjellen er forsvarlig. Evaluering/kvalifisering er matrise-first — overskriften skal være minimal slik at matrisen dominerer. Protokollsiden er dokument-first — den *er* overskrift + innhold, der overskriften speiler Word-dokumentets forside. Å tvinge inn kontekst-linje-mønsteret her ville gjøre overskriften dobbel ("Protokoll · 2026-1795" + "IT-rammeavtale").

**Men:** Page-label ("ANSKAFFELSESPROTOKOLL") bruker `--color-ink-muted` i implementasjonen, mens design-spesifikasjonen sier `--color-ink-ghost`. Muted er tyngre. Ghost er spesifisert for section-labels og chapter-labels. Bør endres til ghost for konsistens.

#### B. Knappemønster: Generer-knappen mangler kontekstuell tilstand

Evaluerings-panelet har en rik tilstandsvisning: MethodToggle, Setup-knapp, Ranking, Insights-knapp. Kvalifiserings-panelet har StatusPanel. Protokollsiden har bare "Generer .docx" som eneste aksjon.

Men protokoll har egentlig flere tilstander:

| Tilstand | Betydning | Knappens oppførsel i dag |
|---|---|---|
| 0% utfylt | Ikke klar | Aktiv (kan generere ufullstendig dok) |
| 50% utfylt | Under arbeid | Aktiv |
| 100% utfylt | Klar | Aktiv |
| Genererer | Venter | Spinner |
| Generert | Ferdig | Tilbake til aktiv |

**Problem:** Knappen er alltid aktiv (bare disabled under generering). Å generere et 30%-fullstendig dokument er teknisk mulig men juridisk meningsløst — det Word-dokumentet vil ha tomme begrunnelsesfelt.

**Forslag:** To distinkte tilstander for knappen:

1. **Under 100%:** "↓ Generer utkast" med `--color-felt` bakgrunn, `--color-ink-secondary` tekst (ghost-stil). Signaliserer at resultatet er foreløpig.
2. **100%:** "↓ Generer .docx" med `--color-vekt` bakgrunn (amber primær). Signaliserer at dokumentet er komplett.

Alternativt: Behold alltid amber, men vis completeness-brøk *i* knappen: "↓ Generer .docx (12/15)" — monospace tall gir kompakt tilstandsfeedback.

#### C. "Lukk alle" bør være mer enn en ghost-knapp

Med 20+ seksjoner og multiple åpne samtidige er "Lukk alle" en viktig escape-hatch. Den er i dag en ghost-knapp med `--color-wire` border og `--color-ink-secondary` tekst — visuelt sett det svakeste elementet i footeren.

**Vurdering:** Riktig visuelt hierarki. Lukk alle er sekundær til Generer, og den bør ikke rope. Ghost-stilen er korrekt. Men den bør vises allerede ved 1 åpen seksjon (ikke bare ≥2), fordi handlingen "lukk alt" gir mening selv med 1 seksjon — det bringer brukeren tilbake til oversiktsmodus.

Alternativt beholde ≥2-terskelen men legge til en "Vis alle" variant som utvider alle seksjoner — nyttig for gjennomgang/preview. Toggle: "Vis alle" ↔ "Lukk alle" basert på tilstand.

---

## Generell UX: Accordion, sticky footer, progress tracking

### Accordion-mønsteret

**Styrker:**
- Speiler Word-dokumentets struktur (kapitler → seksjoner)
- Naturlig for sekvensiell utfylling (åpne → fyll ut → lukk → neste)
- Multiple åpne seksjoner gir kryssreferanse
- Sticky section headers holder navigasjonen tilgjengelig

**Svakheter:**
- **Mangelfull orientering.** Når 4 seksjoner er åpne er det vanskelig å vite "hvor i dokumentet er jeg?". De sticky section-headerne hjelper, men bare for den *øverste* synlige seksjonen. Chapter-labels scrolles bort.
- **Ingen auto-scroll etter åpning.** Når brukeren klikker en seksjon langt ned, åpnes den og innholdet vises — men skjermen oppdaterer seg ikke nødvendigvis til riktig posisjon. Bør ha `scrollIntoView({ behavior: 'smooth', block: 'start' })` på seksjonens innhold etter åpning.
- **Ingen tastaturnavigasjon mellom seksjoner.** I evaluerings-matrisen kan brukeren navigere med piltaster. Protokollens accordion har ingen tilsvarende — Tab hopper mellom section headers, men det er 20+ tabs.

**Anbefaling:** Accordion er riktig mønster, men legg til:
1. `scrollIntoView` etter seksjon-åpning
2. Seksjon-navigasjonspopup i footeren (beskrevet ovenfor)
3. Keyboard shortcut: `Ctrl/⌘ + ↑/↓` for å hoppe mellom seksjonsoverskrifter

### Sticky footer

**Styrker:**
- Persistent fremdrift (progress bar + brøk)
- Generer-knappen alltid tilgjengelig
- "Lukk alle" som escape hatch
- Full workspace-bredde med sentrert innhold-container (800px)

**Svakheter:**

1. **`left: 228px` er hardkodet sidebartbredde.** Hvis sidebar-bredden endres (den er ikke definert som CSS custom property), brekker footeren. Bør bruke enten `calc(100% - sidebar)` med en CSS var, eller bedre: la footeren være inne i page-containeren med `position: sticky` i stedet for `position: fixed`.

2. **Footer høyde (ca. 48px) spiser av den tilgjengelige 60vh for Tipex.** Tipex-editoren har `max-height: 60vh`, men 60vh inkluderer footeren. Effektiv synlig editor-høyde er `60vh - 48px - sticky-header-høyde`. Ikke et problem i praksis (marginal differanse), men verdt å merke.

3. **Auto-save indikator ("Lagret") er spesifisert i designspek men ikke implementert.** Footeren viser ikke lagringsstatus. Brukeren har ingen feedback på at endringer er lagret.

**Anbefaling:**
- Erstatt hardkodet `left: 228px` med et mer robust mønster
- Implementer auto-save indikator: diskret "Lagret" tekst som fader inn/ut etter vellykket lagring (1s, `--color-ink-ghost`)

### Progress tracking

**Styrker:**
- Dobbel visning (progress strip + footer) gir feedback i alle scroll-posisjoner
- N/A-seksjoner ekskludert fra telleren (riktig)
- Fargekoding (grønn/amber/rose) er konsistent med evalueringens score-system
- "Fullstendig — klar for generering" endrer hele fremdrifts-opplevelsen ved 100%

**Svakheter:**

1. **"Mangler begrunnelse" er for generisk.** Brukeren vet at 3 seksjoner mangler, men ikke *hvilke*. I evalueringen viser høyrepanelet eksakt hvilke begrunnelser som mangler. Protokollen har ingen tilsvarende — brukeren må scrolle gjennom og lete etter ○ MANGLER-badges.

2. **Ingen "gå til neste manglende"-funksjon.** Designspek nevner en skip-link ("Gå til seksjon med mangler"), men den er ikke implementert. En knapp i footeren — feks. "→ Neste manglende" — ville gi en arbeidsflyt-drevet navigasjon.

**Anbefaling:**
- Legg til en "→ Neste manglende" knapp i footeren (ved siden av Lukk alle) som scroller til og åpner neste seksjon med status ○ MANGLER eller ◐ DELVIS
- Seksjon-navigasjonspopupen (beskrevet ovenfor) viser status per seksjon, som løser "hvilke mangler"-problemet

---

## Sammendrag: Prioriterte endringer

### Strukturelle (krever designbeslutning)

| # | Endring | Begrunnelse |
|---|---------|-------------|
| 1 | **Ingen permanent høyrepanel** | Dokumentets natur krever fokus, ikke periferi. 800px-kolonnen er riktig. |
| 2 | **Seksjon-navigasjonspopup i footer** | Løser navigasjonsproblemet uten å bryte layouten. Klikkbar TOC som vises over footeren. |
| 3 | **Kontekst-stripe i nøkkelseksjoner** | Inline referansedata (kriterier, vinner, leverandører) over editor i seksjon 14 og lignende. |
| 4 | **"Neste manglende"-knapp i footer** | Arbeidsflyt-drevet navigasjon — hopp direkte til neste ufullstendig seksjon. |

### Kosmetiske (kan fikses direkte)

| # | Endring | Detalj |
|---|---------|--------|
| 5 | Page-label farge | `--color-ink-muted` → `--color-ink-ghost` (konsistens med spec) |
| 6 | Generer-knapp tilstand | Vis "Generer utkast" (ghost) vs. "Generer .docx" (amber) basert på completeness |
| 7 | Auto-save indikator | Implementer "Lagret" fade i footer |
| 8 | scrollIntoView | Smooth-scroll til seksjon etter åpning |
| 9 | Sidebar-hardkoding | Erstatt `left: 228px` med CSS custom property |
| 10 | Lukk alle/Vis alle | Toggle mellom "Vis alle" og "Lukk alle", vis fra ≥1 åpen seksjon |
