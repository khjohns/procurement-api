<script lang="ts">
  import {
    evaluation,
    scoreTier,
    type Criterion,
    type SubCriterion,
  } from '$lib/stores/evaluation.svelte';
  import ScoreCell from './ScoreCell.svelte';
  import InlineNumberEditor from './InlineNumberEditor.svelte';

  interface Props {
    criterion: Criterion;
    simpleSubs: SubCriterion[];
    hasItemSubs: boolean;
  }

  let { criterion, simpleSubs, hasItemSubs }: Props = $props();
</script>

<div class="simple-section">
  {#if hasItemSubs}
    <div class="section-label">Øvrige underkriterier</div>
  {/if}
  <div class="matrix-wrap">
    {#if !evaluation.matrixTransposed}
      <table class="simple-matrix">
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
            <th>Underkriterium</th>
            {#each evaluation.data.suppliers as supplier}
              <th class="th-supplier">{supplier.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each simpleSubs as sub}
            <tr class="row-sub">
              <td class="cell-weight">
                <InlineNumberEditor
                  value={sub.weight}
                  min={0}
                  max={100}
                  suffix="%"
                  variant="weight-column"
                  oncommit={(v) => evaluation.setSubCriterionWeight(sub.id, v)}
                />
              </td>
              <td class="cell-criteria">{sub.name}</td>
              {#each evaluation.data.suppliers as supplier}
                {@const score = sub.scores[supplier.id] ?? 0}
                {@const isBest = score === (evaluation.bestScores[sub.id] ?? 0) && score > 0}
                <ScoreCell
                  {score}
                  {isBest}
                  hasNotes={!!sub.notes[supplier.id]}
                  isSelected={evaluation.selectedSupplierId === supplier.id}
                  onclick={() => evaluation.selectSupplier(supplier.id)}
                  oncommit={(v) => evaluation.setScore(sub.id, supplier.id, v)}
                />
              {/each}
            </tr>
          {/each}

          <!-- Sub-total row -->
          <tr class="row-total">
            <td class="cell-weight">
              <InlineNumberEditor
                value={criterion.weight}
                min={0}
                max={100}
                suffix="%"
                variant="weight-column"
                oncommit={(v) => evaluation.setCriterionWeight(criterion.id, v)}
              />
            </td>
            <td class="cell-criteria cell-total-name">Samlet</td>
            {#each evaluation.data.suppliers as supplier}
              {@const score = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
              {@const best = evaluation.bestGroupScores[criterion.id] ?? 0}
              <ScoreCell {score} isBest={score === best && score > 0} />
            {/each}
          </tr>
        </tbody>
      </table>
    {:else}
      <!-- Transposed: suppliers as rows, sub-criteria as columns -->
      <table class="simple-matrix matrix-transposed">
        <colgroup>
          <col class="col-supplier-name-t" />
          {#each simpleSubs as _}
            <col class="col-sub-t" />
          {/each}
          <col class="col-total-t" />
        </colgroup>
        <thead>
          <tr>
            <th class="th-supplier-name-t">Leverandør</th>
            {#each simpleSubs as sub}
              <th class="th-sub-t">
                <span class="th-sub-name">{sub.name}</span>
                <span class="th-sub-weight">
                  <InlineNumberEditor
                    value={sub.weight}
                    min={0}
                    max={100}
                    suffix="%"
                    variant="weight-transposed"
                    oncommit={(v) => evaluation.setSubCriterionWeight(sub.id, v)}
                  />
                </span>
              </th>
            {/each}
            <th class="th-total-t">Samlet</th>
          </tr>
        </thead>
        <tbody>
          {#each evaluation.data.suppliers as supplier}
            {@const totalScore = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
            {@const best = evaluation.bestGroupScores[criterion.id] ?? 0}
            {@const isTotalBest = totalScore === best && totalScore > 0}
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
              {#each simpleSubs as sub}
                {@const score = sub.scores[supplier.id] ?? 0}
                {@const isBest = score === (evaluation.bestScores[sub.id] ?? 0) && score > 0}
                <ScoreCell
                  {score}
                  {isBest}
                  hasNotes={!!sub.notes[supplier.id]}
                  isSelected={evaluation.selectedSupplierId === supplier.id}
                  onclick={() => evaluation.selectSupplier(supplier.id)}
                  oncommit={(v) => evaluation.setScore(sub.id, supplier.id, v)}
                  stopPropagation
                />
              {/each}
              <ScoreCell score={totalScore} isBest={isTotalBest} />
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .simple-section {
    margin-top: var(--spacing-5);
  }

  .section-label {
    font-size: 11px;
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

  .simple-matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .col-weight {
    width: 72px;
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

  .th-weight {
    text-align: center;
  }
  .th-supplier {
    text-align: center;
  }

  .cell-weight {
    padding: var(--spacing-2) var(--spacing-3);
    vertical-align: middle;
    text-align: center;
    border-left: 3px solid rgba(232, 168, 56, 0.15);
  }

  .cell-criteria {
    padding: var(--spacing-2) var(--spacing-3);
    font-weight: 500;
    color: var(--color-ink-secondary);
    font-size: 12px;
  }

  .cell-total-name {
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-ink);
  }

  .row-sub {
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire);
  }

  .row-sub:hover {
    background: var(--color-felt-hover);
  }

  .row-total {
    background: var(--color-canvas);
    border-top: 2px solid var(--color-wire-strong);
  }

  .row-total .cell-weight {
    border-left-color: var(--color-vekt);
  }

  /* ── Transposed mode styles ── */
  .col-supplier-name-t {
    width: auto;
    min-width: 140px;
  }
  .col-sub-t {
    width: 120px;
  }
  .col-total-t {
    width: 100px;
  }

  .th-supplier-name-t {
    white-space: nowrap;
  }

  .th-sub-t {
    text-align: center;
    vertical-align: bottom;
  }

  .th-sub-name {
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

  .th-sub-weight {
    display: block;
    margin-top: var(--spacing-1);
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 500;
    color: var(--color-vekt-dim);
    text-transform: none;
    letter-spacing: normal;
  }

  .th-total-t {
    text-align: center;
    font-weight: 700;
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
