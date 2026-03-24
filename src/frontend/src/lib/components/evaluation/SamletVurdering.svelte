<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import { generateSamletVurdering } from '$lib/utils/samlet-vurdering-generator';

  let {
    label,
    criterionId,
    criterion,
  }: {
    label: string;
    criterionId: string;
    criterion: Criterion;
  } = $props();

  let value = $derived(evaluation.data.samletVurdering?.[criterionId] ?? '');
  let hasContent = $derived(value.trim().length > 0);
  let confirmOverwrite = $state(false);

  function doGenerate() {
    const scores = evaluation.groupScores[criterionId] ?? {};
    const text = generateSamletVurdering({
      criterion,
      suppliers: evaluation.data.suppliers,
      groupScores: scores,
    });
    evaluation.setSamletVurdering(criterionId, text);
    confirmOverwrite = false;
  }

  function handleGenerate() {
    if (hasContent && !confirmOverwrite) {
      confirmOverwrite = true;
      return;
    }
    doGenerate();
  }
</script>

<div class="samlet">
  <div class="samlet-header">
    <span class="samlet-title">Samlet vurdering – {label}</span>
    <div class="samlet-actions">
      {#if confirmOverwrite}
        <span class="overwrite-warn">Erstatte eksisterende tekst?</span>
        <button class="gen-btn gen-btn-confirm" onclick={handleGenerate}>Erstatt</button>
        <button class="gen-btn gen-btn-cancel" onclick={() => (confirmOverwrite = false)}
          >Avbryt</button
        >
      {:else}
        <button class="gen-btn" onclick={handleGenerate}>Generer utkast ›</button>
      {/if}
    </div>
  </div>
  <p class="samlet-desc">
    Helhetlig begrunnelse som oppsummerer evalueringen. Brukes i meddelelsesbrev og protokoll.
  </p>

  <textarea
    class="samlet-textarea"
    {value}
    oninput={(e) => evaluation.setSamletVurdering(criterionId, e.currentTarget.value)}
    placeholder="Generer utkast fra evaluering, eller skriv begrunnelse manuelt..."
    rows="5"
  ></textarea>
</div>

<style>
  .samlet {
    max-width: 760px;
    margin-top: var(--spacing-5);
    padding: var(--spacing-4) var(--spacing-5);
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
  }

  .samlet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-1);
  }

  .samlet-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .samlet-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .samlet-desc {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-2);
    line-height: 1.5;
  }

  .gen-btn {
    background: none;
    border: none;
    color: var(--color-ink-ghost);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    white-space: nowrap;
    transition: color 0.12s;
  }

  .gen-btn:hover {
    color: var(--color-vekt);
  }

  .gen-btn-confirm {
    color: var(--color-vekt);
    font-weight: 600;
  }

  .gen-btn-cancel {
    color: var(--color-ink-ghost);
  }

  .overwrite-warn {
    font-size: 11px;
    color: var(--color-warn);
    font-weight: 500;
  }

  .samlet-textarea {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    line-height: 1.55;
    resize: vertical;
    outline: none;
  }

  .samlet-textarea:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }
</style>
