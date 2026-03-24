<script lang="ts">
  import { page } from '$app/state';
  import { themeStore } from '$lib/stores/theme.svelte';

  let { children, data } = $props();

  const id = $derived(page.params.id);

  const workspaces = [
    { path: 'kvalifisering', label: 'Kvalifisering' },
    { path: 'evaluering', label: 'Evaluering' },
    { path: 'protokoll', label: 'Protokoll' },
    { path: 'meddelelse', label: 'Meddelelse' },
  ];

  // Determine current sub-route
  const currentWorkspace = $derived.by(() => {
    const path = page.url.pathname;
    return workspaces.find((w) => path.includes(`/${w.path}`)) ?? null;
  });

  const subRoute = $derived(currentWorkspace?.label ?? null);

  // Dropdown state
  let dropdownOpen = $state(false);

  function handleDropdownToggle(e: MouseEvent) {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
  }

  function handleWindowClick() {
    if (dropdownOpen) dropdownOpen = false;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="app-shell">
  <header class="top-nav">
    <nav class="nav-breadcrumbs" aria-label="Brødsmuler">
      <a href="/anskaffelser" class="crumb">Anskaffelser</a>
      <span class="sep">/</span>
      {#if subRoute}
        <a href="/anskaffelser/{id}" class="crumb">
          {data?.proc?.name || data?.proc?.title || id}
        </a>
        <span class="sep">/</span>
        <div class="workspace-switcher">
          <button
            class="current"
            onclick={handleDropdownToggle}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {subRoute}
            <svg
              class="chevron"
              class:chevron-open={dropdownOpen}
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M2.5 4L5 6.5L7.5 4"
                stroke="currentColor"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          {#if dropdownOpen}
            <div class="workspace-dropdown" role="listbox">
              {#each workspaces as ws}
                {@const isActive = ws.path === currentWorkspace?.path}
                <a
                  href="/anskaffelser/{id}/{ws.path}"
                  class="workspace-item"
                  class:workspace-active={isActive}
                  role="option"
                  aria-selected={isActive}
                  onclick={() => (dropdownOpen = false)}
                >
                  {ws.label}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <span class="current-static">{id}</span>
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

  .current-static {
    color: var(--color-header-fg);
    font-weight: 500;
  }

  /* ── Workspace switcher ── */

  .workspace-switcher {
    position: relative;
  }

  .workspace-switcher .current {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-header-fg);
    font-weight: 500;
    font-size: 12px;
    font-family: inherit;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    margin: -2px -4px;
    border-radius: var(--radius-sm);
    transition: background-color 0.1s;
  }

  .workspace-switcher .current:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .workspace-switcher .current:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.08);
  }

  .chevron {
    transition: transform 0.15s ease;
    color: var(--color-header-muted);
  }

  .chevron-open {
    transform: rotate(180deg);
  }

  .workspace-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: -4px;
    min-width: 160px;
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-md);
    padding: 4px 0;
    z-index: 40;
  }

  .workspace-item {
    display: block;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    text-decoration: none;
    transition:
      background-color 0.08s,
      color 0.08s;
  }

  .workspace-item:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .workspace-item:focus-visible {
    outline: none;
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .workspace-active {
    color: var(--color-ink);
    font-weight: 600;
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
