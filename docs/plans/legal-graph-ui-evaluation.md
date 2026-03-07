# Juridisk grafverktøy — teknologi- og designvurdering

*Utarbeidet 2026-03-07*

---

## 1. Teknologivalg frontend: React vs. Svelte

### Utgangspunkt: dere har allerede et Svelte 5-system

Prosjektet bruker SvelteKit 2 med Svelte 5 runes, et modent designsystem («Analysebordet»), og en veletablert store-arkitektur med `$state`/`$derived`-kjeder. Å bytte til React for grafverktøyet innebærer enten:

- **Ny separat React-app** — dobbelt vedlikehold, to byggsystemer, duplisert designsystem
- **Mikrofrontend** — uforholdsmessig kompleksitet for et enpersons-prosjekt

Å ta et reelt valg her krever derfor at avveiningen veier grafbibliotek-økosystemet i React tungt nok til å rettferdiggjøre kostnaden ved å forlate det eksisterende systemet.

### Grafbiblioteker — økosystemforskjeller

| Dimensjon | React | Svelte |
|-----------|-------|--------|
| Cytoscape.js | Wrapper (`react-cytoscapejs`), modent | Direkte DOM-montering, ingen wrapper nødvendig |
| Sigma.js / Graphology | `react-sigma` finnes | Direkte montering, fungerer like godt |
| D3-force | Idiomatisk med React (refs + useEffect) | Idiomatisk med Svelte (bind:this + onMount) |
| Reagraph (Three.js/WebGL) | React-native, kun React | Ikke tilgjengelig |
| Cosmos (GPU-basert) | Framework-agnostisk | Framework-agnostisk |

**Realiteten:** De relevante grafbibliotekene (Cytoscape, Sigma, D3) er alle vanilla JS-biblioteker som monteres på et DOM-element. Wrappers i React gir marginalt bedre ergonomi, men introduserer et ekstra abstrasjonslag som kan gjøre finjustering vanskeligere. Svelte sin direkte DOM-tilgang (`bind:this`) gir like ren integrasjon.

**Reagraph** er det eneste biblioteket som krever React. Det er WebGL-basert (Three.js) og håndterer store grafer godt, men 3D-rendering er feil paradigme for et juridisk arbeidsverktøy — jurister trenger lesbarhet og presisjon, ikke romlig navigering.

### Ytelse ved dynamisk ekspansjon

Svelte 5 sin kompilator-baserte reaktivitet har en fordel her. Når nye noder legges til grafen, oppdateres kun de berørte deriverte verdiene. React sin virtuelle DOM må differe hele treet. For denne typen applikasjon — der state er komplekst og mutasjoner er inkrementelle — er Svelte sin fine-grained reaktivitet en reell fordel.

### State management

Den eksisterende store-arkitekturen (class-basert singleton med `$state`/`$derived`) er direkte overførbar til grafstate. En `LegalGraphStore` med samme mønster som `EvaluationStore` ville håndtere:

```
$state: nodes, edges, activeFilters, selectedNodeId, expansionHistory
$derived: visibleNodes, visibleEdges, nodeStyles, edgeStyles, clusterAssignments
```

React-ekvivalenten ville kreve Zustand/Jotai + useMemo + useCallback-orkestrering — mer kode, mer boilerplate, flere steder å gjøre feil.

### Vedlikehold

Med én utvikler er teknologihomogenitet avgjørende. Å introdusere React betyr å vedlikeholde to mentale modeller, to byggsystemer, to testrammeverk. Det er en konstant driftskostnad som ikke reduseres over tid.

### Vurdering

React har et bredere økosystem for grafvisualisering, men fordelen er smalere enn den ser ut. De tunge bibliotekene (Cytoscape, Sigma, D3) fungerer like godt i begge rammeverk. Den eneste reelle React-eksklusive gevinsten er Reagraph, som er feil verktøy for dette domenet.

**Svelte er riktig valg her** — ikke fordi det er teknisk overlegen i et vakuum, men fordi kostnaden ved å forlate det eksisterende systemet overstiger enhver marginal fordel React gir for grafvisualisering. Å bygge grafverktøyet som en ny rute i eksisterende SvelteKit-app (`/rettskilder` eller `/graf`) gir gjenbruk av designsystem, tokens, layoutkomponenter og deploy-pipeline uten ekstra kompleksitet.

---

## 2. Graf-renderingsbibliotek

### Kandidater vurdert mot kravene

Kravene er: 300+ noder, hierarkisk layout, inkrementell ekspansjon med stabilitet, klikk/hover-interaksjon, visuell differensiering av nodetyper.

#### Cytoscape.js

| Egenskap | Vurdering |
|----------|-----------|
| **Skalering** | Godt til ~5.000 noder (canvas-basert). 300 noder er komfortabelt. |
| **Layout** | Rikest utvalg: `dagre` (hierarkisk DAG), `cose-bilkent` (compound/clustered force), `klay` (ELK-basert lagdelt), `fcose` (rask constraint-basert). |
| **Inkrementell ekspansjon** | `layout.run()` kan kjøres på subset. `animate: true` gir smooth overgang. `fit: false` forhindrer viewport-reset. Eksisterende noder kan «låses» med `node.lock()`. |
| **Interaktivitet** | Rikt event-system (tap, mouseover, cxttap). Extensions for context menu, tooltips, expand-collapse. |
| **Svakheter** | API-overflaten er stor og imperativer (jQuery-inspirert). Styling via «stylesheets» (ikke CSS, men Cytoscape-spesifikt format). Dokumentasjonen er omfattende men ujevn. |
| **Bundelstørrelse** | ~400 KB minified + layoutalgorithmer (~50–150 KB hver). |

**Vurdering:** Sterkeste kandidaten for dette bruksområdet. Har de nødvendige layout-algoritmene og den beste inkrementelle ekspansjonsstøtten. Compound nodes (noder som inneholder andre noder) egner seg for lovstruktur-klynger.

#### Sigma.js + Graphology

| Egenskap | Vurdering |
|----------|-----------|
| **Skalering** | WebGL-basert, håndterer 10.000+ noder. Overkill for 300, men fremtidssikkert. |
| **Layout** | Graphology har `forceAtlas2` og `noverlap`, men mangler hierarkiske layouter out-of-the-box. Krever manuell posisjonering eller eksternt layout-bibliotek (f.eks. dagre separat). |
| **Inkrementell ekspansjon** | Graphology er en ren grafdata-struktur med fine events (`nodeAdded`, `edgeAdded`). Layout må re-trigges manuelt. Ingen innebygd lock-mekanisme. |
| **Interaktivitet** | Klikk, hover, drag — men tilpasning av node-rendering krever custom WebGL shaders (for avanserte former). |
| **Svakheter** | Hierarkisk layout må bygges selv. Node-rendering er begrenset til sirkler/labels med standard-rendereren; custom former krever shader-programmering. |

**Vurdering:** Best for massive grafer (10K+) der ytelse er kritisk. For 300-1000 noder med krav om hierarkisk layout og rik visuell differensiering er det for lavnivå. Mengden custom kode som kreves for layout og rendering undergraver tidsbesparelsen.

#### D3-force

| Egenskap | Vurdering |
|----------|-----------|
| **Skalering** | SVG-basert som standard: praktisk grense ~500 noder. Canvas-rendering mulig men krever mer kode. |
| **Layout** | Kun force-directed. Hierarkisk layout krever `d3-hierarchy` (tree/cluster), men det er et separat konsept — ikke integrert med force-simulering. |
| **Inkrementell ekspansjon** | Force-simuleringen kan «gjenopptas» med nye noder, men eksisterende noder vil alltid flytte seg (kraften rebalanserer). Å fiksere noder krever manuell `fx`/`fy`-setting. |
| **Interaktivitet** | Full kontroll (det er bare SVG/Canvas), men alt må bygges manuelt. |
| **Svakheter** | Ikke et grafbibliotek — det er et visualiseringsverktøy. Ingen graf-spesifikke abstraksjoner (node selection, edge bundling, compound nodes). Alt over grunnleggende force-layout er custom kode. |

**Vurdering:** Maksimal kontroll, maksimal arbeidsmengde. Riktig valg for en visualiseringsekspert som vil bygge noe unikt. Feil valg for et enpersons-prosjekt som trenger et fungerende grafverktøy raskt. Risikoen er at du ender med å bygge ditt eget Cytoscape — dårligere.

#### Reagraph

Krever React. Eliminert av teknologivalget. WebGL/3D er dessuten feil paradigme — jurister trenger en 2D-arbeidsflate, ikke et 3D-rom å navigere i.

#### ELK (Eclipse Layout Kernel) via elkjs

Ikke et renderingsbibliotek, men en ren layout-motor. Kan kombineres med Cytoscape (`cytoscape-elk`) eller brukes direkte med SVG/Canvas. Relevant fordi ELK har de beste hierarkiske layout-algoritmene (layered, stress, force) og støtter inkrementell layout med posisjonshints. Aktuell som layout-backend for Cytoscape.

### Anbefaling

**Cytoscape.js** er den klare vinneren for dette bruksområdet:

1. **Layoutbredde:** dagre/klay/cose-bilkent dekker alle behov (hierarkisk, clustered, force)
2. **Inkrementell ekspansjon:** `node.lock()` + subset-layout er nøyaktig det som trengs
3. **Modenhetsgrad:** 10+ år, aktivt vedlikeholdt, brukt i bioinformatikk (lignende grafdrevet domene)
4. **Extensions:** `cytoscape-expand-collapse`, `cytoscape-context-menus`, `cytoscape-popper` (tooltips)
5. **Skalering:** Komfortabel til 5.000 noder — godt over behovet

Vurder `cytoscape-elk` for layout-beregning dersom dagre/klay ikke gir god nok hierarkisk struktur. ELK sin layered-algoritme er den sterkeste for DAG-layout.

---

## 3. Interaksjonsdesign — de vanskelige problemene

### 3.1 Progressiv ekspansjon vs. full graf

**Problemet:** En traversal fra §5-2 med dybde 2 gir potensielt 200+ noder. Full graf fra start er kognitivt overbelastende og visuelt ubrukelig.

**Anbefalt løsning: Seed + 1-klikk-ekspansjon med automatisk clustering**

1. **Startvisning:** Seed-noden(e) vises med sine direkte naboer (dybde 1). Dette gir typisk 10-30 noder — håndterbart.

2. **Ekspansjon:** Klikk på en node viser et badge med antall skjulte naboer (`+12`). Klikk på badget ekspanderer nabonodene. Ekspanderte noder grupperes visuelt rundt foreldrenoden med `cose-bilkent` compound layout.

3. **Automatisk clustering:** Noder grupperes per type:
   - Lovparagrafer fra samme lov → compound node («FOA kap. 16»)
   - KOFA-saker fra samme år/sakstype → visuell klynge
   - EU-dommer → egen region i layoutet

4. **Collapse:** Dobbeltklikk på en compound node kollapser den tilbake til en enkelt node med teller.

**Hvorfor ikke dybdebasert slider:** En «dybde 1/2/3»-slider er intuitiv men problematisk — den antyder at dybde er en meningsfull juridisk kategori, noe det ikke er. En sak på dybde 3 kan være mer relevant enn en på dybde 1. Manuell ekspansjon tvinger juristen til å gjøre bevisste valg om hvilke grener som er verdt å følge — noe som er kjernen i rettskildeanalyse.

**Cytoscape-implementering:**
```
// Pseudokode for ekspansjon
function expandNode(nodeId) {
  const existing = cy.nodes().map(n => n.id())
  const newData = await fetchNeighbors(nodeId) // API-kall
  const newNodes = newData.filter(n => !existing.includes(n.id))

  cy.add(newNodes) // Legg til nye noder
  existingNodes.forEach(n => n.lock()) // Lås eksisterende posisjoner

  cy.layout({
    name: 'cose-bilkent',
    fit: false,
    animate: true,
    animationDuration: 300,
    // Kun nye noder layoutes
    nodeDimensionsIncludeLabels: true
  }).run()

  existingNodes.forEach(n => n.unlock())
}
```

### 3.2 Layout-stabilitet

**Problemet:** Når nye noder legges til, skal eksisterende noder ikke flytte seg.

**Løsning med Cytoscape:**

1. **`node.lock()`** — Låser en nodes posisjon. Layoutalgoritmen respekterer dette. Lås alle eksisterende noder før re-layout.

2. **Subset-layout:** Cytoscape tillater å kjøre layout på kun nye noder:
   ```
   cy.layout({
     name: 'cose-bilkent',
     fit: false,
     boundingBox: { x1: parentX - 200, y1: parentY - 200, ... }
   }).run()
   ```

3. **Kostnaden:** Layout-kvaliteten degraderes over tid. Etter 5-6 ekspansjoner vil grafen se «organisk vokst» ut — nye noder klumper seg rundt ekspansjonspunktene. Dette er en akseptabel tradeoff: alternativet (full re-layout) er desorienterende.

4. **Escape valve:** En «Reorganiser layout»-knapp som kjører full re-layout med animasjon. Juristen bruker denne når grafen blir rotete, men beholder kontroll over når det skjer.

**Viktig:** Sigma.js har ingen innebygd posisjonslåsing. D3-force krever manuell `fx`/`fy`-setting og force-rebalansering. Cytoscape sin `lock()`-mekanisme er den reneste løsningen.

### 3.3 Filtrering uten tap av kontekst

**Problemet:** Filtre skal dimme noder, ikke fjerne dem.

**Løsning:**

1. **Opacity-basert filtrering:** Filtrerte noder får `opacity: 0.15`, kanter `opacity: 0.08`. De er fortsatt synlige som «spøkelser» — juristen ser at noe finnes der, men visuell vekt reduseres drastisk.

2. **Interaksjon bevares:** Dimmede noder kan fortsatt klikkes (de er ikke disabled). Klikk åpner detaljer i høyrepanelet og viser en «Filteret skjuler denne» melding.

3. **Cytoscape-implementering:**
   ```
   // Dimming via klasser
   cy.nodes().forEach(node => {
     if (!matchesFilter(node.data(), activeFilters)) {
       node.addClass('dimmed')
     } else {
       node.removeClass('dimmed')
     }
   })

   // I Cytoscape stylesheet:
   // { selector: '.dimmed', style: { opacity: 0.15 } }
   // { selector: '.dimmed:selected', style: { opacity: 0.6 } }
   ```

4. **Filterindikator:** En teller i filterpanelet: «Viser 47 av 183 noder» — gir juristen oversikt over filtreringsgrad.

5. **«Vis kun aktive»-toggle:** For tilfeller der juristen vil ha et rent bilde. Denne skjuler dimmede noder helt, men er opt-in.

### 3.4 Nodetype-differensiering

**Problemet:** Fem nodetyper med ulik rettslig autoritetsvekt må kommuniseres visuelt uten kognitiv overbelastning.

**Anbefalt visuelt system:**

| Nodetype | Form | Farge (fra designsystemet) | Størrelse |
|----------|------|---------------------------|----------|
| Lovparagraf | Rektangel (avrundet) | `--color-vekt` (amber) | Fast |
| KOFA-sak | Sirkel | `--color-ink-secondary` | Skalert etter sentralitetsscore |
| EU-dom | Diamant (rotert firkant) | `--color-score-high` (grønn) | Fast |
| Norsk rettsavgjørelse | Sirkel med dobbel kant | `--color-ink` | Fast |
| Forarbeid | Firkant (ikke avrundet) | `--color-ink-muted` | Fast |

**Prinsipper:**
- **Form er primærsignal** — det er det eneste som fungerer for fargeblinde og i print. Fem distinkte former er på grensen; mer ville vært for mye.
- **Farge er sekundærsignal** — forsterker form, men bærer ikke informasjonen alene.
- **Størrelse er reservert for ett datadimensjon:** sentralitetsscore. Kun KOFA-saker varierer i størrelse (de er den vanligste nodetypen og har citation count). Andre nodetyper har fast størrelse.
- **Amber for lovparagrafer** følger designsystemets «vektlinje»-prinsipp — lovteksten er tyngdepunktet i analysen.
- **Etiketter:** KOFA-saker viser saksnr (`2020/123`), lovparagrafer viser `§ 16-10`, EU-dommer viser kortnavn (`C-27/15`). Etiketter skrives i JetBrains Mono (data-font fra designsystemet).

**Tegnforklaring:** Fast plassert, alltid synlig. Ikke en popup — den er del av verktøylinjen over grafen. Fem symboler med navn, én linje. Juristen skal aldri måtte huske hva en form betyr.

### 3.5 Høyrepanelet — nodetype-avhengig innhold

**Anbefaling: Én panelkomponent med betinget innhold, ikke separate komponenter.**

Begrunnelse:
1. Panelet har felles ramme-elementer uavhengig av nodetype: header (type-ikon + identifikator), lukkeknapp, navigasjonshistorikk (tilbake/frem mellom valgte noder).
2. Innholdet varierer, men mønsteret er likt: metadata-tabell + tekstblokk + relaterte lenker + annotasjoner.
3. Separate komponenter ville duplisert layout-logikk og gjort konsistent styling vanskeligere.

**Struktur:**

```svelte
<NodeDetailPanel>
  <!-- Felles header -->
  <PanelHeader {nodeType} {nodeId} />

  <!-- Betinget innhold -->
  {#if nodeType === 'kofa_case'}
    <KofaCaseDetail {data} />
  {:else if nodeType === 'law_section'}
    <LawSectionDetail {data} />
  {:else if nodeType === 'eu_case'}
    <EuCaseDetail {data} />
  {:else if nodeType === 'court_case'}
    <CourtCaseDetail {data} />
  {:else if nodeType === 'preparatory_work'}
    <PreparatoryWorkDetail {data} />
  {/if}

  <!-- Felles annotasjonsseksjon -->
  <AnnotationSection {annotations} {confidenceThreshold} />

  <!-- Felles: relaterte noder (klikkbare, navigerer i grafen) -->
  <RelatedNodes {connectedNodes} on:navigate />
</NodeDetailPanel>
```

**Innhold per type:**

| Nodetype | Primærinnhold | Sekundærinnhold |
|----------|---------------|-----------------|
| KOFA-sak | Saksnr, dato, sakstype, utfall, sammendrag | Lovhenvisninger (klikkbare), siterte saker, lenke til KOFA |
| Lovparagraf | Ordlyd (full paragraftekst) | Direktivgrunnlag, forarbeidskommentar, endringshistorikk |
| EU-dom | Case-navn, direktivartikkel | Norsk oppsummering, sitert av KOFA-saker (klikkbare) |
| Rettsavgjørelse | Domstol, dato, saksnr | Sammendrag, KOFA-saker som siterer |
| Forarbeid | Dokumenttype, referanse | Relevant utdrag, tilknyttede paragrafer |

**Annotasjoner** vises som en egen seksjon under innholdet — konsistent på tvers av nodetyper. Viser confidence-score med fargekoding etter designsystemets score-terskelmodell (≥7 grønn, ≥4 nøytral, <4 rosa).

---

## 4. Backend-arkitektur: FastAPI vs. Supabase Edge Functions

### Hva backenden faktisk gjør

Backenden er en tynn proxy med tre oppgaver:
1. **Autentisering** — verifisere JWT, generere session_id
2. **Query-kompilering** — oversette frontend-parametere til Postgres-queries (recursive CTEs, vektorsøk)
3. **Resultatformatering** — transformere Postgres-rader til graf-JSON

Tung beregning (traversal, FTS, vektorsøk) skjer i Postgres. Backenden er ikke compute-intensiv.

### FastAPI (Python)

| Fordel | Ulempe |
|--------|--------|
| Eksisterende Python-kompetanse i prosjektet | Ny tjeneste å deploye (eller integrere i Flask-appen) |
| Pydantic for query-validering | Ekstra container på Cloud Run (med mindre integrert i Flask) |
| Supabase Python SDK finnes | Python async er mer komplekst enn Deno |
| Kan gjenbruke `ArtifikClient`/`DoffinClient` | |

**Integrasjonsalternativ:** Ikke nødvendigvis FastAPI som separat tjeneste. Et nytt Flask blueprint (`/api/graph/`) i den eksisterende appen kan være tilstrekkelig. Flask 2.x støtter async views, og `supabase-py` fungerer fint. Dette unngår en ny deploy-target.

### Supabase Edge Functions (Deno/TypeScript)

| Fordel | Ulempe |
|--------|--------|
| Null deploy-overhead (Supabase-hosted) | TypeScript i backend, Python i resten — to språk |
| Direkte Postgres-tilgang (ingen SDK-overhead) | Begrenset CPU-tid (150 ms wallclock per invokasjon) |
| Automatisk skalering, ingen container-vedlikehold | Debugging er vanskeligere (Deno runtime, Supabase logs) |
| RLS fungerer direkte | Kan ikke gjenbruke Python-kode |
| | 2 MB bundle-limit |

**Kritisk begrensning:** Edge Functions har en hard grense på 150 ms CPU-tid (ikke wallclock — nettverksventetid teller ikke). For en recursive CTE med 3 nivåer dybde + vektorsøk + FTS kan dette bli for stramt. Supabase anbefaler selv at tunge queries kjøres via `supabase-js` direkte fra klienten med RLS, ikke via Edge Functions.

### Vurdering

**Anbefaling: Nytt Flask blueprint i eksisterende app.**

Begrunnelse:
1. **Ingen ny tjeneste:** Grafverktøyet er del av samme produkt som evalueringsverktøyet. Samme Flask-instans, samme Cloud Run-container, samme deploy-pipeline.
2. **Gjenbruk:** `supabase-py` for database-tilgang, eksisterende auth-mønstre, eksisterende feilhåndtering.
3. **Ingen 150 ms-begrensning:** Flask på Cloud Run har minuttlange timeouts. Recursive CTEs med dybde 3-4 kan ta 500 ms+ — uproblematisk.
4. **Én person drifter dette:** Hver ny tjeneste er vedlikeholdsbyrde. Et blueprint er én Python-fil.

Dersom ytelseskrav endrer seg (f.eks. millisekunders responstid for auto-complete i søk), kan en Edge Function brukes som cache-lag foran Flask. Men ikke som primær backend.

**Supabase Realtime** for annotasjonsstemmer er derimot en god kandidat — RLS + websockets uten egen implementasjon. Dette er ikke backend-arkitektur, men en vertikal feature som bruker Supabase sine styrker direkte.

---

## 5. Største risikoer — vanskelig reverserbare designbeslutninger

### Risiko 1: Grafbibliotek-valget

**Hvorfor det er vanskelig å reversere:** Grafbiblioteket er ikke en «komponent» som kan byttes ut — det er en arkitektonisk avhengighet. Layout-logikk, event-håndtering, styling, animasjoner, inkrementell ekspansjon — alt er tett koblet til bibliotekets API. Å bytte fra Cytoscape til Sigma (eller omvendt) betyr å skrive om hele grafvisualiseringen fra scratch.

**Den spesifikke risikoen:** Cytoscape sin canvas-rendering gjør tekst-rendering begrenset. Hvis det viser seg at jurister trenger rik tekst i noder (f.eks. korte utdrag fra sakstekst direkte i grafen), er Cytoscape feil verktøy. SVG-baserte alternativer (D3, eller en hybrid tilnærming) håndterer tekst bedre, men mister skaleringsfordelene.

**Mitigering:** Bygg en prototype med Cytoscape og 50-100 reelle noder fra databasen. Test med én jurist. Vurder om informasjonstettheten i grafen er tilstrekkelig, eller om juristen trenger mer kontekst direkte i nodene. Gjør dette *før* du bygger ekspansjonslogikk, filtrering og annotasjoner.

### Risiko 2: Grafens datamodell i frontend

**Hvorfor det er vanskelig å reversere:** Hvordan noder og kanter representeres i frontend-state bestemmer hva som er mulig å bygge ovenpå. Feil modell betyr at features som annotasjoner, filtrering, undo/redo og eksport krever refaktorering av kjernemodellen.

**Den spesifikke risikoen:** Å modellere grafen som en flat liste av noder og kanter (slik Cytoscape forventer input) uten en rikere applikasjonsmodell. Cytoscape har sin egen interne graf-representasjon, men den er optimalisert for rendering, ikke for domenelogikk. Du trenger en separat domenemodell (à la Graphology) som holder rettslig metadata, annotasjoner, ekspansjonshistorikk, og filter-state — og synkroniserer til Cytoscape for rendering.

**Mitigering:**

```
LegalGraphStore ($state)     →  synkroniserer  →  Cytoscape (rendering)
├── nodes: Map<id, LegalNode>                     cy.add() / cy.remove()
├── edges: Map<id, LegalEdge>                     cy.style()
├── annotations: Map<id, Annotation[]>
├── filters: FilterState
├── expansionHistory: string[][]
└── selectedNodeId: string | null
```

Hold domenemodellen som «source of truth» i en Svelte-store. Cytoscape er kun view-laget. Endringer går alltid gjennom storen, aldri direkte i Cytoscape.

### Risiko 3: Jurister forstår ikke grafvisualisering

**Hvorfor det er vanskelig å reversere:** Hvis hele produktkonseptet — «navigerbar rettskildegraf» — viser seg å være feil grensesnitt for målgruppen, er det ikke et teknisk problem som kan fikses med bedre biblioteker eller smartere layout. Det er et konseptuelt problem som krever et helt annet UI-paradigme.

**Den spesifikke risikoen:** Jurister er tekstmennesker. Deres verktøy er dokumenter, tabeller, fotnoter, referanselister. En interaktiv graf er et fundamentalt annerledes paradigme. Risikoen er ikke at grafen er teknisk dårlig — den er at jurister ikke har den mentale modellen for å bruke den produktivt.

Bioinformatikk (Cytoscape sin kjernbrukermasse) fungerer fordi forskere er vant til nettverksvisualisering. Juridisk metode har ingen slik tradisjon.

**Mitigering:**
- **Supplement, ikke erstatning:** Grafen bør alltid ha en parallell listevisning. En tabell med KOFA-saker sortert etter sentralitetsscore, med klikkbare lovhenvisninger, er en mer gjenkjennelig arbeidsflate for jurister. Grafen er en «avansert visning» — ikke standardvisningen.
- **Onboarding via kjente mønstre:** Start med seed-noden og en tabell over direkte naboer (lik et søkeresultat). Grafen vises først når juristen aktivt velger å «se sammenhenger visuelt».
- **Bygg listevisningen først.** Den er nyttig uansett, lavere teknisk risiko, og gir umiddelbar verdi. Grafvisualiseringen er et tillegg som kan bygges iterativt.

---

## 6. Samlet anbefaling — prioritert implementeringsrekkefølge

1. **Liste/tabell-visning av grafdata** — Seed → API-kall → tabell med noder sortert etter relevans. Filtrerbar, klikkbar. Høyrepanel med detaljer. Dette gir umiddelbar verdi og validerer datagrunnlaget.

2. **Cytoscape-prototype** — Enkel grafvisning av samme data. 50-100 noder, dagre-layout, klikk for detaljer. Ingen ekspansjon ennå. Test med reell bruker.

3. **Inkrementell ekspansjon** — Klikk-for-å-ekspandere med `node.lock()` og subset-layout. Compound nodes for lovstruktur-klynger.

4. **Filtrering og dimming** — Opacity-basert filtrering. Filterpanel i venstre sidebar.

5. **Annotasjoner** — Sist, fordi det krever at graf-traversal, ekspansjon og filtrering allerede fungerer. Annotasjoner er en lag oppå en fungerende graf, ikke en forutsetning.

Hver steg er uavhengig deploybar og gir verdi alene. Steg 1 kan bygges på noen dager. Steg 2-3 krever mer arbeid, men kan avbrytes uten at steg 1 blir bortkastet.
