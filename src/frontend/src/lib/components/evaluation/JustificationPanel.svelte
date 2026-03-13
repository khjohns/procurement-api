<script lang="ts">
  import {
    evaluation,
    scoreTier,
    itemScore,
    criterionMode,
    resourceMomentScore,
  } from '$lib/stores/evaluation.svelte';

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === evaluation.activeView));

  let mode = $derived(criterion ? criterionMode(criterion) : 'traditional');

  let supplier = $derived(
    evaluation.data.suppliers.find((s) => s.id === evaluation.selectedSupplierId)
  );

  let supplierIndex = $derived(
    evaluation.data.suppliers.findIndex((s) => s.id === evaluation.selectedSupplierId)
  );

  /** Navigate to prev/next supplier. */
  function prevSupplier() {
    if (supplierIndex > 0) {
      evaluation.selectSupplier(evaluation.data.suppliers[supplierIndex - 1].id);
    }
  }

  function nextSupplier() {
    if (supplierIndex < evaluation.data.suppliers.length - 1) {
      evaluation.selectSupplier(evaluation.data.suppliers[supplierIndex + 1].id);
    }
  }

  /** Item-level sub-criteria for this criterion. */
  let itemSubs = $derived(
    criterion?.subcriteria.filter((s) => s.evaluationType === 'item' && s.itemCriteria) ?? []
  );

  /** Simple sub-criteria for this criterion. */
  let simpleSubs = $derived(
    criterion?.subcriteria.filter((s) => s.evaluationType !== 'item') ?? []
  );

  /** Count filled justifications for progress indicator. */
  let justificationProgress = $derived.by(() => {
    if (!criterion || !supplier) return { filled: 0, total: 0 };
    const supplierId = supplier.id;
    let total = 0;
    let filled = 0;

    if (mode === 'leaf') {
      // Leaf: criterion-level note only
      total++;
      if (criterion.notes?.[supplierId]) filled++;
    } else if (mode === 'resource') {
      // Resource: criterion-level note + one note per role that has a resource
      total++;
      if (criterion.notes?.[supplierId]) filled++;
      const roles = criterion.roles ?? [];
      for (const role of roles) {
        const item = criterion.items?.[supplierId]?.find((i) => i.roleId === role.id);
        if (item) {
          total++;
          if (item.note) filled++;
        }
      }
    } else {
      // Traditional: criterion-level note + per-sub notes + per-item notes
      total++;
      if (criterion.notes?.[supplierId]) filled++;

      for (const sub of itemSubs) {
        const items = sub.items?.[supplierId] ?? [];
        for (const item of items) {
          total++;
          if (item.note) filled++;
        }
      }

      for (const sub of simpleSubs) {
        total++;
        if (sub.notes[supplierId]) filled++;
      }
    }

    return { filled, total };
  });
</script>

{#if criterion && supplier}
  <div class="panel">
    <!-- Supplier selector -->
    <div class="supplier-nav">
      <button class="supplier-arrow" onclick={prevSupplier} disabled={supplierIndex <= 0}>‹</button>
      <div class="supplier-tabs">
        {#each evaluation.data.suppliers as s}
          <button
            class="supplier-tab"
            class:active={s.id === supplier.id}
            onclick={() => evaluation.selectSupplier(s.id)}
          >
            {s.name}
          </button>
        {/each}
      </div>
      <button
        class="supplier-arrow"
        onclick={nextSupplier}
        disabled={supplierIndex >= evaluation.data.suppliers.length - 1}>›</button
      >
    </div>

    <!-- Progress indicator -->
    <div class="progress-strip">
      <span class="progress-label">Begrunnelser</span>
      <span class="progress-count"
        >{justificationProgress.filled} / {justificationProgress.total}</span
      >
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {justificationProgress.total > 0
            ? (justificationProgress.filled / justificationProgress.total) * 100
            : 0}%"
        ></div>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="panel-content">
      <!-- Overordnet vurdering (criterion-level note) -->
      {#if criterion && supplier}
        {@const displayScore =
          mode === 'leaf'
            ? (criterion.scores?.[supplier.id] ?? 0)
            : (evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0)}
        <div class="note-section note-overordnet">
          <div class="note-header">
            <span class="note-title">Overordnet vurdering</span>
            <span class="note-score tier-{scoreTier(displayScore)}">
              {mode === 'leaf' && displayScore === 0 ? '—' : displayScore.toFixed(1)}
            </span>
          </div>
          <textarea
            class="note-textarea"
            value={criterion.notes?.[supplier.id] ?? ''}
            oninput={(e) =>
              evaluation.setCriterionNote(criterion.id, supplier.id, e.currentTarget.value)}
            placeholder="Overordnet vurdering av {supplier.name} for {criterion.name}..."
            rows="3"
          ></textarea>
        </div>
      {/if}

      <!-- Resource mode: per-role notes -->
      {#if mode === 'resource' && criterion.roles?.length}
        {@const roles = criterion.roles}
        {@const items = criterion.items?.[supplier.id] ?? []}
        <div class="note-group">
          <div class="note-group-header">
            <span class="note-group-name">Ressurser</span>
            <span
              class="note-group-score tier-{scoreTier(
                evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0
              )}"
            >
              {(evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0).toFixed(1)}
            </span>
          </div>

          {#each roles as role}
            {@const item = items.find((i) => i.roleId === role.id)}
            {#if item}
              {@const total = resourceMomentScore(item, criterion.subcriteria)}
              <div class="resource-note">
                <div class="resource-header">
                  <span class="resource-name">{role.name}</span>
                  {#if item.label}
                    <span class="resource-role">{item.label}</span>
                  {/if}
                </div>
                <div class="resource-scores">
                  {#each criterion.subcriteria as moment}
                    {@const score = item.scores[moment.id] ?? 0}
                    <span class="resource-score-badge tier-{scoreTier(score)}">
                      <span class="badge-label">{moment.name}</span>
                      <span class="badge-value">{score}</span>
                    </span>
                  {/each}
                  <span class="resource-score-avg tier-{scoreTier(total)}">
                    Snitt {total.toFixed(1)}
                  </span>
                </div>
                <textarea
                  class="note-textarea note-textarea-sm"
                  value={item.note ?? ''}
                  oninput={(e) =>
                    evaluation.setRoleResourceNote(
                      criterion.id,
                      supplier.id,
                      role.id,
                      e.currentTarget.value
                    )}
                  placeholder="Vurdering av {role.name}..."
                  rows="2"
                ></textarea>
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      <!-- Traditional mode: Item-level sub-criteria: per-resource notes -->
      {#if mode === 'traditional'}
        {#each itemSubs as sub}
          {@const items = sub.items?.[supplier.id] ?? []}
          {#if items.length > 0}
            {@const aggScore = evaluation.itemScores[sub.id]?.[supplier.id] ?? 0}
            <div class="note-group">
              <div class="note-group-header">
                <span class="note-group-name">{sub.name}</span>
                <span class="note-group-score tier-{scoreTier(aggScore)}">
                  {aggScore.toFixed(1)}
                </span>
              </div>

              {#each items as item}
                {@const avg = itemScore(item, sub.itemCriteria ?? [])}
                <div class="resource-note">
                  <div class="resource-header">
                    <span class="resource-name">{item.name}</span>
                    {#if item.label}
                      <span class="resource-role">{item.label}</span>
                    {/if}
                  </div>
                  <div class="resource-scores">
                    {#each sub.itemCriteria ?? [] as ic}
                      {@const score = item.scores[ic.id] ?? 0}
                      <span class="resource-score-badge tier-{scoreTier(score)}">
                        <span class="badge-label">{ic.name}</span>
                        <span class="badge-value">{score}</span>
                      </span>
                    {/each}
                    <span class="resource-score-avg tier-{scoreTier(avg)}">
                      Snitt {avg.toFixed(1)}
                    </span>
                  </div>
                  <textarea
                    class="note-textarea note-textarea-sm"
                    value={item.note ?? ''}
                    oninput={(e) =>
                      evaluation.setItemResourceNote(
                        sub.id,
                        supplier.id,
                        item.id,
                        e.currentTarget.value
                      )}
                    placeholder="Vurdering av {item.name}..."
                    rows="2"
                  ></textarea>
                </div>
              {/each}
            </div>
          {/if}
        {/each}

        <!-- Simple sub-criteria: per-sub-criterion notes -->
        {#if simpleSubs.length > 0}
          <div class="note-group">
            {#if itemSubs.length > 0}
              <div class="note-group-header">
                <span class="note-group-name">Underkriterier</span>
              </div>
            {/if}

            {#each simpleSubs as sub}
              {@const score = sub.scores[supplier.id] ?? 0}
              <div class="sub-note">
                <div class="sub-note-header">
                  <span class="sub-note-name">{sub.name}</span>
                  <span class="sub-note-score tier-{scoreTier(score)}">
                    {score > 0 ? score : '—'}
                  </span>
                </div>
                <textarea
                  class="note-textarea note-textarea-sm"
                  value={sub.notes[supplier.id] ?? ''}
                  oninput={(e) => evaluation.setNote(sub.id, supplier.id, e.currentTarget.value)}
                  placeholder="Begrunnelse for poengsettingen..."
                  rows="2"
                ></textarea>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  /* ── Supplier navigation ── */
  .supplier-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
    flex-shrink: 0;
  }

  .supplier-arrow {
    font-size: 14px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    transition: all 0.1s;
    line-height: 1;
  }

  .supplier-arrow:hover:not(:disabled) {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }

  .supplier-arrow:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .supplier-arrow:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .supplier-tabs {
    display: flex;
    gap: 1px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }

  .supplier-tab {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    white-space: nowrap;
    transition: all 0.1s;
  }

  .supplier-tab:hover {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }

  .supplier-tab:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .supplier-tab.active {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    font-weight: 600;
  }

  /* ── Progress ── */
  .progress-strip {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
    flex-shrink: 0;
  }

  .progress-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
  }

  .progress-count {
    font-family: var(--font-data);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
  }

  .progress-bar {
    flex: 1;
    height: 2px;
    background: var(--color-felt-active);
    border-radius: 1px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-vekt-dim);
    border-radius: 1px;
    transition: width 0.3s ease-out;
  }

  /* ── Scrollable content ── */
  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-3);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  /* ── Overordnet section ── */
  .note-overordnet {
    border-left: 3px solid var(--color-vekt);
    padding-left: var(--spacing-3);
  }

  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-2);
  }

  .note-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .note-score {
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ── Note groups ── */
  .note-group {
    border-left: 3px solid rgba(232, 168, 56, 0.15);
    padding-left: var(--spacing-3);
  }

  .note-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-3);
  }

  .note-group-name {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .note-group-score {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ── Resource notes ── */
  .resource-note {
    margin-bottom: var(--spacing-3);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
  }

  .resource-note:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .resource-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-1);
  }

  .resource-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .resource-role {
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .resource-scores {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1);
    margin-bottom: var(--spacing-2);
  }

  .resource-score-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px var(--spacing-2);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    font-size: 10px;
  }

  .badge-label {
    color: var(--color-ink-ghost);
    font-weight: 500;
  }

  .badge-value {
    font-family: var(--font-data);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .resource-score-avg {
    font-family: var(--font-data);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    padding: 1px var(--spacing-2);
  }

  /* ── Sub-criterion notes ── */
  .sub-note {
    margin-bottom: var(--spacing-3);
  }

  .sub-note:last-child {
    margin-bottom: 0;
  }

  .sub-note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-1);
  }

  .sub-note-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  .sub-note-score {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ── Shared textarea ── */
  .note-textarea {
    width: 100%;
    padding: var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    transition: border-color 0.12s;
  }

  .note-textarea:focus {
    border-color: var(--color-wire-focus);
  }

  .note-textarea::placeholder {
    color: var(--color-ink-ghost);
  }

  .note-textarea-sm {
    min-height: 48px;
  }

  /* ── Tier colors ── */
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
