<script lang="ts">
  import { page } from '$app/state';
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { getTimelineDate, addDays } from '$lib/utils/protokoll-helpers';
  import type { Activity } from '$lib/types/activity';

  let { data } = $props();

  const procId = $derived(page.params.id ?? '');
  const proc = $derived(data?.proc);
  const eformsCan = $derived(data?.eformsCan);
  const activities: Activity[] = $derived(data?.activities ?? []);

  // ── Karensperiode ──
  // Karensperiode: 10 calendar days from tilbudsfrist (submission deadline).

  const awardLettersSent = $derived(proc?.areAwardLettersSent === true);

  const tilbudFrist = $derived(
    proc?.currentDeadline ?? getTimelineDate(proc, 'submission') ?? null,
  );

  const karensDager = 10;

  const karensUtloper = $derived.by(() => {
    if (!tilbudFrist) return null;
    return addDays(tilbudFrist, karensDager);
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

  // ── Tildelingsresultat fra CAN ──

  interface AwardDisplay {
    lotId: string | null;
    winners: { name: string; orgId: string | null }[];
    contractValue: number | null;
    receivedTenders: number | null;
  }

  const awardResults = $derived.by((): AwardDisplay[] => {
    const results = eformsCan?.award_results;
    if (!results?.length) return [];
    return results.map((r: any) => ({
      lotId: r.lot_id,
      winners: (r.winners ?? []).map((w: any) => ({
        name: w.name ?? '\u2014',
        orgId: w.org_id ?? null,
      })),
      contractValue: r.contract_value,
      receivedTenders: r.received_tenders,
    }));
  });

  const hasCanData = $derived(awardResults.length > 0);

  // ── Activity checklist ──

  interface CheckItem {
    done: boolean;
    label: string;
  }

  const aktiviteter = $derived.by((): CheckItem[] => {
    const karensOver = karensGjenstar !== null && karensGjenstar <= 0;

    return [
      { done: awardLettersSent, label: 'Meddelelsesbrev sendt' },
      { done: karensOver, label: 'Karensperiode utløper' },
      { done: false, label: 'Signere kontrakt' },
      { done: hasCanData, label: 'Kunngjøre kontraktsinngåelse' },
      { done: false, label: 'Arkivere dokumentasjon' },
    ];
  });
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
                <span class="tool-link-icon">&#8250;</span>
              </a>
              <a href="/anskaffelser/{procId}/meddelelse" class="tool-link">
                <span class="tool-link-label">Meddelelsesbrev</span>
                <span class="tool-link-icon">&#8250;</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Right: Tildelingsresultat + Aktiviteter -->
        <div class="right-col">
          {#if hasCanData}
            {#each awardResults as result}
              <div class="card tildeling-result-card">
                <div class="section-label">
                  Tildelingsresultat{result.lotId ? ` — Delkontrakt ${result.lotId}` : ''}
                </div>
                {#if result.winners.length > 0}
                  <div class="result-winners">
                    <div class="meta-label">Tildelt</div>
                    {#each result.winners as w}
                      <div class="winner-row">
                        <span class="winner-name">{w.name}</span>
                        {#if w.orgId}
                          <span class="winner-org">org.nr. {w.orgId}</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                <div class="result-meta">
                  {#if result.contractValue}
                    <div class="result-meta-item">
                      <div class="meta-label">Kontraktsverdi</div>
                      <div class="result-value">{formatNOK(result.contractValue)}</div>
                    </div>
                  {/if}
                  {#if result.receivedTenders}
                    <div class="result-meta-item">
                      <div class="meta-label">Mottatte tilbud</div>
                      <div class="result-value">{result.receivedTenders}</div>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}

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

  /* ── Tildelingsresultat ── */
  .tildeling-result-card {
    border-left: 3px solid var(--color-score-high);
  }

  .result-winners {
    margin-bottom: var(--spacing-4);
  }

  .winner-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    padding: var(--spacing-1) 0;
  }

  .winner-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .winner-org {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .result-meta {
    display: flex;
    gap: var(--spacing-6);
  }

  .result-meta-item {
    display: flex;
    flex-direction: column;
  }

  .result-value {
    font-family: var(--font-data);
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    line-height: 1.2;
  }

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
</style>
