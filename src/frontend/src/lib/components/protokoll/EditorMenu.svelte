<script lang="ts">
  import { tick } from 'svelte';
  import type { Editor } from '@tiptap/core';

  interface Props {
    editor: Editor;
  }

  let { editor }: Props = $props();

  let isVisible = $state(false);
  let menuPosition = $state({ x: 0, y: 0 });
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

  function updateMenu() {
    const { state, view } = editor;
    const { selection } = state;

    if (selection.empty) {
      isVisible = false;
      return;
    }

    isVisible = true;

    // Get selection coordinates
    const from = view.coordsAtPos(selection.$from.pos);
    const to = view.coordsAtPos(selection.$to.pos);

    // Position menu above selection, centered
    const centerX = (from.left + to.left) / 2;
    const topY = from.top - 60;

    menuPosition = { x: centerX, y: topY };

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
    if (type === 'bullet') {
      editor.chain().focus().toggleBulletList().run();
    } else {
      editor.chain().focus().toggleOrderedList().run();
    }
  }

  function toggleBlockquote() {
    editor.chain().focus().toggleBlockquote().run();
  }

  // Listen for selection changes only
  $effect(() => {
    const updateHandler = () => {
      tick().then(updateMenu);
    };

    editor.on('selectionUpdate', updateHandler);

    return () => {
      editor.off('selectionUpdate', updateHandler);
    };
  });
</script>

{#if isVisible}
  <div
    class="menu"
    style="left: {menuPosition.x}px; top: {menuPosition.y}px"
    role="toolbar"
    aria-label="Text formatting menu"
  >
    <!-- Headings Row -->
    <div class="menu-row">
      <button
        class="menu-btn"
        class:active={activeStates.h2}
        onclick={() => toggleHeading(2)}
        title="Heading 2"
        aria-label="Heading 2"
      >
        H2
      </button>
      <button
        class="menu-btn"
        class:active={activeStates.h3}
        onclick={() => toggleHeading(3)}
        title="Heading 3"
        aria-label="Heading 3"
      >
        H3
      </button>
    </div>

    <!-- Separator -->
    <div class="menu-separator"></div>

    <!-- Text Formatting Row -->
    <div class="menu-row">
      <button
        class="menu-btn"
        class:active={activeStates.bold}
        onclick={() => toggleMark('bold')}
        title="Bold"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        class="menu-btn"
        class:active={activeStates.italic}
        onclick={() => toggleMark('italic')}
        title="Italic"
        aria-label="Italic"
      >
        <em>I</em>
      </button>
      <button
        class="menu-btn"
        class:active={activeStates.underline}
        onclick={() => toggleMark('underline')}
        title="Underline"
        aria-label="Underline"
      >
        <u>U</u>
      </button>
    </div>

    <!-- Separator -->
    <div class="menu-separator"></div>

    <!-- Lists & Quote Row -->
    <div class="menu-row">
      <button
        class="menu-btn"
        class:active={activeStates.bulletList}
        onclick={() => toggleList('bullet')}
        title="Bullet list"
        aria-label="Bullet list"
      >
        •
      </button>
      <button
        class="menu-btn"
        class:active={activeStates.orderedList}
        onclick={() => toggleList('ordered')}
        title="Ordered list"
        aria-label="Ordered list"
      >
        1.
      </button>
      <button
        class="menu-btn"
        class:active={activeStates.blockquote}
        onclick={toggleBlockquote}
        title="Blockquote"
        aria-label="Blockquote"
      >
        "
      </button>
    </div>
  </div>
{/if}

<style>
  .menu {
    position: fixed;
    z-index: 1000;
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-md);
    padding: var(--spacing-2, 8px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1, 4px);
    min-width: max-content;
    transform: translateX(-50%);
  }

  .menu-row {
    display: flex;
    gap: var(--spacing-1, 4px);
  }

  .menu-btn {
    padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-ink-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
    min-width: 32px;
    text-align: center;
  }

  .menu-btn:hover {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  .menu-btn.active {
    background: var(--color-vekt-bg-strong);
    color: var(--color-vekt);
    border-color: var(--color-vekt);
  }

  .menu-separator {
    height: 1px;
    background: var(--color-wire);
    margin: var(--spacing-1, 4px) 0;
  }

  .menu-btn :global(strong) {
    font-weight: 700;
  }

  .menu-btn :global(em) {
    font-style: italic;
  }

  .menu-btn :global(u) {
    text-decoration: underline;
  }
</style>
