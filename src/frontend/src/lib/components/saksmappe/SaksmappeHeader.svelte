<script lang="ts">
  import type { Sak } from '$lib/types/saksmappe';
  import { formatNOK } from '$lib/utils/format';

  let { sak }: { sak: Sak } = $props();

  const metadata = $derived([
    { label: 'Oppdragsgiver', value: sak.oppdragsgiver, span: 2 },
    { label: 'Kontraktstype', value: sak.kontraktstype, ref: sak.kontraktstypeRef },
    { label: 'Prosedyre', value: sak.prosedyre, ref: sak.prosedyreRef },
    { label: 'Anslått verdi', value: formatNOK(sak.verdi), mono: true },
    { label: 'EØS-terskel', value: formatNOK(sak.eosTerskel), mono: true },
    { label: 'Varighet', value: sak.varighet },
    { label: 'Opprettet', value: sak.opprettet, mono: true },
  ]);
</script>

<div class="header">
  <div class="badges">
    <span class="saksnr">{sak.saksnr}</span>
    <span class="del-badge">Del {sak.del}</span>
    <span class="status-badge">Pågående</span>
  </div>

  <h1 class="tittel">{sak.tittel}</h1>
  <p class="beskrivelse">{sak.beskrivelse}</p>

  <div class="metadata-grid">
    {#each metadata as m}
      <div class="meta-cell" style:grid-column={m.span ? `span ${m.span}` : undefined}>
        <div class="meta-label">{m.label}</div>
        <div class="meta-value" class:mono={m.mono}>
          {m.value}
          {#if m.ref}<span class="meta-ref">{m.ref}</span>{/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .header {
    padding: 28px 36px 24px;
    border-bottom: 1px solid var(--color-wire);
  }

  .badges {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .saksnr {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-ghost);
  }

  .del-badge {
    font-size: 10px;
    font-weight: 700;
    font-family: var(--font-data);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-vekt);
    color: #fff;
    letter-spacing: 0.03em;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 600;
    font-family: var(--font-data);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
  }

  .tittel {
    font-family: var(--font-prose);
    font-size: 22px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .beskrivelse {
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
    max-width: 600px;
    margin-bottom: 20px;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .meta-cell {
    padding: 10px 14px;
    background: var(--color-felt);
  }

  .meta-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .meta-value {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .meta-value.mono {
    font-family: var(--font-data);
  }

  .meta-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    margin-left: 4px;
  }
</style>
