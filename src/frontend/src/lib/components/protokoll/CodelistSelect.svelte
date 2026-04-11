<script lang="ts">
  import { eformsLabels } from '$lib/utils/eforms-labels.svelte';

  interface Props {
    value: string;
    codelistId: string;
    label: string;
    hint?: string;
    foaRef?: string;
    onchange: (value: string) => void;
  }

  let { value, codelistId, label, hint, foaRef, onchange }: Props = $props();

  const options = $derived(Object.entries(eformsLabels(codelistId)));
</script>

<div class="codelist-select">
  <div class="field-header">
    <span class="field-label">{label}</span>
    {#if foaRef}
      <span class="foa-ref">{foaRef}</span>
    {/if}
  </div>
  <select
    class="select"
    {value}
    onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
  >
    <option value="">— Velg —</option>
    {#each options as [code, name] (code)}
      <option value={code}>{name}</option>
    {/each}
  </select>
  {#if hint}
    <span class="field-hint">{hint}</span>
  {/if}
</div>

<style>
  .codelist-select {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .field-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .foa-ref {
    font-size: 10px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  .select {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 13px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.12s;
  }

  .select:focus {
    border-color: var(--color-wire-focus);
  }

  .field-hint {
    font-size: 11px;
    color: var(--color-ink-muted);
  }
</style>
