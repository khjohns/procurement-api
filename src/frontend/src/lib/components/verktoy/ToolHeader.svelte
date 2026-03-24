<script lang="ts">
  let { title, ref }: { title: string; ref: string } = $props();
</script>

<header class="tool-header">
  <span class="tool-title">{title}</span>
  <span class="tool-ref">{ref}</span>
</header>

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
</style>
