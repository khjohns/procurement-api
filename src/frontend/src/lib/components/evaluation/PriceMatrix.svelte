<script lang="ts">
	import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';

	let qualityBudget = $derived(
		evaluation.data.contractValue * (evaluation.data.qualityWeight / 100)
	);
	let totalWeight = $derived(
		evaluation.data.criteria.reduce((s, c) => s + c.weight, 0)
	);

	/** Determine fradrag tier relative to other suppliers for this sub. */
	function fradragTier(subId: string, supplierId: string): string {
		const deductions = evaluation.priceDeductions[subId];
		if (!deductions) return '';
		const val = deductions[supplierId] ?? 0;
		const values = Object.values(deductions);
		const min = Math.min(...values);
		if (val === min) return 'fradrag-best';
		const max = Math.max(...values);
		if (val === max) return 'fradrag-high';
		return 'fradrag-mid';
	}

	function groupDeduction(criterionId: string, supplierId: string): number {
		const criterion = evaluation.data.criteria.find((c) => c.id === criterionId);
		if (!criterion) return 0;
		return criterion.subcriteria.reduce(
			(sum, sub) => sum + (evaluation.priceDeductions[sub.id]?.[supplierId] ?? 0),
			0
		);
	}

	function groupFradragTier(criterionId: string, supplierId: string): string {
		const vals = evaluation.data.suppliers.map((s) => groupDeduction(criterionId, s.id));
		const val = groupDeduction(criterionId, supplierId);
		const min = Math.min(...vals);
		if (val === min) return 'fradrag-best';
		const max = Math.max(...vals);
		if (val === max) return 'fradrag-high';
		return 'fradrag-mid';
	}
</script>

<!-- Config strip: supplier prices -->
<div class="config-strip">
	<div class="config-field">
		<span class="config-label">Kontraktsverdi</span>
		<input
			class="config-input"
			type="text"
			value={formatNOK(evaluation.data.contractValue)}
			readonly
		/>
		<span class="config-unit">kr</span>
	</div>
	<div class="config-sep"></div>
	{#each evaluation.data.suppliers as supplier}
		<div class="config-field">
			<span class="config-label">{supplier.name.split(' ')[0]}</span>
			<input
				class="config-input"
				type="text"
				value={formatNOK(supplier.price ?? 0)}
				oninput={(e) => {
					const v = parseInt(e.currentTarget.value.replace(/\s/g, ''), 10);
					if (!isNaN(v)) evaluation.setSupplierPrice(supplier.id, v);
				}}
			/>
			<span class="config-unit">kr</span>
		</div>
	{/each}
</div>

<div class="section-label">Kvalitetsfradrag</div>
<div class="matrix-wrap">
	<table class="matrix">
		<colgroup>
			<col class="col-weight" />
			<col class="col-criteria" />
			{#each evaluation.data.suppliers as _}
				<col class="col-supplier" />
			{/each}
		</colgroup>
		<thead>
			<tr>
				<th class="th-weight">Maks fradrag</th>
				<th>Kvalitetskriterier</th>
				{#each evaluation.data.suppliers as supplier}
					<th class="th-supplier">{supplier.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each evaluation.data.criteria as criterion}
				<!-- Group row -->
				<tr class="row-group">
					<td class="cell-weight">
						<div class="weight-display">
							<span class="weight-num-small">{formatNOK(qualityBudget * criterion.weight / totalWeight)}</span>
						</div>
					</td>
					<td class="cell-criteria">{criterion.name}</td>
					{#each evaluation.data.suppliers as supplier}
						{@const deduction = groupDeduction(criterion.id, supplier.id)}
						<td class="cell-pris {groupFradragTier(criterion.id, supplier.id)}">
							<span class="pris-value"><span class="pris-prefix">+</span>{formatNOK(deduction)}</span>
						</td>
					{/each}
				</tr>

				<!-- Sub-criterion rows -->
				{#each criterion.subcriteria as sub, si}
					{@const isLast = si === criterion.subcriteria.length - 1}
					<tr class="row-sub" class:row-group-last={isLast}>
						<td class="cell-weight">
							<div class="weight-display">
								<span class="weight-num-small muted">{formatNOK(qualityBudget * sub.weight / totalWeight)}</span>
							</div>
						</td>
						<td class="cell-criteria">{sub.name}</td>
						{#each evaluation.data.suppliers as supplier}
							{@const deduction = evaluation.priceDeductions[sub.id]?.[supplier.id] ?? 0}
							<td class="cell-pris {fradragTier(sub.id, supplier.id)}">
								<span class="pris-value">{formatNOK(deduction)}</span>
							</td>
						{/each}
					</tr>
				{/each}
			{/each}

			<!-- Summation rows -->
			<tr class="row-pris-sum">
				<td class="cell-weight"></td>
				<td class="cell-criteria">Tilbudt pris</td>
				{#each evaluation.data.suppliers as supplier}
					{@const prices = evaluation.data.suppliers.map((s) => s.price ?? 0)}
					{@const minPrice = Math.min(...prices)}
					<td class="cell-pris" class:fradrag-best={(supplier.price ?? 0) === minPrice}>
						<span class="pris-value">{formatNOK(supplier.price ?? 0)}</span>
					</td>
				{/each}
			</tr>

			<tr class="row-pris-sum">
				<td class="cell-weight">
					<div class="weight-display">
						<span class="weight-num-small">{formatNOK(qualityBudget)}</span>
					</div>
				</td>
				<td class="cell-criteria">Sum kvalitetsfradrag</td>
				{#each evaluation.data.suppliers as supplier}
					<td class="cell-pris fradrag-mid">
						<span class="pris-value"><span class="pris-prefix">+</span>{formatNOK(evaluation.totalDeductions[supplier.id])}</span>
					</td>
				{/each}
			</tr>

			<tr class="row-pris-result">
				<td class="cell-weight"></td>
				<td class="cell-criteria">Evaluert pris</td>
				{#each evaluation.data.suppliers as supplier}
					{@const price = evaluation.evaluatedPrices[supplier.id]}
					{@const minPrice = Math.min(...Object.values(evaluation.evaluatedPrices))}
					<td class="cell-pris" class:fradrag-best={price === minPrice}>
						<span class="pris-value">{formatNOK(price)}</span>
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
		color: var(--ink-muted);
		margin-bottom: var(--sp-3);
		margin-top: var(--sp-6);
	}

	.config-strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-4);
		align-items: center;
		padding: var(--sp-3) var(--sp-4);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-md);
		margin-bottom: var(--sp-6);
	}

	.config-field {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
	}

	.config-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--ink-muted);
		white-space: nowrap;
	}

	.config-input {
		width: 112px;
		padding: var(--sp-1) var(--sp-2);
		background: var(--canvas);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		color: var(--ink);
		font-family: var(--font-data);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		text-align: right;
		outline: none;
		transition: border-color 0.12s;
	}

	.config-input:focus { border-color: var(--wire-focus); }

	.config-unit {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--ink-ghost);
	}

	.config-sep {
		width: 1px;
		height: 24px;
		background: var(--wire);
	}

	.matrix-wrap {
		overflow-x: auto;
		border-radius: var(--r-lg);
		border: 1px solid var(--wire);
	}

	.matrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.col-weight { width: 100px; }
	.col-criteria { width: auto; }
	.col-supplier { width: 140px; }

	.matrix th {
		padding: var(--sp-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-muted);
		background: var(--felt);
		border-bottom: 1px solid var(--wire);
		text-align: left;
	}

	.th-weight { text-align: center; }
	.th-supplier { text-align: center; }

	.cell-weight {
		padding: var(--sp-2) var(--sp-3);
		vertical-align: middle;
		border-left: 3px solid var(--vekt);
		text-align: center;
	}

	.weight-display {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.weight-num-small {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--ink-secondary);
	}

	.weight-num-small.muted { color: var(--ink-muted); font-size: 10px; }

	.cell-criteria {
		padding: var(--sp-2) var(--sp-3);
		font-weight: 500;
		color: var(--ink-secondary);
	}

	.row-group { background: var(--felt); }
	.row-group .cell-criteria { font-weight: 600; color: var(--ink); }
	.row-sub { background: var(--canvas); border-bottom: 1px solid var(--wire); }
	.row-sub .cell-criteria { padding-left: var(--sp-6); color: var(--ink-muted); }
	.row-group-last { border-bottom: 1px solid var(--wire-strong); }

	.cell-pris {
		text-align: center;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		padding: var(--sp-2) var(--sp-3);
	}

	.pris-value {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		padding: var(--sp-1) var(--sp-2);
		border-radius: var(--r-sm);
		font-weight: 500;
		line-height: 1;
	}

	.pris-prefix { font-size: 10px; color: var(--ink-ghost); font-weight: 400; }

	.fradrag-best .pris-value { background: var(--score-high-bg); color: var(--score-high); font-weight: 600; }
	.fradrag-mid .pris-value { color: var(--ink); }
	.fradrag-high .pris-value { color: var(--score-low); }

	.row-pris-sum td {
		background: var(--canvas);
		border-top: 1px solid var(--wire-strong);
		padding: var(--sp-3) var(--sp-3) var(--sp-2);
	}

	.row-pris-sum td:first-child { border-left: 3px solid var(--vekt); }

	.row-pris-sum .cell-criteria {
		font-weight: 600;
		font-size: 12px;
		color: var(--ink-secondary);
	}

	.row-pris-result td {
		background: var(--canvas);
		border-bottom: none;
		padding: var(--sp-2) var(--sp-3) var(--sp-4);
	}

	.row-pris-result td:first-child { border-left: 3px solid var(--vekt); }

	.row-pris-result .cell-criteria {
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-secondary);
	}

	.row-pris-result .pris-value {
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.row-pris-result .fradrag-best .pris-value {
		color: var(--vekt);
		background: var(--vekt-bg);
		padding: var(--sp-1) var(--sp-3);
	}
</style>
