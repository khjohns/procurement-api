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
  <div class="eval-card">
    {#if showSetup}
      <SetupForm onstart={startEvaluation} />
    {:else}
      <EvalWorkspace onsetup={goToSetup} />
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

  @media (max-width: 1200px) {
    .eval-page {
      padding: var(--spacing-5) var(--spacing-6);
    }
  }
</style>
