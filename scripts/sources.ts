/**
 * Source acquisition + on-disk caching.
 *
 * Everything the app displays is baked at build time, so the live site never
 * depends on a third-party API. This repo has been broken three times by
 * REST Countries changing or deprecating its schema; that is why the data is
 * vendored rather than fetched at runtime.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const CACHE = path.resolve('.cache');

const SOURCES = {
	countries:
		'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
	places:
		'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places_simple.geojson'
} as const;

/** Fetch with a disk cache so repeat runs are offline and deterministic. */
export async function cached(name: string, url: string): Promise<string> {
	await mkdir(CACHE, { recursive: true });
	const file = path.join(CACHE, name);
	if (existsSync(file)) return readFile(file, 'utf8');

	process.stdout.write(`  fetching ${name}… `);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
	const body = await res.text();
	await writeFile(file, body);
	console.log(`${(body.length / 1024).toFixed(0)}kb`);
	return body;
}

export const getCountries = async () =>
	JSON.parse(await cached('countries.json', SOURCES.countries));

export const getPlaces = async () =>
	JSON.parse(await cached('ne_places.geojson', SOURCES.places));

/**
 * World Bank total population. Preferred over the figures baked into the
 * country datasets, which are frozen years in the past. `mrnev=1` asks for the
 * most recent non-empty value per country.
 */
export async function getPopulations(): Promise<Record<string, { value: number; year: string }>> {
	const file = path.join(CACHE, 'population.json');
	if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));

	const out: Record<string, { value: number; year: string }> = {};
	for (let page = 1; ; page++) {
		process.stdout.write(`  fetching population page ${page}… `);
		const url =
			`https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL` +
			`?format=json&per_page=500&mrnev=1&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`world bank -> HTTP ${res.status}`);
		const [meta, rows] = await res.json();
		for (const r of rows ?? []) {
			if (r?.countryiso3code && r.value != null) {
				out[r.countryiso3code] = { value: r.value, year: r.date };
			}
		}
		console.log(`${rows?.length ?? 0} rows`);
		if (page >= (meta?.pages ?? 1)) break;
	}
	await writeFile(file, JSON.stringify(out));
	return out;
}

/**
 * mledoze ships per-country flags and boundary geometry in `data/`, keyed by
 * cca3. Pinned to a commit so a rebuild years from now produces byte-identical
 * output rather than silently picking up upstream border revisions.
 */
export const MLEDOZE_SHA = '9eff32e4eef26715aa59d99b200127d1ef150e7a';

export async function getDataDir(): Promise<string> {
	const dir = path.join(CACHE, `mledoze-${MLEDOZE_SHA.slice(0, 12)}`);
	if (existsSync(path.join(dir, 'data'))) return path.join(dir, 'data');

	process.stdout.write('  fetching mledoze data/ tarball… ');
	const url = `https://codeload.github.com/mledoze/countries/tar.gz/${MLEDOZE_SHA}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
	await mkdir(dir, { recursive: true });
	const tar = path.join(CACHE, 'mledoze.tar.gz');
	await writeFile(tar, Buffer.from(await res.arrayBuffer()));

	const { execFile } = await import('node:child_process');
	const { promisify } = await import('node:util');
	await promisify(execFile)('tar', [
		'-xzf', tar, '-C', dir, '--strip-components=1',
		`countries-${MLEDOZE_SHA}/data`
	]);
	console.log('ok');
	return path.join(dir, 'data');
}
