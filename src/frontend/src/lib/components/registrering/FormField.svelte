<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    hjemmel,
    hint,
    children,
  }: {
    label: string;
    hjemmel?: string;
    hint?: string;
    children: Snippet;
  } = $props();
</script>

<div class="field">
  <div class="label-row">
    <label class="label">{label}</label>
    {#if hjemmel}<span class="hjemmel">{hjemmel}</span>{/if}
  </div>
  {@render children()}
  {#if hint}<p class="hint">{hint}</p>{/if}
</div>

<style>
  .field {
    margin-bottom: 16px;
  }

  .label-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
  }

  .label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .hjemmel {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  .hint {
    font-size: 10.5px;
    color: var(--color-ink-ghost);
    margin-top: 3px;
    line-height: 1.5;
  }
</style>
