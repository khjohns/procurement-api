<script lang="ts">
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { CONTRACT_NATURE_LABELS, PROCEDURE_LABELS, lookupLabel } from '$lib/utils/protokoll-helpers';

  let { data } = $props();

  const proc = $derived(data?.proc);
  const eforms = $derived(data?.eforms);

  interface MetaItem {
    label: string;
    value: string;
    mono?: boolean;
  }

  const klassifisering = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    const cat = lookupLabel(CONTRACT_NATURE_LABELS, proc.contractCategory ?? proc.contract_nature);
    const prosed = lookupLabel(PROCEDURE_LABELS, proc.procedure);

    // Framework details
    let ramme: string | null = null;
    if (proc.framework_agreement_involved) {
      const maks = proc.framework_agreement_maximum_participants;
      ramme = maks ? `Ja (maks ${maks})` : 'Ja';
    }

    // Duration
    let varighet: string | null = null;
    if (proc.duration_months) {
      varighet = `${proc.duration_months} mnd`;
    } else if (proc.duration) {
      varighet = proc.duration;
    }
    if (varighet && proc.duration_start && proc.duration_end) {
      const start = new Date(proc.duration_start).getFullYear();
      const end = new Date(proc.duration_end).getFullYear();
      if (start !== end) varighet += ` (${start}–${end})`;
    }

    // CPV
    const cpv = proc.cpv_codes?.length ? proc.cpv_codes.join(', ') : null;

    // Publication date
    const publisert = proc.publicationDate ?? eforms?.issue_date ?? null;

    return [
      cat && { label: 'Kontraktstype', value: cat },
      prosed && { label: 'Prosedyre', value: prosed },
      proc.threshold === 'ABOVE_EEA' && { label: 'Terskel', value: 'Over EØS-terskel (Del III)' },
      proc.threshold === 'BELOW_EEA' && { label: 'Terskel', value: 'Under EØS-terskel (Del II)' },
      ramme && { label: 'Rammeavtale', value: ramme },
      cpv && { label: 'CPV', value: cpv, mono: true },
      varighet && { label: 'Varighet', value: varighet },
      publisert && { label: 'Kunngjort', value: formatDatoMndAar(publisert) },
    ].filter(Boolean) as MetaItem[];
  });

  const okonomi = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    return [
      proc.estimated_value && {
        label: 'Anslått verdi',
        value: formatNOK(proc.estimated_value),
      },
      proc.total_value && {
        label: 'Kontraktsverdi',
        value: formatNOK(proc.total_value),
      },
    ].filter(Boolean) as MetaItem[];
  });

  // Award criteria from eforms
  interface KriteriumDisplay {
    name: string;
    weight: string | null;
  }

  const tildelingskriterier = $derived.by((): KriteriumDisplay[] => {
    const criteria = eforms?.award_criteria;
    if (!criteria?.length) return [];
    return criteria.map((c: { name?: string; type?: string; weight_percent?: number }) => ({
      name: c.name ?? c.type ?? '—',
      weight: c.weight_percent != null ? `${c.weight_percent} %` : null,
    }));
  });

  // Doffin link
  const doffinId = $derived(proc?.doffinId ?? proc?.doffinReferenceId ?? proc?.doffin_id ?? null);
  const doffinUrl = $derived(
    doffinId ? `https://doffin.no/notices/${doffinId}` : null,
  );

  // Description
  const beskrivelse = $derived(proc?.description ?? eforms?.description ?? null);
</script>

<div class="reg-page">
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
      <!-- Beskrivelse -->
      {#if beskrivelse}
        <div class="card">
          <div class="section-label">Beskrivelse</div>
          <p class="beskrivelse">{beskrivelse}</p>
        </div>
      {/if}

      <!-- Klassifisering -->
      <div class="card">
        <div class="section-label">Klassifisering</div>
        {#if klassifisering.length > 0}
          <div class="meta-grid">
            {#each klassifisering as m}
              <div class="meta-cell">
                <div class="meta-label">{m.label}</div>
                <div class="meta-value" class:mono={m.mono}>
                  {m.value}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="meta-empty">Ingen klassifiseringsdata tilgjengelig.</div>
        {/if}
      </div>

      <!-- Økonomi -->
      {#if okonomi.length > 0}
        <div class="card okonomi-card">
          <div class="section-label">Økonomi</div>
          <div class="okonomi-row">
            {#each okonomi as m}
              <div class="okonomi-item">
                <div class="meta-label">{m.label}</div>
                <div class="okonomi-value">{m.value}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Tildelingskriterier -->
      {#if tildelingskriterier.length > 0}
        <div class="card">
          <div class="section-label">Tildelingskriterier</div>
          <div class="kriterier-list">
            {#each tildelingskriterier as k}
              <div class="kriterie-row">
                <span class="kriterie-name">{k.name}</span>
                {#if k.weight}
                  <span class="kriterie-weight">{k.weight}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Verktøy -->
      <div class="card">
        <div class="section-label">Verktøy</div>
        <div class="tools-grid">
          <a
            href="/verktoy/unntak"
            target="_blank"
            rel="noopener"
            class="tool-link"
          >
            <span class="tool-label">Unntaksveiviser</span>
            <span class="tool-desc">Sjekk om unntak fra forskriften gjelder</span>
            <span class="tool-ext">↗</span>
          </a>
          <a
            href="/verktoy/kalkulator"
            target="_blank"
            rel="noopener"
            class="tool-link"
          >
            <span class="tool-label">Terskelverdikalkulator</span>
            <span class="tool-desc">Beregn terskelverdi og gjeldende del</span>
            <span class="tool-ext">↗</span>
          </a>
          <a
            href="/verktoy/fristberegner"
            target="_blank"
            rel="noopener"
            class="tool-link"
          >
            <span class="tool-label">Fristberegner</span>
            <span class="tool-desc">Beregn minimumsfrister for prosedyren</span>
            <span class="tool-ext">↗</span>
          </a>
          {#if doffinUrl}
            <a
              href={doffinUrl}
              target="_blank"
              rel="noopener"
              class="tool-link tool-link-ref"
            >
              <span class="tool-label">Doffin-kunngjøring</span>
              <span class="tool-desc">Se kunngjøringen på doffin.no</span>
              <span class="tool-ext">↗</span>
            </a>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .reg-page {
    height: 100%;
    overflow-y: auto;
  }

  /* ── Beskrivelse ── */
  .beskrivelse {
    font-family: var(--font-prose);
    font-size: 14px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
    max-width: 680px;
  }

  /* ── Metadata grid ── */
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  .meta-cell {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt);
  }

  .meta-cell:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .meta-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .meta-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .meta-value.mono {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }

  .meta-empty {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  /* ── Økonomi ── */
  .okonomi-card {
    border-left: 3px solid var(--color-vekt);
  }

  .okonomi-card .meta-label {
    margin-bottom: var(--spacing-2);
  }

  .okonomi-row {
    display: flex;
    gap: var(--spacing-6);
  }

  .okonomi-item {
    flex: 1;
  }

  .okonomi-value {
    font-family: var(--font-data);
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    line-height: 1.2;
    margin-top: var(--spacing-1);
  }

  /* ── Tildelingskriterier ── */
  .kriterier-list {
    display: flex;
    flex-direction: column;
  }

  .kriterie-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .kriterie-row:first-child {
    border-top: none;
  }

  .kriterie-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .kriterie-weight {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-vekt);
  }

  /* ── Tools ── */
  .tools-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .tool-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: background-color 0.12s;
  }

  .tool-link:hover {
    background: var(--color-vekt-bg-strong);
  }

  .tool-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-vekt);
  }

  .tool-desc {
    font-size: 11px;
    color: var(--color-ink-muted);
    flex: 1;
  }

  .tool-ext {
    font-size: 12px;
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .tool-link-ref {
    background: var(--color-felt-raised);
    margin-top: var(--spacing-1);
  }

  .tool-link-ref:hover {
    background: var(--color-felt-hover);
  }

  .tool-link-ref .tool-label {
    color: var(--color-ink-secondary);
  }

  @media (max-width: 768px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }

    .okonomi-row {
      flex-direction: column;
      gap: var(--spacing-3);
    }
  }
</style>
