/**
 * Bakes every source into the artefacts the app ships.
 *
 *   src/lib/server/data/countries.json  full records (server-only, split per
 *                                       page at prerender time)
 *   src/lib/server/data/detail.json     high-detail outline per country
 *   static/data/world.json              shared world outline, fetched once
 *   static/data/search.json             lightweight search index
 *   static/flags/<cc>.<svg|webp>        flag assets
 *
 * Run with `yarn refresh-data`. Sources are cached in .cache/ and the upstream
 * geometry repo is pinned to a commit, so reruns are deterministic.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import tzLookup from 'tz-lookup';
import { getCountries, getDataDir, getPlaces, getPopulations, cached } from './sources.ts';
import { buildCapitalIndex, resolveCapital } from './capitals.ts';
import { loadGeometry, WORLD_W, WORLD_H } from './geometry.ts';
import { buildFlag, extractPalette, type Palette } from './flags.ts';

const SERVER_DATA = path.resolve('src/lib/server/data');
const STATIC_DATA = path.resolve('static/data');
const STATIC_FLAGS = path.resolve('static/flags');

const NE_ADMIN0 =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

export type Country = {
	code: string;          // cca2, lowercased — the URL segment
	cca3: string;
	name: string;
	official: string;
	native: string | null;
	capital: string | null;
	capitalLatLng: [number, number];
	timezone: string;      // IANA zone of the capital
	region: string;
	subregion: string | null;
	population: number | null;
	populationYear: string | null;
	area: number | null;
	languages: string[];
	currencies: { code: string; name: string; symbol: string | null }[];
	callingCode: string | null;
	tld: string | null;
	demonym: string | null;
	landlocked: boolean;
	borders: string[];     // cca2 codes, lowercased
	flag: { src: string; ratio: number; emoji: string };
	palette: Palette;
};

const pretty = (n: number) => (n / 1024).toFixed(0) + 'kb';

async function main() {
	console.log('\nSources');
	const [raw, places, populations, dataDir] = await Promise.all([
		getCountries(),
		getPlaces(),
		getPopulations(),
		getDataDir()
	]);
	const admin0 = JSON.parse(await cached('ne_admin0.geojson', NE_ADMIN0));

	// mledoze ships an empty stub for Kosovo; Natural Earth carries the outline.
	const supplemental: Record<string, any> = {};
	const kosovo = admin0.features.find((f: any) => f.properties.ADM0_A3 === 'KOS');
	if (kosovo) supplemental.UNK = kosovo.geometry;

	const capitalIdx = buildCapitalIndex(places);
	const byA3 = new Map<string, any>(raw.map((c: any) => [c.cca3, c]));

	await Promise.all([
		rm(SERVER_DATA, { recursive: true, force: true }),
		rm(STATIC_FLAGS, { recursive: true, force: true })
	]);
	await Promise.all([
		mkdir(SERVER_DATA, { recursive: true }),
		mkdir(STATIC_DATA, { recursive: true }),
		mkdir(STATIC_FLAGS, { recursive: true })
	]);

	console.log('\nCountries');
	const countries: Country[] = [];
	const detail: Record<string, unknown> = {};
	const world: Record<string, unknown> = {};
	const via: Record<string, number> = {};

	for (const c of raw) {
		const code = c.cca2.toLowerCase();
		const cap = resolveCapital(c, capitalIdx);
		if (!cap) throw new Error(`no capital coordinate for ${c.cca3}`);
		via[cap.via] = (via[cap.via] ?? 0) + 1;

		const svg = await readFile(path.join(dataDir, `${c.cca3.toLowerCase()}.svg`));
		const [asset, palette] = await Promise.all([buildFlag(svg), extractPalette(svg)]);
		await writeFile(path.join(STATIC_FLAGS, `${code}.${asset.ext}`), asset.body);

		const [overview, detailed] = await Promise.all([
			loadGeometry(dataDir, c.cca3, {
				tolerance: 0.3, minArea: 0.6, digits: 1, supplemental
			}),
			loadGeometry(dataDir, c.cca3, {
				digits: 2, targetPx: 640, errPx: 0.9, supplemental
			})
		]);
		if (overview) world[code] = overview;
		if (detailed) detail[code] = detailed;

		const pop = populations[c.cca3];
		const nativeNames = Object.values(c.name.native ?? {}) as any[];

		countries.push({
			code,
			cca3: c.cca3,
			name: c.name.common,
			official: c.name.official,
			native: nativeNames[0]?.common ?? null,
			capital: c.capital?.[0] ?? null,
			capitalLatLng: cap.latlng,
			// The capital's zone, not the country's first: a country spanning
			// eleven zones has no single "local time", but its seat of
			// government does. Resolved from coordinates so DST comes free.
			timezone: tzLookup(cap.latlng[0], cap.latlng[1]),
			region: c.region,
			subregion: c.subregion || null,
			population: pop?.value ?? null,
			populationYear: pop?.year ?? null,
			area: c.area ?? null,
			languages: Object.values(c.languages ?? {}) as string[],
			currencies: Object.entries(c.currencies ?? {}).map(([k, v]: [string, any]) => ({
				code: k, name: v.name, symbol: v.symbol ?? null
			})),
			callingCode: c.idd?.root
				? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '')
				: null,
			tld: c.tld?.[0] ?? null,
			demonym: c.demonyms?.eng?.m ?? null,
			landlocked: !!c.landlocked,
			borders: (c.borders ?? [])
				.map((b: string) => byA3.get(b)?.cca2?.toLowerCase())
				.filter(Boolean),
			flag: { src: `/flags/${code}.${asset.ext}`, ratio: asset.ratio, emoji: c.flag },
			palette
		});
	}

	countries.sort((a, b) => a.name.localeCompare(b.name));
	console.log(`  ${countries.length} countries`);
	console.log(`  capital coords via: ${Object.entries(via).map(([k, v]) => `${k}=${v}`).join(' ')}`);

	// Search index: only what the typeahead matches on, so the client downloads
	// a few kb rather than the full records.
	const search = countries.map((c) => ({
		c: c.code,
		n: c.name,
		v: c.native,
		p: c.capital,
		a: [c.cca3, c.code.toUpperCase(), ...(raw.find((r: any) => r.cca2.toLowerCase() === c.code)?.altSpellings ?? [])]
			.filter((s: string) => s && s !== c.name)
	}));

	const write = async (file: string, value: unknown, label: string) => {
		const body = JSON.stringify(value);
		await writeFile(file, body);
		console.log(`  ${label.padEnd(28)} ${pretty(body.length).padStart(7)} raw  ${pretty(gzipSync(body).length).padStart(7)} gzip`);
	};

	console.log('\nArtefacts');
	await write(path.join(SERVER_DATA, 'countries.json'), countries, 'countries.json (server)');
	await write(path.join(SERVER_DATA, 'detail.json'), detail, 'detail.json (server)');
	await write(path.join(STATIC_DATA, 'world.json'), { w: WORLD_W, h: WORLD_H, shapes: world }, 'world.json (shared)');
	await write(path.join(STATIC_DATA, 'search.json'), search, 'search.json (client)');

	console.log('\nDone.\n');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
