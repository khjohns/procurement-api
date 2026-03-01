<script lang="ts">
	import {
		evaluation,
		itemScore,
		scoreTier,
		type AggregationMethod,
		type EvaluationItem,
		type ItemCriterion
	} from '$lib/stores/evaluation.svelte';
	import ItemScoreCell from './ItemScoreCell.svelte';

	interface Props {
		subCriterionId: string;
		subCriterionName: string;
		supplierId: string;
		supplierName: string;
		itemLabel: string;
		itemCriteria: ItemCriterion[];
		items: EvaluationItem[];
		aggregation: AggregationMethod;
		aggregatedScore: number;
	}

	let {
		subCriterionId,
		subCriterionName,
		supplierId,
		supplierName,
		itemLabel,
		itemCriteria,
		items,
		aggregation,
		aggregatedScore
	}: Props = $props();

	let addingItem = $state(false);
	let newItemName = $state('');
	let newItemLabel = $state('');

	let noteText = $derived(
		(() => {
			for (const c of evaluation.data.criteria) {
				const sub = c.subcriteria.find((s) => s.id === subCriterionId);
				if (sub) return sub.notes[supplierId] ?? '';
			}
			return '';
		})()
	);

	/** Column averages per item-criterion. */
	let columnAverages = $derived.by(() => {
		const result: Record<string, number> = {};
		if (items.length === 0) return result;
		for (const ic of itemCriteria) {
			const sum = items.reduce((acc, item) => acc + (item.scores[ic.id] ?? 0), 0);
			result[ic.id] = sum / items.length;
		}
		return result;
	});

	/** Best score per column across items. */
	let columnBests = $derived.by(() => {
		const result: Record<string, number> = {};
		for (const ic of itemCriteria) {
			result[ic.id] = Math.max(0, ...items.map((item) => item.scores[ic.id] ?? 0));
		}
		return result;
	});

	/** Best item average. */
	let bestItemAvg = $derived(
		items.length > 0
			? Math.max(...items.map((item) => itemScore(item, itemCriteria)))
			: 0
	);

	const aggregationOptions: { id: AggregationMethod; label: string }[] = [
		{ id: 'average', label: 'Snitt' },
		{ id: 'minimum', label: 'Minimum' }
	];

	function handleAddItem() {
		if (!newItemName.trim()) return;
		evaluation.addItem(
			subCriterionId,
			supplierId,
			newItemName.trim(),
			newItemLabel.trim() || undefined
		);
		newItemName = '';
		newItemLabel = '';
		addingItem = false;
	}

	function handleRemoveItem(itemId: string) {
		evaluation.removeItem(subCriterionId, supplierId, itemId);
	}

	let colCount = $derived(itemCriteria.length + 2); // name + criteria + avg
</script>

<tr class="row-item-panel">
	<td colspan={evaluation.data.suppliers.length + 2}>
		<div class="item-panel">
			<!-- Context bar -->
			<div class="panel-context">
				<span class="panel-supplier">{supplierName}</span>
				<span class="panel-sep">›</span>
				<span class="panel-criterion">{subCriterionName}</span>
			</div>

			<!-- Aggregation strip -->
			<div class="agg-strip">
				<span class="agg-label">Aggregering</span>
				<div class="agg-options">
					{#each aggregationOptions as opt}
						<button
							class="agg-option"
							class:active={aggregation === opt.id}
							onclick={() =>
								evaluation.setAggregation(subCriterionId, opt.id)}
						>
							<span class="agg-radio" class:checked={aggregation === opt.id}
							></span>
							{opt.label}
						</button>
					{/each}
				</div>
				<div class="agg-result">
					<span class="agg-result-label">Resultat</span>
					<span class="agg-result-score tier-{scoreTier(aggregatedScore)}"
						>{aggregatedScore.toFixed(1)}</span
					>
				</div>
			</div>

			<!-- Item table -->
			{#if items.length > 0}
				<table class="item-table">
					<thead>
						<tr>
							<th class="th-item">
								{itemLabel.toUpperCase()}
							</th>
							{#each itemCriteria as ic}
								<th class="th-criterion">
									<span class="th-name">{ic.name}</span>
									<span class="th-weight">{ic.weight}%</span>
								</th>
							{/each}
							<th class="th-avg">Snitt</th>
						</tr>
					</thead>
					<tbody>
						{#each items as item (item.id)}
							{@const avg = itemScore(item, itemCriteria)}
							{@const avgTier = scoreTier(avg)}
							{@const isItemBest = avg === bestItemAvg && avg > 0}
							<tr class="item-row">
								<td class="cell-item-name">
									<span class="item-name">{item.name}</span>
									{#if item.label}
										<span class="item-label"> — {item.label}</span>
									{/if}
									<button
										class="item-remove"
										title="Fjern {itemLabel.toLowerCase()}"
										onclick={() => handleRemoveItem(item.id)}
									>
										×
									</button>
								</td>
								{#each itemCriteria as ic}
									{@const score = item.scores[ic.id] ?? 0}
									{@const isBest =
										score === columnBests[ic.id] && score > 0}
									<ItemScoreCell
										{score}
										{isBest}
										onchange={(v) =>
											evaluation.setItemScore(
												subCriterionId,
												supplierId,
												item.id,
												ic.id,
												v
											)}
									/>
								{/each}
								<td class="cell-avg">
									<span
										class="avg-value tier-{avgTier}"
										class:avg-best={isItemBest}
									>
										{avg.toFixed(1)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="item-total-row">
							<td class="cell-total-label">Snitt</td>
							{#each itemCriteria as ic}
								{@const avg = columnAverages[ic.id] ?? 0}
								<td class="cell-total-score">
									<span class="total-value tier-{scoreTier(avg)}">
										{avg.toFixed(1)}
									</span>
								</td>
							{/each}
							<td class="cell-total-final">
								<span
									class="total-final-value tier-{scoreTier(aggregatedScore)}"
								>
									{aggregatedScore.toFixed(1)}
								</span>
							</td>
						</tr>
					</tfoot>
				</table>
			{:else}
				<div class="empty-state">
					Ingen registrerte {itemLabel.toLowerCase()}.
				</div>
			{/if}

			<!-- Add item -->
			{#if addingItem}
				<div class="add-item-form">
					<input
						class="add-input"
						type="text"
						placeholder="Navn"
						bind:value={newItemName}
						onkeydown={(e) => {
							if (e.key === 'Enter') handleAddItem();
							if (e.key === 'Escape') (addingItem = false);
						}}
					/>
					<input
						class="add-input add-input-label"
						type="text"
						placeholder="Rolle / type (valgfritt)"
						bind:value={newItemLabel}
						onkeydown={(e) => {
							if (e.key === 'Enter') handleAddItem();
							if (e.key === 'Escape') (addingItem = false);
						}}
					/>
					<button class="add-confirm" onclick={handleAddItem}>Legg til</button>
					<button class="add-cancel" onclick={() => (addingItem = false)}>Avbryt</button>
				</div>
			{:else}
				<button class="add-item-btn" onclick={() => (addingItem = true)}>
					+ Legg til {itemLabel.toLowerCase()}
				</button>
			{/if}

			<!-- Notes -->
			<div class="panel-notes">
				<div class="notes-label">Begrunnelse</div>
				<textarea
					class="notes-textarea"
					value={noteText}
					oninput={(e) =>
						evaluation.setNote(
							subCriterionId,
							supplierId,
							e.currentTarget.value
						)}
					placeholder="Skriv overordnet begrunnelse for {itemLabel.toLowerCase()}vurderingen..."
				></textarea>
				{#if noteText.length > 0}
				<div class="notes-charcount">{noteText.length} tegn</div>
			{/if}
			</div>
		</div>
	</td>
</tr>

<style>
	.row-item-panel td {
		padding: 0;
		background: var(--canvas);
		border-bottom: 1px solid var(--wire);
	}

	.item-panel {
		padding: var(--sp-4) var(--sp-5);
		border-left: 3px solid var(--vekt);
		margin: 0 var(--sp-3);
	}

	/* ── Context bar ── */
	.panel-context {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin-bottom: var(--sp-4);
		font-size: 11px;
	}

	.panel-supplier {
		font-weight: 600;
		color: var(--ink);
	}

	.panel-sep {
		color: var(--ink-ghost);
	}

	.panel-criterion {
		color: var(--ink-muted);
	}

	/* ── Aggregation strip ── */
	.agg-strip {
		display: flex;
		align-items: center;
		gap: var(--sp-4);
		padding: var(--sp-2) var(--sp-3);
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		margin-bottom: var(--sp-4);
	}

	.agg-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}

	.agg-options {
		display: flex;
		gap: var(--sp-3);
	}

	.agg-option {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-secondary);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--sp-1) 0;
		transition: color 0.1s;
	}

	.agg-option:hover {
		color: var(--ink);
	}

	.agg-option.active {
		color: var(--vekt);
		font-weight: 600;
	}

	.agg-radio {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px solid var(--wire-strong);
		transition: all 0.1s;
	}

	.agg-radio.checked {
		border-color: var(--vekt);
		background: var(--vekt);
		box-shadow: inset 0 0 0 2.5px var(--felt);
	}

	.agg-result {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--sp-2);
	}

	.agg-result-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
	}

	.agg-result-score {
		font-family: var(--font-data);
		font-size: 16px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* ── Item table ── */
	.item-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		overflow: hidden;
		margin-bottom: var(--sp-3);
	}

	.item-table th {
		padding: var(--sp-2) var(--sp-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		border-bottom: 1px solid var(--wire);
		text-align: center;
		vertical-align: bottom;
	}

	.th-item {
		text-align: left !important;
		min-width: 140px;
	}

	.th-criterion {
		width: 80px;
	}

	.th-name {
		display: block;
	}

	.th-weight {
		display: block;
		font-family: var(--font-data);
		font-size: 9px;
		color: var(--vekt-dim);
		letter-spacing: normal;
		text-transform: none;
	}

	.th-avg {
		width: 72px;
	}

	/* Item rows */
	.item-row {
		border-bottom: 1px solid var(--wire);
		transition: background 0.08s;
	}

	.item-row:hover {
		background: var(--felt-hover);
	}

	.item-row:last-child {
		border-bottom: none;
	}

	.cell-item-name {
		padding: var(--sp-2) var(--sp-3);
		position: relative;
	}

	.item-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
	}

	.item-label {
		color: var(--ink-muted);
		font-size: 12px;
	}

	.item-remove {
		position: absolute;
		right: var(--sp-2);
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: var(--ink-ghost);
		background: none;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		opacity: 0;
		transition: all 0.1s;
	}

	.item-row:hover .item-remove {
		opacity: 1;
	}

	.item-remove:hover {
		color: var(--score-low);
		background: var(--felt-active);
	}

	.item-remove:focus-visible {
		outline: none;
		border: 1px solid var(--wire-focus);
		opacity: 1;
	}

	/* Average column */
	.cell-avg {
		text-align: center;
		padding: var(--sp-2) var(--sp-3);
	}

	.avg-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
		padding: var(--sp-1) var(--sp-2);
		border-radius: var(--r-sm);
	}

	.avg-best {
		background: var(--score-high-bg);
		font-weight: 700;
	}

	/* Footer row */
	.item-total-row {
		background: var(--canvas);
		border-top: 1px solid var(--wire-strong);
	}

	.cell-total-label {
		padding: var(--sp-2) var(--sp-3);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}

	.cell-total-score {
		text-align: center;
		padding: var(--sp-2) var(--sp-3);
	}

	.total-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
	}

	.cell-total-final {
		text-align: center;
		padding: var(--sp-2) var(--sp-3);
	}

	.total-final-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 14px;
		font-weight: 700;
	}

	/* Score tier colors */
	.tier-high { color: var(--score-high); }
	.tier-mid { color: var(--ink-secondary); }
	.tier-low { color: var(--score-low); }

	/* ── Empty state ── */
	.empty-state {
		padding: var(--sp-5) var(--sp-4);
		text-align: center;
		color: var(--ink-muted);
		font-size: 12px;
		background: var(--felt);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		margin-bottom: var(--sp-3);
	}

	/* ── Add item ── */
	.add-item-btn {
		display: inline-block;
		padding: var(--sp-1) 0;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.1s;
		margin-bottom: var(--sp-4);
	}

	.add-item-btn:hover {
		color: var(--vekt);
	}

	.add-item-btn:focus-visible {
		outline: none;
		color: var(--vekt);
		box-shadow: 0 0 0 1.5px var(--wire-focus);
		border-radius: var(--r-sm);
	}

	.add-item-form {
		display: flex;
		gap: var(--sp-2);
		align-items: center;
		margin-bottom: var(--sp-4);
	}

	.add-input {
		padding: var(--sp-2) var(--sp-3);
		background: var(--canvas);
		border: 1px solid var(--wire);
		border-radius: var(--r-sm);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: 12px;
		outline: none;
		transition: border-color 0.12s;
		width: 160px;
	}

	.add-input-label {
		width: 180px;
	}

	.add-input:focus {
		border-color: var(--wire-focus);
	}

	.add-input::placeholder {
		color: var(--ink-ghost);
	}

	.add-confirm,
	.add-cancel {
		padding: var(--sp-2) var(--sp-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		border-radius: var(--r-sm);
		cursor: pointer;
		border: 1px solid var(--wire);
		transition: all 0.1s;
	}

	.add-confirm {
		background: var(--vekt-bg-strong);
		color: var(--vekt);
		border-color: var(--vekt-bg-strong);
	}

	.add-confirm:hover {
		background: var(--vekt-bg);
		border-color: var(--vekt-dim);
	}

	.add-cancel {
		background: var(--felt);
		color: var(--ink-muted);
	}

	.add-cancel:hover {
		background: var(--felt-hover);
		color: var(--ink-secondary);
	}

	/* ── Notes ── */
	.panel-notes {
		margin-top: var(--sp-2);
	}

	.notes-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
		margin-bottom: var(--sp-2);
	}

	.notes-textarea {
		width: 100%;
		min-height: 72px;
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

	.notes-textarea:focus {
		border-color: var(--wire-focus);
	}

	.notes-textarea::placeholder {
		color: var(--ink-ghost);
	}

	.notes-charcount {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--ink-ghost);
		text-align: right;
		margin-top: var(--sp-1);
	}
</style>
