<script lang="ts">
  import { protokoll } from '$lib/stores/protokoll.svelte';
  import { fmt1, formatNOK } from '$lib/stores/evaluation.svelte';

  let snap = $derived(protokoll.evaluationSnapshot);
  let criteria = $derived(snap?.data.criteria ?? []);
  let evalSuppliers = $derived(snap?.data.suppliers ?? []);
  let groupScores = $derived(protokoll.evalGroupScores);
  let ranking = $derived(protokoll.evalRanking);
  let selectedIds = $derived(protokoll.selectedSupplierIds);
  let hasPrice = $derived(evalSuppliers.some((s) => s.price != null));

  function handleToggle(supplierId: string) {
    protokoll.toggleSelectedSupplier(supplierId);
  }
</script>

{#if !snap}
  <div class="no-eval">
    <div class="no-eval-icon">&#9744;</div>
    <p class="no-eval-text">Ingen evalueringsdata funnet for denne anskaffelsen.</p>
    <p class="no-eval-hint">Gå til <strong>Evaluering</strong> og gjennomfør evalueringen først.</p>
    <button class="refresh-btn" onclick={() => protokoll.refreshEvaluation()}>
      Oppdater
    </button>
  </div>
{:else}
  <div class="eval-summary">
    <div class="summary-header">
      <span class="field-label">Poengoversikt fra evaluering</span>
      <button
        class="refresh-btn"
        onclick={() => protokoll.refreshEvaluation()}
        title="Hent siste evalueringsdata"
      >
        Oppdater
      </button>
    </div>

    <div class="table-wrap">
      <table class="score-table">
        <thead>
          <tr>
            <th class="col-check"></th>
            <th class="col-supplier">Leverandør</th>
            {#if hasPrice}
              <th class="col-price">Pris</th>
            {/if}
            {#each criteria as criterion}
              <th class="col-score" title="{criterion.name} ({criterion.weight} %)"
                >{criterion.name}<span class="weight-label">{criterion.weight}%</span></th
              >
            {/each}
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {#each ranking as { supplier, score, rank } (supplier.id)}
            {@const selected = selectedIds.includes(supplier.id)}
            <tr class:row-selected={selected}>
              <td class="col-check">
                <label class="check-label" title="Innstill som valgt leverandør">
                  <input
                    type="checkbox"
                    checked={selected}
                    onchange={() => handleToggle(supplier.id)}
                    class="check-input"
                  />
                  <span class="check-box" class:check-box-checked={selected}></span>
                </label>
              </td>
              <td class="col-supplier">
                <span class="rank-num">{rank}.</span>
                <span class="supplier-name" class:supplier-selected={selected}>{supplier.name}</span>
              </td>
              {#if hasPrice}
                <td class="col-price">{supplier.price != null ? `${formatNOK(supplier.price)} kr` : '—'}</td>
              {/if}
              {#each criteria as criterion}
                <td class="col-score">{fmt1(groupScores[criterion.id]?.[supplier.id] ?? 0)}</td>
              {/each}
              <td class="col-total">
                <strong>{fmt1(score)}</strong>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if selectedIds.length > 0}
      <div class="selection-summary">
        Innstilt{selectedIds.length > 1 ? 'e' : ''}:
        {#each selectedIds as id, i}
          {@const s = evalSuppliers.find((s) => s.id === id)}
          {#if i > 0}, {/if}
          <strong>{s?.name ?? id}</strong>
        {/each}
      </div>
    {:else}
      <div class="selection-hint">Kryss av for leverandør(er) som innstilles som valgt.</div>
    {/if}
  </div>
{/if}

<style>
  .no-eval {
    background: var(--color-felt);
    border: 1px dashed var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-6);
    text-align: center;
  }

  .no-eval-icon {
    font-size: 24px;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-2);
  }

  .no-eval-text {
    font-size: 13px;
    color: var(--color-ink-secondary);
    margin: 0 0 var(--spacing-1);
  }

  .no-eval-hint {
    font-size: 12px;
    color: var(--color-ink-muted);
    margin: 0 0 var(--spacing-3);
  }

  .eval-summary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .summary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .refresh-btn {
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.12s, color 0.12s;
  }

  .refresh-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
  }

  .score-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    font-family: var(--font-data);
  }

  .score-table th,
  .score-table td {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    border-bottom: 1px solid var(--color-wire);
  }

  .score-table thead th {
    background: var(--color-felt);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .score-table tbody tr:last-child td {
    border-bottom: none;
  }

  .col-check {
    width: 36px;
    text-align: center;
  }

  .col-supplier {
    white-space: nowrap;
  }

  .col-price {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .col-score {
    text-align: right;
    font-variant-numeric: tabular-nums;
    min-width: 48px;
  }

  .col-total {
    text-align: right;
    font-variant-numeric: tabular-nums;
    min-width: 56px;
  }

  .weight-label {
    display: block;
    font-size: 11px;
    font-weight: 400;
    color: var(--color-ink-ghost);
    text-transform: none;
    letter-spacing: 0;
  }

  .rank-num {
    color: var(--color-ink-muted);
    margin-right: var(--spacing-1);
    min-width: 18px;
    display: inline-block;
  }

  .supplier-name {
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--color-ink);
  }

  .supplier-selected {
    font-weight: 600;
  }

  .row-selected {
    background: var(--color-vekt-bg);
  }

  /* Checkbox */
  .check-label {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .check-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .check-box {
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--color-wire-strong);
    border-radius: 3px;
    background: var(--color-canvas);
    transition: background-color 0.1s, border-color 0.1s;
    position: relative;
  }

  .check-box-checked {
    background: var(--color-vekt);
    border-color: var(--color-vekt);
  }

  .check-box-checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: solid var(--color-canvas);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .check-input:focus-visible + .check-box {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 1px;
  }

  .selection-summary {
    font-size: 13px;
    color: var(--color-ink);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-vekt-bg);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-vekt-bg-strong);
  }

  .selection-hint {
    font-size: 12px;
    color: var(--color-ink-muted);
    font-style: italic;
  }
</style>
