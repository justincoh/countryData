<script lang="ts">
	import type { Country } from '$lib/server/types';

	let { country }: { country: Country } = $props();

	/*
	 * Whether the flag needs a drawn edge depends on the flag *and* the theme:
	 * Angola's black lower half disappears on dark paper, Japan's white field on
	 * light, and neither needs help in the other theme. The build measures both
	 * cases, so this only has to pick between them — light-dark() the same way
	 * the per-country accent does, since the theme can change without a reload.
	 */
	const edge = $derived(
		`light-dark(` +
			`${country.flag.edge.onLight ? 'var(--edge-ink)' : 'transparent'}, ` +
			`${country.flag.edge.onDark ? 'var(--edge-ink)' : 'transparent'})`
	);
</script>

<header class="hero">
	<img
		class="flag"
		src={country.flag.src}
		alt="Flag of {country.name}"
		style="aspect-ratio: {country.flag.ratio}; --edge: {edge}"
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
		/* No background of its own -- body already paints --paper, and an
		   opaque repeat here would cover the grain behind the flag. */
	}

	.flag {
		display: block;
		width: min(100%, 22rem);
		height: auto;
		border-radius: 3px;
		/* Transparent unless the build decided this flag needs an edge here, so
		   a flag with a boundary of its own is left to show it. */
		box-shadow: 0 0 0 1px var(--edge, transparent);
	}
</style>
