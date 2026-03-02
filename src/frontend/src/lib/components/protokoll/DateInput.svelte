<script lang="ts">
	interface Props {
		value: string;
		label?: string;
		hint?: string;
		onchange: (isoDate: string) => void;
	}

	let { value, label = '', hint = '', onchange }: Props = $props();

	/** Display formatted Norwegian date (dd.mm.yyyy) from ISO string */
	let displayDate = $derived.by(() => {
		if (!value) return '';
		try {
			const dt = new Date(value + 'T00:00:00');
			return dt.toLocaleDateString('nb-NO', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			});
		} catch {
			return value;
		}
	});

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		onchange(input.value);
	}
</script>

<div class="date-field">
	{#if label}
		<div class="date-label">{label}</div>
	{/if}
	<div class="date-input-wrap">
		<input
			type="date"
			class="date-input"
			{value}
			oninput={handleInput}
		/>
		{#if value}
			<span class="date-display">{displayDate}</span>
		{/if}
	</div>
	{#if hint}
		<div class="date-hint">{hint}</div>
	{/if}
</div>

<style>
	.date-field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.date-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	.date-input-wrap {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.date-input {
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-data);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		outline: none;
		transition: border-color 0.12s;
		color-scheme: dark;
	}

	.date-input:focus {
		border-color: var(--color-wire-focus);
	}

	.date-input::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	.date-display {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink-secondary);
		font-variant-numeric: tabular-nums;
	}

	.date-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
	}
</style>
