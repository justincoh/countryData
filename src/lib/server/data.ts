/**
 * Server-only access to the baked dataset.
 *
 * These imports never reach the browser. At prerender time each page pulls out
 * just its own country, so a visitor downloads one country's record rather than
 * all 250.
 */
import countries from './data/countries.json' with { type: 'json' };
import detail from './data/detail.json' with { type: 'json' };
import context from './data/context.json' with { type: 'json' };
import type { Country } from './types.ts';

const byCode = new Map<string, Country>(
	(countries as Country[]).map((c) => [c.code, c])
);

export const allCountries = countries as Country[];
export const getCountry = (code: string) => byCode.get(code.toLowerCase()) ?? null;
/** JSON imports widen tuples to arrays, hence the cast through unknown. */
type Shape = { d: string; bbox: [number, number, number, number] };

export const getDetail = (code: string): Shape | null =>
	(detail as unknown as Record<string, Shape>)[code.toLowerCase()] ?? null;

/**
 * Surrounding land, baked at this page's zoom and clipped to its frame.
 *
 * Without it the map draws neighbours from world.json, which is simplified for
 * the whole-world view and looks it once the camera is down on Central America.
 * Absent for pages framed wide enough that world.json is already accurate.
 */
export type Context = {
	clip: [number, number, number, number];
	/** No bbox: these are exactly the page's frame, so nothing filters them. */
	shapes: { code: string; d: string }[];
};

export const getContext = (code: string): Context | null =>
	(context as unknown as Record<string, Context>)[code.toLowerCase()] ?? null;

/** Minimal record for rendering a border chip without loading the full country. */
export const getNeighbor = (code: string) => {
	const c = byCode.get(code);
	if (!c) return null;
	return { code: c.code, name: c.name, emoji: c.flag.emoji };
};
