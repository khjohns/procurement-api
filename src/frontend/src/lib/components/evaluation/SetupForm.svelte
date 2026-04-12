<script lang="ts">
  import { evaluation, criterionMode } from '$lib/stores/evaluation.svelte';
  import type { Criterion } from '$lib/stores/evaluation.svelte';
  import { fN } from './shared';

  let {
    onstart,
  }: {
    onstart: () => void;
  } = $props();

  let data = $derived(evaluation.data);
  let criteria = $derived(data.criteria);
  let suppliers = $derived(data.suppliers);

  let isPrismodell = $derived(evaluation.activeMethod === 'pris');
  let kvalKrit = $derived(criteria.filter((c) => c.type !== 'price'));
  let totalFradrag = $derived(kvalKrit.reduce((s, c) => s + (c.maxPriceDeduction ?? 0), 0));

  // Poengmodell: all criteria weights must sum to 100%
  // Prismodell: no weight inputs — validity is based on maks fradrag
  let vektSum = $derived(criteria.reduce((s, c) => s + c.weight, 0));
  let hasPris = $derived(criteria.some((c) => c.type === 'price'));
  let hasKval = $derived(criteria.some((c) => c.type === 'quality'));
  let hasEnoughLev = $derived(suppliers.filter((s) => s.name.trim()).length >= 2);
  let hasFradrag = $derived(kvalKrit.some((c) => (c.maxPriceDeduction ?? 0) > 0));
  let isValid = $derived.by(() => {
    if (!hasPris || !hasKval || !hasEnoughLev) return false;
    if (isPrismodell) return hasFradrag;
    return vektSum === 100;
  });

  let subWeightOk = $derived(
    criteria.every((c) => {
      const mode = criterionMode(c);
      if (mode === 'traditional' && c.subcriteria.length > 0) {
        return c.subcriteria.reduce((s, u) => s + u.weight, 0) === 100;
      }
      if (mode === 'resource' && c.subcriteria.length > 0) {
        return c.subcriteria.reduce((s, d) => s + d.weight, 0) === 100;
      }
      return true;
    })
  );

  // Track which criteria are expanded
  let expandedIds = $state<Set<string>>(new Set());
  function toggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedIds = next;
  }

  // Criterion display mode for the setup
  function displayMode(c: Criterion): 'pris' | 'leaf' | 'traditional' | 'resource' {
    if (c.type === 'price') return 'pris';
    return criterionMode(c);
  }

  function setDisplayMode(criterionId: string, mode: 'leaf' | 'traditional' | 'resource') {
    const c = criteria.find((x) => x.id === criterionId);
    if (!c) return;
    if (mode === 'resource') {
      evaluation.setCriterionEvaluationType(criterionId, 'item');
      if (!c.roles || c.roles.length === 0) {
        evaluation.addRole(criterionId, 'Rolle 1');
      }
      if (c.subcriteria.length === 0) {
        evaluation.addSubCriterion(criterionId, 'Dimensjon 1', 100);
      }
    } else if (mode === 'traditional') {
      evaluation.setCriterionEvaluationType(criterionId, 'simple');
      if (c.subcriteria.length === 0) {
        evaluation.addSubCriterion(criterionId, '', 100);
      }
    } else {
      // leaf
      evaluation.setCriterionEvaluationType(criterionId, 'simple');
    }
  }
</script>

<div class="setup">
  <h1 class="setup-title">Evalueringsoppsett</h1>
  <p class="setup-subtitle">{data.procurementName || 'Ny evaluering'}</p>

  <!-- 01 Evalueringsmetode -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">01</span>
      <h2 class="section-label">Evalueringsmetode</h2>
    </div>
    <div class="method-grid">
      <button
        class="method-card"
        class:method-active={evaluation.activeMethod === 'poeng'}
        onclick={() => (evaluation.activeMethod = 'poeng')}
      >
        <div class="method-name">Poengmodell</div>
        <div class="method-desc">
          Leverandørene scores på kvalitet 0–10. Pris omregnes til poeng. Høyest vektet totalpoeng
          vinner.
        </div>
      </button>
      <button
        class="method-card"
        class:method-active={evaluation.activeMethod === 'pris'}
        onclick={() => (evaluation.activeMethod = 'pris')}
      >
        <div class="method-name">Prismodell</div>
        <div class="method-desc">
          Kvalitetsvurdering gir kronetrekk fra tilbudt pris. Laveste evaluerte pris vinner.
        </div>
      </button>
    </div>
  </div>

  <!-- 02 Leverandører -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">02</span>
      <h2 class="section-label">Leverandører</h2>
    </div>
    <p class="section-desc">Leverandørene som har levert tilbud og skal evalueres.</p>

    {#if suppliers.length < 2}
      <div class="warn">Minimum 2 leverandører for å starte evaluering.</div>
    {/if}

    <div class="list-box">
      {#each suppliers as lev, i (lev.id)}
        <div class="list-row" class:list-row-alt={i % 2 === 1}>
          <span class="list-num">{i + 1}.</span>
          <input
            class="list-input"
            type="text"
            value={lev.name}
            oninput={(e) => evaluation.renameSupplier(lev.id, e.currentTarget.value)}
            placeholder="Leverandørens navn"
          />
          <button
            class="remove-btn"
            disabled={suppliers.length <= 1}
            onclick={() => evaluation.removeSupplier(lev.id)}
            title="Fjern"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
    <button class="add-btn" onclick={() => evaluation.addSupplier('')}>+ Legg til leverandør</button
    >
  </div>

  <!-- 03 Kriteriestruktur -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">03</span>
      <h2 class="section-label">Kriteriestruktur</h2>
    </div>
    <p class="section-desc">
      {#if isPrismodell}
        Definer tildelingskriterier og maks fradrag i kroner. Klikk ▶ for underkriterier.
      {:else}
        Definer tildelingskriterier med vekter. Klikk ▶ for å utvide underkriterier, roller og
        dimensjoner.
      {/if}
    </p>

    {#if !isPrismodell && vektSum !== 100}
      <div class="warn">Hovedvekter summerer til {vektSum}% — forventet 100%.</div>
    {/if}
    {#if isPrismodell && !hasFradrag}
      <div class="warn">Angi maks fradrag for minst ett kvalitetskriterium.</div>
    {/if}
    {#if !hasPris}
      <div class="warn">Priskriterium mangler.</div>
    {/if}
    {#if !hasKval}
      <div class="warn">Minst ett kvalitetskriterium kreves.</div>
    {/if}
    {#if !isPrismodell && vektSum === 100 && hasPris && hasKval}
      <div class="ok">Kriteriestrukturen er gyldig. Vekter summerer til 100%.</div>
    {/if}
    {#if isPrismodell && hasFradrag && hasPris && hasKval}
      <div class="ok">Kvalitetsbudsjett: {fN(totalFradrag)} kr. Klar for evaluering.</div>
    {/if}

    <div class="list-box">
      <!-- Header -->
      <div class="krit-header">
        <span></span>
        <span>Kriterium</span>
        <span class="krit-header-right">{isPrismodell ? 'Maks fradrag' : 'Vekt'}</span>
        <span>Type</span>
        <span></span>
      </div>

      {#each criteria as k, i (k.id)}
        {@const mode = displayMode(k)}
        {@const hasChildren = mode === 'traditional' || mode === 'resource'}
        {@const isExpanded = expandedIds.has(k.id)}
        {@const isPris = k.type === 'price'}

        <!-- Main row -->
        <div
          class="krit-row"
          class:krit-row-expanded={isExpanded}
          class:krit-row-alt={i % 2 === 1 && !isExpanded}
        >
          <div class="krit-expand">
            {#if hasChildren}
              <button
                class="expand-btn"
                class:expand-open={isExpanded}
                onclick={() => toggleExpand(k.id)}
              >
                ▶
              </button>
            {/if}
          </div>

          <div class="krit-name">
            {#if isPris}
              <span class="krit-name-fixed">Pris</span>
            {:else}
              <input
                class="krit-name-input"
                type="text"
                value={k.name}
                oninput={(e) => evaluation.renameCriterion(k.id, e.currentTarget.value)}
                placeholder="Kriterienavn"
              />
            {/if}
          </div>

          <div class="krit-weight">
            {#if isPrismodell}
              {#if isPris}
                <span class="krit-type-fixed">—</span>
              {:else}
                <input
                  class="fradrag-input"
                  type="number"
                  value={k.maxPriceDeduction ?? ''}
                  oninput={(e) => {
                    const v = e.currentTarget.value;
                    evaluation.setCriterionMaxPriceDeduction(k.id, v === '' ? 0 : parseFloat(v));
                  }}
                  placeholder="0"
                />
                <span class="weight-suffix">kr</span>
              {/if}
            {:else}
              <input
                class="weight-input"
                type="number"
                value={k.weight}
                oninput={(e) => {
                  const v = e.currentTarget.value;
                  evaluation.setCriterionWeight(k.id, v === '' ? 0 : parseFloat(v));
                }}
                placeholder="0"
              />
              <span class="weight-suffix">%</span>
            {/if}
          </div>

          <div class="krit-type">
            {#if isPris}
              <span class="krit-type-fixed">pris</span>
            {:else}
              <select
                class="type-select"
                value={mode}
                onchange={(e) => setDisplayMode(k.id, e.currentTarget.value as any)}
              >
                <option value="leaf">Enkel</option>
                <option value="traditional">Tradisjonell</option>
                <option value="resource">Ressurs</option>
              </select>
            {/if}
          </div>

          <button
            class="remove-btn"
            disabled={criteria.length <= 1 || isPris}
            onclick={() => evaluation.removeCriterion(k.id)}
            title="Fjern"
          >
            ×
          </button>
        </div>

        <!-- Expanded: Traditional sub-criteria -->
        {#if isExpanded && mode === 'traditional'}
          {@const subSum = k.subcriteria.reduce((s, u) => s + u.weight, 0)}
          <div class="expand-panel">
            <div class="expand-label">Underkriterier</div>
            <div class="sub-list">
              {#each k.subcriteria as sub, j (sub.id)}
                <div class="sub-row">
                  <input
                    class="sub-input"
                    type="text"
                    value={sub.name}
                    oninput={(e) => evaluation.renameSubCriterion(sub.id, e.currentTarget.value)}
                    placeholder="Underkriterienavn"
                  />
                  <div class="sub-weight">
                    <input
                      class="weight-input weight-input-sm"
                      type="number"
                      value={sub.weight}
                      oninput={(e) => {
                        const v = e.currentTarget.value;
                        evaluation.setSubCriterionWeight(sub.id, v === '' ? 0 : parseFloat(v));
                      }}
                      placeholder="0"
                    />
                    <span class="weight-suffix">%</span>
                  </div>
                  <button
                    class="remove-btn"
                    disabled={k.subcriteria.length <= 1}
                    onclick={() => evaluation.removeSubCriterion(sub.id)}
                    title="Fjern"
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>
            <div class="sub-footer">
              <button class="add-btn" onclick={() => evaluation.addSubCriterion(k.id, '', 0)}>
                + Underkriterium
              </button>
              <span
                class="sum-display"
                class:sum-ok={subSum === 100}
                class:sum-warn={subSum !== 100}
              >
                Σ {subSum}%
              </span>
            </div>
          </div>
        {/if}

        <!-- Expanded: Resource roles + dimensions -->
        {#if isExpanded && mode === 'resource'}
          {@const dimSum = k.subcriteria.reduce((s, d) => s + d.weight, 0)}
          <div class="expand-panel">
            <div class="resource-columns">
              <!-- Roller -->
              <div class="resource-col">
                <div class="expand-label">Roller</div>
                <div class="sub-list">
                  {#each k.roles ?? [] as role, j (role.id)}
                    <div class="sub-row">
                      <input
                        class="sub-input"
                        type="text"
                        value={role.name}
                        oninput={(e) => evaluation.renameRole(k.id, role.id, e.currentTarget.value)}
                        placeholder="Rollenavn"
                      />
                      <button
                        class="remove-btn"
                        disabled={(k.roles?.length ?? 0) <= 1}
                        onclick={() => evaluation.removeRole(k.id, role.id)}
                        title="Fjern"
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                </div>
                <button class="add-btn" onclick={() => evaluation.addRole(k.id, '')}>+ Rolle</button
                >
              </div>

              <!-- Dimensjoner (moments) -->
              <div class="resource-col">
                <div class="expand-label">Dimensjoner (momenter)</div>
                <div class="sub-list">
                  {#each k.subcriteria as dim, j (dim.id)}
                    <div class="sub-row">
                      <input
                        class="sub-input"
                        type="text"
                        value={dim.name}
                        oninput={(e) =>
                          evaluation.renameSubCriterion(dim.id, e.currentTarget.value)}
                        placeholder="Dimensjonsnavn"
                      />
                      <div class="sub-weight">
                        <input
                          class="weight-input weight-input-sm"
                          type="number"
                          value={dim.weight}
                          oninput={(e) => {
                            const v = e.currentTarget.value;
                            evaluation.setSubCriterionWeight(dim.id, v === '' ? 0 : parseFloat(v));
                          }}
                          placeholder="0"
                        />
                        <span class="weight-suffix">%</span>
                      </div>
                      <button
                        class="remove-btn"
                        disabled={k.subcriteria.length <= 1}
                        onclick={() => evaluation.removeSubCriterion(dim.id)}
                        title="Fjern"
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                </div>
                <div class="sub-footer">
                  <button class="add-btn" onclick={() => evaluation.addSubCriterion(k.id, '', 0)}>
                    + Dimensjon
                  </button>
                  <span
                    class="sum-display"
                    class:sum-ok={dimSum === 100}
                    class:sum-warn={dimSum !== 100}
                  >
                    Σ {dimSum}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <div class="krit-footer">
      <button class="add-btn" onclick={() => evaluation.addCriterion('', 'quality')}>
        + Legg til kriterium
      </button>
      {#if isPrismodell}
        <span class="sum-display" class:sum-ok={hasFradrag} class:sum-warn={!hasFradrag}>
          Σ {fN(totalFradrag)} kr
        </span>
      {:else}
        <span class="sum-display" class:sum-ok={vektSum === 100} class:sum-warn={vektSum !== 100}>
          Σ {vektSum}%
        </span>
      {/if}
    </div>
  </div>

  <!-- 04 Prismodell — kvalitetsbudsjett (only for pris method) -->
  {#if isPrismodell}
    <div class="section">
      <div class="section-header">
        <span class="section-num">04</span>
        <h2 class="section-label">Kvalitetsbudsjett</h2>
      </div>
      <p class="section-desc">
        Maks fradrag per kriterium uttrykker din betalingsvilje for kvalitet utover minimumskrav.
        Summen er kvalitetsbudsjettet — den totale kroneverdien kvalitet kan påvirke evaluert pris.
      </p>

      <div class="fradrag-table">
        <div class="fradrag-header">
          <span>Kriterium</span>
          <span class="fradrag-right">Maks fradrag</span>
          <span class="fradrag-center">Andel</span>
          <span class="fradrag-right">Kr/poeng</span>
        </div>
        {#each kvalKrit as k, i (k.id)}
          {@const fradrag = k.maxPriceDeduction ?? 0}
          {@const krp = fradrag > 0 ? Math.round(fradrag / 10) : 0}
          {@const andel = totalFradrag > 0 ? Math.round((fradrag / totalFradrag) * 100) : 0}
          <div class="fradrag-row">
            <span class="fradrag-name">{k.name || '(uten navn)'}</span>
            <div class="fradrag-right">
              <input
                class="fradrag-input"
                type="number"
                value={fradrag || ''}
                oninput={(e) => {
                  const v = e.currentTarget.value;
                  evaluation.setCriterionMaxPriceDeduction(k.id, v === '' ? 0 : parseFloat(v));
                }}
                placeholder="0"
              />
              <span class="weight-suffix">kr</span>
            </div>
            <span class="fradrag-center fradrag-weight">
              {fradrag > 0 ? andel + '%' : '–'}
            </span>
            <span class="fradrag-right fradrag-krp">
              {krp > 0 ? fN(krp) + ' kr' : '–'}
            </span>
          </div>
        {/each}
        <div class="fradrag-total">
          <span class="fradrag-total-label">Kvalitetsbudsjett</span>
          <span class="fradrag-right fradrag-total-val">{fN(totalFradrag)} kr</span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Start button -->
  <div class="setup-footer">
    <div class="footer-issues">
      {#if !isValid || !subWeightOk}
        {#if !hasEnoughLev}
          <div class="footer-issue">· Minimum 2 leverandører med navn</div>
        {/if}
        {#if !hasPris}
          <div class="footer-issue">· Priskriterium mangler</div>
        {/if}
        {#if !hasKval}
          <div class="footer-issue">· Minst ett kvalitetskriterium kreves</div>
        {/if}
        {#if isPrismodell && !hasFradrag}
          <div class="footer-issue">· Angi maks fradrag for minst ett kvalitetskriterium</div>
        {/if}
        {#if !isPrismodell && vektSum !== 100}
          <div class="footer-issue">· Hovedvekter summerer til {vektSum}%, forventet 100%</div>
        {/if}
        {#if !subWeightOk}
          <div class="footer-issue">· Undervekter summerer ikke til 100%</div>
        {/if}
      {/if}
    </div>
    <button class="start-btn" disabled={!isValid || !subWeightOk} onclick={onstart}>
      Start evaluering →
    </button>
  </div>
</div>

<style>
  .setup {
    max-width: 800px;
    margin: 0 auto;
  }

  .setup-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    letter-spacing: -0.02em;
    margin-bottom: var(--spacing-1);
  }

  .setup-subtitle {
    font-size: 12px;
    color: var(--color-ink-ghost);
    margin-bottom: 0;
  }

  /* Sections */
  .section {
    margin-top: var(--spacing-6);
  }

  .section-header {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .section-num {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-ghost);
  }

  .section-label {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .section-desc {
    font-size: 11px;
    color: var(--color-ink-ghost);
    margin-bottom: var(--spacing-3);
    line-height: 1.5;
  }

  /* Validation */
  .warn {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.5;
    background: var(--color-score-low-bg);
    border: 1px solid var(--color-score-low);
    color: var(--color-score-low);
    font-weight: 500;
    margin-bottom: var(--spacing-3);
  }

  .ok {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.5;
    background: var(--color-score-high-bg);
    border: 1px solid var(--color-score-high);
    color: var(--color-score-high);
    font-weight: 500;
    margin-bottom: var(--spacing-3);
  }

  /* Method selection */
  .method-grid {
    display: flex;
    gap: var(--spacing-3);
  }

  .method-card {
    flex: 1;
    padding: var(--spacing-4) var(--spacing-5);
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    transition: all 0.12s;
  }

  .method-active {
    border-color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .method-card:hover:not(.method-active) {
    background: var(--color-felt-hover);
  }

  .method-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: var(--spacing-1);
  }

  .method-active .method-name {
    color: var(--color-vekt);
  }

  .method-desc {
    font-size: 11px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  /* List box */
  .list-box {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .list-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    border-top: 1px solid var(--color-wire);
  }

  .list-row:first-child {
    border-top: none;
  }

  .list-row-alt {
    background: var(--color-felt-raised);
  }

  .list-num {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    width: 20px;
    text-align: right;
    flex-shrink: 0;
  }

  .list-input {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
  }

  .list-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  /* Buttons */
  .remove-btn {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-ink-ghost);
    font-size: 14px;
    padding: 0 var(--spacing-1);
    font-family: var(--font-ui);
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.1s;
  }

  .remove-btn:disabled {
    cursor: default;
    opacity: 0.3;
  }

  .remove-btn:hover:not(:disabled) {
    opacity: 1;
    color: var(--color-score-low);
  }

  .add-btn {
    border: 1px dashed var(--color-wire);
    background: transparent;
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-4);
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    font-family: var(--font-ui);
    transition: all 0.12s;
    margin-top: var(--spacing-2);
  }

  .add-btn:hover {
    border-color: var(--color-vekt);
    color: var(--color-vekt);
  }

  /* Criteria */
  .krit-header {
    display: grid;
    grid-template-columns: 24px 1fr 70px 120px 32px;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    align-items: center;
  }

  .krit-header-right {
    text-align: right;
  }

  .krit-row {
    display: grid;
    grid-template-columns: 24px 1fr 70px 120px 32px;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    align-items: center;
    border-top: 1px solid var(--color-wire);
    transition: background 0.1s;
  }

  .krit-row:first-of-type {
    border-top: none;
  }

  .krit-row-expanded {
    background: var(--color-vekt-bg);
  }

  .krit-row-alt:not(.krit-row-expanded) {
    background: var(--color-felt-raised);
  }

  .krit-expand {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .expand-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--color-ink-ghost);
    padding: 0 var(--spacing-1);
    font-family: var(--font-data);
    transition: transform 0.15s;
    display: inline-block;
  }

  .expand-open {
    transform: rotate(90deg);
  }

  .krit-name {
    min-width: 0;
  }

  .krit-name-fixed {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink);
    padding: var(--spacing-1) 0;
  }

  .krit-name-input {
    width: 100%;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
  }

  .krit-name-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .krit-weight {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .weight-input {
    width: 55px;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
    text-align: right;
  }

  .weight-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .weight-input-sm {
    width: 50px;
  }

  .weight-suffix {
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-family: var(--font-data);
  }

  .krit-type {
    min-width: 0;
  }

  .krit-type-fixed {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
    padding: var(--spacing-1) var(--spacing-2);
  }

  .type-select {
    width: 100%;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--color-ink);
    background: var(--color-felt);
    outline: none;
    cursor: pointer;
  }

  .type-select:focus {
    border-color: var(--color-vekt);
  }

  .krit-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-2);
  }

  .sum-display {
    font-size: 12px;
    font-family: var(--font-data);
    font-weight: 600;
  }

  .sum-ok {
    color: var(--color-score-high);
  }

  .sum-warn {
    color: var(--color-score-low);
  }

  /* Expand panels */
  .expand-panel {
    padding: var(--spacing-2) var(--spacing-3) var(--spacing-3) var(--spacing-12);
    background: var(--color-vekt-bg);
    border-top: 1px solid var(--color-wire);
  }

  .fradrag-inline {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .fradrag-inline-label {
    font-size: 11px;
    color: var(--color-ink-secondary);
    font-weight: 500;
  }

  .fradrag-inline-krp {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  .expand-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: var(--spacing-2);
  }

  .sub-list {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .sub-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-2);
    border-top: 1px solid var(--color-wire);
    background: var(--color-felt);
  }

  .sub-row:first-child {
    border-top: none;
  }

  .sub-input {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
  }

  .sub-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .sub-weight {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-shrink: 0;
  }

  .sub-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-2);
  }

  .resource-columns {
    display: flex;
    gap: var(--spacing-5);
    flex-wrap: wrap;
  }

  .resource-col {
    flex: 1 1 200px;
  }

  /* Fradrag table */
  .fradrag-table {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .fradrag-header {
    display: grid;
    grid-template-columns: 1fr 60px 120px 100px;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-felt-raised);
    border-bottom: 1px solid var(--color-wire);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .fradrag-row {
    display: grid;
    grid-template-columns: 1fr 60px 120px 100px;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    align-items: center;
    border-top: 1px solid var(--color-wire);
  }

  .fradrag-row:first-of-type {
    border-top: none;
  }

  .fradrag-center {
    text-align: center;
  }

  .fradrag-right {
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-1);
  }

  .fradrag-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
  }

  .fradrag-weight {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .fradrag-input {
    width: 100px;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink);
    outline: none;
    text-align: right;
  }

  .fradrag-input:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .fradrag-krp {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .fradrag-total {
    display: grid;
    grid-template-columns: 1fr 60px 120px 100px;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    border-top: 1.5px solid var(--color-wire-strong);
    font-weight: 700;
  }

  .fradrag-total-label {
    font-size: 12px;
  }

  .fradrag-total-val {
    font-family: var(--font-data);
    font-size: 12px;
  }

  /* Footer */
  .setup-footer {
    margin-top: var(--spacing-8);
    padding-top: var(--spacing-5);
    border-top: 1px solid var(--color-wire);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-issues {
    font-size: 11px;
    color: var(--color-ink-ghost);
    line-height: 1.5;
  }

  .footer-issue {
    margin-bottom: var(--spacing-1);
  }

  .start-btn {
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-sm);
    border: none;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    background: var(--color-vekt);
    color: #fff;
    transition: all 0.15s;
  }

  .start-btn:disabled {
    background: var(--color-wire-strong);
    color: var(--color-ink-ghost);
    cursor: not-allowed;
  }

  .start-btn:not(:disabled):hover {
    background: var(--color-vekt-dim);
  }
</style>
