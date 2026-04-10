<script lang="ts">
  import { page } from '$app/state';
  import { beforeNavigate } from '$app/navigation';
  import { setContext } from 'svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import PhasePanel from '$lib/components/phase/PhasePanel.svelte';
  import {
    routeLabels,
    routeToPhase,
    phases,
    statusLabels,
    derivePhaseStates,
  } from '$lib/config/phases';
  import { formatNOK } from '$lib/utils/format';
  import {
    CONTRACT_NATURE_LABELS,
    PROCEDURE_LABELS,
    getTimelineDate,
    lookupLabel,
  } from '$lib/utils/protokoll-helpers';
  import type { Activity } from '$lib/types/activity';

  let { children, data } = $props();

  const id = $derived(page.params.id ?? '');
  const proc = $derived(data?.proc);
  const activities: Activity[] = $derived(data?.activities ?? []);

  const contractLabel = $derived(lookupLabel(CONTRACT_NATURE_LABELS, proc?.contractCategory ?? proc?.contract_nature));
  const procedureLabel = $derived(lookupLabel(PROCEDURE_LABELS, proc?.procedure));
  const procRef = $derived(proc?.sequenceId ?? proc?.externalId ?? null);

  const currentSubRoute = $derived.by(() => {
    const pathname = page.url.pathname;
    const base = `/anskaffelser/${id}`;
    const rest = pathname.slice(base.length + 1).split('/')[0];
    return rest || null;
  });

  const subRouteLabel = $derived(
    currentSubRoute ? (routeLabels[currentSubRoute] ?? null) : null,
  );

  const procName = $derived(proc?.name || proc?.title || id);

  // Active phase (from URL) and its status (from activities)
  const activePhaseId = $derived(
    currentSubRoute ? (routeToPhase[currentSubRoute] ?? null) : null,
  );

  const activePhase = $derived(
    activePhaseId ? phases.find((p) => p.id === activePhaseId) : null,
  );

  const phaseStates = $derived(derivePhaseStates(activities, proc));
  const activePhaseStatus = $derived(
    activePhaseId ? (phaseStates[activePhaseId]?.status ?? null) : null,
  );

  setContext('phaseStates', () => phaseStates);

  let mobileMenuOpen = $state(false);

  beforeNavigate(() => {
    mobileMenuOpen = false;
  });
</script>

<div class="app-shell">
  <header class="top-nav">
    <div class="nav-left">
      <button
        class="mobile-menu-btn"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Lukk fasemeny' : 'Åpne fasemeny'}
        aria-expanded={mobileMenuOpen}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <nav class="nav-breadcrumbs" aria-label="Brødsmuler">
        <a href="/anskaffelser" class="crumb">Anskaffelser</a>
        <span class="sep">/</span>
        {#if subRouteLabel}
          <a href="/anskaffelser/{id}" class="crumb">{procName}</a>
          <span class="sep">/</span>
          <span class="crumb-current">{subRouteLabel}</span>
        {:else}
          <span class="crumb-current">{procName}</span>
        {/if}
      </nav>
    </div>
    <div class="nav-actions">
      <button
        class="theme-toggle"
        onclick={() => themeStore.toggle()}
        title="Tema: {themeStore.label}"
      >
        {themeStore.icon}
      </button>
      <span class="user-org">Bergen kommune</span>
      <div class="avatar">KJ</div>
    </div>
  </header>

  {#if proc}
    <div class="case-info">
      <div class="case-id-row">
        {#if procRef}
          <span class="case-ref">{procRef}</span>
        {/if}
        {#if proc.threshold === 'ABOVE_EEA' || proc.regulation === 'del3'}
          <span class="case-del">Del III</span>
        {:else if proc.threshold === 'BELOW_EEA' || proc.regulation === 'del2'}
          <span class="case-del">Del II</span>
        {/if}
      </div>
      <div class="case-meta">
        {#if proc.about_procurer?.name}
          <span>{proc.about_procurer.name}</span>
        {/if}
        {#if contractLabel}
          <span class="case-meta-sep">&middot;</span>
          <span>{contractLabel}</span>
        {/if}
        {#if proc.estimated_value}
          <span class="case-meta-sep">&middot;</span>
          <span class="case-value">{formatNOK(proc.estimated_value)}</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="shell-body">
    <PhasePanel
      procId={id}
      {phaseStates}
      mobileOpen={mobileMenuOpen}
      onclose={() => (mobileMenuOpen = false)}
    />
    <div class="shell-content">
      {#if activePhase && activePhaseStatus}
        <div class="content-header">
          <span class="phase-num">{activePhase.number}</span>
          <span class="phase-title">{activePhase.label}</span>
          <span
            class="phase-badge"
            class:badge-fullfort={activePhaseStatus === 'fullfort'}
            class:badge-aktiv={activePhaseStatus === 'aktiv'}
            class:badge-kommende={activePhaseStatus === 'kommende'}
          >
            {statusLabels[activePhaseStatus]}
          </span>
        </div>
      {/if}
      <main class="app-main">
        {@render children()}
      </main>
    </div>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-canvas);
    color: var(--color-ink);
  }

  /* ── Header ── */
  .top-nav {
    height: var(--header-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    flex-shrink: 0;
    background: var(--color-header-bg);
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-menu-btn {
    display: none;
  }

  .nav-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-header-muted);
  }

  .nav-breadcrumbs .crumb {
    color: var(--color-header-muted);
    text-decoration: none;
    transition: color 100ms ease;
  }

  .nav-breadcrumbs .crumb:hover {
    color: var(--color-header-fg);
  }

  .nav-breadcrumbs .sep {
    color: var(--color-header-muted);
  }

  .crumb-current {
    color: var(--color-header-fg);
    font-weight: 500;
  }

  /* ── Nav actions ── */
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--color-header-muted);
  }

  .theme-toggle {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-header-muted);
    font-size: 14px;
    cursor: pointer;
    transition:
      background 0.12s,
      color 0.12s;
  }

  .theme-toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-header-fg);
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-header-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-header-bg);
  }

  /* ── Case info strip ── */
  .case-info {
    flex-shrink: 0;
    padding: var(--spacing-2) 24px;
    border-bottom: 1px solid var(--color-wire);
    background: var(--color-felt);
  }

  .case-id-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .case-ref {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .case-del {
    font-family: var(--font-data);
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    background: var(--color-vekt);
    color: var(--color-felt);
  }

  .case-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-top: 2px;
    flex-wrap: wrap;
  }

  .case-meta-sep {
    color: var(--color-ink-ghost);
  }

  .case-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }

  /* ── Shell body ── */
  .shell-body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .shell-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Content header (phase title + badge) ── */
  .content-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: 1px solid var(--color-wire);
  }

  .phase-num {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    font-variant-numeric: tabular-nums;
  }

  .phase-title {
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .phase-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
  }

  .badge-fullfort {
    color: var(--color-score-high);
    background: var(--color-score-high-bg);
  }

  .badge-aktiv {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .badge-kommende {
    color: var(--color-ink-ghost);
    background: var(--color-felt-active);
  }

  .app-main {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* ── Mobile ── */
  @media (max-width: 1023px) {
    .top-nav {
      padding: 0 16px;
    }

    .case-info {
      padding: var(--spacing-2) 16px;
    }

    .mobile-menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--color-header-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition:
        background 0.12s,
        color 0.12s;
    }

    .mobile-menu-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--color-header-fg);
    }

    .nav-breadcrumbs .crumb {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .nav-actions .user-org,
    .nav-actions .avatar {
      display: none;
    }

    .content-header {
      padding: var(--spacing-3) var(--spacing-4);
    }
  }
</style>
