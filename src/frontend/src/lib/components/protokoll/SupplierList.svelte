<script lang="ts">
	interface Supplier {
		id: string;
		name: string;
	}

	interface Props {
		suppliers: Supplier[];
		label?: string;
	}

	let { suppliers, label = '' }: Props = $props();
</script>

{#if label}
	<div class="field-label">{label}</div>
{/if}
<div class="supplier-list">
	{#if suppliers.length === 0}
		<div class="supplier-empty">Ingen leverandører</div>
	{:else}
		{#each suppliers as supplier, i}
			<div class="supplier-item">
				<span class="supplier-num">{i + 1}.</span>
				<span class="supplier-name">{supplier.name}</span>
			</div>
		{/each}
	{/if}
</div>

<style>
	.field-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-2);
	}

	.supplier-list {
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: var(--spacing-3) var(--spacing-4);
	}

	.supplier-item {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-2);
		padding: var(--spacing-1) 0;
	}

	.supplier-num {
		font-family: var(--font-data);
		font-size: 13px;
		color: var(--color-ink-muted);
		min-width: 24px;
		font-variant-numeric: tabular-nums;
	}

	.supplier-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
	}

	.supplier-empty {
		font-size: 12px;
		color: var(--color-ink-muted);
		font-style: italic;
	}
</style>
