<script lang="ts">
  import { TREE, type Conclusion, type TreeOption } from '$lib/data/unntak-tree';

  let path = $state<string[]>(['start']);
  let conclusion = $state<Conclusion | null>(null);

  const current = $derived(TREE[path[path.length - 1]]);

  function choose(opt: TreeOption) {
    if (opt.conclusion) {
      conclusion = opt.conclusion;
    } else if (opt.next) {
      path = [...path, opt.next];
      conclusion = null;
    }
  }

  function back() {
    if (path.length > 1) {
      path = path.slice(0, -1);
      conclusion = null;
    }
  }

  function reset() {
    path = ['start'];
    conclusion = null;
  }

  const typeStyles: Record<string, { bg: string; border: string; accent: string; icon: string }> = {
    unntak: {
      bg: 'var(--color-vekt-bg)',
      border: 'color-mix(in srgb, var(--color-vekt), transparent 60%)',
      accent: 'var(--color-vekt)',
      icon: '✓',
    },
    nei: {
      bg: 'var(--color-score-low-bg)',
      border: 'color-mix(in srgb, var(--color-score-low), transparent 60%)',
      accent: 'var(--color-score-low)',
      icon: '✗',
    },
    ok: {
      bg: 'var(--color-score-high-bg)',
      border: 'color-mix(in srgb, var(--color-score-high), transparent 60%)',
      accent: 'var(--color-score-high)',
      icon: '✓',
    },
  };
</script>

<header class="tool-header">
  <span class="tool-title">Unntaks-veiviser</span>
  <span class="tool-ref">FOA §§ 2-4, 2-5, 3-1 til 3-3, 5-2, 13-3, 13-4</span>
</header>

<div class="tool-body">
  <!-- Legend -->
  <div class="legend">
    <span><strong>Forskriftskrav</strong> = plikt etter lov/forskrift</span>
    <span><strong class="anbefalt-label">Anbefaling</strong> = god praksis / dokumentasjonsråd</span
    >
  </div>

  <!-- Breadcrumb -->
  <div class="breadcrumb">
    {#each path as p, i}
      {#if i > 0}<span class="sep">›</span>{/if}
      <button
        class="crumb"
        class:active={i === path.length - 1}
        onclick={() => {
          path = path.slice(0, i + 1);
          conclusion = null;
        }}
      >
        {TREE[p]?.q?.slice(0, 35)}{(TREE[p]?.q?.length ?? 0) > 35 ? '…' : ''}
      </button>
    {/each}
  </div>

  <!-- Question -->
  {#if !conclusion && current}
    <div class="question-area">
      <h2 class="question">{current.q}</h2>
      {#if current.hint}
        <p class="hint">{current.hint}</p>
      {/if}

      <div class="options">
        {#each current.opts as opt}
          <button class="option-btn" onclick={() => choose(opt)}>
            {opt.label}
          </button>
        {/each}
      </div>

      {#if path.length > 1}
        <button class="back-btn" onclick={back}>← Tilbake</button>
      {/if}
    </div>
  {/if}

  <!-- Conclusion -->
  {#if conclusion}
    {@const style = typeStyles[conclusion.type]}
    <div class="conclusion" style:background={style.bg} style:border-color={style.border}>
      <div class="conclusion-header">
        <span class="conclusion-icon" style:color={style.accent}>{style.icon}</span>
        <div>
          <span class="conclusion-hjemmel">{conclusion.hjemmel}</span>
          <h3 class="conclusion-label">{conclusion.label}</h3>
        </div>
      </div>

      <div class="krav-list">
        {#each conclusion.krav as k}
          <div class="krav-item" class:anbefalt={k.type === 'anbefalt'}>
            <span class="krav-type">{k.type === 'krav' ? '■' : '□'}</span>
            <span>{k.text}</span>
          </div>
        {/each}
      </div>

      {#if conclusion.kofa && conclusion.kofa.length > 0}
        <div class="kofa-section">
          <div class="kofa-label">KOFA-praksis</div>
          {#each conclusion.kofa as k}
            <div class="kofa-item">
              <span class="kofa-sak">{k.sak}</span>
              <span>{k.tekst}</span>
            </div>
          {/each}
        </div>
      {/if}

      <button class="reset-btn" onclick={reset}>Start på nytt</button>
    </div>
  {/if}
</div>

<style>
  .tool-header {
    padding: 10px 36px;
    background: var(--color-header-bg);
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .tool-title {
    font-family: var(--font-prose);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-header-fg);
  }
  .tool-ref {
    font-family: var(--font-data);
    font-size: 8.5px;
    color: var(--color-header-muted);
  }

  .tool-body {
    max-width: 720px;
    margin: 24px auto;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 8px rgba(30, 37, 48, 0.06);
    padding: 28px 32px;
  }

  .legend {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--color-felt-raised);
    border: 1px solid var(--color-felt-active);
    font-size: 10px;
    color: var(--color-ink-muted);
  }

  .anbefalt-label {
    color: var(--color-vekt);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .sep {
    color: var(--color-wire);
  }

  .crumb {
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 400;
    color: var(--color-ink-ghost);
    text-decoration: underline;
    padding: 0;
  }

  .crumb.active {
    font-weight: 600;
    color: var(--color-ink);
    text-decoration: none;
  }

  .question {
    font-family: var(--font-prose);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-ink);
    line-height: 1.4;
    margin-bottom: 6px;
    white-space: pre-line;
  }

  .hint {
    font-size: 11px;
    color: var(--color-ink-muted);
    line-height: 1.6;
    margin-bottom: 18px;
    white-space: pre-line;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-btn {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-family: var(--font-ui);
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-ink);
    line-height: 1.5;
    transition: all 0.12s ease;
  }

  .option-btn:hover {
    border-color: var(--color-vekt);
    background: var(--color-vekt-bg);
  }

  .back-btn {
    margin-top: 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--color-ink-ghost);
    font-family: var(--font-ui);
    padding: 0;
  }

  .back-btn:hover {
    color: var(--color-ink);
  }

  .conclusion {
    padding: 20px;
    border-radius: var(--radius-sm);
    border: 1px solid;
  }

  .conclusion-header {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .conclusion-icon {
    font-size: 20px;
  }

  .conclusion-hjemmel {
    font-size: 10px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }

  .conclusion-label {
    font-family: var(--font-prose);
    font-size: 16px;
    font-weight: 700;
    color: var(--color-ink);
    margin-top: 2px;
  }

  .krav-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .krav-item {
    display: flex;
    gap: 8px;
    font-size: 11.5px;
    color: var(--color-ink);
    line-height: 1.5;
  }

  .krav-item.anbefalt {
    color: var(--color-vekt);
  }

  .krav-type {
    flex-shrink: 0;
    font-size: 8px;
    margin-top: 3px;
  }

  .kofa-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-wire);
  }

  .kofa-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--color-ink-ghost);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .kofa-item {
    font-size: 10.5px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .kofa-sak {
    font-family: var(--font-data);
    font-weight: 600;
    color: var(--color-ink-muted);
    margin-right: 6px;
  }

  .reset-btn {
    margin-top: 16px;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
  }

  .reset-btn:hover {
    border-color: var(--color-vekt);
    color: var(--color-vekt);
  }
</style>
