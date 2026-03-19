<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import Placeholder from '@tiptap/extension-placeholder';
  import CharacterCount from '@tiptap/extension-character-count';
  import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
  import EditorMenu from './EditorMenu.svelte';

  interface Props {
    body?: string;
    html?: string;
    placeholder?: string;
    maxHeight?: string;
    label?: string;
    hint?: string;
    onchange?: (html: string) => void;
  }

  let {
    body = '<p></p>',
    html = $bindable(''),
    placeholder = 'Skriv her...',
    maxHeight = '60vh',
    label = '',
    hint = '',
    onchange,
  }: Props = $props();

  let editor: Editor | undefined = $state();
  let editorContainer: HTMLDivElement | undefined = $state();
  let charCount = $state(0);
  let expanded = $state(false);

  function toggleExpand() {
    expanded = !expanded;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && expanded) {
      expanded = false;
    }
  }

  onMount(() => {
    if (!editorContainer) return;

    const editorInstance = new Editor({
      element: editorContainer,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          history: { depth: 100 },
        }),
        Underline,
        Placeholder.configure({ placeholder }),
        CharacterCount.configure({ limit: null }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: body,
    });

    // 'create' fires synchronously during new Editor(), so we assign directly
    editor = editorInstance;
    charCount = editorInstance.storage.characterCount?.characters() ?? 0;

    // Sync body prop → editor when body changes externally (e.g. generator)
    $effect(() => {
      if (editorInstance && body !== editorInstance.getHTML()) {
        editorInstance.commands.setContent(body, false);
        charCount = editorInstance.storage.characterCount?.characters() ?? 0;
      }
    });

    editorInstance.on('update', ({ editor: e }) => {
      html = e.getHTML();
      charCount = e.storage.characterCount?.characters() ?? 0;
      onchange?.(html);
    });

    return () => {
      editorInstance.destroy();
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="rte-wrap" class:rte-expanded={expanded} onkeydown={handleKeydown}>
  {#if label && !expanded}
    <div class="rte-label">{label}</div>
  {/if}

  <div class="rte-container" style="--rte-max-height: {expanded ? 'none' : maxHeight}">
    <div class="rte-toolbar-row">
      {#if editor}
        <EditorMenu {editor} />
      {/if}
      <button
        class="rte-expand-btn"
        onclick={toggleExpand}
        title={expanded ? 'Lukk fullskjerm (Esc)' : 'Fullskjerm'}
      >
        {#if expanded}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 1v4h4M5 13V9H1M1 5h4V1M13 9h-4v4"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 5V1h4M13 9v4H9M9 1h4v4M5 13H1V9"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </button>
    </div>
    <div bind:this={editorContainer} class="rte-editor"></div>
  </div>

  <div class="rte-footer">
    <span class="rte-char-count">{charCount} tegn</span>
    {#if hint}
      <span class="rte-hint">{hint}</span>
    {/if}
  </div>
</div>

<style>
  .rte-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2, 8px);
  }

  .rte-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
  }

  .rte-container {
    position: relative;
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    transition: border-color 0.12s;
    display: flex;
    flex-direction: column;
  }

  .rte-container:focus-within {
    border-color: var(--color-wire-focus);
  }

  .rte-toolbar-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-wire);
  }

  .rte-toolbar-row :global(.toolbar) {
    flex: 1;
    border-bottom: none;
  }

  .rte-expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    border-left: 1px solid var(--color-wire);
    color: var(--color-ink-ghost);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      color 0.1s,
      background-color 0.1s;
  }

  .rte-expand-btn:hover {
    color: var(--color-ink);
    background: var(--color-felt-hover);
  }

  .rte-expand-btn:focus-visible {
    outline: none;
    color: var(--color-vekt);
  }

  /* ── Expanded (fullscreen, A4 document feel) ── */

  .rte-expanded {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--color-felt-active);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    padding: var(--spacing-6) var(--spacing-4);
  }

  .rte-expanded .rte-container {
    width: 100%;
    max-width: 794px; /* A4 width: 210mm ≈ 794px at 96dpi */
    min-height: calc(100vh - 80px);
    border-radius: var(--radius-md);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .rte-expanded :global(.rte-editor .ProseMirror) {
    max-height: none;
    min-height: 900px;
    padding: 60px 72px; /* Word-like margins: ~25mm top/bottom, ~19mm sides */
  }

  .rte-expanded .rte-footer {
    width: 100%;
    max-width: 794px;
    padding: var(--spacing-2) var(--spacing-4) 0;
  }

  :global(.rte-editor) {
    outline: none;
  }

  :global(.rte-editor .ProseMirror) {
    min-height: 200px;
    max-height: var(--rte-max-height, 60vh);
    overflow-y: auto;
    padding: var(--spacing-4, 16px);
    font-family: var(--font-prose);
    font-size: 16px;
    line-height: 1.6;
    color: var(--color-ink);
    outline: none;
  }

  /* Paragraphs */
  :global(.rte-editor .ProseMirror p) {
    margin: 0 0 0.5em;
  }

  :global(.rte-editor .ProseMirror p:last-child) {
    margin-bottom: 0;
  }

  /* Headings */
  :global(.rte-editor .ProseMirror h2) {
    font-size: 18px;
    font-weight: 700;
    margin: 1em 0 0.5em;
    color: var(--color-ink);
  }

  :global(.rte-editor .ProseMirror h3) {
    font-size: 16px;
    font-weight: 600;
    margin: 0.8em 0 0.4em;
    color: var(--color-ink);
  }

  /* Lists — override Tailwind preflight which strips list-style */
  :global(.rte-editor .ProseMirror ul) {
    list-style-type: disc;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  :global(.rte-editor .ProseMirror ol) {
    list-style-type: decimal;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  :global(.rte-editor .ProseMirror li) {
    margin-bottom: 0.25em;
  }

  /* Blockquote */
  :global(.rte-editor .ProseMirror blockquote) {
    border-left: 3px solid var(--color-wire-strong);
    padding-left: var(--spacing-4, 16px);
    color: var(--color-ink-secondary);
    margin: 0.5em 0;
  }

  /* Tables */
  :global(.rte-editor .ProseMirror table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5em 0;
    font-family: var(--font-data);
    font-size: 13px;
  }

  :global(.rte-editor .ProseMirror th),
  :global(.rte-editor .ProseMirror td) {
    text-align: left;
    padding: var(--spacing-1, 4px) var(--spacing-2, 8px);
    border-bottom: 1px solid var(--color-wire);
    vertical-align: top;
  }

  :global(.rte-editor .ProseMirror th) {
    font-weight: 600;
    color: var(--color-ink-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Placeholder */
  :global(.rte-editor .ProseMirror p.is-editor-empty:first-child::before) {
    color: var(--color-ink-ghost);
    font-style: italic;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .rte-footer {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-3, 12px);
    padding: 0 var(--spacing-4, 16px) var(--spacing-3, 12px);
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .rte-char-count {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
  }

  .rte-hint {
    text-align: right;
  }
</style>
