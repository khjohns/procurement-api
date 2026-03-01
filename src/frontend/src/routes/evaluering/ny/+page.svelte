<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import {
		evaluation,
		type EvaluationData,
		type Criterion,
		type SubCriterion,
		type Supplier
	} from '$lib/stores/evaluation.svelte';

	// ── Local setup state ──

	let title = $state('');
	let reference = $state('');
	let contractValue = $state(0);
	let contractValueDisplay = $state('');
	let suppliers = $state<{ id: string; name: string; price: number }[]>([]);
	let criteria = $state<SetupCriterion[]>([]);

	// Procurement search
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let searchResults = $state<MockProcurement[]>([]);

	// New supplier input
	let addingSupplier = $state(false);
	let newSupplierName = $state('');

	// ── Navigation guard ──

	let isDirty = $derived(
		title.trim().length > 0 ||
		suppliers.length > 0 ||
		criteria.length > 0
	);

	beforeNavigate(({ cancel }) => {
		if (isDirty && !confirm('Du har ulagrede endringer. Vil du forlate siden?')) {
			cancel();
		}
	});

	interface SetupSubCriterion {
		id: string;
		name: string;
		weight: number;
	}

	interface SetupCriterion {
		id: string;
		name: string;
		type: 'quality' | 'price';
		subcriteria: SetupSubCriterion[];
	}

	interface MockProcurement {
		id: string;
		title: string;
		buyer: string;
		procedure: string;
		date: string;
		criteria: { name: string; type: string; weight: number }[];
		suppliers: string[];
	}

	// ── Mock procurement data ──

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

	// ── Contract value formatting ──

	const fmt = new Intl.NumberFormat('nb-NO');

	function handleContractValueInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/\s/g, '');
		const num = parseInt(raw, 10);
		if (!isNaN(num) && num >= 0) {
			contractValue = num;
			contractValueDisplay = fmt.format(num);
		} else if (raw === '') {
			contractValue = 0;
			contractValueDisplay = '';
		}
	}

	function handleContractValueBlur() {
		contractValueDisplay = contractValue > 0 ? fmt.format(contractValue) : '';
	}

	function handleContractValueFocus(e: Event) {
		const input = e.target as HTMLInputElement;
		contractValueDisplay = contractValue > 0 ? String(contractValue) : '';
		requestAnimationFrame(() => input.select());
	}

	// ── ID generation ──

	let idCounter = 0;
	function uid(prefix: string): string {
		return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
	}

	// ── Derived state ──

	let qualityWeight = $derived(
		criteria
			.filter((c) => c.type === 'quality')
			.flatMap((c) => c.subcriteria)
			.reduce((s, sub) => s + sub.weight, 0)
	);

	let priceWeight = $derived(
		criteria
			.filter((c) => c.type === 'price')
			.flatMap((c) => c.subcriteria)
			.reduce((s, sub) => s + sub.weight, 0)
	);

	let groupWeights = $derived(
		criteria.map((c) => ({
			id: c.id,
			sum: c.subcriteria.reduce((s, sub) => s + sub.weight, 0)
		}))
	);

	let totalWeight = $derived(
		criteria.reduce(
			(total, c) => total + c.subcriteria.reduce((s, sub) => s + sub.weight, 0),
			0
		)
	);

	let maxSubWeight = $derived(Math.max(1, ...criteria.flatMap((c) => c.subcriteria.map((s) => s.weight))));

	let isValid = $derived(
		title.trim().length > 0 &&
			suppliers.length >= 2 &&
			criteria.length > 0 &&
			criteria.every((c) => c.subcriteria.length > 0) &&
			totalWeight === 100
	);

	// ── Search ──

	function handleSearch() {
		if (searchQuery.trim().length < 2) {
			searchResults = [];
			return;
		}
		const q = searchQuery.toLowerCase();
		searchResults = mockProcurements.filter(
			(p) =>
				p.title.toLowerCase().includes(q) ||
				p.buyer.toLowerCase().includes(q)
		);
		searchOpen = true;
	}

	function importProcurement(proc: MockProcurement) {
		const hasData = criteria.length > 0 || suppliers.length > 0;
		if (hasData && !confirm('Importering vil overskrive eksisterende kriterier og leverandører. Fortsett?')) {
			return;
		}

		title = proc.title;
		reference = proc.id;

		// Import criteria — each top-level criterion becomes a group with one sub
		criteria = proc.criteria.map((c) => {
			const cid = uid('c');
			return {
				id: cid,
				name: c.name,
				type: (c.type === 'price' ? 'price' : 'quality') as 'quality' | 'price',
				subcriteria: [
					{
						id: uid(`${cid}-s`),
						name: c.name,
						weight: c.weight
					}
				]
			};
		});

		// Import suppliers
		suppliers = proc.suppliers.map((name) => ({
			id: uid('sup'),
			name,
			price: 0
		}));

		searchQuery = '';
		searchOpen = false;
		searchResults = [];
	}

	// ── Criteria CRUD ──

	function addCriterion() {
		const id = uid('c');
		criteria = [
			...criteria,
			{
				id,
				name: '',
				type: 'quality' as const,
				subcriteria: [{ id: uid(`${id}-s`), name: '', weight: 0 }]
			}
		];
		requestAnimationFrame(() => {
			const el = document.querySelector(`[data-criterion-id="${id}"] .criterion-name-input`) as HTMLInputElement;
			el?.focus();
		});
	}

	function removeCriterion(criterionId: string) {
		criteria = criteria.filter((c) => c.id !== criterionId);
	}

	function addSubCriterion(criterionId: string) {
		const c = criteria.find((c) => c.id === criterionId);
		if (!c) return;
		const subId = uid(`${criterionId}-s`);
		c.subcriteria = [...c.subcriteria, { id: subId, name: '', weight: 0 }];
		requestAnimationFrame(() => {
			const el = document.querySelector(`[data-sub-id="${subId}"] .sub-name-input`) as HTMLInputElement;
			el?.focus();
		});
	}

	function removeSubCriterion(criterionId: string, subId: string) {
		const c = criteria.find((c) => c.id === criterionId);
		if (!c) return;
		c.subcriteria = c.subcriteria.filter((s) => s.id !== subId);
	}

	// ── Reorder ──

	function moveCriterion(index: number, direction: 'up' | 'down') {
		const target = direction === 'up' ? index - 1 : index + 1;
		if (target < 0 || target >= criteria.length) return;
		const copy = [...criteria];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		criteria = copy;
	}

	function moveSubCriterion(criterionId: string, subIndex: number, direction: 'up' | 'down') {
		const c = criteria.find((c) => c.id === criterionId);
		if (!c) return;
		const target = direction === 'up' ? subIndex - 1 : subIndex + 1;
		if (target < 0 || target >= c.subcriteria.length) return;
		const copy = [...c.subcriteria];
		[copy[subIndex], copy[target]] = [copy[target], copy[subIndex]];
		c.subcriteria = copy;
	}

	// ── Suppliers CRUD ──

	function addSupplier() {
		if (!newSupplierName.trim()) return;
		suppliers = [
			...suppliers,
			{ id: uid('sup'), name: newSupplierName.trim(), price: 0 }
		];
		newSupplierName = '';
		addingSupplier = false;
	}

	function removeSupplier(supplierId: string) {
		suppliers = suppliers.filter((s) => s.id !== supplierId);
	}

	// ── Start evaluation ──

	function startEvaluation() {
		if (!isValid) return;

		const data: EvaluationData = {
			id: reference || uid('eval'),
			title: title.trim(),
			reference: reference.trim(),
			status: 'Under evaluering',
			qualityWeight,
			priceWeight,
			contractValue,
			suppliers: suppliers.map((s) => ({
				id: s.id,
				name: s.name,
				price: s.price || undefined
			})),
			criteria: criteria.map((c) => {
				const groupWeight = c.subcriteria.reduce((s, sub) => s + sub.weight, 0);
				return {
					id: c.id,
					name: c.name.trim() || c.subcriteria[0]?.name.trim() || 'Uten navn',
					weight: groupWeight,
					subcriteria: c.subcriteria.map((sub) => ({
						id: sub.id,
						name: sub.name.trim() || 'Uten navn',
						weight: sub.weight,
						scores: Object.fromEntries(suppliers.map((s) => [s.id, 0])),
						notes: {}
					}))
				};
			})
		};

		evaluation.initialize(data);
		goto('/evaluering');
	}

	function handleWindowClick() {
		if (searchOpen) searchOpen = false;
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="setup-page">
	<!-- Header -->
	<header class="setup-header">
		<a href="/evaluering" class="back-link">← Evalueringer</a>
		<h1 class="setup-title">Ny evaluering</h1>
	</header>

	<!-- Procurement picker -->
	<div class="section-label">Importer fra anskaffelse</div>
	<div class="picker-wrap">
		<input
			class="picker-input"
			type="text"
			placeholder="Søk i Doffin / Artifik..."
			bind:value={searchQuery}
			oninput={handleSearch}
			onfocus={handleSearch}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') searchOpen = false; }}
			role="combobox"
			aria-expanded={searchOpen && searchResults.length > 0}
			aria-haspopup="listbox"
		/>
		{#if searchOpen && searchResults.length > 0}
			<div class="picker-results" role="listbox" onclick={(e) => e.stopPropagation()}>
				{#each searchResults as result}
					<button class="picker-result" role="option" onclick={() => importProcurement(result)}>
						<div class="picker-result-title">{result.title}</div>
						<div class="picker-result-meta">
							<span>{result.buyer}</span>
							<span class="picker-sep">·</span>
							<span>{result.procedure}</span>
							<span class="picker-sep">·</span>
							<span class="picker-date">{result.date}</span>
						</div>
						<div class="picker-result-criteria">
							{#each result.criteria as c}
								<span class="picker-criterion-chip">
									{c.name}
									<span class="picker-criterion-weight">{c.weight}%</span>
								</span>
							{/each}
						</div>
					</button>
				{/each}
			</div>
		{/if}
		{#if searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0}
			<div class="picker-results" role="listbox" onclick={(e) => e.stopPropagation()}>
				<div class="picker-empty" role="status">Ingen treff for «{searchQuery}»</div>
			</div>
		{/if}
	</div>

	<!-- Config -->
	<div class="section-label">Oppsett</div>
	<div class="config-strip">
		<div class="config-field config-field-wide">
			<label class="config-label" for="setup-title">Tittel</label>
			<input id="setup-title" class="config-input" type="text" bind:value={title} placeholder="Evaluering av tilbud..." />
		</div>
		<div class="config-field">
			<label class="config-label" for="setup-ref">Referanse</label>
			<input id="setup-ref" class="config-input config-input-mono" type="text" bind:value={reference} placeholder="2026/1234" />
		</div>
		<div class="config-field">
			<span class="config-label">Kvalitet / Pris</span>
			<div class="config-split">
				<span class="config-split-value">{qualityWeight}<span class="config-split-pct">%</span></span>
				<span class="config-split-sep">/</span>
				<span class="config-split-value">{priceWeight}<span class="config-split-pct">%</span></span>
			</div>
		</div>
		<div class="config-field">
			<label class="config-label" for="setup-cv">Kontraktsverdi</label>
			<div class="config-input-group">
				<input
					id="setup-cv"
					class="config-input config-input-num config-input-wide"
					type="text"
					inputmode="numeric"
					value={contractValueDisplay}
					oninput={handleContractValueInput}
					onblur={handleContractValueBlur}
					onfocus={handleContractValueFocus}
					placeholder="0"
				/>
				<span class="config-unit">kr</span>
			</div>
		</div>
	</div>

	<!-- Suppliers -->
	<div class="section-label">Leverandører</div>
	<div class="supplier-bar">
		{#each suppliers as supplier (supplier.id)}
			<div class="supplier-chip">
				<input
					class="supplier-name-input"
					type="text"
					bind:value={supplier.name}
					placeholder="Leverandørnavn"
				/>
				<button class="supplier-remove" onclick={() => removeSupplier(supplier.id)} title="Fjern leverandør">×</button>
			</div>
		{/each}
		{#if addingSupplier}
			<div class="supplier-chip supplier-chip-new">
				<input
					class="supplier-name-input"
					type="text"
					placeholder="Leverandørnavn"
					bind:value={newSupplierName}
					onkeydown={(e) => {
						if (e.key === 'Enter') addSupplier();
						if (e.key === 'Escape') (addingSupplier = false);
					}}
				/>
				<button class="supplier-confirm" onclick={addSupplier} title="Bekreft" aria-label="Bekreft leverandør">✓</button>
			</div>
		{:else}
			<button class="supplier-add" onclick={() => { addingSupplier = true; requestAnimationFrame(() => { (document.querySelector('.supplier-chip-new .supplier-name-input') as HTMLInputElement)?.focus(); }); }}>
				+ Leverandør
			</button>
		{/if}
	</div>

	<!-- Criteria editor -->
	<div class="section-label">Tildelingskriterier</div>
	<div class="criteria-editor">
		{#if criteria.length === 0}
			<div class="criteria-empty">
				<div class="criteria-empty-text">Importer fra en anskaffelse, eller legg til kriterier manuelt</div>
			</div>
		{/if}
		{#each criteria as criterion, ci (criterion.id)}
			{@const groupWeight = groupWeights.find((g) => g.id === criterion.id)?.sum ?? 0}
			<div class="criterion-group" data-criterion-id={criterion.id}>
				<!-- Group row -->
				<div class="criterion-row criterion-row-group">
					<div class="criterion-weight">
						<span class="weight-value weight-value-group">{groupWeight}<span class="weight-pct">%</span></span>
						<div class="weight-bar">
							<div class="weight-bar-fill" style="width: {maxSubWeight > 0 ? (groupWeight / (maxSubWeight * 2)) * 100 : 0}%"></div>
						</div>
					</div>
					<div class="criterion-name">
						<input
							class="criterion-name-input"
							type="text"
							bind:value={criterion.name}
							placeholder="Hovedkriterium..."
						/>
					</div>
					<button
						class="criterion-type"
						class:type-quality={criterion.type === 'quality'}
						class:type-price={criterion.type === 'price'}
						onclick={() => (criterion.type = criterion.type === 'quality' ? 'price' : 'quality')}
					>
						{criterion.type === 'quality' ? 'Kvalitet' : 'Pris'}
					</button>
					<div class="criterion-move">
						<button class="move-btn" disabled={ci === 0} onclick={() => moveCriterion(ci, 'up')} title="Flytt opp">&#9650;</button>
						<button class="move-btn" disabled={ci === criteria.length - 1} onclick={() => moveCriterion(ci, 'down')} title="Flytt ned">&#9660;</button>
					</div>
					<button class="criterion-remove" onclick={() => removeCriterion(criterion.id)} title="Fjern kriterium">×</button>
				</div>

				<!-- Sub-criteria rows -->
				{#each criterion.subcriteria as sub, si (sub.id)}
					<div class="criterion-row criterion-row-sub" data-sub-id={sub.id}>
						<div class="criterion-weight">
							<input
								class="weight-input"
								type="number"
								min="0"
								max="100"
								bind:value={sub.weight}
							/>
							<span class="weight-pct-input">%</span>
							<div class="weight-bar">
								<div class="weight-bar-fill" style="width: {maxSubWeight > 0 ? (sub.weight / maxSubWeight) * 100 : 0}%"></div>
							</div>
						</div>
						<div class="criterion-name criterion-name-sub">
							<input
								class="sub-name-input"
								type="text"
								bind:value={sub.name}
								placeholder="Underkriterium..."
							/>
						</div>
						<div class="criterion-move">
							<button class="move-btn" disabled={si === 0} onclick={() => moveSubCriterion(criterion.id, si, 'up')} title="Flytt opp">&#9650;</button>
							<button class="move-btn" disabled={si === criterion.subcriteria.length - 1} onclick={() => moveSubCriterion(criterion.id, si, 'down')} title="Flytt ned">&#9660;</button>
						</div>
						<button
							class="criterion-remove criterion-remove-sub"
							onclick={() => removeSubCriterion(criterion.id, sub.id)}
							title="Fjern underkriterium"
						>×</button>
					</div>
				{/each}

				<!-- Add sub-criterion -->
				<button class="add-sub-btn" onclick={() => addSubCriterion(criterion.id)}>
					<span class="add-sub-spacer"></span>
					<span class="add-sub-label">+ Underkriterium</span>
				</button>
			</div>
		{/each}

		<!-- Add criterion -->
		<button class="add-criterion-btn" onclick={addCriterion}>
			+ Hovedkriterium
		</button>

		<!-- Total row -->
		<div class="criteria-total" class:total-valid={totalWeight === 100} class:total-invalid={totalWeight > 0 && totalWeight !== 100}>
			<div class="criterion-weight">
				<span class="weight-value weight-value-total">{totalWeight}<span class="weight-pct">%</span></span>
				<div class="weight-bar weight-bar-total">
					<div class="weight-bar-fill weight-bar-fill-total" style="width: {Math.min(100, totalWeight)}%"></div>
				</div>
			</div>
			<div class="total-label">Total vekting</div>
			{#if totalWeight !== 100 && totalWeight > 0}
				<span class="total-warning">{totalWeight < 100 ? `${100 - totalWeight}% gjenstår` : `${totalWeight - 100}% for mye`}</span>
			{/if}
		</div>
	</div>

	<!-- Action -->
	<div class="setup-actions">
		<button class="start-btn" disabled={!isValid} onclick={startEvaluation}>
			Start evaluering
			<span class="start-arrow">→</span>
		</button>
		{#if !isValid}
			<div class="validation-hints">
				{#if !title.trim()}
					<span class="hint">Mangler tittel</span>
				{/if}
				{#if suppliers.length < 2}
					<span class="hint">Minst 2 leverandører</span>
				{/if}
				{#if criteria.length === 0}
					<span class="hint">Legg til kriterier</span>
				{/if}
				{#if totalWeight !== 100 && criteria.length > 0}
					<span class="hint">Vekting må summere til 100%</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.setup-page {
		max-width: 800px;
	}

	/* ── Header ── */
	.setup-header {
		margin-bottom: var(--sp-8);
	}

	.back-link {
		font-size: 11px;
		color: var(--ink-muted);
		text-decoration: none;
		transition: color 0.12s;
	}

	.back-link:hover {
		color: var(--ink-secondary);
	}

	.setup-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		margin-top: var(--sp-2);
	}

	/* ── Section labels ── */
	.section-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		margin-bottom: var(--sp-3);
		margin-top: var(--sp-8);
	}

	/* ── Procurement picker ── */
	.picker-wrap {
		position: relative;
		margin-bottom: var(--sp-2);
	}

	.picker-input {
		width: 100%;
		padding: var(--sp-3) var(--sp-4);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-md);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 13px;
		outline: none;
		transition: border-color 0.12s;
	}

	.picker-input:focus {
		border-color: var(--wire-focus);
	}

	.picker-input::placeholder {
		color: var(--ink-ghost);
	}

	.picker-results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 30;
		margin-top: var(--sp-1);
		background: var(--felt-raised);
		border: 1px solid var(--wire-strong);
		border-radius: var(--r-md);
		overflow: hidden;
		max-height: 320px;
		overflow-y: auto;
	}

	.picker-result {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--sp-3) var(--sp-4);
		background: none;
		border: none;
		border-bottom: 1px solid var(--wire);
		cursor: pointer;
		transition: background 0.08s;
	}

	.picker-result:last-child {
		border-bottom: none;
	}

	.picker-result:hover {
		background: var(--felt-hover);
	}

	.picker-result-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--ink);
		margin-bottom: var(--sp-1);
	}

	.picker-result-meta {
		font-size: 11px;
		color: var(--ink-muted);
		margin-bottom: var(--sp-2);
		display: flex;
		gap: var(--sp-2);
	}

	.picker-sep {
		color: var(--ink-ghost);
	}

	.picker-date {
		font-family: var(--font-data);
		font-size: 10px;
	}

	.picker-result-criteria {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-1);
	}

	.picker-criterion-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		padding: 2px var(--sp-2);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		font-size: 10px;
		color: var(--ink-secondary);
	}

	.picker-criterion-weight {
		font-family: var(--font-data);
		color: var(--vekt-dim);
		font-weight: 600;
	}

	.picker-empty {
		padding: var(--sp-4);
		text-align: center;
		font-size: 12px;
		color: var(--ink-muted);
	}

	/* ── Config strip ── */
	.config-strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-4);
		padding: var(--sp-3) var(--sp-4);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-md);
		align-items: flex-end;
	}

	.config-field {
		display: flex;
		flex-direction: column;
		gap: var(--sp-1);
	}

	.config-field-wide {
		flex: 1;
		min-width: 200px;
	}

	.config-label {
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}

	.config-input {
		padding: var(--sp-2) var(--sp-3);
		background: var(--canvas);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 12px;
		outline: none;
		transition: border-color 0.12s;
	}

	.config-input:focus {
		border-color: var(--wire-focus);
	}

	.config-input::placeholder {
		color: var(--ink-ghost);
	}

	.config-input-mono {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.config-input-group {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
	}

	.config-input-num {
		width: 64px;
		text-align: right;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.config-input-wide {
		width: 120px;
	}

	.config-unit {
		font-size: 11px;
		color: var(--ink-ghost);
		font-family: var(--font-data);
	}

	.config-derived {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		color: var(--ink-muted);
		background: var(--felt);
		border-color: transparent;
	}

	.config-split {
		display: inline-flex;
		align-items: baseline;
		gap: var(--sp-2);
		padding: var(--sp-2) var(--sp-3);
		background: var(--canvas);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
	}

	.config-split-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
		color: var(--vekt);
	}

	.config-split-pct {
		font-size: 10px;
		font-weight: 400;
		color: var(--ink-ghost);
	}

	.config-split-sep {
		font-size: 11px;
		color: var(--ink-ghost);
	}

	/* ── Supplier bar ── */
	.supplier-bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
		align-items: center;
	}

	.supplier-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		padding: var(--sp-1) var(--sp-1) var(--sp-1) var(--sp-3);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-md);
		transition: border-color 0.12s;
	}

	.supplier-chip:focus-within {
		border-color: var(--wire-focus);
	}

	.supplier-name-input {
		background: none;
		border: none;
		outline: none;
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		min-width: 100px;
		width: auto;
		padding: var(--sp-1) 0;
	}

	.supplier-name-input::placeholder {
		color: var(--ink-ghost);
	}

	.supplier-remove {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		color: var(--ink-ghost);
		background: none;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		opacity: 0;
		transition: all 0.1s;
	}

	.supplier-chip:hover .supplier-remove {
		opacity: 1;
	}

	.supplier-remove:hover {
		color: var(--score-low);
		background: var(--felt-active);
	}

	.supplier-remove:focus-visible {
		outline: none;
		opacity: 1;
		border: 1px solid var(--wire-focus);
	}

	.supplier-confirm {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		color: var(--score-high);
		background: none;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: background 0.1s;
	}

	.supplier-confirm:hover {
		background: var(--score-high-bg);
	}

	.supplier-add {
		padding: var(--sp-2) var(--sp-3);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-muted);
		background: none;
		border: 1px dashed var(--wire);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.12s;
	}

	.supplier-add:hover {
		color: var(--vekt);
		border-color: var(--vekt-bg-strong);
		background: var(--vekt-bg);
	}

	.supplier-add:focus-visible {
		outline: none;
		border-color: var(--wire-focus);
	}

	/* ── Criteria editor ── */
	.criteria-editor {
		border: 1px solid var(--wire);
		border-radius: var(--r-lg);
		overflow: hidden;
	}

	.criterion-group {
		border-bottom: 1px solid var(--wire-strong);
	}

	.criterion-group:last-of-type {
		border-bottom: 1px solid var(--wire);
	}

	.criterion-row {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		padding: var(--sp-2) var(--sp-3);
	}

	.criterion-row-group {
		background: var(--felt);
		border-left: 3px solid var(--vekt);
	}

	.criterion-row-sub {
		background: var(--canvas);
		border-bottom: 1px solid var(--wire);
		border-left: 3px solid rgba(232, 168, 56, 0.15);
	}

	.criterion-row-sub:last-of-type {
		border-bottom: none;
	}

	/* Weight column — matches system.md matrix weight column (72px) */
	.criterion-weight {
		width: 72px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-1);
	}

	.weight-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		font-weight: 600;
		color: var(--vekt-dim);
	}

	.weight-value-group {
		font-size: 13px;
		color: var(--vekt);
	}

	.weight-pct {
		font-size: 9px;
		font-weight: 400;
		color: var(--ink-ghost);
	}

	.weight-input {
		width: 40px;
		text-align: center;
		padding: var(--sp-1);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		color: var(--vekt-dim);
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		font-weight: 600;
		outline: none;
		transition: border-color 0.12s;
	}

	.weight-input:focus {
		border-color: var(--wire-focus);
		color: var(--vekt);
	}

	/* Hide number input spinners */
	.weight-input::-webkit-outer-spin-button,
	.weight-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.weight-input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.weight-pct-input {
		font-size: 9px;
		color: var(--ink-ghost);
		margin-left: -2px;
	}

	.weight-bar {
		width: 48px;
		height: 2px;
		background: var(--felt-active);
		border-radius: 1px;
		overflow: hidden;
	}

	.weight-bar-fill {
		height: 100%;
		background: var(--vekt-dim);
		border-radius: 1px;
		transition: width 0.15s ease-out;
	}

	.weight-bar-total {
		width: 100%;
	}

	.weight-bar-fill-total {
		background: var(--vekt);
	}

	/* Criterion name */
	.criterion-name {
		flex: 1;
		min-width: 0;
	}

	.criterion-name-sub {
		padding-left: var(--sp-4);
	}

	.criterion-name-input,
	.sub-name-input {
		width: 100%;
		background: none;
		border: none;
		outline: none;
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		padding: var(--sp-1) 0;
		border-bottom: 1px solid transparent;
		transition: border-color 0.12s;
	}

	.sub-name-input {
		font-weight: 500;
		font-size: 12px;
		color: var(--ink-secondary);
	}

	.criterion-name-input:focus,
	.sub-name-input:focus {
		border-bottom-color: var(--wire-focus);
	}

	.criterion-name-input::placeholder,
	.sub-name-input::placeholder {
		color: var(--ink-ghost);
	}

	/* Criterion type toggle */
	.criterion-type {
		padding: 2px var(--sp-2);
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 1px solid;
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: all 0.12s;
		flex-shrink: 0;
		line-height: 1.4;
	}

	.type-quality {
		color: var(--vekt-dim);
		border-color: var(--vekt-bg-strong);
		background: var(--vekt-bg);
	}

	.type-quality:hover {
		color: var(--vekt);
		background: var(--vekt-bg-strong);
	}

	.type-price {
		color: var(--ink-secondary);
		border-color: var(--wire);
		background: var(--felt-hover);
	}

	.type-price:hover {
		color: var(--ink);
		border-color: var(--wire-strong);
	}

	.criterion-type:focus-visible {
		outline: none;
		border-color: var(--wire-focus);
	}

	/* Move buttons */
	.criterion-move {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex-shrink: 0;
	}

	.move-btn {
		width: 20px;
		height: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 8px;
		color: var(--ink-ghost);
		background: none;
		border: none;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.1s;
		padding: 0;
		line-height: 1;
	}

	.move-btn:hover:not(:disabled) {
		color: var(--ink-secondary);
		background: var(--felt-active);
	}

	.move-btn:disabled {
		opacity: 0.2;
		cursor: default;
	}

	.move-btn:focus-visible {
		outline: none;
		color: var(--ink-secondary);
		background: var(--felt-active);
	}

	/* Remove buttons */
	.criterion-remove {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		color: var(--ink-ghost);
		background: none;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		opacity: 0;
		transition: all 0.1s;
	}

	.criterion-row:hover > .criterion-remove {
		opacity: 1;
	}

	.criterion-remove:hover {
		color: var(--score-low);
		background: var(--felt-active);
	}

	.criterion-remove:focus-visible {
		outline: none;
		opacity: 1;
		border: 1px solid var(--wire-focus);
	}

	/* Add buttons */
	.add-sub-btn {
		display: flex;
		align-items: center;
		width: 100%;
		padding: var(--sp-2) var(--sp-3);
		padding-left: var(--sp-3);
		text-align: left;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-ghost);
		background: none;
		border: none;
		border-left: 3px solid rgba(232, 168, 56, 0.15);
		cursor: pointer;
		transition: color 0.1s;
	}

	.add-sub-spacer {
		width: 72px;
		flex-shrink: 0;
	}

	.add-sub-label {
		padding-left: var(--sp-4);
	}

	.add-sub-btn:hover {
		color: var(--vekt-dim);
	}

	.add-sub-btn:focus-visible {
		outline: none;
		color: var(--vekt);
	}

	.add-criterion-btn {
		display: block;
		width: 100%;
		padding: var(--sp-3) var(--sp-4);
		text-align: left;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-muted);
		background: var(--felt);
		border: none;
		border-left: 3px solid var(--vekt);
		cursor: pointer;
		transition: all 0.1s;
	}

	.add-criterion-btn:hover {
		color: var(--vekt);
		background: var(--vekt-bg);
	}

	.add-criterion-btn:focus-visible {
		outline: none;
		color: var(--vekt);
		background: var(--vekt-bg);
	}

	/* Total row */
	.criteria-total {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		padding: var(--sp-3) var(--sp-3);
		background: var(--canvas);
		border-top: 2px solid var(--wire-strong);
		border-left: 3px solid var(--vekt);
	}

	.total-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}

	.total-valid .weight-value-total {
		color: var(--score-high);
	}

	.total-invalid .weight-value-total {
		color: var(--score-low);
	}

	.weight-value-total {
		font-size: 14px;
		font-weight: 700;
	}

	.total-warning {
		font-size: 11px;
		font-family: var(--font-data);
		color: var(--score-low);
		margin-left: auto;
	}

	/* ── Actions ── */
	.setup-actions {
		margin-top: var(--sp-8);
		display: flex;
		align-items: center;
		gap: var(--sp-4);
	}

	.start-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-3) var(--sp-5);
		background: var(--vekt);
		color: var(--canvas);
		border: none;
		border-radius: var(--r-md);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.12s;
	}

	.start-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.start-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.start-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--canvas), 0 0 0 4px var(--vekt);
	}

	.start-arrow {
		font-size: 15px;
		transition: transform 0.12s;
	}

	.start-btn:hover:not(:disabled) .start-arrow {
		transform: translateX(2px);
	}

	.validation-hints {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
	}

	.hint {
		font-size: 11px;
		color: var(--ink-muted);
		padding: var(--sp-1) var(--sp-2);
		background: var(--felt);
		border-radius: var(--r-sm);
		border: 1px solid var(--wire);
	}

	/* ── Criteria empty state ── */
	.criteria-empty {
		padding: var(--sp-6) var(--sp-4);
		text-align: center;
		border-left: 3px solid rgba(232, 168, 56, 0.15);
	}

	.criteria-empty-text {
		font-size: 12px;
		color: var(--ink-muted);
		line-height: 1.5;
	}

	/* ── Missing focus-visible states ── */
	.picker-input:focus-visible {
		border-color: var(--wire-focus);
	}

	.picker-result:focus-visible {
		outline: none;
		background: var(--felt-hover);
	}

	.supplier-confirm:focus-visible {
		outline: none;
		border: 1px solid var(--wire-focus);
	}

	.config-input:focus-visible {
		border-color: var(--wire-focus);
	}

	/* ── Responsive ── */
	@media (max-width: 768px) {
		.config-strip {
			flex-direction: column;
			align-items: stretch;
			gap: var(--sp-3);
		}
	}
</style>
