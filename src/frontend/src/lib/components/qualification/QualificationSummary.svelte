<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';

	let items = $derived(
		qualification.data.suppliers.map((s) => {
			const r = qualification.supplierResults[s.id];
			return {
				id: s.id,
				name: s.name,
				qualified: r?.qualified ?? false,
				met: r?.met ?? 0,
				total: r?.total ?? 0,
				allAssessed: r?.allAssessed ?? false
			};
		})
	);
</script>

<div class="section-label">Kvalifikasjonsstatus</div>
<div class="summary-strip">
	{#each items as item}
		<div
			class="summary-card"
			class:summary-qualified={item.qualified}
			class:summary-rejected={item.allAssessed && !item.qualified}
		>
			<div class="summary-name">{item.name}</div>
			<div class="summary-verdict">
				{#if item.qualified}
					<span class="verdict-mark verdict-pass">✓</span>
					<span class="verdict-text verdict-pass-text">Kvalifisert</span>
				{:else if item.allAssessed}
					<span class="verdict-mark verdict-fail">✗</span>
					<span class="verdict-text verdict-fail-text">Avvist</span>
				{:else}
					<span class="verdict-mark verdict-pending">—</span>
					<span class="verdict-text verdict-pending-text">Uavklart</span>
				{/if}
			</div>
			<div class="summary-count">
				<span class="summary-count-num">{item.met}/{item.total}</span>
				<span class="summary-count-label">krav oppfylt</span>
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
		margin-bottom: var(--sp-3);
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

	.summary-name {
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-secondary);
		margin-bottom: var(--sp-2);
		letter-spacing: -0.01em;
	}

	.summary-verdict {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin-bottom: var(--sp-3);
	}

	.verdict-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--r-sm);
		font-size: 13px;
		font-weight: 700;
		line-height: 1;
		flex-shrink: 0;
	}

	.verdict-pass {
		color: var(--score-high);
		background: var(--score-high-bg);
	}

	.verdict-fail {
		color: var(--score-low);
		background: var(--score-low-bg);
	}

	.verdict-pending {
		color: var(--ink-ghost);
		background: var(--felt-active);
	}

	.verdict-text {
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.verdict-pass-text {
		color: var(--score-high);
	}

	.verdict-fail-text {
		color: var(--score-low);
	}

	.verdict-pending-text {
		color: var(--ink-muted);
	}

	.summary-count {
		display: flex;
		align-items: baseline;
		gap: var(--sp-1);
		margin-bottom: var(--sp-2);
	}

	.summary-count-num {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-muted);
	}

	.summary-count-label {
		font-size: 11px;
		color: var(--ink-ghost);
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
