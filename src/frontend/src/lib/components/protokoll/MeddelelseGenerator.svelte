<script lang="ts">
  import { protokoll } from '$lib/stores/protokoll.svelte';
  import { generateMeddelelse, type MeddelelseInput } from '$lib/utils/meddelelse-generator';
  import {
    generateEvaluationDescription,
    type JustificationInput,
  } from '$lib/utils/justification-generator';
  import type { Supplier } from '$lib/stores/evaluation.svelte';
  import { buildOrgLookup, getOrgNameWithLookup } from '$lib/utils/protokoll-helpers';

  let snap = $derived(protokoll.evaluationSnapshot);
  let selectedIds = $derived(protokoll.selectedSupplierIds);
  let canGenerate = $derived(snap != null && selectedIds.length > 0);

  /** Which supplier(s) to generate letters for. */
  let targetMode = $state<'all' | 'single'>('all');
  let singleSupplierId = $state<string>('');

  /** User-specified karens days. */
  let karensDager = $state(10);

  /** User-specified klagefrist date. */
  let klagefristDato = $state('');

  /** Shared org lookup — built once, used by both evaluatedSuppliers and rejectedCount. */
  let orgLookup = $derived(buildOrgLookup(protokoll.activities));

  /** Get evaluated suppliers (exclude rejected/withdrawn). */
  let evaluatedSuppliers = $derived.by<Supplier[]>(() => {
    if (!snap) return [];
    const excluded = new Set(
      protokoll.activities
        .filter(
          (a: any) => a.action === 'REJECT_PARTICIPATION' || a.action === 'WITHDRAW_PARTICIPATION'
        )
        .map((a: any) => getOrgNameWithLookup(a, orgLookup).toLowerCase())
    );
    return snap.data.suppliers.filter((s) => !excluded.has(s.name.toLowerCase()));
  });

  /** Count rejected suppliers. */
  let rejectedCount = $derived.by(() => {
    const rejected = new Set(
      protokoll.activities
        .filter((a: any) => a.action === 'REJECT_PARTICIPATION')
        .map((a: any) => getOrgNameWithLookup(a, orgLookup).toLowerCase())
    );
    return rejected.size;
  });

  /** Total bids from activities. */
  let totalBids = $derived(
    protokoll.activities.filter((a: any) => a.action === 'SUBMIT_BID').length
  );

  /** Generated letters. */
  let letters = $state<Array<{ supplier: Supplier; html: string }>>([]);
  let showPreview = $state(false);

  function doGenerate() {
    if (!snap) return;

    const suppliers =
      targetMode === 'all'
        ? evaluatedSuppliers
        : evaluatedSuppliers.filter((s) => s.id === singleSupplierId);

    // Build shared evaluation input once (identical for all letters)
    const evalInput: JustificationInput = {
      data: snap.data,
      activeMethod: snap.activeMethod,
      selectedSupplierIds: selectedIds,
      groupScores: protokoll.evalGroupScores,
      totals: protokoll.evalTotals,
      ranking: protokoll.evalRanking,
      priceFormulaScores: protokoll.evalPriceFormulaScores,
    };
    const evalHtml = generateEvaluationDescription(evalInput);

    const result: Array<{ supplier: Supplier; html: string }> = [];

    for (const recipient of suppliers) {
      const input: MeddelelseInput = {
        evaluation: evalInput,
        recipientSupplier: recipient,
        procurement: protokoll.procurement,
        totalBids,
        rejectedCount,
        karensDager,
        klagefristDato: klagefristDato || undefined,
        evaluationDescriptionHtml: evalHtml,
      };

      result.push({ supplier: recipient, html: generateMeddelelse(input) });
    }

    letters = result;
    currentLetterIdx = 0;
    showPreview = true;
  }

  /** Currently viewed letter index. */
  let currentLetterIdx = $state(0);
  let currentLetter = $derived(letters[currentLetterIdx] ?? null);

  function prevLetter() {
    if (currentLetterIdx > 0) currentLetterIdx--;
  }

  function nextLetter() {
    if (currentLetterIdx < letters.length - 1) currentLetterIdx++;
  }

  function closePreview() {
    showPreview = false;
    letters = [];
    currentLetterIdx = 0;
  }
</script>

<div class="meddelelse-wrap">
  <div class="field-label">Meddelsesbrev</div>

  {#if !canGenerate}
    <div class="gen-disabled">
      {#if !snap}
        <span class="gen-disabled-hint">Evalueringsdata mangler</span>
      {:else}
        <span class="gen-disabled-hint">Velg innstilt leverandør i punkt 11 først</span>
      {/if}
    </div>
  {:else}
    <div class="gen-form">
      <div class="form-row">
        <label class="form-label">
          Generer for
          <select class="form-select" bind:value={targetMode}>
            <option value="all">Alle leverandører ({evaluatedSuppliers.length} stk)</option>
            <option value="single">Én leverandør</option>
          </select>
        </label>

        {#if targetMode === 'single'}
          <label class="form-label">
            Leverandør
            <select class="form-select" bind:value={singleSupplierId}>
              <option value="">Velg...</option>
              {#each evaluatedSuppliers as s}
                <option value={s.id}>
                  {s.name}
                  {selectedIds.includes(s.id) ? '(innstilt)' : ''}
                </option>
              {/each}
            </select>
          </label>
        {/if}
      </div>

      <div class="form-row">
        <label class="form-label">
          Karensdager
          <input class="form-input" type="number" min="0" max="60" bind:value={karensDager} />
        </label>
        <label class="form-label">
          Klagefrist
          <input class="form-input" type="date" bind:value={klagefristDato} />
        </label>
      </div>

      <button
        class="gen-btn"
        disabled={targetMode === 'single' && !singleSupplierId}
        onclick={doGenerate}
      >
        Generer meddelsesbrev
      </button>
    </div>
  {/if}

  {#if showPreview && currentLetter}
    <div class="preview-container">
      <div class="preview-header">
        <div class="preview-nav">
          {#if letters.length > 1}
            <button class="nav-btn" disabled={currentLetterIdx === 0} onclick={prevLetter}>
              &larr;
            </button>
            <span class="nav-label">
              {currentLetterIdx + 1} av {letters.length} &mdash;
              <strong>{currentLetter.supplier.name}</strong>
              {selectedIds.includes(currentLetter.supplier.id) ? '(innstilt)' : ''}
            </span>
            <button
              class="nav-btn"
              disabled={currentLetterIdx === letters.length - 1}
              onclick={nextLetter}
            >
              &rarr;
            </button>
          {:else}
            <span class="nav-label">
              <strong>{currentLetter.supplier.name}</strong>
              {selectedIds.includes(currentLetter.supplier.id) ? '(innstilt)' : ''}
            </span>
          {/if}
        </div>
        <button class="close-btn" onclick={closePreview} title="Lukk forhåndsvisning">
          &times;
        </button>
      </div>
      <div class="preview-body">
        {@html currentLetter.html}
      </div>
    </div>
  {/if}
</div>

<style>
  .meddelelse-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .gen-disabled {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
  }

  .gen-disabled-hint {
    font-size: 12px;
    color: var(--color-ink-muted);
    font-style: italic;
  }

  .gen-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
  }

  .form-row {
    display: flex;
    gap: var(--spacing-3);
    flex-wrap: wrap;
  }

  .form-label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    font-size: 12px;
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
  }

  .form-select,
  .form-input {
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 13px;
    min-width: 140px;
  }

  .form-select:focus,
  .form-input:focus {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  .form-input[type='number'] {
    width: 80px;
    min-width: 80px;
    font-family: var(--font-data);
  }

  .gen-btn {
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-sm);
    color: var(--color-vekt-dim);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.12s,
      border-color 0.12s;
    align-self: flex-start;
  }

  .gen-btn:hover:not(:disabled) {
    background: var(--color-vekt-bg-strong);
    border-color: var(--color-vekt);
  }

  .gen-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Preview ── */

  .preview-container {
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-canvas);
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
  }

  .preview-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .nav-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .nav-label {
    font-size: 12px;
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-size: 18px;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .close-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .preview-body {
    padding: var(--spacing-6) var(--spacing-8);
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-ink);
    max-height: 600px;
    overflow-y: auto;
  }

  .preview-body :global(h2) {
    font-size: 16px;
    font-weight: 700;
    margin: var(--spacing-6) 0 var(--spacing-3);
    color: var(--color-ink);
  }

  .preview-body :global(h3) {
    font-size: 14px;
    font-weight: 600;
    margin: var(--spacing-4) 0 var(--spacing-2);
    color: var(--color-ink);
  }

  .preview-body :global(p) {
    margin: 0 0 var(--spacing-2);
  }

  .preview-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--spacing-3) 0;
    font-size: 12px;
    font-family: var(--font-data);
  }

  .preview-body :global(th),
  .preview-body :global(td) {
    text-align: left;
    padding: var(--spacing-1) var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .preview-body :global(th) {
    font-weight: 600;
    color: var(--color-ink-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-body :global(.meddelelse-header) {
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
  }

  .preview-body :global(.meddelelse-header p) {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
