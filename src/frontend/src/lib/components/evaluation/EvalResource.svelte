<script lang="ts">
  import { evaluation, weightedItemScore } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import ScoreField from './ScoreField.svelte';
  import AutoTextarea from './AutoTextarea.svelte';
  import VerticalRows from './VerticalRows.svelte';
  import SamletVurdering from './SamletVurdering.svelte';
  import { scoreColor, fS } from './shared';

  let { criterion }: { criterion: Criterion } = $props();

  let suppliers = $derived(evaluation.data.suppliers);
  let useVertical = $derived(suppliers.length >= 5);
  let compact = $derived(suppliers.length > 3);
  let roles = $derived(criterion.roles ?? []);
  let moments = $derived(criterion.subcriteria);
  let activeRoleId = $state('');

  let activeRole = $derived(roles.find((r) => r.id === activeRoleId) ?? roles[0] ?? null);

  /** Get the item for a supplier + role. */
  function getItem(supplierId: string, roleId: string) {
    return criterion.items?.[supplierId]?.find((it) => it.roleId === roleId);
  }

  /** Person score for a supplier+role = weighted average of moments. */
  function personScore(supplierId: string, roleId: string): number | null {
    const item = getItem(supplierId, roleId);
    if (!item) return null;
    const dims = moments.map((m) => ({ id: m.id, weight: m.weight }));
    const hasAny = dims.some((d) => item.scores[d.id] != null);
    if (!hasAny) return null;
    return weightedItemScore(item, dims);
  }

  /** Criterion-level score for a supplier (average of all role scores). */
  function criterionScore(supplierId: string): number | null {
    const gs = evaluation.groupScores[criterion.id];
    return gs?.[supplierId] ?? null;
  }
</script>

<!-- Role tabs -->
<div class="role-tabs">
  {#each roles as role (role.id)}
    {@const filled = suppliers.filter((s) => {
      const item = getItem(s.id, role.id);
      return item && moments.every((m) => item.scores?.[m.id] != null);
    }).length}
    <button
      class="role-tab"
      class:role-tab-active={activeRole?.id === role.id}
      onclick={() => (activeRoleId = role.id)}
    >
      {role.name}
      <span class="role-tab-count" class:role-tab-done={filled === suppliers.length}>
        {filled}/{suppliers.length}
      </span>
    </button>
  {/each}
</div>

<!-- Supplier evaluation for active role -->
{#if activeRole}
  {#if useVertical}
    <VerticalRows
      {suppliers}
      scoreFn={(id) => personScore(id, activeRole!.id)}
      rowClass="vrow-res"
      sortScoreLabel="Etter snitt"
    >
      {#snippet headerColumns()}
        {#each moments as dim (dim.id)}
          <span class="vrow-col-dim">
            {dim.name}<br />
            <span class="vrow-col-dim-weight">{dim.weight}%</span>
          </span>
        {/each}
        <span class="vrow-col-avg">Snitt</span>
        <span class="vrow-col-note">Begrunnelse</span>
      {/snippet}
      {#snippet row({ supplier: lev, setFocus })}
        {@const item = getItem(lev.id, activeRole!.id)}
        {@const avg = personScore(lev.id, activeRole!.id)}
        <div class="vrow-supplier">
          <div class="vrow-supplier-name">{lev.name.split(' ')[0] ?? lev.name}</div>
          <input
            class="vrow-person-input"
            type="text"
            value={item?.label ?? ''}
            oninput={(e) =>
              evaluation.setRoleLabel(
                criterion.id,
                lev.id,
                activeRole!.id,
                e.currentTarget.value
              )}
            onfocus={setFocus}
            placeholder="Person"
          />
        </div>
        {#each moments as dim (dim.id)}
          <div class="vrow-dim">
            <ScoreField
              size="small"
              value={item?.scores?.[dim.id] ?? null}
              onchange={(v) => {
                if (v != null)
                  evaluation.setRoleScore(criterion.id, lev.id, activeRole!.id, dim.id, v);
              }}
            />
          </div>
        {/each}
        <div class="vrow-avg">
          <span class="vrow-avg-value" style:color={scoreColor(avg)}>{fS(avg)}</span>
        </div>
        <div class="vrow-note">
          <AutoTextarea
            value={item?.note ?? ''}
            oninput={(v) =>
              evaluation.setRoleResourceNote(criterion.id, lev.id, activeRole!.id, v)}
            placeholder="Begrunnelse..."
            onfocus={setFocus}
          />
        </div>
      {/snippet}
    </VerticalRows>
  {:else}
    <!-- Card grid for ≤4 suppliers -->
    <div
      class="cards-grid"
      style:--card-columns="repeat({suppliers.length}, minmax({compact ? '185px' : '210px'}, 1fr))"
    >
      {#each suppliers as lev (lev.id)}
        {@const item = getItem(lev.id, activeRole.id)}
        {@const avg = personScore(lev.id, activeRole.id)}
        <div class="card">
          <div class="card-supplier">
            {compact ? (lev.name.split(' ')[0] ?? lev.name) : lev.name}
          </div>

          <input
            class="card-person"
            type="text"
            value={item?.label ?? ''}
            oninput={(e) =>
              evaluation.setRoleLabel(
                criterion.id,
                lev.id,
                activeRole!.id,
                e.currentTarget.value
              )}
            placeholder="Personens navn"
          />

          {#each moments as dim (dim.id)}
            <div class="dim-row">
              <span class="dim-label">{dim.name}</span>
              <span class="dim-weight">{dim.weight}%</span>
              <ScoreField
                size="small"
                value={item?.scores?.[dim.id] ?? null}
                onchange={(v) => {
                  if (v != null)
                    evaluation.setRoleScore(criterion.id, lev.id, activeRole!.id, dim.id, v);
                }}
              />
            </div>
          {/each}

          <div class="card-avg">
            <span class="card-avg-label">Snitt</span>
            <span class="card-avg-value" style:color={scoreColor(avg)}>{fS(avg)}</span>
          </div>

          <textarea
            class="card-textarea"
            value={item?.note ?? ''}
            oninput={(e) =>
              evaluation.setRoleResourceNote(
                criterion.id,
                lev.id,
                activeRole!.id,
                e.currentTarget.value
              )}
            placeholder="Begrunnelse for denne rollen..."
            rows="2"
          ></textarea>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<!-- Summary table: all roles -->
<div class="summary">
  <div class="summary-label">Alle roller – personscore</div>
  <div class="summary-scroll">
    <table class="summary-table">
      <thead>
        <tr>
          <th class="th" style="width: 130px;">Rolle</th>
          {#each suppliers as lev (lev.id)}
            <th class="th th-center">{compact ? (lev.name.split(' ')[0] ?? lev.name) : lev.name}</th
            >
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each roles as role (role.id)}
          <tr class:row-active={role.id === activeRole?.id}>
            <td class="td">{role.name}</td>
            {#each suppliers as lev (lev.id)}
              {@const ps = personScore(lev.id, role.id)}
              {@const item = getItem(lev.id, role.id)}
              <td class="td td-center">
                <div class="td-score" style:color={scoreColor(ps)}>{fS(ps)}</div>
                {#if item?.label}
                  <div class="td-person">{item.label}</div>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
        <tr class="row-total">
          <td class="td td-bold">Kriteriescore</td>
          {#each suppliers as lev (lev.id)}
            {@const v = criterionScore(lev.id)}
            <td class="td td-center">
              <span class="td-total" style:color={scoreColor(v)}>{fS(v)}</span>
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
</div>

<SamletVurdering label={criterion.name} criterionId={criterion.id} {criterion} />

<style>
  /* ── Role tabs ── */
  .role-tabs {
    display: flex;
    align-items: center;
    gap: 0;
    border-bottom: 1px solid var(--color-wire);
    margin-bottom: var(--spacing-4);
  }

  .role-tab {
    padding: var(--spacing-2) var(--spacing-4);
    border: none;
    cursor: pointer;
    background: transparent;
    border-bottom: 2px solid transparent;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    transition: all 0.12s;
  }

  .role-tab-active {
    background: var(--color-felt);
    border-bottom-color: var(--color-vekt);
    font-weight: 700;
    color: var(--color-ink);
  }

  .role-tab:hover:not(.role-tab-active) {
    color: var(--color-ink-secondary);
  }

  .role-tab-count {
    font-size: 9px;
    font-family: var(--font-data);
    margin-left: var(--spacing-2);
    color: var(--color-ink-ghost);
  }

  .role-tab-done {
    color: var(--color-score-high);
  }

  /* ── Vertical row content (Resource-specific) ── */
  .vrow-col-dim {
    width: 52px;
    text-align: center;
    flex-shrink: 0;
    font-size: 9px;
    line-height: 1.3;
  }

  .vrow-col-dim-weight {
    font-weight: 400;
    opacity: 0.7;
  }

  .vrow-col-avg {
    width: 48px;
    text-align: center;
    flex-shrink: 0;
    font-size: 9px;
  }

  .vrow-col-note {
    flex: 1;
  }

  :global(.vrow-res) {
    align-items: flex-start;
    padding-top: var(--spacing-3);
    padding-bottom: var(--spacing-3);
  }

  .vrow-supplier {
    width: 150px;
    flex-shrink: 0;
  }

  .vrow-supplier-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .vrow-person-input {
    width: 100%;
    padding: 2px 0;
    border: none;
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    color: var(--color-vekt);
    font-family: var(--font-ui);
    font-weight: 500;
    background: transparent;
    outline: none;
    margin-top: 3px;
  }

  .vrow-person-input:focus {
    border-bottom-color: var(--color-vekt);
  }

  .vrow-dim {
    width: 52px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }

  .vrow-avg {
    width: 48px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .vrow-avg-value {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
  }

  .vrow-note {
    flex: 1;
    max-width: 440px;
  }

  /* ── Card grid layout ── */
  .cards-grid {
    display: grid;
    grid-template-columns: var(--card-columns);
    gap: var(--spacing-3);
    padding-bottom: 2px;
    overflow-x: auto;
  }

  .card {
    padding: var(--spacing-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
  }

  .card-supplier {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
    margin-bottom: var(--spacing-2);
  }

  .card-person {
    width: 100%;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    font-size: 12px;
    color: var(--color-vekt);
    font-family: var(--font-ui);
    font-weight: 500;
    background: var(--color-felt);
    outline: none;
    margin-bottom: var(--spacing-3);
  }

  .card-person:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .dim-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-1) 0;
    border-top: 1px solid var(--color-wire);
  }

  .dim-label {
    font-size: 11px;
    color: var(--color-ink);
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dim-weight {
    font-size: 9px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    margin: 0 var(--spacing-2);
    flex-shrink: 0;
  }

  .card-avg {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0 0;
    margin-top: var(--spacing-1);
    border-top: 1.5px solid var(--color-wire-strong);
  }

  .card-avg-label {
    font-size: 11px;
    font-weight: 700;
  }

  .card-avg-value {
    font-family: var(--font-data);
    font-size: 14px;
    font-weight: 700;
  }

  .card-textarea {
    width: 100%;
    margin-top: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    line-height: 1.55;
    resize: vertical;
    outline: none;
  }

  .card-textarea:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  /* ── Summary table ── */
  .summary {
    margin-top: var(--spacing-5);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
  }

  .summary-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--spacing-2);
  }

  .summary-scroll {
    overflow-x: auto;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
  }

  .th {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-ui);
    border-bottom: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
    white-space: nowrap;
  }

  .th-center {
    text-align: center;
  }

  .td {
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    border-bottom: 1px solid var(--color-wire);
    vertical-align: middle;
    font-size: 12px;
  }

  .td-center {
    text-align: center;
  }

  .td-score {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 600;
  }

  .td-person {
    font-size: 9px;
    color: var(--color-ink-ghost);
    margin-top: 1px;
  }

  .td-bold {
    font-weight: 700;
  }

  .td-total {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 700;
  }

  .row-active {
    background: var(--color-vekt-bg);
  }

  .row-total {
    border-top: 1.5px solid var(--color-wire-strong);
  }
</style>
