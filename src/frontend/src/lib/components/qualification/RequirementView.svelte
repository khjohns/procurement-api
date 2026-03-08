<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';
	import type {
		DocumentationStatus,
		QualificationBasis,
		QualificationVerdict
	} from '$lib/stores/qualification.svelte';

	interface Props {
		requirementId: string;
	}

	let { requirementId }: Props = $props();

	let requirement = $derived(
		qualification.data.requirements.find((r) => r.id === requirementId)!
	);

	let reqIndex = $derived(
		qualification.data.requirements.findIndex((r) => r.id === requirementId)
	);

	let prevReq = $derived(
		reqIndex > 0 ? qualification.data.requirements[reqIndex - 1] : null
	);

	let nextReq = $derived(
		reqIndex < qualification.data.requirements.length - 1
			? qualification.data.requirements[reqIndex + 1]
			: null
	);

	const docOptions: { value: DocumentationStatus; label: string }[] = [
		{ value: 'submitted', label: 'Levert' },
		{ value: 'not_submitted', label: 'Ikke levert' }
	];

	const basisOptions: { value: QualificationBasis; label: string }[] = [
		{ value: 'own', label: 'Egen kapasitet' },
		{ value: 'supported', label: 'Støtter seg på annen virksomhet' }
	];

	const verdictOptions: { value: QualificationVerdict; label: string }[] = [
		{ value: 'met', label: 'Oppfylt' },
		{ value: 'not_met', label: 'Ikke oppfylt' }
	];
</script>

<!-- Navigation bar -->
<div class="req-nav">
	<button class="nav-back" onclick={() => qualification.setActiveView('overview')}>
		← Oversikt
	</button>
	<div class="nav-center">
		{#if prevReq}
			<button class="nav-arrow" onclick={() => qualification.setActiveView(prevReq.id)} title={prevReq.name}>
				‹
			</button>
		{/if}
		<span class="nav-title">{requirement.name}</span>
		{#if nextReq}
			<button class="nav-arrow" onclick={() => qualification.setActiveView(nextReq.id)} title={nextReq.name}>
				›
			</button>
		{/if}
	</div>
	<div class="nav-spacer"></div>
</div>

<!-- Requirement description -->
{#if requirement.description}
	<div class="req-description">{requirement.description}</div>
{/if}

<!-- Supplier assessments -->
{#each qualification.data.suppliers as supplier}
	{@const a = requirement.assessments[supplier.id]}
	{@const documentation = a?.documentation ?? 'not_assessed'}
	{@const basis = a?.basis ?? 'own'}
	{@const supportEntityName = a?.supportEntityName ?? ''}
	{@const verdict = a?.verdict ?? 'not_assessed'}
	{@const noteText = a?.notes ?? ''}

	<div class="supplier-section" class:section-met={verdict === 'met'} class:section-not-met={verdict === 'not_met'}>
		<div class="supplier-header">
			<span class="supplier-name">{supplier.name}</span>
			<span class="supplier-verdict">
				{#if verdict === 'met'}
					<span class="verdict-badge verdict-met">✓ Oppfylt</span>
				{:else if verdict === 'not_met'}
					<span class="verdict-badge verdict-not-met">✗ Ikke oppfylt</span>
				{:else}
					<span class="verdict-badge verdict-pending">— Ikke vurdert</span>
				{/if}
			</span>
		</div>

		<div class="assessment-fields">
			<div class="field">
				<div class="field-label">Dokumentasjon</div>
				<div class="field-options">
					{#each docOptions as opt}
						<button
							class="option-btn"
							class:option-active={documentation === opt.value}
							class:option-submitted={documentation === opt.value && opt.value === 'submitted'}
							class:option-not-submitted={documentation === opt.value && opt.value === 'not_submitted'}
							onclick={() => qualification.setDocumentation(requirement.id, supplier.id, opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="field">
				<div class="field-label">Grunnlag</div>
				<div class="field-options">
					{#each basisOptions as opt}
						<button
							class="option-btn"
							class:option-active={basis === opt.value}
							onclick={() => qualification.setBasis(requirement.id, supplier.id, opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
				{#if basis === 'supported'}
					<div class="support-input">
						<label class="input-label" for="support-{requirement.id}-{supplier.id}">Virksomhet</label>
						<input
							id="support-{requirement.id}-{supplier.id}"
							class="text-input"
							type="text"
							value={supportEntityName}
							oninput={(e) => qualification.setSupportEntityName(requirement.id, supplier.id, e.currentTarget.value)}
							placeholder="Navn på støttende virksomhet..."
						/>
					</div>
				{/if}
			</div>

			<div class="field">
				<div class="field-label">Vurdering</div>
				<div class="field-options">
					{#each verdictOptions as opt}
						<button
							class="option-btn"
							class:option-active={verdict === opt.value}
							class:option-met={verdict === opt.value && opt.value === 'met'}
							class:option-not-met={verdict === opt.value && opt.value === 'not_met'}
							onclick={() => qualification.setVerdict(requirement.id, supplier.id, opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="notes-section">
			<div class="field-label">Begrunnelse</div>
			<textarea
				class="notes-textarea"
				value={noteText}
				oninput={(e) => qualification.setNote(requirement.id, supplier.id, e.currentTarget.value)}
				placeholder="Skriv begrunnelse for vurderingen..."
			></textarea>
			{#if noteText.length > 0}
				<div class="charcount">{noteText.length} tegn</div>
			{/if}
		</div>
	</div>
{/each}

<style>
	/* ── Navigation bar ── */
	.req-nav {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		margin-bottom: var(--spacing-5);
		padding-bottom: var(--spacing-3);
		border-bottom: 1px solid var(--color-wire);
	}

	.nav-back {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		transition: all 0.1s;
	}

	.nav-back:hover {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.nav-back:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
	}

	.nav-center {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		flex: 1;
		justify-content: center;
	}

	.nav-title {
		font-size: 14px;
		font-weight: 700;
		color: var(--color-ink);
		letter-spacing: -0.01em;
	}

	.nav-arrow {
		font-size: 16px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		transition: all 0.1s;
		line-height: 1;
	}

	.nav-arrow:hover {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.nav-arrow:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
	}

	.nav-spacer { width: 80px; }

	/* ── Requirement description ── */
	.req-description {
		font-size: 12px;
		color: var(--color-ink-muted);
		line-height: 1.5;
		margin-bottom: var(--spacing-5);
		padding: var(--spacing-3) var(--spacing-4);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
	}

	/* ── Supplier sections ── */
	.supplier-section {
		padding: var(--spacing-4) var(--spacing-5);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-lg);
		margin-bottom: var(--spacing-4);
		border-left: 3px solid var(--color-wire-strong);
	}

	.section-met {
		border-left-color: var(--color-score-high);
	}

	.section-not-met {
		border-left-color: var(--color-score-low);
	}

	.supplier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-4);
	}

	.supplier-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.verdict-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		font-size: 11px;
		font-weight: 600;
	}

	.verdict-met {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.verdict-not-met {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.verdict-pending {
		color: var(--color-ink-ghost);
		background: var(--color-felt-active);
	}

	/* ── Assessment fields ── */
	.assessment-fields {
		display: flex;
		gap: var(--spacing-6);
		align-items: flex-start;
		margin-bottom: var(--spacing-4);
		flex-wrap: wrap;
	}

	.field {
		flex-shrink: 0;
		min-width: 160px;
	}

	.field-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-2);
	}

	.field-options {
		display: flex;
		gap: var(--spacing-1);
	}

	.option-btn {
		padding: var(--spacing-2) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s, color 0.12s;
		white-space: nowrap;
	}

	.option-btn:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.option-active {
		background: var(--color-felt-active);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
		font-weight: 600;
	}

	.option-submitted {
		background: var(--color-score-high-bg);
		border-color: rgba(61, 154, 110, 0.18);
		color: var(--color-score-high);
	}

	.option-not-submitted {
		background: var(--color-score-low-bg);
		border-color: rgba(196, 88, 88, 0.18);
		color: var(--color-score-low);
	}

	.option-met {
		background: var(--color-score-high-bg);
		border-color: rgba(61, 154, 110, 0.18);
		color: var(--color-score-high);
	}

	.option-not-met {
		background: var(--color-score-low-bg);
		border-color: rgba(196, 88, 88, 0.18);
		color: var(--color-score-low);
	}

	/* ── Support input ── */
	.support-input {
		margin-top: var(--spacing-2);
	}

	.input-label {
		font-size: 10px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-1);
		display: block;
	}

	.text-input {
		width: 100%;
		max-width: 280px;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 12px;
		outline: none;
		transition: border-color 0.12s;
	}

	.text-input:focus {
		border-color: var(--color-wire-focus);
	}

	.text-input::placeholder {
		color: var(--color-ink-ghost);
	}

	/* ── Notes ── */
	.notes-textarea {
		width: 100%;
		min-height: 64px;
		padding: var(--spacing-3);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.5;
		resize: vertical;
		outline: none;
		transition: border-color 0.12s;
	}

	.notes-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.notes-textarea::placeholder {
		color: var(--color-ink-ghost);
	}

	.charcount {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
		text-align: right;
		margin-top: var(--spacing-1);
	}
</style>
