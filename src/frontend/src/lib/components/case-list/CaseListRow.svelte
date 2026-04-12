<script lang="ts">
  import type { AnskaffelsesOversiktItem } from '$lib/types/anskaffelse';
  import { goto } from '$app/navigation';

  interface Props {
    sak: AnskaffelsesOversiktItem;
  }

  let { sak }: Props = $props();

  const path = $derived(`/anskaffelser/${sak.id}`);

  function handleRowClick() {
    goto(path);
  }
</script>

<tr class="row" onclick={handleRowClick}>
  <td class="cell cell-id">
    <a href={path} class="row-link" aria-label="Åpne {sak.name}">
      <span class="sak-id">{sak.sequenceId}</span>
    </a>
  </td>
  <td class="cell cell-tittel">
    <span class="cell-text">{sak.name}{#if sak.cancelled}<span class="avlyst-badge">Avlyst</span>{/if}</span>
  </td>
  <td class="cell cell-prosedyre">
    <span class="cell-text cell-text-muted">{sak.procedure}</span>
  </td>
  <td class="cell cell-terskel">
    <span class="cell-text cell-text-muted">{sak.threshold}</span>
  </td>
  <td class="cell cell-date">
    <span class="cell-text cell-text-date">{sak.deadline}</span>
  </td>
</tr>

<style>
  .row {
    border-bottom: 1px solid var(--color-wire);
    cursor: pointer;
  }

  .row:hover {
    background: var(--color-felt-hover);
  }

  .row:last-child {
    border-bottom: none;
  }

  .cell {
    padding: 0;
  }

  .cell-text {
    display: block;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-ink);
  }

  .cell-text-muted {
    color: var(--color-ink-secondary);
    font-size: 12px;
  }

  .cell-text-date {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  /* .avlyst-badge: margin-left variant for inline use in table cells */
  .avlyst-badge {
    margin-left: 6px;
  }

  .row-link {
    display: block;
    padding: 10px 12px;
    color: inherit;
    text-decoration: none;
    line-height: 1.4;
  }

  .row-link:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: -2px;
  }

  .sak-id {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
