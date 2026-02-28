<script lang="ts">
	import { evaluation, type ActiveMethod } from '$lib/stores/evaluation.svelte';

	const methods: { id: ActiveMethod; label: string }[] = [
		{ id: 'poeng', label: 'Poengmodell' },
		{ id: 'pris', label: 'Prismodell' }
	];
</script>

<div class="method-section">
	<div class="method-toggle">
		{#each methods as method}
			<button
				class="method-btn"
				class:active={evaluation.activeMethod === method.id}
				onclick={() => (evaluation.activeMethod = method.id)}
			>
				{method.label}
			</button>
		{/each}
	</div>
	<span class="method-info">
		Vekt kvalitet {evaluation.data.qualityWeight} % / pris {evaluation.data.priceWeight} %
	</span>
</div>

<style>
	.method-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--sp-6);
	}

	.method-toggle {
		display: inline-flex;
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-md);
		padding: 3px;
	}

	.method-btn {
		padding: var(--sp-2) var(--sp-4);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-secondary);
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: all 0.15s;
		letter-spacing: -0.005em;
	}

	.method-btn:hover {
		color: var(--ink);
	}

	.method-btn.active {
		background: var(--vekt-bg-strong);
		color: var(--vekt);
		font-weight: 600;
	}

	.method-info {
		font-size: 11px;
		color: var(--ink-ghost);
	}
</style>
