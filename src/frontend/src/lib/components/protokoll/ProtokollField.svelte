<script lang="ts">
  import { protokoll, type Avvisning } from '$lib/stores/protokoll.svelte';
  import type { ResolvedSection } from '$lib/stores/protokoll.svelte';
  import InfoTable from './InfoTable.svelte';
  import SupplierList from './SupplierList.svelte';
  import CheckboxTextarea from './CheckboxTextarea.svelte';
  import PerSupplierCards from './PerSupplierCards.svelte';
  import AvvisningCard from './AvvisningCard.svelte';
  import DataQualityTable from './DataQualityTable.svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import CodelistSelect from './CodelistSelect.svelte';
  import DateInput from './DateInput.svelte';
  import EvaluationSummaryTable from './EvaluationSummaryTable.svelte';
  import JustificationGenerator from './JustificationGenerator.svelte';
  import type { InfoRow } from '$lib/utils/protokoll-info-rows';
  import { addDays } from '$lib/utils/protokoll-helpers';
  import type { FieldType } from '$lib/stores/protokoll-sections';

  interface Props {
    field: { key: string; type: FieldType; label: string; hint?: string; foaRef?: string; codelistId?: string };
    infoRows: InfoRow[];
    suppliers: { id: string; name: string }[];
    rejectedSuppliers: { id: string; name: string }[];
  }

  let { field, infoRows, suppliers, rejectedSuppliers }: Props = $props();

  function handleKarensShortcut() {
    const meddelelse = protokoll.manual.meddelelseDato;
    if (meddelelse) {
      protokoll.setManualField('karensperiodeUtlop', addDays(meddelelse, 10));
    }
  }
</script>

{#if field.type === 'info-table'}
  <InfoTable rows={infoRows} label={field.label} />
{:else if field.type === 'supplier-list'}
  <SupplierList {suppliers} label={field.label} />
{:else if field.type === 'textarea'}
  <div class="manual-field">
    <div class="field-label">{field.label}</div>
    <textarea
      class="field-textarea"
      value={(protokoll.manual[field.key] as string) ?? ''}
      oninput={(e) => protokoll.setManualField(field.key, (e.target as HTMLTextAreaElement).value)}
      placeholder="Skriv her..."
      rows="3"
    ></textarea>
    <div class="field-footer">
      <span class="char-count">{((protokoll.manual[field.key] as string) ?? '').length} tegn</span>
      {#if field.hint}
        <span class="field-hint">{field.hint}</span>
      {/if}
    </div>
  </div>
{:else if field.type === 'date'}
  <div class="manual-field">
    <DateInput
      value={(protokoll.manual[field.key] as string) ?? ''}
      label={field.label}
      hint={field.hint}
      onchange={(v) => protokoll.setManualField(field.key, v)}
    />
    {#if field.key === 'karensperiodeUtlop'}
      <button
        class="shortcut-btn"
        disabled={!protokoll.manual.meddelelseDato}
        onclick={handleKarensShortcut}
        title={protokoll.manual.meddelelseDato
          ? `Beregn ${addDays(protokoll.manual.meddelelseDato, 10)} (meddelelse + 10 dager)`
          : 'Angi dato for meddelsesbrev først'}
      >
        +10 dager
      </button>
    {/if}
  </div>
{:else if field.type === 'codelist-select' && field.codelistId}
  <CodelistSelect
    value={(protokoll.manual[field.key] as string) ?? ''}
    codelistId={field.codelistId}
    label={field.label}
    hint={field.hint}
    foaRef={field.foaRef}
    onchange={(v) => protokoll.setManualField(field.key, v)}
  />
{:else if field.type === 'richtext'}
  <div class="manual-field">
    <div class="field-label">{field.label}</div>
    <RichTextEditor
      body={(protokoll.manual[field.key] as string) || '<p></p>'}
      placeholder="Skriv her..."
      hint={field.hint ?? ''}
      onchange={(html) => protokoll.setManualField(field.key, html)}
    />
  </div>
{:else if field.type === 'checkbox-textarea'}
  <CheckboxTextarea
    checked={!!protokoll.manual[field.key]}
    begrunnelse={(protokoll.manual[`${field.key}Begrunnelse`] as string) ?? ''}
    label={field.label}
    foaRef={field.foaRef}
    hint={field.hint}
    onchange={(c, b) => {
      protokoll.setManualField(field.key, c);
      protokoll.setManualField(`${field.key}Begrunnelse`, b);
    }}
  />
{:else if field.type === 'per-supplier-textarea' || field.type === 'per-supplier-richtext'}
  <PerSupplierCards
    {suppliers}
    values={(protokoll.manual[field.key] as Record<string, string>) ?? {}}
    useRichtext={field.type === 'per-supplier-richtext'}
    label={field.label}
    hint={field.hint}
    onchange={(sid, val) => protokoll.setPerSupplierField(field.key, sid, val)}
  />
{:else if field.type === 'avvisning-card'}
  <AvvisningCard
    suppliers={rejectedSuppliers}
    avvisninger={(protokoll.manual[field.key] as Record<string, Avvisning>) ?? {}}
    isDel2={protokoll.isDel2}
    foaRef={field.foaRef}
    hint={field.hint}
    onchange={(sid, avv) => protokoll.setAvvisning(field.key, sid, avv)}
  />
{:else if field.type === 'data-quality-table'}
  <DataQualityTable sections={protokoll.sections} />
{:else if field.type === 'evaluation-summary'}
  <EvaluationSummaryTable />
{:else if field.type === 'justification-generator'}
  <JustificationGenerator fieldKey={field.key} label={field.label} hint={field.hint} />
{/if}

<style>
  .manual-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .field-textarea {
    width: 100%;
    min-height: 80px;
    padding: var(--spacing-3);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
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
    justify-content: space-between;
    gap: var(--spacing-2);
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
    text-align: right;
  }

  .shortcut-btn {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-vekt);
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.12s,
      border-color 0.12s;
  }

  .shortcut-btn:hover:not(:disabled) {
    background: var(--color-vekt-bg);
    border-color: var(--color-vekt-bg-strong);
  }

  .shortcut-btn:disabled {
    color: var(--color-ink-ghost);
    cursor: not-allowed;
  }

  .shortcut-btn:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
  }
</style>
