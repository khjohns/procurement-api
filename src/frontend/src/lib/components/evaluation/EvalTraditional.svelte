<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import ScoreField from './ScoreField.svelte';
  import AutoTextarea from './AutoTextarea.svelte';
  import VerticalRows from './VerticalRows.svelte';
  import SamletVurdering from './SamletVurdering.svelte';
  import { scoreColor, fS, shortName, VERTICAL_THRESHOLD, COMPACT_THRESHOLD } from './shared';

  let { criterion }: { criterion: Criterion } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let useVertical = $derived(suppliers.length >= VERTICAL_THRESHOLD);
  let compact = $derived(suppliers.length >= COMPACT_THRESHOLD);
  let subs = $derived(criterion.subcriteria);
  let activeSubId = $state('');

  let activeSub = $derived(subs.find((s) => s.id === activeSubId) ?? subs[0] ?? null);

  /** Weighted score for a supplier on this criterion. */
  function tradScore(supplierId: string): number | null {
    const gs = evaluation.groupScores[criterion.id];
    const v = gs?.[supplierId];
    return v != null ? v : null;
  }
</script>

<!-- Sub-criterion tabs -->
<div class="sub-tabs">
  {#each subs as sub (sub.id)}
    {@const filled = suppliers.filter((s) => sub.scores?.[s.id] != null).length}
    <button
      class="sub-tab"
      class:sub-tab-active={activeSub?.id === sub.id}
      onclick={() => (activeSubId = sub.id)}
    >
      {sub.name}
      <span class="sub-tab-meta" class:sub-tab-meta-done={filled === suppliers.length}>
        {sub.weight}% · {filled}/{suppliers.length}
      </span>
    </button>
  {/each}
</div>

<!-- Supplier evaluation for active sub-criterion -->
{#if activeSub}
  {#if useVertical}
    <VerticalRows
      {suppliers}
      scoreFn={(id) => activeSub?.scores?.[id] ?? null}
    >
      {#snippet headerColumns()}
        <span class="vrow-col-score">Score</span>
        <span class="vrow-col-note">Begrunnelse</span>
      {/snippet}
      {#snippet row({ supplier: lev, setFocus })}
        <div class="vrow-supplier">
          <div class="vrow-supplier-name">{shortName(lev.name)}</div>
        </div>
        <div class="vrow-score">
          <ScoreField
            value={activeSub!.scores?.[lev.id] ?? null}
            onchange={(v) => {
              if (v != null) evaluation.setScore(activeSub!.id, lev.id, v);
            }}
          />
        </div>
        <div class="vrow-note">
          <AutoTextarea
            value={activeSub!.notes?.[lev.id] ?? ''}
            oninput={(v) => evaluation.setNote(activeSub!.id, lev.id, v)}
            placeholder="Begrunnelse..."
            onfocus={setFocus}
          />
        </div>
      {/snippet}
    </VerticalRows>
  {:else}
    <div
      class="cards-grid"
      style:--card-columns="repeat({suppliers.length}, minmax({compact ? '170px' : '200px'}, 1fr))"
    >
      {#each suppliers as lev (lev.id)}
        {@const score = activeSub.scores?.[lev.id] ?? null}
        <div class="card">
          <div class="card-header">
            <span class="card-name"
              >{compact ? shortName(lev.name) : lev.name}</span
            >
            <ScoreField
              value={score}
              onchange={(v) => {
                if (v != null) evaluation.setScore(activeSub!.id, lev.id, v);
              }}
            />
          </div>
          <textarea
            class="card-textarea"
            value={activeSub.notes?.[lev.id] ?? ''}
            oninput={(e) => evaluation.setNote(activeSub!.id, lev.id, e.currentTarget.value)}
            placeholder="Begrunnelse..."
            rows="3"
          ></textarea>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<!-- Summary table -->
<div class="summary">
  <div class="summary-label">Sammendrag – {criterion.name}</div>
  <div class="summary-scroll">
    <table class="summary-table">
      <thead>
        <tr>
          <th class="th" style="width: 140px;">Underkriterium</th>
          <th class="th th-center" style="width: 40px;">Vekt</th>
          {#each suppliers as lev (lev.id)}
            <th class="th th-center">{compact ? shortName(lev.name) : lev.name}</th
            >
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each subs as sub (sub.id)}
          <tr class:row-active={sub.id === activeSub?.id}>
            <td class="td">{sub.name}</td>
            <td class="td td-center">
              <span class="td-weight">{sub.weight}%</span>
            </td>
            {#each suppliers as lev (lev.id)}
              {@const v = sub.scores?.[lev.id] ?? null}
              <td class="td td-center">
                <span class="td-score" style:color={scoreColor(v)}>{v ?? '–'}</span>
              </td>
            {/each}
          </tr>
        {/each}
        <tr class="row-total">
          <td class="td td-bold">Vektet</td>
          <td class="td"></td>
          {#each suppliers as lev (lev.id)}
            {@const v = tradScore(lev.id)}
            <td class="td td-center">
              <span class="td-total" style:color={scoreColor(v)}>{fS(v)}</span>
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
</div>

<SamletVurdering label={criterion.name} criterionId={criterion.id} {criterion} />

<style>
  /* ── Sub-criterion tabs ── */
  .sub-tabs {
    display: flex;
    align-items: center;
    gap: 0;
    border-bottom: 1px solid var(--color-wire);
    margin-bottom: var(--spacing-4);
  }

  .sub-tab {
    padding: var(--spacing-2) var(--spacing-4);
    border: none;
    cursor: pointer;
    background: transparent;
    border-bottom: 2px solid transparent;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    transition: all 0.12s;
  }

  .sub-tab-active {
    background: var(--color-felt);
    border-bottom-color: var(--color-vekt);
    font-weight: 700;
    color: var(--color-ink);
  }

  .sub-tab:hover:not(.sub-tab-active) {
    color: var(--color-ink-secondary);
  }

  .sub-tab-meta {
    font-size: 9px;
    font-family: var(--font-data);
    margin-left: var(--spacing-2);
    color: var(--color-ink-ghost);
  }

  .sub-tab-meta-done {
    color: var(--color-score-high);
  }

  /* ── Vertical row content ── */
  .vrow-col-score {
    width: 44px;
    text-align: center;
    flex-shrink: 0;
  }

  .vrow-col-note {
    flex: 1;
  }

  .vrow-supplier {
    width: 150px;
    flex-shrink: 0;
  }

  .vrow-supplier-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .vrow-score {
    width: 44px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }

  .vrow-note {
    flex: 1;
    max-width: 600px;
  }

  /* ── Card grid layout ── */
  .cards-grid {
    display: grid;
    grid-template-columns: var(--card-columns);
    gap: var(--spacing-3);
    padding-bottom: 2px;
    overflow-x: auto;
  }

  .card {
    padding: var(--spacing-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-3);
  }

  .card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .card-textarea {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    line-height: 1.55;
    resize: vertical;
    outline: none;
  }

  .card-textarea:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  /* ── Summary table ── */
  .summary {
    margin-top: var(--spacing-5);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
  }

  .summary-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--spacing-2);
  }

  .summary-scroll {
    overflow-x: auto;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
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
    font-size: 12px;
  }

  .td-center {
    text-align: center;
  }

  .td-weight {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
  }

  .td-score {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
  }

  .td-bold {
    font-weight: 700;
  }

  .td-total {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
  }

  .row-active {
    background: var(--color-vekt-bg);
  }

  .row-total {
    border-top: 1.5px solid var(--color-wire-strong);
  }
</style>
