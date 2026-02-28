<script lang="ts">
	import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';

	let isPriceMode = $derived(evaluation.activeMethod === 'pris');

	let items = $derived(
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

	let sectionLabel = $derived(
		isPriceMode ? 'Rangering etter evaluert pris' : 'Rangering'
	);
</script>

<div class="section-label">{sectionLabel}</div>
<div class="ranking-strip">
	{#each items as item}
		<div class="rank-card" class:rank-1={item.rank === 1}>
			<div class="rank-card-header">
				<span class="rank-position">#{item.rank}</span>
				{#if item.rank === 1}
					<span class="rank-badge">Anbefalt</span>
				{/if}
			</div>
			<div class="rank-supplier">{item.name}</div>
			<div class="rank-score-row">
				<span class="rank-score" class:rank-score-price={isPriceMode}>{item.value}</span>
				<span class="rank-max">{item.unit}</span>
			</div>
			<div class="rank-bar">
				<div class="rank-bar-fill" style="width: {item.barWidth}%"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		margin-bottom: var(--sp-3);
	}

	.ranking-strip {
		display: flex;
		gap: var(--sp-3);
		margin-bottom: var(--sp-6);
	}

	.rank-card {
		flex: 1;
		padding: var(--sp-4) var(--sp-5);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-lg);
		position: relative;
		transition: border-color 0.15s;
	}

	.rank-card:hover {
		border-color: var(--wire-strong);
	}

	.rank-1 {
		border-color: rgba(232, 168, 56, 0.18);
	}

	.rank-1::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--vekt);
		border-radius: var(--r-lg) var(--r-lg) 0 0;
	}

	.rank-card-header {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin-bottom: var(--sp-2);
	}

	.rank-position {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 600;
		color: var(--ink-muted);
	}

	.rank-1 .rank-position {
		color: var(--vekt-dim);
	}

	.rank-badge {
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--vekt);
		background: var(--vekt-bg);
		padding: 2px 6px;
		border-radius: 3px;
	}

	.rank-supplier {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: var(--sp-2);
		letter-spacing: -0.01em;
	}

	.rank-score-row {
		display: flex;
		align-items: baseline;
		gap: var(--sp-1);
		margin-bottom: var(--sp-2);
	}

	.rank-score {
		font-family: var(--font-data);
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.rank-score-price {
		font-size: 22px;
	}

	.rank-1 .rank-score {
		color: var(--vekt);
	}

	.rank-max {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--ink-ghost);
	}

	.rank-bar {
		height: 3px;
		background: var(--felt-raised);
		border-radius: 2px;
		overflow: hidden;
	}

	.rank-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--ink-muted);
		transition: width 0.4s ease-out;
	}

	.rank-1 .rank-bar-fill {
		background: var(--vekt);
	}
</style>
