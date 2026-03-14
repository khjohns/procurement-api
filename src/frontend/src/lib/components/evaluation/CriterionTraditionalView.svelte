<script lang="ts">
  import { evaluation } from '$lib/stores/evaluation.svelte';
  import ItemMatrix from './ItemMatrix.svelte';
  import SimpleMatrix from './SimpleMatrix.svelte';

  interface Props {
    criterionId: string;
  }

  let { criterionId }: Props = $props();

  let criterion = $derived(evaluation.data.criteria.find((c) => c.id === criterionId)!);

  /** Split sub-criteria into item-level and simple. */
  let itemSubs = $derived(
    criterion.subcriteria.filter((s) => s.evaluationType === 'item' && s.itemCriteria)
  );

  let simpleSubs = $derived(criterion.subcriteria.filter((s) => s.evaluationType !== 'item'));
</script>

<!-- ══ TRADITIONAL MODE: itemSubs + simpleSubs split ══ -->

<!-- Item-level sub-criteria sections -->
{#each itemSubs as sub}
  <ItemMatrix {sub} />
{/each}

<!-- Simple sub-criteria table -->
{#if simpleSubs.length > 0}
  <SimpleMatrix {criterion} {simpleSubs} hasItemSubs={itemSubs.length > 0} />
{/if}
