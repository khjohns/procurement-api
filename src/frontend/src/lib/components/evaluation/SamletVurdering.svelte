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
  </div>
  <p class="samlet-desc">
    Helhetlig begrunnelse som oppsummerer evalueringen. Brukes i meddelelsesbrev og protokoll.
  </p>

  <div class="generator-bar">
    <div class="bar-left">
      {#if confirmOverwrite}
        <span class="overwrite-warn">Eksisterende tekst vil bli erstattet.</span>
        <button class="gen-btn gen-btn-confirm" onclick={handleGenerate}>Erstatt</button>
        <button class="gen-btn gen-btn-cancel" onclick={() => (confirmOverwrite = false)}>
          Avbryt
        </button>
      {:else}
        <button class="gen-btn" onclick={handleGenerate}>Generer utkast fra evaluering</button>
      {/if}
    </div>
  </div>

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
    padding: var(--spacing-4) var(--spacing-5);
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    margin-top: var(--spacing-5);
  }

  .samlet-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--spacing-1);
  }

  .samlet-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .samlet-desc {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-2);
    line-height: 1.5;
  }

  .generator-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-2);
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .gen-btn {
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-sm);
    color: var(--color-vekt-dim);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.12s,
      border-color 0.12s;
    white-space: nowrap;
  }

  .gen-btn:hover {
    background: var(--color-vekt-bg-strong);
    border-color: var(--color-vekt);
  }

  .gen-btn-confirm {
    background: var(--color-vekt);
    color: var(--color-canvas);
    border-color: var(--color-vekt);
  }

  .gen-btn-confirm:hover {
    filter: brightness(1.1);
  }

  .gen-btn-cancel {
    background: none;
    border-color: var(--color-wire);
    color: var(--color-ink-secondary);
  }

  .gen-btn-cancel:hover {
    background: var(--color-felt-hover);
  }

  .overwrite-warn {
    font-size: 12px;
    color: var(--color-vekt-dim);
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
