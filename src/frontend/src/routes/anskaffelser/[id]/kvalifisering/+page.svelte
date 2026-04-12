<script lang="ts">
  import { qualification } from '$lib/stores/qualification.svelte';
  import QualificationOverview from '$lib/components/qualification/QualificationOverview.svelte';
  import RequirementView from '$lib/components/qualification/RequirementView.svelte';
  import QualificationStatusPanel from '$lib/components/qualification/QualificationStatusPanel.svelte';

  let { data } = $props();

  if (data?.proc?.id) {
    qualification.initializeSuppliersIfNeeded(data.proc.id, data.activities ?? []);
  }

  let mobilePanelOpen = $state(false);
</script>

<div class="qual-workspace">
  <!-- Main content area -->
  <div class="qual-main">
    <!-- Context line -->
    <div class="qual-context">
      <span class="context-name">{qualification.data.title}</span>
      {#if qualification.data.reference}
        <span class="context-sep">·</span>
        <span class="context-ref">{qualification.data.reference}</span>
      {/if}
    </div>

    <div class="qual-main-content">
      {#if qualification.activeView === 'overview'}
        <QualificationOverview />
      {:else if qualification.activeRequirement}
        <RequirementView requirementId={qualification.activeRequirement.id} />
      {/if}
    </div>
  </div>

  <!-- Right panel (desktop) -->
  <aside class="qual-panel" class:panel-open={mobilePanelOpen}>
    <QualificationStatusPanel />
  </aside>

  <!-- Mobile panel toggle -->
  <button
    class="mobile-panel-toggle"
    onclick={() => (mobilePanelOpen = !mobilePanelOpen)}
    aria-label={mobilePanelOpen ? 'Lukk panel' : 'Åpne panel'}
  >
    {mobilePanelOpen ? '✕' : '☰'}
  </button>

  <!-- Mobile backdrop -->
  {#if mobilePanelOpen}
    <button
      class="mobile-backdrop"
      onclick={() => (mobilePanelOpen = false)}
      aria-label="Lukk panel"
      tabindex="-1"
    ></button>
  {/if}
</div>

<style>
  .qual-workspace {
    display: flex;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* ── Main content ── */
  .qual-main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    background: var(--color-felt);
  }

  .qual-main-content {
    flex: 1;
    min-height: 0;
  }

  /* ── Context line ── */
  .qual-context {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-5);
    font-size: 12px;
    color: var(--color-ink-secondary);
    flex-shrink: 0;
  }

  .context-name {
    font-weight: 600;
  }

  .context-sep {
    color: var(--color-ink-ghost);
  }

  .context-ref {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  /* ── Right panel ── */
  .qual-panel {
    width: 300px;
    flex-shrink: 0;
    overflow-y: auto;
    border-left: 1px solid var(--color-wire);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    background: var(--color-felt);
  }

  /* ── Mobile ── */
  .mobile-panel-toggle {
    display: none;
  }

  .mobile-backdrop {
    display: none;
  }

  @media (max-width: 1023px) {
    .qual-panel {
      position: fixed;
      top: var(--header-height);
      right: 0;
      bottom: 0;
      width: 320px;
      background: var(--color-felt);
      z-index: 100;
      transform: translateX(100%);
      transition: transform 0.2s ease-out;
    }

    .qual-panel.panel-open {
      transform: translateX(0);
    }

    .mobile-panel-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      bottom: var(--spacing-5);
      right: var(--spacing-5);
      width: var(--spacing-10);
      height: var(--spacing-10);
      border-radius: 50%;
      background: var(--color-felt-raised);
      border: 1px solid var(--color-wire-strong);
      color: var(--color-ink);
      font-size: 16px;
      cursor: pointer;
      z-index: 101;
      transition: background 0.12s;
    }

    .mobile-panel-toggle:hover {
      background: var(--color-felt-active);
    }

    .mobile-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: var(--color-overlay);
      z-index: 99;
      border: none;
      cursor: default;
    }

    .qual-main {
      padding: var(--spacing-3) var(--spacing-4);
    }
  }
</style>
