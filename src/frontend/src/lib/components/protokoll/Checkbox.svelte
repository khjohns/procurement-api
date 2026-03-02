<script lang="ts">
	interface Props {
		checked: boolean;
		label?: string;
		foaRef?: string;
		disabled?: boolean;
		onchange: (checked: boolean) => void;
	}

	let { checked, label = '', foaRef = '', disabled = false, onchange }: Props = $props();

	function handleClick() {
		if (!disabled) onchange(!checked);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			if (!disabled) onchange(!checked);
		}
	}
</script>

<label class="checkbox" class:checkbox-disabled={disabled}>
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		aria-disabled={disabled}
		class="checkbox-box"
		class:checkbox-box-checked={checked}
		onclick={handleClick}
		onkeydown={handleKeydown}
	>
		{#if checked}
			<svg class="checkbox-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
				<path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		{/if}
	</button>
	{#if label}
		<span class="checkbox-text">
			{label}
			{#if foaRef}
				<span class="checkbox-ref">, jf. {foaRef}</span>
			{/if}
		</span>
	{/if}
</label>

<style>
	.checkbox {
		display: inline-flex;
		align-items: flex-start;
		gap: var(--spacing-3);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
		user-select: none;
	}

	.checkbox-disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.checkbox-box {
		width: 16px;
		height: 16px;
		margin-top: 2px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-canvas);
		border: 1px solid var(--color-wire-strong);
		border-radius: 3px;
		padding: 0;
		cursor: inherit;
		transition: background-color 0.1s, border-color 0.1s;
	}

	.checkbox-box:hover:not([aria-disabled='true']) {
		border-color: var(--color-vekt-dim);
	}

	.checkbox-box:focus-visible {
		outline: none;
		border-color: var(--color-wire-focus);
		box-shadow: 0 0 0 2px var(--color-vekt-bg);
	}

	.checkbox-box-checked {
		background: var(--color-vekt);
		border-color: var(--color-vekt);
	}

	.checkbox-box-checked:hover:not([aria-disabled='true']) {
		background: var(--color-vekt-dim);
		border-color: var(--color-vekt-dim);
	}

	.checkbox-icon {
		color: var(--color-canvas);
	}

	.checkbox-text {
		line-height: 1.4;
	}

	.checkbox-ref {
		color: var(--color-ink-muted);
		font-weight: 400;
	}
</style>
