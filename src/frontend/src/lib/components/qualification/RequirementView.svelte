<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';

	interface Props {
		requirementId: string;
	}

	let { requirementId }: Props = $props();

	let nav = $derived.by(() => {
		const reqs = qualification.data.requirements;
		const index = reqs.findIndex((r) => r.id === requirementId);
		return {
			requirement: reqs[index],
			prev: index > 0 ? reqs[index - 1] : null,
			next: index < reqs.length - 1 ? reqs[index + 1] : null
		};
	});

	let requirement = $derived(nav.requirement);
	let prevReq = $derived(nav.prev);
	let nextReq = $derived(nav.next);

	/** Adding support entity state. */
	let addingFor = $state<string | null>(null);
	let newEntityName = $state('');

	function handleAdd(supplierId: string) {
		if (!newEntityName.trim()) return;
		qualification.addSupportEntity(requirement.id, supplierId, newEntityName.trim());
		newEntityName = '';
		addingFor = null;
	}
</script>

<!-- Navigation bar -->
<div class="req-nav">
	<button class="nav-back" onclick={() => qualification.setActiveView('overview')}>
		← Oversikt
	</button>
	<div class="nav-center">
		{#if prevReq}
			<button class="nav-arrow" onclick={() => qualification.setActiveView(prevReq.id)} title={prevReq.name}>‹</button>
		{/if}
		<span class="nav-title">{requirement.name}</span>
		{#if nextReq}
			<button class="nav-arrow" onclick={() => qualification.setActiveView(nextReq.id)} title={nextReq.name}>›</button>
		{/if}
	</div>
	<div class="nav-spacer"></div>
</div>

{#if requirement.description}
	<p class="req-description">{requirement.description}</p>
{/if}

<!-- Schematic matrix -->
<div class="matrix-wrap">
	<table class="req-matrix">
		<thead>
			<tr>
				<th class="th-supplier">Leverandør</th>
				<th class="th-espd">ESPD</th>
				<th class="th-basis">Grunnlag</th>
				<th class="th-verdict">Verdikt</th>
			</tr>
		</thead>
		<tbody>
			{#each qualification.data.suppliers as supplier}
				{@const a = requirement.assessments[supplier.id]}
				{@const espd = a?.espdSubmitted ?? false}
				{@const basis = a?.basis ?? 'own'}
				{@const entities = a?.supportEntities ?? []}
				{@const verdict = a?.verdict ?? 'not_assessed'}
				{@const hasNotes = !!(a?.notes)}
				{@const isSelected = qualification.selectedSupplierId === supplier.id}

				<!-- Supplier row -->
				<tr
					class="row-supplier"
					class:row-selected={isSelected}
					onclick={() => qualification.selectSupplier(supplier.id)}
					role="button"
					tabindex={0}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); qualification.selectSupplier(supplier.id); } }}
				>
					<td class="cell-supplier">
						<span class="supplier-name">{supplier.name}</span>
						{#if hasNotes}
							<span class="notes-dot"></span>
						{/if}
					</td>
					<td class="cell-espd">
						<button
							class="toggle-btn"
							class:toggle-on={espd}
							onclick={(e) => { e.stopPropagation(); qualification.setEspd(requirement.id, supplier.id, !espd); }}
						>
							{espd ? '✓' : '—'}
						</button>
					</td>
					<td class="cell-basis">
						<div class="basis-toggle">
							<button
								class="basis-btn"
								class:basis-active={basis === 'own'}
								onclick={(e) => { e.stopPropagation(); qualification.setBasis(requirement.id, supplier.id, 'own'); }}
							>Egen</button>
							<button
								class="basis-btn"
								class:basis-active={basis === 'supported'}
								onclick={(e) => { e.stopPropagation(); qualification.setBasis(requirement.id, supplier.id, 'supported'); }}
							>Støtte</button>
						</div>
					</td>
					<td class="cell-verdict">
						<button
							class="verdict-btn"
							class:verdict-met={verdict === 'met'}
							class:verdict-not-met={verdict === 'not_met'}
							onclick={(e) => {
								e.stopPropagation();
								const next = verdict === 'not_assessed' ? 'met' : verdict === 'met' ? 'not_met' : 'not_assessed';
								qualification.setVerdict(requirement.id, supplier.id, next);
							}}
						>
							{#if verdict === 'met'}✓{:else if verdict === 'not_met'}✗{:else}—{/if}
						</button>
					</td>
				</tr>

				<!-- Support entities (shown when basis === 'supported') -->
				{#if basis === 'supported'}
					{#each entities as entity}
						<tr class="row-entity" class:row-selected={isSelected}>
							<td class="cell-entity-name">
								<span class="entity-indent">├</span>
								<span class="entity-name">{entity.name}</span>
								<input
									class="entity-scope-input"
									type="text"
									value={entity.scope}
									oninput={(e) => qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, { scope: e.currentTarget.value })}
									placeholder="Omfang..."
									onclick={(e) => e.stopPropagation()}
								/>
								<button
									class="entity-remove"
									onclick={() => qualification.removeSupportEntity(requirement.id, supplier.id, entity.id)}
									title="Fjern"
								>×</button>
							</td>
							<td class="cell-espd">
								<button
									class="toggle-btn toggle-sm"
									class:toggle-on={entity.espdSubmitted}
									onclick={() => qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, { espdSubmitted: !entity.espdSubmitted })}
									title="ESPD"
								>
									{entity.espdSubmitted ? '✓' : '—'}
								</button>
							</td>
							<td class="cell-commitment">
								<button
									class="toggle-btn toggle-sm"
									class:toggle-on={entity.commitmentSubmitted}
									onclick={() => qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, { commitmentSubmitted: !entity.commitmentSubmitted })}
									title="Forpliktelseserklæring"
								>
									{entity.commitmentSubmitted ? '✓ F' : '— F'}
								</button>
							</td>
							<td class="cell-verdict"></td>
						</tr>
					{/each}

					<!-- Add entity row -->
					<tr class="row-add" class:row-selected={isSelected}>
						<td colspan="4" class="cell-add">
							{#if addingFor === supplier.id}
								<div class="add-form">
									<span class="entity-indent">└</span>
									<!-- svelte-ignore a11y_autofocus -->
									<input
										class="add-input"
										type="text"
										placeholder="Virksomhetsnavn..."
										bind:value={newEntityName}
										onkeydown={(e) => { if (e.key === 'Enter') handleAdd(supplier.id); if (e.key === 'Escape') addingFor = null; }}
										autofocus
									/>
									<button class="add-confirm" onclick={() => handleAdd(supplier.id)}>Legg til</button>
									<button class="add-cancel" onclick={() => addingFor = null}>×</button>
								</div>
							{:else}
								<button
									class="add-btn"
									onclick={(e) => { e.stopPropagation(); addingFor = supplier.id; newEntityName = ''; }}
								>
									<span class="entity-indent">└</span> + Legg til støttevirksomhet
								</button>
							{/if}
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* ── Navigation bar ── */
	.req-nav {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		margin-bottom: var(--spacing-5);
		padding-bottom: var(--spacing-3);
		border-bottom: 1px solid var(--color-wire);
	}

	.nav-back {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		transition: all 0.1s;
	}

	.nav-back:hover { color: var(--color-ink); background: var(--color-felt-hover); }
	.nav-back:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); }

	.nav-center {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		flex: 1;
		justify-content: center;
	}

	.nav-title {
		font-size: 14px;
		font-weight: 700;
		color: var(--color-ink);
		letter-spacing: -0.01em;
	}

	.nav-arrow {
		font-size: 16px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) var(--spacing-2);
		border-radius: var(--radius-sm);
		transition: all 0.1s;
		line-height: 1;
	}

	.nav-arrow:hover { color: var(--color-ink); background: var(--color-felt-hover); }
	.nav-arrow:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); }

	.nav-spacer { width: 80px; }

	.req-description {
		font-size: 12px;
		color: var(--color-ink-muted);
		line-height: 1.5;
		margin: 0 0 var(--spacing-4) 0;
	}

	/* ── Matrix ── */
	.matrix-wrap {
		overflow-x: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-wire);
	}

	.req-matrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.req-matrix th {
		padding: var(--spacing-2) var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire);
		text-align: left;
	}

	.th-supplier { padding-left: var(--spacing-4); }
	.th-espd { width: 72px; text-align: center; }
	.th-basis { width: 140px; text-align: center; }
	.th-verdict { width: 72px; text-align: center; }

	/* ── Supplier rows ── */
	.row-supplier {
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
		cursor: pointer;
		transition: background 0.08s;
	}

	.row-supplier:hover { background: var(--color-felt-hover); }

	.row-supplier:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
	}

	.row-selected {
		background: var(--color-felt);
	}

	.row-selected:hover {
		background: var(--color-felt);
	}

	.cell-supplier {
		padding: var(--spacing-2) var(--spacing-4);
		border-left: 3px solid var(--color-wire-strong);
		position: relative;
	}

	.row-selected .cell-supplier {
		border-left-color: var(--color-ink-secondary);
	}

	.supplier-name {
		font-weight: 600;
		color: var(--color-ink);
		font-size: 12px;
	}

	.notes-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-vekt-dim);
		margin-left: var(--spacing-2);
		vertical-align: middle;
	}

	/* ── ESPD & Verdict toggles ── */
	.cell-espd, .cell-verdict, .cell-commitment {
		text-align: center;
		padding: var(--spacing-2);
	}

	.toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 700;
		background: var(--color-felt-active);
		color: var(--color-ink-ghost);
		border: none;
		cursor: pointer;
		transition: all 0.12s;
	}

	.toggle-btn:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink-muted);
	}

	.toggle-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1.5px var(--color-wire-focus);
	}

	.toggle-on {
		background: var(--color-score-high-bg);
		color: var(--color-score-high);
	}

	.toggle-sm {
		width: 24px;
		height: 24px;
		font-size: 10px;
	}

	.verdict-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		font-size: 15px;
		font-weight: 700;
		background: var(--color-felt-active);
		color: var(--color-ink-ghost);
		border: none;
		cursor: pointer;
		transition: all 0.12s;
	}

	.verdict-btn:hover { background: var(--color-felt-hover); }
	.verdict-btn:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); }
	.verdict-met { background: var(--color-score-high-bg); color: var(--color-score-high); }
	.verdict-not-met { background: var(--color-score-low-bg); color: var(--color-score-low); }

	/* ── Basis toggle ── */
	.cell-basis {
		text-align: center;
		padding: var(--spacing-2);
	}

	.basis-toggle {
		display: inline-flex;
		gap: 1px;
		background: var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.basis-btn {
		padding: var(--spacing-1) var(--spacing-2);
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border: none;
		cursor: pointer;
		transition: all 0.12s;
	}

	.basis-btn:hover { color: var(--color-ink); }
	.basis-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 1.5px var(--color-wire-focus); }

	.basis-active {
		background: var(--color-felt-active);
		color: var(--color-ink);
		font-weight: 600;
	}

	/* ── Entity rows ── */
	.row-entity {
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
	}

	.row-entity:hover { background: var(--color-felt-hover); }

	.cell-entity-name {
		padding: var(--spacing-1) var(--spacing-4);
		border-left: 3px solid var(--color-wire-strong);
		position: relative;
	}

	.row-selected .cell-entity-name {
		border-left-color: var(--color-ink-secondary);
	}

	.entity-indent {
		color: var(--color-ink-ghost);
		font-family: var(--font-data);
		font-size: 11px;
		margin-right: var(--spacing-2);
	}

	.entity-name {
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.entity-scope-input {
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		border-bottom: 1px solid transparent;
		outline: none;
		margin-left: var(--spacing-2);
		padding: 0 var(--spacing-1);
		max-width: 160px;
		transition: border-color 0.12s, color 0.12s;
	}

	.entity-scope-input:hover {
		border-bottom-color: var(--color-wire);
	}

	.entity-scope-input:focus {
		color: var(--color-ink-secondary);
		border-bottom-color: var(--color-wire-focus);
	}

	.entity-scope-input::placeholder {
		color: var(--color-ink-ghost);
		opacity: 0;
		transition: opacity 0.1s;
	}

	.row-entity:hover .entity-scope-input::placeholder {
		opacity: 1;
	}

	.entity-remove {
		font-size: 13px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0 var(--spacing-1);
		margin-left: var(--spacing-2);
		opacity: 0;
		transition: opacity 0.1s, color 0.1s;
	}

	.row-entity:hover .entity-remove { opacity: 1; }
	.entity-remove:hover { color: var(--color-score-low); }

	/* ── Add entity ── */
	.row-add {
		background: var(--color-canvas);
		border-bottom: 2px solid var(--color-wire-strong);
	}

	.cell-add {
		padding: var(--spacing-1) var(--spacing-4);
		border-left: 3px solid var(--color-wire-strong);
	}

	.row-selected .cell-add {
		border-left-color: var(--color-ink-secondary);
	}

	.add-btn {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-1) 0;
		transition: color 0.1s;
	}

	.add-btn:hover { color: var(--color-ink-muted); }
	.add-btn:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); border-radius: var(--radius-sm); }

	.add-form {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.add-input {
		padding: var(--spacing-1) var(--spacing-2);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 11px;
		outline: none;
		width: 180px;
	}

	.add-input:focus { border-color: var(--color-wire-focus); }
	.add-input::placeholder { color: var(--color-ink-ghost); }

	.add-confirm {
		padding: var(--spacing-1) var(--spacing-2);
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		background: var(--color-felt-active);
		color: var(--color-ink);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.1s;
	}

	.add-confirm:hover { background: var(--color-felt-hover); }
	.add-confirm:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); }

	.add-cancel {
		font-size: 14px;
		color: var(--color-ink-ghost);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0 var(--spacing-1);
		border-radius: var(--radius-sm);
		transition: color 0.1s;
	}

	.add-cancel:hover { color: var(--color-score-low); }
	.add-cancel:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--color-wire-focus); }
</style>
