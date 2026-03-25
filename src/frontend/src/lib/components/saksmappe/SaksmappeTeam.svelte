<script lang="ts">
  import type { Teammedlem } from '$lib/types/saksmappe';

  let { team }: { team: Teammedlem[] } = $props();
</script>

<div class="team">
  <div class="section-label">Team</div>
  <div class="table">
    {#each team as t, i}
      <div class="row" class:even={i % 2 === 0}>
        <div class="rolle">{t.rolle}</div>
        <div class="navn">{t.navn}</div>
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
    padding: 8px 10px;
    background: var(--color-felt-raised);
  }

  .row.even {
    background: var(--color-felt);
  }

  .row + .row {
    border-top: 1px solid var(--color-felt-active);
  }

  .rolle {
    font-size: 9.5px;
    font-weight: 600;
    color: var(--color-ink-ghost);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .navn {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
    margin-top: 2px;
  }
</style>
