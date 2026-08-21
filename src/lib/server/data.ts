/**
 * Server-only access to the baked dataset.
 *
 * These imports never reach the browser. At prerender time each page pulls out
 * just its own country, so a visitor downloads one country's record rather than
 * all 250.
 */
import countries from './data/countries.json' with { type: 'json' };
import detail from './data/detail.json' with { type: 'json' };
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

/** Minimal record for rendering a border chip without loading the full country. */
export const getNeighbor = (code: string) => {
	const c = byCode.get(code);
	if (!c) return null;
	return { code: c.code, name: c.name, emoji: c.flag.emoji, accent: c.palette.colors[0] };
};
