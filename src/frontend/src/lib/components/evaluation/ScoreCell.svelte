<script lang="ts">
	import { scoreTier } from '$lib/stores/evaluation.svelte';

	interface Props {
		score: number;
		isBest?: boolean;
		hasNotes?: boolean;
		drilldown?: boolean;
		expanded?: boolean;
		onclick?: () => void;
	}

	let { score, isBest = false, hasNotes = false, drilldown = false, expanded = false, onclick }: Props = $props();
	let tier = $derived(scoreTier(score));
</script>

<td
	class="cell-score score-{tier}"
	class:score-best={isBest}
	class:has-notes={hasNotes}
	class:score-drilldown={drilldown}
	class:expanded
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={onclick}
	onkeydown={(e) => { if (onclick && (e.key === 'Enter' || e.key === ' ')) onclick(); }}
>
	<span class="score-value">{typeof score === 'number' && !Number.isInteger(score) ? score.toFixed(1) : score}</span>
</td>

<style>
	.cell-score {
		text-align: center;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 500;
		padding: var(--spacing-2) var(--spacing-3);
		position: relative;
		transition: background 0.1s;
	}

	.cell-score[role='button'] {
		cursor: pointer;
	}

	.cell-score[role='button']:hover {
		background: var(--color-felt-hover);
	}

	.cell-score:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
	}

	.score-value {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		line-height: 1;
	}

	.score-high .score-value {
		color: var(--color-score-high);
	}

	.score-mid .score-value {
		color: var(--color-ink-secondary);
	}

	.score-low .score-value {
		color: var(--color-score-low);
	}

	.score-best .score-value {
		background: var(--color-score-high-bg);
		font-weight: 700;
	}

	.has-notes::after {
		content: '';
		position: absolute;
		top: var(--spacing-1);
		right: var(--spacing-1);
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-vekt-dim);
	}

	/* Drilldown chevron for item-evaluated sub-criteria */
	.score-drilldown .score-value::after {
		content: '▾';
		font-size: 8px;
		color: var(--color-ink-ghost);
		margin-left: 2px;
		display: inline-block;
		transition: transform 0.15s;
	}

	.score-drilldown.expanded .score-value::after {
		transform: rotate(180deg);
	}
</style>
