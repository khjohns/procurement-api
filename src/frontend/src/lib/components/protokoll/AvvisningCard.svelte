<script lang="ts">
	import type { Avvisning, AvvisningKategori } from '$lib/stores/protokoll.svelte';

	interface Supplier {
		id: string;
		name: string;
	}

	interface Props {
		suppliers: Supplier[];
		avvisninger: Record<string, Avvisning>;
		isDel2: boolean;
		foaRef?: string;
		hint?: string;
		onchange: (supplierId: string, avvisning: Avvisning) => void;
	}

	let { suppliers, avvisninger, isDel2, foaRef = '', hint = '', onchange }: Props = $props();

	const categories: { value: AvvisningKategori; del2: string; del3: string }[] = [
		{ value: 'formalfeil', del2: '§ 9-4 Formalfeil', del3: '§ 24-1 Formalfeil' },
		{ value: 'leverandor', del2: '§ 9-5 Kvalifikasjonssvikt', del3: '§ 24-2 Kvalifikasjonssvikt' },
		{ value: 'tilbud', del2: '§ 9-6 Avvisning av tilbud', del3: '§ 24-8 Avvisning av tilbud' }
	];

	function handleKategori(supplierId: string, kategori: AvvisningKategori) {
		const current = avvisninger[supplierId] ?? { kategori: '', begrunnelse: '' };
		onchange(supplierId, { ...current, kategori });
	}

	function handleBegrunnelse(supplierId: string, begrunnelse: string) {
		const current = avvisninger[supplierId] ?? { kategori: 'formalfeil', begrunnelse: '' };
		onchange(supplierId, { ...current, begrunnelse });
	}
</script>

<div class="avvisning-cards">
	{#each suppliers as supplier (supplier.id)}
		{@const avv = avvisninger[supplier.id]}
		<div class="supplier-card" class:supplier-card-filled={avv?.begrunnelse?.trim()}>
			<div class="supplier-card-header">
				<span class="supplier-name">{supplier.name}</span>
			</div>

			<div class="kategori-group" role="radiogroup" aria-label="Hjemmel for {supplier.name}">
				<div class="kategori-label">HJEMMEL</div>
				{#each categories as cat}
					<label class="kategori-option">
						<input
							type="radio"
							name="avvisning-{supplier.id}"
							value={cat.value}
							checked={avv?.kategori === cat.value}
							onchange={() => handleKategori(supplier.id, cat.value)}
						/>
						<span class="kategori-text">{isDel2 ? cat.del2 : cat.del3}</span>
					</label>
				{/each}
			</div>

			<textarea
				class="field-textarea"
				value={avv?.begrunnelse ?? ''}
				oninput={(e) => handleBegrunnelse(supplier.id, (e.target as HTMLTextAreaElement).value)}
				placeholder="Begrunnelse for avvisning..."
				rows="3"
			></textarea>
			<div class="field-footer">
				<span class="char-count">{(avv?.begrunnelse ?? '').length} tegn</span>
			</div>
		</div>
	{/each}

	{#if suppliers.length === 0}
		<div class="avvisning-empty">Ingen leverandører å avvise</div>
	{/if}

	{#if hint}
		<div class="field-hint">{hint}</div>
	{/if}
</div>

<style>
	.avvisning-cards {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.supplier-card {
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-left: 3px solid var(--color-vekt-bg-strong);
		border-radius: var(--radius-sm);
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.supplier-card-filled {
		border-left-color: var(--color-vekt);
	}

	.supplier-card-header {
		display: flex;
		align-items: center;
	}

	.supplier-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.kategori-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.kategori-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.kategori-option {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		cursor: pointer;
		font-size: 13px;
	}

	.kategori-option input[type='radio'] {
		accent-color: var(--color-vekt);
		cursor: pointer;
	}

	.kategori-text {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.field-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink);
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		outline: none;
		resize: vertical;
		transition: border-color 0.12s;
		field-sizing: content;
	}

	.field-textarea:focus {
		border-color: var(--color-wire-focus);
	}

	.field-textarea::placeholder {
		color: var(--color-ink-ghost);
		font-style: italic;
	}

	.field-footer {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
	}

	.char-count {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
		font-variant-numeric: tabular-nums;
	}

	.field-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.avvisning-empty {
		font-size: 12px;
		color: var(--color-ink-muted);
		font-style: italic;
		padding: var(--spacing-3);
	}
</style>
