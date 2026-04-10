<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import ScoreField from './ScoreField.svelte';
  import AutoTextarea from './AutoTextarea.svelte';
  import VerticalRows from './VerticalRows.svelte';
  import SamletVurdering from './SamletVurdering.svelte';
  import { shortName, VERTICAL_THRESHOLD, COMPACT_THRESHOLD } from './shared';

  let { criterion }: { criterion: Criterion } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let useVertical = $derived(suppliers.length >= VERTICAL_THRESHOLD);
  let compact = $derived(suppliers.length >= COMPACT_THRESHOLD);
</script>

{#if useVertical}
  <VerticalRows
    {suppliers}
    scoreFn={(id) => criterion.scores?.[id] ?? null}
  >
    {#snippet headerColumns()}
      <span class="vrow-col-score">Score</span>
      <span class="vrow-col-note">Begrunnelse</span>
    {/snippet}
    {#snippet row({ supplier: lev, setFocus })}
      <div class="vrow-supplier">
        <div class="vrow-supplier-name">{shortName(lev.name)}</div>
        <div class="vrow-supplier-full">{lev.name}</div>
      </div>
      <div class="vrow-score">
        <ScoreField
          value={criterion.scores?.[lev.id] ?? null}
          onchange={(v) => {
            if (v != null) evaluation.setCriterionScore(criterion.id, lev.id, v);
          }}
        />
      </div>
      <div class="vrow-note">
        <AutoTextarea
          value={criterion.notes?.[lev.id] ?? ''}
          oninput={(v) => evaluation.setCriterionNote(criterion.id, lev.id, v)}
          placeholder="Begrunnelse..."
          onfocus={setFocus}
        />
      </div>
    {/snippet}
  </VerticalRows>
{:else}
  <div
    class="leaf-grid"
    style:--card-columns="repeat({suppliers.length}, minmax({compact ? '170px' : '200px'}, 1fr))"
  >
    {#each suppliers as lev (lev.id)}
      {@const score = criterion.scores?.[lev.id] ?? null}
      <div class="card">
        <div class="card-header">
          <span class="card-name">{compact ? shortName(lev.name) : lev.name}</span>
          <ScoreField
            value={score}
            onchange={(v) => {
              if (v != null) evaluation.setCriterionScore(criterion.id, lev.id, v);
            }}
          />
        </div>
        <textarea
          class="card-textarea"
          value={criterion.notes?.[lev.id] ?? ''}
          oninput={(e) => evaluation.setCriterionNote(criterion.id, lev.id, e.currentTarget.value)}
          placeholder="Begrunnelse..."
          rows="3"
        ></textarea>
      </div>
    {/each}
  </div>
{/if}

<SamletVurdering label={criterion.name} criterionId={criterion.id} {criterion} />

<style>
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

  .vrow-supplier-full {
    font-size: 10px;
    color: var(--color-ink-ghost);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
  .leaf-grid {
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
</style>
