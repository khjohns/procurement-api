<script lang="ts">
  import { evaluation, scoreTier, criterionMode, fmt2 } from '$lib/stores/evaluation.svelte';
  import PillToggle from './PillToggle.svelte';

  let bestTotal = $derived(Math.max(...Object.values(evaluation.totals), 0));
</script>

<div class="matrix-header">
  <span class="section-label">Oversikt — alle tildelingskriterier</span>
  <PillToggle
    onclick={() => evaluation.toggleMatrixTransposed()}
    title={evaluation.matrixTransposed ? 'Vis kriterier som rader' : 'Vis leverandører som rader'}
    active={evaluation.matrixTransposed}
  >
    <span class="axis-toggle-icon" class:transposed={evaluation.matrixTransposed}>⇄</span>
    <span class="axis-toggle-label">
      {evaluation.matrixTransposed ? 'Leverandører × Kriterier' : 'Kriterier × Leverandører'}
    </span>
  </PillToggle>
</div>

{#if !evaluation.matrixTransposed}
  <!-- Default: criteria as rows, suppliers as columns -->
  <div class="matrix-wrap">
    <table class="matrix">
      <colgroup>
        <col class="col-weight" />
        <col class="col-criteria" />
        {#each evaluation.data.suppliers as _}
          <col class="col-supplier" />
        {/each}
      </colgroup>
      <thead>
        <tr>
          <th class="th-weight">Vekt</th>
          <th>Tildelingskriterier</th>
          {#each evaluation.data.suppliers as supplier}
            <th class="th-supplier">{supplier.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each evaluation.data.criteria as criterion}
          {@const isQuality = criterion.type === 'quality'}
          {@const mode = criterionMode(criterion)}
          {@const isLeaf = mode === 'leaf'}
          {@const isResource = mode === 'resource'}
          <tr
            class="row-criterion row-clickable"
            onclick={() => {
              evaluation.setActiveView(criterion.id);
            }}
            role="button"
            tabindex={0}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') evaluation.setActiveView(criterion.id);
            }}
          >
            <td class="cell-weight">
              <div class="weight-display">
                <span class="weight-num">{criterion.weight}<span class="weight-pct">%</span></span>
                <div class="weight-bar">
                  <div
                    class="weight-bar-fill"
                    style="width: {(criterion.weight / 40) * 100}%"
                  ></div>
                </div>
              </div>
            </td>
            <td class="cell-criteria">
              <div class="criteria-content">
                <span class="criteria-name">{criterion.name}</span>
                {#if !isQuality}
                  <span class="criteria-badge badge-price">Pris</span>
                {:else if isResource}
                  <span class="criteria-badge badge-resource">Ressurs</span>
                  <span class="criteria-sub-count">{criterion.subcriteria.length} momenter</span>
                {:else if !isLeaf}
                  <span class="criteria-sub-count"
                    >{criterion.subcriteria.length} underkriterier</span
                  >
                {/if}
                <span class="criteria-arrow">→</span>
              </div>
            </td>
            {#each evaluation.data.suppliers as supplier}
              {@const score = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
              {@const tier = scoreTier(score)}
              {@const best = evaluation.bestGroupScores[criterion.id] ?? 0}
              {@const isBest = score === best && score > 0}
              <td class="cell-score score-{tier}" class:score-best={isBest}>
                <span class="score-value">
                  {score > 0 ? fmt2(score) : '—'}
                </span>
              </td>
            {/each}
          </tr>
        {/each}

        <!-- Total row -->
        <tr class="row-total">
          <td class="cell-weight">
            <div class="weight-display">
              <span class="weight-num"
                >{evaluation.totalWeight}<span class="weight-pct">%</span></span
              >
            </div>
          </td>
          <td class="cell-criteria">
            <span class="criteria-name total-label">Totalsum</span>
          </td>
          {#each evaluation.data.suppliers as supplier}
            {@const score = evaluation.totals[supplier.id] ?? 0}
            {@const isBest = score === bestTotal && score > 0}
            {@const tier = scoreTier(score)}
            <td class="cell-score cell-total score-{tier}" class:score-best={isBest}>
              <span class="score-value">{score > 0 ? fmt2(score) : '—'}</span>
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
{:else}
  <!-- Transposed: suppliers as rows, criteria as columns -->
  <div class="matrix-wrap">
    <table class="matrix matrix-transposed">
      <colgroup>
        <col class="col-supplier-name" />
        {#each evaluation.data.criteria as _}
          <col class="col-criterion-t" />
        {/each}
        <col class="col-total-t" />
      </colgroup>
      <thead>
        <tr>
          <th class="th-supplier-name">Leverandør</th>
          {#each evaluation.data.criteria as criterion}
            <th
              class="th-criterion-t th-clickable"
              onclick={() => evaluation.setActiveView(criterion.id)}
              role="button"
              tabindex={0}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') evaluation.setActiveView(criterion.id);
              }}
            >
              <span class="th-criterion-name">{criterion.name}</span>
              <span class="th-weight-badge">{criterion.weight}%</span>
            </th>
          {/each}
          <th class="th-total-t">Total</th>
        </tr>
      </thead>
      <tbody>
        {#each evaluation.data.suppliers as supplier}
          {@const total = evaluation.totals[supplier.id] ?? 0}
          {@const isBestTotal = total === bestTotal && total > 0}
          {@const totalTier = scoreTier(total)}
          <tr
            class="row-supplier row-clickable"
            class:row-supplier-selected={evaluation.selectedSupplierId === supplier.id}
            onclick={() => evaluation.selectSupplier(supplier.id)}
            role="button"
            tabindex={0}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') evaluation.selectSupplier(supplier.id);
            }}
          >
            <td class="cell-supplier-name">
              <span class="supplier-name-text">{supplier.name}</span>
            </td>
            {#each evaluation.data.criteria as criterion}
              {@const mode = criterionMode(criterion)}
              {@const isLeaf = mode === 'leaf'}
              {@const score = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
              {@const tier = scoreTier(score)}
              {@const best = evaluation.bestGroupScores[criterion.id] ?? 0}
              {@const isBest = score === best && score > 0}
              <td class="cell-score score-{tier}" class:score-best={isBest}>
                <span class="score-value">
                  {score > 0 ? fmt2(score) : '—'}
                </span>
              </td>
            {/each}
            <td class="cell-score cell-total score-{totalTier}" class:score-best={isBestTotal}>
              <span class="score-value">{total > 0 ? fmt2(total) : '—'}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if evaluation.totalWeight !== 100}
  <div class="weight-warning">Vektsum: {evaluation.totalWeight} % (forventet 100 %)</div>
{/if}

<style>
  /* ── Header with toggle ── */
  .matrix-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-3);
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .axis-toggle-icon {
    font-size: 12px;
    transition: transform 0.2s;
  }

  .axis-toggle-icon.transposed {
    transform: rotate(90deg);
  }

  .axis-toggle-label {
    letter-spacing: 0.02em;
  }

  /* ── Shared matrix styles ── */
  .matrix-wrap {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-wire);
  }

  .matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .matrix th {
    padding: var(--spacing-3);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
    text-align: left;
  }

  /* ── Default orientation columns ── */
  .col-weight {
    width: 80px;
  }
  .col-criteria {
    width: auto;
  }
  .col-supplier {
    width: 140px;
  }

  .th-weight {
    text-align: center;
  }
  .th-supplier {
    text-align: center;
  }

  /* ── Transposed orientation columns ── */
  .col-supplier-name {
    width: auto;
    min-width: 160px;
  }
  .col-criterion-t {
    width: 120px;
  }
  .col-total-t {
    width: 100px;
  }

  .th-supplier-name {
    white-space: nowrap;
  }

  .th-criterion-t {
    text-align: center;
    vertical-align: bottom;
    max-width: 120px;
  }

  .th-clickable {
    cursor: pointer;
    transition:
      color 0.1s,
      background 0.1s;
  }

  .th-clickable:hover {
    color: var(--color-vekt-dim);
    background: var(--color-felt-hover);
  }

  .th-clickable:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .th-criterion-name {
    display: block;
    font-size: 10px;
    line-height: 1.3;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 600;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .th-weight-badge {
    display: block;
    margin-top: var(--spacing-1);
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 500;
    color: var(--color-vekt-dim);
  }

  .th-total-t {
    text-align: center;
    font-weight: 700;
  }

  /* ── Supplier name cell (transposed) ── */
  .cell-supplier-name {
    padding: var(--spacing-3);
    border-left: 3px solid var(--color-wire-strong);
  }

  .supplier-name-text {
    font-weight: 600;
    color: var(--color-ink);
    font-size: 12px;
  }

  .row-supplier {
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
    transition: background 0.08s;
  }

  .row-supplier-selected {
    border-left-color: var(--color-vekt);
  }

  .row-supplier-selected .cell-supplier-name {
    border-left-color: var(--color-vekt);
  }

  /* ── Rows (shared) ── */
  .row-criterion {
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
    transition: background 0.08s;
  }

  .row-clickable {
    cursor: pointer;
  }

  .row-clickable:hover {
    background: var(--color-felt-hover);
  }

  .row-clickable:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .row-total {
    background: var(--color-canvas);
    border-top: 2px solid var(--color-wire-strong);
  }

  /* ── Weight column (default orientation) ── */
  .cell-weight {
    padding: var(--spacing-3);
    vertical-align: middle;
    border-left: 3px solid var(--color-vekt);
  }

  .weight-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-1);
  }

  .weight-num {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-vekt-dim);
  }

  .weight-pct {
    font-size: 9px;
    font-weight: 400;
    color: var(--color-ink-ghost);
  }

  .weight-bar {
    width: 48px;
    height: 2px;
    background: var(--color-felt-active);
    border-radius: 1px;
    overflow: hidden;
  }

  .weight-bar-fill {
    height: 100%;
    background: var(--color-vekt-dim);
    border-radius: 1px;
  }

  /* ── Criteria column (default orientation) ── */
  .cell-criteria {
    padding: var(--spacing-3);
  }

  .criteria-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .criteria-name {
    font-weight: 600;
    color: var(--color-ink);
    font-size: 12px;
  }

  .total-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .criteria-sub-count {
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .criteria-arrow {
    margin-left: auto;
    font-size: 12px;
    color: var(--color-ink-ghost);
    transition:
      color 0.1s,
      transform 0.1s;
  }

  .row-clickable:hover .criteria-arrow {
    color: var(--color-vekt);
    transform: translateX(2px);
  }

  /* ── Score cells (shared) ── */
  .cell-score {
    text-align: center;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 600;
    padding: var(--spacing-3);
  }

  .cell-total {
    font-size: 16px;
    font-weight: 700;
  }

  .score-value {
    display: inline-block;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    line-height: 1;
  }

  .score-high .score-value {
    color: var(--color-score-high);
  }
  .score-mid .score-value {
    color: var(--color-ink-secondary);
  }
  .score-low .score-value {
    color: var(--color-score-low);
  }

  .score-best .score-value {
    background: var(--color-score-high-bg);
    font-weight: 700;
  }

  .row-total .score-best .score-value,
  .cell-total.score-best .score-value {
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
  }

  /* ── Weight warning ── */
  .weight-warning {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-score-low);
    background: var(--color-score-low-bg);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-score-low);
  }

  .criteria-badge {
    padding: 1px var(--spacing-2);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .badge-resource {
    color: var(--color-vekt-dim);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
  }

  .badge-price {
    color: var(--color-ink-muted);
    background: var(--color-felt-active);
    border: 1px solid var(--color-wire);
  }
</style>
