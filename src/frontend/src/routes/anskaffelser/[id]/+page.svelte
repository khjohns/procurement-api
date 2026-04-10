<script lang="ts">
  import { formatNOK, formatDatoMndAar } from '$lib/utils/format';
  import { CONTRACT_NATURE_LABELS, PROCEDURE_LABELS, THRESHOLD_LABELS, lookupLabel, stripHtml } from '$lib/utils/protokoll-helpers';

  let { data } = $props();

  const proc = $derived(data?.proc);
  const eforms = $derived(data?.eforms);

  interface MetaItem {
    label: string;
    value: string;
    mono?: boolean;
  }

  /** CPV group (2-digit prefix) → Norwegian label. */
  const CPV_GROUP_LABELS: Record<string, string> = {
    '09': 'Petroleumsprodukter og energi',
    '18': 'Klær og tekstiler',
    '30': 'Kontor- og datautstyr',
    '34': 'Transportutstyr',
    '35': 'Sikkerhetsutstyr',
    '38': 'Laboratorium- og presisjonsutstyr',
    '39': 'Møbler og innredning',
    '42': 'Industrimaskiner',
    '43': 'Anleggsmaskiner',
    '44': 'Byggevarer',
    '45': 'Bygg og anlegg',
    '48': 'Programvare',
    '50': 'Vedlikehold og reparasjon',
    '55': 'Hotell og restaurant',
    '60': 'Transporttjenester',
    '64': 'Post og telekommunikasjon',
    '65': 'Energiforsyning',
    '71': 'Arkitekt- og rådgivningstjenester',
    '72': 'IT-tjenester',
    '77': 'Landbruk og hagebruk',
    '79': 'Konsulenttjenester',
    '85': 'Helse og sosial',
    '90': 'Avfall og rengjøring',
    '92': 'Kultur og fritid',
    '98': 'Andre tjenester',
  };

  interface CpvDisplay {
    code: string;
    group: string;
  }

  const cpvKoder = $derived.by((): CpvDisplay[] => {
    const cpvList = proc?.cpv_codes?.length ? proc.cpv_codes : eforms?.cpv_codes;
    if (!cpvList?.length) return [];
    return cpvList.map((code: string) => ({
      code,
      group: CPV_GROUP_LABELS[code.slice(0, 2)] ?? '',
    }));
  });

  const klassifisering = $derived.by((): MetaItem[] => {
    if (!proc) return [];
    const cat = lookupLabel(CONTRACT_NATURE_LABELS, proc.contractCategory ?? proc.contract_nature ?? eforms?.contract_nature);
    const prosed = lookupLabel(PROCEDURE_LABELS, proc.procedure);
    const terskel = lookupLabel(THRESHOLD_LABELS, proc.threshold);

    // Framework details
    let ramme: string | null = null;
    if (proc.framework_agreement_involved) {
      const maks = proc.framework_agreement_maximum_participants;
      ramme = maks ? `Ja (maks ${maks})` : 'Ja';
    }

    // Duration
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
      if (start !== end) varighet += ` (${start}–${end})`;
    }

    // Publication date
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
  const rawBeskrivelse = $derived(proc?.description ?? eforms?.description ?? null);
  const beskrivelse = $derived(rawBeskrivelse ? stripHtml(rawBeskrivelse) : null);
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

      <!-- CPV-koder -->
      {#if cpvKoder.length > 0}
        <div class="card">
          <div class="section-label">CPV-koder</div>
          <div class="cpv-list">
            {#each cpvKoder as cpv}
              <div class="cpv-row">
                <span class="cpv-code">{cpv.code}</span>
                {#if cpv.group}
                  <span class="cpv-group">{cpv.group}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

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
        <div class="tool-links">
          <a href="/verktoy/unntak" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Unntaksveiviser</span>
            <span class="tool-link-desc">Sjekk om unntak fra forskriften gjelder</span>
            <span class="tool-link-icon">↗</span>
          </a>
          <a href="/verktoy/kalkulator" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Terskelverdikalkulator</span>
            <span class="tool-link-desc">Beregn terskelverdi og gjeldende del</span>
            <span class="tool-link-icon">↗</span>
          </a>
          <a href="/verktoy/fristberegner" target="_blank" rel="noopener" class="tool-link">
            <span class="tool-link-label">Fristberegner</span>
            <span class="tool-link-desc">Beregn minimumsfrister for prosedyren</span>
            <span class="tool-link-icon">↗</span>
          </a>
          {#if doffinUrl}
            <a href={doffinUrl} target="_blank" rel="noopener" class="tool-link tool-link-ref">
              <span class="tool-link-label">Doffin-kunngjøring</span>
              <span class="tool-link-desc">Se kunngjøringen på doffin.no</span>
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
    font-size: 14px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
    max-width: 680px;
    white-space: pre-line;
  }

  /* ── CPV-koder ── */
  .cpv-list {
    display: flex;
    flex-direction: column;
  }

  .cpv-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .cpv-row:first-child {
    border-top: none;
  }

  .cpv-code {
    font-family: var(--font-data);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    min-width: 80px;
    flex-shrink: 0;
  }

  .cpv-group {
    font-size: 12px;
    color: var(--color-ink-muted);
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
