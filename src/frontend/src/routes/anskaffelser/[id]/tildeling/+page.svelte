<script lang="ts">
  import { page } from '$app/state';
  import { getContext } from 'svelte';
  import { formatDatoMndAar } from '$lib/utils/format';
  import { getTimelineDate, addDays } from '$lib/utils/protokoll-helpers';
  import type { Activity } from '$lib/types/activity';
  import type { PhaseState } from '$lib/config/phases';

  let { data } = $props();

  const procId = $derived(page.params.id ?? '');
  const proc = $derived(data?.proc);
  const activities: Activity[] = $derived(data?.activities ?? []);

  const getPhaseStates = getContext<() => Record<string, PhaseState>>('phaseStates');
  const tildelingState = $derived(getPhaseStates().tildeling);

  // ── Karensperiode ──
  // Karensperiode starts when award letters are sent. Default 10 calendar days.

  const awardLettersSent = $derived(proc?.areAwardLettersSent === true);

  const awardDate = $derived.by(() => {
    // Look for awarding activity date
    const awarding = activities.find((a) => a.action === 'AWARDING_PARTICIPANTS');
    if (awarding) return awarding.date;
    return getTimelineDate(proc, 'award') ?? null;
  });

  const karensDager = 10;

  const karensUtloper = $derived.by(() => {
    if (!awardDate) return null;
    return addDays(awardDate, karensDager);
  });

  const karensGjenstar = $derived.by(() => {
    if (!karensUtloper) return null;
    return Math.ceil((new Date(karensUtloper).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  });

  type UrgencyLevel = 'calm' | 'attention' | 'urgent' | 'expired';

  const karensUrgency: UrgencyLevel = $derived.by(() => {
    if (karensGjenstar === null) return 'calm';
    if (karensGjenstar < 0) return 'expired';
    if (karensGjenstar < 3) return 'urgent';
    if (karensGjenstar <= 5) return 'attention';
    return 'calm';
  });

  // ── Activity checklist ──

  interface CheckItem {
    done: boolean;
    label: string;
  }

  const aktiviteter = $derived.by((): CheckItem[] => {
    const actions = new Set(activities.map((a) => a.action));
    const awarded = actions.has('AWARDING_PARTICIPANTS');
    const karensOver = karensGjenstar !== null && karensGjenstar <= 0;

    return [
      { done: awardLettersSent, label: 'Meddelelsesbrev sendt' },
      { done: karensOver, label: 'Karensperiode utløper' },
      { done: false, label: 'Signere kontrakt' },
      { done: false, label: 'Kunngjøre kontraktsinngåelse' },
      { done: false, label: 'Arkivere dokumentasjon' },
    ];
  });

  // ── Arbeidsflater status hints ──
  const protokollHint = $derived.by(() => {
    const actions = new Set(activities.map((a) => a.action));
    if (actions.has('AWARDING_PARTICIPANTS')) return '(ferdig)';
    return '';
  });

  const meddelelseHint = $derived(awardLettersSent ? '(sendt)' : '');
</script>

<div class="tildeling-page">
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
        <!-- Left: Karensperiode + Arbeidsflater -->
        <div class="left-col">
          <!-- Karensperiode -->
          {#if awardLettersSent && karensUtloper}
            <div
              class="card karens-card"
              class:frist-attention={karensUrgency === 'attention'}
              class:frist-urgent={karensUrgency === 'urgent'}
              class:frist-expired={karensUrgency === 'expired'}
            >
              <div class="section-label">Karensperiode</div>
              <div class="karens-countdown">
                {#if karensGjenstar !== null && karensGjenstar > 0}
                  <span class="karens-tall">{karensGjenstar}</span>
                  <span class="karens-enhet">dager gjenstår</span>
                {:else if karensGjenstar !== null && karensGjenstar <= 0}
                  <span class="karens-tall-done">Utløpt</span>
                {:else}
                  <span class="karens-tall">&mdash;</span>
                {/if}
              </div>
              <div class="karens-dato">Utløper {formatDatoMndAar(karensUtloper)}</div>
            </div>
          {:else}
            <div class="card karens-card karens-kommende">
              <div class="section-label">Karensperiode</div>
              <div class="karens-info">
                {#if !awardLettersSent}
                  Forutsetter at meddelelsesbrev er sendt.
                {:else}
                  Beregnes etter tildeling.
                {/if}
              </div>
            </div>
          {/if}

          <!-- Arbeidsflater -->
          <div class="card">
            <div class="section-label">Arbeidsflater</div>
            <div class="tool-links">
              <a href="/anskaffelser/{procId}/protokoll" class="tool-link">
                <span class="tool-link-label">Protokoll</span>
                {#if protokollHint}
                  <span class="tool-link-desc">{protokollHint}</span>
                {/if}
                <span class="tool-link-icon">&#8250;</span>
              </a>
              <a href="/anskaffelser/{procId}/meddelelse" class="tool-link">
                <span class="tool-link-label">Meddelelsesbrev</span>
                {#if meddelelseHint}
                  <span class="tool-link-desc">{meddelelseHint}</span>
                {/if}
                <span class="tool-link-icon">&#8250;</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Right: Aktiviteter checklist -->
        <div class="right-col">
          <div class="card">
            <div class="section-label">Aktiviteter</div>
            <div class="checklist">
              {#each aktiviteter as item}
                <div class="check-row" class:check-done={item.done}>
                  <span class="check-icon">{item.done ? '\u2713' : '\u25CB'}</span>
                  <span class="check-label">{item.label}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tildeling-page {
    height: 100%;
    overflow-y: auto;
  }

  /* ── 2-column grid ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  .left-col,
  .right-col {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  /* ── Karensperiode card ── */
  .karens-card {
    --frist-accent: var(--color-vekt);
    border-left: 3px solid var(--frist-accent);
  }

  .karens-card .section-label {
    margin-bottom: var(--spacing-2);
  }

  .karens-countdown {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .karens-tall {
    font-family: var(--font-data);
    font-size: 36px;
    font-weight: 300;
    line-height: 1;
    color: var(--frist-accent);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .karens-tall-done {
    font-family: var(--font-ui);
    font-size: 18px;
    font-weight: 600;
    color: var(--color-score-high);
  }

  .karens-enhet {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  .karens-dato {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .karens-kommende {
    border-left-color: var(--color-ink-ghost);
  }

  .karens-info {
    font-size: 13px;
    color: var(--color-ink-muted);
    font-style: italic;
  }

  /* Urgency variants */
  .frist-attention { --frist-accent: var(--color-warn); }
  .frist-urgent    { --frist-accent: var(--color-warn); background: var(--color-warn-bg); }
  .frist-expired   { --frist-accent: var(--color-score-low); }

  /* ── Checklist ── */
  .checklist {
    display: flex;
    flex-direction: column;
  }

  .check-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .check-row:first-child {
    border-top: none;
  }

  .check-icon {
    font-size: 13px;
    width: 18px;
    text-align: center;
    flex-shrink: 0;
    color: var(--color-ink-ghost);
  }

  .check-done .check-icon {
    color: var(--color-score-high);
  }

  .check-label {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  .check-done .check-label {
    color: var(--color-ink-muted);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .two-col {
      grid-template-columns: 1fr;
    }
  }
</style>
