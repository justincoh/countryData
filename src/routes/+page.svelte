<script lang="ts">
	/**
	 * Landing.
	 *
	 * Opening the app with a random country is the behaviour worth keeping from
	 * the original. Because every country is a prerendered page, the redirect
	 * runs from a blocking script in <head>: the browser never paints this page,
	 * so there is no flash of a country you are about to be moved off.
	 *
	 * Without JavaScript it degrades to a normal page with a link.
	 */
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Serialised once at prerender time — this page is static, and the value is
	// inlined into <head> rather than read again on the client.
	const script = $derived(
		`(function(){try{var c=${JSON.stringify(data.codes)};` +
			`location.replace('/'+c[Math.random()*c.length|0]+'/')}catch(e){}})()`
	);
</script>

<svelte:head>
	<title>Countries</title>
	<meta name="description" content="Look up any country: flag, map, local time, weather, languages and neighbours." />
	{@html `<script>${script}</script>`}
</svelte:head>

<main>
	<h1>Countries</h1>
	<p>Flag, map, local time and current weather for anywhere in the world.</p>
	<a href="/{data.fallback.code}/">Start with {data.fallback.name} {data.fallback.flag.emoji}</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		align-content: center;
		gap: 0.75rem;
		max-width: var(--measure);
		margin-inline: auto;
		padding: var(--gutter);
	}

	h1 {
		font-family: var(--cond);
		font-size: clamp(2.5rem, 12vw, 4rem);
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	p {
		color: var(--ink-2);
	}

	a {
		justify-self: start;
		margin-top: 0.5rem;
		padding: 0.6rem 1rem;
		border: 1px solid var(--rule);
		border-radius: 999px;
		text-decoration: none;
	}
</style>
