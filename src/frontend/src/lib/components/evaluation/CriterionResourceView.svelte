<script lang="ts">
  import {
    evaluation,
    scoreTier,
    resourceMomentScore,
    fmt2,
    type Role,
    type EvaluationItem,
  } from '$lib/stores/evaluation.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);

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

  /** Resource mode: role score editing. */
  let editingRoleScore = $state<string | null>(null);
  let roleScoreEditValue = $state('');

  function startRoleScoreEdit(
    supplierId: string,
    roleId: string,
    momentId: string,
    currentScore: number
  ) {
    editingRoleScore = `${supplierId}:${roleId}:${momentId}`;
    roleScoreEditValue = currentScore > 0 ? String(currentScore) : '';
  }

  function commitRoleScoreEdit(supplierId: string, roleId: string, momentId: string) {
    const num = parseInt(roleScoreEditValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 10) {
      evaluation.setRoleScore(criterionId, supplierId, roleId, momentId, num);
    }
    editingRoleScore = null;
  }

  function handleRoleScoreKeydown(
    e: KeyboardEvent,
    supplierId: string,
    roleId: string,
    momentId: string
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRoleScoreEdit(supplierId, roleId, momentId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingRoleScore = null;
    }
  }

  /** Resource mode: get item (resource) for a supplier+role. */
  function getRoleItem(supplierId: string, roleId: string): EvaluationItem | undefined {
    return criterion.items?.[supplierId]?.find((i) => i.roleId === roleId);
  }

  /** Resource mode: role weighted score across moments. */
  function getRoleScore(supplierId: string, roleId: string): number {
    const item = getRoleItem(supplierId, roleId);
    if (!item) return 0;
    return resourceMomentScore(item, criterion.subcriteria);
  }

  /** Resource mode: supplier aggregated score. */
  function getSupplierResourceScore(supplierId: string): number {
    return evaluation.groupScores[criterion.id]?.[supplierId] ?? 0;
  }
</script>

<!-- ══ RESOURCE MODE: roles × moments (criterion-level) ══ -->
{@const roles = criterion.roles ?? []}
{@const moments = criterion.subcriteria}

<!-- Role config strip -->
<div class="role-config">
  <span class="role-config-label">ROLLER</span>
  <div class="role-chips">
    {#each roles as role}
      <span class="role-chip">
        <input
          class="role-chip-input"
          type="text"
          value={role.name}
          oninput={(e) => evaluation.renameRole(criterionId, role.id, e.currentTarget.value)}
          placeholder="Rollenavn..."
        />
        <button
          class="role-chip-remove"
          onclick={() => evaluation.removeRole(criterionId, role.id)}>×</button
        >
      </span>
    {/each}
    <button class="role-add-btn" onclick={() => evaluation.addRole(criterionId, '')}>+</button>
  </div>
</div>

<!-- Aggregation selector -->
<div class="item-section-header">
  <div class="item-section-agg">
    <span class="agg-label">Aggregering:</span>
    <button
      class="agg-btn"
      class:active={criterion.aggregation === 'average' || !criterion.aggregation}
      onclick={() => evaluation.setCriterionAggregation(criterionId, 'average')}>Snitt</button
    >
    <button
      class="agg-btn"
      class:active={criterion.aggregation === 'minimum'}
      onclick={() => evaluation.setCriterionAggregation(criterionId, 'minimum')}>Minimum</button
    >
  </div>
</div>

{#if roles.length > 0 && moments.length > 0}
  <div class="item-matrix-wrap">
    <table class="item-matrix resource-matrix">
      <thead>
        <!-- Supplier group headers -->
        <tr>
          <th class="th-ic-name"></th>
          {#each evaluation.data.suppliers as supplier}
            {@const supplierScore = getSupplierResourceScore(supplier.id)}
            <th class="th-supplier-group" colspan={roles.length}>
              <span class="supplier-group-name">{supplier.name}</span>
              <span class="supplier-group-agg">
                <span class="agg-score tier-{scoreTier(supplierScore)}">
                  {fmt2(supplierScore)}
                </span>
              </span>
            </th>
          {/each}
        </tr>
        <!-- Role sub-headers per supplier -->
        <tr class="row-resource-names">
          <th class="th-ic-label">
            <span class="ic-label-text">Vekt</span>
          </th>
          {#each evaluation.data.suppliers as supplier}
            {#each roles as role, roleIdx}
              {@const item = getRoleItem(supplier.id, role.id)}
              <th class="th-resource" class:th-resource-first={roleIdx === 0}>
                <span class="resource-role-name">{role.name || 'Rolle'}</span>
                <input
                  class="resource-person-input"
                  type="text"
                  value={item?.label ?? ''}
                  oninput={(e) =>
                    evaluation.setRoleLabel(
                      criterionId,
                      supplier.id,
                      role.id,
                      e.currentTarget.value
                    )}
                  placeholder="Person..."
                />
              </th>
            {/each}
          {/each}
        </tr>
      </thead>
      <tbody>
        <!-- Moment rows (subcriteria with weight) -->
        {#each moments as moment}
          <tr class="row-ic">
            <td class="cell-ic-name">
              <span class="ic-name">{moment.name}</span>
              <span class="ic-weight">
                {#if editingWeight === moment.id}
                  <span class="weight-edit-inline">
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      type="number"
                      class="weight-input"
                      min="0"
                      max="100"
                      bind:value={editValue}
                      onkeydown={(e) => handleWeightKeydown(e, 'sub', moment.id)}
                      onblur={() => commitEdit('sub', moment.id)}
                      autofocus
                    />%
                  </span>
                {:else}
                  <button
                    class="weight-clickable"
                    onclick={() => startEdit(moment.id, moment.weight)}
                  >
                    {moment.weight}%
                  </button>
                {/if}
              </span>
            </td>
            {#each evaluation.data.suppliers as supplier}
              {#each roles as role, roleIdx}
                {@const item = getRoleItem(supplier.id, role.id)}
                {@const score = item?.scores[moment.id] ?? 0}
                {@const cellKey = `${supplier.id}:${role.id}:${moment.id}`}
                <td
                  class="cell-score resource-cell"
                  class:resource-cell-first={roleIdx === 0}
                  class:score-high={scoreTier(score) === 'high'}
                  class:score-mid={scoreTier(score) === 'mid'}
                  class:score-low={scoreTier(score) === 'low'}
                  onclick={() => {
                    if (editingRoleScore !== cellKey)
                      startRoleScoreEdit(supplier.id, role.id, moment.id, score);
                  }}
                  role="button"
                  tabindex={0}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      startRoleScoreEdit(supplier.id, role.id, moment.id, score);
                  }}
                >
                  {#if editingRoleScore === cellKey}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      type="number"
                      class="score-input"
                      min="0"
                      max="10"
                      bind:value={roleScoreEditValue}
                      onkeydown={(e) =>
                        handleRoleScoreKeydown(e, supplier.id, role.id, moment.id)}
                      onblur={() => commitRoleScoreEdit(supplier.id, role.id, moment.id)}
                      onclick={(e) => e.stopPropagation()}
                      autofocus
                    />
                  {:else}
                    <span class="score-value">{score > 0 ? score : '—'}</span>
                  {/if}
                </td>
              {/each}
            {/each}
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <!-- Role score row (weighted avg of moments) -->
        <tr class="row-role-scores">
          <td class="cell-ic-name cell-total-label">Rolle</td>
          {#each evaluation.data.suppliers as supplier}
            {#each roles as role, roleIdx}
              {@const rs = getRoleScore(supplier.id, role.id)}
              <td class="cell-role-score" class:resource-cell-first={roleIdx === 0}>
                <span class="role-score-value tier-{scoreTier(rs)}">
                  {fmt2(rs)}
                </span>
              </td>
            {/each}
          {/each}
        </tr>
        <!-- Supplier score row (aggregated) -->
        <tr class="row-supplier-scores">
          <td class="cell-ic-name cell-supplier-total-label">Samlet</td>
          {#each evaluation.data.suppliers as supplier}
            {@const ss = getSupplierResourceScore(supplier.id)}
            <td class="cell-supplier-score" colspan={roles.length}>
              <span class="supplier-score-value tier-{scoreTier(ss)}">
                {fmt2(ss)}
              </span>
            </td>
          {/each}
        </tr>
      </tfoot>
    </table>
  </div>
{:else if roles.length === 0}
  <div class="section-label">Legg til roller for å starte evaluering.</div>
{:else}
  <div class="section-label">Legg til underkriterier (momenter) for å starte evaluering.</div>
{/if}

<style>
  /* ── Item-level section ── */
  .item-section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
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

  .cell-total-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  /* Score cells */
  .cell-score {
    text-align: center;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 500;
    padding: var(--spacing-2) var(--spacing-3);
    cursor: pointer;
    position: relative;
    transition: background 0.08s;
  }

  .cell-score:hover {
    background: var(--color-felt-hover);
  }

  .cell-score:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
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

  .score-input {
    width: 36px;
    padding: 2px 4px;
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire-focus);
    border-radius: var(--radius-sm);
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  .score-input::-webkit-inner-spin-button,
  .score-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
  }

  /* Weight editing */
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

  /* ── Role config strip ── */
  .role-config {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
    padding: var(--spacing-2) 0;
  }

  .role-config-label {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
    white-space: nowrap;
  }

  .role-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
  }

  .role-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-1) var(--spacing-2);
  }

  .role-chip-input {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink);
    background: transparent;
    border: none;
    outline: none;
    width: 80px;
    padding: var(--spacing-1);
  }

  .role-chip-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .role-chip-input:focus {
    background: var(--color-canvas);
    border-radius: var(--radius-sm);
  }

  .role-chip-input:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .role-chip-remove {
    font-size: 13px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 var(--spacing-1);
    line-height: 1;
  }

  .role-chip-remove:hover {
    color: var(--color-score-low);
  }

  .role-chip-remove:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    border-radius: var(--radius-sm);
  }

  .role-add-btn {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink-muted);
    background: none;
    border: 1px dashed var(--color-wire);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    transition: all 0.1s;
  }

  .role-add-btn:hover {
    color: var(--color-vekt);
    border-color: var(--color-vekt-dim);
  }

  .role-add-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  /* ── Resource matrix specifics ── */
  .resource-matrix .th-resource {
    min-width: 80px;
    max-width: 110px;
  }

  .th-resource-first {
    border-left: 2px solid var(--color-wire-strong);
  }

  .resource-role-name {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-ink-muted);
    text-transform: none;
    letter-spacing: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resource-person-input {
    display: block;
    width: 100%;
    font-size: 11px;
    font-weight: 400;
    color: var(--color-ink-secondary);
    background: transparent;
    border: none;
    outline: none;
    text-align: center;
    padding: var(--spacing-1);
    text-transform: none;
    letter-spacing: normal;
    font-family: var(--font-ui);
  }

  .resource-person-input::placeholder {
    color: var(--color-ink-ghost);
    font-style: italic;
  }

  .resource-person-input:focus {
    background: var(--color-canvas);
    border-radius: var(--radius-sm);
  }

  .resource-person-input:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .resource-cell {
    border-left: 1px solid var(--color-wire);
  }

  .resource-cell-first {
    border-left: 2px solid var(--color-wire-strong);
  }

  /* Role score row */
  .row-role-scores {
    border-top: 1px solid var(--color-wire-strong);
  }

  .cell-role-score {
    text-align: center;
    padding: var(--spacing-2);
    border-left: 1px solid var(--color-wire);
  }

  .cell-role-score.resource-cell-first {
    border-left: 2px solid var(--color-wire-strong);
  }

  .role-score-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 600;
  }

  /* Supplier score row */
  .row-supplier-scores {
    background: var(--color-canvas);
    border-top: 1px solid var(--color-wire-strong);
  }

  .cell-supplier-total-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink);
  }

  .cell-supplier-score {
    text-align: center;
    padding: var(--spacing-2) var(--spacing-3);
    border-left: 2px solid var(--color-wire-strong);
  }

  .supplier-score-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 16px;
    font-weight: 700;
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
