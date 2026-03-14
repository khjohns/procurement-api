<script lang="ts">
  import { evaluation, DEFAULT_ITEM_LABEL, criterionMode } from '$lib/stores/evaluation.svelte';
  import PillToggle from './PillToggle.svelte';

  // ── Criteria CRUD (delegates to store) ──

  function addCriterion() {
    const id = evaluation.addCriterion('', 'quality');
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-criterion-id="${id}"] .criterion-name-input`
      ) as HTMLInputElement;
      el?.focus();
    });
  }

  function moveCriterion(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    evaluation.reorderCriteria(index, target);
  }

  function moveSubCriterion(criterionId: string, subIndex: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? subIndex - 1 : subIndex + 1;
    evaluation.reorderSubCriteria(criterionId, subIndex, target);
  }

  function addSubCriterion(criterionId: string) {
    const id = evaluation.addSubCriterion(criterionId, '', 0);
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-sub-id="${id}"] .sub-name-input`
      ) as HTMLInputElement;
      el?.focus();
    });
  }

  // ── Derived ──

  let maxSubWeight = $derived(
    Math.max(1, ...evaluation.data.criteria.flatMap((c) => c.subcriteria.map((s) => s.weight)))
  );
</script>

<div class="setup-main">
  {#if evaluation.data.criteria.length === 0}
    <div class="empty-state">
      <div class="empty-icon">&#9881;</div>
      <div class="empty-title">Sett opp evaluering</div>
      <div class="empty-desc">
        Importer kriterier fra Doffin, eller legg til manuelt i panelet til høyre.
      </div>
      <button class="empty-action" onclick={addCriterion}> + Legg til første kriterium </button>
    </div>
  {:else}
    <!-- Inline criteria editor (same visual style as the old /ny page) -->
    <div class="section-label">Tildelingskriterier</div>
    <div class="criteria-editor">
      {#each evaluation.data.criteria as criterion, ci (criterion.id)}
        {@const mode = criterionMode(criterion)}
        <div class="criterion-group" data-criterion-id={criterion.id}>
          <div class="criterion-row criterion-row-group">
            <div class="criterion-weight">
              <span class="weight-value weight-value-group"
                >{criterion.weight}<span class="weight-pct">%</span></span
              >
              <div class="weight-bar">
                <div
                  class="weight-bar-fill"
                  style="width: {maxSubWeight > 0
                    ? (criterion.weight / (maxSubWeight * 2)) * 100
                    : 0}%"
                ></div>
              </div>
            </div>
            <div class="criterion-name">
              <input
                class="criterion-name-input"
                type="text"
                value={criterion.name}
                oninput={(e) =>
                  evaluation.renameCriterion(criterion.id, (e.target as HTMLInputElement).value)}
                placeholder="Hovedkriterium..."
              />
            </div>
            <button
              class="criterion-type"
              class:type-quality={criterion.type === 'quality'}
              class:type-price={criterion.type === 'price'}
              onclick={() =>
                evaluation.setCriterionType(
                  criterion.id,
                  criterion.type === 'quality' ? 'price' : 'quality'
                )}
            >
              {criterion.type === 'quality' ? 'Kvalitet' : 'Pris'}
            </button>
            {#if criterion.type === 'quality'}
              <PillToggle
                active={criterion.evaluationType === 'item'}
                onclick={() =>
                  evaluation.setCriterionEvaluationType(
                    criterion.id,
                    criterion.evaluationType === 'item' ? 'simple' : 'item'
                  )}
                title={criterion.evaluationType === 'item'
                  ? 'Ressursevaluering aktiv — klikk for standard'
                  : 'Standard evaluering — klikk for ressursevaluering'}
              >
                {criterion.evaluationType === 'item' ? 'Ressurs' : 'Standard'}
              </PillToggle>
            {/if}
            <div class="criterion-move">
              <button
                class="move-btn"
                disabled={ci === 0}
                onclick={() => moveCriterion(ci, 'up')}
                title="Flytt opp">&#9650;</button
              >
              <button
                class="move-btn"
                disabled={ci === evaluation.data.criteria.length - 1}
                onclick={() => moveCriterion(ci, 'down')}
                title="Flytt ned">&#9660;</button
              >
            </div>
            <button
              class="criterion-remove"
              onclick={() => evaluation.removeCriterion(criterion.id)}
              title="Fjern kriterium">×</button
            >
          </div>

          {#each criterion.subcriteria as sub, si (sub.id)}
            <div class="criterion-row criterion-row-sub" data-sub-id={sub.id}>
              <div class="criterion-weight">
                <input
                  class="weight-input"
                  type="number"
                  min="0"
                  max="100"
                  value={sub.weight}
                  oninput={(e) =>
                    evaluation.setSubCriterionWeight(
                      sub.id,
                      parseInt((e.target as HTMLInputElement).value) || 0
                    )}
                />
                <span class="weight-pct-input">%</span>
                <div class="weight-bar">
                  <div
                    class="weight-bar-fill"
                    style="width: {maxSubWeight > 0 ? (sub.weight / maxSubWeight) * 100 : 0}%"
                  ></div>
                </div>
              </div>
              <div class="criterion-name criterion-name-sub">
                <input
                  class="sub-name-input"
                  type="text"
                  value={sub.name}
                  oninput={(e) =>
                    evaluation.renameSubCriterion(sub.id, (e.target as HTMLInputElement).value)}
                  placeholder={mode === 'resource' ? 'Moment...' : 'Underkriterium...'}
                />
              </div>
              {#if mode !== 'resource'}
                <PillToggle
                  active={sub.evaluationType === 'item'}
                  onclick={() =>
                    evaluation.setEvaluationType(
                      sub.id,
                      sub.evaluationType === 'item' ? 'simple' : 'item'
                    )}
                  title={sub.evaluationType === 'item'
                    ? 'Ressursevaluering aktiv — klikk for enkel'
                    : 'Enkel evaluering — klikk for ressursevaluering'}
                >
                  {sub.evaluationType === 'item' ? 'Ressurs' : 'Enkel'}
                </PillToggle>
              {/if}
              <div class="criterion-move">
                <button
                  class="move-btn"
                  disabled={si === 0}
                  onclick={() => moveSubCriterion(criterion.id, si, 'up')}
                  title="Flytt opp">&#9650;</button
                >
                <button
                  class="move-btn"
                  disabled={si === criterion.subcriteria.length - 1}
                  onclick={() => moveSubCriterion(criterion.id, si, 'down')}
                  title="Flytt ned">&#9660;</button
                >
              </div>
              <button
                class="criterion-remove criterion-remove-sub"
                onclick={() => evaluation.removeSubCriterion(sub.id)}
                title="Fjern underkriterium">×</button
              >
            </div>

            <!-- Item-evaluation config panel (inline) -->
            {#if sub.evaluationType === 'item'}
              <div class="item-config">
                <div class="item-config-header">
                  <div class="item-config-row">
                    <label class="item-config-label">Betegnelse</label>
                    <input
                      class="item-config-input"
                      type="text"
                      value={sub.itemLabel ?? DEFAULT_ITEM_LABEL}
                      oninput={(e) =>
                        evaluation.setItemLabel(sub.id, (e.target as HTMLInputElement).value)}
                      placeholder={DEFAULT_ITEM_LABEL}
                    />
                  </div>
                  <div class="item-config-row">
                    <label class="item-config-label">Aggregering</label>
                    <div class="agg-toggle">
                      <button
                        class="agg-option"
                        class:agg-active={!sub.aggregation || sub.aggregation === 'average'}
                        onclick={() => evaluation.setAggregation(sub.id, 'average')}
                        >Gjennomsnitt</button
                      >
                      <button
                        class="agg-option"
                        class:agg-active={sub.aggregation === 'minimum'}
                        onclick={() => evaluation.setAggregation(sub.id, 'minimum')}>Laveste</button
                      >
                    </div>
                  </div>
                </div>
                <div class="item-dimensions">
                  <div class="item-dimensions-label">Momenter</div>
                  {#each sub.itemCriteria ?? [] as ic (ic.id)}
                    <div class="item-dimension-row">
                      <input
                        class="item-dimension-weight"
                        type="number"
                        min="0"
                        max="100"
                        value={ic.weight}
                        oninput={(e) =>
                          evaluation.setItemCriterionWeight(
                            sub.id,
                            ic.id,
                            parseInt((e.target as HTMLInputElement).value) || 0
                          )}
                      />
                      <span class="weight-pct-input">%</span>
                      <input
                        class="item-dimension-name"
                        type="text"
                        value={ic.name}
                        oninput={(e) =>
                          evaluation.renameItemCriterion(
                            sub.id,
                            ic.id,
                            (e.target as HTMLInputElement).value
                          )}
                        placeholder="Momentnavn..."
                      />
                      <button
                        class="item-dimension-remove"
                        onclick={() => evaluation.removeItemCriterion(sub.id, ic.id)}
                        title="Fjern dimensjon">×</button
                      >
                    </div>
                  {/each}
                  <button
                    class="item-dimension-add"
                    onclick={() => evaluation.addItemCriterion(sub.id, '', 0)}
                  >
                    + Moment
                  </button>
                </div>
              </div>
            {/if}
          {/each}

          <button class="add-sub-btn" onclick={() => addSubCriterion(criterion.id)}>
            <span class="add-sub-spacer"></span>
            <span class="add-sub-label">+ {mode === 'resource' ? 'Moment' : 'Underkriterium'}</span>
          </button>

          {#if mode === 'resource'}
            <div class="roles-config">
              <div class="roles-config-label">Roller</div>
              {#each criterion.roles ?? [] as role (role.id)}
                <div class="role-row">
                  <input
                    class="role-name-input"
                    type="text"
                    value={role.name}
                    oninput={(e) =>
                      evaluation.renameRole(
                        criterion.id,
                        role.id,
                        (e.target as HTMLInputElement).value
                      )}
                    placeholder="Rollenavn..."
                  />
                  <button
                    class="role-remove"
                    onclick={() => evaluation.removeRole(criterion.id, role.id)}
                    title="Fjern rolle">×</button
                  >
                </div>
              {/each}
              <button class="role-add" onclick={() => evaluation.addRole(criterion.id, '')}>
                + Rolle
              </button>
            </div>
          {/if}
        </div>
      {/each}

      <button class="add-criterion-btn" onclick={addCriterion}> + Hovedkriterium </button>

      <!-- Total row -->
      <div
        class="criteria-total"
        class:total-valid={evaluation.totalWeight === 100}
        class:total-invalid={evaluation.totalWeight > 0 && evaluation.totalWeight !== 100}
      >
        <div class="criterion-weight">
          <span class="weight-value weight-value-total"
            >{evaluation.totalWeight}<span class="weight-pct">%</span></span
          >
          <div class="weight-bar weight-bar-total">
            <div
              class="weight-bar-fill weight-bar-fill-total"
              style="width: {Math.min(100, evaluation.totalWeight)}%"
            ></div>
          </div>
        </div>
        <div class="total-label">Total vekting</div>
        {#if evaluation.totalWeight !== 100 && evaluation.totalWeight > 0}
          <span class="total-warning"
            >{evaluation.totalWeight < 100
              ? `${100 - evaluation.totalWeight}% gjenstår`
              : `${evaluation.totalWeight - 100}% for mye`}</span
          >
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .setup-main {
    max-width: 800px;
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-4);
    padding: var(--spacing-12) var(--spacing-6);
    text-align: center;
    border: 1px solid var(--color-wire);
    border-left: 3px solid var(--color-vekt);
    border-radius: var(--radius-lg);
    background: var(--color-felt);
  }

  .empty-icon {
    font-size: 28px;
    color: var(--color-vekt-dim);
    opacity: 0.6;
  }

  .empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.02em;
  }

  .empty-desc {
    font-size: 12px;
    color: var(--color-ink-muted);
    line-height: 1.5;
    max-width: 340px;
  }

  .empty-action {
    padding: var(--spacing-2) var(--spacing-4);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.12s;
  }

  .empty-action:hover {
    background: var(--color-vekt-bg-strong);
  }

  .empty-action:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  /* ── Section label ── */
  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
  }

  /* ── Criteria editor (reuses patterns from old /ny page) ── */
  .criteria-editor {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .criterion-group {
    border-bottom: 1px solid var(--color-wire-strong);
  }

  .criterion-group:last-of-type {
    border-bottom: 1px solid var(--color-wire);
  }

  .criterion-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .criterion-row-group {
    background: var(--color-felt);
    border-left: 3px solid var(--color-vekt);
  }

  .criterion-row-sub {
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire);
    border-left: 3px solid rgba(232, 168, 56, 0.15);
  }

  .criterion-row-sub:last-of-type {
    border-bottom: none;
  }

  .criterion-weight {
    width: 72px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-1);
  }

  .weight-value {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-vekt-dim);
  }

  .weight-value-group {
    font-size: 13px;
    color: var(--color-vekt);
  }

  .weight-pct {
    font-size: 9px;
    font-weight: 400;
    color: var(--color-ink-ghost);
  }

  .weight-input {
    width: 40px;
    text-align: center;
    padding: var(--spacing-1);
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-vekt-dim);
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    transition: border-color 0.12s;
  }

  .weight-input:focus {
    border-color: var(--color-wire-focus);
    color: var(--color-vekt);
  }

  .weight-input::-webkit-outer-spin-button,
  .weight-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .weight-input[type='number'] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .weight-pct-input {
    font-size: 9px;
    color: var(--color-ink-ghost);
    margin-left: -2px;
  }

  .weight-bar {
    width: 48px;
    height: 2px;
    background: var(--color-felt-active);
    border-radius: 1px;
    overflow: hidden;
  }

  .weight-bar-fill {
    height: 100%;
    background: var(--color-vekt-dim);
    border-radius: 1px;
    transition: width 0.15s ease-out;
  }

  .weight-bar-total {
    width: 100%;
  }

  .weight-bar-fill-total {
    background: var(--color-vekt);
  }

  .criterion-name {
    flex: 1;
    min-width: 0;
  }

  .criterion-name-sub {
    padding-left: var(--spacing-4);
  }

  .criterion-name-input,
  .sub-name-input {
    width: 100%;
    background: none;
    border: none;
    outline: none;
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    padding: var(--spacing-1) 0;
    border-bottom: 1px solid transparent;
    transition: border-color 0.12s;
  }

  .sub-name-input {
    font-weight: 500;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  .criterion-name-input:focus,
  .sub-name-input:focus {
    border-bottom-color: var(--color-wire-focus);
  }

  .criterion-name-input::placeholder,
  .sub-name-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .criterion-type {
    padding: 2px var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.12s;
    flex-shrink: 0;
    line-height: 1.4;
  }

  .type-quality {
    color: var(--color-vekt-dim);
    border-color: var(--color-vekt-bg-strong);
    background: var(--color-vekt-bg);
  }

  .type-quality:hover {
    color: var(--color-vekt);
    background: var(--color-vekt-bg-strong);
  }

  .type-price {
    color: var(--color-ink-secondary);
    border-color: var(--color-wire);
    background: var(--color-felt-hover);
  }

  .type-price:hover {
    color: var(--color-ink);
    border-color: var(--color-wire-strong);
  }

  .criterion-move {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex-shrink: 0;
  }

  .move-btn {
    width: 20px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.1s;
    padding: 0;
    line-height: 1;
  }

  .move-btn:hover:not(:disabled) {
    color: var(--color-ink-secondary);
    background: var(--color-felt-active);
  }

  .move-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  .move-btn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .criterion-remove {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition: all 0.1s;
  }

  .criterion-row:hover > .criterion-remove {
    opacity: 1;
  }

  .criterion-remove:hover {
    color: var(--color-score-low);
    background: var(--color-felt-active);
  }

  .criterion-remove:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    opacity: 1;
  }

  .add-sub-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    border-left: 3px solid rgba(232, 168, 56, 0.15);
    cursor: pointer;
    transition: color 0.1s;
  }

  .add-sub-spacer {
    width: 72px;
    flex-shrink: 0;
  }

  .add-sub-label {
    padding-left: var(--spacing-4);
  }

  .add-sub-btn:hover {
    color: var(--color-vekt-dim);
  }

  .add-sub-btn:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  .add-criterion-btn {
    display: block;
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    text-align: left;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border: none;
    border-left: 3px solid var(--color-vekt);
    cursor: pointer;
    transition: all 0.1s;
  }

  .add-criterion-btn:hover {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .add-criterion-btn:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  /* Total row */
  .criteria-total {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-3);
    background: var(--color-canvas);
    border-top: 2px solid var(--color-wire-strong);
    border-left: 3px solid var(--color-vekt);
  }

  .total-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .total-valid .weight-value-total {
    color: var(--color-score-high);
  }

  .total-invalid .weight-value-total {
    color: var(--color-score-low);
  }

  .weight-value-total {
    font-size: 14px;
    font-weight: 700;
  }

  .total-warning {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-score-low);
    margin-left: auto;
  }

  /* ── Item config panel ── */
  .item-config {
    border-left: 3px solid rgba(232, 168, 56, 0.15);
    background: var(--color-felt);
    padding: var(--spacing-3) var(--spacing-4);
    padding-left: calc(72px + var(--spacing-3) + var(--spacing-4) + 3px);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    border-bottom: 1px solid var(--color-wire);
  }

  .item-config-header {
    display: flex;
    gap: var(--spacing-4);
    flex-wrap: wrap;
  }

  .item-config-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .item-config-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    white-space: nowrap;
  }

  .item-config-input {
    width: 120px;
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    outline: none;
    transition: border-color 0.12s;
  }

  .item-config-input:focus {
    border-color: var(--color-wire-focus);
  }

  .agg-toggle {
    display: inline-flex;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .agg-option {
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: var(--color-canvas);
    border: none;
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
  }

  .agg-option:not(:last-child) {
    border-right: 1px solid var(--color-wire);
  }

  .agg-option:hover:not(.agg-active) {
    color: var(--color-ink-secondary);
    background: var(--color-felt-hover);
  }

  .agg-option.agg-active {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    font-weight: 600;
  }

  .agg-option:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1.5px var(--color-wire-focus);
  }

  /* ── Item dimensions ── */
  .item-dimensions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .item-dimensions-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .item-dimension-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .item-dimension-weight {
    width: 40px;
    text-align: center;
    padding: var(--spacing-1);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-vekt-dim);
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    transition: border-color 0.12s;
  }

  .item-dimension-weight:focus {
    border-color: var(--color-wire-focus);
    color: var(--color-vekt);
  }

  .item-dimension-weight::-webkit-outer-spin-button,
  .item-dimension-weight::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .item-dimension-weight[type='number'] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .item-dimension-name {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    outline: none;
    transition: border-color 0.12s;
  }

  .item-dimension-name:focus {
    border-color: var(--color-wire-focus);
  }

  .item-dimension-name::placeholder {
    color: var(--color-ink-ghost);
  }

  .item-dimension-remove {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition: all 0.1s;
  }

  .item-dimension-row:hover > .item-dimension-remove {
    opacity: 1;
  }

  .item-dimension-remove:hover {
    color: var(--color-score-low);
    background: var(--color-felt-active);
  }

  .item-dimension-remove:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    opacity: 1;
  }

  .item-dimension-add {
    align-self: flex-start;
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.1s;
  }

  .item-dimension-add:hover {
    color: var(--color-vekt-dim);
  }

  .item-dimension-add:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  /* ── Roles config ── */
  .roles-config {
    border-left: 3px solid rgba(232, 168, 56, 0.15);
    background: var(--color-felt);
    padding: var(--spacing-3) var(--spacing-4);
    padding-left: calc(72px + var(--spacing-3) + var(--spacing-4) + 3px);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .roles-config-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .role-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .role-name-input {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-family: var(--font-ui);
    font-size: 12px;
    outline: none;
    transition: border-color 0.12s;
  }

  .role-name-input:focus {
    border-color: var(--color-wire-focus);
  }

  .role-name-input::placeholder {
    color: var(--color-ink-ghost);
  }

  .role-remove {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-ink-ghost);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0;
    transition: all 0.1s;
  }

  .role-row:hover > .role-remove {
    opacity: 1;
  }

  .role-remove:hover {
    color: var(--color-score-low);
    background: var(--color-felt-active);
  }

  .role-remove:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
    opacity: 1;
  }

  .role-add {
    align-self: flex-start;
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.1s;
  }

  .role-add:hover {
    color: var(--color-vekt-dim);
  }

  .role-add:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1.5px var(--color-wire-focus);
  }

  @media (max-width: 1023px) {
    .criterion-row {
      gap: var(--spacing-2);
      padding: var(--spacing-2);
    }

    .criterion-weight {
      width: 52px;
    }

    .weight-bar {
      width: 36px;
    }

    .criterion-name-sub {
      padding-left: var(--spacing-2);
    }

    .criterion-move {
      display: none;
    }

    .criterion-remove {
      opacity: 1;
    }

    .criterion-remove-sub {
      opacity: 1;
    }

    .add-sub-spacer {
      width: 52px;
    }

    .add-sub-label {
      padding-left: var(--spacing-2);
    }

    .item-config {
      padding-left: calc(52px + var(--spacing-2) + var(--spacing-2) + 3px);
    }

    .roles-config {
      padding-left: calc(52px + var(--spacing-2) + var(--spacing-2) + 3px);
    }
  }
</style>
