<script lang="ts">
  import type { AnskaffelsesOversiktItem } from '$lib/types/anskaffelse';
  import CaseListRow from './CaseListRow.svelte';

  interface Props {
    saker: AnskaffelsesOversiktItem[];
  }

  let { saker }: Props = $props();

  type SortKey = 'sequenceId' | 'name' | 'procedure' | 'threshold' | 'deadline';
  type SortDir = 'asc' | 'desc';

  let sortKey = $state<SortKey>('deadline');
  let sortDir = $state<SortDir>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'deadline' ? 'desc' : 'asc';
    }
  }

  function compareValues(a: unknown, b: unknown, dir: SortDir): number {
    if (a === null || a === undefined) return dir === 'asc' ? 1 : -1;
    if (b === null || b === undefined) return dir === 'asc' ? -1 : 1;
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    if (aStr < bStr) return dir === 'asc' ? -1 : 1;
    if (aStr > bStr) return dir === 'asc' ? 1 : -1;
    return 0;
  }

  const sortedSaker = $derived(
    [...saker].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
  );

  const columns: { key: SortKey; label: string }[] = [
    { key: 'sequenceId', label: 'ID' },
    { key: 'name', label: 'Navn' },
    { key: 'procedure', label: 'Prosedyre' },
    { key: 'threshold', label: 'Terskel' },
    { key: 'deadline', label: 'Frist' },
  ];
</script>

<div class="table-wrapper">
  <table class="table">
    <thead class="thead">
      <tr>
        {#each columns as col (col.key)}
          <th
            class="th"
            class:th-active={sortKey === col.key}
            scope="col"
            aria-sort={sortKey === col.key
              ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none'}
          >
            <button class="sort-btn" onclick={() => toggleSort(col.key)}>
              {col.label}
              <span class="sort-icon" aria-hidden="true">
                {#if sortKey === col.key}
                  {sortDir === 'asc' ? '▴' : '▾'}
                {:else}
                  <span class="sort-icon-ghost">▴</span>
                {/if}
              </span>
            </button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sortedSaker as sak (sak.id)}
        <CaseListRow {sak} />
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    background: var(--color-felt);
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui);
  }

  .thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire-strong);
  }

  .th {
    padding: 0;
    text-align: left;
    white-space: nowrap;
  }

  .sort-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    white-space: nowrap;
  }

  .sort-btn:hover {
    color: var(--color-ink-secondary);
  }

  .th-active .sort-btn {
    color: var(--color-ink);
  }

  .sort-icon {
    font-size: 11px;
    color: var(--color-ink);
    line-height: 1;
  }

  .sort-icon-ghost {
    color: var(--color-ink-ghost);
  }
</style>
