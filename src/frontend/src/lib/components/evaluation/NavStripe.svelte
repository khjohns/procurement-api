<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import { countDone } from './shared';

  let {
    aktivId,
    onselect,
    onback,
  }: {
    aktivId: string;
    onselect: (id: string) => void;
    onback: () => void;
  } = $props();

  let qualityCriteria = $derived(evaluation.data.criteria.filter((c) => c.type !== 'price'));
</script>

<div class="nav-stripe">
  <button class="nav-back" onclick={onback}>← Matrise</button>
  {#each qualityCriteria as k (k.id)}
    {@const c = countDone(k, evaluation.data.suppliers)}
    {@const cur = aktivId === k.id}
    {@const pct = c.total > 0 ? c.done / c.total : 0}
    <button class="nav-tab" class:nav-tab-active={cur} onclick={() => onselect(k.id)}>
      <span class="nav-tab-label">{k.name} <span class="nav-tab-weight">{k.weight}%</span></span>
      <span class="nav-tab-count" class:nav-tab-done={pct === 1}>
        {c.done}/{c.total}
      </span>
      <div class="nav-tab-bar" style:width="{pct * 100}%" class:nav-tab-bar-done={pct === 1}></div>
    </button>
  {/each}
</div>

<style>
  .nav-stripe {
    display: flex;
    align-items: stretch;
    gap: var(--spacing-1);
    padding: var(--spacing-3) 0 var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
  }

  .nav-back {
    flex-shrink: 0;
    white-space: nowrap;
    font-weight: 600;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink-secondary);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-4);
    cursor: pointer;
    transition: all 0.12s;
  }

  .nav-back:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .nav-tab {
    flex: 1 1 0;
    max-width: 280px;
    padding: var(--spacing-2) var(--spacing-2) var(--spacing-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    text-align: center;
    position: relative;
    overflow: hidden;
    min-width: 0;
    transition: all 0.12s;
  }

  .nav-tab-active {
    border-color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .nav-tab:hover:not(.nav-tab-active) {
    background: var(--color-felt-hover);
  }

  .nav-tab-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-tab-active .nav-tab-label {
    font-weight: 700;
    color: var(--color-vekt);
  }

  .nav-tab-weight {
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    margin-left: 2px;
  }

  .nav-tab-active .nav-tab-weight {
    color: var(--color-vekt-dim);
  }

  .nav-tab-count {
    display: block;
    font-size: 9px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    margin-top: 1px;
  }

  .nav-tab-done {
    color: var(--color-score-high);
  }

  .nav-tab-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--color-vekt);
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    transition: width 0.3s;
  }

  .nav-tab-bar-done {
    background: var(--color-score-high);
  }
</style>
