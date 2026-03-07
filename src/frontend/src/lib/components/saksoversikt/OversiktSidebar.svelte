<script lang="ts">
	import type {
		AnskaffelsesOversiktItem,
		AnskaffelsesFilter,
		HendelseType,
		OversiktVisning,
		StatusFilter,
	} from '$lib/types/anskaffelse';

	interface Props {
		/** Alle ufiltrerte saker — brukes til å beregne tilgjengelige filtervalg */
		alleSaker: AnskaffelsesOversiktItem[];
		/** Filtrerte saker — brukes til telling */
		saker: AnskaffelsesOversiktItem[];
		visning: OversiktVisning;
		onvisning: (v: OversiktVisning) => void;
		aktivtSpor: HendelseType | null;
		onspor: (spor: HendelseType | null) => void;
		filter: AnskaffelsesFilter;
		onfilter: (f: AnskaffelsesFilter) => void;
	}

	let { alleSaker, saker, visning, onvisning, aktivtSpor, onspor, filter, onfilter }: Props = $props();

	// ── Tilgjengelige filtervalg (beregnet fra alle, ikke filtrerte) ──

	const tilgjengelig = $derived.by(() => {
		const prosedyrer = new Map<string, number>();
		const terskler = new Map<string, number>();
		const personer = new Map<string, number>();
		let rammeavtaler = 0;
		let pågående = 0;
		let tildelt = 0;

		for (const sak of alleSaker) {
			// Prosedyre
			prosedyrer.set(sak.procedure, (prosedyrer.get(sak.procedure) ?? 0) + 1);
			// Terskel
			terskler.set(sak.threshold, (terskler.get(sak.threshold) ?? 0) + 1);
			// Saksbehandler
			if (sak.contactPerson) {
				personer.set(sak.contactPerson, (personer.get(sak.contactPerson) ?? 0) + 1);
			}
			// Status
			if (sak.awarded) tildelt++;
			else pågående++;
			// Rammeavtale
			if (sak.framework) rammeavtaler++;
		}

		return { prosedyrer, terskler, personer, rammeavtaler, pågående, tildelt };
	});

	// ── Hendelsesstatistikk (fra filtrerte) ──

	const hendelseStats = $derived.by(() => {
		const telling: Record<HendelseType, number> = { U: 0, K: 0, F: 0, S: 0, T: 0, E: 0, P: 0 };
		const ubesvart: Record<HendelseType, number> = { U: 0, K: 0, F: 0, S: 0, T: 0, E: 0, P: 0 };
		for (const sak of saker) {
			for (const h of sak.hendelser) {
				if (!h.type) continue;
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

	const STATUS_CONFIG: { key: StatusFilter; label: string }[] = [
		{ key: 'alle', label: 'Alle' },
		{ key: 'pågående', label: 'Pågående' },
		{ key: 'tildelt', label: 'Tildelt' },
	];

	// ── Helpers ──

	function setStatus(s: StatusFilter) {
		onfilter({ ...filter, status: s });
	}

	function toggleProsedyre(p: string) {
		const next = new Set(filter.prosedyrer);
		if (next.has(p)) next.delete(p);
		else next.add(p);
		onfilter({ ...filter, prosedyrer: next });
	}

	function toggleTerskel(t: string) {
		const next = new Set(filter.terskler);
		if (next.has(t)) next.delete(t);
		else next.add(t);
		onfilter({ ...filter, terskler: next });
	}

	function toggleRammeavtale() {
		onfilter({ ...filter, rammeavtale: filter.rammeavtale === true ? null : true });
	}

	function togglePerson(p: string) {
		const next = new Set(filter.saksbehandlere);
		if (next.has(p)) next.delete(p);
		else next.add(p);
		onfilter({ ...filter, saksbehandlere: next });
	}

	function toggleSpor(spor: HendelseType) {
		onspor(aktivtSpor === spor ? null : spor);
	}

	const harAktiveFilter = $derived(
		filter.status !== 'alle' ||
		filter.prosedyrer.size > 0 ||
		filter.terskler.size > 0 ||
		filter.rammeavtale !== null ||
		filter.saksbehandlere.size > 0
	);

	function nullstillFilter() {
		onfilter({
			status: 'alle',
			prosedyrer: new Set(),
			terskler: new Set(),
			rammeavtale: null,
			saksbehandlere: new Set(),
		});
	}
</script>

<aside class="sidebar" aria-label="Anskaffelsesoversikt">
	<!-- Identitet + telling -->
	<div class="sidebar-section">
		<h2 class="prosjekt-navn">Anskaffelser</h2>
		<div class="sak-telling">
			<span class="telling-verdi">{saker.length}</span>
			{#if saker.length !== alleSaker.length}
				<span class="telling-label">av {alleSaker.length}</span>
			{:else}
				<span class="telling-label">anskaffelser</span>
			{/if}
		</div>
		{#if harAktiveFilter}
			<button class="nullstill-btn" onclick={nullstillFilter} type="button">
				Nullstill filter
			</button>
		{/if}
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

	<!-- Status -->
	<div class="sidebar-section">
		<div class="section-label">Status</div>
		<div class="chip-group">
			{#each STATUS_CONFIG as { key, label } (key)}
				{@const count = key === 'alle' ? alleSaker.length : key === 'pågående' ? tilgjengelig.pågående : tilgjengelig.tildelt}
				<button
					class="chip"
					class:chip-aktiv={filter.status === key}
					onclick={() => setStatus(key)}
					type="button"
				>
					{label}
					<span class="chip-tall">{count}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Prosedyre -->
	{#if tilgjengelig.prosedyrer.size > 1}
		<div class="sidebar-section">
			<div class="section-label">Prosedyre</div>
			<div class="chip-group">
				{#each [...tilgjengelig.prosedyrer].sort((a, b) => b[1] - a[1]) as [prosedyre, count] (prosedyre)}
					<button
						class="chip"
						class:chip-aktiv={filter.prosedyrer.has(prosedyre)}
						onclick={() => toggleProsedyre(prosedyre)}
						type="button"
					>
						{prosedyre}
						<span class="chip-tall">{count}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Terskel -->
	{#if tilgjengelig.terskler.size > 1}
		<div class="sidebar-section">
			<div class="section-label">Terskel</div>
			<div class="chip-group">
				{#each [...tilgjengelig.terskler].sort((a, b) => b[1] - a[1]) as [terskel, count] (terskel)}
					<button
						class="chip"
						class:chip-aktiv={filter.terskler.has(terskel)}
						onclick={() => toggleTerskel(terskel)}
						type="button"
					>
						{terskel}
						<span class="chip-tall">{count}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Rammeavtale -->
	{#if tilgjengelig.rammeavtaler > 0}
		<div class="sidebar-section">
			<div class="section-label">Type</div>
			<div class="chip-group">
				<button
					class="chip"
					class:chip-aktiv={filter.rammeavtale === true}
					onclick={toggleRammeavtale}
					type="button"
				>
					Rammeavtale
					<span class="chip-tall">{tilgjengelig.rammeavtaler}</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Saksbehandler -->
	{#if tilgjengelig.personer.size > 0}
		<div class="sidebar-section">
			<div class="section-label">Saksbehandler</div>
			<div class="chip-group">
				{#each [...tilgjengelig.personer].sort((a, b) => b[1] - a[1]) as [person, count] (person)}
					<button
						class="chip"
						class:chip-aktiv={filter.saksbehandlere.has(person)}
						onclick={() => togglePerson(person)}
						type="button"
					>
						{person}
						<span class="chip-tall">{count}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Hendelsesfilter -->
	<div class="sidebar-section sidebar-section-last">
		<div class="section-label">Hendelser</div>
		<div class="spor-knapper">
			{#each HENDELSE_CONFIG as { key, label } (key)}
				{#if hendelseStats.telling[key] > 0}
					<button
						class="spor-btn spor-{key.toLowerCase()}"
						class:spor-aktiv={aktivtSpor === key}
						onclick={() => toggleSpor(key)}
						type="button"
					>
						<span class="spor-ikon spor-ikon-{key.toLowerCase()}">{key}</span>
						<span class="spor-tekst">{label}</span>
						<span class="spor-tall">{hendelseStats.telling[key]}</span>
						{#if hendelseStats.ubesvart[key] > 0}
							<span class="spor-ubesvart">{hendelseStats.ubesvart[key]}</span>
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

	.nullstill-btn {
		display: block;
		margin-top: 8px;
		padding: 0;
		background: none;
		border: none;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-vekt);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.nullstill-btn:hover {
		color: var(--color-ink);
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

	/* Chip-group (filter chips) */
	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: transparent;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-ink-secondary);
		transition: background 150ms, border-color 150ms, color 150ms;
		white-space: nowrap;
	}

	.chip:hover {
		background: var(--color-felt);
		border-color: var(--color-wire-strong);
	}

	.chip-aktiv {
		background: var(--color-felt-active);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
		font-weight: 600;
	}

	.chip-tall {
		font-family: var(--font-data);
		font-size: 9px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
	}

	.chip-aktiv .chip-tall {
		color: var(--color-ink-secondary);
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

	/* Per-type color via CSS custom properties from app.css */
	.spor-ikon-u { --nc: var(--node-u); }
	.spor-ikon-k { --nc: var(--node-k); }
	.spor-ikon-f { --nc: var(--node-f); }
	.spor-ikon-s { --nc: var(--node-s); }
	.spor-ikon-t { --nc: var(--node-t); }
	.spor-ikon-e { --nc: var(--node-e); }
	.spor-ikon-p { --nc: var(--node-p); }

	.spor-ikon { border: 1px solid var(--nc); color: var(--nc); }
	.spor-aktiv .spor-ikon { background: var(--nc); color: var(--color-canvas); }

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
