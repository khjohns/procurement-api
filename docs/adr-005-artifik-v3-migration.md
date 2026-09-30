# ADR-005: Migreringsstrategi og arkitektur for Artifik External API v3

**Status:** Foreslått  
**Dato:** 2026-09-30  
**Forfatter:** Kasper H. Johns / AI Pair Programmer  
**Kontekst:** Oppgradering fra v2 til v3 av Artifik External API for anskaffelser, kontrakter og protokollgenerering  

---

## 1. Sammendrag og beslutning

Artifik External API v3 introduserer fullstendig normalisert `camelCase`, strukturerte CPV-objekter (`{ mainCPV, additionalCPV }`), standardisert organisasjonsnummer (`orgNumber` fremfor `national_id`), samt støtte for direkte berikelse av team og internrapportering på listeendepunkter (`includeTeam=true`, `includeInternalReporting=true`). 

I dag konsumerer applikasjonen Artifik External API v2, som returnerer rå databasekolonner i en hybrid blanding av `snake_case` og `camelCase`. Dette skaper inkonsistens i frontend-typer, feilutsatt felthåndtering i protokollgeneratorene og hindrer utnyttelse av moderne API-funksjoner.

**Beslutning:** Vi beslutter en **gradvis 4-trinns migreringsstrategi** basert på robusthetsprinsippet:
1. **Fase 1 (Resilient parsing):** Backend-moduler (`src/protokoll/` og `src/app/api/`) oppdateres med bakoverkompatible fallback-parsere som aksepterer både v3- og v2-feltnavn (`proc.get("estimatedValue") or proc.get("estimated_value")`).
2. **Fase 2 (Frontend-typer og kontrakter):** TypeScript-definisjoner oppdateres til rene v3 camelCase-typer (`ContractItem`, `ProcurementV3`), og kontraktvisningen i `/avtaler` migreres til `durationStart`/`durationEnd`.
3. **Fase 3 (Aktivering av v3-klient):** `ArtifikClient` settes til standard v3 via `/external/v3/*` eller `x-api-version: 3`-headeren, og listeberikelse tas i bruk for å erstatte parallelle enkeltkall.
4. **Fase 4 (Sanering):** Gamle v2-fallbacks og overgangslogikk saneres når systemet kjører stabilt på v3.

Denne strategien eliminerer nedetid, krever ingen koordinert «big bang»-deploy og sikrer at eksisterende protokollgenerering og frontend forblir 100 % operasjonelle under hele migreringsløpet.

---

## 2. Kontekst og problemstilling

### 2.1 Hvorfor v3 finnes og hva Artifik spesifiserer

Artifik External API har historisk returnert data direkte fra interne databaserecords (v2). Dette medførte en rekke arkitektoniske svakheter:
- **Navnekaos (Hybrid casing):** En vilkårlig miks av `snake_case` (f.eks. `about_procurer`, `estimated_value`, `framework_agreement_involved`, `duration_start`) og `camelCase` (f.eks. `sequenceId`, `externalId`, `isCancelled`, `areAwardLettersSent`, `contractCategory`).
- **Inkonsistente identifikatorer:** Nasjonalt organisasjonsnummer ble eksponert som `national_id` i enkelte deler av datamodellen (`about_procurer`, `procurers`, `directAwardSupplier`), mens kontraktsmodulen benyttet `orgNumber`.
- **Ustrukturert og feilstavet CPV:** `cpv_codes` returnerte rå lister som også inneholdt historiske stavefeil fra lagringslaget (bl.a. `aditional_cpv` med én 'd'), uten klart skille mellom hoved-CPV og supplerende koder.
- **N+1 problem ved berikelse:** I v2 støttet listeendepunktene (`/procurements`, `/contracts`) ikke parametrene `includeTeam` og `includeInternalReporting`. Klienter måtte gjøre separate GET-kall per anskaffelse for å hente team og internrapportering.

Artifik v3 løser disse problemene:
- **Gjennomført camelCase:** Alle rotfelter og nøsterede felter i JSON-strukturen benytter `camelCase`.
- **Standardisert organisasjonsnummer:** `orgNumber` brukes konsekvent overalt i API-et.
- **Strukturert CPV:** `cpvCodes` returneres som et strukturert objekt: `{ mainCPV: string, additionalCPV?: string[] }`.
- **Høyere ytelse:** Listeendepunktene støtter `includeTeam=true` og `includeInternalReporting=true`, slik at teamroller og svar fra egendefinerte maler kan hentes i én enkelt spørring.

I henhold til Artifiks OpenAPI 3.0-spesifikasjon (`artifik-api-openapi-3.json`) kan v3 aktiveres enten via dedikerte v3-stier (`/external/v3/procurements`, `/external/v3/contracts`) eller ved å sende HTTP-headeren `x-api-version: 3`. Forespørsler uten eksplisitt versjonsvalg returneres som v2 for å sikre bakoverkompatibilitet for eksisterende integrasjoner.

### 2.2 Status quo i vårt repo

I vårt system konsumeres Artifik-data av fire hovedkomponenter:
1. **ArtifikClient (`src/app/client.py`):** Klienten har 17 hardkodede `/external/v2/*`-stier for autentisering, anskaffelser, kontrakter, avvik, organisasjoner, oppgaver og maler. MCP-serveren (`artifik_mcp`) eksponerer disse metodene direkte til LLM-agenter.
2. **Flask API Proxy (`src/app/api/__init__.py`):** Fungerer som mellomlag og cache for webgrensesnittet. Endepunkter som `/procurements/mature` leser v2-felter som `about_procurer`, `areAwardLettersSent` og `framework_agreement_involved`, og gjør parallelle trådede oppslag på hendelser.
3. **Protokollgenerator (`src/protokoll/`):** Generatorene (`docx_del2.py`, `docx_del3.py`, `markdown.py`, `common.py`) henter data fra `procurement`-dictionaryet. De forventer spesifikke `snake_case`-nøkler som `about_procurer.national_id`, `estimated_value`, `contracts_total_value_amount` og `framework_agreement_maximum_participants`.
4. **SvelteKit Frontend (`src/frontend/`):**
   - `lib/types/contract.ts`: `ContractItem` inneholder en uheldig blanding av camelCase-felter (`contractNumber`, `signingStatus`, `buyerOrgName`) og snake_case-felter (`duration_start`, `duration_end`, `duration_months`, `duration_days`). `ContractSupplierOrg` bruker allerede `orgNumber`.
   - `lib/utils/protokoll-info-rows.ts` og `meddelelse-generator.ts`: Leser direkte fra `about_procurer` (`national_id`, `contact_person`), `estimated_value` og `contracts_total_value_amount`.
   - `routes/anskaffelser/[id]/+page.svelte`: Parser `proc.cpv_codes` som en flat streng-array og faller tilbake på eForms-data.

Dersom vi bytter til v3 uten en gjennomtenkt migreringsarkitektur, vil alle protokollgenereringer, kontraktsvisninger og tildelingsberegninger feile momentant.

---

## 3. Detaljert feltsammenligning mellom v2 og v3

Tabellen nedenfor oppsummerer samtlige endringer i datamodellene som berører vårt system:

| Entitet / Område | v2 (Dagens databasekolonner) | v3 (Målarkitektur i API) | Typeendring / Beskrivelse |
|---|---|---|---|
| **Oppdragsgiver (objekt)** | `about_procurer` | `aboutProcurer` | Nøkkel endret fra snake_case til camelCase |
| **Oppdragsgiver org.nr.** | `about_procurer.national_id` | `aboutProcurer.orgNumber` | Standardisert til `orgNumber` |
| **Oppdragsgiver kontaktperson** | `about_procurer.contact_person` | `aboutProcurer.contactPerson` | Normalisert camelCase |
| **Oppdragsgiver postadresse** | `about_procurer.postal_address` | `aboutProcurer.postalAddress` | Normalisert camelCase |
| **Fellesanskaffelse (med-kjøpere)** | `procurers[].national_id` | `procurers[].orgNumber` | Standardisert til `orgNumber` |
| **Direkteanskaffelse leverandør** | `directAwardSupplier.national_id` | `directAwardSupplier.orgNumber` | Standardisert til `orgNumber` |
| **Klassifisering / CPV** | `cpv_codes: string[]` (inkl. `aditional_cpv`) | `cpvCodes: { mainCPV: string, additionalCPV?: string[] }` | Strukturert objekt; skiller hoved- og tilleggskoder, fjerner skrivefeil |
| **Estimert verdi** | `estimated_value: number` | `estimatedValue: number` | Normalisert camelCase |
| **Totalverdi anskaffelse** | `total_value: number` | `totalValue: number` | Normalisert camelCase |
| **Totalverdi tildelte kontrakter** | `contracts_total_value_amount: number` | `contractsTotalValueAmount: number` | Normalisert camelCase |
| **Rammeavtale indikator** | `framework_agreement_involved: boolean` | `frameworkAgreementInvolved: boolean` | Normalisert camelCase |
| **Rammeavtale maks deltakere** | `framework_agreement_maximum_participants: number` | `frameworkAgreementMaximumParticipants: number` | Normalisert camelCase |
| **Direkte tildeling hjemmelskode** | `direct_award_justification_code: string` | `directAwardJustificationCode: string` | Normalisert camelCase |
| **Direkte tildeling begrunnelse** | `direct_award_justification_reason: string` | `directAwardJustificationReason: string` | Normalisert camelCase |
| **Reservert konkurranse** | `reserved_procurement_code: string` | `reservedProcurementCode: string` | Normalisert camelCase |
| **EU-finansiering** | `euUnion_funds: boolean` | `euUnionFunds: boolean` | Normalisert camelCase |
| **Ytelsessted** | `performance_places: any[]` | `performancePlaces: any[]` | Normalisert camelCase |
| **Kontrakt startdato** | `duration_start: string` | `durationStart: string` | Normalisert camelCase i `ContractItem` og underavtaler |
| **Kontrakt sluttdato** | `duration_end: string` | `durationEnd: string` | Normalisert camelCase i `ContractItem` og underavtaler |
| **Kontrakt varighet måneder** | `duration_months: number` | `durationMonths: number` | Normalisert camelCase i `ContractItem` og underavtaler |
| **Kontrakt varighet dager** | `duration_days: number` | `durationDays: number` | Normalisert camelCase i `ContractItem` og underavtaler |
| **Malrespons-tabell** | `/external/v2/.../templates/{id}/responses` | `/external/v3/.../templates/{id}/responses` | Endepunkt flyttet til v3 for 2D-tabell (`columns` + `rows`) |
| **Autentiseringssjekk** | Ikke tilstede i v2 | `GET /external/v3/whoami` | Nytt endepunkt for verifisering av token og organisasjon |
| **Listeberikelse (team/rapportering)** | Ikke støttet på listeendepunkter | `/procurements?includeTeam=true&includeInternalReporting=true` | Støttet i v3 for lister over anskaffelser og kontrakter |

### Felter som forblir uendret (allerede camelCase i v2)
Det er verdt å merke seg at flere sentrale felter allerede var camelCase i v2 og forblir uendret i v3:
`id`, `name`, `description`, `sequenceId`, `externalId`, `procedure`, `threshold`, `regulation`, `currency`, `contractCategory`, `currentDeadline`, `isCancelled`, `cancelingReason`, `areAwardLettersSent`, `isTemplate`, `timeline`, `milestones`, `organizationId`.

---

## 4. Analyse av alternativer

Vi har vurdert tre strategiske tilnærminger til migreringen:

### Alternativ 1: Direkte «Big Bang»-migrering
Bytte alle API-stier i `ArtifikClient` til `/external/v3/*` eller sette `x-api-version: 3` globalt, og samtidig oppdatere samtlige forbrukere i backend, protokoll og SvelteKit frontend i én enkelt endring.

- **Fordeler:**
  - Ingen midlertidig wrapper- eller oversettelseskode.
  - Prosjektet har kun én datamodell å forholde seg til umiddelbart.
- **Ulemper / Risiko:**
  - Svært høy risiko: Feil i ett felt (f.eks. `contractsTotalValueAmount`) kan gjøre at protokollgenereringen krasjer i produksjon uten at det oppdages før en bruker eksporterer et Word-dokument.
  - Krever samtidig omskriving av titalls filer, enhetstester, test-fixtures og frontend-komponenter.
  - Svært krevende pull request å kode-reviewe forsvarlig.

### Alternativ 2: v3-adapter internt i `ArtifikClient` (Oversettelse til v2-arv)
`ArtifikClient` kaller v3-endepunktene, men inneholder et internt oversettelseslag som mapper responsene tilbake til v2 `snake_case` før de returneres til resten av applikasjonen.

- **Fordeler:**
  - Ingen endringer kreves umiddelbart i `src/protokoll/`, `src/app/api/` eller frontend.
  - Lav risiko for umiddelbare regresjoner.
- **Ulemper / Risiko:**
  - «Sementerer» teknisk gjeld: Systemet tvinges til å fortsette med feilstavede og inkonsistente feltnavn internt.
  - Frontend kan ikke utnytte forbedringene i v3 (som strukturert CPV eller `durationStart`).
  - Ytelsesstraff ved rekursiv deep-mapping av store JSON-responser.
  - Skaper et unødvendig abstraksjonslag som må vedlikeholdes.

### Alternativ 3: Gradvis migrering med fleksibel klient og robuste parsere (Anbefalt)
En firetrinns tilnærming:
1. **Robuste parsere i forbrukere:** Først oppdateres alle steder som leser Artifik-data til å støtte både v3- og v2-feltnavn via hjelpefunksjoner eller `dict.get()` med fallbacks.
2. **Typesikring i frontend:** Frontend definerer oppdaterte v3-typer og tilpasser komponenter til å håndtere både ny og gammel form.
3. **Aktivering av v3:** `ArtifikClient` oppgraderes til v3 med støtte for `x-api-version: 3`-header eller versjonsparameter.
4. **Sanering:** Etter en observasjonsperiode fjernes v2-fallbacks.

- **Fordeler:**
  - **Null risiko for nedetid:** Forbrukerne tolererer både v2 og v3 uavhengig av hvilket miljø eller cache dataene kommer fra.
  - Enkelt å verifisere steg for steg med eksisterende og nye tester.
  - Frontend og backend kan oppdateres uavhengig av hverandre.
  - Utnytter v3 fullt ut uten varig overhead.
- **Ulemper:**
  - Krever litt mer kode i en midlertidig overgangsperiode.

---

## 5. Beslutning og arkitektonisk løsningsdesign

Vi velger **Alternativ 3: Gradvis migrering med fleksibel klient og robuste parsere**.

### 5.1 Arkitektoniske prinsipper for migreringen

1. **Robusthetsprinsippet (Postel's Law):**
   *Vær liberal i hva du mottar, og konservativ i hva du sender.*
   Alle konsumerende funksjoner i protokollgeneratoren og API-proxyen skal hente feltverdier via robuste oppslag:
   ```python
   def get_estimated_value(p: dict) -> float | None:
       return p.get("estimatedValue") if "estimatedValue" in p else p.get("estimated_value")

   def get_procurer_org_number(procurer: dict) -> str:
       return procurer.get("orgNumber") or procurer.get("national_id") or ""
   ```

2. **Standardisering på camelCase i TypeScript-laget:**
   TypeScript-typene i frontend skal reflektere v3 som den kanoniske modellen. I `src/frontend/src/lib/types/contract.ts` fases `duration_start` ut til fordel for `durationStart`:
   ```typescript
   export interface ContractItem {
     id: number;
     name: string;
     durationStart?: string;
     durationEnd?: string;
     durationMonths?: number | null;
     durationDays?: number | null;
     // Legacy aliases markeres som deprecated i overgangsfasen
     /** @deprecated Bruk durationStart */
     duration_start?: string;
     /** @deprecated Bruk durationEnd */
     duration_end?: string;
     /** @deprecated Bruk durationMonths */
     duration_months?: number | null;
     /** @deprecated Bruk durationDays */
     duration_days?: number | null;
     // ...
   }
   ```

3. **Strukturert CPV-håndtering:**
   CPV-koder representeres i v3 som `{ mainCPV: string, additionalCPV?: string[] }`. Frontend og protokollgenerator skal ha en felles transformator som normaliserer både v2-lister og v3-objekter til en konsistent struktur:
   ```typescript
   export interface NormalizedCpv {
     main: string | null;
     additional: string[];
     all: string[];
   }

   export function normalizeCpv(raw: any): NormalizedCpv {
     if (!raw) return { main: null, additional: [], all: [] };
     if (typeof raw === 'object' && 'mainCPV' in raw) {
       const additional = Array.isArray(raw.additionalCPV) ? raw.additionalCPV : [];
       const main = raw.mainCPV || null;
       const all = main ? [main, ...additional] : additional;
       return { main, additional, all };
     }
     if (Array.isArray(raw)) {
       return { main: raw[0] || null, additional: raw.slice(1), all: raw };
     }
     return { main: null, additional: [], all: [] };
   }
   ```

4. **Konfigurerbar `ArtifikClient`:**
   `ArtifikClient` i `src/app/client.py` utvides med støtte for `api_version: int = 3` (standardverdi 3 når migrering aktiveres). Klienten sender `x-api-version`-header på alle kall, og oppdaterer URL-prefixer til `/external/v3/*` der det er definert i OpenAPI-spesifikasjonen.

---

## 6. Konsekvenser for delsystemer

### 6.1 Backend og MCP-server (`src/app/`, `src/artifik_mcp/`)
- **`ArtifikClient` (`src/app/client.py`):**
  - Legge til `api_version: int = 2` (innledningsvis 2, skiftes til 3 i Fase 3).
  - Oppdatere base-paths for `list_procurements`, `get_procurement`, `list_contracts`, `get_contract`, `get_template_responses` osv.
  - Implementere `whoami()` mot `/external/v3/whoami` for tilgangsverifisering.
  - Utvide `list_procurements` og `list_contracts` til å utnytte `includeTeam=True` og `includeInternalReporting=True` direkte i API-kallet.
- **Flask API Proxy (`src/app/api/__init__.py`):**
  - `/api/procurements/mature`: Oppdatere feltuttrekk til å håndtere `aboutProcurer` og camelCase.
  - Ytelsesgevinst: Kan hente team og internrapportering direkte i liste-kallet fremfor separate trådede kall.
- **MCP-verktøy:**
  - LLM-agenter får et ryddigere og mer forutsigbart JSON-skjema med standard camelCase.

### 6.2 Protokollgenerator (`src/protokoll/`)
- **`src/protokoll/common.py`:**
  - Sentralisere feltaksess for `procurement`-objekter slik at `docx_del2.py`, `docx_del3.py` og `markdown.py` deler samme robuste uttrekk.
- **`src/protokoll/docx_del2.py` & `docx_del3.py`:**
  - `procurer.get("orgNumber") or procurer.get("national_id")`
  - `proc.get("estimatedValue") or proc.get("estimated_value")`
  - `proc.get("contractsTotalValueAmount") or proc.get("contracts_total_value_amount")`
  - `proc.get("frameworkAgreementInvolved") or proc.get("framework_agreement_involved")`
  - `proc.get("directAwardJustificationCode") or proc.get("direct_award_justification_code")`
  - `proc.get("directAwardJustificationReason") or proc.get("direct_award_justification_reason")`
- **Verifikasjon:** Eksisterende Word-protokolltester og snapshot-tester verifiserer at output-dokumentene forblir 100 % identiske uansett om inndata er v2 eller v3.

### 6.3 SvelteKit Frontend (`src/frontend/`)
- **Datatyper (`src/frontend/src/lib/types/`):**
  - `contract.ts`: `ContractItem` oppdateres med `durationStart`, `durationEnd`, `durationMonths`, `durationDays`.
  - `anskaffelse.ts`: Oppdatere typer til å støtte strukturert CPV.
- **Komponenter og sider:**
  - `routes/avtaler/+page.svelte` og `ContractDrawer.svelte`: Migrere fra `duration_start`/`duration_end` til `durationStart`/`durationEnd` med fallback.
  - `routes/anskaffelser/[id]/+page.svelte`: Oppdatere CPV-visning til å håndtere `{ mainCPV, additionalCPV }`. Vise hoved-CPV fremhevet, med mulighet for å folde ut tilleggskoder.
  - `lib/utils/protokoll-info-rows.ts` og `meddelelse-generator.ts`: Bruke `aboutProcurer?.orgNumber ?? about_procurer?.national_id`.

---

## 7. Trinnvis implementeringsplan (Roadmap)

Migreringen organiseres i fire separate faser/arbeidspakker for å minimere risiko og sikre kontinuerlig verifisering:

```mermaid
flowchart TD
    subgraph Fase 1: Backend Resiliens
        A1[Lag robuste parsere i protokoll/common.py] --> A2[Oppdater docx_del2, docx_del3, markdown.py]
        A2 --> A3[Oppdater Flask API p.get fallbacks]
        A3 --> A4[Kjør pytest tests/]
    end

    subgraph Fase 2: Frontend Klargjøring
        B1[Oppdater TypeScript typer i contract.ts] --> B2[Oppdater ContractDrawer og avtaler-side]
        B2 --> B3[Implementer normalizeCpv i frontend]
        B3 --> B4[Kjør Svelte type-check og bygg]
    end

    subgraph Fase 3: Aktiver v3 i Klient
        C1[Legg til x-api-version: 3 i ArtifikClient] --> C2[Aktiver /external/v3/* stier]
        C2 --> C3[Verifiser mot Artifik API / staging]
        C3 --> C4[Optimaliser listehenting med includeTeam]
    end

    subgraph Fase 4: Sanering
        D1[Fjern utdaterte snake_case fallbacks] --> D2[Slett v2-spesifikke fixtures]
        D2 --> D3[Endelig verifisering og godkjenning]
    end

    Fase 1 --> Fase 2
    Fase 2 --> Fase 3
    Fase 3 --> Fase 4
```

### Fase 1: Resiliens og robuste parsere i backend (Issue #103)
- Innføre felles hjelpefunksjoner i `src/protokoll/common.py` for å hente verdier fra `procurement`-objekter med v3/v2-fallback.
- Oppdatere `docx_del2.py`, `docx_del3.py` og `markdown.py` til å bruke hjelpefunksjonene.
- Oppdatere `src/app/api/__init__.py` til å sjekke både v3 camelCase og v2 snake_case.
- **Kriterium for ferdigstillelse:** Samtlige eksisterende enhetstester i `tests/` passerer, og protokollgenerering fungerer uendret med både v2- og v3-syntetiske fixtures.

### Fase 2: Typesikring og frontend-klargjøring (Issue #104)
- Utvide `src/frontend/src/lib/types/contract.ts` med `durationStart`, `durationEnd`, `durationMonths`, `durationDays`.
- Implementere `normalizeCpv()` i `src/frontend/src/lib/utils/`.
- Oppdatere `src/frontend/src/routes/avtaler/+page.svelte` og `ContractDrawer.svelte` til å bruke `durationStart ?? duration_start`.
- Oppdatere `src/frontend/src/routes/anskaffelser/[id]/+page.svelte` til å støtte det nye CPV-formatet.
- **Kriterium for ferdigstillelse:** Frontend bygger feilfritt med `npm run build` og fungerer sømløst mot eksisterende v2 API.

### Fase 3: Aktivering av v3 i ArtifikClient og Flask API (Issue #105)
- Oppdatere `ArtifikClient` (`src/app/client.py`) til å sende `x-api-version: 3` og bruke `/external/v3/*` endepunkter.
- Legge til `whoami()`-metode i klient og MCP-server.
- Ta i bruk `includeTeam=True` og `includeInternalReporting=True` i `list_procurements()` og `list_contracts()`.
- Verifisere mot live Artifik API i testmiljø.
- **Kriterium for ferdigstillelse:** Alle endepunkter og MCP-kall svarer med v3 camelCase-data uten regresjoner i UI eller protokollgenerator.

### Fase 4: Sanering og opprydding (Issue #106)
- Fjerne overflødige v2-fallbacks i backend og frontend etter vellykket observasjonsperiode.
- Rense opp i `artifik-api-openapi-3.json` og testfixtures.
- **Kriterium for ferdigstillelse:** Ren kodebase basert 100 % på v3-standard.

---

## 8. Risiko og avbøtende tiltak

| Risiko | Alvorlighet | Sannsynlighet | Avbøtende tiltak |
|---|---|---|---|
| **Feil i protokollfelter:** Manglende verdier i genererte Word-dokumenter pga. uoppdagede snake_case-nøkler | Høy | Lav | Grundig kartlegging av alle `procurement.get()`-kall (utført i denne ADR-en), samt automatiserte regresjonstester med v3-payloads. |
| **Brukere har lagret v2-data i local storage:** Frontend cacher `procurement`-objekter lokalt i nettleseren | Middels | Middels | Komponenter benytter nullish coalescing (`proc.aboutProcurer?.orgNumber ?? proc.about_procurer?.national_id`) i overgangsfasen. |
| **API-feil ved parameteroverføring:** Forskjeller i parameterformatering mellom v2 og v3 | Lav | Lav | OpenAPI-spesifikasjonen bekrefter at parametere og tilgangslogikk er identiske mellom v2 og v3. |
| **Doffin/eForms-uoverensstemmelse:** eForms bruker fortsatt egne feltnavn (`cpv_codes`) | Middels | Lav | eForms-data håndteres separat i `src/app/eforms.py` og påvirkes ikke av Artifik API-migreringen. |

---

## 9. Referanser

- [Artifik API OpenAPI 3.0 Spesifikasjon](file:///Users/kasper/Projects/Catenda/procurement-api/artifik-api-openapi-3.json)
- [ADR-001: Remote MCP-server på Cloud Run](file:///Users/kasper/Projects/Catenda/procurement-api/docs/adr-001-remote-mcp-server.md)
- [ADR-002: Standalone protokollgenerator](file:///Users/kasper/Projects/Catenda/procurement-api/docs/adr-002-protokollgenerator.md)
- [ADR-003: Vurdering av SvelteKit 2 med Svelte 5](file:///Users/kasper/Projects/Catenda/procurement-api/docs/adr-003-sveltekit-frontend-evaluation.md)
- [ADR-004: CSS-konvensjon — Tailwind v4](file:///Users/kasper/Projects/Catenda/procurement-api/docs/adr-004-css-convention-tailwind-v4.md)
- [Anskaffelsesprotokoll — datagrunnlag fra API](file:///Users/kasper/Projects/Catenda/procurement-api/docs/protokoll-datagrunnlag.md)
- [GitHub Issue #102: ARTIFIK-04](https://github.com/khjohns/procurement-api/issues/102)
