<script lang="ts">
  import {
    PROSEDYRER,
    calcFrister,
    fmtDateShort,
    type ProsedyreId,
    type FristType,
  } from '$lib/data/frist-config';
  import FormField from '$lib/components/registrering/FormField.svelte';
  import RadioCards from '$lib/components/registrering/RadioCards.svelte';
  import ToolHeader from '$lib/components/verktoy/ToolHeader.svelte';

  let prosedyre = $state<ProsedyreId | ''>('');
  let kunngjoring = $state('');
  let veiledende = $state(false);
  let hast = $state(false);
  let elektronisk = $state(true);

  const frister = $derived(
    prosedyre && kunngjoring
      ? calcFrister(prosedyre as ProsedyreId, kunngjoring, veiledende, hast, elektronisk)
      : []
  );

  const totalDager = $derived(
    frister.length >= 2
      ? Math.round(
          (frister[frister.length - 1].date.getTime() - frister[0].date.getTime()) / 86_400_000
        )
      : 0
  );

  const typeColors: Record<FristType, string> = {
    start: 'var(--color-ink)',
    deadline: 'var(--color-vekt)',
    milestone: 'var(--color-score-high)',
    info: 'var(--color-ink-muted)',
    soft: 'var(--color-ink-ghost)',
  };
</script>

<ToolHeader title="Fristberegner" ref="FOA §§ 20-1 til 20-7, 25-2" />

<div class="tool-body">
  <FormField label="Prosedyre">
    <div class="prosedyre-cards">
      {#each PROSEDYRER as p}
        {@const sel = prosedyre === p.id}
        <button class="p-card" class:selected={sel} onclick={() => (prosedyre = p.id)}>
          <div class="p-label">{p.label}</div>
          <div class="p-ref">{p.ref} · {p.del}</div>
        </button>
      {/each}
    </div>
  </FormField>

  <div class="options-row">
    <div class="date-col">
      <FormField label="Kunngjøringsdato">
        <input class="input mono" type="date" bind:value={kunngjoring} />
      </FormField>
    </div>
    <div class="checks">
      <label class="check-label">
        <input type="checkbox" bind:checked={elektronisk} /> Elektronisk kommunikasjon
      </label>
      {#if prosedyre !== 'del2'}
        <label class="check-label">
          <input type="checkbox" bind:checked={veiledende} /> Veiledende kunngjøring
        </label>
        <label class="check-label" class:hast-active={hast}>
          <input type="checkbox" bind:checked={hast} /> Hastetilfelle
        </label>
      {/if}
    </div>
  </div>

  {#if frister.length > 0}
    <div class="timeline-section">
      <div class="timeline-header">
        <span class="timeline-label">Tidslinje</span>
        <span class="timeline-total">Totalt ca. {totalDager} dager</span>
      </div>

      <div class="timeline">
        <div class="timeline-line"></div>
        {#each frister as f, i}
          {@const dager =
            i > 0 ? Math.round((f.date.getTime() - frister[i - 1].date.getTime()) / 86_400_000) : 0}
          {#if dager > 0}
            <div class="gap-indicator">+{dager} dager</div>
          {/if}
          <div class="node-row">
            <div
              class="node-dot"
              class:dot-milestone={f.type === 'milestone'}
              class:dot-start={f.type === 'start'}
              style:border-color={typeColors[f.type]}
              style:background={f.type === 'milestone'
                ? 'var(--color-score-high)'
                : f.type === 'start'
                  ? 'var(--color-ink)'
                  : 'var(--color-felt)'}
            ></div>
            <div class="node-content">
              <div class="node-main">
                <span class="node-date" style:color={typeColors[f.type]}
                  >{fmtDateShort(f.date)}</span
                >
                <span class="node-label" class:node-milestone={f.type === 'milestone'}
                  >{f.label}</span
                >
                {#if f.ref}<span class="node-ref">{f.ref}</span>{/if}
              </div>
              {#if f.note}
                <p class="node-note">{f.note}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if hast}
        <div class="note warn">
          <strong>Hastetilfelle:</strong> Forkortede frister forutsetter at det er umulig å overholde
          ordinære frister. Kontraktens omfang skal ikke være større enn strengt nødvendig.
        </div>
      {/if}

      <p class="disclaimer">
        Tidslinjen viser minimumsfrister etter forskriften. Estimerte datoer (evaluering,
        forhandlinger) er veiledende og vil variere etter anskaffelsens kompleksitet.
      </p>
    </div>
  {/if}
</div>

<style>
  .tool-body {
    max-width: 800px;
    margin: 24px auto;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 8px rgba(30, 37, 48, 0.06);
    padding: 28px 32px;
  }

  .prosedyre-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .p-card {
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
  }

  .p-card.selected {
    border: 1.5px solid var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .p-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }
  .p-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    margin-top: 2px;
  }

  .options-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .date-col {
    flex: 0 0 180px;
  }

  .checks {
    display: flex;
    gap: 14px;
    padding-bottom: 18px;
  }

  .check-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
  }

  .hast-active {
    color: var(--color-warn);
  }

  input[type='checkbox'] {
    accent-color: var(--color-vekt);
  }

  .input {
    width: 100%;
    padding: 6px 9px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink);
    background: #fff;
    outline: none;
  }

  .input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px rgba(43, 107, 127, 0.08);
  }

  .timeline-section {
    margin-top: 20px;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 14px;
  }

  .timeline-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .timeline-total {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .timeline {
    position: relative;
    padding-left: 20px;
  }

  .timeline-line {
    position: absolute;
    left: 7px;
    top: 4px;
    bottom: 4px;
    width: 1px;
    background: var(--color-wire);
  }

  .gap-indicator {
    padding: 4px 0 4px 20px;
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  .node-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 6px 0;
    position: relative;
  }

  .node-dot {
    position: absolute;
    left: -20px;
    margin-top: 3px;
    width: 14px;
    height: 14px;
    border-radius: 7px;
    border: 2px solid;
    z-index: 1;
  }

  .node-dot.dot-milestone {
    border-radius: 2px;
  }

  .node-content {
    padding-left: 0;
    flex: 1;
  }

  .node-main {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .node-date {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 500;
    min-width: 80px;
  }

  .node-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .node-label.node-milestone {
    font-weight: 700;
    color: var(--color-score-high);
  }

  .node-ref {
    font-size: 9px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  .node-note {
    font-size: 10px;
    color: var(--color-ink-ghost);
    margin-top: 2px;
    padding-left: 88px;
  }

  .note {
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.5;
  }

  .note.warn {
    background: var(--color-warn-bg);
    border: 1px solid color-mix(in srgb, var(--color-warn), transparent 60%);
    color: var(--color-warn);
  }

  .disclaimer {
    margin-top: 14px;
    font-size: 10px;
    color: var(--color-ink-ghost);
    line-height: 1.5;
    font-style: italic;
  }
</style>
