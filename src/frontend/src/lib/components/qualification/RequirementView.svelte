<script lang="ts">
  import { qualification } from '$lib/stores/qualification.svelte';
  import AutoTextarea from '$lib/components/shared/AutoTextarea.svelte';

  interface Props {
    requirementId: string;
  }

  let { requirementId }: Props = $props();

  let nav = $derived.by(() => {
    const reqs = qualification.data.requirements;
    const index = reqs.findIndex((r) => r.id === requirementId);
    return {
      requirement: reqs[index],
      prev: index > 0 ? reqs[index - 1] : null,
      next: index < reqs.length - 1 ? reqs[index + 1] : null,
    };
  });

  let requirement = $derived(nav.requirement);
  let prevReq = $derived(nav.prev);
  let nextReq = $derived(nav.next);

  let addingFor = $state<string | null>(null);
  let newEntityName = $state('');
  let focusId = $state<string | null>(null);

  function handleAdd(supplierId: string) {
    if (!newEntityName.trim()) return;
    qualification.addSupportEntity(requirement.id, supplierId, newEntityName.trim());
    newEntityName = '';
    addingFor = null;
  }
</script>

<!-- Navigation bar -->
<div class="req-nav">
  <button class="nav-back" onclick={() => qualification.setActiveView('overview')}>
    ← Oversikt
  </button>
  <div class="nav-center">
    {#if prevReq}
      <button
        class="nav-arrow"
        onclick={() => qualification.setActiveView(prevReq.id)}
        title={prevReq.name}>‹</button
      >
    {/if}
    <span class="nav-title">{requirement.name}</span>
    {#if nextReq}
      <button
        class="nav-arrow"
        onclick={() => qualification.setActiveView(nextReq.id)}
        title={nextReq.name}>›</button
      >
    {/if}
  </div>
  <div class="nav-spacer"></div>
</div>

{#if requirement.description}
  <p class="req-description">{requirement.description}</p>
{/if}

<!-- Leverandørrader -->
<div class="rows-container">
  <!-- Sticky header -->
  <div class="rows-header">
    <span class="col-supplier">Leverandør</span>
    <span class="col-espd">ESPD</span>
    <span class="col-basis">Grunnlag</span>
    <span class="col-verdict">Verdikt</span>
    <span class="col-note">Begrunnelse</span>
  </div>

  {#each qualification.data.suppliers as supplier (supplier.id)}
    {@const a = requirement.assessments[supplier.id]}
    {@const espd = a?.espdSubmitted ?? false}
    {@const basis = a?.basis ?? 'own'}
    {@const entities = a?.supportEntities ?? []}
    {@const verdict = a?.verdict ?? 'not_assessed'}
    {@const isFocus = focusId === supplier.id}

    <!-- Leverandørrad -->
    <div class="vrow vrow-separator" class:vrow-focus={isFocus}>
      <div class="col-supplier">
        <span class="supplier-name">{supplier.name}</span>
      </div>

      <div class="col-espd">
        <button
          class="toggle-btn"
          class:toggle-on={espd}
          onclick={() => qualification.setEspd(requirement.id, supplier.id, !espd)}
        >
          {espd ? '✓' : '—'}
        </button>
      </div>

      <div class="col-basis">
        <div class="basis-toggle">
          <button
            class="basis-btn"
            class:basis-active={basis === 'own'}
            onclick={() => qualification.setBasis(requirement.id, supplier.id, 'own')}
            >Egen</button
          >
          <button
            class="basis-btn"
            class:basis-active={basis === 'supported'}
            onclick={() => qualification.setBasis(requirement.id, supplier.id, 'supported')}
            >Støtte</button
          >
        </div>
      </div>

      <div class="col-verdict">
        <button
          class="verdict-btn"
          class:verdict-met={verdict === 'met'}
          class:verdict-not-met={verdict === 'not_met'}
          onclick={() => {
            const next =
              verdict === 'not_assessed' ? 'met' : verdict === 'met' ? 'not_met' : 'not_assessed';
            qualification.setVerdict(requirement.id, supplier.id, next);
          }}
        >
          {#if verdict === 'met'}✓{:else if verdict === 'not_met'}✗{:else}—{/if}
        </button>
      </div>

      <div class="col-note">
        <AutoTextarea
          value={a?.notes ?? ''}
          oninput={(v) => qualification.setNote(requirement.id, supplier.id, v)}
          placeholder="Begrunnelse for {supplier.name}..."
          onfocus={() => (focusId = supplier.id)}
        />
      </div>
    </div>

    <!-- Støttevirksomheter -->
    {#if basis === 'supported'}
      {#each entities as entity (entity.id)}
        <div class="vrow vrow-entity" class:vrow-focus={isFocus}>
          <div class="col-supplier col-entity-name">
            <span class="entity-indent">├</span>
            <span class="entity-name">{entity.name}</span>
            <input
              class="entity-scope-input"
              type="text"
              value={entity.scope}
              oninput={(e) =>
                qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, {
                  scope: e.currentTarget.value,
                })}
              placeholder="Omfang..."
            />
            <button
              class="entity-remove"
              onclick={() =>
                qualification.removeSupportEntity(requirement.id, supplier.id, entity.id)}
              title="Fjern">×</button
            >
          </div>
          <div class="col-espd">
            <button
              class="toggle-btn toggle-sm"
              class:toggle-on={entity.espdSubmitted}
              onclick={() =>
                qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, {
                  espdSubmitted: !entity.espdSubmitted,
                })}
              title="ESPD">{entity.espdSubmitted ? '✓' : '—'}</button
            >
          </div>
          <div class="col-basis col-commitment">
            <button
              class="toggle-btn toggle-sm"
              class:toggle-on={entity.commitmentSubmitted}
              onclick={() =>
                qualification.updateSupportEntity(requirement.id, supplier.id, entity.id, {
                  commitmentSubmitted: !entity.commitmentSubmitted,
                })}
              title="Forpliktelseserklæring"
              >{entity.commitmentSubmitted ? '✓ F' : '— F'}</button
            >
          </div>
          <div class="col-verdict"></div>
          <div class="col-note"></div>
        </div>
      {/each}

      <!-- Legg til støttevirksomhet -->
      <div class="vrow vrow-add vrow-separator-strong" class:vrow-focus={isFocus}>
        <div class="col-add">
          {#if addingFor === supplier.id}
            <div class="add-form">
              <span class="entity-indent">└</span>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="add-input"
                type="text"
                placeholder="Virksomhetsnavn..."
                bind:value={newEntityName}
                onkeydown={(e) => {
                  if (e.key === 'Enter') handleAdd(supplier.id);
                  if (e.key === 'Escape') addingFor = null;
                }}
                autofocus
              />
              <button class="add-confirm" onclick={() => handleAdd(supplier.id)}>Legg til</button>
              <button class="add-cancel" onclick={() => (addingFor = null)}>×</button>
            </div>
          {:else}
            <button
              class="add-btn"
              onclick={() => {
                addingFor = supplier.id;
                newEntityName = '';
              }}
            >
              <span class="entity-indent">└</span> + Legg til støttevirksomhet
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  /* ── Navigation bar ── */
  .req-nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-5);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
  }

  .nav-back {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: all 0.1s;
  }

  .nav-back:hover {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }
  .nav-back:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .nav-center {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex: 1;
    justify-content: center;
  }

  .nav-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.01em;
  }

  .nav-arrow {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: all 0.1s;
    line-height: 1;
  }

  .nav-arrow:hover {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }
  .nav-arrow:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .nav-spacer {
    width: 80px;
  }

  .req-description {
    font-size: 12px;
    color: var(--color-ink-muted);
    line-height: 1.5;
    margin: 0 0 var(--spacing-4) 0;
  }

  /* ── Rows container (VerticalRows-mønster) ── */
  .rows-container {
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-wire);
  }

  /* ── Sticky header ── */
  .rows-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
    font-size: 10px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-ui);
  }

  /* ── Shared columns ── */
  .col-supplier {
    width: 180px;
    flex-shrink: 0;
  }
  .col-espd {
    width: 72px;
    flex-shrink: 0;
    text-align: center;
    display: flex;
    justify-content: center;
  }
  .col-basis {
    width: 140px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }
  .col-verdict {
    width: 72px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }
  .col-note {
    flex: 1;
    min-width: 0;
  }
  .col-add {
    flex: 1;
    min-width: 0;
  }

  /* ── Vrow ── */
  .vrow {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--color-felt);
    transition: background 0.15s;
  }

  .vrow:hover:not(.vrow-focus) {
    background: var(--color-felt-hover);
  }

  .vrow-focus {
    background: var(--color-vekt-bg);
  }

  .vrow-separator {
    border-top: 1px solid var(--color-wire);
  }

  .vrow-separator-strong {
    border-top: 2px solid var(--color-wire-strong);
  }

  /* ── Entity sub-rows ── */
  .vrow-entity {
    padding-top: var(--spacing-1);
    padding-bottom: var(--spacing-1);
  }

  .col-entity-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    overflow: hidden;
  }

  .col-commitment {
    justify-content: center;
  }

  /* ── Supplier name ── */
  .supplier-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Entity name ── */
  .entity-indent {
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
    font-size: 11px;
    flex-shrink: 0;
  }

  .entity-name {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    white-space: nowrap;
  }

  .entity-scope-input {
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-bottom: 1px solid transparent;
    outline: none;
    padding: 0 var(--spacing-1);
    min-width: 0;
    flex: 1;
    transition:
      border-color 0.12s,
      color 0.12s;
  }

  .entity-scope-input:hover {
    border-bottom-color: var(--color-wire);
  }

  .entity-scope-input:focus {
    color: var(--color-ink-secondary);
    border-bottom-color: var(--color-wire-focus);
  }

  .entity-scope-input::placeholder {
    color: var(--color-ink-ghost);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .vrow-entity:hover .entity-scope-input::placeholder {
    opacity: 1;
  }

  .entity-remove {
    font-size: 13px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 var(--spacing-1);
    opacity: 0;
    flex-shrink: 0;
    transition:
      opacity 0.1s,
      color 0.1s;
  }

  .vrow-entity:hover .entity-remove {
    opacity: 1;
  }

  .entity-remove:hover {
    color: var(--color-score-low);
  }

  /* ── ESPD / Verdict toggles ── */
  .toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 700;
    background: var(--color-felt-active);
    color: var(--color-ink-ghost);
    border: none;
    cursor: pointer;
    transition: all 0.12s;
  }

  .toggle-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink-muted);
  }

  .toggle-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .toggle-on {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
  }

  .toggle-sm {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }

  /* ── Verdict button ── */
  .verdict-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    font-size: 15px;
    font-weight: 700;
    background: var(--color-felt-active);
    color: var(--color-ink-ghost);
    border: none;
    cursor: pointer;
    transition: all 0.12s;
  }

  .verdict-btn:hover {
    background: var(--color-felt-hover);
  }

  .verdict-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .verdict-met {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
  }

  .verdict-not-met {
    background: var(--color-score-low-bg);
    color: var(--color-score-low);
  }

  /* ── Basis toggle ── */
  .basis-toggle {
    display: inline-flex;
    gap: 1px;
    background: var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .basis-btn {
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border: none;
    cursor: pointer;
    transition: all 0.12s;
  }

  .basis-btn:hover {
    color: var(--color-ink);
  }

  .basis-btn:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .basis-active {
    background: var(--color-felt-active);
    color: var(--color-ink);
    font-weight: 600;
  }

  /* ── Add entity ── */
  .vrow-add {
    padding-top: var(--spacing-1);
    padding-bottom: var(--spacing-1);
  }

  .add-form {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .add-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1) 0;
    transition: color 0.1s;
  }

  .add-btn:hover {
    color: var(--color-ink-muted);
  }

  .add-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    border-radius: var(--radius-sm);
  }

  .add-input {
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 11px;
    outline: none;
    width: 180px;
  }

  .add-input:focus {
    border-color: var(--color-wire-focus);
  }

  .add-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .add-confirm {
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    background: var(--color-felt-active);
    color: var(--color-ink);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.1s;
  }

  .add-confirm:hover {
    background: var(--color-felt-hover);
  }

  .add-confirm:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .add-cancel {
    font-size: 14px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 var(--spacing-1);
    border-radius: var(--radius-sm);
    transition: color 0.1s;
  }

  .add-cancel:hover {
    color: var(--color-score-low);
  }

  .add-cancel:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }
</style>
