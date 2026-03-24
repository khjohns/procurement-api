<script lang="ts">
  import type {
    OppdragsgiverType,
    KontraktstypeId,
    VarighetType,
    GjeldendeDel,
  } from '$lib/types/registrering';
  import {
    OPPDRAGSGIVERE,
    KONTRAKTSTYPER,
    UNNTAK_GENERELLE,
    UNNTAK_DEL2,
    UNNTAK_DEL3_FORH,
    UNNTAK_DEL3_UTEN,
  } from '$lib/data/registrering-config';
  import { formatNOK } from '$lib/utils/format';
  import { TIDSUBEGRENSET_FAKTOR } from '$lib/data/registrering-config';
  import FormField from './FormField.svelte';
  import FormDivider from './FormDivider.svelte';
  import RadioCards from './RadioCards.svelte';
  import CheckboxGroup from './CheckboxGroup.svelte';

  let {
    saksnr = $bindable(),
    tittel = $bindable(),
    beskrivelse = $bindable(),
    oppdragsgiver = $bindable(),
    kontraktstype = $bindable(),
    varighetType = $bindable(),
    varighetMnd = $bindable(),
    maanedligVerdi = $bindable(),
    anslattVerdi = $bindable(),
    opsjonVerdi = $bindable(),
    valgtUnntak = $bindable(),
    unntakBegrunnelse = $bindable(),
    totalVerdi,
    gjeldendeDel,
  }: {
    saksnr: string;
    tittel: string;
    beskrivelse: string;
    oppdragsgiver: OppdragsgiverType | '';
    kontraktstype: KontraktstypeId | '';
    varighetType: VarighetType | '';
    varighetMnd: string;
    maanedligVerdi: string;
    anslattVerdi: string;
    opsjonVerdi: string;
    valgtUnntak: string[];
    unntakBegrunnelse: string;
    totalVerdi: number;
    gjeldendeDel: GjeldendeDel;
  } = $props();
</script>

<div class="form">
  <FormDivider label="Identifikasjon" />

  <div class="row">
    <div class="col-saksnr">
      <FormField label="Saksnummer">
        <input class="form-input mono" bind:value={saksnr} placeholder="2026/1234" />
      </FormField>
    </div>
    <div class="col-tittel">
      <FormField label="Tittel">
        <input
          class="form-input"
          bind:value={tittel}
          placeholder="Kort, beskrivende tittel på anskaffelsen"
        />
      </FormField>
    </div>
  </div>

  <FormField
    label="Beskrivelse"
    hint="Beskriv hva som skal anskaffes. Danner grunnlag for protokollen."
  >
    <textarea
      class="form-textarea"
      bind:value={beskrivelse}
      placeholder="Beskriv behovet, omfanget og hva kontrakten skal dekke..."
      rows="3"
    ></textarea>
  </FormField>

  <FormDivider label="Klassifisering" />

  <FormField label="Oppdragsgiver" hjemmel="LOA § 2">
    <RadioCards
      options={OPPDRAGSGIVERE}
      value={oppdragsgiver}
      onchange={(id) => (oppdragsgiver = id as OppdragsgiverType)}
    />
  </FormField>

  <FormField label="Kontraktstype" hjemmel="FOA § 4-1">
    <RadioCards
      options={KONTRAKTSTYPER}
      value={kontraktstype}
      onchange={(id) => (kontraktstype = id as KontraktstypeId)}
    />
  </FormField>

  <FormDivider label="Verdiberegning" />

  <FormField label="Kontraktens varighet" hjemmel="FOA § 5-4 (10)–(12)">
    <RadioCards
      options={[
        { id: 'tidsbegrenset', label: 'Tidsbegrenset' },
        { id: 'tidsubegrenset', label: 'Tidsubegrenset' },
      ]}
      value={varighetType}
      onchange={(id) => (varighetType = id as VarighetType)}
      small
    />
  </FormField>

  {#if varighetType === 'tidsbegrenset'}
    <div class="row">
      <div class="col-mnd">
        <FormField label="Varighet (måneder)">
          <input class="form-input mono" type="number" bind:value={varighetMnd} placeholder="24" />
        </FormField>
      </div>
      <div class="col-grow">
        <FormField
          label="Anslått verdi ekskl. mva."
          hjemmel="§ 5-4 (1)"
          hint="Samlet betaling for hele kontraktsperioden."
        >
          <input class="form-input mono" type="number" bind:value={anslattVerdi} placeholder="0" />
        </FormField>
      </div>
      <div class="col-opsjon">
        <FormField label="Herav opsjoner" hjemmel="§ 5-4 (1)" hint="Inkluderes i totalverdi.">
          <input class="form-input mono" type="number" bind:value={opsjonVerdi} placeholder="0" />
        </FormField>
      </div>
    </div>
  {/if}

  {#if varighetType === 'tidsubegrenset'}
    <div class="tidsubegrenset-box">
      <p class="tidsubegrenset-label">Tidsubegrenset kontrakt: Månedlig verdi × 48</p>
      <div class="row">
        <div class="col-grow">
          <FormField label="Månedlig verdi (NOK)" hjemmel="§ 5-4 (10)/(12)">
            <input
              class="form-input mono"
              type="number"
              bind:value={maanedligVerdi}
              placeholder="0"
              oninput={() => {
                anslattVerdi = '';
                opsjonVerdi = '';
              }}
            />
          </FormField>
        </div>
        {#if maanedligVerdi}
          <div class="tidsubegrenset-result">
            = {formatNOK(parseFloat(maanedligVerdi) * TIDSUBEGRENSET_FAKTOR)}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if totalVerdi > 0}
    <div class="total-bar">
      <span class="total-label">Total anslått verdi ekskl. mva.</span>
      <span class="total-value">{formatNOK(totalVerdi)}</span>
    </div>
  {/if}

  <FormDivider label="Unntak" />

  <p class="unntak-intro">
    Velg eventuelle unntak som gjør at deler av regelverket ikke kommer til anvendelse.
  </p>

  <FormField label="Generelle unntak" hjemmel="FOA kap. 2–3">
    <CheckboxGroup
      items={UNNTAK_GENERELLE}
      selected={valgtUnntak}
      onchange={(v) => (valgtUnntak = v)}
    />
  </FormField>

  {#if ['II', 'II+'].includes(gjeldendeDel.del)}
    <FormField label="Unntak fra Del II — direkte anskaffelse" hjemmel="FOA § 5-2">
      <CheckboxGroup
        items={UNNTAK_DEL2}
        selected={valgtUnntak}
        onchange={(v) => (valgtUnntak = v)}
      />
    </FormField>
  {/if}

  {#if gjeldendeDel.del === 'III'}
    <FormField label="Forhandling uten forutgående kunngjøring" hjemmel="FOA § 13-3">
      <CheckboxGroup
        items={UNNTAK_DEL3_FORH}
        selected={valgtUnntak}
        onchange={(v) => (valgtUnntak = v)}
      />
    </FormField>
    <FormField label="Anskaffelse uten konkurranse" hjemmel="FOA § 13-4">
      <CheckboxGroup
        items={UNNTAK_DEL3_UTEN}
        selected={valgtUnntak}
        onchange={(v) => (valgtUnntak = v)}
      />
    </FormField>
  {/if}

  {#if valgtUnntak.length > 0}
    <FormField
      label="Begrunnelse for unntak"
      hjemmel="§ 10-5 / § 25-5"
      hint="Begrunnelsen dokumenteres i anskaffelsesprotokollen."
    >
      <textarea
        class="form-textarea"
        bind:value={unntakBegrunnelse}
        placeholder="Begrunn hvorfor vilkårene for unntak er oppfylt..."
        rows="3"
      ></textarea>
    </FormField>
  {/if}
</div>

<style>
  .form {
    flex: 1 1 62%;
    padding: 28px 32px;
    border-right: 1px solid var(--color-wire);
  }

  .row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }

  .col-saksnr {
    flex: 0 0 160px;
  }
  .col-tittel {
    flex: 1 1 280px;
  }
  .col-mnd {
    flex: 0 0 130px;
  }
  .col-grow {
    flex: 1 1 200px;
  }
  .col-opsjon {
    flex: 0 0 160px;
  }

  .tidsubegrenset-box {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: var(--color-warn-bg);
    border: 1px solid color-mix(in srgb, var(--color-warn), transparent 60%);
    margin-bottom: 16px;
  }

  .tidsubegrenset-label {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--color-warn);
    margin-bottom: 10px;
  }

  .tidsubegrenset-result {
    flex: 0 0 auto;
    align-self: flex-end;
    padding-bottom: 20px;
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-warn);
  }

  .total-bar {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .total-label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--color-ink-muted);
  }

  .total-value {
    font-family: var(--font-data);
    font-size: 15px;
    font-weight: 500;
  }

  .unntak-intro {
    font-size: 10.5px;
    color: var(--color-ink-ghost);
    margin-bottom: 14px;
    line-height: 1.5;
  }
</style>
