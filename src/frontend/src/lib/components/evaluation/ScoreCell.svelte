<script lang="ts">
	import { scoreTier } from '$lib/stores/evaluation.svelte';

	interface Props {
		score: number;
		isBest?: boolean;
		hasNotes?: boolean;
		onclick?: () => void;
	}

	let { score, isBest = false, hasNotes = false, onclick }: Props = $props();
	let tier = $derived(scoreTier(score));
</script>

<td
	class="cell-score score-{tier}"
	class:score-best={isBest}
	class:has-notes={hasNotes}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={onclick}
	onkeydown={(e) => { if (onclick && (e.key === 'Enter' || e.key === ' ')) onclick(); }}
>
	<span class="score-value">{typeof score === 'number' && !Number.isInteger(score) ? score.toFixed(2) : score}</span>
</td>

<style>
	.cell-score {
		text-align: center;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 500;
		padding: var(--sp-2) var(--sp-3);
		position: relative;
		transition: background 0.1s;
	}

	.cell-score[role='button'] {
		cursor: pointer;
	}

	.cell-score[role='button']:hover {
		background: var(--felt-hover);
	}

	.score-value {
		display: inline-block;
		padding: var(--sp-1) var(--sp-2);
		border-radius: var(--r-sm);
		line-height: 1;
	}

	.score-high .score-value {
		color: var(--score-high);
	}

	.score-mid .score-value {
		color: var(--ink-secondary);
	}

	.score-low .score-value {
		color: var(--score-low);
	}

	.score-best .score-value {
		background: var(--score-high-bg);
		font-weight: 700;
	}

	.has-notes::after {
		content: '';
		position: absolute;
		top: var(--sp-1);
		right: var(--sp-1);
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--vekt-dim);
	}
</style>
