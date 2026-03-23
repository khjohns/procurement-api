<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import ScoreField from './ScoreField.svelte';
  import SamletVurdering from './SamletVurdering.svelte';

  let { criterion }: { criterion: Criterion } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let compact = $derived(suppliers.length > 3);
</script>

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

<SamletVurdering label={criterion.name} criterionId={criterion.id} {criterion} />

<style>
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
