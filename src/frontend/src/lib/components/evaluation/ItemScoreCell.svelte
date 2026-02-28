<script lang="ts">
	import { scoreTier } from '$lib/stores/evaluation.svelte';

	interface Props {
		score: number;
		isBest?: boolean;
		onchange: (value: number) => void;
	}

	let { score, isBest = false, onchange }: Props = $props();
	let editing = $state(false);
	let tier = $derived(scoreTier(score));

	function selectScore(value: number) {
		onchange(value);
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editing = false;
			return;
		}
		const num = parseInt(e.key);
		if (!isNaN(num) && num >= 0 && num <= 9) {
			selectScore(num);
		}
	}

	function handleWindowClick() {
		if (editing) editing = false;
	}
</script>

<svelte:window onclick={handleWindowClick} />

<td class="item-score-cell">
	<button
		class="item-score tier-{tier}"
		class:score-best={isBest}
		onclick={(e) => { e.stopPropagation(); editing = !editing; }}
		onkeydown={handleKeydown}
	>
		{score}
	</button>

	{#if editing}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="score-popover" onmousedown={(e) => e.stopPropagation()}>
			{#each Array.from({ length: 11 }, (_, i) => i) as seg}
				<button
					class="pop-seg"
					class:seg-filled={seg < score}
					class:seg-active={seg === score}
					onclick={(e) => { e.stopPropagation(); selectScore(seg); }}
				>
					{seg}
				</button>
			{/each}
		</div>
	{/if}
</td>

<style>
	.item-score-cell {
		position: relative;
		padding: var(--sp-1);
		text-align: center;
	}

	.item-score {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 500;
		min-width: 36px;
		height: 28px;
		padding: 0 var(--sp-2);
		border-radius: var(--r-sm);
		border: 1px solid transparent;
		background: none;
		cursor: pointer;
		transition: background 0.1s;
	}

	.item-score:hover {
		background: var(--felt-hover);
		border-color: var(--wire);
	}

	.item-score:focus-visible {
		outline: none;
		border-color: var(--wire-focus);
	}

	.tier-high { color: var(--score-high); }
	.tier-mid { color: var(--ink-secondary); }
	.tier-low { color: var(--score-low); }

	.score-best {
		background: var(--score-high-bg);
		font-weight: 700;
	}

	/* Compact popover */
	.score-popover {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		display: flex;
		gap: 1px;
		padding: var(--sp-1);
		background: var(--felt-raised);
		border: 1px solid var(--wire-strong);
		border-radius: var(--r-sm);
		/* borders-only depth: no box-shadow */
	}

	.pop-seg {
		width: 22px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 500;
		color: var(--ink-muted);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.08s;
	}

	.pop-seg:hover {
		background: var(--felt-hover);
		border-color: var(--wire-strong);
		color: var(--ink);
	}

	.seg-filled {
		background: var(--score-high-bg);
		border-color: var(--score-high-bg);
		color: var(--score-high);
	}

	.seg-active {
		background: var(--score-high);
		border-color: var(--score-high);
		color: var(--ink);
		font-weight: 700;
	}
</style>
