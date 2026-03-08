<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';

	let requirement = $derived(qualification.activeRequirement);

	let supplierIndex = $derived(
		qualification.data.suppliers.findIndex((s) => s.id === qualification.selectedSupplierId)
	);

	let supplier = $derived(
		supplierIndex >= 0 ? qualification.data.suppliers[supplierIndex] : null
	);

	let assessment = $derived(
		requirement && supplier ? requirement.assessments[supplier.id] : null
	);

	function prevSupplier() {
		if (supplierIndex > 0) {
			qualification.selectSupplier(qualification.data.suppliers[supplierIndex - 1].id);
		}
	}

	function nextSupplier() {
		if (supplierIndex < qualification.data.suppliers.length - 1) {
			qualification.selectSupplier(qualification.data.suppliers[supplierIndex + 1].id);
		}
	}

	/** Count filled notes for progress indicator. */
	let noteProgress = $derived.by(() => {
		if (!requirement) return { filled: 0, total: 0 };
		let total = 0;
		let filled = 0;
		for (const s of qualification.data.suppliers) {
			total++;
			if (requirement.assessments[s.id]?.notes) filled++;
		}
		return { filled, total };
	});
</script>

{#if requirement && supplier}
	<div class="panel">
		<!-- Supplier selector -->
		<div class="supplier-nav">
			<button
				class="supplier-arrow"
				onclick={prevSupplier}
				disabled={supplierIndex <= 0}
			>‹</button>
			<div class="supplier-tabs">
				{#each qualification.data.suppliers as s}
					<button
						class="supplier-tab"
						class:active={s.id === supplier.id}
						onclick={() => qualification.selectSupplier(s.id)}
					>
						{s.name}
					</button>
				{/each}
			</div>
			<button
				class="supplier-arrow"
				onclick={nextSupplier}
				disabled={supplierIndex >= qualification.data.suppliers.length - 1}
			>›</button>
		</div>

		<!-- Progress indicator -->
		<div class="progress-strip">
			<span class="progress-label">Begrunnelser</span>
			<span class="progress-count">{noteProgress.filled} / {noteProgress.total}</span>
			<div class="progress-bar">
				<div
					class="progress-fill"
					style="width: {noteProgress.total > 0 ? (noteProgress.filled / noteProgress.total) * 100 : 0}%"
				></div>
			</div>
		</div>

		<!-- Scrollable content -->
		<div class="panel-content">
			<!-- Assessment summary -->
			<div class="assessment-summary">
				<div class="summary-header">
					<span class="summary-title">Vurdering</span>
					{#if assessment}
						<span class="summary-verdict" class:verdict-met={assessment.verdict === 'met'} class:verdict-not-met={assessment.verdict === 'not_met'}>
							{#if assessment.verdict === 'met'}Oppfylt{:else if assessment.verdict === 'not_met'}Ikke oppfylt{:else}Ikke vurdert{/if}
						</span>
					{/if}
				</div>
				{#if assessment && assessment.basis === 'supported' && assessment.supportEntities.length > 0}
					<div class="summary-support">
						<span class="support-label">Støttevirksomheter:</span>
						{#each assessment.supportEntities as entity}
							<span class="support-entity">{entity.name}</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Begrunnelse textarea -->
			<div class="note-section">
				<div class="note-header">
					<span class="note-title">Begrunnelse</span>
				</div>
				<textarea
					class="note-textarea"
					value={assessment?.notes ?? ''}
					oninput={(e) => qualification.setNote(requirement.id, supplier.id, e.currentTarget.value)}
					placeholder="Begrunnelse for vurdering av {supplier.name} for {requirement.name}..."
					rows="6"
				></textarea>
			</div>
		</div>
	</div>
{:else if requirement}
	<div class="panel panel-empty">
		<p class="empty-hint">Velg en leverandør i matrisen for å skrive begrunnelse.</p>
	</div>
{/if}

<style>
	.panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.panel-empty {
		justify-content: center;
		align-items: center;
		padding: var(--spacing-4);
	}

	.empty-hint {
		font-size: 12px;
		color: var(--color-ink-ghost);
		text-align: center;
		margin: 0;
	}

	/* ── Supplier navigation ── */
	.supplier-nav {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-3);
		border-bottom: 1px solid var(--color-wire);
		flex-shrink: 0;
	}

	.supplier-arrow {
		font-size: 14px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		transition: all 0.1s;
		line-height: 1;
	}

	.supplier-arrow:hover:not(:disabled) {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.supplier-arrow:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
	}

	.supplier-arrow:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.supplier-tabs {
		display: flex;
		gap: 1px;
		flex: 1;
		min-width: 0;
		overflow-x: auto;
	}

	.supplier-tab {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		white-space: nowrap;
		transition: all 0.1s;
	}

	.supplier-tab:hover {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.supplier-tab:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
	}

	.supplier-tab.active {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
		font-weight: 600;
	}

	/* ── Progress ── */
	.progress-strip {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-3);
		border-bottom: 1px solid var(--color-wire);
		flex-shrink: 0;
	}

	.progress-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
	}

	.progress-count {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
	}

	.progress-bar {
		flex: 1;
		height: 2px;
		background: var(--color-felt-active);
		border-radius: 1px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-vekt-dim);
		border-radius: 1px;
		transition: width 0.3s ease-out;
	}

	/* ── Scrollable content ── */
	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-3);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	/* ── Assessment summary ── */
	.assessment-summary {
		border-left: 3px solid var(--color-wire-strong);
		padding-left: var(--spacing-3);
	}

	.summary-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-1);
	}

	.summary-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.summary-verdict {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-ink-ghost);
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		background: var(--color-felt-active);
	}

	.verdict-met {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.verdict-not-met {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.summary-support {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-1);
		margin-top: var(--spacing-2);
	}

	.support-label {
		font-size: 10px;
		color: var(--color-ink-ghost);
		font-weight: 500;
	}

	.support-entity {
		font-size: 10px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		background: var(--color-felt);
		padding: 1px var(--spacing-2);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-wire);
	}

	/* ── Note section ── */
	.note-section {
		border-left: 3px solid rgba(232, 168, 56, 0.15);
		padding-left: var(--spacing-3);
	}

	.note-header {
		margin-bottom: var(--spacing-2);
	}

	.note-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.note-textarea {
		width: 100%;
		padding: var(--spacing-2);
		background: var(--color-canvas);
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

	.note-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.note-textarea::placeholder {
		color: var(--color-ink-ghost);
	}
</style>
