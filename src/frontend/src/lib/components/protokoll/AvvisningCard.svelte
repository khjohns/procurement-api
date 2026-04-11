<script lang="ts">
  import type { Avvisning, AvvisningKategori } from '$lib/stores/protokoll.svelte';
  import DateInput from './DateInput.svelte';

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

  const categories: { value: AvvisningKategori; del2: string; del3: string; del3Only?: boolean }[] = [
    { value: 'formalfeil', del2: '§ 9-4 Formalfeil', del3: '§ 24-1 Formalfeil' },
    { value: 'leverandor', del2: '§ 9-5 Kvalifikasjonssvikt', del3: '§ 24-2 Kvalifikasjonssvikt' },
    { value: 'tilbud', del2: '§ 9-6 Avvisning av tilbud', del3: '§ 24-8 Avvisning av tilbud' },
    { value: 'unormalt-lavt', del2: '', del3: '§ 24-9 Unormalt lavt tilbud', del3Only: true },
  ];

  let visibleCategories = $derived(
    isDel2 ? categories.filter((c) => !c.del3Only) : categories
  );

  function handleKategori(supplierId: string, kategori: AvvisningKategori) {
    const current = avvisninger[supplierId] ?? { kategori: '', begrunnelse: '' };
    onchange(supplierId, { ...current, kategori });
  }

  function handleDato(supplierId: string, datoAvvist: string) {
    const current = avvisninger[supplierId] ?? { kategori: 'formalfeil', begrunnelse: '' };
    onchange(supplierId, { ...current, datoAvvist });
  }
</script>

<div class="avvisning-cards">
  {#each suppliers as supplier (supplier.id)}
    {@const avv = avvisninger[supplier.id]}
    <div class="supplier-card" class:supplier-card-filled={!!avv?.kategori}>
      <div class="supplier-card-header">
        <span class="supplier-name">{supplier.name}</span>
        <DateInput
          value={avv?.datoAvvist ?? ''}
          label="Avvist"
          onchange={(v) => handleDato(supplier.id, v)}
        />
      </div>

      <div class="kategori-group" role="radiogroup" aria-label="Hjemmel for {supplier.name}">
        <div class="kategori-label">HJEMMEL</div>
        {#each visibleCategories as cat}
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
    justify-content: space-between;
    gap: var(--spacing-3);
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
