<script lang="ts">
  import { evaluation, fmt2, formatNOK } from '$lib/stores/evaluation.svelte';
  import { fN } from './shared';

  let {
    onopendrawer,
  }: {
    onopendrawer: () => void;
  } = $props();

  let ranked = $derived(evaluation.ranking);
  let margin = $derived(evaluation.margin);
  let verdict = $derived(margin >= 0.5 ? 'Robust' : margin >= 0.2 ? 'Moderat' : 'Sårbar');
  let verdictClass = $derived(
    margin >= 0.5 ? 'verdict-robust' : margin >= 0.2 ? 'verdict-moderat' : 'verdict-saarbar'
  );

  let expanded = $state(false);

  let qualWeight = $derived(evaluation.qualityWeightDerived);
  let qualBudget = $derived(evaluation.qualityBudget);
</script>

{#if ranked.length >= 2}
  <div class="stripe">
    <div class="stripe-line">
      {#each ranked.slice(0, 3) as item, i (item.supplier.id)}
        <span class="stripe-rank">
          <span class="stripe-badge" class:stripe-badge-leader={i === 0}>{i + 1}</span>
          <span class="stripe-name" class:stripe-name-leader={i === 0}>{item.supplier.name}</span>
          <span class="stripe-score">{fmt2(item.score)}</span>
        </span>
      {/each}
      <span class="stripe-sep">·</span>
      <span class="stripe-verdict {verdictClass}">Margin: {margin.toFixed(2)}p ({verdict})</span>
      <span class="stripe-actions">
        <button class="stripe-btn" onclick={() => (expanded = !expanded)}>
          {expanded ? 'Skjul' : 'Nøkkeltall'}
          <span class="stripe-caret">{expanded ? '▴' : '▾'}</span>
        </button>
        <button class="stripe-btn stripe-btn-accent" onclick={onopendrawer}>Analyse ›</button>
      </span>
    </div>

    {#if expanded}
      <div class="stripe-metrics">
        <div class="metric-card">
          <div class="metric-label">Margin #1→#2</div>
          <div class="metric-value">{margin.toFixed(2)} poeng</div>
          <div class="metric-sub {verdictClass}">{verdict}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Kvalitetsbudsjett</div>
          <div class="metric-value">{fN(qualBudget)} kr</div>
          <div class="metric-sub">{qualWeight}% av laveste pris ({fN(evaluation.lowestPrice)})</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Kvalitet/pris</div>
          <div class="metric-value">{qualWeight}/{evaluation.priceWeightDerived}%</div>
          <div class="metric-sub">Effektiv fordeling</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Leverandører</div>
          <div class="metric-value">{ranked.length} rangert</div>
          <div class="metric-sub">av {evaluation.data.suppliers.length} totalt</div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .stripe {
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--color-wire);
    margin-bottom: var(--spacing-4);
  }

  .stripe-line {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .stripe-rank {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-right: var(--spacing-1);
  }

  .stripe-badge {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    font-family: var(--font-data);
    background: var(--color-felt-raised);
    color: var(--color-ink-ghost);
    border: 1px solid var(--color-wire);
  }

  .stripe-badge-leader {
    background: var(--color-score-high);
    color: #fff;
    border-color: transparent;
  }

  .stripe-name {
    font-size: 11px;
    font-weight: 400;
    color: var(--color-ink);
  }

  .stripe-name-leader {
    font-weight: 600;
    color: var(--color-score-high);
  }

  .stripe-score {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  .stripe-sep {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin: 0 var(--spacing-1);
  }

  .stripe-verdict {
    font-size: 11px;
    font-weight: 600;
  }

  .verdict-robust {
    color: var(--color-score-high);
  }
  .verdict-moderat {
    color: var(--color-warn);
  }
  .verdict-saarbar {
    color: var(--color-score-low);
  }

  .stripe-actions {
    margin-left: auto;
    display: flex;
    gap: var(--spacing-2);
  }

  .stripe-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .stripe-btn:hover {
    color: var(--color-ink-secondary);
  }

  .stripe-btn-accent {
    color: var(--color-vekt);
  }

  .stripe-btn-accent:hover {
    color: var(--color-vekt-dim);
  }

  .stripe-caret {
    margin-left: 2px;
  }

  .stripe-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-top: var(--spacing-3);
    border: 1px solid var(--color-wire);
  }

  .metric-card {
    padding: var(--spacing-3);
    background: var(--color-felt);
  }

  .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .metric-value {
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-data);
    color: var(--color-ink);
  }

  .metric-sub {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-top: 1px;
  }
</style>
