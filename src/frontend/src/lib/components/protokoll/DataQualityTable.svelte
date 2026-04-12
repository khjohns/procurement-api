<script lang="ts">
  import type { ResolvedSection } from '$lib/stores/protokoll.svelte';

  interface Props {
    sections: ResolvedSection[];
  }

  let { sections }: Props = $props();

  const sourceLabels: Record<string, { label: string; cssClass: string }> = {
    api: { label: 'Artifik API', cssClass: 'source-api' },
    eforms: { label: 'Doffin eForms', cssClass: 'source-eforms' },
    manual: { label: 'Manuelt', cssClass: 'source-manual' },
    mixed: { label: 'API + Manuelt', cssClass: 'source-mixed' },
  };

  let displaySections = $derived(sections.filter((s) => s.visible && s.id !== 'datakvalitet'));
</script>

<div class="field-label">DATAKVALITET — API VS. MANUELT</div>
<div class="dq-table">
  <div class="dq-header">
    <div class="dq-col-section">Seksjon</div>
    <div class="dq-col-source">Kilde</div>
  </div>
  {#each displaySections as section}
    {@const src = sourceLabels[section.dataSource] ?? sourceLabels.manual}
    <div class="dq-row">
      <div class="dq-col-section">{section.title}</div>
      <div class="dq-col-source">
        {#if section.dataSource === 'mixed'}
          <span class="source-dot source-api">●</span>
          <span class="source-label source-api">API</span>
          <span class="source-dot source-manual">◐</span>
          <span class="source-label source-manual">Manuelt</span>
        {:else}
          <span class="source-dot {src.cssClass}">
            {section.dataSource === 'manual' ? '◐' : '●'}
          </span>
          <span class="source-label {src.cssClass}">{src.label}</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-2);
  }

  .dq-table {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .dq-header {
    display: flex;
    padding: var(--spacing-2) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire-strong);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
  }

  .dq-row {
    display: flex;
    padding: var(--spacing-2) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
    font-size: 12px;
  }

  .dq-row:last-child {
    border-bottom: none;
  }

  .dq-col-section {
    flex: 1;
    min-width: 0;
    color: var(--color-ink-secondary);
  }

  .dq-col-source {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .source-dot {
    font-size: 11px;
  }

  .source-label {
    font-size: 11px;
    margin-right: var(--spacing-2);
  }

  .source-api {
    color: var(--color-score-high);
  }

  .source-eforms {
    color: var(--color-vekt);
  }

  .source-manual {
    color: var(--color-ink-secondary);
  }

  .source-mixed {
    color: var(--color-ink-secondary);
  }
</style>
