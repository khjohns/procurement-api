<script lang="ts">
  import type { Fase } from '$lib/types/saksmappe';
  import SaksmappeFase from './SaksmappeFase.svelte';

  let { faser }: { faser: Fase[] } = $props();
</script>

<div class="prosess">
  <div class="section-label">Prosessforløp</div>
  <div class="faser">
    {#each faser as fase, i}
      <SaksmappeFase {fase} isLast={i === faser.length - 1} />
    {/each}
  </div>
</div>

<style>
  .prosess {
    margin-bottom: 32px;
  }

  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
</style>
