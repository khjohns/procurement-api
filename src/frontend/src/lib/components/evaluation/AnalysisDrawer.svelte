<script lang="ts">
  let {
    open = false,
    onclose,
  }: {
    open: boolean;
    onclose: () => void;
  } = $props();

  let tab = $state<'robust' | 'betaling' | 'sensitivitet'>('robust');
  let full = $state(false);

  const tabs = [
    { id: 'robust' as const, label: 'Robusthet' },
    { id: 'betaling' as const, label: 'Betalingsvilje' },
    { id: 'sensitivitet' as const, label: 'Sensitivitet' },
  ];

  let drawerHeight = $derived(full ? '82vh' : '44vh');
</script>

{#if open}
  <!-- Backdrop -->
  <button class="backdrop" onclick={onclose} aria-label="Lukk analyse" tabindex="-1"></button>

  <!-- Drawer -->
  <div class="drawer" style:height={drawerHeight}>
    <div class="drawer-header">
      <div class="drawer-tabs">
        {#each tabs as t (t.id)}
          <button
            class="drawer-tab"
            class:drawer-tab-active={tab === t.id}
            onclick={() => (tab = t.id)}
          >
            {t.label}
          </button>
        {/each}
      </div>
      <div class="drawer-actions">
        <button class="drawer-btn" onclick={() => (full = !full)}>
          {full ? 'Kompakt ⇅' : 'Utvid ⇅'}
        </button>
        <button class="drawer-close" onclick={onclose}>×</button>
      </div>
    </div>

    <div class="drawer-content">
      {#if tab === 'robust'}
        <p class="placeholder">Robusthetsanalyse kommer her.</p>
      {:else if tab === 'betaling'}
        <p class="placeholder">Betalingsviljeanalyse kommer her.</p>
      {:else if tab === 'sensitivitet'}
        <p class="placeholder">Sensitivitetsanalyse kommer her.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    z-index: 900;
    border: none;
    cursor: default;
  }

  .drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-felt);
    border-top: 2px solid var(--color-wire-strong);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-overlay);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-3) var(--spacing-6);
    border-bottom: 1px solid var(--color-wire);
    flex-shrink: 0;
  }

  .drawer-tabs {
    display: flex;
    gap: 0;
  }

  .drawer-tab {
    padding: var(--spacing-2) var(--spacing-4);
    border: none;
    cursor: pointer;
    background: transparent;
    border-bottom: 2px solid transparent;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    transition: all 0.12s;
  }

  .drawer-tab-active {
    background: var(--color-felt-raised);
    border-bottom-color: var(--color-vekt);
    font-weight: 700;
    color: var(--color-ink);
  }

  .drawer-tab:hover:not(.drawer-tab-active) {
    color: var(--color-ink-secondary);
  }

  .drawer-actions {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .drawer-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .drawer-btn:hover {
    color: var(--color-ink-secondary);
  }

  .drawer-close {
    font-size: 16px;
    line-height: 1;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 var(--spacing-1);
  }

  .drawer-close:hover {
    color: var(--color-ink);
  }

  .drawer-content {
    flex: 1;
    overflow: auto;
    padding: var(--spacing-5) var(--spacing-6);
  }

  .placeholder {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }
</style>
