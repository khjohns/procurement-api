<script lang="ts">
	import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';

	// ── Search state ──
	let searchQuery = $state('');
	let searchOpen = $state(false);

	interface MockProcurement {
		id: string;
		title: string;
		buyer: string;
		procedure: string;
		date: string;
		criteria: { name: string; type: string; weight: number }[];
		suppliers: string[];
	}

	const mockProcurements: MockProcurement[] = [
		{
			id: 'doffin-2026-100122',
			title: 'Rengjøring av tjenestebiler',
			buyer: 'Oslo kommune v/ Oslobygg KF',
			procedure: 'Åpen anbudskonkurranse',
			date: '2026-01-15',
			criteria: [
				{ name: 'Pris', type: 'price', weight: 30 },
				{ name: 'Kvalitet på tjenesten', type: 'quality', weight: 20 },
				{ name: 'Gjennomføring og logistikk', type: 'quality', weight: 20 },
				{ name: 'Miljø', type: 'quality', weight: 30 }
			],
			suppliers: ['ISS Facility Services AS', 'Coor Service Management AS', 'Sodexo AS']
		},
		{
			id: 'doffin-2026-100456',
			title: 'Rammeavtale IKT-konsulenttjenester 2026–2030',
			buyer: 'Bergen kommune',
			procedure: 'Konkurranse med forhandling',
			date: '2026-02-01',
			criteria: [
				{ name: 'Kompetanse og erfaring', type: 'quality', weight: 40 },
				{ name: 'Løsningsforslag', type: 'quality', weight: 30 },
				{ name: 'Pris', type: 'price', weight: 30 }
			],
			suppliers: ['Bouvet ASA', 'Sopra Steria AS', 'Knowit Obiwan AS', 'Capgemini Norge AS']
		},
		{
			id: 'doffin-2026-100789',
			title: 'Vedlikehold kommunale bygg 2026–2028',
			buyer: 'Trondheim kommune',
			procedure: 'Åpen anbudskonkurranse',
			date: '2026-02-10',
			criteria: [
				{ name: 'Pris', type: 'price', weight: 40 },
				{ name: 'Kvalifikasjoner og bemanning', type: 'quality', weight: 35 },
				{ name: 'Miljø og bærekraft', type: 'quality', weight: 25 }
			],
			suppliers: ['AF Gruppen ASA', 'Veidekke Industri AS']
		}
	];

	let searchResults = $derived.by(() => {
		if (searchQuery.trim().length < 2) return [];
		const q = searchQuery.toLowerCase();
		return mockProcurements.filter(
			(p) => p.title.toLowerCase().includes(q) || p.buyer.toLowerCase().includes(q)
		);
	});

	// ── Supplier input ──
	let addingSupplier = $state(false);
	let newSupplierName = $state('');

	// ── Contract value formatting ──
	let contractValueDisplay = $state('');
	const fmt = new Intl.NumberFormat('nb-NO');

	// Sync display when store value changes externally
	let lastContractValue = $state(0);
	$effect(() => {
		if (evaluation.data.contractValue !== lastContractValue) {
			lastContractValue = evaluation.data.contractValue;
			contractValueDisplay = evaluation.data.contractValue > 0
				? fmt.format(evaluation.data.contractValue)
				: '';
		}
	});

	function handleContractValueInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/\s/g, '');
		const num = parseInt(raw, 10);
		if (!isNaN(num) && num >= 0) {
			evaluation.setContractValue(num);
			contractValueDisplay = fmt.format(num);
		} else if (raw === '') {
			evaluation.setContractValue(0);
			contractValueDisplay = '';
		}
	}

	function handleContractValueBlur() {
		contractValueDisplay = evaluation.data.contractValue > 0
			? fmt.format(evaluation.data.contractValue)
			: '';
	}

	function handleContractValueFocus(e: Event) {
		const input = e.target as HTMLInputElement;
		contractValueDisplay = evaluation.data.contractValue > 0
			? String(evaluation.data.contractValue)
			: '';
		requestAnimationFrame(() => input.select());
	}

	// ── Derived weights ──
	let qualityWeight = $derived(
		evaluation.data.criteria
			.filter((c) => c.type === 'quality')
			.reduce((s, c) => s + c.weight, 0)
	);

	let priceWeight = $derived(
		evaluation.data.criteria
			.filter((c) => c.type === 'price')
			.reduce((s, c) => s + c.weight, 0)
	);

	// ── Import ──
	function importProcurement(proc: MockProcurement) {
		const hasData = evaluation.data.criteria.length > 0 || evaluation.data.suppliers.length > 0;
		if (hasData && !confirm('Importering vil overskrive eksisterende kriterier og leverandører. Fortsett?')) {
			return;
		}

		evaluation.setTitle(proc.title);
		evaluation.setReference(proc.id);

		// Build criteria + suppliers via initialize to set everything at once
		const suppliers = proc.suppliers.map((name) => ({
			id: `sup-${Math.random().toString(36).slice(2, 8)}`,
			name,
			price: undefined as number | undefined
		}));

		const criteria = proc.criteria.map((c) => {
			const cid = `c-${Math.random().toString(36).slice(2, 8)}`;
			return {
				id: cid,
				name: c.name,
				type: (c.type === 'price' ? 'price' : 'quality') as 'quality' | 'price',
				weight: c.weight,
				subcriteria: [
					{
						id: `${cid}-s-${Math.random().toString(36).slice(2, 8)}`,
						name: c.name,
						weight: c.weight,
						scores: {} as Record<string, number>,
						notes: {} as Record<string, string>
					}
				]
			};
		});

		const qw = criteria.filter((c) => c.type === 'quality').reduce((s, c) => s + c.weight, 0);
		const pw = criteria.filter((c) => c.type === 'price').reduce((s, c) => s + c.weight, 0);

		evaluation.initialize({
			id: proc.id,
			title: proc.title,
			procurementName: proc.title,
			reference: proc.id,
			status: 'Oppsett',
			qualityWeight: qw,
			priceWeight: pw,
			contractValue: evaluation.data.contractValue,
			suppliers,
			criteria
		});

		searchQuery = '';
		searchOpen = false;
	}

	// ── Supplier CRUD ──
	function addSupplier() {
		if (!newSupplierName.trim()) return;
		evaluation.addSupplier(newSupplierName.trim());
		newSupplierName = '';
		addingSupplier = false;
	}

	function handleWindowClick() {
		if (searchOpen) searchOpen = false;
	}

	// ── Validation ──
	let validationItems = $derived.by(() => {
		const items: string[] = [];
		if (!evaluation.data.title.trim()) items.push('Mangler tittel');
		if (evaluation.data.suppliers.length < 2) items.push('Minst 2 leverandører');
		if (evaluation.data.criteria.length === 0) items.push('Legg til kriterier');
		if (evaluation.totalWeight !== 100 && evaluation.data.criteria.length > 0) items.push('Vekting må summere til 100%');
		return items;
	});
</script>

<svelte:window onclick={handleWindowClick} />

<div class="setup-panel">
	<!-- Import search -->
	<div class="panel-section">
		<div class="panel-label">Importer</div>
		<div class="picker-wrap">
			<input
				class="picker-input"
				type="text"
				placeholder="Søk i Doffin..."
				bind:value={searchQuery}
				onfocus={() => { if (searchQuery.trim().length >= 2) searchOpen = true; }}
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => { if (e.key === 'Escape') searchOpen = false; }}
				oninput={() => { if (searchQuery.trim().length >= 2) searchOpen = true; }}
			/>
			{#if searchOpen && searchResults.length > 0}
				<div class="picker-results" onclick={(e) => e.stopPropagation()}>
					{#each searchResults as result}
						<button class="picker-result" onclick={() => importProcurement(result)}>
							<div class="picker-result-title">{result.title}</div>
							<div class="picker-result-meta">{result.buyer}</div>
							<div class="picker-result-criteria">
								{#each result.criteria as c}
									<span class="picker-chip">{c.name} <span class="picker-chip-w">{c.weight}%</span></span>
								{/each}
							</div>
						</button>
					{/each}
				</div>
			{/if}
			{#if searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0}
				<div class="picker-results" onclick={(e) => e.stopPropagation()}>
					<div class="picker-empty">Ingen treff</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Config fields -->
	<div class="panel-section">
		<div class="panel-label">Oppsett</div>
		<div class="field">
			<label class="field-label" for="sp-title">Tittel</label>
			<input
				id="sp-title"
				class="field-input"
				type="text"
				value={evaluation.data.title}
				oninput={(e) => evaluation.setTitle((e.target as HTMLInputElement).value)}
				placeholder="Evaluering av tilbud..."
			/>
		</div>
		<div class="field">
			<label class="field-label" for="sp-ref">Referanse</label>
			<input
				id="sp-ref"
				class="field-input field-input-mono"
				type="text"
				value={evaluation.data.reference}
				oninput={(e) => evaluation.setReference((e.target as HTMLInputElement).value)}
				placeholder="2026/1234"
			/>
		</div>
		<div class="field">
			<label class="field-label" for="sp-cv">Kontraktsverdi</label>
			<div class="field-row">
				<input
					id="sp-cv"
					class="field-input field-input-mono field-input-num"
					type="text"
					inputmode="numeric"
					value={contractValueDisplay}
					oninput={handleContractValueInput}
					onblur={handleContractValueBlur}
					onfocus={handleContractValueFocus}
					placeholder="0"
				/>
				<span class="field-unit">kr</span>
			</div>
		</div>
		<div class="field">
			<span class="field-label">Kvalitet / Pris</span>
			<div class="weight-split">
				<span class="weight-split-val">{qualityWeight}<span class="weight-split-pct">%</span></span>
				<span class="weight-split-sep">/</span>
				<span class="weight-split-val">{priceWeight}<span class="weight-split-pct">%</span></span>
			</div>
		</div>
	</div>

	<!-- Suppliers -->
	<div class="panel-section">
		<div class="panel-label">Leverandører</div>
		<div class="supplier-list">
			{#each evaluation.data.suppliers as supplier (supplier.id)}
				<div class="supplier-row">
					<input
						class="supplier-input"
						type="text"
						value={supplier.name}
						oninput={(e) => evaluation.renameSupplier(supplier.id, (e.target as HTMLInputElement).value)}
						placeholder="Navn"
					/>
					<button class="supplier-rm" onclick={() => evaluation.removeSupplier(supplier.id)} title="Fjern">×</button>
				</div>
			{/each}
			{#if addingSupplier}
				<div class="supplier-row supplier-row-new">
					<input
						class="supplier-input"
						type="text"
						placeholder="Leverandørnavn"
						bind:value={newSupplierName}
						onkeydown={(e) => {
							if (e.key === 'Enter') addSupplier();
							if (e.key === 'Escape') (addingSupplier = false);
						}}
					/>
					<button class="supplier-ok" onclick={addSupplier}>✓</button>
				</div>
			{:else}
				<button class="add-btn" onclick={() => { addingSupplier = true; requestAnimationFrame(() => { (document.querySelector('.supplier-row-new .supplier-input') as HTMLInputElement)?.focus(); }); }}>
					+ Leverandør
				</button>
			{/if}
		</div>
	</div>

	<!-- Validation status -->
	<div class="panel-section panel-status">
		{#if validationItems.length > 0}
			<div class="validation-list">
				{#each validationItems as item}
					<span class="validation-item">{item}</span>
				{/each}
			</div>
		{:else}
			<div class="validation-ok">Klar til evaluering</div>
		{/if}
	</div>
</div>

<style>
	.setup-panel {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
	}

	.panel-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.panel-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	/* ── Picker ── */
	.picker-wrap {
		position: relative;
	}

	.picker-input {
		width: 100%;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 11px;
		outline: none;
		transition: border-color 0.12s;
	}

	.picker-input:focus {
		border-color: var(--color-wire-focus);
	}

	.picker-input::placeholder {
		color: var(--color-ink-ghost);
	}

	.picker-results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 30;
		margin-top: var(--spacing-1);
		background: var(--color-felt-raised);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		overflow: hidden;
		max-height: 280px;
		overflow-y: auto;
	}

	.picker-result {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--spacing-2) var(--spacing-3);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-wire);
		cursor: pointer;
		transition: background 0.08s;
	}

	.picker-result:last-child {
		border-bottom: none;
	}

	.picker-result:hover {
		background: var(--color-felt-hover);
	}

	.picker-result-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-ink);
		margin-bottom: 2px;
	}

	.picker-result-meta {
		font-size: 10px;
		color: var(--color-ink-muted);
		margin-bottom: var(--spacing-1);
	}

	.picker-result-criteria {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.picker-chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 1px var(--spacing-1);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: 2px;
		font-size: 9px;
		color: var(--color-ink-secondary);
	}

	.picker-chip-w {
		font-family: var(--font-data);
		color: var(--color-vekt-dim);
		font-weight: 600;
	}

	.picker-empty {
		padding: var(--spacing-3);
		text-align: center;
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	/* ── Fields ── */
	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.field-label {
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
	}

	.field-input {
		padding: var(--spacing-2) var(--spacing-2);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 12px;
		outline: none;
		transition: border-color 0.12s;
	}

	.field-input:focus {
		border-color: var(--color-wire-focus);
	}

	.field-input::placeholder {
		color: var(--color-ink-ghost);
	}

	.field-input-mono {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.field-input-num {
		width: 100px;
		text-align: right;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
	}

	.field-unit {
		font-size: 10px;
		color: var(--color-ink-ghost);
		font-family: var(--font-data);
	}

	/* ── Weight split ── */
	.weight-split {
		display: inline-flex;
		align-items: baseline;
		gap: var(--spacing-2);
		padding: var(--spacing-2);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
	}

	.weight-split-val {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-vekt);
	}

	.weight-split-pct {
		font-size: 10px;
		font-weight: 400;
		color: var(--color-ink-ghost);
	}

	.weight-split-sep {
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	/* ── Suppliers ── */
	.supplier-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.supplier-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
	}

	.supplier-input {
		flex: 1;
		padding: var(--spacing-1) var(--spacing-2);
		background: none;
		border: none;
		border-bottom: 1px solid transparent;
		outline: none;
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 12px;
		transition: border-color 0.12s;
	}

	.supplier-input:focus {
		border-bottom-color: var(--color-wire-focus);
	}

	.supplier-input::placeholder {
		color: var(--color-ink-ghost);
	}

	.supplier-rm {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		opacity: 0;
		transition: all 0.1s;
	}

	.supplier-row:hover .supplier-rm {
		opacity: 1;
	}

	.supplier-rm:hover {
		color: var(--color-score-low);
		background: var(--color-felt-active);
	}

	.supplier-ok {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		color: var(--color-score-high);
		background: none;
		border: none;
		cursor: pointer;
	}

	.add-btn {
		padding: var(--spacing-1) var(--spacing-2);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: none;
		border: 1px dashed var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.12s;
		text-align: left;
	}

	.add-btn:hover {
		color: var(--color-vekt);
		border-color: var(--color-vekt-bg-strong);
		background: var(--color-vekt-bg);
	}

	/* ── Validation ── */
	.panel-status {
		margin-top: auto;
	}

	.validation-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.validation-item {
		font-size: 10px;
		color: var(--color-ink-muted);
		padding: var(--spacing-1) var(--spacing-2);
		background: var(--color-felt);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-wire);
	}

	.validation-ok {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-score-high);
		padding: var(--spacing-2);
		text-align: center;
	}
</style>
