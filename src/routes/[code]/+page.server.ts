import { error } from '@sveltejs/kit';
import { allCountries, getCountry, getDetail, getNeighbor } from '$lib/server/data';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

/** Emit one static page per country. */
export const entries: EntryGenerator = () =>
	allCountries.map((c) => ({ code: c.code }));

export const load: PageServerLoad = ({ params }) => {
	const country = getCountry(params.code);
	if (!country) error(404, 'No country with that code');

	return {
		country,
		outline: getDetail(country.code),
		neighbors: country.borders.map(getNeighbor).filter((n) => n !== null)
	};
};
