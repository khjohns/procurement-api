<script lang="ts">
  import type { ContractItem, ContractDeviation } from '$lib/types/contract';
  import { formatVarighet, opsjonsVarighetAar, forlengetUtlopsdato } from '$lib/utils/format';

  let {
    contract,
    onclose,
  }: {
    contract: ContractItem | null;
    onclose: () => void;
  } = $props();

  type Tab = 'oversikt' | 'avvik' | 'endringer' | 'milepaeler' | 'avrop' | 'raw';
  let aktivFane = $state<Tab>('oversikt');

  function fmtValuta(belop: number | null | undefined, currency: string = 'NOK'): string {
    if (belop === null || belop === undefined) return '–';
    return `${belop.toLocaleString('nb-NO')} ${currency}`;
  }

  function fmtDato(datoStr: string | null | undefined): string {
    if (!datoStr) return '–';
    try {
      const d = new Date(datoStr);
      return isNaN(d.getTime())
        ? datoStr
        : d.toLocaleDateString('nb-NO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
    } catch {
      return datoStr;
    }
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if contract}
  <div class="drawer-backdrop" role="presentation" onclick={handleBackdrop}>
    <div class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <!-- Header -->
      <header class="drawer-header">
        <div class="header-main">
          <div class="meta-row">
            {#if contract.contractNumber}
              <span class="contract-nr font-mono">{contract.contractNumber}</span>
            {/if}
            {#if contract.referenceId}
              <span class="ref-id font-mono">Ref: {contract.referenceId}</span>
            {/if}
            <span class="type-tag">{contract.type}</span>
            <span class="status-badge status-{contract.signingStatus.toLowerCase()}">
              {contract.signingStatus}
            </span>
          </div>
          <h2 id="drawer-title" class="drawer-title">{contract.name}</h2>
          <div class="supplier-subtitle">
            Leverandør: <strong
              >{contract.supplierOrg?.name ||
                contract.supplierOrgName ||
                'Ikke spesifisert'}</strong
            >
            {#if contract.supplierOrg?.orgNumber || contract.supplierOrgNumber}
              <span class="org-nr font-mono"
                >({contract.supplierOrg?.orgNumber || contract.supplierOrgNumber})</span
              >
            {/if}
          </div>
        </div>
        <button class="close-btn" onclick={onclose} aria-label="Lukk detaljer">&times;</button>
      </header>

      <!-- Tabs Navigation -->
      <nav class="drawer-tabs">
        <button
          class="tab-btn"
          class:active={aktivFane === 'oversikt'}
          onclick={() => (aktivFane = 'oversikt')}
        >
          Oversikt & Parter
        </button>
        <button
          class="tab-btn"
          class:active={aktivFane === 'avvik'}
          onclick={() => (aktivFane = 'avvik')}
        >
          Avvik (KAV)
          {#if (contract.deviations?.length ?? 0) > 0}
            <span class="tab-badge badge-warn">{contract.deviations?.length}</span>
          {/if}
        </button>
        <button
          class="tab-btn"
          class:active={aktivFane === 'endringer'}
          onclick={() => (aktivFane = 'endringer')}
        >
          Endringsordrer
          {#if (contract.amendments?.length ?? 0) > 0}
            <span class="tab-badge">{contract.amendments?.length}</span>
          {/if}
        </button>
        <button
          class="tab-btn"
          class:active={aktivFane === 'milepaeler'}
          onclick={() => (aktivFane = 'milepaeler')}
        >
          Milepæler
          {#if (contract.milestones?.length ?? 0) > 0}
            <span class="tab-badge">{contract.milestones?.length}</span>
          {/if}
        </button>
        <button
          class="tab-btn"
          class:active={aktivFane === 'avrop'}
          onclick={() => (aktivFane = 'avrop')}
        >
          Avrop
          {#if (contract.callOffIds?.length ?? 0) > 0}
            <span class="tab-badge">{contract.callOffIds?.length}</span>
          {/if}
        </button>
        <button
          class="tab-btn"
          class:active={aktivFane === 'raw'}
          onclick={() => (aktivFane = 'raw')}
        >
          Rådata (JSON)
        </button>
      </nav>

      <!-- Content area -->
      <div class="drawer-body">
        {#if aktivFane === 'oversikt'}
          <section class="section-block">
            <h3 class="section-title">Kontraktsfakta</h3>
            <dl class="facts-grid">
              <div class="fact-item">
                <dt>Oppdragsgiver</dt>
                <dd>{contract.buyerOrgName || contract.organizationId || '–'}</dd>
              </div>
              <div class="fact-item">
                <dt>Avtaleeier / Saksbehandler</dt>
                <dd>{contract.owner?.name || contract.ownerId || '–'}</dd>
              </div>
              <div class="fact-item">
                <dt>Avtaleverdi</dt>
                <dd class="font-mono text-valuta">
                  {fmtValuta(contract.value, contract.currency)}
                </dd>
              </div>
              <div class="fact-item">
                <dt>Startdato</dt>
                <dd class="font-mono">{fmtDato(contract.duration_start)}</dd>
              </div>
              <div class="fact-item">
                <dt>Sluttdato (utløp)</dt>
                <dd class="font-mono">{fmtDato(contract.duration_end)}</dd>
              </div>
              <div class="fact-item">
                <dt>Total varighet</dt>
                <dd class="font-mono text-valuta">
                  {formatVarighet(
                    contract.duration_start,
                    contract.duration_end,
                    contract.duration_months,
                    contract.duration
                  )}
                </dd>
              </div>
              {#if contract.optionsJSON && opsjonsVarighetAar(contract.optionsJSON) > 0}
                {@const optAar = opsjonsVarighetAar(contract.optionsJSON)}
                {@const forlengetDato = forlengetUtlopsdato(
                  contract.duration_end,
                  contract.optionsJSON
                )}
                <div class="fact-item">
                  <dt>Opsjon / forlengelse</dt>
                  <dd class="font-mono text-opsjon">
                    +{optAar} år
                    {#if forlengetDato}
                      <span class="text-opsjon-sub"
                        >(siste mulig utløp {fmtDato(forlengetDato)})</span
                      >
                    {/if}
                  </dd>
                </div>
              {/if}
              <div class="fact-item">
                <dt>Varighetstekst (API)</dt>
                <dd>{contract.duration || '–'}</dd>
              </div>
              <div class="fact-item">
                <dt>Opprinnelig anskaffelse (ID)</dt>
                <dd>
                  {#if contract.procurementId}
                    <a
                      href="/anskaffelser/{contract.procurementId}"
                      class="link-procurement font-mono"
                    >
                      #{contract.procurementId} (se anskaffelse)
                    </a>
                  {:else}
                    –
                  {/if}
                </dd>
              </div>
              <div class="fact-item">
                <dt>PAdES / Signatur</dt>
                <dd>
                  {#if contract.padesFile}
                    <span class="tag-success">✓ Signert PAdES fil</span>
                  {:else if contract.markedAsSignedOutsideArtifik}
                    <span>Signert utenfor Artifik</span>
                  {:else}
                    <span>{contract.signingStatus}</span>
                  {/if}
                </dd>
              </div>
            </dl>

            {#if contract.description}
              <div class="description-box">
                <h4>Beskrivelse / Formål</h4>
                <p>{contract.description}</p>
              </div>
            {/if}

            {#if contract.children && contract.children.length > 0}
              <div class="children-box">
                <h4>Underkontrakter / Delkontrakter ({contract.children.length})</h4>
                <ul class="subcontracts-list">
                  {#each contract.children as child}
                    <li class="subcontract-card">
                      <div class="subcontract-head">
                        <span class="subcontract-name">{child.name}</span>
                        <span class="subcontract-nr font-mono">{child.contractNumber || '–'}</span>
                      </div>
                      <div class="subcontract-sub">
                        <span>Lev: {child.supplierOrgName || child.supplierOrg?.name || '–'}</span>
                        <span class="font-mono">{fmtValuta(child.value, child.currency)}</span>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if contract.files && contract.files.length > 0}
              <div class="files-box">
                <h4>Vedlagte kontraktsdokumenter ({contract.files.length})</h4>
                <ul class="files-list">
                  {#each contract.files as file}
                    <li class="file-item">
                      <span class="file-icon">📄</span>
                      <span class="file-name">{file.name}</span>
                      {#if file.lastModified}
                        <span class="file-date font-mono">{fmtDato(file.lastModified)}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </section>
        {:else if aktivFane === 'avvik'}
          <section class="section-block">
            <div class="section-head-flex">
              <h3 class="section-title">KAV Avviksregister</h3>
              <span class="count-pill">{contract.deviations?.length ?? 0} registrert</span>
            </div>

            {#if !contract.deviations || contract.deviations.length === 0}
              <div class="empty-placeholder">
                <p>Ingen avvik er registrert på denne kontrakten.</p>
              </div>
            {:else}
              <div class="deviations-feed">
                {#each contract.deviations as dev}
                  <article class="deviation-card severity-{dev.severity.toLowerCase()}">
                    <div class="card-top">
                      <span class="severity-pill">{dev.severity.toUpperCase()}</span>
                      <span class="status-pill status-{dev.status}">{dev.status}</span>
                      <span class="date font-mono"
                        >{fmtDato(dev.timeOfDiscovery || dev.createdAt)}</span
                      >
                    </div>
                    <h4 class="card-title">{dev.name}</h4>
                    {#if dev.resolutionNote}
                      <div class="resolution-box">
                        <strong>Løsning ({dev.resolutionType || 'Notat'}):</strong>
                        <p>{dev.resolutionNote}</p>
                      </div>
                    {/if}
                    {#if dev.dismissReason}
                      <div class="dismiss-box">
                        <strong>Avvisningsgrunn:</strong>
                        {dev.dismissReason}
                      </div>
                    {/if}
                  </article>
                {/each}
              </div>
            {/if}
          </section>
        {:else if aktivFane === 'endringer'}
          <section class="section-block">
            <div class="section-head-flex">
              <h3 class="section-title">Kontraktsendringer & Forlengelser</h3>
              <span class="count-pill">{contract.amendments?.length ?? 0} registrert</span>
            </div>

            {#if !contract.amendments || contract.amendments.length === 0}
              <div class="empty-placeholder">
                <p>Ingen endringsordrer eller forlengelser er registrert på denne avtalen.</p>
              </div>
            {:else}
              <div class="amendments-feed">
                {#each contract.amendments as amend}
                  <div class="amendment-card">
                    <div class="card-top">
                      <span class="amend-nr font-mono">#{amend.id}</span>
                      <span class="status-badge status-{amend.signingStatus.toLowerCase()}"
                        >{amend.signingStatus}</span
                      >
                      <span class="date font-mono">{fmtDato(amend.creationTime)}</span>
                    </div>
                    <h4 class="card-title">{amend.name}</h4>
                    {#if amend.markedAsSignedOutsideArtifik}
                      <span class="tag-external">Signert manuelt / eksternt</span>
                    {/if}

                    {#if amend.files && amend.files.length > 0}
                      <div class="amend-files">
                        <h5>Vedlagte filer:</h5>
                        <ul>
                          {#each amend.files as f}
                            <li class="file-item">
                              <span>📎</span>
                              <span class="file-name">{f.name}</span>
                            </li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {:else if aktivFane === 'milepaeler'}
          <section class="section-block">
            <div class="section-head-flex">
              <h3 class="section-title">Milepæler & Frister</h3>
              <span class="count-pill">{contract.milestones?.length ?? 0}</span>
            </div>

            {#if !contract.milestones || contract.milestones.length === 0}
              <div class="empty-placeholder">
                <p>Ingen milepæler er registrert på denne avtalen.</p>
              </div>
            {:else}
              <div class="milestones-list">
                {#each contract.milestones as ms}
                  <div class="milestone-card">
                    <div class="ms-date font-mono">{fmtDato(ms.date)}</div>
                    <div class="ms-info">
                      <div class="ms-name">{ms.name}</div>
                      {#if ms.reminders && ms.reminders.length > 0}
                        <div class="ms-reminders font-mono">
                          🔔 {ms.reminders.length} påminnelser konfigurert
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {:else if aktivFane === 'avrop'}
          <section class="section-block">
            <div class="section-head-flex">
              <h3 class="section-title">Avrop på rammeavtale</h3>
              <span class="count-pill">{contract.callOffIds?.length ?? 0} avrop</span>
            </div>

            {#if !contract.callOffIds || contract.callOffIds.length === 0}
              <div class="empty-placeholder">
                <p>Ingen avrop er logget via API på denne avtalen.</p>
              </div>
            {:else}
              <div class="calloffs-container">
                <p class="helper-text">
                  API-et lister referanse-ID-ene for gjennomførte avrop under denne rammeavtalen:
                </p>
                <div class="calloff-tags">
                  {#each contract.callOffIds as cid}
                    <span class="calloff-tag font-mono">Avrop #{cid}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </section>
        {:else if aktivFane === 'raw'}
          <section class="section-block">
            <h3 class="section-title">Komplett Artifik API respons</h3>
            <pre class="raw-code"><code>{JSON.stringify(contract, null, 2)}</code></pre>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-overlay, rgba(0, 0, 0, 0.45));
    backdrop-filter: blur(2px);
    z-index: 999;
    display: flex;
    justify-content: flex-end;
  }

  .drawer-panel {
    width: 100%;
    max-width: 720px;
    height: 100vh;
    background: var(--color-felt, #fbfaf8);
    border-left: 1px solid var(--color-wire, #ccc8bf);
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-5, 20px) var(--spacing-6, 24px);
    border-bottom: 1px solid var(--color-wire, #ccc8bf);
    background: var(--color-felt-raised, #f4f2ee);
  }

  .header-main {
    flex: 1;
    margin-right: var(--spacing-4, 16px);
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    margin-bottom: var(--spacing-1, 4px);
    flex-wrap: wrap;
  }

  .contract-nr {
    font-weight: 700;
    color: var(--color-ink, #1e2530);
    font-size: 0.85rem;
  }

  .ref-id {
    color: var(--color-ink-secondary, #4d5666);
    font-size: 0.75rem;
  }

  .type-tag {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    background: var(--color-felt-hover, #f0ede7);
    border: 1px solid var(--color-wire, #ccc8bf);
    color: var(--color-ink-muted, #6b6660);
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    text-transform: uppercase;
  }

  .status-signed {
    background: var(--color-score-high-bg, #edf5f0);
    color: var(--color-score-high, #3d7a5a);
    border: 1px solid var(--color-score-high, #3d7a5a);
  }

  .drawer-title {
    margin: 0 0 var(--spacing-1, 4px) 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-ink, #1e2530);
    line-height: 1.3;
  }

  .supplier-subtitle {
    font-size: 0.85rem;
    color: var(--color-ink-secondary, #4d5666);
  }

  .org-nr {
    font-size: 0.8rem;
    color: var(--color-ink-muted, #6b6660);
  }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 1.75rem;
    color: var(--color-ink-muted, #6b6660);
    cursor: pointer;
    line-height: 1;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 4px);
  }

  .close-btn:hover {
    background: var(--color-felt-hover, #f0ede7);
    color: var(--color-ink, #1e2530);
  }

  .drawer-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-wire, #ccc8bf);
    background: var(--color-felt, #fbfaf8);
    overflow-x: auto;
    padding: 0 var(--spacing-4, 16px);
  }

  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: var(--spacing-3, 12px) var(--spacing-4, 16px);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-secondary, #4d5666);
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tab-btn:hover {
    color: var(--color-ink, #1e2530);
  }

  .tab-btn.active {
    color: var(--color-vekt, #2b6b7f);
    border-bottom-color: var(--color-vekt, #2b6b7f);
    font-weight: 600;
  }

  .tab-badge {
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--color-felt-active, #e6e3dd);
    color: var(--color-ink, #1e2530);
  }

  .tab-badge.badge-warn {
    background: var(--color-warn-bg, #fdf6e8);
    color: var(--color-warn, #8b6914);
    font-weight: 700;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-6, 24px);
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5, 20px);
  }

  .section-head-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-ink, #1e2530);
  }

  .count-pill {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: var(--color-felt-hover, #f0ede7);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: 999px;
    color: var(--color-ink-secondary, #4d5666);
  }

  .facts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4, 16px);
    margin: 0;
    padding: var(--spacing-4, 16px);
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
  }

  .fact-item dt {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
  }

  .fact-item dd {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink, #1e2530);
  }

  .text-valuta {
    font-weight: 700;
    color: var(--color-vekt, #2b6b7f);
  }

  .text-opsjon {
    font-weight: 700;
    color: var(--color-warn, #8b6914);
  }

  .text-opsjon-sub {
    font-weight: 400;
    font-size: 0.78rem;
    color: var(--color-ink-ghost, #9a9488);
  }

  .link-procurement {
    color: var(--color-vekt, #2b6b7f);
    text-decoration: underline;
  }

  .tag-success {
    color: var(--color-score-high, #3d7a5a);
    font-weight: 600;
  }

  .description-box,
  .children-box,
  .files-box {
    padding: var(--spacing-4, 16px);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    background: var(--color-felt, #fbfaf8);
  }

  .description-box h4,
  .children-box h4,
  .files-box h4 {
    margin: 0 0 var(--spacing-2, 8px) 0;
    font-size: 0.85rem;
    color: var(--color-ink-secondary, #4d5666);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .description-box p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--color-ink, #1e2530);
  }

  .subcontracts-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2, 8px);
  }

  .subcontract-card {
    padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
  }

  .subcontract-head {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .subcontract-sub {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--color-ink-secondary, #4d5666);
    margin-top: 2px;
  }

  .files-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    font-size: 0.85rem;
    padding: 4px 0;
  }

  .file-name {
    flex: 1;
    color: var(--color-ink, #1e2530);
  }

  .file-date {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
  }

  .empty-placeholder {
    padding: var(--spacing-8, 32px);
    text-align: center;
    border: 1px dashed var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    color: var(--color-ink-muted, #6b6660);
    font-size: 0.9rem;
  }

  .deviations-feed,
  .amendments-feed {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3, 12px);
  }

  .deviation-card,
  .amendment-card {
    padding: var(--spacing-4, 16px);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    background: var(--color-felt, #fbfaf8);
  }

  .deviation-card.severity-medium {
    border-left: 4px solid #d97706;
  }

  .deviation-card.severity-high {
    border-left: 4px solid #dc2626;
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    margin-bottom: var(--spacing-2, 8px);
    font-size: 0.75rem;
  }

  .severity-pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    background: var(--color-warn-bg, #fdf6e8);
    color: var(--color-warn, #8b6914);
  }

  .status-pill {
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    background: var(--color-felt-hover, #f0ede7);
    color: var(--color-ink-secondary, #4d5666);
  }

  .card-title {
    margin: 0 0 var(--spacing-2, 8px) 0;
    font-size: 0.95rem;
    color: var(--color-ink, #1e2530);
    line-height: 1.4;
  }

  .resolution-box {
    margin-top: var(--spacing-2, 8px);
    padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
    background: var(--color-score-high-bg, #edf5f0);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.85rem;
    color: var(--color-score-high, #3d7a5a);
  }

  .dismiss-box {
    margin-top: var(--spacing-2, 8px);
    padding: var(--spacing-2, 8px);
    background: var(--color-score-low-bg, #fdf5f0);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.85rem;
    color: var(--color-score-low, #8b5a3d);
  }

  .amend-nr {
    font-weight: 700;
    color: var(--color-ink, #1e2530);
  }

  .tag-external {
    display: inline-block;
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--color-felt-raised, #f4f2ee);
    border-radius: var(--radius-sm, 4px);
    color: var(--color-ink-muted, #6b6660);
    margin-bottom: var(--spacing-2, 8px);
  }

  .amend-files h5 {
    margin: var(--spacing-2, 8px) 0 4px 0;
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
    text-transform: uppercase;
  }

  .milestones-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2, 8px);
  }

  .milestone-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-4, 16px);
    padding: var(--spacing-3, 12px) var(--spacing-4, 16px);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    background: var(--color-felt, #fbfaf8);
  }

  .ms-date {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--color-vekt, #2b6b7f);
    min-width: 100px;
  }

  .ms-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-ink, #1e2530);
  }

  .ms-reminders {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
  }

  .calloffs-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3, 12px);
  }

  .helper-text {
    font-size: 0.85rem;
    color: var(--color-ink-secondary, #4d5666);
    margin: 0;
  }

  .calloff-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2, 8px);
  }

  .calloff-tag {
    padding: 6px 12px;
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-ink, #1e2530);
  }

  .raw-code {
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    padding: var(--spacing-4, 16px);
    font-family: var(--font-data);
    font-size: 0.75rem;
    overflow-x: auto;
    max-height: 500px;
    color: var(--color-ink, #1e2530);
  }

  .font-mono {
    font-family: var(--font-data);
  }
</style>
