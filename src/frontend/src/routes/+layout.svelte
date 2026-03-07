<script lang="ts">
	import '../app.css';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();
</script>

{@render children()}
