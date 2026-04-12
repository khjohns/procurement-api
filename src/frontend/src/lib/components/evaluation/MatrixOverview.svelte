<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import { scoreColor, fS, countDone, fN, shortName } from './shared';

  let {
    onselect,
  }: {
    onselect: (criterionId: string) => void;
  } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let qualityCriteria = $derived(evaluation.data.criteria.filter((c) => c.type !== 'price'));
  let isPrismodell = $derived(evaluation.activeMethod === 'pris');
  let bestTotal = $derived(Math.max(...suppliers.map((s) => evaluation.totals[s.id] ?? 0)));
  let bestEvaluatedPrice = $derived(
    Math.min(
      ...suppliers
        .filter((s) => s.price != null)
        .map((s) => evaluation.evaluatedPrices[s.id] ?? Infinity)
    )
  );
  let ranked = $derived(evaluation.ranking);
</script>

{#if ranked.length >= 2}
  <div class="ranking-badges">
    {#each ranked.slice(0, 3) as item, i (item.supplier.id)}
      <span class="rank-item">
        <span class="rank-badge" class:rank-badge-leader={i === 0}>{i + 1}</span>
        <span class="rank-name" class:rank-name-leader={i === 0}>{item.supplier.name}</span>
        <span class="rank-score">{item.score.toFixed(2)}</span>
      </span>
    {/each}
  </div>
{/if}

<div class="matrix-scroll">
  <table class="matrix">
    <thead>
      <tr>
        <th class="th" style="width: 150px;">Leverandør</th>
        <th class="th th-center" style="width: 110px;">Pris</th>
        {#each qualityCriteria as k (k.id)}
          {@const c = countDone(k, suppliers)}
          <th
            class="th th-center th-clickable"
            onclick={() => onselect(k.id)}
            title="Klikk for detaljer"
          >
            <div class="th-criterion">{shortName(k.name)}</div>
            <div class="th-meta">
              {#if isPrismodell}
                {fN(k.maxPriceDeduction ?? 0)} kr
              {:else}
                {k.weight}%
              {/if}
              · <span class:th-done={c.done === c.total}>{c.done}/{c.total}</span>
            </div>
          </th>
        {/each}
        <th class="th th-center" style="width: 90px;">
          {isPrismodell ? 'Eval. pris' : 'Total'}
        </th>
      </tr>
    </thead>
    <tbody>
      {#each suppliers as lev (lev.id)}
        {@const total = evaluation.totals[lev.id]}
        {@const ep = evaluation.evaluatedPrices[lev.id]}
        <tr class="matrix-row">
          <td class="td">
            <div class="td-supplier-name">{shortName(lev.name)}</div>
            <div class="td-supplier-full">{lev.name}</div>
          </td>
          <td class="td td-center">
            <input
              class="price-input"
              type="text"
              inputmode="numeric"
              value={lev.price != null ? fN(lev.price) : ''}
              onblur={(e) => {
                const raw = e.currentTarget.value.replace(/[\s\u00A0]/g, '');
                const n = parseFloat(raw);
                evaluation.setSupplierPrice(
                  lev.id,
                  raw === '' ? undefined : isNaN(n) ? undefined : n
                );
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="Pris"
            />
          </td>
          {#each qualityCriteria as k (k.id)}
            {@const gs = evaluation.groupScores[k.id]?.[lev.id]}
            <td class="td td-center td-score-cell" onclick={() => onselect(k.id)}>
              {#if gs != null}
                <span class="td-score" style:color={scoreColor(gs)}>{fS(gs)}</span>
              {:else}
                <span class="td-empty">–</span>
              {/if}
            </td>
          {/each}
          <td class="td td-center">
            {#if isPrismodell}
              <span class="td-total" class:td-total-best={ep != null && ep === bestEvaluatedPrice}>
                {ep != null ? fN(ep) : '–'}
              </span>
            {:else}
              <span class="td-total" class:td-total-best={total != null && total === bestTotal}>
                {total != null ? total.toFixed(2) : '–'}
              </span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* ── Ranking badges ── */
  .ranking-badges {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
    flex-wrap: wrap;
  }

  .rank-item {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-right: var(--spacing-2);
  }

  .rank-badge {
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

  .rank-badge-leader {
    background: var(--color-score-high);
    color: #fff;
    border-color: transparent;
  }

  .rank-name {
    font-size: 11px;
    font-weight: 400;
    color: var(--color-ink);
  }

  .rank-name-leader {
    font-weight: 600;
    color: var(--color-score-high);
  }

  .rank-score {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  /* ── Matrix ── */
  .matrix-scroll {
    overflow-x: auto;
  }

  .matrix {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
  }

  .th {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-ui);
    border-bottom: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
    white-space: nowrap;
  }

  .th-center {
    text-align: center;
  }

  .th-clickable {
    cursor: pointer;
    transition: background 0.12s;
  }

  .th-clickable:hover {
    background: var(--color-felt-hover);
  }

  .th-criterion {
    font-size: 11px;
    font-weight: 700;
  }

  .th-meta {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    letter-spacing: 0;
    text-transform: none;
    margin-top: 1px;
  }

  .th-done {
    color: var(--color-score-high);
  }

  .td {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    border-bottom: 1px solid var(--color-wire);
    vertical-align: middle;
  }

  .td-center {
    text-align: center;
  }

  .matrix-row {
    transition: background 0.12s;
  }

  .matrix-row:hover {
    background: var(--color-felt-hover);
  }

  .td-supplier-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .td-supplier-full {
    font-size: 11px;
    color: var(--color-ink-ghost);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  .td-score-cell {
    cursor: pointer;
  }

  .td-score-cell:hover {
    background: var(--color-felt-active);
  }

  .price-input {
    width: 100%;
    max-width: 110px;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
    text-align: center;
    outline: none;
  }

  .price-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .price-input::placeholder {
    color: var(--color-ink-ghost);
    font-weight: 400;
  }

  .td-score {
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 600;
  }

  .td-empty {
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .td-total {
    font-family: var(--font-data);
    font-size: 16px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .td-total-best {
    color: var(--color-score-high);
  }
</style>
