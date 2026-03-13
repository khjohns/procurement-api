<script lang="ts">
  import { qualification } from '$lib/stores/qualification.svelte';

  let items = $derived(
    qualification.data.suppliers.map((s) => {
      const r = qualification.supplierResults[s.id];
      return {
        id: s.id,
        name: s.name,
        qualified: r?.qualified ?? false,
        met: r?.met ?? 0,
        notMet: r?.notMet ?? 0,
        total: r?.total ?? 0,
        allAssessed: r?.allAssessed ?? false,
      };
    })
  );
</script>

<!-- Status section -->
<div class="panel-section">
  <div class="panel-label">Kvalifikasjonsstatus</div>
  <div class="status-list">
    {#each items as item}
      {@const barWidth = (item.met / Math.max(item.total, 1)) * 100}
      <div
        class="status-item"
        class:status-leader={item.qualified}
        class:status-rejected={item.allAssessed && !item.qualified}
      >
        <span class="status-icon">
          {#if item.qualified}
            <span class="icon-badge icon-met">✓</span>
          {:else if item.allAssessed && !item.qualified}
            <span class="icon-badge icon-not-met">✗</span>
          {:else}
            <span class="icon-badge icon-pending">—</span>
          {/if}
        </span>
        <span class="status-name">{item.name}</span>
        <span class="status-count">{item.met}/{item.total}</span>
      </div>
      <div class="status-bar-track">
        <div
          class="status-bar-fill"
          class:bar-qualified={item.qualified}
          class:bar-rejected={item.allAssessed && !item.qualified}
          style="width: {barWidth}%"
        ></div>
      </div>
    {/each}
  </div>
</div>

<!-- Nøkkeltall (overview metrics) -->
<div class="panel-section">
  <div class="panel-label">Nøkkeltall</div>
  <div class="metrics-grid">
    <div class="metric">
      <span
        class="metric-value"
        class:metric-positive={qualification.stats.qualified > 0}
        class:metric-pending={qualification.stats.qualified === 0}
        >{qualification.stats.qualified}</span
      >
      <span class="metric-label">Kvalifisert</span>
    </div>
    <div class="metric">
      <span
        class="metric-value"
        class:metric-rejected={qualification.stats.rejected > 0}
        class:metric-pending={qualification.stats.rejected === 0}
        >{qualification.stats.rejected}</span
      >
      <span class="metric-label">Avvist</span>
    </div>
    <div class="metric">
      <span class="metric-value metric-pending">{qualification.stats.pending}</span>
      <span class="metric-label">Under vurdering</span>
    </div>
    <div class="metric">
      <span class="metric-value metric-support">{qualification.stats.supportCount}</span>
      <span class="metric-label">Støttevirksomheter</span>
    </div>
  </div>
</div>

<!-- Progress -->
<div class="panel-section">
  <div class="panel-label">Fremdrift</div>
  <div class="progress-row">
    <span class="progress-desc">Vurderinger</span>
    <span class="progress-count"
      >{qualification.progress.assessments.filled}/{qualification.progress.assessments.total}</span
    >
    <div class="progress-bar">
      <div
        class="progress-fill"
        style="width: {qualification.progress.assessments.total > 0
          ? (qualification.progress.assessments.filled / qualification.progress.assessments.total) *
            100
          : 0}%"
      ></div>
    </div>
  </div>
  <div class="progress-row">
    <span class="progress-desc">ESPD</span>
    <span class="progress-count"
      >{qualification.progress.espd.filled}/{qualification.progress.espd.total}</span
    >
    <div class="progress-bar">
      <div
        class="progress-fill"
        style="width: {qualification.progress.espd.total > 0
          ? (qualification.progress.espd.filled / qualification.progress.espd.total) * 100
          : 0}%"
      ></div>
    </div>
  </div>
</div>

<!-- Status strip (bottom) -->
<div class="panel-status">
  <span class="panel-status-label">{qualification.data.status}</span>
  <span class="panel-status-progress">
    {qualification.stats.qualified + qualification.stats.rejected}/{qualification.stats.total}
  </span>
</div>

<style>
  .panel-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .panel-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-ghost);
  }

  /* ── Compact status list (RankingStrip pattern) ── */
  .status-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-2);
    margin: 0 calc(-1 * var(--spacing-2));
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .status-item:hover {
    background: var(--color-felt-hover);
  }

  .icon-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
  }

  .icon-met {
    color: var(--color-score-high);
    background: var(--color-score-high-bg);
  }

  .icon-not-met {
    color: var(--color-score-low);
    background: var(--color-score-low-bg);
  }

  .icon-pending {
    color: var(--color-ink-ghost);
    background: var(--color-felt-active);
  }

  .status-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-leader .status-name {
    color: var(--color-ink);
    font-weight: 600;
  }

  .status-count {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    flex-shrink: 0;
  }

  .status-leader .status-count {
    color: var(--color-score-high);
  }

  .status-rejected .status-count {
    color: var(--color-score-low);
  }

  .status-bar-track {
    height: 2px;
    background: var(--color-felt-active);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--spacing-2);
  }

  .status-bar-fill {
    height: 100%;
    background: var(--color-ink-ghost);
    border-radius: var(--radius-sm);
    transition: width 0.25s ease-out;
  }

  .bar-qualified {
    background: var(--color-score-high);
  }

  .bar-rejected {
    background: var(--color-score-low);
  }

  /* ── Nøkkeltall (metrics) ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-2);
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-2);
    background: var(--color-felt);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
  }

  .metric-value {
    font-family: var(--font-data);
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    line-height: 1;
  }

  .metric-positive {
    color: var(--color-score-high);
  }

  .metric-rejected {
    color: var(--color-score-low);
  }

  .metric-pending {
    color: var(--color-ink-muted);
  }

  .metric-support {
    color: var(--color-vekt);
  }

  .metric-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ── Progress ── */
  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .progress-desc {
    font-size: 11px;
    color: var(--color-ink-muted);
    font-weight: 500;
    min-width: 72px;
  }

  .progress-count {
    font-family: var(--font-data);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-ghost);
    min-width: 32px;
    text-align: right;
  }

  .progress-bar {
    flex: 1;
    height: 2px;
    background: var(--color-felt-active);
    border-radius: 1px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-vekt-dim);
    border-radius: 1px;
    transition: width 0.3s ease-out;
  }

  /* ── Status strip (bottom) ── */
  .panel-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-2) var(--spacing-3);
    margin-top: auto;
  }

  .panel-status-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .panel-status-progress {
    font-family: var(--font-data);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-ghost);
  }
</style>
