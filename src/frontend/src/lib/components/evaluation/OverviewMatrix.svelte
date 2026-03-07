<script lang="ts">
	import { evaluation, scoreTier } from '$lib/stores/evaluation.svelte';

	let totalWeight = $derived(
		evaluation.data.criteria.reduce((s, c) => s + c.weight, 0)
	);
</script>

<div class="section-label">Oversikt — alle tildelingskriterier</div>
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
			{#each evaluation.data.criteria as criterion}
				{@const isQuality = criterion.type === 'quality'}
				<tr
					class="row-criterion"
					class:row-clickable={isQuality}
					onclick={() => { if (isQuality) evaluation.setActiveView(criterion.id); }}
					role={isQuality ? 'button' : undefined}
					tabindex={isQuality ? 0 : undefined}
					onkeydown={(e) => { if (isQuality && (e.key === 'Enter' || e.key === ' ')) evaluation.setActiveView(criterion.id); }}
				>
					<td class="cell-weight">
						<div class="weight-display">
							<span class="weight-num">{criterion.weight}<span class="weight-pct">%</span></span>
							<div class="weight-bar">
								<div class="weight-bar-fill" style="width: {(criterion.weight / 40) * 100}%"></div>
							</div>
						</div>
					</td>
					<td class="cell-criteria">
						<div class="criteria-content">
							<span class="criteria-name">{criterion.name}</span>
							{#if isQuality}
								<span class="criteria-sub-count">{criterion.subcriteria.length} underkriterier</span>
							{/if}
							{#if isQuality}
								<span class="criteria-arrow">→</span>
							{/if}
						</div>
					</td>
					{#each evaluation.data.suppliers as supplier}
						{@const score = evaluation.groupScores[criterion.id]?.[supplier.id] ?? 0}
						{@const tier = scoreTier(score)}
						{@const best = evaluation.bestGroupScores[criterion.id] ?? 0}
						{@const isBest = score === best && score > 0}
						<td class="cell-score score-{tier}" class:score-best={isBest}>
							<span class="score-value">
								{score > 0 ? score.toFixed(1) : '—'}
							</span>
						</td>
					{/each}
				</tr>
			{/each}

			<!-- Total row -->
			<tr class="row-total">
				<td class="cell-weight">
					<div class="weight-display">
						<span class="weight-num">{totalWeight}<span class="weight-pct">%</span></span>
					</div>
				</td>
				<td class="cell-criteria">
					<span class="criteria-name total-label">Totalsum</span>
				</td>
				{#each evaluation.data.suppliers as supplier}
					{@const score = evaluation.totals[supplier.id] ?? 0}
					{@const bestTotal = Math.max(...Object.values(evaluation.totals))}
					{@const isBest = score === bestTotal && score > 0}
					{@const tier = scoreTier(score)}
					<td class="cell-score cell-total score-{tier}" class:score-best={isBest}>
						<span class="score-value">{score > 0 ? score.toFixed(1) : '—'}</span>
					</td>
				{/each}
			</tr>
		</tbody>
	</table>
</div>

{#if totalWeight !== 100}
	<div class="weight-warning">Vektsum: {totalWeight} % (forventet 100 %)</div>
{/if}

<style>
	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin-bottom: var(--spacing-3);
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
		padding: var(--spacing-3);
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

	/* Rows */
	.row-criterion {
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire);
		transition: background 0.08s;
	}

	.row-clickable {
		cursor: pointer;
	}

	.row-clickable:hover {
		background: var(--color-felt-hover);
	}

	.row-clickable:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
	}

	.row-total {
		background: var(--color-canvas);
		border-top: 2px solid var(--color-wire-strong);
	}

	/* Weight column */
	.cell-weight {
		padding: var(--spacing-3);
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
		padding: var(--spacing-3);
	}

	.criteria-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.criteria-name {
		font-weight: 600;
		color: var(--color-ink);
		font-size: 12px;
	}

	.total-label {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.criteria-sub-count {
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	.criteria-arrow {
		margin-left: auto;
		font-size: 12px;
		color: var(--color-ink-ghost);
		transition: color 0.1s, transform 0.1s;
	}

	.row-clickable:hover .criteria-arrow {
		color: var(--color-vekt);
		transform: translateX(2px);
	}

	/* Score cells */
	.cell-score {
		text-align: center;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 14px;
		font-weight: 600;
		padding: var(--spacing-3);
	}

	.cell-total {
		font-size: 16px;
		font-weight: 700;
	}

	.score-value {
		display: inline-block;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		line-height: 1;
	}

	.score-high .score-value { color: var(--color-score-high); }
	.score-mid .score-value { color: var(--color-ink-secondary); }
	.score-low .score-value { color: var(--color-score-low); }

	.score-best .score-value {
		background: var(--color-score-high-bg);
		font-weight: 700;
	}

	.row-total .score-best .score-value {
		background: var(--color-vekt-bg);
		color: var(--color-vekt);
	}

	/* Weight warning */
	.weight-warning {
		margin-top: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-3);
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--color-score-low);
	}
</style>
