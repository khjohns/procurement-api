<script lang="ts">
  import { page } from '$app/state';
  import { themeStore } from '$lib/stores/theme.svelte';
  import PhasePanel from '$lib/components/phase/PhasePanel.svelte';

  let { children, data } = $props();

  const id = $derived(page.params.id ?? '');

  // Map sub-routes to display labels for breadcrumbs
  const routeLabels: Record<string, string> = {
    kvalifisering: 'Kvalifisering',
    evaluering: 'Evaluering',
    protokoll: 'Protokoll',
    meddelelse: 'Meddelelse',
  };

  const currentSubRoute = $derived.by(() => {
    const pathname = page.url.pathname;
    const base = `/anskaffelser/${id}`;
    const rest = pathname.slice(base.length + 1).split('/')[0];
    return rest || null;
  });

  const subRouteLabel = $derived(
    currentSubRoute ? (routeLabels[currentSubRoute] ?? null) : null,
  );

  const procName = $derived(data?.proc?.name || data?.proc?.title || id);
</script>

<div class="app-shell">
  <header class="top-nav">
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

  <div class="shell-body">
    <PhasePanel procId={id} />
    <main class="app-main">
      {@render children()}
    </main>
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

  /* ── Shell body (phase panel + content) ── */
  .shell-body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .app-main {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* ── Responsive ── */
  @media (max-width: 1023px) {
    .top-nav {
      padding: 0 16px;
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
  }
</style>
