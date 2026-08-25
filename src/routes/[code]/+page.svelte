<script lang="ts">
	import { goto } from '$app/navigation';
	import FlagHero from '$lib/components/FlagHero.svelte';
	import Facts from '$lib/components/Facts.svelte';
	import WorldMap from '$lib/components/WorldMap.svelte';
	import Search from '$lib/components/Search.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const country = $derived(data.country);

	const description = $derived(
		`${country.name}: capital ${country.capital ?? 'n/a'}, ` +
			`${country.population ? country.population.toLocaleString() + ' people' : ''}` +
			`. Local time, current weather, languages and neighbours.`
	);
</script>

<svelte:head>
	<title>{country.name} — Countries</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="{country.name} {country.flag.emoji}" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
</svelte:head>

<!-- The accent is the flag's own colour, already clamped at build time to clear
     4.5:1 on whichever surface it lands on. -->
<div
	class="page"
	style="--accent: light-dark({country.palette.onLight}, {country.palette.onDark})"
>
	<FlagHero {country} />

	<main>
		<div class="titles">
			<h1>{country.name}</h1>
			{#if country.native && country.native !== country.name}
				<p class="native" lang="">{country.native}</p>
			{/if}
			<p class="official">{country.official}</p>
			<Settings />
		</div>

		<Facts {country} />

		<section class="map-section">
			<h2 class="label">Location</h2>
			<WorldMap
				code={country.code}
				outline={data.outline}
				context={data.context}
				neighbors={data.neighbors}
				onselect={(code) => goto(`/${code}`)}
			/>

			{#if data.neighbors.length}
				<h2 class="label borders-label">
					Borders <span class="count">{data.neighbors.length}</span>
				</h2>
				<ul class="borders">
					{#each data.neighbors as n (n.code)}
						<li>
							<a href="/{n.code}/">
								<span aria-hidden="true">{n.emoji}</span>
								{n.name}
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="no-borders">
					{country.landlocked
						? 'Landlocked with no listed land borders.'
						: 'No land borders.'}
				</p>
			{/if}
		</section>
	</main>

	<Search current={country.code} />
</div>

<style>
	.page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		width: 100%;
		max-width: var(--measure);
		margin-inline: auto;
		padding: 0 var(--gutter) 2.5rem;
	}

	.titles {
		position: relative;
		padding: 1.25rem 0 1rem;
	}

	h1 {
		font-family: var(--cond);
		font-size: clamp(2.25rem, 11vw, 3.25rem);
		font-weight: 600;
		line-height: 0.98;
		letter-spacing: -0.02em;
		/* Map lettering sets country names tight and a little wide-tracked at
		   small sizes; at display size the tracking closes up instead. */
		text-wrap: balance;
		padding-right: 3rem;
	}

	.native {
		font-size: 1.125rem;
		color: var(--ink-2);
		margin-top: 0.35rem;
	}

	.official {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted);
		margin-top: 0.5rem;
		text-wrap: pretty;
	}

	.map-section {
		margin-top: 1.75rem;
	}

	.map-section > .label {
		display: block;
		margin-bottom: 0.5rem;
	}

	.borders-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 1.25rem 0 0.6rem;
	}

	.count {
		font-variant-numeric: tabular-nums;
		color: var(--accent);
	}

	.borders {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.borders a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--rule);
		border-radius: 999px;
		text-decoration: none;
		font-size: 0.9rem;
		transition:
			border-color 0.16s var(--ease),
			background 0.16s var(--ease);
	}

	.borders a:hover {
		border-color: var(--accent);
		background: color-mix(in oklab, var(--accent) 8%, transparent);
	}

	.no-borders {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: var(--muted);
	}
</style>
