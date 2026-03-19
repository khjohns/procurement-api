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

<div class="rte-wrap">
  {#if label}
    <div class="rte-label">{label}</div>
  {/if}

  <div class="rte-container" style="--rte-max-height: {maxHeight}">
    {#if editor}
      <EditorMenu {editor} />
    {/if}
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
  }

  .rte-container:focus-within {
    border-color: var(--color-wire-focus);
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
