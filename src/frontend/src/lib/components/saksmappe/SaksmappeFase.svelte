<script lang="ts">
  import type { Fase } from '$lib/types/saksmappe';

  let { fase, isLast }: { fase: Fase; isLast: boolean } = $props();

  let showAllAkt = $state(false);
  let showHendelser = $state(false);

  const s = $derived(fase.status);
  const hendelser = $derived(fase.hendelser ?? []);

  const visibleAktiviteter = $derived.by(() => {
    if (!fase.aktiviteter) return [];
    if (showAllAkt) return fase.aktiviteter;
    const done = fase.aktiviteter.filter((a) => a.done);
    const undone = fase.aktiviteter.filter((a) => !a.done);
    return [...done.slice(-2), ...undone];
  });

  const hiddenCount = $derived(
    fase.aktiviteter ? fase.aktiviteter.length - visibleAktiviteter.length : 0
  );
</script>

<div class="fase">
  <div class="timeline-col">
    <div
      class="dot"
      class:dot-fullfort={s === 'fullfort'}
      class:dot-aktiv={s === 'aktiv'}
      class:dot-kommende={s === 'kommende'}
    ></div>
    {#if !isLast}
      <div class="line" class:line-done={s === 'fullfort'}></div>
    {/if}
  </div>

  <div class="content" class:content-aktiv={s === 'aktiv'} class:content-last={isLast}>
    <div class="label-row">
      <span
        class="label"
        class:label-aktiv={s === 'aktiv'}
        class:label-fullfort={s === 'fullfort'}
        class:label-kommende={s === 'kommende'}
      >
        {fase.label}
      </span>
      {#if fase.dato}
        <span class="dato">{fase.dato}</span>
      {/if}
      {#if fase.href && s !== 'kommende'}
        <a href={fase.href} class="open-link">Åpne ›</a>
      {/if}
    </div>

    {#if s === 'fullfort'}
      {#if fase.sammendrag}
        <p class="sammendrag">{fase.sammendrag}</p>
      {/if}
      {#if hendelser.length > 0}
        <div class="hendelser-toggle">
          {#if !showHendelser}
            <button class="toggle-btn" onclick={() => (showHendelser = true)}>
              {hendelser.length}
              {hendelser.length === 1 ? 'hendelse' : 'hendelser'} ›
            </button>
          {:else}
            <div class="hendelser-panel">
              {#each hendelser as h, i}
                <div class="hendelse" class:hendelse-border={i > 0}>
                  <span class="hendelse-dato">{h.dato}</span>
                  <span class="hendelse-tekst">{h.tekst}</span>
                </div>
              {/each}
              <button class="toggle-btn" onclick={() => (showHendelser = false)}>Skjul</button>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if s === 'aktiv' && fase.aktiviteter}
      <div class="aktiviteter-panel">
        {#if hiddenCount > 0 && !showAllAkt}
          <button class="show-earlier" onclick={() => (showAllAkt = true)}>
            {hiddenCount} tidligere aktiviteter – vis alle
          </button>
        {/if}
        {#each visibleAktiviteter as a, i}
          <div class="aktivitet" class:aktivitet-border={i > 0}>
            <span class="aktivitet-check" class:done={a.done}>{a.done ? '✓' : '○'}</span>
            <span class="aktivitet-label" class:done={a.done}>{a.label}</span>
            <span class="aktivitet-dato">{a.dato}</span>
          </div>
        {/each}
        {#if showAllAkt && hiddenCount > 0}
          <button class="toggle-btn accent" onclick={() => (showAllAkt = false)}>
            Skjul tidligere
          </button>
        {/if}
      </div>

      {#if hendelser.length > 0}
        <div class="hendelser-toggle">
          {#if !showHendelser}
            <button class="toggle-btn" onclick={() => (showHendelser = true)}>
              {hendelser.length} hendelser i denne fasen ›
            </button>
          {:else}
            <div class="hendelser-panel">
              {#each hendelser as h, i}
                <div class="hendelse" class:hendelse-border={i > 0}>
                  <span class="hendelse-dato">{h.dato}</span>
                  <span class="hendelse-tekst">{h.tekst}</span>
                </div>
              {/each}
              <button class="toggle-btn" onclick={() => (showHendelser = false)}>Skjul</button>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if s === 'kommende' && fase.substeg}
      <div class="substeg">
        {#each fase.substeg as sub}
          <div class="substeg-item">{sub}</div>
        {/each}
      </div>
    {/if}

    {#if s === 'kommende' && fase.href && !fase.substeg}
      <span class="kommende-hint">Tilgjengelig etter evaluering</span>
    {/if}
  </div>
</div>

<style>
  .fase {
    display: flex;
    gap: 0;
  }

  .timeline-col {
    width: 24px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .dot {
    flex-shrink: 0;
    margin-top: 5px;
  }

  .dot-fullfort {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: var(--color-score-high);
    border: 2px solid var(--color-score-high);
  }

  .dot-aktiv {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--color-vekt);
    border: 2px solid var(--color-vekt);
    margin-top: 4px;
  }

  .dot-kommende {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: var(--color-felt);
    border: 2px solid var(--color-wire);
  }

  .line {
    width: 1px;
    flex: 1;
    background: var(--color-wire);
    margin-top: 4px;
    min-height: 16px;
  }

  .line-done {
    background: var(--color-score-high-bg);
  }

  .content {
    flex: 1;
    padding-bottom: 16px;
  }

  .content-aktiv {
    padding-bottom: 24px;
  }

  .content-last {
    padding-bottom: 0;
  }

  .label-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 3px;
  }

  .label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .label-aktiv {
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-prose);
  }

  .label-fullfort {
    font-weight: 600;
  }

  .label-kommende {
    color: var(--color-ink-ghost);
  }

  .dato {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  .open-link {
    font-size: 11px;
    color: var(--color-vekt);
    text-decoration: none;
    cursor: pointer;
  }

  .sammendrag {
    font-size: 11.5px;
    color: var(--color-ink-secondary);
    line-height: 1.55;
    max-width: 520px;
  }

  .hendelser-toggle {
    margin-top: 4px;
  }

  .toggle-btn {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    font-size: 10.5px;
    color: var(--color-ink-ghost);
    font-family: var(--font-ui);
    font-weight: 500;
  }

  .toggle-btn.accent {
    color: var(--color-vekt);
    padding-top: 6px;
  }

  .hendelser-panel {
    margin-top: 4px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-felt-active);
    background: var(--color-felt-raised);
  }

  .hendelse {
    display: flex;
    gap: 10px;
    padding: 3px 0;
  }

  .hendelse-border {
    border-top: 1px solid var(--color-felt-active);
  }

  .hendelse-dato {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    min-width: 40px;
    flex-shrink: 0;
    text-align: right;
  }

  .hendelse-tekst {
    font-size: 11px;
    color: var(--color-ink-secondary);
  }

  .aktiviteter-panel {
    margin-top: 6px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
  }

  .show-earlier {
    border: none;
    background: none;
    cursor: pointer;
    padding: 2px 0 6px;
    font-size: 10.5px;
    color: var(--color-vekt);
    font-family: var(--font-ui);
    font-weight: 500;
    border-bottom: 1px solid var(--color-felt-active);
    width: 100%;
    text-align: left;
    margin-bottom: 2px;
  }

  .aktivitet {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 0;
  }

  .aktivitet-border {
    border-top: 1px solid var(--color-felt-active);
  }

  .aktivitet-check {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-top: 1px;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .aktivitet-check.done {
    color: var(--color-score-high);
  }

  .aktivitet-label {
    font-size: 11.5px;
    color: var(--color-ink);
    font-weight: 500;
  }

  .aktivitet-label.done {
    color: var(--color-ink-secondary);
    font-weight: 400;
  }

  .aktivitet-dato {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    margin-left: auto;
    flex-shrink: 0;
  }

  .substeg {
    margin-top: 2px;
  }

  .substeg-item {
    font-size: 11px;
    color: var(--color-ink-ghost);
    line-height: 1.7;
  }

  .kommende-hint {
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-style: italic;
  }
</style>
