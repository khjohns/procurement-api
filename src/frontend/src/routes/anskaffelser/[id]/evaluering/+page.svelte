<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import SetupForm from '$lib/components/evaluation/SetupForm.svelte';
  import EvalWorkspace from '$lib/components/evaluation/EvalWorkspace.svelte';
  import MethodToggle from '$lib/components/evaluation/MethodToggle.svelte';

  let { data } = $props();

  if (data?.proc?.id) {
    evaluation.initializeIfNeeded(
      data.proc.id,
      data.proc,
      data.activities ?? [],
      data.eforms ?? null
    );
  }

  let showSetup = $derived(
    evaluation.data.criteria.length === 0 ||
      evaluation.data.criteria.every((c) => c.weight === 0) ||
      evaluation.data.status === 'Oppsett'
  );

  function startEvaluation() {
    evaluation.startEvaluation();
  }

  function goToSetup() {
    evaluation.data.status = 'Oppsett';
  }
</script>

<div class="eval-page">
  <!-- Context line -->
  <div class="eval-context">
    <div class="context-info">
      <span class="context-name">{evaluation.data.procurementName || 'Evaluering'}</span>
      {#if evaluation.data.reference}
        <span class="context-sep">·</span>
        <span class="context-ref">{evaluation.data.reference}</span>
      {/if}
    </div>
    <div class="context-actions">
      {#if !showSetup}
        <MethodToggle />
        <button class="setup-btn" onclick={goToSetup} title="Rediger oppsett">
          &#9881; Oppsett
        </button>
      {/if}
    </div>
  </div>

  <!-- Main content -->
  <div class="eval-content">
    {#if showSetup}
      <SetupForm onstart={startEvaluation} />
    {:else}
      <EvalWorkspace />
    {/if}
  </div>
</div>

<style>
  .eval-page {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-5) var(--spacing-6);
  }

  /* Context line */
  .eval-context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-5);
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  .context-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-width: 0;
  }

  .context-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-shrink: 0;
  }

  .context-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .context-sep {
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .context-ref {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
    white-space: nowrap;
  }

  .eval-content {
    flex: 1;
    min-height: 0;
  }

  .setup-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-1) var(--spacing-3);
    cursor: pointer;
    transition: all 0.12s;
  }

  .setup-btn:hover {
    color: var(--color-ink-secondary);
    background: var(--color-felt-hover);
  }
</style>
