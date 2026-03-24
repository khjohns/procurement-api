<script lang="ts">
  let { children } = $props();
</script>

<div class="tool-shell">
  {@render children()}
</div>

<style>
  .tool-shell {
    min-height: 100vh;
    background: var(--color-canvas);
  }
</style>
