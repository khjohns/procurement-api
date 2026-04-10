<script lang="ts">
  import SaksmappeTeam from '$lib/components/saksmappe/SaksmappeTeam.svelte';
  import { formatNOK } from '$lib/utils/format';
  import { demoSaksmappe } from '$lib/data/saksmappe-demo';

  let { data } = $props();

  const proc = $derived(data?.proc);

  // Team from demo data until API supports it
  const { team } = demoSaksmappe;

  interface MetaItem {
    label: string;
    value: string;
    mono?: boolean;
    ref?: string;
  }

  const klassifisering = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    return [
      proc.contractCategory && { label: 'Kontraktstype', value: proc.contractCategory },
      proc.procedure && { label: 'Prosedyre', value: proc.procedure },
      proc.framework_agreement_involved && { label: 'Rammeavtale', value: 'Ja' },
      proc.threshold === 'ABOVE_EEA' && { label: 'Terskel', value: 'Over EØS-terskel (Del III)' },
      proc.threshold === 'BELOW_EEA' && { label: 'Terskel', value: 'Under EØS-terskel (Del II)' },
    ].filter(Boolean) as MetaItem[];
  });

  const okonomi = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    return [
      proc.estimated_value && {
        label: 'Anslått verdi',
        value: formatNOK(proc.estimated_value),
        mono: true,
      },
      proc.total_value && {
        label: 'Kontraktsverdi',
        value: formatNOK(proc.total_value),
        mono: true,
      },
    ].filter(Boolean) as MetaItem[];
  });
</script>

<div class="reg-page">
  {#if !proc}
    <div class="page-inner">
      <div class="empty-state">
        <p>Ingen anskaffelse lastet.</p>
        <a href="/anskaffelser/ny" class="empty-link">Opprett ny anskaffelse</a>
      </div>
    </div>
  {:else}
    <div class="page-inner">
      <!-- Klassifisering -->
      <div class="card">
        <div class="section-label">Klassifisering</div>
        {#if klassifisering.length > 0}
          <div class="meta-grid">
            {#each klassifisering as m}
              <div class="meta-cell">
                <div class="meta-label">{m.label}</div>
                <div class="meta-value">
                  {m.value}
                  {#if m.ref}<span class="meta-ref">{m.ref}</span>{/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="meta-empty">Ingen klassifiseringsdata tilgjengelig.</div>
        {/if}
      </div>

      <!-- Økonomi -->
      {#if okonomi.length > 0}
        <div class="card">
          <div class="section-label">Økonomi</div>
          <div class="okonomi-row">
            {#each okonomi as m}
              <div class="okonomi-item">
                <div class="meta-label">{m.label}</div>
                <div class="okonomi-value">{m.value}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Team -->
      <div class="card">
        <SaksmappeTeam {team} />
      </div>

      <!-- Verktøy -->
      <div class="card">
        <div class="section-label">Verktøy</div>
        <div class="tools-grid">
          <a href="/verktoy/unntak" class="tool-link">
            <span class="tool-label">Unntaksveiviser</span>
            <span class="tool-desc">Sjekk om unntak fra forskriften gjelder</span>
            <span class="tool-arrow">›</span>
          </a>
          <a href="/verktoy/kalkulator" class="tool-link">
            <span class="tool-label">Terskelverdikalkulator</span>
            <span class="tool-desc">Beregn terskelverdi og gjeldende del</span>
            <span class="tool-arrow">›</span>
          </a>
          <a href="/verktoy/fristberegner" class="tool-link">
            <span class="tool-label">Fristberegner</span>
            <span class="tool-desc">Beregn minimumsfrister for prosedyren</span>
            <span class="tool-arrow">›</span>
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .reg-page {
    height: 100%;
    overflow-y: auto;
  }

  .page-inner {
    max-width: 880px;
    margin: 0 auto;
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .card {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    padding: var(--spacing-4) var(--spacing-5);
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-4);
    min-height: 200px;
    color: var(--color-ink-ghost);
    font-size: 13px;
  }

  .empty-link {
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-radius: var(--radius-sm);
    color: var(--color-vekt);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: background-color 0.12s;
  }

  .empty-link:hover {
    background: var(--color-vekt-bg-strong);
  }

  /* ── Metadata grid ── */
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .meta-cell {
    padding: var(--spacing-3) var(--spacing-4);
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

  .meta-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    margin-left: 4px;
  }

  .meta-empty {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  /* ── Økonomi ── */
  .okonomi-row {
    display: flex;
    gap: var(--spacing-6);
  }

  .okonomi-item {
    flex: 1;
  }

  .okonomi-value {
    font-family: var(--font-data);
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    line-height: 1.2;
    margin-top: var(--spacing-1);
  }

  /* ── Tools ── */
  .tools-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .tool-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: background-color 0.12s;
  }

  .tool-link:hover {
    background: var(--color-vekt-bg-strong);
  }

  .tool-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-vekt);
  }

  .tool-desc {
    font-size: 11px;
    color: var(--color-ink-muted);
    flex: 1;
  }

  .tool-arrow {
    font-size: 14px;
    color: var(--color-vekt);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }

    .okonomi-row {
      flex-direction: column;
      gap: var(--spacing-3);
    }
  }
</style>
