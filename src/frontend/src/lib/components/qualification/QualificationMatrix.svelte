<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';
	import QualificationCell from './QualificationCell.svelte';
	import QualificationPanel from './QualificationPanel.svelte';

	let expandedPanel = $state<string | null>(null);

	function togglePanel(reqId: string, supplierId: string) {
		const key = `${reqId}:${supplierId}`;
		expandedPanel = expandedPanel === key ? null : key;
	}

	function countNotMet(supplierId: string): number {
		let count = 0;
		for (const req of qualification.data.requirements) {
			if (req.assessments[supplierId]?.verdict === 'not_met') count++;
		}
		return count;
	}
</script>

<div class="section-label">Kvalifikasjonsmatrise</div>
<div class="qmatrix-wrap">
	<table class="qmatrix">
		<colgroup>
			<col class="col-req" />
			{#each qualification.data.suppliers as _}
				<col class="col-supplier" />
			{/each}
		</colgroup>
		<thead>
			<tr>
				<th>Kvalifikasjonskrav</th>
				{#each qualification.data.suppliers as supplier}
					<th class="th-supplier">{supplier.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each qualification.data.requirements as req, ri}
				{@const isLast = ri === qualification.data.requirements.length - 1}
				<tr class="row-req" class:row-last={isLast}>
					<td class="cell-req">
						<div class="req-name">{req.name}</div>
						{#if req.description}
							<div class="req-desc">{req.description}</div>
						{/if}
					</td>
					{#each qualification.data.suppliers as supplier}
						{@const a = req.assessments[supplier.id]}
						{@const verdict = a?.verdict ?? 'not_assessed'}
						{@const hasSupport = a?.basis === 'supported' && !!a?.supportEntityName}
						{@const hasNotes = !!(a?.notes)}
						{@const panelKey = `${req.id}:${supplier.id}`}
						<QualificationCell
							{verdict}
							{hasSupport}
							{hasNotes}
							expanded={expandedPanel === panelKey}
							onclick={() => togglePanel(req.id, supplier.id)}
						/>
					{/each}
				</tr>

				<!-- Expansion panels -->
				{#each qualification.data.suppliers as supplier}
					{#if expandedPanel === `${req.id}:${supplier.id}`}
						<QualificationPanel
							reqId={req.id}
							reqName={req.name}
							supplierId={supplier.id}
							supplierName={supplier.name}
						/>
					{/if}
				{/each}
			{/each}

			<!-- Result row -->
			<tr class="row-result">
				<td class="cell-req cell-result-label">Kvalifisert</td>
				{#each qualification.data.suppliers as supplier}
					{@const result = qualification.supplierResults[supplier.id]}
					{@const allAssessed = result ? (result.met + countNotMet(supplier.id)) === result.total : false}
					<td
						class="cell-result"
						class:result-qualified={result?.qualified}
						class:result-rejected={allAssessed && !result?.qualified}
					>
						{#if result?.qualified}
							<span class="result-value result-yes">Ja</span>
						{:else if allAssessed}
							<span class="result-value result-no">Nei</span>
						{:else}
							<span class="result-value result-pending">—</span>
						{/if}
					</td>
				{/each}
			</tr>
		</tbody>
	</table>
</div>

<!-- Progress -->
<div class="qual-progress">
	<div class="progress-item">
		<span class="progress-label">Vurderinger</span>
		<span class="progress-value">{qualification.progress.assessments.filled} / {qualification.progress.assessments.total}</span>
		<div class="progress-bar">
			<div
				class="progress-bar-fill"
				style="width: {(qualification.progress.assessments.filled / Math.max(qualification.progress.assessments.total, 1)) * 100}%"
			></div>
		</div>
	</div>
	<div class="progress-item">
		<span class="progress-label">Dokumentasjon</span>
		<span class="progress-value">{qualification.progress.documentation.filled} / {qualification.progress.documentation.total}</span>
		<div class="progress-bar">
			<div
				class="progress-bar-fill partial"
				style="width: {(qualification.progress.documentation.filled / Math.max(qualification.progress.documentation.total, 1)) * 100}%"
			></div>
		</div>
	</div>
</div>

<style>
	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		margin-bottom: var(--sp-3);
		margin-top: var(--sp-6);
	}

	.qmatrix-wrap {
		overflow-x: auto;
		border-radius: var(--r-lg);
		border: 1px solid var(--wire);
	}

	.qmatrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.col-req { width: auto; }
	.col-supplier { width: 140px; }

	.qmatrix th {
		padding: var(--sp-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		background: var(--felt);
		border-bottom: 1px solid var(--wire);
		text-align: left;
	}

	.th-supplier {
		text-align: center;
	}

	.row-req {
		background: var(--canvas);
		border-bottom: 1px solid var(--wire);
	}

	.row-req:hover {
		background: var(--felt-hover);
	}

	.row-last {
		border-bottom: 1px solid var(--wire-strong);
	}

	.cell-req {
		padding: var(--sp-3) var(--sp-4);
		border-left: 3px solid var(--wire-strong);
	}

	.req-name {
		font-weight: 600;
		color: var(--ink);
		font-size: 12px;
		margin-bottom: 2px;
	}

	.req-desc {
		font-size: 11px;
		color: var(--ink-muted);
		line-height: 1.4;
	}

	/* Result row */
	.row-result {
		background: var(--canvas);
		border-top: 2px solid var(--wire-strong);
	}

	.cell-result-label {
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink);
		border-left: 3px solid var(--wire-strong);
	}

	.cell-result {
		text-align: center;
		padding: var(--sp-3);
	}

	.result-value {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--sp-1) var(--sp-3);
		border-radius: var(--r-sm);
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 700;
	}

	.result-yes {
		color: var(--score-high);
		background: var(--score-high-bg);
	}

	.result-no {
		color: var(--score-low);
		background: var(--score-low-bg);
	}

	.result-pending {
		color: var(--ink-ghost);
	}

	/* Progress */
	.qual-progress {
		margin-top: var(--sp-6);
		display: flex;
		align-items: center;
		gap: var(--sp-6);
	}

	.progress-item {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		font-size: 12px;
		color: var(--ink-muted);
	}

	.progress-label {
		color: var(--ink-ghost);
		font-size: 11px;
	}

	.progress-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		color: var(--ink-secondary);
	}

	.progress-bar {
		width: 80px;
		height: 3px;
		background: var(--felt-raised);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--score-high);
		transition: width 0.3s ease-out;
	}

	.progress-bar-fill.partial {
		background: var(--vekt-dim);
	}
</style>
