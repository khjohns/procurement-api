<script lang="ts">
  import {
    evaluation,
    scoreTier,
    itemScore,
    fmt2,
    type EvaluationItem,
    type ItemCriterion,
    type SubCriterion,
  } from '$lib/stores/evaluation.svelte';
  import ItemScoreCell from './ItemScoreCell.svelte';
  import InlineNumberEditor from './InlineNumberEditor.svelte';

  interface Props {
    sub: SubCriterion;
  }

  let { sub }: Props = $props();

  let itemCriteria = $derived(sub.itemCriteria!);

  let addingItem = $state<string | null>(null); // supplierId
  let newItemName = $state('');
  let newItemLabel = $state('');

  function handleAddItem(supplierId: string) {
    if (!newItemName.trim()) return;
    evaluation.addItem(sub.id, supplierId, newItemName.trim(), newItemLabel.trim() || undefined);
    newItemName = '';
    newItemLabel = '';
    addingItem = null;
  }

  function getItemColumnBest(items: EvaluationItem[], icId: string): number {
    if (items.length === 0) return 0;
    return Math.max(0, ...items.map((item) => item.scores[icId] ?? 0));
  }

  function getItemBestAvg(items: EvaluationItem[], ic: ItemCriterion[]): number {
    if (items.length === 0) return 0;
    return Math.max(...items.map((item) => itemScore(item, ic)));
  }
</script>

<div class="item-section">
  <div class="item-section-header">
    <span class="item-section-name">{sub.name}</span>
    <span class="item-section-weight">
      <InlineNumberEditor
        value={sub.weight}
        min={0}
        max={100}
        suffix="%"
        variant="weight"
        oncommit={(v) => evaluation.setSubCriterionWeight(sub.id, v)}
      />
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
      {#if addingItem === supplier.id}
        <div class="add-form">
          <span class="add-form-label">{supplier.name}:</span>
          <input
            class="add-input"
            type="text"
            placeholder="Navn"
            bind:value={newItemName}
            onkeydown={(e) => {
              if (e.key === 'Enter') handleAddItem(supplier.id);
              if (e.key === 'Escape') addingItem = null;
            }}
          />
          <input
            class="add-input add-input-sm"
            type="text"
            placeholder="Rolle"
            bind:value={newItemLabel}
            onkeydown={(e) => {
              if (e.key === 'Enter') handleAddItem(supplier.id);
              if (e.key === 'Escape') addingItem = null;
            }}
          />
          <button class="add-confirm" onclick={() => handleAddItem(supplier.id)}
            >Legg til</button
          >
          <button class="add-cancel" onclick={() => (addingItem = null)}>×</button>
        </div>
      {:else}
        <button
          class="add-resource-btn"
          onclick={() => {
            addingItem = supplier.id;
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
</style>
