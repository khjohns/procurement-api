<script lang="ts">
	import { slide } from 'svelte/transition';

	interface Props {
		checked: boolean;
		begrunnelse: string;
		label: string;
		foaRef?: string;
		hint?: string;
		onchange: (checked: boolean, begrunnelse: string) => void;
	}

	let { checked, begrunnelse, label, foaRef = '', hint = '', onchange }: Props = $props();

	function handleCheck(e: Event) {
		const newChecked = (e.target as HTMLInputElement).checked;
		onchange(newChecked, begrunnelse);
	}

	function handleText(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		onchange(checked, val);
	}

	let charCount = $derived(begrunnelse.length);
</script>

<div class="checkbox-field">
	<label class="checkbox-label">
		<input
			type="checkbox"
			class="checkbox-input"
			{checked}
			onchange={handleCheck}
		/>
		<span class="checkbox-text">
			{label}
			{#if foaRef}
				<span class="foa-ref">, jf. {foaRef}</span>
			{/if}
		</span>
	</label>

	{#if checked}
		<div class="textarea-wrap" transition:slide={{ duration: 200 }}>
			<textarea
				class="field-textarea"
				value={begrunnelse}
				oninput={handleText}
				placeholder="Skriv begrunnelse..."
				rows="3"
			></textarea>
			<div class="field-footer">
				<span class="char-count">{charCount} tegn</span>
				{#if hint}
					<span class="field-hint">{hint}</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.checkbox-field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-3);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
	}

	.checkbox-input {
		width: 16px;
		height: 16px;
		margin-top: 2px;
		flex-shrink: 0;
		accent-color: var(--color-vekt);
		cursor: pointer;
	}

	.checkbox-text {
		line-height: 1.4;
	}

	.foa-ref {
		color: var(--color-ink-muted);
		font-weight: 400;
	}

	.textarea-wrap {
		padding-left: 28px;
	}

	.field-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		outline: none;
		resize: vertical;
		transition: border-color 0.12s;
		field-sizing: content;
	}

	.field-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.field-textarea::placeholder {
		color: var(--color-ink-ghost);
		font-style: italic;
	}

	.field-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-2);
		margin-top: var(--spacing-1);
	}

	.char-count {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.field-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
		text-align: right;
	}
</style>
