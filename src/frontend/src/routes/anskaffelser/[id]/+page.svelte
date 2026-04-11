<script lang="ts">
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { artifikProcedureLabel, artifikNatureLabel, stripHtml, formatThreshold } from '$lib/utils/protokoll-helpers';

  let { data } = $props();

  const proc = $derived(data?.proc);
  const eforms = $derived(data?.eforms);

  interface MetaItem {
    label: string;
    value: string;
  }

  interface CpvDisplay {
    code: string;
    label: string;
  }

  // ── Beskrivelse ──

  const rawBeskrivelse = $derived(proc?.description ?? eforms?.description ?? null);
  const beskrivelse = $derived(rawBeskrivelse ? stripHtml(rawBeskrivelse) : null);
  let beskrivelseExpanded = $state(false);
  const beskrivelseTruncated = $derived(
    beskrivelse && beskrivelse.length > 200 ? beskrivelse.slice(0, 200).trimEnd() + '...' : null,
  );

  // ── CPV ──

  const cpvRawCodes = $derived.by((): string[] => {
    const cpvList = proc?.cpv_codes?.length ? proc.cpv_codes : eforms?.cpv_codes;
    return cpvList?.length ? cpvList : [];
  });

  let cpvLabels = $state<Record<string, string>>({});
  let cpvExpanded = $state(false);

  $effect(() => {
    const codes = cpvRawCodes;
    if (!codes.length) return;
    const controller = new AbortController();
    fetch(`/api/cpv/${codes.join(',')}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        cpvLabels = data;
      })
      .catch(() => {});
    return () => controller.abort();
  });

  const cpvKoder = $derived.by((): CpvDisplay[] => {
    return cpvRawCodes.map((code) => ({
      code,
      label: cpvLabels[code] ?? '',
    }));
  });

  // ── Klassifisering ──

  const klassifisering = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    const rawNature = proc.contractCategory ?? proc.contract_nature ?? eforms?.contract_nature;
    const cat = rawNature ? artifikNatureLabel(rawNature) : null;
    const prosed = proc.procedure ? artifikProcedureLabel(proc.procedure) : null;
    const terskel = proc.threshold ? formatThreshold(proc.threshold) : null;

    let ramme: string | null = null;
    if (proc.framework_agreement_involved) {
      const maks = proc.framework_agreement_maximum_participants;
      ramme = maks ? `Ja (maks ${maks})` : 'Ja';
    }

    let varighet: string | null = null;
    const durationMonths = proc.duration_months ?? eforms?.duration_months;
    if (durationMonths) {
      varighet = `${durationMonths} mnd`;
    } else if (proc.duration) {
      varighet = proc.duration;
    }
    if (varighet && proc.duration_start && proc.duration_end) {
      const start = new Date(proc.duration_start).getFullYear();
      const end = new Date(proc.duration_end).getFullYear();
      if (start !== end) varighet += ` (${start}\u2013${end})`;
    }

    const publisert = proc.publicationDate ?? eforms?.issue_date ?? null;

    return [
      cat && { label: 'Kontraktstype', value: cat },
      prosed && { label: 'Prosedyre', value: prosed },
      terskel && { label: 'Terskel', value: terskel },
      ramme && { label: 'Rammeavtale', value: ramme },
      varighet && { label: 'Varighet', value: varighet },
      publisert && { label: 'Kunngjort', value: formatDatoMndAar(publisert) },
    ].filter(Boolean) as MetaItem[];
  });

  // ── Økonomi ──

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

  // ── Tildelingskriterier ──

  interface KriteriumDisplay {
    name: string;
    weight: string | null;
  }

  const tildelingskriterier = $derived.by((): KriteriumDisplay[] => {
    const criteria = eforms?.award_criteria;
    if (!criteria?.length) return [];
    return criteria.map((c: { name?: string; type?: string; weight_percent?: number }) => ({
      name: c.name ?? c.type ?? '\u2014',
      weight: c.weight_percent != null ? `${c.weight_percent}\u00a0%` : null,
    }));
  });

  const kriterierInline = $derived(
    tildelingskriterier
      .map((k) => (k.weight ? `${k.name} ${k.weight}` : k.name))
      .join(' \u00b7 '),
  );

  // ── Doffin ──

  const doffinId = $derived(proc?.doffinId ?? proc?.doffinReferenceId ?? proc?.doffin_id ?? null);
  const doffinUrl = $derived(
    doffinId ? `https://doffin.no/notices/${doffinId}` : null,
  );
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
          <p class="beskrivelse">
            {#if beskrivelseTruncated && !beskrivelseExpanded}
              {beskrivelseTruncated}
              <button class="inline-toggle" onclick={() => (beskrivelseExpanded = true)}>Les mer</button>
            {:else}
              {beskrivelse}
              {#if beskrivelseTruncated}
                <button class="inline-toggle" onclick={() => (beskrivelseExpanded = false)}>Vis mindre</button>
              {/if}
            {/if}
          </p>
        </div>
      {/if}

      <!-- 2-column grid: Klassifisering left, Økonomi+Kriterier right -->
      <div class="two-col">
        <!-- Left: Klassifisering -->
        <div class="card">
          <div class="section-label">Klassifisering</div>
          {#if klassifisering.length > 0}
            <div class="klass-list">
              {#each klassifisering as m}
                <div class="klass-item">
                  <div class="meta-label">{m.label}</div>
                  <div class="klass-value">{m.value}</div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="meta-empty">Ingen klassifiseringsdata tilgjengelig.</div>
          {/if}

          <!-- CPV inline -->
          {#if cpvKoder.length > 0}
            <div class="klass-item cpv-toggle-item">
              <div class="meta-label">CPV</div>
              {#if !cpvExpanded}
                <button class="cpv-toggle" onclick={() => (cpvExpanded = true)}>
                  {cpvKoder.length} koder &#9656;
                </button>
              {:else}
                <div class="cpv-expanded">
                  {#each cpvKoder as cpv}
                    <div class="cpv-row">
                      <span class="cpv-code">{cpv.code}</span>
                      {#if cpv.label}
                        <span class="cpv-label">{cpv.label}</span>
                      {/if}
                    </div>
                  {/each}
                  <button class="cpv-toggle" onclick={() => (cpvExpanded = false)}>Skjul</button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Right: Økonomi + Tildelingskriterier -->
        <div class="right-col">
          {#if okonomi.length > 0}
            <div class="card okonomi-card">
              <div class="section-label">Økonomi</div>
              <div class="okonomi-items">
                {#each okonomi as m}
                  <div class="okonomi-item">
                    <div class="meta-label">{m.label}</div>
                    <div class="okonomi-value">{m.value}</div>
                  </div>
                {/each}
              </div>
              {#if tildelingskriterier.length > 0}
                <div class="kriterier-section">
                  <div class="section-label">Tildelingskriterier</div>
                  <div class="kriterier-inline">{kriterierInline}</div>
                </div>
              {/if}
            </div>
          {:else if tildelingskriterier.length > 0}
            <div class="card">
              <div class="section-label">Tildelingskriterier</div>
              <div class="kriterier-inline">{kriterierInline}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Verktøy — horizontal row -->
      <div class="card verktoy-card">
        <div class="section-label">Verktøy</div>
        <div class="verktoy-row">
          <a href="/verktoy/unntak" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Unntak</span>
            <span class="tool-link-icon">↗</span>
          </a>
          <a href="/verktoy/kalkulator" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Kalkulator</span>
            <span class="tool-link-icon">↗</span>
          </a>
          <a href="/verktoy/fristberegner" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Fristberegner</span>
            <span class="tool-link-icon">↗</span>
          </a>
          {#if doffinUrl}
            <a href={doffinUrl} target="_blank" rel="noopener" class="tool-link tool-link-ref">
              <span class="tool-link-label">Doffin</span>
              <span class="tool-link-icon">↗</span>
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
    font-size: 13px;
    color: var(--color-ink-secondary);
    line-height: 1.55;
    max-width: 680px;
    white-space: pre-line;
  }

  /* ── Klassifisering ── */
  .klass-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .klass-item {
    display: flex;
    flex-direction: column;
  }

  .cpv-toggle-item {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--color-wire);
  }

  .klass-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }

  /* ── CPV ── */
  .cpv-toggle {
    background: none;
    border: none;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-vekt);
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .cpv-toggle:hover {
    text-decoration: underline;
  }

  .cpv-expanded {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .cpv-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    padding: var(--spacing-1) 0;
  }

  .cpv-code {
    font-family: var(--font-data);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    flex-shrink: 0;
  }

  .cpv-label {
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  /* ── Økonomi ── */
  .okonomi-card {
    border-left: 3px solid var(--color-vekt);
  }

  .okonomi-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .okonomi-item .meta-label {
    margin-bottom: var(--spacing-2);
  }

  .okonomi-value {
    font-family: var(--font-data);
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    line-height: 1.2;
  }

  /* ── Tildelingskriterier ── */
  .kriterier-section {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--color-wire);
  }

  .kriterier-inline {
    font-size: 13px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  /* ── Verktøy ── */
  .verktoy-row {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .verktoy-row .tool-link {
    flex: none;
    padding: var(--spacing-2) var(--spacing-3);
    gap: var(--spacing-2);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .verktoy-row {
      flex-direction: column;
    }

    .verktoy-row .tool-link {
      flex: auto;
    }
  }
</style>
