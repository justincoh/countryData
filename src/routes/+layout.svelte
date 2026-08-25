<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { hydrateSettings } from '$lib/settings.svelte';

	let { children } = $props();

	onMount(() => {
		hydrateSettings();

		// Register the offline worker only in production; in dev it would serve
		// stale bundles over the top of the dev server.
		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}
	});
</script>

<div class="texture" aria-hidden="true"></div>

{@render children()}
