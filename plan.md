# Plan: Rutestruktur, nav-bar og kontrollbord

## Oversikt

Omstrukturere frontend fra flat navigasjon til progressiv tre-nivå-struktur, gjenbruke saksoversikt-komponenter fra KOE-appen.

## Steg

### 1. Ny rutestruktur

Endre fra:
```
/                        → redirect /evaluering
/anskaffelser            → liste
/kvalifisering           → arbeidsflate
/evaluering              → arbeidsflate
/evaluering/ny           → setup
/protokoll               → arbeidsflate
```

Til:
```
/                        → redirect /anskaffelser
/anskaffelser            → kontrollbord (tidslinje + tabell)
/anskaffelser/[id]       → saksmappe (placeholder foreløpig)
/anskaffelser/[id]/kvalifisering  → arbeidsflate
/anskaffelser/[id]/evaluering     → arbeidsflate
/anskaffelser/[id]/evaluering/ny  → setup
/anskaffelser/[id]/protokoll      → arbeidsflate
```

Konkret:
- `src/frontend/src/routes/+page.ts` — redirect → `/anskaffelser`
- Flytt `kvalifisering/`, `evaluering/`, `protokoll/` inn under `anskaffelser/[id]/`
- Opprett `anskaffelser/[id]/+page.svelte` — saksmappen (placeholder)
- Opprett `anskaffelser/[id]/+layout.svelte` — top-nav med breadcrumbs (gjenbruk fra KOE `[prosjektId]/+layout.svelte`)

### 2. Erstatt sidebar med top-nav

Fjern nåværende sidebar-navigasjon i `+layout.svelte`. Erstatt med minimal top-nav (breadcrumbs + brukerinfo) fra KOE-appen sin `[prosjektId]/+layout.svelte`.

Root layout (`+layout.svelte`): Bare CSS-import + children (som KOE). Navigasjon flyttes til `anskaffelser/[id]/+layout.svelte` med breadcrumbs.

### 3. Kopier saksoversikt-komponenter fra KOE

Kopier og tilpass fra `/tmp/endringsmeldinger/src/lib/components/saksoversikt/`:
- `Saksoversikt.svelte`
- `SakRow.svelte`
- `TidslinjeCanvas.svelte`
- `NodeCluster.svelte`
- `SakPanel.svelte` (høyrepanel)
- `OversiktSidebar.svelte`

Fra `/tmp/endringsmeldinger/src/lib/components/case-list/`:
- `CaseListTable.svelte`
- `CaseListRow.svelte`

Fra `/tmp/endringsmeldinger/src/lib/utils/`:
- `tidslinje.ts`

### 4. Tilpass til anskaffelsesdomenet

- Endre typer: `SporHendelseType` fra `'K' | 'V' | 'F'` til `'U' | 'K' | 'F' | 'S' | 'T' | 'E' | 'P'`
- Endre fargekoding per nodetype (U=ghost, K=secondary, F=amber, S=grønn/rose, T=amber, E=grønn, P=full)
- Tilpass `OversiktSidebar` — endre filtreringsknapper, nøkkeltall, prosjektidentitet
- Tilpass `SakPanel` — fase-oversikt istedenfor K/V/F-krav
- Tilpass `CaseListTable` — kolonner for anskaffelser (ID, Navn, Status, Leverandører, Fase, Siste aktivitet)
- Mock-data: `mockAnskaffelser` med realistiske norske anskaffelser

### 5. Koble `/anskaffelser` til saksoversikt

`anskaffelser/+page.svelte` — erstatt nåværende tabellvisning med Saksoversikt-komponent (tidslinje + tabell toggle). Sidebar med filtreringsknapper, visningstoggle, nøkkeltall.

### 6. Fjern Tooltip-avhengighet

KOE bruker `bits-ui` for Tooltip. Fjern denne avhengigheten — bruk native title eller dropp tooltips i første omgang.
