<script lang="ts">
  import { slide } from 'svelte/transition';

  export interface SubcontractorRow {
    navn: string;
    ytelse: string;
  }

  interface Props {
    rows: SubcontractorRow[];
    label: string;
    hint?: string;
    onchange: (rows: SubcontractorRow[]) => void;
  }

  let { rows, label, hint = '', onchange }: Props = $props();

  function updateRow(index: number, field: 'navn' | 'ytelse', value: string) {
    const updated = rows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    onchange(updated);
  }

  function addRow() {
    onchange([...rows, { navn: '', ytelse: '' }]);
  }

  function removeRow(index: number) {
    onchange(rows.filter((_, i) => i !== index));
  }
</script>

<div class="subcontractor-field">
  <div class="field-header">
    <span class="field-label">{label}</span>
    {#if hint}
      <span class="field-hint">{hint}</span>
    {/if}
  </div>

  {#if rows.length > 0}
    <div class="table-wrap">
      <table class="sc-table">
        <thead>
          <tr>
            <th class="col-navn">Leverandør</th>
            <th class="col-ytelse">Del av kontrakten</th>
            <th class="col-action"></th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, i (i)}
            <tr transition:slide={{ duration: 150 }}>
              <td>
                <input
                  class="sc-input"
                  type="text"
                  value={row.navn}
                  oninput={(e) => updateRow(i, 'navn', (e.target as HTMLInputElement).value)}
                  placeholder="Navn på underleverandør"
                />
              </td>
              <td>
                <input
                  class="sc-input"
                  type="text"
                  value={row.ytelse}
                  oninput={(e) => updateRow(i, 'ytelse', (e.target as HTMLInputElement).value)}
                  placeholder="Hvilke deler/ytelser"
                />
              </td>
              <td>
                <button
                  class="remove-btn"
                  onclick={() => removeRow(i)}
                  title="Fjern underleverandør"
                  aria-label="Fjern rad {i + 1}"
                >&times;</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <button class="add-btn" onclick={addRow}>
    + Legg til underleverandør
  </button>
</div>

<style>
  .subcontractor-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .field-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .field-hint {
    font-size: 11px;
    color: var(--color-ink-muted);
    text-align: right;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .sc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .sc-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
    padding: var(--spacing-1) var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .col-navn {
    width: 40%;
  }

  .col-ytelse {
    width: 55%;
  }

  .col-action {
    width: 32px;
  }

  .sc-table td {
    padding: var(--spacing-1) var(--spacing-2);
    vertical-align: top;
  }

  .sc-input {
    width: 100%;
    padding: var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 13px;
    outline: none;
    transition: border-color 0.12s;
  }

  .sc-input:focus {
    border-color: var(--color-wire-focus);
  }

  .sc-input::placeholder {
    color: var(--color-ink-ghost);
    font-style: italic;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-top: 2px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-ink-ghost);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .remove-btn:hover {
    border-color: var(--color-score-low);
    color: var(--color-score-low);
    background: color-mix(in srgb, var(--color-score-low) 8%, transparent);
  }

  .add-btn {
    align-self: flex-start;
    padding: var(--spacing-1) var(--spacing-3);
    background: transparent;
    border: 1px dashed var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .add-btn:hover {
    border-color: var(--color-vekt);
    color: var(--color-vekt);
  }
</style>
