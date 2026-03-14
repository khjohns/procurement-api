<script lang="ts">
  import { evaluation, formatNOK, scoreTier, fmt2 } from '$lib/stores/evaluation.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);

  // ── Price editing ──
  let editingPrice: Record<string, boolean> = $state({});
  let editPriceVal: Record<string, string> = $state({});
  let priceInputs: Record<string, HTMLInputElement | undefined> = {};

  function startEditPrice(supplierId: string, currentPrice: number | undefined) {
    editingPrice[supplierId] = true;
    editPriceVal[supplierId] = currentPrice != null && currentPrice > 0 ? String(currentPrice) : '';
    requestAnimationFrame(() => priceInputs[supplierId]?.select());
  }

  function commitPrice(supplierId: string) {
    const raw = (editPriceVal[supplierId] ?? '').replace(/\s/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) evaluation.setSupplierPrice(supplierId, num);
    else if (raw === '') evaluation.setSupplierPrice(supplierId, 0);
    editingPrice[supplierId] = false;
  }

  let minPrice = $derived.by(() => {
    const prices = evaluation.data.suppliers.filter((s) => (s.price ?? 0) > 0).map((s) => s.price!);
    return prices.length > 0 ? Math.min(...prices) : 0;
  });

  let bestFormulaScore = $derived(Math.max(...Object.values(evaluation.priceFormulaScores), 0));
</script>

<div class="price-detail">
  <div class="section-label">Prisdetaljer — {criterion.name}</div>
  <div class="matrix-wrap">
    <table class="matrix">
      <colgroup>
        <col class="col-label" />
        {#each evaluation.data.suppliers as _}
          <col class="col-supplier" />
        {/each}
      </colgroup>
      <thead>
        <tr>
          <th></th>
          {#each evaluation.data.suppliers as supplier}
            <th class="th-supplier">{supplier.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <!-- Price input row -->
        <tr class="row-price">
          <td class="cell-label">Tilbudspris</td>
          {#each evaluation.data.suppliers as supplier}
            <td
              class="cell-price"
              class:cell-best={(supplier.price ?? 0) === minPrice && (supplier.price ?? 0) > 0}
            >
              {#if editingPrice[supplier.id]}
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  bind:this={priceInputs[supplier.id]}
                  type="text"
                  inputmode="numeric"
                  class="price-input"
                  autofocus
                  value={editPriceVal[supplier.id]}
                  oninput={(e) => (editPriceVal[supplier.id] = e.currentTarget.value)}
                  onblur={() => commitPrice(supplier.id)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') commitPrice(supplier.id);
                    if (e.key === 'Escape') editingPrice[supplier.id] = false;
                  }}
                />
              {:else}
                <button
                  class="price-btn {(supplier.price ?? 0) > 0 ? 'price-filled' : ''}"
                  onclick={() => startEditPrice(supplier.id, supplier.price)}
                  title="Klikk for å angi tilbudspris"
                >
                  {(supplier.price ?? 0) > 0 ? formatNOK(supplier.price!) + ' kr' : 'Angi pris'}
                </button>
              {/if}
            </td>
          {/each}
        </tr>

        <!-- Unweighted score row (0-10) -->
        <tr class="row-score">
          <td class="cell-label">Poeng (uvektet)</td>
          {#each evaluation.data.suppliers as supplier}
            {@const score = evaluation.priceFormulaScores[supplier.id] ?? 0}
            {@const tier = scoreTier(score)}
            {@const isBest = score === bestFormulaScore && score > 0}
            <td class="cell-score score-{tier}" class:score-best={isBest}>
              <span class="score-value">{score > 0 ? fmt2(score) : '—'}</span>
            </td>
          {/each}
        </tr>

        <!-- Weighted score row -->
        <tr class="row-score row-total">
          <td class="cell-label cell-label-total">Poeng (vektet {criterion.weight}%)</td>
          {#each evaluation.data.suppliers as supplier}
            {@const rawScore = evaluation.priceFormulaScores[supplier.id] ?? 0}
            {@const weighted = rawScore * (criterion.weight / evaluation.totalWeight)}
            {@const tier = scoreTier(weighted)}
            {@const bestWeighted = bestFormulaScore * (criterion.weight / evaluation.totalWeight)}
            {@const isBest = weighted === bestWeighted && weighted > 0}
            <td class="cell-score score-{tier}" class:score-best={isBest}>
              <span class="score-value">{weighted > 0 ? fmt2(weighted) : '—'}</span>
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>

  <div class="formula-info">
    Poeng = 10 − 10 × (P − P<sub>min</sub>) / P<sub>min</sub>, avgrenset til [0, 10]. Laveste pris
    gir 10 poeng.
  </div>
</div>

<style>
  .price-detail {
    margin-top: var(--spacing-2);
  }

  .section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
  }

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

  .col-label {
    width: auto;
    min-width: 160px;
  }
  .col-supplier {
    width: 160px;
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

  .th-supplier {
    text-align: center;
  }

  .cell-label {
    padding: var(--spacing-3);
    font-weight: 500;
    color: var(--color-ink-secondary);
    border-left: 3px solid var(--color-wire-strong);
  }

  .cell-label-total {
    font-weight: 700;
    color: var(--color-ink);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  .row-price {
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
  }

  .row-price .cell-label {
    border-left-color: var(--color-vekt);
  }

  .row-score {
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
  }

  .row-total {
    background: var(--color-canvas);
    border-top: 2px solid var(--color-wire-strong);
  }

  .row-total .cell-label {
    border-left-color: var(--color-vekt);
  }

  /* ── Price editing ── */
  .cell-price {
    text-align: center;
    padding: var(--spacing-1) var(--spacing-2);
    vertical-align: middle;
  }

  .cell-best {
    background: var(--color-score-high-bg);
  }

  .price-btn {
    display: block;
    width: 100%;
    text-align: center;
    font-family: var(--font-data);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: 1px dashed transparent;
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-3);
    cursor: pointer;
    transition: all 0.1s;
    line-height: 1;
  }

  .price-btn:hover {
    border-color: var(--color-wire);
    color: var(--color-ink-muted);
    background: var(--color-felt-hover);
  }

  .price-btn.price-filled {
    color: var(--color-ink);
    font-weight: 600;
  }

  .price-input {
    display: block;
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--color-ink);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire-focus);
    border-radius: var(--radius-sm);
    outline: none;
  }

  /* ── Score cells ── */
  .cell-score {
    text-align: center;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 600;
    padding: var(--spacing-3);
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

  .row-total .score-best .score-value {
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
  }

  .row-total .cell-score {
    font-size: 16px;
    font-weight: 700;
  }

  /* ── Formula info ── */
  .formula-info {
    margin-top: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    font-size: 11px;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-wire-strong);
    line-height: 1.5;
    font-family: var(--font-data);
  }
</style>
