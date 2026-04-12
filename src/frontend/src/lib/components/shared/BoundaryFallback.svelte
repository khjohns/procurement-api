<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<svelte:boundary onerror={(e) => console.error(`[BoundaryFallback] ${title}:`, e)}>
  {@render children()}
  {#snippet failed(error, reset)}
    <div class="boundary-error">
      <p class="boundary-error-title">{title}</p>
      <p class="boundary-error-detail">
        {error instanceof Error ? error.message : 'Ukjent feil'}
      </p>
      <button class="boundary-error-btn" onclick={reset}>Prøv igjen</button>
    </div>
  {/snippet}
</svelte:boundary>
