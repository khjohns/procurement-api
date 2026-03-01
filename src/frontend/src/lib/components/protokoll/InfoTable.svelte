<script lang="ts">
	interface InfoRow {
		label: string;
		value: string | number | null | undefined;
		mono?: boolean;
	}

	interface Props {
		rows: InfoRow[];
		label?: string;
	}

	let { rows, label = '' }: Props = $props();

	const fmt = new Intl.NumberFormat('nb-NO');

	function formatValue(val: string | number | null | undefined, mono?: boolean): string {
		if (val == null || val === '') return '—';
		if (typeof val === 'number') return fmt.format(val);
		return String(val);
	}
</script>

{#if label}
	<div class="field-label">{label}</div>
{/if}
<div class="info-table">
	{#each rows as row}
		<div class="info-row">
			<div class="info-label">{row.label}</div>
			<div class="info-value" class:info-mono={row.mono} class:info-empty={row.value == null || row.value === ''}>
				{formatValue(row.value, row.mono)}
			</div>
		</div>
	{/each}
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

	.info-table {
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.info-row {
		display: flex;
		padding: var(--spacing-2) var(--spacing-4);
		border-bottom: 1px solid var(--color-wire);
	}

	.info-row:last-child {
		border-bottom: none;
	}

	.info-label {
		width: 160px;
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.info-value {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
		flex: 1;
		min-width: 0;
	}

	.info-mono {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.info-empty {
		color: var(--color-ink-ghost);
	}

	@media (max-width: 768px) {
		.info-row {
			flex-direction: column;
			gap: var(--spacing-1);
		}

		.info-label {
			width: auto;
			font-size: 11px;
		}
	}
</style>
