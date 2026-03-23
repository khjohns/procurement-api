<script lang="ts">
  import { evaluation, criterionMode, formatNOK, fmt2 } from '$lib/stores/evaluation.svelte';
  import { scoreColor, fS, countDone, fN } from './shared';

  let {
    onselect,
  }: {
    onselect: (criterionId: string) => void;
  } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let criteria = $derived(evaluation.data.criteria);
  let compact = $derived(suppliers.length > 3);
  let isPrismodell = $derived(evaluation.activeMethod === 'pris');
  let bestTotal = $derived(Math.max(...suppliers.map((s) => evaluation.totals[s.id] ?? 0)));
  let bestEvaluatedPrice = $derived(
    Math.min(
      ...suppliers
        .filter((s) => s.price != null)
        .map((s) => evaluation.evaluatedPrices[s.id] ?? Infinity)
    )
  );
</script>

<div class="matrix-scroll" class:matrix-compact={compact}>
  <table class="matrix">
    <thead>
      <tr>
        <th class="th" style="width: 170px;">Kriterium</th>
        <th class="th th-center" style="width: 48px;">Vekt</th>
        {#each suppliers as lev (lev.id)}
          <th class="th th-center">{compact ? (lev.name.split(' ')[0] ?? lev.name) : lev.name}</th>
        {/each}
        <th class="th th-center" style="width: 48px;"></th>
      </tr>
    </thead>
    <tbody>
      {#each criteria as k (k.id)}
        {@const c = countDone(k, suppliers)}
        {@const clickable = k.type !== 'price'}
        <tr
          class="matrix-row"
          class:matrix-row-clickable={clickable}
          onclick={() => clickable && onselect(k.id)}
        >
          <td class="td">
            <div class="td-criterion">
              <span class="td-criterion-name">{k.name}</span>
              {#if clickable}
                <span class="td-criterion-arrow">›</span>
              {/if}
            </div>
          </td>
          <td class="td td-center td-weight">
            {#if k.type === 'price' && isPrismodell}
              —
            {:else}
              {k.weight}%
            {/if}
          </td>
          {#each suppliers as lev (lev.id)}
            {@const gs = evaluation.groupScores[k.id]?.[lev.id]}
            <td class="td td-center">
              {#if k.type === 'price'}
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
                {#if gs != null && !isPrismodell}
                  <div class="td-price-score">({gs.toFixed(2)})</div>
                {/if}
              {:else if gs != null}
                <span class="td-score" style:color={scoreColor(gs)}>{fS(gs)}</span>
              {:else}
                <span class="td-empty">–</span>
              {/if}
            </td>
          {/each}
          <td class="td td-center td-progress" class:td-progress-done={c.done === c.total}>
            {c.done}/{c.total}
          </td>
        </tr>
      {/each}

      <!-- Total row -->
      <tr class="matrix-total">
        <td class="td td-total-label">{isPrismodell ? 'Evaluert pris' : 'Total vektet'}</td>
        <td class="td td-center td-total-weight">
          {#if !isPrismodell}100%{/if}
        </td>
        {#each suppliers as lev (lev.id)}
          {#if isPrismodell}
            {@const ep = evaluation.evaluatedPrices[lev.id]}
            <td class="td td-center">
              <span class="td-total" class:td-total-best={ep != null && ep === bestEvaluatedPrice}>
                {ep != null ? fN(ep) : '–'}
              </span>
            </td>
          {:else}
            {@const t = evaluation.totals[lev.id]}
            <td class="td td-center">
              <span class="td-total" class:td-total-best={t != null && t === bestTotal}>
                {t != null ? t.toFixed(2) : '–'}
              </span>
            </td>
          {/if}
        {/each}
        <td class="td"></td>
      </tr>
    </tbody>
  </table>
</div>

<style>
  .matrix-scroll {
    overflow-x: auto;
  }

  .matrix-compact {
    overflow-x: auto;
  }

  .matrix {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }

  .th {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    font-size: 10px;
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

  .matrix-row-clickable {
    cursor: pointer;
  }

  .matrix-row-clickable:hover {
    background: var(--color-felt-hover);
  }

  .td-criterion {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .td-criterion-name {
    font-weight: 600;
    font-size: 12px;
  }

  .td-criterion-arrow {
    font-size: 10px;
    color: var(--color-vekt);
  }

  .td-weight {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary);
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

  .td-price-score {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
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

  .td-progress {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
  }

  .td-progress-done {
    color: var(--color-score-high);
  }

  .matrix-total {
    border-top: 2px solid var(--color-wire-strong);
  }

  .td-total-label {
    font-weight: 700;
    font-size: 13px;
  }

  .td-total-weight {
    font-family: var(--font-data);
    font-weight: 700;
    font-size: 12px;
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
