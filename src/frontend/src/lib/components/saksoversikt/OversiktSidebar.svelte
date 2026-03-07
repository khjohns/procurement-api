<script lang="ts">
	import type { AnskaffelsesOversiktItem, HendelseType, OversiktVisning } from '$lib/types/anskaffelse';

	interface Props {
		saker: AnskaffelsesOversiktItem[];
		visning: OversiktVisning;
		onvisning: (v: OversiktVisning) => void;
		aktivtSpor: HendelseType | null;
		onspor: (spor: HendelseType | null) => void;
	}

	let { saker, visning, onvisning, aktivtSpor, onspor }: Props = $props();

	const stats = $derived.by(() => {
		const telling: Record<HendelseType, number> = { U: 0, K: 0, F: 0, S: 0, T: 0, E: 0, P: 0 };
		const ubesvart: Record<HendelseType, number> = { U: 0, K: 0, F: 0, S: 0, T: 0, E: 0, P: 0 };

		for (const sak of saker) {
			for (const h of sak.hendelser) {
				telling[h.type]++;
				if (!h.besvart) ubesvart[h.type]++;
			}
		}

		return { telling, ubesvart };
	});

	const HENDELSE_CONFIG: { key: HendelseType; label: string }[] = [
		{ key: 'U', label: 'Utkast' },
		{ key: 'K', label: 'Kunngjort' },
		{ key: 'F', label: 'Forespørsler' },
		{ key: 'S', label: 'Sjekk' },
		{ key: 'T', label: 'Tilbud' },
		{ key: 'E', label: 'Evaluert' },
		{ key: 'P', label: 'Protokoll' },
	];

	function toggleSpor(spor: HendelseType) {
		onspor(aktivtSpor === spor ? null : spor);
	}
</script>

<aside class="sidebar" aria-label="Anskaffelsesoversikt">
	<!-- Identitet -->
	<div class="sidebar-section">
		<h2 class="prosjekt-navn">Anskaffelser</h2>
		<div class="sak-telling">
			<span class="telling-verdi">{saker.length}</span>
			<span class="telling-label">anskaffelser</span>
		</div>
	</div>

	<!-- Visning -->
	<div class="sidebar-section">
		<div class="section-label">Visning</div>
		<div class="visning-toggle">
			<button
				class="visning-btn"
				class:visning-aktiv={visning === 'tidslinje'}
				onclick={() => onvisning('tidslinje')}
				type="button"
			>Tidslinje</button>
			<button
				class="visning-btn"
				class:visning-aktiv={visning === 'tabell'}
				onclick={() => onvisning('tabell')}
				type="button"
			>Tabell</button>
		</div>
	</div>

	<!-- Hendelsesfilter -->
	<div class="sidebar-section sidebar-section-last">
		<div class="section-label">Hendelser</div>
		<div class="spor-knapper">
			{#each HENDELSE_CONFIG as { key, label } (key)}
				{#if stats.telling[key] > 0}
					<button
						class="spor-btn spor-{key.toLowerCase()}"
						class:spor-aktiv={aktivtSpor === key}
						onclick={() => toggleSpor(key)}
						type="button"
					>
						<span class="spor-ikon spor-ikon-{key.toLowerCase()}">{key}</span>
						<span class="spor-tekst">{label}</span>
						<span class="spor-tall">{stats.telling[key]}</span>
						{#if stats.ubesvart[key] > 0}
							<span class="spor-ubesvart">{stats.ubesvart[key]}</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	</div>
</aside>

<style>
	.sidebar {
		position: sticky;
		top: 0;
		height: 100%;
		width: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		border-right: 1px solid var(--color-wire-strong);
		background: var(--color-canvas);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-section {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-wire);
	}

	.sidebar-section-last {
		border-bottom: none;
	}

	.prosjekt-navn {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0 0 2px 0;
		line-height: 1.4;
	}

	.sak-telling {
		margin-top: 12px;
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.telling-verdi {
		font-family: var(--font-data);
		font-size: 20px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		line-height: 1;
	}

	.telling-label {
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.section-label {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin-bottom: 12px;
	}

	/* Visning toggle */
	.visning-toggle {
		display: flex;
		gap: 1px;
		background: var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.visning-btn {
		flex: 1;
		padding: 8px 12px;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		border: none;
		cursor: pointer;
		background: var(--color-felt);
		color: var(--color-ink-ghost);
		transition: background 150ms, color 150ms;
	}

	.visning-btn:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink-secondary);
	}

	.visning-aktiv {
		background: var(--color-felt-active);
		color: var(--color-ink);
		font-weight: 600;
	}

	/* Hendelsesfilter-knapper */
	.spor-knapper {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.spor-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink-secondary);
		transition: background 150ms, border-color 150ms, color 150ms;
		width: 100%;
		text-align: left;
	}

	.spor-btn:hover {
		background: var(--color-felt);
		border-color: var(--color-wire);
	}

	.spor-aktiv {
		background: var(--color-felt);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.spor-ikon {
		width: 16px;
		height: 16px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* Node-farger for ikoner */
	.spor-ikon-u { border: 1px solid var(--color-ink-ghost); color: var(--color-ink-muted); }
	.spor-ikon-k { border: 1px solid var(--color-ink-secondary); color: var(--color-ink-secondary); }
	.spor-ikon-f { border: 1px solid var(--color-vekt); color: var(--color-vekt); }
	.spor-ikon-s { border: 1px solid var(--color-score-high); color: var(--color-score-high); }
	.spor-ikon-t { border: 1px solid var(--color-vekt); color: var(--color-vekt); }
	.spor-ikon-e { border: 1px solid var(--color-score-high); color: var(--color-score-high); }
	.spor-ikon-p { border: 1px solid var(--color-ink); color: var(--color-ink); }

	/* Aktiv: filled */
	.spor-aktiv .spor-ikon-u { background: var(--color-ink-ghost); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-k { background: var(--color-ink-secondary); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-f { background: var(--color-vekt); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-s { background: var(--color-score-high); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-t { background: var(--color-vekt); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-e { background: var(--color-score-high); color: var(--color-canvas); }
	.spor-aktiv .spor-ikon-p { background: var(--color-ink); color: var(--color-canvas); }

	.spor-tekst {
		flex: 1;
	}

	.spor-tall {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
	}

	.spor-ubesvart {
		font-family: var(--font-data);
		font-size: 9px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-canvas);
		background: var(--color-vekt);
		border-radius: 1px;
		padding: 1px 4px;
		line-height: 1.2;
	}

	@media (max-width: 1023px) {
		.sidebar {
			width: 100%;
		}

		.sidebar-section {
			padding: 12px 16px;
		}
	}
</style>
