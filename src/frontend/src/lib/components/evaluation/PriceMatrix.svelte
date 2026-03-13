<script lang="ts">
  import { evaluation, formatNOK, criterionMode } from '$lib/stores/evaluation.svelte';

  /** Total group deduction: leaf deduction or sum of sub-deductions. */
  function groupDeduction(criterionId: string, supplierId: string): number {
    const criterion = evaluation.data.criteria.find((c) => c.id === criterionId);
    if (!criterion) return 0;
    if (criterion.subcriteria.length === 0) {
      return evaluation.priceDeductions[criterionId]?.[supplierId] ?? 0;
    }
    return criterion.subcriteria.reduce(
      (sum, sub) => sum + (evaluation.priceDeductions[sub.id]?.[supplierId] ?? 0),
      0
    );
  }

  function fradragTier(subId: string, supplierId: string): string {
    const deductions = evaluation.priceDeductions[subId];
    if (!deductions) return '';
    const val = deductions[supplierId] ?? 0;
    const max = Math.max(...Object.values(deductions));
    if (val === max) return 'fradrag-best';
    const min = Math.min(...Object.values(deductions));
    if (val === min) return 'fradrag-high';
    return 'fradrag-mid';
  }

  function groupFradragTier(criterionId: string, supplierId: string): string {
    const vals = evaluation.data.suppliers.map((s) => groupDeduction(criterionId, s.id));
    const val = groupDeduction(criterionId, supplierId);
    const max = Math.max(...vals);
    if (val === max) return 'fradrag-best';
    const min = Math.min(...vals);
    if (val === min) return 'fradrag-high';
    return 'fradrag-mid';
  }

  // ── Max deduction editing ──
  let editingMaxDed: Record<string, boolean> = $state({});
  let editMaxDedVal: Record<string, string> = $state({});
  let maxDedInputs: Record<string, HTMLInputElement | undefined> = {};

  function startEditMaxDed(criterionId: string, current: number) {
    editingMaxDed[criterionId] = true;
    editMaxDedVal[criterionId] = current > 0 ? String(current) : '';
    requestAnimationFrame(() => maxDedInputs[criterionId]?.select());
  }

  function commitMaxDed(criterionId: string) {
    const raw = (editMaxDedVal[criterionId] ?? '').replace(/\s/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) evaluation.setCriterionMaxPriceDeduction(criterionId, num);
    editingMaxDed[criterionId] = false;
  }

  // ── Deduction amount editing ──
  let editingDed: Record<string, boolean> = $state({});
  let editDedVal: Record<string, string> = $state({});
  let dedInputs: Record<string, HTMLInputElement | undefined> = {};

  function startEditDed(key: string, current: number) {
    editingDed[key] = true;
    editDedVal[key] = current > 0 ? String(current) : '';
    requestAnimationFrame(() => dedInputs[key]?.select());
  }

  function commitCriterionDed(criterionId: string, supplierId: string) {
    const key = `${criterionId}:${supplierId}`;
    const num = parseInt((editDedVal[key] ?? '').replace(/\s/g, ''), 10);
    if (!isNaN(num) && num >= 0)
      evaluation.setCriterionPriceDeductionAmount(criterionId, supplierId, num);
    editingDed[key] = false;
  }

  function commitSubDed(subId: string, supplierId: string) {
    const key = `${subId}:${supplierId}`;
    const num = parseInt((editDedVal[key] ?? '').replace(/\s/g, ''), 10);
    if (!isNaN(num) && num >= 0) evaluation.setSubPriceDeductionAmount(subId, supplierId, num);
    editingDed[key] = false;
  }

  /** Total of all quality max deductions. */
  let totalMaxDed = $derived(Object.values(evaluation.maxDeductions).reduce((s, v) => s + v, 0));
</script>

<div class="section-label">Kvalitetsfradrag</div>
<div class="matrix-wrap">
  <table class="matrix">
    <colgroup>
      <col class="col-weight" />
      <col class="col-criteria" />
      {#each evaluation.data.suppliers as _}
        <col class="col-supplier" />
      {/each}
    </colgroup>
    <thead>
      <tr>
        <th class="th-weight">Maks fradrag</th>
        <th>Tildelingskriterier</th>
        {#each evaluation.data.suppliers as supplier}
          <th class="th-supplier">{supplier.name}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each evaluation.data.criteria as criterion}
        {@const mode = criterionMode(criterion)}
        {@const isPriceType = criterion.type === 'price'}
        {@const isLeaf = mode === 'leaf'}

        <!-- Group row -->
        <tr class="row-group" class:row-price-crit={isPriceType}>
          <!-- Max deduction cell -->
          <td class="cell-weight">
            {#if isPriceType}
              <span class="ingen-label">Ingen</span>
            {:else if editingMaxDed[criterion.id]}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                bind:this={maxDedInputs[criterion.id]}
                type="text"
                inputmode="numeric"
                class="maxded-input"
                value={editMaxDedVal[criterion.id]}
                oninput={(e) => (editMaxDedVal[criterion.id] = e.currentTarget.value)}
                onblur={() => commitMaxDed(criterion.id)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') commitMaxDed(criterion.id);
                  if (e.key === 'Escape') editingMaxDed[criterion.id] = false;
                }}
                autofocus
              />
            {:else}
              <button
                class="maxded-btn"
                onclick={() =>
                  startEditMaxDed(criterion.id, evaluation.maxDeductions[criterion.id] ?? 0)}
                title="Klikk for å sette maksimalt fratrekk"
              >
                <span class="weight-num-small"
                  >{formatNOK(evaluation.maxDeductions[criterion.id] ?? 0)}</span
                >
                <span class="edit-hint">kr ✎</span>
              </button>
            {/if}
          </td>

          <td class="cell-criteria">{criterion.name}</td>

          {#each evaluation.data.suppliers as supplier}
            {#if isPriceType}
              <!-- Price criterion: show supplier's price -->
              {@const prices = evaluation.data.suppliers.map((s) => s.price ?? 0)}
              {@const minPrice = Math.min(...prices)}
              <td class="cell-pris" class:fradrag-best={(supplier.price ?? 0) === minPrice}>
                <span class="pris-value">{formatNOK(supplier.price ?? 0)}</span>
              </td>
            {:else if isLeaf}
              <!-- Leaf quality criterion: directly enter deduction amount -->
              {@const deduction = groupDeduction(criterion.id, supplier.id)}
              {@const key = `${criterion.id}:${supplier.id}`}
              <td class="cell-pris cell-ded {groupFradragTier(criterion.id, supplier.id)}">
                {#if editingDed[key]}
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    bind:this={dedInputs[key]}
                    type="text"
                    inputmode="numeric"
                    class="ded-input"
                    autofocus
                    value={editDedVal[key]}
                    oninput={(e) => (editDedVal[key] = e.currentTarget.value)}
                    onblur={() => commitCriterionDed(criterion.id, supplier.id)}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') commitCriterionDed(criterion.id, supplier.id);
                      if (e.key === 'Escape') editingDed[key] = false;
                    }}
                  />
                {:else}
                  <button
                    class="ded-btn {deduction > 0 ? 'ded-filled' : ''}"
                    onclick={() => startEditDed(key, deduction)}
                    title="Klikk for å angi fratrekk i kr"
                  >
                    <span class="pris-prefix">−</span>{formatNOK(deduction)}
                  </button>
                {/if}
              </td>
            {:else}
              <!-- Group row for traditional/resource: show aggregated deduction only -->
              {@const deduction = groupDeduction(criterion.id, supplier.id)}
              <td class="cell-pris {groupFradragTier(criterion.id, supplier.id)}">
                <span class="pris-value"
                  ><span class="pris-prefix">−</span>{formatNOK(deduction)}</span
                >
              </td>
            {/if}
          {/each}
        </tr>

        <!-- Sub-criterion rows (traditional mode only) -->
        {#if mode === 'traditional'}
          {@const subSum = criterion.subcriteria.reduce((s, sc) => s + sc.weight, 0)}
          {#each criterion.subcriteria as sub, si}
            {@const isLast = si === criterion.subcriteria.length - 1}
            {@const subMaxDed =
              subSum > 0
                ? (evaluation.maxDeductions[criterion.id] ?? 0) * (sub.weight / subSum)
                : 0}
            <tr class="row-sub" class:row-group-last={isLast}>
              <td class="cell-weight">
                <div class="weight-display">
                  <span class="weight-num-small muted">{formatNOK(subMaxDed)}</span>
                </div>
              </td>
              <td class="cell-criteria">{sub.name}</td>
              {#each evaluation.data.suppliers as supplier}
                {@const deduction = evaluation.priceDeductions[sub.id]?.[supplier.id] ?? 0}
                {@const key = `${sub.id}:${supplier.id}`}
                <td class="cell-pris cell-ded {fradragTier(sub.id, supplier.id)}">
                  {#if editingDed[key]}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      bind:this={dedInputs[key]}
                      type="text"
                      inputmode="numeric"
                      class="ded-input"
                      autofocus
                      value={editDedVal[key]}
                      oninput={(e) => (editDedVal[key] = e.currentTarget.value)}
                      onblur={() => commitSubDed(sub.id, supplier.id)}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') commitSubDed(sub.id, supplier.id);
                        if (e.key === 'Escape') editingDed[key] = false;
                      }}
                    />
                  {:else}
                    <button
                      class="ded-btn {deduction > 0 ? 'ded-filled' : ''}"
                      onclick={() => startEditDed(key, deduction)}
                      title="Klikk for å angi fratrekk i kr"
                    >
                      <span class="pris-prefix">−</span>{formatNOK(deduction)}
                    </button>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      {/each}

      <!-- Summation rows -->
      <tr class="row-pris-sum">
        <td class="cell-weight">
          <div class="weight-display">
            <span class="weight-num-small">{formatNOK(totalMaxDed)}</span>
          </div>
        </td>
        <td class="cell-criteria">Sum kvalitetsfradrag</td>
        {#each evaluation.data.suppliers as supplier}
          <td class="cell-pris fradrag-mid">
            <span class="pris-value"
              ><span class="pris-prefix">−</span>{formatNOK(
                evaluation.totalDeductions[supplier.id]
              )}</span
            >
          </td>
        {/each}
      </tr>

      <tr class="row-pris-result">
        <td class="cell-weight"></td>
        <td class="cell-criteria">Evaluert pris</td>
        {#each evaluation.data.suppliers as supplier}
          {@const price = evaluation.evaluatedPrices[supplier.id]}
          {@const minPrice = Math.min(...Object.values(evaluation.evaluatedPrices))}
          <td class="cell-pris" class:fradrag-best={price === minPrice}>
            <span class="pris-value">{formatNOK(price)}</span>
          </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>

<style>
  .section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: var(--spacing-3);
    margin-top: var(--spacing-6);
  }

  .matrix-wrap {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-wire);
  }

  .matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .col-weight {
    width: 110px;
  }
  .col-criteria {
    width: auto;
  }
  .col-supplier {
    width: 150px;
  }

  .matrix th {
    padding: var(--spacing-3);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-muted);
    background: var(--color-felt);
    border-bottom: 1px solid var(--color-wire);
    text-align: left;
  }

  .th-weight {
    text-align: center;
  }
  .th-supplier {
    text-align: center;
  }

  .cell-weight {
    padding: var(--spacing-2) var(--spacing-3);
    vertical-align: middle;
    border-left: 3px solid var(--color-vekt);
    text-align: center;
  }

  .weight-display {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .weight-num-small {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-secondary);
  }

  .weight-num-small.muted {
    color: var(--color-ink-muted);
    font-size: 10px;
  }

  /* Max deduction editing */
  .ingen-label {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
    font-style: italic;
  }

  .maxded-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-sm);
    width: 100%;
    transition: background 0.1s;
  }

  .maxded-btn:hover {
    background: var(--color-felt-hover);
  }

  .edit-hint {
    font-size: 9px;
    color: var(--color-ink-ghost);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .maxded-btn:hover .edit-hint {
    opacity: 1;
  }

  .maxded-input {
    width: 80px;
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--color-ink);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire-focus);
    border-radius: var(--radius-sm);
    outline: none;
    -moz-appearance: textfield;
  }

  .maxded-input::-webkit-inner-spin-button,
  .maxded-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .cell-criteria {
    padding: var(--spacing-2) var(--spacing-3);
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  .row-group {
    background: var(--color-felt);
  }
  .row-group .cell-criteria {
    font-weight: 600;
    color: var(--color-ink);
  }
  .row-price-crit .cell-weight {
    border-left-color: var(--color-wire);
  }
  .row-sub {
    background: var(--color-canvas);
    border-bottom: 1px solid var(--color-wire);
  }
  .row-sub .cell-criteria {
    padding-left: var(--spacing-6);
    color: var(--color-ink-muted);
  }
  .row-group-last {
    border-bottom: 1px solid var(--color-wire-strong);
  }

  .cell-pris {
    text-align: center;
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    padding: var(--spacing-2) var(--spacing-3);
  }

  /* Deduction cell */
  .cell-ded {
    padding: var(--spacing-1) var(--spacing-2);
    vertical-align: middle;
  }

  .ded-btn {
    display: block;
    width: 100%;
    text-align: center;
    font-family: var(--font-data);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-ink-ghost);
    background: none;
    border: 1px dashed transparent;
    border-radius: var(--radius-sm);
    padding: var(--spacing-1) var(--spacing-2);
    cursor: pointer;
    transition: all 0.1s;
    line-height: 1;
  }

  .ded-btn:hover {
    border-color: var(--color-wire);
    color: var(--color-ink-muted);
    background: var(--color-felt-hover);
  }

  .ded-btn.ded-filled {
    color: var(--color-ink);
  }

  .ded-input {
    display: block;
    width: 100%;
    padding: var(--spacing-1) var(--spacing-2);
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--color-ink);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire-focus);
    border-radius: var(--radius-sm);
    outline: none;
  }

  .pris-value {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    font-weight: 500;
    line-height: 1;
  }

  .pris-prefix {
    font-size: 10px;
    color: var(--color-ink-ghost);
    font-weight: 400;
  }

  .fradrag-best .pris-value {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
    font-weight: 600;
  }
  .fradrag-mid .pris-value {
    color: var(--color-ink);
  }
  .fradrag-high .pris-value {
    color: var(--color-score-low);
  }

  .fradrag-best .ded-btn {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
    font-weight: 600;
    border-color: transparent;
  }
  .fradrag-mid .ded-btn {
    color: var(--color-ink);
  }
  .fradrag-high .ded-btn {
    color: var(--color-score-low);
  }

  .row-pris-sum td {
    background: var(--color-canvas);
    border-top: 1px solid var(--color-wire-strong);
    padding: var(--spacing-3) var(--spacing-3) var(--spacing-2);
  }

  .row-pris-sum td:first-child {
    border-left: 3px solid var(--color-vekt);
  }

  .row-pris-sum .cell-criteria {
    font-weight: 600;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  .row-pris-result td {
    background: var(--color-canvas);
    border-bottom: none;
    padding: var(--spacing-2) var(--spacing-3) var(--spacing-4);
  }

  .row-pris-result td:first-child {
    border-left: 3px solid var(--color-vekt);
  }

  .row-pris-result .cell-criteria {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-ink-secondary);
  }

  .row-pris-result .pris-value {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  .row-pris-result .fradrag-best .pris-value {
    color: var(--color-vekt);
    background: var(--color-vekt-bg);
    padding: var(--spacing-1) var(--spacing-3);
  }
</style>
