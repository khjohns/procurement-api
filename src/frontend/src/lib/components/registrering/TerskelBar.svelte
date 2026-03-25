<script lang="ts">
  import type { OppdragsgiverType, KontraktstypeId } from '$lib/types/registrering';
  import { getEos } from '$lib/data/registrering-config';
  import { formatNOK } from '$lib/utils/format';

  let {
    verdi,
    oppdragsgiver,
    kontraktstype,
  }: {
    verdi: number;
    oppdragsgiver: OppdragsgiverType;
    kontraktstype: KontraktstypeId;
  } = $props();

  interface Zone {
    l: string;
    f: number;
    t: number;
    w: number;
  }

  const eos = $derived(getEos(oppdragsgiver, kontraktstype));

  const zones = $derived.by((): Zone[] => {
    const h = kontraktstype === 'helse';
    const s = kontraktstype === 'saerlig';
    const b = kontraktstype === 'bygge';

    if (h)
      return [
        { l: 'Under', f: 0, t: 100_000, w: 6 },
        { l: 'Del I', f: 100_000, t: 7_800_000, w: 44 },
        { l: 'Del IV', f: 7_800_000, t: 60e6, w: 50 },
      ];
    if (s)
      return [
        { l: 'Under', f: 0, t: 100_000, w: 6 },
        { l: 'Del I', f: 100_000, t: 1_300_000, w: 16 },
        { l: 'Del II', f: 1_300_000, t: 7_800_000, w: 35 },
        { l: 'Del II+', f: 7_800_000, t: 60e6, w: 43 },
      ];
    return [
      { l: 'Under', f: 0, t: 100_000, w: 6 },
      { l: 'Del I', f: 100_000, t: 1_300_000, w: 16 },
      { l: 'Del II', f: 1_300_000, t: eos, w: b ? 18 : 32 },
      { l: 'Del III', f: eos, t: b ? 100e6 : 60e6, w: b ? 60 : 46 },
    ];
  });

  const pos = $derived.by(() => {
    if (!verdi || verdi <= 0) return -1;
    let a = 0;
    for (const z of zones) {
      if (verdi <= z.t) return a + ((verdi - z.f) / (z.t - z.f)) * z.w;
      a += z.w;
    }
    return 100;
  });

  const fills = [
    'var(--color-felt-active)',
    'var(--color-wire)',
    'var(--color-vekt)',
    'var(--color-vekt-dim)',
  ];
</script>

<div class="bar-container">
  <div class="bar">
    {#each zones as z, i}
      <div class="zone" class:zone-high={i >= 2} style:width="{z.w}%" style:background={fills[i]}>
        {z.l}
      </div>
    {/each}
    {#if pos >= 0}
      <div class="marker" style:left="{pos}%"></div>
    {/if}
  </div>
  <div class="labels">
    {#each zones.slice(1) as z, i}
      <div class="threshold-label" style:width="{zones[i].w}%">
        {formatNOK(z.f)}
      </div>
    {/each}
  </div>
</div>

<style>
  .bar-container {
    position: relative;
  }

  .bar {
    position: relative;
    display: flex;
    height: 18px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .zone {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8.5px;
    font-weight: 600;
    color: var(--color-ink-muted);
    letter-spacing: 0.03em;
    font-family: var(--font-ui);
    border-right: 1px solid var(--color-wire);
  }

  .zone:last-child {
    border-right: none;
  }

  .zone-high {
    color: rgba(255, 255, 255, 0.9);
  }

  .marker {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--color-ink);
    border-radius: 1px;
    transform: translateX(-50%);
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 0 2px rgba(30, 37, 48, 0.12);
  }

  .labels {
    display: flex;
    margin-top: 4px;
  }

  .threshold-label {
    text-align: right;
    font-size: 8.5px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    padding-right: 2px;
  }
</style>
