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

	/* Per-type color via CSS custom properties from app.css */
	.node-u { --nc: var(--node-u); }
	.node-k { --nc: var(--node-k); }
	.node-f { --nc: var(--node-f); }
	.node-s { --nc: var(--node-s); }
	.node-t { --nc: var(--node-t); }
	.node-e { --nc: var(--node-e); }
	.node-p { --nc: var(--node-p); }

	/* Ubesvart: filled */
	.node-ubesvart {
		background: var(--nc);
		border-color: var(--nc);
		color: var(--color-canvas);
	}

	/* Besvart: outline, dimmed */
	.node-besvart {
		background: var(--color-canvas);
		border-color: var(--nc);
		color: var(--nc);
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

	.tag-u { background: var(--node-u); }
	.tag-k { background: var(--node-k); }
	.tag-f { background: var(--node-f); }
	.tag-s { background: var(--node-s); }
	.tag-t { background: var(--node-t); }
	.tag-e { background: var(--node-e); }
	.tag-p { background: var(--node-p); }
</style>
