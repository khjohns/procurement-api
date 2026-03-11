<script lang="ts">
	import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';
	import MethodToggle from '$lib/components/evaluation/MethodToggle.svelte';
	import OverviewMatrix from '$lib/components/evaluation/OverviewMatrix.svelte';
	import CriterionView from '$lib/components/evaluation/CriterionView.svelte';
	import PriceMatrix from '$lib/components/evaluation/PriceMatrix.svelte';
	import JustificationPanel from '$lib/components/evaluation/JustificationPanel.svelte';
	import InsightsPanel from '$lib/components/insights/InsightsPanel.svelte';
	import SetupPanel from '$lib/components/evaluation/SetupPanel.svelte';
	import SetupEmptyState from '$lib/components/evaluation/SetupEmptyState.svelte';

	let isOverview = $derived(evaluation.activeView === 'overview');
	let activeCriterion = $derived(
		!isOverview ? evaluation.data.criteria.find((c) => c.id === evaluation.activeView) : null
	);

	let isPriceMode = $derived(evaluation.activeMethod === 'pris');

	/** Show empty state when no criteria or all weights are 0. */
	let showEmptyState = $derived(
		evaluation.data.criteria.length === 0 ||
		evaluation.data.criteria.every((c) => c.weight === 0)
	);

	/** Show justification panel when viewing a quality criterion. */
	let showJustification = $derived(
		!isOverview && activeCriterion?.type === 'quality'
	);

	/** Right panel shows ranking in overview/price mode, justification in criterion mode. */
	let showRankingPanel = $derived(evaluation.isReady && (isOverview || isPriceMode));

	/** Setup toggle in work mode (allows adjusting setup without losing scores). */
	let setupToggleOpen = $state(false);

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

	/** Bottom drawer state. */
	let drawerOpen = $state(false);

	/** Mobile panel state. */
	let mobilePanelOpen = $state(false);

	/** Sync quality/price weights from criteria when data is ready. */
	$effect(() => {
		if (evaluation.isReady && evaluation.data.status === 'Oppsett') {
			evaluation.data.status = 'Under evaluering';
			evaluation.setQualityPriceWeights(
				evaluation.qualityWeightDerived,
				evaluation.priceWeightDerived
			);
		}
	});
</script>

<div class="eval-workspace">
	<!-- Main content area -->
	<div class="eval-main">
		<div class="eval-context">
			<span class="context-name">{evaluation.data.procurementName || 'Evaluering'}</span>
			{#if evaluation.data.reference}
				<span class="context-sep">·</span>
				<span class="context-ref">{evaluation.data.reference}</span>
			{/if}
		</div>

		<div class="eval-main-content">
			{#if showEmptyState}
				<SetupEmptyState />
			{:else if isPriceMode}
				<PriceMatrix />
			{:else if isOverview}
				<OverviewMatrix />
			{:else if activeCriterion}
				<CriterionView criterionId={activeCriterion.id} />
			{/if}
		</div>

		<!-- Bottom drawer for full insights -->
		{#if drawerOpen}
			<div class="insights-drawer">
				<div class="drawer-handle">
					<button class="drawer-close" onclick={() => (drawerOpen = false)}>
						<span class="drawer-close-icon">&#9662;</span>
						Lukk analyse
					</button>
				</div>
				<div class="drawer-content">
					<InsightsPanel />
				</div>
			</div>
		{/if}
	</div>

	<!-- Right panel (desktop) -->
	<aside class="eval-panel" class:panel-open={mobilePanelOpen}>
		<MethodToggle />

		{#if setupToggleOpen || evaluation.data.suppliers.length === 0}
			<!-- Setup panel (open by toggle or when no suppliers) -->
			<SetupPanel />
			{#if setupToggleOpen}
				<button class="setup-toggle-close" onclick={() => (setupToggleOpen = false)}>
					Lukk oppsett
				</button>
			{/if}
		{:else if showRankingPanel}
			<!-- Setup toggle button -->
			<button class="setup-toggle-btn" onclick={() => (setupToggleOpen = true)} title="Juster oppsett">
				&#9881; Oppsett
			</button>

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

			<!-- Key insights (compact) -->
			<div class="panel-section">
				<div class="panel-label">Nøkkeltall</div>
				<div class="key-metrics">
					<div class="metric">
						<span class="metric-label">Margin #1 → #2</span>
						<span class="metric-value">
							<span class="metric-num">{evaluation.margin.toFixed(1)}</span>
							<span class="metric-verdict" class:metric-robust={evaluation.margin >= 0.5} class:metric-vulnerable={evaluation.margin < 0.2}>
								{evaluation.margin >= 0.5 ? 'robust' : evaluation.margin >= 0.2 ? 'moderat' : 'sårbart'}
							</span>
						</span>
					</div>
					<div class="metric">
						<span class="metric-label">Metodekontroll</span>
						<span class="metric-value">
							<span class="metric-icon" class:metric-match={evaluation.sameWinner}>{evaluation.sameWinner ? '✓' : '⚠'}</span>
							<span class="metric-text">{evaluation.sameWinner ? 'Samsvar' : 'Avvik'}</span>
						</span>
					</div>
					<div class="metric">
						<span class="metric-label">Kvalitetsbudsjett</span>
						<span class="metric-value">
							<span class="metric-num">{formatNOK(evaluation.qualityBudget)}</span>
							<span class="metric-unit">kr</span>
						</span>
					</div>
					<div class="metric">
						<span class="metric-label">Kvalitet / pris</span>
						<span class="metric-value">
							<span class="metric-num">{evaluation.data.qualityWeight}</span>
							<span class="metric-unit">/ {evaluation.data.priceWeight} %</span>
						</span>
					</div>
				</div>
				<button class="insights-btn" onclick={() => (drawerOpen = !drawerOpen)}>
					{drawerOpen ? 'Lukk analyse' : 'Åpne analyse'}
					<span class="insights-btn-arrow" class:insights-btn-open={drawerOpen}>↑</span>
				</button>
			</div>

			<!-- Status (subtle) -->
			<div class="panel-status">
				<span class="status-label">{evaluation.data.status}</span>
				<span class="status-progress">
					{evaluation.progress.scores.filled}/{evaluation.progress.scores.total}
				</span>
			</div>

		{:else if showJustification}
			<div class="panel-section panel-section-justification">
				<div class="panel-label">Begrunnelse</div>
				<JustificationPanel />
			</div>
		{:else}
			<!-- Default: show setup toggle when not in ranking or justification mode -->
			<button class="setup-toggle-btn" onclick={() => (setupToggleOpen = true)} title="Juster oppsett">
				&#9881; Oppsett
			</button>
		{/if}
	</aside>

	<!-- Mobile panel toggle -->
	<button
		class="mobile-panel-toggle"
		onclick={() => (mobilePanelOpen = !mobilePanelOpen)}
		aria-label={mobilePanelOpen ? 'Lukk panel' : 'Åpne panel'}
	>
		{#if mobilePanelOpen}
			✕
		{:else if showJustification}
			✎
		{:else}
			☰
		{/if}
	</button>

	<!-- Mobile backdrop -->
	{#if mobilePanelOpen}
		<button
			class="mobile-backdrop"
			onclick={() => (mobilePanelOpen = false)}
			aria-label="Lukk panel"
			tabindex="-1"
		></button>
	{/if}
</div>

<style>
	.eval-workspace {
		display: flex;
		height: 100%;
		overflow: hidden;
		position: relative;
	}

	/* ── Main content ── */
	.eval-main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--spacing-5) var(--spacing-6);
		display: flex;
		flex-direction: column;
	}

	.eval-main-content {
		flex: 1;
		min-height: 0;
	}

	/* ── Context line ── */
	.eval-context {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		margin-bottom: var(--spacing-5);
		font-size: 12px;
		color: var(--color-ink-secondary);
		flex-shrink: 0;
	}

	.context-name {
		font-weight: 600;
	}

	.context-sep {
		color: var(--color-ink-ghost);
	}

	.context-ref {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	/* ── Bottom drawer ── */
	.insights-drawer {
		flex-shrink: 0;
		border-top: 1px solid var(--color-wire-strong);
		max-height: 50%;
		display: flex;
		flex-direction: column;
	}

	.drawer-handle {
		padding: var(--spacing-2) var(--spacing-3);
		flex-shrink: 0;
	}

	.drawer-close {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1);
		transition: color 0.12s;
	}

	.drawer-close:hover {
		color: var(--color-ink);
	}

	.drawer-close-icon {
		font-size: 10px;
	}

	.drawer-content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	/* ── Right panel ── */
	.eval-panel {
		width: 300px;
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
		padding: var(--spacing-1) var(--spacing-2);
		margin: 0 calc(-1 * var(--spacing-2));
		border-radius: var(--radius-sm);
		transition: background 0.12s;
	}

	.rank-item:hover {
		background: var(--color-felt-hover);
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
		border-radius: var(--radius-sm);
		overflow: hidden;
		margin-bottom: var(--spacing-2);
	}

	.rank-bar-fill {
		height: 100%;
		background: var(--color-ink-ghost);
		border-radius: var(--radius-sm);
		transition: width 0.25s ease-out;
	}

	.rank-bar-leader {
		background: var(--color-vekt);
	}

	/* ── Key metrics ── */
	.key-metrics {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.metric {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-1) var(--spacing-2);
		margin: 0 calc(-1 * var(--spacing-2));
		border-radius: var(--radius-sm);
		transition: background 0.12s;
	}

	.metric:hover {
		background: var(--color-felt-hover);
	}

	.metric-label {
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.metric-value {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
	}

	.metric-num {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
	}

	.metric-unit {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	.metric-verdict {
		font-size: 10px;
		font-weight: 600;
		padding: 2px var(--spacing-2);
		border-radius: var(--radius-sm);
		color: var(--color-ink-muted);
		background: var(--color-felt-active);
	}

	.metric-robust {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.metric-vulnerable {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.metric-icon {
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.metric-match {
		color: var(--color-score-high);
	}

	.metric-text {
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	/* ── Insights button ── */
	.insights-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-2);
		width: 100%;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-vekt-bg);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-vekt-dim);
		cursor: pointer;
		transition: all 0.12s;
	}

	.insights-btn:hover {
		color: var(--color-vekt);
		background: var(--color-vekt-bg-strong);
	}

	.insights-btn-arrow {
		font-size: 10px;
		transition: transform 0.2s;
	}

	.insights-btn-open {
		transform: rotate(180deg);
	}

	/* ── Status (subtle) ── */
	.panel-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-2) var(--spacing-3);
		margin-top: auto;
	}

	.status-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.status-progress {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
	}

	/* ── Setup toggle (in work mode) ── */
	.setup-toggle-btn {
		padding: var(--spacing-2) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.12s;
		text-align: left;
	}

	.setup-toggle-btn:hover {
		color: var(--color-vekt-dim);
		border-color: var(--color-vekt-bg-strong);
		background: var(--color-vekt-bg);
	}

	.setup-toggle-close {
		padding: var(--spacing-2) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
		background: none;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.12s;
	}

	.setup-toggle-close:hover {
		color: var(--color-ink);
		border-color: var(--color-wire-strong);
	}

	/* ── Mobile panel toggle ── */
	.mobile-panel-toggle {
		display: none;
	}

	.mobile-backdrop {
		display: none;
	}

	@media (max-width: 1023px) {
		.eval-panel {
			position: fixed;
			top: var(--header-height);
			right: 0;
			bottom: 0;
			width: 320px;
			background: var(--color-canvas);
			z-index: 100;
			transform: translateX(100%);
			transition: transform 0.2s ease-out;
		}

		.eval-panel.panel-open {
			transform: translateX(0);
		}

		.mobile-panel-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			position: fixed;
			bottom: var(--spacing-5);
			right: var(--spacing-5);
			width: var(--spacing-10);
			height: var(--spacing-10);
			border-radius: 50%;
			background: var(--color-felt-raised);
			border: 1px solid var(--color-wire-strong);
			color: var(--color-ink);
			font-size: 16px;
			cursor: pointer;
			z-index: 101;
			transition: background 0.12s;
		}

		.mobile-panel-toggle:hover {
			background: var(--color-felt-active);
		}

		.mobile-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: var(--color-overlay);
			z-index: 99;
			border: none;
			cursor: default;
		}

		.eval-main {
			padding: var(--spacing-3) var(--spacing-4);
		}
	}
</style>
