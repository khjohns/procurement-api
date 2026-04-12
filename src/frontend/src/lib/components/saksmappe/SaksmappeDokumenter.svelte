<script lang="ts">
  import type { Dokument } from '$lib/types/saksmappe';

  let { dokumenter }: { dokumenter: Dokument[] } = $props();
</script>

<div class="dokumenter">
  <div class="section-label">Dokumenter</div>
  <div class="table">
    {#each dokumenter as d, i}
      {@const done = d.status !== 'ikke påbegynt'}
      <div class="row" class:even={i % 2 === 0}>
        <span class="check" class:done>{done ? '✓' : '○'}</span>
        <span class="navn" class:done>
          {d.navn}
          {#if done}<span class="nav-arrow">›</span>{/if}
        </span>
        <span class="dato">{d.dato ?? '–'}</span>
        <span
          class="status"
          class:status-publisert={d.status === 'publisert'}
          class:status-sendt={d.status === 'sendt'}
        >
          {d.status}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .table {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--color-felt-raised);
  }

  .row.even {
    background: var(--color-felt);
  }

  .row + .row {
    border-top: 1px solid var(--color-felt-active);
  }

  .check {
    font-size: 11px;
    color: var(--color-ink-ghost);
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .check.done {
    color: var(--color-score-high);
  }

  .navn {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--color-ink);
    flex: 1;
  }

  .navn.done {
    font-weight: 400;
    color: var(--color-ink-secondary);
    cursor: pointer;
  }

  .nav-arrow {
    color: var(--color-vekt);
    margin-left: 4px;
    font-size: 11px;
  }

  .dato {
    font-size: 9.5px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .status {
    font-size: 11px;
    font-family: var(--font-data);
    font-weight: 500;
    color: var(--color-ink-ghost);
    flex-shrink: 0;
    min-width: 70px;
    text-align: right;
  }

  .status-publisert {
    color: var(--color-score-high);
  }

  .status-sendt {
    color: var(--color-vekt);
  }
</style>
