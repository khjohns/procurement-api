<script lang="ts">
  import { page } from '$app/state';

  type PhaseStatus = 'fullfort' | 'aktiv' | 'kommende';

  interface Phase {
    id: string;
    number: string;
    label: string;
    route: string | null;
    status: PhaseStatus;
  }

  let { procId }: { procId: string } = $props();

  const phases: Phase[] = [
    { id: 'registrering', number: '01', label: 'Registrering', route: '', status: 'fullfort' },
    { id: 'konkurranse', number: '02', label: 'Konkurranse', route: 'kvalifisering', status: 'aktiv' },
    { id: 'evaluering', number: '03', label: 'Evaluering', route: 'evaluering', status: 'kommende' },
    { id: 'tildeling', number: '04', label: 'Tildeling', route: 'protokoll', status: 'kommende' },
    { id: 'kontrakt', number: '05', label: 'Kontrakt', route: null, status: 'kommende' },
  ];

  // SVG path data per phase icon (viewBox="0 0 18 18")
  const iconPaths: Record<string, string> = {
    registrering:
      '<rect x="3.5" y="1.5" width="11" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 5.5h6M6 8.5h6M6 11.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    konkurranse:
      '<path d="M13.5 3L7 6H4a1 1 0 00-1 1v4a1 1 0 001 1h3l6.5 3V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    evaluering:
      '<path d="M3.5 14V8.5M7 14V5M10.5 14V9.5M14.5 14V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    tildeling:
      '<circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 9l2 2.5 4-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    kontrakt:
      '<path d="M10.5 2.5l5 5-8.5 8.5H2V11L10.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 16.5h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  };

  const activePhaseId = $derived.by(() => {
    const pathname = page.url.pathname;
    const base = `/anskaffelser/${procId}`;
    if (pathname === base || pathname === `${base}/`) return 'registrering';
    const sub = pathname.slice(base.length + 1).split('/')[0];
    const routeMap: Record<string, string> = {
      kvalifisering: 'konkurranse',
      evaluering: 'evaluering',
      protokoll: 'tildeling',
      meddelelse: 'tildeling',
    };
    return routeMap[sub] ?? null;
  });

  function getHref(phase: Phase): string | null {
    if (phase.route === null) return null;
    if (phase.route === '') return `/anskaffelser/${procId}`;
    return `/anskaffelser/${procId}/${phase.route}`;
  }

  const statusLabels: Record<PhaseStatus, string> = {
    fullfort: 'Fullført',
    aktiv: 'Aktiv',
    kommende: 'Kommende',
  };
</script>

{#snippet phaseContent(phase: Phase)}
  <div class="phase-icon-col">
    <svg class="phase-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
      {@html iconPaths[phase.id]}
    </svg>
    {#if phase.status !== 'kommende'}
      <span class="phase-dot"></span>
    {/if}
  </div>
  <div class="phase-text">
    <span class="phase-label">{phase.label}</span>
    <span class="phase-meta">
      {#if phase.status === 'fullfort'}
        <span class="meta-done">✓</span>
      {/if}
      {statusLabels[phase.status]}
    </span>
  </div>
{/snippet}

<nav class="phase-panel" aria-label="Faser">
  <div class="phase-panel-inner">
    {#each phases as phase}
      {@const isActive = phase.id === activePhaseId}
      {@const href = getHref(phase)}

      {#if href !== null}
        <a
          class="phase-item"
          class:phase-current={isActive}
          class:status-fullfort={phase.status === 'fullfort'}
          class:status-aktiv={phase.status === 'aktiv'}
          class:status-kommende={phase.status === 'kommende'}
          {href}
          aria-current={isActive ? 'step' : undefined}
          title="{phase.label} — {statusLabels[phase.status]}"
        >
          {@render phaseContent(phase)}
        </a>
      {:else}
        <div
          class="phase-item phase-disabled"
          class:status-fullfort={phase.status === 'fullfort'}
          class:status-aktiv={phase.status === 'aktiv'}
          class:status-kommende={phase.status === 'kommende'}
          title="{phase.label} — {statusLabels[phase.status]}"
        >
          {@render phaseContent(phase)}
        </div>
      {/if}
    {/each}
  </div>
</nav>

<style>
  /* ── Panel container ── */
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
    width: 220px;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .phase-panel-inner:hover {
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  }

  /* ── Phase item ── */
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

  /* ── Selected state: left accent border ── */
  .phase-current {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    border-left-color: var(--color-vekt);
  }

  .phase-current:hover {
    background: var(--color-vekt-bg-strong);
  }

  /* ── Status coloring ── */
  .status-fullfort:not(.phase-current) {
    color: var(--color-score-high);
  }

  .status-kommende:not(.phase-current) {
    color: var(--color-ink-ghost);
  }

  /* ── Icon column (vertically stacked: icon + dot) ── */
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

  /* ── Status dot (below icon, only for fullfort/aktiv) ── */
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
  }

  /* ── Text (visible on expand) ── */
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

  .meta-done {
    margin-right: 2px;
  }

  /* ── Focus ── */
  .phase-item:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--color-wire-focus);
  }

  /* ── Mobile: hide panel ── */
  @media (max-width: 1023px) {
    .phase-panel {
      display: none;
    }
  }
</style>
