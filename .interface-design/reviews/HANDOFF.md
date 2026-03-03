# Handoff: Fiks forretningslogikk-avvik i DESIGN_WORKSPACE_PANELS.md

## Kontekst

Designdokumentet `.interface-design/DESIGN_WORKSPACE_PANELS.md` beskriver arbeidsflaten (midtpanel + høyrepanel) for et kontraktsadministrasjonsverktøy basert på NS 8407. Forretningslogikken er implementert i `../unified-timeline/` (React/TypeScript). Fire sonnet-agenter har vurdert designdokumentets forretningslogikk mot den eksisterende implementasjonen. Review-filene ligger i `.interface-design/reviews/`:

- `grunnlag-review.md` — 5 INCORRECT, 7 MISSING
- `frist-review.md` — 3 INCORRECT, 5 MISSING
- `vederlag-review.md` — 1 INCORRECT, 4 MISSING
- `forsering-eo-review.md` — 3 INCORRECT, 12 MISSING

Les disse for fullstendige detaljer med linjereferanser.

## Viktige avklaringer fra brukeren

1. **Oppsummering/Port 4 trengs IKKE** — designet viser valgene inline hele tiden (ikke wizard med separate steg). Begrunnelsesfeltet lever i høyrepanelet som TipTap-editor med auto-generert tekst + "Regenerer"-knapp. Dette er allerede spesifisert i høyrepanel-seksjonen av designdokumentet.

2. **Mockups skal IKKE lages nå** — kun logikk-fikser i tekst/betinget synlighet. Mockups kommer i en separat runde etter godkjenning.

3. **Filen er stor** — vurder å lage nye filer for nye seksjoner (f.eks. TE-skjemaer) i stedet for å blåse opp eksisterende fil.

4. **Ved uklarheter** — utforsk `../unified-timeline/src/components/actions/` og `../unified-timeline/src/domain/` for forretningslogikk (IKKE design). Bruk sonnet subagenter for dette.

---

## Oppgave 1: FEIL som skal fikses

### 1. Frafalt — legg til synlighetsvilkår
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1174
**Feil:** Frafalt er listet under "Alltid synlig" i betinget synlighet for grunnlag BH-respons.
**Fix:** Flytt Frafalt fra "Alltid synlig" til en betinget blokk:
```
Synlig hvis ENDRING AND (IRREG eller VALGRETT):
  - Frafalt-alternativ i verdict-knapper
```
Oppdater også verdict-knapper wireframe (linje ~1151-1153) med en kommentar om at Frafalt kun vises for IRREG/VALGRETT.

### 2. §32.2-varsling — legg til EO-unntak
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1169
**Feil:** Betingelsen sier "Synlig hvis ENDRING" men bør ekskludere EO.
**Fix:** Endre til:
```
Synlig hvis ENDRING AND underkategori ≠ EO:
  - Varsling §32.2 (Ja/Nei)
  - Preklusjonsadvarsel (hvis Nei)
```

### 3. Passivitet-terskler — korriger verdier
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1187
**Feil:** Sier "7-14d amber, >14d rød". Domenet bruker >5d varsel, >10d kritisk. Også mangler EO-unntak.
**Fix:** Endre til:
```
Passivitets-advarsel (ENDRING, underkategori ≠ EO, >5d):
  5-10d amber, >10d rød.
```

### 4. Footer §-ref feil
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1162
**Feil:** Knappetekst sier "Send svar §25". §25 er feil hjemmel.
**Fix:** Sjekk i domenet hva korrekt §-ref er for grunnlagsrespons. Trolig bør det reflektere kapittel/paragraf som gjelder for den spesifikke underkategorien (§32 for ENDRING-relaterte). Hvis usikkert, bruk bare "Send svar" uten §-ref, eller "Send svar §32" for ENDRING-kontekst.

### 5. §33.1 feilklassifisert som innsigelse (frist)
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1346-1353
**Feil:** "Fremdrift ikke hindret §33.1" er plassert i INNSIGELSER-gruppen sammen med §33.4 og §33.6.1. §33.1 er en selvstendig årsakssammenheng-vurdering, ikke en preklusjons-innsigelse.
**Fix:** Separer §33.1 fra innsigelsene. Legg den som en egen seksjon:
```
INNSIGELSER
────────────────────────────────────
  □  Varslet for sent
     §33.4 — frist for varsling oversittet
  ☑  Spesifisert for sent
     §33.6.1 — frist for spesifisering oversittet

ÅRSAKSSAMMENHENG §33.1                    ⓘ
────────────────────────────────────
Har forholdet hindret fremdriften?
  ┌─────┐ ┌─────┐
  │  Ja │ │ Nei │
  └─────┘ └─────┘
```
Oppdater også betinget synlighet og "Spesifikt"-blokken.

### 7. 30%-regel i forsering — endre til informasjonsvisning
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1612-1617
**Feil:** Viser Ja/Nei-knapper for 30%-regelen. Verdien er auto-beregnet fra backend.
**Fix:** Endre til en read-only key-value-rad:
```
30%-REGELEN
────────────────────────────────────────
Maks kostnad ···· kr 2 275 000
Estimert kostnad ···· kr 1 800 000
Overholdt ···· ✓ Ja  (auto-beregnet)
```

### 8. Forsering overordnet verdict — terminologi
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1619-1623
**Feil:** Bruker "Godkjent / Delvis godkjent / Avslått" for forsering-beløpsvurdering.
**Fix:** Vurder å endre til domene-riktig terminologi. Beløpsvurderingen i forsering handler om godkjenning av forseringskostnaden, så "Godkjent / Delvis godkjent / Avslått" kan forsvares for beløpet. Men tydeliggjør at dette gjelder beløpsvurderingen, ikke forseringsretten (som bruker Anerkjenner/Bestrider per sak). Legg til en kommentar som avklarer.

### 9. Trekk begrunnelse — endre fra påkrevd til valgfri
**Fil:** DESIGN_WORKSPACE_PANELS.md, linje ~1703
**Feil:** Sier "begrunnelseskrav (min 10 tegn)" men domenet har begrunnelse som valgfritt.
**Fix:** Endre til "Bekreftelses-dialog med valgfri begrunnelse."

---

## Oppgave 2: MANGLER som skal legges til

### 10. Forespørsel-livssyklus (frist)
**Hvor:** I frist BH-respons betinget synlighet (linje ~1384-1401)
**Hva mangler:**
- BH kan sende forespørsel (§33.6.2) når TE kun har sendt nøytralt varsel (varsel_type = 'varsel') og varselet er sendt i tide. Da vises: "Vil du sende forespørsel?" (Ja/Nei) + Frist for svar (datofelt).
- Når TE svarer på forespørsel: BH evaluerer `foresporsel_svar_ok` ("Kom svaret i tide?"). Nei = full preklusion. Ja = §33.6.2 fjerde ledd beskytter TE (BH kan ikke påberope §33.6.1 mot tidlig svar).
- Begrunnelse_utsatt: forenklet BH-visning (read-only TEs forklaring + valgfri kommentar).
**Fix:** Legg til en ny blokk i betinget synlighet for frist BH-respons.

### 11. §33.6.1 reduksjon vs. §33.4 preklusion — konsekvensasymmetri
**Hvor:** I frist innsigelser-dokumentasjonen
**Hva mangler:** Designen skiller ikke mellom konsekvensene:
- §33.4 "Nei" → full preklusion, kravet tapes
- §33.6.1 "Nei" → reduksjon, TE får kun det BH "måtte forstå" (ikke preklusion)
**Fix:** Legg til konsekvenstekst under hver innsigelse-checkbox, f.eks.:
```
  □  Varslet for sent
     §33.4 — kravet tapes (full preklusion)
  □  Spesifisert for sent
     §33.6.1 — reduseres til det BH måtte forstå (ikke preklusion)
```

### 12. §33.8 forsering-advarsel ved fristavslag
**Hvor:** I frist BH-respons, etter verdict-knapper
**Hva mangler:** Når BH avslår eller delvis godkjenner frist, skal det vises en konsekvens-callout:
```
⚠ Forsering (§33.8): Avslag/delvis godkjenning kan gi TE rett
  til å forsere. Forseringskostnad begrenset til dagmulkt × 1,3.
```
**Fix:** Legg til som betinget synlighet: "Synlig hvis resultat = Avslått eller Delvis godkjent"

### 13. Subsidiært vilkår — bredere trigger
**Hvor:** Frist betinget synlighet, linje ~1396-1397
**Feil:** Sier "Synlig hvis minst én innsigelse"
**Fix:** Endre til "Synlig hvis minst én innsigelse ELLER grunnlag er vurdert subsidiært (§32.2)"

### 14. BH svarplikt-advarsel (vederlag)
**Hvor:** Vederlag BH-respons betinget synlighet (linje ~1259-1282)
**Hva mangler:** Alert (danger) "Svarplikt" med dagsteller. Vises når >5 dager siden krav mottatt. Risiko for passiv aksept under §30.3.2.
**Fix:** Legg til:
```
Synlig alltid (top-level):
  - Svarplikt-advarsel (>5d siden krav mottatt): danger-alert
```

### 15. Forsering BH-respons — rigg/drift og produktivitet
**Hvor:** Forsering §33.8 BH-respons (linje ~1595-1630)
**Hva mangler:** Per-kravlinje evaluering av:
- Rigg/drift: "Varslet i tide?" (Ja/Nei §34.1.3) + beløpsvurdering (Godkjent/Delvis/Avslått) + godkjent beløp
- Produktivitet: samme mønster
- Prekluderte krav evalueres subsidiært
- `tilleggs_begrunnelse`-felt (valgfri kommentar som legges til auto-begrunnelse)
**Fix:** Legg til betinget synlighet og en per-kravlinje seksjon under BH-vurdering.

### 16. Per-spor aksept
**Hvor:** Aksept og lukking (linje ~1691-1706)
**Hva mangler:** Aksept er per spor (grunnlag, vederlag, frist), ikke global. Hvert spor aksepteres uavhengig. Aksept-dialogen viser BHs posisjon for det aktuelle sporet.
**Fix:** Skriv om seksjonen:
```
TE har tre valg per spor i lesemodus-footer:
  - Revider krav (ghost)
  - Trekk tilbake (destruktiv ghost)
  - Aksepter svar (grønn)

Aksept gjelder ett spor av gangen. Dialog viser:
  "BH sin posisjon: [Godkjent / Delvis / Avslått — X kr/dager]"
  Valgfri kommentar.
  Advarsel: "Denne handlingen kan ikke angres."
```

### 17. Per-spor trekk + kaskaderegler
**Hvor:** Aksept og lukking (linje ~1691-1706)
**Hva mangler:** Trekk er per spor med kaskadering:
- Trekk grunnlag → kaskader til vederlag + frist (hele saken trekkes)
- Trekk vederlag når frist er inaktiv → kaskader til grunnlag
- Trekk frist når vederlag er inaktiv → kaskader til grunnlag
- Kaskadering vises som danger-alert: "Dette vil trekke hele saken" / "Dette vil også trekke ansvarsgrunnlaget"
- Begrunnelse er valgfri (ikke påkrevd)
**Fix:** Legg til en egen seksjon om kaskadering under trekk.

---

## Oppgave 3: Manglende felter i mockups

**IKKE lag mockups ennå.** Brukeren vil gi klarsignal per område. Men noter hva som mangler slik at det kan gjøres etterpå:

- **Grunnlag TE-skjema** (helt fraværende): kategori, hjemmel/underkategori, tittel, beskrivelse, dato_oppdaget, varsling. Vurder ny fil.
- **Grunnlag BH**: FM-spesifikke alerts (§33.3), snuoperasjon med `harSubsidiaereSvar`, subsidiær vurdering-alert, "varslet i tide" info-alert.
- **Vederlag TE**: begrunnelse-felt (i kontekst av høyrepanel-arkitekturen), produktivitet dato-felt, §34.4-ref (ikke §34.2.2), REGNINGSARBEID fradrag-alert.
- **Forsering TE**: begrunnelse-felt.
- **EO**: tittel, beskrivelse, konsekvens_beskrivelse, te_kommentar, er_estimat auto-setting.

---

## Arbeidsrekkefølge

1. **Start med oppgave 1** (FEIL) — direkte fikser i eksisterende tekst
2. **Deretter oppgave 2** (MANGLER) — legg til ny tekst/seksjoner
3. **Oppgave 3** (mockups) — vent på brukerens klarsignal

## Ressurser

- Design: `.interface-design/DESIGN_WORKSPACE_PANELS.md`
- Reviews: `.interface-design/reviews/*.md` (les for detaljerte linjereferanser)
- Domenelogikk: `../unified-timeline/src/components/actions/` og `../unified-timeline/src/domain/`
- Konstanter: `../unified-timeline/src/constants/`
- Typer: `../unified-timeline/src/types/timeline.ts`
