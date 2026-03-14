<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import { sensitivity } from '$lib/stores/sensitivity.svelte';

  function tierClass(margin: number): string {
    if (margin >= 0.5) return 'tier-stable';
    if (margin >= 0.2) return 'tier-moderate';
    return 'tier-vulnerable';
  }
</script>

<div class="sensitivity">
  <!-- Vippepunkter -->
  <div class="section">
    <div class="section-header">Vippepunkter</div>

    {#each sensitivity.pairAnalyses as pair}
      <div class="pair-block">
        <div class="pair-header">
          <span class="pair-names">{pair.winnerName} &rarr; {pair.challengerName}</span>
          <span class="pair-margin {tierClass(pair.totalMargin)}">
            {pair.totalMargin.toFixed(1)} p margin
          </span>
        </div>

        <div class="pair-tipping-points">
          {#each pair.tippingPoints as tp}
            {#if tp.type === 'score'}
              <div class="tp-line">
                <span class="tp-criterion">{tp.criterionName}:</span>
                <span class="tp-value {tierClass(Math.abs(tp.delta))}">
                  {tp.delta >= 0
                    ? `\u2212${tp.delta.toFixed(1)}`
                    : `+${Math.abs(tp.delta).toFixed(1)}`} poeng margin
                </span>
              </div>
            {:else}
              <div class="tp-line tp-weight">
                <span class="tp-criterion">{tp.criterionName}:</span>
                <span class="tp-value tier-vulnerable">
                  {tp.criterionName} &gt; {Math.round(tp.delta)} % flipper rangering
                </span>
              </div>
            {/if}
          {/each}
        </div>

        {#if pair.stable}
          <div class="pair-verdict stable">Stabil &mdash; krever endring i 2+ kriterier</div>
        {/if}
      </div>
    {/each}

    {#if sensitivity.pairAnalyses.length > 0}
      <div class="robustness-summary">
        Resultatet er <strong>{sensitivity.robustnessLabel}</strong>. Vekten p&aring; {sensitivity
          .mostSensitive.criterionName} ({sensitivity.mostSensitive.weight} %) er den mest sensitive parameteren.
      </div>
    {/if}
  </div>

  <!-- Simulator -->
  <div class="section">
    <div class="section-header">Simulator</div>

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
        {#each evaluation.ranking as entry}
          <div class="ranking-row">
            <span class="ranking-rank">#{entry.rank}</span>
            <span class="ranking-name">{entry.supplier.name}</span>
            <span class="ranking-score">{entry.score.toFixed(1)}</span>
          </div>
        {/each}
      </div>
      <div class="ranking-col">
        <div class="ranking-col-header">Simulert</div>
        {#each sensitivity.simulatedRanking as entry, i}
          {@const actualRank = evaluation.ranking.findIndex((r) => r.supplier.id === entry.id) + 1}
          {@const moved = actualRank !== entry.rank}
          <div class="ranking-row" class:ranking-moved={moved}>
            <span class="ranking-rank">#{entry.rank}</span>
            <span class="ranking-name">{entry.name}</span>
            <span class="ranking-score">{entry.score.toFixed(1)}</span>
          </div>
        {/each}
      </div>
    </div>

    {#if sensitivity.winnerChanged}
      <div class="ranking-alert">
        Rangeringen endres! {sensitivity.simulatedRanking[0]?.name} g&aring;r forbi {evaluation
          .ranking[0]?.supplier.name}.
      </div>
    {:else if sensitivity.rankingChanged}
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

  /* ── Vippepunkter ── */
  .pair-block {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-3);
  }

  .pair-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .pair-names {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .pair-margin {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .pair-tipping-points {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .tp-line {
    display: flex;
    gap: var(--spacing-2);
    font-size: 12px;
    padding-left: var(--spacing-3);
    border-left: 3px solid var(--color-vekt);
    line-height: 1.6;
  }

  .tp-weight {
    border-left-color: var(--color-score-low);
  }

  .tp-criterion {
    color: var(--color-ink-muted);
  }

  .tp-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .tier-stable {
    color: var(--color-score-high);
  }
  .tier-moderate {
    color: var(--color-vekt);
  }
  .tier-vulnerable {
    color: var(--color-score-low);
  }

  .pair-verdict {
    margin-top: var(--spacing-2);
    font-size: 11px;
    color: var(--color-ink-muted);
    font-style: italic;
  }

  .pair-verdict.stable {
    color: var(--color-score-high);
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
