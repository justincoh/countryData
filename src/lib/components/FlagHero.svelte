<script lang="ts">
	import type { Country } from '$lib/server/types';

	let { country }: { country: Country } = $props();
</script>

<header class="hero">
	<img
		class="flag"
		src={country.flag.src}
		alt="Flag of {country.name}"
		style="aspect-ratio: {country.flag.ratio}"
		width="900"
		height={Math.round(900 / country.flag.ratio)}
		fetchpriority="high"
	/>
</header>

<style>
	.hero {
		display: grid;
		place-items: center;
		padding: clamp(1.75rem, 9vw, 3.5rem) var(--gutter);
		padding-top: max(clamp(1.75rem, 9vw, 3.5rem), env(safe-area-inset-top));
		background: var(--paper);
	}

	.flag {
		display: block;
		width: min(100%, 22rem);
		height: auto;
	}
</style>
