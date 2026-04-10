<script lang="ts">
  const aktiviteter = [
    'Signere kontrakt med valgt leverandør',
    'Kunngjøre kontraktsinngåelse (§ 21-6)',
    'Arkivere all anskaffelsesdokumentasjon',
    'Etablere kontraktsoppfølging',
  ];
</script>

<div class="kontrakt-page">
  <div class="page-inner">
    <div class="card card-accent">
      <div class="section-label">Kommende fase</div>
      <p class="desc">
        Signering av kontrakt med valgt leverandør etter utløp av karensperiode.
        Kunngjøring av kontraktsinngåelse i henhold til forskriften.
      </p>
      <div class="prereq">
        <span class="prereq-label">Forutsetter:</span>
        Karensperiode utløpt uten klage
      </div>
    </div>

    <div class="card">
      <div class="section-label">Forventede aktiviteter</div>
      <div class="aktivitet-list">
        {#each aktiviteter as aktivitet}
          <div class="aktivitet-row">
            <span class="aktivitet-dot">○</span>
            <span class="aktivitet-tekst">{aktivitet}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <div class="section-label">Arbeidsflater</div>
      <div class="notice">
        Kontraktsverktøy blir tilgjengelig etter at tildeling er fullført.
      </div>
    </div>
  </div>
</div>

<style>
  .kontrakt-page {
    height: 100%;
    overflow-y: auto;
  }

  .card-accent {
    border-left: 3px solid var(--color-ink-ghost);
  }

  .desc {
    font-family: var(--font-prose);
    font-size: 14px;
    color: var(--color-ink-secondary);
    line-height: 1.6;
    margin-bottom: var(--spacing-4);
  }

  .prereq {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  .prereq-label {
    font-weight: 600;
    margin-right: var(--spacing-1);
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

  .notice {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }
</style>
