<script lang="ts">
  let { data } = $props();

  const procId = $derived(data?.proc?.id);
</script>

<div class="tildeling-page">
  <div class="page-inner">
    <div class="card">
      <div class="section-label">Arbeidsflater</div>
      <div class="tools-grid">
        <a href="/anskaffelser/{procId}/protokoll" class="tool-link">
          <span class="tool-label">Anskaffelsesprotokoll</span>
          <span class="tool-desc">Dokumenter anskaffelsesprosessen (§ 25-5)</span>
          <span class="tool-arrow">›</span>
        </a>
        <a href="/anskaffelser/{procId}/meddelelse" class="tool-link">
          <span class="tool-label">Meddelelsesbrev</span>
          <span class="tool-desc">Generer brev til berørte leverandører (§ 25-1)</span>
          <span class="tool-arrow">›</span>
        </a>
      </div>
    </div>

    <div class="card">
      <div class="section-label">Kommende aktiviteter</div>
      <div class="aktivitet-list">
        <div class="aktivitet-row">
          <span class="aktivitet-dot">○</span>
          <span class="aktivitet-tekst">Meddelelse om valg av leverandør (§ 25-1)</span>
        </div>
        <div class="aktivitet-row">
          <span class="aktivitet-dot">○</span>
          <span class="aktivitet-tekst">Karensperiode — minimum 10 dager (§ 25-2)</span>
        </div>
        <div class="aktivitet-row">
          <span class="aktivitet-dot">○</span>
          <span class="aktivitet-tekst">Håndtere eventuelle klager</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .tildeling-page {
    height: 100%;
    overflow-y: auto;
  }

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

  .tool-arrow {
    font-size: 14px;
    color: var(--color-vekt);
    flex-shrink: 0;
  }

  .aktivitet-list {
    display: flex;
    flex-direction: column;
  }

  .aktivitet-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) 0;
    border-top: 1px solid var(--color-wire);
  }

  .aktivitet-dot {
    font-size: 10px;
    color: var(--color-ink-ghost);
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .aktivitet-tekst {
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
