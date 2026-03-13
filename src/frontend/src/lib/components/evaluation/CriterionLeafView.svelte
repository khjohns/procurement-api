<script lang="ts">
  import {
    evaluation,
    scoreTier,
  } from '$lib/stores/evaluation.svelte';
  import ScoreCell from './ScoreCell.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);
</script>

<!-- ══ LEAF MODE: direct scores on criterion ══ -->
<div class="simple-section">
  <div class="matrix-wrap">
    {#if !evaluation.matrixTransposed}
      <table class="simple-matrix">
        <colgroup>
          <col class="col-criteria" />
          {#each evaluation.data.suppliers as _}
            <col class="col-supplier" />
          {/each}
        </colgroup>
        <thead>
          <tr>
            <th>Leverandør</th>
            {#each evaluation.data.suppliers as supplier}
              <th class="th-supplier">{supplier.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          <tr class="row-sub">
            <td class="cell-criteria">{criterion.name}</td>
            {#each evaluation.data.suppliers as supplier}
              {@const score = evaluation.groupScores[criterionId]?.[supplier.id] ?? 0}
              {@const isPriceAuto =
                criterion.type === 'price' && evaluation.activeMethod === 'poeng'}
              <ScoreCell
                {score}
                isSelected={evaluation.selectedSupplierId === supplier.id}
                onclick={() => evaluation.selectSupplier(supplier.id)}
                oncommit={isPriceAuto
                  ? undefined
                  : (v) => evaluation.setCriterionScore(criterionId, supplier.id, v)}
              />
            {/each}
          </tr>
        </tbody>
      </table>
    {:else}
      <!-- Transposed: suppliers as rows -->
      <table class="simple-matrix matrix-transposed">
        <colgroup>
          <col class="col-supplier-name-t" />
          <col class="col-score-t" />
        </colgroup>
        <thead>
          <tr>
            <th class="th-supplier-name-t">Leverandør</th>
            <th class="th-score-t">{criterion.name}</th>
          </tr>
        </thead>
        <tbody>
          {#each evaluation.data.suppliers as supplier}
            {@const score = evaluation.groupScores[criterionId]?.[supplier.id] ?? 0}
            {@const isPriceAuto =
              criterion.type === 'price' && evaluation.activeMethod === 'poeng'}
            <tr
              class="row-sub row-clickable-t"
              class:row-selected-t={evaluation.selectedSupplierId === supplier.id}
              onclick={() => evaluation.selectSupplier(supplier.id)}
              role="row"
              tabindex={0}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') evaluation.selectSupplier(supplier.id);
              }}
            >
              <td class="cell-supplier-name-t">{supplier.name}</td>
              <ScoreCell
                {score}
                isSelected={evaluation.selectedSupplierId === supplier.id}
                onclick={() => evaluation.selectSupplier(supplier.id)}
                oncommit={isPriceAuto
                  ? undefined
                  : (v) => evaluation.setCriterionScore(criterionId, supplier.id, v)}
                stopPropagation
              />
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  /* ── Simple sub-criteria section ── */
  .simple-section {
    margin-top: var(--spacing-5);
  }

  .matrix-wrap {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-wire);
  }

  .simple-matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .col-criteria {
    width: auto;
  }
  .col-supplier {
    width: 120px;
  }

  .simple-matrix th {
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

  /* Criteria column */
  .cell-criteria {
    padding: var(--spacing-2) var(--spacing-3);
    font-weight: 500;
    color: var(--color-ink-secondary);
    font-size: 12px;
  }

  /* Rows */
  .row-sub {
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire);
  }

  .row-sub:hover {
    background: var(--color-felt-hover);
  }

  /* ── Transposed mode styles ── */
  .col-supplier-name-t {
    width: auto;
    min-width: 140px;
  }
  .col-score-t {
    width: 140px;
  }

  .th-supplier-name-t {
    white-space: nowrap;
  }

  .th-score-t {
    text-align: center;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 600;
    color: var(--color-ink);
  }

  .cell-supplier-name-t {
    padding: var(--spacing-3);
    font-weight: 600;
    color: var(--color-ink);
    font-size: 12px;
    border-left: 3px solid var(--color-wire-strong);
  }

  .row-clickable-t {
    cursor: pointer;
    transition: background 0.08s;
  }

  .row-clickable-t:hover {
    background: var(--color-felt-hover);
  }

  .row-selected-t .cell-supplier-name-t {
    border-left-color: var(--color-vekt);
  }
</style>
