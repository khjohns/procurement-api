<script lang="ts">
  import { qualification } from '$lib/stores/qualification.svelte';
  import QualificationCell from './QualificationCell.svelte';

  /** Count how many suppliers have been assessed for a requirement. */
  function countAssessed(reqId: string): { done: number; total: number } {
    const req = qualification.data.requirements.find((r) => r.id === reqId);
    if (!req) return { done: 0, total: 0 };
    const total = qualification.data.suppliers.length;
    let done = 0;
    for (const s of qualification.data.suppliers) {
      const v = req.assessments[s.id]?.verdict;
      if (v === 'met' || v === 'not_met') done++;
    }
    return { done, total };
  }

  /** First word of supplier name for compact display. */
  function shortName(name: string): string {
    return name.split(' ')[0] ?? name;
  }

  let useCompactNames = $derived(qualification.data.suppliers.length >= 4);
</script>

<div class="section-label">Kvalifikasjonsmatrise</div>
<div class="qmatrix-wrap">
  <table class="qmatrix">
    <colgroup>
      <col class="col-supplier" />
      {#each qualification.data.requirements as _}
        <col class="col-req" />
      {/each}
      <col class="col-result" />
    </colgroup>
    <thead>
      <tr>
        <th class="th th-supplier">Leverandør</th>
        {#each qualification.data.requirements as req (req.id)}
          {@const c = countAssessed(req.id)}
          <th
            class="th th-req th-clickable"
            onclick={() => qualification.setActiveView(req.id)}
            title={req.description || req.name}
          >
            <div class="th-name">{req.name}<span class="drill-chevron">›</span></div>
            <div class="th-meta">
              <span class:th-done={c.done === c.total}>{c.done}/{c.total}</span>
            </div>
          </th>
        {/each}
        <th class="th th-result">Kvalifisert</th>
      </tr>
    </thead>
    <tbody>
      {#each qualification.data.suppliers as supplier (supplier.id)}
        {@const r = qualification.supplierResults[supplier.id]}
        <tr class="matrix-row">
          <td class="td td-supplier">
            <div class="td-supplier-name">
              {useCompactNames ? shortName(supplier.name) : supplier.name}
            </div>
            {#if useCompactNames}
              <div class="td-supplier-full">{supplier.name}</div>
            {/if}
          </td>
          {#each qualification.data.requirements as req (req.id)}
            {@const a = req.assessments[supplier.id]}
            {@const verdict = a?.verdict ?? 'not_assessed'}
            {@const hasSupport = a?.basis === 'supported' && (a?.supportEntities?.length ?? 0) > 0}
            {@const hasNotes = !!a?.notes}
            <QualificationCell
              {verdict}
              {hasSupport}
              {hasNotes}
              onclick={() => qualification.setActiveView(req.id)}
            />
          {/each}
          <td class="td td-result">
            {#if r?.qualified}
              <span class="result-value result-yes">Ja</span>
            {:else if r?.allAssessed}
              <span class="result-value result-no">Nei</span>
            {:else}
              <span class="result-value result-pending">—</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-3);
  }

  .qmatrix-wrap {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-wire);
  }

  .qmatrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 500px;
  }

  .col-supplier {
    width: 150px;
  }
  .col-req {
    width: auto;
  }
  .col-result {
    width: 90px;
  }

  /* ── Header ── */
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

  .th-supplier {
    padding-left: var(--spacing-4);
  }

  .th-req {
    text-align: center;
    white-space: normal;
    min-width: 100px;
  }

  .th-clickable {
    cursor: pointer;
    transition: background 0.12s;
  }

  .th-clickable:hover {
    background: var(--color-felt-hover);
  }

  .th-clickable:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .drill-chevron {
    font-size: 12px;
    color: var(--color-ink-ghost);
    margin-left: var(--spacing-1);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .th-clickable:hover .drill-chevron {
    opacity: 1;
  }

  .th-meta {
    font-size: 9px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    letter-spacing: 0;
    text-transform: none;
    margin-top: 2px;
  }

  .th-done {
    color: var(--color-score-high);
  }

  .th-result {
    text-align: center;
  }

  /* ── Rows ── */
  .matrix-row {
    transition: background 0.12s;
  }

  .matrix-row:hover {
    background: var(--color-felt-hover);
  }

  .td {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    border-bottom: 1px solid var(--color-wire);
    vertical-align: middle;
  }

  .td-supplier {
    padding-left: var(--spacing-4);
  }

  .td-supplier-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .td-supplier-full {
    font-size: 10px;
    color: var(--color-ink-ghost);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  /* ── Result column ── */
  .td-result {
    text-align: center;
  }

  .result-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .result-yes {
    color: var(--color-score-high);
    background: var(--color-score-high-bg);
  }

  .result-no {
    color: var(--color-score-low);
    background: var(--color-score-low-bg);
  }

  .result-pending {
    color: var(--color-ink-ghost);
  }
</style>
