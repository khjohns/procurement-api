# ADR-004: CSS-konvensjon — Tailwind v4 @theme som eneste token-kilde

**Status:** Vedtatt
**Dato:** 2026-03-01
**Kontekst:** Konsolidering av CSS-tokens og navnekonvensjon for frontend-designsystemet

---

## 1. Beslutning

**Tailwind CSS v4 `@theme`-direktivet i `app.css` er eneste kilde for design-tokens.** Alle CSS custom properties følger Tailwind-navnekonvensjonen: `--color-*`, `--spacing-*`, `--radius-*`, `--font-*`.

Stilstrategi er hybrid: CSS custom properties i scoped Svelte `<style>`-blokker for komponent-styling, Tailwind utility-klasser kun der de gir klar gevinst (layout, spacing, enkel typografi).

---

## 2. Bakgrunn

### Problemet

Prosjektet hadde tokens definert på to steder:
- `app.css` med Tailwind v4 `@theme`-blokk (`--color-canvas`, `--spacing-4`, etc.)
- `tokens.css` med korte aliaser (`--canvas`, `--sp-4`, `--r-sm`)
- En `:root`-blokk i `app.css` som mappet mellom de to konvensjonene

Eldre komponenter (evaluering, layout, anskaffelser) brukte korte aliaser. Nyere komponenter (protokoll) brukte allerede Tailwind-navn. Resultatet var inkonsistent navngiving, dobbelt vedlikehold, og at Tailwind IntelliSense ikke fungerte med de korte aliasene.

### Vurderte alternativer

1. **Full Tailwind utility-konvertering** — Erstatt all scoped CSS med utility-klasser i markup.
   - Avvist: Komponentene bruker komplekse selektorer (`:nth-child`, `::before`, `:hover` med kontekst), scoped styles med dynamiske `var()`-verdier, og tett samspill mellom CSS og Svelte-logikk. Utility-konvertering ville gitt verre lesbarhet uten reell gevinst. Svelte-kompilatorens scoped styles gir allerede isolasjon.

2. **Behold korte aliaser** — Fortsett med `--sp-4`, `--wire`, etc.
   - Avvist: Mister Tailwind IntelliSense, krever alias-lag, forvirrer nye utviklere.

3. **Hybrid: Tailwind-navngivne custom properties + utility-klasser der det gir gevinst** — Valgt løsning.

---

## 3. Konsekvenser

### Fjernet
- `src/frontend/src/lib/tokens.css` (slettet — redundant)
- `:root`-aliaslaget i `app.css` (~45 linjer)

### Oppdatert
- 496 CSS-variabelreferanser på tvers av 20+ komponenter
- `.interface-design/system.md` — alle token-referanser bruker Tailwind-navn
- `contrast-check.js` — oppdatert med nye token-verdier

### Token-mapping (gammel → ny)

| Kategori | Gammel | Ny |
|----------|--------|------|
| Farger | `--canvas`, `--felt`, `--ink`, `--wire`, `--vekt`, `--score-high` | `--color-canvas`, `--color-felt`, `--color-ink`, `--color-wire`, `--color-vekt`, `--color-score-high` |
| Spacing | `--sp-1` … `--sp-12` | `--spacing-1` … `--spacing-12` |
| Radius | `--r-sm`, `--r-md`, `--r-lg` | `--radius-sm`, `--radius-md`, `--radius-lg` |

### Gevinster
- **Én navnekonvensjon** — ingen tvetydighet mellom alias og @theme-navn
- **Tailwind IntelliSense** fungerer direkte (autocomplete, hover-dokumentasjon)
- **Enklere onboarding** — `@theme`-blokken er dokumentasjon i seg selv
- **Én kilde** — `app.css` @theme er det eneste stedet tokens defineres

### Avveininger
- Lengre variabelnavn (`--color-felt-hover` vs `--felt-hover`) — akseptabelt for konsistens
- Utility-klasser brukes sparsomt — vi velger bevisst bort full utility-first til fordel for lesbar scoped CSS i en kompleks, data-tett applikasjon

---

## 4. Retningslinjer

### Når bruke CSS custom properties (scoped `<style>`)
- Komplekse selektorer (`:nth-child`, `::before`, hover-kaskader)
- Dynamiske verdier fra Svelte-state (`style:` directive med `var()`)
- Tett, komponent-spesifikk layout (evalueringsmatrise, item-tabeller)

### Når bruke Tailwind utility-klasser
- Enkel layout: `flex`, `grid`, `gap-4`, `p-4`
- Grunnleggende typografi: `text-sm`, `font-mono`
- Responsiv design og breakpoints
- One-off spacing/sizing som ikke trenger komponent-scope

### Nye tokens
Legg alltid til i `@theme`-blokken i `app.css`. Følg mønsteret:
```css
@theme {
  --color-[kategori]-[variant]: verdi;
  --spacing-[n]: verdi;
  --radius-[størrelse]: verdi;
}
```
