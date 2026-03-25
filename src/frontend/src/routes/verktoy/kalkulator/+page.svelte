<script lang="ts">
  import type { OppdragsgiverType } from '$lib/types/registrering';
  import { getEos, TIDSUBEGRENSET_FAKTOR } from '$lib/data/registrering-config';
  import { formatNOK } from '$lib/utils/format';
  import FormField from '$lib/components/registrering/FormField.svelte';
  import RadioCards from '$lib/components/registrering/RadioCards.svelte';
  import ToolHeader from '$lib/components/verktoy/ToolHeader.svelte';

  type MetodeId =
    | 'standard'
    | 'rammeavtale'
    | 'regelmessig'
    | 'leasing'
    | 'tjeneste_uten_pris'
    | 'delkontrakter'
    | 'bygge';

  interface Metode {
    id: MetodeId;
    label: string;
    desc: string;
    ref: string;
  }

  const METODER: Metode[] = [
    {
      id: 'standard',
      label: 'Standard kontrakt',
      desc: 'Samlet betaling + opsjoner',
      ref: '§ 5-4 (1)',
    },
    {
      id: 'rammeavtale',
      label: 'Rammeavtale / DPS',
      desc: 'Maks verdi over avtalens varighet',
      ref: '§ 5-4 (5)',
    },
    {
      id: 'regelmessig',
      label: 'Regelmessige kontrakter',
      desc: 'Historisk eller fremadrettet metode',
      ref: '§ 5-4 (9)',
    },
    {
      id: 'leasing',
      label: 'Leasing / leie / avbetaling',
      desc: 'Avhenger av varighet og restverdi',
      ref: '§ 5-4 (10)',
    },
    {
      id: 'tjeneste_uten_pris',
      label: 'Tjenestekontrakt uten fastsatt pris',
      desc: 'Avhenger av varighet (≤48 mnd eller ×48)',
      ref: '§ 5-4 (12)',
    },
    {
      id: 'delkontrakter',
      label: 'Delkontrakter',
      desc: 'Samlet verdi med smådel-unntak',
      ref: '§ 5-4 (8)',
    },
    {
      id: 'bygge',
      label: 'Bygge- og anleggskontrakt',
      desc: 'Inkl. varer/tjenester oppdragsgiver stiller',
      ref: '§ 5-4 (7)',
    },
  ];

  interface Delkontrakt {
    navn: string;
    verdi: string;
    type: 'vare_tjeneste' | 'bygge';
  }

  // State
  let metode = $state<MetodeId | ''>('');
  let oppdragsgiver = $state<OppdragsgiverType>('kommunal');

  // Per-method state (all coexist)
  let stdVerdi = $state('');
  let stdOpsjon = $state('');
  let raAntall = $state('');
  let raSnitt = $state('');
  let regMetode = $state<'historisk' | 'fremadrettet'>('historisk');
  let regVerdi = $state('');
  let regJustering = $state('');
  let leaseVarighet = $state<'kort' | 'lang' | 'ubestemt'>('kort');
  let leaseVerdi = $state('');
  let leaseRestverdi = $state('');
  let leaseMnd = $state('');
  let tjVarighet = $state<'under48' | 'over48'>('under48');
  let tjSamlet = $state('');
  let tjMnd = $state('');
  let deler = $state<Delkontrakt[]>([{ navn: '', verdi: '', type: 'vare_tjeneste' }]);
  let byggeArbeider = $state('');
  let byggeVarer = $state('');

  // Computed result
  const resultat = $derived.by(() => {
    switch (metode) {
      case 'standard':
        return (parseFloat(stdVerdi) || 0) + (parseFloat(stdOpsjon) || 0);
      case 'rammeavtale':
        return (parseFloat(raAntall) || 0) * (parseFloat(raSnitt) || 0);
      case 'regelmessig':
        return regMetode === 'historisk'
          ? (parseFloat(regVerdi) || 0) * (1 + (parseFloat(regJustering) || 0) / 100)
          : parseFloat(regVerdi) || 0;
      case 'leasing':
        if (leaseVarighet === 'kort') return parseFloat(leaseVerdi) || 0;
        if (leaseVarighet === 'lang')
          return (parseFloat(leaseVerdi) || 0) + (parseFloat(leaseRestverdi) || 0);
        return (parseFloat(leaseMnd) || 0) * TIDSUBEGRENSET_FAKTOR;
      case 'tjeneste_uten_pris':
        return tjVarighet === 'under48'
          ? parseFloat(tjSamlet) || 0
          : (parseFloat(tjMnd) || 0) * TIDSUBEGRENSET_FAKTOR;
      case 'delkontrakter':
        return deler.reduce((s, d) => s + (parseFloat(d.verdi) || 0), 0);
      case 'bygge':
        return (parseFloat(byggeArbeider) || 0) + (parseFloat(byggeVarer) || 0);
      default:
        return 0;
    }
  });

  const eos = $derived(getEos(oppdragsgiver, metode === 'bygge' ? 'bygge' : 'tjeneste'));
  const del = $derived(
    resultat < 100_000 ? '—' : resultat < 1_300_000 ? 'I' : resultat < eos ? 'II' : 'III'
  );

  // Delkontrakter helpers
  function addDel() {
    deler = [...deler, { navn: '', verdi: '', type: 'vare_tjeneste' }];
  }
  function rmDel(i: number) {
    deler = deler.filter((_, j) => j !== i);
  }

  // Delkontrakter analysis
  const delAnalyse = $derived.by(() => {
    const samlet = deler.reduce((s, d) => s + (parseFloat(d.verdi) || 0), 0);
    const vtSmaa = deler.filter(
      (d) => d.type === 'vare_tjeneste' && (parseFloat(d.verdi) || 0) < 836_000
    );
    const baSmaa = deler.filter(
      (d) => d.type === 'bygge' && (parseFloat(d.verdi) || 0) < 10_400_000
    );
    const vtSmaaSum = vtSmaa.reduce((s, d) => s + (parseFloat(d.verdi) || 0), 0);
    const baSmaaSum = baSmaa.reduce((s, d) => s + (parseFloat(d.verdi) || 0), 0);
    return {
      vtSmaa,
      baSmaa,
      vtSmaaSum,
      baSmaaSum,
      vtUnder20: samlet > 0 && vtSmaaSum / samlet <= 0.2,
      baUnder20: samlet > 0 && baSmaaSum / samlet <= 0.2,
      samlet,
    };
  });
</script>

<ToolHeader title="Terskelverdikalkulator" ref="FOA § 5-4" />

<div class="tool-body">
  <FormField label="Oppdragsgiver" hjemmel="(påvirker EØS-terskel)">
    <RadioCards
      options={[
        { id: 'statlig', label: 'Statlig' },
        { id: 'kommunal', label: 'Kommune / fylke' },
        { id: 'offentligrettslig', label: 'Offentligrettslig organ' },
      ]}
      value={oppdragsgiver}
      onchange={(id) => (oppdragsgiver = id as OppdragsgiverType)}
    />
  </FormField>

  <FormField label="Beregningsmetode" hjemmel="§ 5-4">
    <div class="metode-grid">
      {#each METODER as m}
        {@const sel = metode === m.id}
        <button
          class="metode-card"
          class:selected={sel}
          onclick={() => {
            metode = m.id;
          }}
        >
          <div class="metode-label">{m.label}</div>
          <div class="metode-desc">{m.desc}</div>
          <div class="metode-ref">{m.ref}</div>
        </button>
      {/each}
    </div>
  </FormField>

  {#if metode}
    <div class="calc-area">
      {#if metode === 'standard'}
        <div class="row">
          <div class="col-grow">
            <FormField label="Samlet betaling ekskl. mva." hjemmel="§ 5-4 (1)">
              <input class="form-input mono" type="number" bind:value={stdVerdi} placeholder="0" />
            </FormField>
          </div>
          <div class="col-fixed">
            <FormField label="Herav opsjoner">
              <input class="form-input mono" type="number" bind:value={stdOpsjon} placeholder="0" />
            </FormField>
          </div>
        </div>
        <div class="note info">
          Inkluder enhver form for opsjon fastsatt i anskaffelsesdokumentene, samt eventuelle
          betalinger eller premier til leverandørene.
        </div>
      {/if}

      {#if metode === 'rammeavtale'}
        <div class="row">
          <div class="col-grow">
            <FormField label="Forventet antall avrop / kontrakter">
              <input class="form-input mono" type="number" bind:value={raAntall} placeholder="0" />
            </FormField>
          </div>
          <div class="col-grow">
            <FormField label="Gjennomsnittlig kontraktsverdi (NOK)">
              <input class="form-input mono" type="number" bind:value={raSnitt} placeholder="0" />
            </FormField>
          </div>
        </div>
        <div class="note info">
          Legg til grunn den <strong>maksimale</strong> verdien av alle kontraktene som forventes inngått
          i løpet av avtalens eller ordningens varighet.
        </div>
      {/if}

      {#if metode === 'regelmessig'}
        <FormField label="Beregningsmetode">
          <RadioCards
            options={[
              { id: 'historisk', label: 'Historisk (siste 12 mnd)' },
              { id: 'fremadrettet', label: 'Fremadrettet (neste 12 mnd)' },
            ]}
            value={regMetode}
            onchange={(id) => (regMetode = id as 'historisk' | 'fremadrettet')}
            small
          />
        </FormField>
        <div class="row">
          <div class="col-grow">
            <FormField
              label={regMetode === 'historisk'
                ? 'Samlet verdi siste 12 mnd / regnskapsår'
                : 'Anslått samlet verdi neste 12 mnd'}
            >
              <input class="form-input mono" type="number" bind:value={regVerdi} placeholder="0" />
            </FormField>
          </div>
          {#if regMetode === 'historisk'}
            <div class="col-fixed">
              <FormField
                label="Forventet endring (%)"
                hint="Justering for forventede endringer neste 12 mnd."
              >
                <input
                  class="form-input mono"
                  type="number"
                  bind:value={regJustering}
                  placeholder="0"
                />
              </FormField>
            </div>
          {/if}
        </div>
      {/if}

      {#if metode === 'leasing'}
        <FormField label="Kontraktens varighet">
          <RadioCards
            options={[
              { id: 'kort', label: '≤ 12 måneder' },
              { id: 'lang', label: '> 12 måneder' },
              { id: 'ubestemt', label: 'Tidsubegrenset' },
            ]}
            value={leaseVarighet}
            onchange={(id) => (leaseVarighet = id as 'kort' | 'lang' | 'ubestemt')}
            small
          />
        </FormField>
        {#if leaseVarighet === 'kort'}
          <FormField label="Kontraktens samlede verdi">
            <input class="form-input mono" type="number" bind:value={leaseVerdi} placeholder="0" />
          </FormField>
        {/if}
        {#if leaseVarighet === 'lang'}
          <div class="row">
            <div class="col-grow">
              <FormField label="Kontraktens samlede verdi">
                <input
                  class="form-input mono"
                  type="number"
                  bind:value={leaseVerdi}
                  placeholder="0"
                />
              </FormField>
            </div>
            <div class="col-grow">
              <FormField label="Anslått restverdi">
                <input
                  class="form-input mono"
                  type="number"
                  bind:value={leaseRestverdi}
                  placeholder="0"
                />
              </FormField>
            </div>
          </div>
        {/if}
        {#if leaseVarighet === 'ubestemt'}
          <div class="note warn">
            <p class="note-label">Månedlig verdi × 48</p>
            <div style="max-width: 220px">
              <FormField label="Månedlig verdi">
                <input
                  class="form-input mono"
                  type="number"
                  bind:value={leaseMnd}
                  placeholder="0"
                />
              </FormField>
            </div>
            {#if leaseMnd}
              <p class="note-result">= {formatNOK(parseFloat(leaseMnd) * TIDSUBEGRENSET_FAKTOR)}</p>
            {/if}
          </div>
        {/if}
      {/if}

      {#if metode === 'tjeneste_uten_pris'}
        <FormField label="Kontraktens varighet">
          <RadioCards
            options={[
              { id: 'under48', label: '≤ 48 måneder' },
              { id: 'over48', label: '> 48 mnd / tidsubegrenset' },
            ]}
            value={tjVarighet}
            onchange={(id) => (tjVarighet = id as 'under48' | 'over48')}
            small
          />
        </FormField>
        {#if tjVarighet === 'under48'}
          <FormField label="Samlet verdi for hele kontraktsperioden">
            <input class="form-input mono" type="number" bind:value={tjSamlet} placeholder="0" />
          </FormField>
        {:else}
          <div class="note warn">
            <p class="note-label">Månedlig verdi × 48</p>
            <div style="max-width: 220px">
              <FormField label="Månedlig verdi">
                <input class="form-input mono" type="number" bind:value={tjMnd} placeholder="0" />
              </FormField>
            </div>
            {#if tjMnd}
              <p class="note-result">= {formatNOK(parseFloat(tjMnd) * TIDSUBEGRENSET_FAKTOR)}</p>
            {/if}
          </div>
        {/if}
      {/if}

      {#if metode === 'delkontrakter'}
        <div class="del-table">
          <div class="del-header-row">
            <span>Beskrivelse</span><span>Verdi (NOK)</span><span>Type</span><span></span>
          </div>
          {#each deler as d, i}
            <div class="del-row">
              <input class="del-input" bind:value={d.navn} placeholder="Delkontrakt {i + 1}" />
              <input class="del-input mono" type="number" bind:value={d.verdi} placeholder="0" />
              <select class="del-select" bind:value={d.type}>
                <option value="vare_tjeneste">Vare/tjeneste</option>
                <option value="bygge">Bygge/anlegg</option>
              </select>
              {#if deler.length > 1}
                <button class="del-rm" onclick={() => rmDel(i)}>×</button>
              {/if}
            </div>
          {/each}
        </div>
        <button class="add-btn" onclick={addDel}>+ Legg til delkontrakt</button>

        {#if delAnalyse.samlet > 0 && (delAnalyse.vtSmaa.length > 0 || delAnalyse.baSmaa.length > 0)}
          <div class="note warn">
            <strong>Smådel-unntak (§ 5-4 åttende ledd):</strong><br />
            {#if delAnalyse.vtSmaa.length > 0}
              Vare-/tjenestedeler under 836 000 kr: {formatNOK(delAnalyse.vtSmaaSum)} ({(
                (delAnalyse.vtSmaaSum / delAnalyse.samlet) *
                100
              ).toFixed(1)} % av samlet) — {delAnalyse.vtUnder20
                ? '✓ kvalifiserer for unntak (≤ 20 %)'
                : '✗ overstiger 20 %'}<br />
            {/if}
            {#if delAnalyse.baSmaa.length > 0}
              Bygge-/anleggsdeler under 10,4 mill.: {formatNOK(delAnalyse.baSmaaSum)} ({(
                (delAnalyse.baSmaaSum / delAnalyse.samlet) *
                100
              ).toFixed(1)} % av samlet) — {delAnalyse.baUnder20
                ? '✓ kvalifiserer for unntak (≤ 20 %)'
                : '✗ overstiger 20 %'}
            {/if}
          </div>
        {/if}
      {/if}

      {#if metode === 'bygge'}
        <div class="row">
          <div class="col-grow">
            <FormField label="Bygge- og anleggsarbeidene">
              <input
                class="form-input mono"
                type="number"
                bind:value={byggeArbeider}
                placeholder="0"
              />
            </FormField>
          </div>
          <div class="col-grow">
            <FormField
              label="Varer/tjenester stilt til rådighet"
              hint="Varer og tjenester oppdragsgiver stiller til leverandørens rådighet, og som er nødvendige for arbeidene."
            >
              <input
                class="form-input mono"
                type="number"
                bind:value={byggeVarer}
                placeholder="0"
              />
            </FormField>
          </div>
        </div>
      {/if}

      <!-- Result -->
      {#if resultat > 0}
        <div class="result-bar">
          <div>
            <div class="result-label">Beregnet verdi ekskl. mva.</div>
            <div class="result-sub">
              EØS-terskel: {formatNOK(eos)} · Nasjonal terskel: {formatNOK(1_300_000)}
            </div>
          </div>
          <div class="result-right">
            <div class="result-value">{formatNOK(resultat)}</div>
            <span class="result-del" class:del-high={del === 'III'} class:del-mid={del === 'II'}>
              {del === '—' ? 'Under terskel' : `Del ${del}`}
            </span>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="note warn" style="margin-top: 20px">
    <strong>§ 5-4 fjerde ledd:</strong> Oppdragsgiveren kan ikke velge beregningsmåte eller dele opp en
    kontrakt med det formål å unnta kontrakten fra forskriften.
  </div>
</div>

<style>
  .tool-body {
    max-width: 880px;
    margin: 24px auto;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 8px rgba(30, 37, 48, 0.06);
    padding: 28px 32px;
  }

  .metode-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 6px;
  }

  .metode-card {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
  }

  .metode-card.selected {
    border: 1.5px solid var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .metode-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }
  .metode-desc {
    font-size: 10.5px;
    color: var(--color-ink-muted);
    margin-top: 2px;
  }
  .metode-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    margin-top: 3px;
  }

  .calc-area {
    margin-top: 20px;
    padding: 20px 24px;
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
  }

  .row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .col-grow {
    flex: 1 1 200px;
  }
  .col-fixed {
    flex: 0 0 160px;
  }

  .note {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.6;
  }

  .note.info {
    background: var(--color-vekt-bg);
    border: 1px solid color-mix(in srgb, var(--color-vekt), transparent 60%);
    color: var(--color-vekt);
  }

  .note.warn {
    background: var(--color-warn-bg);
    border: 1px solid color-mix(in srgb, var(--color-warn), transparent 60%);
    color: var(--color-warn);
  }

  .note-label {
    font-size: 10.5px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .note-result {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 500;
  }

  .del-table {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: 12px;
  }

  .del-header-row {
    display: grid;
    grid-template-columns: 1fr 130px 140px 30px;
    padding: 5px 9px;
    background: var(--color-felt-raised);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-ink-muted);
    border-bottom: 1px solid var(--color-wire);
  }

  .del-row {
    display: grid;
    grid-template-columns: 1fr 130px 140px 30px;
    padding: 4px 9px;
    align-items: center;
  }

  .del-row + .del-row {
    border-top: 1px solid var(--color-felt-active);
  }

  .del-input {
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
    font-family: var(--font-ui);
    padding: 4px 0;
  }

  .del-input.mono {
    font-family: var(--font-data);
  }

  .del-select {
    border: none;
    background: transparent;
    font-size: 11px;
    color: var(--color-ink-secondary);
    outline: none;
    cursor: pointer;
    font-family: var(--font-ui);
  }

  .del-rm {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-ink-ghost);
    font-size: 14px;
  }

  .add-btn {
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: #fff;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    margin-bottom: 14px;
  }

  .result-bar {
    margin-top: 16px;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .result-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-muted);
  }
  .result-sub {
    font-size: 10px;
    color: var(--color-ink-ghost);
    margin-top: 2px;
  }
  .result-right {
    text-align: right;
  }
  .result-value {
    font-family: var(--font-data);
    font-size: 18px;
    font-weight: 500;
  }

  .result-del {
    display: inline-block;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    margin-top: 4px;
    font-size: 10px;
    font-weight: 700;
    font-family: var(--font-data);
    background: var(--color-ink-ghost);
    color: #fff;
  }

  .result-del.del-high {
    background: var(--color-vekt);
  }
  .result-del.del-mid {
    background: var(--color-vekt);
  }
</style>
