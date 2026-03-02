<script lang="ts">
	import type { QualificationVerdict } from '$lib/stores/qualification.svelte';

	interface Props {
		verdict: QualificationVerdict;
		hasSupport: boolean;
		hasNotes: boolean;
		expanded: boolean;
		onclick: () => void;
	}

	let { verdict, hasSupport, hasNotes, expanded, onclick }: Props = $props();
</script>

<td
	class="cell-verdict verdict-{verdict}"
	class:has-support={hasSupport}
	class:has-notes={hasNotes}
	class:expanded
	role="button"
	tabindex={0}
	{onclick}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } }}
>
	{#if verdict === 'met'}
		<span class="verdict-icon">✓</span>
	{:else if verdict === 'not_met'}
		<span class="verdict-icon">✗</span>
	{:else}
		<span class="verdict-icon">—</span>
	{/if}
</td>

<style>
	.cell-verdict {
		text-align: center;
		padding: var(--spacing-2) var(--spacing-3);
		position: relative;
		cursor: pointer;
		transition: background 0.12s;
	}

	.cell-verdict:hover {
		background: var(--color-felt-hover);
	}

	.cell-verdict:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
	}

	.verdict-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		font-size: 15px;
		font-weight: 700;
		line-height: 1;
		transition: background 0.12s, color 0.12s;
	}

	.verdict-met .verdict-icon {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.verdict-not_met .verdict-icon {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.verdict-not_assessed .verdict-icon {
		color: var(--color-ink-ghost);
		background: var(--color-felt-active);
	}

	/* Amber diamond marker for support entity */
	.has-support::before {
		content: '◆';
		position: absolute;
		top: var(--spacing-1);
		right: var(--spacing-1);
		font-size: 7px;
		color: var(--color-vekt);
		line-height: 1;
	}

	/* Notes dot */
	.has-notes::after {
		content: '';
		position: absolute;
		bottom: var(--spacing-1);
		right: var(--spacing-1);
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-vekt-dim);
	}

	/* Expanded state */
	.expanded {
		background: var(--color-felt);
	}

	.expanded:hover {
		background: var(--color-felt);
	}
</style>
