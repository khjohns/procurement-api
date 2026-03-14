<script lang="ts">
  import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';
  import { sensitivity } from '$lib/stores/sensitivity.svelte';

  /** Recompute evaluated prices using the sensitivity store's simulated weights.
   *  Weight changes affect max deductions (when not explicitly set),
   *  which clamps the entered deductions, changing evaluated prices. */
  let simulatedPriceData = $derived.by(() => {
    const simWeightMap = new Map(sensitivity.simulatedWeights.map((w) => [w.id, w.weight]));
    const simTotal = sensitivity.simulatedSum;
    if (simTotal === 0) return { prices: {} as Record<string, number>, ranking: [] as Array<{ id: string; name: string; price: number; rank: number }> };

    const qb = evaluation.data.contractValue * (evaluation.data.qualityWeight / 100);

    // Recalculate total deductions per supplier with simulated weights
    const totalDed: Record<string, number> = {};
    for (const supplier of evaluation.data.suppliers) {
      totalDed[supplier.id] = 0;
    }

    for (const criterion of evaluation.data.criteria) {
      if (criterion.type === 'price') continue;
      const simWeight = simWeightMap.get(criterion.id) ?? criterion.weight;
      const maxDed = criterion.maxPriceDeduction ?? (simTotal > 0 ? qb * (simWeight / simTotal) : 0);

      if (criterion.subcriteria.length === 0 || criterion.evaluationType === 'item') {
        // Leaf/resource: direct deduction
        for (const supplier of evaluation.data.suppliers) {
          const entered = criterion.priceDeductionAmounts?.[supplier.id] ?? 0;
          totalDed[supplier.id] += Math.min(entered, maxDed);
        }
      } else {
        // Traditional: sub-criterion deductions
        const subSum = criterion.subcriteria.reduce((s, sub) => s + sub.weight, 0);
        for (const sub of criterion.subcriteria) {
          const subMaxDed = subSum > 0 ? maxDed * (sub.weight / subSum) : 0;
          for (const supplier of evaluation.data.suppliers) {
            const entered = sub.priceDeductionAmounts?.[supplier.id] ?? 0;
            totalDed[supplier.id] += Math.min(entered, subMaxDed);
          }
        }
      }
    }

    const prices: Record<string, number> = {};
    for (const supplier of evaluation.data.suppliers) {
      if (supplier.price == null) continue;
      prices[supplier.id] = supplier.price - totalDed[supplier.id];
    }

    const ranking = evaluation.data.suppliers
      .filter((s) => s.price != null)
      .map((s) => ({ id: s.id, name: s.name, price: prices[s.id] }))
      .sort((a, b) => a.price - b.price)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return { prices, ranking };
  });

  let winnerChanged = $derived(
    evaluation.priceRanking.length > 0 &&
      simulatedPriceData.ranking.length > 0 &&
      evaluation.priceRanking[0].supplier.id !== simulatedPriceData.ranking[0]?.id
  );

  let rankingChanged = $derived.by(() => {
    if (evaluation.priceRanking.length !== simulatedPriceData.ranking.length) return true;
    return evaluation.priceRanking.some(
      (entry, i) => entry.supplier.id !== simulatedPriceData.ranking[i]?.id
    );
  });
</script>

<div class="sensitivity">
  <!-- Marginer -->
  <div class="section">
    <div class="section-header">Prismarginer</div>

    {#if evaluation.priceRanking.length >= 2}
      {@const winner = evaluation.priceRanking[0]}
      {@const runnerUp = evaluation.priceRanking[1]}
      {@const margin = runnerUp.evaluatedPrice - winner.evaluatedPrice}

      {#each evaluation.priceRanking as entry, i}
        {@const marginToWinner = entry.evaluatedPrice - winner.evaluatedPrice}
        <div class="pair-block">
          <div class="pair-header">
            <span class="pair-rank">#{entry.rank}</span>
            <span class="pair-names">{entry.supplier.name}</span>
            <span class="pair-price">{formatNOK(entry.evaluatedPrice)} kr</span>
            <span class="pair-margin">
              {#if i === 0}
                leder
              {:else}
                +{formatNOK(marginToWinner)} kr
              {/if}
            </span>
          </div>
        </div>
      {/each}

      <div class="robustness-summary">
        Marginen mellom <strong>#{1}</strong> og <strong>#{2}</strong> er
        <span class="mono">{formatNOK(margin)} kr</span>.
        {#if margin > evaluation.data.contractValue * 0.05}
          Resultatet er <strong>robust</strong>.
        {:else if margin > evaluation.data.contractValue * 0.01}
          Resultatet er <strong>moderat robust</strong>.
        {:else}
          Resultatet er <strong>sårbart</strong> — marginen er under 1 % av kontraktsverdien.
        {/if}
      </div>
    {:else}
      <div class="empty-state">Minst to leverandører med pris kreves.</div>
    {/if}
  </div>

  <!-- Simulator -->
  <div class="section">
    <div class="section-header">Simulator — maks fradrag</div>

    <div class="simulator-sliders">
      {#each sensitivity.simulatedWeights as sw}
        {@const changed = sw.weight !== sw.original}
        <div class="slider-row">
          <span class="slider-label">{sw.name}</span>
          <input
            type="range"
            class="slider-input"
            min="0"
            max="100"
            value={sw.weight}
            oninput={(e) => sensitivity.setWeight(sw.id, Number(e.currentTarget.value))}
          />
          <span class="slider-value" class:slider-changed={changed}>
            {#if changed}
              <span class="slider-original">{sw.original}</span>
              <span class="slider-arrow">&rarr;</span>
            {/if}
            {sw.weight} %
          </span>
        </div>
      {/each}
      <div class="slider-sum" class:slider-sum-warning={sensitivity.simulatedSum !== 100}>
        Sum: {sensitivity.simulatedSum} %
      </div>
    </div>

    <div class="ranking-comparison">
      <div class="ranking-col">
        <div class="ranking-col-header">Faktisk</div>
        {#each evaluation.priceRanking as entry}
          <div class="ranking-row">
            <span class="ranking-rank">#{entry.rank}</span>
            <span class="ranking-name">{entry.supplier.name}</span>
            <span class="ranking-score">{formatNOK(entry.evaluatedPrice)}</span>
          </div>
        {/each}
      </div>
      <div class="ranking-col">
        <div class="ranking-col-header">Simulert</div>
        {#each simulatedPriceData.ranking as entry}
          {@const actualRank = evaluation.priceRanking.findIndex((r) => r.supplier.id === entry.id) + 1}
          {@const moved = actualRank !== entry.rank}
          <div class="ranking-row" class:ranking-moved={moved}>
            <span class="ranking-rank">#{entry.rank}</span>
            <span class="ranking-name">{entry.name}</span>
            <span class="ranking-score">{formatNOK(entry.price)}</span>
          </div>
        {/each}
      </div>
    </div>

    {#if winnerChanged}
      <div class="ranking-alert">
        Rangeringen endres! {simulatedPriceData.ranking[0]?.name} går forbi {evaluation
          .priceRanking[0]?.supplier.name}.
      </div>
    {:else if rankingChanged}
      <div class="ranking-alert ranking-alert-minor">Rangeringen endres (samme vinner).</div>
    {/if}

    {#if sensitivity.hasChanges}
      <button class="reset-btn" onclick={() => sensitivity.reset()}>Nullstill</button>
    {/if}
  </div>
</div>

<style>
  .sensitivity {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .section-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
  }

  /* ── Marginer ── */
  .pair-block {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-2);
  }

  .pair-block:first-of-type {
    border-color: var(--color-vekt-bg-strong);
  }

  .pair-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .pair-rank {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    width: 20px;
  }

  .pair-block:first-of-type .pair-rank {
    color: var(--color-vekt-dim);
  }

  .pair-names {
    font-size: 12px;
    font-weight: 500;
    flex: 1;
  }

  .pair-price {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .pair-block:first-of-type .pair-price {
    color: var(--color-vekt);
  }

  .pair-margin {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    width: 100px;
    text-align: right;
  }

  .robustness-summary {
    margin-top: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-left: 3px solid var(--color-vekt);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
  }

  .robustness-summary strong {
    color: var(--color-ink);
    font-weight: 600;
  }

  .mono {
    font-family: var(--font-data);
    color: var(--color-vekt);
    font-weight: 600;
  }

  .empty-state {
    font-size: 12px;
    color: var(--color-ink-muted);
    padding: var(--spacing-4);
    text-align: center;
  }

  /* ── Simulator ── */
  .simulator-sliders {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
  }

  .slider-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    align-items: center;
    gap: var(--spacing-3);
  }

  .slider-label {
    font-size: 12px;
    color: var(--color-ink-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slider-input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--color-felt-active);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-vekt);
    cursor: pointer;
    border: none;
  }

  .slider-input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-vekt);
    cursor: pointer;
    border: none;
  }

  .slider-value {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    text-align: right;
    min-width: 80px;
  }

  .slider-changed {
    color: var(--color-vekt);
    font-weight: 600;
  }

  .slider-original {
    color: var(--color-ink-ghost);
    font-weight: 400;
  }

  .slider-arrow {
    color: var(--color-ink-ghost);
    margin: 0 2px;
  }

  .slider-sum {
    text-align: right;
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    padding-top: var(--spacing-1);
  }

  .slider-sum-warning {
    color: var(--color-score-low);
  }

  /* ── Ranking comparison ── */
  .ranking-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  .ranking-col {
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .ranking-col-header {
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .ranking-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
  }

  .ranking-row:last-child {
    border-bottom: none;
  }

  .ranking-moved {
    background: var(--color-vekt-bg);
  }

  .ranking-rank {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    width: 20px;
  }

  .ranking-row:first-child .ranking-rank {
    color: var(--color-vekt-dim);
  }

  .ranking-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
  }

  .ranking-score {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .ranking-row:first-child .ranking-score {
    color: var(--color-vekt);
  }

  /* ── Alert ── */
  .ranking-alert {
    margin-top: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-score-low-bg);
    border: 1px solid var(--color-score-low-bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-score-low);
  }

  .ranking-alert-minor {
    background: var(--color-vekt-bg);
    border-color: var(--color-vekt-bg);
    color: var(--color-vekt);
  }

  /* ── Reset button ── */
  .reset-btn {
    margin-top: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink-secondary);
    transition: all 0.12s;
  }

  .reset-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  @media (max-width: 1024px) {
    .ranking-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
