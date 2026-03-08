<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';

	let isOverview = $derived(qualification.activeView === 'overview');

	let activeReq = $derived(
		!isOverview ? qualification.data.requirements.find((r) => r.id === qualification.activeView) : null
	);

	let items = $derived(
		qualification.data.suppliers.map((s) => {
			const r = qualification.supplierResults[s.id];
			return {
				id: s.id,
				name: s.name,
				qualified: r?.qualified ?? false,
				met: r?.met ?? 0,
				notMet: r?.notMet ?? 0,
				total: r?.total ?? 0,
				allAssessed: r?.allAssessed ?? false
			};
		})
	);
</script>

<!-- Status section -->
<div class="panel-section">
	<div class="panel-label">Kvalifikasjonsstatus</div>
	<div class="status-list">
		{#each items as item}
			{@const barWidth = (item.met / Math.max(item.total, 1)) * 100}
			<div
				class="status-item"
				class:status-leader={item.qualified}
				class:status-rejected={item.allAssessed && !item.qualified}
			>
				<span class="status-icon">
					{#if item.qualified}
						<span class="icon-badge icon-met">✓</span>
					{:else if item.allAssessed && !item.qualified}
						<span class="icon-badge icon-not-met">✗</span>
					{:else}
						<span class="icon-badge icon-pending">—</span>
					{/if}
				</span>
				<span class="status-name">{item.name}</span>
				<span class="status-count">{item.met}/{item.total}</span>
			</div>
			<div class="status-bar-track">
				<div
					class="status-bar-fill"
					class:bar-qualified={item.qualified}
					class:bar-rejected={item.allAssessed && !item.qualified}
					style="width: {barWidth}%"
				></div>
			</div>
		{/each}
	</div>
</div>

<!-- Requirement detail (when drilled down) -->
{#if activeReq}
	<div class="panel-section">
		<div class="panel-label">Krav</div>
		<div class="req-detail-name">{activeReq.name}</div>
		{#if activeReq.description}
			<div class="req-detail-desc">{activeReq.description}</div>
		{/if}
	</div>

	<div class="panel-section">
		<div class="panel-label">Status per leverandør</div>
		<div class="req-supplier-list">
			{#each qualification.data.suppliers as supplier}
				{@const a = activeReq.assessments[supplier.id]}
				{@const verdict = a?.verdict ?? 'not_assessed'}
				{@const doc = a?.documentation ?? 'not_assessed'}
				<div class="req-supplier-item">
					<span class="req-supplier-name">{supplier.name}</span>
					<div class="req-supplier-details">
						<span class="detail-badge" class:detail-met={verdict === 'met'} class:detail-not-met={verdict === 'not_met'}>
							{#if verdict === 'met'}✓{:else if verdict === 'not_met'}✗{:else}—{/if}
						</span>
						{#if doc === 'submitted'}
							<span class="detail-doc">Dok. levert</span>
						{:else if doc === 'not_submitted'}
							<span class="detail-doc detail-doc-missing">Dok. mangler</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Status strip (bottom) -->
<div class="panel-status">
	<span class="panel-status-label">{qualification.data.status}</span>
	<span class="panel-status-progress">
		{qualification.progress.assessments.filled}/{qualification.progress.assessments.total}
	</span>
</div>

<style>
	.panel-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.panel-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	/* ── Compact status list (RankingStrip pattern) ── */
	.status-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-1) var(--spacing-2);
		margin: 0 calc(-1 * var(--spacing-2));
		border-radius: var(--radius-sm);
		transition: background 0.12s;
	}

	.status-item:hover {
		background: var(--color-felt-hover);
	}

	.icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: var(--radius-sm);
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		flex-shrink: 0;
	}

	.icon-met {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.icon-not-met {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.icon-pending {
		color: var(--color-ink-ghost);
		background: var(--color-felt-active);
	}

	.status-name {
		flex: 1;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status-leader .status-name {
		color: var(--color-ink);
		font-weight: 600;
	}

	.status-count {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
		flex-shrink: 0;
	}

	.status-leader .status-count {
		color: var(--color-score-high);
	}

	.status-rejected .status-count {
		color: var(--color-score-low);
	}

	.status-bar-track {
		height: 2px;
		background: var(--color-felt-active);
		border-radius: var(--radius-sm);
		overflow: hidden;
		margin-bottom: var(--spacing-2);
	}

	.status-bar-fill {
		height: 100%;
		background: var(--color-ink-ghost);
		border-radius: var(--radius-sm);
		transition: width 0.25s ease-out;
	}

	.bar-qualified {
		background: var(--color-score-high);
	}

	.bar-rejected {
		background: var(--color-score-low);
	}

	/* ── Requirement detail (drill-down) ── */
	.req-detail-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
	}

	.req-detail-desc {
		font-size: 11px;
		color: var(--color-ink-muted);
		line-height: 1.4;
	}

	.req-supplier-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.req-supplier-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-2);
		margin: 0 calc(-1 * var(--spacing-2));
		border-radius: var(--radius-sm);
		transition: background 0.12s;
	}

	.req-supplier-item:hover {
		background: var(--color-felt-hover);
	}

	.req-supplier-name {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.req-supplier-details {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.detail-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: var(--radius-sm);
		font-size: 10px;
		font-weight: 700;
		color: var(--color-ink-ghost);
		background: var(--color-felt-active);
	}

	.detail-met {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.detail-not-met {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.detail-doc {
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	.detail-doc-missing {
		color: var(--color-score-low);
	}

	/* ── Status strip (bottom) ── */
	.panel-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-2) var(--spacing-3);
		margin-top: auto;
	}

	.panel-status-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.panel-status-progress {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
	}
</style>
