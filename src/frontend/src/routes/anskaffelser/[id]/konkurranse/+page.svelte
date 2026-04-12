<script lang="ts">
  import { page } from '$app/state';
  import { getContext } from 'svelte';
  import { extractBidders } from '$lib/utils/activities';
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { getTimelineDate } from '$lib/utils/protokoll-helpers';
  import { artifikProcedureLabel } from '$lib/utils/eforms-labels.svelte';
  import type { Activity } from '$lib/types/activity';
  import type { PhaseState } from '$lib/config/phases';

  let { data } = $props();

  const proc = $derived(data?.proc);
  const activities: Activity[] = $derived(data?.activities ?? []);

  const procId = $derived(page.params.id ?? '');

  const getPhaseStates = getContext<() => Record<string, PhaseState>>('phaseStates');
  const konkFullfort = $derived(getPhaseStates().konkurranse?.status === 'fullfort');

  // ── Frist ──

  const tilbudFrist = $derived(
    proc?.currentDeadline ?? getTimelineDate(proc, 'submission') ?? null,
  );

  const dagerIgjen = $derived.by(() => {
    if (!tilbudFrist) return null;
    return Math.ceil((new Date(tilbudFrist).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  });

  const fristLabel = $derived(
    dagerIgjen !== null ? (dagerIgjen >= 0 ? 'dager igjen' : 'dager siden') : '',
  );

  type UrgencyLevel = 'calm' | 'attention' | 'urgent' | 'expired';

  const urgency: UrgencyLevel = $derived.by(() => {
    if (dagerIgjen === null) return 'calm';
    if (dagerIgjen < 0) return 'expired';
    if (dagerIgjen < 10) return 'urgent';
    if (dagerIgjen <= 30) return 'attention';
    return 'calm';
  });

  // ── Leverandører ──

  const bidders = $derived(extractBidders(activities));
  const bidCount = $derived(bidders.length);

  const leverandorer = $derived.by(() => {
    const kval = activities.filter((a) => a.action === 'QUALIFYING_PARTICIPANTS');
    return kval.length > 0
      ? kval.map((a) => a.organization?.name ?? a.supplier?.name ?? '\u2014')
      : bidders.map((l) => l.name);
  });

  const levCount = $derived(leverandorer.length);
  const levPreview = $derived(leverandorer.slice(0, 3));
  const levRest = $derived(leverandorer.length - 3);
  let levExpanded = $state(false);

  // ── Hendelser ──

  const relevantActions = new Set([
    'PUBLISH_TO_DOFFIN',
    'QUALIFYING_PARTICIPANTS',
    'SUBMIT_BID',
    'ASK_TO_QUALIFY',
  ]);

  const actionLabels: Record<string, (navn: string) => string> = {
    PUBLISH_TO_DOFFIN: () => 'Kunngjøring',
    ASK_TO_QUALIFY: (n) => `Forespørsel fra ${n}`,
    QUALIFYING_PARTICIPANTS: (n) => `${n} kvalifisert`,
    SUBMIT_BID: (n) => `Tilbud fra ${n}`,
  };

  const alleHendelser = $derived.by(() => {
    return activities
      .filter((a) => relevantActions.has(a.action))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((a) => {
        const navn = a.organization?.name ?? a.supplier?.name ?? '';
        const fn = actionLabels[a.action];
        return { dato: formatDatoMndAar(a.date), tekst: fn ? fn(navn) : a.action };
      });
  });

  const hendDefaultCount = 3;
  let hendExpanded = $state(false);
  const hendVisible = $derived(
    hendExpanded ? alleHendelser : alleHendelser.slice(0, hendDefaultCount),
  );
  const hendHasMore = $derived(alleHendelser.length > hendDefaultCount);
  const hendRest = $derived(alleHendelser.length - hendDefaultCount);


</script>

<div class="konkurranse-page">
  {#if !proc}
    <div class="page-inner wide">
      <div class="empty-state">
        <p>Kunne ikke laste anskaffelsen.</p>
        <div class="empty-actions">
          <button class="empty-retry" onclick={() => location.reload()}>Prøv igjen</button>
          <a href="/anskaffelser" class="empty-back">Tilbake til oversikt</a>
        </div>
      </div>
    </div>
  {:else}
    <div class="page-inner wide">
      <div class="two-col">
        <!-- Left column: Frist + Arbeidsflater -->
        <div class="left-col">
          <!-- Frist -->
          {#if konkFullfort}
            <div class="card frist-card frist-done">
              <div class="frist-header">
                <span class="section-label">Tilbudsfrist</span>
                <span class="frist-dato">{formatDatoMndAar(tilbudFrist)}</span>
              </div>
              <div class="frist-summary">
                Frist utløpt &middot; {bidCount} tilbud mottatt
              </div>
            </div>
          {:else}
            <div
              class="card frist-card"
              class:frist-attention={urgency === 'attention'}
              class:frist-urgent={urgency === 'urgent'}
              class:frist-expired={urgency === 'expired'}
            >
              <div class="frist-header">
                <span class="section-label">Frist</span>
              </div>
              <div class="frist-countdown">
                <span class="frist-tall">{dagerIgjen !== null ? Math.abs(dagerIgjen) : '\u2014'}</span>
                <span class="frist-enhet">{fristLabel}</span>
              </div>
              <div class="frist-dato">{formatDatoMndAar(tilbudFrist)}</div>
              <div class="frist-meta">
                <span>{artifikProcedureLabel(proc?.procedure)}</span>
                <span class="frist-meta-sep">&middot;</span>
                <span class="mono">{formatNOK(proc?.estimated_value)}</span>
              </div>
            </div>
          {/if}

          <!-- Arbeidsflater -->
          <div class="card">
            <div class="section-label">Arbeidsflater</div>
            <div class="tool-links">
              <a href="/anskaffelser/{procId}/kvalifisering" class="tool-link">
                <span class="tool-link-label">Kvalifisering</span>
                <span class="tool-link-icon">&#8250;</span>
              </a>
              <a href="/anskaffelser/{procId}/evaluering" class="tool-link">
                <span class="tool-link-label">Evaluering</span>
                <span class="tool-link-icon">&#8250;</span>
              </a>
              <a href="/anskaffelser/{procId}/protokoll" class="tool-link">
                <span class="tool-link-label">Protokoll</span>
                <span class="tool-link-icon">&#8250;</span>
              </a>
              <a href="/anskaffelser/{procId}/meddelelse" class="tool-link">
                <span class="tool-link-label">Meddelelse</span>
                <span class="tool-link-icon">&#8250;</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Right column: Leverandører + Hendelser -->
        <div class="right-col">
          <!-- Leverandører -->
          <div class="card">
            <div class="lev-header">
              <span class="section-label">Leverandører</span>
              {#if levCount > 0}
                <span class="lev-count">{levCount}</span>
              {/if}
            </div>
            {#if levCount === 0}
              <div class="meta-empty">Ingen leverandører registrert ennå.</div>
            {:else if !levExpanded}
              <div class="lev-inline">
                {levPreview.join(' \u00b7 ')}
                {#if levRest > 0}
                  <button class="inline-toggle" onclick={() => (levExpanded = true)}>
                    +{levRest} til &#9656;
                  </button>
                {/if}
              </div>
            {:else}
              <div class="lev-expanded">
                {#each leverandorer as navn}
                  <div class="lev-row">{navn}</div>
                {/each}
                <button class="inline-toggle" onclick={() => (levExpanded = false)}>Vis færre</button>
              </div>
            {/if}
          </div>

          <!-- Hendelser -->
          {#if alleHendelser.length > 0}
            <div class="card">
              <div class="section-label">Hendelser</div>
              <div class="hendelse-list">
                {#each hendVisible as h}
                  <div class="hendelse-row">
                    <span class="hendelse-dato">{h.dato}</span>
                    <span class="hendelse-tekst">{h.tekst}</span>
                  </div>
                {/each}
              </div>
              {#if hendHasMore}
                <button class="expand-btn" onclick={() => (hendExpanded = !hendExpanded)}>
                  {hendExpanded ? 'Vis færre' : `+${hendRest} til \u25B8`}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .konkurranse-page {
    height: 100%;
    overflow-y: auto;
  }

  /* ── Frist card ── */
  .frist-card {
    --frist-accent: var(--color-vekt);
    border-left: 3px solid var(--frist-accent);
  }

  .frist-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .frist-header .section-label {
    margin-bottom: 0;
  }

  .frist-countdown {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin: var(--spacing-3) 0 var(--spacing-2);
  }

  .frist-tall {
    font-family: var(--font-data);
    font-size: 48px;
    font-weight: 300;
    line-height: 1;
    color: var(--frist-accent);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .frist-enhet {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  .frist-dato {
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }

  .frist-meta {
    font-size: 12px;
    color: var(--color-ink-muted);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
    margin-top: var(--spacing-2);
  }

  .frist-meta-sep {
    color: var(--color-ink-ghost);
  }

  .mono {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }


  /* Frist done */
  .frist-done {
    border-left-color: var(--color-ink-ghost);
  }

  .frist-done .section-label {
    color: var(--color-ink-ghost);
  }

  .frist-summary {
    font-size: 13px;
    color: var(--color-ink-muted);
    margin-top: var(--spacing-2);
  }

  /* ── Leverandører ── */
  .lev-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .lev-header .section-label {
    margin-bottom: var(--spacing-2);
  }

  .lev-count {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-secondary);
  }

  .lev-inline {
    font-size: 13px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  .lev-expanded {
    display: flex;
    flex-direction: column;
  }

  .lev-row {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
    padding: var(--spacing-1) 0;
    border-top: 1px solid var(--color-wire);
  }

  .lev-row:first-child {
    border-top: none;
  }

  /* ── Hendelser ── */
  .hendelse-list {
    display: flex;
    flex-direction: column;
  }

  .hendelse-row {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .hendelse-row:first-child {
    border-top: none;
  }

  .hendelse-dato {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-variant-numeric: tabular-nums;
    min-width: 80px;
    flex-shrink: 0;
    text-align: right;
  }

  .hendelse-tekst {
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  /* ── Expand button ── */
  .expand-btn {
    display: block;
    width: 100%;
    padding: var(--spacing-2) 0;
    margin-top: var(--spacing-1);
    background: none;
    border: none;
    border-top: 1px solid var(--color-wire);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    cursor: pointer;
    text-align: center;
    transition: color 0.12s;
  }

  .expand-btn:hover {
    color: var(--color-ink-secondary);
  }
</style>
