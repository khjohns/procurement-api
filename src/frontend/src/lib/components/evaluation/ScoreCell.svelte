<script lang="ts">
  import { scoreTier, fmt2 } from '$lib/stores/evaluation.svelte';

  interface Props {
    score: number;
    isBest?: boolean;
    hasNotes?: boolean;
    drilldown?: boolean;
    expanded?: boolean;
    isSelected?: boolean;
    onclick?: () => void;
    /** If provided, the cell supports inline editing. Called with new value on commit. */
    oncommit?: (value: number) => void;
    /** Stop event propagation on click (useful inside clickable rows). */
    stopPropagation?: boolean;
  }

  let {
    score,
    isBest = false,
    hasNotes = false,
    drilldown = false,
    expanded = false,
    isSelected = false,
    onclick,
    oncommit,
    stopPropagation = false,
  }: Props = $props();

  let tier = $derived(scoreTier(score));
  let editing = $state(false);
  let editValue = $state('');

  let displayValue = $derived(fmt2(score));

  function startEdit() {
    if (!oncommit) return;
    editing = true;
    editValue = score > 0 ? String(score) : '';
  }

  function commit() {
    if (!editing) return;
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 10 && oncommit) {
      oncommit(num);
    }
    editing = false;
  }

  function handleClick(e: MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    onclick?.();
    if (oncommit && !editing) startEdit();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      onclick?.();
      if (oncommit) startEdit();
    }
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editing = false;
    }
  }

  let interactive = $derived(!!(onclick || oncommit));
</script>

<td
  class="cell-score score-{tier}"
  class:score-best={isBest}
  class:has-notes={hasNotes}
  class:score-drilldown={drilldown}
  class:expanded
  class:cell-selected={isSelected}
  onclick={interactive ? handleClick : undefined}
  role={interactive ? 'button' : undefined}
  tabindex={interactive ? 0 : undefined}
  onkeydown={interactive ? handleKeydown : undefined}
>
  {#if editing}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="number"
      class="score-input"
      min="0"
      max="10"
      bind:value={editValue}
      onkeydown={handleInputKeydown}
      onblur={commit}
      onclick={(e) => e.stopPropagation()}
      autofocus
    />
  {:else}
    <span class="score-value">{displayValue}</span>
  {/if}
</td>

<style>
  .cell-score {
    text-align: center;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 500;
    padding: var(--spacing-2) var(--spacing-3);
    position: relative;
    transition: background 0.1s;
  }

  .cell-score[role='button'] {
    cursor: pointer;
  }

  .cell-score[role='button']:hover {
    background: var(--color-felt-hover);
  }

  .cell-score:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .cell-selected {
    background: var(--color-vekt-bg);
  }

  .score-value {
    display: inline-block;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    line-height: 1;
  }

  .score-high .score-value {
    color: var(--color-score-high);
  }

  .score-mid .score-value {
    color: var(--color-ink-secondary);
  }

  .score-low .score-value {
    color: var(--color-score-low);
  }

  .score-best .score-value {
    background: var(--color-score-high-bg);
    font-weight: 700;
  }

  .has-notes::after {
    content: '';
    position: absolute;
    top: var(--spacing-1);
    right: var(--spacing-1);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-vekt-dim);
  }

  /* Drilldown chevron for item-evaluated sub-criteria */
  .score-drilldown .score-value::after {
    content: '▾';
    font-size: 8px;
    color: var(--color-ink-ghost);
    margin-left: 2px;
    display: inline-block;
    transition: transform 0.15s;
  }

  .score-drilldown.expanded .score-value::after {
    transform: rotate(180deg);
  }

  /* Inline score editing */
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
</style>
