<script lang="ts">
  interface Props {
    value: number;
    min?: number;
    max?: number;
    suffix?: string;
    oncommit: (value: number) => void;
    variant?: 'weight' | 'weight-column' | 'weight-transposed' | 'score';
  }

  let {
    value,
    min = 0,
    max = 100,
    suffix = '',
    oncommit,
    variant = 'weight',
  }: Props = $props();

  let editing = $state(false);
  let editValue = $state('');

  function startEdit() {
    editing = true;
    editValue = value > 0 || variant !== 'score' ? String(value) : '';
  }

  function commit() {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= min && num <= max && num !== value) {
      oncommit(num);
    }
    editing = false;
  }

  function cancel() {
    editing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  let displayText = $derived(`${value}${suffix}`);
</script>

{#if variant === 'weight'}
  <!-- Inline weight editor: used in item-section headers and resource moment rows -->
  {#if editing}
    <span class="weight-edit-inline">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="number"
        class="weight-input"
        {min}
        {max}
        bind:value={editValue}
        onkeydown={handleKeydown}
        onblur={commit}
        autofocus
      />{#if suffix}{suffix}{/if}
    </span>
  {:else}
    <button class="weight-clickable" onclick={startEdit}>
      {displayText}
    </button>
  {/if}
{:else if variant === 'weight-column'}
  <!-- Weight column editor: used in simple matrix normal mode -->
  {#if editing}
    <div class="weight-edit">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="number"
        class="weight-input"
        {min}
        {max}
        bind:value={editValue}
        onkeydown={handleKeydown}
        onblur={commit}
        autofocus
      /><span class="weight-pct-edit">{suffix}</span>
    </div>
  {:else}
    <button class="weight-display weight-btn" onclick={startEdit}>
      <span class="weight-num">{value}<span class="weight-pct">{suffix}</span></span>
    </button>
  {/if}
{:else if variant === 'weight-transposed'}
  <!-- Weight editor in transposed column headers -->
  {#if editing}
    <span class="weight-edit-inline-t">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="number"
        class="weight-input weight-input-t"
        {min}
        {max}
        bind:value={editValue}
        onkeydown={handleKeydown}
        onblur={commit}
        onclick={(e) => e.stopPropagation()}
        autofocus
      />{#if suffix}{suffix}{/if}
    </span>
  {:else}
    <button
      class="weight-clickable-t"
      onclick={(e) => {
        e.stopPropagation();
        startEdit();
      }}
    >
      {displayText}
    </button>
  {/if}
{:else if variant === 'score'}
  <!-- Score editor: used in resource matrix score cells -->
  {#if editing}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="number"
      class="score-input"
      {min}
      {max}
      bind:value={editValue}
      onkeydown={handleKeydown}
      onblur={commit}
      onclick={(e) => e.stopPropagation()}
      autofocus
    />
  {:else}
    <span class="score-value">{value > 0 ? value : '—'}</span>
  {/if}
{/if}

<style>
  /* ── Weight inline variant (default) ── */
  .weight-edit-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .weight-input {
    width: 36px;
    padding: 2px 4px;
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-vekt);
    background: var(--color-canvas);
    border: 1px solid var(--color-vekt-dim);
    border-radius: var(--radius-sm);
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  .weight-input::-webkit-inner-spin-button,
  .weight-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .weight-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 1px var(--color-vekt-bg-strong);
  }

  .weight-clickable {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-vekt-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .weight-clickable:hover {
    background: var(--color-vekt-bg);
  }
  .weight-clickable:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  /* ── Weight column variant ── */
  .weight-edit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .weight-display {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .weight-num {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-vekt-dim);
  }

  .weight-pct {
    font-size: 9px;
    font-weight: 400;
    color: var(--color-ink-ghost);
  }

  .weight-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .weight-btn:hover {
    background: var(--color-vekt-bg);
  }
  .weight-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .weight-pct-edit {
    font-family: var(--font-data);
    font-size: 9px;
    color: var(--color-ink-ghost);
  }

  /* ── Weight transposed variant ── */
  .weight-edit-inline-t {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-vekt-dim);
  }

  .weight-input-t {
    width: 32px;
    font-size: 10px;
  }

  .weight-clickable-t {
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 500;
    color: var(--color-vekt-dim);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .weight-clickable-t:hover {
    color: var(--color-vekt);
  }

  .weight-clickable-t:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    border-radius: var(--radius-sm);
  }

  /* ── Score variant ── */
  .score-input {
    width: 36px;
    padding: 2px 4px;
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire-focus);
    border-radius: var(--radius-sm);
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  .score-input::-webkit-inner-spin-button,
  .score-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .score-value {
    display: inline-block;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    line-height: 1;
    color: inherit;
  }
</style>
