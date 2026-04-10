<script lang="ts">
  import { page } from '$app/state';
  import {
    phases,
    phaseIcons,
    routeToPhase,
    derivePhaseStates,
    type PhaseDefinition,
    type PhaseState,
  } from '$lib/config/phases';
  import type { Activity } from '$lib/types/activity';

  let {
    procId,
    activities = [],
    proc,
    mobileOpen = false,
    onclose,
  }: {
    procId: string;
    activities?: Activity[];
    proc?: { currentDeadline?: string; timeline?: { submission?: string } };
    mobileOpen?: boolean;
    onclose?: () => void;
  } = $props();

  const states = $derived(derivePhaseStates(activities, proc));

  const activePhaseId = $derived.by(() => {
    const pathname = page.url.pathname;
    const base = `/anskaffelser/${procId}`;
    if (pathname === base || pathname === `${base}/`) return 'registrering';
    const sub = pathname.slice(base.length + 1).split('/')[0];
    return routeToPhase[sub] ?? null;
  });

  function getHref(phase: PhaseDefinition): string | null {
    if (phase.route === null) return null;
    if (phase.route === '') return `/anskaffelser/${procId}`;
    return `/anskaffelser/${procId}/${phase.route}`;
  }

  function handlePhaseClick() {
    onclose?.();
  }

  function stateFor(phase: PhaseDefinition): PhaseState {
    return states[phase.id] ?? { status: 'kommende', meta: 'Kommende' };
  }
</script>

{#snippet phaseContent(phase: PhaseDefinition, state: PhaseState)}
  <div class="phase-icon-col">
    <!-- SVG data is hardcoded trusted content from phaseIcons config -->
    <svg class="phase-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
      {@html phaseIcons[phase.id]}
    </svg>
    {#if state.status !== 'kommende'}
      <span class="phase-dot"></span>
    {/if}
  </div>
  <div class="phase-text">
    <span class="phase-label">{phase.label}</span>
    <span class="phase-meta">{state.meta}</span>
  </div>
{/snippet}

{#snippet phaseList(mobile: boolean)}
  {#each phases as phase}
    {@const isActive = phase.id === activePhaseId}
    {@const href = getHref(phase)}
    {@const state = stateFor(phase)}

    {#if href !== null}
      <a
        class="phase-item"
        class:phase-current={isActive}
        class:status-fullfort={state.status === 'fullfort'}
        class:status-aktiv={state.status === 'aktiv'}
        class:status-kommende={state.status === 'kommende'}
        {href}
        aria-current={isActive ? 'step' : undefined}
        title="{phase.label} — {state.meta}"
        onclick={mobile ? handlePhaseClick : undefined}
      >
        {@render phaseContent(phase, state)}
      </a>
    {:else}
      <div
        class="phase-item phase-disabled"
        class:status-fullfort={state.status === 'fullfort'}
        class:status-aktiv={state.status === 'aktiv'}
        class:status-kommende={state.status === 'kommende'}
        title="{phase.label} — {state.meta}"
      >
        {@render phaseContent(phase, state)}
      </div>
    {/if}
  {/each}
{/snippet}

<!-- Desktop: sidebar in flow -->
<nav class="phase-panel" aria-label="Faser">
  <div class="phase-panel-inner">
    {@render phaseList(false)}
  </div>
</nav>

<!-- Mobile: slide-in overlay -->
{#if mobileOpen}
  <button class="mobile-backdrop" onclick={onclose} aria-label="Lukk fasemeny" tabindex="-1">
  </button>
{/if}
<nav class="mobile-panel" class:mobile-panel-open={mobileOpen} aria-label="Faser">
  {@render phaseList(true)}
</nav>

<style>
  /* ══════════════════════════════════════════
     Desktop: collapsible sidebar
     ══════════════════════════════════════════ */
  .phase-panel {
    width: 52px;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }

  .phase-panel-inner {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 52px;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-3) 0;
    gap: var(--spacing-1);
    background: var(--color-canvas);
    border-right: 1px solid var(--color-wire);
    transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    overflow: hidden;
  }

  .phase-panel-inner:hover {
    width: 230px;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .phase-panel-inner:hover {
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  }

  /* Desktop labels: fade in with delay when panel expands */
  .phase-panel-inner .phase-text {
    opacity: 0;
    transition: opacity 0.15s ease 0.06s;
  }

  .phase-panel-inner:hover .phase-text {
    opacity: 1;
  }

  /* ══════════════════════════════════════════
     Shared phase item styles
     ══════════════════════════════════════════ */
  .phase-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 12px;
    min-height: 48px;
    text-decoration: none;
    color: var(--color-ink-secondary);
    border-left: 2.5px solid transparent;
    transition:
      background-color 0.12s,
      color 0.12s;
    white-space: nowrap;
    cursor: pointer;
  }

  .phase-item:hover {
    background: var(--color-felt-hover);
  }

  .phase-disabled {
    cursor: default;
    opacity: 0.5;
  }

  .phase-disabled:hover {
    background: transparent;
  }

  .phase-current {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    border-left-color: var(--color-vekt);
  }

  .phase-current:hover {
    background: var(--color-vekt-bg-strong);
  }

  /* Thicker icon stroke on selected phase */
  .phase-current .phase-icon :global(path),
  .phase-current .phase-icon :global(rect),
  .phase-current .phase-icon :global(circle) {
    stroke-width: 2;
  }

  .status-fullfort:not(.phase-current) {
    color: var(--color-score-high);
  }

  .status-kommende:not(.phase-current) {
    color: var(--color-ink-ghost);
  }

  /* ── Icon column ── */
  .phase-icon-col {
    width: 28px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .phase-icon {
    display: block;
  }

  .phase-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-ink-ghost);
  }

  .status-fullfort .phase-dot {
    background: var(--color-score-high);
  }

  .status-aktiv .phase-dot,
  .phase-current .phase-dot {
    background: var(--color-vekt);
    box-shadow: 0 0 6px var(--color-vekt);
    animation: pulse 2s ease-in-out infinite;
  }

  /* Pulsing dot on active phase */
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* No pulse on completed phases */
  .status-fullfort .phase-dot {
    animation: none;
  }

  /* ── Text ── */
  .phase-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  .phase-label {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
  }

  .phase-current .phase-label {
    font-weight: 700;
  }

  .phase-meta {
    font-family: var(--font-data);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .status-fullfort .phase-meta {
    color: var(--color-score-high);
  }

  .status-aktiv .phase-meta,
  .phase-current .phase-meta {
    color: var(--color-vekt);
  }

  .status-kommende .phase-meta {
    font-family: var(--font-ui);
    color: var(--color-ink-ghost);
  }

  .phase-item:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--color-wire-focus);
  }

  /* ══════════════════════════════════════════
     Mobile: slide-in from left
     ══════════════════════════════════════════ */
  .mobile-panel {
    display: none;
  }

  .mobile-backdrop {
    display: none;
  }

  @media (max-width: 1023px) {
    .phase-panel {
      display: none;
    }

    .mobile-panel {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: var(--header-height);
      left: 0;
      bottom: 0;
      width: 240px;
      padding: var(--spacing-3) 0;
      gap: var(--spacing-1);
      background: var(--color-canvas);
      border-right: 1px solid var(--color-wire);
      z-index: 100;
      transform: translateX(-100%);
      transition: transform 0.2s ease-out;
    }

    .mobile-panel-open {
      transform: translateX(0);
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
  }
</style>
