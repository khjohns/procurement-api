<script lang="ts">
  import { protokoll } from '$lib/stores/protokoll.svelte';
  import { generateJustification, type JustificationInput } from '$lib/utils/justification-generator';
  import { stripHtml } from '$lib/utils/protokoll-helpers';
  import RichTextEditor from './RichTextEditor.svelte';

  interface Props {
    fieldKey: string;
    label?: string;
    hint?: string;
  }

  let { fieldKey, label = '', hint = '' }: Props = $props();

  let snap = $derived(protokoll.evaluationSnapshot);
  let selectedIds = $derived(protokoll.selectedSupplierIds);
  let canGenerate = $derived(snap != null && selectedIds.length > 0);
  let body = $derived((protokoll.manual[fieldKey] as string) || '<p></p>');
  let isStale = $derived(protokoll.justificationStale);
  let isEdited = $derived(protokoll.justificationEdited);

  let infoOpen = $state(false);
  let confirmOverwrite = $state(false);
  let hasContent = $derived(stripHtml((protokoll.manual[fieldKey] as string) ?? '').length > 0);

  function doGenerate() {
    if (!snap) return;

    const input: JustificationInput = {
      data: snap.data,
      activeMethod: snap.activeMethod,
      selectedSupplierIds: selectedIds,
      groupScores: protokoll.evalGroupScores,
      totals: protokoll.evalTotals,
      ranking: protokoll.evalRanking,
      priceFormulaScores: protokoll.evalPriceFormulaScores,
    };

    const html = generateJustification(input);
    protokoll.setManualField(fieldKey, html);
    protokoll.markJustificationGenerated(html);
    confirmOverwrite = false;
  }

  function handleGenerate() {
    if (hasContent && !confirmOverwrite) {
      confirmOverwrite = true;
      return;
    }
    doGenerate();
  }

  function handleRegenerate() {
    if (isEdited && !confirmOverwrite) {
      confirmOverwrite = true;
      return;
    }
    doGenerate();
  }

  function handleCancel() {
    confirmOverwrite = false;
  }
</script>

<div class="justification-wrap">
  {#if label}
    <div class="field-label">{label}</div>
  {/if}

  {#if isStale && canGenerate}
    <div class="stale-banner">
      <span class="stale-text">Evalueringen er endret siden begrunnelsen ble generert.</span>
      {#if confirmOverwrite && isEdited}
        <span class="overwrite-warn">Manuelle endringer vil gå tapt.</span>
        <button class="gen-btn gen-btn-confirm" onclick={handleRegenerate}>Regenerer</button>
        <button class="gen-btn gen-btn-cancel" onclick={handleCancel}>Avbryt</button>
      {:else}
        <button class="gen-btn gen-btn-stale" onclick={handleRegenerate}>
          Regenerer begrunnelse
        </button>
      {/if}
    </div>
  {/if}

  <div class="generator-bar">
    <div class="bar-left">
      {#if canGenerate}
        {#if confirmOverwrite && !isStale}
          <span class="overwrite-warn">Eksisterende tekst vil bli erstattet.</span>
          <button class="gen-btn gen-btn-confirm" onclick={handleGenerate}>Erstatt</button>
          <button class="gen-btn gen-btn-cancel" onclick={handleCancel}>Avbryt</button>
        {:else}
          <button class="gen-btn" onclick={handleGenerate}>
            Generer utkast fra evaluering
          </button>
        {/if}
      {:else if !snap}
        <span class="gen-disabled-hint">Evalueringsdata mangler</span>
        <button
          class="refresh-btn"
          onclick={() => protokoll.refreshEvaluation()}
          title="Hent siste evalueringsdata"
        >
          Oppdater
        </button>
      {:else}
        <span class="gen-disabled-hint">Velg innstilt leverandør i punkt 11 først</span>
      {/if}
    </div>
    <button
      class="info-toggle"
      onclick={() => (infoOpen = !infoOpen)}
      aria-expanded={infoOpen}
      title="Om begrunnelsesgeneratoren"
    >
      ?
    </button>
  </div>

  {#if infoOpen}
    <div class="info-box">
      <p>
        Generatoren lager et <strong>utkast</strong> basert på poeng og begrunnelser fra
        evalueringen. Utkastet bør gjennomgås og tilpasses:
      </p>
      <ul>
        <li>Kontroller at formuleringene er dekkende og presise</li>
        <li>Fjern opplysninger som er underlagt taushetsplikt</li>
        <li>Utdyp relative fordeler der generatoren har markert med [mangler]</li>
        <li>Poeng alene er ikke tilstrekkelig begrunnelse — legg til kvalitative vurderinger</li>
      </ul>
    </div>
  {/if}

  <RichTextEditor
    {body}
    placeholder="Generer utkast fra evaluering, eller skriv begrunnelse manuelt..."
    {hint}
    onchange={(html) => protokoll.setManualField(fieldKey, html)}
  />
</div>

<style>
  .justification-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
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
    transition: background-color 0.12s, border-color 0.12s;
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

  .gen-disabled-hint {
    font-size: 12px;
    color: var(--color-ink-muted);
    font-style: italic;
  }

  .refresh-btn {
    padding: var(--spacing-1) var(--spacing-2);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .refresh-btn:hover {
    background: var(--color-felt-hover);
  }

  .stale-banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-sm);
    flex-wrap: wrap;
  }

  .stale-text {
    font-size: 12px;
    color: var(--color-vekt-dim);
    font-weight: 500;
  }

  .gen-btn-stale {
    background: var(--color-vekt-bg-strong);
    border-color: var(--color-vekt);
    color: var(--color-vekt-dim);
  }

  .gen-btn-stale:hover {
    background: var(--color-vekt);
    color: var(--color-canvas);
  }

  .overwrite-warn {
    font-size: 12px;
    color: var(--color-vekt-dim);
    font-weight: 500;
  }

  .info-toggle {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: 50%;
    color: var(--color-ink-muted);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color 0.12s, color 0.12s;
  }

  .info-toggle:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .info-box {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  .info-box p {
    margin: 0 0 var(--spacing-2);
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5em;
  }

  .info-box li {
    margin-bottom: var(--spacing-1);
  }
</style>
