<script lang="ts">
  import { extractBidders } from '$lib/utils/activities';
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { getTimelineDate } from '$lib/utils/protokoll-helpers';
  import type { Activity } from '$lib/types/activity';

  let { data } = $props();

  const proc = $derived(data?.proc);
  const activities: Activity[] = $derived(data?.activities ?? []);

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

  interface LevRow {
    navn: string;
    status: string;
    kvalifisert: boolean;
  }

  const stats = $derived.by(() => {
    const kval = activities.filter((a) => a.action === 'QUALIFYING_PARTICIPANTS');
    const avvist = activities.filter((a) => a.action === 'REJECT_PARTICIPATION');
    const tilbud = extractBidders(activities);
    const rader: LevRow[] =
      kval.length > 0
        ? kval.map((a) => ({
            navn: a.organization?.name ?? a.supplier?.name ?? '—',
            status: 'Kvalifisert',
            kvalifisert: true,
          }))
        : tilbud.map((l) => ({ navn: l.name, status: 'Tilbud', kvalifisert: false }));
    return { kval: kval.length, avvist: avvist.length, tilbud: tilbud.length, rader };
  });

  const hasBids = $derived(stats.tilbud > 0);

  const levDefaultCount = 4;
  let levExpanded = $state(false);
  const levVisible = $derived(
    levExpanded ? stats.rader : stats.rader.slice(0, levDefaultCount),
  );
  const levHasMore = $derived(stats.rader.length > levDefaultCount);

  // ── Dokumenter ──

  const dokumenter = $derived.by(() => {
    const pub = activities.find((a) => a.action === 'PUBLISH_TO_DOFFIN');
    const kval = activities.find((a) => a.action === 'QUALIFYING_PARTICIPANTS');
    const docs: { navn: string; dato: string }[] = [];
    if (pub) docs.push({ navn: 'Kunngjøring', dato: formatDatoMndAar(pub.date) });
    if (kval) docs.push({ navn: 'Tilbudsinnbydelse', dato: formatDatoMndAar(kval.date) });
    return docs;
  });

  // ── Hendelser ──

  const relevantActions = new Set([
    'PUBLISH_TO_DOFFIN',
    'QUALIFYING_PARTICIPANTS',
    'SUBMIT_BID',
    'ASK_TO_QUALIFY',
  ]);

  const actionLabels: Record<string, (navn: string) => string> = {
    PUBLISH_TO_DOFFIN: () => 'Kunngjøring publisert i Doffin',
    ASK_TO_QUALIFY: (n) => `Forespørsel om deltakelse fra ${n}`,
    QUALIFYING_PARTICIPANTS: (n) => `${n} kvalifisert`,
    SUBMIT_BID: (n) => `Tilbud mottatt fra ${n}`,
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

  const hendDefaultCount = 4;
  let hendExpanded = $state(false);
  const hendVisible = $derived(
    hendExpanded ? alleHendelser : alleHendelser.slice(0, hendDefaultCount),
  );
  const hendHasMore = $derived(alleHendelser.length > hendDefaultCount);
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
      <!-- Frist -->
      {#if hasBids}
        <div class="frist-card frist-done">
          <div class="frist-header">
            <span class="section-label">Tilbudsfrist</span>
            <span class="frist-dato">{formatDatoMndAar(tilbudFrist)}</span>
          </div>
          <div class="frist-summary">
            Frist utløpt · {stats.tilbud} tilbud mottatt
          </div>
        </div>
      {:else}
        <div
          class="frist-card"
          class:frist-attention={urgency === 'attention'}
          class:frist-urgent={urgency === 'urgent'}
          class:frist-expired={urgency === 'expired'}
        >
          <div class="frist-header">
            <span class="section-label">Tilbudsfrist</span>
            <span class="frist-dato">{formatDatoMndAar(tilbudFrist)}</span>
          </div>
          <div class="frist-countdown">
            <span class="frist-tall">{dagerIgjen !== null ? Math.abs(dagerIgjen) : '—'}</span>
            <span class="frist-enhet">{fristLabel}</span>
          </div>
          <div class="frist-meta">
            <span>{proc?.procedure ?? ''}</span>
            <span class="frist-meta-sep">&middot;</span>
            <span class="mono">{formatNOK(proc?.estimated_value)}</span>
          </div>
        </div>
      {/if}

      <div class="grid-two">
        <!-- Leverandører -->
        <div class="card">
          <div class="section-label">Leverandører</div>
          <div class="stat-row">
            <span class="stat-value">{stats.kval || stats.tilbud}</span>
            <span class="stat-label">{stats.kval > 0 ? 'kvalifisert' : 'leverandører'}</span>
          </div>
          {#if levVisible.length > 0}
            <div class="lev-list">
              {#each levVisible as rad}
                <div class="lev-row">
                  <span class="lev-navn">{rad.navn}</span>
                  <span class="lev-status" class:lev-kvalifisert={rad.kvalifisert}
                    >{rad.status}</span
                  >
                </div>
              {/each}
            </div>
            {#if levHasMore}
              <button class="expand-btn" onclick={() => (levExpanded = !levExpanded)}>
                {levExpanded ? 'Vis færre' : `Vis alle ${stats.rader.length}`}
              </button>
            {/if}
          {/if}
        </div>

        <!-- Dokumenter -->
        {#if dokumenter.length > 0}
          <div class="card">
            <div class="section-label">Dokumenter</div>
            <div class="doc-list">
              {#each dokumenter as doc}
                <div class="doc-row">
                  <span class="doc-navn">{doc.navn}</span>
                  <span class="doc-dato">{doc.dato}</span>
                </div>
              {/each}
            </div>
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
              {hendExpanded ? 'Vis færre' : `Vis alle ${alleHendelser.length}`}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .konkurranse-page {
    height: 100%;
    overflow-y: auto;
  }

  /* ── Grid ── */
  .grid-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .grid-two {
      grid-template-columns: 1fr;
    }
  }

  /* ── Frist card ── */
  .frist-card {
    --frist-accent: var(--color-vekt);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-left: 3px solid var(--frist-accent);
    border-radius: var(--radius-md);
    padding: var(--spacing-5);
  }

  .frist-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .frist-header .section-label {
    margin-bottom: 0;
  }

  .frist-dato {
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }

  .frist-countdown {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin: var(--spacing-4) 0;
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

  .frist-meta {
    font-size: 12px;
    color: var(--color-ink-muted);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .frist-meta-sep {
    color: var(--color-ink-ghost);
  }

  .mono {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }

  /* Urgency variants — override --frist-accent */
  .frist-attention { --frist-accent: var(--color-warn); }
  .frist-urgent    { --frist-accent: var(--color-warn); background: var(--color-warn-bg); }
  .frist-expired   { --frist-accent: var(--color-score-low); }

  /* Frist done — phase complete */
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
  .stat-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
  }

  .stat-value {
    font-family: var(--font-data);
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
  }

  .stat-label {
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  .lev-list {
    display: flex;
    flex-direction: column;
  }

  .lev-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .lev-navn {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .lev-status {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .lev-kvalifisert {
    color: var(--color-score-high);
  }

  /* ── Dokumenter ── */
  .doc-list {
    display: flex;
    flex-direction: column;
  }

  .doc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .doc-navn {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-vekt);
  }

  .doc-dato {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-variant-numeric: tabular-nums;
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
