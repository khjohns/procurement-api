<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';

	let items = $derived(
		qualification.data.suppliers.map((s) => {
			const result = qualification.supplierResults[s.id];
			return {
				id: s.id,
				name: s.name,
				qualified: result?.qualified ?? false,
				met: result?.met ?? 0,
				total: result?.total ?? 0,
				allAssessed: result ? result.met + countNotMet(s.id) === result.total : false
			};
		})
	);

	function countNotMet(supplierId: string): number {
		let count = 0;
		for (const req of qualification.data.requirements) {
			if (req.assessments[supplierId]?.verdict === 'not_met') count++;
		}
		return count;
	}
</script>

<div class="section-label">Kvalifiseringsstatus</div>
<div class="summary-strip">
	{#each items as item}
		{@const pending = item.total - item.met - countNotMet(item.id)}
		<div
			class="summary-card"
			class:summary-qualified={item.qualified}
			class:summary-rejected={item.allAssessed && !item.qualified}
		>
			<div class="summary-header">
				{#if item.qualified}
					<span class="summary-badge badge-qualified">Kvalifisert</span>
				{:else if item.allAssessed}
					<span class="summary-badge badge-rejected">Avvist</span>
				{:else}
					<span class="summary-badge badge-pending">Uavklart</span>
				{/if}
			</div>
			<div class="summary-name">{item.name}</div>
			<div class="summary-count">
				<span class="summary-count-value">{item.met}</span>
				<span class="summary-count-sep">/</span>
				<span class="summary-count-total">{item.total}</span>
				<span class="summary-count-label">oppfylt</span>
			</div>
			<div class="summary-bar">
				<div class="summary-bar-fill" style="width: {(item.met / Math.max(item.total, 1)) * 100}%"></div>
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

	.summary-strip {
		display: flex;
		gap: var(--sp-3);
		margin-bottom: var(--sp-6);
	}

	.summary-card {
		flex: 1;
		padding: var(--sp-4) var(--sp-5);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-lg);
		position: relative;
		transition: border-color 0.15s;
	}

	.summary-card:hover {
		border-color: var(--wire-strong);
	}

	.summary-qualified {
		border-color: rgba(61, 154, 110, 0.18);
	}

	.summary-qualified::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--score-high);
		border-radius: var(--r-lg) var(--r-lg) 0 0;
	}

	.summary-rejected {
		border-color: rgba(196, 88, 88, 0.18);
	}

	.summary-rejected::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--score-low);
		border-radius: var(--r-lg) var(--r-lg) 0 0;
	}

	.summary-header {
		margin-bottom: var(--sp-2);
	}

	.summary-badge {
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 2px 6px;
		border-radius: 3px;
	}

	.badge-qualified {
		color: var(--score-high);
		background: var(--score-high-bg);
	}

	.badge-rejected {
		color: var(--score-low);
		background: var(--score-low-bg);
	}

	.badge-pending {
		color: var(--ink-muted);
		background: var(--felt-active);
	}

	.summary-name {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: var(--sp-2);
		letter-spacing: -0.01em;
	}

	.summary-count {
		display: flex;
		align-items: baseline;
		gap: 2px;
		margin-bottom: var(--sp-2);
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.summary-count-value {
		font-size: 22px;
		font-weight: 700;
		line-height: 1;
		color: var(--ink);
	}

	.summary-qualified .summary-count-value {
		color: var(--score-high);
	}

	.summary-rejected .summary-count-value {
		color: var(--score-low);
	}

	.summary-count-sep {
		font-size: 14px;
		color: var(--ink-ghost);
	}

	.summary-count-total {
		font-size: 14px;
		color: var(--ink-ghost);
	}

	.summary-count-label {
		font-size: 11px;
		color: var(--ink-ghost);
		margin-left: var(--sp-1);
		font-family: var(--font-ui);
	}

	.summary-bar {
		height: 3px;
		background: var(--felt-raised);
		border-radius: 2px;
		overflow: hidden;
	}

	.summary-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--score-high);
		transition: width 0.4s ease-out;
	}

	.summary-rejected .summary-bar-fill {
		background: var(--score-low);
	}
</style>
