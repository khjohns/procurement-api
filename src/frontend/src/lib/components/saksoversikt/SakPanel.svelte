<script lang="ts">
  import type { AnskaffelsesOversiktItem, AnskaffelsesHendelse } from '$lib/types/anskaffelse';
  import { formatDatoKort } from '$lib/utils/format';
  import { MessageCircleQuestion, FilePlus2, FilePenLine, UserMinus, Circle } from 'lucide-svelte';

  interface Props {
    sak: AnskaffelsesOversiktItem | null;
    erAapen: boolean;
    onclose: () => void;
  }

  let { sak, erAapen, onclose }: Props = $props();

  let beskrivelseFull = $state(false);

  const beskrivelse = $derived(sak?.description ?? '');

  // Reset expansion state when switching sak (true side effect per ADR-003)
  $effect(() => {
    if (sak) beskrivelseFull = false;
  });

  /** All hendelser in one chronological list (excluding internal conversation state) */
  const hendelser = $derived(
    [...(sak?.hendelser ?? [])]
      .filter((h) => !SKJULTE_ACTIONS.has(h.action))
      .sort((a, b) => new Date(a.dato).getTime() - new Date(b.dato).getTime())
  );

  /** Whether a hendelse is a lifecycle node (U/K/F/S/T/E/P) */
  function erNode(h: AnskaffelsesHendelse): boolean {
    return h.type !== '';
  }

  /** Actions to hide from the panel (internal conversation state, not meaningful to the user) */
  const SKJULTE_ACTIONS = new Set(['CONVERSATION_MARKED_COMPLETED', 'CONVERSATION_REOPENED']);

  /** Lucide icon component for non-node activities */
  const ACTION_IKON: Record<string, typeof Circle> = {
    PUBLISH_Q8A: MessageCircleQuestion,
    PUBLISH_ADDITIONAL_INFORMATION: FilePlus2,
    PUBLISH_CHANGE_PROCUREMENT: FilePenLine,
    WITHDRAW_PARTICIPATION: UserMinus,
  };

  function ikonForAction(action: string): typeof Circle {
    return ACTION_IKON[action] ?? Circle;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && erAapen) onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
  class="panel"
  class:panel-aapen={erAapen}
  aria-label="Anskaffelsesdetalj"
  aria-hidden={!erAapen}
>
  {#if sak}
    <div class="panel-innhold">
      <button class="mobil-tilbake" onclick={onclose}>
        <span aria-hidden="true">&larr;</span> Tilbake
      </button>

      <div class="panel-header">
        <div class="panel-id">{sak.sequenceId}</div>
        <h2 class="panel-tittel">{sak.name}</h2>
        <div class="panel-meta">
          {#if sak.cancelled}<span class="avlyst-badge">Avlyst</span><span class="panel-sep">&middot;</span>{/if}
          <span class="panel-prosedyre">{sak.procedure}</span>
          <span class="panel-sep">&middot;</span>
          <span class="panel-terskel">{sak.threshold}</span>
          {#if sak.deadline}
            <span class="panel-sep">&middot;</span>
            <span class="panel-frist">Frist {sak.deadline}</span>
          {/if}
        </div>
        {#if sak.contactPerson}
          <div class="panel-saksbehandler">{sak.contactPerson}</div>
        {/if}
        <button class="panel-lukk" onclick={onclose} aria-label="Lukk panel">
          <span aria-hidden="true">&#x2715;</span>
        </button>
      </div>

      <div class="panel-body">
        <!-- Beskrivelse (compact — 4 lines clipped) -->
        {#if beskrivelse}
          <div class="seksjon">
            <div class="section-label">Beskrivelse</div>
            <p class="beskrivelse" class:beskrivelse-full={beskrivelseFull}>{beskrivelse}</p>
            <button class="beskrivelse-toggle" onclick={() => (beskrivelseFull = !beskrivelseFull)}>
              {beskrivelseFull ? 'Vis mindre' : 'Vis mer'}
            </button>
          </div>
        {/if}

        <!-- Hendelsesforløp (integrert kronologi) -->
        {#if hendelser.length > 0}
          <div class="seksjon">
            <div class="section-label">Hendelsesforløp</div>
            <div class="forloep">
              {#each hendelser as h, i (i)}
                {@const erSiste = i === hendelser.length - 1}
                {@const erNodeType = erNode(h)}
                <div
                  class="forloep-linje"
                  class:forloep-besvart={erNodeType && h.besvart}
                  class:forloep-siste={erSiste}
                  class:forloep-aktivitet={!erNodeType}
                >
                  <span class="forloep-dato">{formatDatoKort(h.dato)}</span>
                  <div class="forloep-strek" class:forloep-strek-siste={erSiste}></div>
                  {#if erNodeType}
                    <span
                      class="forloep-node forloep-node-{h.type.toLowerCase()}"
                      class:forloep-node-besvart={h.besvart}
                      class:forloep-node-avvist={h.avvist}>{h.type}</span
                    >
                  {:else}
                    {@const IkonComponent = ikonForAction(h.action)}
                    <span class="forloep-ikon">
                      <IkonComponent size={10} strokeWidth={2} />
                    </span>
                  {/if}
                  <span class="forloep-tekst" class:forloep-tekst-aktivitet={!erNodeType}
                    >{h.label}</span
                  >
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Lenke (fixed footer, outside scroll area) -->
      <a href="/anskaffelser/{sak.id}" class="panel-lenke">
        Åpne saksmappe
        <span aria-hidden="true">&rarr;</span>
      </a>
    </div>
  {/if}
</aside>

<style>
  .panel {
    width: 460px;
    background: var(--color-felt);
    border-left: 1px solid var(--color-wire-strong);
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    transform: translateX(100%);
    transition: transform 300ms cubic-bezier(0.05, 0.7, 0.1, 1);
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.04);
    z-index: 1;
  }

  .panel-aapen {
    transform: translateX(0);
  }

  .panel-innhold {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    padding: 24px;
    border-bottom: 1px solid var(--color-wire-strong);
    position: relative;
    flex-shrink: 0;
  }

  .panel-id {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-muted);
    margin-bottom: 4px;
  }

  .panel-tittel {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1.3;
    padding-right: 32px;
    margin: 0;
  }

  .panel-meta {
    margin-top: 8px;
    font-size: 11px;
    color: var(--color-ink-secondary);
  }

  .panel-prosedyre {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 500;
  }

  .panel-sep {
    color: var(--color-ink-ghost);
    margin: 0 4px;
  }

  .panel-terskel {
    color: var(--color-ink-muted);
  }

  .avlyst-badge {
    display: inline-block;
    padding: 1px 5px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-score-low);
    border: 1px solid var(--color-score-low);
    border-radius: 1px;
    vertical-align: middle;
  }

  .panel-frist {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
  }

  .panel-saksbehandler {
    margin-top: 4px;
    font-size: 11px;
    color: var(--color-ink-ghost);
  }

  .panel-lukk {
    position: absolute;
    top: 24px;
    right: 24px;
    background: none;
    border: none;
    color: var(--color-ink-ghost);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    line-height: 1;
    transition: color 150ms;
  }
  .panel-lukk:hover {
    color: var(--color-ink);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .seksjon {
    display: flex;
    flex-direction: column;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: 8px;
  }

  /* Beskrivelse — 4 lines clipped, no gradient */
  .beskrivelse {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
    margin: 0;
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .beskrivelse.beskrivelse-full {
    display: block;
    -webkit-line-clamp: unset;
    overflow: visible;
  }

  .beskrivelse-toggle {
    background: none;
    border: none;
    padding: 0;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-ghost);
    cursor: pointer;
    text-align: left;
    transition: color 150ms;
  }

  .beskrivelse-toggle:hover {
    color: var(--color-ink-secondary);
  }

  /* Hendelsesforløp (integrert kronologi) */
  .forloep {
    display: flex;
    flex-direction: column;
  }

  .forloep-linje {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    position: relative;
  }

  .forloep-dato {
    font-family: var(--font-data);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-ghost);
    width: 48px;
    flex-shrink: 0;
    text-align: right;
  }

  .forloep-besvart .forloep-dato {
    opacity: 0.6;
  }

  .forloep-strek {
    width: 1px;
    align-self: stretch;
    background: var(--color-wire);
    flex-shrink: 0;
    position: relative;
  }

  .forloep-strek::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 0;
    width: 1px;
    height: calc(100% + 8px);
    background: var(--color-wire);
  }

  .forloep-linje:first-child .forloep-strek::before {
    top: 50%;
    height: 50%;
  }

  .forloep-strek-siste::before {
    height: 50%;
    top: -4px;
  }

  /* Lifecycle nodes (U/K/F/S/T/E/P) */
  .forloep-node {
    width: 16px;
    height: 16px;
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-data);
    font-size: 8px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .forloep-node-u {
    --nc: var(--node-u);
  }
  .forloep-node-k {
    --nc: var(--node-k);
  }
  .forloep-node-f {
    --nc: var(--node-f);
  }
  .forloep-node-s {
    --nc: var(--node-s);
  }
  .forloep-node-t {
    --nc: var(--node-t);
  }
  .forloep-node-e {
    --nc: var(--node-e);
  }
  .forloep-node-p {
    --nc: var(--node-p);
  }

  .forloep-node {
    background: var(--nc);
    border: 1px solid var(--nc);
    color: var(--color-canvas);
  }
  .forloep-node-besvart {
    background: transparent;
    border-color: var(--nc);
    color: var(--nc);
    opacity: 0.6;
  }
  .forloep-node-avvist {
    --nc: var(--color-score-low);
  }

  /* Non-node activity icons — contained in 16×16 box */
  .forloep-ikon {
    width: 16px;
    height: 16px;
    border-radius: 1px;
    border: 1px solid var(--color-wire-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  /* Text styling */
  .forloep-tekst {
    font-size: 12px;
    color: var(--color-ink-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .forloep-tekst-aktivitet {
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .forloep-besvart .forloep-tekst {
    color: var(--color-ink-muted);
  }

  /* Last item always full opacity — most relevant event */
  .forloep-siste:not(.forloep-besvart) .forloep-tekst {
    color: var(--color-ink);
    font-weight: 500;
  }

  .forloep-siste .forloep-dato {
    opacity: 1;
  }

  .forloep-siste .forloep-node-besvart {
    opacity: 1;
  }

  /* Lenke — fixed footer outside scroll area */
  .panel-lenke {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-shrink: 0;
    padding: 16px 24px;
    border-top: 1px solid var(--color-wire);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    text-decoration: none;
    transition: color 150ms;
  }

  .panel-lenke:hover {
    color: var(--color-vekt);
  }

  .mobil-tilbake {
    display: none;
  }

  @media (max-width: 1023px) {
    .panel {
      width: 100%;
      position: fixed;
      inset: 0;
      border-left: none;
      background: var(--color-canvas);
      z-index: 25;
    }

    .panel::before {
      display: none;
    }

    .panel-lukk {
      display: none;
    }

    .mobil-tilbake {
      display: flex;
      align-items: center;
      gap: 6px;
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 12px 16px;
      background: var(--color-canvas);
      border: none;
      border-bottom: 1px solid var(--color-wire);
      font-family: var(--font-ui);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-ink-secondary);
      cursor: pointer;
    }

    .mobil-tilbake:hover {
      color: var(--color-ink);
    }

    .panel-header {
      padding: 16px;
    }

    .panel-body {
      padding: 16px;
    }

    .panel-lenke {
      padding: 16px;
    }
  }
</style>
