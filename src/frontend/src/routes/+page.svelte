<script lang="ts">
	// Root page — redirects to evaluering for now
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/evaluering');
	});
</script>

<p style="color: var(--ink-muted); font-size: 13px;">Laster...</p>
