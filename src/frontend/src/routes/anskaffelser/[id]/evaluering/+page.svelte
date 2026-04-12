<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import SetupForm from '$lib/components/evaluation/SetupForm.svelte';
  import EvalWorkspace from '$lib/components/evaluation/EvalWorkspace.svelte';

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
  <div class="eval-card" class:eval-card-narrow={showSetup}>
    {#if showSetup}
      <SetupForm onstart={startEvaluation} />
    {:else}
      <svelte:boundary onerror={(e) => console.error('EvalWorkspace feilet:', e)}>
        <EvalWorkspace onsetup={goToSetup} />
        {#snippet failed(error, reset)}
          <div class="boundary-error">
            <p class="boundary-error-title">Evalueringsmatrisen kunne ikke vises</p>
            <p class="boundary-error-detail">{error instanceof Error ? error.message : 'Ukjent feil'}</p>
            <button class="boundary-error-btn" onclick={reset}>Prøv igjen</button>
          </div>
        {/snippet}
      </svelte:boundary>
    {/if}
  </div>
</div>

<style>
  .eval-page {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-5) 100px;
  }

  .eval-card {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    padding: var(--spacing-6);
  }

  .eval-card-narrow {
    max-width: 880px;
    margin: 0 auto;
  }

  .boundary-error {
    padding: var(--spacing-6);
    text-align: center;
  }

  .boundary-error-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-secondary);
    margin-bottom: var(--spacing-2);
  }

  .boundary-error-detail {
    font-size: 12px;
    color: var(--color-ink-muted);
    font-family: var(--font-data);
    margin-bottom: var(--spacing-4);
  }

  .boundary-error-btn {
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
  }

  .boundary-error-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  @media (max-width: 1200px) {
    .eval-page {
      padding: var(--spacing-5) var(--spacing-6);
    }
  }
</style>
