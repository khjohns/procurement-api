<script lang="ts">
  import { evaluation, criterionMode } from '$lib/stores/evaluation.svelte';
  import CriterionLeafView from './CriterionLeafView.svelte';
  import CriterionPriceView from './CriterionPriceView.svelte';
  import CriterionResourceView from './CriterionResourceView.svelte';
  import CriterionTraditionalView from './CriterionTraditionalView.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);

  let mode = $derived(criterionMode(criterion));

  let criterionIndex = $derived(evaluation.data.criteria.findIndex((c) => c.id === criterionId));

  let prevCriterion = $derived(
    criterionIndex > 0 ? evaluation.data.criteria[criterionIndex - 1] : null
  );

  let nextCriterion = $derived(
    criterionIndex < evaluation.data.criteria.length - 1
      ? evaluation.data.criteria[criterionIndex + 1]
      : null
  );
</script>

<!-- Navigation bar -->
<div class="criterion-nav">
  <button class="nav-back" onclick={() => evaluation.setActiveView('overview')}>
    ← Oversikt
  </button>
  <div class="nav-center">
    {#if prevCriterion}
      <button
        class="nav-arrow"
        onclick={() => evaluation.setActiveView(prevCriterion.id)}
        title={prevCriterion.name}
      >
        ‹
      </button>
    {/if}
    <span class="nav-title">{criterion.name}</span>
    <span class="nav-weight">{criterion.weight}%</span>
    {#if mode === 'resource'}
      <span class="nav-mode-badge">RESSURS</span>
    {/if}
    {#if nextCriterion}
      <button
        class="nav-arrow"
        onclick={() => evaluation.setActiveView(nextCriterion.id)}
        title={nextCriterion.name}
      >
        ›
      </button>
    {/if}
  </div>
  <div class="nav-spacer"></div>
</div>

{#if criterion.type === 'price'}
  <CriterionPriceView {criterionId} />
{:else if mode === 'leaf'}
  <CriterionLeafView {criterionId} />
{:else if mode === 'resource'}
  <CriterionResourceView {criterionId} />
{:else}
  <CriterionTraditionalView {criterionId} />
{/if}

<style>
  /* ── Navigation bar ── */
  .criterion-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-5);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
  }

  .nav-back {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: all 0.1s;
  }

  .nav-back:hover {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .nav-back:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .nav-center {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex: 1;
    justify-content: center;
  }

  .nav-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.01em;
  }

  .nav-weight {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-vekt-dim);
  }

  .nav-arrow {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: all 0.1s;
    line-height: 1;
  }

  .nav-arrow:hover {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }

  .nav-arrow:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .nav-spacer {
    width: 80px;
  }

  /* ── Nav mode badge ── */
  .nav-mode-badge {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-vekt);
    background: var(--color-vekt-bg-strong);
    padding: 2px var(--spacing-2);
    border-radius: var(--radius-sm);
  }
</style>
