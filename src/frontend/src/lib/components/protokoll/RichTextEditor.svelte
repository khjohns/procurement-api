<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import Placeholder from '@tiptap/extension-placeholder';
  import CharacterCount from '@tiptap/extension-character-count';
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
      ],
      content: body,
    });

    editorInstance.on('create', ({ editor: e }) => {
      editor = e;
      charCount = e.storage.characterCount?.characters() ?? 0;
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
    overflow: hidden;
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

  /* Lists */
  :global(.rte-editor .ProseMirror ul),
  :global(.rte-editor .ProseMirror ol) {
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
