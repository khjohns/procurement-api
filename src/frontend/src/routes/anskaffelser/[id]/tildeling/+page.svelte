<script lang="ts">
  let { data } = $props();

  const procId = $derived(data?.proc?.id);
  const proc = $derived(data?.proc);
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
      <div class="card">
        <div class="section-label">Arbeidsflater</div>
        <div class="tool-links">
          <a href="/anskaffelser/{procId}/protokoll" class="tool-link">
            <span class="tool-link-label">Anskaffelsesprotokoll</span>
            <span class="tool-link-desc">Dokumenter anskaffelsesprosessen (§ 25-5)</span>
            <span class="tool-link-icon">›</span>
          </a>
          <a href="/anskaffelser/{procId}/meddelelse" class="tool-link">
            <span class="tool-link-label">Meddelelsesbrev</span>
            <span class="tool-link-desc">Generer brev til berørte leverandører (§ 25-1)</span>
            <span class="tool-link-icon">›</span>
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
  {/if}
</div>

<style>
  .tildeling-page {
    height: 100%;
    overflow-y: auto;
  }
</style>
