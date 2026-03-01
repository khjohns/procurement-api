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
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
	}

	.item-panel {
		padding: var(--spacing-4) var(--spacing-5);
		border-left: 3px solid var(--color-vekt);
		margin: 0 var(--spacing-3);
	}

	/* ── Context bar ── */
	.panel-context {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		margin-bottom: var(--spacing-4);
		font-size: 11px;
	}

	.panel-supplier {
		font-weight: 600;
		color: var(--color-ink);
	}

	.panel-sep {
		color: var(--color-ink-ghost);
	}

	.panel-criterion {
		color: var(--color-ink-muted);
	}

	/* ── Aggregation strip ── */
	.agg-strip {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-4);
	}

	.agg-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.agg-options {
		display: flex;
		gap: var(--spacing-3);
	}

	.agg-option {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) 0;
		transition: color 0.1s;
	}

	.agg-option:hover {
		color: var(--color-ink);
	}

	.agg-option.active {
		color: var(--color-vekt);
		font-weight: 600;
	}

	.agg-radio {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px solid var(--color-wire-strong);
		transition: all 0.1s;
	}

	.agg-radio.checked {
		border-color: var(--color-vekt);
		background: var(--color-vekt);
		box-shadow: inset 0 0 0 2.5px var(--color-felt);
	}

	.agg-result {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.agg-result-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
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
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
		margin-bottom: var(--spacing-3);
	}

	.item-table th {
		padding: var(--spacing-2) var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		border-bottom: 1px solid var(--color-wire);
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
		color: var(--color-vekt-dim);
		letter-spacing: normal;
		text-transform: none;
	}

	.th-avg {
		width: 72px;
	}

	/* Item rows */
	.item-row {
		border-bottom: 1px solid var(--color-wire);
		transition: background 0.08s;
	}

	.item-row:hover {
		background: var(--color-felt-hover);
	}

	.item-row:last-child {
		border-bottom: none;
	}

	.cell-item-name {
		padding: var(--spacing-2) var(--spacing-3);
		position: relative;
	}

	.item-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
	}

	.item-label {
		color: var(--color-ink-muted);
		font-size: 12px;
	}

	.item-remove {
		position: absolute;
		right: var(--spacing-2);
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		opacity: 0;
		transition: all 0.1s;
	}

	.item-row:hover .item-remove {
		opacity: 1;
	}

	.item-remove:hover {
		color: var(--color-score-low);
		background: var(--color-felt-active);
	}

	.item-remove:focus-visible {
		outline: none;
		border: 1px solid var(--color-wire-focus);
		opacity: 1;
	}

	/* Average column */
	.cell-avg {
		text-align: center;
		padding: var(--spacing-2) var(--spacing-3);
	}

	.avg-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
	}

	.avg-best {
		background: var(--color-score-high-bg);
		font-weight: 700;
	}

	/* Footer row */
	.item-total-row {
		background: var(--color-canvas);
		border-top: 1px solid var(--color-wire-strong);
	}

	.cell-total-label {
		padding: var(--spacing-2) var(--spacing-3);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.cell-total-score {
		text-align: center;
		padding: var(--spacing-2) var(--spacing-3);
	}

	.total-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 600;
	}

	.cell-total-final {
		text-align: center;
		padding: var(--spacing-2) var(--spacing-3);
	}

	.total-final-value {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-size: 14px;
		font-weight: 700;
	}

	/* Score tier colors */
	.tier-high { color: var(--color-score-high); }
	.tier-mid { color: var(--color-ink-secondary); }
	.tier-low { color: var(--color-score-low); }

	/* ── Empty state ── */
	.empty-state {
		padding: var(--spacing-5) var(--spacing-4);
		text-align: center;
		color: var(--color-ink-muted);
		font-size: 12px;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-3);
	}

	/* ── Add item ── */
	.add-item-btn {
		display: inline-block;
		padding: var(--spacing-1) 0;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.1s;
		margin-bottom: var(--spacing-4);
	}

	.add-item-btn:hover {
		color: var(--color-vekt);
	}

	.add-item-btn:focus-visible {
		outline: none;
		color: var(--color-vekt);
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
		border-radius: var(--radius-sm);
	}

	.add-item-form {
		display: flex;
		gap: var(--spacing-2);
		align-items: center;
		margin-bottom: var(--spacing-4);
	}

	.add-input {
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
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
		border-color: var(--color-wire-focus);
	}

	.add-input::placeholder {
		color: var(--color-ink-ghost);
	}

	.add-confirm,
	.add-cancel {
		padding: var(--spacing-2) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		border-radius: var(--radius-sm);
		cursor: pointer;
		border: 1px solid var(--color-wire);
		transition: all 0.1s;
	}

	.add-confirm {
		background: var(--color-vekt-bg-strong);
		color: var(--color-vekt);
		border-color: var(--color-vekt-bg-strong);
	}

	.add-confirm:hover {
		background: var(--color-vekt-bg);
		border-color: var(--color-vekt-dim);
	}

	.add-cancel {
		background: var(--color-felt);
		color: var(--color-ink-muted);
	}

	.add-cancel:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink-secondary);
	}

	/* ── Notes ── */
	.panel-notes {
		margin-top: var(--spacing-2);
	}

	.notes-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: var(--spacing-2);
	}

	.notes-textarea {
		width: 100%;
		min-height: 72px;
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

	.notes-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.notes-textarea::placeholder {
		color: var(--color-ink-ghost);
	}

	.notes-charcount {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
		text-align: right;
		margin-top: var(--spacing-1);
	}
</style>
