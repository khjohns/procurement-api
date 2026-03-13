<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onclick: () => void;
    title?: string;
    active?: boolean;
    children: Snippet;
  }

  let { onclick, title, active = false, children }: Props = $props();
</script>

<button class="pill-toggle" class:active {onclick} {title}>
  {@render children()}
</button>

<style>
  .pill-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.12s;
    line-height: 1.4;
  }

  .pill-toggle:hover {
    color: var(--color-ink);
    border-color: var(--color-wire-strong);
    background: var(--color-felt-hover);
  }

  .pill-toggle:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .pill-toggle.active {
    color: var(--color-vekt-dim);
    border-color: var(--color-vekt-bg-strong);
    background: var(--color-vekt-bg);
  }

  .pill-toggle.active:hover {
    color: var(--color-vekt);
    background: var(--color-vekt-bg-strong);
  }
</style>
