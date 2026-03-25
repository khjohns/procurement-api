<script lang="ts">
  interface Option {
    id: string;
    label: string;
    ref?: string;
  }

  let {
    options,
    value,
    onchange,
    small = false,
  }: {
    options: Option[];
    value: string;
    onchange: (id: string) => void;
    small?: boolean;
  } = $props();
</script>

<div class="cards">
  {#each options as o}
    {@const sel = value === o.id}
    <button class="card" class:selected={sel} class:small onclick={() => onchange(o.id)}>
      <span class="card-label">{o.label}</span>
      {#if o.ref}<span class="card-ref">{o.ref}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .card {
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 100px;
    transition: all 0.12s ease;
  }

  .card.small {
    padding: 5px 12px;
    min-width: 0;
  }

  .card.selected {
    border: 1.5px solid var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .card-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary);
  }

  .card.small .card-label {
    font-size: 11.5px;
  }

  .card.selected .card-label {
    color: var(--color-ink);
  }

  .card-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }
</style>
