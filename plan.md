# Plan: Rutestruktur, nav-bar og kontrollbord

## Oversikt

Omstrukturere frontend fra flat navigasjon til progressiv tre-nivå-struktur, gjenbruke saksoversikt-komponenter fra KOE-appen. Bruker ekte API-data fra Artifik/Doffin — ingen mock-data.

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
- Opprett `anskaffelser/[id]/+layout.svelte` — top-nav med breadcrumbs (gjenbruk fra KOE)

### 2. Erstatt sidebar med top-nav

Fjern nåværende sidebar-navigasjon i `+layout.svelte`. Erstatt med minimal root layout (bare CSS-import + children, som KOE).

Navigasjon flyttes til `anskaffelser/[id]/+layout.svelte` med breadcrumbs + brukerinfo.

### 3. Kopier saksoversikt-komponenter fra KOE

Kopier og tilpass fra `/tmp/endringsmeldinger/src/lib/components/saksoversikt/`:
- `Saksoversikt.svelte`, `SakRow.svelte`, `TidslinjeCanvas.svelte`, `NodeCluster.svelte`
- `SakPanel.svelte` (høyrepanel), `OversiktSidebar.svelte`

Fra `/tmp/endringsmeldinger/src/lib/components/case-list/`:
- `CaseListTable.svelte`, `CaseListRow.svelte`

Fra `/tmp/endringsmeldinger/src/lib/utils/`:
- `tidslinje.ts`

### 4. Tilpass til anskaffelsesdomenet

- Endre typer: `HendelseType` fra `'K' | 'V' | 'F'` til `'U' | 'K' | 'F' | 'S' | 'T' | 'E' | 'P'`
- Endre fargekoding per nodetype (U=ghost, K=secondary, F=amber, S=grønn/rose, T=amber, E=grønn, P=full)
- Tilpass `OversiktSidebar` — filtreringsknapper, nøkkeltall, prosjektidentitet
- Tilpass `SakPanel` — faseoversikt istedenfor K/V/F-krav
- Tilpass `CaseListTable` — kolonner: ID, Navn, Prosedyre, Terskel, Frist, Status

### 5. API-integrasjon (ingen mock-data)

Kontrollbordet bruker ekte API-data:
- `/api/procurements/mature` for anskaffelsesliste (samme mønster som protokoll-siden)
- `/api/procurements/<id>/activities` for tidslinjehendelser

Mapping-funksjon som oversetter Artifik-aktivitetstyper til tidslinjenoder (U/K/F/S/T/E/P). Aktivitetsdata kan være begrenset — start med det som finnes, utvid etterhvert.

### 6. Koble `/anskaffelser` til saksoversikt

`anskaffelser/+page.svelte` — erstatt nåværende tabellvisning med Saksoversikt-komponent (tidslinje + tabell toggle). OversiktSidebar med filtreringsknapper og visningstoggle.

### 7. Fjern Tooltip-avhengighet

KOE bruker `bits-ui` for Tooltip. Bruk native title eller dropp tooltips i første omgang.
