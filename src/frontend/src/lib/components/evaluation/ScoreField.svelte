<script lang="ts">
  import { scoreColor, scoreBg } from './shared';

  let {
    value = null,
    onchange,
    size = 'normal',
  }: {
    value: number | null;
    onchange: (v: number | null) => void;
    size?: 'normal' | 'small';
  } = $props();

  let editing = $state(false);
  let draft = $state('');
  let inputEl: HTMLInputElement | undefined = $state();

  function start() {
    draft = value != null ? String(value) : '';
    editing = true;
    // Focus after Svelte renders the input
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commit() {
    editing = false;
    if (draft === '' || draft == null) {
      onchange(null);
      return;
    }
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0 && n <= 10) onchange(n);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') editing = false;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onchange(Math.min(10, (value ?? -1) + 1));
      editing = false;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onchange(Math.max(0, (value ?? 1) - 1));
      editing = false;
    }
  }

  let isSmall = $derived(size === 'small');
</script>

{#if editing}
  <input
    bind:this={inputEl}
    type="text"
    inputmode="numeric"
    value={draft}
    oninput={(e) => (draft = e.currentTarget.value)}
    onblur={commit}
    {onkeydown}
    class="score-input"
    class:score-small={isSmall}
  />
{:else}
  <button
    class="score-display"
    class:score-small={isSmall}
    class:score-empty={value == null}
    style:color={scoreColor(value)}
    style:background={scoreBg(value)}
    style:border-color={value != null ? scoreColor(value) : undefined}
    onclick={start}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') start();
    }}
  >
    {value != null ? value : '–'}
  </button>
{/if}

<style>
  .score-input {
    width: 44px;
    height: 28px;
    text-align: center;
    border-radius: var(--radius-sm);
    border: 1.5px solid var(--color-vekt);
    background: var(--color-felt);
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    outline: none;
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
    padding: 0;
  }

  .score-input.score-small {
    width: 40px;
    height: 24px;
    font-size: 13px;
  }

  .score-display {
    width: 44px;
    height: 28px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-wire);
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 600;
    transition: all 0.15s;
    user-select: none;
    flex-shrink: 0;
  }

  .score-display.score-small {
    width: 40px;
    height: 24px;
    font-size: 13px;
  }

  .score-display.score-empty {
    color: var(--color-ink-ghost);
    border-color: var(--color-wire);
    background: transparent;
  }

  .score-display:hover {
    border-color: var(--color-vekt);
  }

  .score-display:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }
</style>
