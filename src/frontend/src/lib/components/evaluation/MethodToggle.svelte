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
		margin-bottom: var(--spacing-6);
	}

	.method-toggle {
		display: inline-flex;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		padding: 3px;
	}

	.method-btn {
		padding: var(--spacing-2) var(--spacing-4);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s;
		letter-spacing: -0.005em;
	}

	.method-btn:hover {
		color: var(--color-ink);
	}

	.method-btn.active {
		background: var(--color-vekt-bg-strong);
		color: var(--color-vekt);
		font-weight: 600;
	}

	.method-info {
		font-size: 11px;
		color: var(--color-ink-muted);
	}
</style>
