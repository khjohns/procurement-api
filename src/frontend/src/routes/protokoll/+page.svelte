<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { protokoll, type Avvisning } from '$lib/stores/protokoll.svelte';
	import SectionAccordion from '$lib/components/protokoll/SectionAccordion.svelte';
	import InfoTable from '$lib/components/protokoll/InfoTable.svelte';
	import SupplierList from '$lib/components/protokoll/SupplierList.svelte';
	import CheckboxTextarea from '$lib/components/protokoll/CheckboxTextarea.svelte';
	import AvvisningCard from '$lib/components/protokoll/AvvisningCard.svelte';
	import PerSupplierCards from '$lib/components/protokoll/PerSupplierCards.svelte';
	import DataQualityTable from '$lib/components/protokoll/DataQualityTable.svelte';
	import RichTextEditor from '$lib/components/protokoll/RichTextEditor.svelte';
	import type { FieldDefinition, SectionDefinition } from '$lib/stores/protokoll-sections';
	import type { ResolvedSection } from '$lib/stores/protokoll.svelte';

	// ── Procurement picker state ──

	let searchQuery = $state('');
	let searchOpen = $state(false);
	let searchResults = $state<any[]>([]);
	let searchLoading = $state(false);

	// ── Navigation guard ──

	let isDirty = $derived(Object.keys(protokoll.manual).length > 0);

	beforeNavigate(({ cancel }) => {
		if (isDirty && !confirm('Du har ulagrede endringer. Vil du forlate siden?')) {
			cancel();
		}
	});

	// ── Generate state ──

	let generating = $state(false);
	let generateError = $state<string | null>(null);

	// ── Chapter grouping ──

	interface ChapterGroup {
		chapter: string;
		sections: ResolvedSection[];
	}

	let chapters = $derived.by<ChapterGroup[]>(() => {
		const groups: ChapterGroup[] = [];
		let current: ChapterGroup | null = null;

		for (const section of protokoll.visibleSections) {
			if (!current || current.chapter !== section.chapter) {
				current = { chapter: section.chapter, sections: [] };
				groups.push(current);
			}
			current.sections.push(section);
		}

		return groups;
	});

	// ── Progress bar color ──

	let progressColor = $derived(
		protokoll.completeness.percent >= 80
			? 'var(--color-score-high)'
			: protokoll.completeness.percent >= 40
				? 'var(--color-vekt)'
				: 'var(--color-score-low)'
	);

	// ── Procurement search ──

	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSearch() {
		if (searchQuery.trim().length < 2) {
			searchResults = [];
			return;
		}
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(async () => {
			searchLoading = true;
			try {
				const res = await fetch(`/api/procurements?search=${encodeURIComponent(searchQuery)}`);
				if (res.ok) {
					const data = await res.json();
					searchResults = Array.isArray(data) ? data : data.procurements ?? [];
				}
			} catch {
				searchResults = [];
			} finally {
				searchLoading = false;
				searchOpen = true;
			}
		}, 300);
	}

	async function selectProcurement(proc: any) {
		searchOpen = false;
		searchQuery = '';
		searchResults = [];
		await protokoll.loadProcurement(proc.id);
	}

	function handleWindowClick() {
		if (searchOpen) searchOpen = false;
	}

	// ── Generate docx ──

	async function handleGenerate() {
		generating = true;
		generateError = null;

		const blob = await protokoll.generateDocx();
		if (blob) {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `protokoll-${protokoll.procurement?.sequenceId ?? 'dokument'}.docx`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} else {
			generateError = protokoll.error;
		}

		generating = false;
	}

	// ── Field rendering helpers ──

	function getInfoRows(section: ResolvedSection): { label: string; value: any; mono?: boolean }[] {
		const proc = protokoll.procurement;
		if (!proc) return [];

		switch (section.id) {
			case 'generell-info':
				return [
					{ label: 'Oppdragsgiver', value: proc.buyerName ?? proc.buyer?.name },
					{ label: 'Referanse', value: proc.sequenceId, mono: true },
					{ label: 'Beskrivelse', value: proc.description ?? proc.title },
					{ label: 'Estimert verdi', value: proc.estimatedTotalValue ? `${new Intl.NumberFormat('nb-NO').format(proc.estimatedTotalValue)} kr` : null, mono: true },
					{ label: 'Frist', value: formatDate(proc.deadline) },
				];
			case 'prosedyre':
				return [
					{ label: 'Prosedyretype', value: proc.procedureName ?? proc.procedure },
					{ label: 'Terskel', value: formatThreshold(proc.threshold) },
				];
			case 'tildelingskriterier':
				if (protokoll.eforms?.award_criteria) {
					return protokoll.eforms.award_criteria.map((c: any) => ({
						label: c.name ?? c.description ?? 'Kriterium',
						value: c.weight ? `${c.weight}%` : '—',
						mono: true
					}));
				}
				return [{ label: 'Tildelingskriterier', value: 'Ikke tilgjengelig fra eForms' }];
			case 'valgt-tilbud': {
				const winner = protokoll.activities.find(
					(a: any) => a.action === 'AWARDING_PARTICIPANTS'
				);
				return [
					{ label: 'Tildelt til', value: winner?.supplier?.name ?? '—' },
					{ label: 'Kontraktsverdi', value: proc.contractValue ? `${new Intl.NumberFormat('nb-NO').format(proc.contractValue)} kr` : '—', mono: true },
				];
			}
			case 'meddelelse-klagefrist':
				return [
					{ label: 'Meddelelse sendt', value: proc.areAwardLettersSent ? 'Ja' : 'Nei' },
				];
			case 'rammeavtaler':
				return [
					{ label: 'Type', value: proc.frameworkAgreementTypeCode },
					{ label: 'Maks deltakere', value: proc.frameworkAgreementMaximumParticipants, mono: true },
				];
			default:
				return [];
		}
	}

	function getSuppliers(section: ResolvedSection): { id: string; name: string }[] {
		switch (section.id) {
			case 'tilbud-vurdering':
				return protokoll.suppliers;
			case 'utvelgelse':
			case 'kvalifikasjonsvurdering':
			case 'forelopig-kvalifisering':
				return protokoll.suppliers;
			default:
				return protokoll.suppliers;
		}
	}

	function getRejectedSuppliers(): { id: string; name: string }[] {
		const seen = new Map<string, { id: string; name: string }>();
		for (const a of protokoll.activities) {
			if (a.action === 'REJECT_PARTICIPATION' && a.supplier) {
				const key = String(a.supplier.id ?? a.supplier.name);
				if (!seen.has(key)) {
					seen.set(key, { id: key, name: a.supplier.name ?? `Leverandør ${key}` });
				}
			}
		}
		return [...seen.values()];
	}

	function formatDate(iso: string | null | undefined): string {
		if (!iso) return '—';
		try {
			const dt = new Date(iso);
			return dt.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
		} catch {
			return String(iso);
		}
	}

	function formatThreshold(t: string | null | undefined): string {
		const map: Record<string, string> = {
			over_eea_threshold_value: 'Over EØS-terskel',
			below_eea_threshold_value: 'Under EØS-terskel',
			national_threshold: 'Nasjonal terskel',
			below_national_threshold: 'Under nasjonal terskel',
		};
		return t ? map[t] ?? t : '—';
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="protokoll-page">
	{#if !protokoll.hasData && !protokoll.loading}
		<!-- ── Picker view ── -->
		<header class="page-header">
			<div class="page-label">ANSKAFFELSESPROTOKOLL</div>
			<h1 class="page-title">Velg anskaffelse</h1>
		</header>

		<div class="picker-wrap">
			<div class="picker-input-wrap">
				<svg class="picker-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
					<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
					<path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				<input
					class="picker-input"
					type="text"
					placeholder="Søk etter anskaffelse..."
					bind:value={searchQuery}
					oninput={handleSearch}
					onfocus={handleSearch}
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => { if (e.key === 'Escape') searchOpen = false; }}
					role="combobox"
					aria-expanded={searchOpen && searchResults.length > 0}
					aria-haspopup="listbox"
				/>
			</div>
			{#if searchOpen && searchResults.length > 0}
				<div class="picker-results" role="listbox" onclick={(e) => e.stopPropagation()}>
					{#each searchResults as result}
						<button class="picker-result" role="option" onclick={() => selectProcurement(result)}>
							<div class="picker-result-title">{result.title ?? result.description ?? `Anskaffelse ${result.id}`}</div>
							<div class="picker-result-meta">
								<span class="picker-ref">{result.sequenceId ?? result.id}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
			{#if searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchLoading}
				<div class="picker-results" role="listbox" onclick={(e) => e.stopPropagation()}>
					<div class="picker-empty" role="status">Ingen treff for &laquo;{searchQuery}&raquo;</div>
				</div>
			{/if}
		</div>

	{:else if protokoll.loading}
		<!-- ── Loading state ── -->
		<header class="page-header">
			<div class="page-label">ANSKAFFELSESPROTOKOLL</div>
			<h1 class="page-title">Henter data...</h1>
		</header>
		<div class="progress-strip">
			<div class="progress-bar-track">
				<div class="progress-bar-fill progress-bar-loading"></div>
			</div>
			<span class="progress-text">Henter data fra Artifik...</span>
		</div>
		<div class="skeleton-sections">
			{#each Array(6) as _, i}
				<div class="skeleton-row">
					<span class="skeleton-num">{i + 1}</span>
					<div class="skeleton-line" style="width: {120 + Math.random() * 200}px"></div>
				</div>
			{/each}
		</div>

	{:else if protokoll.error}
		<!-- ── Error state ── -->
		<header class="page-header">
			<div class="page-label">ANSKAFFELSESPROTOKOLL</div>
			<h1 class="page-title">Feil ved lasting</h1>
		</header>
		<div class="error-banner">
			<span class="error-icon">&#9888;</span>
			<span>{protokoll.error}</span>
			<button class="error-retry" onclick={() => protokoll.reset()}>Tilbake</button>
		</div>

	{:else}
		<!-- ── Document view ── -->
		<header class="page-header">
			<div class="page-header-left">
				<div class="page-label">ANSKAFFELSESPROTOKOLL</div>
				<h1 class="page-title">{protokoll.procurement?.title ?? protokoll.procurement?.description ?? 'Protokoll'}</h1>
				<div class="page-meta">
					Ref: <span class="page-meta-ref">{protokoll.procurement?.sequenceId ?? '—'}</span>
					&middot; {protokoll.delLabel}
				</div>
			</div>
			<button
				class="generate-btn"
				disabled={generating}
				onclick={handleGenerate}
				title={protokoll.completeness.percent < 100 ? 'Noen seksjoner er ufullstendige' : ''}
			>
				{#if generating}
					<span class="spinner"></span> Genererer...
				{:else}
					&#8595; Generer .docx
				{/if}
			</button>
		</header>

		<!-- Progress strip -->
		<div class="progress-strip">
			<div class="progress-bar-track">
				<div
					class="progress-bar-fill"
					style="width: {protokoll.completeness.percent}%; background: {progressColor}"
				></div>
			</div>
			<div class="progress-info">
				{#if protokoll.completeness.percent >= 100}
					<span class="progress-complete">Fullstendig — klar for generering</span>
				{:else}
					<span class="progress-fraction">{protokoll.completeness.done} av {protokoll.completeness.total} seksjoner</span>
					{#if protokoll.completeness.missing.length > 0}
						<span class="progress-missing">{protokoll.completeness.missing.length} mangler begrunnelse</span>
					{/if}
				{/if}
			</div>
		</div>

		{#if generateError}
			<div class="error-banner error-banner-inline">
				<span class="error-icon">&#9888;</span>
				<span>{generateError}</span>
			</div>
		{/if}

		<!-- Sections -->
		<div class="sections">
			{#each chapters as group}
				<div class="chapter-label" role="separator" aria-label={group.chapter}>
					<span class="chapter-text">{group.chapter}</span>
				</div>

				{#each group.sections as section (section.id)}
					<SectionAccordion
						{section}
						open={protokoll.isSectionOpen(section.id)}
						ontoggle={() => protokoll.toggleSection(section.id)}
					>
						{#each section.fields as field (field.key)}
							{@const fieldKey = field.key}
							{#if field.type === 'info-table'}
								<InfoTable rows={getInfoRows(section)} label={field.label} />

							{:else if field.type === 'supplier-list'}
								<SupplierList suppliers={getSuppliers(section)} label={field.label} />

							{:else if field.type === 'textarea'}
								<div class="manual-field">
									<div class="field-label">{field.label}</div>
									<textarea
										class="field-textarea"
										value={(protokoll.manual[fieldKey] as string) ?? ''}
										oninput={(e) => protokoll.setManualField(fieldKey, (e.target as HTMLTextAreaElement).value)}
										placeholder="Skriv her..."
										rows="3"
									></textarea>
									<div class="field-footer">
										<span class="char-count">{((protokoll.manual[fieldKey] as string) ?? '').length} tegn</span>
										{#if field.hint}
											<span class="field-hint">{field.hint}</span>
										{/if}
									</div>
								</div>

							{:else if field.type === 'tipex'}
								<div class="manual-field">
									<div class="field-label">{field.label}</div>
									<RichTextEditor
										body={(protokoll.manual[fieldKey] as string) || '<p></p>'}
										placeholder="Skriv her..."
										hint={field.hint ?? ''}
										onchange={(html) => protokoll.setManualField(fieldKey, html)}
									/>
								</div>

							{:else if field.type === 'checkbox-textarea'}
								<CheckboxTextarea
									checked={!!protokoll.manual[fieldKey]}
									begrunnelse={(protokoll.manual[`${fieldKey}Begrunnelse`] as string) ?? ''}
									label={field.label}
									foaRef={field.foaRef}
									hint={field.hint}
									onchange={(c, b) => {
										protokoll.setManualField(fieldKey, c);
										protokoll.setManualField(`${fieldKey}Begrunnelse`, b);
									}}
								/>

							{:else if field.type === 'per-supplier-textarea'}
								<PerSupplierCards
									suppliers={getSuppliers(section)}
									values={(protokoll.manual[fieldKey] as Record<string, string>) ?? {}}
									label={field.label}
									hint={field.hint}
									onchange={(sid, val) => protokoll.setPerSupplierField(fieldKey, sid, val)}
								/>

							{:else if field.type === 'per-supplier-tipex'}
								<PerSupplierCards
									suppliers={getSuppliers(section)}
									values={(protokoll.manual[fieldKey] as Record<string, string>) ?? {}}
									useTipex={true}
									label={field.label}
									hint={field.hint}
									onchange={(sid, val) => protokoll.setPerSupplierField(fieldKey, sid, val)}
								/>

							{:else if field.type === 'avvisning-card'}
								<AvvisningCard
									suppliers={getRejectedSuppliers()}
									avvisninger={(protokoll.manual[fieldKey] as Record<string, Avvisning>) ?? {}}
									isDel2={protokoll.isDel2}
									foaRef={field.foaRef}
									hint={field.hint}
									onchange={(sid, avv) => protokoll.setAvvisning(fieldKey, sid, avv)}
								/>

							{:else if field.type === 'data-quality-table'}
								<DataQualityTable sections={protokoll.sections} />
							{/if}
						{/each}
					</SectionAccordion>
				{/each}
			{/each}
		</div>

		<!-- Sticky footer -->
		<div class="sticky-footer">
			<div class="footer-inner">
				<div class="footer-progress">
					<div class="footer-bar-track">
						<div
							class="footer-bar-fill"
							style="width: {protokoll.completeness.percent}%; background: {progressColor}"
						></div>
					</div>
					<span class="footer-fraction">
						{#if protokoll.completeness.percent >= 100}
							<span class="footer-complete">Klar</span>
						{:else}
							{protokoll.completeness.done}/{protokoll.completeness.total}
						{/if}
					</span>
					{#if protokoll.completeness.missing.length > 0}
						<span class="footer-missing">&middot; {protokoll.completeness.missing.length} mangler</span>
					{/if}
				</div>

				{#if protokoll.openCount >= 2}
					<button class="footer-collapse" onclick={() => protokoll.closeAllSections()}>
						Lukk alle
					</button>
				{/if}

				<button
					class="generate-btn generate-btn-footer"
					disabled={generating}
					onclick={handleGenerate}
				>
					{#if generating}
						<span class="spinner"></span> Genererer...
					{:else}
						&#8595; Generer .docx
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.protokoll-page {
		max-width: 800px;
		margin: 0 auto;
		padding-bottom: 64px;
	}

	/* ── Page header ── */
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing-4);
		margin-bottom: var(--spacing-6);
	}

	.page-header-left {
		flex: 1;
		min-width: 0;
	}

	.page-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-2);
	}

	.page-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--color-ink);
		line-height: 1.2;
	}

	.page-meta {
		font-size: 13px;
		color: var(--color-ink-secondary);
		margin-top: var(--spacing-1);
	}

	.page-meta-ref {
		font-family: var(--font-data);
	}

	/* ── Generate button ── */
	.generate-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-4);
		background: var(--color-vekt);
		color: var(--color-canvas);
		border: none;
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.12s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.generate-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.generate-btn:disabled {
		background: var(--color-felt-active);
		color: var(--color-ink-muted);
		cursor: not-allowed;
	}

	.generate-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-vekt);
	}

	.generate-btn-footer {
		margin-left: auto;
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* ── Progress strip ── */
	.progress-strip {
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		padding: var(--spacing-3) var(--spacing-4);
		margin-bottom: var(--spacing-6);
	}

	.progress-bar-track {
		height: 4px;
		background: var(--color-felt-active);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: var(--spacing-2);
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease-out;
	}

	.progress-bar-loading {
		width: 30%;
		background: var(--color-vekt);
		animation: loading-pulse 1.5s ease-in-out infinite;
	}

	@keyframes loading-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.progress-info {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-3);
	}

	.progress-fraction {
		font-family: var(--font-data);
		font-size: 13px;
		color: var(--color-ink);
	}

	.progress-missing {
		font-size: 13px;
		color: var(--color-ink-secondary);
	}

	.progress-complete {
		font-size: 13px;
		color: var(--color-score-high);
		font-weight: 500;
	}

	.progress-text {
		font-size: 13px;
		color: var(--color-ink-muted);
	}

	/* ── Chapters ── */
	.chapter-label {
		display: flex;
		align-items: center;
		padding: var(--spacing-3) 0;
		margin-top: var(--spacing-2);
	}

	.chapter-label::before,
	.chapter-label::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-wire);
	}

	.chapter-text {
		padding: 0 var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-ink-ghost);
		white-space: nowrap;
	}

	/* ── Sections ── */
	.sections {
		margin-bottom: var(--spacing-8);
	}

	/* ── Manual fields (textarea) ── */
	.manual-field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.field-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	.field-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		outline: none;
		resize: vertical;
		transition: border-color 0.12s;
		field-sizing: content;
	}

	.field-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.field-textarea::placeholder {
		color: var(--color-ink-ghost);
		font-style: italic;
	}

	.field-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-2);
	}

	.char-count {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.field-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
		text-align: right;
	}

	/* ── Picker ── */
	.picker-wrap {
		position: relative;
		margin-top: var(--spacing-6);
	}

	.picker-input-wrap {
		position: relative;
	}

	.picker-icon {
		position: absolute;
		left: var(--spacing-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-ink-ghost);
		pointer-events: none;
	}

	.picker-input {
		width: 100%;
		padding: var(--spacing-3) var(--spacing-4);
		padding-left: 40px;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 13px;
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
		border-radius: var(--radius-md);
		overflow: hidden;
		max-height: 320px;
		overflow-y: auto;
	}

	.picker-result {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--spacing-3) var(--spacing-4);
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

	.picker-result:focus-visible {
		outline: none;
		background: var(--color-felt-hover);
	}

	.picker-result-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.picker-result-meta {
		font-size: 11px;
		color: var(--color-ink-muted);
		margin-top: var(--spacing-1);
	}

	.picker-ref {
		font-family: var(--font-data);
		font-size: 10px;
	}

	.picker-empty {
		padding: var(--spacing-4);
		text-align: center;
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	/* ── Skeleton ── */
	.skeleton-sections {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		margin-top: var(--spacing-4);
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-3) var(--spacing-4);
	}

	.skeleton-num {
		font-family: var(--font-data);
		font-size: 13px;
		color: var(--color-ink-ghost);
		min-width: 20px;
	}

	.skeleton-line {
		height: 12px;
		background: var(--color-felt-active);
		border-radius: var(--radius-sm);
		animation: loading-pulse 1.5s ease-in-out infinite;
	}

	/* ── Error ── */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-3) var(--spacing-4);
		background: var(--color-vekt-bg);
		border-left: 3px solid var(--color-vekt);
		border-radius: var(--radius-sm);
		font-size: 13px;
		color: var(--color-vekt-dim);
		margin-bottom: var(--spacing-4);
	}

	.error-banner-inline {
		margin-top: 0;
	}

	.error-icon {
		flex-shrink: 0;
	}

	.error-retry {
		margin-left: auto;
		padding: var(--spacing-1) var(--spacing-3);
		background: none;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink-secondary);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.12s;
	}

	.error-retry:hover {
		background: var(--color-felt);
		color: var(--color-ink);
	}

	/* ── Sticky footer ── */
	.sticky-footer {
		position: fixed;
		bottom: 0;
		left: 228px;
		right: 0;
		background: var(--color-felt);
		border-top: 1px solid var(--color-wire);
		z-index: 20;
	}

	.footer-inner {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-3) var(--spacing-4);
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
	}

	.footer-progress {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.footer-bar-track {
		width: 80px;
		height: 3px;
		background: var(--color-felt-active);
		border-radius: 2px;
		overflow: hidden;
	}

	.footer-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease-out;
	}

	.footer-fraction {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink);
	}

	.footer-complete {
		color: var(--color-score-high);
	}

	.footer-missing {
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.footer-collapse {
		padding: var(--spacing-1) var(--spacing-3);
		background: none;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink-secondary);
		font-size: 12px;
		font-family: var(--font-ui);
		cursor: pointer;
		transition: all 0.12s;
	}

	.footer-collapse:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.sticky-footer {
			left: 0;
		}
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}

		.footer-bar-track,
		.footer-fraction {
			display: none;
		}

		.footer-missing {
			display: none;
		}
	}
</style>
