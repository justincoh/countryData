/**
 * Bakes every source into the artefacts the app ships.
 *
 *   src/lib/server/data/countries.json  full records (server-only, split per
 *                                       page at prerender time)
 *   src/lib/server/data/detail.json     high-detail outline per country
 *   src/lib/server/data/context.json    surrounding land, baked per page
 *   static/data/world.json              shared world outline, fetched once
 *   static/data/search.json             lightweight search index
 *   static/flags/<cc>.<svg|webp>        flag assets
 *   static/og/<cc>.png                  OpenGraph share card
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
import {
	frameMinArea,
	frameTolerance,
	DEG_PER_UNIT,
	loadGeometry,
	loadRaw,
	lonLatWindow,
	renderShape,
	restrictTo,
	simplifyFor,
	type Geom,
	WORLD_W,
	WORLD_H
} from './geometry.ts';
import { BUILD_PAD, VIEW_W, frameOf, inFrame, type Box } from '../src/lib/frame.ts';
import { buildFlag, extractPalette, type Palette } from './flags.ts';
import { buildOgCards } from './og.ts';

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
	flag: { src: string; ratio: number; emoji: string; edge: { onLight: boolean; onDark: boolean } };
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
			flag: {
				src: `/flags/${code}.${asset.ext}`,
				ratio: asset.ratio,
				emoji: c.flag,
				edge: asset.edge
			},
			palette
		});
	}

	countries.sort((a, b) => a.name.localeCompare(b.name));
	console.log(`  ${countries.length} countries`);
	console.log(`  capital coords via: ${Object.entries(via).map(([k, v]) => `${k}=${v}`).join(' ')}`);

	// ---------------------------------------------------------------------
	// Per-page context
	//
	// world.json is simplified for the whole-world view: 0.3deg of error, which
	// is half a pixel when the globe spans the frame and twenty-odd pixels once
	// the camera has flown in on Guatemala. It was the only source of
	// surrounding land, so a country rendered as a neighbour got a fraction of
	// the detail it gets as the subject — Belize arrived as four points.
	//
	// The camera is deterministic (`frameOf`), so the build knows every page's
	// zoom and exactly which countries fall inside it. Each page gets its
	// surroundings baked at its own zoom, clipped to its own frame, and inlined
	// into the prerendered payload: correct at first paint, no extra request,
	// and no bytes spent on coastline that is off screen.
	//
	// world.json still ships. It covers the wide shots the camera passes
	// through mid-flight, where it is accurate to about a pixel anyway.
	// ---------------------------------------------------------------------
	console.log('\nContext');

	/** Accuracy the surrounding land is simplified to, in screen pixels. The
	    same budget the subject country gets, so nothing in the frame is
	    conspicuously rougher — or finer — than anything else. */
	const CONTEXT_ERR_PX = 0.9;
	/** Drop islands that would render smaller than this. */
	const CONTEXT_MIN_PX = 1.5;
	/** Error of the world tier, from the loadGeometry call above. */
	const WORLD_TOLERANCE = 0.3;
	/** Above this, world.json is close enough and context is not worth baking. */
	const WORLD_GOOD_ENOUGH_PX = 3;
	/** Path bytes a single page may spend on its surroundings, before gzip.
	    Pages framed across half a continent blow past this; they step down a
	    zoom tier until they fit, which at that scale is not visible. */
	const PAGE_BUDGET = 60_000;
	/** How far a page may be stepped down to fit. Two tiers is four times the
	    error and still well finer than world.json, so a page that cannot fit
	    even then keeps its coarsest attempt rather than giving up — falling
	    back to world.json would be worse, not better. */
	const MAX_COARSEN = 2;

	const cca3Of = new Map(countries.map((c) => [c.code, c.cca3]));
	const worldBoxes = Object.entries(world).map(
		([code, g]) => [code, (g as Geom).bbox] as [string, Box]
	);

	/** Round each page's zoom up to the next power of two, so that pages framed
	    at similar zooms share one simplified copy of their surroundings. Only
	    the clip, which is cheap, is then per page. */
	const tierOf = (spanUnits: number) => Math.ceil(Math.log2(spanUnits));
	const tierTolerance = (tier: number) =>
		frameTolerance(Math.pow(2, tier), CONTEXT_ERR_PX, VIEW_W);

	/** How wrong world.json looks in a frame this wide. Half a pixel across the
	    whole globe, sixty-odd once the camera is down on a city-state. */
	const worldErrorPx = (spanUnits: number) =>
		WORLD_TOLERANCE / ((spanUnits / VIEW_W) * DEG_PER_UNIT);

	/** Coordinate precision, chosen to keep quantisation under a tenth of a
	    pixel at this zoom. The world tier's single decimal steps by nine pixels
	    at full zoom, which is most of why close-ups looked chiselled. */
	const digitsFor = (spanUnits: number) =>
		Math.min(3, Math.max(1, Math.ceil(Math.log10((VIEW_W * 10) / spanUnits))));

	/** Simplified lon/lat geometry, keyed by `tier:cca3`. */
	const simplified = new Map<string, any | null>();

	// No bbox: unlike world.json these are not filtered at runtime. They are
	// exactly this page's frame, so the renderer draws all of them.
	type Ctx = { clip: Box; shapes: { code: string; d: string }[] };
	const pages: Record<string, Ctx> = {};
	let shapes = 0;
	let overBudget = 0;

	/** Bake one page's surroundings at a given zoom tier. */
	async function bake(code: string, frame: Box, clip: Box, tier: number) {
		const span = Math.pow(2, tier);
		const tolerance = tierTolerance(tier);
		const minArea = frameMinArea(span, CONTEXT_MIN_PX, VIEW_W);
		const digits = digitsFor(span);

		const window = lonLatWindow(clip);

		const out: Ctx['shapes'] = [];
		for (const [cc, bbox] of worldBoxes) {
			if (cc === code) continue;
			if (!inFrame(bbox, frame, BUILD_PAD)) continue;

			const cca3 = cca3Of.get(cc);
			if (!cca3) continue;

			const key = `${tier}:${cca3}`;
			let merged = simplified.get(key);
			if (merged === undefined) {
				const raw = await loadRaw(dataDir, cca3, supplemental);
				merged = raw ? simplifyFor(raw, tolerance, minArea) : null;
				simplified.set(key, merged);
			}
			if (!merged) continue;

			// A bbox can straddle the frame while the land itself misses it —
			// an archipelago's bounding box spans open water. Clipping says so.
			const near = restrictTo(merged, window);
			if (!near) continue;
			const clipped = renderShape(near, { digits, clip });
			if (clipped) out.push({ code: cc, d: clipped.d });
		}
		return out;
	}

	for (const [code, shape] of Object.entries(detail) as [string, Geom][]) {
		const frame = frameOf(shape.bbox as Box);

		// Clip to the same margin the renderer draws, so a country it decides
		// is visible is never missing from what the build baked.
		const pad = Math.max(frame[2], frame[3]) * BUILD_PAD;
		const clip: Box = [
			frame[0] - pad,
			frame[1] - pad,
			frame[2] + pad * 2,
			frame[3] + pad * 2
		];

		// Zoomed this far out, world.json is already close enough. These are the
		// continent-sized pages, where a second copy of half the planet costs
		// the most and buys the least. Judged on the frame the page actually
		// uses — how coarsely we end up baking is a separate question.
		if (worldErrorPx(frame[2]) <= WORLD_GOOD_ENOUGH_PX) continue;

		const tier0 = tierOf(frame[2]);
		let out: Ctx['shapes'] = [];
		for (let tier = tier0; tier <= tier0 + MAX_COARSEN; tier++) {
			out = await bake(code, frame, clip, tier);
			if (out.reduce((a, sh) => a + sh.d.length, 0) <= PAGE_BUDGET) break;
			if (tier < tier0 + MAX_COARSEN) overBudget++;
		}

		if (out.length) {
			// The clip travels with the shapes: the renderer needs to know where
			// the baked geometry stops so it can fall back to world.json rather
			// than draw a coastline that ends in a straight line.
			pages[code] = { clip, shapes: out };
			shapes += out.length;
		}
	}

	const perPage = Object.values(pages)
		.map((p) => p.shapes.reduce((a, s) => a + s.d.length, 0))
		.sort((a, b) => a - b);
	console.log(
		`  ${Object.keys(pages).length} pages, ${shapes} shapes` +
			(overBudget ? `, ${overBudget} rebuilt a tier coarser to fit the budget` : '')
	);
	console.log(
		`  per-page path bytes: median ${pretty(perPage[perPage.length >> 1])}` +
			`  p90 ${pretty(perPage[Math.floor(perPage.length * 0.9)])}` +
			`  max ${pretty(perPage[perPage.length - 1])}`
	);

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

	console.log('\nShare cards');
	await buildOgCards(countries);

	console.log('\nArtefacts');
	await write(path.join(SERVER_DATA, 'countries.json'), countries, 'countries.json (server)');
	await write(path.join(SERVER_DATA, 'detail.json'), detail, 'detail.json (server)');
	await write(path.join(SERVER_DATA, 'context.json'), pages, 'context.json (server)');
	await write(path.join(STATIC_DATA, 'world.json'), { w: WORLD_W, h: WORLD_H, shapes: world }, 'world.json (shared)');
	await write(path.join(STATIC_DATA, 'search.json'), search, 'search.json (client)');

	console.log('\nDone.\n');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
