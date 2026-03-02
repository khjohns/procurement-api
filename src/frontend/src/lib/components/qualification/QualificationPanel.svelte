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
		background: var(--canvas);
		border-bottom: 1px solid var(--wire);
	}

	.qpanel {
		padding: var(--sp-4) var(--sp-5);
		border-left: 3px solid var(--wire-strong);
	}

	.qpanel-context {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin-bottom: var(--sp-4);
		font-size: 11px;
	}

	.qpanel-supplier {
		font-weight: 600;
		color: var(--ink);
	}

	.qpanel-sep {
		color: var(--ink-ghost);
	}

	.qpanel-req {
		color: var(--ink-muted);
	}

	.qpanel-body {
		display: flex;
		gap: var(--sp-6);
		align-items: flex-start;
		margin-bottom: var(--sp-4);
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
		color: var(--ink-ghost);
		margin-bottom: var(--sp-2);
	}

	.qpanel-options {
		display: flex;
		gap: var(--sp-1);
	}

	.qpanel-option {
		padding: var(--sp-2) var(--sp-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-muted);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s, color 0.12s;
		white-space: nowrap;
	}

	.qpanel-option:hover {
		background: var(--felt-hover);
		border-color: var(--wire-strong);
		color: var(--ink);
	}

	.option-active {
		background: var(--felt-active);
		border-color: var(--wire-strong);
		color: var(--ink);
		font-weight: 600;
	}

	.option-submitted {
		background: var(--score-high-bg);
		border-color: rgba(61, 154, 110, 0.18);
		color: var(--score-high);
	}

	.option-not-submitted {
		background: var(--score-low-bg);
		border-color: rgba(196, 88, 88, 0.18);
		color: var(--score-low);
	}

	.option-met {
		background: var(--score-high-bg);
		border-color: rgba(61, 154, 110, 0.18);
		color: var(--score-high);
	}

	.option-not-met {
		background: var(--score-low-bg);
		border-color: rgba(196, 88, 88, 0.18);
		color: var(--score-low);
	}

	.qpanel-support-input {
		margin-top: var(--sp-2);
	}

	.qpanel-input-label {
		font-size: 10px;
		font-weight: 500;
		color: var(--ink-ghost);
		margin-bottom: var(--sp-1);
		display: block;
	}

	.qpanel-input {
		width: 100%;
		max-width: 280px;
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

	.qpanel-input:focus {
		border-color: var(--wire-focus);
	}

	.qpanel-input::placeholder {
		color: var(--ink-ghost);
	}

	.qpanel-textarea {
		width: 100%;
		min-height: 64px;
		padding: var(--sp-3);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.5;
		resize: vertical;
		outline: none;
		transition: border-color 0.12s;
	}

	.qpanel-textarea:focus {
		border-color: var(--wire-focus);
	}

	.qpanel-textarea::placeholder {
		color: var(--ink-ghost);
	}

	.qpanel-charcount {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--ink-ghost);
		text-align: right;
		margin-top: var(--sp-1);
	}
</style>
