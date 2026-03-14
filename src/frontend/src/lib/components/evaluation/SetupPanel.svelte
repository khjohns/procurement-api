<script lang="ts">
  import { evaluation, formatNOK } from '$lib/stores/evaluation.svelte';
  const fmt = new Intl.NumberFormat('nb-NO');

  // ── Supplier input ──
  let addingSupplier = $state(false);
  let newSupplierName = $state('');

  // ── Contract value formatting ──
  let isEditingValue = $state(false);
  let editValue = $state('');
  let contractValueDisplay = $derived(
    isEditingValue
      ? editValue
      : evaluation.data.contractValue > 0
        ? fmt.format(evaluation.data.contractValue)
        : ''
  );

  function handleContractValueInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/\s/g, '');
    editValue = raw;
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) {
      evaluation.setContractValue(num);
    } else if (raw === '') {
      evaluation.setContractValue(0);
    }
  }

  function handleContractValueBlur() {
    isEditingValue = false;
  }

  function handleContractValueFocus(e: Event) {
    isEditingValue = true;
    editValue = evaluation.data.contractValue > 0 ? String(evaluation.data.contractValue) : '';
    const input = e.target as HTMLInputElement;
    requestAnimationFrame(() => input.select());
  }

  // ── Derived weights (from store) ──
  let qualityWeight = $derived(evaluation.qualityWeightDerived);
  let priceWeight = $derived(evaluation.priceWeightDerived);

  // ── Supplier CRUD ──
  function addSupplier() {
    if (!newSupplierName.trim()) return;
    evaluation.addSupplier(newSupplierName.trim());
    newSupplierName = '';
    addingSupplier = false;
  }

  // ── Validation ──
  let validationItems = $derived.by(() => {
    const items: string[] = [];
    if (!evaluation.data.title.trim()) items.push('Mangler tittel');
    if (evaluation.data.suppliers.length < 2) items.push('Minst 2 leverandører');
    if (evaluation.data.criteria.length === 0) items.push('Legg til kriterier');
    if (evaluation.totalWeight !== 100 && evaluation.data.criteria.length > 0)
      items.push('Vekting må summere til 100%');
    return items;
  });
</script>

<div class="setup-panel">
  <!-- Config fields -->
  <div class="panel-section">
    <div class="panel-label">Oppsett</div>
    <div class="field">
      <label class="field-label" for="sp-title">Tittel</label>
      <input
        id="sp-title"
        class="field-input"
        type="text"
        value={evaluation.data.title}
        oninput={(e) => evaluation.setTitle((e.target as HTMLInputElement).value)}
        placeholder="Evaluering av tilbud..."
      />
    </div>
    <div class="field">
      <label class="field-label" for="sp-ref">Referanse</label>
      <input
        id="sp-ref"
        class="field-input field-input-mono"
        type="text"
        value={evaluation.data.reference}
        oninput={(e) => evaluation.setReference((e.target as HTMLInputElement).value)}
        placeholder="2026/1234"
      />
    </div>
    <div class="field">
      <label class="field-label" for="sp-cv">Kontraktsverdi</label>
      <div class="field-row">
        <input
          id="sp-cv"
          class="field-input field-input-mono field-input-num"
          type="text"
          inputmode="numeric"
          value={contractValueDisplay}
          oninput={handleContractValueInput}
          onblur={handleContractValueBlur}
          onfocus={handleContractValueFocus}
          placeholder="0"
        />
        <span class="field-unit">kr</span>
      </div>
    </div>
    <div class="field">
      <span class="field-label">Kvalitet / Pris</span>
      <div class="weight-split">
        <span class="weight-split-val">{qualityWeight}<span class="weight-split-pct">%</span></span>
        <span class="weight-split-sep">/</span>
        <span class="weight-split-val">{priceWeight}<span class="weight-split-pct">%</span></span>
      </div>
    </div>
  </div>

  <!-- Suppliers -->
  <div class="panel-section">
    <div class="panel-label">Leverandører</div>
    <div class="supplier-list">
      {#each evaluation.data.suppliers as supplier (supplier.id)}
        <div class="supplier-row">
          <input
            class="supplier-input"
            type="text"
            value={supplier.name}
            oninput={(e) =>
              evaluation.renameSupplier(supplier.id, (e.target as HTMLInputElement).value)}
            placeholder="Navn"
          />
          <button
            class="supplier-rm"
            onclick={() => evaluation.removeSupplier(supplier.id)}
            title="Fjern">×</button
          >
        </div>
      {/each}
      {#if addingSupplier}
        <div class="supplier-row supplier-row-new">
          <input
            class="supplier-input"
            type="text"
            placeholder="Leverandørnavn"
            bind:value={newSupplierName}
            onkeydown={(e) => {
              if (e.key === 'Enter') addSupplier();
              if (e.key === 'Escape') addingSupplier = false;
            }}
          />
          <button class="supplier-ok" onclick={addSupplier}>✓</button>
        </div>
      {:else}
        <button
          class="add-btn"
          onclick={() => {
            addingSupplier = true;
            requestAnimationFrame(() => {
              (
                document.querySelector('.supplier-row-new .supplier-input') as HTMLInputElement
              )?.focus();
            });
          }}
        >
          + Leverandør
        </button>
      {/if}
    </div>
  </div>

  <!-- Validation status -->
  <div class="panel-section panel-status">
    {#if validationItems.length > 0}
      <div class="validation-list">
        {#each validationItems as item}
          <span class="validation-item">{item}</span>
        {/each}
      </div>
    {:else}
      <div class="validation-ok">Klar til evaluering</div>
    {/if}
  </div>
</div>

<style>
  .setup-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
  }

  .panel-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .panel-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
  }

  /* ── Fields ── */
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field-label {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
  }

  .field-input {
    padding: var(--spacing-2) var(--spacing-2);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    outline: none;
    transition: border-color 0.12s;
  }

  .field-input:focus {
    border-color: var(--color-wire-focus);
  }

  .field-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .field-input-mono {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }

  .field-input-num {
    width: 100px;
    text-align: right;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .field-unit {
    font-size: 10px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  /* ── Weight split ── */
  .weight-split {
    display: inline-flex;
    align-items: baseline;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
  }

  .weight-split-val {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-vekt);
  }

  .weight-split-pct {
    font-size: 10px;
    font-weight: 400;
    color: var(--color-ink-ghost);
  }

  .weight-split-sep {
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  /* ── Suppliers ── */
  .supplier-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .supplier-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .supplier-input {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    background: none;
    border: none;
    border-bottom: 1px solid transparent;
    outline: none;
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    transition: border-color 0.12s;
  }

  .supplier-input:focus {
    border-bottom-color: var(--color-wire-focus);
  }

  .supplier-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .supplier-rm {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition: all 0.1s;
  }

  .supplier-row:hover .supplier-rm {
    opacity: 1;
  }

  .supplier-rm:hover {
    color: var(--color-score-low);
    background: var(--color-felt-active);
  }

  .supplier-ok {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--color-score-high);
    background: none;
    border: none;
    cursor: pointer;
  }

  .add-btn {
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: 1px dashed var(--color-wire);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.12s;
    text-align: left;
  }

  .add-btn:hover {
    color: var(--color-vekt);
    border-color: var(--color-vekt-bg-strong);
    background: var(--color-vekt-bg);
  }

  /* ── Validation ── */
  .panel-status {
    margin-top: auto;
  }

  .validation-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .validation-item {
    font-size: 10px;
    color: var(--color-ink-muted);
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-felt);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
  }

  .validation-ok {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-score-high);
    padding: var(--spacing-2);
    text-align: center;
  }
</style>
