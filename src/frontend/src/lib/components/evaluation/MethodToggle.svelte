<script lang="ts">
	import { evaluation, type ActiveMethod } from '$lib/stores/evaluation.svelte';

	const methods: { id: ActiveMethod; label: string }[] = [
		{ id: 'poeng', label: 'Poengmodell' },
		{ id: 'pris', label: 'Prismodell' }
	];
</script>

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

<style>
	.method-toggle {
		display: flex;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		padding: 2px;
	}

	.method-btn {
		flex: 1;
		padding: var(--spacing-1) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}

	.method-btn:hover {
		color: var(--color-ink);
	}

	.method-btn.active {
		background: var(--color-vekt-bg-strong);
		color: var(--color-vekt);
		font-weight: 600;
	}
</style>
