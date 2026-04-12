<script lang="ts">
  import { evaluation, criterionMode } from '$lib/stores/evaluation.svelte';
  import MatrixOverview from './MatrixOverview.svelte';
  import NavStripe from './NavStripe.svelte';
  import AnalysisStripe from './AnalysisStripe.svelte';
  import AnalysisDrawer from './AnalysisDrawer.svelte';
  import EvalLeaf from './EvalLeaf.svelte';
  import EvalTraditional from './EvalTraditional.svelte';
  import EvalResource from './EvalResource.svelte';
  import MethodToggle from './MethodToggle.svelte';

  let { onsetup }: { onsetup: () => void } = $props();

  let isOverview = $derived(evaluation.activeView === 'overview');
  let activeCriterion = $derived(
    !isOverview ? evaluation.data.criteria.find((c) => c.id === evaluation.activeView) : null
  );
  let mode = $derived(activeCriterion ? criterionMode(activeCriterion) : null);

  let qualityCriteria = $derived(evaluation.data.criteria.filter((c) => c.type !== 'price'));
  let fokusIdx = $derived(qualityCriteria.findIndex((c) => c.id === evaluation.activeView));
  let prevK = $derived(fokusIdx > 0 ? qualityCriteria[fokusIdx - 1] : null);
  let nextK = $derived(
    fokusIdx < qualityCriteria.length - 1 ? qualityCriteria[fokusIdx + 1] : null
  );

  let drawerOpen = $state(false);

  function selectCriterion(id: string) {
    evaluation.setActiveView(id);
  }

  function goOverview() {
    evaluation.setActiveView('overview');
  }
</script>

<div class="workspace">
  <div class="workspace-header">
    <h1 class="workspace-title">Evalueringsmatrise</h1>
    <span class="workspace-meta">
      {evaluation.data.suppliers.length} leverandører · {evaluation.data.criteria.length} kriterier
    </span>
    <div class="workspace-actions">
      <MethodToggle />
      <button class="setup-btn" onclick={onsetup} title="Rediger oppsett">&#9881; Oppsett</button>
    </div>
  </div>

  {#if isOverview}
    <AnalysisStripe onopendrawer={() => (drawerOpen = true)} />
    <svelte:boundary onerror={(e) => console.error('MatrixOverview feilet:', e)}>
      <MatrixOverview onselect={selectCriterion} />
      {#snippet failed(error, reset)}
        <div class="boundary-error">
          <p class="boundary-error-title">Matrisen kunne ikke vises</p>
          <p class="boundary-error-detail">{error instanceof Error ? error.message : 'Ukjent feil'}</p>
          <button class="boundary-error-btn" onclick={reset}>Prøv igjen</button>
        </div>
      {/snippet}
    </svelte:boundary>
  {:else if activeCriterion}
    <NavStripe aktivId={activeCriterion.id} onselect={selectCriterion} onback={goOverview} />
    <AnalysisStripe onopendrawer={() => (drawerOpen = true)} />

    <svelte:boundary onerror={(e) => console.error('Kriterieevaluering feilet:', e)}>
      {#if mode === 'leaf'}
        <EvalLeaf criterion={activeCriterion} />
      {:else if mode === 'traditional'}
        <EvalTraditional criterion={activeCriterion} />
      {:else if mode === 'resource'}
        <EvalResource criterion={activeCriterion} />
      {/if}
      {#snippet failed(error, reset)}
        <div class="boundary-error">
          <p class="boundary-error-title">Evalueringsskjemaet kunne ikke vises</p>
          <p class="boundary-error-detail">{error instanceof Error ? error.message : 'Ukjent feil'}</p>
          <button class="boundary-error-btn" onclick={reset}>Prøv igjen</button>
        </div>
      {/snippet}
    </svelte:boundary>

    <!-- Bottom prev/next navigation -->
    <div class="criterion-nav">
      {#if prevK}
        <button class="nav-btn" onclick={() => selectCriterion(prevK!.id)}>← {prevK.name}</button>
      {:else}
        <div></div>
      {/if}
      {#if nextK}
        <button class="nav-btn" onclick={() => selectCriterion(nextK!.id)}>{nextK.name} →</button>
      {:else}
        <div></div>
      {/if}
    </div>
  {/if}
</div>

<AnalysisDrawer open={drawerOpen} onclose={() => (drawerOpen = false)} />

<style>
  .workspace {
  }

  .workspace-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .workspace-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.02em;
  }

  .workspace-meta {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  .workspace-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
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

  .criterion-nav {
    display: flex;
    justify-content: space-between;
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--color-wire);
  }

  .nav-btn {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-4);
    cursor: pointer;
    transition: all 0.12s;
  }

  .nav-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
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
</style>
