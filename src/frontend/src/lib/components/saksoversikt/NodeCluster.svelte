<script lang="ts">
	import type { TidslinjeNode } from '$lib/utils/tidslinje';
	import { klyngePrioritet } from '$lib/utils/tidslinje';
	import type { HendelseType } from '$lib/types/anskaffelse';

	interface Props {
		items: TidslinjeNode[];
		pos: number;
		aktivtSpor?: HendelseType | null;
	}

	let { items, pos, aktivtSpor = null }: Props = $props();

	const tagType = $derived(klyngePrioritet(items));
	const harFlere = $derived(items.length > 1);

	const erDimmet = $derived(
		aktivtSpor !== null && !items.some((i) => i.type === aktivtSpor)
	);
</script>

<div
	class="klynge"
	class:klynge-fler={harFlere}
	class:klynge-dim={erDimmet}
	style:left="{pos}%"
	title={items.map((i) => `${i.type}: ${i.label}`).join('\n')}
>
	{#each items as item, idx (idx)}
		<div
			class="node node-{item.type.toLowerCase()}"
			class:node-besvart={item.besvart}
			class:node-ubesvart={!item.besvart}
			class:node-spor-dim={aktivtSpor !== null && item.type !== aktivtSpor}
		>{item.type}</div>
	{/each}
	{#if harFlere}
		<div class="klynge-tag tag-{tagType.toLowerCase()}">{items.length}</div>
	{/if}
</div>

<style>
	.klynge {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		width: 28px;
		height: 28px;
		transform: translateX(-50%);
		transition: opacity 200ms ease;
	}

	.klynge-dim {
		opacity: 0.15;
	}

	.node {
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-wire-strong);
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		color: var(--color-ink-secondary);
		transition: transform 200ms cubic-bezier(0.19, 1, 0.22, 1), opacity 200ms ease;
		position: absolute;
	}

	/* ── Ubesvart: filled — krever oppmerksomhet ── */
	.node-ubesvart.node-u {
		background: var(--color-ink-ghost);
		border-color: var(--color-ink-ghost);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-k {
		background: var(--color-ink-secondary);
		border-color: var(--color-ink-secondary);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-f {
		background: var(--color-vekt);
		border-color: var(--color-vekt);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-s {
		background: var(--color-score-high);
		border-color: var(--color-score-high);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-t {
		background: var(--color-vekt);
		border-color: var(--color-vekt);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-e {
		background: var(--color-score-high);
		border-color: var(--color-score-high);
		color: var(--color-canvas);
	}
	.node-ubesvart.node-p {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-canvas);
	}

	/* ── Besvart: outline, dimmed — ferdig ── */
	.node-besvart.node-u {
		background: var(--color-canvas);
		border-color: var(--color-ink-ghost);
		color: var(--color-ink-muted);
		opacity: 0.6;
	}
	.node-besvart.node-k {
		background: var(--color-canvas);
		border-color: var(--color-ink-secondary);
		color: var(--color-ink-muted);
		opacity: 0.6;
	}
	.node-besvart.node-f {
		background: var(--color-canvas);
		border-color: var(--color-vekt-dim);
		color: var(--color-vekt-dim);
		opacity: 0.6;
	}
	.node-besvart.node-s {
		background: var(--color-canvas);
		border-color: var(--color-score-high);
		color: var(--color-score-high);
		opacity: 0.6;
	}
	.node-besvart.node-t {
		background: var(--color-canvas);
		border-color: var(--color-vekt-dim);
		color: var(--color-vekt-dim);
		opacity: 0.6;
	}
	.node-besvart.node-e {
		background: var(--color-canvas);
		border-color: var(--color-score-high);
		color: var(--color-score-high);
		opacity: 0.6;
	}
	.node-besvart.node-p {
		background: var(--color-canvas);
		border-color: var(--color-ink);
		color: var(--color-ink);
		opacity: 0.6;
	}

	/* Per-node dimming when spor filter is active */
	.node-spor-dim {
		opacity: 0.12 !important;
	}

	/* Explosion on hover — multi-node clusters */
	.klynge-fler:hover {
		z-index: 50;
	}
	.klynge-fler:hover .node:nth-child(1) {
		transform: translate(-8px, -8px);
	}
	.klynge-fler:hover .node:nth-child(2) {
		transform: translate(8px, -8px);
	}
	.klynge-fler:hover .node:nth-child(3) {
		transform: translate(0px, 8px);
	}

	.klynge-tag {
		position: absolute;
		top: -3px;
		right: -3px;
		min-width: 12px;
		height: 12px;
		padding: 0 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 7px;
		font-weight: 800;
		color: var(--color-canvas);
		z-index: 30;
		border-radius: 1px;
		transform: translate(25%, -25%);
	}

	.tag-u { background: var(--color-ink-ghost); }
	.tag-k { background: var(--color-ink-secondary); }
	.tag-f { background: var(--color-vekt); }
	.tag-s { background: var(--color-score-high); }
	.tag-t { background: var(--color-vekt); }
	.tag-e { background: var(--color-score-high); }
	.tag-p { background: var(--color-ink); }
</style>
