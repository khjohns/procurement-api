<script lang="ts">
  import type { OppdragsgiverType, KontraktstypeId, VarighetType } from '$lib/types/registrering';
  import { getEos, getDel, getKrav, TIDSUBEGRENSET_FAKTOR } from '$lib/data/registrering-config';
  import RegistreringForm from '$lib/components/registrering/RegistreringForm.svelte';
  import AnalysePanel from '$lib/components/registrering/AnalysePanel.svelte';
  import ToolHeader from '$lib/components/verktoy/ToolHeader.svelte';

  // All form state owned at page level
  let saksnr = $state('');
  let tittel = $state('');
  let beskrivelse = $state('');
  let oppdragsgiver = $state<OppdragsgiverType | ''>('');
  let kontraktstype = $state<KontraktstypeId | ''>('');
  let varighetType = $state<VarighetType | ''>('');
  let varighetMnd = $state('');
  let maanedligVerdi = $state('');
  let anslattVerdi = $state('');
  let opsjonVerdi = $state('');
  let valgtUnntak = $state<string[]>([]);
  let unntakBegrunnelse = $state('');

  // Computed
  const totalVerdi = $derived.by(() => {
    if (varighetType === 'tidsubegrenset' && maanedligVerdi) {
      return (parseFloat(maanedligVerdi) || 0) * TIDSUBEGRENSET_FAKTOR;
    }
    return (parseFloat(anslattVerdi) || 0) + (parseFloat(opsjonVerdi) || 0);
  });

  const eos = $derived(
    oppdragsgiver && kontraktstype
      ? getEos(oppdragsgiver as OppdragsgiverType, kontraktstype as KontraktstypeId)
      : 0
  );

  const gjeldendeDel = $derived(
    kontraktstype
      ? getDel(totalVerdi, kontraktstype as KontraktstypeId, eos)
      : { del: 'ingen', label: '', desc: '' }
  );

  const krav = $derived(getKrav(totalVerdi, gjeldendeDel.del, valgtUnntak.length > 0));
</script>

<div class="reg-shell">
  <ToolHeader title="Anskaffelsesregistrering" ref="FOR-2016-08-12-974" />

  <div class="reg-body">
    <RegistreringForm
      bind:saksnr
      bind:tittel
      bind:beskrivelse
      bind:oppdragsgiver
      bind:kontraktstype
      bind:varighetType
      bind:varighetMnd
      bind:maanedligVerdi
      bind:anslattVerdi
      bind:opsjonVerdi
      bind:valgtUnntak
      bind:unntakBegrunnelse
      {totalVerdi}
      {gjeldendeDel}
    />
    <AnalysePanel
      {tittel}
      {saksnr}
      {totalVerdi}
      oppdragsgiver={oppdragsgiver as OppdragsgiverType}
      kontraktstype={kontraktstype as KontraktstypeId}
      {gjeldendeDel}
      {eos}
      {krav}
    />
  </div>
</div>

<style>
  .reg-shell {
    min-height: 100vh;
    background: var(--color-canvas);
  }

  .reg-body {
    max-width: 1040px;
    margin: 24px auto;
    display: flex;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 8px rgba(30, 37, 48, 0.06);
    min-height: calc(100vh - 100px);
  }
</style>
