<script lang="ts">
	import { evaluation, scoreTier, formatNOK } from '$lib/stores/evaluation.svelte';
	import MethodToggle from '$lib/components/evaluation/MethodToggle.svelte';
	import OverviewMatrix from '$lib/components/evaluation/OverviewMatrix.svelte';
	import CriterionView from '$lib/components/evaluation/CriterionView.svelte';
	import PriceMatrix from '$lib/components/evaluation/PriceMatrix.svelte';
	import JustificationPanel from '$lib/components/evaluation/JustificationPanel.svelte';
	import InsightsPanel from '$lib/components/insights/InsightsPanel.svelte';

	let isOverview = $derived(evaluation.activeView === 'overview');
	let activeCriterion = $derived(
		!isOverview ? evaluation.data.criteria.find((c) => c.id === evaluation.activeView) : null
	);

	let isPriceMode = $derived(evaluation.activeMethod === 'pris');

	/** Show justification panel when viewing a quality criterion. */
	let showJustification = $derived(
		!isOverview && activeCriterion?.type === 'quality'
	);

	/** Right panel shows ranking+insights in overview/price mode, justification in criterion mode. */
	let showRankingPanel = $derived(isOverview || isPriceMode);

	/** Compact ranking data. */
	let rankingItems = $derived(
		isPriceMode
			? evaluation.priceRanking.map((r) => ({
					rank: r.rank,
					name: r.supplier.name,
					value: formatNOK(r.evaluatedPrice),
					unit: 'kr',
					barWidth: r.rank === 1
						? 92
						: Math.min(100, (r.evaluatedPrice / evaluation.priceRanking[evaluation.priceRanking.length - 1].evaluatedPrice) * 100)
				}))
			: evaluation.ranking.map((r) => ({
					rank: r.rank,
					name: r.supplier.name,
					value: r.score.toFixed(2),
					unit: '/ 10',
					barWidth: r.score * 10
				}))
	);
</script>

<div class="eval-workspace">
	<!-- Main content area -->
	<div class="eval-main">
		<!-- Subtle context line -->
		<div class="eval-context">
			<span class="context-name">{evaluation.data.procurementName}</span>
			<span class="context-sep">·</span>
			<span class="context-ref">{evaluation.data.reference}</span>
		</div>

		{#if isPriceMode}
			<PriceMatrix />
		{:else if isOverview}
			<OverviewMatrix />
		{:else if activeCriterion}
			<CriterionView criterionId={activeCriterion.id} />
		{/if}
	</div>

	<!-- Right panel -->
	<aside class="eval-panel">
		<MethodToggle />

		{#if showRankingPanel}
			<!-- Compact ranking -->
			<div class="panel-section">
				<div class="panel-label">Rangering</div>
				<div class="ranking-list">
					{#each rankingItems as item}
						<div class="rank-item" class:rank-leader={item.rank === 1}>
							<span class="rank-pos">#{item.rank}</span>
							<span class="rank-name">{item.name}</span>
							<span class="rank-val" class:rank-val-price={isPriceMode}>{item.value}</span>
						</div>
						<div class="rank-bar-track">
							<div
								class="rank-bar-fill"
								class:rank-bar-leader={item.rank === 1}
								style="width: {item.barWidth}%"
							></div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Status (subtle) -->
			<div class="panel-status">
				<span class="status-label">{evaluation.data.status}</span>
				<span class="status-progress">
					{evaluation.progress.scores.filled}/{evaluation.progress.scores.total}
				</span>
			</div>

			<!-- Insights embedded -->
			<InsightsPanel embedded={true} />

		{:else if showJustification}
			<div class="panel-section panel-section-justification">
				<div class="panel-label">Begrunnelse</div>
				<JustificationPanel />
			</div>
		{/if}
	</aside>
</div>

<style>
	.eval-workspace {
		display: flex;
		height: 100%;
		overflow: hidden;
	}

	/* ── Main content ── */
	.eval-main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--spacing-5) var(--spacing-6);
	}

	/* ── Context line ── */
	.eval-context {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		margin-bottom: var(--spacing-5);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.context-name {
		font-weight: 500;
	}

	.context-sep {
		color: var(--color-ink-ghost);
	}

	.context-ref {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	/* ── Right panel ── */
	.eval-panel {
		width: 340px;
		flex-shrink: 0;
		overflow-y: auto;
		border-left: 1px solid var(--color-wire);
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
	}

	/* ── Panel sections ── */
	.panel-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.panel-section-justification {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.panel-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	/* ── Compact ranking ── */
	.ranking-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.rank-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-1) 0;
	}

	.rank-pos {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-ink-ghost);
		width: 20px;
		flex-shrink: 0;
	}

	.rank-leader .rank-pos {
		color: var(--color-vekt-dim);
	}

	.rank-name {
		flex: 1;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rank-leader .rank-name {
		color: var(--color-ink);
		font-weight: 600;
	}

	.rank-val {
		font-family: var(--font-data);
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		flex-shrink: 0;
	}

	.rank-val-price {
		font-size: 11px;
	}

	.rank-leader .rank-val {
		color: var(--color-vekt);
	}

	.rank-bar-track {
		height: 2px;
		background: var(--color-felt-active);
		border-radius: 1px;
		overflow: hidden;
		margin-bottom: var(--spacing-2);
	}

	.rank-bar-fill {
		height: 100%;
		background: var(--color-ink-ghost);
		border-radius: 1px;
		transition: width 0.4s ease-out;
	}

	.rank-bar-leader {
		background: var(--color-vekt);
	}

	/* ── Status (subtle) ── */
	.panel-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
	}

	.status-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
	}

	.status-progress {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
	}
</style>
