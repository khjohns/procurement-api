<script lang="ts">
	import { evaluation, scoreTier } from '$lib/stores/evaluation.svelte';
	import ScoreCell from './ScoreCell.svelte';
	import AnnotationPanel from './AnnotationPanel.svelte';
	import ItemEvaluationPanel from './ItemEvaluationPanel.svelte';

	/** Which panel is expanded: "subId:supplierId" or null. */
	let expandedAnnotation = $state<string | null>(null);

	function toggleAnnotation(subId: string, supplierId: string) {
		const key = `${subId}:${supplierId}`;
		expandedAnnotation = expandedAnnotation === key ? null : key;
	}

	let totalWeight = $derived(
		evaluation.data.criteria.reduce((s, c) => s + c.weight, 0)
	);
</script>

<div class="section-label">Evalueringsmatrise</div>
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
				<th class="th-weight">Vekt</th>
				<th>Tildelingskriterier</th>
				{#each evaluation.data.suppliers as supplier}
					<th class="th-supplier">{supplier.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each evaluation.data.criteria as criterion, ci}
				<!-- Group row -->
				<tr class="row-group">
					<td class="cell-weight">
						<div class="weight-display">
							<span class="weight-num">{criterion.weight}<span class="weight-pct">%</span></span>
							<div class="weight-bar">
								<div class="weight-bar-fill" style="width: {(criterion.weight / 35) * 100}%"></div>
							</div>
						</div>
					</td>
					<td class="cell-criteria">{criterion.name}</td>
					{#each evaluation.data.suppliers as supplier}
						{@const score = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
						{@const isBest = score === evaluation.bestGroupScore(criterion.id) && score > 0}
						<ScoreCell {score} {isBest} />
					{/each}
				</tr>

				<!-- Sub-criterion rows -->
				{#each criterion.subcriteria as sub, si}
					{@const isLast = si === criterion.subcriteria.length - 1}
					{@const isItemEval = sub.evaluationType === 'item'}
					<tr class="row-sub" class:row-group-last={isLast}>
						<td class="cell-weight">
							<div class="weight-display">
								<span class="weight-num">{sub.weight}<span class="weight-pct">%</span></span>
								<div class="weight-bar">
									<div class="weight-bar-fill" style="width: {(sub.weight / 35) * 100}%"></div>
								</div>
							</div>
						</td>
						<td class="cell-criteria">{sub.name}</td>
						{#each evaluation.data.suppliers as supplier}
							{@const score = isItemEval
								? (evaluation.itemScores[sub.id]?.[supplier.id] ?? 0)
								: (sub.scores[supplier.id] ?? 0)}
							{@const isBest = score === evaluation.bestScore(sub.id) && score > 0}
							{@const hasNotes = !!sub.notes[supplier.id]}
							{@const panelKey = `${sub.id}:${supplier.id}`}
							<ScoreCell
								{score}
								{isBest}
								{hasNotes}
								drilldown={isItemEval}
								expanded={expandedAnnotation === panelKey}
								onclick={() => toggleAnnotation(sub.id, supplier.id)}
							/>
						{/each}
					</tr>

					<!-- Expansion panel (if expanded) -->
					{#each evaluation.data.suppliers as supplier}
						{#if expandedAnnotation === `${sub.id}:${supplier.id}`}
							{#if isItemEval && sub.itemCriteria}
								<ItemEvaluationPanel
									subCriterionId={sub.id}
									subCriterionName={sub.name}
									supplierId={supplier.id}
									supplierName={supplier.name}
									itemLabel={sub.itemLabel ?? 'Element'}
									itemCriteria={sub.itemCriteria}
									items={sub.items?.[supplier.id] ?? []}
									aggregation={sub.aggregation ?? 'average'}
									aggregatedScore={evaluation.itemScores[sub.id]?.[supplier.id] ?? 0}
								/>
							{:else}
								<AnnotationPanel
									subCriterionId={sub.id}
									subCriterionName={sub.name}
									supplierId={supplier.id}
									supplierName={supplier.name}
									score={sub.scores[supplier.id] ?? 0}
								/>
							{/if}
						{/if}
					{/each}
				{/each}
			{/each}

			<!-- Total row -->
			<tr class="row-total">
				<td class="cell-weight">
					<div class="weight-display">
						<span class="weight-num">{totalWeight}<span class="weight-pct">%</span></span>
					</div>
				</td>
				<td class="cell-criteria">Totalsum</td>
				{#each evaluation.data.suppliers as supplier}
					{@const score = evaluation.totals[supplier.id] ?? 0}
					{@const bestTotal = Math.max(...Object.values(evaluation.totals))}
					{@const isBest = score === bestTotal && score > 0}
					<ScoreCell {score} {isBest} />
				{/each}
			</tr>
		</tbody>
	</table>
</div>

<!-- Progress -->
<div class="eval-progress">
	<div class="progress-item">
		<span class="progress-label">Poenggiving</span>
		<span class="progress-value">{evaluation.progress.scores.filled} / {evaluation.progress.scores.total}</span>
		<div class="progress-bar">
			<div
				class="progress-bar-fill"
				style="width: {(evaluation.progress.scores.filled / evaluation.progress.scores.total) * 100}%"
			></div>
		</div>
	</div>
	<div class="progress-item">
		<span class="progress-label">Begrunnelser</span>
		<span class="progress-value">{evaluation.progress.notes.filled} / {evaluation.progress.notes.total}</span>
		<div class="progress-bar">
			<div
				class="progress-bar-fill partial"
				style="width: {(evaluation.progress.notes.filled / evaluation.progress.notes.total) * 100}%"
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
		color: var(--color-ink-muted);
		margin-bottom: var(--spacing-3);
		margin-top: var(--spacing-6);
	}

	.matrix-wrap {
		overflow-x: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-wire);
	}

	.matrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.col-weight { width: 80px; }
	.col-criteria { width: auto; }
	.col-supplier { width: 140px; }

	.matrix th {
		padding: var(--spacing-3) var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire);
		text-align: left;
	}

	.th-weight { text-align: center; }
	.th-supplier { text-align: center; }

	/* Weight column */
	.cell-weight {
		padding: var(--spacing-2) var(--spacing-3);
		vertical-align: middle;
		border-left: 3px solid var(--color-vekt);
	}

	.weight-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-1);
	}

	.weight-num {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-vekt-dim);
	}

	.weight-pct {
		font-size: 9px;
		font-weight: 400;
		color: var(--color-ink-ghost);
	}

	.weight-bar {
		width: 48px;
		height: 2px;
		background: var(--color-felt-active);
		border-radius: 1px;
		overflow: hidden;
	}

	.weight-bar-fill {
		height: 100%;
		background: var(--color-vekt-dim);
		border-radius: 1px;
	}

	/* Criteria column */
	.cell-criteria {
		padding: var(--spacing-2) var(--spacing-3);
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	/* Row types */
	.row-group {
		background: var(--color-felt);
	}

	.row-group .cell-criteria {
		font-weight: 600;
		color: var(--color-ink);
		font-size: 12px;
	}

	.row-sub {
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
	}

	.row-sub .cell-weight {
		border-left-color: rgba(232, 168, 56, 0.15);
	}

	.row-sub .cell-criteria {
		padding-left: var(--spacing-6);
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.row-group-last {
		border-bottom: 1px solid var(--color-wire-strong);
	}

	.row-total {
		background: var(--color-canvas);
		border-top: 2px solid var(--color-wire-strong);
	}

	.row-total .cell-criteria {
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink);
	}

	.row-total .cell-weight {
		border-left-color: var(--color-vekt);
	}

	/* Progress */
	.eval-progress {
		margin-top: var(--spacing-6);
		display: flex;
		align-items: center;
		gap: var(--spacing-6);
	}

	.progress-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.progress-label {
		color: var(--color-ink-ghost);
		font-size: 11px;
	}

	.progress-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.progress-bar {
		width: 80px;
		height: 3px;
		background: var(--color-felt-raised);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--color-score-high);
		transition: width 0.3s ease-out;
	}

	.progress-bar-fill.partial {
		background: var(--color-vekt-dim);
	}
</style>
