<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';

  interface Props {
    subCriterionId: string;
    subCriterionName: string;
    supplierId: string;
    supplierName: string;
    score: number;
  }

  let { subCriterionId, subCriterionName, supplierId, supplierName, score }: Props = $props();

  let colCount = $derived(evaluation.data.suppliers.length + 2);

  let noteText = $derived(
    (() => {
      for (const c of evaluation.data.criteria) {
        const sub = c.subcriteria.find((s) => s.id === subCriterionId);
        if (sub) return sub.notes[supplierId] ?? '';
      }
      return '';
    })()
  );
</script>

<tr class="row-annotation">
  <td colspan={colCount}>
    <div class="annotation-panel">
      <div class="annotation-context">
        <span class="annotation-supplier">{supplierName}</span>
        <span class="annotation-sep">›</span>
        <span class="annotation-criterion">{subCriterionName}</span>
      </div>
      <div class="annotation-body">
        <div class="annotation-scoring">
          <div class="annotation-scoring-label">Poeng</div>
          <div class="score-selector">
            {#each Array.from({ length: 11 }, (_, i) => i) as seg}
              <button
                class="score-seg"
                class:seg-filled={seg < score}
                class:seg-active={seg === score}
                onclick={() => evaluation.setScore(subCriterionId, supplierId, seg)}
              >
                {seg}
              </button>
            {/each}
          </div>
        </div>
        <div class="annotation-notes">
          <div class="annotation-notes-label">Begrunnelse</div>
          <textarea
            class="annotation-textarea"
            value={noteText}
            oninput={(e) => evaluation.setNote(subCriterionId, supplierId, e.currentTarget.value)}
            placeholder="Skriv begrunnelse for poengsettingen..."
          ></textarea>
          {#if noteText.length > 0}
            <div class="annotation-charcount">{noteText.length} tegn</div>
          {/if}
        </div>
      </div>
    </div>
  </td>
</tr>

<style>
  .row-annotation td {
    padding: 0;
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire);
  }

  .annotation-panel {
    padding: var(--spacing-4) var(--spacing-5);
    border-left: 3px solid var(--color-vekt);
    margin: 0 var(--spacing-3);
  }

  .annotation-context {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
    font-size: 11px;
  }

  .annotation-supplier {
    font-weight: 600;
    color: var(--color-ink);
  }

  .annotation-sep {
    color: var(--color-ink-ghost);
  }

  .annotation-criterion {
    color: var(--color-ink-muted);
  }

  .annotation-body {
    display: flex;
    gap: var(--spacing-6);
    align-items: flex-start;
  }

  .annotation-scoring {
    flex-shrink: 0;
  }

  .annotation-scoring-label,
  .annotation-notes-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-2);
  }

  .score-selector {
    display: flex;
    gap: 2px;
  }

  .score-seg {
    width: 30px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.1s;
  }

  .score-seg:hover {
    background: var(--color-felt-hover);
    border-color: var(--color-wire-strong);
    color: var(--color-ink);
  }

  .seg-filled {
    background: var(--color-score-high-bg);
    border-color: var(--color-score-high-bg);
    color: var(--color-score-high);
  }

  .seg-active {
    background: var(--color-score-high);
    border-color: var(--color-score-high);
    color: var(--color-ink);
    font-weight: 700;
  }

  .annotation-notes {
    flex: 1;
    min-width: 0;
  }

  .annotation-textarea {
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

  .annotation-textarea:focus {
    border-color: var(--color-wire-focus);
  }

  .annotation-textarea::placeholder {
    color: var(--color-ink-ghost);
  }

  .annotation-charcount {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
    text-align: right;
    margin-top: var(--spacing-1);
  }
</style>
