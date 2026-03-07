<script lang="ts">
	import { browser } from '$app/environment';
	import Saksoversikt from '$lib/components/saksoversikt/Saksoversikt.svelte';
	import OversiktSidebar from '$lib/components/saksoversikt/OversiktSidebar.svelte';
	import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';
	import type { AnskaffelsesOversiktItem, HendelseType, OversiktVisning } from '$lib/types/anskaffelse';

	const STORAGE_KEY = 'anskaffelser-visning';

	// ── API data ──

	let alleMature = $state<AnskaffelsesOversiktItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		fetch('/api/procurements/mature')
			.then((r) => (r.ok ? r.json() : Promise.reject('Feil ved henting')))
			.then((data: { id: number; sequenceId: string; name: string; procedure: string; threshold: string; deadline: string }[]) => {
				alleMature = data.map((p) => ({
					...p,
					hendelser: [
						{ type: 'K' as const, dato: new Date().toISOString(), label: 'Kunngjort', besvart: true },
						...(p.deadline
							? [{ type: 'T' as const, dato: new Date(p.deadline).toISOString(), label: `Tilbudsfrist ${p.deadline}`, besvart: false }]
							: []),
					],
				}));
				loading = false;
			})
			.catch((e) => {
				error = String(e);
				loading = false;
			});
	});

	// ── View state ──

	let visning = $state<OversiktVisning>(
		browser ? (localStorage.getItem(STORAGE_KEY) as OversiktVisning) ?? 'tidslinje' : 'tidslinje'
	);

	let sidebarOpen = $state(false);
	let sidebarSpor = $state<HendelseType | null>(null);
	let tastaturSpor = $state<HendelseType | null>(null);
	const aktivtSpor = $derived(tastaturSpor ?? sidebarSpor);

	const HENDELSE_TASTER: Record<string, HendelseType> = { u: 'U', k: 'K', f: 'F', s: 'S', t: 'T', e: 'E', p: 'P' };

	function byttVisning(v: OversiktVisning) {
		visning = v;
		if (browser) localStorage.setItem(STORAGE_KEY, v);
	}

	function byttSpor(spor: HendelseType | null) {
		sidebarSpor = spor;
	}

	function erRedigerbart(target: EventTarget | null): boolean {
		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
		return target instanceof Element && target.closest('[contenteditable="true"]') !== null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (erRedigerbart(e.target)) return;
		if (e.repeat) return;
		const spor = HENDELSE_TASTER[e.key.toLowerCase()];
		if (spor) tastaturSpor = spor;
	}

	function handleKeyup(e: KeyboardEvent) {
		const spor = HENDELSE_TASTER[e.key.toLowerCase()];
		if (spor && tastaturSpor === spor) tastaturSpor = null;
	}

	function handleBlur() {
		tastaturSpor = null;
	}

	const sidebarProps = $derived({
		saker: alleMature,
		visning,
		onvisning: byttVisning,
		aktivtSpor,
		onspor: byttSpor,
	});
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} onblur={handleBlur} />

<div class="page-layout">
	<!-- Desktop sidebar -->
	<div class="desktop-sidebar">
		<OversiktSidebar {...sidebarProps} />
	</div>

	<!-- Mobile toggle -->
	<button
		class="sidebar-toggle"
		class:er-open={sidebarOpen}
		onclick={() => (sidebarOpen = !sidebarOpen)}
		aria-label={sidebarOpen ? 'Skjul meny' : 'Vis meny'}
	>
		{sidebarOpen ? '\u2715' : '\u2630'}
	</button>

	<!-- Mobile drawer -->
	{#if sidebarOpen}
		<div class="sidebar-backdrop" role="presentation" onclick={() => (sidebarOpen = false)}></div>
		<div class="sidebar-drawer">
			<OversiktSidebar {...sidebarProps} />
		</div>
	{/if}

	<div class="page-content">
		{#if loading}
			<div class="state-message" role="status" aria-live="polite">
				<span class="state-text">Laster anskaffelser...</span>
			</div>
		{:else if error}
			<div class="state-message state-error" role="alert">
				<span class="state-text">
					Kunne ikke laste anskaffelser. {error}
				</span>
			</div>
		{:else if alleMature.length === 0}
			<div class="state-message" role="status">
				<span class="state-text">Ingen anskaffelser funnet.</span>
			</div>
		{:else if visning === 'tidslinje'}
			<Saksoversikt saker={alleMature} {aktivtSpor} />
		{:else}
			<div class="tabell-wrap">
				<CaseListTable saker={alleMature} />
			</div>
		{/if}
	</div>
</div>

<style>
	.page-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.page-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.tabell-wrap {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-6);
		max-width: 1200px;
	}

	.state-message {
		padding: var(--spacing-8) var(--spacing-4);
		text-align: center;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.state-text {
		font-size: 13px;
		color: var(--color-ink-muted);
	}

	.state-error .state-text {
		color: var(--color-score-low);
	}

	/* Mobile */
	.sidebar-toggle {
		display: none;
	}

	.sidebar-backdrop {
		display: none;
	}

	.sidebar-drawer {
		display: none;
	}

	@media (max-width: 1023px) {
		.desktop-sidebar {
			display: none;
		}

		.sidebar-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			position: fixed;
			top: 8px;
			left: 16px;
			z-index: 26;
			width: 30px;
			height: 30px;
			background: var(--color-felt);
			border: 1px solid var(--color-wire-strong);
			border-radius: var(--radius-sm);
			color: var(--color-ink-secondary);
			font-size: 16px;
			cursor: pointer;
			line-height: 1;
			transition: background 150ms, color 150ms;
		}

		.sidebar-toggle:hover,
		.sidebar-toggle.er-open {
			background: var(--color-felt-active);
			color: var(--color-ink);
		}

		.sidebar-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 21;
			background: rgba(0, 0, 0, 0.45);
		}

		.sidebar-drawer {
			display: flex;
			position: fixed;
			left: 0;
			top: 0;
			height: 100vh;
			z-index: 22;
			width: 280px;
		}
	}
</style>
