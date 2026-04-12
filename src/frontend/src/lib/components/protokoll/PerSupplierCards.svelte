<script lang="ts">
  import RichTextEditor from './RichTextEditor.svelte';

  interface Supplier {
    id: string;
    name: string;
  }

  interface Props {
    suppliers: Supplier[];
    values: Record<string, string>;
    useRichtext?: boolean;
    label?: string;
    hint?: string;
    onchange: (supplierId: string, value: string) => void;
  }

  let { suppliers, values, useRichtext = false, label = '', hint = '', onchange }: Props = $props();
</script>

{#if label}
  <div class="field-label">{label}</div>
{/if}

<div class="supplier-cards">
  {#each suppliers as supplier (supplier.id)}
    {@const val = values[supplier.id] ?? ''}
    <div
      class="supplier-card"
      class:supplier-card-filled={val.replace(/<[^>]*>/g, '').trim().length > 0}
    >
      <div class="supplier-card-header">
        <span class="supplier-name">{supplier.name}</span>
      </div>

      {#if useRichtext}
        <RichTextEditor
          body={val || '<p></p>'}
          maxHeight="40vh"
          placeholder="Skriv begrunnelse for {supplier.name}..."
          onchange={(html) => onchange(supplier.id, html)}
        />
      {:else}
        <textarea
          class="field-textarea"
          value={val}
          oninput={(e) => onchange(supplier.id, (e.target as HTMLTextAreaElement).value)}
          placeholder="Skriv vurdering for {supplier.name}..."
          rows="3"
        ></textarea>
        <div class="field-footer">
          <span class="char-count">{val.length} tegn</span>
        </div>
      {/if}
    </div>
  {/each}

  {#if suppliers.length === 0}
    <div class="cards-empty">Ingen leverandører</div>
  {/if}

  {#if hint}
    <div class="field-hint">{hint}</div>
  {/if}
</div>

<style>
  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-2);
  }

  .supplier-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .supplier-card {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-left: 3px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-sm);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .supplier-card-filled {
    border-left-color: var(--color-vekt);
  }

  .supplier-card-header {
    display: flex;
    align-items: center;
  }

  .supplier-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .field-textarea {
    width: 100%;
    min-height: 80px;
    padding: var(--spacing-3);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.5;
    outline: none;
    resize: vertical;
    transition: border-color 0.12s;
    field-sizing: content;
  }

  .field-textarea:focus {
    border-color: var(--color-wire-focus);
  }

  .field-textarea::placeholder {
    color: var(--color-ink-ghost);
    font-style: italic;
  }

  .field-footer {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
  }

  .char-count {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .field-hint {
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .cards-empty {
    font-size: 12px;
    color: var(--color-ink-muted);
    font-style: italic;
    padding: var(--spacing-3);
  }
</style>
