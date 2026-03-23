<script lang="ts">
  import { evaluation, criterionMode } from '$lib/stores/evaluation.svelte';
  import MatrixOverview from './MatrixOverview.svelte';
  import NavStripe from './NavStripe.svelte';
  import AnalysisStripe from './AnalysisStripe.svelte';
  import AnalysisDrawer from './AnalysisDrawer.svelte';
  import EvalLeaf from './EvalLeaf.svelte';
  import EvalTraditional from './EvalTraditional.svelte';
  import EvalResource from './EvalResource.svelte';

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
    <p class="workspace-meta">
      {evaluation.data.procurementName || 'Evaluering'} · {evaluation.data.suppliers.length} leverandører
      · {evaluation.data.criteria.length} kriterier
    </p>
  </div>

  {#if isOverview}
    <AnalysisStripe onopendrawer={() => (drawerOpen = true)} />
    <MatrixOverview onselect={selectCriterion} />
  {:else if activeCriterion}
    <NavStripe aktivId={activeCriterion.id} onselect={selectCriterion} onback={goOverview} />
    <AnalysisStripe onopendrawer={() => (drawerOpen = true)} />

    <div class="criterion-header">
      <h2 class="criterion-title">{activeCriterion.name}</h2>
      <span class="criterion-weight">Vekt: {activeCriterion.weight}%</span>
    </div>

    {#if mode === 'leaf'}
      <EvalLeaf criterion={activeCriterion} />
    {:else if mode === 'traditional'}
      <EvalTraditional criterion={activeCriterion} />
    {:else if mode === 'resource'}
      <EvalResource criterion={activeCriterion} />
    {/if}

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
    max-width: 1120px;
    margin: 0 auto;
  }

  .workspace-header {
    margin-bottom: var(--spacing-4);
  }

  .workspace-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.02em;
    margin-bottom: var(--spacing-1);
  }

  .workspace-meta {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  .criterion-header {
    margin-bottom: var(--spacing-4);
    margin-top: var(--spacing-4);
  }

  .criterion-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .criterion-weight {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
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
</style>
