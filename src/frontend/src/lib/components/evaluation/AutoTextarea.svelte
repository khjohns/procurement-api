<script lang="ts">
  let {
    value = '',
    placeholder = '',
    onfocus,
    oninput,
  }: {
    value: string;
    placeholder?: string;
    onfocus?: () => void;
    oninput: (value: string) => void;
  } = $props();

  let el: HTMLTextAreaElement | undefined = $state();

  function resize() {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(28, el.scrollHeight) + 'px';
  }

  $effect(() => {
    // Re-measure whenever value changes (including external updates)
    void value;
    resize();
  });
</script>

<textarea
  bind:this={el}
  class="auto-textarea"
  {value}
  {placeholder}
  rows="1"
  {onfocus}
  oninput={(e) => {
    oninput(e.currentTarget.value);
    resize();
  }}
></textarea>

<style>
  .auto-textarea {
    width: 100%;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt-raised);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink);
    line-height: 1.55;
    resize: none;
    outline: none;
    overflow: hidden;
    min-height: 28px;
  }

  .auto-textarea:focus {
    border-color: var(--color-vekt);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .auto-textarea::placeholder {
    color: var(--color-ink-ghost);
  }
</style>
