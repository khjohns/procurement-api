<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import ScoreField from './ScoreField.svelte';
  import AutoTextarea from './AutoTextarea.svelte';
  import SamletVurdering from './SamletVurdering.svelte';

  let { criterion }: { criterion: Criterion } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let useVertical = $derived(suppliers.length >= 5);
  let compact = $derived(suppliers.length > 3);

  // Vertical layout state
  let focusId = $state<string | null>(null);
  let sortBy = $state<'original' | 'score'>('original');

  let sortedSuppliers = $derived.by(() => {
    if (!useVertical || sortBy === 'original') return suppliers;
    return [...suppliers].sort((a, b) => {
      const sa = criterion.scores?.[a.id] ?? -1;
      const sb = criterion.scores?.[b.id] ?? -1;
      return sb - sa;
    });
  });

  function focusDist(lid: string): number {
    if (!focusId) return 0;
    const fi = suppliers.findIndex((s) => s.id === focusId);
    const ci = suppliers.findIndex((s) => s.id === lid);
    return Math.abs(fi - ci);
  }
</script>

{#if useVertical}
  <!-- Vertical row layout for 5+ suppliers -->
  <div class="vrow-container">
    <div class="vrow-header">
      <span class="vrow-col-supplier">Leverandør</span>
      <span class="vrow-col-score">Score</span>
      <span class="vrow-col-note">Begrunnelse</span>
      <select class="vrow-sort" bind:value={sortBy}>
        <option value="original">Original rekkefølge</option>
        <option value="score">Sorter etter score</option>
      </select>
    </div>
    {#each sortedSuppliers as lev, i (lev.id)}
      {@const isFocus = focusId === lev.id}
      {@const dist = focusDist(lev.id)}
      <div
        class="vrow"
        class:vrow-focus={isFocus}
        style:opacity={focusId && !isFocus && dist > 3 ? 0.85 : 1}
        style:border-top={i > 0 ? '1px solid var(--color-wire)' : 'none'}
      >
        <div class="vrow-supplier">
          <div class="vrow-supplier-name">{lev.name.split(' ')[0] ?? lev.name}</div>
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
            onfocus={() => (focusId = lev.id)}
          />
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- Card grid for ≤4 suppliers -->
  <div
    class="leaf-grid"
    style:--card-columns="repeat({suppliers.length}, minmax({compact ? '170px' : '200px'}, 1fr))"
  >
    {#each suppliers as lev (lev.id)}
      {@const score = criterion.scores?.[lev.id] ?? null}
      <div class="card">
        <div class="card-header">
          <span class="card-name">{compact ? (lev.name.split(' ')[0] ?? lev.name) : lev.name}</span>
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
  /* ── Vertical row layout ── */
  .vrow-container {
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .vrow-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
    font-size: 10px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-ui);
  }

  .vrow-col-supplier {
    width: 150px;
    flex-shrink: 0;
  }

  .vrow-col-score {
    width: 44px;
    text-align: center;
    flex-shrink: 0;
  }

  .vrow-col-note {
    flex: 1;
  }

  .vrow-sort {
    margin-left: auto;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    font-size: 10px;
    font-family: var(--font-ui);
    color: var(--color-ink-muted);
    background: var(--color-felt);
    outline: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .vrow {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt);
    transition: background 0.15s, opacity 0.2s;
  }

  .vrow-focus {
    background: var(--color-vekt-bg);
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
