<script lang="ts">
  import type { Frist } from '$lib/types/saksmappe';

  let { frister }: { frister: Frist[] } = $props();
</script>

<div class="situasjon">
  <div class="cols">
    <div class="neste-steg">
      <div class="section-label">Neste steg</div>
      <p class="steg-tekst">
        Tilbudsfristen utløper <strong>12. mai</strong>. Forbered forhandlingsopplegg og gjennomgå
        evalueringskriterier før tilbudene mottas.
      </p>
      <div class="steg-lenker">
        <span class="steg-lenke accent">Gjennomgå evalueringskriterier ›</span>
        <span class="steg-lenke accent">Se fristberegner ›</span>
        <span class="steg-lenke muted">Evalueringsmatrise – tilgjengelig etter tilbudsfrist</span>
      </div>
    </div>

    <div class="frister-col">
      <div class="section-label">Kommende frister</div>
      {#each frister as f}
        <div class="frist-card">
          <div class="frist-top">
            <span class="frist-label">{f.label}</span>
            <span class="frist-dager" class:urgent={f.dager <= 14}>{f.dager}d</span>
          </div>
          <div class="frist-bottom">
            <span class="frist-dato">{f.dato}</span>
            <span class="frist-ref">{f.ref}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .situasjon {
    padding: 20px 36px;
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
  }

  .cols {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }

  .neste-steg {
    flex: 1 1 300px;
  }

  .frister-col {
    flex: 0 0 240px;
  }

  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .steg-tekst {
    font-size: 12.5px;
    color: var(--color-ink);
    line-height: 1.65;
    margin-bottom: 10px;
  }

  .steg-lenker {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .steg-lenke {
    font-size: 11.5px;
    cursor: pointer;
  }

  .steg-lenke.accent {
    color: var(--color-vekt);
  }

  .steg-lenke.muted {
    color: var(--color-ink-ghost);
  }

  .frist-card {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    margin-bottom: 6px;
  }

  .frist-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .frist-label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .frist-dager {
    font-size: 10px;
    font-weight: 600;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  .frist-dager.urgent {
    color: var(--color-warn);
  }

  .frist-bottom {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
  }

  .frist-dato {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-secondary);
  }

  .frist-ref {
    font-size: 9px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }
</style>
