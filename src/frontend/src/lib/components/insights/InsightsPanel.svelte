<script lang="ts">
  import {
    evaluation,
    formatNOK,
    subEffectiveWeight,
    criterionMode,
    type ActiveMethod,
  } from '$lib/stores/evaluation.svelte';
  import SensitivityPane from './SensitivityPane.svelte';
  import SensitivityPricePane from './SensitivityPricePane.svelte';

  let activeTab = $state<'betalingsvilje' | 'robusthet' | 'metodekontroll' | 'sensitivitet'>(
    'betalingsvilje'
  );

  /** Which model the analysis panel is analyzing (independent of main view). */
  let analysisMethod = $state<ActiveMethod>(evaluation.activeMethod);

  let isPris = $derived(analysisMethod === 'pris');

  const tabs = [
    { id: 'betalingsvilje' as const, label: 'Betalingsvilje' },
    { id: 'robusthet' as const, label: 'Robusthet' },
    { id: 'metodekontroll' as const, label: 'Metodekontroll' },
    { id: 'sensitivitet' as const, label: 'Sensitivitet' },
  ];

  let qualityBudget = $derived(evaluation.qualityBudget);
  let totalWeight = $derived(evaluation.totalWeight);

  // ── Poengmodell robusthet ──

  /** Criterion with largest spread (poengmodell). */
  let largestSpread = $derived.by(() => {
    let best = { name: '', spread: 0, low: 0, high: 0, leader: '' };
    for (const c of evaluation.data.criteria) {
      const scores = evaluation.data.suppliers.map(
        (s) => evaluation.groupScores[c.id]?.[s.id] ?? 0
      );
      const high = Math.max(...scores);
      const low = Math.min(...scores);
      const spread = high - low;
      if (spread > best.spread) {
        const leadIdx = scores.indexOf(high);
        best = {
          name: c.name,
          spread,
          low,
          high,
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

  // ── Prismodell robusthet ──

  /** Price margin between #1 and #2 in NOK. */
  let priceMargin = $derived(
    evaluation.priceRanking.length >= 2
      ? evaluation.priceRanking[1].evaluatedPrice - evaluation.priceRanking[0].evaluatedPrice
      : 0
  );

  /** Criterion with largest deduction spread across suppliers (prismodell). */
  let largestDeductionSpread = $derived.by(() => {
    let best = { name: '', spread: 0, leader: '' };
    for (const c of evaluation.data.criteria) {
      if (c.type === 'price') continue;
      // Sum deductions per supplier for this criterion (leaf or subs)
      const supplierDeds = evaluation.data.suppliers.map((s) => {
        if (c.subcriteria.length === 0 || c.evaluationType === 'item') {
          return evaluation.priceDeductions[c.id]?.[s.id] ?? 0;
        }
        return c.subcriteria.reduce(
          (sum, sub) => sum + (evaluation.priceDeductions[sub.id]?.[s.id] ?? 0),
          0
        );
      });
      const maxDed = Math.max(...supplierDeds);
      const spread = maxDed - Math.min(...supplierDeds);
      if (spread > best.spread) {
        const leadIdx = supplierDeds.indexOf(maxDed);
        best = {
          name: c.name,
          spread,
          leader: evaluation.data.suppliers[leadIdx]?.name ?? '',
        };
      }
    }
    return best;
  });

  // ── Metodekontroll ──

  /** Weight warnings: criteria where sub-weights don't sum to 100%. */
  let weightWarnings = $derived(evaluation.weightWarnings);

  let weightWarningList = $derived(
    Object.entries(weightWarnings).map(([id, w]) => ({
      name: evaluation.data.criteria.find((c) => c.id === id)?.name ?? id,
      subSum: w.subSum,
    }))
  );

  /** Scoring distribution per criterion: spread and clustering analysis. */
  let scoringDistribution = $derived.by(() => {
    const suppliers = evaluation.data.suppliers;
    if (suppliers.length < 2)
      return {
        clustered: [] as { name: string; avg: number; spread: number }[],
        lowDiff: [] as { name: string; spread: number }[],
      };

    const clustered: { name: string; avg: number; spread: number }[] = [];
    const lowDiff: { name: string; spread: number }[] = [];

    for (const c of evaluation.data.criteria) {
      if (c.type === 'price') continue;
      const mode = criterionMode(c);

      // Collect all individual scores for this criterion
      const allScores: number[] = [];
      if (mode === 'leaf') {
        for (const s of suppliers) {
          const score = c.scores?.[s.id] ?? 0;
          if (score > 0) allScores.push(score);
        }
      } else if (mode === 'traditional') {
        for (const sub of c.subcriteria) {
          for (const s of suppliers) {
            const score = sub.scores[s.id] ?? 0;
            if (score > 0) allScores.push(score);
          }
        }
      }

      if (allScores.length < 2) continue;

      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const high = Math.max(...allScores);
      const low = Math.min(...allScores);
      const spread = high - low;

      // Clustering: all scores within a narrow band (spread ≤ 2 on 0-10 scale)
      if (spread <= 2 && allScores.length >= 4) {
        clustered.push({ name: c.name, avg, spread });
      }

      // Low differentiation: group scores per supplier nearly identical
      const groupScores = suppliers.map((s) => evaluation.groupScores[c.id]?.[s.id] ?? 0);
      const groupHigh = Math.max(...groupScores);
      const groupLow = Math.min(...groupScores);
      const groupSpread = groupHigh - groupLow;
      if (groupSpread < 0.5 && groupScores.some((s) => s > 0)) {
        lowDiff.push({ name: c.name, spread: groupSpread });
      }
    }

    return { clustered, lowDiff };
  });
</script>

<div class="innsikt">
  <div class="innsikt-body">
    <div class="innsikt-header">
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
      <div class="method-switch">
        <button
          class="method-switch-btn"
          class:active={!isPris}
          onclick={() => (analysisMethod = 'poeng')}
        >
          Poeng
        </button>
        <button
          class="method-switch-btn"
          class:active={isPris}
          onclick={() => (analysisMethod = 'pris')}
        >
          Pris
        </button>
      </div>
    </div>

    <!-- Betalingsvilje -->
    {#if activeTab === 'betalingsvilje'}
      <div class="innsikt-pane">
        <table class="bv-table">
          <thead>
            <tr>
              <th>Kriterium</th>
              <th class="num">Vekt</th>
              <th class="num">Maks fradrag</th>
              {#if !isPris}
                <th class="num">Per poeng</th>
              {/if}
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
                {#if !isPris}
                  <td class="bv-per-point">{formatNOK(maxDeduction / 10)} kr</td>
                {/if}
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
                  {#if !isPris}
                    <td class="bv-per-point">{formatNOK(subMaxDeduction / 10)} kr</td>
                  {/if}
                </tr>
              {/each}
            {/each}
            <tr class="bv-total">
              <td class="bv-criterion">Sum kvalitetskriterier</td>
              <td class="bv-weight">{evaluation.data.qualityWeight} %</td>
              <td class="bv-value">{formatNOK(qualityBudget)} kr</td>
              {#if !isPris}
                <td class="bv-per-point"></td>
              {/if}
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
        {#if isPris}
          <!-- Prismodell robusthet -->
          {#if evaluation.priceRanking.length < 2}
            <div class="empty-state">Minst to leverandører med pris kreves.</div>
          {:else}
            <div class="robusthet-ranking">
              {#each evaluation.priceRanking as entry}
                {@const marginToWinner =
                  entry.evaluatedPrice - evaluation.priceRanking[0].evaluatedPrice}
                <div class="robusthet-item" class:leader={entry.rank === 1}>
                  <span class="robusthet-rank">#{entry.rank}</span>
                  <span class="robusthet-name">{entry.supplier.name}</span>
                  <span class="robusthet-score">{formatNOK(entry.evaluatedPrice)} kr</span>
                  <span class="robusthet-margin">
                    {entry.rank === 1 ? 'leder' : `+${formatNOK(marginToWinner)} kr`}
                  </span>
                </div>
              {/each}
            </div>

            <div class="robusthet-insights">
              <div class="robusthet-insight">
                <div class="robusthet-insight-label">Prismargin</div>
                <div class="robusthet-insight-text">
                  Marginen mellom <strong>#1</strong> og <strong>#2</strong> er
                  <span class="mono">{formatNOK(priceMargin)} kr</span>.
                  {#if evaluation.data.contractValue > 0}
                    Det utgjør <span class="mono"
                      >{((priceMargin / evaluation.data.contractValue) * 100).toFixed(1)} %</span
                    > av kontraktsverdien.
                  {/if}
                  Resultatet er
                  <strong>
                    {#if priceMargin > evaluation.data.contractValue * 0.05}
                      robust
                    {:else if priceMargin > evaluation.data.contractValue * 0.01}
                      moderat robust
                    {:else}
                      sårbart
                    {/if}
                  </strong>.
                </div>
              </div>
              <div class="robusthet-insight">
                <div class="robusthet-insight-label">Størst påvirkning</div>
                <div class="robusthet-insight-text">
                  <strong>{heaviestCriterion.name}</strong> ({heaviestCriterion.weight} %) har størst
                  maksimalt fradrag og dermed størst innvirkning på evaluert pris.
                </div>
              </div>
              {#if largestDeductionSpread.spread > 0}
                <div class="robusthet-insight">
                  <div class="robusthet-insight-label">Størst fradragsspredning</div>
                  <div class="robusthet-insight-text">
                    <strong>{largestDeductionSpread.name}</strong> har størst spredning i fradrag
                    mellom leverandørene (<span class="mono"
                      >{formatNOK(largestDeductionSpread.spread)} kr</span
                    >).
                    {largestDeductionSpread.leader} får størst fradrag her.
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <!-- Poengmodell robusthet -->
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
        {/if}
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

        <!-- Validation warnings -->
        {#if weightWarningList.length > 0}
          <div class="mk-section">
            <div class="mk-section-header">Vektvarsler</div>
            {#each weightWarningList as warning}
              <div class="mk-warning">
                <span class="mk-warning-icon">⚠</span>
                <span class="mk-warning-text">
                  <strong>{warning.name}</strong> — undervekter summerer til {warning.subSum} % (forventet
                  100 %)
                </span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Scoring quality -->
        {#if scoringDistribution.lowDiff.length > 0 || scoringDistribution.clustered.length > 0}
          <div class="mk-section">
            <div class="mk-section-header">Poengkvalitet</div>
            {#each scoringDistribution.lowDiff as item}
              <div class="mk-warning">
                <span class="mk-warning-icon">⚠</span>
                <span class="mk-warning-text">
                  <strong>{item.name}</strong> — leverandørene får nesten identiske scores
                  (spredning {item.spread.toFixed(1)}). Kriteriet skiller ikke mellom tilbudene.
                </span>
              </div>
            {/each}
            {#each scoringDistribution.clustered as item}
              <div class="mk-info">
                <span class="mk-warning-icon">ℹ</span>
                <span class="mk-warning-text">
                  <strong>{item.name}</strong> — alle scores ligger i et smalt bånd rundt {item.avg.toFixed(
                    1
                  )} (spredning {item.spread.toFixed(1)}). Vurder om differensieringen er
                  tilstrekkelig.
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Sensitivitet -->
    {#if activeTab === 'sensitivitet'}
      <div class="innsikt-pane">
        {#if isPris}
          <SensitivityPricePane />
        {:else}
          <SensitivityPane />
        {/if}
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

  .innsikt-header {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--color-wire);
  }

  .innsikt-tabs {
    display: flex;
    flex: 1;
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

  /* ── Method switch ── */
  .method-switch {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: var(--spacing-2) var(--spacing-3);
  }

  .method-switch-btn {
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    transition: all 0.12s;
  }

  .method-switch-btn:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    border-right: none;
  }

  .method-switch-btn:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .method-switch-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .method-switch-btn:hover:not(.active) {
    background: var(--color-felt-hover);
    color: var(--color-ink-secondary);
  }

  .method-switch-btn.active {
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
    border-color: var(--color-vekt-bg-strong);
    font-weight: 600;
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
    transition: background 0.12s;
  }
  .bv-table tbody tr:hover td {
    background: var(--color-felt-hover);
  }
  .bv-table tr:last-child td {
    border-bottom: none;
  }
  .bv-criterion {
    color: var(--color-ink-secondary);
    font-weight: 500;
  }
  .bv-table td.bv-sub {
    padding-left: var(--spacing-8);
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
    font-variant-numeric: tabular-nums;
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

  .empty-state {
    font-size: 12px;
    color: var(--color-ink-muted);
    padding: var(--spacing-4);
    text-align: center;
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
    transition: background 0.12s;
  }
  .robusthet-item:hover {
    background: var(--color-felt-hover);
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
    white-space: nowrap;
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
    transition: background 0.12s;
  }
  .mk-row:hover {
    background: var(--color-felt-hover);
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
    background: var(--color-score-low-bg);
    border: 1px solid var(--color-score-low-bg);
    color: var(--color-score-low);
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

  .mk-section {
    margin-top: var(--spacing-4);
  }
  .mk-section-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-2);
  }
  .mk-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-score-low-bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-score-low);
    margin-bottom: var(--spacing-2);
  }
  .mk-warning strong {
    color: inherit;
  }
  .mk-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-ink-secondary);
    margin-bottom: var(--spacing-2);
  }
  .mk-info strong {
    color: var(--color-ink);
  }
  .mk-warning-icon {
    flex-shrink: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .mk-warning-text {
    line-height: 1.5;
  }

  @media (max-width: 1024px) {
    .mk-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
