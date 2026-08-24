<script lang="ts">
	import type { Country } from '$lib/server/types';

	let { country }: { country: Country } = $props();
</script>

<header class="hero">
	<img
		class="flag"
		class:framed={country.flag.rectangular}
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

	/*
	 * Only flags that fill their bounding box get an edge. Nepal is the one
	 * national flag that does not, and a ring drawn on the box would outline a
	 * rectangle the flag never occupies.
	 *
	 * This matters more now that the ground is neutral: a white-field flag like
	 * Japan's has no boundary of its own against light paper.
	 */
	.framed {
		border-radius: 3px;
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--ink) 22%, transparent),
			0 12px 28px -14px rgb(0 0 0 / 0.4);
	}
</style>
