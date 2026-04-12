<script lang="ts">
  interface Item {
    id: string;
    label: string;
    hjemmel: string;
  }

  let {
    items,
    selected,
    onchange,
  }: {
    items: Item[];
    selected: string[];
    onchange: (selected: string[]) => void;
  } = $props();

  function toggle(id: string, checked: boolean) {
    onchange(checked ? [...selected, id] : selected.filter((x) => x !== id));
  }
</script>

<div class="group">
  {#each items as item, i}
    {@const ch = selected.includes(item.id)}
    <label class="row" class:checked={ch} class:even={i % 2 === 0}>
      <input
        type="checkbox"
        checked={ch}
        onchange={(e) => toggle(item.id, e.currentTarget.checked)}
      />
      <div class="text">
        <span class="item-label">{item.label}</span>
        <span class="item-hjemmel">{item.hjemmel}</span>
      </div>
    </label>
  {/each}
</div>

<style>
  .group {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 7px 9px;
    cursor: pointer;
    background: var(--color-felt);
  }

  .row.even {
    background: var(--color-felt);
  }

  .row:not(.even) {
    background: var(--color-felt-raised);
  }

  .row.checked {
    background: var(--color-vekt-bg);
  }

  .row + .row {
    border-top: 1px solid var(--color-felt-active);
  }

  input[type='checkbox'] {
    margin-top: 2px;
    accent-color: var(--color-vekt);
  }

  .text {
    display: inline;
  }

  .item-label {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--color-ink);
    line-height: 1.4;
  }

  .item-hjemmel {
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    margin-left: 6px;
  }
</style>
