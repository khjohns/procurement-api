<script lang="ts">
  import { getProcName, ARTIFIK_PROCEDURE_TO_EFORMS } from '$lib/utils/protokoll-helpers';
  import { eformsLabel } from '$lib/utils/eforms-labels';

  interface Props {
    procurement: any;
    title: string;
  }

  let { procurement, title }: Props = $props();

  let procName = $derived(getProcName(procurement));
  let externalRef = $derived(procurement?.externalId ?? '');
  let procedureLabel = $derived.by(() => {
    const code = procurement?.procedure ?? '';
    const eformsCode = ARTIFIK_PROCEDURE_TO_EFORMS[code];
    return eformsCode
      ? eformsLabel('procurement-procedure-type', eformsCode, code)
      : code;
  });
</script>

<header class="workspace-header">
  <div class="header-context">
    <span class="context-name">{procName}</span>
    {#if externalRef}
      <span class="context-sep">&middot;</span>
      <span class="context-ref">{externalRef}</span>
    {/if}
    {#if procedureLabel}
      <span class="context-sep">&middot;</span>
      <span class="context-procedure">{procedureLabel}</span>
    {/if}
  </div>
  <div class="header-section-label">{title}</div>
</header>

<style>
  .workspace-header {
    margin-bottom: var(--spacing-5);
    flex-shrink: 0;
  }

  .header-context {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 12px;
    color: var(--color-ink-secondary);
    margin-bottom: var(--spacing-2);
  }

  .context-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .context-sep {
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .context-ref {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-ghost);
    white-space: nowrap;
  }

  .context-procedure {
    font-size: 11px;
    color: var(--color-ink-muted);
    white-space: nowrap;
  }

  .header-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-ink-ghost);
    margin-top: var(--spacing-3);
  }
</style>
