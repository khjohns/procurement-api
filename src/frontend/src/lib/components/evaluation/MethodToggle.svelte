<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
</script>

<div class="toggle">
  <button
    class="toggle-btn"
    class:toggle-active={evaluation.activeMethod === 'poeng'}
    onclick={() => (evaluation.activeMethod = 'poeng')}
  >
    Poeng
  </button>
  <button
    class="toggle-btn"
    class:toggle-active={evaluation.activeMethod === 'pris'}
    onclick={() => (evaluation.activeMethod = 'pris')}
  >
    Pris
  </button>
</div>

<style>
  .toggle {
    display: flex;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .toggle-btn {
    padding: var(--spacing-1) var(--spacing-3);
    border: none;
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    cursor: pointer;
    transition: all 0.12s;
  }

  .toggle-btn:first-child {
    border-right: 1px solid var(--color-wire);
  }

  .toggle-active {
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
    font-weight: 600;
  }

  .toggle-btn:hover:not(.toggle-active) {
    background: var(--color-felt-hover);
  }
</style>
