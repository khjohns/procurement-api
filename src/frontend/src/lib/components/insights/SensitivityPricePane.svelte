<script lang="ts">
  import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';

  interface SimulatedDeduction {
    id: string;
    name: string;
    original: number;
    simulated: number;
  }

  /** Local overrides: criterionId → simulated max deduction in NOK. */
  let overrides = $state<Record<string, number>>({});

  let simDeductions: SimulatedDeduction[] = $derived(
    evaluation.data.criteria
      .filter((c) => c.type !== 'price')
      .map((c) => {
        const original = evaluation.maxDeductions[c.id] ?? 0;
        return {
          id: c.id,
          name: c.name,
          original,
          simulated: overrides[c.id] ?? original,
        };
      })
  );

  let simTotal = $derived(simDeductions.reduce((s, d) => s + d.simulated, 0));
  let hasChanges = $derived(simDeductions.some((d) => d.simulated !== d.original));

  /** Upper bound for sliders — 2× the largest max deduction or quality budget, whichever is larger. */
  let sliderMax = $derived(
    Math.max(
      evaluation.totalMaxDeductions * 1.5,
      Math.max(...simDeductions.map((d) => d.original)) * 3,
      1000
    )
  );

  /** Recompute evaluated prices using simulated max deductions. */
  let simulatedPriceData = $derived.by(() => {
    const totalDed: Record<string, number> = {};
    for (const supplier of evaluation.data.suppliers) {
      totalDed[supplier.id] = 0;
    }

    for (const criterion of evaluation.data.criteria) {
      if (criterion.type === 'price') continue;
      const maxDed = overrides[criterion.id] ?? (evaluation.maxDeductions[criterion.id] ?? 0);

      if (criterion.subcriteria.length === 0 || criterion.evaluationType === 'item') {
        for (const supplier of evaluation.data.suppliers) {
          const entered = criterion.priceDeductionAmounts?.[supplier.id] ?? 0;
          totalDed[supplier.id] += Math.min(entered, maxDed);
        }
      } else {
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

  function setDeduction(criterionId: string, value: number) {
    overrides = { ...overrides, [criterionId]: Math.max(0, Math.round(value)) };
  }

  function reset() {
    overrides = {};
  }
</script>

<div class="sensitivity">
  <div class="section">
    <div class="section-header">Simulator — maks fradrag</div>

    <div class="simulator-sliders">
      {#each simDeductions as sd}
        {@const changed = sd.simulated !== sd.original}
        <div class="slider-row">
          <span class="slider-label">{sd.name}</span>
          <input
            type="range"
            class="slider-input"
            min="0"
            max={sliderMax}
            step="1000"
            value={sd.simulated}
            oninput={(e) => setDeduction(sd.id, Number(e.currentTarget.value))}
          />
          <span class="slider-value" class:slider-changed={changed}>
            {#if changed}
              <span class="slider-original">{formatNOK(sd.original)}</span>
              <span class="slider-arrow">&rarr;</span>
            {/if}
            {formatNOK(sd.simulated)} kr
          </span>
        </div>
      {/each}
      <div class="slider-sum">
        Sum: {formatNOK(simTotal)} kr
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
          {@const actualRank =
            evaluation.priceRanking.findIndex((r) => r.supplier.id === entry.id) + 1}
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

    {#if hasChanges}
      <button class="reset-btn" onclick={reset}>Nullstill</button>
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

  .slider-input:focus-visible {
    outline: none;
  }

  .slider-input:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px var(--color-wire-focus);
  }

  .slider-value {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    text-align: right;
    min-width: 100px;
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
    transition: background 0.12s;
  }
  .ranking-row:hover {
    background: var(--color-felt-hover);
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

  @media (max-width: 1023px) {
    .ranking-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
