<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';
	import type {
		DocumentationStatus,
		QualificationBasis,
		QualificationVerdict
	} from '$lib/stores/qualification.svelte';

	interface Props {
		reqId: string;
		reqName: string;
		supplierId: string;
		supplierName: string;
	}

	let { reqId, reqName, supplierId, supplierName }: Props = $props();

	let colCount = $derived(qualification.data.suppliers.length + 1);

	let assessment = $derived(
		(() => {
			const req = qualification.data.requirements.find((r) => r.id === reqId);
			if (!req) return null;
			return req.assessments[supplierId] ?? null;
		})()
	);

	let documentation = $derived(assessment?.documentation ?? 'not_assessed');
	let basis = $derived(assessment?.basis ?? 'own');
	let supportEntityName = $derived(assessment?.supportEntityName ?? '');
	let verdict = $derived(assessment?.verdict ?? 'not_assessed');
	let noteText = $derived(assessment?.notes ?? '');

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

<tr class="row-qualification-panel">
	<td colspan={colCount}>
		<div class="qpanel">
			<div class="qpanel-context">
				<span class="qpanel-supplier">{supplierName}</span>
				<span class="qpanel-sep">›</span>
				<span class="qpanel-req">{reqName}</span>
			</div>

			<div class="qpanel-body">
				<div class="qpanel-field">
					<div class="qpanel-label">Dokumentasjon</div>
					<div class="qpanel-options">
						{#each docOptions as opt}
							<button
								class="qpanel-option"
								class:option-active={documentation === opt.value}
								class:option-submitted={documentation === opt.value && opt.value === 'submitted'}
								class:option-not-submitted={documentation === opt.value && opt.value === 'not_submitted'}
								onclick={() => qualification.setDocumentation(reqId, supplierId, opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="qpanel-field">
					<div class="qpanel-label">Grunnlag</div>
					<div class="qpanel-options">
						{#each basisOptions as opt}
							<button
								class="qpanel-option"
								class:option-active={basis === opt.value}
								onclick={() => qualification.setBasis(reqId, supplierId, opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
					{#if basis === 'supported'}
						<div class="qpanel-support-input">
							<label class="qpanel-input-label" for="support-{reqId}-{supplierId}">Virksomhet</label>
							<input
								id="support-{reqId}-{supplierId}"
								class="qpanel-input"
								type="text"
								value={supportEntityName}
								oninput={(e) => qualification.setSupportEntityName(reqId, supplierId, e.currentTarget.value)}
								placeholder="Navn på støttende virksomhet..."
							/>
						</div>
					{/if}
				</div>

				<div class="qpanel-field">
					<div class="qpanel-label">Vurdering</div>
					<div class="qpanel-options">
						{#each verdictOptions as opt}
							<button
								class="qpanel-option"
								class:option-active={verdict === opt.value}
								class:option-met={verdict === opt.value && opt.value === 'met'}
								class:option-not-met={verdict === opt.value && opt.value === 'not_met'}
								onclick={() => qualification.setVerdict(reqId, supplierId, opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="qpanel-label">Begrunnelse</div>
			<textarea
				class="qpanel-textarea"
				value={noteText}
				oninput={(e) => qualification.setNote(reqId, supplierId, e.currentTarget.value)}
				placeholder="Skriv begrunnelse for vurderingen..."
			></textarea>
			{#if noteText.length > 0}
				<div class="qpanel-charcount">{noteText.length} tegn</div>
			{/if}
		</div>
	</td>
</tr>

<style>
	.row-qualification-panel td {
		padding: 0;
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
	}

	.qpanel {
		padding: var(--spacing-4) var(--spacing-5);
		border-left: 3px solid var(--color-wire-strong);
	}

	.qpanel-context {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		margin-bottom: var(--spacing-4);
		font-size: 11px;
	}

	.qpanel-supplier {
		font-weight: 600;
		color: var(--color-ink);
	}

	.qpanel-sep {
		color: var(--color-ink-ghost);
	}

	.qpanel-req {
		color: var(--color-ink-muted);
	}

	.qpanel-body {
		display: flex;
		gap: var(--spacing-6);
		align-items: flex-start;
		margin-bottom: var(--spacing-4);
		flex-wrap: wrap;
	}

	.qpanel-field {
		flex-shrink: 0;
		min-width: 160px;
	}

	.qpanel-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-2);
	}

	.qpanel-options {
		display: flex;
		gap: var(--spacing-1);
	}

	.qpanel-option {
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

	.qpanel-option:hover {
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

	.qpanel-support-input {
		margin-top: var(--spacing-2);
	}

	.qpanel-input-label {
		font-size: 10px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-1);
		display: block;
	}

	.qpanel-input {
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

	.qpanel-input:focus {
		border-color: var(--color-wire-focus);
	}

	.qpanel-input::placeholder {
		color: var(--color-ink-ghost);
	}

	.qpanel-textarea {
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

	.qpanel-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.qpanel-textarea::placeholder {
		color: var(--color-ink-ghost);
	}

	.qpanel-charcount {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
		text-align: right;
		margin-top: var(--spacing-1);
	}
</style>
