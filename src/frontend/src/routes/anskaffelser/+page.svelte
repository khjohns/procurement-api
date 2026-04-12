<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import Saksoversikt from '$lib/components/saksoversikt/Saksoversikt.svelte';
  import OversiktSidebar from '$lib/components/saksoversikt/OversiktSidebar.svelte';
  import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';
  import BoundaryFallback from '$lib/components/shared/BoundaryFallback.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import type {
    AnskaffelsesOversiktItem,
    AnskaffelsesFilter,
    HendelseType,
    OversiktVisning,
  } from '$lib/types/anskaffelse';

  const STORAGE_KEY = 'anskaffelser-visning';

  // ── API data ──

  let alleMature = $state<AnskaffelsesOversiktItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(() => {
    fetch('/api/procurements/mature')
      .then((r) => (r.ok ? r.json() : Promise.reject('Feil ved henting')))
      .then((data: AnskaffelsesOversiktItem[]) => {
        alleMature = data;
        loading = false;
      })
      .catch((e) => {
        error = String(e);
        loading = false;
      });
  });

  // ── Filter state ──

  let filter = $state<AnskaffelsesFilter>({
    status: 'alle',
    prosedyrer: new Set(),
    terskler: new Set(),
    kontraktstyper: new Set(),
    rammeavtale: null,
    saksbehandlere: new Set(),
  });

  function byttFilter(f: AnskaffelsesFilter) {
    filter = f;
  }

  const filtrert = $derived.by(() => {
    let result = alleMature;

    // Status (cancelled prioriteres over awarded — en avlyst anskaffelse er ikke «tildelt»)
    if (filter.status === 'pågående') result = result.filter((s) => !s.awarded && !s.cancelled);
    else if (filter.status === 'tildelt') result = result.filter((s) => s.awarded && !s.cancelled);
    else if (filter.status === 'avlyst') result = result.filter((s) => s.cancelled);

    // Prosedyre
    if (filter.prosedyrer.size > 0)
      result = result.filter((s) => filter.prosedyrer.has(s.procedure));

    // Terskel
    if (filter.terskler.size > 0) result = result.filter((s) => filter.terskler.has(s.threshold));

    // Kontraktstype
    if (filter.kontraktstyper.size > 0)
      result = result.filter((s) => filter.kontraktstyper.has(s.nature));

    // Rammeavtale
    if (filter.rammeavtale === true) result = result.filter((s) => s.framework);

    // Saksbehandler
    if (filter.saksbehandlere.size > 0)
      result = result.filter((s) => filter.saksbehandlere.has(s.contactPerson));

    return result;
  });

  // ── View state ──

  let visning = $state<OversiktVisning>(
    browser ? ((localStorage.getItem(STORAGE_KEY) as OversiktVisning) ?? 'tidslinje') : 'tidslinje'
  );

  let sidebarOpen = $state(false);
  let sidebarSpor = $state<HendelseType | null>(null);
  let tastaturSpor = $state<HendelseType | null>(null);
  const aktivtSpor = $derived(tastaturSpor ?? sidebarSpor);

  const HENDELSE_TASTER: Record<string, HendelseType> = {
    u: 'U',
    k: 'K',
    f: 'F',
    s: 'S',
    t: 'T',
    e: 'E',
    p: 'P',
  };

  function byttVisning(v: OversiktVisning) {
    visning = v;
    if (browser) localStorage.setItem(STORAGE_KEY, v);
  }

  function byttSpor(spor: HendelseType | null) {
    sidebarSpor = spor;
  }

  function erRedigerbart(target: EventTarget | null): boolean {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
    return target instanceof Element && target.closest('[contenteditable="true"]') !== null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (erRedigerbart(e.target)) return;
    if (e.repeat) return;
    const spor = HENDELSE_TASTER[e.key.toLowerCase()];
    if (spor) tastaturSpor = spor;
  }

  function handleKeyup(e: KeyboardEvent) {
    const spor = HENDELSE_TASTER[e.key.toLowerCase()];
    if (spor && tastaturSpor === spor) tastaturSpor = null;
  }

  function handleBlur() {
    tastaturSpor = null;
  }

  const sidebarProps = $derived({
    alleSaker: alleMature,
    saker: filtrert,
    visning,
    onvisning: byttVisning,
    aktivtSpor,
    onspor: byttSpor,
    filter,
    onfilter: byttFilter,
  });
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} onblur={handleBlur} />

<div class="app-shell">
  <header class="top-nav">
    <nav class="nav-breadcrumbs" aria-label="Brødsmuler">
      <span class="current">Anskaffelser</span>
    </nav>
    <div class="nav-actions">
      <a href="/anskaffelser/ny" class="ny-btn">+ Ny anskaffelse</a>
      <a href="/verktoy" class="verktoy-link">Verktøy</a>
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

  <div class="page-layout">
    <!-- Desktop sidebar -->
    <div class="desktop-sidebar">
      <OversiktSidebar {...sidebarProps} />
    </div>

    <!-- Mobile toggle -->
    <button
      class="sidebar-toggle"
      class:er-open={sidebarOpen}
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label={sidebarOpen ? 'Skjul meny' : 'Vis meny'}
    >
      {sidebarOpen ? '\u2715' : '\u2630'}
    </button>

    <!-- Mobile drawer -->
    {#if sidebarOpen}
      <div class="sidebar-backdrop" role="presentation" onclick={() => (sidebarOpen = false)}></div>
      <div class="sidebar-drawer">
        <OversiktSidebar {...sidebarProps} />
      </div>
    {/if}

    <div class="page-content">
      {#if loading}
        <div class="state-message" role="status" aria-live="polite">
          <span class="state-text">Laster anskaffelser...</span>
        </div>
      {:else if error}
        <div class="state-message state-error" role="alert">
          <span class="state-text">
            Kunne ikke laste anskaffelser. {error}
          </span>
        </div>
      {:else if alleMature.length === 0}
        <div class="state-message" role="status">
          <span class="state-text">Ingen anskaffelser funnet.</span>
        </div>
      {:else if filtrert.length === 0}
        <div class="state-message" role="status">
          <span class="state-text">Ingen anskaffelser matcher valgte filter.</span>
        </div>
      {:else if visning === 'tidslinje'}
        <BoundaryFallback title="Tidslinjen kunne ikke vises">
          <Saksoversikt saker={filtrert} {aktivtSpor} />
        </BoundaryFallback>
      {:else}
        <div class="tabell-wrap">
          <CaseListTable saker={filtrert} />
        </div>
      {/if}
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

  .top-nav {
    height: var(--header-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    flex-shrink: 0;
    background: var(--color-header-bg);
  }

  .nav-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-header-muted);
  }

  .nav-breadcrumbs .current {
    color: var(--color-header-fg);
    font-weight: 500;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--color-header-muted);
  }

  .ny-btn {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    background: var(--color-vekt);
    color: #fff;
    text-decoration: none;
    transition: opacity 0.12s;
  }

  .ny-btn:hover {
    opacity: 0.85;
  }

  .verktoy-link {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-header-muted);
    text-decoration: none;
    transition: color 0.12s;
  }

  .verktoy-link:hover {
    color: var(--color-header-fg);
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

  .user-org {
    color: var(--color-header-muted);
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-header-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-header-bg);
  }

  .page-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .page-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .tabell-wrap {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-6);
    max-width: 1200px;
  }

  .state-message {
    padding: var(--spacing-8) var(--spacing-4);
    text-align: center;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .state-text {
    font-size: 13px;
    color: var(--color-ink-muted);
  }

  .state-error .state-text {
    color: var(--color-score-low);
  }

  /* Mobile */
  .sidebar-toggle {
    display: none;
  }

  .sidebar-backdrop {
    display: none;
  }

  .sidebar-drawer {
    display: none;
  }

  @media (max-width: 1023px) {
    .desktop-sidebar {
      display: none;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      top: calc(var(--header-height) + 8px);
      left: 16px;
      z-index: 26;
      width: 30px;
      height: 30px;
      background: var(--color-felt);
      border: 1px solid var(--color-wire-strong);
      border-radius: var(--radius-sm);
      color: var(--color-ink-secondary);
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
      transition:
        background 150ms,
        color 150ms;
    }

    .sidebar-toggle:hover,
    .sidebar-toggle.er-open {
      background: var(--color-felt-active);
      color: var(--color-ink);
    }

    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(0, 0, 0, 0.45);
    }

    .sidebar-drawer {
      display: flex;
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      z-index: 22;
      width: 280px;
    }
  }
</style>
