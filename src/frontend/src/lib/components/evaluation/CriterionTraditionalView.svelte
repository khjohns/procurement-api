<script lang="ts">
  import {
    evaluation,
    scoreTier,
    itemScore,
    fmt2,
    type EvaluationItem,
    type ItemCriterion,
  } from '$lib/stores/evaluation.svelte';
  import ItemScoreCell from './ItemScoreCell.svelte';
  import ScoreCell from './ScoreCell.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);

  /** Split sub-criteria into item-level and simple. */
  let itemSubs = $derived(
    criterion.subcriteria.filter((s) => s.evaluationType === 'item' && s.itemCriteria)
  );

  let simpleSubs = $derived(criterion.subcriteria.filter((s) => s.evaluationType !== 'item'));

  /** Inline weight editing state. */
  let editingWeight = $state<string | null>(null);
  let editValue = $state('');

  function startEdit(id: string, currentWeight: number) {
    editingWeight = id;
    editValue = String(currentWeight);
  }

  function commitEdit(type: 'criterion' | 'sub', id: string) {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      if (type === 'criterion') {
        evaluation.setCriterionWeight(id, num);
      } else {
        evaluation.setSubCriterionWeight(id, num);
      }
    }
    editingWeight = null;
  }

  function cancelEdit() {
    editingWeight = null;
  }

  function handleWeightKeydown(e: KeyboardEvent, type: 'criterion' | 'sub', id: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(type, id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  /** Adding items to item-level sub-criteria. */
  let addingItem = $state<string | null>(null); // subId:supplierId
  let newItemName = $state('');
  let newItemLabel = $state('');

  function handleAddItem(subId: string, supplierId: string) {
    if (!newItemName.trim()) return;
    evaluation.addItem(subId, supplierId, newItemName.trim(), newItemLabel.trim() || undefined);
    newItemName = '';
    newItemLabel = '';
    addingItem = null;
  }

  /** Column best for item-level sub. */
  function getItemColumnBest(items: EvaluationItem[], icId: string): number {
    if (items.length === 0) return 0;
    return Math.max(0, ...items.map((item) => item.scores[icId] ?? 0));
  }

  function getItemBestAvg(items: EvaluationItem[], itemCriteria: ItemCriterion[]): number {
    if (items.length === 0) return 0;
    return Math.max(...items.map((item) => itemScore(item, itemCriteria)));
  }
</script>

<!-- ══ TRADITIONAL MODE: itemSubs + simpleSubs split ══ -->

<!-- Item-level sub-criteria sections -->
{#each itemSubs as sub}
  {@const itemCriteria = sub.itemCriteria!}
  <div class="item-section">
    <div class="item-section-header">
      <span class="item-section-name">{sub.name}</span>
      <span class="item-section-weight">
        {#if editingWeight === sub.id}
          <span class="weight-edit-inline">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              type="number"
              class="weight-input"
              min="0"
              max="100"
              bind:value={editValue}
              onkeydown={(e) => handleWeightKeydown(e, 'sub', sub.id)}
              onblur={() => commitEdit('sub', sub.id)}
              autofocus
            />%
          </span>
        {:else}
          <button class="weight-clickable" onclick={() => startEdit(sub.id, sub.weight)}>
            {sub.weight}%
          </button>
        {/if}
      </span>
      <div class="item-section-agg">
        <span class="agg-label">Aggregering:</span>
        <button
          class="agg-btn"
          class:active={sub.aggregation === 'average' || !sub.aggregation}
          onclick={() => evaluation.setAggregation(sub.id, 'average')}>Snitt</button
        >
        <button
          class="agg-btn"
          class:active={sub.aggregation === 'minimum'}
          onclick={() => evaluation.setAggregation(sub.id, 'minimum')}>Minimum</button
        >
      </div>
    </div>

    <div class="item-matrix-wrap">
      <table class="item-matrix">
        <thead>
          <tr>
            <th class="th-ic-name"></th>
            {#each evaluation.data.suppliers as supplier}
              {@const items = sub.items?.[supplier.id] ?? []}
              {#if items.length > 0}
                {@const aggScore = evaluation.itemScores[sub.id]?.[supplier.id] ?? 0}
                <th class="th-supplier-group" colspan={items.length + 1}>
                  <span class="supplier-group-name">{supplier.name}</span>
                  <span class="supplier-group-agg">
                    <span class="agg-score tier-{scoreTier(aggScore)}">{fmt2(aggScore)}</span>
                  </span>
                </th>
              {:else}
                <th class="th-supplier-group th-empty">
                  <span class="supplier-group-name">{supplier.name}</span>
                </th>
              {/if}
            {/each}
          </tr>
          <tr class="row-resource-names">
            <th class="th-ic-label">
              <span class="ic-label-text">Vekt</span>
            </th>
            {#each evaluation.data.suppliers as supplier}
              {@const items = sub.items?.[supplier.id] ?? []}
              {#if items.length > 0}
                {#each items as item}
                  <th class="th-resource">
                    <span class="resource-name">{item.name}</span>
                    {#if item.label}
                      <span class="resource-label">{item.label}</span>
                    {/if}
                  </th>
                {/each}
                <th class="th-resource-avg">Snitt</th>
              {:else}
                <th class="th-resource-empty">
                  <span class="empty-hint">Ingen ressurser</span>
                </th>
              {/if}
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each itemCriteria as ic}
            <tr class="row-ic">
              <td class="cell-ic-name">
                <span class="ic-name">{ic.name}</span>
                <span class="ic-weight">{ic.weight}%</span>
              </td>
              {#each evaluation.data.suppliers as supplier}
                {@const items = sub.items?.[supplier.id] ?? []}
                {#if items.length > 0}
                  {@const colBest = getItemColumnBest(items, ic.id)}
                  {#each items as item}
                    {@const score = item.scores[ic.id] ?? 0}
                    {@const isBest = score === colBest && score > 0}
                    <ItemScoreCell
                      {score}
                      {isBest}
                      onchange={(v) =>
                        evaluation.setItemScore(sub.id, supplier.id, item.id, ic.id, v)}
                    />
                  {/each}
                  <!-- Column average -->
                  {@const colAvg =
                    items.length > 0
                      ? items.reduce((s, i) => s + (i.scores[ic.id] ?? 0), 0) / items.length
                      : 0}
                  <td class="cell-col-avg">
                    <span class="col-avg-value tier-{scoreTier(colAvg)}">
                      {fmt2(colAvg)}
                    </span>
                  </td>
                {:else}
                  <td class="cell-empty">—</td>
                {/if}
              {/each}
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="row-item-totals">
            <td class="cell-ic-name cell-total-label">Snitt</td>
            {#each evaluation.data.suppliers as supplier}
              {@const items = sub.items?.[supplier.id] ?? []}
              {#if items.length > 0}
                {@const bestAvg = getItemBestAvg(items, itemCriteria)}
                {#each items as item}
                  {@const avg = itemScore(item, itemCriteria)}
                  {@const isItemBest = avg === bestAvg && avg > 0}
                  <td class="cell-item-avg">
                    <span
                      class="item-avg-value tier-{scoreTier(avg)}"
                      class:avg-best={isItemBest}
                    >
                      {fmt2(avg)}
                    </span>
                  </td>
                {/each}
                {@const aggScore = evaluation.itemScores[sub.id]?.[supplier.id] ?? 0}
                <td class="cell-col-avg cell-agg-final">
                  <span class="col-avg-value tier-{scoreTier(aggScore)} agg-final">
                    {fmt2(aggScore)}
                  </span>
                </td>
              {:else}
                <td class="cell-empty">—</td>
              {/if}
            {/each}
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Add resource buttons per supplier -->
    <div class="add-resource-strip">
      {#each evaluation.data.suppliers as supplier}
        {@const addKey = `${sub.id}:${supplier.id}`}
        {#if addingItem === addKey}
          <div class="add-form">
            <span class="add-form-label">{supplier.name}:</span>
            <input
              class="add-input"
              type="text"
              placeholder="Navn"
              bind:value={newItemName}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleAddItem(sub.id, supplier.id);
                if (e.key === 'Escape') addingItem = null;
              }}
            />
            <input
              class="add-input add-input-sm"
              type="text"
              placeholder="Rolle"
              bind:value={newItemLabel}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleAddItem(sub.id, supplier.id);
                if (e.key === 'Escape') addingItem = null;
              }}
            />
            <button class="add-confirm" onclick={() => handleAddItem(sub.id, supplier.id)}
              >Legg til</button
            >
            <button class="add-cancel" onclick={() => (addingItem = null)}>×</button>
          </div>
        {:else}
          <button
            class="add-resource-btn"
            onclick={() => {
              addingItem = addKey;
              newItemName = '';
              newItemLabel = '';
            }}
          >
            + {sub.itemLabel ?? 'Ressurs'} ({supplier.name})
          </button>
        {/if}
      {/each}
    </div>
  </div>
{/each}

<!-- Simple sub-criteria table -->
{#if simpleSubs.length > 0}
  <div class="simple-section">
    {#if itemSubs.length > 0}
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
                  {#if editingWeight === sub.id}
                    <div class="weight-edit">
                      <!-- svelte-ignore a11y_autofocus -->
                      <input
                        type="number"
                        class="weight-input"
                        min="0"
                        max="100"
                        bind:value={editValue}
                        onkeydown={(e) => handleWeightKeydown(e, 'sub', sub.id)}
                        onblur={() => commitEdit('sub', sub.id)}
                        autofocus
                      /><span class="weight-pct-edit">%</span>
                    </div>
                  {:else}
                    <button
                      class="weight-display weight-btn"
                      onclick={() => startEdit(sub.id, sub.weight)}
                    >
                      <span class="weight-num">{sub.weight}<span class="weight-pct">%</span></span
                      >
                    </button>
                  {/if}
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
                {#if editingWeight === criterion.id}
                  <div class="weight-edit">
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      type="number"
                      class="weight-input"
                      min="0"
                      max="100"
                      bind:value={editValue}
                      onkeydown={(e) => handleWeightKeydown(e, 'criterion', criterion.id)}
                      onblur={() => commitEdit('criterion', criterion.id)}
                      autofocus
                    /><span class="weight-pct-edit">%</span>
                  </div>
                {:else}
                  <button
                    class="weight-display weight-btn"
                    onclick={() => startEdit(criterion.id, criterion.weight)}
                  >
                    <span class="weight-num"
                      >{criterion.weight}<span class="weight-pct">%</span></span
                    >
                  </button>
                {/if}
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
                    {#if editingWeight === sub.id}
                      <span class="weight-edit-inline-t">
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                          type="number"
                          class="weight-input weight-input-t"
                          min="0"
                          max="100"
                          bind:value={editValue}
                          onkeydown={(e) => handleWeightKeydown(e, 'sub', sub.id)}
                          onblur={() => commitEdit('sub', sub.id)}
                          onclick={(e) => e.stopPropagation()}
                          autofocus
                        />%
                      </span>
                    {:else}
                      <button
                        class="weight-clickable-t"
                        onclick={(e) => {
                          e.stopPropagation();
                          startEdit(sub.id, sub.weight);
                        }}
                      >
                        {sub.weight}%
                      </button>
                    {/if}
                  </span>
                </th>
              {/each}
              <th class="th-total-t">Samlet</th>
            </tr>
          </thead>
          <tbody>
            {#each evaluation.data.suppliers as supplier}
              {@const totalScore = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
              {@const totalTier = scoreTier(totalScore)}
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
{/if}

<style>
  /* ── Item-level section ── */
  .item-section {
    margin-bottom: var(--spacing-6);
  }

  .item-section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .item-section-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .item-section-weight {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-vekt-dim);
  }

  .item-section-agg {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .agg-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
  }

  .agg-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-1) var(--spacing-2);
    cursor: pointer;
    transition: all 0.1s;
  }

  .agg-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .agg-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .agg-btn.active {
    background: var(--color-vekt-bg-strong);
    border-color: var(--color-vekt-bg-strong);
    color: var(--color-vekt);
    font-weight: 600;
  }

  /* ── Item matrix ── */
  .item-matrix-wrap {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-wire);
  }

  .item-matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .item-matrix th {
    padding: var(--spacing-2) var(--spacing-2);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
    text-align: center;
    white-space: nowrap;
  }

  .th-ic-name {
    width: 160px;
    min-width: 140px;
  }

  .item-matrix .th-ic-label {
    text-align: left;
    padding-left: var(--spacing-3);
  }

  .ic-label-text {
    font-size: 9px;
    color: var(--color-ink-ghost);
  }

  .item-matrix .th-supplier-group {
    border-left: 2px solid var(--color-wire-strong);
    background: var(--color-felt);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .th-empty {
    min-width: 80px;
  }

  .supplier-group-name {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink);
    text-transform: none;
    letter-spacing: normal;
  }

  .supplier-group-agg {
    display: block;
    margin-top: 2px;
  }

  .agg-score {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .item-matrix .row-resource-names th {
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire-strong);
    padding: var(--spacing-2) var(--spacing-1);
    vertical-align: bottom;
  }

  .th-resource {
    min-width: 72px;
    max-width: 100px;
    border-left: 1px solid var(--color-wire);
  }

  .th-resource:first-of-type {
    border-left: 2px solid var(--color-wire-strong);
  }

  .resource-name {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-ink-secondary);
    text-transform: none;
    letter-spacing: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resource-label {
    display: block;
    font-size: 9px;
    font-weight: 400;
    color: var(--color-ink-ghost);
    text-transform: none;
    letter-spacing: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-matrix .th-resource-avg {
    min-width: 56px;
    font-size: 9px;
    color: var(--color-ink-ghost);
    border-left: 1px solid var(--color-wire);
  }

  .th-resource-empty {
    border-left: 2px solid var(--color-wire-strong);
  }

  .empty-hint {
    font-size: 9px;
    color: var(--color-ink-ghost);
    text-transform: none;
    letter-spacing: normal;
    font-style: italic;
  }

  /* Item criterion rows */
  .row-ic {
    border-bottom: 1px solid var(--color-wire);
  }

  .row-ic:hover {
    background: var(--color-felt-hover);
  }

  .cell-ic-name {
    padding: var(--spacing-2) var(--spacing-3);
    border-left: 3px solid rgba(232, 168, 56, 0.15);
    white-space: nowrap;
  }

  .ic-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  .ic-weight {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-vekt-dim);
    margin-left: var(--spacing-2);
  }

  .cell-col-avg {
    text-align: center;
    padding: var(--spacing-1);
    border-left: 1px solid var(--color-wire);
    background: var(--color-canvas);
  }

  .col-avg-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    font-weight: 600;
  }

  .cell-empty {
    text-align: center;
    padding: var(--spacing-1);
    color: var(--color-ink-ghost);
    border-left: 2px solid var(--color-wire-strong);
  }

  /* Item totals row */
  .row-item-totals {
    background: var(--color-canvas);
    border-top: 2px solid var(--color-wire-strong);
  }

  .cell-total-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .cell-item-avg {
    text-align: center;
    padding: var(--spacing-2);
    border-left: 1px solid var(--color-wire);
  }

  .item-avg-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 600;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
  }

  .avg-best {
    background: var(--color-score-high-bg);
    font-weight: 700;
  }

  .item-matrix .cell-agg-final {
    background: var(--color-felt);
  }

  .agg-final {
    font-size: 14px;
    font-weight: 700;
  }

  /* Add resource strip */
  .add-resource-strip {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
  }

  .add-resource-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) 0;
    transition: color 0.1s;
  }

  .add-resource-btn:hover {
    color: var(--color-vekt);
  }

  .add-form {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .add-form-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
  }

  .add-input {
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 11px;
    outline: none;
    width: 120px;
  }

  .add-input-sm {
    width: 80px;
  }

  .add-input:focus {
    border-color: var(--color-wire-focus);
  }
  .add-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .add-confirm {
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    background: var(--color-vekt-bg-strong);
    color: var(--color-vekt);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .add-cancel {
    font-size: 14px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 var(--spacing-1);
  }

  .add-cancel:hover {
    color: var(--color-score-low);
  }

  /* ── Simple sub-criteria section ── */
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

  /* Weight column */
  .cell-weight {
    padding: var(--spacing-2) var(--spacing-3);
    vertical-align: middle;
    text-align: center;
    border-left: 3px solid rgba(232, 168, 56, 0.15);
  }

  .weight-display {
    display: flex;
    flex-direction: column;
    align-items: center;
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

  .weight-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .weight-btn:hover {
    background: var(--color-vekt-bg);
  }
  .weight-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .weight-clickable {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-vekt-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .weight-clickable:hover {
    background: var(--color-vekt-bg);
  }
  .weight-clickable:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .weight-edit,
  .weight-edit-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .weight-input {
    width: 36px;
    padding: 2px 4px;
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-vekt);
    background: var(--color-canvas);
    border: 1px solid var(--color-vekt-dim);
    border-radius: var(--radius-sm);
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  .weight-input::-webkit-inner-spin-button,
  .weight-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .weight-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 1px var(--color-vekt-bg-strong);
  }

  .weight-pct-edit {
    font-family: var(--font-data);
    font-size: 9px;
    color: var(--color-ink-ghost);
  }

  /* Criteria column */
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

  /* Rows */
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

  /* Tier colors */
  .tier-high {
    color: var(--color-score-high);
  }
  .tier-mid {
    color: var(--color-ink-secondary);
  }
  .tier-low {
    color: var(--color-score-low);
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

  .weight-edit-inline-t {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-vekt-dim);
  }

  .weight-input-t {
    width: 32px;
    font-size: 10px;
  }

  .weight-clickable-t {
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 500;
    color: var(--color-vekt-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .weight-clickable-t:hover {
    color: var(--color-vekt);
  }

  .weight-clickable-t:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    border-radius: var(--radius-sm);
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
