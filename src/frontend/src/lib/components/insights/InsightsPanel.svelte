<script lang="ts">
	import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';

	let collapsed = $state(false);
	let activeTab = $state<'betalingsvilje' | 'robusthet' | 'metodekontroll'>('betalingsvilje');

	const tabs = [
		{ id: 'betalingsvilje' as const, label: 'Betalingsvilje' },
		{ id: 'robusthet' as const, label: 'Robusthet' },
		{ id: 'metodekontroll' as const, label: 'Metodekontroll' }
	];

	let qualityBudget = $derived(
		evaluation.data.contractValue * (evaluation.data.qualityWeight / 100)
	);
	let totalWeight = $derived(
		evaluation.data.criteria.reduce((s, c) => s + c.weight, 0)
	);

	/** Robustness: margin between #1 and #2 */
	let margin = $derived(
		evaluation.ranking.length >= 2
			? evaluation.ranking[0].score - evaluation.ranking[1].score
			: 0
	);

	/** Criterion with largest spread. */
	let largestSpread = $derived.by(() => {
		let best = { name: '', spread: 0, low: 0, high: 0, leader: '' };
		for (const c of evaluation.data.criteria) {
			const scores = evaluation.data.suppliers.map(
				(s) => evaluation.groupScores[c.id]?.[s.id] ?? 0
			);
			const spread = Math.max(...scores) - Math.min(...scores);
			if (spread > best.spread) {
				const leadIdx = scores.indexOf(Math.max(...scores));
				best = {
					name: c.name,
					spread,
					low: Math.min(...scores),
					high: Math.max(...scores),
					leader: evaluation.data.suppliers[leadIdx]?.name ?? ''
				};
			}
		}
		return best;
	});

	/** Whether both methods agree on winner. */
	let sameWinner = $derived(
		evaluation.ranking[0]?.supplier.id === evaluation.priceRanking[0]?.supplier.id
	);

	/** Criterion with highest weight. */
	let heaviestCriterion = $derived.by(() => {
		let best = { name: '', weight: 0 };
		for (const c of evaluation.data.criteria) {
			if (c.weight > best.weight) best = { name: c.name, weight: c.weight };
		}
		return best;
	});
</script>

<div class="innsikt" class:collapsed>
	<button class="innsikt-toggle" onclick={() => (collapsed = !collapsed)}>
		<span class="innsikt-toggle-icon">&#9662;</span>
		Innsikt
	</button>

	{#if !collapsed}
		<div class="innsikt-body">
			<div class="innsikt-tabs">
				{#each tabs as tab}
					<button
						class="innsikt-tab"
						class:active={activeTab === tab.id}
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Betalingsvilje -->
			{#if activeTab === 'betalingsvilje'}
				<div class="innsikt-pane">
					<table class="bv-table">
						<thead>
							<tr>
								<th>Kriterium</th>
								<th class="num">Vekt</th>
								<th class="num">Implisitt maks fradrag</th>
								<th class="num">Per poeng</th>
							</tr>
						</thead>
						<tbody>
							{#each evaluation.data.criteria as criterion}
								{@const maxDeduction = qualityBudget * (criterion.weight / totalWeight)}
								<tr>
									<td class="bv-criterion">{criterion.name}</td>
									<td class="bv-weight">{criterion.weight} %</td>
									<td class="bv-value">{formatNOK(maxDeduction)} kr</td>
									<td class="bv-per-point">{formatNOK(maxDeduction / 10)} kr</td>
								</tr>
								{#each criterion.subcriteria as sub}
									{@const subMaxDeduction = qualityBudget * (sub.weight / totalWeight)}
									<tr>
										<td class="bv-sub">{sub.name}</td>
										<td class="bv-weight">{sub.weight} %</td>
										<td class="bv-value">{formatNOK(subMaxDeduction)} kr</td>
										<td class="bv-per-point">{formatNOK(subMaxDeduction / 10)} kr</td>
									</tr>
								{/each}
							{/each}
							<tr class="bv-total">
								<td class="bv-criterion">Sum kvalitetskriterier</td>
								<td class="bv-weight">{evaluation.data.qualityWeight} %</td>
								<td class="bv-value">{formatNOK(qualityBudget)} kr</td>
								<td class="bv-per-point"></td>
							</tr>
						</tbody>
					</table>

					<div class="bv-summary">
						Med kontraktsverdi <span class="bv-highlight">{formatNOK(evaluation.data.contractValue)} kr</span>
						og kvalitetsvekt <strong>{evaluation.data.qualityWeight} %</strong>,
						er total betalingsvilje <span class="bv-highlight">{formatNOK(qualityBudget)} kr</span>.
					</div>
				</div>
			{/if}

			<!-- Robusthet -->
			{#if activeTab === 'robusthet'}
				<div class="innsikt-pane">
					<div class="robusthet-ranking">
						{#each evaluation.ranking as entry}
							<div class="robusthet-item" class:leader={entry.rank === 1}>
								<span class="robusthet-rank">#{entry.rank}</span>
								<span class="robusthet-name">{entry.supplier.name}</span>
								<span class="robusthet-score">{entry.score.toFixed(1)}</span>
								<span class="robusthet-margin">
									{entry.rank === 1
										? 'leder'
										: `\u2212${(evaluation.ranking[0].score - entry.score).toFixed(1)}`}
								</span>
							</div>
						{/each}
					</div>

					<div class="robusthet-insights">
						<div class="robusthet-insight">
							<div class="robusthet-insight-label">Margin</div>
							<div class="robusthet-insight-text">
								Marginen mellom <strong>#1</strong> og <strong>#2</strong> er
								<span class="mono">{margin.toFixed(1)}</span> poeng.
								Resultatet er <strong>{margin >= 0.5 ? 'robust' : margin >= 0.2 ? 'moderat robust' : 'sårbart'}</strong>.
							</div>
						</div>
						<div class="robusthet-insight">
							<div class="robusthet-insight-label">Størst påvirkning</div>
							<div class="robusthet-insight-text">
								<strong>{heaviestCriterion.name}</strong> ({heaviestCriterion.weight} %) har størst innvirkning på resultatet.
							</div>
						</div>
						<div class="robusthet-insight">
							<div class="robusthet-insight-label">Størst spredning</div>
							<div class="robusthet-insight-text">
								<strong>{largestSpread.name}</strong> har størst spredning mellom leverandørene
								(fra <span class="mono">{largestSpread.low.toFixed(1)}</span> til <span class="mono">{largestSpread.high.toFixed(1)}</span>).
								{largestSpread.leader} skiller seg positivt ut her.
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Metodekontroll -->
			{#if activeTab === 'metodekontroll'}
				<div class="innsikt-pane">
					<div class="mk-comparison">
						<div class="mk-column">
							<div class="mk-column-header">Poengmodell</div>
							{#each evaluation.ranking as entry}
								<div class="mk-row">
									<span class="mk-rank">#{entry.rank}</span>
									<span class="mk-name">{entry.supplier.name}</span>
									<span class="mk-value">{entry.score.toFixed(1)}</span>
								</div>
							{/each}
						</div>
						<div class="mk-column">
							<div class="mk-column-header">Prismodell</div>
							{#each evaluation.priceRanking as entry}
								<div class="mk-row">
									<span class="mk-rank">#{entry.rank}</span>
									<span class="mk-name">{entry.supplier.name}</span>
									<span class="mk-value">{formatNOK(entry.evaluatedPrice)}</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="mk-verdict" class:match={sameWinner}>
						<span class="mk-verdict-icon">{sameWinner ? '✓' : '⚠'}</span>
						<span class="mk-verdict-text">
							{sameWinner
								? `Begge metoder gir samme vinner: ${evaluation.ranking[0]?.supplier.name}`
								: 'Metodene gir ulik rangering — vurder årsaken'}
						</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.innsikt {
		margin-top: var(--sp-8);
	}

	.innsikt-toggle {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-2) 0;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--ink-ghost);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		transition: color 0.12s;
	}

	.innsikt-toggle:hover { color: var(--ink-muted); }

	.innsikt-toggle-icon {
		font-size: 10px;
		transition: transform 0.2s;
	}

	.collapsed .innsikt-toggle-icon {
		transform: rotate(-90deg);
	}

	.innsikt-body {
		margin-top: var(--sp-3);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-lg);
		overflow: hidden;
	}

	.innsikt-tabs {
		display: flex;
		border-bottom: 1px solid var(--wire);
	}

	.innsikt-tab {
		flex: 1;
		padding: var(--sp-3) var(--sp-4);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-muted);
		transition: all 0.12s;
	}

	.innsikt-tab:hover {
		color: var(--ink-secondary);
		background: var(--felt-hover);
	}

	.innsikt-tab.active {
		color: var(--vekt);
		border-bottom-color: var(--vekt);
		font-weight: 600;
	}

	.innsikt-pane {
		padding: var(--sp-5);
	}

	/* ── Betalingsvilje ── */
	.bv-table { width: 100%; border-collapse: collapse; }
	.bv-table th {
		padding: var(--sp-2) var(--sp-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		text-align: left;
		border-bottom: 1px solid var(--wire);
	}
	.bv-table th.num { text-align: right; }
	.bv-table td {
		padding: var(--sp-2) var(--sp-3);
		font-size: 12px;
		border-bottom: 1px solid var(--wire);
	}
	.bv-table tr:last-child td { border-bottom: none; }
	.bv-criterion { color: var(--ink-secondary); font-weight: 500; }
	.bv-sub {
		padding-left: var(--sp-8) !important;
		color: var(--ink-muted);
		position: relative;
	}
	.bv-sub::before {
		content: '';
		position: absolute;
		left: var(--sp-5);
		top: 50%;
		width: 6px;
		height: 1px;
		background: var(--ink-ghost);
	}
	.bv-weight { font-family: var(--font-data); font-size: 11px; color: var(--vekt-dim); text-align: right; }
	.bv-value { font-family: var(--font-data); font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; color: var(--ink); }
	.bv-per-point { font-family: var(--font-data); font-size: 11px; font-variant-numeric: tabular-nums; text-align: right; color: var(--ink-muted); }
	.bv-total td { border-top: 1px solid var(--wire-strong); font-weight: 600; }

	.bv-summary {
		margin-top: var(--sp-4);
		padding: var(--sp-3) var(--sp-4);
		background: var(--vekt-bg);
		border-radius: var(--r-sm);
		border-left: 3px solid var(--vekt);
		font-size: 12px;
		color: var(--ink-secondary);
		line-height: 1.6;
	}
	.bv-summary strong { color: var(--ink); font-weight: 600; }
	.bv-highlight { color: var(--vekt); font-family: var(--font-data); font-weight: 600; }

	/* ── Robusthet ── */
	.robusthet-ranking { display: flex; flex-direction: column; gap: var(--sp-2); margin-bottom: var(--sp-5); }
	.robusthet-item {
		display: flex;
		align-items: center;
		gap: var(--sp-4);
		padding: var(--sp-3) var(--sp-4);
		background: var(--felt-raised);
		border-radius: var(--r-sm);
		border: 1px solid var(--wire);
	}
	.robusthet-item.leader { border-color: var(--vekt-bg-strong); }
	.robusthet-rank { font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--ink-ghost); width: 20px; }
	.robusthet-item.leader .robusthet-rank { color: var(--vekt-dim); }
	.robusthet-name { font-size: 13px; font-weight: 500; flex: 1; }
	.robusthet-score { font-family: var(--font-data); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
	.robusthet-item.leader .robusthet-score { color: var(--vekt); }
	.robusthet-margin { font-family: var(--font-data); font-size: 11px; color: var(--ink-muted); width: 72px; text-align: right; }

	.robusthet-insights { display: flex; flex-direction: column; gap: var(--sp-3); }
	.robusthet-insight {
		padding: var(--sp-3) var(--sp-4);
		background: var(--felt-raised);
		border-radius: var(--r-sm);
		border: 1px solid var(--wire);
		border-left: 3px solid var(--vekt);
	}
	.robusthet-insight-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-ghost); margin-bottom: var(--sp-1); }
	.robusthet-insight-text { font-size: 12px; color: var(--ink-secondary); line-height: 1.5; }
	.robusthet-insight-text strong { color: var(--ink); font-weight: 600; }
	.mono { font-family: var(--font-data); color: var(--vekt); font-weight: 600; }

	/* ── Metodekontroll ── */
	.mk-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); margin-bottom: var(--sp-5); }
	.mk-column { background: var(--felt-raised); border: 1px solid var(--wire); border-radius: var(--r-md); overflow: hidden; }
	.mk-column-header { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--wire); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); }
	.mk-row { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--wire); }
	.mk-row:last-child { border-bottom: none; }
	.mk-rank { font-family: var(--font-data); font-size: 11px; font-weight: 600; color: var(--ink-ghost); width: 20px; }
	.mk-row:first-child .mk-rank { color: var(--vekt-dim); }
	.mk-name { flex: 1; font-size: 12px; font-weight: 500; }
	.mk-value { font-family: var(--font-data); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
	.mk-row:first-child .mk-value { color: var(--vekt); }

	.mk-verdict {
		padding: var(--sp-3) var(--sp-4);
		border-radius: var(--r-sm);
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		font-size: 12px;
		background: var(--felt-raised);
		border: 1px solid var(--wire);
		color: var(--ink-secondary);
	}
	.mk-verdict.match {
		background: var(--score-high-bg);
		border: 1px solid var(--score-high-bg);
		color: var(--score-high);
	}
	.mk-verdict-icon { font-size: 14px; }
	.mk-verdict-text { font-weight: 500; }

	@media (max-width: 1024px) {
		.mk-comparison { grid-template-columns: 1fr; }
	}
</style>
