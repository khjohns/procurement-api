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
		padding: var(--spacing-1);
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
		padding: 0 var(--spacing-2);
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: none;
		cursor: pointer;
		transition: background 0.1s;
	}

	.item-score:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire);
	}

	.item-score:focus-visible {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	.tier-high { color: var(--color-score-high); }
	.tier-mid { color: var(--color-ink-secondary); }
	.tier-low { color: var(--color-score-low); }

	.score-best {
		background: var(--color-score-high-bg);
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
		padding: var(--spacing-1);
		background: var(--color-felt-raised);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
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
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.08s;
	}

	.pop-seg:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.seg-filled {
		background: var(--color-score-high-bg);
		border-color: var(--color-score-high-bg);
		color: var(--color-score-high);
	}

	.seg-active {
		background: var(--color-score-high);
		border-color: var(--color-score-high);
		color: var(--color-ink);
		font-weight: 700;
	}
</style>
