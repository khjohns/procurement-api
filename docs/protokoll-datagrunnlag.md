# Anskaffelsesprotokoll — datagrunnlag fra API

Kartlegging av kravene i anskaffelsesforskriften § 25-5 opp mot data
tilgjengelig via Artifik External API. Basert på analyse av reelle
anskaffelser (feb 2026).

## Dekning per bokstav

| § 25-5 | Krav | API-kilde | Dekning |
|--------|------|-----------|---------|
| **a** | Oppdragsgivers navn og adresse | `about_procurer` | Full |
| **b** | Beskrivelse + anslått verdi | `name`, `description`, `estimated_value`, `cpv_codes` | Full |
| **c** | Begrunnelse for ikke å dele opp | — | Mangler |
| **d** | Begrunnelse for forhandling/dialog | `procedure` (type kjent, begrunnelse mangler) | Delvis |
| **e** | Begrunnelse direkte anskaffelse | `direct_award_justification_code` + `_reason` | Full |
| **f** | Unntak elektronisk kommunikasjon | — | Mangler |
| **g** | Leverandører med forespørsler | Activities: `ASK_TO_QUALIFY` | Full |
| **h** | Utvalgte + begrunnelse | `suppliersLimitReason` + `QUALIFYING_PARTICIPANTS` | Delvis |
| **i** | Leverandører med tilbud | Activities: `SUBMIT_BID` | Full |
| **j** | Avviste + begrunnelse | Activities: `REJECT_PARTICIPATION` (uten begrunnelse) | Delvis |
| **k** | Forkastede tilbud + begrunnelse | — | Mangler |
| **l** | Inhabilitet/konkurransevridning | — | Mangler |
| **m** | Valgt leverandør + begrunnelse + verdi | `AWARDING_PARTICIPANTS` + `total_value` (begrunnelse mangler) | Delvis |
| **n** | Underleverandører | — | Mangler |
| **o** | Begrunnelse for avlysning | `isCancelled` + `cancelingReason` | Full |
| **p** | Andre vesentlige forhold | `PUBLISH_ADDITIONAL_INFORMATION` | Delvis |

## Hva kan automatiseres

**Fullt fra API:** Oppdragsgiver (a), beskrivelse/verdi (b), begrunnelse direkte
anskaffelse (e), leverandører med forespørsler (g), leverandører med tilbud (i),
avlysningsbegrunnelse (o).

**Delvis — krever manuelt supplement:** Prosedyrevalg-begrunnelse (d),
utvelgelsesbegrunnelse per leverandør (h), avvisningsbegrunnelse (j),
tildelingsbegrunnelse (m).

**Ikke i API — må føres manuelt:** Delingsbegrunnelse (c), unntak elektronisk
kommunikasjon (f), forkastede tilbud (k), inhabilitet (l), underleverandører (n).

## Protokollrelevante activities

Hendelsestyper som gir tidslinjedata til protokollen:

| Action | Protokollbruk |
|--------|--------------|
| `PUBLISH_TO_DOFFIN` | Kunngjøringstidspunkt |
| `ASK_TO_QUALIFY` | Leverandør + tidspunkt for kvalifikasjonsforespørsel |
| `OPEN_QUALIFICATIONS` | Tidspunkt for åpning av kvalifikasjoner |
| `QUALIFYING_PARTICIPANTS` | Kvalifiserte leverandører |
| `SUBMIT_BID` | Leverandør + tidspunkt for tilbudsinnlevering |
| `OPEN_BIDS` | Tidspunkt for tilbudsåpning |
| `REJECT_PARTICIPATION` | Avvist leverandør + tidspunkt |
| `AWARDING_PARTICIPANTS` | Tildeling (refererer `tendersIds`) |
| `WITHDRAW_PARTICIPATION` | Leverandør som trakk seg |
| `PUBLISH_ADDITIONAL_INFORMATION` | Tilleggsinformasjon (med innhold i `description`) |
| `PUBLISH_Q8A` | Q&A publisert (kun tidspunkt, ikke innhold) |

## Viktigste gap å ta opp med Artifik

1. **Avvisningsbegrunnelse** — `REJECT_PARTICIPATION` har tom `description`.
   Protokollen krever begrunnelse (§ 25-5 bokstav j).
2. **Tildelingsbegrunnelse** — `AWARDING_PARTICIPANTS` gir kun `tendersIds`.
   Protokollen krever begrunnelse for valget (§ 25-5 bokstav m).
3. **Q&A-innhold** — `PUBLISH_Q8A` gir kun tidspunkt. Innholdet i spørsmål
   og svar er ikke tilgjengelig via API.
4. **ESPD-data** — Egenerklæringsskjemaet fylles ut i KGV-verktøyet og
   eksponeres ikke via API.

## Eksempel: tidslinje for «Rammeavtale for manuelt slokkeutstyr» (ID 1665)

```
2025-11-24  PUBLISH_TO_DOFFIN              Kunngjøring
2025-12-10  PUBLISH_Q8A                    Spørsmål/svar publisert
2025-12-10  PUBLISH_ADDITIONAL_INFORMATION Prisskjema oppdatert
2025-12-17  SUBMIT_BID                     Nortronik AS
2025-12-23  SUBMIT_BID                     Noha Norway AS
2025-12-30  SUBMIT_BID                     Norsk Brannvern AS
2026-01-02  SUBMIT_BID                     Presto AS
2026-01-02  SUBMIT_BID                     alf
2026-01-07  OPEN_BIDS                      Tilbudsåpning
2026-01-16  REJECT_PARTICIPATION           Presto AS
2026-01-16  REJECT_PARTICIPATION           Nortronik AS
2026-02-05  AWARDING_PARTICIPANTS          Tildeling
```
