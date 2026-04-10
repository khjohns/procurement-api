<script lang="ts">
  import { page } from '$app/state';
  import { phases, routeToPhase, type PhaseState } from '$lib/config/phases';

  let {
    procId,
    phaseStates,
  }: {
    procId: string;
    phaseStates: Record<string, PhaseState>;
  } = $props();

  const activePhaseId = $derived.by(() => {
    const pathname = page.url.pathname;
    const base = `/anskaffelser/${procId}`;
    if (pathname === base || pathname === `${base}/`) return 'registrering';
    const sub = pathname.slice(base.length + 1).split('/')[0];
    return routeToPhase[sub] ?? 'registrering';
  });

  function getHref(phase: typeof phases[number]): string {
    if (phase.route === '') return `/anskaffelser/${procId}`;
    return `/anskaffelser/${procId}/${phase.route}`;
  }

  function stateFor(phaseId: string): PhaseState {
    return phaseStates[phaseId] ?? { status: 'kommende', meta: 'Kommende' };
  }
</script>

<nav class="phase-line" aria-label="Faseoversikt">
  {#each phases as phase, i}
    {@const state = stateFor(phase.id)}
    {@const isActive = phase.id === activePhaseId}
    {@const isFullfort = state.status === 'fullfort'}
    {@const isKommende = state.status === 'kommende'}

    {#if i > 0}
      <div
        class="phase-connector"
        class:connector-done={isFullfort || (!isKommende && !isFullfort && phases[i - 1] && stateFor(phases[i - 1].id).status === 'fullfort')}
        class:connector-upcoming={isKommende}
      ></div>
    {/if}

    <a
      href={getHref(phase)}
      class="phase-node"
      class:node-active={isActive}
      class:node-fullfort={isFullfort}
      class:node-kommende={isKommende}
      aria-current={isActive ? 'step' : undefined}
    >
      <span class="node-dot">
        {#if isFullfort}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="5" fill="currentColor" />
          </svg>
        {:else if !isKommende}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" fill="currentColor" />
            <circle cx="7" cy="7" r="7" stroke="currentColor" stroke-width="1" opacity="0.3" />
          </svg>
        {:else}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5" />
          </svg>
        {/if}
      </span>
      <span class="node-label">{phase.label}</span>
      <span class="node-meta">{state.meta}</span>
    </a>
  {/each}
</nav>

<style>
  .phase-line {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-6);
    height: 36px;
    border-bottom: 1px solid var(--color-wire);
    gap: 0;
  }

  /* ── Connector line ── */
  .phase-connector {
    flex: 1;
    height: 1px;
    background: var(--color-wire);
    margin: 0 var(--spacing-1);
  }

  .phase-connector.connector-done {
    background: var(--color-ink-muted);
  }

  .phase-connector.connector-upcoming {
    background: repeating-linear-gradient(
      90deg,
      var(--color-wire) 0,
      var(--color-wire) 4px,
      transparent 4px,
      transparent 8px
    );
  }

  /* ── Node ── */
  .phase-node {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    text-decoration: none;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: background-color 0.12s;
    flex-shrink: 0;
  }

  .phase-node:hover {
    background: var(--color-felt-hover);
  }

  .node-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .node-label {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-ghost);
  }

  .node-meta {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-ghost);
  }

  /* Fullført */
  .node-fullfort .node-dot {
    color: var(--color-ink-muted);
  }

  .node-fullfort .node-label {
    color: var(--color-ink-muted);
  }

  /* Active (current page is this phase) */
  .node-active .node-dot {
    color: var(--color-vekt);
  }

  .node-active .node-label {
    color: var(--color-ink);
  }

  .node-active .node-meta {
    color: var(--color-ink-secondary);
  }

  /* Aktiv phase (not kommende, not fullført) that is NOT the current page */
  .phase-node:not(.node-fullfort):not(.node-kommende):not(.node-active) .node-dot {
    color: var(--color-vekt-dim);
  }

  .phase-node:not(.node-fullfort):not(.node-kommende):not(.node-active) .node-label {
    color: var(--color-ink-secondary);
  }

  /* Kommende */
  .node-kommende .node-dot {
    color: var(--color-ink-ghost);
  }
</style>
