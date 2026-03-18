<script lang="ts">
  import { page } from '$app/state';
  import { themeStore } from '$lib/stores/theme.svelte';

  let { children, data } = $props();

  const id = $derived(page.params.id);

  // Determine current sub-route for breadcrumb
  const subRoute = $derived.by(() => {
    const path = page.url.pathname;
    if (path.endsWith('/kvalifisering')) return 'Kvalifisering';
    if (path.includes('/evaluering')) return 'Evaluering';
    if (path.endsWith('/protokoll')) return 'Protokoll';
    if (path.endsWith('/meddelelse')) return 'Meddelelse';
    return null;
  });
</script>

<div class="app-shell">
  <header class="top-nav">
    <nav class="nav-breadcrumbs" aria-label="Brødsmuler">
      <a href="/anskaffelser" class="crumb">Anskaffelser</a>
      <span class="sep">/</span>
      {#if subRoute}
        <a href="/anskaffelser/{id}" class="crumb">{data?.proc?.name || data?.proc?.title || id}</a>
        <span class="sep">/</span>
        <span class="current">{subRoute}</span>
      {:else}
        <span class="current">{id}</span>
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
  <main class="app-main">
    {@render children()}
  </main>
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
    border-bottom: 1px solid var(--color-wire-strong);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    flex-shrink: 0;
    background: var(--color-canvas);
  }

  .nav-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  .nav-breadcrumbs .crumb {
    color: var(--color-ink-secondary);
    text-decoration: none;
    transition: color 100ms ease;
  }

  .nav-breadcrumbs .crumb:hover {
    color: var(--color-ink);
  }

  .nav-breadcrumbs .sep {
    color: var(--color-ink-ghost);
  }

  .nav-breadcrumbs .current {
    color: var(--color-ink);
    font-weight: 500;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--color-ink-secondary);
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
    color: var(--color-ink-secondary);
    font-size: 14px;
    cursor: pointer;
    transition:
      background 0.12s,
      color 0.12s;
  }

  .theme-toggle:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-wire-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .app-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

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
