<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { protokoll } from '$lib/stores/protokoll.svelte';
  import SectionAccordion from '$lib/components/protokoll/SectionAccordion.svelte';
  import ProtokollField from '$lib/components/protokoll/ProtokollField.svelte';
  import { tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { ResolvedSection } from '$lib/stores/protokoll.svelte';
  import { getProcName, buildOrgLookup, getOrgNameWithLookup } from '$lib/utils/protokoll-helpers';
  import {
    type InfoRow,
    generellInfoRows,
    mottakTilbudRows,
    prosedyreRows,
    ettersendingRows,
    tildelingskriterierRows,
    valgtTilbudRows,
    meddelelseRows,
    rammeavtaleRows,
    andreOpplysningerRows,
  } from '$lib/utils/protokoll-info-rows';

  let { data } = $props();

  // Auto-load from route data (proc + activities + eforms fetched by +page.ts)
  if (data?.proc) {
    protokoll.loadFromData(data.proc, data.activities ?? [], data.eforms ?? null);
  }

  // ── Navigation guard ──

  let isDirty = $derived(Object.keys(protokoll.manual).length > 0);

  beforeNavigate(({ cancel }) => {
    if (isDirty && !confirm('Du har ulagrede endringer. Vil du forlate siden?')) {
      cancel();
    }
  });

  // ── Generate state ──

  let generating = $state(false);
  let generateError = $state<string | null>(null);

  // ── Chapter grouping ──

  interface ChapterGroup {
    chapter: string;
    sections: ResolvedSection[];
  }

  let chapters = $derived.by<ChapterGroup[]>(() => {
    const groups: ChapterGroup[] = [];
    let current: ChapterGroup | null = null;

    for (const section of protokoll.visibleSections) {
      if (!current || current.chapter !== section.chapter) {
        current = { chapter: section.chapter, sections: [] };
        groups.push(current);
      }
      current.sections.push(section);
    }

    return groups;
  });

  // ── Progress bar color ──

  let progressColor = $derived(
    protokoll.completeness.percent >= 80
      ? 'var(--color-score-high)'
      : protokoll.completeness.percent >= 40
        ? 'var(--color-vekt)'
        : 'var(--color-score-low)'
  );

  // ── Shared scroll helper ──

  function scrollToSection(sectionId: string) {
    tick().then(() => {
      document
        .getElementById(`section-header-${sectionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ── Section nav popup ──

  let navPopupOpen = $state(false);
  let lastVisitedSectionId = $state<string | null>(null);

  function handleNavJump(sectionId: string) {
    if (!protokoll.isSectionOpen(sectionId)) {
      protokoll.toggleSection(sectionId);
    }
    navPopupOpen = false;
    lastVisitedSectionId = sectionId;
    scrollToSection(sectionId);
  }

  function handleNextMissing() {
    const id = protokoll.nextMissingSectionAfter(lastVisitedSectionId);
    if (!id) return;
    handleNavJump(id);
  }

  // ── Auto-save indicator ──

  let showSaved = $state(false);

  $effect(() => {
    const ts = protokoll.lastSavedAt;
    if (!ts) return;
    showSaved = true;
    const timer = setTimeout(() => {
      showSaved = false;
    }, 1500);
    return () => clearTimeout(timer);
  });

  // ── scrollIntoView after section toggle ──

  function handleSectionToggle(sectionId: string) {
    const wasOpen = protokoll.isSectionOpen(sectionId);
    protokoll.toggleSection(sectionId);
    if (!wasOpen) {
      lastVisitedSectionId = sectionId;
      scrollToSection(sectionId);
    }
  }

  // ── Vis/Lukk alle ──

  let allOpen = $derived(
    protokoll.openCount === protokoll.visibleSections.length && protokoll.visibleSections.length > 0
  );

  function handleToggleAll() {
    if (allOpen) {
      protokoll.closeAllSections();
    } else {
      protokoll.openAllSections();
    }
  }

  function handleWindowClick() {
    if (navPopupOpen) navPopupOpen = false;
  }

  // ── Generate docx ──

  async function handleGenerate() {
    generating = true;
    generateError = null;

    const blob = await protokoll.generateDocx();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `protokoll-${protokoll.procurement?.sequenceId ?? 'dokument'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      generateError = protokoll.error;
    }

    generating = false;
  }

  // ── Field rendering helpers ──

  function getInfoRows(section: ResolvedSection): InfoRow[] {
    const proc = protokoll.procurement;
    if (!proc) return [];

    const sectionBuilders: Record<string, () => InfoRow[]> = {
      'generell-info': () => generellInfoRows(proc),
      'mottak-tilbud': () => mottakTilbudRows(protokoll.activities),
      prosedyre: () => prosedyreRows(proc, protokoll.eforms, protokoll.activities),
      'ettersending-avklaring': () => ettersendingRows(proc, protokoll.activities),
      tildelingskriterier: () => tildelingskriterierRows(protokoll.eforms),
      'valgt-tilbud': () => valgtTilbudRows(proc, protokoll.activities),
      'meddelelse-klagefrist': () => meddelelseRows(proc),
      'meddelelse-karens': () => meddelelseRows(proc),
      rammeavtaler: () => rammeavtaleRows(proc, protokoll.eforms),
      'andre-opplysninger': () => andreOpplysningerRows(proc),
    };

    const builder = sectionBuilders[section.id];
    return builder ? builder() : [];
  }

  function getSuppliers(section: ResolvedSection): { id: string; name: string }[] {
    if (section.id === 'tilbud-vurdering') return getEvaluatedSuppliers();
    return protokoll.suppliers;
  }

  /** Suppliers that have been evaluated (excludes rejected and withdrawn). */
  function getEvaluatedSuppliers(): { id: string; name: string }[] {
    const orgLookup = buildOrgLookup(protokoll.activities);
    const excluded = new Set(
      protokoll.activities
        .filter(
          (a: any) => a.action === 'REJECT_PARTICIPATION' || a.action === 'WITHDRAW_PARTICIPATION'
        )
        .map((a: any) => getOrgNameWithLookup(a, orgLookup).toLowerCase())
    );
    return protokoll.suppliers.filter((s) => !excluded.has(s.name.toLowerCase()));
  }

  function getRejectedSuppliers(): { id: string; name: string }[] {
    const orgLookup = buildOrgLookup(protokoll.activities);
    const seen = new Map<string, { id: string; name: string }>();
    for (const a of protokoll.activities) {
      if (a.action === 'REJECT_PARTICIPATION') {
        const name = getOrgNameWithLookup(a, orgLookup);
        const org = a.organization ?? a.supplier;
        const key = String(org?.id ?? name);
        if (!seen.has(key)) {
          seen.set(key, { id: key, name });
        }
      }
    }
    return [...seen.values()];
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="protokoll-page">
  {#if protokoll.loading}
    <!-- ── Loading state ── -->
    <header class="page-header">
      <div class="page-label">ANSKAFFELSESPROTOKOLL</div>
      <h1 class="page-title">Henter data...</h1>
    </header>
    <div class="progress-strip">
      <div class="progress-bar-track">
        <div class="progress-bar-fill progress-bar-loading"></div>
      </div>
      <span class="progress-text">Henter data fra Artifik...</span>
    </div>
    <div class="skeleton-sections">
      {#each Array(6) as _, i}
        <div class="skeleton-row">
          <span class="skeleton-num">{i + 1}</span>
          <div class="skeleton-line" style="width: {120 + Math.random() * 200}px"></div>
        </div>
      {/each}
    </div>
  {:else if protokoll.error}
    <!-- ── Error state ── -->
    <header class="page-header">
      <div class="page-label">ANSKAFFELSESPROTOKOLL</div>
      <h1 class="page-title">Feil ved lasting</h1>
    </header>
    <div class="error-banner">
      <span class="error-icon">&#9888;</span>
      <span>{protokoll.error}</span>
      <button class="error-retry" onclick={() => protokoll.reset()}>Tilbake</button>
    </div>
  {:else}
    <!-- ── Document view ── -->
    <header class="page-header">
      <div class="page-header-left">
        <div class="page-label">ANSKAFFELSESPROTOKOLL</div>
        <h1 class="page-title">{getProcName(protokoll.procurement)}</h1>
        <div class="page-meta">
          Ref: <span class="page-meta-ref">{protokoll.procurement?.sequenceId ?? '—'}</span>
          &middot; {protokoll.delLabel}
        </div>
      </div>
    </header>

    <!-- Progress strip -->
    <div class="progress-strip">
      <div
        class="progress-bar-track"
        role="progressbar"
        aria-valuenow={protokoll.completeness.done}
        aria-valuemin={0}
        aria-valuemax={protokoll.completeness.total}
        aria-label="Seksjoner fullført: {protokoll.completeness.done} av {protokoll.completeness
          .total}"
      >
        <div
          class="progress-bar-fill"
          style="width: {protokoll.completeness.percent}%; background: {progressColor}"
        ></div>
      </div>
      <div class="progress-info">
        {#if protokoll.completeness.percent >= 100}
          <span class="progress-complete">Fullstendig — klar for generering</span>
        {:else}
          <span class="progress-fraction"
            >{protokoll.completeness.done} av {protokoll.completeness.total} seksjoner</span
          >
          {#if protokoll.completeness.missing.length > 0}
            <span class="progress-missing"
              >{protokoll.completeness.missing.length} mangler begrunnelse</span
            >
          {/if}
        {/if}
      </div>
    </div>

    {#if generateError}
      <div class="error-banner error-banner-inline">
        <span class="error-icon">&#9888;</span>
        <span>{generateError}</span>
      </div>
    {/if}

    <!-- Sections -->
    <div class="sections">
      {#each chapters as group}
        <div class="chapter-label" role="separator" aria-label={group.chapter}>
          <span class="chapter-text">{group.chapter}</span>
        </div>

        {#each group.sections as section (section.id)}
          {@const sectionInfoRows = getInfoRows(section)}
          {@const sectionSuppliers = getSuppliers(section)}
          {@const sectionRejected = getRejectedSuppliers()}
          <SectionAccordion
            {section}
            open={protokoll.isSectionOpen(section.id)}
            ontoggle={() => handleSectionToggle(section.id)}
          >
            {#each section.fields as field (field.key)}
              <ProtokollField
                {field}
                infoRows={sectionInfoRows}
                suppliers={sectionSuppliers}
                rejectedSuppliers={sectionRejected}
              />
            {/each}
          </SectionAccordion>
        {/each}
      {/each}
    </div>

    <!-- Sticky footer -->
    <div class="sticky-footer">
      <div class="footer-inner">
        <div class="footer-progress">
          <div class="footer-bar-track">
            <div
              class="footer-bar-fill"
              style="width: {protokoll.completeness.percent}%; background: {progressColor}"
            ></div>
          </div>
          <span class="footer-fraction">
            {#if protokoll.completeness.percent >= 100}
              <span class="footer-complete">Klar</span>
            {:else}
              {protokoll.completeness.done}/{protokoll.completeness.total}
            {/if}
          </span>
          {#if protokoll.completeness.missing.length > 0}
            <span class="footer-missing"
              >&middot; {protokoll.completeness.missing.length} mangler</span
            >
          {/if}
        </div>

        {#if showSaved}
          <span class="footer-saved">Lagret</span>
        {/if}

        {#if protokoll.nextMissingSectionId}
          <button
            class="footer-action footer-action-stacked footer-action-responsive"
            onclick={handleNextMissing}
            title="Gå til neste ufullstendige seksjon"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
              ><path
                d="M1 6h9M7 3l3 3-3 3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
            <span>Neste</span>
          </button>
        {/if}

        <button
          class="footer-action footer-action-stacked footer-action-responsive"
          onclick={handleToggleAll}
        >
          {#if allOpen}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              ><path
                d="M3 5.5L7 9.5L11 5.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
            <span>Lukk alle</span>
          {:else}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              ><path
                d="M3 8.5L7 4.5L11 8.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
            <span>Vis alle</span>
          {/if}
        </button>

        <!-- Section nav popup -->
        <div class="footer-nav-wrap">
          <button
            class="footer-action footer-action-stacked"
            onclick={(e) => {
              e.stopPropagation();
              navPopupOpen = !navPopupOpen;
            }}
            aria-expanded={navPopupOpen}
            aria-controls="section-nav-popup"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
              ><path
                d="M1 3h10M1 6h10M1 9h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              /></svg
            >
            <span>Seksjoner</span>
          </button>
          {#if navPopupOpen}
            <div
              class="section-nav-popup"
              id="section-nav-popup"
              transition:slide={{ duration: 150 }}
            >
              {#each chapters as group}
                <div class="nav-chapter">{group.chapter}</div>
                {#each group.sections as section}
                  <button class="nav-item" onclick={() => handleNavJump(section.id)}>
                    <span class="nav-num">{section.sectionNumber}</span>
                    <span class="nav-title">{section.title}</span>
                    <span class="nav-badge nav-badge-{section.status}">
                      {section.status === 'complete'
                        ? '✓'
                        : section.status === 'partial'
                          ? '◐'
                          : '○'}
                    </span>
                  </button>
                {/each}
              {/each}
            </div>
          {/if}
        </div>

        <button
          class="generate-btn generate-btn-footer"
          class:generate-btn-draft={protokoll.completeness.percent < 100}
          disabled={generating}
          onclick={handleGenerate}
        >
          {#if generating}
            <span class="spinner"></span> Genererer...
          {:else if protokoll.completeness.percent < 100}
            &#8595; Generer utkast
          {:else}
            &#8595; Generer .docx
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .protokoll-page {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 72px;
  }

  /* ── Page header ── */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-6);
  }

  .page-header-left {
    flex: 1;
    min-width: 0;
  }

  .page-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-2);
  }

  .page-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--color-ink);
    line-height: 1.2;
  }

  .page-meta {
    font-size: 13px;
    color: var(--color-ink-secondary);
    margin-top: var(--spacing-1);
  }

  .page-meta-ref {
    font-family: var(--font-data);
  }

  /* ── Generate button ── */
  .generate-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-vekt);
    color: var(--color-canvas);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.12s,
      filter 0.12s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .generate-btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .generate-btn:disabled {
    background: var(--color-felt-active);
    color: var(--color-ink-muted);
    cursor: not-allowed;
  }

  .generate-btn:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px var(--color-canvas),
      0 0 0 4px var(--color-vekt);
  }

  .generate-btn-draft {
    background: var(--color-felt-active);
    color: var(--color-ink-secondary);
    border: 1px solid var(--color-wire);
  }

  .generate-btn-draft:hover:not(:disabled) {
    background: var(--color-felt-hover);
    filter: none;
  }

  .generate-btn-footer {
    margin-left: auto;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Progress strip ── */
  .progress-strip {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    padding: var(--spacing-3) var(--spacing-4);
    margin-bottom: var(--spacing-6);
  }

  .progress-bar-track {
    height: 4px;
    background: var(--color-felt-active);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: var(--spacing-2);
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease-out;
  }

  .progress-bar-loading {
    width: 30%;
    background: var(--color-vekt);
    animation: loading-pulse 1.5s ease-in-out infinite;
  }

  @keyframes loading-pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }

  .progress-info {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
  }

  .progress-fraction {
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }

  .progress-missing {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  .progress-complete {
    font-size: 13px;
    color: var(--color-score-high);
    font-weight: 500;
  }

  .progress-text {
    font-size: 13px;
    color: var(--color-ink-muted);
  }

  /* ── Chapters ── */
  .chapter-label {
    display: flex;
    align-items: center;
    padding: var(--spacing-3) 0;
    margin-top: var(--spacing-6);
  }

  .chapter-label:first-child {
    margin-top: 0;
  }

  .chapter-label::before,
  .chapter-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-wire);
  }

  .chapter-text {
    padding: 0 var(--spacing-4);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-ink-ghost);
    white-space: nowrap;
  }

  /* ── Sections ── */
  .sections {
    margin-bottom: var(--spacing-8);
  }

  /* ── Skeleton ── */
  .skeleton-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin-top: var(--spacing-4);
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-wire);
  }

  .skeleton-num {
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink-ghost);
    min-width: 20px;
    font-variant-numeric: tabular-nums;
  }

  .skeleton-line {
    height: 12px;
    background: var(--color-felt-active);
    border-radius: var(--radius-sm);
    animation: loading-pulse 1.5s ease-in-out infinite;
  }

  /* ── Error ── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-left: 3px solid var(--color-vekt);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--color-vekt-dim);
    margin-bottom: var(--spacing-4);
  }

  .error-banner-inline {
    margin-top: 0;
  }

  .error-icon {
    flex-shrink: 0;
  }

  .error-retry {
    margin-left: auto;
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 12px;
    cursor: pointer;
    transition:
      background-color 0.12s,
      color 0.12s;
  }

  .error-retry:hover {
    background: var(--color-felt);
    color: var(--color-ink);
  }

  .error-retry:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  /* ── Sticky footer ── */
  .sticky-footer {
    position: sticky;
    bottom: 0;
    max-width: 800px;
    margin: 0 auto;
    background: var(--color-felt);
    border-top: 1px solid var(--color-wire);
    z-index: 20;
  }

  .footer-inner {
    padding: var(--spacing-3) var(--spacing-4);
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .footer-progress {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .footer-bar-track {
    width: 80px;
    height: 3px;
    background: var(--color-felt-active);
    border-radius: 2px;
    overflow: hidden;
  }

  .footer-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease-out;
  }

  .footer-fraction {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }

  .footer-complete {
    color: var(--color-score-high);
  }

  .footer-missing {
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  .footer-saved {
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-family: var(--font-ui);
    animation: fade-saved 1.5s ease-out forwards;
  }

  @keyframes fade-saved {
    0%,
    60% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .footer-action {
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      background-color 0.12s,
      color 0.12s;
    white-space: nowrap;
  }

  .footer-action:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .footer-action:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  .footer-action-stacked {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  /* ── Section nav popup ── */
  .footer-nav-wrap {
    position: relative;
  }

  .section-nav-popup {
    position: absolute;
    bottom: calc(100% + var(--spacing-2));
    right: 0;
    width: 320px;
    max-height: 480px;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-md);
    padding: var(--spacing-2) 0;
    z-index: 30;
  }

  .nav-chapter {
    padding: var(--spacing-2) var(--spacing-4);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-ink-ghost);
  }

  .nav-chapter:not(:first-child) {
    margin-top: var(--spacing-1);
    border-top: 1px solid var(--color-wire);
    padding-top: var(--spacing-3);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-1) var(--spacing-4);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui);
    transition: background-color 0.08s;
  }

  .nav-item:hover {
    background: var(--color-felt-hover);
  }

  .nav-item:focus-visible {
    outline: none;
    background: var(--color-felt-hover);
  }

  .nav-num {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
    min-width: 18px;
    flex-shrink: 0;
  }

  .nav-title {
    font-size: 12px;
    color: var(--color-ink);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-badge {
    font-size: 10px;
    flex-shrink: 0;
  }

  .nav-badge-complete {
    color: var(--color-score-high);
  }

  .nav-badge-partial {
    color: var(--color-vekt);
  }

  .nav-badge-empty {
    color: var(--color-score-low);
  }

  /* ── Responsive ── */
  @media (max-width: 1023px) {
    .section-nav-popup {
      width: 280px;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
    }

    .footer-bar-track,
    .footer-fraction {
      display: none;
    }

    .footer-missing {
      display: none;
    }

    .footer-action-responsive {
      display: none;
    }
  }
</style>
