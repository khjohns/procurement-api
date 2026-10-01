# Avtalefelter – kontroll for #116

## Kilder og status

Primærkilden er [Artifiks API-dokumentasjon](https://apidocs.artifik.no/). Den [versjonsfestede OpenAPI-filen](../artifik-api-openapi-3.json) fra 30.09.2026 er sammenligningsgrunnlag. `info.version=1.0` er dokumentversjonen, ikke API-versjonen. Kontraktsskjemaene i OpenAPI mangler feltdefinisjoner, så fravær av et felt der beviser ikke at feltet mangler i API-et. Funnene i [#110](https://github.com/khjohns/procurement-api/issues/110) er kontrollpunkter, ikke live-observasjoner.

Kontrollen 01.10.2026 i arbeidskopien basert på revisjon `4db22ac9fa69b77d0f66ca865294e9ae15d62285` ble stoppet av HTTP 400 på `POST /external/v2/token` gjennom `./dev.sh --verify-contract-fields --max-details 2`. Ingen kontrakt, organisasjon eller mal ble hentet. **Nevneren er 0 undersøkte kontrakter; dekningsgrad kan ikke beregnes.** `U` i hver rad betyr *fortsatt uavklart på grunn av autentisering*, ikke «feltet finnes ikke». Ingen feltverdier eller credentials ble logget.

Kildekodene under er dokumenterte leseoperasjoner: **L** = `GET /external/v2/contracts?organizationId=…&includeTeam=true&includeInternalReporting=true` (eventuelt `includeCustomFields=true`); **D** = `GET /external/v2/contracts/{contract_id}?includeTeam=true&includeInternalReporting=true`; v3 velges eksplisitt med `/external/v3/…`, v2 er standard. **P** = `GET /external/v2/procurements/{procurement_id}`. **O** = `GET /external/v2/organizations` og `GET /external/v2/{organization_id}/members`. **T** = `GET /external/v2/organization/{organization_id}/contract-internal-reporting/template`. **R** = `GET /external/v2/organization/{organization_id}/templates/{template_id}/responses?entityType=contract&page=1&pageSize=100`; svarene har `columns[].key/nodeId/prompt` og flate `rows[]`. Ingen konkret organisasjon, mal eller `nodeId` er bekreftet. «?» markerer en kildekandidat som krever responskontroll.

## Avtale og roller

| Felt | Klasse | Dokumentert kilde / nødvendig avklaring | Status |
|---|---|---|---|
| Navn | Direkte? | L/D; JSON-sti ikke definert i OpenAPI. | U |
| Referansenummer | Direkte? | L/D; avklar hvilket referansebegrep og JSON-sti. | U |
| ParentContractRefAndName | Oppslag? | D nevner `parentContract`; avklar referanse og navn i relasjonen. | U |
| Avtaletype | Direkte? | L/D; sti og verdikoder uavklart. | U |
| Trinn | Uavklart | L/D eller T/R; betydning og sti uavklart. | U |
| Fase | Uavklart | L/D eller T/R; hold adskilt fra status. | U |
| Status | Direkte? | L/D; avklar statusfelt mot signeringsstatus. | U |
| Avtaleområde | Egendefinert? | T/R må kobles med organisasjon, mal og `nodeId`. | U |
| Administratorens virksomhet | Oppslag? | L/D + O; avklar eierorganisasjon mot administratorvirksomhet. | U |
| Oppdragsgivervirksomhet | Oppslag? | L/D + O; ikke likestill med administratorens virksomhet. | U |
| Administrator | Oppslag? | L/D + O; bruker- og rollekobling uavklart. | U |
| Administratorens telefon | Oppslag? | L/D + O; brukerfelt uavklart. | U |
| Administratorens e-post | Oppslag? | L/D + O; brukerfelt uavklart. | U |
| Initiativtager til anskaffelsen | Oppslag? | L/D + P; anskaffelseskobling uavklart. | U |
| Abonnenter | Uavklart | L/D; ikke likestill med `team[]` eller signatarer. | U |

## Leverandør og kontakt

| Felt | Klasse | Dokumentert kilde / nødvendig avklaring | Status |
|---|---|---|---|
| Leverandørnavn | Oppslag? | L/D; leverandørrelasjon og hierarkinivå uavklart. | U |
| Organisasjonsnummer | Oppslag? | L/D; nummerfelt og format uavklart. | U |
| Avdeling | Oppslag/egendefinert? | L/D eller T/R; avklar kilde. | U |
| Adresse | Oppslag? | L/D; leverandørrelasjon uavklart. | U |
| Postnummer | Oppslag? | L/D; leverandørrelasjon uavklart. | U |
| Postadresse | Oppslag? | L/D; avklar eget felt kontra poststed. | U |
| Poststed | Oppslag? | L/D; avklar eget felt kontra postadresse. | U |
| Land | Oppslag? | L/D; kodeformat uavklart. | U |
| Telefon | Oppslag? | L/D; avklar hovednummer kontra kontaktperson. | U |
| Faks | Oppslag? | L/D; felt uavklart. | U |
| E-post | Oppslag? | L/D; avklar hovedadresse kontra kontaktperson. | U |
| Hjemmeside | Oppslag? | L/D; felt uavklart. | U |
| Kontaktpersonens navn | Oppslag? | L/D; skill fra signatør, avtaleeier og `team[]`. | U |
| Kontaktpersonens telefon | Oppslag? | L/D; kontaktpersonrelasjon uavklart. | U |
| Kontaktpersonens e-post | Oppslag? | L/D; kontaktpersonrelasjon uavklart. | U |

## Datoer og forlengelse

| Felt | Klasse | Dokumentert kilde / nødvendig avklaring | Status |
|---|---|---|---|
| Inngått dato | Direkte? | L/D; skill fra opprettelsesdato. | U |
| Startdato | Direkte | L/D: `durationStart` (v3), `duration_start` (v2). | U |
| Sluttdato | Direkte | L/D: `durationEnd` (v3), `duration_end` (v2). | U |
| Opprinnelig avtaleslutt | Direkte/beregning? | L/D; egen sti og forhold til nåværende sluttdato uavklart. | U |
| Forlenget | Beregning? | L/D; krev bevis for faktisk brukt opsjon. | U |
| Forlengelse i måneder | Beregning? | L/D; undersøk `prolongDurationMonth` og `prolongDurationYear` separat. | U |
| Antall forlengelser | Beregning? | L/D; skill brukte fra mulige opsjoner. | U |
| Siste/maksimale sluttdato | Direkte/beregning? | L/D; undersøk `computedMaxEndDate` og arvede gruppedatoer. | U |
| Påminnelse i måneder før forlengelsesperiode | Egendefinert? | L/D eller T/R; organisasjon, mal og `nodeId` uavklart. | U |

## Økonomi og metadata

| Felt | Klasse | Dokumentert kilde / nødvendig avklaring | Status |
|---|---|---|---|
| Avtalens verdi | Direkte? | L/D; velg hierarkinivå før summering av forelder og barn. | U |
| Valuta | Direkte? | L/D; knytt til samme nivå som verdien. | U |
| Opprettet fra anskaffelse | Oppslag? | L/D + P; relasjon og sti uavklart. | U |
| Avropsmetode | Egendefinert? | L/D eller T/R; organisasjon, mal og `nodeId` uavklart. | U |
| Rangordning | Direkte? | L/D; sti og betydning uavklart. | U |
| Antall rammeavtalegrupper | Beregning? | D nevner `children`/`parentContract`; tellefilter uavklart. | U |
| UNSPSC | Egendefinert? | L/D eller T/R; CPV på anskaffelse er et annet kodeverk. | U |
| Språk | Direkte? | L/D; sti og kodeformat uavklart. | U |
| Beskrivelse | Direkte? | L/D; sti uavklart. | U |
| Notater | Direkte? | L/D; sti og synlighetsregel uavklart. | U |
| Søkeord | Direkte? | L/D; sti og type uavklart. | U |

Når autentisering virker, kjøres `./dev.sh --verify-contract-fields --organization-index N --max-details 30`. Registrer revisjon, tidspunkt, organisasjonsavgrensning, v2/v3 med og uten berikelsesflagg, liste- og detaljnevner per hierarkinivå, malpaginering og sanerte feltdekningstall. `value` i internrapportering må bevares som rå type; `valueText`, manglende felt, `null`, `false` og `0` er ulike tilstander. Tomme felt i ett utvalg beviser ikke at funksjonen mangler i Artifik.
