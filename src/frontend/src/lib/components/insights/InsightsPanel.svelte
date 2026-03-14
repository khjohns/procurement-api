<script lang="ts">
  import { evaluation, formatNOK, subEffectiveWeight } from '$lib/stores/evaluation.svelte';
  import SensitivityPane from './SensitivityPane.svelte';

  let activeTab = $state<'betalingsvilje' | 'robusthet' | 'metodekontroll' | 'sensitivitet'>(
    'betalingsvilje'
  );

  const tabs = [
    { id: 'betalingsvilje' as const, label: 'Betalingsvilje' },
    { id: 'robusthet' as const, label: 'Robusthet' },
    { id: 'metodekontroll' as const, label: 'Metodekontroll' },
    { id: 'sensitivitet' as const, label: 'Sensitivitet' },
  ];

  let qualityBudget = $derived(evaluation.qualityBudget);
  let totalWeight = $derived(evaluation.totalWeight);

  /** Criterion with largest spread. */
  let largestSpread = $derived.by(() => {
    let best = { name: '', spread: 0, low: 0, high: 0, leader: '' };
    for (const c of evaluation.data.criteria) {
      const scores = evaluation.data.suppliers.map(
        (s) => evaluation.groupScores[c.id]?.[s.id] ?? 0
      );
      const spread = Math.max(...scores) - Math.min(...scores);
      if (spread > best.spread) {
        const leadIdx = scores.indexOf(Math.max(...scores));
        best = {
          name: c.name,
          spread,
          low: Math.min(...scores),
          high: Math.max(...scores),
          leader: evaluation.data.suppliers[leadIdx]?.name ?? '',
        };
      }
    }
    return best;
  });

  let sameWinner = $derived(evaluation.sameWinner);

  /** Criterion with highest weight. */
  let heaviestCriterion = $derived.by(() => {
    let best = { name: '', weight: 0 };
    for (const c of evaluation.data.criteria) {
      if (c.weight > best.weight) best = { name: c.name, weight: c.weight };
    }
    return best;
  });
</script>

<div class="innsikt">
  <div class="innsikt-body">
    <div class="innsikt-tabs">
      {#each tabs as tab}
        <button
          class="innsikt-tab"
          class:active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Betalingsvilje -->
    {#if activeTab === 'betalingsvilje'}
      <div class="innsikt-pane">
        <table class="bv-table">
          <thead>
            <tr>
              <th>Kriterium</th>
              <th class="num">Vekt</th>
              <th class="num">Implisitt maks fradrag</th>
              <th class="num">Per poeng</th>
            </tr>
          </thead>
          <tbody>
            {#each evaluation.data.criteria as criterion}
              {@const maxDeduction = qualityBudget * (criterion.weight / totalWeight)}
              <tr class:bv-row-price={criterion.type === 'price'}>
                <td class="bv-criterion">
                  {criterion.name}
                  {#if criterion.type === 'price'}
                    <span class="bv-type-badge bv-type-price">Pris</span>
                  {/if}
                </td>
                <td class="bv-weight">{criterion.weight} %</td>
                <td class="bv-value">{formatNOK(maxDeduction)} kr</td>
                <td class="bv-per-point">{formatNOK(maxDeduction / 10)} kr</td>
              </tr>
              {@const subSum = criterion.subcriteria.reduce((s, sc) => s + sc.weight, 0)}
              {#each criterion.subcriteria as sub}
                {@const subMaxDeduction =
                  qualityBudget *
                  (subEffectiveWeight(criterion.weight, sub.weight, subSum) / totalWeight)}
                <tr class:bv-row-price={criterion.type === 'price'}>
                  <td class="bv-sub">{sub.name}</td>
                  <td class="bv-weight">{sub.weight} %</td>
                  <td class="bv-value">{formatNOK(subMaxDeduction)} kr</td>
                  <td class="bv-per-point">{formatNOK(subMaxDeduction / 10)} kr</td>
                </tr>
              {/each}
            {/each}
            <tr class="bv-total">
              <td class="bv-criterion">Sum kvalitetskriterier</td>
              <td class="bv-weight">{evaluation.data.qualityWeight} %</td>
              <td class="bv-value">{formatNOK(qualityBudget)} kr</td>
              <td class="bv-per-point"></td>
            </tr>
          </tbody>
        </table>

        <div class="bv-summary">
          Med kontraktsverdi <span class="bv-highlight"
            >{formatNOK(evaluation.data.contractValue)} kr</span
          >
          og kvalitetsvekt <strong>{evaluation.data.qualityWeight} %</strong>, er total
          betalingsvilje <span class="bv-highlight">{formatNOK(qualityBudget)} kr</span>.
        </div>
      </div>
    {/if}

    <!-- Robusthet -->
    {#if activeTab === 'robusthet'}
      <div class="innsikt-pane">
        <div class="robusthet-ranking">
          {#each evaluation.ranking as entry}
            <div class="robusthet-item" class:leader={entry.rank === 1}>
              <span class="robusthet-rank">#{entry.rank}</span>
              <span class="robusthet-name">{entry.supplier.name}</span>
              <span class="robusthet-score">{entry.score.toFixed(1)}</span>
              <span class="robusthet-margin">
                {entry.rank === 1
                  ? 'leder'
                  : `\u2212${(evaluation.ranking[0].score - entry.score).toFixed(1)}`}
              </span>
            </div>
          {/each}
        </div>

        <div class="robusthet-insights">
          <div class="robusthet-insight">
            <div class="robusthet-insight-label">Margin</div>
            <div class="robusthet-insight-text">
              Marginen mellom <strong>#1</strong> og <strong>#2</strong> er
              <span class="mono">{evaluation.margin.toFixed(1)}</span> poeng. Resultatet er
              <strong
                >{evaluation.margin >= 0.5
                  ? 'robust'
                  : evaluation.margin >= 0.2
                    ? 'moderat robust'
                    : 'sårbart'}</strong
              >.
            </div>
          </div>
          <div class="robusthet-insight">
            <div class="robusthet-insight-label">Størst påvirkning</div>
            <div class="robusthet-insight-text">
              <strong>{heaviestCriterion.name}</strong> ({heaviestCriterion.weight} %) har størst innvirkning
              på resultatet.
            </div>
          </div>
          <div class="robusthet-insight">
            <div class="robusthet-insight-label">Størst spredning</div>
            <div class="robusthet-insight-text">
              <strong>{largestSpread.name}</strong> har størst spredning mellom leverandørene (fra
              <span class="mono">{largestSpread.low.toFixed(1)}</span>
              til <span class="mono">{largestSpread.high.toFixed(1)}</span>).
              {largestSpread.leader} skiller seg positivt ut her.
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Metodekontroll -->
    {#if activeTab === 'metodekontroll'}
      <div class="innsikt-pane">
        <div class="mk-comparison">
          <div class="mk-column">
            <div class="mk-column-header">Poengmodell</div>
            {#each evaluation.ranking as entry}
              <div class="mk-row">
                <span class="mk-rank">#{entry.rank}</span>
                <span class="mk-name">{entry.supplier.name}</span>
                <span class="mk-value">{entry.score.toFixed(1)}</span>
              </div>
            {/each}
          </div>
          <div class="mk-column">
            <div class="mk-column-header">Prismodell</div>
            {#each evaluation.priceRanking as entry}
              <div class="mk-row">
                <span class="mk-rank">#{entry.rank}</span>
                <span class="mk-name">{entry.supplier.name}</span>
                <span class="mk-value">{formatNOK(entry.evaluatedPrice)}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="mk-verdict" class:match={sameWinner}>
          <span class="mk-verdict-icon">{sameWinner ? '✓' : '⚠'}</span>
          <span class="mk-verdict-text">
            {sameWinner
              ? `Begge metoder gir samme vinner: ${evaluation.ranking[0]?.supplier.name}`
              : 'Metodene gir ulik rangering — vurder årsaken'}
          </span>
        </div>
      </div>
    {/if}

    <!-- Sensitivitet -->
    {#if activeTab === 'sensitivitet'}
      <div class="innsikt-pane">
        <SensitivityPane />
      </div>
    {/if}
  </div>
</div>

<style>
  .innsikt {
    height: 100%;
  }

  .innsikt-body {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .innsikt-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-wire);
  }

  .innsikt-tab {
    flex: 1;
    padding: var(--spacing-3) var(--spacing-4);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    transition: all 0.12s;
  }

  .innsikt-tab:hover {
    color: var(--color-ink-secondary);
    background: var(--color-felt-hover);
  }

  .innsikt-tab.active {
    color: var(--color-vekt);
    border-bottom-color: var(--color-vekt);
    font-weight: 600;
  }

  .innsikt-pane {
    padding: var(--spacing-5);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  /* ── Betalingsvilje ── */
  .bv-table {
    width: 100%;
    border-collapse: collapse;
  }
  .bv-table th {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    text-align: left;
    border-bottom: 1px solid var(--color-wire);
  }
  .bv-table th.num {
    text-align: right;
  }
  .bv-table td {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 12px;
    border-bottom: 1px solid var(--color-wire);
  }
  .bv-table tr:last-child td {
    border-bottom: none;
  }
  .bv-criterion {
    color: var(--color-ink-secondary);
    font-weight: 500;
  }
  .bv-sub {
    padding-left: var(--spacing-8) !important;
    color: var(--color-ink-muted);
    position: relative;
  }
  .bv-sub::before {
    content: '';
    position: absolute;
    left: var(--spacing-5);
    top: 50%;
    width: 6px;
    height: 1px;
    background: var(--color-ink-ghost);
  }
  .bv-weight {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-vekt-dim);
    text-align: right;
  }
  .bv-value {
    font-family: var(--font-data);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--color-ink);
  }
  .bv-per-point {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--color-ink-muted);
  }
  .bv-row-price td {
    opacity: 0.5;
  }
  .bv-type-badge {
    display: inline-block;
    margin-left: var(--spacing-2);
    padding: 1px var(--spacing-2);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: var(--radius-sm);
    vertical-align: middle;
  }
  .bv-type-price {
    color: var(--color-ink-muted);
    background: var(--color-felt-active);
  }
  .bv-total td {
    border-top: 1px solid var(--color-wire-strong);
    font-weight: 600;
  }

  .bv-summary {
    margin-top: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-vekt);
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
  }
  .bv-summary strong {
    color: var(--color-ink);
    font-weight: 600;
  }
  .bv-highlight {
    color: var(--color-vekt);
    font-family: var(--font-data);
    font-weight: 600;
  }

  /* ── Robusthet ── */
  .robusthet-ranking {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-5);
  }
  .robusthet-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt-raised);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
  }
  .robusthet-item.leader {
    border-color: var(--color-vekt-bg-strong);
  }
  .robusthet-rank {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    width: 20px;
  }
  .robusthet-item.leader .robusthet-rank {
    color: var(--color-vekt-dim);
  }
  .robusthet-name {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
  }
  .robusthet-score {
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .robusthet-item.leader .robusthet-score {
    color: var(--color-vekt);
  }
  .robusthet-margin {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    width: 72px;
    text-align: right;
  }

  .robusthet-insights {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .robusthet-insight {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt-raised);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    border-left: 3px solid var(--color-vekt);
  }
  .robusthet-insight-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-secondary);
    margin-bottom: var(--spacing-1);
  }
  .robusthet-insight-text {
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }
  .robusthet-insight-text strong {
    color: var(--color-ink);
    font-weight: 600;
  }
  .mono {
    font-family: var(--font-data);
    color: var(--color-vekt);
    font-weight: 600;
  }

  /* ── Metodekontroll ── */
  .mk-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-5);
  }
  .mk-column {
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .mk-column-header {
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }
  .mk-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
  }
  .mk-row:last-child {
    border-bottom: none;
  }
  .mk-rank {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    width: 20px;
  }
  .mk-row:first-child .mk-rank {
    color: var(--color-vekt-dim);
  }
  .mk-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
  }
  .mk-value {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .mk-row:first-child .mk-value {
    color: var(--color-vekt);
  }

  .mk-verdict {
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 12px;
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    color: var(--color-ink-secondary);
  }
  .mk-verdict.match {
    background: var(--color-score-high-bg);
    border: 1px solid var(--color-score-high-bg);
    color: var(--color-score-high);
  }
  .mk-verdict-icon {
    font-size: 14px;
  }
  .mk-verdict-text {
    font-weight: 500;
  }

  @media (max-width: 1024px) {
    .mk-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
