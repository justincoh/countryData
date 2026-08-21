<script lang="ts">
	/**
	 * The fact block, set as a gazetteer: monospaced field labels in a fixed
	 * column, values aligned against them. Figures are tabular so population
	 * and area line up digit-for-digit down the page.
	 */
	import type { Country } from '$lib/server/types';
	import { settings } from '$lib/settings.svelte';
	import { fetchWeather, describe, glyph, type Weather } from '$lib/weather';
	import * as fmt from '$lib/format';

	let { country }: { country: Country } = $props();

	let now = $state(new Date());
	let weather = $state<Weather | null>(null);
	let weatherFailed = $state(false);

	// Minute-resolution clock, re-synced on the minute boundary rather than
	// ticking every second for a display that only shows hours and minutes.
	$effect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			now = new Date();
			timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
		};
		tick();
		return () => clearTimeout(timer);
	});

	$effect(() => {
		const [lat, lon] = country.capitalLatLng;
		const units = settings.units;
		let cancelled = false;

		weather = null;
		weatherFailed = false;
		fetchWeather(lat, lon, units)
			.then((w) => !cancelled && (weather = w))
			.catch(() => !cancelled && (weatherFailed = true));

		return () => {
			cancelled = true;
		};
	});

	const rows = $derived([
		{ label: 'Capital', value: country.capital ?? '—' },
		{ label: 'Region', value: country.subregion ?? country.region },
		{
			label: 'Population',
			value: country.population ? fmt.number(country.population) : '—',
			note: country.populationYear ?? undefined,
			figure: true
		},
		{
			label: 'Area',
			value: country.area ? fmt.area(country.area, settings.units) : '—',
			figure: true
		},
		{ label: 'Languages', value: country.languages.join(', ') || '—' },
		{
			label: 'Currency',
			value:
				country.currencies
					.map((c) => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`)
					.join(', ') || '—'
		},
		{ label: 'Calling code', value: country.callingCode ?? '—', figure: true },
		{ label: 'Internet', value: country.tld ?? '—', figure: true },
		{ label: 'Demonym', value: country.demonym ?? '—' },
		{
			label: 'Coordinates',
			value: fmt.coords(country.capitalLatLng),
			note: 'capital',
			figure: true
		}
	]);
</script>

<dl class="facts">
	<!-- Time and weather lead: they are the only values that change while you
	     are looking at the page, and the usual reason to open it. -->
	<div class="row live">
		<dt class="label">Local time</dt>
		<dd>
			<span class="figure big">{fmt.timeAt(country.timezone, now)}</span>
			<span class="note">{fmt.dayAt(country.timezone, now)} · {fmt.offsetFrom(country.timezone, now)}</span>
		</dd>
	</div>

	<div class="row live">
		<dt class="label">Weather</dt>
		<dd>
			{#if weather}
				<span class="figure big">
					<span class="glyph" aria-hidden="true">{glyph(weather.code, weather.isDay)}</span>
					{fmt.temperature(weather.temp, settings.units)}
				</span>
				<span class="note">
					{describe(weather.code)} · feels {fmt.temperature(weather.feelsLike, settings.units)}
				</span>
			{:else if weatherFailed}
				<span class="note">Unavailable offline</span>
			{:else}
				<span class="note">Checking…</span>
			{/if}
		</dd>
	</div>

	{#each rows as row (row.label)}
		<div class="row">
			<dt class="label">{row.label}</dt>
			<dd>
				<span class:figure={row.figure}>{row.value}</span>
				{#if row.note}<span class="note">{row.note}</span>{/if}
			</dd>
		</div>
	{/each}
</dl>

<style>
	.facts {
		margin: 0;
		border-top: 1px solid var(--rule);
	}

	.row {
		display: grid;
		grid-template-columns: 7.5rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--rule);
	}

	dt {
		padding-top: 0.15rem;
	}

	dd {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 0.5rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.live dd {
		flex-direction: column;
		gap: 0;
	}

	.big {
		font-size: 1.375rem;
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: -0.01em;
	}

	.glyph {
		color: var(--accent);
		margin-right: 0.15em;
	}

	.note {
		font-size: 0.8125rem;
		color: var(--muted);
	}

	@media (max-width: 22rem) {
		.row {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}
</style>
