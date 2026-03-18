<script lang="ts">
  import { meddelelse } from '$lib/stores/meddelelse.svelte';

  let { data } = $props();

  if (data?.proc) {
    meddelelse.loadFromData(data.proc, data.activities ?? []);
  }

  let procId = $derived(meddelelse.procurement?.id);
</script>

<div class="meddelelse-page">
  <div class="page-inner">
    {#if !meddelelse.procurement}
      <div class="empty-state">
        <p>Ingen anskaffelse lastet.</p>
      </div>
    {:else}
      <div class="page-title">Meddelsesbrev</div>

      {#if !meddelelse.hasEvaluation}
        <div class="notice">
          <span class="notice-text">Evalueringsdata mangler — fullfør evalueringen først.</span>
          <a class="notice-link" href="/anskaffelser/{procId}/evaluering">Gå til evaluering</a>
        </div>
      {:else if meddelelse.selectedSupplierIds.length === 0}
        <div class="notice">
          <span class="notice-text"
            >Ingen innstilt leverandør valgt — velg i protokollens punkt 11.</span
          >
          <a class="notice-link" href="/anskaffelser/{procId}/protokoll">Gå til protokoll</a>
        </div>
      {:else}
        <!-- ── Info stripe ── -->
        <div class="info-stripe">
          <span class="info-text">
            Brevene er generert fra
            <a href="/anskaffelser/{procId}/evaluering">evalueringsmatrisen</a>
            og
            <a href="/anskaffelser/{procId}/protokoll">protokollen</a>. Rediger begrunnelse,
            karensdager eller klagefrist der for å oppdatere brevene.
          </span>
          <button class="refresh-btn" onclick={() => meddelelse.refreshData()}> Oppdater </button>
        </div>

        {#if meddelelse.hasLetters && meddelelse.currentLetter}
          <!-- ── Letter navigator ── -->
          <div class="letter-nav">
            <button
              class="nav-arrow"
              disabled={meddelelse.currentIdx === 0}
              onclick={() => meddelelse.setCurrentIdx(meddelelse.currentIdx - 1)}
              aria-label="Forrige leverandør"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M8.5 3L4.5 7L8.5 11"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <div class="nav-center">
              <div class="nav-supplier">
                <span class="nav-name">{meddelelse.currentLetter.supplier.name}</span>
                {#if meddelelse.currentLetter.isWinner}
                  <span class="nav-badge">Innstilt</span>
                {/if}
                <span class="nav-score"
                  >{(meddelelse.evalTotals[meddelelse.currentLetter.supplier.id] ?? 0).toFixed(
                    1
                  )}</span
                >
              </div>
              <div class="nav-position">
                {meddelelse.currentIdx + 1} av {meddelelse.letters.length}
              </div>
            </div>

            <button
              class="nav-arrow"
              disabled={meddelelse.currentIdx === meddelelse.letters.length - 1}
              onclick={() => meddelelse.setCurrentIdx(meddelelse.currentIdx + 1)}
              aria-label="Neste leverandør"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5.5 3L9.5 7L5.5 11"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <!-- ── Letter preview ── -->
          <div class="letter-preview">
            {@html meddelelse.currentLetter.html}
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .meddelelse-page {
    height: 100%;
    overflow-y: auto;
  }

  .page-inner {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-6) var(--spacing-8);
    padding-bottom: 72px;
  }

  /* ── Page title ── */

  .page-title {
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-6);
  }

  /* ── Notice ── */

  .notice {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-vekt-bg);
    border-left: 3px solid var(--color-vekt);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-4);
  }

  .notice-text {
    font-size: 13px;
    color: var(--color-vekt-dim);
  }

  .notice-link {
    margin-left: auto;
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 12px;
    text-decoration: none;
    white-space: nowrap;
    transition: background-color 0.12s;
  }

  .notice-link:hover {
    background: var(--color-felt-hover);
  }

  .notice-link:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  /* ── Info stripe ── */

  .info-stripe {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-4);
  }

  .info-text {
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  .info-text a {
    color: var(--color-vekt);
    text-decoration: none;
    font-weight: 500;
  }

  .info-text a:hover {
    text-decoration: underline;
  }

  .refresh-btn {
    flex-shrink: 0;
    padding: var(--spacing-1) var(--spacing-3);
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .refresh-btn:hover {
    background: var(--color-felt-hover);
  }

  .refresh-btn:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  /* ── Letter navigator ── */

  .letter-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .nav-arrow {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color 0.1s,
      color 0.1s;
  }

  .nav-arrow:hover:not(:disabled) {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .nav-arrow:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  .nav-arrow:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .nav-center {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .nav-supplier {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
  }

  .nav-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-badge {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-score-high);
    flex-shrink: 0;
  }

  .nav-score {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    flex-shrink: 0;
  }

  .nav-position {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }

  /* ── Empty state ── */

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--color-ink-muted);
    font-size: 14px;
  }

  /* ── Letter preview ── */

  .letter-preview {
    padding: var(--spacing-8);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    font-family: var(--font-prose);
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-ink);
  }

  .letter-preview :global(h2) {
    font-size: 17px;
    font-weight: 600;
    margin: var(--spacing-6) 0 var(--spacing-3);
  }

  .letter-preview :global(h3) {
    font-size: 15px;
    font-weight: 600;
    margin: var(--spacing-4) 0 var(--spacing-2);
  }

  .letter-preview :global(p) {
    margin: 0 0 var(--spacing-2);
  }

  .letter-preview :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--spacing-3) 0;
    font-size: 12px;
    font-family: var(--font-data);
  }

  .letter-preview :global(th),
  .letter-preview :global(td) {
    text-align: left;
    padding: var(--spacing-1) var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .letter-preview :global(th) {
    font-weight: 600;
    color: var(--color-ink-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .letter-preview :global(.meddelelse-header) {
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire-strong);
    font-family: var(--font-ui);
  }

  .letter-preview :global(.meddelelse-header p) {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  /* ── Responsive ── */

  @media (max-width: 768px) {
    .page-inner {
      padding: var(--spacing-4);
    }

    .letter-preview {
      padding: var(--spacing-5);
    }
  }
</style>
