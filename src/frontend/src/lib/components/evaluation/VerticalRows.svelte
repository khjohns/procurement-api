<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Supplier } from '$lib/stores/evaluation.svelte';

  let {
    suppliers,
    scoreFn,
    headerColumns,
    row,
    rowClass = '',
    sortScoreLabel = 'Sorter etter score',
  }: {
    suppliers: Supplier[];
    scoreFn: (supplierId: string) => number | null;
    headerColumns: Snippet;
    row: Snippet<[{ supplier: Supplier; setFocus: () => void }]>;
    rowClass?: string;
    sortScoreLabel?: string;
  } = $props();

  let sortBy = $state<'original' | 'score'>('original');
  let focusId = $state<string | null>(null);
  let focusIndex = $derived(focusId ? suppliers.findIndex((s) => s.id === focusId) : -1);

  let sorted = $derived.by(() => {
    if (sortBy === 'original') return suppliers;
    return [...suppliers].sort((a, b) => (scoreFn(b.id) ?? -1) - (scoreFn(a.id) ?? -1));
  });
</script>

<div class="vrow-container">
  <div class="vrow-header">
    <span class="vrow-col-supplier">Leverandør</span>
    {@render headerColumns()}
    <select class="vrow-sort" bind:value={sortBy}>
      <option value="original">Original rekkefølge</option>
      <option value="score">{sortScoreLabel}</option>
    </select>
  </div>
  {#each sorted as lev, i (lev.id)}
    {@const isFocus = focusId === lev.id}
    {@const dimmed = focusIndex >= 0 && !isFocus && Math.abs(focusIndex - i) > 3}
    <div
      class="vrow {rowClass}"
      class:vrow-focus={isFocus}
      class:vrow-dimmed={dimmed}
      class:vrow-separator={i > 0}
    >
      {@render row({ supplier: lev, setFocus: () => (focusId = lev.id) })}
    </div>
  {/each}
</div>

<style>
  .vrow-container {
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .vrow-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-ui);
  }

  .vrow-col-supplier {
    width: 150px;
    flex-shrink: 0;
  }

  .vrow-sort {
    margin-left: auto;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--color-ink-muted);
    background: var(--color-felt);
    outline: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.12s;
  }

  .vrow-sort:hover {
    border-color: var(--color-wire-strong);
  }

  .vrow-sort:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .vrow {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt);
    transition: background 0.15s, opacity 0.2s;
  }

  .vrow:hover:not(.vrow-focus) {
    background: var(--color-felt-hover);
  }

  .vrow-focus {
    background: var(--color-vekt-bg);
  }

  .vrow-dimmed {
    opacity: 0.85;
  }

  .vrow-separator {
    border-top: 1px solid var(--color-wire);
  }
</style>
