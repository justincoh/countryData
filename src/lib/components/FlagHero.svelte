<script lang="ts">
	/**
	 * The hero.
	 *
	 * A flag is the most reduced graphic identity a country has, so it sets the
	 * page's colour rather than sitting in a card. The dominant flag colour
	 * bleeds the full width and the flag rests inside it at its true ratio —
	 * ratios are part of a flag's specification and squashing them is wrong.
	 */
	import type { Country } from '$lib/server/types';

	let { country }: { country: Country } = $props();
</script>

<header class="hero" style="--field: {country.palette.field}">
	<div class="wash" aria-hidden="true"></div>
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
		position: relative;
		display: grid;
		place-items: center;
		padding: clamp(1.75rem, 9vw, 3.5rem) var(--gutter);
		padding-top: max(clamp(1.75rem, 9vw, 3.5rem), env(safe-area-inset-top));
		isolation: isolate;
		overflow: hidden;
	}

	/* Sits behind the flag as a full-bleed field. Slightly desaturated toward
	   the page ground so it frames the flag instead of competing with it. */
	.wash {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--field) 88%, white 12%), transparent 70%),
			color-mix(in oklab, var(--field) 82%, var(--paper));
		transition: background 0.5s var(--ease);
	}

	.flag {
		display: block;
		width: min(100%, 22rem);
		height: auto;
		border-radius: 3px;
		/* Flags with white fields need an edge or they dissolve into the wash. */
		box-shadow:
			0 0 0 1px rgb(0 0 0 / 0.16),
			0 12px 28px -12px rgb(0 0 0 / 0.45);
	}
</style>
