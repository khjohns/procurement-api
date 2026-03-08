<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';
	import QualificationCell from './QualificationCell.svelte';
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
				<th class="th-req">Kvalifikasjonskrav</th>
				{#each qualification.data.suppliers as supplier}
					<th class="th-supplier">{supplier.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each qualification.data.requirements as req, ri}
				{@const isLast = ri === qualification.data.requirements.length - 1}
				<tr
					class="row-req"
					class:row-last={isLast}
					onclick={() => qualification.setActiveView(req.id)}
					role="button"
					tabindex={0}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); qualification.setActiveView(req.id); } }}
				>
					<td class="cell-req">
						<div class="req-name">{req.name}<span class="drill-chevron">›</span></div>
						{#if req.description}
							<div class="req-desc">{req.description}</div>
						{/if}
					</td>
					{#each qualification.data.suppliers as supplier}
						{@const a = req.assessments[supplier.id]}
						{@const verdict = a?.verdict ?? 'not_assessed'}
						{@const hasSupport = a?.basis === 'supported' && !!a?.supportEntityName}
						{@const hasNotes = !!(a?.notes)}
						<QualificationCell
							{verdict}
							{hasSupport}
							{hasNotes}
							expanded={false}
							onclick={() => { /* row handles navigation */ }}
						/>
					{/each}
				</tr>
			{/each}

			<!-- Result row -->
			<tr class="row-result">
				<td class="cell-req cell-result-label">Kvalifisert</td>
				{#each qualification.data.suppliers as supplier}
					{@const r = qualification.supplierResults[supplier.id]}
					<td
						class="cell-result"
						class:result-qualified={r?.qualified}
						class:result-rejected={r?.allAssessed && !r?.qualified}
					>
						{#if r?.qualified}
							<span class="result-value result-yes">Ja</span>
						{:else if r?.allAssessed}
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

<style>
	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-3);
	}

	.qmatrix-wrap {
		overflow-x: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-wire);
	}

	.qmatrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.col-req { width: auto; }
	.col-supplier { width: 140px; }

	.qmatrix th {
		padding: var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire);
		text-align: left;
	}

	.th-req {
		padding-left: var(--spacing-4);
	}

	.th-supplier {
		text-align: center;
	}

	.row-req {
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
		cursor: pointer;
		transition: background 0.08s;
	}

	.row-req:hover {
		background: var(--color-felt-hover);
	}

	.row-req:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
	}

	.row-last {
		border-bottom: 1px solid var(--color-wire-strong);
	}

	.cell-req {
		padding: var(--spacing-3) var(--spacing-4);
		border-left: 3px solid var(--color-wire-strong);
	}

	.req-name {
		font-weight: 600;
		color: var(--color-ink);
		font-size: 12px;
		margin-bottom: 2px;
	}

	.drill-chevron {
		font-size: 14px;
		color: var(--color-ink-ghost);
		margin-left: var(--spacing-2);
		opacity: 0;
		transition: opacity 0.1s;
	}

	.row-req:hover .drill-chevron {
		opacity: 1;
	}

	.req-desc {
		font-size: 11px;
		color: var(--color-ink-muted);
		line-height: 1.4;
	}

	/* Result row */
	.row-result {
		background: var(--color-canvas);
		border-top: 2px solid var(--color-wire-strong);
	}

	.cell-result-label {
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink);
		border-left: 3px solid var(--color-wire-strong);
	}

	.cell-result {
		text-align: center;
		padding: var(--spacing-3);
	}

	.result-value {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-sm);
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 700;
	}

	.result-yes {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.result-no {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.result-pending {
		color: var(--color-ink-ghost);
	}
</style>
