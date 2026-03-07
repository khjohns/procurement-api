<script lang="ts">
	import { evaluation } from '$lib/stores/evaluation.svelte';
	import MethodToggle from '$lib/components/evaluation/MethodToggle.svelte';
	import RankingStrip from '$lib/components/evaluation/RankingStrip.svelte';
	import OverviewMatrix from '$lib/components/evaluation/OverviewMatrix.svelte';
	import CriterionView from '$lib/components/evaluation/CriterionView.svelte';
	import PriceMatrix from '$lib/components/evaluation/PriceMatrix.svelte';
	import JustificationPanel from '$lib/components/evaluation/JustificationPanel.svelte';
	import InsightsPanel from '$lib/components/insights/InsightsPanel.svelte';

	let isOverview = $derived(evaluation.activeView === 'overview');
	let activeCriterion = $derived(
		!isOverview ? evaluation.data.criteria.find((c) => c.id === evaluation.activeView) : null
	);

	/** Show justification panel when viewing a quality criterion. */
	let showPanel = $derived(
		!isOverview && activeCriterion?.type === 'quality'
	);
</script>

<header class="eval-header">
	<div class="eval-header-top">
		<h1 class="eval-title">{evaluation.data.title}</h1>
		<div class="eval-status">
			<span class="eval-status-dot"></span>
			{evaluation.data.status}
		</div>
	</div>
	<div class="eval-meta">
		<div class="eval-meta-item">
			<span class="eval-meta-label">Anskaffelse</span>
			<span class="eval-meta-value">Rammeavtale IKT-konsulenttjenester 2024–2028</span>
		</div>
		<div class="eval-meta-item">
			<span class="eval-meta-label">Ref</span>
			<span class="eval-meta-value">{evaluation.data.reference}</span>
		</div>
	</div>
</header>

<MethodToggle />

{#if evaluation.activeMethod === 'poeng'}
	<RankingStrip />

	<div class="workspace" class:workspace-with-panel={showPanel}>
		<div class="workspace-main">
			{#if isOverview}
				<OverviewMatrix />
			{:else if activeCriterion}
				<CriterionView criterionId={activeCriterion.id} />
			{/if}
		</div>

		{#if showPanel}
			<aside class="workspace-panel">
				<div class="panel-header">
					<span class="panel-title">Begrunnelse</span>
				</div>
				<JustificationPanel />
			</aside>
		{/if}
	</div>
{:else}
	<RankingStrip />
	<PriceMatrix />
{/if}

<InsightsPanel />

<style>
	.eval-header {
		margin-bottom: var(--spacing-8);
	}

	.eval-header-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing-4);
		margin-bottom: var(--spacing-3);
	}

	.eval-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}

	.eval-status {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: 100px;
		background: var(--color-vekt-bg);
		border: 1px solid var(--color-vekt-bg-strong);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-vekt);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.eval-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-vekt);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.eval-meta {
		display: flex;
		gap: var(--spacing-6);
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.eval-meta-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.eval-meta-label {
		color: var(--color-ink-muted);
	}

	.eval-meta-value {
		color: var(--color-ink-secondary);
		font-family: var(--font-data);
		font-size: 11px;
	}

	/* ── Two-panel workspace ── */
	.workspace {
		display: flex;
		gap: 0;
		min-height: 400px;
	}

	.workspace-main {
		flex: 1;
		min-width: 0;
		overflow-x: auto;
	}

	.workspace-with-panel .workspace-main {
		margin-right: var(--spacing-3);
	}

	.workspace-panel {
		width: 380px;
		flex-shrink: 0;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 200px);
		position: sticky;
		top: var(--spacing-4);
	}

	.panel-header {
		padding: var(--spacing-3);
		border-bottom: 1px solid var(--color-wire);
		flex-shrink: 0;
	}

	.panel-title {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}
</style>
