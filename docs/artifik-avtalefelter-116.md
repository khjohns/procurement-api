# Avtalefelter – verifisering for #116

## Grunnlag og avgrensning

Primærkilde: [Artifiks API-dokumentasjon](https://apidocs.artifik.no/). [Lokal OpenAPI-kopi](../artifik-api-openapi-3.json) ble hentet 30.09.2026; `info.version=1.0` er spesifikasjonens versjon, ikke Artifik API-versjonen. OpenAPI mangler fullstendige kontraktsrespons-skjemaer. Kildebeskrivelser og faktisk respons holdes derfor adskilt.

Lesende kontroll 01.10.2026 kl. 05:41–05:43 UTC via `./dev.sh --verify-contract-fields --max-details 30` og `--max-details 0`, fra arbeidskopi basert på `fe58e477e9c3a83b7f59450c623d2552f086359e`. Én tilgjengelig organisasjon (ID vist bare som SHA-256-prefiks `404996c22932`). Samme organisasjonsfilter ble brukt i v2 og v3. Listeutvalg: **364 poster**, fordelt på 76 hovedgrupper, 76 delområdegrupper, 205 leverandørkontrakter, én frittstående kontrakt og seks frittstående KGV-kontrakter. Detaljutvalg: **30 poster**, stratifisert over alle fem typer og alle fire poster med utfylte opsjoner. I tillegg: 604 organisasjonsmedlemmer, 10 anskaffelsesdetaljer og 10 publiserte maler. Tallene gjelder dette utvalget og angitt hierarkinivå, ikke Artifik generelt. Ingen rå feltverdier eller personopplysninger er lagret i resultatet.

**Autentisering:** `POST /external/v2/token` med dokumentert JSON-body ga HTTP 400. Samme credentials og sti med `application/x-www-form-urlencoded` ga HTTP 200; også eldre `/external/token` med form ga 200. Klienten bruker derfor v2-stien med form-data. Dette er et observert avvik fra publisert OpenAPI.

## Metoder og responser

| Kode | Metode og parametere |
|---|---|
| L2/L3 | `GET /external/v2|v3/contracts?organizationId=…`, med/uten `includeTeam=true` og `includeInternalReporting=true`. |
| D2/D3 | `GET /external/v2|v3/contracts/{contract_id}`, med/uten de samme to flaggene. |
| P3 | `GET /external/v3/procurements/{procurement_id}`; 10 koblede anskaffelser ble undersøkt. |
| O2 | `GET /external/v2/organizations` og `GET /external/v2/{organization_id}/members`. |
| T2 | `GET /external/v2/organization/{organization_id}/contract-internal-reporting/template`. |
| R2/R3 | `GET /external/v2|v3/organization/{organization_id}/templates/{template_id}/responses?entityType=contract|procurement&page=1|2&pageSize=25`. |

V2 og v3 ga de samme 364 kontrakt-ID-ene, typene og start-/sluttdatoene for samme ID. V2 returnerte verken `team` eller `internalReporting` på liste eller detalj, selv med flagg. V3 returnerte `team` på 359/364 listeposter og 30/30 undersøkte detaljer når flagget var satt, ellers ikke. `internalReporting` var til stede, men tomt på 364/364 v3-listeposter og 30/30 detaljer med flagg. Aktiv kontraktsmal hadde `templateId: null` og null felt. Dette forklarer de tomme svarene i denne organisasjonen; det beviser ikke at funksjonen mangler.

Alle ti publiserte maler ga 404 på R2. R3 ga 200 med `columns[].key/nodeId/prompt/type` og flate `rows[]`. Ingen av malene hadde kontraktrader. Én anskaffelsesmal hadde én rad på side 1; side 2 hadde null rader og beholdt `totalCount: 1`, `totalPages: 1`. Datagrunnlaget verifiserer parametere og sideform, men ikke en mal med flere reelle sider. Malene var syv anskaffelsesmaler, to avropsmaler og én intern forespørselsmal. Dermed er ingen kontraktsmal eller konkret kontrakt-`nodeId` tilgjengelig her.

Status under: **F** = tilgjengelig og utfylt i oppgitt antall; **T** = felt tilgjengelig, men tomt; **I** = ikke funnet i undersøkte svar; **U** = fortsatt uavklart betydning, kobling eller beregning. `0/N` betyr ikke at funksjonen mangler i Artifik. Klasser med `?` krever bekreftet forretningsdefinisjon.

## Avtale og roller

| Felt | Klasse og verifisert kilde | Resultat |
|---|---|---|
| Navn | Direkte, L3/D3 `name`. | F 364/364. |
| Referansenummer | Direkte, L3/D3 `referenceId`; `contractNumber` er et annet felt. | F 80/364; kontraktsnummer F 288/364. |
| ParentContractRefAndName | Oppslag, D3 `parentContractId`, `parentContract.referenceId/name`; eventuelt D3 på forelder. | U: `parentContractId` F 17/30; begge relasjonsfelt F 10/30. Fem oppslag på forelder ga navn og `contractNumber`, men ingen `referenceId`; valg av «Ref» må avklares. |
| Avtaletype | Direkte, L3/D3 `type`. | F 364/364, fem observerte typer. |
| Trinn | Uavklart; `signingTier` er signeringsnivå, ikke generelt avtaletrinn. | U; ingen entydig kilde. |
| Fase | Uavklart; skill fra `signingStatus` og publisering. | U; ingen entydig kilde. |
| Status | Direkte, L3/D3 `signingStatus` for signeringsstatus. | F 364/364; annen statusdefinisjon U. |
| Avtaleområde | Direkte/egendefinert? L3/D3 `categories[].name` og D3 `lotName` er ulike kandidater. | U: kategorier F 347/364; `lotName` F 6/30. |
| Administratorens virksomhet | Oppslag? L3/D3 `organizationId`, O2 organisasjonsnavn. | U: ID F 364/364; rollebetydning må bekreftes. |
| Oppdragsgivervirksomhet | Direkte, L3/D3 `buyerOrgName`. | F 364/364. |
| Administrator | Direkte, L3 `ownerId`, D3 `owner.id/name`. | F 364/364 for ID; navn F 30/30 detaljer. |
| Administratorens telefon | Oppslag, D3 `owner.id` = O2 `members[].email`, deretter `phone`. | F 30/30 i detaljutvalget; samme person må verifiseres per post. |
| Administratorens e-post | Oppslag, D3 `owner.id` = O2 `members[].email`. | F 30/30 i detaljutvalget. |
| Initiativtager til anskaffelsen | Oppslag? L3 `procurementId` → P3; ingen initiativtagersti funnet. | I i 10 undersøkte anskaffelsesdetaljer; kobling F 363/364. |
| Abonnenter | Uavklart; ikke likestill med `team`, signatarer eller kontaktpersoner. | I i 30 kontraktdetaljer. |

## Leverandør og kontakt

De leverandørspesifikke feltene vurderes mot **212 leverandørbærende kontrakter** (205 delkontrakter + 7 frittstående), ikke alle 364 hierarkiposter. Grupper har normalt ingen leverandør.

| Felt | Klasse og verifisert kilde | Resultat |
|---|---|---|
| Leverandørnavn | Direkte, L3/D3 `supplierOrgName` eller `supplierOrg.name`. | F 212/212. |
| Organisasjonsnummer | Direkte, L3/D3 `supplierOrgNumber` eller `supplierOrg.orgNumber`. | F 212/212. |
| Avdeling | Oppslag/egendefinert? Ikke i undersøkt `supplierOrg` (`id/name/orgNumber`). | I 0/212; annen kilde U. |
| Adresse | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Postnummer | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Postadresse | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Poststed | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Land | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Telefon | Oppslag? Ikke i undersøkt `supplierOrg`; kontaktpersoner har heller ikke `phone`. | I 0/212. |
| Faks | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| E-post | Oppslag? Ingen hovedadresse i `supplierOrg`; kontakt-e-post er eget felt. | I 0/212. |
| Hjemmeside | Oppslag? Ikke i undersøkt `supplierOrg`. | I 0/212. |
| Kontaktpersonens navn | Direkte, L3/D3 `supplierContactPersons[].name`. | F kontaktliste 210/212; skill fra signatarer/team. |
| Kontaktpersonens telefon | Ikke i `supplierContactPersons[]` i undersøkt respons. | I 0/210 kontaktlister. |
| Kontaktpersonens e-post | Direkte, L3/D3 `supplierContactPersons[].email`. | F kontaktliste 210/212. |

## Datoer og forlengelse

| Felt | Klasse og verifisert kilde | Resultat |
|---|---|---|
| Inngått dato | Uavklart; D3 `creationTime` er opprettelsesdato, ikke inngått dato. | I i 30 detaljer. |
| Startdato | Direkte, L3/D3 `durationStart` (L2/D2 `duration_start`). | F 350/364. |
| Sluttdato | Direkte, L3/D3 `durationEnd` (L2/D2 `duration_end`). | F 335/364. |
| Opprinnelig avtaleslutt | Beregning/oppslag? Ingen egen sti observert. | U; I i 30 detaljer. |
| Forlenget | Beregning? Opsjon viser mulighet, ikke faktisk bruk. | U; ingen bruksindikator funnet. |
| Forlengelse i måneder | Beregning? D3/L3 `optionsJSON[].optionType/prolongPeriods[]`. | U: 4/76 delområdegrupper hadde opsjoner; alle fire `prolongDurationYear`, fem heltallsperioder. Ingen månedsvariant observert. |
| Antall forlengelser | Beregning? Skill mulige fra benyttede perioder. | U; faktisk antall benyttede ikke påvist. |
| Siste/maksimale sluttdato | Artifik dokumenterer `computedMaxEndDate`, også arvet fra delområdegruppe. | I 0/30 detaljer, inklusive alle fire poster med opsjoner; dokumentasjon/produksjon avviker. |
| Påminnelse i måneder før forlengelsesperiode | Uavklart; D3 `milestones` har egne påminnelser, kobling til forlengelse ikke påvist. | U. |

## Økonomi og metadata

| Felt | Klasse og verifisert kilde | Resultat |
|---|---|---|
| Avtalens verdi | Direkte, L3/D3 `value`, per hierarkinivå. | F 330/364: hovedgruppe 52/76, delområde 74/76, leverandør 198/205, frittstående 6/7. Ikke summer nivåene ukritisk. |
| Valuta | Direkte, L3/D3 `currency` på samme nivå som verdien. | F 364/364. |
| Opprettet fra anskaffelse | Direkte kobling, L3/D3 `procurementId` → P3. | F 363/364; ett frittstående tilfelle tomt. |
| Avropsmetode | Direkte, D3 `framework_agreement_reopening`; Artifik definerer `without/with/partly`. | F 17/23 detaljer hvor feltet fantes; øvrige nivåer U. |
| Rangordning | Direkte, D3 `framework_agreement_uses_ranking` (ja/nei). | F 2/23 detaljer hvor feltet fantes; `false` er gyldig verdi. |
| Antall rammeavtalegrupper | Beregning, D3 `children[].type` under hovedgruppe. | U som porteføljeregel; 6 hovedgrupper i detaljutvalget hadde samlet 6 delområdebarn. |
| UNSPSC | Ikke funnet i L3/D3 eller 10 P3-detaljer. P3 har `cpvCodes`, et annet kodeverk. | I 0/364 kontrakter; eventuell egendefinert kilde U. |
| Språk | Ingen `language`-sti i undersøkte kontraktsvar. | I 0/364. |
| Beskrivelse | Direkte, L3/D3 `description`. | F 206/364; særlig leverandørkontrakter 204/205. |
| Notater | Ingen `notes`-sti i undersøkte kontraktsvar. | I 0/364. |
| Søkeord | Ingen `keywords`-sti i undersøkte kontraktsvar. | I 0/364. |

## Gjenstående avklaringer

- Bekreft forretningsbetydningen av «trinn», «fase», «avtaleområde», «administratorens virksomhet», «opprinnelig avtaleslutt», «forlenget» og antall grupper før disse gjøres til produktfelt.
- Avklar med Artifik hvorfor v2 ignorerer berikelsesflagg, hvorfor R2 gir 404 mens R3 svarer, og hvorfor dokumentert `computedMaxEndDate` ikke vises på de fire opsjonspostene. Ingen av disse observasjonene begrunner en generell påstand om manglende API-funksjon.
- Når en aktiv kontraktsmal finnes, registrer konkret organisasjon, mal-ID, `nodeId`, rå `value`, `valueText` og dekning. Bevar forskjellen mellom manglende felt, `null`, `false` og `0`. Nåværende organisasjon har ingen aktiv kontraktsmal og ingen kontraktmalrader.
