<script lang="ts">
  import type {
    OppdragsgiverType,
    KontraktstypeId,
    GjeldendeDel,
    Krav,
  } from '$lib/types/registrering';
  import TerskelBar from './TerskelBar.svelte';
  import { formatNOK } from '$lib/utils/format';

  let {
    tittel,
    saksnr,
    totalVerdi,
    oppdragsgiver,
    kontraktstype,
    gjeldendeDel,
    eos,
    krav,
  }: {
    tittel: string;
    saksnr: string;
    totalVerdi: number;
    oppdragsgiver: OppdragsgiverType;
    kontraktstype: KontraktstypeId;
    gjeldendeDel: GjeldendeDel;
    eos: number;
    krav: Krav[];
  } = $props();

  const showAnalysis = $derived(totalVerdi > 0 && oppdragsgiver && kontraktstype);

  const delColors: Record<string, string> = {
    ingen: 'var(--color-ink-ghost)',
    I: 'var(--color-ink-muted)',
    II: 'var(--color-vekt)',
    'II+': 'var(--color-vekt)',
    III: 'var(--color-vekt)',
    IV: 'var(--color-vekt)',
  };
</script>

<div class="panel">
  <div class="panel-title">Analyse</div>
  <div class="panel-sub">{tittel || '—'}{saksnr ? ` · ${saksnr}` : ''}</div>

  {#if showAnalysis}
    <div class="sections">
      <!-- Gjeldende del -->
      <div class="section">
        <div class="section-label">Gjeldende regelverk</div>
        <div class="del-card">
          <div class="del-header">
            <span
              class="del-badge"
              style:background={delColors[gjeldendeDel.del] ?? 'var(--color-ink-ghost)'}
            >
              {gjeldendeDel.del === 'ingen' ? '–' : gjeldendeDel.del}
            </span>
            <span class="del-label">{gjeldendeDel.label}</span>
          </div>
          <p class="del-desc">{gjeldendeDel.desc}</p>
        </div>
      </div>

      <!-- Terskelverdi -->
      <div class="section">
        <div class="section-label">Terskelverdi — EØS {formatNOK(eos)}</div>
        <TerskelBar verdi={totalVerdi} {oppdragsgiver} {kontraktstype} />
      </div>

      <!-- Krav -->
      {#if krav.length > 0}
        <div class="section">
          <div class="section-label">Krav som utløses</div>
          <div class="krav-table">
            {#each krav as k, i}
              <div class="krav-row" class:warn={k.w} class:even={i % 2 === 0}>
                <span class="krav-label">{k.l}</span>
                <span class="krav-ref">{k.r}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <p class="empty-hint">Fyll inn oppdragsgiver, kontraktstype og verdi for å se analyse.</p>
  {/if}
</div>

<style>
  .panel {
    flex: 0 0 38%;
    padding: 28px 24px;
    background: var(--color-felt-raised);
    position: sticky;
    top: 0;
    align-self: flex-start;
    min-height: calc(100vh - 100px);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .panel-title {
    font-family: var(--font-prose);
    font-size: 14px;
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 2px;
  }

  .panel-sub {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    margin-bottom: 20px;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .del-card {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
  }

  .del-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 3px;
  }

  .del-badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 700;
    font-family: var(--font-data);
    color: #fff;
  }

  .del-label {
    font-size: 12px;
    font-weight: 600;
  }

  .del-desc {
    font-size: 10.5px;
    color: var(--color-ink-muted);
    line-height: 1.5;
  }

  .krav-table {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .krav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 9px;
    font-size: 10.5px;
    background: var(--color-felt-raised);
  }

  .krav-row.even {
    background: var(--color-felt);
  }

  .krav-row.warn {
    background: var(--color-warn-bg);
  }

  .krav-label {
    color: var(--color-ink);
  }

  .krav-row.warn .krav-label {
    color: var(--color-warn);
    font-weight: 500;
  }

  .krav-ref {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--color-ink-ghost);
    line-height: 1.6;
  }
</style>
