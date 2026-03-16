<script lang="ts">
  import type { Editor } from '@tiptap/core';

  interface Props {
    editor: Editor;
  }

  let { editor }: Props = $props();

  let activeStates = $state({
    h2: false,
    h3: false,
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
  });

  function updateActiveStates() {
    activeStates = {
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
    };
  }

  function toggleHeading(level: 2 | 3) {
    editor.chain().focus().toggleHeading({ level }).run();
  }

  function toggleMark(mark: 'bold' | 'italic' | 'underline') {
    if (mark === 'bold') editor.chain().focus().toggleBold().run();
    if (mark === 'italic') editor.chain().focus().toggleItalic().run();
    if (mark === 'underline') editor.chain().focus().toggleUnderline().run();
  }

  function toggleList(type: 'bullet' | 'ordered') {
    if (type === 'bullet') editor.chain().focus().toggleBulletList().run();
    else editor.chain().focus().toggleOrderedList().run();
  }

  function toggleBlockquote() {
    editor.chain().focus().toggleBlockquote().run();
  }

  $effect(() => {
    editor.on('selectionUpdate', updateActiveStates);
    editor.on('transaction', updateActiveStates);

    return () => {
      editor.off('selectionUpdate', updateActiveStates);
      editor.off('transaction', updateActiveStates);
    };
  });
</script>

<div class="toolbar" role="toolbar" aria-label="Tekstformatering">
  <button
    class="btn"
    class:active={activeStates.h2}
    onmousedown={(e) => {
      e.preventDefault();
      toggleHeading(2);
    }}
    title="Overskrift 2"
    aria-label="Overskrift 2">H2</button
  >
  <button
    class="btn"
    class:active={activeStates.h3}
    onmousedown={(e) => {
      e.preventDefault();
      toggleHeading(3);
    }}
    title="Overskrift 3"
    aria-label="Overskrift 3">H3</button
  >

  <div class="sep"></div>

  <button
    class="btn"
    class:active={activeStates.bold}
    onmousedown={(e) => {
      e.preventDefault();
      toggleMark('bold');
    }}
    title="Fet"
    aria-label="Fet"><strong>B</strong></button
  >
  <button
    class="btn"
    class:active={activeStates.italic}
    onmousedown={(e) => {
      e.preventDefault();
      toggleMark('italic');
    }}
    title="Kursiv"
    aria-label="Kursiv"><em>I</em></button
  >
  <button
    class="btn"
    class:active={activeStates.underline}
    onmousedown={(e) => {
      e.preventDefault();
      toggleMark('underline');
    }}
    title="Understreket"
    aria-label="Understreket"><u>U</u></button
  >

  <div class="sep"></div>

  <button
    class="btn"
    class:active={activeStates.bulletList}
    onmousedown={(e) => {
      e.preventDefault();
      toggleList('bullet');
    }}
    title="Punktliste"
    aria-label="Punktliste">• Liste</button
  >
  <button
    class="btn"
    class:active={activeStates.orderedList}
    onmousedown={(e) => {
      e.preventDefault();
      toggleList('ordered');
    }}
    title="Nummerert liste"
    aria-label="Nummerert liste">1. Liste</button
  >
  <button
    class="btn"
    class:active={activeStates.blockquote}
    onmousedown={(e) => {
      e.preventDefault();
      toggleBlockquote();
    }}
    title="Sitat"
    aria-label="Sitat">"Sitat"</button
  >
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-wire);
    background: var(--color-felt);
    flex-wrap: wrap;
  }

  .btn {
    padding: 4px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
    white-space: nowrap;
  }

  .btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .btn.active {
    background: var(--color-vekt-bg-strong);
    color: var(--color-vekt);
    border-color: transparent;
  }

  .sep {
    width: 1px;
    height: 16px;
    background: var(--color-wire-strong);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .btn :global(strong) {
    font-weight: 700;
  }
  .btn :global(em) {
    font-style: italic;
  }
  .btn :global(u) {
    text-decoration: underline;
  }
</style>
