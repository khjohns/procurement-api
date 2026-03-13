<script lang="ts">
  import { evaluation, formatNOK, fmt2 } from '$lib/stores/evaluation.svelte';

  let isPriceMode = $derived(evaluation.activeMethod === 'pris');

  let items = $derived(
    isPriceMode
      ? evaluation.priceRanking.map((r) => ({
          rank: r.rank,
          name: r.supplier.name,
          value: formatNOK(r.evaluatedPrice),
          unit: 'kr',
          barWidth:
            r.rank === 1
              ? 92
              : Math.min(
                  100,
                  (r.evaluatedPrice /
                    evaluation.priceRanking[evaluation.priceRanking.length - 1].evaluatedPrice) *
                    100
                ),
        }))
      : evaluation.ranking.map((r) => ({
          rank: r.rank,
          name: r.supplier.name,
          value: fmt2(r.score),
          unit: '/ 10',
          barWidth: r.score * 10,
        }))
  );

  let sectionLabel = $derived(isPriceMode ? 'Rangering etter evaluert pris' : 'Rangering');
</script>

<div class="section-label">{sectionLabel}</div>
<div class="ranking-strip">
  {#each items as item}
    <div class="rank-card" class:rank-1={item.rank === 1}>
      <div class="rank-card-header">
        <span class="rank-position">#{item.rank}</span>
        {#if item.rank === 1}
          <span class="rank-badge">Anbefalt</span>
        {/if}
      </div>
      <div class="rank-supplier">{item.name}</div>
      <div class="rank-score-row">
        <span class="rank-score" class:rank-score-price={isPriceMode}>{item.value}</span>
        <span class="rank-max">{item.unit}</span>
      </div>
      <div class="rank-bar">
        <div class="rank-bar-fill" style="width: {item.barWidth}%"></div>
      </div>
    </div>
  {/each}
</div>

<style>
  .section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
  }

  .ranking-strip {
    display: flex;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-6);
  }

  .rank-card {
    flex: 1;
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-lg);
    position: relative;
    transition: border-color 0.15s;
  }

  .rank-card:hover {
    border-color: var(--color-wire-strong);
  }

  .rank-1 {
    border-color: rgba(232, 168, 56, 0.18);
  }

  .rank-1::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-vekt);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .rank-card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .rank-position {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-muted);
  }

  .rank-1 .rank-position {
    color: var(--color-vekt-dim);
  }

  .rank-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .rank-supplier {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: var(--spacing-2);
    letter-spacing: -0.01em;
  }

  .rank-score-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-1);
    margin-bottom: var(--spacing-2);
  }

  .rank-score {
    font-family: var(--font-data);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .rank-score-price {
    font-size: 22px;
  }

  .rank-1 .rank-score {
    color: var(--color-vekt);
  }

  .rank-max {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  .rank-bar {
    height: 3px;
    background: var(--color-felt-raised);
    border-radius: 2px;
    overflow: hidden;
  }

  .rank-bar-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--color-ink-muted);
    transition: width 0.4s ease-out;
  }

  .rank-1 .rank-bar-fill {
    background: var(--color-vekt);
  }
</style>
