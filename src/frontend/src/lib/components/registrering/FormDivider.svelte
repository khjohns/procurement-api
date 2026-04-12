<script lang="ts">
  let { label }: { label?: string } = $props();
</script>

<div class="divider">
  <div class="line"></div>
  {#if label}<span class="label">{label}</span>{/if}
  <div class="line"></div>
</div>

<style>
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 24px 0 14px;
  }

  .line {
    height: 1px;
    flex: 1;
    background: var(--color-wire);
  }

  .label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-ink-ghost);
  }
</style>
