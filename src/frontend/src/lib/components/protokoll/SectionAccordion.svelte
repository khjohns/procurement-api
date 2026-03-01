<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { ResolvedSection } from '$lib/stores/protokoll.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		section: ResolvedSection;
		open: boolean;
		ontoggle: () => void;
		children: Snippet;
	}

	let { section, open, ontoggle, children }: Props = $props();

	let badge = $derived.by(() => {
		const isAutoSource = section.dataSource === 'api' || section.dataSource === 'eforms';
		const configs: Record<string, { label: string; cssClass: string }> = {
			complete: { label: isAutoSource ? 'AUTO' : 'OK', cssClass: 'badge-complete' },
			partial: { label: 'DELVIS', cssClass: 'badge-partial' },
			empty: { label: 'MANGLER', cssClass: 'badge-empty' },
			na: { label: 'N/A', cssClass: 'badge-na' }
		};
		return configs[section.status] ?? configs.empty;
	});

	let statusLabel = $derived(badge.label);

	let panelId = $derived(`section-panel-${section.id}`);
	let headerId = $derived(`section-header-${section.id}`);
</script>

<div class="section-accordion">
	<button
		id={headerId}
		class="section-header"
		class:section-header-open={open}
		onclick={ontoggle}
		aria-expanded={open}
		aria-controls={panelId}
		aria-label={`Seksjon ${section.sectionNumber}, ${section.title}, ${badge.label}`}
	>
		<span class="chevron" class:chevron-open={open}>&#9656;</span>
		<span class="section-number">{section.sectionNumber}</span>
		<span class="section-title">{section.title}</span>
		<span class="badge {badge.cssClass}">
			{section.status === 'complete' ? '✓' : section.status === 'partial' ? '◐' : section.status === 'empty' ? '○' : '—'}
			{statusLabel}
		</span>
	</button>

	{#if open}
		<div
			id={panelId}
			class="section-content"
			role="region"
			aria-labelledby={headerId}
			transition:slide={{ duration: 200 }}
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.section-accordion {
		border-bottom: 1px solid var(--color-wire);
	}

	.section-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		width: 100%;
		padding: 10px var(--spacing-4);
		background: var(--color-canvas);
		border: none;
		cursor: pointer;
		transition: background-color 0.12s;
		text-align: left;
		font-family: var(--font-ui);
	}

	.section-header:hover {
		background: var(--color-felt);
	}

	.section-header:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1px var(--color-wire-focus);
	}

	.section-header-open {
		background: var(--color-felt);
	}

	.chevron {
		font-size: 10px;
		color: var(--color-ink-ghost);
		transition: transform 150ms ease-out;
		flex-shrink: 0;
		width: 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.chevron-open {
		transform: rotate(90deg);
	}

	.section-number {
		font-family: var(--font-data);
		font-size: 13px;
		color: var(--color-ink-muted);
		font-variant-numeric: tabular-nums;
		min-width: 20px;
		flex-shrink: 0;
	}

	.section-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
		flex: 1;
		min-width: 0;
	}

	.badge {
		flex-shrink: 0;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.badge-complete {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.badge-partial {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
	}

	.badge-empty {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.badge-na {
		color: var(--color-ink-ghost);
		background: transparent;
	}

	.section-content {
		padding: var(--spacing-4) var(--spacing-4) var(--spacing-5) 48px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
	}
</style>
